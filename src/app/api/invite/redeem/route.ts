import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendApprovalEmail } from "@/lib/email";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

const MANUAL_APPROVAL_COUNTRIES = ["España", "Portugal"];

export async function POST(req: NextRequest) {
  try {
    const { code, email, firstName, lastName, country, hospital, role } = await req.json();
    if (!code || !email) return NextResponse.json({ error: "Code and email required" }, { status: 400 });

    const service = createServiceClient();
    const normalizedEmail = email.trim().toLowerCase();

    const { data: profile } = await service
      .from("profiles")
      .select("id, invitation_code")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }

    if (profile.invitation_code) {
      return NextResponse.json({ error: "already_redeemed" }, { status: 400 });
    }

    const { data: invitation } = await service
      .from("invitations")
      .select("id, code, max_uses, used_count, owner_id")
      .eq("code", code.toUpperCase().trim())
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }

    if (invitation.used_count >= invitation.max_uses) {
      return NextResponse.json({ error: "code_exhausted" }, { status: 410 });
    }

    if (invitation.owner_id === profile.id) {
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
      .insert({ invitation_id: invitation.id, redeemed_by: profile.id });

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
      .eq("id", profile.id);

    if (autoApproved) {
      try {
        await service.auth.admin.updateUserById(profile.id, { email_confirm: true });
      } catch (err) {
        console.error("[redeem] email confirm error:", err);
      }

      try {
        await sendApprovalEmail(normalizedEmail, fullName);
      } catch (err) {
        console.error("[redeem] approval email error:", err);
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
        console.error("[redeem] referrer bonus error:", err);
      }
    }

    return NextResponse.json({ ok: true, auto_approved: autoApproved, pending_approval: !autoApproved });
  } catch (error) {
    return toErrorResponse(error);
  }
}
