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
    STRIPE_PRICE_RESIDENT: "resident",
    STRIPE_PRICE_STARTER: "starter",
    STRIPE_PRICE_PROFESSIONAL: "professional",
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (session.metadata?.supabase_user_id) {
          await service
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
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

        const update: Record<string, unknown> = {
          stripe_subscription_id: subscription.id,
          subscription_plan: isActive ? plan : "free",
        };

        if (isActive && subscription.start_date) {
          update.billing_period_start = new Date(subscription.start_date * 1000).toISOString();
        }

        await service
          .from("profiles")
          .update(update)
          .eq("stripe_customer_id", customerId);

        if (isActive && event.type === "customer.subscription.updated") {
          const { data: profile } = await service
            .from("profiles")
            .select("email, name")
            .eq("stripe_customer_id", customerId)
            .single();
          if (profile?.email) {
            sendPlanChangeEmail(profile.email, profile.name, plan).catch(() => {});
          }
        }

        console.log(`[stripe-webhook] ${event.type}: customer=${customerId}, plan=${plan}, active=${isActive}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

        await service
          .from("profiles")
          .update({
            subscription_plan: "free",
            stripe_subscription_id: null,
            pending_plan: null,
            pending_plan_effective_date: null,
          })
          .eq("stripe_customer_id", customerId);

        console.log(`[stripe-webhook] subscription.deleted: customer=${customerId} → free`);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId && invoice.billing_reason === "subscription_cycle") {
          await service
            .from("profiles")
            .update({
              reports_used_this_month: 0,
              dictation_seconds_used: 0,
              billing_period_start: new Date().toISOString(),
              pending_plan: null,
              pending_plan_effective_date: null,
            })
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
            sendPaymentFailedEmail(profile.email, profile.name).catch(() => {});
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
