import { describe, it, expect } from "vitest";
import { splitFindingsSentences } from "@/components/dashboard/trace-highlight";

/** Every span must point at exactly the text it claims, or the pick list
 *  highlights the wrong words in the findings box. */
function assertOffsetsRoundTrip(text: string) {
  for (const s of splitFindingsSentences(text)) {
    expect(text.slice(s.start, s.end).trim()).toBe(s.text);
  }
}

describe("splitFindingsSentences", () => {
  it("splits a section line into its sentences and drops the label", () => {
    const text = "Hígado: Lesión focal de 12 mm en segmento VII. Sin dilatación de la vía biliar.";
    const parts = splitFindingsSentences(text);

    expect(parts.map((p) => p.text)).toEqual([
      "Lesión focal de 12 mm en segmento VII.",
      "Sin dilatación de la vía biliar.",
    ]);
    assertOffsetsRoundTrip(text);
  });

  it("does not split a decimal measurement", () => {
    const text = "Bazo: Nódulo de 3.5 cm de diámetro máximo.";
    const parts = splitFindingsSentences(text);

    expect(parts).toHaveLength(1);
    expect(parts[0].text).toBe("Nódulo de 3.5 cm de diámetro máximo.");
  });

  it("keeps offsets aligned across several lines", () => {
    const text = [
      "Pulmones: Nódulo de 8 mm en LSD. Sin derrame pleural.",
      "Mediastino: Sin adenopatías de tamaño significativo.",
      "Óseo: Cambios degenerativos dorsales.",
    ].join("\n");

    const parts = splitFindingsSentences(text);
    expect(parts).toHaveLength(4);
    assertOffsetsRoundTrip(text);
    expect(parts[1].text).toBe("Sin derrame pleural.");
    expect(parts[2].text).toBe("Sin adenopatías de tamaño significativo.");
  });

  it("keeps a trailing sentence that has no final period", () => {
    const text = "Riñones: Quiste simple cortical izquierdo";
    const parts = splitFindingsSentences(text);

    expect(parts.map((p) => p.text)).toEqual(["Quiste simple cortical izquierdo"]);
    assertOffsetsRoundTrip(text);
  });

  it("handles a line with no section label", () => {
    const text = "Estudio sin alteraciones significativas.";
    const parts = splitFindingsSentences(text);

    expect(parts.map((p) => p.text)).toEqual(["Estudio sin alteraciones significativas."]);
    assertOffsetsRoundTrip(text);
  });

  it("ignores empty lines and stray whitespace", () => {
    const text = "Hígado: Normal.\n\n\nBazo: Normal.\n";
    const parts = splitFindingsSentences(text);

    expect(parts.map((p) => p.text)).toEqual(["Normal.", "Normal."]);
    assertOffsetsRoundTrip(text);
  });
});
