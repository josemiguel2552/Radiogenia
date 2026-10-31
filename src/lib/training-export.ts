/**
 * Building the training examples, where anything server-side can reach them.
 *
 * This lived inside the export route, which meant the only way to get a
 * training file was to download it in the browser and post it back — and the
 * file is about 9.5 KB per example, because each one embeds the whole ~8,900
 * character conclusion prompt. At 841 examples that is 7.65 MB going back up
 * through a request body capped at 4.5 MB: the upload answered 413 with a
 * plain-text body, and the browser's res.json() turned that into
 * "Unexpected token 'R'".
 *
 * So the file is built here and sent straight to the provider from the server.
 * The browser asks for it to happen and gets back a file id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { reconcileFindings } from "./training-preprocess";
import { buildTrainingPrompt } from "./training-prompt";
import { stripPii } from "./pii-detect";

export interface TrainingExample {
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

/** Supabase caps a response at ~1000 rows, so page to get the whole history. */
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/** The radiologist edited what the AI wrote. */
function isModified(r: ReportRow): boolean {
  const f0 = (r.initial_findings_text || "").trim();
  const c0 = (r.initial_conclusion_text || "").trim();
  const f1 = (r.findings_text || "").trim();
  const c1 = (r.conclusion_text || "").trim();
  return (!!f0 && f0 !== f1) || (!!c0 && c0 !== c1);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fromReports(
  supabase: Db,
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
        "initial_findings_text, initial_conclusion_text",
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
    if (batch.length < PAGE_SIZE) break;
  }

  const filtered = correctionsOnly ? rows.filter(isModified) : rows;

  const examples: TrainingExample[] = filtered
    .filter((r) => r.findings_text?.trim() && r.conclusion_text?.trim())
    .map((r) => {
      // Stripped before anything else: this file is kept by whoever trains on
      // it, and production prompts with stripped findings anyway, so training
      // on unstripped ones is training on input the model never meets.
      const findings = stripPii(r.findings_text!).cleaned;
      const conclusion = stripPii(r.conclusion_text!).cleaned;
      const clinical = r.clinical_context ? stripPii(r.clinical_context).cleaned : null;
      const prompt = buildTrainingPrompt({
        findingsText: reconcileFindings(findings, conclusion),
        conclusionText: conclusion,
        clinicalInfo: clinical,
      });
      return {
        messages: [
          { role: "system" as const, content: prompt.system },
          { role: "user" as const, content: prompt.user },
          { role: "assistant" as const, content: conclusion },
        ],
      };
    });

  return { examples, modalities: [...new Set(filtered.map((r) => r.modality))] };
}

async function fromAuditLogs(
  supabase: Db,
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

    const findings = stripPii((m.corrected_findings || m.original_findings || "").trim()).cleaned;
    const conclusion = stripPii((m.corrected_conclusion || "").trim()).cleaned;
    if (!findings || !conclusion) continue;

    const mod = m.modality || "Unknown";
    if (modality && modality !== "all" && mod !== modality) continue;

    modalities.add(mod);
    const prompt = buildTrainingPrompt({
      findingsText: reconcileFindings(findings, conclusion),
      conclusionText: conclusion,
    });
    examples.push({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
        { role: "assistant", content: conclusion },
      ],
    });
  }

  return { examples, modalities: [...modalities] };
}

/** Same assistant text twice is the same lesson twice. */
function dedupe(examples: TrainingExample[]): TrainingExample[] {
  const seen = new Set<string>();
  const out: TrainingExample[] = [];
  for (const ex of examples) {
    const key = ex.messages.find((m) => m.role === "assistant")?.content || "";
    if (!seen.has(key)) { seen.add(key); out.push(ex); }
  }
  return out;
}

export async function buildTrainingExamples(
  supabase: Db,
  opts: { modality?: string | null; correctionsOnly?: boolean } = {},
): Promise<{ examples: TrainingExample[]; modalities: string[] }> {
  const modality = opts.modality ?? null;
  let { examples, modalities } = await fromReports(supabase, modality, !!opts.correctionsOnly);
  // Older installations have the before/after pairs only in the audit log.
  if (examples.length === 0) {
    ({ examples, modalities } = await fromAuditLogs(supabase, modality));
  }
  return { examples: dedupe(examples), modalities };
}

export function toJsonl(examples: TrainingExample[]): string {
  return examples.length > 0 ? examples.map((e) => JSON.stringify(e)).join("\n") + "\n" : "";
}
