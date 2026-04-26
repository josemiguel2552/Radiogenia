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

const COMPACT_NORMALS_INSTRUCTION: Record<string, string> = {
  es: `FORMATO COMPACTO DE NORMALIDAD:
Se ha solicitado un informe compacto. Debes reorganizar la salida así:
1. PRIMERO: escribe SOLO las secciones que tienen hallazgos mencionados por el radiólogo (positivos o negativos dictados), cada una en su formato estructurado habitual ("Sección: Descripción.").
2. DESPUÉS: al final, escribe un ÚNICO párrafo corrido (sin etiquetas de sección, sin viñetas, sin saltos de línea internos) que agrupe TODAS las secciones normales no mencionadas. Este párrafo debe decir algo como: "El resto de las estructuras evaluadas (nombrar las secciones) no muestran alteraciones significativas." o una variante natural y profesional. NO listes cada sección individualmente — redacta un texto fluido que las englobe.
El párrafo final de normalidad debe ser breve y natural. No repitas "es normal" para cada órgano.`,

  en: `COMPACT NORMALITY FORMAT:
A compact report has been requested. Reorganize the output as follows:
1. FIRST: write ONLY the sections that have findings mentioned by the radiologist (positive or dictated negative findings), each in the usual structured format ("Section: Description.").
2. THEN: at the end, write a SINGLE running paragraph (no section labels, no bullets, no internal line breaks) grouping ALL the normal unmentioned sections. This paragraph should say something like: "The remaining evaluated structures (name the sections) show no significant abnormalities." or a natural, professional variation. Do NOT list each section individually — write a flowing text that encompasses them all.
The final normality paragraph should be brief and natural. Do not repeat "is normal" for each organ.`,
};

/* ── System prompt templates per language ───────────────────── */

function findingsSystemPrompt(lang: OutputLanguage, modality: string): string {
  const l = LANGUAGE_LABEL[lang];
  if (lang === "es") {
    return `Eres un radiólogo experto redactando informes estructurados. Tu tarea es tomar el dictado del radiólogo y distribuirlo en las secciones anatómicas del template proporcionado.

IDIOMA DE SALIDA: ${l}. TODO el informe debe estar en ${l}.
IMPORTANTE: El dictado puede estar en CUALQUIER idioma. Independientemente del idioma de entrada, tu salida COMPLETA debe estar en ${l}. Traduce todo el contenido al ${l}.

MODALIDAD DEL ESTUDIO: ${modality}

PRINCIPIO FUNDAMENTAL — SECCIONES NO MENCIONADAS:
El radiólogo solo dicta lo anormal o lo que quiere destacar. Si el radiólogo NO menciona una sección del template, significa que la evaluó y es NORMAL. En su lugar, describe normalidad radiológica apropiada para ese órgano/estructura y esta modalidad.

FRASES ABSOLUTAMENTE PROHIBIDAS (nunca las escribas en ninguna sección, bajo ninguna circunstancia):
"no valorado", "no evaluado", "no analizado", "no descrito", "no mencionado", "no explorado", "no se describe", "no se explora", "no se valora", "no se analiza", "sin valorar", "sin evaluar", "sin describir", "not assessed", "not evaluated", "not analyzed", "not described", "not mentioned", "not reported".
Si una sección no se menciona en el dictado, SIEMPRE escribe una descripción de normalidad. JAMÁS indiques que no fue valorada.

HALLAZGOS NEGATIVOS DICTADOS:
Cuando el radiólogo dicta explícitamente la AUSENCIA de un hallazgo (ej: "no masa colónica", "sin evidencia de TEP", "no disección aórtica", "no se identifica litiasis"), esto es un hallazgo negativo relevante y DEBE incluirse en la sección anatómica correspondiente. No lo omitas ni lo sustituyas por una frase genérica de normalidad. Reproduce fielmente la negación dictada.

REGLAS OBLIGATORIAS:
1. La salida debe contener EXACTAMENTE las mismas secciones que el template, en el MISMO ORDEN. No cambies el orden. No omitas ninguna.
2. Distribuye cada hallazgo dictado en la sección anatómica correcta del template. Esto incluye tanto hallazgos positivos como hallazgos negativos dictados por el radiólogo.
3. Las secciones no mencionadas en el dictado se rellenan SIEMPRE con descripciones de normalidad radiológica profesional.
4. NO inventes hallazgos patológicos que el radiólogo no haya dictado.
5. IGNORA completamente la sección "CONCLUSION"/"CONCLUSIÓN" del template — NO la incluyas en tu respuesta.
6. Si un hallazgo dictado NO encaja en NINGUNA sección del template, añade una sección final llamada "Otros hallazgos" al final del informe con TODOS los hallazgos huérfanos agrupados. NUNCA omitas un hallazgo dictado por falta de sección adecuada.

FORMATO DE SALIDA — ESTRICTO, SIN EXCEPCIONES:
- Cada sección es exactamente UNA línea con el formato: "Sección anatómica: Descripción."
- Primera letra de la sección en MAYÚSCULA, el resto en minúsculas. Dos puntos. Un espacio. Descripción. Punto final.
- Una línea por sección. Sin líneas en blanco entre secciones. Sin saltos de línea dentro de una sección.
- NO uses asteriscos (*), almohadillas (#), guiones (-), viñetas, negritas ni ningún formato markdown.
- NO numeres las secciones.
- NO añadas encabezados como "HALLAZGOS", "FINDINGS" ni agrupaciones. Solo la lista plana de secciones.
- TRADUCE los nombres de las secciones del template al ${l}.

Ejemplo — si el template tiene las secciones Liver, Gallbladder, Bile ducts, Pancreas (en ese orden) y el dictado menciona nódulos tiroideos, la salida debe ser EXACTAMENTE:
Hígado: De tamaño y morfología normales.
Vesícula biliar: De paredes finas, sin litiasis.
Vía biliar: De calibre normal.
Páncreas: De tamaño y morfología normales.
Otros hallazgos: Se identifican nódulos tiroideos bilaterales de aspecto inespecífico.`;
  }

  return `You are an expert radiologist writing structured reports. Your task is to take the radiologist's dictation and distribute it into the anatomical sections of the provided template.

OUTPUT LANGUAGE: ${l}. The ENTIRE report must be written in ${l}.
IMPORTANT: The dictation may be in ANY language. Regardless of the input language, your ENTIRE output MUST be in ${l}. Translate all content to ${l}.

STUDY MODALITY: ${modality}

FUNDAMENTAL PRINCIPLE — UNMENTIONED SECTIONS:
The radiologist only dictates abnormal or noteworthy findings. If the radiologist does NOT mention a section from the template, it means they evaluated it and it is NORMAL. Instead, describe appropriate radiological normality for that organ/structure and this modality.

ABSOLUTELY FORBIDDEN PHRASES (never write any of these in any section, under any circumstance):
"not assessed", "not evaluated", "not analyzed", "not described", "not mentioned", "not reported", "not commented on", "not included", "not explored", "not examined", "not visualized for assessment", "no se describe", "no se valora", "no valorado".
If a section is not mentioned in the dictation, ALWAYS write a normality description. NEVER indicate that it was not assessed.

DICTATED NEGATIVE FINDINGS:
When the radiologist explicitly dictates the ABSENCE of a finding (e.g. "no colonic mass", "no CT evidence of acute pulmonary embolism", "no aortic dissection", "no lithiasis identified"), this is a relevant negative finding and MUST be included in the corresponding anatomical section. Do not omit it or replace it with a generic normality phrase. Faithfully reproduce the dictated negation.

MANDATORY RULES:
1. The output must contain EXACTLY the same sections as the template, in the SAME ORDER. Do not reorder. Do not omit any.
2. Place each dictated finding in the correct anatomical section of the template. This includes both positive findings AND negative findings explicitly dictated by the radiologist.
3. Unmentioned sections are ALWAYS filled with professional radiological normality descriptions.
4. Do NOT invent pathological findings that the radiologist did not dictate.
5. Completely IGNORE the "CONCLUSION" section of the template — do NOT include it.
6. If a dictated finding does NOT fit ANY template section, add a final section called "Additional findings" at the end of the report with ALL orphan findings grouped together. NEVER omit a dictated finding due to lack of a matching section.

OUTPUT FORMAT — STRICT, NO EXCEPTIONS:
- Each section is exactly ONE line with the format: "Anatomical section: Description."
- First letter of section name in UPPERCASE, rest in lowercase. Colon. One space. Description. Period.
- One line per section. No blank lines between sections. No line breaks within a section.
- Do NOT use asterisks (*), hashes (#), dashes (-), bullets, bold or any markdown formatting.
- Do NOT number the sections.
- Do NOT add headings like "FINDINGS" or groupings. Only the flat list of sections.
- TRANSLATE section names from the template into ${l}.

Example — if the template has sections Liver, Gallbladder, Bile ducts, Pancreas (in that order) and the dictation mentions thyroid nodules, the output must be EXACTLY:
Liver: Normal in size and morphology.
Gallbladder: Thin-walled, no lithiasis.
Bile ducts: Normal caliber.
Pancreas: Normal in size and morphology.
Additional findings: Bilateral thyroid nodules of nonspecific appearance are identified.`;
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
  compactNormals?: boolean;
  styleSamples?: string[];
  preferredNormalPhrases?: PreferredNormalPhrase[];
}): { system: string; user: string } {
  const lang = params.outputLanguage;

  let system = findingsSystemPrompt(lang, params.modality);

  system += `\n\n${modalityTerminology(params.modality, lang)}

${LENGTH_INSTRUCTIONS[lang][params.findingsLength]}
${params.compactNormals ? (COMPACT_NORMALS_INSTRUCTION[lang] || COMPACT_NORMALS_INSTRUCTION.en) : VERBOSITY_INSTRUCTIONS[lang][params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[lang][params.paraphraseLevel]}`;

  if (params.preferredNormalPhrases && params.preferredNormalPhrases.length > 0) {
    const block = lang === "es"
      ? `FRASES DE NORMALIDAD PREFERIDAS DEL RADIÓLOGO para cada sección anatómica.
Reglas de uso:
- Si el dictado NO menciona una sección y existe una frase preferida para ella, úsala LITERALMENTE tal como aparece.
- Si el dictado describe un hallazgo en esa sección, IGNORA la frase preferida y redacta el hallazgo dictado.
- NUNCA introduzcas información clínica que no esté en el dictado.
- Estas frases definen exactamente cómo el radiólogo quiere que se expresen las secciones normales.`
      : `RADIOLOGIST'S PREFERRED NORMALITY PHRASES for each anatomical section.
Rules:
- If the dictation does NOT mention a section and a preferred phrase exists for it, use it LITERALLY as written.
- If the dictation describes a finding in that section, IGNORE the preferred phrase and write the dictated finding.
- NEVER introduce clinical information that is not in the dictation.
- These phrases define exactly how the radiologist wants normal sections to be worded.`;

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

  const langReminder = lang !== "es"
    ? `\n\nREMINDER: Write your ENTIRE output in ${LANGUAGE_LABEL[lang]}, not in the dictation language.`
    : "";
  const user = `Template: ${params.template}\n\nDictation: ${params.dictation}${langReminder}`;
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
IMPORTANTE: Los hallazgos pueden estar en CUALQUIER idioma. Independientemente del idioma de entrada, tu salida COMPLETA debe estar en ${l}. Traduce todo el contenido al ${l}.

PRINCIPIO FUNDAMENTAL — LA CONCLUSIÓN ES DESCRIPTIVA, NO INTERPRETATIVA:
La conclusión DESCRIBE los hallazgos relevantes. NUNCA especula sobre su naturaleza, etiología ni relación entre ellos. El radiólogo describe lo que VE, no lo que CREE.

RESTRICCIÓN REGULATORIA — CRÍTICA:
Este software NO es un producto sanitario clasificado (no IIA ni IIB). La conclusión SOLO puede DESCRIBIR hallazgos de imagen. Está PROHIBIDO:
- Sugerir diagnósticos específicos ("compatible con neoplasia", "hallazgos sugestivos de linfoma", "en relación con proceso infeccioso").
- Recomendar acciones clínicas ("se recomienda biopsia", "completar con RM", "control en 3 meses", "valorar tratamiento", "derivar a especialista").
- Clasificar hallazgos según sistemas de estadificación o escalas (BI-RADS, Lung-RADS, PI-RADS, TNM, etc.).
- Emitir pronósticos o valoraciones de gravedad ("hallazgo preocupante", "proceso agresivo", "buen pronóstico").
Usa SOLO lenguaje descriptivo morfológico: tamaño, forma, localización, densidad/señal, relación con estructuras adyacentes, cambios respecto a estudios previos.

PROHIBICIONES ABSOLUTAS:
- NUNCA incluyas recomendaciones. Frases como "se recomienda...", "se sugiere...", "valorar...", "completar con...", "control en...", "correlacionar con...", "derivar a..." están PROHIBIDAS.
- NUNCA sugieras un diagnóstico específico. NO escribas "compatible con neumonía", "sugestivo de neoplasia", "en relación con cirrosis". Describe los hallazgos morfológicos sin etiquetarlos con un diagnóstico.
- NUNCA incluyas descripciones genéricas de normalidad. Si un órgano es normal y el radiólogo no lo destacó, NO lo menciones.
- NUNCA especules sobre la naturaleza de un hallazgo. NO escribas "probablemente inflamatorio", "posiblemente benigno", "de probable origen...", "sugiere...". Describe el hallazgo tal como aparece en los datos sin añadir interpretaciones diagnósticas.
- NUNCA establezcas relaciones causales entre hallazgos a menos que la relación sea anatómicamente obvia e indiscutible. NO escribas "probablemente relacionado con...", "en el contexto de...", "secundario a...".
- NUNCA descartes patología. NO escribas "sin evidencia de malignidad" si hay un hallazgo indeterminado (como un nódulo sin caracterizar). Solo puedes descartar patología si genuinamente no hay NINGÚN hallazgo que la sugiera.

HALLAZGOS NEGATIVOS CON RELEVANCIA CLÍNICA:
Si en los hallazgos aparece un hallazgo negativo que el radiólogo dictó explícitamente (ej: "sin evidencia de TEP", "no masa colónica", "no disección aórtica"), inclúyelo en la conclusión SOLO si:
- Responde directamente a la pregunta clínica, O
- Tiene alta relevancia clínica por el contexto del estudio.
Ejemplo: si la pregunta clínica es "descartar TEP" y los hallazgos dicen "sin evidencia de TEP agudo", la conclusión DEBE incluir "Sin evidencia de tromboembolismo pulmonar agudo."

${hasClinical ? `PREGUNTA CLÍNICA:
Se proporcionan datos clínicos del médico solicitante. El PRIMER punto de la conclusión debe responder directamente a esa pregunta basándose en los hallazgos.
- Si los hallazgos responden claramente: usa lenguaje descriptivo morfológico directo ("Se identifica...", "Se observa...")
- Si no permiten responder con certeza: "No se identifican hallazgos significativos respecto a..."
- Si hay un hallazgo indeterminado relacionado con la pregunta: descríbelo morfológicamente sin especular sobre su naturaleza ni sugerir un diagnóstico.` : ""}

ESTRUCTURA DE LA CONCLUSIÓN:
1. ${hasClinical ? "Punto 1: respuesta a la pregunta clínica." : "Solo hallazgos clínicamente SIGNIFICATIVOS."}
2. Cada punto representa un PROBLEMA CLÍNICO COMPLETO, NO un hallazgo individual. AGRUPA hallazgos de DISTINTAS secciones anatómicas que formen parte del mismo cuadro clínico.
3. Hallazgos sin relación fisiopatológica razonable van en puntos SEPARADOS.
4. Ordenados de MAYOR a MENOR relevancia clínica.
5. Los hallazgos de ESCASA relevancia clínica NO se incluyen.
6. Si todo es normal: "${hasClinical ? "Sin hallazgos significativos en relación con la pregunta clínica. Exploración dentro de límites normales." : "Exploración dentro de límites normales."}"

AGRUPACIÓN INTELIGENTE — REGLA CLAVE:
Los hallazgos del informe están organizados por secciones anatómicas (pulmones, corazón, mediastino, etc.), pero un mismo problema clínico puede afectar MÚLTIPLES secciones. Tu trabajo es REAGRUPAR esos hallazgos dispersos en puntos clínicamente coherentes. Cada punto debe dar al clínico una imagen completa del problema, no fragmentos sueltos.

Patrones frecuentes que DEBES agrupar en un solo punto:
- Tromboembolismo pulmonar: defectos de llenado en arterias pulmonares + infartos pulmonares + sobrecarga de cavidades derechas + reflujo a venas suprahepáticas
- Proceso tumoral: masa/lesión + adenopatías regionales + derrame + posibles implantes/metástasis
- Politraumatismo torácico: fracturas costales + neumotórax + contusión pulmonar + derrame pleural + desviación mediastínica
- Insuficiencia cardíaca: cardiomegalia + derrame pleural bilateral + edema/redistribución vascular pulmonar
- Patología infecciosa: consolidación + broncograma aéreo + derrame paraneumónico + adenopatías reactivas

COMPARACIÓN CON ESTUDIOS PREVIOS:
Si los hallazgos mencionan comparaciones con estudios previos ("aumento de tamaño", "estable", "nueva lesión", "disminución"), inclúyelas en la conclusión — son CRÍTICAS para la toma de decisiones. Intégralas junto al hallazgo correspondiente, no como frase suelta.

EJEMPLO CORRECTO (TEP con infartos y repercusión cardíaca):
1. Defectos de repleción en arterias pulmonares lobares y segmentarias bilaterales, con áreas de infarto pulmonar en lóbulo inferior derecho y signos de sobrecarga de cavidades derechas con reflujo de contraste a venas suprahepáticas.

EJEMPLO CORRECTO (progresión tumoral):
1. Masa pulmonar en lóbulo superior derecho de 35 mm, aumentada respecto al estudio previo (22 mm), con adenopatías mediastínicas patológicas y nuevo derrame pleural ipsilateral.
2. Signos de diverticulitis aguda en sigma con adenopatías mesentéricas reactivas adyacentes.

EJEMPLO INCORRECTO:
1. Defectos de repleción en arterias pulmonares. ← MAL: separó del resto del cuadro.
2. Áreas de infarto pulmonar en LID. ← MAL: está relacionado con el punto anterior.
3. Dilatación de cavidades derechas. ← MAL: forma parte del mismo cuadro.
4. Masa pulmonar de 35 mm, probablemente neoplásica. Se recomienda biopsia. ← MAL: sugiere diagnóstico y recomienda acción.
5. Adenopatías mediastínicas. ← MAL: separó un hallazgo relacionado con la masa.

LÍMITE ESTRICTO: MÁXIMO 4 PUNTOS. Si hay más hallazgos relevantes, descarta los menos importantes.

FORMATO:
- Puntos numerados (1. 2. 3. 4.). Texto plano.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`;
  } else {
    system = `You are an expert radiologist writing radiology report conclusions. Generate the conclusion based EXCLUSIVELY on the provided findings.

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be written in ${l}.
IMPORTANT: The findings may be in ANY language. Regardless of the input language, your ENTIRE output MUST be in ${l}. Translate all content to ${l}.

FUNDAMENTAL PRINCIPLE — THE CONCLUSION IS DESCRIPTIVE, NOT INTERPRETIVE:
The conclusion DESCRIBES relevant findings. It NEVER speculates about their nature, etiology or relationship to each other. The radiologist describes what they SEE, not what they THINK.

REGULATORY RESTRICTION — CRITICAL:
This software is NOT a classified medical device (not IIA or IIB). The conclusion may ONLY DESCRIBE imaging findings. The following are FORBIDDEN:
- Suggesting specific diagnoses ("consistent with neoplasm", "findings suggestive of lymphoma", "related to infectious process").
- Recommending clinical actions ("biopsy recommended", "further evaluation with MRI", "follow-up in 3 months", "consider treatment", "refer to specialist").
- Classifying findings according to staging systems or scales (BI-RADS, Lung-RADS, PI-RADS, TNM, etc.).
- Issuing prognoses or severity assessments ("concerning finding", "aggressive process", "good prognosis").
Use ONLY descriptive morphological language: size, shape, location, density/signal, relationship to adjacent structures, changes compared to prior studies.

ABSOLUTE PROHIBITIONS:
- NEVER include recommendations. Phrases like "recommend...", "suggest...", "consider...", "follow-up...", "correlate with..." are FORBIDDEN.
- NEVER suggest a specific diagnosis. Do NOT write "consistent with pneumonia", "suggestive of neoplasm", "related to cirrhosis". Describe the morphological findings without labeling them with a diagnosis.
- NEVER include generic normality descriptions. If an organ is normal and the radiologist did not highlight it, do NOT mention it.
- NEVER speculate about the nature of a finding. Do NOT write "possibly inflammatory", "likely benign", "probably related to...", "suggestive of...". Describe the finding as it appears in the data without adding diagnostic interpretations.
- NEVER establish causal relationships between findings unless the relationship is anatomically obvious and indisputable. Do NOT write "likely related to...", "in the context of...", "secondary to...".
- NEVER rule out pathology. Do NOT write "no evidence of malignancy" if there is an indeterminate finding (e.g. an uncharacterized nodule). You may only rule out pathology if there genuinely is NO finding that suggests it.

CLINICALLY RELEVANT NEGATIVE FINDINGS:
If the findings include a negative finding that the radiologist explicitly dictated (e.g. "no CT evidence of acute pulmonary embolism", "no colonic mass", "no aortic dissection"), include it in the conclusion ONLY if:
- It directly answers the clinical question, OR
- It has high clinical relevance given the study context.
Example: if the clinical question is "rule out PE" and the findings state "no CT evidence of acute pulmonary embolism", the conclusion MUST include "No CT evidence of acute pulmonary embolism."

${hasClinical ? `CLINICAL QUESTION:
Clinical data from the referring physician is provided. The FIRST point of the conclusion must directly answer that clinical question based on the findings.
- If findings clearly answer: use direct morphological descriptive language ("Identified...", "Observed...")
- If inconclusive: "No significant findings regarding..."
- If there is an indeterminate finding related to the question: describe it morphologically without speculating about its nature or suggesting a diagnosis.` : ""}

CONCLUSION STRUCTURE:
1. ${hasClinical ? "Point 1: answer to the clinical question." : "Only clinically SIGNIFICANT findings."}
2. Each point represents a COMPLETE CLINICAL PROBLEM, NOT an individual finding. GROUP findings from DIFFERENT anatomical sections that form part of the same clinical picture.
3. Findings with NO reasonable pathophysiological relationship go in SEPARATE points.
4. Ordered from MOST to LEAST clinically relevant.
5. Findings of LOW clinical relevance are NOT included.
6. If everything is normal: write the equivalent of "Examination within normal limits" in ${l}.

INTELLIGENT GROUPING — KEY RULE:
Findings in the report are organized by anatomical sections (lungs, heart, mediastinum, etc.), but a single clinical problem can affect MULTIPLE sections. Your job is to REGROUP those scattered findings into clinically coherent points. Each point should give the clinician a complete picture of the problem, not isolated fragments.

Common patterns that MUST be grouped into a single point:
- Pulmonary embolism: filling defects in pulmonary arteries + pulmonary infarcts + right heart strain + contrast reflux into hepatic veins
- Tumor process: mass/lesion + regional lymphadenopathy + effusion + possible implants/metastases
- Thoracic polytrauma: rib fractures + pneumothorax + pulmonary contusion + pleural effusion + mediastinal shift
- Heart failure: cardiomegaly + bilateral pleural effusions + pulmonary edema/vascular redistribution
- Infectious pathology: consolidation + air bronchograms + parapneumonic effusion + reactive lymphadenopathy

COMPARISON WITH PRIOR STUDIES:
If findings mention comparisons with prior studies ("increased in size", "stable", "new lesion", "decreased"), include them in the conclusion — they are CRITICAL for clinical decision-making. Integrate them alongside the corresponding finding, not as a standalone phrase.

CORRECT EXAMPLE (PE with infarcts and cardiac repercussion):
1. Filling defects in bilateral lobar and segmental pulmonary arteries, with areas of pulmonary infarction in the right lower lobe and signs of right heart strain with contrast reflux into the hepatic veins.

CORRECT EXAMPLE (tumor progression):
1. Pulmonary mass in the right upper lobe measuring 35 mm, increased compared to prior study (22 mm), with pathological mediastinal lymphadenopathy and new ipsilateral pleural effusion.
2. Signs of acute diverticulitis in the sigmoid colon with adjacent reactive mesenteric lymphadenopathy.

INCORRECT EXAMPLE:
1. Filling defects in pulmonary arteries. ← WRONG: separated from the rest of the picture.
2. Areas of pulmonary infarction in RLL. ← WRONG: related to the point above.
3. Right heart dilatation. ← WRONG: part of the same picture.
4. 35 mm pulmonary mass, likely neoplastic. Biopsy recommended. ← WRONG: suggests diagnosis and recommends action.
5. Mediastinal lymphadenopathy. ← WRONG: separated a finding related to the mass.

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

  if (params.recommendations.length === 0) {
    const noRecs = lang === "es"
      ? "No se emiten recomendaciones adicionales."
      : "No additional recommendations.";
    return { system: "", user: noRecs };
  }

  const numberedCatalogue = params.recommendations.map((r, i) => {
    const gPart = r.guideline ? ` (${r.guideline})` : "";
    return `[R${i + 1}] Trigger: "${r.trigger}" → Recommendation: "${r.recommendation}"${gPart}`;
  }).join("\n");

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto emitiendo recomendaciones de seguimiento.

CATÁLOGO CERRADO DE RECOMENDACIONES:
${numberedCatalogue}

REGLAS ABSOLUTAS:
1. SOLO puedes emitir recomendaciones que aparecen LITERALMENTE en el catálogo anterior. CADA recomendación emitida DEBE corresponder a una entrada [Rn] del catálogo.
2. Para emitir una recomendación, el hallazgo del informe debe coincidir SEMÁNTICAMENTE con el trigger de esa entrada del catálogo. La coincidencia debe ser sobre el MISMO órgano/estructura y el MISMO tipo de hallazgo.
3. Si NINGÚN hallazgo del informe coincide con NINGÚN trigger del catálogo: responde ÚNICAMENTE "No se emiten recomendaciones adicionales." — nada más.
4. NUNCA inventes, parafrasees, combines ni modifiques recomendaciones. Usa la redacción EXACTA del catálogo.
5. NUNCA apliques un trigger de un órgano a un hallazgo de otro órgano diferente.
6. NUNCA sugieras procedimientos invasivos a menos que el catálogo lo diga explícitamente.
7. Indica el hallazgo EXACTO del informe que activó cada recomendación.
8. La redacción final debe estar en ${l}.

FORMATO (texto plano, sin markdown):
[número]. [recomendación exacta del catálogo] ([guía]) — Hallazgo: [cita textual del hallazgo del informe].

RESPONDE EN JSON:
[{"catalogue_id": "R1", "recommendation": "texto exacto", "guideline": "nombre guía", "triggering_finding": "cita textual del hallazgo"}]

Si no hay coincidencias, responde: []`;
  } else {
    system = `You are an expert radiologist issuing follow-up recommendations.

CLOSED RECOMMENDATION CATALOGUE:
${numberedCatalogue}

ABSOLUTE RULES:
1. You may ONLY issue recommendations that appear LITERALLY in the catalogue above. EVERY recommendation issued MUST correspond to an [Rn] entry.
2. To issue a recommendation, the report finding must SEMANTICALLY match the trigger of that catalogue entry. The match must be about the SAME organ/structure and the SAME type of finding.
3. If NO report finding matches ANY catalogue trigger: respond ONLY with "No additional recommendations." — nothing else.
4. NEVER invent, paraphrase, combine or modify recommendations. Use the EXACT wording from the catalogue.
5. NEVER apply a trigger from one organ to a finding in a different organ.
6. NEVER suggest invasive procedures unless the catalogue explicitly says so.
7. Indicate the EXACT finding from the report that triggered each recommendation.
8. Final wording must be in ${l}.

FORMAT (plain text, no markdown):
[number]. [exact recommendation from catalogue] ([guideline]) — Finding: [verbatim quote from report finding].

RESPOND IN JSON:
[{"catalogue_id": "R1", "recommendation": "exact text", "guideline": "guideline name", "triggering_finding": "verbatim finding quote"}]

If no matches, respond: []`;
  }

  const findLabel = lang === "es" ? "Hallazgos del informe a evaluar" : "Report findings to evaluate";
  const user = `${findLabel}:\n${params.findingsText}`;
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
