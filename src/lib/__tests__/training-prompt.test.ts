import { describe, it, expect } from "vitest";
import { buildTrainingPrompt, inferConclusionStyle, inferLanguage } from "@/lib/training-prompt";
import { buildConclusionPrompt } from "@/lib/prompts";

/**
 * What a fine-tune learns is a mapping from the input it saw to the output it
 * was asked for. If that input is not the one production sends, most of the
 * training does not transfer — the standard train/serve skew, which shows up
 * as a model that is excellent on some reports and erratic on others.
 *
 * The generator used to pair every example with a 45-word English instruction
 * while the conclusion route sent some 2,500 tokens of Spanish rules. These
 * tests exist so that cannot drift apart again.
 */

describe("a training example is paired with the prompt production sends", () => {
  const findings = "Hígado: lesión focal hipodensa de 12 mm en segmento VII.\nVesícula: litiasis de 8 mm.";
  const conclusion = "1. Lesión hepática de 12 mm en segmento VII.\n2. Litiasis vesicular de 8 mm.";

  it("produces exactly what the conclusion route would build for the same case", () => {
    const training = buildTrainingPrompt({
      findingsText: findings,
      conclusionText: conclusion,
      clinicalInfo: "Dolor en hipocondrio derecho.",
    });
    const production = buildConclusionPrompt({
      findingsText: findings,
      clinicalInfo: "Dolor en hipocondrio derecho.",
      outputLanguage: "es",
      conclusionStyle: "concise",
    });
    expect(training.system).toBe(production.system);
    expect(training.user).toBe(production.user);
  });

  it("carries the real rulebook, not a one-line instruction", () => {
    const { system } = buildTrainingPrompt({ findingsText: findings, conclusionText: conclusion });
    // The old generic prompt was 45 words. The real one is thousands of chars.
    expect(system.length).toBeGreaterThan(3000);
    expect(system).toContain("PROHIBIDO");
    expect(system).toContain("DESCRIBIR, NO DIAGNOSTICAR");
  });

  it("does not reintroduce the old hand-rolled user message", () => {
    const { user } = buildTrainingPrompt({
      findingsText: findings,
      conclusionText: conclusion,
      clinicalInfo: "Dolor",
    });
    expect(user).not.toContain("Study:");
    expect(user).not.toContain("Clinical context:");
  });
});

describe("the style block has to match the conclusion it is trained against", () => {
  it("reads numbered points as the concise style", () => {
    expect(inferConclusionStyle("1. Nódulo de 9 mm.\n2. Derrame pleural.")).toBe("concise");
  });

  it("reads a flowing conclusion as the evolutive one", () => {
    expect(inferConclusionStyle("Colédoco dilatado a 9 mm, con litiasis vesicular de 8 mm.")).toBe("evolutive");
  });

  it("gives a numbered conclusion the numbered rules", () => {
    // Pairing numbered output with the one-paragraph rules would teach the
    // model that the style block is noise.
    const { system } = buildTrainingPrompt({
      findingsText: "Hígado: lesión de 12 mm.",
      conclusionText: "1. Lesión hepática de 12 mm.",
    });
    expect(system).toContain("ESTILO — CONCISO");
  });

  it("gives a paragraph conclusion the change-ordered rules", () => {
    const { system } = buildTrainingPrompt({
      findingsText: "Hígado: lesión de 12 mm (8 mm en el previo).",
      conclusionText: "Aumento de la lesión hepática del segmento VII (8 → 12 mm).",
    });
    expect(system).toContain("ESTILO — EVOLUTIVA");
  });
});

describe("the language of the rulebook has to match the conclusion", () => {
  it.each([
    ["es", "Lesión hepática de 12 mm. No se identifica derrame pleural. Hallazgos estables."],
    ["pt", "Lesão hepática de 12 mm. Não há derrame pleural. Achados estáveis em relação ao prévio."],
    ["en", "Hepatic lesion of 12 mm with no evidence of pleural effusion. The findings are stable."],
  ])("reads a %s conclusion as %s", (lang, text) => {
    expect(inferLanguage(text)).toBe(lang);
  });

  it("falls back to Spanish rather than guessing wildly", () => {
    expect(inferLanguage("")).toBe("es");
    expect(inferLanguage("12 mm.")).toBe("es");
  });

  it("writes the rules in the language the conclusion is in", () => {
    const en = buildTrainingPrompt({
      findingsText: "Liver: 12 mm lesion.",
      conclusionText: "Hepatic lesion of 12 mm with no evidence of pleural effusion. The findings are stable.",
    });
    expect(en.system).toContain("OUTPUT LANGUAGE: English");
    const es = buildTrainingPrompt({
      findingsText: "Hígado: lesión de 12 mm.",
      conclusionText: "Lesión hepática de 12 mm. No se identifica derrame. Hallazgos estables.",
    });
    expect(es.system).toContain("IDIOMA DE SALIDA: español");
  });
});

describe("the generator uses it", () => {
  it("no longer carries its own system prompt", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const route = readFileSync(
      join(__dirname, "../../../src/app/api/admin/training-data/openai/route.ts"),
      "utf8",
    );
    expect(route).toContain("buildTrainingPrompt");
    // The 45-word instruction and the hand-rolled user message are both gone.
    expect(route).not.toContain("const SYSTEM_PROMPT");
    expect(route).not.toContain("`Study: ");
  });
});
