import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, TRIAL_DAYS, type SubscriptionPlan } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";
import Stripe from "stripe";

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

const PLAN_PRICE_ENV: Record<string, string> = {
  resident: "STRIPE_PRICE_ID_RESIDENT",
  starter: "STRIPE_PRICE_ID_STARTER",
  professional: "STRIPE_PRICE_ID_PROFESSIONAL",
  unlimited: "STRIPE_PRICE_ID_UNLIMITED",
};

async function createCheckoutSession(plan: string, _req: NextRequest): Promise<{ url: string | null; error?: string; status?: number }> {
  const stripe = getStripe();
  if (!stripe) return { url: null, error: "Stripe not configured", status: 503 };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Unauthorized", status: 401 };

  // Only Starter and Professional are purchasable. "free" is an internal
  // state and "resident" was retired from the offer (existing resident
  // subscribers keep their plan until they cancel).
  if (!plan || !PLANS[plan as SubscriptionPlan] || plan === "free" || plan === "resident") {
    return { url: null, error: "Invalid plan", status: 400 };
  }

  const envKey = PLAN_PRICE_ENV[plan];
  const priceId = envKey ? process.env[envKey] : null;
  if (!priceId) {
    return { url: null, error: `Price not configured for plan "${plan}".`, status: 503 };
  }

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, email")
    .eq("id", user.id)
    .single();

  if (!profile) return { url: null, error: "Profile not found", status: 404 };

  // Guard against duplicate subscriptions (double billing): a user with an
  // active subscription must change plans via PUT /api/subscription, never
  // through a second Checkout session.
  if (profile.stripe_subscription_id) {
    return { url: null, error: "Active subscription exists — manage your plan from your account", status: 409 };
  }

  let customerId = profile.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email || user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await service
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // Starter starts with a 7-day free trial — once per account. The card is
  // always collected up front; the first charge happens on day 7 unless the
  // user cancels. Professional is charged immediately, no trial.
  // (trial_used_at is read best-effort so checkout keeps working even if the
  // trial-billing migration hasn't been applied yet.)
  let trialEligible = plan === "starter";
  if (trialEligible) {
    try {
      const { data: trialRow, error: trialErr } = await service
        .from("profiles")
        .select("trial_used_at")
        .eq("id", user.id)
        .single();
      if (!trialErr && trialRow?.trial_used_at) trialEligible = false;
    } catch { /* column may not exist yet */ }
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    payment_method_collection: "always",
    subscription_data: {
      ...(trialEligible ? { trial_period_days: TRIAL_DAYS } : {}),
      metadata: { supabase_user_id: user.id },
    },
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=cancel`,
    metadata: { supabase_user_id: user.id },
  });

  return { url: session.url };
}

export async function GET(req: NextRequest) {
  try {
    const plan = req.nextUrl.searchParams.get("plan") || "";
    const result = await createCheckoutSession(plan, req);

    if (result.url) {
      return NextResponse.redirect(result.url);
    }

    const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
    return NextResponse.redirect(
      `${fallback}/dashboard?checkout=error&reason=${encodeURIComponent(result.error || "unknown")}`,
    );
  } catch {
    const fallback = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";
    return NextResponse.redirect(`${fallback}/dashboard?checkout=error`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();
    const result = await createCheckoutSession(plan, req);

    if (result.url) {
      return NextResponse.json({ url: result.url });
    }

    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
