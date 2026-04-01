import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage } from "./types";

const LENGTH_INSTRUCTIONS: Record<FindingsLength, string> = {
  concise: "Redacta cada sección de forma concisa en una sola frase. Incluye solo el dato diagnóstico esencial.",
  standard: "Redacta cada sección con descripción completa pero sin redundancias.",
  detailed: "Redacta cada sección de forma exhaustiva describiendo todos los parámetros radiológicos disponibles.",
};

const VERBOSITY_INSTRUCTIONS: Record<NormalFieldsVerbosity, string> = {
  minimal: "Las secciones no mencionadas por el radiólogo se rellenan únicamente con 'sin alteraciones' o 'normal'.",
  standard: "Las secciones no mencionadas se rellenan con una frase descriptiva breve que refleje normalidad.",
  explicit: "Las secciones no mencionadas se rellenan con descripción completa de todos los parámetros normales relevantes de esa estructura anatómica.",
};

const PARAPHRASE_INSTRUCTIONS: Record<ParaphraseLevel, string> = {
  none: "Transcribe los hallazgos dictados de forma literal. No cambies ninguna palabra, término ni estructura de frase. Solo ubícalos en la sección correcta del template.",
  light: "Puedes corregir gramática y orden sintáctico. No cambies ningún dato clínico, medida, término diagnóstico ni descriptor. Usa solo términos estrictamente equivalentes.",
  free: "Puedes reescribir los hallazgos con tu propio estilo radiológico profesional. Mantén todos los datos clínicos, medidas y descriptores intactos. No omitas ni añadas información.",
};

const LANGUAGE_INSTRUCTIONS: Record<OutputLanguage, string> = {
  es: "Redacta toda la salida en español.",
  en: "Write all output in English.",
  pt: "Escreva toda a saída em português.",
  fr: "Rédigez toute la sortie en français.",
  de: "Verfasse die gesamte Ausgabe auf Deutsch.",
  it: "Scrivi tutto l'output in italiano.",
};

export function buildFindingsPrompt(params: {
  template: string;
  dictation: string;
  findingsLength: FindingsLength;
  normalFieldsVerbosity: NormalFieldsVerbosity;
  paraphraseLevel: ParaphraseLevel;
  outputLanguage: OutputLanguage;
  styleSamples?: string[];
}): { system: string; user: string } {
  let system = `Eres un asistente especializado en radiología. Toma el dictado del radiólogo y estructúralo dentro del template proporcionado.

Reglas:
1. Distribuye cada hallazgo en la sección anatómica correcta del template.
2. Rellena secciones no mencionadas con frases normales apropiadas.
3. NO inventes hallazgos no mencionados en el dictado.
4. NO omitas ninguna sección del template.
5. Formato: nombre de sección en negrita seguido del texto.

${LENGTH_INSTRUCTIONS[params.findingsLength]}
${VERBOSITY_INSTRUCTIONS[params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[params.paraphraseLevel]}
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  if (params.styleSamples && params.styleSamples.length > 0) {
    system += `\n\nA continuación se muestran ${params.styleSamples.length} ejemplos de informes redactados por este radiólogo para estudios similares. Imita su estilo de redacción, estructura de frases y nivel de detalle. NO copies el contenido clínico de los ejemplos, solo el estilo:\n`;
    params.styleSamples.forEach((sample, i) => {
      system += `\nEJEMPLO ${i + 1}:\n${sample}\n`;
    });
  }

  const user = `Template: ${params.template}\n\nDictado: ${params.dictation}`;
  return { system, user };
}

export function buildConclusionPrompt(params: {
  findingsText: string;
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const system = `Genera la conclusión del informe radiológico.

Reglas:
1. Solo hallazgos con relevancia clínica, 1-4 bullet points, mayor a menor relevancia.
2. Hallazgos normales NO se incluyen.
3. Si todo es normal: "Exploración dentro de límites normales."
4. Lenguaje conciso y profesional.
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  const user = `Hallazgos: ${params.findingsText}`;
  return { system, user };
}

export function buildRecommendationsPrompt(params: {
  findingsText: string;
  recommendations: { trigger: string; recommendation: string }[];
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const system = `Revisa si algún hallazgo activa recomendaciones del catálogo aprobado.

Reglas ABSOLUTAS:
1. SOLO emite recomendaciones del catálogo proporcionado.
2. NUNCA inventes recomendaciones fuera del catálogo.
3. NUNCA sugieras procedimientos invasivos.
4. Si ningún hallazgo activa una recomendación: "No se emiten recomendaciones adicionales."
5. Indica entre paréntesis el hallazgo que activó cada recomendación.
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  const recsJson = JSON.stringify(params.recommendations);
  const user = `Catálogo aprobado: ${recsJson}\n\nHallazgos: ${params.findingsText}`;
  return { system, user };
}

export function buildPdfExtractionPrompt(): { system: string } {
  return {
    system: `Extrae pares (hallazgo → recomendación) del texto de guía clínica.

Reglas:
1. Solo recomendaciones de seguimiento o estudios no invasivos.
2. Ignora procedimientos invasivos.
3. Triggers específicos y reconocibles.
4. Responde SOLO en JSON válido:
[{"trigger": "...", "recommendation": "...", "guideline": "..."}]`,
  };
}

export function buildFullPromptPreview(params: {
  template: string;
  findingsLength: FindingsLength;
  normalFieldsVerbosity: NormalFieldsVerbosity;
  paraphraseLevel: ParaphraseLevel;
  outputLanguage: OutputLanguage;
  styleSamplesCount: number;
}): string {
  let preview = `SYSTEM PROMPT (Agente 1 — Hallazgos):
---
Eres un asistente especializado en radiología...

${LENGTH_INSTRUCTIONS[params.findingsLength]}
${VERBOSITY_INSTRUCTIONS[params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[params.paraphraseLevel]}
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  if (params.styleSamplesCount > 0) {
    preview += `\n\n[Se inyectarán ${params.styleSamplesCount} ejemplos few-shot del estilo del radiólogo]`;
  }

  preview += `\n\nTemplate: ${params.template}\nDictado: [texto del dictado del radiólogo]`;
  return preview;
}
