/**
 * Recommendations the RADIOLOGIST dictated.
 *
 * A recommendation is not a finding. Dictated mid-flow it was landing in
 * whichever anatomical section it happened to follow — "Hígado: lesión de 12
 * mm. Se recomienda control en 6 meses." — which reads as though the liver
 * section recommends something, and leaves the conclusion, where a clinician
 * looks for it, without it.
 *
 * These are pulled out deterministically rather than by asking a model,
 * because the one thing that must never happen is a recommendation appearing
 * that nobody dictated. Everything here starts as the radiologist's own words
 * and is reproduced verbatim; nothing is generated, rephrased or inferred.
 */

/** Openings that mark a sentence as a recommendation rather than a finding. */
const RECOMMENDATION_CUES = [
  // es
  "se recomienda", "recomiendo", "recomendamos", "se sugiere", "sugiero",
  "se aconseja", "aconsejo", "se propone", "conviene", "debería realizarse",
  "control en", "control a los", "seguimiento en", "seguimiento a los",
  "repetir en", "repetir el estudio", "completar con", "completar estudio",
  "valorar con", "correlacionar con", "correlación clínica", "correlacionar clínicamente",
  "se indica", "indicada biopsia", "se aconsejaría", "remitir a",
  // en
  "it is recommended", "we recommend", "recommend ", "recommended ",
  "suggest ", "suggested ", "advise ", "advised ", "follow-up in", "follow up in",
  "repeat in", "repeat the study", "correlate with", "clinical correlation",
  "consider ", "further evaluation with", "refer to",
  // pt
  "recomenda-se", "recomendo", "recomendamos", "sugere-se", "sugiro",
  "aconselha-se", "controle em", "seguimento em", "repetir em",
  "completar com", "correlacionar com", "correlação clínica", "encaminhar para",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const CUES_N = RECOMMENDATION_CUES.map(normalize);

/**
 * Splits into sentences, treating a period between two digits as a decimal
 * ("3.5 cm") rather than a sentence end — the same rule the findings splitter
 * uses, for the same reason.
 */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "\n" && ch !== ";") continue;
    if (ch === ".") {
      const prev = text[i - 1] || "";
      const next = text[i + 1];
      if (/\d/.test(prev) && next !== undefined && /\d/.test(next)) continue;
      if (next !== undefined && !/[\s\n]/.test(next)) continue;
    }
    const seg = text.slice(start, i + 1).trim();
    if (seg) out.push(seg);
    start = i + 1;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

export function isRecommendationSentence(sentence: string): boolean {
  const s = normalize(sentence);
  return CUES_N.some((cue) => s.includes(cue));
}

/**
 * The recommendation sentences in a dictation, verbatim and in order.
 *
 * Returns the radiologist's exact words: these go into the conclusion as
 * dictated, so any tidying here would be the platform putting words in their
 * mouth about patient management.
 */
export function extractDictatedRecommendations(dictation: string, limit = 6): string[] {
  if (!dictation || !dictation.trim()) return [];
  const out: string[] = [];
  for (const sentence of splitSentences(dictation)) {
    if (out.length >= limit) break;
    const clean = sentence.replace(/^[\s;.]+/, "").trim();
    if (clean.length < 8) continue;
    if (isRecommendationSentence(clean)) out.push(clean);
  }
  return out;
}
