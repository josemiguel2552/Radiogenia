import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES } from "@/lib/templates";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Wait for the profile row to exist (FK constraint on user_recommendations)
    for (let attempt = 0; attempt < 5; attempt++) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("id", user.id);
      if (count && count > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Seed global templates if the table is empty (first user to hit this)
    const { count: globalCount } = await supabase
      .from("global_templates")
      .select("*", { count: "exact", head: true });

    if (!globalCount || globalCount === 0) {
      const payload = DEFAULT_TEMPLATES.map((t) => ({
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
          console.error("Global template seed error:", tErr);
          return NextResponse.json({ error: "Failed to seed global templates: " + tErr.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: "Seeded successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
