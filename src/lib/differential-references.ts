/**
 * Picks the clinical reference sections worth putting in front of the model
 * for a given body region.
 *
 * The platform already carries real thresholds — LI-RADS, Bosniak, adrenal
 * washout, Fleischner, TI-RADS, WHO CNS grades — assembled for the chatbot.
 * The differential assistant was reasoning from whatever it remembered of
 * them, which is where a confident wrong number comes from. Handing it the
 * actual figures for the region in question is the cheapest accuracy there is.
 *
 * Filtered rather than dumped whole: the full body runs to tens of thousands
 * of characters, most of it irrelevant to any one lesion, and burying the
 * three lines that matter in fifty pages is its own kind of noise.
 */

import type { BodyRegion } from "./differential";

/** Section headers are ALL-CAPS lines ending in a colon. */
const HEADER = /^[A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑ0-9 &/(),.'’—–-]{6,}:$/;

export interface ReferenceSection {
  title: string;
  body: string;
}

/** Splits the assembled reference text into its titled sections. */
export function splitReferenceSections(text: string): ReferenceSection[] {
  const out: ReferenceSection[] = [];
  let title: string | null = null;
  let body: string[] = [];

  const flush = () => {
    if (title && body.some((l) => l.trim())) {
      out.push({ title, body: body.join("\n").trim() });
    }
    body = [];
  };

  for (const line of text.split("\n")) {
    if (HEADER.test(line.trim())) {
      flush();
      title = line.trim();
    } else if (title) {
      body.push(line);
    }
  }
  flush();
  return out;
}

/**
 * Words that mark a section as relevant to a region.
 *
 * Matched on word boundaries, not as raw substrings: "PE" inside "PEDIATRIC"
 * put hip dysplasia in front of a chest case the first time this ran. And
 * ambiguous single words are written out — "CEREBRAL ANEURYSM" rather than
 * "ANEURYSM", which otherwise pulled the aortic sections into neuro.
 */
const REGION_KEYWORDS: Record<BodyRegion, string[]> = {
  neuro: ["CEREBRAL", "BRAIN", "INFARCT", "DEMYELINATING", "NEURODEGENERATIVE", "CEREBRAL ANEURYSM", "CNS", "PERFUSION", "FAZEKAS", "FISHER", "ASPECTS", "CTP"],
  head_neck: ["NECK", "THYROID", "LYMPH NODE", "SALIVARY", "SINUS", "ORBIT"],
  chest: ["LUNG", "NODULE", "NODULES", "PULMONARY", "INTERSTITIAL", "FLEISCHNER", "LUNG-RADS", "PLEURA", "MEDIASTINAL", "DVT/PE", "CHEST", "SUBSOLID", "SOLID"],
  cardiac: ["CARDIAC", "CORONARY", "CAD-RADS", "T1/T2", "ECV", "MYOCARDIAL", "PERICARDIAL", "MAPPING"],
  breast: ["BREAST", "BI-RADS", "IMPLANT", "MAMMOGRAPHY"],
  abdomen: ["LIVER", "LI-RADS", "HEPATIC", "PANCREATIC", "SPLENIC", "BOWEL", "ADRENAL", "RENAL", "GALLBLADDER", "BILIARY", "ABDOMINAL", "INCIDENTAL ADRENAL", "LIVER INCIDENTAL"],
  pelvis: ["PELVIC", "OVARIAN", "O-RADS", "UTERINE", "PROSTATE", "BLADDER", "ENDOMETRIAL", "CERVIX", "PREMENOPAUSAL", "POSTMENOPAUSAL"],
  genitourinary: ["RENAL", "KIDNEY", "BOSNIAK", "PROSTATE", "PSA", "BLADDER", "URETER", "TESTICULAR", "SCROTAL"],
  hepatobiliary: ["LIVER", "LI-RADS", "HEPATIC", "BILIARY", "GALLBLADDER", "PORTAL", "CIRRHOSIS", "LIVER INCIDENTAL"],
  musculoskeletal: ["BONE", "BONE TUMORS", "SHOULDER", "KNEE", "ANKLE", "THIGH", "ROTATOR", "MUSCULOSKELETAL"],
  spine: ["VERTEBRAL", "SPINAL", "DISC", "FORAMINAL", "SPINE", "CANAL"],
  vascular: ["AORTIC", "AORTA", "CAROTID", "NASCET", "STENOSIS", "AORTIC ANEURYSM", "ARCH", "RESISTIVE", "DVT/PE", "ARTERY"],
  paediatric: ["PEDIATRIC", "GRAF", "DDH", "HYDRONEPHROSIS", "TRANSFONTANELLAR", "CRYPTORCHIDISM"],
};

/** Always useful when a density was measured, whatever the region. */
const DENSITY_SECTIONS = ["ADRENAL WASHOUT", "RENAL LESION CHARACTERIZATION", "LAVADO ADRENAL", "LAVAGEM ADRENAL"];

/** Word-boundary match, so a keyword cannot hide inside a longer word. */
function mentions(title: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^A-Z0-9])${escaped}([^A-Z0-9]|$)`, "i").test(title);
}

export function selectReferencesForRegion(
  fullReferenceText: string,
  region: BodyRegion,
  opts?: { hasDensity?: boolean; maxChars?: number },
): string {
  const sections = splitReferenceSections(fullReferenceText);
  const keywords = REGION_KEYWORDS[region] ?? [];
  const maxChars = opts?.maxChars ?? 9000;

  // Scored, not just filtered. The budget has to cut something, and cutting in
  // document order threw away every cerebral section for a neuro case because
  // the aortic ones happened to come first in the file. A longer keyword is a
  // more specific one, so it weighs more.
  const scored = sections
    .map((s) => {
      const title = s.title.toUpperCase();
      let score = 0;
      for (const k of keywords) if (mentions(title, k)) score += k.length;
      if (opts?.hasDensity && DENSITY_SECTIONS.some((k) => title.includes(k))) {
        // Useful, but never ahead of the region's own material.
        score += 1;
      }
      return { section: s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // The reference body repeats some sections across its language blocks, and
  // paying for the same thresholds twice is budget the region's own material
  // does not get.
  const seen = new Set<string>();
  const out: string[] = [];
  let used = 0;
  for (const { section } of scored) {
    const key = section.title.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const block = `${section.title}\n${section.body}`;
    if (used + block.length > maxChars) continue; // a long one must not starve the rest
    out.push(block);
    used += block.length;
  }
  return out.join("\n\n");
}
