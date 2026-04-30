import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const orgId = url.searchParams.get("org_id");
    if (!orgId) return NextResponse.json({ error: "Missing org_id" }, { status: 400 });

    const { data, error } = await service
      .from("org_sections")
      .select("*")
      .eq("org_id", orgId)
      .order("display_order", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const { org_id, name, slug } = await req.json();
    if (!org_id || !name || !slug) {
      return NextResponse.json({ error: "Missing org_id, name, or slug" }, { status: 400 });
    }

    const { data, error } = await service
      .from("org_sections")
      .insert({ org_id, name, slug })
      .select()
      .single();

    if (error) {
      console.error("[admin/org/sections POST] insert error:", error.message, { org_id, name, slug });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[admin/org/sections POST] exception:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const service = createServiceClient();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing section id" }, { status: 400 });

    const { error } = await service.from("org_sections").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
