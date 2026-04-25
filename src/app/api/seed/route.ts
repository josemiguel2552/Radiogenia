import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendations";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user already has templates (avoid duplicates)
    const { count: templateCount } = await supabase
      .from("user_templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (templateCount && templateCount > 0) {
      return NextResponse.json({ message: "Already seeded" });
    }

    // Wait for the profile trigger to complete (the profile row must exist
    // before we can insert into user_templates due to the FK constraint)
    for (let attempt = 0; attempt < 5; attempt++) {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("id", user.id);
      if (count && count > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Seed templates
    const templatesPayload = DEFAULT_TEMPLATES.map((t) => ({
      user_id: user.id,
      name: t.title,
      modality: t.technique,
      base_template_id: t.id,
      structure: t,
      is_default: true,
    }));

    // Insert in batches of 25 to avoid payload limits
    for (let i = 0; i < templatesPayload.length; i += 25) {
      const batch = templatesPayload.slice(i, i + 25);
      const { error: tErr } = await supabase.from("user_templates").insert(batch);
      if (tErr) {
        console.error("Template seed error:", tErr);
        return NextResponse.json({ error: "Failed to seed templates: " + tErr.message }, { status: 500 });
      }
    }

    // Seed recommendations
    const recsPayload = DEFAULT_RECOMMENDATIONS.map((r) => ({
      user_id: user.id,
      trigger_keyword: r.trigger,
      recommendation_text: r.recommendation,
      source: "manual" as const,
      guideline_name: r.guideline,
    }));

    const { error: rErr } = await supabase.from("user_recommendations").insert(recsPayload);
    if (rErr) {
      console.error("Recommendations seed error:", rErr);
      return NextResponse.json({ error: "Failed to seed recommendations: " + rErr.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Seeded successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
