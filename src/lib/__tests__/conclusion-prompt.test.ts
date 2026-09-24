import { describe, it, expect } from "vitest";
import { buildConclusionPrompt } from "@/lib/prompts";
import { detectDiagnoses } from "@/lib/diagnosis-detect";
import type { ConclusionStyle, OutputLanguage } from "@/lib/types";

const LANGS: OutputLanguage[] = ["es", "en", "pt"];
const STYLES: ConclusionStyle[] = ["evolutive", "concise"];

const FINDINGS = `Hígado: lesión focal hipodensa de 12 mm en segmento VII (8 mm en el estudio previo).
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
    it(`evolutive orders by change, not by relevance (${lang})`, () => {
      const { system } = build(lang, "evolutive");
      expect(/POR CAMBIO, NO POR RELEVANCIA|BY CHANGE, NOT BY RELEVANCE|PELA MUDANÇA/.test(system)).toBe(true);
      // The five groups, in the order the points have to run in.
      const groups = lang === "es"
        ? ["NUEVO", "AUMENTADO", "DISMINUIDO", "SIN CAMBIOS", "RESUELTO"]
        : lang === "pt"
        ? ["NOVO", "AUMENTOU", "DIMINUIU", "SEM ALTERAÇÕES", "RESOLVEU"]
        : ["NEW", "INCREASED", "DECREASED", "UNCHANGED", "RESOLVED"];
      let at = -1;
      for (const g of groups) {
        const next = system.indexOf(g, at + 1);
        expect(next).toBeGreaterThan(at);
        at = next;
      }
    });

    it(`evolutive states the change in the sentence, not as a label (${lang})`, () => {
      // The radiologist rejected "Aumentado: lesión…" — a conclusion reads as
      // prose, and the ordering already carries the change.
      const { system } = build(lang, "evolutive");
      expect(/NUNCA como etiqueta fija|NEVER as a fixed label|NUNCA como etiqueta fixa/.test(system)).toBe(true);
      // And the worked example must not be teaching the format it forbids.
      const good = system.slice(system.indexOf("✓"), system.indexOf("✗"));
      for (const label of ["Aumentado:", "Increased:", "Sem alterações:", "Nuevo:", "New:", "Resuelto:", "Resolved:"]) {
        expect(good).not.toContain(label);
      }
    });

    it(`concise keeps ordering by clinical relevance (${lang})`, () => {
      const { system } = build(lang, "concise");
      expect(/JERARQUÍA CLÍNICA|CLINICAL HIERARCHY/.test(system)).toBe(true);
      expect(/POR CAMBIO, NO POR RELEVANCIA|BY CHANGE, NOT BY RELEVANCE/.test(system)).toBe(false);
    });

    it(`both ask for numbered points (${lang})`, () => {
      for (const style of STYLES) {
        expect(/Puntos numerados|Numbered points/.test(build(lang, style).system)).toBe(true);
      }
    });
  }
});

describe("the evolutive style guards the line between measuring and interpreting", () => {
  // This style sits right on top of the forbidden words: an increase is not
  // "progression", a decrease is not "response". The mapping is spelled out
  // rather than left to the general prohibition list.
  for (const lang of LANGS) {
    it(`forbids progression, response and stable disease by name (${lang})`, () => {
      const { system } = build(lang, "evolutive");
      const banned = lang === "es"
        ? ["progresión", "respuesta parcial", "enfermedad estable"]
        : lang === "pt"
        ? ["progressão", "resposta parcial", "doença estável"]
        : ["progression", "partial response", "stable disease"];
      for (const term of banned) expect(system.toLowerCase()).toContain(term.toLowerCase());
      expect(/MEDIR NO ES INTERPRETAR|MEASURING IS NOT INTERPRETING|MEDIR NÃO É INTERPRETAR/.test(system)).toBe(true);
    });
  }
});

describe("the evolutive style needs something to compare against", () => {
  const FIRST_STUDY = "Hígado: lesión focal hipodensa de 12 mm en segmento VII.\nVesícula: litiasis de 8 mm.";

  for (const lang of LANGS) {
    it(`falls back to concise on a first study (${lang})`, () => {
      // Asking for changes when there is no prior produces invented
      // comparisons or empty labels, so the style quietly steps aside.
      const { system } = buildConclusionPrompt({
        findingsText: FIRST_STUDY,
        clinicalInfo: "Dolor abdominal.",
        outputLanguage: lang,
        conclusionStyle: "evolutive",
      });
      expect(/POR CAMBIO, NO POR RELEVANCIA|BY CHANGE, NOT BY RELEVANCE/.test(system)).toBe(false);
      expect(/JERARQUÍA CLÍNICA|CLINICAL HIERARCHY/.test(system)).toBe(true);
    });

    it(`uses it once the findings reference a prior (${lang})`, () => {
      const { system } = buildConclusionPrompt({
        findingsText: FIRST_STUDY + "\nLa lesión ha aumentado respecto al estudio previo.",
        clinicalInfo: "Control.",
        outputLanguage: lang,
        conclusionStyle: "evolutive",
      });
      expect(/POR CAMBIO, NO POR RELEVANCIA|BY CHANGE, NOT BY RELEVANCE/.test(system)).toBe(true);
    });
  }

  it("uses it when a prior report is handed in, whatever the findings say", () => {
    const { system } = buildConclusionPrompt({
      findingsText: FIRST_STUDY,
      clinicalInfo: "Control oncológico.",
      outputLanguage: "es",
      conclusionStyle: "evolutive",
      recistConfig: { isBaseline: false, priorReport: "TC previa: lesión de 8 mm." },
    });
    expect(system).toContain("POR CAMBIO, NO POR RELEVANCIA");
  });
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
      const { system } = build(lang, "evolutive");
      expect(/PREGUNTA CLÍNICA|CLINICAL QUESTION/.test(system)).toBe(true);
    });

    it(`switches to deducing the main finding when none is given (${lang})`, () => {
      const { system } = build(lang, "evolutive", "");
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
      const kinds = new Set(detectDiagnoses(answer, FINDINGS).map((h) => h.type));
      // Each style's bad example teaches the failures that style invites:
      // the concise one ends in a recommendation, the evolutive one reads the
      // disease off the measurement. Both are inferences.
      expect(kinds.has("interpretation")).toBe(true);
      expect(kinds.has(style === "concise" ? "recommendation" : "diagnosis")).toBe(true);
    }
  });
});
