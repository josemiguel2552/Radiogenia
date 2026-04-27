"use client";

const COMMANDS_ES: [RegExp, string][] = [
  [/\bpunto y coma\b/gi, ";"],
  [/\bpunto y aparte\b/gi, "\n\n"],
  [/\bpunto y seguido\b/gi, ". "],
  [/\bpuntos suspensivos\b/gi, "..."],
  [/\bdos puntos\b/gi, ":"],
  [/\bpunto final\b/gi, "."],
  [/\bpunto\b/gi, "."],
  [/\bcoma\b/gi, ","],
  [/\bsigno de interrogación\b/gi, "?"],
  [/\binterrogación\b/gi, "?"],
  [/\bsigno de exclamación\b/gi, "!"],
  [/\bexclamación\b/gi, "!"],
  [/\babre paréntesis\b/gi, "("],
  [/\bcierra paréntesis\b/gi, ")"],
  [/\babrir paréntesis\b/gi, "("],
  [/\bcerrar paréntesis\b/gi, ")"],
  [/\bguion\b/gi, "-"],
  [/\bbarra\b/gi, "/"],
  [/\bnueva línea\b/gi, "\n"],
  [/\bnueva linea\b/gi, "\n"],
  [/\bnuevo párrafo\b/gi, "\n\n"],
  [/\bnuevo parrafo\b/gi, "\n\n"],
  [/\bsalto de línea\b/gi, "\n"],
  [/\bsalto de linea\b/gi, "\n"],
  [/\btabulación\b/gi, "\t"],
  [/\btabulacion\b/gi, "\t"],
];

const COMMANDS_EN: [RegExp, string][] = [
  [/\bsemicolon\b/gi, ";"],
  [/\bnew paragraph\b/gi, "\n\n"],
  [/\bellipsis\b/gi, "..."],
  [/\bcolon\b/gi, ":"],
  [/\bfull stop\b/gi, "."],
  [/\bperiod\b/gi, "."],
  [/\bcomma\b/gi, ","],
  [/\bquestion mark\b/gi, "?"],
  [/\bexclamation mark\b/gi, "!"],
  [/\bopen parenthesis\b/gi, "("],
  [/\bclose parenthesis\b/gi, ")"],
  [/\bopen paren\b/gi, "("],
  [/\bclose paren\b/gi, ")"],
  [/\bhyphen\b/gi, "-"],
  [/\bdash\b/gi, "-"],
  [/\bforward slash\b/gi, "/"],
  [/\bslash\b/gi, "/"],
  [/\bnew line\b/gi, "\n"],
  [/\bnewline\b/gi, "\n"],
  [/\bline break\b/gi, "\n"],
  [/\bnext line\b/gi, "\n"],
  [/\btab\b/gi, "\t"],
];

export function processVoiceCommands(text: string, language: string = "es"): string {
  const commands = language.startsWith("en") ? COMMANDS_EN : COMMANDS_ES;

  let result = text;
  for (const [pattern, replacement] of commands) {
    result = result.replace(pattern, replacement);
  }

  // Clean up spacing around punctuation
  result = result
    .replace(/ +([.,;:?!)\]])/g, "$1")    // remove space before closing punct
    .replace(/([(\[])\s+/g, "$1")          // remove space after opening punct
    .replace(/([.,;:?!])\s*([A-Za-zÁ-Úá-ú])/g, "$1 $2") // ensure space after punct before word
    .replace(/\n +/g, "\n")               // trim spaces after newline
    .replace(/ {2,}/g, " ")               // collapse double spaces
    .trim();

  return result;
}
