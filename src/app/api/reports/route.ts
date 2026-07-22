import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrgMembership } from "@/lib/auth-helpers";
import { extractConclusionStyle } from "@/lib/style-learning";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const countOnly = url.searchParams.get("count_only");

    if (countOnly) {
      let countQuery = supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (from) countQuery = countQuery.gte("created_at", from);
      if (to) countQuery = countQuery.lte("created_at", to);
      const { count, error } = await countQuery;
      if (error) return dbErrorResponse(error);
      return NextResponse.json({ count: count || 0 });
    }

    let query = supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error } = await query;
    if (error) return dbErrorResponse(error);

    return NextResponse.json(data || []);
  } catch (error) {
    return toErrorResponse(error);
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
    conclusion_text: string;
  },
) {
  const { modality, study_type } = body;

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

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, findings_text, conclusion_text, had_corrections } = body;
    if (!id) return NextResponse.json({ error: "Missing report id" }, { status: 400 });

    const update: Record<string, unknown> = {};
    if (findings_text !== undefined) update.findings_text = findings_text;
    if (conclusion_text !== undefined) update.conclusion_text = conclusion_text;
    if (had_corrections !== undefined) update.had_corrections = had_corrections;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("reports")
      .update(update)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return dbErrorResponse(error);

    // Re-run style learning with updated text
    if (findings_text || conclusion_text) {
      const tableExists = await ensureStylePatternsTable(supabase);
      if (tableExists) {
        const { data: report } = await supabase
          .from("reports")
          .select("modality, study_type, conclusion_text")
          .eq("id", id)
          .single();
        if (report) {
          try {
            await learnFromReport(supabase, user.id, {
              modality: report.modality,
              study_type: report.study_type,
              conclusion_text: report.conclusion_text || "",
            });
          } catch { /* non-critical */ }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // sendBeacon can only POST, so we tunnel PATCH via _method
    if (body._method === "PATCH") {
      const { id, findings_text, conclusion_text, had_corrections } = body;
      if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
      const update: Record<string, unknown> = {};
      if (findings_text !== undefined) update.findings_text = findings_text;
      if (conclusion_text !== undefined) update.conclusion_text = conclusion_text;
      if (had_corrections !== undefined) update.had_corrections = had_corrections;
      if (Object.keys(update).length > 0) {
        await supabase.from("reports").update(update).eq("id", id).eq("user_id", user.id);
      }
      return NextResponse.json({ ok: true });
    }

    const reportRow: Record<string, unknown> = {
      user_id: user.id,
      study_type: body.study_type,
      modality: body.modality,
      contrast_option: body.contrast_option || "default",
      raw_dictation: body.raw_dictation || "",
      clinical_context: body.clinical_context || "",
      findings_text: body.findings_text || "",
      conclusion_text: body.conclusion_text || "",
      recommendations_text: body.recommendations_text || "",
      template_snapshot: body.template_snapshot || null,
      model_config_snapshot: body.model_config_snapshot || null,
      initial_findings_text: body.initial_findings_text || null,
      initial_conclusion_text: body.initial_conclusion_text || null,
      generation_duration_ms: body.generation_duration_ms || null,
      provider_used: body.provider_used || null,
      model_used: body.model_used || null,
      had_corrections: body.had_corrections || false,
    };

    let data;
    let error;

    ({ data, error } = await supabase
      .from("reports")
      .insert(reportRow)
      .select()
      .single());

    if (error) {
      delete reportRow.clinical_context;
      delete reportRow.generation_duration_ms;
      delete reportRow.provider_used;
      delete reportRow.model_used;
      delete reportRow.had_corrections;
      ({ data, error } = await supabase
        .from("reports")
        .insert(reportRow)
        .select()
        .single());
    }

    if (error) {
      delete reportRow.initial_findings_text;
      delete reportRow.initial_conclusion_text;
      ({ data, error } = await supabase
        .from("reports")
        .insert(reportRow)
        .select()
        .single());
    }

    if (error) return dbErrorResponse(error);

    // Reliable server-side pilot metric: create it HERE (not only via the
    // fragile client /api/metrics call) so hospital dashboards always reflect
    // every generated report, with org_id resolved server-side. Deduped by
    // report_id; resilient to un-applied optional columns.
    if (data?.id) {
      try {
        const service = createServiceClient();
        const { data: existingMetric } = await service
          .from("report_metrics").select("id").eq("report_id", data.id).limit(1).maybeSingle();
        if (!existingMetric) {
          const membership = await getOrgMembership(user.id);
          const draftLen = (body.findings_text || "").length + (body.conclusion_text || "").length;
          const baseRow: Record<string, unknown> = {
            user_id: user.id,
            org_id: membership?.org_id || null,
            report_id: data.id,
            report_start_at: body.report_start_at || null,
            report_end_at: body.report_end_at || new Date().toISOString(),
            duration_seconds: body.duration_seconds
              ?? (body.generation_duration_ms ? Math.round(body.generation_duration_ms / 1000) : 0),
            ai_draft_length: draftLen,
            final_length: draftLen,
          };
          const fullRow = {
            ...baseRow,
            study_type: body.study_type || "",
            ai_findings_text: body.initial_findings_text || body.findings_text || "",
            ai_conclusion_text: body.initial_conclusion_text || body.conclusion_text || "",
            final_findings_text: body.findings_text || "",
            final_conclusion_text: body.conclusion_text || "",
          };
          const { error: mErr } = await service.from("report_metrics").insert(fullRow);
          if (mErr) {
            console.error("[report_metrics] full insert failed:", mErr.message);
            const { error: bErr } = await service.from("report_metrics").insert(baseRow); // fallback if text cols not migrated
            if (bErr) console.error("[report_metrics] base insert failed:", bErr.message);
          }
        }
      } catch (e) {
        // Metrics are non-critical to the save, but the failure must be visible.
        console.error("[report_metrics] unexpected:", e instanceof Error ? e.message : e);
      }
    }

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
          console.error("[reports] Style learning error:", learnErr);
        }
      }
    }

    return NextResponse.json({ ...data, _learned_phrases: learnedPhrases });
  } catch (error) {
    return toErrorResponse(error);
  }
}
