import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

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
export async function POST() {
  try {
    await requireAdmin();

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

    const service = createServiceClient();
    const { data: profiles } = await service
      .from("profiles")
      .select("id, email, stripe_subscription_id, subscription_plan")
      .not("stripe_subscription_id", "is", null)
      .limit(500);

    const stripe = new Stripe(key);
    let checked = 0;
    let failuresFound = 0;
    let cleared = 0;
    const details: { email: string | null; status: string; action: string }[] = [];

    for (const p of profiles || []) {
      checked += 1;
      try {
        const sub = await stripe.subscriptions.retrieve(p.stripe_subscription_id as string);
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

    return NextResponse.json({ ok: true, checked, failuresFound, cleared, details });
  } catch (error) {
    return toErrorResponse(error);
  }
}
