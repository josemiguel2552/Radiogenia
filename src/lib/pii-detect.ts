export interface PiiMatch {
  type: "dni" | "nie" | "phone" | "email" | "ssn" | "name";
  value: string;
  index: number;
}

// ---------------------------------------------------------------------------
// Medical‑unit safeguard
// ---------------------------------------------------------------------------
// After a candidate numeric match we check whether the trailing text starts
// with a medical unit.  If so, the match is almost certainly a measurement
// rather than PII (e.g. "150ml", "12 cm", "45.5 kg").
const MEDICAL_UNITS =
  /^[\s-]*(mm[Hh]g|mmol|mg|mm|ml|cm|kg|Hz|HU|Gy|mGy|mSv|cc|dB|bpm|%|°|º)\b/;

/**
 * Returns true when the text immediately after `end` looks like a medical
 * unit, which means the preceding number is a measurement, not PII.
 */
function followedByMedicalUnit(text: string, end: number): boolean {
  return MEDICAL_UNITS.test(text.slice(end));
}

// ---------------------------------------------------------------------------
// Date / time safeguard
// ---------------------------------------------------------------------------
// We also want to avoid flagging dates (dd/mm/yyyy) and times (HH:MM) that
// happen to look like part of a numeric pattern.

/** Quick check: is the character at `pos` a digit? */
function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && ch >= "0" && ch <= "9";
}

/**
 * Returns true when the match sits inside what looks like a date
 * (dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy) or time (HH:MM).
 */
function insideDateOrTime(text: string, start: number, end: number): boolean {
  // Broaden the window a few chars before/after and look for date/time shapes.
  const windowStart = Math.max(0, start - 12);
  const windowEnd = Math.min(text.length, end + 12);
  const window = text.slice(windowStart, windowEnd);

  // Date patterns
  if (/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/.test(window)) return true;

  // Time patterns  HH:MM  or  HH:MM:SS
  if (/\b\d{1,2}:\d{2}(:\d{2})?\b/.test(window)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Individual PII patterns
// ---------------------------------------------------------------------------

/**
 * Spanish DNI: 8 digits + 1 letter.
 * Accepts optional dot‑thousand separators and an optional dash before the
 * letter: 12345678A, 12.345.678A, 12.345.678-A
 *
 * We use a word‑boundary approach combined with a negative lookahead for
 * medical units so that strings like "12345678mg" are not matched.
 */
function detectDni(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])(\d{2}\.?\d{3}\.?\d{3})-?([A-Za-z])(?![A-Za-z0-9])/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    // Extract the pure digits to validate count == 8
    const digits = m[1].replace(/\./g, "");
    if (digits.length !== 8) continue;

    const fullMatch = m[0];
    const idx = m.index;

    // Skip if followed by a medical unit
    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;

    // Skip if inside a date/time
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    // DNI letter validation (official algorithm)
    const dniLetters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const letter = m[2].toUpperCase();
    const expected = dniLetters[parseInt(digits, 10) % 23];
    if (letter !== expected) continue;

    results.push({ type: "dni", value: fullMatch, index: idx });
  }
  return results;
}

/**
 * Spanish NIE: starts with X, Y, or Z followed by 7 digits + 1 check letter.
 * E.g. X1234567A, Y-1234567-B
 */
function detectNie(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])([XYZxyz])-?(\d{7})-?([A-Za-z])(?![A-Za-z0-9])/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    // NIE check‑letter validation: replace X→0, Y→1, Z→2 then use DNI algorithm
    const prefixMap: Record<string, string> = { X: "0", Y: "1", Z: "2" };
    const numericStr = prefixMap[m[1].toUpperCase()] + m[2];
    const dniLetters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const letter = m[3].toUpperCase();
    const expected = dniLetters[parseInt(numericStr, 10) % 23];
    if (letter !== expected) continue;

    results.push({ type: "nie", value: fullMatch, index: idx });
  }
  return results;
}

/**
 * Spanish phone numbers.
 *
 * Formats accepted:
 *   - 9 digits starting with 6, 7, or 9 (mobile/landline)
 *   - 9 digits starting with 8 (landline)
 *   - Optional +34 / 0034 country‑code prefix
 *   - Digits may be separated by single spaces or dashes in groups
 *   - Generic international: +XX XXX XXX XXX (+ followed by 2‑3 digit
 *     country code then 9 digits with optional separators)
 *
 * Because radiology dictation is full of numbers, we are conservative:
 *   - Require either an explicit +/00 country prefix OR exactly 9 digits
 *     starting with 6/7/8/9 that do NOT border other digits.
 *   - Skip anything followed by a medical unit.
 */
function detectPhone(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Pattern 1: Spanish numbers with optional +34/0034 prefix
  // +34 612 345 678  |  0034 612345678  |  +34-612-345-678
  const withPrefix =
    /(?<!\d)(\+34|0034)[\s.-]?([6789]\d{1,2})[\s.-]?(\d{2,3})[\s.-]?(\d{2,3})[\s.-]?(\d{0,3})(?!\d)/g;

  let m: RegExpExecArray | null;
  while ((m = withPrefix.exec(text)) !== null) {
    const fullMatch = m[0];
    const digits = fullMatch.replace(/[^\d]/g, "");
    // +34 prefix gives 11 digits (34 + 9), 0034 gives 13 (0034 + 9)
    const withoutCountry = digits.replace(/^0{0,2}34/, "");
    if (withoutCountry.length !== 9) continue;
    if (!/^[6789]/.test(withoutCountry)) continue;
    if (followedByMedicalUnit(text, m.index + fullMatch.length)) continue;
    if (insideDateOrTime(text, m.index, m.index + fullMatch.length)) continue;

    results.push({ type: "phone", value: fullMatch, index: m.index });
  }

  // Pattern 2: 9 digits without prefix (must start with 6/7/8/9)
  // 612 345 678  |  612345678  |  612-345-678
  const noPrefix =
    /(?<![+\d])([6789]\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})(?!\d)/g;

  while ((m = noPrefix.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    // Make sure total digit count is exactly 9
    const digits = fullMatch.replace(/\D/g, "");
    if (digits.length !== 9) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    // Avoid overlap with already‑found prefixed matches
    const overlaps = results.some(
      (r) =>
        r.type === "phone" &&
        idx >= r.index &&
        idx < r.index + r.value.length,
    );
    if (overlaps) continue;

    results.push({ type: "phone", value: fullMatch, index: idx });
  }

  // Pattern 3: Generic international  +XX(X) XXX XXX XXX
  const intl =
    /(?<!\d)\+\d{1,3}[\s.-]\d{2,3}[\s.-]\d{2,3}[\s.-]\d{2,4}(?:[\s.-]\d{2,4})?(?!\d)/g;

  while ((m = intl.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    // Expect between 10 and 15 digits total (country code + number)
    if (digits.length < 10 || digits.length > 15) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    // Avoid overlap with Spanish‑specific matches above
    const overlaps = results.some(
      (r) =>
        r.type === "phone" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "phone", value: fullMatch, index: idx });
  }

  return results;
}

/**
 * Email addresses — standard pattern.
 * We anchor on word boundaries and avoid matching trailing punctuation.
 */
function detectEmail(text: string): PiiMatch[] {
  const re =
    /(?<![A-Za-z0-9._%+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?![A-Za-z0-9])/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ type: "email", value: m[0], index: m.index });
  }
  return results;
}

/**
 * Spanish Social Security Number (Número de afiliación a la Seguridad Social).
 * 12 digits, sometimes formatted as XX/XXXXXXXX/XX or XX-XXXXXXXX-XX.
 *
 * We require either the formatted version (with separators) or — for the
 * plain 12‑digit version — that it is NOT adjacent to other digits or
 * followed by a medical unit, to avoid false positives on long numeric
 * sequences that appear in radiology (accession numbers, study UIDs, etc.).
 */
function detectSsn(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Formatted: XX/XXXXXXXX/XX  or  XX-XXXXXXXX-XX  or  XX XXXXXXXX XX
  const formatted = /(?<!\d)(\d{2})[/\s-](\d{8})[/\s-](\d{2})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = formatted.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    const province = parseInt(m[1], 10);
    if (province < 1 || province > 52) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  // Partially grouped: XX XXXX XXXX XX or similar groupings with spaces/dashes
  const grouped = /(?<!\d)(\d{2})[\s/-](\d{3,4})[\s/-](\d{3,4})[\s/-](\d{2})(?!\d)/g;
  while ((m = grouped.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    if (digits.length !== 12) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    const province = parseInt(digits.slice(0, 2), 10);
    if (province < 1 || province > 52) continue;

    const overlaps = results.some(
      (r) =>
        r.type === "ssn" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  // Unformatted: 12 consecutive digits (only when clearly standalone)
  const plain = /(?<![A-Za-z0-9/.:-])(\d{12})(?![A-Za-z0-9/.:-])/g;
  while ((m = plain.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    const province = parseInt(fullMatch.slice(0, 2), 10);
    if (province < 1 || province > 52) continue;

    const overlaps = results.some(
      (r) =>
        r.type === "ssn" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Person names
// ---------------------------------------------------------------------------
const SPANISH_NAMES = new Set([
  "abel","abraham","ada","adela","adrián","adriana","agustín","agustina","aída",
  "alba","alberto","alejandra","alejandro","alejo","alfonso","alfredo","alicia",
  "alma","almudena","alonso","álvaro","amalia","amanda","amparo","ana","andrea",
  "andrés","ángel","ángela","ángeles","aníbal","anna","antonia","antonio","araceli",
  "ariadna","arturo","asunción","aurora","bárbara","beatriz","belén","benito",
  "bernardo","blanca","boris","camila","carlos","carmen","carolina","catalina",
  "cecilia","celia","césar","clara","claudia","clemente","concepción","consuelo",
  "cristian","cristina","cruz","daniel","daniela","darío","david","débora","delia",
  "diana","diego","dolores","domingo","doris","dulce","edgar","eduardo","elena",
  "elías","elisa","eloísa","elvira","emilia","emiliano","emilio","emma","enrique",
  "ernesto","esperanza","esteban","esther","estrella","eugenia","eugenio","eva",
  "fabián","fabiola","federico","felipe","félix","fernanda","fernando","fidel",
  "flor","flora","francisco","gabriel","gabriela","gema","gerardo","germán",
  "gilberto","gisela","gloria","gonzalo","graciela","guadalupe","guillermo",
  "gustavo","héctor","hernán","hugo","humberto","ignacio","inés","inma","inmaculada",
  "irene","iris","isaac","isabel","ismael","iván","jacinto","jacobo","jaime",
  "javier","jesús","joaquín","joel","jorge","josé","josefa","josefina","juan",
  "juana","judith","julia","julián","julieta","julio","karen","karla","laura",
  "leandro","leonor","leticia","lilia","liliana","lidia","lorena","lorenzo",
  "lourdes","lucas","lucía","luciano","luis","luisa","luz","magdalena","manuel",
  "manuela","marcela","marcelo","marcos","margarita","maría","mariana","mario",
  "marta","martín","mateo","matías","mauricio","mercedes","micaela","miguel",
  "milagros","miriam","mónica","montserrat","nadia","natalia","néstor","nicolás",
  "nieves","noemí","nora","norma","nuria","octavio","olga","olivia","óscar",
  "pablo","paloma","pamela","patricia","patricio","paula","pedro","penélope",
  "pepita","pilar","práxedes","rafael","ramiro","ramón","raquel","raúl","rebeca",
  "regina","remedios","renata","ricardo","rita","roberto","rocío","rodrigo","rosa",
  "rosalía","rosario","rubén","ruth","sabrina","salvador","samuel","sandra",
  "santiago","sara","sebastián","sergio","silvia","simón","sofía","soledad",
  "sonia","susana","tamara","tatiana","teresa","tomás","trinidad","úrsula",
  "valentina","valentín","valeria","vanesa","verónica","vicente","victoria",
  "virginia","víctor","violeta","yolanda","zacarías"
]);

function normalizeForLookup(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function isKnownName(word: string): boolean {
  return SPANISH_NAMES.has(normalizeForLookup(word)) || SPANISH_NAMES.has(word.toLowerCase());
}

const CAPITALIZED_WORD = /[A-ZÁÉÍÓÚÑÀÈÌÒÙÜ][a-záéíóúñàèìòùüç]+/;
const CONNECTORS = /^(?:de|del|la|las|los|y)$/;

function detectNames(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];
  // Find a known first name followed by at least one capitalized surname
  const re = new RegExp(
    `(?<![A-Za-zÀ-ÿ])(${CAPITALIZED_WORD.source})` +
    `((?:\\s+(?:de(?:l)?|la|las|los|y))*\\s+${CAPITALIZED_WORD.source})+`,
    "g"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0].trim();
    const words = fullMatch.split(/\s+/);

    // Find the first known name in the sequence
    let nameStart = -1;
    for (let i = 0; i < words.length - 1; i++) {
      if (CONNECTORS.test(words[i].toLowerCase())) continue;
      if (isKnownName(words[i])) {
        nameStart = i;
        break;
      }
    }
    if (nameStart === -1) continue;

    // Check there's at least one capitalized non-connector word after the name
    let hasSurname = false;
    for (let i = nameStart + 1; i < words.length; i++) {
      if (!CONNECTORS.test(words[i].toLowerCase())) {
        hasSurname = true;
        break;
      }
    }
    if (!hasSurname) continue;

    // Build the matched substring from nameStart onward
    const nameWords = words.slice(nameStart);
    const nameStr = nameWords.join(" ");
    const offset = fullMatch.indexOf(nameWords[0], words.slice(0, nameStart).join(" ").length);
    const nameIndex = m.index + offset;

    results.push({ type: "name", value: nameStr, index: nameIndex });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scans `text` for personally‑identifiable information common in Spanish
 * radiology dictation contexts.  Returns every match, sorted by position.
 *
 * The implementation is deliberately conservative: numbers adjacent to
 * medical units, dates, times, and other typical radiology tokens are
 * excluded to minimise false positives.
 */
export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [
    ...detectDni(text),
    ...detectNie(text),
    ...detectPhone(text),
    ...detectEmail(text),
    ...detectSsn(text),
    ...detectNames(text),
  ];

  // Sort by index (stable — Array.prototype.sort is stable in ES2019+)
  matches.sort((a, b) => a.index - b.index);

  return matches;
}

/**
 * Convenience shortcut — returns `true` when the text contains at least one
 * PII match.
 */
export function hasPii(text: string): boolean {
  return detectPii(text).length > 0;
}
