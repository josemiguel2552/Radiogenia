/**
 * Continuous style learning — pure utilities for diffing the initial AI
 * report against the radiologist's corrected final report.
 *
 * Scope of learning: ONLY wording changes in
 *   (a) normal-field phrases (sections the AI filled as "normal")
 *   (b) conclusion wording
 *
 * Never learned: new clinical findings, modifications to existing findings.
 */

import type { PreferredNormalPhrase } from "./types";

const MIN_PHRASE_LEN = 8;
const MAX_PHRASE_LEN = 240;

/**
 * Normality keywords across the 6 supported languages. Used to decide if a
 * section body is describing a normal state (and therefore safe to learn the
 * wording from).
 */
const NORMAL_KEYWORDS = [
  // Spanish
  "normal",
  "sin alteraciones",
  "sin hallazgos",
  "sin signos",
  "dentro de lími",
  "dentro de los lím",
  "sin particularidades",
  "conservad",
  "permeable",
  "homogén",
  // English
  "unremarkable",
  "no abnormalit",
  "within normal",
  "no evidence",
  "patent",
  "homogen",
  // Portuguese
  "sem altera",
  "normais",
  "sem sinais",
  // French
  "sans anomalie",
  "sans particular",
  "dans les limites",
  // German
  "unauffäl",
  "ohne auffäl",
  "regelrecht",
  // Italian
  "nella norma",
  "senza alteraz",
  "regolare",
];

/**
 * Parse a block of text into "Label: body" sections.
 * The findings prompt always outputs sections of the form "Label: text..."
 * with the label starting at the beginning of a line.
 */
export function splitSections(text: string): { label: string; body: string }[] {
  if (!text) return [];
  const lines = text.split("\n");
  const sections: { label: string; body: string }[] = [];
  let current: { label: string; body: string } | null = null;

  // A label is: start of line, 1–60 chars of non-colon text, then a colon
  // followed by at least one non-colon character on the same line.
  // Require the label side to be reasonably short and not contain sentence
  // punctuation, to avoid matching narrative sentences that happen to
  // contain a colon.
  const labelRegex = /^([^:\n]{1,60}?):\s*(.*)$/;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (current) current.body += "\n";
      continue;
    }
    const m = line.match(labelRegex);
    // Heuristic: treat as a label if the left side has at most 6 words
    // and no sentence-ending punctuation
    if (m && m[1].split(/\s+/).length <= 6 && !/[.!?]/.test(m[1])) {
      if (current) sections.push(normalizeSection(current));
      current = { label: m[1].trim(), body: m[2].trim() };
    } else if (current) {
      current.body += (current.body ? " " : "") + line.trim();
    }
  }
  if (current) sections.push(normalizeSection(current));
  return sections;
}

function normalizeSection(s: { label: string; body: string }) {
  return { label: s.label.trim(), body: s.body.replace(/\s+/g, " ").trim() };
}

function isValidPhrase(phrase: string): boolean {
  const len = phrase.trim().length;
  return len >= MIN_PHRASE_LEN && len <= MAX_PHRASE_LEN;
}

function looksNormal(body: string): boolean {
  if (!body) return false;
  if (body.length > 200) return false;
  const lower = body.toLowerCase();
  return NORMAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract normality phrases worth learning by comparing sections.
 *
 * Rules:
 *   - For every label present in both the initial and the final text:
 *     • if both bodies "look normal" and the radiologist *changed* the wording,
 *       store the FINAL wording as the preferred phrase for that label;
 *     • if both bodies "look normal" and the radiologist kept them identical,
 *       still record the wording (it's the preferred neutral phrase for that
 *       label going forward).
 *   - We never learn from labels that aren't in the initial (that means the
 *     radiologist *added* a section — which can involve real findings).
 *   - We never learn from sections where the initial was non-normal
 *     (a real finding — we don't want to train on how findings are worded).
 */
export function extractNormalityPhrases(
  initial: string,
  final: string,
): PreferredNormalPhrase[] {
  const initialSections = splitSections(initial);
  const finalSections = splitSections(final);
  if (initialSections.length === 0 || finalSections.length === 0) return [];

  const initialMap = new Map(initialSections.map((s) => [normalizeLabel(s.label), s.body]));
  const out: PreferredNormalPhrase[] = [];

  for (const fs of finalSections) {
    const key = normalizeLabel(fs.label);
    const initialBody = initialMap.get(key);
    if (initialBody == null) continue; // added section — skip
    if (!looksNormal(initialBody)) continue; // initial described a real finding — skip
    if (!fs.body) continue;
    if (!isValidPhrase(fs.body)) continue;

    out.push({ label: fs.label, phrase: fs.body });
  }
  return dedupe(out, (p) => `${normalizeLabel(p.label)}::${p.phrase}`);
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupe<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = keyFn(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/**
 * Extract conclusion phrases worth learning.
 *
 * We split both the initial and final conclusions into sentences. A sentence
 * from the final is considered "learned style" if it is NOT a near-duplicate
 * of any initial sentence (so we're only capturing rewording, not the
 * diagnostic content itself).
 *
 * Jaccard similarity on word sets is used; threshold 0.7.
 * Very long (>240 chars) or very short (<8 chars) sentences are filtered out.
 */
export function extractConclusionPhrases(initial: string, final: string): string[] {
  if (!final) return [];
  const initialSentences = splitSentences(initial);
  const finalSentences = splitSentences(final);
  const out: string[] = [];

  for (const fs of finalSentences) {
    if (!isValidPhrase(fs)) continue;
    // Reject sentences that carry a lot of numbers — those are usually
    // measurements of real findings.
    const digits = (fs.match(/\d/g) || []).length;
    if (digits > 6) continue;

    const isNew = !initialSentences.some((is) => jaccard(is, fs) >= 0.7);
    // We still want to learn the style of unchanged sentences if they look
    // generic. For now we prefer rewritten ones — but keep unchanged ones
    // when the initial had NO corresponding sentence at all.
    if (isNew || initialSentences.length === 0) {
      out.push(fs);
    }
  }
  return dedupe(out, (s) => s.toLowerCase().replace(/\s+/g, " "));
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  // Split on newlines, numbered bullets, or sentence terminators.
  const parts = text
    .replace(/\r/g, "")
    .split(/(?:\n+|(?<=\.)\s+|(?<=[!?])\s+|^\s*\d+[.)]\s*)/m)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts;
}

function jaccard(a: string, b: string): number {
  const wa = new Set(tokenize(a));
  const wb = new Set(tokenize(b));
  if (wa.size === 0 && wb.size === 0) return 1;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Sort phrase rows by frequency desc, last_seen_at desc; take first n.
 */
export function pickTopPhrases<T extends { frequency: number; last_seen_at: string }>(
  rows: T[],
  n: number,
): T[] {
  return [...rows]
    .sort((a, b) => {
      if (b.frequency !== a.frequency) return b.frequency - a.frequency;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    })
    .slice(0, n);
}
