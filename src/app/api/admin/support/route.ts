import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();

    const service = createServiceClient();
    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    const status = url.searchParams.get("status");

    let query = service
      .from("support_tickets")
      .select("*, profiles(email, name), organizations(name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (orgId) query = query.eq("org_id", orgId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tickets = (data || []).map((t) => {
      const profile = t.profiles as unknown as { email: string; name: string } | null;
      const org = t.organizations as unknown as { name: string } | null;
      return {
        ...t,
        profiles: undefined,
        organizations: undefined,
        user_email: profile?.email || "",
        user_name: profile?.name || "",
        org_name: org?.name || null,
      };
    });

    void userId;
    return NextResponse.json(tickets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await requireAdmin();

    const service = createServiceClient();
    const { id, status, admin_reply } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ticket id" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (status) update.status = status;
    if (admin_reply !== undefined) {
      update.admin_reply = admin_reply;
      update.admin_user_id = userId;
      update.replied_at = new Date().toISOString();
    }

    const { error } = await service.from("support_tickets").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
