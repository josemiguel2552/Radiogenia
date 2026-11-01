import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * The landing's colour lives in one place now.
 *
 * It used to hardcode about a hundred and ninety colour stops — blue-500 to
 * purple-600 to violet to fuchsia — so changing the palette meant editing
 * every one and hoping none were missed. They are Tailwind tokens now, which
 * is the only reason the next change is a few lines of CSS.
 */

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const landing = read("src/components/landing/landing-page.tsx");
const css = read("src/app/globals.css");
const i18n = read("src/lib/public-i18n.ts");

describe("the palette is defined once", () => {
  it("declares the brand colours as tokens", () => {
    for (const token of ["--color-brand:", "--color-brand-deep:", "--color-brand-dark:", "--color-warm:"]) {
      expect(css).toContain(token);
    }
  });

  it("hardcodes no palette colour in the landing", () => {
    // The whole point: a stray from-purple-600 would survive a palette change
    // and nobody would notice until it looked wrong next to everything else.
    const strays = landing.match(/\b(from|via|to|bg|text|border|shadow|ring)-(blue|purple|violet|fuchsia|pink|indigo)-\d+/g);
    expect(strays).toBeNull();
  });

  it("keeps the app's primary in step with the brand token", () => {
    // The chrome and the landing are the same product.
    expect(css).toContain("--primary: 214 95% 56%");
    expect(css).toContain("--color-brand: hsl(214 95% 56%)");
  });
});

describe("the warm accent means action", () => {
  it("is used, and only on the calls to action", () => {
    // \b would also match inside bg-warm-deep, since a hyphen is not a word
    // character: the hover colour is not a fourth call to action.
    const warm = landing.match(/bg-warm(?![-\w])/g) || [];
    expect(warm.length).toBe(3);
    // Each one sits on a button, not on decoration.
    for (const m of landing.matchAll(/className="[^"]*bg-warm(?![-\w])[^"]*"/g)) {
      expect(m[0]).toMatch(/rounded-full/);
    }
  });
});

describe("the background motion stays, quieter", () => {
  it("still floats", () => {
    for (const a of ["animate-float-slow", "animate-float-slower", "animate-float-medium"]) {
      expect(landing).toContain(a);
    }
  });

  it("drifts further apart in time than it used to", () => {
    // They were competing with the text; this is movement you notice only if
    // you look for it.
    const durations = [...css.matchAll(/animation: float-\w+ (\d+)s/g)].map((m) => Number(m[1]));
    expect(durations).toHaveLength(3);
    for (const d of durations) expect(d).toBeGreaterThanOrEqual(24);
  });
});

describe("what the landing now shows", () => {
  it("offers the control over the conclusion, in every region", () => {
    // The radiologist choosing what reaches the conclusion is not clinical
    // decision support, so it is not behind the interpretive gate.
    expect(landing).toContain('key: "editai"');
    const gate = landing.slice(landing.indexOf("INTERPRETIVE_FEATURES = new Set"));
    expect(gate.slice(0, 120)).not.toContain("editai");
    for (const lang of ["Tú decides qué entra", "You decide what goes in", "Você decide o que entra"]) {
      expect(i18n).toContain(lang);
    }
  });

  it("points departments at the page that was already there", () => {
    expect(landing).toContain('href="/hospitals"');
    expect(landing).toContain('t("hosp.title")');
    expect(landing).toContain("hosp.feat_");
  });

  it("does not keep a second copy of the hospitals text", () => {
    // Two versions of the same sentence drift apart; one of them then becomes
    // wrong without anyone editing it.
    for (const key of ['"hosp.title"', '"hosp.subtitle"', '"hosp.cta"']) {
      expect(i18n.split(key).length - 1).toBe(3); // one per language, no more
    }
  });

  it("still says nothing about the admin-only differential tool", () => {
    expect(landing.toLowerCase()).not.toContain("diferencial");
    expect(landing.toLowerCase()).not.toContain("differential");
  });
});
