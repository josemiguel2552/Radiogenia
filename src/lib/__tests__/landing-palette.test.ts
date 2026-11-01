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
    for (const token of ["--color-brand:", "--color-brand-bright:", "--color-brand-cyan:",
                         "--color-brand-indigo:", "--color-brand-deep:", "--color-brand-dark:"]) {
      expect(css).toContain(token);
    }
  });

  it("has enough tones for a gradient to go somewhere", () => {
    // The first attempt mapped everything onto two navy tones, so eight cards
    // that each had their own gradient became one flat fill. Depth comes from
    // hue movement; without the tones to move between there is none.
    const hues = [...css.matchAll(/--color-brand[\w-]*: hsl\((\d+)/g)].map((m) => Number(m[1]));
    expect(hues.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...hues) - Math.min(...hues)).toBeGreaterThan(30);
  });

  it("hardcodes no palette colour in the landing", () => {
    // The whole point: a stray from-purple-600 would survive a palette change
    // and nobody would notice until it looked wrong next to everything else.
    const strays = landing.match(/\b(from|via|to|bg|text|border|shadow|ring)-(blue|purple|violet|fuchsia|pink|indigo)-\d+/g);
    expect(strays).toBeNull();
  });

  it("keeps the app's primary in step with the brand token", () => {
    // The chrome and the landing are the same product.
    const brand = css.match(/--color-brand: hsl\(([\d\s%.]+)\)/)?.[1].trim();
    expect(brand).toBeTruthy();
    expect(css).toContain(`--primary: ${brand}`);
  });
});

describe("the gradients survived the palette change", () => {
  it("keeps a gradient on every feature card", () => {
    // Six of eight were flattened to the same navy by a mapping that sent
    // different hues to one token. A card with no gradient is the difference
    // between the page looking designed and looking unfinished.
    const block = landing.slice(landing.indexOf("const FEATURE_KEYS"), landing.indexOf("const SECURITY_ITEMS"));
    const cards = [...block.matchAll(/color: "([^"]+)"/g)].map((m) => m[1]);
    expect(cards.length).toBeGreaterThanOrEqual(8);
    for (const c of cards) expect(c).toMatch(/^from-brand[\w-]* to-brand[\w-]*$/);
    // And they are not all the same gradient.
    expect(new Set(cards).size).toBeGreaterThanOrEqual(5);
  });

  it("flattens a gradient only when it was already one colour", () => {
    // The colour name has to be captured whole: \S* would let the group match
    // just "brand" and swallow "-cyan/20", so from-brand-cyan to-brand-deep
    // read as a same-colour pair.
    const flat = landing.match(/bg-gradient-to-\w+ from-(brand(?:-[a-z]+)*)(?:\/[\d.]+)? to-\1(?![\w-])/g);
    expect(flat).toBeNull();
  });

  it("dropped the warm accent that did not belong", () => {
    expect(landing).not.toContain("warm");
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
    // Slower than the original, but not so slow it reads as no motion at
    // all: the first pass quartered it and the effects seemed to be gone.
    const durations = [...css.matchAll(/animation: float-\w+ (\d+)s/g)].map((m) => Number(m[1]));
    expect(durations).toHaveLength(3);
    for (const d of durations) {
      expect(d).toBeGreaterThan(12);
      expect(d).toBeLessThanOrEqual(26);
    }
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
