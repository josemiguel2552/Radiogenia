import { describe, it, expect } from "vitest";
import {
  stageEsophagealCancer,
  ESOPHAGUS_T_CODES,
  ESOPHAGUS_N_CODES,
} from "@/lib/tnm-esophagus";

const stage = (histology: string, T: string, N: string, M = "M0") =>
  stageEsophagealCancer({ histology, T, N, M })?.stage ?? null;

/**
 * The AJCC 8th clinical stage tables, transcribed cell by cell. They are the
 * point of this module, so they are asserted rather than spot-checked: a
 * refactor that quietly moves one combination has to fail here.
 */
describe("AJCC 8th clinical stage — oesophageal ADENOCARCINOMA", () => {
  const TABLE: [string, string, string][] = [
    ["Tis", "N0", "0"],
    ["T1", "N0", "I"],
    ["T1", "N1", "IIA"],
    ["T2", "N0", "IIB"],
    ["T2", "N1", "III"],
    ["T3", "N0", "III"],
    ["T3", "N1", "III"],
    ["T4a", "N0", "III"],
    ["T4a", "N1", "III"],
    ["T1", "N2", "IVA"],
    ["T2", "N2", "IVA"],
    ["T3", "N2", "IVA"],
    ["T4a", "N2", "IVA"],
    ["T4b", "N0", "IVA"],
    ["T4b", "N1", "IVA"],
    ["T4b", "N2", "IVA"],
  ];

  it.each(TABLE)("c%s %s M0 → stage %s", (T, N, expected) => {
    expect(stage("adeno", T, N)).toBe(expected);
  });

  it("puts any N3 in IVA", () => {
    for (const T of ESOPHAGUS_T_CODES) expect(stage("adeno", T, "N3")).toBe("IVA");
  });
});

describe("AJCC 8th clinical stage — oesophageal SQUAMOUS CELL CARCINOMA", () => {
  const TABLE: [string, string, string][] = [
    ["Tis", "N0", "0"],
    ["T1", "N0", "I"],
    ["T1", "N1", "I"],
    ["T2", "N0", "II"],
    ["T2", "N1", "II"],
    ["T3", "N0", "II"],
    ["T3", "N1", "III"],
    ["T1", "N2", "III"],
    ["T2", "N2", "III"],
    ["T3", "N2", "III"],
    ["T4a", "N0", "IVA"],
    ["T4a", "N1", "IVA"],
    ["T4a", "N2", "IVA"],
    ["T4b", "N0", "IVA"],
    ["T4b", "N1", "IVA"],
    ["T4b", "N2", "IVA"],
  ];

  it.each(TABLE)("c%s %s M0 → stage %s", (T, N, expected) => {
    expect(stage("squamous", T, N)).toBe(expected);
  });

  it("puts any N3 in IVA", () => {
    for (const T of ESOPHAGUS_T_CODES) expect(stage("squamous", T, "N3")).toBe("IVA");
  });
});

describe("the two histologies genuinely differ", () => {
  // If these ever agree, the squamous table has been lost.
  it("stages T1 N1 as IIA in adenocarcinoma but I in squamous", () => {
    expect(stage("adeno", "T1", "N1")).toBe("IIA");
    expect(stage("squamous", "T1", "N1")).toBe("I");
  });

  it("stages T2 N1 as III in adenocarcinoma but II in squamous", () => {
    expect(stage("adeno", "T2", "N1")).toBe("III");
    expect(stage("squamous", "T2", "N1")).toBe("II");
  });

  it("stages T3 N2 as IVA in adenocarcinoma but III in squamous", () => {
    expect(stage("adeno", "T3", "N2")).toBe("IVA");
    expect(stage("squamous", "T3", "N2")).toBe("III");
  });

  it("stages T4a N0 as III in adenocarcinoma but IVA in squamous", () => {
    expect(stage("adeno", "T4a", "N0")).toBe("III");
    expect(stage("squamous", "T4a", "N0")).toBe("IVA");
  });
});

describe("M1 and incomplete selections", () => {
  it("is IVB on M1 regardless of histology, T and N", () => {
    for (const h of ["adeno", "squamous"]) {
      for (const T of ESOPHAGUS_T_CODES) {
        for (const N of ESOPHAGUS_N_CODES) {
          expect(stage(h, T, N, "M1")).toBe("IVB");
        }
      }
    }
  });

  it("returns nothing until every axis has been chosen", () => {
    expect(stageEsophagealCancer({})).toBeNull();
    expect(stageEsophagealCancer({ histology: "adeno" })).toBeNull();
    expect(stageEsophagealCancer({ histology: "adeno", T: "T2", N: "N0" })).toBeNull();
    // Histology is required precisely because it changes the answer.
    expect(stageEsophagealCancer({ T: "T1", N: "N1", M: "M0" })).toBeNull();
  });

  it("refuses to invent a group for Tis with positive nodes", () => {
    // Tis is node-negative by definition, so AJCC defines no such group.
    for (const h of ["adeno", "squamous"]) {
      expect(stage(h, "Tis", "N1")).toBeNull();
      expect(stage(h, "Tis", "N2")).toBeNull();
    }
  });

  it("never returns a stage outside the AJCC set", () => {
    const allowed = new Set(["0", "I", "IIA", "IIB", "II", "III", "IVA", "IVB"]);
    for (const h of ["adeno", "squamous"]) {
      for (const T of ESOPHAGUS_T_CODES) {
        for (const N of ESOPHAGUS_N_CODES) {
          for (const M of ["M0", "M1"]) {
            const got = stage(h, T, N, M);
            if (got !== null) expect(allowed.has(got)).toBe(true);
          }
        }
      }
    }
  });
});
