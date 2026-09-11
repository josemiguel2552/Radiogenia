import { describe, it, expect } from "vitest";
import { checkFindingsCoherence } from "@/lib/findings-coherence";

describe("checkFindingsCoherence — direction vs numbers", () => {
  it("flags an increase whose measurement drops", () => {
    const issues = checkFindingsCoherence("Nódulo pulmonar con aumento de 10 a 8 mm respecto al previo.");
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("direction");
    expect(issues[0].fragment).toContain("10");
    expect(issues[0].fragment).toContain("8");
  });

  it("flags a decrease whose measurement rises", () => {
    const issues = checkFindingsCoherence("Lesión hepática con disminución de 12 a 20 mm.");
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("direction");
  });

  it("flags a described change where the measurement is unchanged", () => {
    const issues = checkFindingsCoherence("Adenopatía con crecimiento de 15 a 15 mm.");
    expect(issues).toHaveLength(1);
  });

  it("accepts a correctly described increase", () => {
    expect(checkFindingsCoherence("Nódulo con aumento de 8 a 10 mm.")).toEqual([]);
  });

  it("accepts a correctly described decrease", () => {
    expect(checkFindingsCoherence("Lesión con disminución de 20 a 12 mm.")).toEqual([]);
  });

  it("converts units before comparing, so cm to mm is not a false alarm", () => {
    // 1 cm → 8 mm really is a decrease, so "disminución" is correct here.
    expect(checkFindingsCoherence("Nódulo con disminución de 1 cm a 8 mm.")).toEqual([]);
    // and the same pair described as growth is wrong.
    expect(checkFindingsCoherence("Nódulo con aumento de 1 cm a 8 mm.")).toHaveLength(1);
  });

  it("ignores a measurement pair with no change word", () => {
    expect(checkFindingsCoherence("Lesión que mide de 10 a 8 mm en sus ejes.")).toEqual([]);
  });

  it("keeps clauses apart so a change word does not reach another sentence's numbers", () => {
    expect(checkFindingsCoherence("Aumento de tamaño de la lesión. Otro nódulo de 10 a 8 mm sin cambios.")).toEqual([]);
  });
});

describe("checkFindingsCoherence — implausible units", () => {
  it("flags splenomegaly measured in millimetres", () => {
    const issues = checkFindingsCoherence("Esplenomegalia de 16 mm.");
    expect(issues).toHaveLength(1);
    expect(issues[0].kind).toBe("units");
    expect(issues[0].message).toMatch(/cm/);
  });

  it("accepts splenomegaly measured in centimetres", () => {
    expect(checkFindingsCoherence("Esplenomegalia de 16 cm.")).toEqual([]);
  });

  it("accepts a plausible hepatomegaly in millimetres", () => {
    expect(checkFindingsCoherence("Hepatomegalia de 180 mm.")).toEqual([]);
  });

  it("does not flag a small lesion described inside the enlarged organ", () => {
    expect(checkFindingsCoherence("Esplenomegalia con quiste de 8 mm.")).toEqual([]);
    expect(checkFindingsCoherence("Hepatomegalia con nódulo de 12 mm en segmento VII.")).toEqual([]);
  });

  it("leaves an ordinary organ mention alone", () => {
    expect(checkFindingsCoherence("Bazo de tamaño normal. Quiste esplénico de 9 mm.")).toEqual([]);
  });
});

describe("checkFindingsCoherence — general", () => {
  it("returns nothing for empty or clean findings", () => {
    expect(checkFindingsCoherence("")).toEqual([]);
    expect(checkFindingsCoherence("Hígado: Sin lesiones focales.\nBazo: Normal.")).toEqual([]);
  });

  it("points at the offending fragment in the original text", () => {
    const text = "Hígado normal.\nNódulo con aumento de 10 a 8 mm.";
    const issues = checkFindingsCoherence(text);
    expect(issues).toHaveLength(1);
    expect(text.slice(issues[0].start, issues[0].end)).toBe(issues[0].fragment);
  });

  it("reports several problems in one report, in order", () => {
    const issues = checkFindingsCoherence(
      "Esplenomegalia de 16 mm.\nNódulo con aumento de 10 a 8 mm.",
    );
    expect(issues.map((i) => i.kind)).toEqual(["units", "direction"]);
  });
});
