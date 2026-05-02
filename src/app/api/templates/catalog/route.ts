export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) return NextResponse.json([]);

    const service = createServiceClient();

    const [templatesRes, importsRes] = await Promise.all([
      service
        .from("org_templates")
        .select("id, name, modality, structure, section_id, org_sections(name)")
        .eq("org_id", membership.org_id)
        .order("name"),
      service
        .from("user_template_imports")
        .select("org_template_id")
        .eq("user_id", user.id),
    ]);

    const importedIds = new Set(
      (importsRes.data || []).map((r: { org_template_id: string }) => r.org_template_id),
    );

    const catalog = (templatesRes.data || []).map((t) => {
      const sec = t.org_sections as unknown as { name: string } | null;
      return {
        id: t.id,
        name: t.name,
        modality: t.modality,
        section_id: t.section_id,
        section_name: sec?.name || "",
        structure: t.structure,
        imported: importedIds.has(t.id),
      };
    });

    return NextResponse.json(catalog);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
