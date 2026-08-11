/* Regional feature policy.
 *
 * Under the EU MDR, software that only records, structures and communicates
 * what the clinician dictates is documentation software, not a medical
 * device. Features that *interpret* — proposing a BI-RADS/TI-RADS/TNM
 * category, recommending follow-up, flagging what might be missing — are
 * clinical decision support and would qualify the product as a medical
 * device requiring CE marking. The United States has its own regime (FDA),
 * treated conservatively here until analysed separately.
 *
 * So those features are disabled for users we serve in the EU/EEA/UK and the
 * US, while the core dictation and reporting stays available everywhere.
 *
 * The anchor is the country the user declared for their account — that is
 * who we contract with and where we make the service available — with the
 * connection country only as a fallback when nothing was declared.
 */

export type Region = "eu" | "us" | "open";

export interface RegionFeatures {
  /** Automatic TNM / BI-RADS / TI-RADS category proposal. */
  classification: boolean;
  /** Follow-up recommendations derived from guidelines. */
  recommendations: boolean;
  /** Clinical checklist flagging possibly missing findings. */
  clinicalCheck: boolean;
  /** Assistant answering clinical questions about the case at hand. */
  caseAssistant: boolean;
}

const EU_EEA_UK = new Set([
  // EU
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA + UK + CH (same conformity expectations in practice)
  "IS", "LI", "NO", "GB", "CH",
]);

/** Country names as stored on profiles → ISO 3166-1 alpha-2. */
const NAME_TO_ISO: Record<string, string> = {
  // EU / EEA / UK, in the spellings our forms and imports use
  "españa": "ES", "espana": "ES", "spain": "ES",
  "portugal": "PT",
  "france": "FR", "francia": "FR",
  "germany": "DE", "alemania": "DE", "deutschland": "DE",
  "italy": "IT", "italia": "IT",
  "netherlands": "NL", "países bajos": "NL", "paises bajos": "NL",
  "belgium": "BE", "bélgica": "BE", "belgica": "BE",
  "ireland": "IE", "irlanda": "IE",
  "austria": "AT", "poland": "PL", "polonia": "PL",
  "sweden": "SE", "suecia": "SE", "denmark": "DK", "dinamarca": "DK",
  "finland": "FI", "finlandia": "FI", "norway": "NO", "noruega": "NO",
  "greece": "GR", "grecia": "GR", "romania": "RO", "rumanía": "RO",
  "czechia": "CZ", "czech republic": "CZ", "hungary": "HU", "hungría": "HU",
  "switzerland": "CH", "suiza": "CH",
  "united kingdom": "GB", "reino unido": "GB", "uk": "GB",
  "bulgaria": "BG", "croatia": "HR", "croacia": "HR", "cyprus": "CY",
  "estonia": "EE", "latvia": "LV", "lithuania": "LT", "luxembourg": "LU",
  "malta": "MT", "slovakia": "SK", "slovenia": "SI", "iceland": "IS",
  // United States
  "united states": "US", "usa": "US", "estados unidos": "US", "eeuu": "US",
  // Everywhere else we serve — listed explicitly so a declared country is
  // always recognised and never falls through to the connection country.
  "argentina": "AR", "bolivia": "BO", "brasil": "BR", "brazil": "BR",
  "chile": "CL", "colombia": "CO", "costa rica": "CR", "cuba": "CU",
  "ecuador": "EC", "el salvador": "SV", "guatemala": "GT", "honduras": "HN",
  "méxico": "MX", "mexico": "MX", "nicaragua": "NI", "panamá": "PA",
  "panama": "PA", "paraguay": "PY", "perú": "PE", "peru": "PE",
  "puerto rico": "PR", "república dominicana": "DO", "republica dominicana": "DO",
  "uruguay": "UY", "venezuela": "VE",
};

function isoFromCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  const raw = country.trim();
  if (!raw) return null;
  // Already an ISO code?
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  return NAME_TO_ISO[raw.toLowerCase()] ?? null;
}

function regionFromIso(iso: string | null): Region | null {
  if (!iso) return null;
  if (EU_EEA_UK.has(iso)) return "eu";
  if (iso === "US") return "us";
  return "open";
}

/**
 * Resolve the region governing a user's feature set. The declared account
 * country wins; the connection country only fills the gap when no country
 * was declared (and can never *unlock* features for a declared EU/US user).
 */
export function resolveRegion(
  accountCountry: string | null | undefined,
  connectionCountry?: string | null,
): Region {
  const declared = regionFromIso(isoFromCountry(accountCountry));
  if (declared) return declared;
  return regionFromIso(isoFromCountry(connectionCountry)) ?? "open";
}

export function regionFeatures(region: Region): RegionFeatures {
  if (region === "open") {
    return { classification: true, recommendations: true, clinicalCheck: true, caseAssistant: true };
  }
  // EU and US: documentation-only feature set.
  return { classification: false, recommendations: false, clinicalCheck: false, caseAssistant: false };
}

export function isRestrictedRegion(region: Region): boolean {
  return region !== "open";
}

/** Header Vercel sets with the visitor's country, when deployed on its edge. */
export const IP_COUNTRY_HEADER = "x-vercel-ip-country";
