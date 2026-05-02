import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const membership = await requireOrgMembership(user.id);
    const url = new URL(req.url);
    const sectionId = url.searchParams.get("section_id");

    let query = service
      .from("org_templates")
      .select("*, org_sections(name)")
      .eq("org_id", membership.org_id)
      .order("name");

    if (sectionId) query = query.eq("section_id", sectionId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const templates = (data || []).map((t) => {
      const sec = t.org_sections as unknown as { name: string } | null;
      return { ...t, org_sections: undefined, section_name: sec?.name || "" };
    });

    return NextResponse.json(templates, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { section_id, name, modality, structure } = body;

    if (!section_id || !name || !modality || !structure) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const service = createServiceClient();
    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: section_id,
    });

    const { data, error } = await service
      .from("org_templates")
      .insert({
        org_id: membership.org_id,
        section_id,
        name,
        modality,
        structure,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { id, name, modality, structure } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });

    // Fetch template to check section ownership
    const { data: tmpl } = await service
      .from("org_templates")
      .select("section_id")
      .eq("id", id)
      .single();

    if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: tmpl.section_id,
    });

    const update: Record<string, unknown> = { updated_by: user.id, updated_at: new Date().toISOString() };
    if (name !== undefined) update.name = name;
    if (modality !== undefined) update.modality = modality;
    if (structure !== undefined) update.structure = structure;

    const { error } = await service.from("org_templates").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing template id" }, { status: 400 });

    const { data: tmpl } = await service
      .from("org_templates")
      .select("section_id")
      .eq("id", id)
      .single();

    if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });

    await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: tmpl.section_id,
    });

    const { error } = await service.from("org_templates").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
