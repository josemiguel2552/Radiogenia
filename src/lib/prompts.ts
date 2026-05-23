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
    free: `Reescribe los hallazgos con estilo radiológico profesional, fluido y bien estructurado. Mejoras permitidas:
- Mejorar la fluidez y legibilidad de las frases.
- Reorganizar el orden DENTRO de cada sección para mayor claridad (ej: primero el dato principal, luego descriptores).
- Usar vocabulario radiológico profesional y preciso.
- Eliminar repeticiones y redundancias.
- Unificar el estilo entre secciones (concordancia de tiempo verbal, estructura paralela).
- Corregir gramática, ortografía y terminología.
PROHIBIDO: añadir hallazgos, diagnósticos, interpretaciones o información que NO esté en el dictado. PROHIBIDO: omitir cualquier hallazgo, medida, lateralidad o dato clínico del dictado. Cada dato dictado DEBE aparecer en la salida. Si el radiólogo dijo "12 mm", no escribas "1.2 cm" ni redondees. Si dijo "derecho", no cambies a "izquierdo". Mantén la INTEGRIDAD CLÍNICA absoluta mientras mejoras la FORMA.`,
  },
  en: {
    none: "Transcribe dictated findings literally. Do not change any words. Only place them in the correct section.",
    light: "You may correct grammar, syntax, and medical terminology errors (e.g. 'supracolicular'→'supraclavicular', 'arthrosis' in abdomen→'hydronephrosis'). Use the correct anatomical/pathological term based on clinical context and modality. Do not change any clinical data, measurements or descriptors.",
    free: `Rewrite findings in professional, fluent, well-structured radiological style. Allowed improvements:
- Improve sentence flow and readability.
- Reorganize order WITHIN each section for clarity (e.g., main finding first, then descriptors).
- Use precise, professional radiological vocabulary.
- Remove repetitions and redundancies.
- Unify style across sections (verb tense consistency, parallel structure).
- Correct grammar, spelling, and terminology.
FORBIDDEN: adding findings, diagnoses, interpretations, or information NOT in the dictation. FORBIDDEN: omitting any finding, measurement, laterality, or clinical data from the dictation. Every dictated data point MUST appear in the output. If the radiologist said "12 mm", do not write "1.2 cm" or round. If they said "right", do not change to "left". Maintain ABSOLUTE CLINICAL INTEGRITY while improving the FORM.`,
  },
  pt: {
    none: "Transcreva os achados ditados de forma literal. Não mude nenhuma palavra. Apenas coloque-os na seção correta.",
    light: "Pode corrigir gramática, ordem sintática e erros de terminologia médica (ex: 'supracolicular'→'supraclavicular'). Use o termo anatômico/patológico correto de acordo com o contexto clínico e a modalidade. Não mude nenhum dado clínico, medida ou descritor.",
    free: `Reescreva os achados com estilo radiológico profissional, fluido e bem estruturado. Melhorias permitidas:
- Melhorar a fluidez e legibilidade das frases.
- Reorganizar a ordem DENTRO de cada seção para maior clareza (ex: primeiro o achado principal, depois descritores).
- Usar vocabulário radiológico profissional e preciso.
- Eliminar repetições e redundâncias.
- Unificar o estilo entre seções (concordância verbal, estrutura paralela).
- Corrigir gramática, ortografia e terminologia.
PROIBIDO: adicionar achados, diagnósticos, interpretações ou informação que NÃO esteja no ditado. PROIBIDO: omitir qualquer achado, medida, lateralidade ou dado clínico do ditado. Cada dado ditado DEVE aparecer na saída. Se o radiologista disse "12 mm", não escreva "1,2 cm" nem arredonde. Se disse "direito", não mude para "esquerdo". Mantenha a INTEGRIDADE CLÍNICA absoluta enquanto melhora a FORMA.`,
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
- NUNCA fuerces un hallazgo en una sección anatómica incorrecta. La sección debe corresponder ANATÓMICAMENTE al hallazgo (ej: "Tráquea y bronquios" NO es tiroides; nódulos tiroideos van a "Otros hallazgos" si no hay sección de tiroides).
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
- NEVER force a finding into an incorrect anatomical section. The section must ANATOMICALLY match the finding (e.g., "Trachea and bronchi" is NOT thyroid; thyroid nodules go to "Additional findings" if no thyroid section exists).
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
- NUNCA force um achado em uma seção anatômica incorreta. A seção deve corresponder ANATOMICAMENTE ao achado (ex: "Traqueia e brônquios" NÃO é tireoide; nódulos tireoidianos vão para "Outros achados" se não houver seção de tireoide).
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
- NUNCA fuerces un hallazgo en una sección anatómica incorrecta. La sección debe corresponder ANATÓMICAMENTE al hallazgo (ej: "Tráquea y bronquios" NO es tiroides; nódulos tiroideos van a "Otros hallazgos" si no hay sección de tiroides).
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
- NEVER force a finding into an incorrect anatomical section. The section must ANATOMICALLY match the finding (e.g., "Trachea and bronchi" is NOT thyroid; thyroid nodules go to "Additional findings" if no thyroid section exists).
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
- NUNCA force um achado em uma seção anatômica incorreta. A seção deve corresponder ANATOMICAMENTE ao achado (ex: "Traqueia e brônquios" NÃO é tireoide; nódulos tireoidianos vão para "Outros achados" se não houver seção de tireoide).
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
   Si un hallazgo dictado NO encaja claramente en NINGUNA sección anatómica del template, DEBES añadir una sección final llamada "Otros hallazgos:" al final del informe con TODOS los hallazgos huérfanos agrupados.
   - NUNCA omitas un hallazgo dictado por falta de sección adecuada.
   - NUNCA fuerces un hallazgo en una sección anatómica incorrecta solo para evitar crear "Otros hallazgos". Cada hallazgo DEBE ir en la sección que corresponde ANATÓMICAMENTE. Si la estructura anatómica del hallazgo NO es la estructura de la sección, NO lo pongas ahí.
   - EJEMPLOS de hallazgos que VAN a "Otros hallazgos": nódulos tiroideos en un template de tórax sin sección de tiroides, hallazgos en partes blandas en un template óseo, adenopatías en un template que no las incluye, hallazgos tiroideos en una sección de tráquea, hallazgos mamarios en un template torácico, etc.
   - La sección debe corresponderse ANATÓMICAMENTE con el hallazgo. "Tráquea y bronquios" NO es tiroides. "Pulmón" NO es pleura si hay sección de pleura. "Hígado" NO es vesícula si hay sección de vesícula.
   - Si TODOS los hallazgos encajan en secciones existentes, NO añadas esta sección.

FORMATO DE SALIDA — ESTRICTO, SIN EXCEPCIONES:
- Cada sección es exactamente UNA línea con el formato: "Sección anatómica: Descripción."
- Primera letra de la sección en MAYÚSCULA, el resto en minúsculas. Dos puntos. Un espacio. Descripción. Punto final.
- Una línea por sección. Sin líneas en blanco entre secciones. Sin saltos de línea dentro de una sección.
- Si una sección tiene MÚLTIPLES hallazgos, sepáralos con PUNTOS (.), NUNCA con punto y coma (;). Ej: "Hígado: Lesión hipodensa de 15 mm en segmento VI. Quiste simple de 8 mm en segmento III."
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
   Se um achado ditado NÃO se encaixa claramente em NENHUMA seção anatômica do template, você DEVE adicionar uma seção final chamada "Outros achados:" ao final do laudo com TODOS os achados órfãos agrupados.
   - NUNCA omita um achado ditado por falta de seção adequada.
   - NUNCA force um achado em uma seção anatômica incorreta apenas para evitar criar "Outros achados". Cada achado DEVE ir na seção que corresponde ANATOMICAMENTE. Se a estrutura anatômica do achado NÃO é a estrutura da seção, NÃO o coloque lá.
   - EXEMPLOS de achados que VÃO para "Outros achados": nódulos tireoidianos em um template de tórax sem seção de tireoide, achados em partes moles em um template ósseo, linfonodomegalias em um template que não as inclui, achados tireoidianos em uma seção de traqueia, achados mamários em um template torácico, etc.
   - A seção deve corresponder ANATOMICAMENTE ao achado. "Traqueia e brônquios" NÃO é tireoide. "Pulmão" NÃO é pleura se houver seção de pleura. "Fígado" NÃO é vesícula se houver seção de vesícula.
   - Se TODOS os achados se encaixam em seções existentes, NÃO adicione esta seção.

FORMATO DE SAÍDA — ESTRITO, SEM EXCEÇÕES:
- Cada seção é exatamente UMA linha com o formato: "Seção anatômica: Descrição."
- Primeira letra da seção em MAIÚSCULA, o restante em minúsculas. Dois pontos. Um espaço. Descrição. Ponto final.
- Uma linha por seção. Sem linhas em branco entre seções. Sem quebras de linha dentro de uma seção.
- Se uma seção tem MÚLTIPLOS achados, separe-os com PONTOS (.), NUNCA com ponto e vírgula (;). Ex: "Fígado: Lesão hipodensa de 15 mm no segmento VI. Cisto simples de 8 mm no segmento III."
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
   If a dictated finding does NOT clearly fit ANY anatomical section of the template, you MUST add a final section called "Additional findings:" at the end of the report with ALL orphan findings grouped together.
   - NEVER omit a dictated finding due to lack of a matching section.
   - NEVER force a finding into an incorrect anatomical section just to avoid creating "Additional findings". Each finding MUST go in the section that corresponds ANATOMICALLY. If the anatomical structure of the finding is NOT the structure of the section, do NOT place it there.
   - EXAMPLES of findings that GO to "Additional findings": thyroid nodules in a chest template without a thyroid section, soft tissue findings in a bone template, lymphadenopathy in a template that doesn't include it, thyroid findings in a "trachea and bronchi" section, breast findings in a thoracic template, etc.
   - The section must ANATOMICALLY match the finding. "Trachea and bronchi" is NOT thyroid. "Lung" is NOT pleura if there is a pleura section. "Liver" is NOT gallbladder if there is a gallbladder section.
   - If ALL findings fit existing sections, do NOT add this section.

OUTPUT FORMAT — STRICT, NO EXCEPTIONS:
- Each section is exactly ONE line with the format: "Anatomical section: Description."
- First letter of section name in UPPERCASE, rest in lowercase. Colon. One space. Description. Period.
- One line per section. No blank lines between sections. No line breaks within a section.
- If a section has MULTIPLE findings, separate them with PERIODS (.), NEVER with semicolons (;). E.g.: "Liver: 15 mm hypodense lesion in segment VI. Simple 8 mm cyst in segment III."
- Do NOT use asteriscos (*), hashes (#), dashes (-), bullets, bold or any markdown formatting.
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

/* ── Cardiac MRI structured report instructions ──────────── */

function cardiacMriInstructions(lang: OutputLanguage, techniques: string[]): string {
  const hasContrast = techniques.includes("contrast");
  const hasMapping = techniques.includes("mapping");
  const hasStress = techniques.includes("stress");
  const hasStrain = techniques.includes("strain");

  if (lang === "es") {
    return `
INSTRUCCIONES ESPECIALES — INFORME DE RM CARDÍACA:

Este es un informe de RM cardíaca. IGNORA el template de secciones genérico y en su lugar estructura el informe con las siguientes secciones, EN ESTE ORDEN EXACTO:

1. **Técnicas realizadas:**
   Lista las técnicas de imagen según lo que el radiólogo haya indicado. Incluye como mínimo:
   - Sincronización vectorcardiográfica
   - Imágenes de localización scout
   - Cine SSFP (balanced steady-state free precession) en múltiples planos
   ${hasContrast ? "- Realce tardío miocárdico (LGE) en múltiples planos\n   - Administración intravenosa de gadolinio" : ""}
   ${hasMapping ? "- Mapping T1 y T2" : ""}
   ${hasStress ? "- Perfusión miocárdica en reposo y estrés" : ""}
   ${hasStrain ? "- Feature-tracking / Strain miocárdico" : ""}

2. **Calidad del examen:** (según dictado, si no se menciona: "Adecuada")
3. **Intensidad de campo:** (si dictado, ej: 1.5T o 3T)
4. **SC (BSA):** Calcular automáticamente a partir de peso y talla si están dictados, usando fórmula de Du Bois: BSA = 0.007184 × peso(kg)^0.425 × talla(cm)^0.725

5. **Ventrículo izquierdo (VI):**
   Formatear así, cada valor en su propia línea:
   - Grosor pared anteroseptal: ___ mm (normal: ≤12 mm varón; ≤10 mm mujer)
   - Grosor pared inferolateral: ___ mm (normal: ≤11 mm varón; ≤10 mm mujer)
   - Diámetro telediastólico VI: ___ mm
   - Índice diámetro telediastólico VI: ___ mm/m² (normal: ≤30 mm/m² varón; ≤32 mm/m² mujer)
   - Volumen telediastólico (VTD): ___ ml (normal: 83-207 ml varón; 70-155 ml mujer)
   - Índice VTD: ___ ml/m² (normal: 47-107 ml/m² varón; 45-93 ml/m² mujer)
   - Volumen telesistólico (VTS): ___ ml (normal: 19-88 ml varón; 15-64 ml mujer)
   - Índice VTS: ___ ml/m² (normal: 11-47 ml/m² varón; 10-38 ml/m² mujer)
   - Volumen sistólico (VS): ___ ml (normal: 55-127 ml varón; 47-99 ml mujer)  ← CALCULAR: VS = VTD - VTS
   - Gasto cardíaco: ___ L/min (FC ___ lpm)  ← CALCULAR: GC = VS × FC / 1000
   - Fracción de eyección (FE): ___% (normal: 51-76% varón; 52-79% mujer)  ← CALCULAR: FE = VS/VTD × 100
   - Masa VI: ___ g (normal: 57-152 g varón; 43-103 g mujer)
   - Índice masa VI: ___ g/m² (normal: 36-75 g/m² varón; 30-59 g/m² mujer)  ← CALCULAR: masa/BSA
   - Motilidad regional VI: (según dictado)

   CÁLCULOS AUTOMÁTICOS: Si el radiólogo dicta VTD y VTS, CALCULA automáticamente VS, FE y GC. Si dicta masa y BSA está disponible, CALCULA el índice de masa. Si dicta volúmenes y BSA, CALCULA los índices volumétricos.

6. **Ventrículo derecho (VD):**
   - Diámetro telediastólico VD: ___ mm
   - Volumen telediastólico (VTD): ___ ml (normal: 87-244 ml varón; 68-176 ml mujer)
   - Índice VTD: ___ ml/m² (normal: 53-123 ml/m² varón; 48-104 ml/m² mujer)
   - Volumen telesistólico (VTS): ___ ml (normal: 29-117 ml varón; 20-80 ml mujer)
   - Índice VTS: ___ ml/m² (normal: 17-59 ml/m² varón; 13-48 ml/m² mujer)
   - Volumen sistólico (VS): ___ ml (normal: 43-146 ml varón; 39-109 ml mujer)  ← CALCULAR: VS = VTD - VTS
   - Fracción de eyección (FE): ___% (normal: 42-72% varón; 46-74% mujer)  ← CALCULAR: FE = VS/VTD × 100
   - Motilidad regional VD: (según dictado)

7. **Aurículas:**
   - Diámetro transversal AI (4 cámaras): ___ mm (normal: 33-53 varón; 31-51 mujer)
   - Índice diámetro AI: ___ mm/m² (normal: 16-29 varón; 18-32 mujer)
   - Diámetro transversal AD (4 cámaras): ___ mm (normal: 37-59 varón; 32-54 mujer)
   - Índice diámetro AD: ___ mm/m² (normal: 21-32 varón; 20-34 mujer)

8. **Pericardio:**
   - Grosor pericárdico (normal 0,7-2,0 mm; anormal >4 mm): ___
   - Derrame pericárdico: ___

9. **Morfología y función valvular:**
   Describir según dictado. Si no se menciona: "Sin alteraciones valvulares significativas."

${hasContrast ? `10. **Realce tardío (LGE):**
   Describir patrón, localización, extensión y tipo (transmural, subendocárdico, mesocárdico, subepicárdico). Si no hay realce: "Sin captación patológica de gadolinio en el miocardio."
` : ""}
${hasMapping ? `**Mapping:**
   - T1 nativo miocárdico VI (Base: ___ ms; Medio: ___ ms; Apex: ___ ms) — rango normal para la secuencia
   - T2 nativo miocárdico VI (Base: ___ ms; Medio: ___ ms; Apex: ___ ms) — rango normal para la secuencia
   - VEC (ECV) calculado VI (Base: ___%; Medio: ___%; Apex: ___%) — rango normal para la secuencia
   Indicar hematocrito si disponible.
` : ""}
${hasStress ? `**Perfusión de estrés:**
   Describir defectos de perfusión en reposo y estrés, localización por segmentos, reversibilidad.
` : ""}
${hasStrain ? `**Strain miocárdico:**
   - GLS (strain longitudinal global): ___%
   - Valores regionales si disponibles
` : ""}

REGLA DE CÁLCULOS: Cuando el radiólogo dicta los valores brutos (VTD, VTS, peso, talla, masa, FC), DEBES calcular automáticamente todos los valores derivados:
- VS = VTD - VTS
- FE = (VS / VTD) × 100 (redondear a entero)
- Índices = valor / BSA (redondear a 1 decimal)
- BSA (Du Bois) = 0.007184 × peso^0.425 × talla^0.725
- GC = VS × FC / 1000 (redondear a 1 decimal)

Incluye los rangos normales según sexo entre paréntesis junto a cada valor, SIEMPRE.

FORMATO DE SALIDA: NO uses formato markdown (**, #, etc.). Usa texto plano con cada valor en su propia línea. Las secciones se separan con una línea en blanco y el nombre de la sección seguido de dos puntos.`;
  }

  if (lang === "pt") {
    return `
INSTRUÇÕES ESPECIAIS — LAUDO DE RM CARDÍACA:

Este é um laudo de RM cardíaca. IGNORE o template de seções genérico e estruture o laudo com as seguintes seções, NESTA ORDEM EXATA:

1. **Técnicas realizadas:** (listar técnicas de imagem)
2. **Qualidade do exame**
3. **Intensidade de campo**
4. **SC (BSA):** Calcular automaticamente (Du Bois: BSA = 0.007184 × peso^0.425 × altura^0.725)

5. **Ventrículo esquerdo (VE):** com grosuras, volumes, FE, massa e índices — incluir faixas normais por sexo
6. **Ventrículo direito (VD):** com volumes, FE e índices
7. **Átrios:** diâmetros e índices de AE e AD
8. **Pericárdio:** espessura e derrame
9. **Morfologia e função valvular**
${hasContrast ? "10. **Realce tardio (LGE):** padrão, localização, extensão, tipo" : ""}
${hasMapping ? "**Mapping:** valores T1, T2, VEC por segmentos" : ""}
${hasStress ? "**Perfusão de estresse:** defeitos em repouso/estresse, reversibilidade" : ""}
${hasStrain ? "**Strain miocárdico:** GLS global e valores regionais" : ""}

REGRA DE CÁLCULOS AUTOMÁTICOS: VS = VTD - VTS; FE = VS/VTD × 100; Índices = valor/BSA; GC = VS × FC / 1000.
Sempre inclua faixas normais por sexo entre parênteses.`;
  }

  // English
  return `
SPECIAL INSTRUCTIONS — CARDIAC MRI REPORT:

This is a cardiac MRI report. IGNORE the generic section template and structure the report with the following sections, IN THIS EXACT ORDER:

1. **Techniques Performed:** (list imaging techniques)
   Include at minimum:
   - Vectorcardiographic gating
   - Scout images for cardiac localization
   - Balanced steady-state free precession cine imaging in multiple planes
   ${hasContrast ? "- Myocardial delayed enhancement imaging in multiple planes\n   - Intravenous administration of gadolinium contrast" : ""}
   ${hasMapping ? "- T1 and T2 mapping" : ""}
   ${hasStress ? "- Myocardial perfusion at rest and stress" : ""}
   ${hasStrain ? "- Feature-tracking / Myocardial strain" : ""}

2. **Exam Quality:** (from dictation, default: "Good")
3. **Field strength:** (e.g. 1.5T or 3T)
4. **BSA:** Auto-calculate from weight and height using Du Bois: BSA = 0.007184 × weight(kg)^0.425 × height(cm)^0.725

5. **Left Ventricle (LV):**
   Each value on its own line:
   - Anteroseptal wall thickness: ___ mm (normal: ≤12mm male; ≤10mm female)
   - Inferolateral wall thickness: ___ mm (normal: ≤11mm male; ≤10mm female)
   - LV End-diastolic dimension: ___ mm
   - LV End-diastolic dimension index: ___ mm/m² (normal: ≤30 mm/m² male; ≤32 mm/m² female)
   - LV End-diastolic volume (EDV): ___ ml (normal: 83-207 ml male; 70-155 ml female)
   - LV EDV index: ___ ml/m² (normal: 47-107 ml/m² male; 45-93 ml/m² female)
   - LV End-systolic volume (ESV): ___ ml (normal: 19-88 ml male; 15-64 ml female)
   - LV ESV index: ___ ml/m² (normal: 11-47 ml/m² male; 10-38 ml/m² female)
   - LV Stroke volume (SV): ___ ml (normal: 55-127 ml male; 47-99 ml female)  ← CALCULATE: SV = EDV - ESV
   - Cardiac output: ___ L/min (HR ___ bpm)  ← CALCULATE: CO = SV × HR / 1000
   - LV Ejection fraction (EF): ___% (normal: 51-76% male; 52-79% female)  ← CALCULATE: EF = SV/EDV × 100
   - LV mass: ___ g (normal: 57-152 g male; 43-103 g female)
   - LV mass index: ___ g/m² (normal: 36-75 g/m² male; 30-59 g/m² female)  ← CALCULATE: mass/BSA
   - LV regional wall motion: (from dictation)

6. **Right Ventricle (RV):**
   - RV End-diastolic dimension: ___ mm
   - RV EDV: ___ ml (normal: 87-244 ml male; 68-176 ml female)
   - RV EDV index: ___ ml/m² (normal: 53-123 ml/m² male; 48-104 ml/m² female)
   - RV ESV: ___ ml (normal: 29-117 ml male; 20-80 ml female)
   - RV ESV index: ___ ml/m² (normal: 17-59 ml/m² male; 13-48 ml/m² female)
   - RV SV: ___ ml (normal: 43-146 ml male; 39-109 ml female)  ← CALCULATE: SV = EDV - ESV
   - RV EF: ___% (normal: 42-72% male; 46-74% female)  ← CALCULATE: EF = SV/EDV × 100
   - RV regional wall motion: (from dictation)

7. **Atria:**
   - LA dimension (4-chamber transverse): ___ mm (normal: 33-53 male; 31-51 female)
   - LA dimension index: ___ mm/m² (normal: 16-29 male; 18-32 female)
   - RA dimension (4-chamber transverse): ___ mm (normal: 37-59 male; 32-54 female)
   - RA dimension index: ___ mm/m² (normal: 21-32 male; 20-34 female)

8. **Pericardium:**
   - Pericardial thickness (normal 0.7-2.0mm, abnormal >4mm): ___
   - Pericardial effusion: ___

9. **Valvular morphology and function:**
   From dictation. If unmentioned: "No significant valvular abnormality."

${hasContrast ? `10. **Late Gadolinium Enhancement (LGE):**
   Describe pattern, location, extent, and type (transmural, subendocardial, mesocardial, subepicardial). If none: "No pathological myocardial late gadolinium enhancement."
` : ""}
${hasMapping ? `**Mapping:**
   - Native myocardial T1 values (Base: ___ ms; Mid: ___ ms; Apex: ___ ms) — local normal ranges
   - Native T2 values (Base: ___ ms; Mid: ___ ms; Apex: ___ ms) — local normal ranges
   - Calculated ECV (Base: ___%; Mid: ___%; Apex: ___%) — local normal ranges
   State hematocrit if available.
` : ""}
${hasStress ? `**Stress Perfusion:**
   Describe perfusion defects at rest and stress, segmental location, reversibility.
` : ""}
${hasStrain ? `**Myocardial Strain:**
   - GLS (global longitudinal strain): ___%
   - Regional values if available
` : ""}

AUTO-CALCULATION RULE: When the radiologist dictates raw values (EDV, ESV, weight, height, mass, HR), you MUST auto-calculate all derived values:
- SV = EDV - ESV
- EF = (SV / EDV) × 100 (round to integer)
- Indices = value / BSA (round to 1 decimal)
- BSA (Du Bois) = 0.007184 × weight^0.425 × height^0.725
- CO = SV × HR / 1000 (round to 1 decimal)

Always include sex-specific normal ranges in parentheses next to each value.

OUTPUT FORMAT: Do NOT use markdown formatting (**, #, etc.). Use plain text with each value on its own line. Sections separated by blank line and section name followed by colon.`;
}

function cardiacConclusionInstructions(lang: OutputLanguage): string {
  if (lang === "es") {
    return `
INSTRUCCIONES ESPECIALES — CONCLUSIÓN DE RM CARDÍACA:

Para RM cardíaca, la conclusión debe seguir este formato específico en lugar del formato estándar:

RESUMEN DE HALLAZGOS:
Enumerar los hallazgos principales como puntos numerados:
1. Estado del VI: tamaño, función sistólica, FE, motilidad regional.
2. Estado del VD: tamaño, función sistólica, FE, motilidad regional. Criterios DAVD si aplica.
3. Realce tardío / cicatriz / infarto (si se realizó LGE).
4. Mapping (T1, T2, ECV) si se realizó.
5. Perfusión si se realizó.
6. Hallazgos adicionales relevantes.

INTERPRETACIÓN:
Un párrafo final que sintetice los hallazgos en lenguaje clínico conciso, indicando si el estudio es normal o patológico y respondiendo a la pregunta clínica.`;
  }
  if (lang === "pt") {
    return `
INSTRUÇÕES ESPECIAIS — CONCLUSÃO DE RM CARDÍACA:

Para RM cardíaca, a conclusão deve seguir este formato:

RESUMO DOS ACHADOS:
Listar os achados principais como pontos numerados.

INTERPRETAÇÃO:
Parágrafo final sintetizando os achados em linguagem clínica concisa.`;
  }
  return `
SPECIAL INSTRUCTIONS — CARDIAC MRI CONCLUSION:

For cardiac MRI, the conclusion must follow this specific format instead of the standard format:

SUMMARY OF FINDINGS:
List main findings as numbered points:
1. LV status: size, systolic function, EF, regional wall motion.
2. RV status: size, systolic function, EF, regional wall motion. ARVD criteria if applicable.
3. Late gadolinium enhancement / scar / infarction (if LGE performed).
4. Mapping (T1, T2, ECV) if performed.
5. Perfusion if performed.
6. Additional relevant findings.

INTERPRETATION:
A final paragraph synthesizing findings in concise clinical language, stating whether the study is normal or abnormal and answering the clinical question.`;
}

/* ── Exported prompt builders ──────────────────────────────── */

function dictationOnlySystemPrompt(lang: OutputLanguage, modality: string): string {
  const l = LANGUAGE_LABEL[lang];
  if (lang === "es") {
    return `Eres un radiólogo experto redactando informes estructurados. Tu tarea es tomar el dictado del radiólogo y distribuirlo en las secciones anatómicas del template proporcionado.

IDIOMA DE SALIDA: ${l}. TODO el informe debe estar en ${l}.
IMPORTANTE: El dictado puede estar en CUALQUIER idioma. Independientemente del idioma de entrada, tu salida COMPLETA debe estar en ${l}. Traduce todo el contenido al ${l}.

MODALIDAD DEL ESTUDIO: ${modality}

⚠️⚠️⚠️ MODO SOLO DICTADO — INSTRUCCIÓN PRINCIPAL, ANULA TODAS LAS DEMÁS:
El informe SOLO contiene lo que el radiólogo dictó. NO escribas NADA que no haya sido dictado.

REGLAS (sin excepciones):
1. Escribe ÚNICAMENTE las secciones del template donde el radiólogo dictó un hallazgo (positivo o negativo explícito).
2. Las secciones NO mencionadas en el dictado se OMITEN por completo — NO las incluyas en la salida.
3. NO escribas frases de normalidad para secciones no mencionadas. Si el radiólogo no mencionó un órgano/estructura, esa sección NO EXISTE en tu respuesta.
4. NO inventes hallazgos patológicos ni diagnósticos que el radiólogo no haya dictado.
5. NO añadas diagnósticos, caracterizaciones ni interpretaciones que el radiólogo no haya dictado.
6. Ignora completamente la sección "CONCLUSIÓN" del template — NO la incluyas.
7. HALLAZGOS SIN SECCIÓN — OBLIGATORIO:
   Si un hallazgo dictado NO encaja claramente en NINGUNA sección anatómica del template, DEBES añadir "Otros hallazgos:" al final con TODOS los hallazgos huérfanos.
   - NUNCA omitas un hallazgo dictado por falta de sección adecuada.
   - NUNCA fuerces un hallazgo en una sección anatómica incorrecta solo para evitar crear "Otros hallazgos". Cada hallazgo DEBE ir en la sección que corresponde ANATÓMICAMENTE. Si la estructura anatómica del hallazgo NO es la estructura de la sección, NO lo pongas ahí.
   - EJEMPLOS de hallazgos que VAN a "Otros hallazgos": nódulos tiroideos en un template de tórax sin sección de tiroides, hallazgos en partes blandas en un template óseo, adenopatías en un template que no las incluye, hallazgos tiroideos en una sección de tráquea, hallazgos mamarios en un template torácico, etc.
   - La sección debe corresponderse ANATÓMICAMENTE con el hallazgo. "Tráquea y bronquios" NO es tiroides. "Pulmón" NO es pleura si hay sección de pleura. "Hígado" NO es vesícula si hay sección de vesícula.
   - Si TODOS los hallazgos encajan en secciones existentes, NO añadas esta sección.

⚠️⚠️ REGLA DE CERO OMISIONES — ABSOLUTA:
- CADA hallazgo del dictado DEBE aparecer en el informe. NUNCA omitas un hallazgo dictado.
- Antes de finalizar, VERIFICA que cada dato del dictado aparece en tu respuesta.

HALLAZGOS NEGATIVOS DICTADOS:
Cuando el radiólogo dicta explícitamente la AUSENCIA de un hallazgo (ej: "no masa colónica", "sin evidencia de TEP"), esto es un hallazgo negativo relevante y DEBE incluirse.

FRASES ABSOLUTAMENTE PROHIBIDAS:
- "no valorado", "no evaluado", "no analizado", "no descrito", "no mencionado", "not assessed", "not evaluated".

FORMATO DE SALIDA — ESTRICTO:
- Cada sección es UNA línea: "Sección anatómica: Descripción."
- Primera letra en MAYÚSCULA. Dos puntos. Espacio. Descripción. Punto final.
- Si hay múltiples hallazgos en una sección, sepáralos con PUNTOS (.), NUNCA con punto y coma (;).
- Sin líneas en blanco. Sin markdown. Sin numeración. Sin encabezados.
- TRADUCE los nombres de las secciones al ${l}.`;
  }

  if (lang === "pt") {
    return `Você é um radiologista experiente redigindo laudos estruturados. Sua tarefa é pegar o ditado do radiologista e distribuí-lo nas seções anatômicas do template fornecido.

IDIOMA DE SAÍDA: ${l}. TODO o laudo deve estar em ${l}.
IMPORTANTE: O ditado pode estar em QUALQUER idioma. Independentemente do idioma de entrada, toda a sua saída DEVE estar em ${l}. Traduza todo o conteúdo para ${l}.

MODALIDADE DO ESTUDO: ${modality}

⚠️⚠️⚠️ MODO SOMENTE DITADO — INSTRUÇÃO PRINCIPAL, ANULA TODAS AS OUTRAS:
O laudo contém APENAS o que o radiologista ditou. NÃO escreva NADA que não tenha sido ditado.

REGRAS (sem exceções):
1. Escreva SOMENTE as seções do template onde o radiologista ditou um achado (positivo ou negativo explícito).
2. As seções NÃO mencionadas no ditado são OMITIDAS completamente — NÃO as inclua na saída.
3. NÃO escreva frases de normalidade para seções não mencionadas. Se o radiologista não mencionou um órgão/estrutura, essa seção NÃO EXISTE na sua resposta.
4. NÃO invente achados patológicos nem diagnósticos que o radiologista não tenha ditado.
5. NÃO adicione diagnósticos, caracterizações nem interpretações que o radiologista não tenha ditado.
6. Ignore completamente a seção "CONCLUSÃO" do template — NÃO a inclua.
7. ACHADOS SEM SEÇÃO — OBRIGATÓRIO:
   Se um achado ditado NÃO se encaixa claramente em NENHUMA seção anatômica do template, DEVE adicionar "Outros achados:" ao final com TODOS os achados órfãos.
   - NUNCA omita um achado ditado por falta de seção adequada.
   - NUNCA force um achado em uma seção anatômica incorreta apenas para evitar criar "Outros achados". Cada achado DEVE ir na seção que corresponde ANATOMICAMENTE. Se a estrutura anatômica do achado NÃO é a estrutura da seção, NÃO o coloque lá.
   - EXEMPLOS de achados que VÃO para "Outros achados": nódulos tireoidianos em um template de tórax sem seção de tireoide, achados em partes moles em um template ósseo, linfonodomegalias em um template que não as inclui, achados tireoidianos em uma seção de traqueia, etc.
   - A seção deve corresponder ANATOMICAMENTE ao achado. "Traqueia e brônquios" NÃO é tireoide. "Pulmão" NÃO é pleura se houver seção de pleura.
   - Se TODOS os achados se encaixam em seções existentes, NÃO adicione esta seção.

⚠️⚠️ REGRA DE ZERO OMISSÕES — ABSOLUTA:
- CADA achado do ditado DEVE aparecer no laudo. NUNCA omita um achado ditado.
- Antes de finalizar, VERIFIQUE que cada dado do ditado aparece na sua resposta.

ACHADOS NEGATIVOS DITADOS:
Quando o radiologista dita explicitamente a AUSÊNCIA de um achado (ex: "sem massa colônica", "sem evidência de TEP"), isso é um achado negativo relevante e DEVE ser incluído.

FRASES ABSOLUTAMENTE PROIBIDAS:
- "não avaliado", "não analisado", "não descrito", "não mencionado", "not assessed", "not evaluated".

FORMATO DE SAÍDA — ESTRITO:
- Cada seção é UMA linha: "Seção anatômica: Descrição."
- Primeira letra em MAIÚSCULA. Dois pontos. Espaço. Descrição. Ponto final.
- Se houver múltiplos achados em uma seção, separe-os com PONTOS (.), NUNCA com ponto e vírgula (;).
- Sem linhas em branco. Sem markdown. Sem numeração. Sem cabeçalhos.
- TRADUZA os nomes das seções para ${l}.`;
  }

  return `You are an expert radiologist writing structured reports. Your task is to take the radiologist's dictation and distribute it into the anatomical sections of the provided template.

OUTPUT LANGUAGE: ${l}. The ENTIRE report must be written in ${l}.
IMPORTANT: The dictation may be in ANY language. Regardless of the input language, your ENTIRE output MUST be in ${l}. Translate all content to ${l}.

STUDY MODALITY: ${modality}

⚠️⚠️⚠️ DICTATION ONLY MODE — PRIMARY INSTRUCTION, OVERRIDES ALL OTHERS:
The report ONLY contains what the radiologist dictated. Do NOT write ANYTHING that was not dictated.

RULES (no exceptions):
1. Write ONLY template sections where the radiologist dictated a finding (positive or explicit negative).
2. Sections NOT mentioned in the dictation are OMITTED entirely — do NOT include them in the output.
3. Do NOT write normality phrases for unmentioned sections. If the radiologist didn't mention an organ/structure, that section DOES NOT EXIST in your response.
4. Do NOT invent pathological findings or diagnoses the radiologist did not dictate.
5. Do NOT add diagnoses, characterizations, or interpretations the radiologist did not dictate.
6. Completely IGNORE the "CONCLUSION" section of the template — do NOT include it.
7. FINDINGS WITHOUT A SECTION — MANDATORY:
   If a dictated finding does NOT clearly fit ANY anatomical section of the template, you MUST add "Additional findings:" at the end with ALL orphan findings grouped together.
   - NEVER omit a dictated finding due to lack of a matching section.
   - NEVER force a finding into an incorrect anatomical section just to avoid creating "Additional findings". Each finding MUST go in the section that corresponds ANATOMICALLY. If the anatomical structure of the finding is NOT the structure of the section, do NOT place it there.
   - EXAMPLES of findings that GO to "Additional findings": thyroid nodules in a chest template without a thyroid section, soft tissue findings in a bone template, lymphadenopathy in a template that doesn't include it, thyroid findings in a "trachea and bronchi" section, breast findings in a thoracic template, etc.
   - The section must ANATOMICALLY match the finding. "Trachea and bronchi" is NOT thyroid. "Lung" is NOT pleura if there is a pleura section. "Liver" is NOT gallbladder if there is a gallbladder section.
   - If ALL findings fit existing sections, do NOT add this section.

⚠️⚠️ ZERO-OMISSION RULE — ABSOLUTE:
- EVERY dictated finding MUST appear in the report. NEVER omit a dictated finding.
- Before finalizing, VERIFY that every piece of data from the dictation appears in your response.

DICTATED NEGATIVE FINDINGS:
When the radiologist explicitly dictates the ABSENCE of a finding (e.g. "no colonic mass", "no evidence of PE"), this is a relevant negative finding and MUST be included.

ABSOLUTELY FORBIDDEN PHRASES:
- "not assessed", "not evaluated", "not analyzed", "not described", "not mentioned", "not reported".

OUTPUT FORMAT — STRICT:
- Each section is ONE line: "Anatomical section: Description."
- First letter UPPERCASE. Colon. Space. Description. Period.
- If a section has MULTIPLE findings, separate them with PERIODS (.), NEVER with semicolons (;).
- No blank lines. No markdown. No numbering. No headings.
- TRANSLATE section names into ${l}.`;
}

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
  cardiacTechniques?: string[];
}): { system: string; user: string } {
  const lang = params.outputLanguage;

  let system = params.dictationOnly
    ? dictationOnlySystemPrompt(lang, params.modality)
    : findingsSystemPrompt(lang, params.modality);

  system += `\n\n${modalityTerminology(params.modality, lang)}

${LENGTH_INSTRUCTIONS[lang][params.findingsLength]}
${params.dictationOnly ? "" : params.compactNormals ? "" : VERBOSITY_INSTRUCTIONS[lang][params.normalFieldsVerbosity]}
${PARAPHRASE_INSTRUCTIONS[lang][params.paraphraseLevel]}`;

  if (params.cardiacTechniques && params.cardiacTechniques.length > 0) {
    system += cardiacMriInstructions(lang, params.cardiacTechniques);
  }

  if (!params.dictationOnly && params.preferredNormalPhrases && params.preferredNormalPhrases.length > 0) {
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

  if (!params.dictationOnly && params.compactNormals) {
    system += `\n\n${COMPACT_NORMALS_INSTRUCTION[lang] || COMPACT_NORMALS_INSTRUCTION.en}`;
  }

  const FINAL_VERIFICATION: Record<string, string> = {
    es: `

⚠️⚠️⚠️ VERIFICACIÓN FINAL OBLIGATORIA — EJECUTA ESTOS PASOS MENTALMENTE ANTES DE RESPONDER:

PASO 1 — ANTI-OMISIÓN: Enumera cada hallazgo individual del dictado (positivo Y negativo). ¿Cada uno aparece en tu informe? Si falta ALGUNO, agrégalo a la sección correcta o a "Otros hallazgos:". Un hallazgo omitido puede causar un error diagnóstico.

PASO 2 — ANTI-ALUCINACIÓN: Revisa cada frase de tu informe que describe un hallazgo anormal (patológico). ¿Cada hallazgo anormal tiene respaldo directo en el dictado? Si NO lo tiene, ELIMÍNALO inmediatamente. Las frases de NORMALIDAD en secciones no mencionadas NO son alucinaciones — son parte obligatoria del informe estructurado.

PASO 3 — DATOS EXACTOS: Verifica que cada medida (mm, cm), número, lateralidad (derecha/izquierda), y ubicación anatómica coincide EXACTAMENTE con el dictado. No redondees, no cambies lateralidad, no muevas hallazgos entre secciones incorrectas.

PASO 4 — SECCIÓN ANATÓMICA CORRECTA: Para CADA hallazgo dictado colocado en una sección, verifica que la estructura anatómica del hallazgo CORRESPONDE a la sección del template. Ej: nódulos tiroideos NO van en "Tráquea y bronquios"; hallazgos pleurales NO van en "Pulmón" si existe sección de pleura. Si un hallazgo está en una sección incorrecta, MUÉVELO a la sección correcta o a "Otros hallazgos:".

Si detectas un error en cualquier paso, CORRÍGELO antes de responder.`,
    en: `

⚠️⚠️⚠️ MANDATORY FINAL VERIFICATION — EXECUTE THESE STEPS MENTALLY BEFORE RESPONDING:

STEP 1 — ANTI-OMISSION: List every individual finding from the dictation (positive AND negative). Does each one appear in your report? If ANY is missing, add it to the correct section or "Additional findings:". An omitted finding can cause a diagnostic error.

STEP 2 — ANTI-HALLUCINATION: Review every sentence in your report that describes an abnormal (pathological) finding. Does each abnormal finding have direct support in the dictation? If NOT, REMOVE it immediately. NORMALITY phrases in unmentioned sections are NOT hallucinations — they are a required part of the structured report.

STEP 3 — EXACT DATA: Verify that every measurement (mm, cm), number, laterality (right/left), and anatomical location matches EXACTLY with the dictation. Do not round, do not swap laterality, do not move findings to incorrect sections.

STEP 4 — CORRECT ANATOMICAL SECTION: For EACH dictated finding placed in a section, verify that the anatomical structure of the finding MATCHES the template section. E.g.: thyroid nodules do NOT go in "Trachea and bronchi"; pleural findings do NOT go in "Lung" if a pleura section exists. If a finding is in an incorrect section, MOVE it to the correct section or to "Additional findings:".

If you detect an error in any step, CORRECT it before responding.`,
    pt: `

⚠️⚠️⚠️ VERIFICAÇÃO FINAL OBRIGATÓRIA — EXECUTE ESTES PASSOS MENTALMENTE ANTES DE RESPONDER:

PASSO 1 — ANTI-OMISSÃO: Enumere cada achado individual do ditado (positivo E negativo). Cada um aparece no seu laudo? Se ALGUM estiver faltando, adicione-o à seção correta ou a "Outros achados:". Um achado omitido pode causar um erro diagnóstico.

PASSO 2 — ANTI-ALUCINAÇÃO: Revise cada frase do seu laudo que descreve um achado anormal (patológico). Cada achado anormal tem suporte direto no ditado? Se NÃO tiver, REMOVA-O imediatamente. Frases de NORMALIDADE em seções não mencionadas NÃO são alucinações — são parte obrigatória do laudo estruturado.

PASSO 3 — DADOS EXATOS: Verifique que cada medida (mm, cm), número, lateralidade (direita/esquerda) e localização anatômica coincide EXATAMENTE com o ditado. Não arredonde, não troque lateralidade, não mova achados para seções incorretas.

PASSO 4 — SEÇÃO ANATÔMICA CORRETA: Para CADA achado ditado colocado em uma seção, verifique que a estrutura anatômica do achado CORRESPONDE à seção do template. Ex: nódulos tireoidianos NÃO vão em "Traqueia e brônquios"; achados pleurais NÃO vão em "Pulmão" se houver seção de pleura. Se um achado está em uma seção incorreta, MOVA-O para a seção correta ou para "Outros achados:".

Se detectar um erro em qualquer passo, CORRIJA antes de responder.`,
  };

  system += FINAL_VERIFICATION[lang] || FINAL_VERIFICATION.en;

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
  isCardiacMri?: boolean;
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;
  const style = params.conclusionStyle || "concise";

  const STYLE_BLOCK_ES: Record<ConclusionStyle, string> = {
    concise: `ESTILO — CONCISO:
- Cada punto es UNA SOLA FRASE breve, directa y accionable.
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
- Each point is ONE SINGLE brief, direct, actionable phrase.
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

  const STYLE_BLOCK_PT: Record<ConclusionStyle, string> = {
    concise: `ESTILO — CONCISO:
- Cada ponto é UMA ÚNICA frase breve, direta e acionável.
- Sem orações subordinadas longas nem explicações. Apenas o dado-chave condensado.
- Use parênteses para medidas e dados: "Aumento da lesão hepática do segmento VII (2→3,5 cm) com nova linfonodomegalia retroperitoneal (15 mm)."
- Tom: direto, sucinto, descritivo.`,
    grouped: `ESTILO — INTEGRADO:
- Cada ponto é um parágrafo breve com frases completas e bem redigidas.
- Inclua dados descritivos: tamanho, localização, densidade/sinal, evolução.
- SOMENTE conecte achados dentro de um ponto se fizerem parte do MESMO PROCESSO PATOLÓGICO (ex: lesão primária + suas linfonodomegalias, derrame + atelectasia compressiva).
- Se dois achados não compartilham fisiopatologia, vão em PONTOS SEPARADOS mesmo que ambos sejam importantes.
- NÃO force conectores entre achados independentes. Cada ponto é uma unidade clínica coerente.
- Tom: integrador mas rigoroso, sintético, descritivo.`,
  };

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto redactando la CONCLUSIÓN de un informe radiológico. Tu rol es sintetizar los hallazgos como lo haría un radiólogo senior experimentado: priorizando jerárquicamente lo clínicamente relevante, resolviendo la pregunta clínica cuando exista, y organizando la información en puntos accionables que van al grano.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.
Si los hallazgos están en otro idioma, traduce al ${l}.

${STYLE_BLOCK_ES[style]}

REGLAS DE CONTENIDO:

1. MÁXIMO 4 PUNTOS. Nunca más. Si todo cabe en 1 o 2, mejor.

2. JERARQUÍA CLÍNICA ESTRICTA — piensa como un radiólogo experto:
   - PRIMERO: lo que responde a la pregunta clínica o lo que el clínico NECESITA saber de forma urgente (hallazgos agudos, hallazgos que cambian el manejo inmediato).
   - SEGUNDO: otros hallazgos patológicos clínicamente significativos que impacten en el manejo a corto/medio plazo.
   - TERCERO (si aplica): hallazgos incidentales que requieran seguimiento o acción, pero SOLO si son clínicamente relevantes.
   - NUNCA: órganos normales, variantes anatómicas irrelevantes, hallazgos incidentales triviales (quistes simples renales/hepáticos pequeños, pequeños osteofitos degenerativos, etc.) SALVO que sean la razón del estudio.
   - Si un hallazgo no cambia nada para el clínico, no lo incluyas.

3. AGRUPACIÓN POR PROCESO PATOLÓGICO:
   Agrupa hallazgos que forman parte del MISMO proceso patológico o que se relacionan entre sí en un solo punto. El clínico necesita entender la historia completa de cada problema, no una lista fragmentada.
   - Ej: lesión focal hepática + adenopatías regionales + alteración de marcadores → un solo punto que describe el conjunto.
   - Ej: derrame pleural + atelectasia compresiva adyacente → un solo punto.
   - Ej: fractura vertebral + canal estrecho + compresión medular → un solo punto.
   - Hallazgos que NO se relacionan entre sí van en PUNTOS SEPARADOS.
   - Hallazgos que muestren MEJORÍA pueden agruparse separados de los que muestren EMPEORAMIENTO.

4. ${hasClinical ? `PREGUNTA CLÍNICA PROPORCIONADA — RESUÉLVELA:
   - El PRIMER punto DEBE responder directamente a la pregunta clínica. El clínico lee la conclusión antes que los hallazgos — dale la respuesta de inmediato.
   - Si hay hallazgos que respondan: descríbelos con datos clave (tamaño, localización, cambios respecto a previo).
   - Si NO hay hallazgos que respondan: frase corta negativa directa (ej: "Sin evidencia de TEP en el territorio valorado.").
   - Si hay hallazgo indeterminado: descríbelo con los datos radiológicos disponibles, sin especular.
   - Los puntos restantes cubren otros hallazgos significativos NO relacionados con la pregunta clínica.` : `SIN CONTEXTO CLÍNICO — RAZONAMIENTO EXPERTO:
   - Analiza los hallazgos y DEDUCE cuál es el hallazgo principal. Piensa: ¿por qué se pidió este estudio? ¿Qué busca saber el clínico?
   - El PRIMER punto debe ser lo más relevante: el hallazgo que motiva la prueba o su ausencia.
   - Jerarquía de priorización:
     a) Hallazgos AGUDOS (fractura, colección, isquemia, perforación, torsión) → siempre primero.
     b) Hallazgos EVOLUTIVOS en lesiones conocidas (cambios de tamaño, número, morfología respecto a previos) → van después o primero si son el motivo del estudio.
     c) Hallazgos patológicos NUEVOS → por orden de impacto clínico.
     d) Hallazgos CRÓNICOS/DEGENERATIVOS → solo si pueden requerir acción o si no hay nada más relevante.
   - NUNCA listes hallazgos como una simple enumeración plana. Prioriza y organiza.`}

5. HALLAZGOS NEGATIVOS:
   - Incluye un negativo pertinente SOLO si responde a la pregunta clínica (explícita o deducida).
   - Ej: pregunta "descartar TEP" → "Sin evidencia de TEP" es relevante y va en el primer punto.
   - NUNCA listes normalidad como relleno.

6. COMPARACIONES CON PREVIOS:
   - Si se mencionan cambios respecto a estudios previos, inclúyelos DENTRO del punto del hallazgo correspondiente.
   - Califica la evolución con precisión: aumento/disminución de tamaño (con medidas), aparición/desaparición, estabilidad.
   - Los cambios evolutivos son información de alto valor clínico — no los omitas.

7. COMPRENSIÓN DE LOS HALLAZGOS:
   - Lee y COMPRENDE cada hallazgo individualmente. No copies frases textuales de los hallazgos — sintetiza.
   - Si los hallazgos describen un nódulo pulmonar de 8 mm en LID con densidad de partes blandas, tu conclusión dice exactamente eso de forma sintética, NO lo ignores ni lo simplifiques a "nódulo pulmonar" sin datos.
   - CADA dato clínico relevante (tamaño, localización, densidad/señal, lateralidad, número, cambios) DEBE reflejarse en la conclusión. No pierdas información al sintetizar.

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
    const styleBlock = lang === "pt" ? STYLE_BLOCK_PT[style] : STYLE_BLOCK_EN[style];
    const roleIntro = lang === "pt"
      ? `Você é um radiologista experiente redigindo a CONCLUSÃO de um laudo radiológico. Seu papel é sintetizar os achados como faria um radiologista sênior: priorizando hierarquicamente o clinicamente relevante, resolvendo a pergunta clínica quando existir, e organizando a informação em pontos acionáveis que vão direto ao ponto.`
      : `You are an expert radiologist writing the CONCLUSION of a radiology report. Your role is to synthesize the findings as a senior experienced radiologist would: hierarchically prioritizing clinical relevance, answering the clinical question when one exists, and organizing information into actionable bullet points that get straight to the point.`;

    system = `${roleIntro}

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be written in ${l}.
If findings are in another language, translate to ${l}.

${styleBlock}

CONTENT RULES:

1. MAXIMUM 4 POINTS. Never more. If 1 or 2 suffice, better.

2. STRICT CLINICAL HIERARCHY — think like an expert radiologist:
   - FIRST: what answers the clinical question or what the clinician NEEDS to know urgently (acute findings, findings that change immediate management).
   - SECOND: other clinically significant pathological findings that impact short/medium-term management.
   - THIRD (if applicable): incidental findings requiring follow-up or action, but ONLY if clinically relevant.
   - NEVER: normal organs, irrelevant anatomical variants, trivial incidental findings (small simple renal/hepatic cysts, small degenerative osteophytes, etc.) UNLESS they are the reason for the study.
   - If a finding changes nothing for the clinician, do not include it.

3. GROUPING BY PATHOLOGICAL PROCESS:
   Group findings that are part of the SAME pathological process or that relate to each other into a single point. The clinician needs to understand the complete picture of each problem, not a fragmented list.
   - E.g.: focal hepatic lesion + regional lymphadenopathy + marker abnormalities → one single point describing the whole picture.
   - E.g.: pleural effusion + adjacent compressive atelectasis → one single point.
   - E.g.: vertebral fracture + narrow canal + cord compression → one single point.
   - Findings that are NOT related go in SEPARATE POINTS.
   - Findings showing IMPROVEMENT may be grouped separately from those showing WORSENING.

4. ${hasClinical ? `CLINICAL QUESTION PROVIDED — ANSWER IT:
   - The FIRST point MUST directly answer the clinical question. The clinician reads the conclusion before the findings — give them the answer immediately.
   - If findings answer it: describe them with key data (size, location, changes compared to prior).
   - If NO findings answer it: short direct negative phrase (e.g., "No evidence of PE in the evaluated territory.").
   - If there is an indeterminate finding: describe it with the available radiological data, without speculating.
   - Remaining points cover other significant findings NOT related to the clinical question.` : `NO CLINICAL CONTEXT — EXPERT REASONING:
   - Analyze the findings and DEDUCE the main finding. Think: why was this study ordered? What does the clinician want to know?
   - The FIRST point should be the most relevant: the finding that motivates the study or its absence.
   - Prioritization hierarchy:
     a) ACUTE findings (fracture, collection, ischemia, perforation, torsion) → always first.
     b) EVOLUTIONARY findings in known lesions (size, number, morphology changes compared to prior) → next, or first if they are the study's reason.
     c) NEW pathological findings → by order of clinical impact.
     d) CHRONIC/DEGENERATIVE findings → only if they may require action or if nothing more relevant exists.
   - NEVER list findings as a flat enumeration. Prioritize and organize.`}

5. NEGATIVE FINDINGS:
   - Include a pertinent negative ONLY if it answers the clinical question (explicit or deduced).
   - E.g.: question "rule out PE" → "No evidence of PE" is relevant and goes in the first point.
   - NEVER list normality as filler.

6. COMPARISON WITH PRIOR STUDIES:
   - If changes compared to prior studies are mentioned, include them WITHIN the corresponding finding's point.
   - Qualify evolution precisely: size increase/decrease (with measurements), appearance/disappearance, stability.
   - Evolutionary changes are high-value clinical information — do not omit them.

7. COMPREHENSION OF FINDINGS:
   - Read and UNDERSTAND each finding individually. Do not copy verbatim phrases from the findings — synthesize.
   - If findings describe an 8 mm pulmonary nodule in the RLL with soft tissue density, your conclusion says exactly that in synthesized form. Do NOT ignore it or simplify to "pulmonary nodule" without data.
   - EVERY relevant clinical datum (size, location, density/signal, laterality, count, changes) MUST be reflected in the conclusion. Do not lose information while synthesizing.

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

  if (params.isCardiacMri) {
    system += cardiacConclusionInstructions(lang);
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
