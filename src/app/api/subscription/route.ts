import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type SubscriptionPlan } from "@/lib/types";
import { toErrorResponse } from "@/lib/api-error";

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
      .select("subscription_plan, billing_period_start")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const currentPlan = profile.subscription_plan as SubscriptionPlan;

    if (plan === currentPlan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const isUpgrade = PLANS[plan as SubscriptionPlan].price > PLANS[currentPlan].price;

    if (isUpgrade) {
      return NextResponse.json({ error: "Upgrades require payment via Stripe checkout" }, { status: 402 });
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
