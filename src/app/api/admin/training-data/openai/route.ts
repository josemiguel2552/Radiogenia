import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth-helpers";
import { getErrorMessage, getErrorStatus } from "@/lib/api-error";
import { reconcileFindings } from "@/lib/training-preprocess";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT =
  "You are a radiology report assistant. Given the study type, modality, and the radiologist's findings, generate a conclusion that accurately summarizes ONLY the findings provided. Do not include any information not present in the findings. Match the radiologist's writing style, terminology, and level of detail.";

interface TrainingExample {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
}

interface ReportRow {
  id: string;
  study_type: string;
  modality: string;
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

// ── Data sources ──

// Supabase caps a single response at ~1000 rows, so fetch in pages to get the
// FULL history rather than only the most recent batch.
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

function isModified(r: ReportRow): boolean {
  const f0 = (r.initial_findings_text || "").trim();
  const c0 = (r.initial_conclusion_text || "").trim();
  const f1 = (r.findings_text || "").trim();
  const c1 = (r.conclusion_text || "").trim();
  // A report counts as "modified" when the radiologist edited the AI output.
  return (!!f0 && f0 !== f1) || (!!c0 && c0 !== c1);
}

async function fromReportsTable(
  supabase: ReturnType<typeof createServiceClient>,
  modality: string | null,
  correctionsOnly: boolean,
): Promise<{ examples: TrainingExample[]; modalities: string[] }> {
  const rows: ReportRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    let query = supabase
      .from("reports")
      .select(
        "id, study_type, modality, clinical_context, " +
        "findings_text, conclusion_text, " +
        "initial_findings_text, initial_conclusion_text"
      )
      .not("conclusion_text", "is", null)
      .not("findings_text", "is", null)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (modality && modality !== "all") query = query.eq("modality", modality);

    const { data, error } = await query;
    if (error) return { examples: [], modalities: [] };
    const batch = (data || []) as unknown as ReportRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break; // last page reached
  }

  const filtered = correctionsOnly ? rows.filter(isModified) : rows;

  const examples: TrainingExample[] = filtered
    .filter((r) => {
      const findings = r.findings_text?.trim();
      const conclusion = r.conclusion_text?.trim();
      return findings && conclusion;
    })
    .map((r) => {
      const correctedFindings = reconcileFindings(r.findings_text!, r.conclusion_text!);
      return {
        messages: [
          { role: "system" as const, content: SYSTEM_PROMPT },
          {
            role: "user" as const,
            content: [
              `Study: ${r.study_type} (${r.modality})`,
              r.clinical_context ? `Clinical context: ${r.clinical_context}` : null,
              `Findings:\n${correctedFindings}`,
            ].filter(Boolean).join("\n\n"),
          },
          { role: "assistant" as const, content: r.conclusion_text! },
        ],
      };
    });

  const modalities = [...new Set(filtered.map((r) => r.modality))];
  return { examples, modalities };
}

async function fromAuditLogs(
  supabase: ReturnType<typeof createServiceClient>,
  modality: string | null,
): Promise<{ examples: TrainingExample[]; modalities: string[] }> {
  const rows: AuditRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("report_id, metadata")
      .eq("action", "correction_logged")
      .eq("had_corrections", true)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) return { examples: [], modalities: [] };
    const batch = (data || []) as unknown as AuditRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  const modalities = new Set<string>();
  const examples: TrainingExample[] = [];

  for (const row of rows) {
    const m = row.metadata;
    if (!m) continue;

    const correctedFindings = (m.corrected_findings || m.original_findings || "").trim();
    const correctedConclusion = (m.corrected_conclusion || "").trim();
    if (!correctedFindings || !correctedConclusion) continue;

    const mod = m.modality || "Unknown";
    if (modality && modality !== "all" && mod !== modality) continue;

    const reconciledFindings = reconcileFindings(correctedFindings, correctedConclusion);

    modalities.add(mod);
    examples.push({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `Study: ${m.study_type || "Unknown"} (${mod})`,
            `Findings:\n${reconciledFindings}`,
          ].filter(Boolean).join("\n\n"),
        },
        { role: "assistant", content: correctedConclusion },
      ],
    });
  }

  return { examples, modalities: [...modalities] };
}

// ── Handler ──

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const supabase = createServiceClient();

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");
    const correctionsOnly = url.searchParams.get("corrections_only") === "true";
    const preview = url.searchParams.get("preview") === "true";

    let { examples, modalities } = await fromReportsTable(supabase, modality, correctionsOnly);

    if (examples.length === 0) {
      ({ examples, modalities } = await fromAuditLogs(supabase, modality));
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
