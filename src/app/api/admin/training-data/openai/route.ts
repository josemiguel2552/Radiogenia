import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { getErrorMessage, getErrorStatus } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are a radiology report assistant. Given the radiologist's dictation, study type, modality, and the AI-generated conclusion, produce a corrected conclusion that matches the radiologist's preferred style. Output only the corrected conclusion text.";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 2000);
    const preview = url.searchParams.get("preview") === "true";

    let query = supabase
      .from("reports")
      .select(
        "id, study_type, modality, raw_dictation, clinical_context, " +
        "findings_text, conclusion_text, " +
        "initial_findings_text, initial_conclusion_text, had_corrections"
      )
      .eq("had_corrections", true)
      .not("initial_conclusion_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (modality && modality !== "all") query = query.eq("modality", modality);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    interface ReportRow {
      id: string;
      study_type: string;
      modality: string;
      raw_dictation: string | null;
      clinical_context: string | null;
      findings_text: string | null;
      conclusion_text: string | null;
      initial_findings_text: string | null;
      initial_conclusion_text: string | null;
      had_corrections: boolean | null;
    }
    const rows = (data || []) as unknown as ReportRow[];

    const examples = rows
      .filter((r) => {
        const orig = r.initial_conclusion_text?.trim();
        const final = r.conclusion_text?.trim();
        return orig && final && orig !== final;
      })
      .map((r) => ({
        messages: [
          { role: "system" as const, content: SYSTEM_PROMPT },
          {
            role: "user" as const,
            content: [
              `Study: ${r.study_type} (${r.modality})`,
              r.clinical_context ? `Clinical context: ${r.clinical_context}` : null,
              `Dictation: ${r.raw_dictation || "N/A"}`,
              `Findings:\n${r.findings_text || r.initial_findings_text || "N/A"}`,
              `AI conclusion:\n${r.initial_conclusion_text}`,
            ].filter(Boolean).join("\n\n"),
          },
          {
            role: "assistant" as const,
            content: r.conclusion_text,
          },
        ],
      }));

    if (preview) {
      return NextResponse.json({
        total: examples.length,
        preview: examples.slice(0, 5),
        modalities: [...new Set((rows || []).map((r) => r.modality))],
      });
    }

    const jsonl = examples.map((e) => JSON.stringify(e)).join("\n") + "\n";

    return new NextResponse(jsonl, {
      headers: {
        "Content-Type": "application/jsonl",
        "Content-Disposition": `attachment; filename="radiogenai-finetune-${new Date().toISOString().slice(0, 10)}.jsonl"`,
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}
