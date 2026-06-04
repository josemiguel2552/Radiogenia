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
- NEVER force a finding into an incorrect anatomical section. Ask: "is the anatomical structure this finding describes THE structure named by this section?" If NO, move it to the correct section or "Additional findings". Vascular findings go in vessels/heart/mediastinum, not in the organ they supply. Pleural findings go in pleura, not lung. Thyroid findings go in thyroid, not trachea. Lymphadenopathy goes in lymph nodes or mediastinum, not in the adjacent organ section.
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
- NEVER force a finding into an incorrect anatomical section. Ask: "is the anatomical structure this finding describes THE structure named by this section?" If NO, move it to the correct section or "Additional findings". Vascular findings go in vessels/heart/mediastinum, not in the organ they supply. Pleural findings go in pleura, not lung. Thyroid findings go in thyroid, not trachea. Lymphadenopathy goes in lymph nodes or mediastinum, not in the adjacent organ section.
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
6. COLOCACIÓN ANATÓMICA CORRECTA — REGLA CRÍTICA:
   Cada hallazgo DEBE ir en la sección cuya ESTRUCTURA ANATÓMICA coincide exactamente con la estructura descrita en el hallazgo. NO coloques un hallazgo en una sección solo porque están en la misma región corporal o comparten una palabra clave.

   PRINCIPIO: Pregúntate "¿la estructura anatómica que describe este hallazgo ES la estructura que nombra la sección?" Si la respuesta es NO, ese hallazgo NO va ahí.

   Errores frecuentes que DEBES evitar:
   - "Tráquea y bronquios" NO es tiroides, ni arterias pulmonares, ni esófago, ni mediastino.
   - "Pulmón" o "Parénquima pulmonar" NO es pleura (si hay sección de pleura), ni arterias pulmonares, ni mediastino.
   - "Hígado" NO es vesícula (si hay sección de vesícula), ni vena porta, ni vía biliar.
   - "Riñones" NO es glándulas suprarrenales (si hay sección de suprarrenales), ni uréteres, ni vejiga.
   - Hallazgos vasculares (TEP, disección, aneurisma, trombosis) van en la sección de vasos, arterias, corazón o mediastino — NO en la sección del órgano irrigado.
   - Hallazgos de partes blandas NO van en secciones óseas y viceversa.
   - Adenopatías van en la sección de ganglios o mediastino, NO en la sección del órgano adyacente.

7. HALLAZGOS SIN SECCIÓN — "OTROS HALLAZGOS":
   Si un hallazgo dictado NO encaja en NINGUNA sección del template, DEBES añadir "Otros hallazgos:" al final con TODOS los hallazgos huérfanos.
   - NUNCA omitas un hallazgo dictado por falta de sección adecuada.
   - NUNCA fuerces un hallazgo en una sección incorrecta solo para evitar crear "Otros hallazgos". Es PREFERIBLE tener una sección de "Otros hallazgos" larga a colocar un solo hallazgo en la sección equivocada.
   - Si TODOS los hallazgos encajan en secciones existentes, NO añadas esta sección.

FORMATO DE SALIDA — ESTRICTO, SIN EXCEPCIONES:
- Cada sección es exactamente UNA línea con el formato: "Sección anatómica: Descripción."
- Primera letra de la sección en MAYÚSCULA, el resto en minúsculas. Dos puntos. Un espacio. Descripción. Punto final.
- Una línea por sección. Sin líneas en blanco entre secciones. Sin saltos de línea dentro de una sección.
- Si una sección tiene MÚLTIPLES hallazgos, sepáralos con PUNTOS (.), NUNCA con comas (,) ni punto y coma (;). Cada hallazgo distinto es una oración independiente que termina en punto. Ej CORRECTO: "Hígado: Lesión hipodensa de 15 mm en segmento VI. Quiste simple de 8 mm en segmento III." Ej INCORRECTO: "Hígado: Lesión hipodensa de 15 mm en segmento VI, quiste simple de 8 mm en segmento III."
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
6. COLOCAÇÃO ANATÔMICA CORRETA — REGRA CRÍTICA:
   Cada achado DEVE ir na seção cuja ESTRUTURA ANATÔMICA coincide exatamente com a estrutura descrita no achado. NÃO coloque um achado em uma seção apenas porque estão na mesma região corporal ou compartilham uma palavra-chave.

   PRINCÍPIO: Pergunte-se "a estrutura anatômica que este achado descreve É a estrutura que a seção nomeia?" Se a resposta é NÃO, esse achado NÃO vai ali.

   Erros frequentes que DEVE evitar:
   - "Traqueia e brônquios" NÃO é tireoide, nem artérias pulmonares, nem esôfago, nem mediastino.
   - "Pulmão" ou "Parênquima pulmonar" NÃO é pleura (se houver seção de pleura), nem artérias pulmonares, nem mediastino.
   - "Fígado" NÃO é vesícula (se houver seção de vesícula), nem veia porta, nem via biliar.
   - "Rins" NÃO é glândulas adrenais (se houver seção de adrenais), nem ureteres, nem bexiga.
   - Achados vasculares (TEP, dissecção, aneurisma, trombose) vão na seção de vasos, artérias, coração ou mediastino — NÃO na seção do órgão irrigado.
   - Achados de partes moles NÃO vão em seções ósseas e vice-versa.
   - Linfonodomegalias vão na seção de linfonodos ou mediastino, NÃO na seção do órgão adjacente.

7. ACHADOS SEM SEÇÃO — "OUTROS ACHADOS":
   Se um achado ditado NÃO se encaixa em NENHUMA seção do template, DEVE adicionar "Outros achados:" ao final com TODOS os achados órfãos.
   - NUNCA omita um achado ditado por falta de seção adequada.
   - NUNCA force um achado em uma seção incorreta apenas para evitar criar "Outros achados". É PREFERÍVEL ter uma seção de "Outros achados" longa a colocar um único achado na seção errada.
   - Se TODOS os achados se encaixam em seções existentes, NÃO adicione esta seção.

FORMATO DE SAÍDA — ESTRITO, SEM EXCEÇÕES:
- Cada seção é exatamente UMA linha com o formato: "Seção anatômica: Descrição."
- Primeira letra da seção em MAIÚSCULA, o restante em minúsculas. Dois pontos. Um espaço. Descrição. Ponto final.
- Uma linha por seção. Sem linhas em branco entre seções. Sem quebras de linha dentro de uma seção.
- Se uma seção tem MÚLTIPLOS achados, separe-os com PONTOS (.), NUNCA com vírgulas (,) nem ponto e vírgula (;). Cada achado distinto é uma frase independente terminada em ponto. Ex CORRETO: "Fígado: Lesão hipodensa de 15 mm no segmento VI. Cisto simples de 8 mm no segmento III." Ex INCORRETO: "Fígado: Lesão hipodensa de 15 mm no segmento VI, cisto simples de 8 mm no segmento III."
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
6. CORRECT ANATOMICAL PLACEMENT — CRITICAL RULE:
   Each finding MUST go in the section whose ANATOMICAL STRUCTURE exactly matches the structure described in the finding. Do NOT place a finding in a section just because they are in the same body region or share a keyword.

   PRINCIPLE: Ask yourself "is the anatomical structure this finding describes THE structure that the section names?" If the answer is NO, that finding does NOT go there.

   Common errors you MUST avoid:
   - "Trachea and bronchi" is NOT thyroid, NOT pulmonary arteries, NOT esophagus, NOT mediastinum.
   - "Lung" or "Lung parenchyma" is NOT pleura (if a pleura section exists), NOT pulmonary arteries, NOT mediastinum.
   - "Liver" is NOT gallbladder (if a gallbladder section exists), NOT portal vein, NOT bile ducts.
   - "Kidneys" is NOT adrenal glands (if an adrenal section exists), NOT ureters, NOT bladder.
   - Vascular findings (PE, dissection, aneurysm, thrombosis) go in the vessels, arteries, heart or mediastinum section — NOT in the section of the organ they supply.
   - Soft tissue findings do NOT go in bone sections and vice versa.
   - Lymphadenopathy goes in the lymph node or mediastinum section, NOT in the section of the adjacent organ.

7. FINDINGS WITHOUT A SECTION — "ADDITIONAL FINDINGS":
   If a dictated finding does NOT fit ANY section of the template, you MUST add "Additional findings:" at the end with ALL orphan findings.
   - NEVER omit a dictated finding due to lack of a matching section.
   - NEVER force a finding into an incorrect section just to avoid creating "Additional findings". It is BETTER to have a long "Additional findings" section than to place a single finding in the wrong section.
   - If ALL findings fit existing sections, do NOT add this section.

OUTPUT FORMAT — STRICT, NO EXCEPTIONS:
- Each section is exactly ONE line with the format: "Anatomical section: Description."
- First letter of section name in UPPERCASE, rest in lowercase. Colon. One space. Description. Period.
- One line per section. No blank lines between sections. No line breaks within a section.
- If a section has MULTIPLE findings, separate them with PERIODS (.), NEVER with commas (,) or semicolons (;). Each distinct finding is an independent sentence ending with a period. CORRECT: "Liver: 15 mm hypodense lesion in segment VI. Simple 8 mm cyst in segment III." INCORRECT: "Liver: 15 mm hypodense lesion in segment VI, simple 8 mm cyst in segment III."
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

/* ── RECIST 1.1 structured report instructions ────────────── */

interface RecistConfig {
  isBaseline: boolean;
  priorReport?: string;
}

function recistInstructions(lang: OutputLanguage, config: RecistConfig): string {
  const { isBaseline, priorReport } = config;

  if (lang === "es") {
    return `
INSTRUCCIONES ESPECIALES — INFORME RECIST 1.1:

Este es un informe de evaluación de respuesta tumoral según criterios RECIST 1.1.
IGNORA el template de secciones genérico y estructura el informe con las siguientes secciones, EN ESTE ORDEN EXACTO:

1. Técnica:
   Modalidad y fase de adquisición según lo dictado. Si el radiólogo no dicta la técnica, inferirla de la región anatómica del estudio (ej: TC con contraste i.v. en fase portal).

2. Información clínica:
   Tipo de tumor, tratamiento actual y motivo del estudio según lo dictado. Si el radiólogo NO dicta información clínica, DEJAR ESTE CAMPO EN BLANCO — no escribir "no especificado" ni inventar datos.

3. Comparación:
   ${isBaseline ? "Estudio basal — sin estudios previos de referencia." : "Referencia al estudio previo y al estudio basal. Extraer fechas del informe previo si están disponibles. Si no se proporciona fecha de comparación, DEJAR EN BLANCO."}

4. LESIONES DIANA:
   Tabla en texto plano con formato:
   # | Órgano / Localización | Medida actual (mm) | ${isBaseline ? "" : "Medida basal (mm) | Medida previa (mm) |"}
   - Numerar cada lesión: T1, T2, ..., hasta T5 máximo.
   - Máximo 2 lesiones diana por órgano.
   - Ganglios linfáticos: medir EJE CORTO. Especificarlo entre paréntesis.
   - Lesiones no ganglionares: medir DIÁMETRO MAYOR (eje largo).
   - Si una lesión ha desaparecido: 0 mm.
   - Si un ganglio diana ha disminuido pero persiste: medir su eje corto actual.

   SUMATORIO:
   - Suma de diámetros actual: ___ mm  ← CALCULAR: sumar todas las medidas actuales de lesiones diana
   ${isBaseline ? "" : `- Suma baseline: ___ mm  ← EXTRAER del informe previo
   - Suma nadir: ___ mm  ← EXTRAER del informe previo (la suma más baja alcanzada en cualquier evaluación previa)
   - Suma del estudio previo: ___ mm  ← EXTRAER del informe previo

   CÁLCULOS AUTOMÁTICOS:
   - Cambio vs baseline: ___% ← CALCULAR: ((suma_actual - suma_baseline) / suma_baseline) × 100
   - Cambio vs nadir: ___% ← CALCULAR: ((suma_actual - suma_nadir) / suma_nadir) × 100
   - Cambio absoluto vs nadir: ___ mm ← CALCULAR: suma_actual - suma_nadir

   CATEGORÍA DIANA:
   Aplicar reglas RECIST 1.1:
   - CR (Respuesta completa): Todas las lesiones diana desaparecidas Y todos los ganglios diana < 10 mm eje corto.
   - PR (Respuesta parcial): Suma actual ≤ 70% de suma baseline (disminución ≥ 30%).
   - PD (Progresión): Suma actual ≥ 120% de suma nadir Y (suma actual - suma nadir) ≥ 5 mm.
   - SD (Enfermedad estable): No cumple CR, PR ni PD.
   NOTA: PR se compara con BASELINE. PD se compara con NADIR.`}

5. LESIONES NO DIANA:
   Lista de cada lesión no diana con:
   - Órgano / localización
   - Estado actual: presente / ausente / progresión inequívoca
   ${isBaseline ? "" : `
   CATEGORÍA NO DIANA:
   - CR: Todas desaparecidas, todos los ganglios < 10 mm.
   - non-CR/non-PD: Persistencia de una o más lesiones no diana.
   - PD: Progresión inequívoca de lesiones no diana.`}

6. LESIONES NUEVAS:
   - Listar cualquier lesión nueva (órgano, localización, tamaño si disponible).
   - Si no hay: "No se identifican lesiones nuevas."
   - Una lesión nueva SIEMPRE implica PD en la respuesta global.

7. HALLAZGOS ADICIONALES:
   Otros hallazgos radiológicos no relacionados con la evaluación tumoral (si dictados). Si no hay, omitir esta sección.

${isBaseline ? "" : `8. TABLA RESUMEN RECIST 1.1:
   Respuesta target: [CR/PR/SD/PD]
   Respuesta non-target: [CR/non-CR-non-PD/PD/No evaluadas]
   Lesiones nuevas: [Sí/No]

   RESPUESTA GLOBAL: [CALCULAR según tabla RECIST 1.1:]
   - CR: target CR + non-target CR + no nuevas
   - PR: target CR o PR + non-target no PD + no nuevas
   - SD: target SD + non-target no PD + no nuevas
   - PD: target PD, O non-target PD, O lesiones nuevas`}

${priorReport ? `INFORME RECIST PREVIO (proporcionado por el radiólogo — EXTRAER datos de aquí):
---
${priorReport}
---
INSTRUCCIONES PARA EL INFORME PREVIO:
- EXTRAE las lesiones diana previamente definidas (mismas lesiones, mismo orden).
- EXTRAE la suma de diámetros baseline, la suma nadir y la suma del estudio previo.
- Las lesiones diana del estudio actual DEBEN ser las MISMAS que las del estudio previo (mismos órganos/localizaciones).
- Si el radiólogo dicta una medida para una lesión ya definida, úsala. Si no la menciona, indica "no evaluada".` : ""}

FORMATO: Texto plano, sin markdown. Cada valor en su línea. Secciones separadas por línea en blanco y nombre seguido de dos puntos.`;
  }

  if (lang === "pt") {
    return `
INSTRUÇÕES ESPECIAIS — LAUDO RECIST 1.1:

Este é um laudo de avaliação de resposta tumoral segundo critérios RECIST 1.1.
IGNORE o template genérico e estruture o laudo com as seguintes seções:

1. Técnica
2. Informação clínica
3. Comparação: ${isBaseline ? "Estudo basal." : "Referência ao estudo prévio e basal."}
4. LESÕES TARGET: tabela com # | Órgão | Medida atual${isBaseline ? "" : " | Basal | Prévia"}, suma, ${isBaseline ? "" : "cálculos (% vs basal/nadir), categoria target (CR/PR/SD/PD)"}
5. LESÕES NON-TARGET: lista com estado${isBaseline ? "" : ", categoria non-target"}
6. LESÕES NOVAS
7. ACHADOS ADICIONAIS (se houver)
${isBaseline ? "" : `8. TABELA RESUMO RECIST 1.1: resposta target + non-target + novas → resposta global`}

${isBaseline ? "" : `Regras RECIST 1.1: PR = ≥30% diminuição vs basal. PD = ≥20% aumento vs nadir E ≥5mm absoluto. CR = todas desaparecidas. SD = nem PR nem PD.`}

${priorReport ? `LAUDO RECIST PRÉVIO:\n---\n${priorReport}\n---\nEXTRAIA: lesões target, soma basal, soma nadir, soma prévia.` : ""}

FORMATO: Texto simples, sem markdown.`;
  }

  return `
SPECIAL INSTRUCTIONS — RECIST 1.1 REPORT:

This is a tumor response evaluation report per RECIST 1.1 criteria.
IGNORE the generic section template and structure the report with these sections, IN THIS EXACT ORDER:

1. Technique
2. Clinical information
3. Comparison: ${isBaseline ? "Baseline study — no prior studies." : "Reference to prior and baseline studies."}
4. TARGET LESIONS: plain text table with # | Organ / Location | Current (mm)${isBaseline ? "" : " | Baseline (mm) | Prior (mm)"}, sum, ${isBaseline ? "" : "calculations (% vs baseline/nadir), target category (CR/PR/SD/PD)"}
5. NON-TARGET LESIONS: list with status${isBaseline ? "" : ", non-target category"}
6. NEW LESIONS
7. ADDITIONAL FINDINGS (if any)
${isBaseline ? "" : `8. RECIST 1.1 SUMMARY TABLE: target + non-target + new → overall response`}

${isBaseline ? "" : `RECIST 1.1 rules: PR = ≥30% decrease vs baseline. PD = ≥20% increase vs nadir AND ≥5mm absolute. CR = all disappeared, nodes <10mm. SD = neither PR nor PD. New lesion = always PD.`}

${priorReport ? `PRIOR RECIST REPORT:\n---\n${priorReport}\n---\nEXTRACT: target lesions, baseline sum, nadir sum, prior sum. Use the SAME target lesions in the same order.` : ""}

FORMAT: Plain text, no markdown. Each value on its own line. Sections separated by blank line and name followed by colon.`;
}

function buildRecistConclusionPrompt(params: {
  findingsText: string;
  clinicalInfo: string;
  outputLanguage: OutputLanguage;
  isBaseline: boolean;
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto redactando la CONCLUSIÓN de un informe de evaluación de respuesta tumoral RECIST 1.1.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.

ESTRUCTURA OBLIGATORIA:

${params.isBaseline ? `EVALUACIÓN BASAL RECIST 1.1:

1. Lesiones diana definidas: enumerar las lesiones diana seleccionadas con órgano, localización y medida basal.
2. Suma de diámetros basal: ___ mm.
3. Lesiones no diana: enumerar con órgano y localización.
4. Hallazgos adicionales relevantes (si los hay).` : `EVALUACIÓN RECIST 1.1:

1. Respuesta global: [CR/PR/SD/PD] según criterios RECIST 1.1.
2. Lesiones diana:
   - Suma de diámetros actual: ___ mm (baseline: ___ mm, nadir: ___ mm).
   - Cambio vs baseline: ___%.
   - Cambio vs nadir: ___%.
   - Categoría diana: [CR/PR/SD/PD].
3. Lesiones no diana: [CR/non-CR-non-PD/PD].
4. Lesiones nuevas: [Sí (describir) / No].
5. Hallazgos adicionales relevantes (si los hay).`}

${hasClinical ? "Responder a la pregunta clínica si fue planteada." : ""}

REGLAS:
- ${params.isBaseline ? "En estudio basal no hay categoría de respuesta — solo se definen las lesiones y la suma basal." : "El PRIMER punto siempre es la respuesta global RECIST 1.1."}
- Incluir datos cuantitativos: sumas (mm), porcentajes de cambio.
- DESCRIBIR, NO DIAGNOSTICAR. La categoría RECIST (CR/PR/SD/PD) es un dato objetivo calculado según criterios estandarizados, no un juicio clínico.
- NO recomendar cambios de tratamiento.
- NO emitir pronósticos.

FORMATO:
- Puntos numerados. Texto plano. Sin markdown.
- NO incluir el encabezado "CONCLUSIÓN".`;
  } else if (lang === "pt") {
    system = `Você é um radiologista experiente redigindo a CONCLUSÃO de um laudo RECIST 1.1.

IDIOMA: ${l}.

${params.isBaseline ? `AVALIAÇÃO BASAL RECIST 1.1:
1. Lesões target definidas com medidas basais.
2. Soma de diâmetros basal.
3. Lesões non-target.
4. Achados adicionais.` : `AVALIAÇÃO RECIST 1.1:
1. Resposta global: [CR/PR/SD/PD].
2. Lesões target: soma atual, basal, nadir, % mudança, categoria.
3. Lesões non-target: categoria.
4. Lesões novas.
5. Achados adicionais.`}

DESCREVA, NÃO DIAGNOSTIQUE. Sem markdown.`;
  } else {
    system = `You are an expert radiologist writing the CONCLUSION of a RECIST 1.1 tumor response evaluation report.

OUTPUT LANGUAGE: ${l}.

${params.isBaseline ? `BASELINE RECIST 1.1 EVALUATION:
1. Defined target lesions with organ, location and baseline measurement.
2. Baseline sum of diameters: ___ mm.
3. Non-target lesions: list with organ and location.
4. Additional relevant findings.` : `RECIST 1.1 EVALUATION:
1. Overall response: [CR/PR/SD/PD] per RECIST 1.1 criteria.
2. Target lesions: current sum ___ mm (baseline: ___ mm, nadir: ___ mm), % change vs baseline, % change vs nadir, target category.
3. Non-target lesions: [CR/non-CR-non-PD/PD].
4. New lesions: [Yes (describe) / No].
5. Additional relevant findings.`}

${hasClinical ? "Answer the clinical question if posed." : ""}

RULES:
- ${params.isBaseline ? "Baseline study has no response category — only define lesions and baseline sum." : "FIRST point is always the overall RECIST 1.1 response."}
- Include quantitative data: sums (mm), percentage changes.
- DESCRIBE, do NOT DIAGNOSE. RECIST category is an objective calculated criterion, not a clinical judgment.
- Do NOT recommend treatment changes. Do NOT issue prognoses.

FORMAT: Numbered points. Plain text. No markdown. Do NOT include "CONCLUSION" heading.`;
  }

  const langReminder = lang === "es"
    ? `\n\nRECORDATORIO: Salida COMPLETA en ${l}.`
    : lang === "pt"
    ? `\n\nLEMBRETE: Saída COMPLETA em ${l}.`
    : `\n\nREMINDER: ENTIRE output in ${l}.`;

  system += langReminder;

  let userMsg = "";
  if (hasClinical) {
    const label = lang === "es" ? "Datos clínicos / pregunta clínica" : lang === "pt" ? "Dados clínicos / pergunta clínica" : "Clinical data / clinical question";
    userMsg += `${label}:\n${params.clinicalInfo}\n\n`;
  }
  const findingsLabel = lang === "es" ? "Hallazgos" : lang === "pt" ? "Achados" : "Findings";
  userMsg += `${findingsLabel}:\n${params.findingsText}`;

  return { system, user: userMsg };
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

RANGOS NORMALES — OBLIGATORIO AMBOS SEXOS:
Junto a CADA valor numérico, incluye SIEMPRE los rangos normales de AMBOS sexos entre paréntesis, con el formato:
(normal: XX-XX varón; XX-XX mujer)
NUNCA muestres solo el rango de un sexo. Aunque el paciente sea varón, incluye también el rango femenino, y viceversa. El radiólogo necesita ambos rangos como referencia.

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

FAIXAS NORMAIS — AMBOS OS SEXOS OBRIGATÓRIO:
Junto a CADA valor numérico, inclua SEMPRE as faixas normais de AMBOS os sexos entre parênteses:
(normal: XX-XX homem; XX-XX mulher)
NUNCA mostre apenas a faixa de um sexo. O radiologista precisa de ambas as faixas como referência.`;
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

NORMAL RANGES — BOTH SEXES MANDATORY:
Next to EVERY numeric value, ALWAYS include normal ranges for BOTH sexes in parentheses, with the format:
(normal: XX-XX male; XX-XX female)
NEVER show only one sex's range. Even if the patient is male, include the female range too, and vice versa. The radiologist needs both ranges as reference.

OUTPUT FORMAT: Do NOT use markdown formatting (**, #, etc.). Use plain text with each value on its own line. Sections separated by blank line and section name followed by colon.`;
}

function buildCardiacConclusionPrompt(params: {
  findingsText: string;
  clinicalInfo: string;
  outputLanguage: OutputLanguage;
}): { system: string; user: string } {
  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto en imagen cardíaca redactando la CONCLUSIÓN de un informe de RM cardíaca.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.

Esta conclusión tiene un formato ESPECÍFICO para RM cardíaca, distinto al de informes radiológicos generales.

ESTRUCTURA OBLIGATORIA — dos secciones:

RESUMEN DE HALLAZGOS:
Puntos numerados que resuman los hallazgos principales. Incluir SIEMPRE:

1. Ventrículo izquierdo: tamaño (normal/dilatado), función sistólica global (conservada/deprimida), FE (valor%), motilidad regional (normal o describir alteraciones segmentarias). Si hay hipertrofia, mencionarla con grosor.
2. Ventrículo derecho: tamaño (normal/dilatado), función sistólica (conservada/deprimida), FE (valor%), motilidad regional. Mencionar criterios de DAVD si aplica. Incluir TAPSE/FAC si están en los hallazgos.
3. Aurículas: tamaño (normal/dilatadas), con diámetros si están disponibles.
4. Pericardio: normal o describir derrame/engrosamiento con cuantificación.
5. Morfología y función valvular: normal o describir alteraciones (insuficiencia, estenosis, prolapso).
6. Realce tardío (LGE): si se realizó — presencia/ausencia, patrón (subendocárdico, mesocárdico, subepicárdico, transmural), localización por segmentos, extensión. Si no hay realce: "Sin captación patológica de gadolinio."
7. Mapping (T1, T2, ECV): si se realizó — valores y si son normales o patológicos para la secuencia utilizada.
8. Perfusión de estrés: si se realizó — presencia/ausencia de defectos, localización, reversibilidad.
9. Strain: si se realizó — GLS global y si es normal o reducido.
10. Hallazgos adicionales relevantes (derrame pleural, adenopatías, hallazgos extracardíacos significativos).

NOTA: Incluir solo los puntos que tengan datos en los hallazgos. Si una técnica no se realizó, NO incluir ese punto. Si todo es normal en un punto, incluirlo igualmente indicando normalidad.

DATOS CUANTITATIVOS:
- Incluir valores numéricos clave: FE del VI y VD (%), volúmenes si están disponibles, grosores parietales si son anormales, diámetros auriculares.
- Incluir rangos normales de AMBOS sexos entre paréntesis: (normal: XX-XX% varón; XX-XX% mujer).
- Los datos cuantitativos son ESENCIALES en la conclusión cardíaca — no los omitas ni los resumas como "normal" si tienes los valores.

INTERPRETACIÓN:
Un párrafo final que:
- Sintetice los hallazgos en lenguaje clínico conciso.
- Indique si el estudio es globalmente normal o patológico.
${hasClinical ? "- Responda directamente a la pregunta clínica planteada." : "- Resuma los hallazgos principales y su significado radiológico."}
- DESCRIBE hallazgos radiológicos, NO emitas diagnósticos. No uses: "compatible con", "sugestivo de", "en relación con", "cardiopatía isquémica", "miocardiopatía", "miocarditis". Describe lo que ves: patrón de realce, distribución, valores alterados.

FORMATO:
- Texto plano. NO uses asteriscos, almohadillas ni markdown.
- NO incluyas el encabezado "CONCLUSIÓN" — empieza directamente con "RESUMEN DE HALLAZGOS:".
- Los puntos del resumen van numerados (1. 2. 3. ...).
- La interpretación va tras una línea en blanco con el encabezado "INTERPRETACIÓN:".`;
  } else if (lang === "pt") {
    system = `Você é um radiologista experiente em imagem cardíaca redigindo a CONCLUSÃO de um laudo de RM cardíaca.

IDIOMA DE SAÍDA: ${l}. Toda a conclusão deve estar em ${l}.

Esta conclusão tem um formato ESPECÍFICO para RM cardíaca, diferente dos laudos radiológicos gerais.

ESTRUTURA OBRIGATÓRIA — duas seções:

RESUMO DOS ACHADOS:
Pontos numerados resumindo os achados principais. Incluir SEMPRE:

1. Ventrículo esquerdo: tamanho, função sistólica global, FE (valor%), motilidade regional. Hipertrofia se presente.
2. Ventrículo direito: tamanho, função sistólica, FE (valor%), motilidade regional. Critérios de DAVD se aplicável.
3. Átrios: tamanho, diâmetros se disponíveis.
4. Pericárdio: normal ou descrever derrame/espessamento.
5. Morfologia e função valvular: normal ou descrever alterações.
6. Realce tardio (LGE): se realizado — presença/ausência, padrão, localização, extensão.
7. Mapping (T1, T2, VEC): se realizado — valores e normalidade.
8. Perfusão de estresse: se realizado — defeitos, localização, reversibilidade.
9. Strain: se realizado — GLS global.
10. Achados adicionais relevantes.

Incluir apenas pontos com dados nos achados. Incluir valores numéricos (FE, volumes) e faixas normais de AMBOS os sexos: (normal: XX-XX% homem; XX-XX% mulher).

INTERPRETAÇÃO:
Parágrafo final sintetizando os achados em linguagem clínica concisa, indicando se o estudo é globalmente normal ou patológico${hasClinical ? " e respondendo à pergunta clínica" : ""}. DESCREVA achados radiológicos, NÃO emita diagnósticos. Não use: "compatível com", "sugestivo de", "cardiopatia isquêmica", "miocardiopatia", "miocardite". Descreva o que vê: padrão de realce, distribuição, valores alterados.

FORMATO:
- Texto simples, sem markdown. Não inclua o cabeçalho "CONCLUSÃO".
- Comece com "RESUMO DOS ACHADOS:" seguido dos pontos numerados.
- "INTERPRETAÇÃO:" após linha em branco.`;
  } else {
    system = `You are an expert cardiac imaging radiologist writing the CONCLUSION of a cardiac MRI report.

OUTPUT LANGUAGE: ${l}. The ENTIRE conclusion must be in ${l}.

This conclusion uses a SPECIFIC cardiac MRI format, different from general radiology reports.

MANDATORY STRUCTURE — two sections:

SUMMARY OF FINDINGS:
Numbered points summarizing the main findings. ALWAYS include:

1. Left ventricle: size (normal/dilated), global systolic function (preserved/depressed), EF (value%), regional wall motion (normal or describe segmental abnormalities). Mention hypertrophy with thickness if present.
2. Right ventricle: size, systolic function, EF (value%), regional wall motion. ARVD criteria if applicable. Include TAPSE/FAC if in findings.
3. Atria: size (normal/dilated), with diameters if available.
4. Pericardium: normal or describe effusion/thickening with quantification.
5. Valvular morphology and function: normal or describe abnormalities (regurgitation, stenosis, prolapse).
6. Late gadolinium enhancement (LGE): if performed — presence/absence, pattern (subendocardial, mesocardial, subepicardial, transmural), segmental location, extent. If none: "No pathological myocardial late gadolinium enhancement."
7. Mapping (T1, T2, ECV): if performed — values and whether normal or abnormal for the sequence used.
8. Stress perfusion: if performed — presence/absence of defects, location, reversibility.
9. Strain: if performed — global GLS and whether normal or reduced.
10. Additional relevant findings (pleural effusion, lymphadenopathy, significant extracardiac findings).

NOTE: Include only points that have data in the findings. If a technique was not performed, do NOT include that point. If everything is normal for a point, include it indicating normality.

QUANTITATIVE DATA:
- Include key numeric values: LV and RV EF (%), volumes if available, wall thickness if abnormal, atrial diameters.
- Include normal ranges for BOTH sexes in parentheses: (normal: XX-XX% male; XX-XX% female).
- Quantitative data is ESSENTIAL in the cardiac conclusion — do not omit values or summarize them as "normal" if you have the numbers.

INTERPRETATION:
A final paragraph that:
- Synthesizes findings in concise clinical language.
- States whether the study is globally normal or abnormal.
${hasClinical ? "- Directly answers the clinical question posed." : "- Summarizes the main findings and their radiological significance."}
- DESCRIBE radiological findings, do NOT issue diagnoses. Do not use: "consistent with", "suggestive of", "in keeping with", "ischemic cardiomyopathy", "dilated cardiomyopathy", "myocarditis". Describe what you see: enhancement pattern, distribution, abnormal values.

FORMAT:
- Plain text. Do NOT use asterisks, hashes or markdown.
- Do NOT include the heading "CONCLUSION" — start directly with "SUMMARY OF FINDINGS:".
- Summary points are numbered (1. 2. 3. ...).
- Interpretation follows after a blank line with the heading "INTERPRETATION:".`;
  }

  const langReminder = lang === "es"
    ? `\n\nRECORDATORIO DE IDIOMA: Tu salida COMPLETA debe estar en ${l}. No mezcles con inglés ni otros idiomas.`
    : lang === "pt"
    ? `\n\nLEMBRETE DE IDIOMA: Toda a sua saída DEVE estar em ${l}. Não misture com outros idiomas.`
    : `\n\nLANGUAGE REMINDER: Your ENTIRE output must be in ${l}. Do not mix with other languages.`;

  system += langReminder;

  let userMsg = "";
  if (hasClinical) {
    const label = lang === "es" ? "Datos clínicos / pregunta clínica" : lang === "pt" ? "Dados clínicos / pergunta clínica" : "Clinical data / clinical question";
    userMsg += `${label}:\n${params.clinicalInfo}\n\n`;
  }
  const findingsLabel = lang === "es" ? "Hallazgos" : lang === "pt" ? "Achados" : "Findings";
  userMsg += `${findingsLabel}:\n${params.findingsText}`;

  return { system, user: userMsg };
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
- Si hay múltiples hallazgos en una sección, sepáralos con PUNTOS (.), NUNCA con comas (,) ni punto y coma (;). Cada hallazgo es una oración independiente.
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
- Se houver múltiplos achados em uma seção, separe-os com PONTOS (.), NUNCA com vírgulas (,) nem ponto e vírgula (;). Cada achado é uma frase independente.
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
7. CORRECT ANATOMICAL PLACEMENT — CRITICAL RULE:
   Each finding MUST go in the section whose ANATOMICAL STRUCTURE exactly matches the structure described in the finding. Do NOT place a finding in a section just because they are in the same body region or share a keyword.

   PRINCIPLE: Ask "is the anatomical structure this finding describes THE structure that the section names?" If NO, that finding does NOT go there.

   Common errors you MUST avoid:
   - "Trachea and bronchi" is NOT thyroid, NOT pulmonary arteries, NOT esophagus, NOT mediastinum.
   - "Lung" or "Lung parenchyma" is NOT pleura (if a pleura section exists), NOT pulmonary arteries, NOT mediastinum.
   - "Liver" is NOT gallbladder (if a gallbladder section exists), NOT portal vein, NOT bile ducts.
   - "Kidneys" is NOT adrenal glands (if an adrenal section exists), NOT ureters, NOT bladder.
   - Vascular findings (PE, dissection, aneurysm, thrombosis) go in the vessels, arteries, heart or mediastinum section — NOT in the section of the organ they supply.
   - Soft tissue findings do NOT go in bone sections and vice versa.
   - Lymphadenopathy goes in the lymph node or mediastinum section, NOT in the section of the adjacent organ.

8. FINDINGS WITHOUT A SECTION — "ADDITIONAL FINDINGS":
   If a dictated finding does NOT fit ANY section of the template, you MUST add "Additional findings:" at the end with ALL orphan findings.
   - NEVER omit a dictated finding due to lack of a matching section.
   - NEVER force a finding into an incorrect section just to avoid creating "Additional findings". It is BETTER to have a long "Additional findings" section than to place a single finding in the wrong section.
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
- If a section has MULTIPLE findings, separate them with PERIODS (.), NEVER with commas (,) or semicolons (;). Each finding is an independent sentence.
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
  recistConfig?: RecistConfig;
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

  if (params.recistConfig) {
    system += recistInstructions(lang, params.recistConfig);
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

PASO 4 — SECCIÓN ANATÓMICA CORRECTA: Para CADA hallazgo, pregúntate: "¿la estructura anatómica que describe este hallazgo ES la estructura que nombra esta sección?" Si NO, MUÉVELO. Errores típicos: hallazgos vasculares en secciones de parénquima o vía aérea, hallazgos pleurales en "Pulmón", hallazgos tiroideos en "Tráquea", hallazgos de vesícula en "Hígado", adenopatías en la sección de un órgano adyacente. Si no hay sección correcta, manda el hallazgo a "Otros hallazgos:".

Si detectas un error en cualquier paso, CORRÍGELO antes de responder.`,
    en: `

⚠️⚠️⚠️ MANDATORY FINAL VERIFICATION — EXECUTE THESE STEPS MENTALLY BEFORE RESPONDING:

STEP 1 — ANTI-OMISSION: List every individual finding from the dictation (positive AND negative). Does each one appear in your report? If ANY is missing, add it to the correct section or "Additional findings:". An omitted finding can cause a diagnostic error.

STEP 2 — ANTI-HALLUCINATION: Review every sentence in your report that describes an abnormal (pathological) finding. Does each abnormal finding have direct support in the dictation? If NOT, REMOVE it immediately. NORMALITY phrases in unmentioned sections are NOT hallucinations — they are a required part of the structured report.

STEP 3 — EXACT DATA: Verify that every measurement (mm, cm), number, laterality (right/left), and anatomical location matches EXACTLY with the dictation. Do not round, do not swap laterality, do not move findings to incorrect sections.

STEP 4 — CORRECT ANATOMICAL SECTION: For EACH finding, ask yourself: "is the anatomical structure this finding describes THE structure that this section names?" If NOT, MOVE it. Common errors: vascular findings in parenchyma or airway sections, pleural findings in "Lung", thyroid findings in "Trachea", gallbladder findings in "Liver", lymphadenopathy in the section of an adjacent organ. If no correct section exists, send the finding to "Additional findings:".

If you detect an error in any step, CORRECT it before responding.`,
    pt: `

⚠️⚠️⚠️ VERIFICAÇÃO FINAL OBRIGATÓRIA — EXECUTE ESTES PASSOS MENTALMENTE ANTES DE RESPONDER:

PASSO 1 — ANTI-OMISSÃO: Enumere cada achado individual do ditado (positivo E negativo). Cada um aparece no seu laudo? Se ALGUM estiver faltando, adicione-o à seção correta ou a "Outros achados:". Um achado omitido pode causar um erro diagnóstico.

PASSO 2 — ANTI-ALUCINAÇÃO: Revise cada frase do seu laudo que descreve um achado anormal (patológico). Cada achado anormal tem suporte direto no ditado? Se NÃO tiver, REMOVA-O imediatamente. Frases de NORMALIDADE em seções não mencionadas NÃO são alucinações — são parte obrigatória do laudo estruturado.

PASSO 3 — DADOS EXATOS: Verifique que cada medida (mm, cm), número, lateralidade (direita/esquerda) e localização anatômica coincide EXATAMENTE com o ditado. Não arredonde, não troque lateralidade, não mova achados para seções incorretas.

PASSO 4 — SEÇÃO ANATÔMICA CORRETA: Para CADA achado, pergunte-se: "a estrutura anatômica que este achado descreve É a estrutura que esta seção nomeia?" Se NÃO, MOVA-O. Erros típicos: achados vasculares em seções de parênquima ou via aérea, achados pleurais em "Pulmão", achados tireoidianos em "Traqueia", achados de vesícula em "Fígado", linfonodomegalias na seção de um órgão adjacente. Se não há seção correta, mande o achado para "Outros achados:".

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
  isRecistStudy?: boolean;
  recistConfig?: RecistConfig;
}): { system: string; user: string } {
  if (params.isCardiacMri) {
    return buildCardiacConclusionPrompt({
      findingsText: params.findingsText,
      clinicalInfo: params.clinicalInfo,
      outputLanguage: params.outputLanguage,
    });
  }

  if (params.isRecistStudy) {
    return buildRecistConclusionPrompt({
      findingsText: params.findingsText,
      clinicalInfo: params.clinicalInfo,
      outputLanguage: params.outputLanguage,
      isBaseline: params.recistConfig?.isBaseline ?? false,
    });
  }

  const lang = params.outputLanguage;
  const l = LANGUAGE_LABEL[lang];
  const hasClinical = params.clinicalInfo.trim().length > 0;
  const style = params.conclusionStyle || "concise";

  const findingsLen = params.findingsText.length;
  const maxPoints = findingsLen > 5000 ? 6 : findingsLen > 3000 ? 5 : 4;

  const STYLE_BLOCK_ES: Record<ConclusionStyle, string> = {
    concise: `ESTILO — CONCISO:
- Cada punto es UNA SOLA FRASE breve, directa y accionable.
- Sin subordinadas largas ni explicaciones. Solo el dato clave condensado.
- Usa paréntesis para medidas y datos: "Aumento de la lesión hepática del segmento VII (2→3.5 cm) con nueva adenopatía retroperitoneal (15 mm)."
- Tono: directo, escueto, descriptivo.`,
    grouped: `ESTILO — INTEGRADO:
- Cada punto es UNA o DOS frases completas y bien redactadas, NUNCA más.
- Incluye datos descriptivos integrados en la frase: tamaño, localización, densidad/señal, evolución.
- SOLO conecta hallazgos dentro de un punto si son parte del MISMO PROCESO PATOLÓGICO (ej: lesión primaria + sus adenopatías, derrame + atelectasia compresiva).
- Si dos hallazgos no comparten fisiopatología, van en PUNTOS SEPARADOS aunque ambos sean importantes.
- NO fuerces conectores entre hallazgos independientes. Cada punto es una unidad clínica coherente.
- NUNCA desgloses datos en sub-listas ni uses ":" para enumerar dentro de un punto.
- Tono: integrador pero riguroso, sintético, descriptivo.`,
  };

  const STYLE_BLOCK_EN: Record<ConclusionStyle, string> = {
    concise: `STYLE — CONCISE:
- Each point is ONE SINGLE brief, direct, actionable phrase.
- No long subordinate clauses or explanations. Only the key data condensed.
- Use parentheses for measurements and data: "Interval increase of segment VII hepatic lesion (2→3.5 cm) with new retroperitoneal lymph node (15 mm)."
- Tone: direct, succinct, descriptive.`,
    grouped: `STYLE — INTEGRATED:
- Each point is ONE or TWO complete, well-written sentences, NEVER more.
- Include descriptive data integrated into the sentence: size, location, density/signal, evolution.
- ONLY connect findings within a point if they are part of the SAME PATHOLOGICAL PROCESS (e.g., primary lesion + its lymphadenopathy, effusion + compressive atelectasis).
- If two findings do not share pathophysiology, they go in SEPARATE POINTS even if both are important.
- Do NOT force connectors between independent findings. Each point is a coherent clinical unit.
- NEVER break data into sub-lists or use ":" to enumerate within a point.
- Tone: integrative but rigorous, synthetic, descriptive.`,
  };

  const STYLE_BLOCK_PT: Record<ConclusionStyle, string> = {
    concise: `ESTILO — CONCISO:
- Cada ponto é UMA ÚNICA frase breve, direta e acionável.
- Sem orações subordinadas longas nem explicações. Apenas o dado-chave condensado.
- Use parênteses para medidas e dados: "Aumento da lesão hepática do segmento VII (2→3,5 cm) com nova linfonodomegalia retroperitoneal (15 mm)."
- Tom: direto, sucinto, descritivo.`,
    grouped: `ESTILO — INTEGRADO:
- Cada ponto é UMA ou DUAS frases completas e bem redigidas, NUNCA mais.
- Inclua dados descritivos integrados na frase: tamanho, localização, densidade/sinal, evolução.
- SOMENTE conecte achados dentro de um ponto se fizerem parte do MESMO PROCESSO PATOLÓGICO (ex: lesão primária + suas linfonodomegalias, derrame + atelectasia compressiva).
- Se dois achados não compartilham fisiopatologia, vão em PONTOS SEPARADOS mesmo que ambos sejam importantes.
- NÃO force conectores entre achados independentes. Cada ponto é uma unidade clínica coerente.
- NUNCA desmembre dados em sub-listas nem use ":" para enumerar dentro de um ponto.
- Tom: integrador mas rigoroso, sintético, descritivo.`,
  };

  let system: string;

  if (lang === "es") {
    system = `Eres un radiólogo experto redactando la CONCLUSIÓN de un informe radiológico. Tu rol es sintetizar los hallazgos como lo haría un radiólogo senior experimentado: priorizando jerárquicamente lo clínicamente relevante, resolviendo la pregunta clínica cuando exista, y organizando la información en puntos accionables que van al grano.

IDIOMA DE SALIDA: ${l}. Toda la conclusión debe estar en ${l}.
Si los hallazgos están en otro idioma, traduce al ${l}.

${STYLE_BLOCK_ES[style]}

REGLA ABSOLUTA — DATOS CLÍNICOS ≠ HALLAZGOS:
Los "Datos clínicos / pregunta clínica" son CONTEXTO proporcionado por el médico solicitante. Sirven ÚNICAMENTE para entender qué buscar y priorizar en los hallazgos. NUNCA deben aparecer en la conclusión como si fueran hallazgos descritos por el radiólogo.
- Si los datos clínicos dicen "paciente con antecedente de cáncer de mama", NO puedes escribir en la conclusión "antecedente de neoplasia mamaria" ni "en paciente oncológica" — eso es información clínica, NO un hallazgo radiológico.
- Si los datos clínicos dicen "dolor abdominal y fiebre", NO puedes mencionar dolor ni fiebre en la conclusión — no son hallazgos de imagen.
- La conclusión SOLO puede contener información que el radiólogo DESCRIBIÓ en los hallazgos. Ni una palabra más.
- NUNCA uses los datos clínicos para emitir diagnósticos o correlaciones que el radiólogo no haya hecho explícitamente en los hallazgos. Si los hallazgos dicen "consolidación en LID" y los datos clínicos dicen "fiebre", NO puedes concluir "neumonía" — solo puedes decir "consolidación en LID".

REGLAS DE CONTENIDO:

1. MÁXIMO ${maxPoints} PUNTOS. Nunca más. Si todo cabe en 1 o 2, mejor.
   - Cada punto debe abordar UN SOLO tema clínico o proceso patológico. NUNCA mezcles hallazgos no relacionados en el mismo punto para ahorrar espacio.
   - Cada punto debe ser BREVE: máximo 2-3 frases. Si un punto crece demasiado, estás mezclando cosas o añadiendo detalles que pertenecen a hallazgos, no a la conclusión.

2. TRIAJE PARA INFORMES COMPLEJOS — la conclusión NO es un resumen de todo:
   - Si los hallazgos son muy extensos, SELECCIONA solo los más relevantes clínicamente. Para eso están los hallazgos detallados.
   - Es MEJOR una conclusión de ${maxPoints} puntos enfocados que intente incluir absolutamente todo, produciendo párrafos largos e incoherentes.
   - DESCARTA sin miedo: hallazgos degenerativos crónicos estables, hallazgos incidentales menores, normalidades de órganos, y cualquier hallazgo que no cambie el manejo clínico inmediato.

3. JERARQUÍA CLÍNICA ESTRICTA — piensa como un radiólogo experto:
   - PRIMERO: lo que responde a la pregunta clínica o lo que el clínico NECESITA saber de forma urgente (hallazgos agudos, hallazgos que cambian el manejo inmediato).
   - SEGUNDO: otros hallazgos patológicos clínicamente significativos que impacten en el manejo a corto/medio plazo.
   - TERCERO (si aplica): hallazgos incidentales que requieran seguimiento o acción, pero SOLO si son clínicamente relevantes.
   - NUNCA: órganos normales, variantes anatómicas irrelevantes, hallazgos incidentales triviales (quistes simples renales/hepáticos pequeños, pequeños osteofitos degenerativos, etc.) SALVO que sean la razón del estudio.
   - Si un hallazgo no cambia nada para el clínico, no lo incluyas.

4. AGRUPACIÓN POR PROCESO PATOLÓGICO:
   Agrupa hallazgos que forman parte del MISMO proceso patológico o que se relacionan entre sí en un solo punto. El clínico necesita entender la historia completa de cada problema, no una lista fragmentada.
   - Ej: lesión focal hepática + adenopatías regionales + alteración de marcadores → un solo punto que describe el conjunto.
   - Ej: derrame pleural + atelectasia compresiva adyacente → un solo punto.
   - Ej: fractura vertebral + canal estrecho + compresión medular → un solo punto.
   - Hallazgos que NO se relacionan entre sí van en PUNTOS SEPARADOS.
   - Hallazgos que muestren MEJORÍA pueden agruparse separados de los que muestren EMPEORAMIENTO.

5. ${hasClinical ? `PREGUNTA CLÍNICA PROPORCIONADA — RESUÉLVELA:
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

6. HALLAZGOS NEGATIVOS:
   - Incluye un negativo pertinente SOLO si responde a la pregunta clínica (explícita o deducida).
   - Ej: pregunta "descartar TEP" → "Sin evidencia de TEP" es relevante y va en el primer punto.
   - NUNCA listes normalidad como relleno.

7. COMPARACIONES CON PREVIOS:
   - Si se mencionan cambios respecto a estudios previos, inclúyelos DENTRO del punto del hallazgo correspondiente.
   - Califica la evolución con precisión: aumento/disminución de tamaño (con medidas), aparición/desaparición, estabilidad.
   - Los cambios evolutivos son información de alto valor clínico — no los omitas.

8. COMPRENSIÓN DE LOS HALLAZGOS:
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
- Añadir información no presente en los hallazgos. Los datos clínicos NO son hallazgos — no los menciones, parafrasees ni incorpores a la conclusión de ninguna forma.
- Emitir diagnósticos que el radiólogo NO escribió en los hallazgos, aunque los datos clínicos lo sugieran. Si los hallazgos no dicen "fractura", no puedes concluir "fractura" aunque los datos clínicos digan "traumatismo".
- Muletillas ("se observa", "se identifica", "se evidencia", "cabe destacar").

EXCEPCIÓN: Usa terminología diagnóstica SOLO si está explícitamente en los hallazgos dictados por el radiólogo (ej: si los hallazgos dicen "fractura", puedes decir "fractura"; si dicen "nódulo", no digas "tumor").

Si no hay hallazgos relevantes: "${hasClinical ? "Sin hallazgos significativos en relación con la pregunta clínica." : "Exploración dentro de límites normales."}"

FORMATO:
- Puntos numerados. Texto plano. Máximo ${maxPoints}.
- Cada punto es UNA FRASE o como máximo DOS frases corridas. NUNCA tres o más.
- PROHIBIDO crear sub-puntos, sub-listas o enumeraciones dentro de un punto. Nada de ":" seguido de lista, ni "a)", "b)", ni viñetas internas, ni punto y coma para separar ítems en serie.
- Si un hallazgo tiene varios datos, intégralos en una sola frase fluida usando paréntesis y comas, NO los desgloses en sub-ítems.
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

ABSOLUTE RULE — CLINICAL DATA ≠ FINDINGS:
"Clinical data / clinical question" is CONTEXT provided by the referring physician. It serves ONLY to understand what to look for and prioritize in the findings. It must NEVER appear in the conclusion as if it were a finding described by the radiologist.
- If clinical data says "patient with history of breast cancer", you CANNOT write "history of breast neoplasm" or "in oncologic patient" in the conclusion — that is clinical information, NOT a radiological finding.
- If clinical data says "abdominal pain and fever", you CANNOT mention pain or fever in the conclusion — they are not imaging findings.
- The conclusion may ONLY contain information that the radiologist DESCRIBED in the findings. Not a single word more.
- NEVER use clinical data to issue diagnoses or correlations that the radiologist did not explicitly make in the findings. If findings say "RLL consolidation" and clinical data says "fever", you CANNOT conclude "pneumonia" — you can only say "RLL consolidation".

CONTENT RULES:

1. MAXIMUM ${maxPoints} POINTS. Never more. If 1 or 2 suffice, better.
   - Each point must address ONE SINGLE clinical topic or pathological process. NEVER mix unrelated findings in the same point to save space.
   - Each point must be BRIEF: maximum 2-3 sentences. If a point grows too long, you are mixing topics or adding detail that belongs in the findings, not the conclusion.

2. TRIAGE FOR COMPLEX REPORTS — the conclusion is NOT a summary of everything:
   - If findings are very extensive, SELECT only the most clinically relevant ones. That is what the detailed findings section is for.
   - A conclusion with ${maxPoints} focused points is BETTER than one that tries to include absolutely everything, producing long incoherent paragraphs.
   - DISCARD without hesitation: stable chronic degenerative findings, minor incidental findings, normal organs, and any finding that does not change immediate clinical management.

3. STRICT CLINICAL HIERARCHY — think like an expert radiologist:
   - FIRST: what answers the clinical question or what the clinician NEEDS to know urgently (acute findings, findings that change immediate management).
   - SECOND: other clinically significant pathological findings that impact short/medium-term management.
   - THIRD (if applicable): incidental findings requiring follow-up or action, but ONLY if clinically relevant.
   - NEVER: normal organs, irrelevant anatomical variants, trivial incidental findings (small simple renal/hepatic cysts, small degenerative osteophytes, etc.) UNLESS they are the reason for the study.
   - If a finding changes nothing for the clinician, do not include it.

4. GROUPING BY PATHOLOGICAL PROCESS:
   Group findings that are part of the SAME pathological process or that relate to each other into a single point. The clinician needs to understand the complete picture of each problem, not a fragmented list.
   - E.g.: focal hepatic lesion + regional lymphadenopathy + marker abnormalities → one single point describing the whole picture.
   - E.g.: pleural effusion + adjacent compressive atelectasis → one single point.
   - E.g.: vertebral fracture + narrow canal + cord compression → one single point.
   - Findings that are NOT related go in SEPARATE POINTS.
   - Findings showing IMPROVEMENT may be grouped separately from those showing WORSENING.

5. ${hasClinical ? `CLINICAL QUESTION PROVIDED — ANSWER IT:
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

6. NEGATIVE FINDINGS:
   - Include a pertinent negative ONLY if it answers the clinical question (explicit or deduced).
   - E.g.: question "rule out PE" → "No evidence of PE" is relevant and goes in the first point.
   - NEVER list normality as filler.

7. COMPARISON WITH PRIOR STUDIES:
   - If changes compared to prior studies are mentioned, include them WITHIN the corresponding finding's point.
   - Qualify evolution precisely: size increase/decrease (with measurements), appearance/disappearance, stability.
   - Evolutionary changes are high-value clinical information — do not omit them.

8. COMPREHENSION OF FINDINGS:
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
- Adding information not present in the findings. Clinical data is NOT findings — do not mention, paraphrase, or incorporate it into the conclusion in any form.
- Issuing diagnoses that the radiologist did NOT write in the findings, even if clinical data suggests them. If findings do not say "fracture", you cannot conclude "fracture" even if clinical data says "trauma".
- Filler phrases ("noted", "identified", "visualized", "presence of").

EXCEPTION: Use diagnostic terminology ONLY if it is explicitly stated in the radiologist's dictated findings (e.g., if findings say "fracture", you may say "fracture"; if findings say "nodule", do not say "tumor").

If no relevant findings: "${hasClinical ? "No significant findings regarding the clinical question." : "Examination within normal limits."}"

FORMAT:
- Numbered points. Plain text. Maximum ${maxPoints}.
- Each point is ONE sentence or at most TWO flowing sentences. NEVER three or more.
- FORBIDDEN to create sub-points, sub-lists or enumerations inside a point. No ":" followed by a list, no "a)", "b)", no internal bullets, no semicolons separating items in series.
- If a finding has multiple data, integrate them into a single flowing sentence using parentheses and commas, do NOT break them into sub-items.
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

