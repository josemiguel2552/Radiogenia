import { describe, it, expect } from "vitest";
import { buildConclusionPrompt } from "@/lib/prompts";
import { detectDiagnoses } from "@/lib/diagnosis-detect";
import type { ConclusionStyle, OutputLanguage } from "@/lib/types";

const LANGS: OutputLanguage[] = ["es", "en", "pt"];
const STYLES: ConclusionStyle[] = ["brief", "concise"];

const FINDINGS = `Hígado: lesión focal hipodensa de 12 mm en segmento VII.
Vesícula: litiasis de 8 mm.
Riñones: quiste simple de 15 mm.`;

const build = (lang: OutputLanguage, style: ConclusionStyle, clinicalInfo = "Dolor en hipocondrio derecho.") =>
  buildConclusionPrompt({ findingsText: FINDINGS, clinicalInfo, outputLanguage: lang, conclusionStyle: style });

/** The example is the strongest signal in the prompt. In the wrong language it
 *  drags the answer into that language, which is why each one is checked. */
const EXAMPLE_MARKER: Record<OutputLanguage, string> = {
  es: "EJEMPLO — así se hace",
  en: "EXAMPLE — this is how it is done",
  pt: "EXEMPLO — é assim que se faz",
};

describe("the worked example", () => {
  for (const lang of LANGS) {
    for (const style of STYLES) {
      it(`is present and written in ${lang} for the ${style} style`, () => {
        const { system } = build(lang, style);
        expect(system).toContain(EXAMPLE_MARKER[lang]);
        for (const other of LANGS.filter((l) => l !== lang)) {
          expect(system).not.toContain(EXAMPLE_MARKER[other]);
        }
      });

      it(`shows the good answer before the bad one (${lang}/${style})`, () => {
        // The bad example deliberately contains forbidden phrasing. Leading
        // with the good one is what keeps it a lesson and not a pattern to
        // copy, so the order is pinned rather than left to chance.
        const { system } = build(lang, style);
        const good = system.indexOf("✓");
        const bad = system.indexOf("✗");
        expect(good).toBeGreaterThan(-1);
        expect(bad).toBeGreaterThan(-1);
        expect(good).toBeLessThan(bad);
      });

      it(`labels the bad example rather than leaving it bare (${lang}/${style})`, () => {
        const { system } = build(lang, style);
        const bad = system.slice(system.indexOf("✗"));
        // Whatever language it is in, the failures are named right after it.
        expect(bad.length).toBeGreaterThan(200);
        expect(/fallos|falhas|failures/.test(bad)).toBe(true);
      });
    }
  }
});

describe("the guardrails survive every style and language", () => {
  for (const lang of LANGS) {
    for (const style of STYLES) {
      it(`still forbids recommendations, inferences and diagnoses (${lang}/${style})`, () => {
        const { system } = build(lang, style);
        const forbids = lang === "es"
          ? ["PROHIBIDO", "Recomendaciones", "Inferencias", "DESCRIBIR, NO DIAGNOSTICAR"]
          : ["FORBIDDEN", "Recommendations", "Inferences", "DESCRIBE, DO NOT DIAGNOSE"];
        for (const phrase of forbids) expect(system).toContain(phrase);
      });

      it(`still runs the closing self-check (${lang}/${style})`, () => {
        expect(build(lang, style).system).toContain("⚠️");
      });
    }
  }
});

describe("the two styles ask for different shapes", () => {
  for (const lang of LANGS) {
    it(`brief asks for one unnumbered paragraph (${lang})`, () => {
      const { system } = build(lang, "brief");
      expect(/UN SOLO PÁRRAFO|ONE SINGLE PARAGRAPH|UM ÚNICO PARÁGRAFO/.test(system)).toBe(true);
      // A word budget, so "as short as possible" has a floor as well as a ceiling.
      expect(/30/.test(system) && /60/.test(system)).toBe(true);
      expect(system).not.toContain("Puntos numerados");
      expect(system).not.toContain("Numbered points");
    });

    it(`concise asks for numbered points with a cap (${lang})`, () => {
      const { system } = build(lang, "concise");
      expect(/MÁXIMO \d+ PUNTOS|MAXIMUM \d+ POINTS/.test(system)).toBe(true);
    });
  }
});

describe("triage and completeness no longer contradict each other", () => {
  for (const lang of LANGS) {
    for (const style of STYLES) {
      it(`cuts whole findings, never the data of the ones kept (${lang}/${style})`, () => {
        const { system } = build(lang, style);
        // The old rule 8 read as "every data point must reach the conclusion",
        // which fought the triage in rule 2 and bloated the paragraph.
        expect(/NO PIERDAS DATOS AL SINTETIZAR|DO NOT LOSE DATA WHEN SYNTHESIZING/.test(system)).toBe(true);
        expect(system).not.toContain("debe llegar a la conclusión.");
        expect(system).not.toContain("must reach the conclusion.");
      });
    }
  }
});

describe("the clinical question drives the opening", () => {
  for (const lang of LANGS) {
    it(`asks for it to be answered first when one is given (${lang})`, () => {
      const { system } = build(lang, "brief");
      expect(/PREGUNTA CLÍNICA|CLINICAL QUESTION/.test(system)).toBe(true);
    });

    it(`switches to deducing the main finding when none is given (${lang})`, () => {
      const { system } = build(lang, "brief", "");
      expect(/SIN CONTEXTO CLÍNICO|NO CLINICAL CONTEXT/.test(system)).toBe(true);
    });
  }
});

/** Pulls the model answer out of a "✓ …: \"answer\"" line in the prompt. */
function exampleAnswer(system: string, mark: "✓" | "✗"): string {
  const line = system.slice(system.indexOf(mark));
  const quoted = line.match(/"([\s\S]*?)"\n/);
  return quoted ? quoted[1] : "";
}

describe("the example we teach agrees with the detector we ship", () => {
  // Teaching the model an answer that our own diagnosis detector would flag
  // would be telling it one thing and marking it wrong for doing it.
  it("the good Spanish answer passes the detector clean, in both styles", () => {
    for (const style of STYLES) {
      const answer = exampleAnswer(build("es", style).system, "✓");
      expect(answer.length).toBeGreaterThan(40);
      expect(detectDiagnoses(answer, FINDINGS)).toHaveLength(0);
    }
  });

  it("the bad Spanish answer trips it, so the lesson is a real one", () => {
    for (const style of STYLES) {
      const answer = exampleAnswer(build("es", style).system, "✗");
      const hits = detectDiagnoses(answer, FINDINGS);
      expect(hits.length).toBeGreaterThan(0);
      const kinds = new Set(hits.map((h) => h.type));
      expect(kinds.has("recommendation")).toBe(true);
      expect(kinds.has("interpretation")).toBe(true);
    }
  });
});
