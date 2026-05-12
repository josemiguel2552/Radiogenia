import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { sendApprovalEmail } from "@/lib/email";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, name, role, subscription_plan, reports_used_this_month, dictation_seconds_used, billing_period_start, created_at, approved, invitation_code, country, hospital, professional_role")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: reportCounts } = await supabase
      .from("reports")
      .select("user_id");

    const countMap = new Map<string, number>();
    for (const r of reportCounts || []) {
      countMap.set(r.user_id, (countMap.get(r.user_id) || 0) + 1);
    }

    const users = (profiles || []).map((p) => ({
      ...p,
      report_count: countMap.get(p.id) || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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
    if (subscription_plan && ["free", "starter", "professional"].includes(subscription_plan)) {
      updates.subscription_plan = subscription_plan;
    }
    if (typeof approved === "boolean") updates.approved = approved;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    if (approved === true) {
      try {
        await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
        const { data: profile } = await supabase
          .from("profiles")
          .select("invitation_code, invited_by")
          .eq("id", userId)
          .single();

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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
