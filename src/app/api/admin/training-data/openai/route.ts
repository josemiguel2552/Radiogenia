import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { getErrorMessage, getErrorStatus } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are a radiology report assistant. Given the radiologist's dictation, study type, modality, and the AI-generated conclusion, produce a corrected conclusion that matches the radiologist's preferred style. Output only the corrected conclusion text.";

interface TrainingExample {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
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
}

interface AuditRow {
  report_id: string | null;
  metadata: {
    study_type?: string;
    modality?: string;
    original_conclusion?: string;
    corrected_conclusion?: string;
    original_findings?: string;
    corrected_findings?: string;
  } | null;
}

async function fromReportsTable(
  supabase: ReturnType<typeof createServiceClient>,
  modality: string | null,
  limit: number,
): Promise<{ examples: TrainingExample[]; modalities: string[] }> {
  let query = supabase
    .from("reports")
    .select(
      "id, study_type, modality, raw_dictation, clinical_context, " +
      "findings_text, conclusion_text, " +
      "initial_findings_text, initial_conclusion_text"
    )
    .eq("had_corrections", true)
    .not("initial_conclusion_text", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (modality && modality !== "all") query = query.eq("modality", modality);

  const { data, error } = await query;
  if (error) return { examples: [], modalities: [] };

  const rows = (data || []) as unknown as ReportRow[];

  const examples: TrainingExample[] = rows
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
        { role: "assistant" as const, content: r.conclusion_text! },
      ],
    }));

  const modalities = [...new Set(rows.map((r) => r.modality))];
  return { examples, modalities };
}

async function fromAuditLogs(
  supabase: ReturnType<typeof createServiceClient>,
  modality: string | null,
  limit: number,
): Promise<{ examples: TrainingExample[]; modalities: string[] }> {
  let query = supabase
    .from("audit_logs")
    .select("report_id, metadata")
    .eq("action", "correction_logged")
    .eq("had_corrections", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) return { examples: [], modalities: [] };

  const rows = (data || []) as unknown as AuditRow[];
  const modalities = new Set<string>();
  const examples: TrainingExample[] = [];

  for (const row of rows) {
    const m = row.metadata;
    if (!m) continue;

    const orig = m.original_conclusion?.trim();
    const corrected = m.corrected_conclusion?.trim();
    if (!orig || !corrected || orig === corrected) continue;

    const mod = m.modality || "Unknown";
    if (modality && modality !== "all" && mod !== modality) continue;

    modalities.add(mod);
    examples.push({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Study: ${m.study_type || "Unknown"} (${mod})`,
            m.original_findings ? `Findings:\n${m.original_findings}` : null,
            `AI conclusion:\n${orig}`,
          ].filter(Boolean).join("\n\n"),
        },
        { role: "assistant", content: corrected },
      ],
    });
  }

  return { examples: examples.slice(0, limit), modalities: [...modalities] };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 2000);
    const preview = url.searchParams.get("preview") === "true";

    // Try reports table first (richer data), fall back to audit_logs
    let { examples, modalities } = await fromReportsTable(supabase, modality, limit);

    if (examples.length === 0) {
      ({ examples, modalities } = await fromAuditLogs(supabase, modality, limit));
    }

    // Deduplicate by assistant content
    const seen = new Set<string>();
    const unique: TrainingExample[] = [];
    for (const ex of examples) {
      const key = ex.messages.find((m) => m.role === "assistant")?.content || "";
      if (!seen.has(key)) { seen.add(key); unique.push(ex); }
    }

    if (preview) {
      return NextResponse.json({
        total: unique.length,
        preview: unique.slice(0, 5),
        modalities,
      });
    }

    const jsonl = unique.map((e) => JSON.stringify(e)).join("\n") + "\n";

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
