import { generateAI } from "@/lib/ai-provider";
import type { GlobalAIConfig } from "@/lib/auth-helpers";
import { resolveApiKey } from "@/lib/auth-helpers";
import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "@/lib/types";

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

/* ── Stage 1 prompt — language-native ── */

function buildMapperPrompt(params: ComboParams): { system: string; user: string } {
  const lang = params.outputLanguage;
  const phraseBlock = params.preferredNormalPhrases?.length
    ? params.preferredNormalPhrases.map((p) => `- ${p.label}: ${p.phrase}`).join("\n")
    : "";

  let paraphrase = "";
  let length = "";

  if (lang === "es") {
    paraphrase = params.paraphraseLevel === "none"
      ? "Transcribe literalmente los hallazgos dictados. No cambies palabras."
      : params.paraphraseLevel === "light"
        ? "Puedes corregir gramática y sintaxis. No cambies datos clínicos ni medidas."
        : "Puedes reformular con estilo radiológico profesional. Mantén todos los datos clínicos.";
    length = params.findingsLength === "concise"
      ? "Redacta cada sección de forma concisa en una frase."
      : params.findingsLength === "detailed"
        ? "Redacta exhaustivamente cada sección."
        : "Descripción completa sin redundancias.";

    const system = `Eres un radiólogo experto que estructura informes. Tu tarea: tomar el dictado y distribuirlo en las secciones del template como JSON estructurado.

IDIOMA DE SALIDA: español. TODO el texto de cada sección debe estar en español.
MODALIDAD: ${params.modality}

REGLAS:
1. Devuelve UN objeto JSON con un array "sections", una entrada por sección del template, en el MISMO ORDEN.
2. Cada entrada: {"label":"Nombre de sección en español","text":"Descripción en español.","source":"dictation|normal_default|negative_dictated","evidence":"fragmento exacto del dictado o null"}
3. Valores de "source":
   - "dictation": el radiólogo mencionó un hallazgo positivo. "evidence" = fragmento exacto del dictado.
   - "negative_dictated": el radiólogo dictó explícitamente la AUSENCIA de algo (ej: "no masa", "sin litiasis"). "evidence" = fragmento exacto. Incluye el hallazgo negativo fielmente.
   - "normal_default": el dictado NO menciona esta sección. Escribe una frase de normalidad radiológica profesional para ${params.modality}. "evidence" = null.
4. NUNCA inventes hallazgos patológicos que el radiólogo no haya dictado.
5. NUNCA escribas "no valorado", "no evaluado", "no descrito" en ninguna sección.
6. Coloca cada hallazgo en la sección anatómica correcta.
7. Devuelve SOLO JSON válido — sin markdown, sin comentarios.
8. ${paraphrase}
9. ${length}
10. TRADUCE los nombres de las secciones del template al español.${phraseBlock ? `

FRASES DE NORMALIDAD PREFERIDAS — úsalas LITERALMENTE para secciones no mencionadas:
${phraseBlock}` : ""}`;

    const user = `SECCIONES DEL TEMPLATE:\n${params.template}\n\nDICTADO:\n${params.dictation}`;
    return { system, user };
  }

  // English and other languages
  const LANG_LABEL: Record<OutputLanguage, string> = {
    es: "español", en: "English", pt: "português",
    fr: "français", de: "Deutsch", it: "italiano",
  };
  const l = LANG_LABEL[lang];

  paraphrase = params.paraphraseLevel === "none"
    ? "Transcribe dictated findings literally."
    : params.paraphraseLevel === "light"
      ? "Fix grammar/syntax only. Preserve all clinical data."
      : "Rephrase in professional radiological style. Preserve all clinical data.";
  length = params.findingsLength === "concise"
    ? "Keep each section concise — one sentence."
    : params.findingsLength === "detailed"
      ? "Write each section exhaustively."
      : "Complete descriptions without redundancy.";

  const system = `You are an expert radiologist structuring reports. Map the dictation to template sections as structured JSON.

OUTPUT LANGUAGE: ${l}. ALL section text and labels must be in ${l}.
MODALITY: ${params.modality}

RULES:
1. Return ONE JSON object with a "sections" array, one entry per template section, SAME ORDER.
2. Each entry: {"label":"Section name in ${l}","text":"Description in ${l}.","source":"dictation|normal_default|negative_dictated","evidence":"exact dictation fragment or null"}
3. "source" values:
   - "dictation": positive finding mentioned. "evidence" = exact dictation fragment.
   - "negative_dictated": radiologist explicitly stated ABSENCE (e.g. "no mass"). "evidence" = exact fragment.
   - "normal_default": section NOT mentioned. Write professional normality phrase for ${params.modality}. "evidence" = null.
4. NEVER invent findings not in the dictation.
5. NEVER write "not assessed" / "not evaluated".
6. Return ONLY valid JSON.
7. ${paraphrase}
8. ${length}
9. TRANSLATE section names to ${l}.${phraseBlock ? `

PREFERRED NORMALITY PHRASES — use LITERALLY for unmentioned sections:
${phraseBlock}` : ""}`;

  const user = `TEMPLATE SECTIONS:\n${params.template}\n\nDICTATION:\n${params.dictation}`;
  return { system, user };
}

/* ── Stage 2 prompt — concise validator ── */

function buildValidatorPrompt(dictation: string, mappingJson: string, lang: OutputLanguage): { system: string; user: string } {
  if (lang === "es") {
    const system = `Eres un auditor de calidad de informes radiológicos. Recibes el dictado original y un JSON con el mapping de hallazgos.

TU ÚNICA TAREA — buscar estos 3 tipos de error:
1. OMISIONES: un dato clínico del dictado no aparece en el mapping.
2. ALUCINACIONES: el mapping contiene un hallazgo clínico específico que NO está en el dictado. Las frases de normalidad para secciones no mencionadas NO son alucinaciones.
3. ERRORES DE SECCIÓN: un hallazgo está en la sección anatómica incorrecta.

REGLAS:
- NO rehaces el mapping completo. SOLO devuelves correcciones.
- Cada corrección: section_label, action (replace|add_finding|remove_hallucination), corrected_text (texto corregido en español), reason.
- Si no hay errores: {"status":"validated","corrections":[]}
- Si hay errores: {"status":"corrected","corrections":[...]}
- Devuelve SOLO JSON válido.`;

    const user = `DICTADO ORIGINAL:\n${dictation}\n\nMAPPING JSON:\n${mappingJson}`;
    return { system, user };
  }

  const LANG_LABEL: Record<OutputLanguage, string> = {
    es: "español", en: "English", pt: "português",
    fr: "français", de: "Deutsch", it: "italiano",
  };
  const l = LANG_LABEL[lang];

  const system = `You are a radiology report QC auditor. You receive the original dictation and a JSON mapping.

CHECK FOR 3 ERROR TYPES ONLY:
1. OMISSIONS: dictation content missing from mapping.
2. HALLUCINATIONS: specific clinical finding in mapping NOT in dictation. Normal phrases for unmentioned sections are NOT hallucinations.
3. WRONG SECTION: finding in incorrect anatomical section.

RULES:
- Do NOT redo the mapping. ONLY output corrections.
- Each correction: section_label, action (replace|add_finding|remove_hallucination), corrected_text (in ${l}), reason.
- No errors: {"status":"validated","corrections":[]}
- Errors found: {"status":"corrected","corrections":[...]}
- Return ONLY valid JSON.`;

  const user = `ORIGINAL DICTATION:\n${dictation}\n\nMAPPING JSON:\n${mappingJson}`;
  return { system, user };
}

/* ── Post-processing ── */

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

const COMPACT_SUFFIX: Record<string, string> = {
  es: "El resto de las estructuras evaluadas ({names}) no muestran alteraciones significativas.",
  en: "The remaining evaluated structures ({names}) show no significant abnormalities.",
  pt: "As restantes estruturas avaliadas ({names}) não apresentam alterações significativas.",
  fr: "Les structures évaluées restantes ({names}) ne montrent pas d'anomalies significatives.",
  de: "Die übrigen untersuchten Strukturen ({names}) zeigen keine signifikanten Auffälligkeiten.",
  it: "Le restanti strutture valutate ({names}) non mostrano alterazioni significative.",
};

function sectionsToText(sections: MappedSection[], compactNormals: boolean, lang: OutputLanguage): string {
  if (!compactNormals) {
    return sections.map((s) => `${s.label}: ${s.text}`).join("\n");
  }

  const findingSections = sections.filter((s) => s.source !== "normal_default");
  const normalSections = sections.filter((s) => s.source === "normal_default");

  const lines = findingSections.map((s) => `${s.label}: ${s.text}`);

  if (normalSections.length > 0) {
    const names = normalSections.map((s) => s.label.toLowerCase()).join(", ");
    const template = COMPACT_SUFFIX[lang] || COMPACT_SUFFIX.en;
    lines.push(template.replace("{names}", names));
  }

  return lines.join("\n");
}

/* ── Main pipeline ── */

export async function runComboFindings(
  globalConfig: GlobalAIConfig,
  params: ComboParams,
): Promise<string> {
  const openaiKey = resolveApiKey(globalConfig, "openai");
  const deepseekKey = resolveApiKey(globalConfig, "deepseek");

  if (!openaiKey) throw new Error("No OpenAI API key configured for combo pipeline (GPT-4 Mini).");
  if (!deepseekKey) throw new Error("No DeepSeek API key configured for combo pipeline (Reasoner).");

  const t0 = Date.now();

  // ── Stage 1: GPT-4 Mini maps dictation → structured JSON ──
  const mapper = buildMapperPrompt(params);
  console.log(`[combo] Stage 1 — GPT-4o-mini mapping (lang=${params.outputLanguage}, dictation=${params.dictation.length}ch)`);

  const mapperRaw = await generateAI({
    provider: "openai",
    modelName: "gpt-4o-mini",
    apiKey: openaiKey,
    system: mapper.system,
    user: mapper.user,
    maxTokens: 3000,
  });

  const t1 = Date.now();
  console.log(`[combo] Stage 1 done in ${t1 - t0}ms`);

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

  console.log(`[combo] Stage 1 — ${parsed.sections.length} sections, ${parsed.sections.filter((s) => s.source === "dictation").length} from dictation`);

  // ── Stage 2: DeepSeek Reasoner validates/corrects ──
  const validator = buildValidatorPrompt(params.dictation, jsonMatch[0], params.outputLanguage);
  console.log(`[combo] Stage 2 — DeepSeek Reasoner validating...`);

  const validatorRaw = await generateAI({
    provider: "deepseek",
    modelName: "deepseek-reasoner",
    apiKey: deepseekKey,
    system: validator.system,
    user: validator.user,
    maxTokens: 2000,
  });

  const t2 = Date.now();
  console.log(`[combo] Stage 2 done in ${t2 - t1}ms (total ${t2 - t0}ms)`);

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

  console.log(`[combo] Result — status=${validatorResult.status}, corrections=${validatorResult.corrections.length}`);

  // ── Apply corrections and format ──
  const finalSections = validatorResult.corrections.length > 0
    ? applyCorrections(parsed.sections, validatorResult.corrections)
    : parsed.sections;

  return sectionsToText(finalSections, params.compactNormals, params.outputLanguage);
}
