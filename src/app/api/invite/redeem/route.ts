import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

    const service = createServiceClient();

    const { data: profile } = await service
      .from("profiles")
      .select("invitation_code")
      .eq("id", user.id)
      .single();

    if (profile?.invitation_code) {
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

    if (invitation.owner_id === user.id) {
      return NextResponse.json({ error: "cannot_self_invite" }, { status: 400 });
    }

    const bonusExpires = new Date();
    bonusExpires.setDate(bonusExpires.getDate() + 30);
    const bonusExpiresIso = bonusExpires.toISOString();

    await service
      .from("invitations")
      .update({ used_count: invitation.used_count + 1 })
      .eq("id", invitation.id)
      .eq("used_count", invitation.used_count);

    await service
      .from("invitation_redemptions")
      .insert({ invitation_id: invitation.id, redeemed_by: user.id });

    await service
      .from("profiles")
      .update({
        subscription_plan: "starter",
        billing_period_start: new Date().toISOString(),
        reports_used_this_month: 0,
        dictation_seconds_used: 0,
        approved: true,
        invited_by: invitation.owner_id,
        invitation_code: invitation.code,
        referral_bonus_expires_at: bonusExpiresIso,
      })
      .eq("id", user.id);

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

    return NextResponse.json({ ok: true, plan: "starter", bonusExpires: bonusExpiresIso });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
