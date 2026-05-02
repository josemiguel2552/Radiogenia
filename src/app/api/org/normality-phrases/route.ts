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
    const modality = url.searchParams.get("modality");

    let query = supabase
      .from("org_normality_phrases")
      .select("*, org_sections(name)")
      .eq("org_id", membership.org_id);

    if (sectionId) query = query.eq("section_id", sectionId);
    if (modality) query = query.eq("modality", modality);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const phrases = (data || []).map((p) => {
      const sec = p.org_sections as unknown as { name: string } | null;
      return { ...p, org_sections: undefined, section_name: sec?.name || "" };
    });

    return NextResponse.json(phrases);
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

    const { section_id, modality, section_label, phrase } = await req.json();
    if (!section_id || !modality || !section_label || !phrase) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const membership = await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: section_id,
    });

    const { error } = await supabase
      .from("org_normality_phrases")
      .upsert({
        org_id: membership.org_id,
        section_id,
        modality,
        section_label,
        phrase,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: "section_id,modality,section_label" });

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

    const { data: phrase } = await supabase
      .from("org_normality_phrases")
      .select("section_id")
      .eq("id", id)
      .single();

    if (!phrase) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await requireOrgRole(user.id, {
      chief: true,
      sectionRoles: ["section_chief", "section_editor"],
      sectionId: phrase.section_id,
    });

    const { error } = await supabase.from("org_normality_phrases").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
