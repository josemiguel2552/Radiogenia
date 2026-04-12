import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "./types";

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
  preferredNormalPhrases?: PreferredNormalPhrase[];
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

  if (params.preferredNormalPhrases && params.preferredNormalPhrases.length > 0) {
    system += `\n\nFRASES DE NORMALIDAD PREFERIDAS DEL RADIÓLOGO (aprendidas de sus correcciones previas para este tipo de estudio).
Reglas de uso:
- Si el dictado NO menciona una sección y existe una frase preferida para ella, úsala literalmente.
- Si el dictado describe un hallazgo en esa sección, IGNORA la frase preferida y redacta el hallazgo dictado.
- NUNCA introduzcas información clínica que no esté en el dictado.
- Si no hay coincidencia exacta de nombre de sección, puedes adaptarla al equivalente anatómico traducido al idioma de salida.

Lista de frases preferidas:`;
    params.preferredNormalPhrases.forEach((p) => {
      system += `\n- ${p.label}: ${p.phrase}`;
    });
  }

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
  clinicalInfo: string;
  outputLanguage: OutputLanguage;
  preferredConclusionPhrases?: string[];
}): { system: string; user: string } {
  const hasClinical = params.clinicalInfo.trim().length > 0;

  let system = `Eres un radiólogo experto redactando conclusiones de informes radiológicos. Genera la conclusión basándote EXCLUSIVAMENTE en los hallazgos proporcionados.

LA CONCLUSIÓN ES UN RESUMEN DIAGNÓSTICO, NO CONTIENE RECOMENDACIONES.
NUNCA escribas frases como "se recomienda...", "se sugiere...", "valorar...", "completar con...", "control en...", "correlacionar con...", "derivar a...". Esas frases son RECOMENDACIONES y van en otra sección.

${hasClinical ? `PREGUNTA CLÍNICA:
Se proporcionan datos clínicos y/o una pregunta clínica del médico solicitante. La conclusión debe PRIMERO responder a esa pregunta clínica basándose en los hallazgos. Después, listar los demás hallazgos clínicamente relevantes de mayor a menor importancia.
- Si los hallazgos responden claramente la pregunta, indícalo de forma directa (ej: "Sin evidencia de...", "Hallazgos compatibles con...").
- Si los hallazgos no permiten responder con certeza, indícalo también (ej: "No se identifican hallazgos concluyentes respecto a...").` : ""}

REGLAS:
1. ${hasClinical ? "El PRIMER punto debe responder la pregunta clínica. Los siguientes puntos" : "Lista SOLO los hallazgos clínicamente significativos,"} ordenados de MAYOR a MENOR relevancia:
   - Hallazgos malignos o sospechosos de malignidad
   - Hallazgos agudos (hemorragias, infartos, perforaciones, obstrucciones)
   - Hallazgos indeterminados que requieren caracterización
   - Hallazgos crónicos clínicamente relevantes
   - Hallazgos incidentales menores van al final o se omiten.
2. NO incluyas descripciones de normalidad.
3. Si todo es normal${hasClinical ? " y la pregunta clínica se responde negativamente" : ""}, escribe: "${hasClinical ? "Sin hallazgos que sugieran [la patología preguntada]. Exploración dentro de límites normales." : "Exploración dentro de límites normales."}" (o equivalente en el idioma de salida).
4. Máximo 1-5 puntos numerados. Conciso pero preciso.

FORMATO:
- NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano.
- NO incluyas el encabezado "CONCLUSIÓN" ni "CONCLUSION".
- Cada punto empieza con mayúscula inicial.
- TODO el texto debe estar en el idioma indicado abajo.
${LANGUAGE_INSTRUCTIONS[params.outputLanguage]}`;

  if (params.preferredConclusionPhrases && params.preferredConclusionPhrases.length > 0) {
    system += `\n\nFRASES FRECUENTES DEL RADIÓLOGO EN CONCLUSIONES SIMILARES (aprendidas de sus correcciones previas).
Reglas de uso:
- Imita la ESTRUCTURA, el tono y la fraseología de estas frases.
- NO copies contenido clínico que no esté presente en los hallazgos actuales.
- Si una frase no encaja con los hallazgos de este informe, NO la utilices.

Lista de frases:`;
    params.preferredConclusionPhrases.forEach((p) => {
      system += `\n- ${p}`;
    });
  }

  let userMsg = "";
  if (hasClinical) userMsg += `Datos clínicos / pregunta clínica:\n${params.clinicalInfo}\n\n`;
  userMsg += `Hallazgos:\n${params.findingsText}`;

  return { system, user: userMsg };
}

export function buildRecommendationsPrompt(params: {
  findingsText: string;
  recommendations: { trigger: string; recommendation: string; guideline: string }[];
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const system = `Eres un radiólogo experto emitiendo recomendaciones de seguimiento basadas en guías clínicas.

Tu tarea es revisar los hallazgos del informe y determinar si alguno activa una recomendación del catálogo aprobado del centro.

PROCESO DE EMPAREJAMIENTO — sigue estos pasos para cada hallazgo:
1. Identifica el ÓRGANO afectado por el hallazgo (hígado, pulmón, riñón, etc.).
2. Identifica la PATOLOGÍA o CARACTERÍSTICA del hallazgo (nódulo, quiste, masa, etc.).
3. Busca en el catálogo un trigger que coincida en ÓRGANO Y PATOLOGÍA.
4. Solo si hay coincidencia en ambos, emite esa recomendación.

REGLAS ABSOLUTAS:
1. SOLO emite recomendaciones basadas en las que aparecen en el catálogo proporcionado. NO inventes recomendaciones que no estén en el catálogo.
2. El CONTENIDO de la recomendación debe ser fiel al catálogo (mismo estudio, mismo plazo, misma guía), pero la REDACCIÓN FINAL debe estar SIEMPRE en el idioma de salida indicado abajo.
3. NUNCA apliques la recomendación de un órgano a otro.
4. NUNCA sugieras procedimientos invasivos (biopsia, cirugía) a menos que el catálogo lo diga explícitamente.
5. Si ningún hallazgo coincide con ningún trigger del catálogo: escribe solamente "No se emiten recomendaciones adicionales." (o equivalente en el idioma de salida).
6. SIEMPRE cita la guía o referencia bibliográfica de la que proviene cada recomendación. El campo "guideline" del catálogo contiene esta referencia. Inclúyela entre paréntesis al final de cada recomendación.
7. Indica también entre paréntesis el hallazgo que activó la recomendación.

FORMATO:
- NO uses asteriscos (*), almohadillas (#) ni markdown. Texto plano solamente.
- NO incluyas el encabezado "RECOMENDACIONES".
- Numera las recomendaciones si hay más de una.
- Cada recomendación debe seguir esta estructura:
  [número]. [texto de la recomendación] ([guía/referencia]) — Hallazgo: [hallazgo que la activó].
- Ejemplo: "1. TC torácico de control en 3 meses (Fleischner Society) — Hallazgo: nódulo pulmonar sólido de 9 mm en LSD."
- TODO el texto debe estar en el idioma indicado abajo.
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
