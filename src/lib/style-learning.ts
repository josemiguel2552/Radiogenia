/**
 * Continuous style learning — pure utilities for extracting the radiologist's
 * preferred wording from their corrections to AI-generated reports.
 *
 * Two things we learn:
 *   (a) normality phrases — how the radiologist words sections they didn't
 *       dictate (i.e. normal/unremarkable organs)
 *   (b) conclusion style — how they structure the conclusion (single sentence,
 *       numbered points, length, tone)
 */

import type { PreferredNormalPhrase } from "./types";

const MIN_PHRASE_LEN = 5;
const MAX_PHRASE_LEN = 300;

/* ── Section parser ─────────────────────────────────────────── */

export function splitSections(text: string): { label: string; body: string }[] {
  if (!text) return [];
  const lines = text.split("\n");
  const sections: { label: string; body: string }[] = [];
  let current: { label: string; body: string } | null = null;

  const labelRegex = /^([^:\n]{1,60}?):\s*(.*)$/;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (current) current.body += "\n";
      continue;
    }
    const m = line.match(labelRegex);
    if (m && m[1].split(/\s+/).length <= 6 && !/[.!?]/.test(m[1])) {
      if (current) sections.push(norm(current));
      current = { label: m[1].trim(), body: m[2].trim() };
    } else if (current) {
      current.body += (current.body ? " " : "") + line.trim();
    }
  }
  if (current) sections.push(norm(current));
  return sections;
}

function norm(s: { label: string; body: string }) {
  return { label: s.label.trim(), body: s.body.replace(/\s+/g, " ").trim() };
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, " ").trim();
}

/* ── Normality phrase extraction ───────────────────────────── */

/**
 * Heuristic: a section body is likely describing an actual pathological
 * finding (dictated by the radiologist) if it contains measurements or
 * specific pathological descriptors.
 */
const PATHOLOGY_MARKERS = /\d+\s*(mm|cm|ml|cc|x\s*\d)|lesi[oó]n|masa|tumor|fractura|tromb|estenosis|oclusi|hernia|derrame|hemorrh|infarct|absces|metást|adenopat|calcific/i;

function looksPathological(body: string): boolean {
  return PATHOLOGY_MARKERS.test(body);
}

/**
 * Extract normality phrases by comparing initial AI output vs final edited text.
 *
 * Strategy: for every section present in both initial and final, if the initial
 * body is SHORT (< 300 chars) and doesn't contain pathological markers, record
 * the FINAL body as the preferred normality phrase for that label.
 *
 * This captures both:
 * - Sections the user EDITED (changed wording → learn their preferred phrasing)
 * - Sections the user KEPT as-is (confirmed the AI phrasing → reinforce it)
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
    if (initialBody == null) continue;
    if (looksPathological(initialBody)) continue;
    if (!fs.body || fs.body.length < MIN_PHRASE_LEN || fs.body.length > MAX_PHRASE_LEN) continue;
    if (looksPathological(fs.body)) continue;

    out.push({ label: fs.label, phrase: fs.body });
  }

  const seen = new Set<string>();
  return out.filter((p) => {
    const k = `${normalizeLabel(p.label)}::${p.phrase}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * When we don't have the initial text (e.g. migration not applied), we can
 * still extract normality phrases from the final text alone — any section
 * that is short and doesn't look pathological is probably a normal field.
 */
export function extractNormalityPhrasesFromFinal(
  final: string,
): PreferredNormalPhrase[] {
  const sections = splitSections(final);
  if (sections.length === 0) return [];

  const out: PreferredNormalPhrase[] = [];
  for (const s of sections) {
    if (!s.body || s.body.length < MIN_PHRASE_LEN || s.body.length > MAX_PHRASE_LEN) continue;
    if (looksPathological(s.body)) continue;
    out.push({ label: s.label, phrase: s.body });
  }
  return out;
}

/* ── Conclusion style extraction ───────────────────────────── */

/**
 * Extract conclusion style sample.
 *
 * Instead of trying to diff individual sentences (fragile), we store the
 * COMPLETE conclusion as a style sample. This naturally captures:
 * - Structure: single paragraph vs numbered points
 * - Tone: formal vs concise
 * - Phrasing patterns
 *
 * The LLM will see 2-3 recent conclusions as style examples and naturally
 * mimic the structure.
 *
 * Returns the full conclusion if it's reasonable length, or empty array.
 */
export function extractConclusionStyle(final: string): string[] {
  if (!final || final.trim().length < 10) return [];
  const text = final.trim().slice(0, 800);
  return [text];
}

/* ── Top-N selection ───────────────────────────────────────── */

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
