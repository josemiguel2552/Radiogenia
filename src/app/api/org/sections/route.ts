import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgMembership(user.id);
    const service = createServiceClient();

    const { data, error } = await service
      .from("org_sections")
      .select("*")
      .eq("org_id", membership.org_id)
      .order("display_order");

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data || [], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgRole(user.id, { chief: true });
    const { name, slug, display_order } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: "Missing name or slug" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data, error } = await service
      .from("org_sections")
      .insert({ org_id: membership.org_id, name, slug, display_order: display_order || 0 })
      .select()
      .single();

    if (error) return dbErrorResponse(error);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireOrgRole(user.id, { chief: true });
    const { id, name, slug, display_order } = await req.json();

    if (!id) return NextResponse.json({ error: "Missing section id" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (display_order !== undefined) update.display_order = display_order;

    const service = createServiceClient();
    const { error } = await service
      .from("org_sections")
      .update(update)
      .eq("id", id);

    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await requireOrgRole(user.id, { chief: true });
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing section id" }, { status: 400 });

    const service = createServiceClient();
    const { error } = await service.from("org_sections").delete().eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
