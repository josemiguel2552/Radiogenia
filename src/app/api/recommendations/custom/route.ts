import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("user_recommendations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ recommendations: [] });

    const recommendations = (data || []).map((row) => ({
      id: row.id,
      category: row.category,
      modality: row.modality,
      title: { es: row.title, en: row.title, pt: row.title },
      text: { es: row.text, en: row.text, pt: row.text },
      tags: row.tags || [],
      source: row.overrides ? "Personal (mod.)" : "Personal",
      scope: "user" as const,
      ...(row.overrides ? { overrides: row.overrides } : {}),
    }));

    // Auto-include ALL org recommendations for user's section (no import needed)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orgRecs: any[] = [];
    try {
      const membership = await getOrgMembership(user.id);
      if (membership) {
        const service = createServiceClient();
        let query = service
          .from("org_recommendations")
          .select("*, org_sections(name)")
          .eq("org_id", membership.org_id);

        if (membership.section_id && !membership.is_org_chief) {
          query = query.eq("section_id", membership.section_id);
        }

        const { data: orgData } = await query.order("category").order("title");

        orgRecs = (orgData || []).map((r) => {
          const sec = r.org_sections as unknown as { name: string } | null;
          return {
            id: r.id,
            category: r.category || "all",
            modality: r.modality || "all",
            title: { es: r.title || r.trigger_keyword, en: r.title || r.trigger_keyword, pt: r.title || r.trigger_keyword },
            text: { es: r.text || r.recommendation_text, en: r.text || r.recommendation_text, pt: r.text || r.recommendation_text },
            tags: r.tags || [],
            source: sec?.name || "Hospital",
            scope: "org" as const,
            section_name: sec?.name || "",
          };
        });
      }
    } catch { /* org tables may not exist */ }

    return NextResponse.json({ recommendations: [...orgRecs, ...recommendations] });
  } catch {
    return NextResponse.json({ recommendations: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { category, modality, title, text, tags, overrides } = await req.json();
    if (!title || !text) {
      return NextResponse.json({ error: "title and text required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("user_recommendations")
      .insert({
        user_id: user.id,
        category: category || "all",
        modality: modality || "all",
        title,
        text,
        tags: tags || [],
        ...(overrides ? { overrides } : {}),
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, id: data.id });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, category, modality, title, text, tags } = await req.json();
    if (!id || !title || !text) {
      return NextResponse.json({ error: "id, title and text required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_recommendations")
      .update({ category: category || "all", modality: modality || "all", title, text, tags: tags || [] })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    await supabase
      .from("user_recommendations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
