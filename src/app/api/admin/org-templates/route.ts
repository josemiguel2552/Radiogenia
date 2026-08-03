import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/**
 * Admin: institutional templates loaded on the hospital's behalf.
 *
 * A hospital can send us its report models and we load them here. Unlike
 * templates a radiologist imports voluntarily, these are pushed to every
 * member of the institution: after creating one we register the import for
 * all active members so it simply shows up in their Templates tab.
 */

/** Every org template needs a section; institutions we onboard get one by default. */
async function defaultSectionId(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
): Promise<string | null> {
  const { data: existing } = await service
    .from("org_sections")
    .select("id")
    .eq("org_id", orgId)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created } = await service
    .from("org_sections")
    .insert({ org_id: orgId, name: "General", slug: "general", display_order: 0 })
    .select("id")
    .single();
  return created?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const orgId = req.nextUrl.searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId required" }, { status: 400 });

    const service = createServiceClient();
    const { data, error } = await service
      .from("org_templates")
      .select("id, name, modality, structure, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    if (error) return dbErrorResponse(error);

    return NextResponse.json({ templates: data || [] });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: adminId } = await requireAdmin();
    const { orgId, name, modality, body: templateBody, technique } = await req.json();

    if (!orgId || !name || !modality || !templateBody) {
      return NextResponse.json({ error: "orgId, name, modality and body are required" }, { status: 400 });
    }

    const service = createServiceClient();
    const sectionId = await defaultSectionId(service, orgId);
    if (!sectionId) return NextResponse.json({ error: "could not resolve section" }, { status: 500 });

    const structure = {
      id: 0,
      title: String(name),
      template: String(templateBody),
      technique: String(technique || ""),
      section: "",
    };

    const { data: tpl, error } = await service
      .from("org_templates")
      .insert({
        org_id: orgId,
        section_id: sectionId,
        name: String(name),
        modality: String(modality),
        structure,
        created_by: adminId,
        updated_by: adminId,
      })
      .select("id")
      .single();
    if (error) return dbErrorResponse(error);

    // Push it to everyone in the institution so it appears in their profiles
    // without them having to import anything.
    const imported = await pushToMembers(service, orgId, tpl.id);

    return NextResponse.json({ ok: true, id: tpl.id, pushedTo: imported });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const service = createServiceClient();
    await service.from("user_template_imports").delete().eq("org_template_id", id);
    const { error } = await service.from("org_templates").delete().eq("id", id);
    if (error) return dbErrorResponse(error);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Register the import of one org template for every active member. */
async function pushToMembers(
  service: ReturnType<typeof createServiceClient>,
  orgId: string,
  templateId: string,
): Promise<number> {
  const { data: members } = await service
    .from("org_members")
    .select("user_id")
    .eq("org_id", orgId)
    .eq("is_active", true);

  const rows = (members || []).map((m) => ({ user_id: m.user_id, org_template_id: templateId }));
  if (rows.length === 0) return 0;
  await service.from("user_template_imports").upsert(rows, { onConflict: "user_id,org_template_id" });
  return rows.length;
}
