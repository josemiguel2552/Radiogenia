import { describe, it, expect } from "vitest";
import { splitConclusionPoints } from "@/components/dashboard/trace-highlight";
import { normalizeConclusionStyle } from "@/lib/types";

/** The spans are what the UI highlights and what the links pass numbers by,
 *  so an off-by-one here lights up the wrong half of the conclusion. */
function assertCovers(text: string, expected: string[]) {
  const parts = splitConclusionPoints(text);
  expect(parts.map((p) => text.slice(p.start, p.end).trim())).toEqual(expected);
  expect(parts.map((p) => p.point)).toEqual(expected.map((_, i) => i + 1));
}

describe("splitConclusionPoints — numbered conclusions", () => {
  it("splits on the N. line-start convention", () => {
    const text = "1. Nódulo pulmonar de 9 mm en lóbulo inferior derecho.\n2. Litiasis vesicular de 8 mm.";
    assertCovers(text, [
      "1. Nódulo pulmonar de 9 mm en lóbulo inferior derecho.",
      "2. Litiasis vesicular de 8 mm.",
    ]);
  });

  it("keeps the numbers the conclusion itself uses", () => {
    const parts = splitConclusionPoints("1. Primero.\n2. Segundo.\n3. Tercero.");
    expect(parts.map((p) => p.point)).toEqual([1, 2, 3]);
  });

  it("does not treat a mid-line number as a new point", () => {
    const text = "1. Lesión hepática que ha pasado de 2. a 3.5 cm respecto al previo.";
    expect(splitConclusionPoints(text)).toHaveLength(1);
  });
});

describe("splitConclusionPoints — ultra-short paragraph", () => {
  it("numbers each sentence of an unnumbered paragraph", () => {
    const text = "Litiasis vesicular de 8 mm sin signos inflamatorios. Lesión hepática de 12 mm en segmento VII.";
    assertCovers(text, [
      "Litiasis vesicular de 8 mm sin signos inflamatorios.",
      "Lesión hepática de 12 mm en segmento VII.",
    ]);
  });

  it("does not split a decimal measurement", () => {
    const text = "Aumento de la lesión hepática de 2.4 a 3.5 cm respecto al estudio previo.";
    assertCovers(text, [text]);
  });

  it("returns the whole text when it has no final period", () => {
    assertCovers("Exploración dentro de límites normales", ["Exploración dentro de límites normales"]);
  });

  it("ignores leading whitespace rather than pointing at it", () => {
    const text = "  Litiasis vesicular de 8 mm.";
    const [first] = splitConclusionPoints(text);
    expect(text.slice(first.start, first.end)).toBe("Litiasis vesicular de 8 mm.");
  });

  it("has nothing to split in an empty conclusion", () => {
    expect(splitConclusionPoints("")).toEqual([]);
    expect(splitConclusionPoints("   ")).toEqual([]);
  });
});

describe("normalizeConclusionStyle", () => {
  it("keeps the concise style", () => {
    expect(normalizeConclusionStyle("concise")).toBe("concise");
  });

  it("maps the styles that 'brief' replaced, so saved preferences still load", () => {
    for (const legacy of ["grouped", "detailed", "brief", null, undefined, ""]) {
      expect(normalizeConclusionStyle(legacy)).toBe("brief");
    }
  });
});
