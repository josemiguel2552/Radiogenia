/**
 * Deterministic post-filter for radiology CONCLUSIONS.
 *
 * The conclusion prompt instructs the model to DESCRIBE, not DIAGNOSE, but LLMs
 * are probabilistic and occasionally leak diagnostic/interpretive language. This
 * module is a second, deterministic safety net that flags (does NOT delete) such
 * language so the radiologist can review it.
 *
 * Categories:
 *  - interpretation: inference wrappers ("compatible con", "suggestive of"…)
 *  - recommendation: actions/follow-up ("se recomienda", "clinical correlation"…)
 *  - scale: reporting scales (BI-RADS, TNM, Bosniak…)
 *  - diagnosis: disease/entity names — flagged ONLY when the term does NOT appear
 *    in the dictated findings (mirrors the prompt's "verbatim exception").
 *
 * Matching is accent- and case-insensitive via a length-preserving fold, so match
 * indices map 1:1 back onto the original text.
 */

export type DiagnosisMatchType = "interpretation" | "recommendation" | "scale" | "diagnosis";

export interface DiagnosisMatch {
  type: DiagnosisMatchType;
  value: string;
  index: number;
}

// ---------------------------------------------------------------------------
// Length-preserving fold (lowercase + strip accents), so indices stay aligned.
// ---------------------------------------------------------------------------
const FOLD: Record<string, string> = {
  á: "a", à: "a", ä: "a", â: "a", ã: "a",
  é: "e", è: "e", ë: "e", ê: "e",
  í: "i", ì: "i", ï: "i", î: "i",
  ó: "o", ò: "o", ö: "o", ô: "o", õ: "o",
  ú: "u", ù: "u", ü: "u", û: "u",
  ñ: "n", ç: "c",
};

function fold(s: string): string {
  return s.toLowerCase().replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (c) => FOLD[c] || c);
}

// ---------------------------------------------------------------------------
// Phrase lists (already folded: lowercase, no accents)
// ---------------------------------------------------------------------------
const INTERPRETATION_PHRASES = [
  // Spanish
  "compatible con", "compatibles con", "en relacion con", "en probable relacion con",
  "en probable relacion", "sugestivo de", "sugestiva de", "sugerente de", "sugiere",
  "sugieren", "indicativo de", "indicativa de", "consistente con", "concordante con",
  "en el contexto de", "secundario a", "secundaria a", "a favor de", "sospechoso de",
  "sospechosa de", "sospecha de", "de aspecto benigno", "de aspecto maligno",
  "de aspecto tipico", "de aspecto neoplasico", "de aspecto inflamatorio",
  "de aspecto infeccioso", "de aspecto tumoral", "probablemente", "posiblemente",
  // English
  "consistent with", "compatible with", "suggestive of", "in keeping with",
  "indicative of", "secondary to", "in the context of", "suspicious for",
  "concerning for", "in relation to", "likely represents", "probably", "possibly",
  "likely", "favors", "favours",
  // Portuguese
  "compativel com", "sugestivo de", "sugere", "em relacao a", "em relacao com",
  "no contexto de", "suspeito de", "suspeita de", "provavelmente", "possivelmente",
];

const RECOMMENDATION_PHRASES = [
  // Spanish
  "se recomienda", "recomendamos", "se sugiere", "sugerimos", "se aconseja",
  "correlacion clinica", "correlacionar clinicamente", "correlacionar con la clinica",
  "control en", "seguimiento en", "completar con", "ampliar estudio", "considerar",
  // English
  "clinical correlation", "correlate clinically", "follow-up", "follow up",
  "further evaluation", "further assessment", "we recommend", "is recommended",
  "recommended", "consider",
  // Portuguese
  "recomenda-se", "sugere-se", "controle em", "seguimento em", "correlacao clinica",
  "complementar com",
];

const SCALE_PHRASES = [
  "bi-rads", "birads", "bi rads", "ti-rads", "tirads", "ti rads", "pi-rads", "pirads",
  "pi rads", "li-rads", "lirads", "li rads", "lung-rads", "lung rads", "lungrads",
  "o-rads", "orads", "c-rads", "ni-rads", "tnm", "bosniak", "fleischner",
];

// Disease/entity stems — flagged only if absent from the dictated findings.
const DIAGNOSIS_STEMS = [
  "neumonia", "pneumonia", "metasta", "absces", "adenocarcinoma", "colangiocarcinoma",
  "hepatocarcinoma", "carcinoma", "adenoma", "neoplas", "tumoral", "tumor", "recidiv",
  "recurrenc", "isquemi", "ischemi", "infarto", "infarction", "colecistitis",
  "cholecystitis", "colecistite", "apendicitis", "appendicitis", "apendicite",
  "pancreatitis", "pancreatite", "diverticulitis", "diverticulite", "hemangioma",
  "angiomiolipoma", "angiomyolipoma", "linfoma", "lymphoma", "sarcoma", "melanoma",
  "glioma", "meningioma", "schwannoma", "malign", "tuberculos",
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPhraseRegex(phrases: string[]): RegExp {
  // Longest first so multi-word phrases win over their prefixes.
  const sorted = [...phrases].sort((a, b) => b.length - a.length).map(escapeRegex);
  return new RegExp(`\\b(?:${sorted.join("|")})\\b`, "g");
}

const INTERPRETATION_RE = buildPhraseRegex(INTERPRETATION_PHRASES);
const RECOMMENDATION_RE = buildPhraseRegex(RECOMMENDATION_PHRASES);
const SCALE_RE = buildPhraseRegex(SCALE_PHRASES);
const DIAGNOSIS_RE = new RegExp(
  `\\b(${[...DIAGNOSIS_STEMS].sort((a, b) => b.length - a.length).join("|")})[a-z]*`,
  "g",
);

function collectPhrase(
  folded: string,
  original: string,
  re: RegExp,
  type: DiagnosisMatchType,
  out: DiagnosisMatch[],
): void {
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(folded)) !== null) {
    out.push({ type, value: original.slice(m.index, m.index + m[0].length), index: m.index });
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function detectDiagnoses(conclusion: string, findings = ""): DiagnosisMatch[] {
  if (!conclusion || !conclusion.trim()) return [];

  const folded = fold(conclusion);
  const foldedFindings = fold(findings);
  const out: DiagnosisMatch[] = [];

  collectPhrase(folded, conclusion, INTERPRETATION_RE, "interpretation", out);
  collectPhrase(folded, conclusion, RECOMMENDATION_RE, "recommendation", out);
  collectPhrase(folded, conclusion, SCALE_RE, "scale", out);

  // Disease names — allow if the radiologist dictated the same term.
  DIAGNOSIS_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DIAGNOSIS_RE.exec(folded)) !== null) {
    const stem = m[1];
    if (foldedFindings.includes(stem)) continue; // dictated → allowed
    out.push({ type: "diagnosis", value: conclusion.slice(m.index, m.index + m[0].length), index: m.index });
  }

  // Resolve overlaps: keep the earliest, longest match.
  out.sort((a, b) => a.index - b.index || b.value.length - a.value.length);
  const deduped: DiagnosisMatch[] = [];
  let lastEnd = -1;
  for (const match of out) {
    if (match.index >= lastEnd) {
      deduped.push(match);
      lastEnd = match.index + match.value.length;
    }
  }
  return deduped;
}

export function hasDiagnosticLanguage(conclusion: string, findings = ""): boolean {
  return detectDiagnoses(conclusion, findings).length > 0;
}

/** Unique, lowercased flagged terms for display (max `limit`). */
export function summarizeDiagnoses(conclusion: string, findings = "", limit = 8): string[] {
  const seen = new Set<string>();
  for (const m of detectDiagnoses(conclusion, findings)) {
    const key = m.value.trim().toLowerCase();
    if (key) seen.add(key);
    if (seen.size >= limit) break;
  }
  return [...seen];
}
