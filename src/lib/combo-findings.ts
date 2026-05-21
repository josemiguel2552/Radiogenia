import { generateAIWithUsage, type AIUsage } from "@/lib/ai-provider";
import type { GlobalAIConfig } from "@/lib/auth-helpers";
import { resolveApiKey } from "@/lib/auth-helpers";
import { enforceOutputLanguage } from "@/lib/section-translate";
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
  dictationOnly?: boolean;
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
        ? "Puedes corregir gramática, sintaxis y errores de terminología médica (ej: 'supracolicular'→'supraclavicular'). Usa el término anatómico correcto según el contexto y la modalidad. No cambies datos clínicos ni medidas."
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
   IMPORTANTE: En el campo "text", si hay múltiples hallazgos, sepáralos con PUNTOS (.), NUNCA con punto y coma (;).
3. Valores de "source":
   - "dictation": el radiólogo mencionó un hallazgo positivo. "evidence" = fragmento exacto del dictado.
   - "negative_dictated": el radiólogo dictó explícitamente la AUSENCIA de algo (ej: "no masa", "sin litiasis"). "evidence" = fragmento exacto. Incluye el hallazgo negativo fielmente.
   - "normal_default": el dictado NO menciona esta sección. Escribe una frase de normalidad radiológica profesional para ${params.modality}. "evidence" = null.
4. NUNCA inventes hallazgos patológicos que el radiólogo no haya dictado.
5. NUNCA escribas "no valorado", "no evaluado", "no descrito" en ninguna sección.
6. Coloca cada hallazgo en la sección anatómica correcta.
7. HALLAZGOS SIN SECCIÓN — OBLIGATORIO: Si un hallazgo dictado NO encaja en NINGUNA sección del template, DEBES añadir una entrada adicional al final del array con label "Otros hallazgos", source "dictation" y TODOS los hallazgos huérfanos agrupados. NUNCA omitas un hallazgo por falta de sección. Es preferible un "Otros hallazgos" largo que perder un solo dato clínico.
8. Devuelve SOLO JSON válido — sin markdown, sin comentarios.
9. ${paraphrase}
10. ${length}
11. TRADUCE los nombres de las secciones del template al español.
12. ⚠️ CERO OMISIONES: Antes de finalizar, VERIFICA que CADA dato del dictado aparece en alguna sección del JSON. Si falta alguno, añádelo a "Otros hallazgos" con source "dictation".${phraseBlock ? `

FRASES DE NORMALIDAD PREFERIDAS — guías de estilo para secciones no mencionadas.
Si una frase está en inglés, TRADÚCELA al español manteniendo el mismo significado y nivel de detalle. TODA la salida debe estar en español sin excepción:
${phraseBlock}` : ""}`;

    const user = `SECCIONES DEL TEMPLATE:\n${params.template}\n\nDICTADO:\n${params.dictation}`;
    return { system, user };
  }

  // English and other languages
  const LANG_LABEL: Record<OutputLanguage, string> = {
    es: "español", en: "English", pt: "português",
  };
  const l = LANG_LABEL[lang];

  paraphrase = params.paraphraseLevel === "none"
    ? "Transcribe dictated findings literally."
    : params.paraphraseLevel === "light"
      ? "Fix grammar, syntax, and medical terminology errors (e.g. 'supracolicular'→'supraclavicular'). Use the correct anatomical term based on context and modality. Preserve all clinical data."
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
   IMPORTANT: In the "text" field, if there are multiple findings, separate them with PERIODS (.), NEVER with semicolons (;).
3. "source" values:
   - "dictation": positive finding mentioned. "evidence" = exact dictation fragment.
   - "negative_dictated": radiologist explicitly stated ABSENCE (e.g. "no mass"). "evidence" = exact fragment.
   - "normal_default": section NOT mentioned. Write professional normality phrase for ${params.modality}. "evidence" = null.
4. NEVER invent findings not in the dictation.
5. NEVER write "not assessed" / "not evaluated".
6. FINDINGS WITHOUT A SECTION — MANDATORY: If a dictated finding does NOT fit ANY template section, you MUST add an extra entry at the end of the array with label "Additional findings", source "dictation", grouping ALL orphan findings. NEVER omit a finding due to lack of a matching section. A long "Additional findings" entry is preferable to losing a single clinical data point.
7. Return ONLY valid JSON.
8. ${paraphrase}
9. ${length}
10. TRANSLATE section names to ${l}.
11. ZERO OMISSIONS: Before finalizing, VERIFY that EVERY piece of data from the dictation appears in some section of the JSON. If anything is missing, add it to "Additional findings" with source "dictation".${phraseBlock ? `

PREFERRED NORMALITY PHRASES — style guide for unmentioned sections.
If a phrase is in a different language, TRANSLATE it to ${l} keeping the same meaning and detail level. ALL output must be in ${l} without exception:
${phraseBlock}` : ""}`;

  const user = `TEMPLATE SECTIONS:\n${params.template}\n\nDICTATION:\n${params.dictation}`;
  return { system, user };
}

/* ── Stage 2 prompt — concise validator ── */

function buildValidatorPrompt(dictation: string, mappingJson: string, lang: OutputLanguage): { system: string; user: string } {
  if (lang === "es") {
    const system = `Eres un auditor de calidad de informes radiológicos. Recibes el dictado original y un JSON con el mapping de hallazgos.

TU ÚNICA TAREA — buscar estos 4 tipos de error:
1. OMISIONES (LA MÁS IMPORTANTE): un dato clínico del dictado no aparece en NINGUNA sección del mapping. Revisa CADA frase del dictado y verifica que está representada en alguna sección. Si un hallazgo no encaja en ninguna sección existente, usa action "add_finding" con section_label "Otros hallazgos" para añadirlo. NUNCA se debe perder un hallazgo dictado.
2. ALUCINACIONES: el mapping contiene un hallazgo clínico específico que NO está en el dictado. Las frases de normalidad para secciones no mencionadas NO son alucinaciones. La sección "Otros hallazgos" con hallazgos que SÍ están en el dictado NO es una alucinación — es una sección legítima para hallazgos que no encajan en el template.
3. ERRORES DE SECCIÓN: un hallazgo está en la sección anatómica INCORRECTA. La sección debe corresponder ANATÓMICAMENTE al hallazgo. Ejemplos de error: nódulos tiroideos en "Tráquea y bronquios" (tiroides NO es tráquea), hallazgos pleurales en "Pulmón" cuando hay sección de pleura, hallazgos vesiculares en "Hígado" cuando hay sección de vesícula. Si detectas esto, usa action "add_finding" con section_label "Otros hallazgos" y "remove_hallucination" para eliminar el hallazgo de la sección incorrecta.
4. IDIOMA INCORRECTO: TODA la salida (labels y textos) debe estar en ESPAÑOL. Si un label o texto está en inglés u otro idioma, corrígelo traduciéndolo al español. Esto incluye frases de normalidad como "No significant abnormalities", "Normal in size", etc. — TODAS deben estar en español.

REGLAS:
- NO rehaces el mapping completo. SOLO devuelves correcciones.
- Cada corrección: section_label, action (replace|add_finding|remove_hallucination), corrected_text (texto corregido en español), reason.
- Para errores de idioma usa action "replace" y en reason indica "wrong_language".
- Para omisiones: usa action "add_finding", section_label = sección correcta (o "Otros hallazgos" si no encaja en ninguna), corrected_text = texto completo de la sección incluyendo el hallazgo omitido.
- Si no hay errores: {"status":"validated","corrections":[]}
- Si hay errores: {"status":"corrected","corrections":[...]}
- Devuelve SOLO JSON válido.

VERIFICACIÓN DE DATOS EXACTOS: Si un hallazgo incluye medidas (mm, cm), lateralidad (derecha/izquierda), conteos o localizaciones específicas, verifica que coincidan EXACTAMENTE con el dictado. Si hay discrepancia, corrige con action "replace".`;

    const user = `DICTADO ORIGINAL:\n${dictation}\n\nMAPPING JSON:\n${mappingJson}`;
    return { system, user };
  }

  const LANG_LABEL: Record<OutputLanguage, string> = {
    es: "español", en: "English", pt: "português",
  };
  const l = LANG_LABEL[lang];

  const system = `You are a radiology report QC auditor. You receive the original dictation and a JSON mapping.

CHECK FOR 4 ERROR TYPES:
1. OMISSIONS (MOST IMPORTANT): dictation content missing from ANY section in the mapping. Check EVERY phrase in the dictation and verify it is represented in some section. If a finding does not fit any existing section, use action "add_finding" with section_label "Additional findings" to add it. A dictated finding must NEVER be lost.
2. HALLUCINATIONS: specific clinical finding in mapping NOT in dictation. Normal phrases for unmentioned sections are NOT hallucinations. The "Additional findings" section containing findings that ARE in the dictation is NOT a hallucination — it is a legitimate catch-all for findings that do not fit any template section.
3. WRONG SECTION: finding in incorrect anatomical section. The section must ANATOMICALLY match the finding. Examples of errors: thyroid nodules in "Trachea and bronchi" (thyroid is NOT trachea), pleural findings in "Lung" when a pleura section exists, gallbladder findings in "Liver" when a gallbladder section exists. If you detect this, use action "add_finding" with section_label "Additional findings" and "remove_hallucination" to remove the finding from the wrong section.
4. WRONG LANGUAGE: ALL output (labels and text) must be in ${l}. If any label or text is in a different language, correct it by translating to ${l}. This includes normality phrases like "No significant abnormalities", "Normal in size" etc. — ALL must be in ${l}.

RULES:
- Do NOT redo the mapping. ONLY output corrections.
- Each correction: section_label, action (replace|add_finding|remove_hallucination), corrected_text (in ${l}), reason.
- For language errors use action "replace" and reason "wrong_language".
- For omissions: use action "add_finding", section_label = correct section (or "Additional findings" if it fits nowhere), corrected_text = full section text including the omitted finding.
- No errors: {"status":"validated","corrections":[]}
- Errors found: {"status":"corrected","corrections":[...]}
- Return ONLY valid JSON.

EXACT DATA VERIFICATION: If a finding includes measurements (mm, cm), laterality (right/left), counts, or specific locations, verify they match EXACTLY with the dictation. If there is a discrepancy, correct with action "replace".`;

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

    if (idx === -1) {
      if (c.action === "add_finding") {
        result.push({
          label: c.section_label,
          text: c.corrected_text,
          source: "dictation",
          evidence: c.reason,
        });
      }
      continue;
    }

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
  pt: "As demais estruturas avaliadas ({names}) não apresentam alterações significativas.",
};

function sectionsToText(sections: MappedSection[], compactNormals: boolean, dictationOnly: boolean, lang: OutputLanguage): string {
  if (dictationOnly) {
    const dictated = sections.filter((s) => s.source !== "normal_default");
    return dictated.map((s) => `${s.label}: ${s.text}`).join("\n");
  }

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

export interface ComboUsage {
  mapper: { provider: string; model: string; usage: AIUsage };
  validator: { provider: string; model: string; usage: AIUsage };
}

export async function runComboFindings(
  globalConfig: GlobalAIConfig,
  params: ComboParams,
): Promise<{ text: string; comboUsage: ComboUsage }> {
  const openaiKey = resolveApiKey(globalConfig, "openai");
  const deepseekKey = resolveApiKey(globalConfig, "deepseek");

  if (!openaiKey) throw new Error("No OpenAI API key configured for combo pipeline (GPT-4 Mini).");
  if (!deepseekKey) throw new Error("No DeepSeek API key configured for combo pipeline.");

  const t0 = Date.now();

  // ── Stage 1: GPT-4 Mini maps dictation → structured JSON ──
  const mapper = buildMapperPrompt(params);
  console.log(`[combo] Stage 1 — GPT-4o-mini mapping (lang=${params.outputLanguage}, dictation=${params.dictation.length}ch)`);

  const mapperResult = await generateAIWithUsage({
    provider: "openai",
    modelName: "gpt-4o-mini",
    apiKey: openaiKey,
    system: mapper.system,
    user: mapper.user,
    maxTokens: 3000,
  });
  const mapperRaw = mapperResult.text;

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

  // ── Stage 2: DeepSeek V3 validates/corrects ──
  const validator = buildValidatorPrompt(params.dictation, jsonMatch[0], params.outputLanguage);
  console.log(`[combo] Stage 2 — DeepSeek V3 validating...`);

  const validatorAI = await generateAIWithUsage({
    provider: "deepseek",
    modelName: "deepseek-chat",
    apiKey: deepseekKey,
    system: validator.system,
    user: validator.user,
    maxTokens: 2000,
  });
  const validatorRaw = validatorAI.text;

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

  const rawText = sectionsToText(finalSections, params.compactNormals, !!params.dictationOnly, params.outputLanguage);
  return {
    text: enforceOutputLanguage(rawText, params.outputLanguage),
    comboUsage: {
      mapper: { provider: "openai", model: "gpt-4o-mini", usage: mapperResult.usage },
      validator: { provider: "deepseek", model: "deepseek-chat", usage: validatorAI.usage },
    },
  };
}
