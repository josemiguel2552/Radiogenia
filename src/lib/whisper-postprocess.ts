/**
 * Post-processing for Whisper transcription output.
 * Fixes common artifacts without altering medical vocabulary.
 */

const ARTIFACT_RULES: [RegExp, string][] = [
  // Whisper hallucination: repeated characters (asterisks, dashes, underscores, etc.)
  [/([*_\-=~#])\1{4,}/g, ""],

  // Whisper hallucination: same word or short phrase repeated 3+ times
  // e.g. "thank you thank you thank you" or "you you you you"

  // "-/-" artifacts (Whisper mis-hears slashes or pauses)
  [/\s*-\/-\s*/g, " / "],

  // ".. in line." or ".  in line." artifacts
  [/\.{1,3}\s*in line\./gi, "."],

  // Doubled/tripled periods not intended as ellipsis
  [/(?<!\.)\.{2}(?!\.)/g, "."],

  // Stray single dot preceded by a space (e.g. "kidney . normal")
  [/ \. (?=[A-Za-zÁ-Úá-ú])/g, ". "],

  // Multiple consecutive periods (4+) collapsed to ellipsis
  [/\.{4,}/g, "..."],

  // Period-space-period artifacts
  [/\.\s+\./g, "."],

  // Whisper confuses "nueva línea" with "nueve" → outputs "9" in non-numeric context
  // Standalone "9" between words (not part of a measurement like "9 mm" or "9.5")
  [/(?<=\.\s*)9(?=\s+[A-Za-zÁ-Úá-ú])/g, "\n"],
  [/(?<=[a-záéíóúñ]\s+)9(?=\s+[A-Za-zÁ-Úá-ú])/gi, "\n"],
  // "nueve línea" / "nueve linea" that slipped past voice-commands (e.g. different casing or spacing)
  [/\bnueve l[ií]nea\b/gi, "\n"],

  // Whisper hallucinations at end of audio
  [/\s*(?:Thank you\.?|Thanks for watching\.?|Gracias\.?|Gracias por ver\.?|Subtítulos?.*|Suscr[ií]bete.*|Subscribe.*)\s*$/i, ""],

  // Excessive whitespace
  [/ {2,}/g, " "],

  // Space before punctuation
  [/ +([.,;:?!])/g, "$1"],

  // Missing space after punctuation before a letter
  [/([.,;:?!])([A-Za-zÁ-Úá-ú])/g, "$1 $2"],

  // Trim leading/trailing whitespace per line
  [/^[ \t]+|[ \t]+$/gm, ""],
];

function isHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;

  // Mostly non-alphanumeric characters (asterisks, dashes, dots, etc.)
  const alphaCount = (t.match(/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ0-9]/g) || []).length;
  if (alphaCount < t.length * 0.3) return true;

  // Same short word/phrase repeated many times
  const words = t.toLowerCase().split(/\s+/);
  if (words.length >= 4) {
    const freq: Record<string, number> = {};
    for (const w of words) freq[w] = (freq[w] || 0) + 1;
    const maxFreq = Math.max(...Object.values(freq));
    if (maxFreq >= words.length * 0.6) return true;
  }

  return false;
}

export function postprocessWhisper(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ARTIFACT_RULES) {
    result = result.replace(pattern, replacement);
  }
  result = result.trim();

  if (isHallucination(result)) return "";

  return result;
}
