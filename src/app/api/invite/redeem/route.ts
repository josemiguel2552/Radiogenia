import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { code, firstName, lastName, country, hospital, role } = await req.json();
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

    await service
      .from("invitations")
      .update({ used_count: invitation.used_count + 1 })
      .eq("id", invitation.id)
      .eq("used_count", invitation.used_count);

    await service
      .from("invitation_redemptions")
      .insert({ invitation_id: invitation.id, redeemed_by: user.id });

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
      .eq("id", user.id);

    return NextResponse.json({ ok: true, pending_approval: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
