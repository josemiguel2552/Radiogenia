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
    // Two stops or three: the middle one is what lets a gradient pass through
    // violet on its way from blue to cyan.
    for (const c of cards) expect(c).toMatch(/^from-brand[\w-]*( via-brand[\w-]*)? to-brand[\w-]*$/);
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

/**
 * Colour that moves.
 *
 * The page was elegant but static. These are the two effects that give it a
 * pulse, and the discipline is in the numbers: a wide hue arc or a short
 * duration turns this from a product into a screensaver, and there is no way
 * to tell from a class name which side of that line a value is on.
 */
describe("the colour breathes without shouting", () => {
  it("drifts through a narrow arc of hue", () => {
    const rotations = [...css.matchAll(/hue-rotate\((-?\d+)deg\)/g)]
      .map((m) => Math.abs(Number(m[1])))
      .filter((n) => n > 0);
    expect(rotations.length).toBeGreaterThan(0);
    // Raised to 22° deliberately. Past about 30 the blues become greens on
    // one side and magentas on the other, and the palette stops being one.
    for (const r of rotations) expect(r).toBeLessThanOrEqual(26);
  });

  it("takes its time over every loop", () => {
    for (const name of ["hue-drift", "hue-drift-back"]) {
      const d = Number(css.match(new RegExp(`animation: ${name} (\\d+)s`))?.[1]);
      // Shortened to 35s on request. Below about twenty the drift becomes
      // something you watch rather than something you feel.
      expect(d).toBeGreaterThanOrEqual(20);
    }
    const travel = Number(css.match(/animation: gradient-travel (\d+)s/)?.[1]);
    expect(travel).toBeGreaterThanOrEqual(12);
  });

  it("moves the gradient rather than sliding an edge across", () => {
    // Without a background larger than the element there is nothing to move
    // into view, and the animation becomes a wipe.
    const live = css.slice(css.indexOf(".gradient-live {"));
    expect(live).toMatch(/background-size: \d{3}%/);
  });

  it("animates opacity for the glow, not a transform", () => {
    // A breathing glow should cost nothing to composite.
    const glow = css.slice(css.indexOf("@keyframes glow-breathe"), css.indexOf("@keyframes scroll-dot"));
    expect(glow).toContain("opacity");
    expect(glow).not.toContain("transform");
  });

  it("is on the buttons and the background washes", () => {
    expect(landing).toContain("gradient-live");
    expect(landing).toContain("animate-hue-drift");
    // The three calls to action all carry it, not just the hero's.
    const buttons = landing.match(/gradient-live(?![-\w])/g) || [];
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("keeps the washes out of the way of the pointer", () => {
    for (const m of landing.matchAll(/className="[^"]*blur-\[1\d0px\][^"]*"/g)) {
      const cls = m[0];
      if (cls.includes("absolute")) {
        expect(cls.includes("pointer-events-none") || cls.includes("inset-0")).toBe(true);
      }
    }
  });
});

describe("the purple is back, on the blue side of it", () => {
  it("has a violet token", () => {
    expect(css).toContain("--color-brand-violet:");
  });

  it("stops short of magenta, which is what dated the old palette", () => {
    // The original ran blue to purple to fuchsia. Hue 300 and beyond is where
    // that happened; this family stays below it.
    const hues = [...css.matchAll(/--color-brand[\w-]*: hsl\((\d+)/g)].map((m) => Number(m[1]));
    for (const h of hues) expect(h).toBeLessThan(290);
  });

  it("is actually used, not just declared", () => {
    const uses = landing.match(/brand-violet/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(8);
  });
});

describe("the buttons have edges", () => {
  it("carries the crafted treatment on every call to action", () => {
    // The three on the page plus the three pricing buttons.
    const crafted = landing.match(/btn-crafted/g) || [];
    expect(crafted.length).toBe(6);
  });

  it("lights the top edge and darkens the bottom, as a surface would", () => {
    const block = css.slice(css.indexOf(".btn-crafted {"), css.indexOf(".gradient-live {"));
    expect(block).toMatch(/inset 0 1px 0 0 rgb\(255 255 255/);
    expect(block).toMatch(/inset 0 -1px 0 0 rgb\(0 0 0/);
  });

  it("draws the ring outside the fill rather than over it", () => {
    // A border would eat into the gradient; a masked pseudo-element sits in
    // the padding box and leaves the fill alone.
    const block = css.slice(css.indexOf(".btn-crafted::after"));
    expect(block.slice(0, 600)).toContain("mask-composite: exclude");
    expect(block.slice(0, 600)).toContain("pointer-events: none");
  });

  it("takes its glow from the palette, not from a fixed colour", () => {
    const block = css.slice(css.indexOf(".btn-crafted {"), css.indexOf(".gradient-live {"));
    expect(block).toContain("var(--color-brand-indigo)");
    expect(block).toContain("var(--color-brand-violet)");
  });
});

describe("the icons say what the feature is", () => {
  it("drops the two most worn icons on the internet", () => {
    // Brain and Sparkles mean "AI" and nothing else; a signature means style
    // and a checklist means a conclusion.
    const block = landing.slice(landing.indexOf("const FEATURE_KEYS"), landing.indexOf("const SECURITY_ITEMS"));
    expect(block).not.toContain("Brain");
    expect(block).not.toContain("Sparkles");
    expect(block).toContain("Signature");
    expect(block).toContain("ListChecks");
  });

  it("gives every card and step its own icon", () => {
    const cards = landing.slice(landing.indexOf("const FEATURE_KEYS"), landing.indexOf("const SECURITY_ITEMS"));
    const icons = [...cards.matchAll(/icon: (\w+)/g)].map((m) => m[1]);
    expect(icons.length).toBeGreaterThanOrEqual(9);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("imports nothing it no longer draws", () => {
    for (const gone of ["FileText,", "MessageCircle,"]) {
      const imports = landing.slice(0, landing.indexOf('} from "lucide-react"'));
      expect(imports).not.toContain(gone);
    }
  });
});

describe("the background keeps moving without being busy", () => {
  it("turns an aurora slowly enough to look still", () => {
    // Shortened to 40s on request. Below about 25 a full rotation becomes a
    // spin you can follow with your eye, which is a different thing entirely.
    const turn = Number(css.match(/animation: aurora-turn (\d+)s/)?.[1]);
    expect(turn).toBeGreaterThanOrEqual(25);
    expect(css).toContain("conic-gradient");
    expect(landing).toContain("aurora");
  });

  it("builds the aurora from the palette", () => {
    const block = css.slice(css.indexOf(".aurora {"), css.indexOf(".aurora-reverse"));
    for (const token of ["--color-brand-deep", "--color-brand-violet", "--color-brand-cyan"]) {
      expect(block).toContain(token);
    }
  });

  it("gives the washes their own clocks, so none move together", () => {
    // Identical timing across five layers reads as one object, not weather.
    const delays = landing.match(/animationDelay: "[^"]+"/g) || [];
    expect(delays.length).toBeGreaterThanOrEqual(2);
    expect(new Set(delays).size).toBe(delays.length);
  });

  it("sweeps light across rarely rather than on a short loop", () => {
    // Every few seconds is a loop you notice; once a minute is weather.
    const sweep = Number(css.match(/animation: sheen-sweep (\d+)s/)?.[1]);
    expect(sweep).toBeGreaterThanOrEqual(30);
    // Most of the cycle is spent invisible.
    const frames = css.slice(css.indexOf("@keyframes sheen-sweep"), css.indexOf(".animate-sheen-sweep"));
    expect(frames).toMatch(/0%,\s*8\d%/);
  });

  it("keeps every layer out of the way of the pointer", () => {
    const hero = landing.slice(landing.indexOf("{/* ─── Hero ─── */}"), landing.indexOf("{/* ─── Step-by-step"));
    for (const m of hero.matchAll(/className="absolute[^"]*(?:aurora|animate-float|animate-sheen)[^"]*"/g)) {
      expect(m[0].includes("pointer-events-none") || m[0].includes("inset-0")).toBe(true);
    }
  });
});

describe("the pricing buttons are not all the same button", () => {
  it("gives the trial the strongest treatment", () => {
    // The end has to be looked for AFTER the start: "{planKey === \"starter\""
    // also appears further up, on the card's badge, and slicing to it gives
    // an empty string that contains nothing and fails for the wrong reason.
    const from = landing.indexOf("// The trial button is the one conversion");
    const block = landing.slice(from, landing.indexOf("{planKey === \"starter\"", from));
    expect(block).toContain("gradient-live btn-crafted");
  });

  it("makes the other two a step quieter", () => {
    // Three identical buttons and the eye picks none of them.
    const from = landing.indexOf("// The trial button is the one conversion");
    const block = landing.slice(from, landing.indexOf("{planKey === \"starter\"", from));
    const gradients = [...block.matchAll(/"bg-gradient-to-r ([^"]+)"/g)].map((m) => m[1]);
    expect(gradients.length).toBe(3);
    expect(new Set(gradients).size).toBe(3);
  });
});
