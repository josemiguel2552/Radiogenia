import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type SubscriptionPlan } from "@/lib/types";
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
};

export const dynamic = "force-dynamic";

function getNextPeriodDate(periodStart: string): Date {
  const start = new Date(periodStart);
  const next = new Date(start);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan, reports_used_this_month, dictation_seconds_used, billing_period_start, pending_plan, pending_plan_effective_date, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    let referralBonusExpires: string | null = null;
    let stripeSubId: string | null = null;
    try {
      const { data: extra } = await service
        .from("profiles")
        .select("referral_bonus_expires_at, stripe_subscription_id")
        .eq("id", user.id)
        .single();
      referralBonusExpires = extra?.referral_bonus_expires_at ?? null;
      stripeSubId = extra?.stripe_subscription_id ?? null;
    } catch { /* columns may not exist yet */ }

    // Self-healing sync with Stripe: if the user has a Stripe customer but the
    // local plan is "free" (e.g. the checkout webhook never arrived), query
    // Stripe directly for the active subscription and reconcile the DB.
    if (profile.stripe_customer_id && profile.subscription_plan === "free" && !profile.pending_plan) {
      const stripe = getStripe();
      if (stripe) {
        try {
          let sub: Stripe.Subscription | null = null;

          if (stripeSubId) {
            try {
              sub = await stripe.subscriptions.retrieve(stripeSubId);
            } catch { /* stored sub id stale — fall through to customer lookup */ }
          }

          if (!sub || (sub.status !== "active" && sub.status !== "trialing")) {
            const list = await stripe.subscriptions.list({
              customer: profile.stripe_customer_id,
              status: "active",
              limit: 1,
            });
            sub = list.data[0] ?? sub;
          }

          if (sub && (sub.status === "active" || sub.status === "trialing")) {
            const priceId = sub.items.data[0]?.price?.id;
            const envMap: Record<string, SubscriptionPlan> = {};
            for (const [plan, envKey] of Object.entries(PLAN_PRICE_ENV)) {
              const pid = process.env[envKey];
              if (pid) envMap[pid] = plan as SubscriptionPlan;
            }
            const realPlan = priceId ? envMap[priceId] : undefined;
            if (realPlan && realPlan !== "free") {
              profile.subscription_plan = realPlan;
              profile.billing_period_start = new Date(
                (sub.items.data[0]?.current_period_start ?? Math.floor(Date.now() / 1000)) * 1000
              ).toISOString();
              profile.reports_used_this_month = 0;
              profile.dictation_seconds_used = 0;
              stripeSubId = sub.id;
              await service
                .from("profiles")
                .update({
                  subscription_plan: realPlan,
                  stripe_subscription_id: sub.id,
                  billing_period_start: profile.billing_period_start,
                  reports_used_this_month: 0,
                  dictation_seconds_used: 0,
                })
                .eq("id", user.id);
            }
          }
        } catch { /* Stripe unreachable — use local data */ }
      }
    }

    const bonusExpired = referralBonusExpires
      && new Date(referralBonusExpires).getTime() <= Date.now();
    const hasPaidSub = !!stripeSubId;

    if (bonusExpired && !hasPaidSub && profile.subscription_plan !== "free") {
      await service
        .from("profiles")
        .update({
          subscription_plan: "free",
          referral_bonus_expires_at: null,
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          billing_period_start: new Date().toISOString(),
        })
        .eq("id", user.id);
      profile.subscription_plan = "free";
      profile.reports_used_this_month = 0;
      profile.dictation_seconds_used = 0;
      profile.billing_period_start = new Date().toISOString();
    }

    const periodStart = profile.billing_period_start || new Date().toISOString();
    const nextPeriod = getNextPeriodDate(periodStart);
    const needsReset = nextPeriod.getTime() <= Date.now();

    let plan = (profile.subscription_plan || "free") as SubscriptionPlan;
    let used = profile.reports_used_this_month || 0;
    let dictationSecondsUsed = profile.dictation_seconds_used || 0;
    let pendingPlan = profile.pending_plan as SubscriptionPlan | null;
    let pendingEffective = profile.pending_plan_effective_date;

    if (needsReset) {
      if (pendingPlan && PLANS[pendingPlan]) {
        plan = pendingPlan;
        pendingPlan = null;
        pendingEffective = null;
      }
      used = 0;
      dictationSecondsUsed = 0;

      await service
        .from("profiles")
        .update({
          subscription_plan: plan,
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          billing_period_start: new Date().toISOString(),
          pending_plan: null,
          pending_plan_effective_date: null,
        })
        .eq("id", user.id);
    }

    const planConfig = PLANS[plan];

    return NextResponse.json({
      plan,
      planConfig,
      used,
      limit: planConfig.reports,
      remaining: Math.max(0, planConfig.reports - used),
      periodStart,
      nextPeriodDate: nextPeriod.toISOString(),
      pendingPlan,
      pendingPlanEffectiveDate: pendingEffective,
      hasStripe: !!profile.stripe_customer_id,
      dictation: {
        usedSeconds: dictationSecondsUsed,
        limitSeconds: planConfig.dictationMinutes * 60,
        usedMinutes: Math.round(dictationSecondsUsed / 60),
        limitMinutes: planConfig.dictationMinutes,
        remainingMinutes: Math.max(0, planConfig.dictationMinutes - Math.round(dictationSecondsUsed / 60)),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan, cancelPending } = await req.json();

    const service = createServiceClient();

    if (cancelPending) {
      const { data: info } = await service
        .from("profiles")
        .select("stripe_subscription_id, pending_plan, subscription_plan")
        .eq("id", user.id)
        .single();

      if (info?.stripe_subscription_id) {
        const stripe = getStripe();
        if (stripe) {
          if (info.pending_plan === "free") {
            await stripe.subscriptions.update(info.stripe_subscription_id, {
              cancel_at_period_end: false,
            });
          } else if (info.pending_plan && info.subscription_plan && info.subscription_plan !== "free") {
            const envKey = PLAN_PRICE_ENV[info.subscription_plan];
            const currentPriceId = envKey ? process.env[envKey] : null;
            if (currentPriceId) {
              const sub = await stripe.subscriptions.retrieve(info.stripe_subscription_id);
              const itemId = sub.items.data[0]?.id;
              if (itemId) {
                await stripe.subscriptions.update(info.stripe_subscription_id, {
                  items: [{ id: itemId, price: currentPriceId }],
                  proration_behavior: "none",
                });
              }
            }
          }
        }
      }

      await service
        .from("profiles")
        .update({ pending_plan: null, pending_plan_effective_date: null })
        .eq("id", user.id);
      return NextResponse.json({ ok: true, cancelled: true });
    }

    if (!plan || !PLANS[plan as SubscriptionPlan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan, billing_period_start, stripe_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const currentPlan = profile.subscription_plan as SubscriptionPlan;

    if (plan === currentPlan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const isUpgrade = PLANS[plan as SubscriptionPlan].price > PLANS[currentPlan].price;

    if (isUpgrade && !profile.stripe_subscription_id) {
      return NextResponse.json({ error: "No active subscription — use checkout", needsCheckout: true }, { status: 402 });
    }

    if (isUpgrade && profile.stripe_subscription_id) {
      const stripe = getStripe();
      if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

      const envKey = PLAN_PRICE_ENV[plan];
      const newPriceId = envKey ? process.env[envKey] : null;
      if (!newPriceId) return NextResponse.json({ error: "Price not configured" }, { status: 503 });

      const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      const itemId = sub.items.data[0]?.id;
      if (itemId) {
        await stripe.subscriptions.update(profile.stripe_subscription_id, {
          items: [{ id: itemId, price: newPriceId }],
          proration_behavior: "none",
        });
      }

      await service
        .from("profiles")
        .update({ subscription_plan: plan })
        .eq("id", user.id);

      return NextResponse.json({ ok: true, immediate: true });
    }

    if (profile.stripe_subscription_id) {
      const stripe = getStripe();
      if (stripe) {
        if (plan === "free") {
          await stripe.subscriptions.update(profile.stripe_subscription_id, {
            cancel_at_period_end: true,
          });
        } else {
          const envKey = PLAN_PRICE_ENV[plan];
          const newPriceId = envKey ? process.env[envKey] : null;
          if (newPriceId) {
            const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
            const itemId = sub.items.data[0]?.id;
            if (itemId) {
              await stripe.subscriptions.update(profile.stripe_subscription_id, {
                items: [{ id: itemId, price: newPriceId }],
                proration_behavior: "none",
              });
            }
          }
        }
      }
    }

    const effectiveDate = getNextPeriodDate(profile.billing_period_start || new Date().toISOString());
    await service
      .from("profiles")
      .update({
        pending_plan: plan,
        pending_plan_effective_date: effectiveDate.toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({ ok: true, deferred: true, effectiveDate: effectiveDate.toISOString() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
