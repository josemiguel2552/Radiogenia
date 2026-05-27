import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();

    const { data: existing } = await service
      .from("invitations")
      .select("id, code, max_uses, used_count, created_at")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing);
    }

    const isAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || "");
    const maxUses = isAdmin ? 50 : 3;

    let code = generateCode();
    let inserted = false;
    for (let i = 0; i < 5; i++) {
      const { error } = await service.from("invitations").insert({
        code,
        owner_id: user.id,
        max_uses: maxUses,
        used_count: 0,
      });
      if (!error) { inserted = true; break; }
      code = generateCode();
    }

    if (!inserted) {
      return NextResponse.json({ error: "Failed to generate invite code" }, { status: 500 });
    }

    const { data: created } = await service
      .from("invitations")
      .select("id, code, max_uses, used_count, created_at")
      .eq("owner_id", user.id)
      .single();

    return NextResponse.json(created);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const service = createServiceClient();
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

    return NextResponse.json({ valid: true, remaining: invitation.max_uses - invitation.used_count });
  } catch (error) {
    return toErrorResponse(error);
  }
}
