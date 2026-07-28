import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendPaymentFailedEmail, sendPlanChangeEmail } from "@/lib/email";
import { PLANS, type SubscriptionPlan } from "@/lib/types";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const PRICE_TO_PLAN: Record<string, SubscriptionPlan> = {};

function buildPriceMap() {
  if (Object.keys(PRICE_TO_PLAN).length > 0) return;
  const envMap: Record<string, string> = {
    STRIPE_PRICE_ID_RESIDENT: "resident",
    STRIPE_PRICE_ID_STARTER: "starter",
    STRIPE_PRICE_ID_PROFESSIONAL: "professional",
  };
  for (const [envKey, plan] of Object.entries(envMap)) {
    const priceId = process.env[envKey];
    if (priceId) PRICE_TO_PLAN[priceId] = plan as SubscriptionPlan;
  }
}

function planFromPriceId(priceId: string): SubscriptionPlan {
  buildPriceMap();
  return PRICE_TO_PLAN[priceId] || "free";
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error(`[stripe-webhook] Signature verification failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const service = createServiceClient();

  const { error: dupeError } = await service
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (dupeError?.code === "23505") {
    console.log(`[stripe-webhook] Duplicate event ${event.id}, skipping`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (session.metadata?.supabase_user_id) {
          const update: Record<string, unknown> = {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          };

          if (subscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = sub.items.data[0]?.price?.id;
              const plan = priceId ? planFromPriceId(priceId) : "free";
              if (plan !== "free" && (sub.status === "active" || sub.status === "trialing")) {
                update.subscription_plan = plan;
                update.billing_period_start = new Date().toISOString();
                update.reports_used_this_month = 0;
                update.dictation_seconds_used = 0;
                // Reactivation ends any running data-retention countdown.
                try {
                  await service
                    .from("profiles")
                    .update({ subscription_ended_at: null })
                    .eq("id", session.metadata.supabase_user_id);
                } catch { /* column may predate migration */ }
              }
              // Trial bookkeeping (best-effort: columns may predate migration).
              if (sub.status === "trialing" && sub.trial_end) {
                try {
                  await service
                    .from("profiles")
                    .update({
                      trial_used_at: new Date().toISOString(),
                      trial_ends_at: new Date(sub.trial_end * 1000).toISOString(),
                      trial_reminder_sent_at: null,
                    })
                    .eq("id", session.metadata.supabase_user_id);
                } catch { /* ignore */ }
              }
              console.log(`[stripe-webhook] checkout.session.completed: user=${session.metadata.supabase_user_id}, plan=${plan}, status=${sub.status}`);
            } catch (err) {
              console.error("[stripe-webhook] checkout.session.completed: failed to retrieve subscription:", err instanceof Error ? err.message : err);
            }
          }

          update.pending_checkout_plan = null;

          await service
            .from("profiles")
            .update(update)
            .eq("id", session.metadata.supabase_user_id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        const priceId = subscription.items.data[0]?.price?.id;
        const plan = priceId ? planFromPriceId(priceId) : "free";
        const isActive = subscription.status === "active" || subscription.status === "trialing";
        let previousPlan: string | null = null;

        if (event.type === "customer.subscription.updated") {
          const { data: existing } = await service
            .from("profiles")
            .select("pending_plan, subscription_plan, stripe_subscription_id")
            .eq("stripe_customer_id", customerId)
            .single();

          previousPlan = existing?.subscription_plan ?? null;

          if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== subscription.id) {
            console.log(`[stripe-webhook] ${event.type}: stale event for subscription ${subscription.id}, current is ${existing.stripe_subscription_id}, skipping`);
            break;
          }

          if (existing?.pending_plan) {
            const deferredUpdate: Record<string, unknown> = {
              stripe_subscription_id: subscription.id,
            };
            if (isActive && subscription.items.data[0]?.current_period_start) {
              deferredUpdate.billing_period_start = new Date(subscription.items.data[0]?.current_period_start * 1000).toISOString();
            }
            await service
              .from("profiles")
              .update(deferredUpdate)
              .eq("stripe_customer_id", customerId);
            console.log(`[stripe-webhook] ${event.type}: customer=${customerId}, deferred downgrade in progress, skipping plan update`);
            break;
          }
        }

        const resolvedPlan = isActive ? plan : "free";
        const update: Record<string, unknown> = {
          stripe_subscription_id: subscription.id,
          subscription_plan: resolvedPlan,
        };

        if (isActive && subscription.items.data[0]?.current_period_start) {
          update.billing_period_start = new Date(subscription.items.data[0]?.current_period_start * 1000).toISOString();
        }

        await service
          .from("profiles")
          .update(update)
          .eq("stripe_customer_id", customerId);

        // Reactivation ends any running data-retention countdown, and a live
        // non-cancelling subscription wipes the cancellation timestamp
        // (best-effort: columns may predate migrations).
        if (isActive) {
          try {
            await service
              .from("profiles")
              .update({ subscription_ended_at: null })
              .eq("stripe_customer_id", customerId)
              .not("subscription_ended_at", "is", null);
          } catch { /* ignore */ }
          if (!subscription.cancel_at_period_end) {
            try {
              await service
                .from("profiles")
                .update({ subscription_cancelled_at: null })
                .eq("stripe_customer_id", customerId)
                .not("subscription_cancelled_at", "is", null);
            } catch { /* ignore */ }
          }
        }

        // Trial bookkeeping (best-effort: columns may predate migration).
        if (subscription.status === "trialing" && subscription.trial_end) {
          try {
            await service
              .from("profiles")
              .update({
                trial_used_at: new Date().toISOString(),
                trial_ends_at: new Date(subscription.trial_end * 1000).toISOString(),
              })
              .eq("stripe_customer_id", customerId)
              .is("trial_used_at", null);
          } catch { /* ignore */ }
        }

        if (event.type === "customer.subscription.updated" && previousPlan !== resolvedPlan) {
          const { data: profile } = await service
            .from("profiles")
            .select("email, name")
            .eq("stripe_customer_id", customerId)
            .single();
          if (profile?.email) {
            sendPlanChangeEmail(profile.email, profile.name, resolvedPlan).catch((err) => {
              console.error("[stripe-webhook] plan change email error:", err instanceof Error ? err.message : err);
            });
          }
        }

        console.log(`[stripe-webhook] ${event.type}: customer=${customerId}, plan=${resolvedPlan}, active=${isActive}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        // Only downgrade if the deleted subscription is the one we track —
        // deleting a stale/replaced subscription must not kill the active plan.
        const { data: delProfile } = await service
          .from("profiles")
          .select("stripe_subscription_id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (delProfile?.stripe_subscription_id && delProfile.stripe_subscription_id !== subscription.id) {
          console.log(`[stripe-webhook] subscription.deleted: ${subscription.id} is not the tracked subscription (${delProfile.stripe_subscription_id}), skipping`);
          break;
        }

        await service
          .from("profiles")
          .update({
            subscription_plan: "free",
            stripe_subscription_id: null,
            pending_plan: null,
            pending_plan_effective_date: null,
          })
          .eq("stripe_customer_id", customerId);

        // Start the 90-day data-retention window (best-effort: the column
        // may predate the retention migration).
        try {
          await service
            .from("profiles")
            .update({ subscription_ended_at: new Date().toISOString() })
            .eq("stripe_customer_id", customerId);
        } catch { /* ignore */ }

        console.log(`[stripe-webhook] subscription.deleted: customer=${customerId} → free`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId && invoice.billing_reason === "subscription_cycle") {
          const { data: cycleProfile } = await service
            .from("profiles")
            .select("pending_plan")
            .eq("stripe_customer_id", customerId)
            .single();

          const cycleUpdate: Record<string, unknown> = {
            reports_used_this_month: 0,
            dictation_seconds_used: 0,
            billing_period_start: new Date().toISOString(),
            pending_plan: null,
            pending_plan_effective_date: null,
          };

          if (cycleProfile?.pending_plan) {
            const pendingPlan = cycleProfile.pending_plan as SubscriptionPlan;
            if (PLANS[pendingPlan]) {
              cycleUpdate.subscription_plan = pendingPlan;
              console.log(`[stripe-webhook] invoice.paid: applying deferred plan change to ${pendingPlan}`);
            }
          }

          await service
            .from("profiles")
            .update(cycleUpdate)
            .eq("stripe_customer_id", customerId);

          console.log(`[stripe-webhook] invoice.paid (cycle): customer=${customerId}, usage reset`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId) {
          const { data: profile } = await service
            .from("profiles")
            .select("email, name")
            .eq("stripe_customer_id", customerId)
            .single();
          if (profile?.email) {
            sendPaymentFailedEmail(profile.email, profile.name).catch((err) => {
              console.error("[stripe-webhook] payment failed email error:", err instanceof Error ? err.message : err);
            });
          }
        }

        console.warn(`[stripe-webhook] invoice.payment_failed: customer=${customerId}, invoice=${invoice.id}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Handler error";
    console.error(`[stripe-webhook] Error processing ${event.type}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
