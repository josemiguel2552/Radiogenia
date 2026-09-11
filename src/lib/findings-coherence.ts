import type { OutputLanguage } from "./types";

/**
 * Deterministic coherence checks over the findings text.
 *
 * These catch the two mistakes dictation reliably produces — a change
 * described in the opposite direction to its own numbers ("increase from 10
 * to 8 mm"), and a measurement whose unit cannot belong to what it measures
 * ("splenomegaly of 16 mm") — using arithmetic and string matching only. No
 * model is involved: the check is instant, free, and cannot invent a problem
 * that isn't there, which matters because a false alarm on a report costs the
 * radiologist more trust than the check is worth.
 *
 * It reports contradictions inside the radiologist's own text. It does not
 * judge whether a finding is correct, and it proposes nothing.
 */

export type CoherenceIssueKind = "direction" | "units";

export interface CoherenceIssue {
  kind: CoherenceIssueKind;
  /** Offsets of the offending fragment within the findings text. */
  start: number;
  end: number;
  fragment: string;
  message: string;
}

const GROWTH = /\b(aumento|aumenta|aumentado|incremento|incrementa|crecimiento|crece|agrandamiento|increase[ds]?|increment|growth|grown|enlarg\w*|aumento|acréscimo|cresc\w*)\b/i;
const SHRINK = /\b(disminución|disminuci[oó]n|disminuye|disminuido|reducción|reducci[oó]n|reduce|reducido|decrece|decrement\w*|decrease[ds]?|reduction|reduced|shrink\w*|diminui\w*|redu[cç]\w*)\b/i;

/** "de 10 a 8 mm", "de 1 cm a 8 mm", "from 10 to 8 mm" */
const PAIR = /\b(?:de|from)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros|milimetros|centímetros|centimetros|millimet\w*|centimet\w*)?\s*(?:a|to|hasta)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros|milimetros|centímetros|centimetros|millimet\w*|centimet\w*)?/i;

/** Organ-enlargement terms: the number next to them is the organ itself. */
const MEGALY: { pattern: RegExp; minMm: number; label: string }[] = [
  { pattern: /\b(esplenomegalia|splenomegal\w*)\b/i, minMm: 60, label: "esplenomegalia" },
  { pattern: /\b(hepatomegalia|hepatomegal\w*)\b/i, minMm: 80, label: "hepatomegalia" },
  { pattern: /\b(cardiomegalia|cardiomegal\w*)\b/i, minMm: 60, label: "cardiomegalia" },
  { pattern: /\b(nefromegalia|nephromegal\w*)\b/i, minMm: 60, label: "nefromegalia" },
  { pattern: /\b(hepatoesplenomegalia|hepatosplenomegal\w*)\b/i, minMm: 80, label: "hepatoesplenomegalia" },
];

/** A measurement belonging to a lesion, not to the organ named before it. */
const LESION = /\b(quiste|quistes|nódulo|nodulo|nódulos|lesión|lesion|lesiones|foco|focos|imagen|imágenes|adenopat\w*|calcificaci\w*|cyst|nodule|lesion|focus|mass|masa|infarto|hemangioma)\b/i;

const NUMBER_WITH_UNIT = /(\d+(?:[.,]\d+)?)\s*(mm|cm|milímetros|milimetros|centímetros|centimetros|millimet\w*|centimet\w*)/i;

function toNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

function isCm(unit: string | undefined): boolean {
  return !!unit && /^c/i.test(unit);
}

function toMm(value: number, unit: string | undefined): number {
  return isCm(unit) ? value * 10 : value;
}

const MESSAGES = {
  es: {
    increase: (a: string, b: string) => `Dice aumento, pero la medida baja de ${a} a ${b}.`,
    decrease: (a: string, b: string) => `Dice disminución, pero la medida sube de ${a} a ${b}.`,
    same: (a: string) => `Describe un cambio, pero la medida es la misma (${a}).`,
    units: (label: string, m: string) => `${label} con ${m}: revisa las unidades, ¿son cm?`,
  },
  en: {
    increase: (a: string, b: string) => `Says increase, but the measurement drops from ${a} to ${b}.`,
    decrease: (a: string, b: string) => `Says decrease, but the measurement rises from ${a} to ${b}.`,
    same: (a: string) => `Describes a change, but the measurement is unchanged (${a}).`,
    units: (label: string, m: string) => `${label} with ${m}: check the units, should it be cm?`,
  },
  pt: {
    increase: (a: string, b: string) => `Diz aumento, mas a medida cai de ${a} para ${b}.`,
    decrease: (a: string, b: string) => `Diz diminuição, mas a medida sobe de ${a} para ${b}.`,
    same: (a: string) => `Descreve uma mudança, mas a medida é a mesma (${a}).`,
    units: (label: string, m: string) => `${label} com ${m}: verifique as unidades, são cm?`,
  },
} as const;

/** Splits into clauses, keeping each one's offset in the original text. */
function clauses(text: string): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = [];
  let offset = 0;
  for (const part of text.split(/([.\n;])/)) {
    if (part && !/^[.\n;]$/.test(part)) out.push({ text: part, offset });
    offset += part.length;
  }
  return out;
}

function checkDirection(clause: string, offset: number, m: typeof MESSAGES.es): CoherenceIssue | null {
  const grows = GROWTH.test(clause);
  const shrinks = SHRINK.test(clause);
  if (grows === shrinks) return null; // neither, or both — not decidable

  const pair = PAIR.exec(clause);
  if (!pair) return null;

  const [, rawFrom, unitFrom, rawTo, unitTo] = pair;
  // A bare first value takes the second's unit ("de 10 a 8 mm").
  const from = toMm(toNumber(rawFrom), unitFrom || unitTo);
  const to = toMm(toNumber(rawTo), unitTo || unitFrom);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;

  const shown = (v: string, u?: string) => `${v}${u ? " " + u : ""}`;
  const a = shown(rawFrom, unitFrom || unitTo);
  const b = shown(rawTo, unitTo || unitFrom);

  let message: string | null = null;
  if (from === to) message = m.same(a);
  else if (grows && to < from) message = m.increase(a, b);
  else if (shrinks && to > from) message = m.decrease(a, b);
  if (!message) return null;

  return {
    kind: "direction",
    start: offset + (pair.index ?? 0),
    end: offset + (pair.index ?? 0) + pair[0].length,
    fragment: pair[0].trim(),
    message,
  };
}

function checkUnits(clause: string, offset: number, m: typeof MESSAGES.es): CoherenceIssue | null {
  for (const organ of MEGALY) {
    const term = organ.pattern.exec(clause);
    if (!term) continue;

    const after = clause.slice((term.index ?? 0) + term[0].length);
    const measure = NUMBER_WITH_UNIT.exec(after);
    if (!measure) continue;

    // "splenomegaly with an 8 mm cyst" measures the cyst, not the spleen.
    if (LESION.test(after.slice(0, measure.index ?? 0))) continue;

    const mm = toMm(toNumber(measure[1]), measure[2]);
    if (!Number.isFinite(mm) || mm >= organ.minMm) continue;

    const startInClause = (term.index ?? 0) + term[0].length + (measure.index ?? 0);
    return {
      kind: "units",
      start: offset + startInClause,
      end: offset + startInClause + measure[0].length,
      fragment: measure[0].trim(),
      message: m.units(term[0], measure[0].trim()),
    };
  }
  return null;
}

export function checkFindingsCoherence(text: string, lang: OutputLanguage = "es"): CoherenceIssue[] {
  if (!text?.trim()) return [];
  const m = MESSAGES[lang] || MESSAGES.es;
  const issues: CoherenceIssue[] = [];

  for (const c of clauses(text)) {
    const direction = checkDirection(c.text, c.offset, m);
    if (direction) issues.push(direction);
    const units = checkUnits(c.text, c.offset, m);
    if (units) issues.push(units);
  }

  return issues.sort((a, b) => a.start - b.start);
}
