import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const modality = url.searchParams.get("modality");
    const correctionsOnly = url.searchParams.get("corrections_only") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

    let query = supabase
      .from("reports")
      .select(
        "id, user_id, study_type, modality, contrast_option, raw_dictation, " +
        "findings_text, conclusion_text, recommendations_text, " +
        "initial_findings_text, initial_conclusion_text, " +
        "generation_duration_ms, provider_used, model_used, had_corrections, " +
        "error_reported, error_report_note, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (modality) query = query.eq("modality", modality);
    if (correctionsOnly) query = query.eq("had_corrections", true);

    const { data: reports, error } = await query;
    if (error) {
      if (error.message?.includes("initial_") || error.message?.includes("generation_")) {
        let fallbackQuery = supabase
          .from("reports")
          .select(
            "id, user_id, study_type, modality, contrast_option, raw_dictation, " +
            "findings_text, conclusion_text, recommendations_text, created_at"
          )
          .order("created_at", { ascending: false })
          .limit(limit);
        if (modality) fallbackQuery = fallbackQuery.eq("modality", modality);
        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        const fb = (fallbackData || []) as unknown as Record<string, unknown>[];
        if (format === "jsonl") return exportJsonl(fb);
        return NextResponse.json({ reports: fb, total: fb.length });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (reports || []) as unknown as Record<string, unknown>[];
    const userIds = [...new Set(rows.map((r) => r.user_id as string))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; email: string; name: string }) => [p.id, p]),
    );

    const enriched = rows.map((r: Record<string, unknown>) => ({
      ...r,
      user_email: (profileMap.get(r.user_id as string) as { email?: string })?.email || null,
      user_name: (profileMap.get(r.user_id as string) as { name?: string })?.name || null,
    }));

    if (format === "jsonl") return exportJsonl(enriched);

    return NextResponse.json({ reports: enriched, total: enriched.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function exportJsonl(reports: Record<string, unknown>[]) {
  const lines = reports.map((r) =>
    JSON.stringify({
      study_type: r.study_type,
      modality: r.modality,
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
