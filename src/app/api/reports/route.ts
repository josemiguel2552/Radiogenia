import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractNormalityPhrases, extractConclusionPhrases } from "@/lib/style-learning";
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

async function learnFromReport(
  supabase: SupabaseClient,
  userId: string,
  body: {
    modality: string;
    study_type: string;
    initial_findings_text?: string;
    findings_text: string;
    initial_conclusion_text?: string;
    conclusion_text: string;
  },
) {
  const { modality, study_type } = body;

  // Learn normality phrases
  if (body.initial_findings_text) {
    const normalPhrases = extractNormalityPhrases(body.initial_findings_text, body.findings_text);
    for (const p of normalPhrases) {
      // Try to find existing pattern
      const { data: existing } = await supabase
        .from("style_patterns")
        .select("id, frequency")
        .eq("user_id", userId)
        .eq("modality", modality)
        .eq("study_type", study_type)
        .eq("kind", "normal_phrase")
        .eq("phrase", p.phrase)
        .single();

      if (existing) {
        await supabase
          .from("style_patterns")
          .update({ frequency: existing.frequency + 1, last_seen_at: new Date().toISOString(), label: p.label })
          .eq("id", existing.id);
      } else {
        await supabase.from("style_patterns").insert({
          user_id: userId,
          modality,
          study_type,
          kind: "normal_phrase",
          label: p.label,
          phrase: p.phrase,
          frequency: 1,
          last_seen_at: new Date().toISOString(),
        });
      }
    }
  }

  // Learn conclusion phrases
  if (body.initial_conclusion_text) {
    const conclusionPhrases = extractConclusionPhrases(body.initial_conclusion_text, body.conclusion_text);
    for (const phrase of conclusionPhrases) {
      const { data: existing } = await supabase
        .from("style_patterns")
        .select("id, frequency")
        .eq("user_id", userId)
        .eq("modality", modality)
        .eq("study_type", study_type)
        .eq("kind", "conclusion_phrase")
        .eq("phrase", phrase)
        .single();

      if (existing) {
        await supabase
          .from("style_patterns")
          .update({ frequency: existing.frequency + 1, last_seen_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("style_patterns").insert({
          user_id: userId,
          modality,
          study_type,
          kind: "conclusion_phrase",
          label: null,
          phrase,
          frequency: 1,
          last_seen_at: new Date().toISOString(),
        });
      }
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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    body.user_id = user.id;

    const { data, error } = await supabase
      .from("reports")
      .insert(body)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If style learning enabled, learn patterns from corrections
    const { data: config } = await supabase
      .from("user_model_config")
      .select("style_learning_enabled")
      .eq("user_id", user.id)
      .single();

    if (config?.style_learning_enabled && data) {
      // Keep writing to style_samples for backward compatibility
      await supabase.from("style_samples").insert({
        user_id: user.id,
        report_id: data.id,
        findings_text: body.findings_text,
        conclusion_text: body.conclusion_text,
        modality: body.modality,
        study_type: body.study_type,
      });

      // Run the new style learning pipeline
      await learnFromReport(supabase, user.id, body);
    }

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
