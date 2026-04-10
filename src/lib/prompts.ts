import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage } from "./types";

const LENGTH_INSTRUCTIONS: Record<FindingsLength, string> = {
  concise: "Redacta cada sección de forma concisa en una sola frase. Incluye solo el dato diagnóstico esencial.",
  standard: "Redacta cada sección con descripción completa pero sin redundancias.",
  detailed: "Redacta cada sección de forma exhaustiva describiendo todos los parámetros radiológicos disponibles.",
};

const VERBOSITY_INSTRUCTIONS: Record<NormalFieldsVerbosity, string> = {
  minimal: "Las secciones no mencionadas por el radiólogo se describen brevemente como normales. Ejemplo: 'Hígado: Sin alteraciones.' o 'Bazo: De tamaño normal.'",
  standard: "Las secciones no mencionadas se describen con una frase profesional que refleje una evaluación normal del órgano o estructura. Ejemplo: 'Hígado: De tamaño, morfología e intensidad de señal normales.' o 'Riñones: De tamaño y morfología normales, sin dilatación del sistema excretor.'",
  explicit: "Las secciones no mencionadas se describen exhaustivamente con todos los parámetros normales relevantes de esa estructura anatómica para la modalidad del estudio. Ejemplo para RM: 'Hígado: De tamaño y morfología normales. Intensidad de señal homogénea en todas las secuencias. Sin lesiones focales. Venas suprahepáticas permeables.'",
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
  let system = `Eres un radiólogo experto redactando informes estructurados. Tu tarea es tomar el dictado del radiólogo y distribuirlo en las secciones anatómicas del template proporcionado.

MODALIDAD DEL ESTUDIO: ${params.modality}

PRINCIPIO FUNDAMENTAL — SECCIONES NO MENCIONADAS:
El radiólogo solo dicta lo anormal o lo que quiere destacar. Si el radiólogo NO menciona una sección del template, significa que la evaluó y es NORMAL. NUNCA escribas "no se describe", "no se explora", "no evaluado", "no mencionado", "not assessed" ni variantes. En su lugar, describe normalidad radiológica apropiada para ese órgano/estructura y esta modalidad.

REGLAS OBLIGATORIAS:
1. Distribuye cada hallazgo dictado en la sección anatómica correcta del template.
2. Las secciones no mencionadas se rellenan SIEMPRE con descripciones de normalidad radiológica profesional, específicas del órgano y la modalidad.
3. NO inventes hallazgos patológicos que el radiólogo no haya dictado.
4. NO omitas ninguna sección anatómica del template.
5. IGNORA completamente la sección "CONCLUSION"/"CONCLUSIÓN" del template — NO la incluyas en tu respuesta. Solo genera las secciones de hallazgos anatómicos.

TERMINOLOGÍA OBLIGATORIA SEGÚN MODALIDAD (${params.modality}):
${params.modality === "MRI" ? `- Usa: "intensidad de señal", "hiperintenso en T2", "hipointenso en T1", "realce tras contraste", "restricción en difusión", "morfología", "tamaño".
- PROHIBIDO: "ecotextura", "ecogenicidad", "anecoico", "hipoecoico", "atenuación", "hiperdenso", "hipodenso". Estos términos son de ecografía o TC, NO de RM.` :
params.modality === "Ultrasound" ? `- Usa: "ecotextura", "ecogenicidad", "anecoico", "hipoecoico", "hiperecoico", "flujo Doppler", "sombra acústica posterior".
- PROHIBIDO: "intensidad de señal", "hiperintenso", "hipointenso", "atenuación", "hiperdenso". Estos términos son de RM o TC, NO de ecografía.` :
params.modality === "CT" ? `- Usa: "densidad", "atenuación", "hiperdenso", "hipodenso", "isodenso", "realce tras contraste", "unidades Hounsfield".
- PROHIBIDO: "ecotextura", "ecogenicidad", "anecoico", "intensidad de señal", "hiperintenso". Estos términos son de ecografía o RM, NO de TC.` :
params.modality === "XRay" ? `- Usa: "radiopaco", "radiolúcido", "densidad", "silueta", "índice cardiotorácico", "trama broncovascular".
- PROHIBIDO: "ecotextura", "intensidad de señal", "atenuación", "realce". Estos términos son de otras modalidades.` :
`- Usa terminología apropiada para ${params.modality}. No mezcles términos de otras modalidades.`}

FORMATO DE SALIDA:
- NO uses asteriscos (*), almohadillas (#) ni markdown.
- TRADUCE los nombres de las secciones del template al idioma de salida. El template puede tener secciones en inglés como "Liver", "Gallbladder", "Lung parenchyma", etc. — tradúcelas al idioma correspondiente (ej: "Hígado", "Vesícula biliar", "Parénquima pulmonar" en español).
- Nombres de sección con primera letra en mayúscula y el resto en minúsculas, seguidos de dos puntos.
- Ejemplo correcto: "Hígado: De tamaño y morfología normales, con intensidad de señal homogénea en todas las secuencias."
- Ejemplo correcto: "Parénquima pulmonar: Sin consolidaciones ni nódulos."
- Si el template tiene subsecciones/agrupaciones, tradúcelas y mantenlas con el mismo formato.

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
  const system = `Eres un radiólogo experto redactando conclusiones de informes radiológicos. Genera la conclusión basándote EXCLUSIVAMENTE en los hallazgos proporcionados.

REGLAS DE RELEVANCIA CLÍNICA:
1. Incluye SOLO hallazgos clínicamente significativos que requieran atención, seguimiento o cambio en el manejo del paciente.
2. Ordénalos de MAYOR a MENOR relevancia clínica. Prioriza:
   - Hallazgos malignos o sospechosos de malignidad (masas, nódulos sospechosos, lesiones con realce patológico)
   - Hallazgos agudos (hemorragias, infartos, perforaciones, obstrucciones)
   - Hallazgos que requieren seguimiento o estudio adicional (nódulos indeterminados, lesiones a caracterizar)
   - Hallazgos crónicos pero clínicamente relevantes (estenosis significativas, aneurismas)
   - Hallazgos incidentales menores (quistes simples, colelitiasis, cambios degenerativos) van al final o se omiten si hay hallazgos más importantes.
3. NO incluyas descripciones de normalidad en la conclusión.
4. Si todo es normal, escribe únicamente: "Exploración dentro de límites normales." (o su equivalente en el idioma seleccionado).
5. Máximo 1-4 puntos numerados. Sé conciso pero preciso — incluye localización, tamaño y característica principal.

FORMATO:
- NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano solamente.
- NO incluyas el encabezado "CONCLUSIÓN" ni "CONCLUSION" — escribe directamente el contenido.
- Cada punto numerado empieza con mayúscula inicial.
- Ejemplo: "1. Lesión hepática de 23 mm en segmento VIII, indeterminada, que requiere caracterización con RM."
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  const user = `Hallazgos: ${params.findingsText}`;
  return { system, user };
}

export function buildRecommendationsPrompt(params: {
  findingsText: string;
  recommendations: { trigger: string; recommendation: string }[];
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const system = `Eres un radiólogo experto emitiendo recomendaciones de seguimiento basadas en guías clínicas.

Tu tarea es revisar los hallazgos del informe y determinar si alguno activa una recomendación del catálogo aprobado del centro.

PROCESO DE EMPAREJAMIENTO — sigue estos pasos para cada hallazgo:
1. Identifica el ÓRGANO afectado por el hallazgo (hígado, pulmón, riñón, etc.).
2. Identifica la PATOLOGÍA o CARACTERÍSTICA del hallazgo (nódulo, quiste, masa, etc.).
3. Busca en el catálogo un trigger que coincida en ÓRGANO Y PATOLOGÍA.
4. Solo si hay coincidencia en ambos, emite esa recomendación COPIANDO el texto EXACTO del catálogo.

REGLAS ABSOLUTAS:
1. SOLO emite recomendaciones que estén LITERALMENTE en el catálogo proporcionado. Copia el texto TAL CUAL.
2. NUNCA inventes, parafrasees, combines ni modifiques el texto de una recomendación del catálogo.
3. NUNCA apliques la recomendación de un órgano a otro. Ejemplo: si el catálogo tiene un trigger para "nódulo pulmonar", NO lo apliques a un nódulo hepático ni a un nódulo tiroideo.
4. NUNCA sugieras procedimientos invasivos (biopsia, cirugía) a menos que el catálogo lo diga explícitamente.
5. Si ningún hallazgo coincide con ningún trigger del catálogo: escribe solamente "No se emiten recomendaciones adicionales." (o equivalente en el idioma).
6. Para cada recomendación emitida, indica entre paréntesis el hallazgo específico que la activó.

FORMATO:
- NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano solamente.
- NO incluyas el encabezado "RECOMENDACIONES" — escribe directamente el contenido.
- Numera las recomendaciones si hay más de una.
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  const recsJson = JSON.stringify(params.recommendations);
  const user = `Catálogo de recomendaciones aprobadas:\n${recsJson}\n\nHallazgos del informe:\n${params.findingsText}`;
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
