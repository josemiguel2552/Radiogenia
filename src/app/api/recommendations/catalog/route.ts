export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getOrgMembership(user.id);
    if (!membership) return NextResponse.json([]);

    const service = createServiceClient();

    const [recsRes, importsRes] = await Promise.all([
      service
        .from("org_recommendations")
        .select("id, category, modality, title, text, tags, source, section_id, org_sections(name)")
        .eq("org_id", membership.org_id)
        .order("category")
        .order("title"),
      service
        .from("user_recommendation_imports")
        .select("org_recommendation_id")
        .eq("user_id", user.id),
    ]);

    const importedIds = new Set(
      (importsRes.data || []).map((r: { org_recommendation_id: string }) => r.org_recommendation_id),
    );

    const catalog = (recsRes.data || []).map((r) => {
      const sec = r.org_sections as unknown as { name: string } | null;
      return {
        id: r.id,
        category: r.category || "all",
        modality: r.modality || "all",
        title: r.title || "",
        text: r.text || "",
        tags: r.tags || [],
        source: r.source || "manual",
        section_id: r.section_id,
        section_name: sec?.name || "",
        imported: importedIds.has(r.id),
      };
    });

    return NextResponse.json(catalog);
  } catch (error) {
    return toErrorResponse(error);
  }
}
