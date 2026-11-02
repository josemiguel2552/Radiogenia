import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * The marrow Dixon check: a calculator, a cheat sheet and a checklist entry.
 *
 * The number it produces is one subtraction, so what is worth pinning is not
 * the arithmetic but everything around it: the bands it sorts the result
 * into, the caveat that travels with the number into the clipboard, and the
 * wiring — a calculator can be written, registered in four of the five places
 * it has to appear, and simply never show up, with nothing failing.
 */

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const TAB = read("src/components/sidebar/calculators-tab.tsx");
const DICT = read("src/lib/i18n-calc.ts");
const KB = read("src/lib/clinical-checklist-kb.ts");

/** The calculator body, so a match cannot come from elsewhere in the file. */
const CALC = TAB.slice(
  TAB.indexOf("function MarrowDixonCalc()"),
  TAB.indexOf("function CadRadsCalc"),
);

describe("the signal-drop calculator", () => {
  it("is a self-contained block of the file", () => {
    expect(CALC.length).toBeGreaterThan(500);
  });

  it("computes the drop as a percentage of the in-phase signal", () => {
    // [(IP − OP) / IP] × 100. Dividing by OP, or by their sum, gives a
    // plausible-looking number that crosses the thresholds in the wrong place.
    expect(CALC).toContain("((a - b) / a) * 100");
  });

  it("sorts the result into the three published bands", () => {
    // ≥ 20% supports preserved microscopic fat; 25–30% is where the more
    // conservative studies put it; minimal or none is the concerning end.
    expect(CALC).toMatch(/drop >= 30/);
    expect(CALC).toMatch(/drop >= 20/);
    const green = CALC.indexOf("drop >= 30");
    const blue = CALC.indexOf("drop >= 20");
    // The wider band must be tested after the narrower one, or everything
    // above 20 collapses into it and the top band is unreachable.
    expect(green).toBeLessThan(blue);
  });

  it("treats a non-existent drop as concerning, not as a tiny drop", () => {
    // OP ≥ IP is not a 0% drop with a rounding error: it is the no-fat case,
    // and a negative percentage shown in a green box would read as reassuring.
    expect(CALC).toMatch(/drop <= 0/);
    const nodrop = CALC.slice(CALC.indexOf("drop <= 0"));
    expect(nodrop.slice(0, 200)).toContain('color: "red"');
  });

  it("carries the caveat into the copied text", () => {
    // The number alone, pasted into a report, is a measurement pretending to
    // be an answer. T1, distribution and history are what make it one.
    const copy = CALC.slice(CALC.indexOf("const copyText"), CALC.indexOf("return ("));
    expect(copy).toContain("calc.dixon_caveat");
  });
});

describe("the sheet and the calculator are actually reachable", () => {
  it("registers the calculator everywhere it has to appear", () => {
    expect(TAB).toContain('| "marrow_dixon" |');            // the CalcId union
    expect(TAB).toContain('{ id: "marrow_dixon", emoji:');   // the listing
    expect(TAB).toContain('marrow_dixon: t("calc.dixon_title")'); // its label
    expect(TAB).toContain('c.id === "marrow_dixon" && <MarrowDixonCalc />'); // the body
  });

  it("files the cheat sheet under MSK", () => {
    const msk = TAB.slice(TAB.indexOf('key: "msk"'), TAB.indexOf('key: "vascular"'));
    expect(msk).toContain("<MarrowDixonSheet />");
  });
});

describe("the strings exist in all three languages", () => {
  it("has every key the two components ask for", () => {
    const used = new Set(
      [...TAB.matchAll(/t\("(calc\.(?:dixon|marrow)_[a-z0-9_]+)"\)/g)].map((m) => m[1]),
    );
    expect(used.size).toBeGreaterThan(30);

    const blocks = {
      es: DICT.slice(DICT.indexOf("  es: {"), DICT.indexOf("  en: {")),
      en: DICT.slice(DICT.indexOf("  en: {"), DICT.indexOf("  pt: {")),
      pt: DICT.slice(DICT.indexOf("  pt: {")),
    };
    for (const [lang, block] of Object.entries(blocks)) {
      const missing = [...used].filter((k) => !block.includes(`"${k}":`));
      expect(`${lang}: ${missing.join(", ")}`).toBe(`${lang}: `);
    }
  });

  it("does not ship the Spanish text as the English or Portuguese one", () => {
    // Inserting into the wrong language block is the failure mode of a
    // three-language dictionary edited by script, and it is invisible on
    // screen until someone switches language.
    const en = DICT.slice(DICT.indexOf("  en: {"), DICT.indexOf("  pt: {"));
    expect(en).toContain('"calc.dixon_title": "Marrow Dixon (signal drop)"');
    const pt = DICT.slice(DICT.indexOf("  pt: {"));
    expect(pt).toContain('"calc.dixon_title": "Dixon medular (queda de sinal)"');
  });
});

describe("the checklist knows what to review on abnormal marrow", () => {
  it("adds the condition under MSK", () => {
    const msk = KB.slice(KB.indexOf('id: "msk"'), KB.indexOf('id: "head-neck"'));
    expect(msk).toContain('id: "marrow-signal-abnormality"');
  });

  it("names the two readings that separate reconversion from replacement", () => {
    const entry = KB.slice(
      KB.indexOf('id: "marrow-signal-abnormality"'),
      KB.indexOf('id: "bone-metastases"'),
    );
    // The T1 muscle comparison and the opposed-phase drop. Either alone is
    // suggestive; it is the pair, with the distribution, that decides.
    expect(entry).toContain("músculo esquelético en T1");
    expect(entry).toContain("fase opuesta");
    expect(entry).toMatch(/simétrica/);
  });
});
