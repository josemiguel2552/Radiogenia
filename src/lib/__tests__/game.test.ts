import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { QUESTIONS, TOPICS, shuffled, buildRun } from "@/lib/game-questions";
import {
  answerPoints, creditsFor, finalScore, maxPossibleScore, waveSpec, questionSeconds,
  cleanAlias, defaultAlias, MAX_ANSWER_MULTIPLIER, MAX_INTEGRITY, POINTS_PER_CORRECT,
  QUESTION_BASE_S,
} from "@/lib/game-score";
import { World, pointAt, PATH, PATH_LENGTH, SLOTS } from "@/components/sidebar/game-engine";

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
    expect(waveSpec(50).speed).toBeLessThanOrEqual(0.075);
    expect(waveSpec(50).gap).toBeGreaterThanOrEqual(0.55);
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

describe("the map gives a turret something to cover", () => {
  it("runs a longer lane than the first draft", () => {
    expect(PATH.length).toBeGreaterThanOrEqual(12);
    expect(PATH_LENGTH).toBeGreaterThan(3);
  });

  it("offers ten emplacements", () => {
    expect(SLOTS).toHaveLength(10);
  });

  it("walks at a steady pace whatever the leg lengths", () => {
    // Giving every segment an equal slice of t makes an enemy sprint down a
    // short leg and crawl along a long one. Nobody reads that as design;
    // they read it as the game stuttering.
    const steps = 200;
    const dists: number[] = [];
    for (let i = 0; i < steps; i++) {
      const a = pointAt(i / steps);
      const b = pointAt((i + 1) / steps);
      dists.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    const mean = dists.reduce((x, y) => x + y, 0) / dists.length;
    const off = dists.filter((d) => Math.abs(d / mean - 1) > 0.1);
    // Only the steps that land on a corner fall short, because they cut it.
    // There are twelve corners, so a handful of outliers is the geometry and
    // not the parameterisation.
    expect(off.length).toBeLessThanOrEqual(15);
    expect(Math.min(...dists) / mean).toBeGreaterThan(0.6);

    // The measure of what this fixed: the legs themselves differ sixfold, so
    // giving each an equal slice of t would have run an enemy six times
    // faster along one stretch than another.
    const legs = PATH.slice(1).map((p, i) => Math.hypot(p.x - PATH[i].x, p.y - PATH[i].y));
    expect(Math.max(...legs) / Math.min(...legs)).toBeGreaterThan(3);
  });

  it("keeps every slot clear of the lane and inside the frame", () => {
    for (const slot of SLOTS) {
      let nearest = 1;
      for (let t = 0; t <= 1; t += 0.002) {
        const p = pointAt(t);
        nearest = Math.min(nearest, Math.hypot(p.x - slot.x, p.y - slot.y));
      }
      expect(`${slot.x},${slot.y} clear: ${nearest > 0.045}`).toBe(`${slot.x},${slot.y} clear: true`);
      // A pad drawn half off the canvas cannot be tapped on its missing half.
      expect(`${slot.x},${slot.y} inside: ${slot.x > 0.03 && slot.x < 0.97 && slot.y > 0.03 && slot.y < 0.97}`)
        .toBe(`${slot.x},${slot.y} inside: true`);
    }
  });
});

describe("the battlefield simulates without a canvas", () => {
  const quiet = () => new World({ onLeak: () => {}, onWaveCleared: () => {} });

  it("walks the path from start to base", () => {
    expect(pointAt(0)).toEqual(PATH[0]);
    expect(pointAt(1)).toEqual(PATH[PATH.length - 1]);
    const mid = pointAt(0.5);
    expect(mid.y).toBeGreaterThan(PATH[0].y);
  });

  it("damages the base for every enemy that gets through", () => {
    let leaked = 0;
    const w = new World({ onLeak: () => { leaked += 1; }, onWaveCleared: () => {} });
    w.startWave(1);
    for (let i = 0; i < 2000; i++) w.tick(1 / 30);
    expect(leaked).toBe(waveSpec(1).count);
    expect(w.integrity).toBeLessThan(MAX_INTEGRITY);
    expect(w.enemies).toHaveLength(0);
  });

  it("leaves an undefended player several waves, not one", () => {
    // Wave 1 landing in full must not be near-fatal: the first wave is where
    // the player is still working out that answers are what buy turrets.
    const w = quiet();
    w.startWave(1);
    for (let i = 0; i < 2000; i++) w.tick(1 / 30);
    expect(w.integrity).toBeGreaterThan(MAX_INTEGRITY * 0.6);
  });

  it("never takes the base below zero", () => {
    const w = quiet();
    w.damageBase(10_000);
    expect(w.integrity).toBe(0);
  });

  it("lets turrets stop a wave that would otherwise land", () => {
    // The whole promise of the economy: answers buy turrets, turrets hold
    // the line. If a maxed turret could not clear wave 1 the game would be
    // unwinnable however well the player knew the material.
    const w = quiet();
    w.startWave(1);
    for (let i = 0; i < 4; i++) { w.build(i); w.upgrade(i); w.upgrade(i); }
    let cleared = 0;
    const w2 = new World({ onLeak: () => {}, onWaveCleared: () => { cleared += 1; } });
    w2.startWave(1);
    for (let i = 0; i < 4; i++) { w2.build(i); w2.upgrade(i); w2.upgrade(i); }
    for (let i = 0; i < 3000; i++) w2.tick(1 / 30);
    expect(cleared).toBeGreaterThan(0);
    expect(w2.integrity).toBe(MAX_INTEGRITY);
  });

  it("refuses a second turret on one slot and a fourth level on any", () => {
    const w = quiet();
    expect(w.build(0)).toBe(true);
    expect(w.build(0)).toBe(false);
    expect(w.upgrade(0)).toBe(true);
    expect(w.upgrade(0)).toBe(true);
    expect(w.upgrade(0)).toBe(false);
    expect(w.turretAt(0)?.level).toBe(3);
  });

  it("maps a tap to the slot it was nearest, or to none", () => {
    const w = quiet();
    expect(w.slotNear(SLOTS[2].x, SLOTS[2].y, 1)).toBe(2);
    // A tap in open ground must not silently spend credits somewhere else.
    expect(w.slotNear(0.01, 0.01, 1)).toBeNull();
  });

  it("keeps every slot off the lane it is meant to cover", () => {
    // A turret drawn on top of the path would hide the enemies walking under
    // it, which is the one thing the player has to be able to see.
    for (const slot of SLOTS) {
      let nearest = 1;
      for (let t = 0; t <= 1; t += 0.005) {
        const p = pointAt(t);
        nearest = Math.min(nearest, Math.hypot(p.x - slot.x, p.y - slot.y));
      }
      expect(`${slot.x},${slot.y}: ${nearest > 0.05}`).toBe(`${slot.x},${slot.y}: true`);
    }
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
