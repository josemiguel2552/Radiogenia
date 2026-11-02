import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Disc nomenclature, with figures, plus the two stenosis scales.
 *
 * Every term in Fardon's nomenclature is a geometric definition — base against
 * depth, degrees of circumference, continuity with the parent disc — so the
 * figure is not decoration: it is the definition drawn. What these guard is
 * that each one still says something DIFFERENT from its neighbour. Two grades
 * drawn identically is the failure that looks fine in review and teaches the
 * reader nothing, and it is exactly what the first draft of the foraminal
 * figure did.
 */

const ROOT = join(__dirname, "../../..");
const TAB = readFileSync(join(ROOT, "src/components/sidebar/calculators-tab.tsx"), "utf8");
const DICT = readFileSync(join(ROOT, "src/lib/i18n-calc.ts"), "utf8");

/** The end marker is searched from the START of the block, not of the file —
 *  otherwise the slice runs backwards and comes back empty, and an empty
 *  string quietly satisfies nothing while every assertion on it fails or,
 *  worse, passes. */
const block = (from: string, to: string) => {
  const a = TAB.indexOf(from);
  if (a < 0) throw new Error(`not found: ${from}`);
  const b = TAB.indexOf(to, a + from.length);
  if (b < 0) throw new Error(`end not found: ${to}`);
  return TAB.slice(a, b);
};

describe("the disc figures draw the definition, not a picture", () => {
  it("ships one figure per term", () => {
    const sheet = block("function SpineNomenclatureSheet()", "function CanalStenosisSheet()");
    for (const fig of ["<FigNormal />", "<FigBulge />", "<FigProtrusion />", "<FigExtrusion />", "<FigSequestration />", "<FigMigration />"]) {
      expect(sheet).toContain(fig);
    }
  });

  it("gives the protrusion a base wider than its depth, and the extrusion the reverse", () => {
    // This is the whole of the distinction between the two terms. Drawing
    // both as a generic lump would make the pair of figures worse than none.
    const prot = block("function FigProtrusion()", "function FigExtrusion()");
    const extr = block("function FigExtrusion()", "function FigSequestration()");

    // Each carries a drawn base line and a drawn depth line, so the reader
    // can see which is longer rather than take the caption's word for it.
    const span = (b: string) => {
      const m = b.match(/<line x1="(\d+)" y1="\d+" x2="(\d+)"/)!;
      return Number(m[2]) - Number(m[1]);
    };
    const depth = (b: string) => {
      const m = b.match(/<line x1="60" y1="(\d+)" x2="60" y2="(\d+)"/)!;
      return Number(m[2]) - Number(m[1]);
    };
    expect(span(prot)).toBeGreaterThan(depth(prot));
    expect(span(extr)).toBeLessThan(depth(extr));
  });

  it("draws sequestration and migration in the plane the difference lives in", () => {
    // Craniocaudal displacement cannot be shown on an axial figure, so these
    // two switch to a sagittal base and say so on the card.
    for (const fn of ["function FigSequestration()", "function FigMigration()"]) {
      const b = block(fn, "\n}\n");
      expect(b).toContain("<SagBase />");
      expect(b).toContain('t("calc.spine_view_sag")');
    }
  });

  it("separates the migrated fragment from the extrusion site", () => {
    // Sequestration is loss of continuity; migration adds displacement away
    // from it. If both blobs sat at the disc level the figures would be twins.
    const seq = block("function FigSequestration()", "function FigMigration()");
    const mig = block("function FigMigration()", "function FigZones()");
    const cy = (b: string) => Number(b.match(/<ellipse cx="\d+" cy="(\d+)"/)![1]);
    expect(cy(mig)).toBeGreaterThan(cy(seq) + 15);
  });
});

describe("the circumference figure is anchored on the posterior margin", () => {
  it("grows the arc monotonically across the three bands", () => {
    const fig = block("function FigCircumference()", "function FigSchizas(");
    expect(fig).toContain("< 90°");
    expect(fig).toContain("90–180°");
    expect(fig).toContain("> 180°");
    // Only the bulge crosses a half circle, which is what the large-arc flag
    // says. Getting it wrong draws > 180° as the smaller of the three.
    const large = [...fig.matchAll(/A26,26 0 ([01]),/g)].map((m) => m[1]);
    expect(large).toEqual(["0", "0", "1"]);
  });
});

describe("the two stenosis scales draw four distinguishable grades", () => {
  it("keeps CSF in Schizas A and B and takes it away in C and D", () => {
    const fig = block("function FigSchizas(", "function FigForaminal(");
    expect(fig).toContain('grade === "A" || grade === "B" ? SAC');
    // Rootlets are only drawable while there is CSF to see them against.
    expect(fig).toMatch(/grade === "A"\s*\?/);
  });

  it("separates C from D by the posterior epidural fat alone", () => {
    // That single crescent is the entire difference between the two grades.
    const fig = block("function FigSchizas(", "function FigForaminal(");
    expect(fig).toContain('grade !== "D" &&');
  });

  it("does not draw foraminal grade 1 the same as grade 2", () => {
    // Grade 1 is fat lost in two OPPOSING directions, so fat survives at the
    // sides; grade 2 is fat lost in all four. Drawing grade 1 as two half
    // ellipses covers the whole foramen and makes the two identical.
    const fig = block("function FigForaminal(", "const SPINE_SOURCES");
    expect(fig).toContain("grade === 1 &&");
    expect(fig).toContain("grade >= 2 &&");
    expect(fig).not.toContain("grade >= 1 &&");
  });

  it("deforms the root only at grade 3", () => {
    // The step that matters clinically is the root, not the fat.
    const fig = block("function FigForaminal(", "const SPINE_SOURCES");
    expect(fig).toContain("grade === 3 ?");
  });
});

describe("the classifications live in one place and appear in two", () => {
  it("builds both stenosis sheets and the nomenclature sheet from the same block", () => {
    // Two copies of a grading table drift: one gets corrected, the other is
    // the one the radiologist happens to open.
    const nomen = block("function SpineNomenclatureSheet()", "function CanalStenosisSheet()");
    expect(nomen).toContain("<CanalStenosisBlock />");
    expect(nomen).toContain("<ForaminalStenosisBlock />");
    expect(block("function CanalStenosisSheet()", "function ForaminalStenosisSheet()")).toContain("<CanalStenosisBlock />");
    expect(block("function ForaminalStenosisSheet()", "\n}\n")).toContain("<ForaminalStenosisBlock />");
  });

  it("still registers all three sheets under MSK", () => {
    const msk = TAB.slice(TAB.indexOf('key: "msk"'), TAB.indexOf('key: "vascular"'));
    for (const c of ["<SpineNomenclatureSheet />", "<CanalStenosisSheet />", "<ForaminalStenosisSheet />"]) {
      expect(msk).toContain(c);
    }
  });
});

describe("the new spine strings exist in all three languages", () => {
  it("has every key the figures and tables ask for", () => {
    const used = new Set(
      [...TAB.matchAll(/t\("(calc\.(?:spine|canal|foraminal)_[a-z0-9_]+)"\)/g)].map((m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(40);
    const blocks = {
      es: DICT.slice(DICT.indexOf("  es: {"), DICT.indexOf("  en: {")),
      en: DICT.slice(DICT.indexOf("  en: {"), DICT.indexOf("  pt: {")),
      pt: DICT.slice(DICT.indexOf("  pt: {")),
    };
    for (const [lang, b] of Object.entries(blocks)) {
      const missing = [...used].filter((k) => !b.includes(`"${k}":`));
      expect(`${lang}: ${missing.join(", ")}`).toBe(`${lang}: `);
    }
  });
});
