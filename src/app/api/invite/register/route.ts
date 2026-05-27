import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApprovalEmail } from "@/lib/email";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

const MANUAL_APPROVAL_COUNTRIES = ["España", "Portugal"];

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = rateLimit(`invite-register:${ip}`, RATE_LIMITS.auth);
    if (!rl.allowed) return rl.errorResponse!;

    const { code, email, password, firstName, lastName, country, hospital, role } = await req.json();

    if (!code || !email || !password) {
      return NextResponse.json({ error: "code_email_password_required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "password_too_short" }, { status: 400 });
    }

    const service = createServiceClient();
    const normalizedEmail = email.trim().toLowerCase();
    const codeUpper = code.toUpperCase().trim();

    const { data: invitation } = await service
      .from("invitations")
      .select("id, code, max_uses, used_count, owner_id")
      .eq("code", codeUpper)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }
    if (invitation.used_count >= invitation.max_uses) {
      return NextResponse.json({ error: "code_exhausted" }, { status: 410 });
    }

    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: { invitation_code: codeUpper },
    });

    if (authError) {
      if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
        return NextResponse.json({ error: "already_registered" }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "signup_failed" }, { status: 500 });
    }

    const userId = authData.user.id;

    await service.from("profiles").upsert({
      id: userId,
      email: normalizedEmail,
      role: "radiologist",
      subscription_plan: "free",
      approved: false,
    });

    await service.from("user_model_config").insert({ user_id: userId }).select().maybeSingle();

    if (invitation.owner_id === userId) {
      return NextResponse.json({ error: "cannot_self_invite" }, { status: 400 });
    }

    const { count } = await service
      .from("invitations")
      .update({ used_count: invitation.used_count + 1 }, { count: "exact" })
      .eq("id", invitation.id)
      .eq("used_count", invitation.used_count);

    if (!count || count === 0) {
      return NextResponse.json({ error: "code_exhausted" }, { status: 410 });
    }

    await service
      .from("invitation_redemptions")
      .insert({ invitation_id: invitation.id, redeemed_by: userId });

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
    const needsManualApproval = !country || MANUAL_APPROVAL_COUNTRIES.includes(country);
    const autoApproved = !needsManualApproval;

    const bonusExpires = new Date();
    bonusExpires.setDate(bonusExpires.getDate() + 30);
    const bonusExpiresIso = bonusExpires.toISOString();

    await service
      .from("profiles")
      .update({
        approved: autoApproved,
        invited_by: invitation.owner_id,
        invitation_code: invitation.code,
        ...(fullName ? { name: fullName } : {}),
        ...(country ? { country } : {}),
        ...(hospital ? { hospital } : {}),
        ...(role ? { professional_role: role } : {}),
        ...(autoApproved ? {
          subscription_plan: "starter",
          billing_period_start: new Date().toISOString(),
          reports_used_this_month: 0,
          dictation_seconds_used: 0,
          referral_bonus_expires_at: bonusExpiresIso,
        } : {}),
      })
      .eq("id", userId);

    if (autoApproved) {
      try {
        await service.auth.admin.updateUserById(userId, { email_confirm: true });
      } catch (err) {
        console.error("[invite-register] email confirm error:", err);
      }

      try {
        await sendApprovalEmail(normalizedEmail, fullName);
      } catch (err) {
        console.error("[invite-register] approval email error:", err);
      }

      try {
        const { data: referrer } = await service
          .from("profiles")
          .select("subscription_plan")
          .eq("id", invitation.owner_id)
          .single();

        const PLAN_RANK: Record<string, number> = { free: 0, resident: 1, starter: 2, professional: 3 };
        const referrerRank = PLAN_RANK[referrer?.subscription_plan || "free"] ?? 0;

        if (referrerRank < PLAN_RANK.starter) {
          await service
            .from("profiles")
            .update({
              subscription_plan: "starter",
              billing_period_start: new Date().toISOString(),
              reports_used_this_month: 0,
              dictation_seconds_used: 0,
              referral_bonus_expires_at: bonusExpiresIso,
            })
            .eq("id", invitation.owner_id);
        }
      } catch (err) {
        console.error("[invite-register] referrer bonus error:", err);
      }
    }

    return NextResponse.json({ ok: true, auto_approved: autoApproved, pending_approval: !autoApproved });
  } catch (error) {
    return toErrorResponse(error);
  }
}
