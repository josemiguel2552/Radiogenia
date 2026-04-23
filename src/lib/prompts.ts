import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase } from "./types";

/* ── Per-language instruction blocks ────────────────────────── */

const LENGTH_INSTRUCTIONS: Record<OutputLanguage, Record<FindingsLength, string>> = {
  es: {
    concise: "Redacta cada sección de forma concisa en una sola frase. Incluye solo el dato diagnóstico esencial.",
    standard: "Redacta cada sección con descripción completa pero sin redundancias.",
    detailed: "Redacta cada sección de forma exhaustiva describiendo todos los parámetros radiológicos disponibles.",
  },
  en: {
    concise: "Write each section concisely in a single sentence. Include only the essential diagnostic finding.",
    standard: "Write each section with a complete description but without redundancy.",
    detailed: "Write each section exhaustively describing all available radiological parameters.",
  },
  pt: {
    concise: "Redija cada secção de forma concisa numa única frase. Inclua apenas o dado diagnóstico essencial.",
    standard: "Redija cada secção com descrição completa mas sem redundâncias.",
    detailed: "Redija cada secção de forma exaustiva descrevendo todos os parâmetros radiológicos disponíveis.",
  },
  fr: {
    concise: "Rédigez chaque section de manière concise en une seule phrase. N'incluez que la donnée diagnostique essentielle.",
    standard: "Rédigez chaque section avec une description complète mais sans redondances.",
    detailed: "Rédigez chaque section de manière exhaustive en décrivant tous les paramètres radiologiques disponibles.",
  },
  de: {
    concise: "Schreibe jeden Abschnitt knapp in einem einzigen Satz. Nenne nur den wesentlichen diagnostischen Befund.",
    standard: "Schreibe jeden Abschnitt mit vollständiger Beschreibung, aber ohne Redundanzen.",
    detailed: "Schreibe jeden Abschnitt ausführlich und beschreibe alle verfügbaren radiologischen Parameter.",
  },
  it: {
    concise: "Scrivi ogni sezione in modo conciso in una singola frase. Includi solo il dato diagnostico essenziale.",
    standard: "Scrivi ogni sezione con descrizione completa ma senza ridondanze.",
    detailed: "Scrivi ogni sezione in modo esaustivo descrivendo tutti i parametri radiologici disponibili.",
  },
};

const VERBOSITY_INSTRUCTIONS: Record<OutputLanguage, Record<NormalFieldsVerbosity, string>> = {
  es: {
    minimal: "Las secciones no mencionadas se describen brevemente como normales. Ej: 'Hígado: Sin alteraciones.'",
    standard: "Las secciones no mencionadas se describen con una frase profesional de normalidad. Ej: 'Hígado: De tamaño, morfología e intensidad de señal normales.'",
    explicit: "Las secciones no mencionadas se describen exhaustivamente con todos los parámetros normales relevantes.",
  },
  en: {
    minimal: "Unmentioned sections are described briefly as normal. E.g.: 'Liver: Unremarkable.'",
    standard: "Unmentioned sections are described with a professional sentence reflecting a normal evaluation. E.g.: 'Liver: Normal in size, morphology and signal intensity.'",
    explicit: "Unmentioned sections are described exhaustively with all relevant normal parameters for that anatomical structure and modality.",
  },
  pt: {
    minimal: "As secções não mencionadas descrevem-se brevemente como normais. Ex: 'Fígado: Sem alterações.'",
    standard: "As secções não mencionadas descrevem-se com uma frase profissional de normalidade. Ex: 'Fígado: De tamanho, morfologia e intensidade de sinal normais.'",
    explicit: "As secções não mencionadas descrevem-se exaustivamente com todos os parâmetros normais relevantes.",
  },
  fr: {
    minimal: "Les sections non mentionnées sont décrites brièvement comme normales. Ex : 'Foie : Sans anomalie.'",
    standard: "Les sections non mentionnées sont décrites avec une phrase professionnelle de normalité. Ex : 'Foie : De taille, morphologie et signal normaux.'",
    explicit: "Les sections non mentionnées sont décrites exhaustivement avec tous les paramètres normaux pertinents.",
  },
  de: {
    minimal: "Nicht erwähnte Abschnitte werden kurz als normal beschrieben. Z.B.: 'Leber: Unauffällig.'",
    standard: "Nicht erwähnte Abschnitte werden mit einem professionellen Normalbefund beschrieben. Z.B.: 'Leber: Größe, Morphologie und Signalintensität normal.'",
    explicit: "Nicht erwähnte Abschnitte werden ausführlich mit allen relevanten Normalparametern beschrieben.",
  },
  it: {
    minimal: "Le sezioni non menzionate sono descritte brevemente come normali. Es: 'Fegato: Nella norma.'",
    standard: "Le sezioni non menzionate sono descritte con una frase professionale di normalità. Es: 'Fegato: Di dimensioni, morfologia e intensità di segnale normali.'",
    explicit: "Le sezioni non menzionate sono descritte esaustivamente con tutti i parametri normali rilevanti.",
  },
};

const PARAPHRASE_INSTRUCTIONS: Record<OutputLanguage, Record<ParaphraseLevel, string>> = {
  es: {
    none: "Transcribe los hallazgos dictados de forma literal. No cambies ninguna palabra. Solo ubícalos en la sección correcta.",
    light: "Puedes corregir gramática y orden sintáctico. No cambies ningún dato clínico, medida ni descriptor.",
    free: "Puedes reescribir los hallazgos con estilo radiológico profesional. Mantén todos los datos clínicos intactos.",
  },
  en: {
    none: "Transcribe dictated findings literally. Do not change any words. Only place them in the correct section.",
    light: "You may correct grammar and syntax. Do not change any clinical data, measurements or descriptors.",
    free: "You may rewrite findings in professional radiological style. Keep all clinical data intact.",
  },
  pt: {
    none: "Transcreva os achados ditados de forma literal. Não mude nenhuma palavra. Apenas coloque-os na secção correta.",
    light: "Pode corrigir gramática e ordem sintática. Não mude nenhum dado clínico, medida ou descritor.",
    free: "Pode reescrever os achados com estilo radiológico profissional. Mantenha todos os dados clínicos intactos.",
  },
  fr: {
    none: "Transcrivez les résultats dictés littéralement. Ne changez aucun mot. Placez-les uniquement dans la bonne section.",
    light: "Vous pouvez corriger la grammaire et la syntaxe. Ne changez aucune donnée clinique, mesure ou descripteur.",
    free: "Vous pouvez réécrire les résultats dans un style radiologique professionnel. Gardez toutes les données cliniques intactes.",
  },
  de: {
    none: "Übertrage die diktierten Befunde wörtlich. Ändere keine Wörter. Ordne sie nur dem richtigen Abschnitt zu.",
    light: "Du kannst Grammatik und Syntax korrigieren. Ändere keine klinischen Daten, Maße oder Deskriptoren.",
    free: "Du kannst die Befunde in professionellem radiologischem Stil umschreiben. Behalte alle klinischen Daten bei.",
  },
  it: {
    none: "Trascrivi i reperti dettati letteralmente. Non cambiare nessuna parola. Collocali solo nella sezione corretta.",
    light: "Puoi correggere grammatica e sintassi. Non cambiare nessun dato clinico, misura o descrittore.",
    free: "Puoi riscrivere i reperti con stile radiologico professionale. Mantieni tutti i dati clinici intatti.",
  },
};

const LANGUAGE_LABEL: Record<OutputLanguage, string> = {
  es: "español",
  en: "English",
  pt: "português",
  fr: "français",
  de: "Deutsch",
  it: "italiano",
};

/* ── System prompt templates per language ───────────────────── */

function findingsSystemPrompt(lang: OutputLanguage, modality: string): string {
  const l = LANGUAGE_LABEL[lang];
  if (lang === "es") {
    return `Eres un radiólogo experto redactando informes estructurados. Tu tarea es tomar el dictado del radiólogo y distribuirlo en las secciones anatómicas del template proporcionado.

IDIOMA DE SALIDA: ${l}. TODO el informe debe estar en ${l}.

MODALIDAD DEL ESTUDIO: ${modality}

PRINCIPIO FUNDAMENTAL — SECCIONES NO MENCIONADAS:
El radiólogo solo dicta lo anormal o lo que quiere destacar. Si el radiólogo NO menciona una sección del template, significa que la evaluó y es NORMAL. NUNCA escribas "no se describe", "no se explora", "no evaluado", "no mencionado" ni variantes. En su lugar, describe normalidad radiológica apropiada para ese órgano/estructura y esta modalidad.

REGLAS OBLIGATORIAS:
1. Distribuye cada hallazgo dictado en la sección anatómica correcta del template.
2. Las secciones no mencionadas se rellenan SIEMPRE con descripciones de normalidad radiológica profesional.
3. NO inventes hallazgos patológicos que el radiólogo no haya dictado.
4. NO omitas ninguna sección anatómica del template.
5. IGNORA completamente la sección "CONCLUSION"/"CONCLUSIÓN" del template — NO la incluyas.

FORMATO DE SALIDA:
- NO uses asteriscos (*), almohadillas (#) ni markdown.
- TRADUCE los nombres de las secciones del template al ${l}.
- Nombres de sección con primera letra en mayúscula, seguidos de dos puntos.
- Si el template tiene subsecciones/agrupaciones, tradúcelas y mantenlas.`;
  }

  return `You are an expert radiologist writing structured reports. Your task is to take the radiologist's dictation and distribute it into the anatomical sections of the provided template.

OUTPUT LANGUAGE: ${l}. The ENTIRE report must be written in ${l}.

STUDY MODALITY: ${modality}

FUNDAMENTAL PRINCIPLE — UNMENTIONED SECTIONS:
The radiologist only dictates abnormal or noteworthy findings. If the radiologist does NOT mention a section from the template, it means they evaluated it and it is NORMAL. NEVER write "not described", "not assessed", "not evaluated", "not mentioned" or variants. Instead, describe appropriate radiological normality for that organ/structure and this modality.

MANDATORY RULES:
1. Place each dictated finding in the correct anatomical section of the template.
2. Unmentioned sections are ALWAYS filled with professional radiological normality descriptions.
3. Do NOT invent pathological findings that the radiologist did not dictate.
4. Do NOT omit any anatomical section from the template.
5. Completely IGNORE the "CONCLUSION" section of the template — do NOT include it.

OUTPUT FORMAT:
- Do NOT use asterisks (*), hashes (#) or markdown.
- TRANSLATE section names from the template into ${l}.
- Section names with initial capital letter, followed by colon.
- If the template has subsections/groups, translate and keep them.`;
}

function modalityTerminology(modality: string, lang: OutputLanguage): string {
  const use = lang === "es" ? "Usa" : lang === "pt" ? "Use" : lang === "fr" ? "Utilisez" : lang === "de" ? "Verwende" : lang === "it" ? "Usa" : "Use";
  const forbidden = lang === "es" ? "PROHIBIDO" : lang === "pt" ? "PROIBIDO" : lang === "fr" ? "INTERDIT" : lang === "de" ? "VERBOTEN" : lang === "it" ? "VIETATO" : "FORBIDDEN";

  if (modality === "MRI") {
    return `- ${use}: "signal intensity", "hyperintense on T2", "hypointense on T1", "post-contrast enhancement", "diffusion restriction", "morphology", "size" (or equivalent in ${LANGUAGE_LABEL[lang]}).
- ${forbidden}: "echotexture", "echogenicity", "anechoic", "hypoechoic", "attenuation", "hyperdense", "hypodense". These belong to ultrasound or CT, NOT MRI.`;
  }
  if (modality === "Ultrasound") {
    return `- ${use}: "echotexture", "echogenicity", "anechoic", "hypoechoic", "hyperechoic", "Doppler flow", "posterior acoustic shadow" (or equivalent in ${LANGUAGE_LABEL[lang]}).
- ${forbidden}: "signal intensity", "hyperintense", "hypointense", "attenuation", "hyperdense". These belong to MRI or CT, NOT ultrasound.`;
  }
  if (modality === "CT") {
    return `- ${use}: "density", "attenuation", "hyperdense", "hypodense", "isodense", "post-contrast enhancement", "Hounsfield units" (or equivalent in ${LANGUAGE_LABEL[lang]}).
- ${forbidden}: "echotexture", "echogenicity", "anechoic", "signal intensity", "hyperintense". These belong to ultrasound or MRI, NOT CT.`;
  }
  if (modality === "XRay") {
    return `- ${use}: "radiopaque", "radiolucent", "density", "silhouette", "cardiothoracic ratio", "bronchovascular markings" (or equivalent in ${LANGUAGE_LABEL[lang]}).
- ${forbidden}: "echotexture", "signal intensity", "attenuation", "enhancement". These belong to other modalities.`;
  }
  return `- ${use} appropriate terminology for ${modality} in ${LANGUAGE_LABEL[lang]}. Do not mix terms from other modalities.`;
}

/* ── Exported prompt builders ──────────────────────────────── */

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
  const lang = params.outputLanguage;

  let system = findingsSystemPrompt(lang, params.modality);

  system += `\n\n${modalityTerminology(params.modality, lang)}

${LENGTH_INSTRUCTIONS[lang][params.findingsLength]}
${VERBOSITY_INSTRUCTIONS[lang][params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[lang][params.paraphraseLevel]}`;

  if (params.preferredNormalPhrases && params.preferredNormalPhrases.length > 0) {
    const block = lang === "es"
      ? `FRASES DE NORMALIDAD PREFERIDAS DEL RADIÓLOGO (aprendidas de sus correcciones previas para este tipo de estudio).
Reglas de uso:
- Si el dictado NO menciona una sección y existe una frase preferida para ella, úsala literalmente.
- Si el dictado describe un hallazgo en esa sección, IGNORA la frase preferida y redacta el hallazgo dictado.
- NUNCA introduzcas información clínica que no esté en el dictado.`
      : `RADIOLOGIST'S PREFERRED NORMALITY PHRASES (learned from their previous corrections for this study type).
Rules:
- If the dictation does NOT mention a section and a preferred phrase exists for it, use it literally.
- If the dictation describes a finding in that section, IGNORE the preferred phrase and write the dictated finding.
- NEVER introduce clinical information that is not in the dictation.`;

    system += `\n\n${block}\n`;
    params.preferredNormalPhrases.forEach((p) => {
      system += `\n- ${p.label}: ${p.phrase}`;
    });
  }

  if (params.styleSamples && params.styleSamples.length > 0) {
    const intro = lang === "es"
      ? `A continuación se muestran ${params.styleSamples.length} ejemplos de informes redactados por este radiólogo. Imita su estilo. NO copies el contenido clínico.`
      : `Below are ${params.styleSamples.length} example reports written by this radiologist. Mimic their style. Do NOT copy clinical content.`;
    system += `\n\n${intro}\n`;
    params.styleSamples.forEach((sample, i) => {
      system += `\n--- ${i + 1} ---\n${sample}\n`;
    });
  }

  const user = `Template: ${params.template}\n\nDictation: ${params.dictation}`;
  return { system, user };
}

export function buildConclusionPrompt(params: {
  findingsText: string;
  clinicalInfo: string;
  outputLanguage: OutputLanguage;
  preferredConclusionPhrases?: string[];
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto redactando conclusiones de informes radiológicos. Genera la conclusión basándote EXCLUSIVAMENTE en los hallazgos proporcionados.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.

PRINCIPIO FUNDAMENTAL — LA CONCLUSIÓN ES DESCRIPTIVA, NO INTERPRETATIVA:
La conclusión DESCRIBE los hallazgos relevantes. NUNCA especula sobre su naturaleza, etiología ni relación entre ellos. El radiólogo describe lo que VE, no lo que CREE.

PROHIBICIONES ABSOLUTAS:
- NUNCA incluyas recomendaciones. Frases como "se recomienda...", "se sugiere...", "valorar...", "completar con...", "control en...", "correlacionar con...", "derivar a..." están PROHIBIDAS.
- NUNCA incluyas descripciones de normalidad. Si un órgano es normal, NO lo menciones.
- NUNCA especules sobre la naturaleza de un hallazgo. NO escribas "probablemente inflamatorio", "posiblemente benigno", "de probable origen...", "sugiere...". Describe el hallazgo tal como aparece en los datos sin añadir interpretaciones diagnósticas.
- NUNCA establezcas relaciones causales entre hallazgos a menos que la relación sea anatómicamente obvia e indiscutible. NO escribas "probablemente relacionado con...", "en el contexto de...", "secundario a...".
- NUNCA descartes patología. NO escribas "sin evidencia de malignidad" si hay un hallazgo indeterminado (como un nódulo sin caracterizar). Solo puedes descartar patología si genuinamente no hay NINGÚN hallazgo que la sugiera.

${hasClinical ? `PREGUNTA CLÍNICA:
Se proporcionan datos clínicos del médico solicitante. El PRIMER punto de la conclusión debe responder directamente a esa pregunta basándose en los hallazgos.
- Si los hallazgos responden claramente: usa lenguaje descriptivo directo ("Hallazgos compatibles con...", "Se identifica...")
- Si no permiten responder con certeza: "No se identifican hallazgos concluyentes respecto a..."
- Si hay un hallazgo indeterminado relacionado con la pregunta: descríbelo sin especular sobre su naturaleza.` : ""}

ESTRUCTURA DE LA CONCLUSIÓN:
1. ${hasClinical ? "Punto 1: respuesta a la pregunta clínica." : "Solo hallazgos clínicamente SIGNIFICATIVOS."}
2. Cada hallazgo en un punto SEPARADO. NO agrupes hallazgos que no tengan relación anatómica directa.
3. Ordenados de MAYOR a MENOR relevancia clínica.
4. Los hallazgos de ESCASA relevancia clínica NO se incluyen.
5. Si todo es normal: "${hasClinical ? "Sin hallazgos significativos en relación con la pregunta clínica. Exploración dentro de límites normales." : "Exploración dentro de límites normales."}"

EJEMPLO CORRECTO (nódulo pulmonar + engrosamiento septal + derrame):
1. Nódulo pulmonar de 12 mm en lóbulo inferior izquierdo.
2. Engrosamiento septal interlobulillar difuso con tenues opacidades en vidrio deslustrado bilaterales.
3. Pequeño derrame pleural izquierdo.

EJEMPLO INCORRECTO:
1. No evidence of malignancy. ← MAL: hay un nódulo sin caracterizar, no puedes descartar malignidad.
2. A 12 mm lung nodule, possibly inflammatory, with associated septal thickening. ← MAL: especula sobre la naturaleza y agrupa hallazgos sin relación.
3. Pleural effusion, likely related to the above. ← MAL: establece relación causal especulativa.

LÍMITE ESTRICTO: MÁXIMO 4 PUNTOS. Si hay más hallazgos relevantes, descarta los menos importantes.

FORMATO:
- Puntos numerados (1. 2. 3. 4.). Texto plano.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`;
  } else {
    system = `You are an expert radiologist writing radiology report conclusions. Generate the conclusion based EXCLUSIVELY on the provided findings.

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be written in ${l}.

FUNDAMENTAL PRINCIPLE — THE CONCLUSION IS DESCRIPTIVE, NOT INTERPRETIVE:
The conclusion DESCRIBES relevant findings. It NEVER speculates about their nature, etiology or relationship to each other. The radiologist describes what they SEE, not what they THINK.

ABSOLUTE PROHIBITIONS:
- NEVER include recommendations. Phrases like "recommend...", "suggest...", "consider...", "follow-up...", "correlate with..." are FORBIDDEN.
- NEVER include normality descriptions. If an organ is normal, do NOT mention it.
- NEVER speculate about the nature of a finding. Do NOT write "possibly inflammatory", "likely benign", "probably related to...", "suggestive of...". Describe the finding as it appears in the data without adding diagnostic interpretations.
- NEVER establish causal relationships between findings unless the relationship is anatomically obvious and indisputable. Do NOT write "likely related to...", "in the context of...", "secondary to...".
- NEVER rule out pathology. Do NOT write "no evidence of malignancy" if there is an indeterminate finding (e.g. an uncharacterized nodule). You may only rule out pathology if there genuinely is NO finding that suggests it.

${hasClinical ? `CLINICAL QUESTION:
Clinical data from the referring physician is provided. The FIRST point of the conclusion must directly answer that clinical question based on the findings.
- If findings clearly answer: use direct descriptive language ("Findings consistent with...", "Identified...")
- If inconclusive: "No conclusive findings regarding..."
- If there is an indeterminate finding related to the question: describe it without speculating about its nature.` : ""}

CONCLUSION STRUCTURE:
1. ${hasClinical ? "Point 1: answer to the clinical question." : "Only clinically SIGNIFICANT findings."}
2. Each finding in a SEPARATE point. Do NOT group findings that are not directly anatomically related.
3. Ordered from MOST to LEAST clinically relevant.
4. Findings of LOW clinical relevance are NOT included.
5. If everything is normal: write the equivalent of "Examination within normal limits" in ${l}.

CORRECT EXAMPLE (lung nodule + septal thickening + effusion):
1. 12 mm pulmonary nodule in the left lower lobe.
2. Diffuse interlobular septal thickening with faint bilateral ground-glass opacities.
3. Small left pleural effusion.

INCORRECT EXAMPLE:
1. No evidence of malignancy. ← WRONG: there is an uncharacterized nodule, you cannot rule out malignancy.
2. A 12 mm lung nodule, possibly inflammatory, with associated septal thickening. ← WRONG: speculates about nature and groups unrelated findings.
3. Pleural effusion, likely related to the above. ← WRONG: speculative causal relationship.

STRICT LIMIT: MAXIMUM 4 POINTS. If there are more relevant findings, discard the least important ones.

FORMAT:
- Numbered points (1. 2. 3. 4.). Plain text.
- Do NOT use asterisks, hashes or markdown.
- Do NOT include the heading "CONCLUSION".`;
  }

  if (params.preferredConclusionPhrases && params.preferredConclusionPhrases.length > 0) {
    const block = lang === "es"
      ? `EJEMPLOS DE CONCLUSIONES PREVIAS DEL RADIÓLOGO (aprendidas de sus informes corregidos).
Reglas:
- Observa la ESTRUCTURA (puntos numerados o párrafo único), el TONO y las FRASES recurrentes.
- Imita el estilo, NO copies contenido clínico de los ejemplos.`
      : `PREVIOUS CONCLUSION EXAMPLES FROM THIS RADIOLOGIST (learned from their corrected reports).
Rules:
- Observe the STRUCTURE (numbered points or single paragraph), TONE and recurring PHRASES.
- Mimic the style, do NOT copy clinical content from the examples.`;

    system += `\n\n${block}\n`;
    params.preferredConclusionPhrases.forEach((p, i) => {
      system += `\n--- ${i + 1} ---\n${p}`;
    });
  }

  let userMsg = "";
  if (hasClinical) {
    const label = lang === "es" ? "Datos clínicos / pregunta clínica" : "Clinical data / clinical question";
    userMsg += `${label}:\n${params.clinicalInfo}\n\n`;
  }
  const findingsLabel = lang === "es" ? "Hallazgos" : "Findings";
  userMsg += `${findingsLabel}:\n${params.findingsText}`;

  return { system, user: userMsg };
}

export function buildRecommendationsPrompt(params: {
  findingsText: string;
  recommendations: { trigger: string; recommendation: string; guideline: string }[];
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto emitiendo recomendaciones de seguimiento basadas en guías clínicas.

Tu tarea es revisar los hallazgos del informe y determinar si alguno activa una recomendación del catálogo aprobado.

REGLAS:
1. SOLO emite recomendaciones del catálogo proporcionado. NO inventes recomendaciones.
2. La REDACCIÓN FINAL debe estar en ${l}.
3. NUNCA apliques la recomendación de un órgano a otro.
4. NUNCA sugieras procedimientos invasivos a menos que el catálogo lo diga.
5. Si ningún hallazgo coincide: "No se emiten recomendaciones adicionales."
6. SIEMPRE cita la guía entre paréntesis.
7. Indica el hallazgo que activó la recomendación.

FORMATO:
- NO uses asteriscos, almohadillas ni markdown. Texto plano.
- NO incluyas el encabezado "RECOMENDACIONES".
- Estructura: [número]. [recomendación] ([guía]) — Hallazgo: [hallazgo].`;
  } else {
    system = `You are an expert radiologist issuing follow-up recommendations based on clinical guidelines.

Your task is to review the report findings and determine if any triggers a recommendation from the approved catalogue.

OUTPUT LANGUAGE: ${l}. All output must be in ${l}.

RULES:
1. ONLY issue recommendations from the provided catalogue. Do NOT invent recommendations.
2. The FINAL wording must be in ${l}.
3. NEVER apply a recommendation from one organ to another.
4. NEVER suggest invasive procedures unless the catalogue explicitly says so.
5. If no finding matches: write "No additional recommendations" (in ${l}).
6. ALWAYS cite the guideline in parentheses.
7. Indicate the finding that triggered the recommendation.

FORMAT:
- Do NOT use asterisks, hashes or markdown. Plain text only.
- Do NOT include the heading "RECOMMENDATIONS".
- Structure: [number]. [recommendation] ([guideline]) — Finding: [finding].`;
  }

  const recsJson = JSON.stringify(params.recommendations);
  const catLabel = lang === "es" ? "Catálogo de recomendaciones aprobadas" : "Approved recommendations catalogue";
  const findLabel = lang === "es" ? "Hallazgos del informe" : "Report findings";
  const user = `${catLabel}:\n${recsJson}\n\n${findLabel}:\n${params.findingsText}`;
  return { system, user };
}

export function buildPdfExtractionPrompt(): { system: string } {
  return {
    system: `Extract (finding → recommendation) pairs from clinical guideline text.

Rules:
1. Only follow-up recommendations or non-invasive studies.
2. Ignore invasive procedures.
3. Triggers should be specific and recognizable.
4. Respond ONLY in valid JSON:
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
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];

  let preview = `SYSTEM PROMPT (Agent 1 — Findings):
---
Expert radiologist writing structured reports in ${l}...

${LENGTH_INSTRUCTIONS[lang][params.findingsLength]}
${VERBOSITY_INSTRUCTIONS[lang][params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[lang][params.paraphraseLevel]}`;

  if (params.styleSamplesCount > 0) {
    preview += `\n\n[${params.styleSamplesCount} few-shot style examples will be injected]`;
  }

  preview += `\n\nTemplate: ${params.template}\nDictation: [radiologist's dictation text]`;
  return preview;
}
