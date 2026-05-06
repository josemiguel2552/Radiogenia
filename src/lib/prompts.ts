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
    concise: "Redija cada seção de forma concisa em uma única frase. Inclua apenas o dado diagnóstico essencial.",
    standard: "Redija cada seção com descrição completa, mas sem redundâncias.",
    detailed: "Redija cada seção de forma exaustiva, descrevendo todos os parâmetros radiológicos disponíveis.",
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
    minimal: "As seções não mencionadas são descritas brevemente como normais. Ex: 'Fígado: Sem alterações.'",
    standard: "As seções não mencionadas são descritas com uma frase profissional de normalidade. Ex: 'Fígado: De tamanho, morfologia e intensidade de sinal normais.'",
    explicit: "As seções não mencionadas são descritas de forma exaustiva, com todos os parâmetros normais relevantes.",
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
    none: "Transcreva os achados ditados de forma literal. Não mude nenhuma palavra. Apenas coloque-os na seção correta.",
    light: "Pode corrigir gramática, ordem sintática e erros de terminologia médica (ex: 'supracolicular'→'supraclavicular'). Use o termo anatômico/patológico correto de acordo com o contexto clínico e a modalidade. Não mude nenhum dado clínico, medida ou descritor.",
    free: "Pode reescrever os achados com estilo radiológico profissional. Mantenha todos os dados clínicos intactos.",
  },
};

const LANGUAGE_LABEL: Record<OutputLanguage, string> = {
  es: "español",
  en: "English",
  pt: "português",
};

const COMPACT_NORMALS_INSTRUCTION: Record<string, string> = {
  es: `⚠️ MODO COMPACTO ACTIVADO — ESTA ES LA INSTRUCCIÓN MÁS IMPORTANTE DEL INFORME:
NO escribas cada sección del template individualmente. El formato de salida cambia por completo:
1. PRIMERO: escribe SOLO las secciones que tienen hallazgos mencionados por el radiólogo (positivos o negativos dictados), cada una como "Sección: Descripción."
2. DESPUÉS: al final, escribe un ÚNICO párrafo corrido (SIN etiquetas de sección, SIN viñetas, SIN saltos de línea internos) que agrupe TODAS las secciones normales no mencionadas. Ejemplo: "El resto de las estructuras evaluadas (parénquima pulmonar, mediastino, pared torácica, etc.) no muestran alteraciones significativas."
⚠️ PROHIBIDO en modo compacto: NO escribas secciones individuales con texto de normalidad (ej: "Parénquima pulmonar: Sin alteraciones."). Esas secciones se REEMPLAZAN por el párrafo final único.
Si el informe resultante tiene más secciones que hallazgos dictados, estás haciéndolo MAL.

⚠️⚠️ REGLA DE CERO OMISIONES — ABSOLUTA, SIN EXCEPCIONES:
- CADA hallazgo del dictado DEBE aparecer en el informe. Si un hallazgo encaja en una sección del template, ponlo ahí. Si NO encaja en NINGUNA sección, DEBES añadir "Otros hallazgos:" al final con TODOS los hallazgos huérfanos.
- NUNCA omitas un hallazgo dictado. Es preferible tener una sección "Otros hallazgos" larga que perder un solo dato clínico.
- Antes de finalizar, VERIFICA que cada dato del dictado aparece en tu respuesta. Si falta alguno, añádelo a "Otros hallazgos".`,

  en: `⚠️ COMPACT MODE ENABLED — THIS IS THE MOST IMPORTANT INSTRUCTION FOR THIS REPORT:
Do NOT write each template section individually. The output format changes completely:
1. FIRST: write ONLY sections that have findings mentioned by the radiologist (positive or dictated negative findings), each as "Section: Description."
2. THEN: at the end, write a SINGLE running paragraph (NO section labels, NO bullets, NO internal line breaks) grouping ALL normal unmentioned sections. Example: "The remaining evaluated structures (lung parenchyma, mediastinum, chest wall, etc.) show no significant abnormalities."
⚠️ FORBIDDEN in compact mode: Do NOT write individual sections with normality text (e.g., "Lung parenchyma: No abnormalities."). Those sections are REPLACED by the single final paragraph.
If the resulting report has more sections than dictated findings, you are doing it WRONG.

⚠️⚠️ ZERO-OMISSION RULE — ABSOLUTE, NO EXCEPTIONS:
- EVERY dictated finding MUST appear in the report. If a finding fits a template section, place it there. If it does NOT fit ANY section, you MUST add "Additional findings:" at the end with ALL orphan findings.
- NEVER omit a dictated finding. A long "Additional findings" section is preferable to losing a single clinical data point.
- Before finalizing, VERIFY that every piece of data from the dictation appears in your response. If anything is missing, add it to "Additional findings".`,

  pt: `⚠️ MODO COMPACTO ATIVADO — ESTA É A INSTRUÇÃO MAIS IMPORTANTE DO RELATÓRIO:
NÃO escreva cada seção do template individualmente. O formato de saída muda completamente:
1. PRIMEIRO: escreva APENAS as seções que possuem achados mencionados pelo radiologista (positivos ou negativos ditados), cada uma como "Seção: Descrição."
2. DEPOIS: ao final, escreva um ÚNICO parágrafo corrido (SEM rótulos de seção, SEM marcadores, SEM quebras de linha internas) agrupando TODAS as seções normais não mencionadas. Exemplo: "As demais estruturas avaliadas (parênquima pulmonar, mediastino, parede torácica, etc.) não apresentam alterações significativas."
⚠️ PROIBIDO no modo compacto: NÃO escreva seções individuais com texto de normalidade (ex: "Parênquima pulmonar: Sem alterações."). Essas seções são SUBSTITUÍDAS pelo parágrafo final único.
Se o relatório resultante tiver mais seções do que achados ditados, você está fazendo ERRADO.

⚠️⚠️ REGRA DE ZERO OMISSÕES — ABSOLUTA, SEM EXCEÇÕES:
- CADA achado do ditado DEVE aparecer no laudo. Se um achado se encaixa em uma seção do template, coloque-o lá. Se NÃO se encaixa em NENHUMA seção, você DEVE adicionar "Outros achados:" ao final com TODOS os achados órfãos.
- NUNCA omita um achado ditado. Uma seção "Outros achados" longa é preferível a perder um único dado clínico.
- Antes de finalizar, VERIFIQUE que cada dado do ditado aparece na sua resposta. Se faltar algum, adicione-o a "Outros achados".`,
};

const DICTATION_ONLY_INSTRUCTION: Record<string, string> = {
  es: `⚠️ MODO SOLO DICTADO — ESTA ES LA INSTRUCCIÓN MÁS IMPORTANTE:
NO escribas secciones de normalidad. El informe SOLO contiene lo que el radiólogo dictó.
1. Escribe ÚNICAMENTE las secciones del template donde el radiólogo dictó un hallazgo (positivo o negativo explícito).
2. Las secciones NO mencionadas en el dictado se OMITEN por completo — NO las incluyas.
3. Mantén el formato estructurado: "Sección: Descripción." — una línea por sección.
⚠️ PROHIBIDO: escribir secciones con frases de normalidad inventadas por ti. Si el radiólogo no mencionó un órgano, NO aparece en el informe.

⚠️⚠️ REGLA DE CERO OMISIONES — ABSOLUTA, SIN EXCEPCIONES:
- CADA hallazgo del dictado DEBE aparecer en el informe. Si un hallazgo encaja en una sección del template, ponlo ahí. Si NO encaja en NINGUNA sección, DEBES añadir "Otros hallazgos:" al final con TODOS los hallazgos huérfanos.
- NUNCA omitas un hallazgo dictado. Es preferible tener una sección "Otros hallazgos" larga que perder un solo dato clínico.
- Antes de finalizar, VERIFICA que cada dato del dictado aparece en tu respuesta. Si falta alguno, añádelo a "Otros hallazgos".`,

  en: `⚠️ DICTATION ONLY MODE — THIS IS THE MOST IMPORTANT INSTRUCTION:
Do NOT write normality sections. The report ONLY contains what the radiologist dictated.
1. Write ONLY template sections where the radiologist dictated a finding (positive or explicit negative).
2. Sections NOT mentioned in the dictation are OMITTED entirely — do NOT include them.
3. Keep the structured format: "Section: Description." — one line per section.
⚠️ FORBIDDEN: writing sections with normality phrases you invented. If the radiologist didn't mention an organ, it does NOT appear in the report.

⚠️⚠️ ZERO-OMISSION RULE — ABSOLUTE, NO EXCEPTIONS:
- EVERY dictated finding MUST appear in the report. If a finding fits a template section, place it there. If it does NOT fit ANY section, you MUST add "Additional findings:" at the end with ALL orphan findings.
- NEVER omit a dictated finding. A long "Additional findings" section is preferable to losing a single clinical data point.
- Before finalizing, VERIFY that every piece of data from the dictation appears in your response. If anything is missing, add it to "Additional findings".`,

  pt: `⚠️ MODO SOMENTE DITADO — ESTA É A INSTRUÇÃO MAIS IMPORTANTE:
NÃO escreva seções de normalidade. O laudo contém APENAS o que o radiologista ditou.
1. Escreva SOMENTE as seções do template onde o radiologista ditou um achado (positivo ou negativo explícito).
2. As seções NÃO mencionadas no ditado são OMITIDAS completamente — NÃO as inclua.
3. Mantenha o formato estruturado: "Seção: Descrição." — uma linha por seção.
⚠️ PROIBIDO: escrever seções com frases de normalidade inventadas por você. Se o radiologista não mencionou um órgão, ele NÃO aparece no laudo.

⚠️⚠️ REGRA DE ZERO OMISSÕES — ABSOLUTA, SEM EXCEÇÕES:
- CADA achado do ditado DEVE aparecer no laudo. Se um achado se encaixa em uma seção do template, coloque-o lá. Se NÃO se encaixa em NENHUMA seção, você DEVE adicionar "Outros achados:" ao final com TODOS os achados órfãos.
- NUNCA omita um achado ditado. Uma seção "Outros achados" longa é preferível a perder um único dado clínico.
- Antes de finalizar, VERIFIQUE que cada dado do ditado aparece na sua resposta. Se faltar algum, adicione-o a "Outros achados".`,
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
5. NO añadas diagnósticos, caracterizaciones ni interpretaciones que el radiólogo no haya dictado. Si dicta "lesión adrenal de 18 mm con densidad de 20 UH", escribe exactamente eso — NO añadas "compatible con adenoma", "sugestivo de quiste", etc. El radiólogo describe datos; tú los transcribes fielmente.
6. IGNORA completamente la sección "CONCLUSION"/"CONCLUSIÓN" del template — NO la incluyas en tu respuesta.
6. HALLAZGOS SIN SECCIÓN — OBLIGATORIO:
   Si un hallazgo dictado NO encaja claramente en NINGUNA sección del template, DEBES añadir una sección final llamada "Otros hallazgos:" al final del informe con TODOS los hallazgos huérfanos agrupados.
   - NUNCA omitas un hallazgo dictado por falta de sección adecuada.
   - NUNCA fuerces un hallazgo en una sección anatómica incorrecta solo para evitar crear "Otros hallazgos".
   - Ejemplos: hallazgos incidentales en órganos no cubiertos por el template, hallazgos de partes blandas en un template óseo, adenopatías en un template que no las incluye, etc.
   - Si TODOS los hallazgos encajan en secciones existentes, NO añadas esta sección.

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

  if (lang === "pt") {
    return `Você é um radiologista experiente redigindo laudos estruturados. Sua tarefa é pegar o ditado do radiologista e distribuí-lo nas seções anatômicas do template fornecido.

IDIOMA DE SAÍDA: ${l}. TODO o laudo deve estar em ${l}.
IMPORTANTE: O ditado pode estar em QUALQUER idioma. Independentemente do idioma de entrada, toda a sua saída DEVE estar em ${l}. Traduza todo o conteúdo para ${l}.

MODALIDADE DO ESTUDO: ${modality}

PRINCÍPIO FUNDAMENTAL — SEÇÕES NÃO MENCIONADAS:
O radiologista dita apenas o que é anormal ou o que deseja destacar. Se o radiologista NÃO menciona uma seção do template, significa que ele a avaliou e é NORMAL. Em vez disso, descreva normalidade radiológica apropriada para aquele órgão/estrutura e esta modalidade.

FRASES ABSOLUTAMENTE PROIBIDAS (nunca escreva nenhuma destas em nenhuma seção, sob nenhuma circunstância):
- "não avaliado", "não analisado", "não descrito", "não mencionado", "não explorado", "não visualizado para avaliação", "not assessed", "not evaluated", "no valorado", "no se describe".
- Vícios de linguagem (apenas no texto gerado por você, NÃO nos achados ditados pelo radiologista): "observa-se", "evidencia-se", "identifica-se", "nota-se", "demonstra-se", "detecta-se", "visualiza-se", "cabe destacar", "chama atenção", "noted", "observed", "identified". Nas seções de normalidade e texto que você redigir, escreva diretamente sem verbos introdutórios. Ex: "Nódulo hepático de 12 mm no segmento VI." em vez de "Observa-se nódulo hepático de 12 mm no segmento VI." EXCEÇÃO: se o radiologista usou essas palavras no ditado, mantenha-as como estão.
Se uma seção não é mencionada no ditado, SEMPRE escreva uma descrição de normalidade. JAMAIS indique que não foi avaliada.

ACHADOS NEGATIVOS DITADOS:
Quando o radiologista dita explicitamente a AUSÊNCIA de um achado (ex: "sem massa colônica", "sem evidência de TEP", "sem dissecção aórtica", "não se identifica litíase"), isso é um achado negativo relevante e DEVE ser incluído na seção anatômica correspondente. Não o omita nem o substitua por uma frase genérica de normalidade. Reproduza fielmente a negação ditada.

REGRAS OBRIGATÓRIAS:
1. A saída deve conter EXATAMENTE as mesmas seções do template, na MESMA ORDEM. Não reordene. Não omita nenhuma.
2. Distribua cada achado ditado na seção anatômica correta do template. Isso inclui tanto achados positivos quanto achados negativos ditados pelo radiologista.
3. Seções não mencionadas no ditado são SEMPRE preenchidas com descrições de normalidade radiológica profissional.
4. NÃO invente achados patológicos que o radiologista não tenha ditado.
5. NÃO adicione diagnósticos, caracterizações nem interpretações que o radiologista não tenha ditado. Se dita "lesão adrenal de 18 mm com densidade de 20 UH", escreva exatamente isso — NÃO adicione "compatível com adenoma", "sugestivo de cisto", etc.
6. IGNORE completamente a seção "CONCLUSÃO" do template — NÃO a inclua na resposta.
6. ACHADOS SEM SEÇÃO — OBRIGATÓRIO:
   Se um achado ditado NÃO se encaixa claramente em NENHUMA seção do template, você DEVE adicionar uma seção final chamada "Outros achados:" ao final do laudo com TODOS os achados órfãos agrupados.
   - NUNCA omita um achado ditado por falta de seção adequada.
   - NUNCA force um achado em uma seção anatômica incorreta apenas para evitar criar "Outros achados".
   - Exemplos: achados incidentais em órgãos não cobertos pelo template, achados de partes moles em um template ósseo, linfonodomegalias em um template que não as inclui, etc.
   - Se TODOS os achados se encaixam em seções existentes, NÃO adicione esta seção.

FORMATO DE SAÍDA — ESTRITO, SEM EXCEÇÕES:
- Cada seção é exatamente UMA linha com o formato: "Seção anatômica: Descrição."
- Primeira letra da seção em MAIÚSCULA, o restante em minúsculas. Dois pontos. Um espaço. Descrição. Ponto final.
- Uma linha por seção. Sem linhas em branco entre seções. Sem quebras de linha dentro de uma seção.
- NÃO use asteriscos (*), cerquilhas (#), hífens (-), marcadores, negrito nem nenhuma formatação markdown.
- NÃO numere as seções.
- NÃO adicione cabeçalhos como "ACHADOS" nem agrupamentos. Apenas a lista plana de seções.
- TRADUZA os nomes das seções do template para ${l}.

Exemplo — se o template tem as seções Liver, Gallbladder, Bile ducts, Pancreas (nessa ordem) e o ditado menciona nódulos tireoidianos, a saída deve ser EXATAMENTE:
Fígado: De tamanho e morfologia normais.
Vesícula biliar: De paredes finas, sem litíase.
Via biliar: De calibre normal.
Pâncreas: De tamanho e morfologia normais.
Outros achados: Nódulos tireoidianos bilaterais de aspecto inespecífico.`;
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
5. Do NOT add diagnoses, characterizations, or interpretations the radiologist did not dictate. If they dictate "18 mm adrenal lesion with density of 20 HU", write exactly that — do NOT add "consistent with adenoma", "suggestive of cyst", etc. The radiologist reports data; you transcribe faithfully.
6. Completely IGNORE the "CONCLUSION" section of the template — do NOT include it.
6. FINDINGS WITHOUT A SECTION — MANDATORY:
   If a dictated finding does NOT clearly fit ANY template section, you MUST add a final section called "Additional findings:" at the end of the report with ALL orphan findings grouped together.
   - NEVER omit a dictated finding due to lack of a matching section.
   - NEVER force a finding into an incorrect anatomical section just to avoid creating "Additional findings".
   - Examples: incidental findings in organs not covered by the template, soft tissue findings in a bone template, lymphadenopathy in a template that doesn't include it, etc.
   - If ALL findings fit existing sections, do NOT add this section.

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
  const use = lang === "es" ? "Usa" : lang === "pt" ? "Use" : "Use";
  const forbidden = lang === "es" ? "PROHIBIDO" : lang === "pt" ? "PROIBIDO" : "FORBIDDEN";

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
  dictationOnly?: boolean;
  styleSamples?: string[];
  preferredNormalPhrases?: PreferredNormalPhrase[];
}): { system: string; user: string } {
  const lang = params.outputLanguage;

  let system = findingsSystemPrompt(lang, params.modality);

  system += `\n\n${modalityTerminology(params.modality, lang)}

${LENGTH_INSTRUCTIONS[lang][params.findingsLength]}
${params.compactNormals ? "" : VERBOSITY_INSTRUCTIONS[lang][params.normalFieldsVerbosity]}
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

  if (params.dictationOnly) {
    system += `\n\n${DICTATION_ONLY_INSTRUCTION[lang] || DICTATION_ONLY_INSTRUCTION.en}`;
  } else if (params.compactNormals) {
    system += `\n\n${COMPACT_NORMALS_INSTRUCTION[lang] || COMPACT_NORMALS_INSTRUCTION.en}`;
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
- Cada punto agrupa hallazgos relacionados en UNA SOLA FRASE breve y directa.
- Sin subordinadas largas ni explicaciones. Solo el dato clave condensado.
- Usa paréntesis para medidas y datos: "Aumento de la lesión hepática del segmento VII (2→3.5 cm) con nueva adenopatía retroperitoneal (15 mm)."
- Tono: directo, escueto, descriptivo.`,
    grouped: `ESTILO — INTEGRADO:
- Cada punto es un párrafo breve con frases completas y bien redactadas.
- Incluye datos descriptivos: tamaño, localización, densidad/señal, evolución.
- SOLO conecta hallazgos dentro de un punto si son parte del MISMO PROCESO PATOLÓGICO (ej: lesión primaria + sus adenopatías, derrame + atelectasia compresiva).
- Si dos hallazgos no comparten fisiopatología, van en PUNTOS SEPARADOS aunque ambos sean importantes.
- NO fuerces conectores entre hallazgos independientes. Cada punto es una unidad clínica coherente.
- Tono: integrador pero riguroso, sintético, descriptivo.`,
  };

  const STYLE_BLOCK_EN: Record<ConclusionStyle, string> = {
    concise: `STYLE — CONCISE:
- Each point groups related findings into ONE SINGLE brief, direct phrase.
- No long subordinate clauses or explanations. Only the key data condensed.
- Use parentheses for measurements and data: "Interval increase of segment VII hepatic lesion (2→3.5 cm) with new retroperitoneal lymph node (15 mm)."
- Tone: direct, succinct, descriptive.`,
    grouped: `STYLE — INTEGRATED:
- Each point is a brief paragraph with complete, well-written sentences.
- Include descriptive data: size, location, density/signal, evolution.
- ONLY connect findings within a point if they are part of the SAME PATHOLOGICAL PROCESS (e.g., primary lesion + its lymphadenopathy, effusion + compressive atelectasis).
- If two findings do not share pathophysiology, they go in SEPARATE POINTS even if both are important.
- Do NOT force connectors between independent findings. Each point is a coherent clinical unit.
- Tone: integrative but rigorous, synthetic, descriptive.`,
  };

  let system: string;

  if (lang === "es") {
    system = `Redacta la CONCLUSIÓN de un informe radiológico a partir de los HALLAZGOS proporcionados.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.
Si los hallazgos están en otro idioma, traduce al ${l}.

${STYLE_BLOCK_ES[style]}

REGLAS DE CONTENIDO:

1. MÁXIMO 4 PUNTOS. Nunca más. Si todo cabe en 1 o 2, mejor.

2. SOLO HALLAZGOS CLÍNICAMENTE SIGNIFICATIVOS:
   - Incluye ÚNICAMENTE hallazgos patológicos que impacten en el manejo del paciente.
   - NUNCA menciones órganos normales, variantes anatómicas sin relevancia, ni hallazgos incidentales triviales (quistes simples renales/hepáticos pequeños, pequeños osteofitos degenerativos, etc.) SALVO que sean la razón del estudio.
   - Si un hallazgo no cambia nada para el clínico, no lo incluyas.

3. ORDEN: De MAYOR a MENOR importancia clínica.

4. AGRUPACIÓN POR CONTEXTO CLÍNICO:
   - Hallazgos que muestren AUMENTO/EMPEORAMIENTO van juntos en un mismo punto (ej: "Aumento de tamaño de la lesión hepática del segmento VII (de 2 a 3.5 cm) con nueva adenopatía retroperitoneal de 15 mm.").
   - Hallazgos que muestren DISMINUCIÓN/MEJORÍA van juntos en otro punto (ej: "Disminución del derrame pleural derecho y resolución parcial de la consolidación basal.").
   - Hallazgos de la MISMA REGIÓN/SISTEMA van juntos (ej: todas las lesiones hepáticas en un punto; todos los hallazgos pleurales en un punto).
   - Hallazgos INDEPENDIENTES entre sí van en puntos separados.

5. ${hasClinical ? `PREGUNTA CLÍNICA PROPORCIONADA:
   - El PRIMER punto responde directamente a la pregunta clínica.
   - Si hay hallazgos: lenguaje descriptivo directo con datos clave.
   - Si NO hay hallazgos que respondan: frase corta negativa (ej: "Sin evidencia de TEP.").
   - Si hay hallazgo indeterminado: descríbelo sin especular.` : `SIN CONTEXTO CLÍNICO — DEDUCCIÓN:
   - Analiza los hallazgos y DEDUCE qué es lo más relevante para el clínico que solicitó la prueba.
   - Piensa: ¿por qué se pidió este estudio? ¿Qué hallazgo responde a esa pregunta implícita?
   - El PRIMER punto debe ser lo que el clínico busca saber: el hallazgo principal o su ausencia.
   - Ej: si hay lesiones conocidas → lo más relevante son los cambios de tamaño/número respecto a previos.
   - Ej: si hay un hallazgo agudo (fractura, colección, isquemia) → ese va primero.
   - Ej: si todo es crónico/degenerativo → prioriza lo que puede requerir acción.`}

6. HALLAZGOS NEGATIVOS:
   - Incluye un negativo pertinente SOLO si responde a la pregunta clínica (explícita o deducida).
   - Ej: pregunta "descartar TEP" → "Sin evidencia de TEP" es relevante.
   - NUNCA listes normalidad como relleno.

7. COMPARACIONES CON PREVIOS:
   - Si se mencionan cambios, inclúyelos DENTRO del punto del hallazgo correspondiente, calificando evolución (aumento/disminución/estabilidad).

PRINCIPIO FUNDAMENTAL — DESCRIBIR, NO DIAGNOSTICAR:
La conclusión DESCRIBE hallazgos radiológicos. NO emite diagnósticos, interpretaciones etiológicas ni juicios clínicos. El radiólogo describe lo que ve; el clínico decide qué significa.
- CORRECTO: "Aumento de tamaño de la lesión hepática del segmento VII (de 2 a 3.5 cm respecto al estudio previo)."
- INCORRECTO: "Progresión tumoral hepática." (esto es un diagnóstico/interpretación)
- CORRECTO: "Consolidación en lóbulo inferior derecho con broncograma aéreo."
- INCORRECTO: "Neumonía del lóbulo inferior derecho." (esto es un diagnóstico)
- CORRECTO: "Lesión focal hepática hipodensa de 25 mm en segmento VI, de nueva aparición."
- INCORRECTO: "Nueva metástasis hepática." (esto es un diagnóstico)

PROHIBIDO:
- Emitir diagnósticos o interpretaciones etiológicas: "progresión tumoral", "metástasis", "neumonía", "compatible con X", "sugestivo de X", "en relación con X", "indicativo de X", "consistente con X", "adenoma", "quiste hemorrágico", "angiomiolipoma", "hemangioma". En su lugar, describe el hallazgo radiológico puro (tamaño, densidad, localización).
- NUNCA caractericen ni clasifiquen lesiones a partir de valores de densidad, señal o realce. Si el radiólogo dicta "lesión adrenal de 18 mm con densidad de 20 UH", la conclusión dice exactamente eso, NO "adenoma", NO "compatible con adenoma". El radiólogo informa datos; el clínico interpreta.
- Asumir naturaleza de lesiones: "lesión maligna", "tumor", "metástasis", "recidiva", "diseminación", "adenoma", "lipoma", "quiste complicado". En su lugar: "lesión", "nódulo", "masa", "imagen nodular", "captación patológica".
- Inferir progresión o respuesta terapéutica: "progresión tumoral", "respuesta parcial", "enfermedad estable". En su lugar: "aumento de tamaño de la lesión", "disminución de tamaño", "sin cambios significativos respecto al previo".
- Recomendar acciones clínicas ("se recomienda biopsia", "completar con RM").
- Clasificar según escalas (BI-RADS, Lung-RADS, PI-RADS, TNM).
- Inferencias causales ("secundario a...", "probablemente relacionado con...", "en contexto de...").
- Pronósticos ("hallazgo preocupante", "buen pronóstico", "evolución desfavorable").
- Añadir información no presente en los hallazgos.
- Muletillas ("se observa", "se identifica", "se evidencia", "cabe destacar").

EXCEPCIÓN: Usa terminología diagnóstica SOLO si está explícitamente en los hallazgos dictados por el radiólogo (ej: si los hallazgos dicen "fractura", puedes decir "fractura"; si dicen "nódulo", no digas "tumor").

Si no hay hallazgos relevantes: "${hasClinical ? "Sin hallazgos significativos en relación con la pregunta clínica." : "Exploración dentro de límites normales."}"

FORMATO:
- Puntos numerados (1. 2. 3. 4.). Texto plano. Máximo 4.
- NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN".`;
  } else {
    system = `Write the CONCLUSION of a radiology report based on the provided FINDINGS.

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be written in ${l}.
If findings are in another language, translate to ${l}.

${STYLE_BLOCK_EN[style]}

CONTENT RULES:

1. MAXIMUM 4 POINTS. Never more. If 1 or 2 suffice, better.

2. ONLY CLINICALLY SIGNIFICANT FINDINGS:
   - Include ONLY pathological findings that impact patient management.
   - NEVER mention normal organs, irrelevant anatomical variants, or trivial incidental findings (small simple renal/hepatic cysts, small degenerative osteophytes, etc.) UNLESS they are the reason for the study.
   - If a finding changes nothing for the clinician, do not include it.

3. ORDER: From MOST to LEAST clinically important.

4. GROUPING BY CLINICAL CONTEXT:
   - Findings showing INTERVAL INCREASE/WORSENING go together in one point (e.g., "Interval increase of segment VII hepatic lesion (from 2 to 3.5 cm) with new 15 mm retroperitoneal lymph node.").
   - Findings showing INTERVAL DECREASE/IMPROVEMENT go together in another point (e.g., "Decreased right pleural effusion and partial resolution of basal consolidation.").
   - Findings of the SAME REGION/SYSTEM go together (e.g., all hepatic lesions in one point; all pleural findings in one point).
   - INDEPENDENT findings go in separate points.

5. ${hasClinical ? `CLINICAL QUESTION PROVIDED:
   - The FIRST point directly answers the clinical question.
   - If findings exist: direct descriptive language with key data.
   - If NO findings answer it: short negative phrase (e.g., "No evidence of PE.").
   - If there is an indeterminate finding: describe it without speculating.` : `NO CLINICAL CONTEXT — DEDUCTION:
   - Analyze the findings and DEDUCE what is most relevant for the clinician who ordered the study.
   - Think: why was this study ordered? What finding answers that implicit question?
   - The FIRST point should be what the clinician wants to know: the main finding or its absence.
   - E.g.: if there are known lesions → most relevant are size/number changes compared to prior.
   - E.g.: if there is an acute finding (fracture, collection, ischemia) → that goes first.
   - E.g.: if everything is chronic/degenerative → prioritize what may require action.`}

6. NEGATIVE FINDINGS:
   - Include a pertinent negative ONLY if it answers the clinical question (explicit or deduced).
   - E.g.: question "rule out PE" → "No evidence of PE" is relevant.
   - NEVER list normality as filler.

7. COMPARISON WITH PRIOR STUDIES:
   - If changes are mentioned, include them WITHIN the corresponding finding's point, qualifying evolution (increase/decrease/stability).

FUNDAMENTAL PRINCIPLE — DESCRIBE, DO NOT DIAGNOSE:
The conclusion DESCRIBES radiological findings. It does NOT issue diagnoses, etiological interpretations, or clinical judgments. The radiologist describes what they see; the clinician decides what it means.
- CORRECT: "Interval increase of the segment VII hepatic lesion (from 2 to 3.5 cm compared to prior study)."
- INCORRECT: "Hepatic tumor progression." (this is a diagnosis/interpretation)
- CORRECT: "Right lower lobe consolidation with air bronchograms."
- INCORRECT: "Right lower lobe pneumonia." (this is a diagnosis)
- CORRECT: "New 25 mm hypodense focal hepatic lesion in segment VI."
- INCORRECT: "New hepatic metastasis." (this is a diagnosis)

FORBIDDEN:
- Issuing diagnoses or etiological interpretations: "tumor progression", "metastasis", "pneumonia", "consistent with X", "suggestive of X", "in keeping with X", "indicative of X", "adenoma", "hemorrhagic cyst", "angiomyolipoma", "hemangioma". Instead, describe the pure radiological finding (size, density, location).
- NEVER characterize or classify lesions based on density, signal, or enhancement values. If the radiologist dictates "18 mm adrenal lesion with density of 20 HU", the conclusion says exactly that, NOT "adenoma", NOT "consistent with adenoma". The radiologist reports data; the clinician interprets.
- Assuming lesion nature: "malignant lesion", "tumor", "metastasis", "recurrence", "spread", "adenoma", "lipoma", "complicated cyst". Instead: "lesion", "nodule", "mass", "nodular image", "pathological enhancement".
- Inferring progression or therapeutic response: "tumor progression", "partial response", "stable disease". Instead: "interval increase in lesion size", "interval decrease in size", "no significant change compared to prior".
- Recommending clinical actions ("biopsy recommended", "further evaluation with MRI").
- Classifying according to scales (BI-RADS, Lung-RADS, PI-RADS, TNM).
- Causal inferences ("secondary to...", "likely related to...", "in the context of...").
- Issuing prognoses ("concerning finding", "good prognosis", "unfavorable evolution").
- Adding information not present in the findings.
- Filler phrases ("noted", "identified", "visualized", "presence of").

EXCEPTION: Use diagnostic terminology ONLY if it is explicitly stated in the radiologist's dictated findings (e.g., if findings say "fracture", you may say "fracture"; if findings say "nodule", do not say "tumor").

If no relevant findings: "${hasClinical ? "No significant findings regarding the clinical question." : "Examination within normal limits."}"

FORMAT:
- Numbered points (1. 2. 3. 4.). Plain text. Maximum 4.
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
    const label = lang === "es" ? "Datos clínicos / pregunta clínica" : lang === "pt" ? "Dados clínicos / pergunta clínica" : "Clinical data / clinical question";
    userMsg += `${label}:\n${params.clinicalInfo}\n\n`;
  }
  const findingsLabel = lang === "es" ? "Hallazgos" : lang === "pt" ? "Achados" : "Findings";
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
      : lang === "pt"
      ? "Não há recomendações adicionais."
      : "No additional recommendations.";
    return { system: "", user: noRecs };
  }

  const numberedCatalogue = params.recommendations.map((r, i) => {
    const gPart = r.guideline ? ` (${r.guideline})` : "";
    return `[R${i + 1}] Trigger: "${r.trigger}" → Recommendation: "${r.recommendation}"${gPart}`;
  }).join("\n");

  const langName = l; // e.g. "español", "English", "português"

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto emitiendo recomendaciones de seguimiento.

CATÁLOGO DE RECOMENDACIONES:
${numberedCatalogue}

REGLAS:
1. SOLO puedes emitir recomendaciones del catálogo anterior. CADA recomendación DEBE corresponder a una entrada [Rn].
2. Para emitir una recomendación, el hallazgo debe coincidir SEMÁNTICAMENTE con el trigger de esa entrada. Coincidencia = MISMO órgano/estructura Y MISMO tipo de hallazgo.
3. NUNCA inventes, parafrasees ni modifiques recomendaciones. Usa la redacción EXACTA del catálogo.
4. NUNCA apliques un trigger de un órgano a un hallazgo de otro órgano.
5. NUNCA sugieras procedimientos invasivos a menos que el catálogo lo diga.
6. Indica el hallazgo EXACTO del informe que activó cada recomendación.
7. El campo "translated" debe contener la recomendación traducida al ${langName}. Si el catálogo ya está en ${langName}, copia el texto exacto.

MATCHING FLEXIBLE:
- Si un hallazgo coincide CLARAMENTE con un trigger (mismo órgano, mismo tipo de hallazgo): inclúyelo con confianza "high".
- Si un hallazgo es SIMILAR pero no exacto a un trigger (mismo espectro de enfermedad, mismo órgano, pero el hallazgo es ligeramente diferente al trigger — ej: trigger "nódulo pulmonar" y hallazgo "opacidad pulmonar nodular"): inclúyelo con confianza "medium".
- Si no hay relación clara: NO lo incluyas.

Si no hay coincidencias, responde: []

RESPONDE EN JSON:
[{"catalogue_id": "R1", "recommendation": "texto exacto del catálogo", "translated": "recomendación traducida al ${langName}", "guideline": "nombre guía", "triggering_finding": "cita textual del hallazgo", "confidence": "high|medium"}]`;
  } else {
    system = `You are an expert radiologist issuing follow-up recommendations.

RECOMMENDATION CATALOGUE:
${numberedCatalogue}

RULES:
1. You may ONLY issue recommendations from the catalogue above. EVERY recommendation MUST correspond to an [Rn] entry.
2. To issue a recommendation, the finding must SEMANTICALLY match that entry's trigger. Match = SAME organ/structure AND SAME type of finding.
3. NEVER invent, paraphrase or modify recommendations. Use the EXACT wording from the catalogue.
4. NEVER apply a trigger from one organ to a finding in a different organ.
5. NEVER suggest invasive procedures unless the catalogue explicitly says so.
6. Indicate the EXACT finding from the report that triggered each recommendation.
7. The "translated" field must contain the recommendation translated to ${langName}. If the catalogue is already in ${langName}, copy the exact text.

FLEXIBLE MATCHING:
- If a finding CLEARLY matches a trigger (same organ, same finding type): include with confidence "high".
- If a finding is SIMILAR but not exact to a trigger (same disease spectrum, same organ, but finding slightly different from trigger — e.g., trigger "pulmonary nodule" and finding "nodular pulmonary opacity"): include with confidence "medium".
- If there is no clear relationship: do NOT include it.

If no matches, respond: []

RESPOND IN JSON:
[{"catalogue_id": "R1", "recommendation": "exact catalogue text", "translated": "recommendation translated to ${langName}", "guideline": "guideline name", "triggering_finding": "verbatim finding quote", "confidence": "high|medium"}]`;
  }

  const findLabel = lang === "es" ? "Hallazgos del informe a evaluar" : lang === "pt" ? "Achados do relatório a avaliar" : "Report findings to evaluate";
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
