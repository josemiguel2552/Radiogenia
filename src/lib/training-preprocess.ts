// Stop words (ES/EN/PT) — excluded from overlap checks
const STOP_WORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "en",
  "con", "por", "para", "al", "es", "son", "se", "no", "si", "que", "y", "o",
  "a", "su", "sus", "sin", "ni", "como", "más", "muy", "ya", "e", "ha", "hay",
  "the", "a", "an", "of", "in", "on", "for", "with", "is", "are", "was", "were",
  "and", "or", "not", "no", "to", "it", "its", "be", "has", "have", "had",
  "this", "that", "these", "those", "from", "by", "at", "as", "but", "if",
  "do", "does", "did", "will", "would", "can", "could", "should", "may",
  "o", "os", "as", "da", "do", "das", "dos", "em", "com", "um", "uma",
  "não", "sem", "nem", "como", "mais", "foi", "são", "tem", "há",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,;:()[\]{}"'\/\\<>¿?¡!—–\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;])\s+|(?<=\n)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

/**
 * Ensure every finding mentioned in the conclusion also appears in
 * the findings text. Sentences from the conclusion whose content
 * words have < 40% overlap with the findings are appended.
 */
export function reconcileFindings(findings: string, conclusion: string): string {
  const findingsTokens = new Set(tokenize(findings));
  const sentences = splitSentences(conclusion);
  const missing: string[] = [];

  for (const sentence of sentences) {
    const words = tokenize(sentence);
    if (words.length === 0) continue;
    const overlap = words.filter((w) => findingsTokens.has(w)).length / words.length;
    if (overlap < 0.4) {
      missing.push(sentence);
    }
  }

  if (missing.length === 0) return findings;

  return findings.trimEnd() + "\n\n" + missing.join(" ");
}
