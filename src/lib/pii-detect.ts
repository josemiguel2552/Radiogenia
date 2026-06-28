export interface PiiMatch {
  type: "dni" | "nie" | "phone" | "email" | "ssn" | "us_ssn" | "name" | "curp" | "rfc" | "cpf" | "rut" | "cedula" | "nhc";
  value: string;
  index: number;
}

// ---------------------------------------------------------------------------
// Medical‑unit safeguard
// ---------------------------------------------------------------------------
const MEDICAL_UNITS =
  /^[\s-]*(mm[Hh]g|mmol|mg|mm|ml|cm|kg|Hz|HU|Gy|mGy|mSv|cc|dB|bpm|%|°|º|fr|FR|gauge|G|mcg|µg|UI|IU|mEq|mosm|cal|kcal)\b/;

function followedByMedicalUnit(text: string, end: number): boolean {
  return MEDICAL_UNITS.test(text.slice(end));
}

// ---------------------------------------------------------------------------
// Date / time safeguard
// ---------------------------------------------------------------------------
function insideDateOrTime(text: string, start: number, end: number): boolean {
  const windowStart = Math.max(0, start - 12);
  const windowEnd = Math.min(text.length, end + 12);
  const window = text.slice(windowStart, windowEnd);

  if (/\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b/.test(window)) return true;
  if (/\b\d{1,2}:\d{2}(:\d{2})?\b/.test(window)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Radiology-specific false positive guard
// ---------------------------------------------------------------------------
// Accession numbers, DICOM UIDs, protocol codes — long numeric sequences common
// in radiology that should not trigger PII alerts.
const RADIOLOGY_CONTEXT =
  /(?:accession|estudio|serie|uid|protocolo|secuencia|corte|slice|seq|series)\s*[:#]?\s*$/i;

function precededByRadiologyContext(text: string, start: number): boolean {
  const prefix = text.slice(Math.max(0, start - 40), start);
  return RADIOLOGY_CONTEXT.test(prefix);
}

// ---------------------------------------------------------------------------
// Spanish DNI: 8 digits + 1 check letter
// ---------------------------------------------------------------------------
function detectDni(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])(\d{2}\.?\d{3}\.?\d{3})-?([A-Za-z])(?![A-Za-z0-9])/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const digits = m[1].replace(/\./g, "");
    if (digits.length !== 8) continue;

    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const dniLetters = "TRWAGMYFPDXBNJZSQVHLCKE";
    const letter = m[2].toUpperCase();
    const expected = dniLetters[parseInt(digits, 10) % 23];
    if (letter !== expected) continue;

    results.push({ type: "dni", value: fullMatch, index: idx });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Spanish NIE: X/Y/Z + 7 digits + check letter
// ---------------------------------------------------------------------------
function detectNie(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])([XYZxyz])-?(\d{7})-?([A-Za-z])(?![A-Za-z0-9])/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

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

// ---------------------------------------------------------------------------
// Mexican CURP: 4 letters + 6 digits + letter + 2 consonants + 2 chars
// Example: GARC850101HDFRRL09
// ---------------------------------------------------------------------------
function detectCurp(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])([A-Z]{4}\d{6}[HM][A-Z]{2}[BCDFGHJKLMNPQRSTVWXYZ]{3}[A-Z0-9]\d)(?![A-Za-z0-9])/gi;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0];
    if (fullMatch.length !== 18) continue;

    // Validate date portion (positions 4-9: YYMMDD)
    const mm = parseInt(fullMatch.slice(6, 8), 10);
    const dd = parseInt(fullMatch.slice(8, 10), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;

    results.push({ type: "curp", value: fullMatch, index: m.index });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Mexican RFC: 4 letters (company) or 3+1 letters (person) + 6 digits + 3 check chars
// Person: GARC850101AB1 (13 chars), Company: GAR850101AB1 (12 chars)
// ---------------------------------------------------------------------------
function detectRfc(text: string): PiiMatch[] {
  const re = /(?<![A-Za-z0-9])([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})(?![A-Za-z0-9])/gi;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0].toUpperCase();
    if (fullMatch.length !== 12 && fullMatch.length !== 13) continue;

    const dateStart = fullMatch.length === 13 ? 4 : 3;
    const mm = parseInt(fullMatch.slice(dateStart + 2, dateStart + 4), 10);
    const dd = parseInt(fullMatch.slice(dateStart + 4, dateStart + 6), 10);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;

    results.push({ type: "rfc", value: m[0], index: m.index });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Brazilian CPF: 11 digits, format XXX.XXX.XXX-XX
// ---------------------------------------------------------------------------
function detectCpf(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Formatted: 123.456.789-09
  const formatted = /(?<!\d)(\d{3})\.(\d{3})\.(\d{3})-(\d{2})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = formatted.exec(text)) !== null) {
    const fullMatch = m[0];
    const digits = fullMatch.replace(/\D/g, "");
    if (!validateCpfDigits(digits)) continue;
    results.push({ type: "cpf", value: fullMatch, index: m.index });
  }

  // Unformatted: 11 consecutive digits (only when clearly standalone)
  const plain = /(?<![A-Za-z0-9/.:-])(\d{11})(?![A-Za-z0-9/.:-])/g;
  while ((m = plain.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;
    if (!validateCpfDigits(fullMatch)) continue;

    const overlaps = results.some(
      (r) => idx >= r.index && idx < r.index + r.value.length,
    );
    if (overlaps) continue;

    results.push({ type: "cpf", value: fullMatch, index: idx });
  }

  return results;
}

function validateCpfDigits(digits: string): boolean {
  if (digits.length !== 11) return false;
  // Reject all-same-digit sequences (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9], 10)) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10], 10)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Chilean RUT: 7-8 digits + check digit (K or 0-9)
// Format: XX.XXX.XXX-X or XXXXXXXX-X
// ---------------------------------------------------------------------------
function detectRut(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Formatted: 12.345.678-5 or 1.234.567-K
  const formatted = /(?<!\d)(\d{1,2})\.(\d{3})\.(\d{3})-([0-9Kk])(?![A-Za-z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = formatted.exec(text)) !== null) {
    const fullMatch = m[0];
    const digits = (m[1] + m[2] + m[3]);
    const check = m[4].toUpperCase();
    if (!validateRutCheck(digits, check)) continue;
    results.push({ type: "rut", value: fullMatch, index: m.index });
  }

  // Without dots: 12345678-5
  const noDots = /(?<![.\d])(\d{7,8})-([0-9Kk])(?![A-Za-z0-9])/g;
  while ((m = noDots.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = m[1];
    const check = m[2].toUpperCase();

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (!validateRutCheck(digits, check)) continue;

    const overlaps = results.some(
      (r) => idx >= r.index && idx < r.index + r.value.length,
    );
    if (overlaps) continue;

    results.push({ type: "rut", value: fullMatch, index: idx });
  }

  return results;
}

function validateRutCheck(digits: string, check: string): boolean {
  const multipliers = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  const reversed = digits.split("").reverse();
  for (let i = 0; i < reversed.length; i++) {
    sum += parseInt(reversed[i], 10) * multipliers[i % 6];
  }
  const remainder = 11 - (sum % 11);
  let expected: string;
  if (remainder === 11) expected = "0";
  else if (remainder === 10) expected = "K";
  else expected = String(remainder);
  return check === expected;
}

// ---------------------------------------------------------------------------
// Colombian Cédula: 8-10 digits (usually 10 for newer ones)
// We require a context hint ("CC", "C.C.", "cédula", "cedula") to avoid
// false positives with other numeric sequences.
// ---------------------------------------------------------------------------
function detectCedula(text: string): PiiMatch[] {
  const re = /(?:C\.?C\.?|[Cc][ée]dula)\s*:?\s*#?\s*(\d[\d.]{6,11}\d)/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0];
    const digits = m[1].replace(/\./g, "");
    if (digits.length < 8 || digits.length > 10) continue;
    if (followedByMedicalUnit(text, m.index + fullMatch.length)) continue;
    results.push({ type: "cedula", value: fullMatch, index: m.index });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Phone numbers (Spain + LATAM)
// ---------------------------------------------------------------------------
function detectPhone(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Pattern 1: Spanish numbers with +34/0034 prefix
  const withPrefix =
    /(?<!\d)(\+34|0034)[\s.-]?([6789]\d{1,2})[\s.-]?(\d{2,3})[\s.-]?(\d{2,3})[\s.-]?(\d{0,3})(?!\d)/g;

  let m: RegExpExecArray | null;
  while ((m = withPrefix.exec(text)) !== null) {
    const fullMatch = m[0];
    const digits = fullMatch.replace(/[^\d]/g, "");
    const withoutCountry = digits.replace(/^0{0,2}34/, "");
    if (withoutCountry.length !== 9) continue;
    if (!/^[6789]/.test(withoutCountry)) continue;
    if (followedByMedicalUnit(text, m.index + fullMatch.length)) continue;
    if (insideDateOrTime(text, m.index, m.index + fullMatch.length)) continue;

    results.push({ type: "phone", value: fullMatch, index: m.index });
  }

  // Pattern 2: 9-digit Spanish mobile (no prefix)
  const noPrefix =
    /(?<![+\d])([6789]\d{2})[\s.-]?(\d{3})[\s.-]?(\d{3})(?!\d)/g;

  while ((m = noPrefix.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    if (digits.length !== 9) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const overlaps = results.some(
      (r) => r.type === "phone" && idx >= r.index && idx < r.index + r.value.length,
    );
    if (overlaps) continue;

    results.push({ type: "phone", value: fullMatch, index: idx });
  }

  // Pattern 3: LATAM numbers with country code (+52, +55, +56, +57, +51, +54, +53, +58)
  const latamPrefix =
    /(?<!\d)(\+(?:52|55|56|57|51|54|53|58))[\s.-]?(\d[\s.\-()]*){8,12}(?!\d)/g;

  while ((m = latamPrefix.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    // Country code (2 digits) + national number (8-11 digits)
    if (digits.length < 10 || digits.length > 13) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    const overlaps = results.some(
      (r) => r.type === "phone" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "phone", value: fullMatch, index: idx });
  }

  // Pattern 4: Generic international +XX(X) followed by enough digits
  const intl =
    /(?<!\d)\+\d{1,3}[\s.-]\d{2,3}[\s.-]\d{2,3}[\s.-]\d{2,4}(?:[\s.-]\d{2,4})?(?!\d)/g;

  while ((m = intl.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;

    const overlaps = results.some(
      (r) => r.type === "phone" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "phone", value: fullMatch, index: idx });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Email addresses
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Spanish Social Security Number (12 digits, province 01-52)
// ---------------------------------------------------------------------------
function detectSsn(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Formatted: XX/XXXXXXXX/XX or XX-XXXXXXXX-XX
  const formatted = /(?<!\d)(\d{2})[/\s-](\d{8})[/\s-](\d{2})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = formatted.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const province = parseInt(m[1], 10);
    if (province < 1 || province > 52) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  // Partially grouped
  const grouped = /(?<!\d)(\d{2})[\s/-](\d{3,4})[\s/-](\d{3,4})[\s/-](\d{2})(?!\d)/g;
  while ((m = grouped.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;
    const digits = fullMatch.replace(/\D/g, "");
    if (digits.length !== 12) continue;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const province = parseInt(digits.slice(0, 2), 10);
    if (province < 1 || province > 52) continue;

    const overlaps = results.some(
      (r) => r.type === "ssn" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  // Unformatted 12 digits
  const plain = /(?<![A-Za-z0-9/.:-])(\d{12})(?![A-Za-z0-9/.:-])/g;
  while ((m = plain.exec(text)) !== null) {
    const fullMatch = m[0];
    const idx = m.index;

    if (followedByMedicalUnit(text, idx + fullMatch.length)) continue;
    if (insideDateOrTime(text, idx, idx + fullMatch.length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const province = parseInt(fullMatch.slice(0, 2), 10);
    if (province < 1 || province > 52) continue;

    const overlaps = results.some(
      (r) => r.type === "ssn" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + fullMatch.length)),
    );
    if (overlaps) continue;

    results.push({ type: "ssn", value: fullMatch, index: idx });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hospital medical record numbers (NHC / HC / Nº Historia)
// These are patient identifiers within a hospital.
// ---------------------------------------------------------------------------
function detectNhc(text: string): PiiMatch[] {
  const re = /(?:NHC|N\.?H\.?C\.?|HC|H\.?C\.?|[Nn]º?\s*(?:[Hh]istoria|[Hh]ist)\.?|[Hh]istoria\s*[Cc]l[íi]nica|MRN|M\.?R\.?N\.?|medical\s*record(?:\s*(?:no\.?|number|#))?|patient\s*(?:id|number|no\.?|#)|record\s*(?:no\.?|number|#)|chart\s*(?:no\.?|number|#))\s*:?\s*#?\s*(\d[\d/.-]{3,12}\d)/gi;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    results.push({ type: "nhc", value: m[0], index: m.index });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Person names (expanded for LATAM)
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
  "virginia","víctor","violeta","yolanda","zacarías",
  // LATAM-common names
  "ximena","itzel","citlali","montserrat","paola","marisol","esperanza","socorro",
  "guadalupe","consuelo","piedad","milagros","amparo","remedios",
  "axel","brayan","kevin","yésica","yennifer","maicol","jhon","yeison",
  "anderson","yuri","mayra","giselle","xiomara","zulay","darlene","keyla",
  // Brazilian Portuguese names
  "joão","pedro","paulo","matheus","lucas","guilherme","rafael","thiago",
  "felipe","gustavo","leonardo","henrique","vinícius","caio","bruno",
  "maria","juliana","fernanda","camila","larissa","letícia","bianca",
  "bruna","amanda","carolina","priscila","raquel","tatiane","jéssica",
  "aline","thaís","lúcia","cláudia","márcia","flávia","viviane",
  // Additional common LATAM names
  "aarón","abigail","adán","agatha","aitana","alexis","alina","amelia",
  "ariel","bautista","benjamín","camilo","catalina","cielo","dámaso",
  "dariana","delfina","eliana","emilce","facundo","florencia","gastón",
  "génesis","gerónimo","gael","ian","ivana","josué","lautaro","leila",
  "liam","luana","luciana","maite","malena","máximo","nahuel","oriana",
  "pilar","renato","romina","santino","thiago","tobías","valentino","zoe",
  // English male first names
  "james","john","robert","michael","william","richard","joseph","charles",
  "christopher","matthew","anthony","donald","steven","andrew","joshua",
  "kenneth","brian","george","timothy","ronald","jason","jeffrey","ryan",
  "jacob","nicholas","jonathan","stephen","larry","justin","scott","brandon",
  "frank","raymond","jack","dennis","jerry","tyler","jose","henry","douglas",
  "peter","zachary","kyle","walter","harold","jeremy","ethan","carl","keith",
  "roger","gerald","christian","terry","sean","arthur","austin","noah","jesse",
  "joe","bryan","billy","jordan","albert","dylan","bruce","willie","wayne",
  "roy","ralph","randy","eugene","russell","louis","philip","bobby","johnny",
  "bradley","harry","fred","stanley","leonard","nathan","travis","cody",
  // English female first names
  "mary","patricia","jennifer","linda","elizabeth","barbara","susan","jessica",
  "sarah","karen","lisa","nancy","betty","margaret","sandra","ashley","kimberly",
  "donna","michelle","dorothy","carol","melissa","deborah","stephanie","rebecca",
  "sharon","cynthia","kathleen","amy","shirley","anna","brenda","pamela","nicole",
  "helen","samantha","katherine","christine","debra","rachel","carolyn","janet",
  "catherine","heather","diane","ruth","julie","joyce","virginia","kelly",
  "lauren","christina","joan","evelyn","judith","megan","cheryl","hannah",
  "jacqueline","martha","gloria","ann","madison","frances","kathryn","janice",
  "jean","abigail","alice","judy","grace","denise","amber","doris","marilyn",
  "danielle","beverly","theresa","brittany","charlotte","marie","kayla","lori",
  "tiffany","tracy","stacy","crystal","wendy","dawn","ellen","kristen","leslie",
]);

function normalizeForLookup(word: string): string {
  return word.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function isKnownName(word: string): boolean {
  const lower = word.toLowerCase();
  const normalized = normalizeForLookup(word);
  return SPANISH_NAMES.has(lower) || SPANISH_NAMES.has(normalized);
}

// ---------------------------------------------------------------------------
// Common surnames (Spanish / LATAM + English) to strengthen full-name detection
// ---------------------------------------------------------------------------
const SURNAMES = new Set([
  // Spanish / LATAM surnames
  "garcía","garcia","rodríguez","rodriguez","gonzález","gonzalez","fernández",
  "fernandez","lópez","lopez","martínez","martinez","sánchez","sanchez","pérez",
  "perez","gómez","gomez","martín","martin","jiménez","jimenez","ruiz",
  "hernández","hernandez","díaz","diaz","moreno","muñoz","munoz","álvarez",
  "alvarez","romero","alonso","gutiérrez","gutierrez","navarro","torres",
  "domínguez","dominguez","vázquez","vazquez","ramos","gil","ramírez","ramirez",
  "serrano","blanco","suárez","suarez","molina","morales","ortega","delgado",
  "castro","ortiz","rubio","marín","marin","sanz","núñez","nunez","iglesias",
  "medina","garrido","cortés","cortes","castillo","santos","lozano","guerrero",
  "cano","prieto","méndez","mendez","cruz","calvo","gallego","vidal","león",
  "leon","herrera","márquez","marquez","peña","pena","flores","cabrera","campos",
  "vega","fuentes","carrasco","caballero","reyes","nieto","aguilar","pascual",
  "santana","herrero","montero","hidalgo","giménez","gimenez","ibáñez","ibanez",
  "ferrer","durán","duran","santiago","benítez","benitez","mora","vicente",
  "vargas","arias","carmona","crespo","román","roman","pastor","soto","sáez",
  "saez","velasco","soler","moya","esteban","parra","bravo","gallardo","rojas",
  "chávez","chavez","mendoza","aguirre","cárdenas","cardenas","salazar","pacheco",
  "maldonado","espinoza","figueroa","cordero","paredes","contreras","sepúlveda",
  "sepulveda","tapia","vergara","acosta","rivera","ríos","rios","cáceres",
  "caceres","quispe","mamani","huamán","huaman","betancor","santiago","ponce",
  "miranda","cabello","escobar","peralta","carrillo","villalobos","zúñiga",
  "zuniga","fuentealba","cisneros","montoya","valdez","valdés","valdes",
  // English surnames
  "smith","johnson","williams","brown","jones","miller","davis","wilson",
  "anderson","taylor","thomas","moore","jackson","lee","thompson","white",
  "harris","clark","lewis","robinson","walker","young","allen","king","wright",
  "scott","green","baker","adams","nelson","hill","campbell","mitchell",
  "roberts","carter","phillips","evans","turner","parker","collins","edwards",
  "stewart","morris","murphy","cook","rogers","morgan","peterson","cooper",
  "reed","bailey","bell","kelly","howard","ward","cox","richardson","wood",
  "watson","brooks","bennett","gray","james","hughes","price","myers","long",
  "foster","sanders","ross","powell","sullivan","russell","jenkins","perry",
  "butler","barnes","fisher","henderson","coleman","simmons","patterson",
  "jordan","reynolds","hamilton","graham","kim","wallace","woods","cole",
  "west","owens","harrison","fox","ellis","gibson","mcdonald","webb","tucker",
  "porter","hunter","hicks","crawford","henry","boyd","mason","morales",
]);

function isKnownSurname(word: string): boolean {
  const lower = word.toLowerCase();
  const normalized = normalizeForLookup(word);
  return SURNAMES.has(lower) || SURNAMES.has(normalized);
}

// Words that, when they follow a capitalized term, signal a medical eponym
// ("Down syndrome", "Smith fracture", "Murphy sign") rather than a person name.
const EPONYM_FOLLOWERS = new Set([
  "sign","signo","sinal","syndrome","sindrome","síndrome","disease","enfermedad",
  "doenca","doença","fracture","fractura","fratura","cyst","quiste","cisto",
  "ligament","ligamento","maneuver","maniobra","manobra","test","prueba","teste",
  "classification","clasificacion","clasificación","classificacao","classificação",
  "grade","grado","grau","score","indice","índice","space","espacio","espaco",
  "espaço","fossa","fosa","canal","hernia","hernia","point","punto","ponto",
  "line","linea","línea","linha","angle","angulo","ángulo","view","projection",
  "proyeccion","proyección","position","posicion","posición","method","metodo",
  "método","lesion","lesión","tubercle","tuberculo","tubérculo","node","nodulo",
  "nódulo","gland","glandula","glándula","duct","conducto","fold","pliegue",
  "recess","receso","triangle","triangulo","triángulo","plane","plano","septum",
  "tabique","band","banda","disease's","tumor","tumour","plexus","plexo",
]);

function followedByEponymTerm(text: string, end: number): boolean {
  const after = text.slice(end).match(/^\s+([A-Za-zÀ-ÿ']+)/);
  return !!after && EPONYM_FOLLOWERS.has(normalizeForLookup(after[1]));
}

const CAPITALIZED_WORD = /[A-ZÁÉÍÓÚÑÀÈÌÒÙÜÂÊÎÔÛÃÕÇ][a-záéíóúñàèìòùüçâêîôûãõ]+/;
const CONNECTORS = /^(?:de|del|da|das|dos|la|las|los|y|e|do)$/;

// Common radiology/anatomy terms that start with uppercase but are NOT names
const ANATOMY_TERMS = new Set([
  "arteria","aorta","bazo","bronquio","cabeza","cardíaco","cavidad","cerebro",
  "cervical","cisura","colon","columna","corazón","costilla","cráneo","cuello",
  "diafragma","dorsal","duodeno","esófago","esplénico","estómago","fémur",
  "frontal","ganglio","gástrico","hepático","hígado","húmero","íleon","intestino",
  "lingual","lóbulo","lumbar","mediastino","médula","mesentérico","nódulo",
  "occipital","ovario","páncreas","parietal","pelvis","peritoneo","píloro",
  "pleural","próstata","pulmón","pulmonar","recto","renal","riñón","sacro",
  "sigmoide","suprarrenal","temporal","tiroides","tórax","torácico","tráquea",
  "uréter","uretra","útero","vagina","vejiga","ventrículo","vértebra","vesícula",
  // Portuguese anatomy
  "fígado","rim","pulmão","coração","estômago","intestino","cérebro","osso",
  // Common radiology terms and context words
  "hallazgos","conclusión","técnica","indicación","antecedentes","comparación",
  "impresión","recomendación","protocolo","contraste","secuencia","adquisición",
  "reconstrucción","informe","resultado","valoración","descripción",
  "paciente","estudio","exploración","radiografía","ecografía","resonancia",
  "tomografía","mamografía","densitometría","angiografía","gammagrafía",
]);

function isAnatomyTerm(word: string): boolean {
  return ANATOMY_TERMS.has(normalizeForLookup(word));
}

function detectNames(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];
  const re = new RegExp(
    `(?<![A-Za-zÀ-ÿ])(${CAPITALIZED_WORD.source})` +
    `((?:\\s+(?:de(?:l)?|da|das|dos|do|la|las|los|y|e))*\\s+${CAPITALIZED_WORD.source})+`,
    "g"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fullMatch = m[0].trim();
    const words = fullMatch.split(/\s+/);

    let nameStart = -1;
    for (let i = 0; i < words.length - 1; i++) {
      if (CONNECTORS.test(words[i].toLowerCase())) continue;
      if (isAnatomyTerm(words[i])) continue;
      if (isKnownName(words[i])) {
        nameStart = i;
        break;
      }
    }
    if (nameStart === -1) continue;

    // Check there's at least one capitalized non-connector, non-anatomy word after
    let hasSurname = false;
    for (let i = nameStart + 1; i < words.length; i++) {
      if (CONNECTORS.test(words[i].toLowerCase())) continue;
      if (isAnatomyTerm(words[i])) {
        hasSurname = false;
        break;
      }
      hasSurname = true;
    }
    if (!hasSurname) continue;

    const nameWords = words.slice(nameStart);
    const nameStr = nameWords.join(" ");
    const offset = fullMatch.indexOf(nameWords[0], words.slice(0, nameStart).join(" ").length);
    const nameIndex = m.index + offset;

    results.push({ type: "name", value: nameStr, index: nameIndex });
  }

  // Pattern: "paciente" / "pte" / "pac" followed by a name
  const patientPrefix =
    /(?:[Pp]aciente|[Pp]te\.?|[Pp]ac\.?)\s+([A-ZÁÉÍÓÚÑÀÈÌÒÙÜÂÊÎÔÛÃÕÇ][a-záéíóúñàèìòùüçâêîôûãõ]+(?:\s+(?:de(?:l)?|da|dos|la|las|los|y|e)\s+|\s+)[A-ZÁÉÍÓÚÑÀÈÌÒÙÜÂÊÎÔÛÃÕÇ][a-záéíóúñàèìòùüçâêîôûãõ]+(?:\s+[A-ZÁÉÍÓÚÑÀÈÌÒÙÜÂÊÎÔÛÃÕÇ][a-záéíóúñàèìòùüçâêîôûãõ]+)*)/g;

  while ((m = patientPrefix.exec(text)) !== null) {
    const nameValue = m[1];
    const idx = m.index;
    // Skip if it's all anatomy terms
    const nameWords = nameValue.split(/\s+/).filter(w => !CONNECTORS.test(w.toLowerCase()));
    const allAnatomy = nameWords.every(w => isAnatomyTerm(w));
    if (allAnatomy) continue;

    const overlaps = results.some(
      (r) => r.type === "name" &&
        ((idx >= r.index && idx < r.index + r.value.length) ||
          (r.index >= idx && r.index < idx + m![0].length)),
    );
    if (overlaps) continue;

    results.push({ type: "name", value: m[0], index: idx });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Surname-anchored names ("Apellido, Nombre" lists and surname-bearing sequences)
// ---------------------------------------------------------------------------
function detectSurnameNames(text: string): PiiMatch[] {
  const results: PiiMatch[] = [];

  // Pattern A: "Apellido, Nombre" / "Apellido Apellido, Nombre Nombre"
  const comma = new RegExp(
    `(?<![A-Za-zÀ-ÿ])(${CAPITALIZED_WORD.source}(?:\\s+${CAPITALIZED_WORD.source})?)\\s*,\\s*(${CAPITALIZED_WORD.source}(?:\\s+${CAPITALIZED_WORD.source})?)`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = comma.exec(text)) !== null) {
    const tokens = [...m[1].split(/\s+/), ...m[2].split(/\s+/)];
    if (tokens.some((w) => isAnatomyTerm(w))) continue;
    const known = tokens.some((w) => isKnownName(w) || isKnownSurname(w));
    if (!known) continue;
    results.push({ type: "name", value: m[0].trim(), index: m.index });
  }

  // Pattern B: capitalized sequence containing >=2 known name/surname tokens
  // (catches "García Betancor" even when the first name is uncommon).
  const seq = new RegExp(
    `(?<![A-Za-zÀ-ÿ])(${CAPITALIZED_WORD.source})` +
      `((?:\\s+(?:de(?:l)?|da|das|dos|do|la|las|los|y|e))*\\s+${CAPITALIZED_WORD.source})+`,
    "g",
  );
  while ((m = seq.exec(text)) !== null) {
    const full = m[0].trim();
    const words = full.split(/\s+/);
    if (words.some((w) => isAnatomyTerm(w))) continue;
    if (followedByEponymTerm(text, m.index + m[0].length)) continue;

    const knownCount = words.filter(
      (w) => !CONNECTORS.test(w.toLowerCase()) && (isKnownName(w) || isKnownSurname(w)),
    ).length;
    if (knownCount < 2) continue;

    results.push({ type: "name", value: full, index: m.index });
  }

  return results;
}

// ---------------------------------------------------------------------------
// US Social Security Number: XXX-XX-XXXX
// ---------------------------------------------------------------------------
function detectUsSsn(text: string): PiiMatch[] {
  const re = /(?<!\d)(\d{3})-(\d{2})-(\d{4})(?!\d)/g;
  const results: PiiMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const idx = m.index;
    if (insideDateOrTime(text, idx, idx + m[0].length)) continue;
    if (followedByMedicalUnit(text, idx + m[0].length)) continue;
    if (precededByRadiologyContext(text, idx)) continue;

    const area = parseInt(m[1], 10);
    const group = parseInt(m[2], 10);
    const serial = parseInt(m[3], 10);
    // Invalid SSN ranges per SSA rules
    if (area === 0 || area === 666 || area >= 900) continue;
    if (group === 0 || serial === 0) continue;

    results.push({ type: "us_ssn", value: m[0], index: idx });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function detectPii(text: string): PiiMatch[] {
  const matches: PiiMatch[] = [
    ...detectDni(text),
    ...detectNie(text),
    ...detectCurp(text),
    ...detectRfc(text),
    ...detectCpf(text),
    ...detectRut(text),
    ...detectCedula(text),
    ...detectPhone(text),
    ...detectEmail(text),
    ...detectSsn(text),
    ...detectUsSsn(text),
    ...detectNhc(text),
    ...detectNames(text),
    ...detectSurnameNames(text),
  ];

  // Resolve overlaps: keep the earliest, longest match and drop anything that
  // overlaps it (prevents double placeholders from the two name detectors).
  matches.sort((a, b) => a.index - b.index || b.value.length - a.value.length);

  const deduped: PiiMatch[] = [];
  let lastEnd = -1;
  for (const match of matches) {
    if (match.index >= lastEnd) {
      deduped.push(match);
      lastEnd = match.index + match.value.length;
    }
  }

  return deduped;
}

export function hasPii(text: string): boolean {
  return detectPii(text).length > 0;
}

// ---------------------------------------------------------------------------
// Server-side PII stripping — replaces detected PII with safe placeholders
// ---------------------------------------------------------------------------

const PII_PLACEHOLDER: Record<PiiMatch["type"], string> = {
  dni: "[DNI]",
  nie: "[NIE]",
  phone: "[TELÉFONO]",
  email: "[EMAIL]",
  ssn: "[NSS]",
  us_ssn: "[SSN]",
  name: "[NOMBRE]",
  curp: "[CURP]",
  rfc: "[RFC]",
  cpf: "[CPF]",
  rut: "[RUT]",
  cedula: "[CÉDULA]",
  nhc: "[NHC]",
};

export interface StripPiiResult {
  cleaned: string;
  strippedCount: number;
  strippedTypes: Record<string, number>;
}

export function stripPii(text: string): StripPiiResult {
  if (!text) return { cleaned: text, strippedCount: 0, strippedTypes: {} };

  const matches = detectPii(text);
  if (matches.length === 0) return { cleaned: text, strippedCount: 0, strippedTypes: {} };

  const sorted = [...matches].sort((a, b) => b.index - a.index);

  const strippedTypes: Record<string, number> = {};
  let result = text;
  const replaced = new Set<number>();

  for (const match of sorted) {
    const alreadyReplaced = [...replaced].some(
      (idx) => match.index >= idx && match.index < idx + PII_PLACEHOLDER[match.type].length,
    );
    if (alreadyReplaced) continue;

    const placeholder = PII_PLACEHOLDER[match.type];
    result =
      result.slice(0, match.index) +
      placeholder +
      result.slice(match.index + match.value.length);
    replaced.add(match.index);
    strippedTypes[match.type] = (strippedTypes[match.type] || 0) + 1;
  }

  return {
    cleaned: result,
    strippedCount: matches.length,
    strippedTypes,
  };
}
