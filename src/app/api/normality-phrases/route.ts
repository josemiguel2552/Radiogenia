import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDefaultsForModality, getAllDefaults, type NormalityLang } from "@/lib/normality-defaults";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");
    const lang = (url.searchParams.get("lang") === "es" ? "es" : "en") as NormalityLang;

    const defaults = modality ? getDefaultsForModality(modality, lang) : getAllDefaults(lang);

    let overrides: { modality: string; section_label: string; phrase: string }[] = [];
    try {
      const query = supabase
        .from("normality_phrases")
        .select("modality, section_label, phrase")
        .eq("user_id", user.id);

      if (modality) {
        query.eq("modality", modality);
      }

      const { data } = await query;
      overrides = data || [];
    } catch {
      // Table may not exist yet
    }

    const overrideMap = new Map(
      overrides.map((o) => [`${o.modality}|${o.section_label}`, o.phrase])
    );

    const defaultKeys = new Set(defaults.map((d) => `${d.modality}|${d.section_label}`));

    const merged = defaults.map((d) => {
      const key = `${d.modality}|${d.section_label}`;
      const userPhrase = overrideMap.get(key);
      return {
        modality: d.modality,
        section_label: d.section_label,
        default_phrase: d.phrase,
        phrase: userPhrase ?? d.phrase,
        is_customized: userPhrase != null,
      };
    });

    for (const o of overrides) {
      const key = `${o.modality}|${o.section_label}`;
      if (!defaultKeys.has(key)) {
        merged.push({
          modality: o.modality,
          section_label: o.section_label,
          default_phrase: o.phrase,
          phrase: o.phrase,
          is_customized: true,
        });
      }
    }

    return NextResponse.json(merged);
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

    const { modality, section_label, phrase } = await req.json();
    if (!modality || !section_label || !phrase) {
      return NextResponse.json({ error: "Missing modality, section_label or phrase" }, { status: 400 });
    }

    const { error } = await supabase
      .from("normality_phrases")
      .upsert(
        {
          user_id: user.id,
          modality,
          section_label,
          phrase,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,modality,section_label" }
      );

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
    const modality = url.searchParams.get("modality");
    const sectionLabel = url.searchParams.get("section_label");

    if (!modality || !sectionLabel) {
      return NextResponse.json({ error: "Missing modality or section_label" }, { status: 400 });
    }

    const { error } = await supabase
      .from("normality_phrases")
      .delete()
      .eq("user_id", user.id)
      .eq("modality", modality)
      .eq("section_label", sectionLabel);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
