/**
 * Clinical stage grouping for oesophageal and oesophagogastric junction
 * cancer — AJCC 8th edition (2017), cTNM.
 *
 * Adenocarcinoma and squamous cell carcinoma have DIFFERENT clinical stage
 * groups in the 8th edition: the same T, N and M can be stage IIA in one and
 * stage I in the other. Getting the histology wrong therefore changes the
 * answer, which is why it is a required input rather than a default.
 *
 * Clinical only. Pathologic (pTNM) grouping additionally uses grade, and for
 * squamous also tumour location — neither of which a radiologist has. This is
 * the staging a radiologist does from imaging, and nothing here should be
 * presented as a pathologic stage.
 *
 * The tables live here rather than inside the calculator component so that
 * one source of truth serves the calculator, the staging tool and anything
 * else that needs it, and so they can be pinned by tests.
 */

export type EsophagealHistology = "adeno" | "squamous";
export type StageColor = "green" | "blue" | "yellow" | "red" | "gray";
export type EsophagealStage = { stage: string; color: StageColor } | null;

/** T codes as the calculator offers them, in AJCC order. */
export const ESOPHAGUS_T_CODES = ["Tis", "T1", "T2", "T3", "T4a", "T4b"] as const;
export const ESOPHAGUS_N_CODES = ["N0", "N1", "N2", "N3"] as const;
export const ESOPHAGUS_M_CODES = ["M0", "M1"] as const;

/**
 * Returns the AJCC 8th clinical stage group, or null when the combination is
 * not a defined one (Tis is node-negative by definition, so Tis with N1–N3 has
 * no group — the caller shows nothing rather than inventing an answer).
 */
export function stageEsophagealCancer(sel: {
  histology?: string;
  T?: string;
  N?: string;
  M?: string;
}): EsophagealStage {
  const { histology, T, N, M } = sel;
  if (!histology || !T || !N || !M) return null;

  // M1 is stage IVB whatever the histology, T and N.
  if (M === "M1") return { stage: "IVB", color: "red" };

  // N3 is stage IVA in both histologies, whatever the T.
  if (N === "N3") return { stage: "IVA", color: "red" };

  if (T === "Tis") return N === "N0" ? { stage: "0", color: "green" } : null;

  if (histology === "squamous") {
    // Squamous does not split T4 for clinical staging: T4a and T4b are both
    // IVA once N is anything from N0 to N2.
    if (T === "T4a" || T === "T4b") return { stage: "IVA", color: "red" };
    // T1–T3 here.
    if (N === "N2") return { stage: "III", color: "red" };
    if (T === "T3") return N === "N0" ? { stage: "II", color: "yellow" } : { stage: "III", color: "red" };
    // T1–T2, N0–N1.
    if (T === "T2") return { stage: "II", color: "yellow" };
    return { stage: "I", color: "green" };
  }

  // Adenocarcinoma.
  if (T === "T4b") return { stage: "IVA", color: "red" };
  if (N === "N2") return { stage: "IVA", color: "red" }; // T1–T4a N2
  // T1–T4a, N0–N1.
  if (T === "T4a" || T === "T3") return { stage: "III", color: "red" };
  if (T === "T2") return N === "N0" ? { stage: "IIB", color: "yellow" } : { stage: "III", color: "red" };
  // T1.
  return N === "N0" ? { stage: "I", color: "green" } : { stage: "IIA", color: "yellow" };
}
