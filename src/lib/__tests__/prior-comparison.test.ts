import { describe, it, expect } from "vitest";
import { hasPriorComparison } from "@/lib/prior-comparison";

describe("reports that do compare with an earlier study", () => {
  it.each([
    ["es", "Lesión hepática de 12 mm, mayor que en el estudio previo (8 mm)."],
    ["es", "Adenopatía interaortocava sin cambios respecto al anterior."],
    ["es", "Nódulo pulmonar de nueva aparición en lóbulo inferior derecho."],
    ["es", "Derrame pleural comparado con la TC previa: ha disminuido."],
    ["en", "Hepatic lesion measuring 12 mm, increased from the prior study."],
    ["en", "Pulmonary nodule unchanged from the previous examination."],
    ["en", "Pleural effusion has resolved."],
    ["pt", "Lesão hepática de 12 mm, maior que no estudo prévio."],
    ["pt", "Linfonodo sem alterações em relação ao anterior."],
    // The shorthand radiologists actually write inside a findings line.
    ["es", "Lesión hepática de 12 mm (8 mm en el previo)."],
    ["es", "Nódulo de 9 mm, no presente en el previo."],
    ["es", "Adenopatía de 15 mm, igual que el anterior."],
    ["en", "Hepatic lesion 12 mm (8 mm on the prior)."],
    ["en", "Nodule measuring 9 mm, larger than on the previous."],
    ["pt", "Lesão hepática de 12 mm (8 mm no prévio)."],
  ])("%s: %s", (_lang, text) => {
    expect(hasPriorComparison(text)).toBe(true);
  });

  it("accepts a prior report handed in directly, whatever the findings say", () => {
    expect(hasPriorComparison("Hígado sin lesiones.", { priorReportProvided: true })).toBe(true);
  });

  it("matches regardless of accents", () => {
    expect(hasPriorComparison("Maior que no estudo previo.")).toBe(true);
    expect(hasPriorComparison("Mayor que en el estudio prévio.")).toBe(true);
  });
});

describe("reports that do not", () => {
  it.each([
    ["a first study", "Hígado: lesión focal hipodensa de 12 mm en segmento VII. Vesícula: litiasis de 8 mm."],
    ["plain description", "Consolidación en lóbulo inferior derecho con broncograma aéreo."],
    ["empty", ""],
    ["whitespace", "   \n  "],
  ])("%s", (_name, text) => {
    expect(hasPriorComparison(text)).toBe(false);
  });

  it("does not count a prior mentioned only to say there is none", () => {
    // The trap: these sentences contain "estudios previos" and mean the
    // opposite. Reading them as a comparison would ask the model to describe
    // changes against a study it does not have.
    for (const text of [
      "Sin estudios previos para comparación.",
      "No se dispone de estudios previos.",
      "No prior studies available for comparison.",
      "Sem estudos prévios para comparação.",
      "Sin comparación con exploraciones anteriores.",
    ]) {
      expect(hasPriorComparison(text)).toBe(false);
    }
  });

  it("still sees a real comparison alongside a denial elsewhere", () => {
    const text = "Sin estudios previos de tórax. En abdomen, la lesión hepática ha aumentado respecto al estudio previo.";
    expect(hasPriorComparison(text)).toBe(true);
  });
});

describe("the word 'previo' alone is not enough", () => {
  it("ignores unrelated uses", () => {
    // "previa" as in placenta previa, not a previous study.
    expect(hasPriorComparison("Placenta previa oclusiva total.")).toBe(false);
  });
});
