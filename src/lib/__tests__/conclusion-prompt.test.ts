import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
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

    it(`concise orders by what changes management, not by change (${lang})`, () => {
      const { system } = build(lang, "concise");
      expect(/POR LO QUE CAMBIA EL MANEJO|BY WHAT CHANGES MANAGEMENT/.test(system)).toBe(true);
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
      expect(/POR LO QUE CAMBIA EL MANEJO|BY WHAT CHANGES MANAGEMENT/.test(system)).toBe(true);
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

/**
 * The decisions behind the rewrite of rules 1, 3 and 4.
 *
 * The prompt had three grouping criteria competing at once — anatomy in rule
 * 4, clinical problem in its own worked example, change type in the evolutive
 * style — so the model picked a different one per report. That is what
 * produced the complaint these answer: things joined that do not belong
 * together, and things split that do.
 */
describe("grouping has one criterion, and it is the clinical problem", () => {
  for (const lang of LANGS) {
    for (const style of STYLES) {
      it(`groups by problem, never by adjacency (${lang}/${style})`, () => {
        const { system } = build(lang, style);
        expect(/POR PROBLEMA CLÍNICO|BY CLINICAL PROBLEM|PROBLEMA CLÍNICO/.test(system)).toBe(true);
      });
    }

    it(`never merges unrelated findings to hit the target (${lang})`, () => {
      // The decisive rule: the cap gives way, the grouping does not. Without
      // it, "few points" is an instruction to join whatever is left over.
      const { system } = build(lang, "concise");
      expect(/PUNTOS SEPARADOS|SEPARATE POINTS|PONTOS SEPARADOS/.test(system)).toBe(true);
      expect(/añada un punto|adds a point|acrescente um ponto/.test(system)).toBe(true);
    });

    it(`states the point count as a target, not a maximum (${lang})`, () => {
      // "MÁXIMO 4 PUNTOS" read as a hard law, which left the model choosing
      // between dropping a real problem and welding two into one point.
      const { system } = build(lang, "concise");
      expect(/OBJETIVO:|TARGET:/.test(system)).toBe(true);
      expect(system).not.toContain("MÁXIMO 4 PUNTOS");
      expect(system).not.toContain("MAXIMUM 4 POINTS");
    });
  }
});

describe("ordering follows what the clinician has to do", () => {
  for (const lang of LANGS) {
    it(`orders by what changes management, with or without a clinical question (${lang})`, () => {
      for (const clinical of ["Dolor en hipocondrio derecho.", ""]) {
        const { system } = build(lang, "concise", clinical);
        expect(/CAMBIA EL MANEJO|CHANGES MANAGEMENT|obliga a actuar|forces action/.test(system)).toBe(true);
      }
    });

    it(`rules out the orderings it is not (${lang})`, () => {
      const { system } = build(lang, "concise");
      expect(/no por gravedad abstracta|not by abstract severity/.test(system)).toBe(true);
      expect(/no por orden anatómico|not anatomically/.test(system)).toBe(true);
    });
  }
});

describe("brevity never wins against a data point", () => {
  for (const lang of LANGS) {
    it(`allows a second sentence rather than dropping a measurement (${lang})`, () => {
      const { system } = build(lang, "concise");
      // The style block used to demand ONE sentence while rule 8 demanded
      // every data point: for a complex finding both could not hold.
      expect(/usa dos|use two|use duas/.test(system)).toBe(true);
      expect(system).not.toContain("Cada punto es UNA SOLA FRASE");
      expect(system).not.toContain("Each point is ONE SINGLE brief");
    });
  }
});

describe("the filler ban no longer contradicts the example it ships with", () => {
  for (const style of STYLES) {
    it(`still bans opening fillers (es/${style})`, () => {
      const { system } = build("es", style);
      expect(system).toContain("Muletillas de apertura");
      expect(system).toContain('"se observa"');
    });

    it(`allows saying something is no longer seen (es/${style})`, () => {
      const { system } = build("es", style);
      expect(system).toContain("NO es muletilla");
      // The evolutive worked example says exactly this, and the blanket ban
      // made the rulebook forbid its own example.
      expect(system).toContain("ya no se identifica");
    });
  }
});

describe("carrying a dictated diagnosis is regional", () => {
  const withFlag = (allowInterpretation: boolean, lang: OutputLanguage = "es") =>
    buildConclusionPrompt({
      findingsText: "Consolidación en lóbulo inferior derecho compatible con neumonía.",
      clinicalInfo: "Fiebre.",
      outputLanguage: lang,
      conclusionStyle: "concise",
      allowInterpretation,
    }).system;

  it("defaults to the strict prompt when the caller does not say", () => {
    // A caller that does not know the region must not accidentally unlock it.
    const { system } = build("es", "concise");
    expect(system).toContain('- Inferencias: "compatible con"');
  });

  it("keeps pure description when it is withheld", () => {
    const system = withFlag(false);
    expect(system).toContain('- Inferencias: "compatible con"');
    expect(system).not.toContain("Inferencias TUYAS");
  });

  it("lets the radiologist's own inference through when it is granted", () => {
    const system = withFlag(true);
    expect(system).toContain("Inferencias TUYAS");
    expect(system).toContain("compatible con neumonía");
  });

  it("still forbids the inference nobody dictated, either way", () => {
    for (const allowed of [true, false]) {
      const system = withFlag(allowed);
      expect(/inventarla, no|inventing one, no|Inferencias:/.test(system)).toBe(true);
      // Prognosis and nature judgements are never on the table.
      expect(/maligno, benigno|malignant, benign/.test(system)).toBe(true);
      // Nor are recommendations or scales.
      expect(/Recomendaciones de cualquier tipo|Recommendations of any kind/.test(system)).toBe(true);
      expect(/BI-RADS/.test(system)).toBe(true);
    }
  });

  it("does not let the worked principle override the permission", () => {
    // "INCORRECTO: Neumonía del lóbulo inferior derecho" unqualified reads as
    // an absolute ban, which would cancel the rule two lines above it.
    expect(withFlag(true)).toContain('INCORRECTO (si el radiólogo no dictó "neumonía")');
    expect(withFlag(false)).toContain('INCORRECTO: "Neumonía del lóbulo inferior derecho."');
  });

  it("keeps prognosis wrong in both modes, dictated or not", () => {
    for (const allowed of [true, false]) {
      expect(withFlag(allowed)).toContain('INCORRECTO: "Progresión tumoral hepática."');
    }
  });

  it("asks the closing self-check about the right thing in each mode", () => {
    expect(withFlag(true)).toContain("que NO esté en los hallazgos dictados?");
    expect(withFlag(false)).not.toContain("que NO esté en los hallazgos dictados?");
  });

  it("reaches the English and Portuguese rulebooks too", () => {
    for (const lang of ["en", "pt"] as const) {
      expect(withFlag(true, lang)).toContain("Inferences OF YOUR OWN");
      expect(withFlag(false, lang)).toContain('- Inferences: "consistent with"');
    }
  });
});

describe("the route decides the mode from the region, not from the request", () => {
  const route = readFileSync(
    join(__dirname, "../../..", "src/app/api/generate/conclusion/route.ts"),
    "utf8",
  );

  it("reads it off the signed-in user's region", () => {
    // Never off the request body: a client that could ask for the permissive
    // prompt would be a way around the regional restriction.
    expect(route).toContain("allowInterpretation: regionFeatures(");
    expect(route).toContain("getUserRegion(user.id");
    expect(route).toContain("interpretiveConclusion");
  });

  it("does not take it from the body", () => {
    expect(route).not.toMatch(/const \{[^}]*allowInterpretation/);
  });
});
