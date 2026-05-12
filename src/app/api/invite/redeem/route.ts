import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

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

    await service
      .from("profiles")
      .update({
        approved: false,
        invited_by: invitation.owner_id,
        invitation_code: invitation.code,
        ...(fullName ? { name: fullName } : {}),
        ...(country ? { country } : {}),
        ...(hospital ? { hospital } : {}),
        ...(role ? { professional_role: role } : {}),
      })
      .eq("id", profile.id);

    return NextResponse.json({ ok: true, pending_approval: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
