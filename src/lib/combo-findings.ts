import { generateAI } from "@/lib/ai-provider";
import type { GlobalAIConfig } from "@/lib/auth-helpers";
import { resolveApiKey } from "@/lib/auth-helpers";
import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "@/lib/types";

const LANGUAGE_LABEL: Record<OutputLanguage, string> = {
  es: "español", en: "English", pt: "português",
  fr: "français", de: "Deutsch", it: "italiano",
};

interface ComboParams {
  template: string;
  dictation: string;
  modality: string;
  findingsLength: FindingsLength;
  normalFieldsVerbosity: NormalFieldsVerbosity;
  paraphraseLevel: ParaphraseLevel;
  outputLanguage: OutputLanguage;
  compactNormals: boolean;
  preferredNormalPhrases?: PreferredNormalPhrase[];
}

interface MappedSection {
  label: string;
  text: string;
  source: "dictation" | "normal_default" | "negative_dictated";
  evidence: string | null;
}

interface ValidatorCorrection {
  section_label: string;
  action: "replace" | "add_finding" | "remove_hallucination";
  corrected_text: string;
  reason: string;
}

interface ValidatorResult {
  status: "validated" | "corrected";
  corrections: ValidatorCorrection[];
}

function buildMapperPrompt(params: ComboParams): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];

  const system = `You are a radiological report structuring assistant. Your task is to map a radiologist's dictation to template sections as structured JSON.

OUTPUT LANGUAGE: ${l}. All section text must be in ${l}.
The dictation may be in ANY language — translate all content to ${l}.
STUDY MODALITY: ${params.modality}

RULES:
1. Output one JSON object with a "sections" array containing one entry per template section, in the SAME ORDER as the template.
2. Each entry: {"label":"Section name in ${l}","text":"Description in ${l}.","source":"dictation|normal_default|negative_dictated","evidence":"exact dictation fragment or null"}
3. "source" values:
   - "dictation": the radiologist mentioned a positive finding for this section. "evidence" = the exact dictation fragment.
   - "negative_dictated": the radiologist explicitly stated the ABSENCE of something (e.g. "no mass", "sin litiasis"). "evidence" = the exact fragment. Include this negative finding faithfully.
   - "normal_default": the dictation does NOT mention this section at all. Write a professional normality phrase appropriate for ${params.modality}. "evidence" = null.
4. NEVER invent pathological findings not in the dictation.
5. NEVER write "not assessed" / "no valorado" / "not evaluated" for any section.
6. Place each dictated finding in the correct anatomical section.
7. Output ONLY valid JSON — no markdown, no commentary.
${params.paraphraseLevel === "none" ? `8. Transcribe dictated findings literally — do not rephrase.` : params.paraphraseLevel === "light" ? `8. You may fix grammar/syntax but preserve all clinical data and measurements exactly.` : `8. You may rephrase in professional radiological style but preserve all clinical data.`}
${params.findingsLength === "concise" ? `9. Keep each section's text concise — one sentence when possible.` : params.findingsLength === "detailed" ? `9. Write each section exhaustively with all relevant radiological parameters.` : `9. Write complete descriptions without redundancy.`}${params.preferredNormalPhrases && params.preferredNormalPhrases.length > 0 ? `

PREFERRED NORMALITY PHRASES — use these LITERALLY for unmentioned sections:
${params.preferredNormalPhrases.map((p) => `- ${p.label}: ${p.phrase}`).join("\n")}` : ""}`;

  const user = `TEMPLATE SECTIONS:\n${params.template}\n\nDICTATION:\n${params.dictation}`;
  return { system, user };
}

function buildValidatorPrompt(dictation: string, mappingJson: string, lang: OutputLanguage): { system: string; user: string } {
  const l = LANGUAGE_LABEL[lang];

  const system = `You are a quality-control auditor for radiology reports. You receive the original dictation and a JSON mapping produced by another model.

YOUR ONLY JOB — check for three types of errors:
1. OMISSIONS: a clinical observation from the dictation is missing from the mapping or placed in the wrong section.
2. HALLUCINATIONS: the mapping contains a specific clinical finding, measurement, or diagnosis NOT supported by the dictation. Normal/default phrases for unmentioned sections are NOT hallucinations.
3. MISATTRIBUTIONS: a finding is placed in the wrong anatomical section.

RULES:
- You do NOT redo the entire mapping. You ONLY output corrections.
- Do NOT flag normal/default phrases as hallucinations — they are expected for unmentioned sections.
- Each correction must specify: section_label, action (replace | add_finding | remove_hallucination), corrected_text (the fixed text for that section in ${l}), and reason.
- "replace": rewrite the section text to fix an error or include an omitted finding.
- "add_finding": a dictation fragment was completely missing — add it to the correct section.
- "remove_hallucination": remove fabricated content; if the section becomes empty, write a normal phrase.
- If no errors found, return {"status":"validated","corrections":[]}.
- Output ONLY valid JSON — no markdown, no commentary.

JSON format:
{
  "status": "validated" | "corrected",
  "corrections": [
    {"section_label": "...", "action": "replace|add_finding|remove_hallucination", "corrected_text": "...", "reason": "..."}
  ]
}`;

  const user = `ORIGINAL DICTATION:\n${dictation}\n\nMAPPING JSON:\n${mappingJson}`;
  return { system, user };
}

function applyCorrections(sections: MappedSection[], corrections: ValidatorCorrection[]): MappedSection[] {
  const result = sections.map((s) => ({ ...s }));
  for (const c of corrections) {
    const idx = result.findIndex(
      (s) => s.label.toLowerCase() === c.section_label.toLowerCase(),
    );
    if (idx === -1) continue;

    if (c.action === "replace" || c.action === "add_finding") {
      result[idx].text = c.corrected_text;
      result[idx].source = "dictation";
      result[idx].evidence = c.reason;
    } else if (c.action === "remove_hallucination") {
      result[idx].text = c.corrected_text;
      result[idx].source = "normal_default";
      result[idx].evidence = null;
    }
  }
  return result;
}

function sectionsToText(sections: MappedSection[], compactNormals: boolean): string {
  if (!compactNormals) {
    return sections.map((s) => `${s.label}: ${s.text}`).join("\n");
  }

  const findingSections = sections.filter((s) => s.source !== "normal_default");
  const normalSections = sections.filter((s) => s.source === "normal_default");

  const lines = findingSections.map((s) => `${s.label}: ${s.text}`);

  if (normalSections.length > 0) {
    const names = normalSections.map((s) => s.label.toLowerCase()).join(", ");
    lines.push(
      `El resto de las estructuras evaluadas (${names}) no muestran alteraciones significativas.`,
    );
  }

  return lines.join("\n");
}

export async function runComboFindings(
  globalConfig: GlobalAIConfig,
  params: ComboParams,
): Promise<string> {
  const openaiKey = resolveApiKey(globalConfig, "openai");
  const deepseekKey = resolveApiKey(globalConfig, "deepseek");

  if (!openaiKey) throw new Error("No OpenAI API key configured for combo pipeline (GPT-4 Mini).");
  if (!deepseekKey) throw new Error("No DeepSeek API key configured for combo pipeline (Reasoner).");

  // ── Stage 1: GPT-4 Mini maps dictation → structured JSON ──
  const mapper = buildMapperPrompt(params);
  console.log(`[combo] Stage 1 — GPT-4o-mini mapping (template=${params.template.length}ch, dictation=${params.dictation.length}ch)`);

  const mapperRaw = await generateAI({
    provider: "openai",
    modelName: "gpt-4o-mini",
    apiKey: openaiKey,
    system: mapper.system,
    user: mapper.user,
    maxTokens: 4096,
  });

  const jsonMatch = mapperRaw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Combo Stage 1 (GPT-4 Mini): failed to produce valid JSON mapping.");
  }

  let parsed: { sections: MappedSection[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.sections)) throw new Error("Missing sections array");
  } catch {
    throw new Error("Combo Stage 1 (GPT-4 Mini): invalid JSON structure.");
  }

  console.log(`[combo] Stage 1 complete — ${parsed.sections.length} sections, ${parsed.sections.filter((s) => s.source === "dictation").length} from dictation`);

  // ── Stage 2: DeepSeek Reasoner validates/corrects ──
  const validator = buildValidatorPrompt(params.dictation, jsonMatch[0], params.outputLanguage);
  console.log(`[combo] Stage 2 — DeepSeek Reasoner validating...`);

  const validatorRaw = await generateAI({
    provider: "deepseek",
    modelName: "deepseek-reasoner",
    apiKey: deepseekKey,
    system: validator.system,
    user: validator.user,
    maxTokens: 4096,
  });

  let validatorResult: ValidatorResult = { status: "validated", corrections: [] };
  try {
    const vMatch = validatorRaw.match(/\{[\s\S]*\}/);
    if (vMatch) {
      const vParsed = JSON.parse(vMatch[0]) as ValidatorResult;
      if (Array.isArray(vParsed.corrections)) {
        validatorResult = vParsed;
      }
    }
  } catch {
    console.warn("[combo] Stage 2: could not parse validator output, using Stage 1 result as-is");
  }

  console.log(`[combo] Stage 2 complete — status=${validatorResult.status}, corrections=${validatorResult.corrections.length}`);

  // ── Apply corrections and format ──
  const finalSections = validatorResult.corrections.length > 0
    ? applyCorrections(parsed.sections, validatorResult.corrections)
    : parsed.sections;

  return sectionsToText(finalSections, params.compactNormals);
}
