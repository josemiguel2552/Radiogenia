import type { FindingsLength, NormalFieldsVerbosity, ParaphraseLevel, OutputLanguage, PreferredNormalPhrase, ConclusionStyle } from "./types";

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
    light: "Puedes corregir gramática, orden sintáctico y errores de terminología médica (ej: 'supracolicular'→'supraclavicular', 'arthrosis' en abdomen→'artrosis/hidronefrosis'). Usa el término anatómico o patológico correcto según el contexto clínico y la modalidad. No cambies ningún dato clínico, medida ni descriptor.",
    free: "Puedes reescribir los hallazgos con estilo radiológico profesional. Mantén todos los datos clínicos intactos.",
  },
  en: {
    none: "Transcribe dictated findings literally. Do not change any words. Only place them in the correct section.",
    light: "You may correct grammar, syntax, and medical terminology errors (e.g. 'supracolicular'→'supraclavicular', 'arthrosis' in abdomen→'hydronephrosis'). Use the correct anatomical/pathological term based on clinical context and modality. Do not change any clinical data, measurements or descriptors.",
    free: "You may rewrite findings in professional radiological style. Keep all clinical data intact.",
  },
  pt: {
    none: "Transcreva os achados ditados de forma literal. Não mude nenhuma palavra. Apenas coloque-os na secção correta.",
    light: "Pode corrigir gramática, ordem sintática e erros de terminologia médica (ex: 'supracolicular'→'supraclavicular'). Use o termo anatómico/patológico correto segundo o contexto clínico e a modalidade. Não mude nenhum dado clínico, medida ou descritor.",
    free: "Pode reescrever os achados com estilo radiológico profissional. Mantenha todos os dados clínicos intactos.",
  },
  fr: {
    none: "Transcrivez les résultats dictés littéralement. Ne changez aucun mot. Placez-les uniquement dans la bonne section.",
    light: "Vous pouvez corriger la grammaire, la syntaxe et les erreurs de terminologie médicale (ex: 'supracoliculaire'→'supraclaviculaire'). Utilisez le terme anatomique/pathologique correct selon le contexte clinique et la modalité. Ne changez aucune donnée clinique, mesure ou descripteur.",
    free: "Vous pouvez réécrire les résultats dans un style radiologique professionnel. Gardez toutes les données cliniques intactes.",
  },
  de: {
    none: "Übertrage die diktierten Befunde wörtlich. Ändere keine Wörter. Ordne sie nur dem richtigen Abschnitt zu.",
    light: "Du kannst Grammatik, Syntax und medizinische Terminologiefehler korrigieren (z.B. 'suprakolikulär'→'supraklavikulär'). Verwende den korrekten anatomischen/pathologischen Begriff je nach klinischem Kontext und Modalität. Ändere keine klinischen Daten, Maße oder Deskriptoren.",
    free: "Du kannst die Befunde in professionellem radiologischem Stil umschreiben. Behalte alle klinischen Daten bei.",
  },
  it: {
    none: "Trascrivi i reperti dettati letteralmente. Non cambiare nessuna parola. Collocali solo nella sezione corretta.",
    light: "Puoi correggere grammatica, sintassi ed errori di terminologia medica (es: 'supracoliculare'→'supraclavicolare'). Usa il termine anatomico/patologico corretto in base al contesto clinico e alla modalità. Non cambiare nessun dato clinico, misura o descrittore.",
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
2. Si hay hallazgos que no encajan en ninguna sección del template, escribe la sección "Otros hallazgos: ..." con todos esos hallazgos agrupados, ANTES del párrafo final de normalidad.
3. DESPUÉS: al final, escribe un ÚNICO párrafo corrido (sin etiquetas de sección, sin viñetas, sin saltos de línea internos) que agrupe TODAS las secciones normales no mencionadas. Este párrafo debe decir algo como: "El resto de las estructuras evaluadas (nombrar las secciones) no muestran alteraciones significativas." o una variante natural y profesional. NO listes cada sección individualmente — redacta un texto fluido que las englobe.
El párrafo final de normalidad debe ser breve y natural. No repitas "es normal" para cada órgano.`,

  en: `COMPACT NORMALITY FORMAT:
A compact report has been requested. Reorganize the output as follows:
1. FIRST: write ONLY the sections that have findings mentioned by the radiologist (positive or dictated negative findings), each in the usual structured format ("Section: Description.").
2. If there are findings that do not fit any template section, write the section "Additional findings: ..." with all those findings grouped together, BEFORE the final normality paragraph.
3. THEN: at the end, write a SINGLE running paragraph (no section labels, no bullets, no internal line breaks) grouping ALL the normal unmentioned sections. This paragraph should say something like: "The remaining evaluated structures (name the sections) show no significant abnormalities." or a natural, professional variation. Do NOT list each section individually — write a flowing text that encompasses them all.
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
- "no valorado", "no evaluado", "no analizado", "no descrito", "no mencionado", "no explorado", "no se describe", "no se explora", "no se valora", "no se analiza", "sin valorar", "sin evaluar", "sin describir", "not assessed", "not evaluated", "not analyzed", "not described", "not mentioned", "not reported".
- Muletillas verbales (solo en texto generado por ti, NO en hallazgos dictados por el radiólogo): "se observa", "se evidencia", "se identifica", "se aprecia", "se demuestra", "se detecta", "se visualiza", "cabe destacar", "llama la atención", "noted", "observed", "identified", "seen", "demonstrated", "visualized". En secciones de normalidad y texto que tú redactes, escribe directamente sin verbos introductorios. Ej: "Nódulo hepático de 12 mm en segmento VI." en vez de "Se observa un nódulo hepático de 12 mm en segmento VI." EXCEPCIÓN: si el radiólogo usó estas palabras en su dictado, respétalas tal cual.
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
Otros hallazgos: Nódulos tiroideos bilaterales de aspecto inespecífico.`;
  }

  return `You are an expert radiologist writing structured reports. Your task is to take the radiologist's dictation and distribute it into the anatomical sections of the provided template.

OUTPUT LANGUAGE: ${l}. The ENTIRE report must be written in ${l}.
IMPORTANT: The dictation may be in ANY language. Regardless of the input language, your ENTIRE output MUST be in ${l}. Translate all content to ${l}.

STUDY MODALITY: ${modality}

FUNDAMENTAL PRINCIPLE — UNMENTIONED SECTIONS:
The radiologist only dictates abnormal or noteworthy findings. If the radiologist does NOT mention a section from the template, it means they evaluated it and it is NORMAL. Instead, describe appropriate radiological normality for that organ/structure and this modality.

ABSOLUTELY FORBIDDEN PHRASES (never write any of these in any section, under any circumstance):
- "not assessed", "not evaluated", "not analyzed", "not described", "not mentioned", "not reported", "not commented on", "not included", "not explored", "not examined", "not visualized for assessment", "no se describe", "no se valora", "no valorado".
- Filler verbs (only in text YOU generate, NOT in the radiologist's dictated findings): "noted", "observed", "identified", "seen", "demonstrated", "visualized", "detected", "appreciated", "is noted", "is observed", "is seen", "are identified", "se observa", "se identifica", "se evidencia". In normality sections and text you write, state findings directly without introductory verbs. E.g.: "12 mm hepatic nodule in segment VI." instead of "A 12 mm hepatic nodule is noted in segment VI." EXCEPTION: if the radiologist used these words in their dictation, preserve them as-is.
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
Additional findings: Bilateral thyroid nodules of nonspecific appearance.`;
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
- Si el dictado NO menciona una sección y existe una frase preferida para ella, úsala como guía de estilo y nivel de detalle. Si la frase está en otro idioma, TRADÚCELA al español manteniendo exactamente el mismo significado y nivel de detalle.
- Si el dictado describe un hallazgo en esa sección, IGNORA la frase preferida y redacta el hallazgo dictado.
- NUNCA introduzcas información clínica que no esté en el dictado.
- RECUERDA: TODA la salida debe estar en español. Si una frase preferida está en inglés, tradúcela al español.`
      : `RADIOLOGIST'S PREFERRED NORMALITY PHRASES for each anatomical section.
Rules:
- If the dictation does NOT mention a section and a preferred phrase exists for it, use it as a style and detail guide. If the phrase is in a different language, TRANSLATE it to ${LANGUAGE_LABEL[lang]} keeping the exact same meaning and level of detail.
- If the dictation describes a finding in that section, IGNORE the preferred phrase and write the dictated finding.
- NEVER introduce clinical information that is not in the dictation.
- REMEMBER: ALL output must be in ${LANGUAGE_LABEL[lang]}. Translate any phrase that is not already in ${LANGUAGE_LABEL[lang]}.`;

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

  const langReminder = lang === "es"
    ? `\n\nIDIOMA: Tu salida COMPLETA debe estar en ${LANGUAGE_LABEL[lang]}. No mezcles con otros idiomas.`
    : `\n\nLANGUAGE: Write your ENTIRE output in ${LANGUAGE_LABEL[lang]}, not in the dictation language. Do not mix languages.`;
  const user = `Template: ${params.template}\n\nDictation: ${params.dictation}${langReminder}`;
  return { system, user };
}

export function buildConclusionPrompt(params: {
  findingsText: string;
  clinicalInfo: string;
  outputLanguage: OutputLanguage;
  conclusionStyle?: ConclusionStyle;
  preferredConclusionPhrases?: string[];
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;
  const style = params.conclusionStyle || "concise";

  const STYLE_BLOCK_ES: Record<ConclusionStyle, string> = {
    concise: `ESTILO — CONCISO:
- Telegráfico: frases cortas, sin palabras de relleno. NUNCA uses muletillas como "se observa", "se identifica".
- Directo: ve al grano con lo más relevante clínicamente.
- Usa el MÍNIMO de puntos necesarios (máximo 4). Si 1 punto basta, usa 1.
- Ordena por relevancia clínica (primero lo importante).
- Lenguaje prudente y descriptivo: tamaño, localización, densidad/señal.`,
    detailed: `ESTILO — DETALLADO CON BULLET POINTS:
- Conclusión de un radiólogo experto que resume y agrupa solo los hallazgos relevantes.
- Cada punto es una viñeta (bullet point) clara y descriptiva.
- Incluye datos clave: tamaño, localización, densidad/señal, relación con estructuras adyacentes, cambios respecto a previos.
- Ordena por relevancia clínica (primero lo importante).
- Usa el mínimo necesario de puntos (máximo 6). Si 2 puntos bastan, usa 2.
- NO uses muletillas como "se observa", "se identifica", "presence of".`,
    grouped: `ESTILO — AGRUPADO EN 2 PUNTOS MÁXIMO:
- Agrupa TODO lo importante en el PRIMER punto: hallazgos principales, datos relevantes, medidas, localizaciones.
- Si hay hallazgos secundarios o menos relevantes, agrúpalos en un SEGUNDO punto.
- NUNCA hagas más de 2 puntos. Si todo es relevante, ponlo todo en el primer punto.
- Si solo hay hallazgos principales, usa un único punto.
- Lenguaje descriptivo con datos clave: tamaño, localización, densidad/señal.`,
  };

  const STYLE_BLOCK_EN: Record<ConclusionStyle, string> = {
    concise: `STYLE — CONCISE:
- Telegraphic: short phrases, no filler words. NEVER use padding like "noted", "presence of".
- Direct: get to the point with the most clinically relevant findings.
- Use the MINIMUM number of points needed (maximum 4). If 1 point suffices, use 1.
- Order by clinical relevance (most important first).
- Prudent, descriptive language: size, location, density/signal.`,
    detailed: `STYLE — DETAILED BULLET POINTS:
- Expert radiologist conclusion that summarizes and groups only relevant findings.
- Each point is a clear, descriptive bullet point.
- Include key data: size, location, density/signal, relationship to adjacent structures, changes compared to prior studies.
- Order by clinical relevance (most important first).
- Use the minimum number of points needed (maximum 6). If 2 points suffice, use 2.
- Do NOT use filler like "noted", "presence of", "no significant findings regarding".`,
    grouped: `STYLE — GROUPED IN 2 POINTS MAXIMUM:
- Group ALL important findings in the FIRST point: main findings, relevant data, measurements, locations.
- If there are secondary or less relevant findings, group them in a SECOND point.
- NEVER make more than 2 points. If everything is relevant, put it all in the first point.
- If there are only main findings, use a single point.
- Descriptive language with key data: size, location, density/signal.`,
  };

  const FORMAT_ES: Record<ConclusionStyle, string> = {
    concise: `FORMATO:
- Puntos numerados (1. 2. 3.). Texto plano.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`,
    detailed: `FORMATO:
- Puntos numerados (1. 2. 3.). Texto plano.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`,
    grouped: `FORMATO:
- Máximo 2 puntos numerados (1. y opcionalmente 2.). Texto plano.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`,
  };

  const FORMAT_EN: Record<ConclusionStyle, string> = {
    concise: `FORMAT:
- Numbered points (1. 2. 3.). Plain text.
- Do NOT use asterisks, hashes or markdown.
- Do NOT include the heading "CONCLUSION".`,
    detailed: `FORMAT:
- Numbered points (1. 2. 3.). Plain text.
- Do NOT use asterisks, hashes or markdown.
- Do NOT include the heading "CONCLUSION".`,
    grouped: `FORMAT:
- Maximum 2 numbered points (1. and optionally 2.). Plain text.
- Do NOT use asterisks, hashes or markdown.
- Do NOT include the heading "CONCLUSION".`,
  };

  let system: string;

  if (lang === "es") {
    system = `Redacta la CONCLUSIÓN de un informe radiológico a partir de los HALLAZGOS proporcionados.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.
Si los hallazgos están en otro idioma, traduce al ${l}.

${STYLE_BLOCK_ES[style]}

PROHIBIDO:
- Emitir diagnósticos o sugerir enfermedades ("compatible con neumonía", "sugestivo de neoplasia").
- Recomendar acciones clínicas ("se recomienda biopsia", "completar con RM", "control en 3 meses").
- Clasificar según escalas (BI-RADS, Lung-RADS, PI-RADS, TNM).
- Lenguaje categórico o inferencias causales ("probablemente relacionado con...", "secundario a...").
- Pronósticos ("hallazgo preocupante", "proceso agresivo", "buen pronóstico").
- Añadir información no presente en los hallazgos.
- Especular sobre la naturaleza de un hallazgo ("posiblemente benigno", "probablemente inflamatorio").
- Descartar patología si existe algún hallazgo indeterminado.

REGLA CRÍTICA — NO ENUMERAR NORMALIDAD:
NUNCA listes órganos o estructuras normales. Si un órgano no tiene hallazgo patológico, NO lo menciones en la conclusión. La conclusión SOLO contiene hallazgos positivos (patológicos) y, si aplica, la respuesta negativa a la pregunta clínica.

HALLAZGOS NEGATIVOS:
Incluye un hallazgo negativo SOLO si el radiólogo lo dictó explícitamente Y responde a la pregunta clínica (ej: pregunta "descartar TEP" → "Sin evidencia de TEP").

${hasClinical ? `PREGUNTA CLÍNICA:
El primer punto responde a la pregunta clínica. Sé breve:
- Si responde claramente: lenguaje descriptivo directo.
- Si no hay hallazgos: frase corta negativa (ej: "Sin consolidación parenquimatosa.").
- Si hay hallazgo indeterminado: descríbelo sin especular.` : ""}

AGRUPACIÓN:
Agrupa TODOS los hallazgos relacionados en un solo punto, aunque vengan de secciones anatómicas distintas.

COMPARACIONES CON PREVIOS:
Si hay cambios respecto a estudios previos, inclúyelos junto al hallazgo correspondiente.

Si no hay hallazgos relevantes: "${hasClinical ? "Sin hallazgos significativos en relación con la pregunta clínica." : "Exploración dentro de límites normales."}"

${FORMAT_ES[style]}`;
  } else {
    system = `Write the CONCLUSION of a radiology report based on the provided FINDINGS.

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be written in ${l}.
If findings are in another language, translate to ${l}.

${STYLE_BLOCK_EN[style]}

FORBIDDEN:
- Suggesting diagnoses or diseases ("consistent with pneumonia", "suggestive of neoplasm").
- Recommending clinical actions ("biopsy recommended", "further evaluation with MRI", "follow-up in 3 months").
- Classifying according to scales (BI-RADS, Lung-RADS, PI-RADS, TNM).
- Categorical language or causal inferences ("likely related to...", "secondary to...").
- Issuing prognoses ("concerning finding", "aggressive process", "good prognosis").
- Adding information not present in the findings.
- Speculating about the nature of a finding ("possibly benign", "likely inflammatory").
- Ruling out pathology if any indeterminate finding exists.

CRITICAL RULE — DO NOT LIST NORMAL STRUCTURES:
NEVER list normal organs or structures. If an organ has no pathological finding, do NOT mention it in the conclusion. The conclusion contains ONLY positive (pathological) findings and, if applicable, the negative answer to the clinical question.

NEGATIVE FINDINGS:
Include a negative finding ONLY if the radiologist explicitly dictated it AND it answers the clinical question (e.g., question "rule out PE" → "No evidence of PE").

${hasClinical ? `CLINICAL QUESTION:
The first point answers the clinical question. Be brief:
- If findings clearly answer: direct descriptive language.
- If no findings: short negative phrase (e.g., "No parenchymal consolidation.").
- If there is an indeterminate finding: describe it without speculating.` : ""}

GROUPING:
Group ALL related findings into one single point, even if they come from different anatomical sections.

COMPARISON WITH PRIOR STUDIES:
If findings mention changes compared to prior studies, include them alongside the corresponding finding.

If no relevant findings: "${hasClinical ? "No significant findings regarding the clinical question." : "Examination within normal limits."}"

${FORMAT_EN[style]}`;
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

  // Final language enforcement
  if (lang !== "es" && lang !== "en") {
    system += `\n\nCRITICAL LANGUAGE REMINDER: Your ENTIRE output must be in ${l}. Not a single word in Spanish or English. Translate ALL medical terminology to ${l}.`;
  } else if (lang === "es") {
    system += `\n\nRECORDATORIO DE IDIOMA: Tu salida COMPLETA debe estar en ${l}. No mezcles con inglés ni otros idiomas. Traduce toda terminología al ${l}.`;
  } else {
    system += `\n\nLANGUAGE REMINDER: Your ENTIRE output must be in ${l}. Do not mix with Spanish or other languages. Translate all terminology to ${l}.`;
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
