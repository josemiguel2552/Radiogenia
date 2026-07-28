import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendApprovalEmail } from "@/lib/email";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const [{ data: profiles, error }, { data: reportCounts }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, email, name, role, subscription_plan, reports_used_this_month, dictation_seconds_used, billing_period_start, created_at, approved, invitation_code, country, hospital, professional_role, org_id, stripe_subscription_id, pending_plan, pending_plan_effective_date, email_verified")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("reports")
        .select("user_id")
        .limit(50000),
    ]);

    if (error) {
      return dbErrorResponse(error);
    }

    // Trial/retention/cancellation columns are best-effort: they arrive with
    // the trial-billing migrations and the users list must not break without.
    const trialById = new Map<string, Record<string, unknown>>();
    const selects = [
      "id, trial_used_at, trial_ends_at, subscription_ended_at, subscription_cancelled_at",
      "id, trial_used_at, trial_ends_at, subscription_ended_at",
      "id, trial_used_at, trial_ends_at",
    ];
    for (const sel of selects) {
      const { data: trialRows, error: trialErr } = await supabase
        .from("profiles")
        .select(sel)
        .limit(1000);
      if (!trialErr) {
        for (const r of (trialRows || []) as unknown as { id: string }[]) trialById.set(r.id, r);
        break;
      }
    }

    const countMap = new Map<string, number>();
    for (const r of reportCounts || []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    }

    const users = (profiles || []).map((p) => ({
      ...p,
      ...(trialById.get(p.id) || {}),
      report_count: countMap.get(p.id) || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { email, password, subscription_plan } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "email and password required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }
    const plan = ["free", "starter", "professional"].includes(subscription_plan)
      ? subscription_plan
      : "free";

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 400 },
      );
    }

    const userId = authData.user.id;

    await supabase.from("profiles").upsert({
      id: userId,
      email,
      role: "radiologist",
      subscription_plan: plan,
      approved: true,
    });

    await supabase.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

    return NextResponse.json({ ok: true, userId });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { userId, role, subscription_plan, approved } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    const updates: Record<string, string | boolean | number | null> = {};
    if (role && (role === "admin" || role === "radiologist")) updates.role = role;
    if (subscription_plan && ["free", "resident", "starter", "professional"].includes(subscription_plan)) {
      updates.subscription_plan = subscription_plan;
    }
    if (typeof approved === "boolean") {
      updates.approved = approved;
      if (approved) updates.email_verified = true;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (approved === true) {
      try {
        await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
        const { data: profile } = await supabase
          .from("profiles")
          .select("invitation_code, invited_by, pending_checkout_plan")
          .eq("id", userId)
          .single();

        // NOTE: approving the account does NOT grant the resident plan.
        // Residents keep pending_checkout_plan="resident" and must complete
        // payment (after their certificate is verified) to activate it.

        if (profile?.invitation_code && profile?.invited_by) {
          const bonusExpires = new Date();
          bonusExpires.setDate(bonusExpires.getDate() + 30);
          const bonusExpiresIso = bonusExpires.toISOString();

          updates.subscription_plan = "starter";
          updates.billing_period_start = new Date().toISOString();
          updates.reports_used_this_month = 0;
          updates.dictation_seconds_used = 0;
          updates.referral_bonus_expires_at = bonusExpiresIso;

          const { data: referrer } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", profile.invited_by)
            .single();

          const PLAN_RANK: Record<string, number> = { free: 0, resident: 1, starter: 2, professional: 3 };
          const referrerRank = PLAN_RANK[referrer?.subscription_plan || "free"] ?? 0;

          if (referrerRank < PLAN_RANK.starter) {
            await supabase
              .from("profiles")
              .update({
                subscription_plan: "starter",
                billing_period_start: new Date().toISOString(),
                reports_used_this_month: 0,
                dictation_seconds_used: 0,
                referral_bonus_expires_at: bonusExpiresIso,
              })
              .eq("id", profile.invited_by);
          }
        }
      } catch (err) {
        console.error("[admin] referral bonus error:", err);
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId);

    if (error) return dbErrorResponse(error);

    if (approved === true) {
      try {
        const { data: p } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("id", userId)
          .single();
        if (p?.email) {
          await sendApprovalEmail(p.email, p.name);
        }
      } catch (err) {
        console.error("[admin] approval email error:", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();
    const { userId } = await req.json();

    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    // Delete from auth.users first — this cascades to profiles, org_members, etc.
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
