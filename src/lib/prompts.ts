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
  modality: string;
  findingsLength: FindingsLength;
  normalFieldsVerbosity: NormalFieldsVerbosity;
  paraphraseLevel: ParaphraseLevel;
  outputLanguage: OutputLanguage;
  styleSamples?: string[];
}): { system: string; user: string } {
  let system = `Eres un asistente especializado en radiología. Toma el dictado del radiólogo y estructúralo dentro del template proporcionado.

La modalidad del estudio es: ${params.modality}.

Reglas:
1. Distribuye cada hallazgo en la sección anatómica correcta del template.
2. Rellena secciones no mencionadas con frases normales apropiadas.
3. NO inventes hallazgos no mencionados en el dictado.
4. NO omitas ninguna sección anatómica del template.
5. IGNORA por completo la sección "CONCLUSION" o "CONCLUSIÓN" del template — NO la incluyas en tu respuesta. Solo genera las secciones de hallazgos anatómicos.
6. Usa EXCLUSIVAMENTE terminología apropiada para la modalidad ${params.modality}:
   - Si es MRI/RM: usa "intensidad de señal", "hiperintenso", "hipointenso", "realce", etc. NUNCA uses "ecotextura", "ecogenicidad", "anecoico" ni otros términos ecográficos.
   - Si es Ultrasound/Ecografía: usa "ecotextura", "ecogenicidad", "anecoico", "hipoecoico", etc.
   - Si es CT/TC: usa "densidad", "atenuación", "hiperdenso", "hipodenso", "realce", etc.
   - Si es XRay/Rx: usa "radiopaco", "radiolúcido", "densidad", etc.
7. Formato de salida OBLIGATORIO:
   - NO uses asteriscos (*), almohadillas (#) ni markdown.
   - Los nombres de sección van con la primera letra en mayúscula y el resto en minúsculas, seguidos de dos puntos.
   - Ejemplo: "Hígado: Parénquima hepático de tamaño y morfología normal."
   - Ejemplo: "Parénquima pulmonar: Sin consolidaciones ni opacidades."
   - Si hay subsecciones, el nombre de la subsección también va con primera letra en mayúscula: "Ganglios linfáticos mediastínicos: Sin adenopatías."

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
1. Solo hallazgos con relevancia clínica, 1-4 puntos numerados, de mayor a menor relevancia.
2. Hallazgos normales NO se incluyen en la conclusión.
3. Si todo es normal, escribe únicamente: "Exploración dentro de límites normales." (o su equivalente en el idioma seleccionado).
4. Lenguaje conciso y profesional.
5. NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano solamente.
6. NO incluyas el encabezado "CONCLUSIÓN" ni "CONCLUSION" — escribe directamente el contenido.
7. Cada punto numerado empieza con mayúscula inicial.
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
1. SOLO emite recomendaciones del catálogo proporcionado. Copia el texto de la recomendación TAL CUAL aparece en el catálogo.
2. NUNCA inventes, parafrasees ni modifiques recomendaciones. Si el catálogo dice "US hepático", NO lo cambies a "US pélvico" ni a otro estudio.
3. NUNCA sugieras procedimientos invasivos.
4. Empareja cada hallazgo con su recomendación correspondiente según el ÓRGANO y la PATOLOGÍA específica del trigger. Un hallazgo hepático solo puede activar una recomendación con trigger hepático, uno pulmonar solo una pulmonar, etc.
5. Si ningún hallazgo activa una recomendación: "No se emiten recomendaciones adicionales." (o su equivalente en el idioma seleccionado).
6. Indica entre paréntesis el hallazgo que activó cada recomendación.
7. NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano solamente.
8. NO incluyas el encabezado "RECOMENDACIONES" — escribe directamente el contenido.
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
