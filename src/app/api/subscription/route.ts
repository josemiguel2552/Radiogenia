import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { PLANS, type SubscriptionPlan } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("subscription_plan, reports_used_this_month, dictation_seconds_used, billing_period_start")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const plan = (profile.subscription_plan || "free") as SubscriptionPlan;
    const planConfig = PLANS[plan];
    const used = profile.reports_used_this_month || 0;
    const limit = planConfig.reports;
    const periodStart = profile.billing_period_start;

    const needsReset = new Date(periodStart).getTime() + 30 * 24 * 60 * 60 * 1000 < Date.now();
    const effectiveUsed = needsReset ? 0 : used;

    const dictationSecondsUsed = needsReset ? 0 : (profile.dictation_seconds_used || 0);
    const dictationLimitSeconds = planConfig.dictationMinutes * 60;

    if (needsReset) {
      const service = createServiceClient();
      await service
        .from("profiles")
        .update({
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          billing_period_start: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      plan,
      planConfig,
      used: effectiveUsed,
      limit,
      remaining: Math.max(0, limit - effectiveUsed),
      periodStart,
      dictation: {
        usedSeconds: dictationSecondsUsed,
        limitSeconds: dictationLimitSeconds,
        usedMinutes: Math.round(dictationSecondsUsed / 60),
        limitMinutes: planConfig.dictationMinutes,
        remainingMinutes: Math.max(0, planConfig.dictationMinutes - Math.round(dictationSecondsUsed / 60)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { plan } = await req.json();
    if (!plan || !PLANS[plan as SubscriptionPlan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_plan: plan,
        billing_period_start: new Date().toISOString(),
        reports_used_this_month: 0,
        dictation_seconds_used: 0,
      })
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
