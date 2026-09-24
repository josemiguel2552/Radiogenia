/**
 * Does this report compare against an earlier study?
 *
 * The evolutive conclusion is organised by what changed, which only exists if
 * there is something to change from. Asked to write one for a first study, a
 * model will either invent comparisons or produce empty categories, so the
 * style falls back to the concise one when this returns false.
 *
 * Deliberately conservative: it looks for an explicit reference to a previous
 * study, and treats an explicit denial of one ("no prior studies available")
 * as a no. A false negative costs the radiologist the style they picked on
 * one report; a false positive invites the model to compare against nothing.
 */

/** Ways a report says it is comparing with an earlier study. */
const PRIOR_REFERENCE = [
  // es
  "estudio previo", "estudios previos", "respecto al previo", "respecto a previo",
  "respecto al estudio", "comparado con", "en comparación", "control evolutivo",
  "tc previa", "tc previo", "rm previa", "rm previo", "eco previa", "informe previo",
  "exploración previa", "estudio anterior", "estudios anteriores", "respecto al anterior",
  // How radiologists actually abbreviate it in a findings line: "(8 mm en el
  // previo)". Missing these sent every real follow-up down the no-prior path.
  "en el previo", "del previo", "al previo", "con el previo", "que el previo",
  "en el anterior", "del anterior", "al anterior", "que el anterior",
  "no presente en el previo", "presente en el previo",
  // en
  "prior study", "prior studies", "previous study", "previous studies",
  "compared with", "compared to", "comparison with", "interval change",
  "since the prior", "since the previous", "prior examination", "previous examination",
  "on the prior", "from the prior", "than on the prior", "on the previous",
  "from the previous", "than on the previous",
  // pt
  "estudo prévio", "estudos prévios", "em relação ao prévio", "comparado com o",
  "exame prévio", "estudo anterior", "estudos anteriores", "em relação ao anterior",
  "no prévio", "do prévio", "ao prévio", "que o prévio",
  "no anterior", "do anterior", "ao anterior", "que o anterior",
];

/** Phrasing that mentions a prior only to say there isn't one. */
const PRIOR_DENIED = [
  "sin estudios previos", "no se dispone de estudios previos", "sin estudio previo",
  "no hay estudios previos", "sin comparación", "sin estudios anteriores",
  "no se disponen de estudios previos", "sin previos",
  "no prior study", "no prior studies", "no previous study", "no previous studies",
  "no prior imaging", "without comparison", "no comparison available",
  "sem estudos prévios", "sem estudo prévio", "não há estudos prévios",
  "sem comparação", "sem estudos anteriores",
];

/** Change language, which only means something against an earlier study. */
const CHANGE_LANGUAGE = [
  "de nueva aparición", "ha aumentado", "ha disminuido", "sin cambios respecto",
  "estable respecto", "ha desaparecido", "resuelto respecto",
  "newly appeared", "has increased", "has decreased", "unchanged from",
  "stable from", "has resolved", "no longer seen",
  "de nova aparição", "aumentou", "diminuiu", "sem alterações em relação",
  "estável em relação", "desapareceu",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    // Strip accents so "prévio" and "previo" match the same entry.
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const norm = (list: string[]) => list.map(normalize);
const PRIOR_REFERENCE_N = norm(PRIOR_REFERENCE);
const PRIOR_DENIED_N = norm(PRIOR_DENIED);
const CHANGE_LANGUAGE_N = norm(CHANGE_LANGUAGE);

export function hasPriorComparison(
  findingsText: string,
  opts?: { priorReportProvided?: boolean },
): boolean {
  // A prior report handed in explicitly settles it, whatever the findings say.
  if (opts?.priorReportProvided) return true;
  if (!findingsText || !findingsText.trim()) return false;

  const text = normalize(findingsText);

  // "No prior studies available" mentions priors in order to rule them out.
  // Cut those phrases before looking for a reference, so the denial does not
  // read as a comparison.
  let stripped = text;
  for (const denial of PRIOR_DENIED_N) stripped = stripped.split(denial).join(" ");

  if (PRIOR_REFERENCE_N.some((p) => stripped.includes(p))) return true;
  return CHANGE_LANGUAGE_N.some((p) => stripped.includes(p));
}
