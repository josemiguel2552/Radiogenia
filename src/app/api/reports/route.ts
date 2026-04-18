import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractNormalityPhrases,
  extractNormalityPhrasesFromFinal,
  extractConclusionStyle,
} from "@/lib/style-learning";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let query = supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data || []);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function upsertPattern(
  supabase: SupabaseClient,
  userId: string,
  modality: string,
  studyType: string,
  kind: string,
  phrase: string,
  label: string | null,
) {
  const { data: existing } = await supabase
    .from("style_patterns")
    .select("id, frequency")
    .eq("user_id", userId)
    .eq("modality", modality)
    .eq("study_type", studyType)
    .eq("kind", kind)
    .eq("phrase", phrase)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("style_patterns")
      .update({ frequency: existing.frequency + 1, last_seen_at: new Date().toISOString(), label })
      .eq("id", existing.id);
  } else {
    await supabase.from("style_patterns").insert({
      user_id: userId,
      modality,
      study_type: studyType,
      kind,
      label,
      phrase,
      frequency: 1,
      last_seen_at: new Date().toISOString(),
    });
  }
}

async function learnFromReport(
  supabase: SupabaseClient,
  userId: string,
  body: {
    modality: string;
    study_type: string;
    initial_findings_text?: string | null;
    findings_text: string;
    initial_conclusion_text?: string | null;
    conclusion_text: string;
  },
) {
  const { modality, study_type } = body;
  const initialFindings = body.initial_findings_text || "";

  // Learn normality phrases
  let normalPhrases;
  if (initialFindings && body.findings_text) {
    normalPhrases = extractNormalityPhrases(initialFindings, body.findings_text);
  } else if (body.findings_text) {
    normalPhrases = extractNormalityPhrasesFromFinal(body.findings_text);
  }

  if (normalPhrases) {
    for (const p of normalPhrases) {
      await upsertPattern(supabase, userId, modality, study_type, "normal_phrase", p.phrase, p.label);
    }
  }

  // Learn conclusion style — store the complete conclusion as a style sample
  if (body.conclusion_text) {
    const samples = extractConclusionStyle(body.conclusion_text);
    for (const sample of samples) {
      await upsertPattern(supabase, userId, modality, study_type, "conclusion_sample", sample, null);
    }
    // Keep max 5 conclusion samples per study type
    const { data: allSamples } = await supabase
      .from("style_patterns")
      .select("id")
      .eq("user_id", userId)
      .eq("modality", modality)
      .eq("study_type", study_type)
      .eq("kind", "conclusion_sample")
      .order("last_seen_at", { ascending: false });
    if (allSamples && allSamples.length > 5) {
      const toDelete = allSamples.slice(5).map((r: { id: string }) => r.id);
      await supabase.from("style_patterns").delete().in("id", toDelete);
    }
  }

  // Prune: keep max 10 reports per (modality, study_type)
  const { data: reports } = await supabase
    .from("reports")
    .select("id")
    .eq("user_id", userId)
    .eq("modality", modality)
    .eq("study_type", study_type)
    .order("created_at", { ascending: false });

  if (reports && reports.length > 10) {
    const toDelete = reports.slice(10).map((r: { id: string }) => r.id);
    await supabase.from("reports").delete().in("id", toDelete);
  }
}

async function ensureStylePatternsTable(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("style_patterns")
    .select("id")
    .limit(0);
  return !error;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const reportRow: Record<string, unknown> = {
      user_id: user.id,
      study_type: body.study_type,
      modality: body.modality,
      contrast_option: body.contrast_option || "default",
      raw_dictation: body.raw_dictation || "",
      findings_text: body.findings_text || "",
      conclusion_text: body.conclusion_text || "",
      recommendations_text: body.recommendations_text || "",
      template_snapshot: body.template_snapshot || null,
      model_config_snapshot: body.model_config_snapshot || null,
      initial_findings_text: body.initial_findings_text || null,
      initial_conclusion_text: body.initial_conclusion_text || null,
    };

    let data;
    let error;

    ({ data, error } = await supabase
      .from("reports")
      .insert(reportRow)
      .select()
      .single());

    if (error && error.message?.includes("initial_")) {
      delete reportRow.initial_findings_text;
      delete reportRow.initial_conclusion_text;
      ({ data, error } = await supabase
        .from("reports")
        .insert(reportRow)
        .select()
        .single());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let learnedPhrases = 0;

    if (data) {
      try {
        await supabase.from("style_samples").insert({
          user_id: user.id,
          report_id: data.id,
          findings_text: body.findings_text || "",
          conclusion_text: body.conclusion_text || "",
          modality: body.modality,
          study_type: body.study_type,
        });
      } catch { /* non-critical */ }

      const tableExists = await ensureStylePatternsTable(supabase);
      if (tableExists) {
        try {
          await learnFromReport(supabase, user.id, {
            modality: body.modality,
            study_type: body.study_type,
            initial_findings_text: body.initial_findings_text || null,
            findings_text: body.findings_text || "",
            initial_conclusion_text: body.initial_conclusion_text || null,
            conclusion_text: body.conclusion_text || "",
          });

          const { count } = await supabase
            .from("style_patterns")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("modality", body.modality)
            .eq("study_type", body.study_type);
          learnedPhrases = count || 0;
        } catch (learnErr) {
          console.error("Style learning error:", learnErr);
        }
      }
    }

    return NextResponse.json({ ...data, _learned_phrases: learnedPhrases });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
