import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { toErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    const { userId } = await requireAdmin();
    const supabase = await createClient();
    const user = { id: userId };

    // Wait for the profile row to exist
    for (let attempt = 0; attempt < 5; attempt++) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("id", user.id);
      if (count && count > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Fetch existing base_template_ids to determine which templates are missing
    const { data: existing } = await supabase
      .from("global_templates")
      .select("base_template_id");

    const existingIds = new Set(
      (existing ?? []).map((r: { base_template_id: number }) => r.base_template_id)
    );

    const missing = DEFAULT_TEMPLATES.filter((t) => !existingIds.has(t.id));

    if (missing.length > 0) {
      const payload = missing.map((t) => ({
        name: t.title,
        modality: t.technique,
        base_template_id: t.id,
        structure: t,
        is_active: true,
      }));

      for (let i = 0; i < payload.length; i += 25) {
        const batch = payload.slice(i, i + 25);
        const { error: tErr } = await supabase.from("global_templates").insert(batch);
        if (tErr) {
          console.error("[seed] Global template seed error:", tErr);
          return NextResponse.json({ error: "Failed to seed global templates: " + tErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "Seeded successfully" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
