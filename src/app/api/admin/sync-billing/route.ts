import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";
import { isCancellationOutOfSync, needsCancellationReview, isBilling } from "@/lib/cancel-subscription";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Admin: reconcile every subscriber's billing state against Stripe.
 *
 * Webhook-driven state can drift — a payment failure that happened before
 * the failure columns existed was never recorded, so the panel keeps showing
 * the customer as paying. This asks Stripe directly for each subscription's
 * real status and repairs the local record:
 *
 *   past_due / unpaid / incomplete → stamp the failure + hosted invoice URL
 *   active / trialing              → clear any stale failure flag
 *   canceled                       → drop the plan
 */

/** The subscription Stripe really holds, found by stored id or by customer. */
async function resolveSubscription(
  stripe: Stripe,
  customerId: string,
  storedSubId: string | null | undefined,
): Promise<Stripe.Subscription | null> {
  let stored: Stripe.Subscription | null = null;
  try {
    if (storedSubId) stored = await stripe.subscriptions.retrieve(storedSubId);
  } catch { stored = null; }
  if (isBilling(stored)) return stored;

  const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
  return list.data.find((s) => isBilling(s)) ?? stored;
}

export async function POST() {
  try {
    await requireAdmin();

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

    const service = createServiceClient();
    // Scanning by stripe_customer_id, not by stripe_subscription_id: an
    // account whose checkout webhook never arrived has a customer and no
    // subscription id, and that is exactly the population that could be
    // billed after cancelling. Filtering on the subscription id hid them.
    const { data: profiles } = await service
      .from("profiles")
      .select("id, email, stripe_subscription_id, stripe_customer_id, subscription_plan, pending_plan, subscription_cancelled_at")
      .not("stripe_customer_id", "is", null)
      .limit(500);

    const stripe = new Stripe(key);
    let checked = 0;
    let failuresFound = 0;
    let cleared = 0;
    let stillBillingAfterCancel = 0;
    let needsReview = 0;
    const details: { email: string | null; status: string; action: string }[] = [];

    for (const p of profiles || []) {
      checked += 1;
      try {
        const sub = await resolveSubscription(stripe, p.stripe_customer_id as string, p.stripe_subscription_id);

        // The one that costs people money: we recorded a cancellation and
        // Stripe is still going to renew. Re-assert it rather than only
        // reporting it, because every cycle that passes is another charge.
        if (isCancellationOutOfSync(p, sub)) {
          stillBillingAfterCancel += 1;
          let action = "cancel_reasserted";
          try {
            await stripe.subscriptions.update(sub!.id, { cancel_at_period_end: true });
            await service
              .from("profiles")
              .update({ stripe_subscription_id: sub!.id })
              .eq("id", p.id);
          } catch (e) {
            action = "cancel_reassert_FAILED: " + (e instanceof Error ? e.message : "unknown");
          }
          details.push({ email: p.email, status: sub!.status, action });
          continue;
        }

        // Stamped as cancelled at some point, still billing, with no pending
        // downgrade to explain it. Could be a charge nobody expects, could be
        // a stale stamp on someone who re-subscribed — not something to guess
        // at automatically, so it is surfaced and left alone.
        if (needsCancellationReview(p, sub)) {
          needsReview += 1;
          details.push({ email: p.email, status: sub!.status, action: "REVIEW: cancelled_at set but still billing" });
          continue;
        }

        if (!sub) {
          details.push({ email: p.email, status: "no_subscription", action: "none" });
          continue;
        }
        const failing = ["past_due", "unpaid", "incomplete", "incomplete_expired"].includes(sub.status);

        if (failing) {
          // Find the invoice the customer still owes so we can retry it and
          // hand them a payment link.
          let invoiceUrl: string | null = null;
          let failedAt = new Date().toISOString();
          try {
            const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const { data: open } = await stripe.invoices.list({ customer: customerId, status: "open", limit: 1 });
            if (open[0]) {
              invoiceUrl = open[0].hosted_invoice_url || null;
              if (open[0].created) failedAt = new Date(open[0].created * 1000).toISOString();
            }
          } catch { /* keep the defaults */ }

          await service
            .from("profiles")
            .update({ last_payment_failed_at: failedAt, last_invoice_url: invoiceUrl })
            .eq("id", p.id);
          failuresFound += 1;
          details.push({ email: p.email, status: sub.status, action: "marked_failed" });
        } else if (sub.status === "active" || sub.status === "trialing") {
          const { data: row } = await service
            .from("profiles")
            .select("last_payment_failed_at")
            .eq("id", p.id)
            .single();
          if (row?.last_payment_failed_at) {
            await service
              .from("profiles")
              .update({ last_payment_failed_at: null, last_invoice_url: null })
              .eq("id", p.id);
            cleared += 1;
            details.push({ email: p.email, status: sub.status, action: "cleared" });
          }
        } else if (sub.status === "canceled" && p.subscription_plan !== "free") {
          await service
            .from("profiles")
            .update({ subscription_plan: "free", stripe_subscription_id: null })
            .eq("id", p.id);
          details.push({ email: p.email, status: sub.status, action: "downgraded" });
        }
      } catch (e) {
        details.push({ email: p.email, status: "error", action: e instanceof Error ? e.message : "unknown" });
      }
    }

    return NextResponse.json({ ok: true, checked, failuresFound, cleared, stillBillingAfterCancel, needsReview, details });
  } catch (error) {
    return toErrorResponse(error);
  }
}
