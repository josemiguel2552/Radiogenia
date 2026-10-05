import { describe, it, expect } from "vitest";
import { extractDictatedRecommendations, isRecommendationSentence } from "@/lib/dictated-recommendations";
import { buildConclusionPrompt } from "@/lib/prompts";
import type { OutputLanguage } from "@/lib/types";

const LANGS: OutputLanguage[] = ["es", "en", "pt"];

describe("what counts as a recommendation the radiologist dictated", () => {
  it.each([
    ["es", "Se recomienda control en 6 meses."],
    ["es", "Sugiero completar con RM hepática."],
    ["es", "Correlacionar clínicamente con marcadores tumorales."],
    ["es", "Repetir el estudio en un año."],
    ["en", "Follow-up in 6 months is recommended."],
    ["en", "Suggest correlation with clinical findings."],
    ["pt", "Recomenda-se controle em 6 meses."],
    ["pt", "Sugere-se completar com RM."],
  ])("%s: %s", (_lang, sentence) => {
    expect(isRecommendationSentence(sentence)).toBe(true);
  });

  it.each([
    "Lesión focal hipodensa de 12 mm en segmento VII.",
    "Hígado de tamaño y morfología normales.",
    "Sin dilatación de la vía biliar.",
    "Adenopatía interaortocava de 15 mm.",
    "Hepatic lesion measuring 12 mm in segment VII.",
  ])("a plain finding is not one: %s", (sentence) => {
    expect(isRecommendationSentence(sentence)).toBe(false);
  });
});

describe("pulling them out of a dictation", () => {
  const dictation = `Hígado con lesión focal hipodensa de 12 mm en segmento VII.
Vesícula con litiasis de 8 mm. Se recomienda control ecográfico en 6 meses.
Riñones sin alteraciones. Sugiero completar con RM si persiste la clínica.`;

  it("returns the recommendations, in order", () => {
    const recs = extractDictatedRecommendations(dictation);
    expect(recs).toHaveLength(2);
    expect(recs[0]).toContain("control ecográfico en 6 meses");
    expect(recs[1]).toContain("completar con RM");
  });

  it("returns them word for word", () => {
    // These go into the conclusion as the radiologist said them. Tidying here
    // would be the platform putting words in their mouth about management.
    const recs = extractDictatedRecommendations("Se recomienda control en 6 meses.");
    expect(recs[0]).toBe("Se recomienda control en 6 meses.");
  });

  it("leaves the findings behind", () => {
    const recs = extractDictatedRecommendations(dictation).join(" ");
    expect(recs).not.toContain("lesión focal hipodensa");
    expect(recs).not.toContain("Riñones sin alteraciones");
  });

  it("does not split a decimal into two sentences", () => {
    const recs = extractDictatedRecommendations("Se recomienda control de la lesión de 3.5 cm en 6 meses.");
    expect(recs).toHaveLength(1);
    expect(recs[0]).toContain("3.5 cm");
  });

  it("finds nothing where there is nothing", () => {
    for (const d of ["", "   ", "Hígado normal. Bazo normal. Riñones normales."]) {
      expect(extractDictatedRecommendations(d)).toEqual([]);
    }
  });

  it("caps how many it will carry", () => {
    const many = Array.from({ length: 12 }, (_, i) => `Se recomienda control número ${i} en seis meses.`).join(" ");
    expect(extractDictatedRecommendations(many).length).toBeLessThanOrEqual(6);
  });
});

describe("the conclusion reproduces them and never writes its own", () => {
  const base = {
    findingsText: "Hígado: lesión focal de 12 mm en segmento VII.",
    clinicalInfo: "Dolor abdominal.",
    conclusionStyle: "concise" as const,
  };

  for (const lang of LANGS) {
    it(`carries the dictated recommendation verbatim (${lang})`, () => {
      const { user } = buildConclusionPrompt({
        ...base,
        outputLanguage: lang,
        dictatedRecommendations: ["Se recomienda control ecográfico en 6 meses."],
      });
      expect(user).toContain("Se recomienda control ecográfico en 6 meses.");
      expect(/REPRODÚCELAS, NO LAS ESCRIBAS TÚ|REPRODUCE THEM, DO NOT WRITE THEM|REPRODUZA-AS, NÃO AS ESCREVA/.test(user)).toBe(true);
    });

    it(`tells it to copy, not rephrase (${lang})`, () => {
      const { user } = buildConclusionPrompt({
        ...base,
        outputLanguage: lang,
        dictatedRecommendations: ["Repetir en un año."],
      });
      expect(/CÓPIALAS LITERALMENTE|COPY THEM VERBATIM|COPIE-AS LITERALMENTE/.test(user)).toBe(true);
    });

    it(`keeps the ban on recommendations when none were dictated (${lang})`, () => {
      // The exception must not leak into the ordinary case: with nothing
      // dictated, the conclusion may not recommend anything at all.
      const { system, user } = buildConclusionPrompt({ ...base, outputLanguage: lang });
      expect(/REPRODÚCELAS|REPRODUCE THEM|REPRODUZA-AS/.test(user)).toBe(false);
      expect(/Recomendaciones de cualquier tipo|Recommendations of any kind|Recomendações de qualquer tipo/.test(system)).toBe(true);
    });
  }

  it("ignores blank entries rather than emitting an empty bullet", () => {
    const { user } = buildConclusionPrompt({
      ...base,
      outputLanguage: "es",
      dictatedRecommendations: ["   ", ""],
    });
    expect(user).not.toContain("REPRODÚCELAS");
  });
});

describe("the findings are told recommendations are not findings", () => {
  it("says so in all three languages", async () => {
    const { buildFindingsPrompt } = await import("@/lib/prompts");
    for (const [lang, marker] of [
      ["es", "RECOMENDACIONES DICTADAS — NO SON HALLAZGOS"],
      ["en", "DICTATED RECOMMENDATIONS — NOT FINDINGS"],
      ["pt", "RECOMENDAÇÕES DITADAS — NÃO SÃO ACHADOS"],
    ] as const) {
      const { system } = buildFindingsPrompt({
        template: "****FINDINGS****\n**Hígado**: {hígado}\n****CONCLUSION****\n{conclusion}",
        dictation: "x",
        modality: "CT",
        findingsLength: "standard",
        normalFieldsVerbosity: "standard",
        paraphraseLevel: "light",
        outputLanguage: lang,
      });
      expect(system).toContain(marker);
    }
  });
});

describe("a dictated paragraph keeps its own shape", () => {
  it("tells the findings prompt the line rule is not a licence to rewrite prose", async () => {
    const { buildFindingsPrompt } = await import("@/lib/prompts");
    for (const [lang, marker] of [
      ["es", "ESTA REGLA ES SOBRE LÍNEAS, NO SOBRE FRASES"],
      ["en", "THIS RULE IS ABOUT LINES, NOT SENTENCES"],
      ["pt", "ESTA REGRA É SOBRE LINHAS, NÃO SOBRE FRASES"],
    ] as const) {
      const { system } = buildFindingsPrompt({
        template: "****FINDINGS****\n**Hígado**: {hígado}\n****CONCLUSION****\n{conclusion}",
        dictation: "x",
        modality: "CT",
        findingsLength: "standard",
        normalFieldsVerbosity: "standard",
        paraphraseLevel: "light",
        outputLanguage: lang,
      });
      expect(system).toContain(marker);
    }
  });
});
