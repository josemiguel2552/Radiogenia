export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const membership = await requireOrgMembership(user.id);
    const sectionId = req.nextUrl.searchParams.get("section_id");

    let query = service
      .from("org_recommendations")
      .select("*, org_sections(name)")
      .eq("org_id", membership.org_id)
      .order("category")
      .order("title");

    if (sectionId) query = query.eq("section_id", sectionId);

    const { data, error } = await query;
    if (error) return dbErrorResponse(error);

    const recs = (data || []).map((r) => {
      const sec = r.org_sections as unknown as { name: string } | null;
      return { ...r, org_sections: undefined, section_name: sec?.name || "" };
    });

    return NextResponse.json(recs, {
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

    const { section_id, category, modality, title, text, tags, source } = await req.json();
    if (!section_id || !title || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = createServiceClient();
    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: section_id,
    });

    const { data, error } = await service
      .from("org_recommendations")
      .insert({
        org_id: membership.org_id,
        section_id,
        category: category || "all",
        modality: modality || "all",
        title,
        text,
        tags: tags || [],
        trigger_keyword: title,
        recommendation_text: text,
        source: source || "manual",
        created_by: user.id,
        updated_by: user.id,
      })
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

    const service = createServiceClient();
    const { id, category, modality, title, text, tags, source } = await req.json();
    if (!id || !title || !text) {
      return NextResponse.json({ error: "id, title and text required" }, { status: 400 });
    }

    const { data: rec } = await service
      .from("org_recommendations")
      .select("section_id")
      .eq("id", id)
      .single();

    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: rec.section_id,
    });

    const { error } = await service
      .from("org_recommendations")
      .update({
        category: category || "all",
        modality: modality || "all",
        title,
        text,
        tags: tags || [],
        trigger_keyword: title,
        recommendation_text: text,
        ...(source ? { source } : {}),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
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

    const service = createServiceClient();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data: rec } = await service
      .from("org_recommendations")
      .select("section_id")
      .eq("id", id)
      .single();

    if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: rec.section_id,
    });

    const { error } = await service.from("org_recommendations").delete().eq("id", id);
    if (error) return dbErrorResponse(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
