import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgMembership, requireOrgRole } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await requireOrgMembership(user.id);
    const url = new URL(req.url);
    const sectionId = url.searchParams.get("section_id");

    let query = supabase
      .from("org_recommendations")
      .select("*, org_sections(name)")
      .eq("org_id", membership.org_id)
      .order("trigger_keyword");

    if (sectionId) query = query.eq("section_id", sectionId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const recs = (data || []).map((r) => {
      const sec = r.org_sections as unknown as { name: string } | null;
      return { ...r, org_sections: undefined, section_name: sec?.name || "" };
    });

    return NextResponse.json(recs);
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

    const { section_id, trigger_keyword, recommendation_text, source, guideline_name } = await req.json();
    if (!section_id || !trigger_keyword || !recommendation_text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: section_id,
    });

    const { data, error } = await supabase
      .from("org_recommendations")
      .insert({
        org_id: membership.org_id,
        section_id,
        trigger_keyword,
        recommendation_text,
        source: source || "manual",
        guideline_name: guideline_name || "",
        created_by: user.id,
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

    const { id, trigger_keyword, recommendation_text } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data: rec } = await supabase
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

    const update: Record<string, unknown> = {};
    if (trigger_keyword !== undefined) update.trigger_keyword = trigger_keyword;
    if (recommendation_text !== undefined) update.recommendation_text = recommendation_text;

    const { error } = await supabase.from("org_recommendations").update(update).eq("id", id);
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

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { data: rec } = await supabase
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

    const { error } = await supabase.from("org_recommendations").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
