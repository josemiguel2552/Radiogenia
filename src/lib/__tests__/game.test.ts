import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { QUESTIONS, TOPICS, shuffled, buildRun } from "@/lib/game-questions";
import {
  answerPoints, creditsFor, finalScore, maxPossibleScore, waveSpec, questionSeconds,
  cleanAlias, defaultAlias, MAX_ANSWER_MULTIPLIER, MAX_INTEGRITY, POINTS_PER_CORRECT,
  QUESTION_BASE_S, BUILD_HEAL,
} from "@/lib/game-score";
import {
  World, pointAt, PATHS, ROUTES, ROUTE_LENGTH, SLOTS, HOSPITAL, SPECIES, SPECIES_KEYS,
} from "@/components/sidebar/game-engine";

/**
 * Radiology Defense.
 *
 * A game that teaches is only worth shipping if the answers are right, so
 * most of what is checked here is the bank itself: exactly one correct
 * option, four options, three languages, a citable source. A question with
 * two correct answers is unwinnable; one with none is worse, because the
 * player concludes they misremembered something they had right.
 *
 * The simulation is tested too, which is the point of keeping it out of the
 * component: a wave can be run to its end in a plain loop, with no canvas and
 * no animation frame.
 */

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("the question bank is answerable", () => {
  it("ships a usable number of questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(40);
  });

  it("gives every question exactly four options and exactly one correct", () => {
    for (const q of QUESTIONS) {
      expect(`${q.id}: ${q.options.length} options`).toBe(`${q.id}: 4 options`);
      const right = q.options.filter((o) => o.correct).length;
      expect(`${q.id}: ${right} correct`).toBe(`${q.id}: 1 correct`);
    }
  });

  it("writes every question and option in all three languages", () => {
    for (const q of QUESTIONS) {
      for (const lang of ["es", "en", "pt"] as const) {
        expect(`${q.id}/${lang}`).toBe(q.q[lang] ? `${q.id}/${lang}` : `${q.id}/${lang} MISSING`);
        for (const [i, o] of q.options.entries()) {
          expect(`${q.id}/${lang}/${i}`).toBe(o.t[lang] ? `${q.id}/${lang}/${i}` : `${q.id}/${lang}/${i} MISSING`);
        }
      }
    }
  });

  it("cites a source for every question", () => {
    // The source is what a miss turns into: without it the game only tells
    // you that you were wrong, which is the least useful half of revising.
    for (const q of QUESTIONS) {
      expect(`${q.id}: ${q.source.length > 6}`).toBe(`${q.id}: true`);
    }
  });

  it("has no duplicate ids and no duplicate options within a question", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      const es = q.options.map((o) => o.t.es);
      expect(`${q.id}: ${new Set(es).size}`).toBe(`${q.id}: 4`);
    }
  });

  it("keeps option text short enough to read on a falling block", () => {
    // Four lanes across a phone leaves roughly a quarter of the width each.
    // A 120-character option is a wall of text nobody reads before it lands.
    for (const q of QUESTIONS) {
      for (const o of q.options) {
        for (const lang of ["es", "en", "pt"] as const) {
          expect(`${q.id}: ${o.t[lang].length <= 70}`).toBe(`${q.id}: true`);
        }
      }
    }
  });

  it("covers the classifications the app actually ships sheets for", () => {
    for (const topic of ["birads", "fleischner", "bosniak", "pirads", "lirads", "spine", "schizas", "foraminal", "marrow", "adrenal"]) {
      expect(`${topic}: ${TOPICS.includes(topic)}`).toBe(`${topic}: true`);
    }
  });

  it("has a label for every topic in the bank", () => {
    // A topic with no label renders its raw key on the filter chip.
    const dict = read("src/lib/i18n-game.ts");
    for (const topic of TOPICS) {
      expect(`${topic}: ${dict.includes(`"game.t_${topic}"`)}`).toBe(`${topic}: true`);
    }
  });
});

describe("shuffling is a real shuffle", () => {
  it("keeps every element and does not mutate the source", () => {
    const src = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffled(src);
    expect(out.slice().sort((a, b) => a - b)).toEqual(src);
    expect(src).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("can move the first element anywhere, which sort(random) cannot", () => {
    // `sort(() => Math.random() - 0.5)` leaves early items far likelier to
    // stay put. Over many runs a real shuffle spreads item 0 across every
    // position; a comparator shuffle visibly does not.
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) seen.add(shuffled([0, 1, 2, 3]).indexOf(0));
    expect(seen.size).toBe(4);
  });

  it("builds a run from the chosen topics only", () => {
    const run = buildRun(["birads"]);
    expect(run.length).toBeGreaterThan(0);
    expect(run.every((q) => q.topic === "birads")).toBe(true);
  });

  it("falls back to the whole bank when no topic is chosen", () => {
    expect(buildRun([]).length).toBe(QUESTIONS.length);
    expect(buildRun(undefined).length).toBe(QUESTIONS.length);
  });
});

describe("the economy rewards being sure, not being quick", () => {
  it("pays more for a longer streak, up to a cap", () => {
    expect(creditsFor(3, 0)).toBeGreaterThan(creditsFor(0, 0));
    // Without a ceiling, one long streak funds every turret in the game and
    // the rest of the run stops being a decision.
    expect(creditsFor(50, 0)).toBe(creditsFor(8, 0));
  });

  it("pays a little for answering early, but bounded", () => {
    expect(creditsFor(0, 6)).toBeGreaterThan(creditsFor(0, 0));
    expect(creditsFor(0, 60)).toBe(creditsFor(0, 6));
  });

  it("scores an answer higher the longer the streak, up to a cap", () => {
    expect(answerPoints(0)).toBe(POINTS_PER_CORRECT);
    expect(answerPoints(4)).toBeGreaterThan(answerPoints(0));
    expect(answerPoints(99)).toBe(POINTS_PER_CORRECT * MAX_ANSWER_MULTIPLIER);
  });
});

describe("waves get harder without outrunning the reading", () => {
  it("brings more and tougher enemies each wave", () => {
    for (const w of [2, 5, 9]) {
      expect(waveSpec(w).count).toBeGreaterThan(waveSpec(w - 1).count);
      expect(waveSpec(w).hp).toBeGreaterThan(waveSpec(w - 1).hp);
    }
  });

  it("caps the speed, so it stays a quiz and not a reflex test", () => {
    // A wave that crosses faster than a question can be read turns the game
    // into tapping at random, which is the opposite of revising.
    expect(waveSpec(50).speed).toBe(waveSpec(20).speed);
    expect(waveSpec(50).speed).toBeLessThanOrEqual(0.064);
    expect(waveSpec(50).gap).toBeGreaterThanOrEqual(0.5);
  });
});

describe("the final score is survival, and only counted once", () => {
  it("adds waves and surviving integrity to the answers", () => {
    const base = finalScore({ answerScore: 0, wavesCleared: 0, integrity: 0 });
    expect(base).toBe(0);
    expect(finalScore({ answerScore: 0, wavesCleared: 3, integrity: 0 })).toBeGreaterThan(base);
    expect(finalScore({ answerScore: 0, wavesCleared: 0, integrity: 50 })).toBeGreaterThan(base);
  });

  it("never pays for integrity below zero", () => {
    expect(finalScore({ answerScore: 100, wavesCleared: 0, integrity: -40 })).toBe(100);
  });
});

describe("the server bounds what a browser may claim", () => {
  it("accepts a perfect run and nothing beyond it", () => {
    // The browser keeps the score, so it can lie. The ceiling turns "any
    // number" into "a number this run could actually have produced".
    const perfect = maxPossibleScore(10, 4, MAX_INTEGRITY);
    expect(perfect).toBeGreaterThan(0);
    expect(maxPossibleScore(0, 0, 0)).toBe(0);
  });

  it("grows with each of the three things it is built from", () => {
    expect(maxPossibleScore(5, 2, 50)).toBeGreaterThan(maxPossibleScore(4, 2, 50));
    expect(maxPossibleScore(5, 3, 50)).toBeGreaterThan(maxPossibleScore(5, 2, 50));
    expect(maxPossibleScore(5, 2, 60)).toBeGreaterThan(maxPossibleScore(5, 2, 50));
  });

  it("cannot be inflated by claiming impossible integrity", () => {
    expect(maxPossibleScore(1, 1, 10_000)).toBe(maxPossibleScore(1, 1, MAX_INTEGRITY));
  });

  it("is checked by the endpoint before anything is written", () => {
    const route = read("src/app/api/game/route.ts");
    const post = route.slice(route.indexOf("export async function POST"));
    expect(post.indexOf("maxPossibleScore")).toBeLessThan(post.indexOf(".insert("));
  });
});

describe("the clock follows how much there is to read", () => {
  it("gives a short question the base time", () => {
    expect(questionSeconds(30, 40)).toBe(QUESTION_BASE_S);
  });

  it("adds two seconds for a long stem and one more for long options", () => {
    // A fixed timer punishes the questions worth the most: the ones whose
    // stem names three findings, or whose options are sentences rather than
    // "LR-5". The player is not slower on those, there is simply more to read.
    expect(questionSeconds(120, 40)).toBe(QUESTION_BASE_S + 2);
    expect(questionSeconds(30, 300)).toBe(QUESTION_BASE_S + 1);
    expect(questionSeconds(120, 300)).toBe(QUESTION_BASE_S + 3);
  });

  it("never shortens a question below the base", () => {
    expect(questionSeconds(0, 0)).toBe(QUESTION_BASE_S);
  });
});

describe("the department has six ways in", () => {
  it("runs six corridors, all ending at the hospital", () => {
    expect(PATHS).toHaveLength(ROUTES);
    expect(ROUTES).toBe(6);
    for (let r = 0; r < ROUTES; r++) {
      const end = pointAt(r, 1);
      expect(Math.hypot(end.x - HOSPITAL.x, end.y - HOSPITAL.y)).toBeLessThan(0.001);
    }
  });

  it("starts every corridor off the field, so nobody appears from nowhere", () => {
    for (let r = 0; r < ROUTES; r++) {
      const start = pointAt(r, 0);
      const outside = start.x < -0.01 || start.x > 1.01 || start.y < -0.01 || start.y > 1.01;
      expect(`route ${r} enters from outside: ${outside}`).toBe(`route ${r} enters from outside: true`);
    }
  });

  it("gives every corridor practically the same length", () => {
    // Not exactly the same: the field is portrait, so the ring the corridors
    // start on is an ellipse and the diagonal ones run a touch longer. Two
    // per cent is below noticing; a shortcut would not be.
    const lengths = PATHS.map((path) =>
      path.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0));
    for (const l of lengths) expect(Math.abs(l / ROUTE_LENGTH - 1)).toBeLessThan(0.03);
  });

  it("offers twelve bays, none of them on a corridor", () => {
    // A scanner drawn on the lane would hide the people walking under it,
    // which is the one thing the player has to be able to see.
    expect(SLOTS).toHaveLength(12);
    for (const slot of SLOTS) {
      let nearest = 1;
      for (let r = 0; r < ROUTES; r++) {
        for (let t = 0; t <= 1; t += 0.004) {
          const p = pointAt(r, t);
          nearest = Math.min(nearest, Math.hypot(p.x - slot.x, p.y - slot.y));
        }
      }
      expect(`${slot.x.toFixed(2)},${slot.y.toFixed(2)} clear: ${nearest > 0.08}`)
        .toBe(`${slot.x.toFixed(2)},${slot.y.toFixed(2)} clear: true`);
    }
  });

  it("keeps every bay inside the field, so it can be tapped", () => {
    for (const slot of SLOTS) {
      expect(`${slot.x.toFixed(2)},${slot.y.toFixed(2)} inside: ${
        slot.x > 0.02 && slot.x < 0.98 && slot.y > 0.02 && slot.y < 0.98}`)
        .toBe(`${slot.x.toFixed(2)},${slot.y.toFixed(2)} inside: true`);
    }
  });

  it("walks at a steady pace whatever the leg lengths", () => {
    // Giving every segment an equal slice of t makes a patient sprint down a
    // short leg and crawl along a long one. Nobody reads that as design.
    const steps = 160;
    const dists: number[] = [];
    for (let i = 0; i < steps; i++) {
      const a = pointAt(0, i / steps);
      const b = pointAt(0, (i + 1) / steps);
      dists.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    const mean = dists.reduce((x, y) => x + y, 0) / dists.length;
    expect(dists.filter((d) => Math.abs(d / mean - 1) > 0.1).length).toBeLessThanOrEqual(12);
    expect(Math.min(...dists) / mean).toBeGreaterThan(0.6);
  });
});

describe("five kinds of patient, each its own shape and colour", () => {
  it("defines every species with a distinct colour", () => {
    expect(SPECIES_KEYS).toHaveLength(5);
    const colours = SPECIES_KEYS.map((k) => SPECIES[k].fill);
    expect(new Set(colours).size).toBe(5);
  });

  it("trades speed against the imaging each one needs", () => {
    // The fast ones are light, the heavy ones are slow. A species that was
    // both would simply be the only one that mattered.
    for (const key of SPECIES_KEYS) {
      const s = SPECIES[key];
      expect(`${key}: ${s.speedMul > 1 ? s.hpMul < 1 : true}`).toBe(`${key}: true`);
    }
  });

  it("makes the heaviest arrival cost the most backlog", () => {
    expect(SPECIES.critical.weight).toBeGreaterThan(SPECIES.routine.weight);
    expect(SPECIES.paediatric.weight).toBeLessThan(SPECIES.routine.weight);
  });

  it("has a label for every species", () => {
    const dict = read("src/lib/i18n-game.ts");
    for (const key of SPECIES_KEYS) {
      expect(`${key}: ${dict.includes(`"game.sp_${key}"`)}`).toBe(`${key}: true`);
    }
  });

  it("spreads arrivals across all six corridors", () => {
    // One quiet route would let the player stack a single wedge and forget
    // the other five. Measured over a wave big enough to be a sample: the
    // dealing is round-robin with a nudge, so a short wave can legitimately
    // skip one and that is not what this is asking about.
    const w = new World({ onLeak: () => {}, onWaveCleared: () => {} });
    w.startWave(10);
    const seen = new Set<number>();
    for (let i = 0; i < 2500; i++) {
      w.tick(1 / 60);
      for (const p of w.patients) seen.add(p.route);
    }
    expect(seen.size).toBe(ROUTES);
  });
});

describe("installing a scanner is capacity, so it heals", () => {
  const quiet = () => new World({ onLeak: () => {}, onWaveCleared: () => {} });

  it("gives back ten points of integrity per scanner built", () => {
    const w = quiet();
    w.damageBase(50);
    const before = w.integrity;
    w.build(0);
    expect(w.integrity).toBe(before + BUILD_HEAL);
  });

  it("never heals past full", () => {
    const w = quiet();
    w.damageBase(3);
    w.build(0);
    expect(w.integrity).toBe(MAX_INTEGRITY);
  });

  it("does not heal on an upgrade, nor on a refused build", () => {
    // Only a NEW scanner is new capacity. Healing on upgrades would make
    // integrity a currency rather than a state.
    const w = quiet();
    w.damageBase(50);
    w.build(0);
    const after = w.integrity;
    w.upgrade(0);
    expect(w.integrity).toBe(after);
    expect(w.build(0)).toBe(false);
    expect(w.integrity).toBe(after);
  });

  it("refuses a bay that does not exist", () => {
    const w = quiet();
    expect(w.build(-1)).toBe(false);
    expect(w.build(SLOTS.length)).toBe(false);
    expect(w.scanners).toHaveLength(0);
  });
});

describe("the board is a game board, not a staff directory", () => {
  it("returns no user ids to the browser", () => {
    // A board that named people would turn revision into a comparison
    // between named radiologists, which is the one thing the productivity
    // rules in this product exist to prevent.
    const route = read("src/app/api/game/route.ts");
    const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
    expect(get).toContain("me: uid === user.id");
    expect(get).not.toMatch(/user_id:\s*(r\.user_id|uid)/);
  });

  it("derives a default alias from the id, never from a name or email", () => {
    const a = defaultAlias("11111111-2222-3333-4444-555555555555");
    expect(a).toMatch(/^R-\d{4}$/);
    expect(defaultAlias("same")).toBe(defaultAlias("same"));
    expect(defaultAlias("a")).not.toBe(defaultAlias("b"));
  });

  it("trims and bounds an alias before anyone else sees it", () => {
    expect(cleanAlias("  Dr   Fuego  ")).toBe("Dr Fuego");
    expect(cleanAlias("a")).toBeNull();
    expect(cleanAlias("")).toBeNull();
    expect(cleanAlias(42)).toBeNull();
    expect(cleanAlias("x".repeat(80))?.length).toBe(24);
  });

  it("ranks players, not runs", () => {
    // Per-run ranking lets one good session fill every row and nobody else
    // ever appears on the board.
    const route = read("src/app/api/game/route.ts");
    expect(route).toContain("best.has(r.user_id)");
  });
});

describe("the game is reachable and costs non-players nothing", () => {
  const shell = read("src/components/dashboard/dashboard-shell.tsx");

  it("is code-split like the other heavy tabs", () => {
    expect(shell).toContain('dynamic(() => import("@/components/sidebar/game-tab")');
  });

  it("is in both the desktop rail and the mobile bar", () => {
    expect(shell).toContain('{ view: "game" as ActiveView');
    expect(shell).toContain('{ key: "game" as ActiveView');
  });

  it("takes its nav label from the shared dictionary, not the split one", () => {
    // The shell renders before the tab is ever opened, so a label living in
    // the game's own dictionary would show as a raw key until someone clicks.
    expect(shell).toContain('t("nav.rail_game")');
    expect(shell).not.toContain('t("game.nav")');
    expect(read("src/lib/i18n.ts")).toContain('"nav.rail_game"');
  });
});
