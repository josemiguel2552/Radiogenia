import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

const FULL_COLUMNS =
  "id, user_id, study_type, modality, contrast_option, raw_dictation, clinical_context, " +
  "findings_text, conclusion_text, recommendations_text, " +
  "initial_findings_text, initial_conclusion_text, " +
  "generation_duration_ms, provider_used, model_used, had_corrections, " +
  "error_reported, error_report_note, created_at";

const MID_COLUMNS =
  "id, user_id, study_type, modality, contrast_option, raw_dictation, " +
  "findings_text, conclusion_text, recommendations_text, " +
  "initial_findings_text, initial_conclusion_text, created_at";

const MIN_COLUMNS =
  "id, user_id, study_type, modality, contrast_option, raw_dictation, " +
  "findings_text, conclusion_text, recommendations_text, created_at";

const BARE_COLUMNS =
  "id, user_id, study_type, modality, raw_dictation, " +
  "findings_text, conclusion_text, created_at";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const modality = url.searchParams.get("modality");
    const correctionsOnly = url.searchParams.get("corrections_only") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

    let rows: Record<string, unknown>[] | null = null;
    const errors: string[] = [];

    for (const cols of [FULL_COLUMNS, MID_COLUMNS, MIN_COLUMNS, BARE_COLUMNS]) {
      let query = supabase
        .from("reports")
        .select(cols)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (modality) query = query.eq("modality", modality);
      if (correctionsOnly && cols.includes("had_corrections")) {
        query = query.eq("had_corrections", true);
      }

      const { data, error } = await query;
      if (!error) {
        rows = (data || []) as unknown as Record<string, unknown>[];
        break;
      }
      errors.push(`[${cols.slice(0, 30)}...]: ${error.message}`);
    }

    if (!rows) {
      return NextResponse.json({
        reports: [],
        total: 0,
        error: `Failed to query reports table. Tried ${errors.length} column sets. Errors: ${errors.join(" | ")}`,
      }, { status: 500 });
    }

    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    let profileMap = new Map<string, { email?: string; name?: string }>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, name")
        .in("id", userIds);

      profileMap = new Map(
        (profiles || []).map((p: { id: string; email: string; name: string }) => [p.id, p]),
      );
    }

    const enriched = rows.map((r) => ({
      ...r,
      user_email: (profileMap.get(r.user_id as string) as { email?: string })?.email || null,
      user_name: (profileMap.get(r.user_id as string) as { name?: string })?.name || null,
    }));

    if (format === "jsonl") return exportJsonl(enriched);

    return NextResponse.json({ reports: enriched, total: enriched.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message, reports: [], total: 0 }, { status });
  }
}

function exportJsonl(reports: Record<string, unknown>[]) {
  const lines = reports.map((r) =>
    JSON.stringify({
      study_type: r.study_type,
      modality: r.modality,
      clinical_context: r.clinical_context || "",
      dictation: r.raw_dictation,
      ai_findings: r.initial_findings_text || r.findings_text,
      ai_conclusion: r.initial_conclusion_text || r.conclusion_text,
      final_findings: r.findings_text,
      final_conclusion: r.conclusion_text,
      had_corrections: r.had_corrections ?? (r.initial_findings_text !== r.findings_text),
      provider: r.provider_used,
      model: r.model_used,
      created_at: r.created_at,
    })
  );

  return new NextResponse(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "application/jsonl",
      "Content-Disposition": `attachment; filename="radiogenai-training-${new Date().toISOString().slice(0, 10)}.jsonl"`,
    },
  });
}
