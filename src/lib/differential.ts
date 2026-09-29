/**
 * Differential diagnosis assistant — prompt, parsing and source links.
 *
 * ON SOURCES. The model is NOT asked to cite Radiopaedia, or any other
 * reference, by URL or article title. Asked for citations, a language model
 * produces plausible ones, and a fabricated reference on a differential is
 * worse than none: it reads as verification while being the opposite. Instead
 * every entity it names gets a DETERMINISTIC search link built from the name
 * itself, so the radiologist reaches the real article in one click and the
 * source is whatever they find there, not whatever the model remembered.
 *
 * ON SCOPE. This produces hypotheses for a radiologist to weigh, from an image
 * they chose and data they typed. It is a thinking aid, deliberately separate
 * from the reporting flow, and nothing it returns can reach a report.
 */

export type DifferentialLang = "es" | "en" | "pt";

export interface DifferentialItem {
  /** The entity, as the model names it. */
  name: string;
  /** Why this image fits it — the features actually present. */
  supporting: string;
  /** What argues against it, or what is missing. */
  against: string;
  /** The one thing that would most move this up or down the list. */
  discriminator: string;
  /** Deterministic reference search, built from `name`. */
  radiopaediaUrl: string;
}

export interface DifferentialResult {
  /** What the model describes seeing, before naming anything. */
  observation: string;
  items: DifferentialItem[];
  /** What extra information would narrow the list fastest. */
  nextStep: string;
}

/** Body regions offered in the dropdown. Value is stable; label is per-language. */
export const BODY_REGIONS = [
  "neuro", "head_neck", "chest", "cardiac", "breast", "abdomen", "pelvis",
  "genitourinary", "hepatobiliary", "musculoskeletal", "spine", "vascular", "paediatric",
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];

export function isBodyRegion(v: unknown): v is BodyRegion {
  return typeof v === "string" && (BODY_REGIONS as readonly string[]).includes(v);
}

/**
 * A Radiopaedia search URL for an entity name. Search rather than a direct
 * article path: article slugs are not derivable from a name, so a constructed
 * path would 404 a good share of the time, while a search always resolves.
 */
export function radiopaediaSearchUrl(entityName: string): string {
  return `https://radiopaedia.org/search?q=${encodeURIComponent(entityName.trim())}&scope=articles`;
}

const SYSTEM: Record<DifferentialLang, string> = {
  es: `Eres un radiólogo consultor experto ayudando a otro radiólogo a construir un diagnóstico diferencial a partir de una o más imágenes que él ha seleccionado.

QUÉ SE ESPERA DE TI:
1. Primero DESCRIBE lo que ves, objetivamente: morfología, márgenes, densidad/señal, localización, tamaño relativo, realce si se aprecia, efecto sobre estructuras vecinas. Esta descripción es lo que sostiene todo lo demás.
2. Después propón HASTA 5 diagnósticos diferenciales, del más probable al menos probable. CINCO ES UN TECHO, NO UNA CUOTA: si la imagen y los datos solo sostienen dos entidades razonables, devuelve dos. Rellenar huecos con entidades remotas es dar respuestas equivocadas con la misma cara que las buenas.
3. Para cada uno: qué rasgos de ESTA imagen lo apoyan, qué lo pone en duda o qué falta, y el ÚNICO dato que más lo confirmaría o descartaría.
4. Termina diciendo qué información adicional estrecharía más el diferencial (secuencia, fase, dato clínico, comparación con previo).

REGLAS:
- Trabaja SOLO con lo que se ve y con los datos que te den. No inventes hallazgos, medidas ni antecedentes.
- Si el radiólogo ha marcado una región con un recuadro, céntrate en ella; el resto de la imagen es contexto.
- Si le han dado unidades Hounsfield, úsalas: son un dato duro y discriminan mucho. Si no, no las supongas ni las estimes a ojo.
- Si la calidad, el encuadre o la ventana no permiten una lectura razonable, DILO en la observación y baja la confianza en consecuencia. Es preferible decir "esta imagen no da para más" que rellenar cinco huecos.
- Si usas las referencias que se te dan abajo, CÍTALAS POR SU CIFRA ("< 10 UH sin contraste", "lavado absoluto > 60%"), no de memoria. Si una referencia contradice tu intuición, manda la referencia.
- NO cites artículos, URLs, autores ni referencias bibliográficas. No los tienes delante y no debes inventarlos. Nombra la entidad; de los enlaces se encarga la aplicación.
- NO recomiendes tratamiento. Puedes decir qué prueba o dato discriminaría, que es parte del razonamiento radiológico.

Responde ÚNICAMENTE con JSON válido, sin texto alrededor y sin markdown:
{"observation":"...","items":[{"name":"...","supporting":"...","against":"...","discriminator":"..."}],"nextStep":"..."}`,

  en: `You are an expert consultant radiologist helping another radiologist build a differential diagnosis from one or more images they have selected.

WHAT IS EXPECTED OF YOU:
1. First DESCRIBE what you see, objectively: morphology, margins, density/signal, location, relative size, enhancement if visible, effect on neighbouring structures. This description is what everything else rests on.
2. Then propose UP TO 5 differential diagnoses, most to least likely. FIVE IS A CEILING, NOT A QUOTA: if the image and the data support only two reasonable entities, return two. Padding the list with remote entities is giving wrong answers wearing the same face as the good ones.
3. For each: which features of THIS image support it, what casts doubt on it or is missing, and the SINGLE piece of information that would most confirm or exclude it.
4. Finish by saying what additional information would narrow the differential fastest (sequence, phase, clinical detail, comparison with a prior).

RULES:
- Work ONLY from what is visible and the data given. Do not invent findings, measurements or history.
- If the radiologist has marked a region with a box, focus there; the rest of the image is context.
- If Hounsfield units are given, use them: they are hard data and discriminate strongly. If not, do not assume or eyeball them.
- If the quality, framing or window does not allow a reasonable read, SAY SO in the observation and lower your confidence accordingly. Better to say "this image does not support more" than to fill five slots.
- When you use the references given below, QUOTE THEIR FIGURES ("< 10 HU unenhanced", "absolute washout > 60%"), not your recollection. Where a reference contradicts your intuition, the reference wins.
- Do NOT cite articles, URLs, authors or references. You do not have them in front of you and must not invent them. Name the entity; the application handles the links.
- Do NOT recommend treatment. You may say which test or datum would discriminate, which is part of radiological reasoning.

Respond ONLY with valid JSON, no surrounding text and no markdown:
{"observation":"...","items":[{"name":"...","supporting":"...","against":"...","discriminator":"..."}],"nextStep":"..."}`,

  pt: `Você é um radiologista consultor experiente ajudando outro radiologista a construir um diagnóstico diferencial a partir de uma ou mais imagens que ele selecionou.

O QUE SE ESPERA DE VOCÊ:
1. Primeiro DESCREVA o que vê, objetivamente: morfologia, margens, densidade/sinal, localização, tamanho relativo, realce se visível, efeito sobre estruturas vizinhas. Esta descrição é o que sustenta todo o resto.
2. Depois proponha ATÉ 5 diagnósticos diferenciais, do mais ao menos provável. CINCO É UM TETO, NÃO UMA COTA: se a imagem e os dados só sustentam duas entidades razoáveis, devolva duas. Encher a lista com entidades remotas é dar respostas erradas com a mesma cara das boas.
3. Para cada um: que achados DESTA imagem o apoiam, o que o põe em dúvida ou o que falta, e o ÚNICO dado que mais o confirmaria ou excluiria.
4. Termine dizendo que informação adicional estreitaria mais o diferencial (sequência, fase, dado clínico, comparação com prévio).

REGRAS:
- Trabalhe APENAS com o que é visível e com os dados fornecidos. Não invente achados, medidas nem antecedentes.
- Se o radiologista marcou uma região com um retângulo, concentre-se nela; o resto da imagem é contexto.
- Se forem dadas unidades Hounsfield, use-as: são dado duro e discriminam muito. Se não, não as suponha nem estime a olho.
- Se a qualidade, o enquadramento ou a janela não permitirem uma leitura razoável, DIGA-O na observação e baixe a confiança. É preferível dizer "esta imagem não dá para mais" a preencher cinco espaços.
- Quando usar as referências dadas abaixo, CITE OS SEUS NÚMEROS ("< 10 UH sem contraste", "lavagem absoluta > 60%"), não a sua memória. Onde uma referência contradiz a sua intuição, manda a referência.
- NÃO cite artigos, URLs, autores nem referências. Você não os tem à frente e não deve inventá-los. Nomeie a entidade; dos links encarrega-se a aplicação.
- NÃO recomende tratamento. Pode dizer que exame ou dado discriminaria, o que faz parte do raciocínio radiológico.

Responda APENAS com JSON válido, sem texto em volta e sem markdown:
{"observation":"...","items":[{"name":"...","supporting":"...","against":"...","discriminator":"..."}],"nextStep":"..."}`,
};

export interface DifferentialInput {
  lang: DifferentialLang;
  region: BodyRegion;
  /** Region label in the radiologist's language, for the prompt. */
  regionLabel: string;
  modality?: string;
  hounsfield?: string;
  clinicalNote?: string;
  imageCount: number;
  hasRoi: boolean;
  /** Lesion size, which a windowed screenshot cannot give the model. */
  sizeMm?: string;
  /** Acquisition phase — changes what an enhancement pattern means. */
  phase?: string;
  /** Verified thresholds for this region, from the platform's own data. */
  references?: string;
}

export function buildDifferentialPrompt(input: DifferentialInput): { system: string; user: string } {
  const L = input.lang;
  const t = (es: string, en: string, pt: string) => (L === "es" ? es : L === "pt" ? pt : en);

  const lines: string[] = [];
  lines.push(t(
    `${input.imageCount} imagen(es) adjunta(s).`,
    `${input.imageCount} image(s) attached.`,
    `${input.imageCount} imagem(ns) anexada(s).`,
  ));
  lines.push(t(`Región anatómica: ${input.regionLabel}`, `Body region: ${input.regionLabel}`, `Região anatómica: ${input.regionLabel}`));
  if (input.modality) {
    lines.push(t(`Modalidad: ${input.modality}`, `Modality: ${input.modality}`, `Modalidade: ${input.modality}`));
  }
  if (input.hounsfield) {
    lines.push(t(
      `Densidad medida por el radiólogo: ${input.hounsfield}`,
      `Density measured by the radiologist: ${input.hounsfield}`,
      `Densidade medida pelo radiologista: ${input.hounsfield}`,
    ));
  } else {
    lines.push(t(
      "No se ha aportado densidad. No la estimes a ojo.",
      "No density was provided. Do not eyeball it.",
      "Não foi fornecida densidade. Não a estime a olho.",
    ));
  }
  if (input.hasRoi) {
    lines.push(t(
      "El radiólogo ha marcado con un recuadro la lesión a caracterizar. Céntrate en ella.",
      "The radiologist has boxed the lesion to characterise. Focus on it.",
      "O radiologista marcou com um retângulo a lesão a caracterizar. Concentre-se nela.",
    ));
  }
  if (input.sizeMm) {
    lines.push(t(`Tamaño medido: ${input.sizeMm}`, `Measured size: ${input.sizeMm}`, `Tamanho medido: ${input.sizeMm}`));
  }
  if (input.phase) {
    lines.push(t(`Fase/adquisición: ${input.phase}`, `Phase/acquisition: ${input.phase}`, `Fase/aquisição: ${input.phase}`));
  } else {
    lines.push(t(
      "No se ha indicado la fase. No asumas que hay contraste ni en qué momento.",
      "No phase was given. Do not assume contrast, or which phase it is.",
      "Não foi indicada a fase. Não assuma contraste nem em que momento.",
    ));
  }
  if (input.clinicalNote) {
    lines.push(t(`Datos clínicos: ${input.clinicalNote}`, `Clinical details: ${input.clinicalNote}`, `Dados clínicos: ${input.clinicalNote}`));
  }

  // Verified figures beat recalled ones, so they go last — closest to the
  // answer — and are labelled as the authority when the two disagree.
  if (input.references?.trim()) {
    lines.push("");
    lines.push(t(
      "REFERENCIAS VERIFICADAS PARA ESTA REGIÓN — úsalas con sus cifras exactas y por encima de tu memoria:",
      "VERIFIED REFERENCES FOR THIS REGION — use their exact figures, over your recollection:",
      "REFERÊNCIAS VERIFICADAS PARA ESTA REGIÃO — use os seus números exatos, acima da sua memória:",
    ));
    lines.push(input.references.trim());
  }

  return { system: SYSTEM[L], user: lines.join("\n") };
}

/**
 * Parses the model's reply. Tolerant of the wrappers models add around JSON
 * (fences, a sentence before it), because a formatting slip should not lose an
 * otherwise good answer — but it never invents a field that is not there.
 */
export function parseDifferentialResponse(raw: string): DifferentialResult | null {
  if (!raw || !raw.trim()) return null;

  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  let data: unknown;
  try {
    data = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }

  const d = data as {
    observation?: unknown;
    items?: unknown;
    nextStep?: unknown;
  };
  if (!Array.isArray(d.items)) return null;

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const items: DifferentialItem[] = d.items
    .map((it) => {
      const o = it as Record<string, unknown>;
      const name = str(o.name);
      if (!name) return null;
      return {
        name,
        supporting: str(o.supporting),
        against: str(o.against),
        discriminator: str(o.discriminator),
        radiopaediaUrl: radiopaediaSearchUrl(name),
      };
    })
    .filter((x): x is DifferentialItem => x !== null);

  if (items.length === 0) return null;

  return {
    observation: str(d.observation),
    items,
    nextStep: str(d.nextStep),
  };
}
