import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { QUESTIONS, TOPICS, shuffled, buildRun } from "@/lib/game-questions";
import {
  answerPoints, creditsFor, finalScore, maxPossibleScore, waveSpec, studyReward,
  cleanAlias, defaultAlias, MAX_ANSWER_MULTIPLIER, MAX_INTEGRITY, POINTS_PER_CORRECT,
  BUILD_HEAL,
} from "@/lib/game-score";
import { World, SPECIES, SPECIES_KEYS } from "@/components/sidebar/game-engine";
import {
  buildLayout, levelSpec, slotClearance, HOSPITAL, LEVEL_COUNT, TINTS,
} from "@/components/sidebar/game-levels";

/** The quiet world used by most of these: no callbacks, just a simulation. */
const quietWorld = () => new World({ onLeak: () => {}, onWaveCleared: () => {}, onLevelCleared: () => {}, onStudyDone: () => {} });

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
    expect(creditsFor(3)).toBeGreaterThan(creditsFor(0));
    // Without a ceiling, one long streak funds every scanner in the game and
    // the rest of the run stops being a decision.
    expect(creditsFor(50)).toBe(creditsFor(8));
  });

  it("pays nothing at all for being quick", () => {
    // A clock on the question measures reading speed, not radiology. The
    // only thing rewarded here is being sure, which is what revision is.
    const source = read("src/lib/game-score.ts");
    const fn = source.slice(source.indexOf("export function creditsFor"), source.indexOf("export function studyReward"));
    expect(fn).not.toMatch(/second|elapsed|time|clock/i);
    expect(creditsFor(0)).toBe(12);
  });

  it("pays for a completed study, so scanners produce", () => {
    expect(studyReward(1)).toBeGreaterThan(0);
    expect(studyReward(2.1)).toBeGreaterThan(studyReward(1));
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

describe("nothing on the question is timed", () => {
  it("keeps no clock in the game component", () => {
    // The complaint this answers: a revision game that will not let you stop
    // and think is fighting the thing it is for.
    const tab = read("src/components/sidebar/game-tab.tsx");
    expect(tab).not.toMatch(/timeLeft|questionS|QUESTION_BASE_S|questionSeconds/);
  });

  it("holds the department still until the player opens the doors", () => {
    const w = quietWorld();
    w.startLevel(1);
    expect(w.active).toBe(false);
    for (let i = 0; i < 600; i++) w.tick(1 / 60);
    expect(w.patients).toHaveLength(0);
    expect(w.integrity).toBe(MAX_INTEGRITY);

    w.beginAssault();
    expect(w.active).toBe(true);
    for (let i = 0; i < 300; i++) w.tick(1 / 60);
    expect(w.patients.length).toBeGreaterThan(0);
  });

  it("freezes the walk while paused but keeps the place alive", () => {
    const w = quietWorld();
    w.startLevel(1);
    w.beginAssault();
    for (let i = 0; i < 400; i++) w.tick(1 / 60);
    const before = w.patients.map((p) => p.t);
    const timeBefore = w.time;

    w.active = false;
    for (let i = 0; i < 400; i++) w.tick(1 / 60);
    expect(w.patients.map((p) => p.t)).toEqual(before);
    // Idle animation keeps running, so a paused board is a living place and
    // not a freeze-frame.
    expect(w.time).toBeGreaterThan(timeBefore);
  });

  it("returns to preparation when a wave is cleared", () => {
    const w = new World({
      onLeak: () => {}, onWaveCleared: () => {}, onLevelCleared: () => {}, onStudyDone: () => {},
    });
    w.startLevel(1);
    w.beginAssault();
    w.pending = 0;
    w.tick(1 / 60);
    expect(w.active).toBe(false);
  });
});

describe("every level lays out a department that works", () => {
  const levels = Array.from({ length: LEVEL_COUNT }, (_, i) => buildLayout(levelSpec(i + 1)));

  it("grows from three corridors to eight", () => {
    const routes = levels.map((l) => l.paths.length);
    expect(routes[0]).toBe(3);
    expect(routes[routes.length - 1]).toBe(8);
    for (let i = 1; i < routes.length; i++) expect(routes[i]).toBeGreaterThan(routes[i - 1]);
  });

  it("ends every corridor at the hospital and starts it off the field", () => {
    for (const layout of levels) {
      for (let r = 0; r < layout.paths.length; r++) {
        const end = layout.at(r, 1);
        expect(Math.hypot(end.x - HOSPITAL.x, end.y - HOSPITAL.y)).toBeLessThan(0.001);
        const start = layout.at(r, 0);
        const outside = start.x < -0.005 || start.x > 1.005 || start.y < -0.005 || start.y > 1.005;
        expect(`L${layout.spec.level} r${r} enters from outside: ${outside}`)
          .toBe(`L${layout.spec.level} r${r} enters from outside: true`);
      }
    }
  });

  it("places every bay it promised, clear of every corridor", () => {
    // This is the whole reason the geometry is searched instead of typed:
    // the dog-leg swings each corridor a quarter of a wedge toward its
    // neighbour, so the obvious midpoint sits ON a lane. With six layouts
    // that mistake would be waiting in all of them.
    for (const layout of levels) {
      expect(`L${layout.spec.level} bays`).toBe(
        layout.slots.length === layout.spec.perRing * 2 ? `L${layout.spec.level} bays` : `L${layout.spec.level} MISSING`);
      expect(`L${layout.spec.level} clearance ok: ${slotClearance(layout) > 0.08}`)
        .toBe(`L${layout.spec.level} clearance ok: true`);
    }
  });

  it("keeps every bay on the field, where it can be tapped", () => {
    for (const layout of levels) {
      for (const s of layout.slots) {
        const inside = s.x > 0.05 && s.x < 0.95 && s.y > 0.04 && s.y < 0.96;
        expect(`L${layout.spec.level} (${s.x.toFixed(2)},${s.y.toFixed(2)}) inside: ${inside}`)
          .toBe(`L${layout.spec.level} (${s.x.toFixed(2)},${s.y.toFixed(2)}) inside: true`);
      }
    }
  });

  it("keeps most of every walk on screen", () => {
    // Time spent off-canvas is time a scanner works on someone nobody sees.
    for (const layout of levels) {
      let vis = 0;
      let all = 0;
      for (let r = 0; r < layout.paths.length; r++) {
        for (let t = 0; t <= 1; t += 0.01) {
          const p = layout.at(r, t);
          all += 1;
          if (p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) vis += 1;
        }
      }
      expect(`L${layout.spec.level} visible: ${vis / all > 0.75}`).toBe(`L${layout.spec.level} visible: true`);
    }
  });

  it("gives each floor its own colour and a harder curve", () => {
    const tints = levels.map((l) => l.spec.tint.lane);
    expect(new Set(tints).size).toBe(LEVEL_COUNT);
    expect(TINTS.length).toBeGreaterThanOrEqual(LEVEL_COUNT);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].spec.hardness).toBeGreaterThan(levels[i - 1].spec.hardness);
      expect(levels[i].spec.waves).toBeGreaterThanOrEqual(levels[i - 1].spec.waves);
    }
  });

  it("introduces the heavier patients floor by floor", () => {
    // Arriving at a trolley case on the first wave of the first level would
    // teach nothing except that the game is unfair.
    expect(levels[0].spec.species).not.toContain("critical");
    expect(levels[0].spec.species).not.toContain("stretcher");
    expect(levels[LEVEL_COUNT - 1].spec.species).toHaveLength(5);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].spec.species.length).toBeGreaterThanOrEqual(levels[i - 1].spec.species.length);
    }
  });

  it("keeps going past the last authored floor", () => {
    // "You win, stop now" is a worse ending than being finally overrun.
    const beyond = levelSpec(LEVEL_COUNT + 3);
    expect(beyond.routes).toBe(levelSpec(LEVEL_COUNT).routes);
    expect(beyond.hardness).toBeGreaterThan(levelSpec(LEVEL_COUNT).hardness);
  });

  it("walks at a steady pace on every layout", () => {
    for (const layout of levels) {
      const steps = 120;
      const dists: number[] = [];
      for (let i = 0; i < steps; i++) {
        const a = layout.at(0, i / steps);
        const b = layout.at(0, (i + 1) / steps);
        dists.push(Math.hypot(b.x - a.x, b.y - a.y));
      }
      const mean = dists.reduce((x, y) => x + y, 0) / dists.length;
      expect(`L${layout.spec.level} steady: ${Math.min(...dists) / mean > 0.55}`)
        .toBe(`L${layout.spec.level} steady: true`);
    }
  });
});

describe("a floor is cleared, and the next one is a different place", () => {
  it("reports the level cleared only after its last wave", () => {
    const levels: number[] = [];
    const w = new World({ onLeak: () => {}, onWaveCleared: () => {}, onStudyDone: () => {}, onLevelCleared: (n) => levels.push(n) });
    w.startLevel(1);
    const need = w.layout.spec.waves;
    for (let n = 1; n <= need; n++) {
      w.startWave(n);
      w.beginAssault();
      w.pending = 0;
      w.tick(1 / 60);
      expect(`after wave ${n}: ${levels.length}`).toBe(`after wave ${n}: ${n === need ? 1 : 0}`);
    }
  });

  it("rebuilds the department on the new floor", () => {
    // Scanners do not carry over: it is a different place, and rebuilding is
    // most of what makes arriving somewhere feel like arriving.
    const w = quietWorld();
    w.startLevel(1);
    w.build(0);
    w.damageBase(60);
    w.startLevel(2);
    expect(w.scanners).toHaveLength(0);
    expect(w.patients).toHaveLength(0);
    expect(w.integrity).toBe(MAX_INTEGRITY);
    expect(w.level).toBe(2);
    expect(w.layout.paths).toHaveLength(4);
    expect(w.waveInLevel).toBe(1);
  });

  it("counts waves per floor for the HUD and in total for the board", () => {
    let total = 0;
    const w = new World({ onLeak: () => {}, onWaveCleared: (n) => { total = n; }, onStudyDone: () => {}, onLevelCleared: () => {} });
    w.startLevel(1);
    for (let n = 1; n <= 3; n++) {
      w.startWave(n);
      w.beginAssault();
      w.pending = 0;
      w.tick(1 / 60);
    }
    expect(w.waveInLevel).toBe(3);
    expect(total).toBe(3);
    w.startLevel(2);
    w.beginAssault();
    w.pending = 0;
    w.tick(1 / 60);
    expect(w.waveInLevel).toBe(1);
    expect(total).toBe(4);
  });

  it("makes wave 1 of a later floor heavier than wave 1 of the first", () => {
    const a = quietWorld();
    a.startLevel(1);
    const b = quietWorld();
    b.startLevel(4);
    expect(b.spec.hp).toBeGreaterThan(a.spec.hp);
    expect(b.spec.count).toBeGreaterThan(a.spec.count);
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

  it("spreads arrivals across every corridor of the floor", () => {
    // One quiet route would let the player stack a single wedge and forget
    // the rest. Measured over a sample big enough to mean something: the
    // dealing is round-robin with a nudge, so a short wave can legitimately
    // skip one and that is not what this is asking about.
    const w = quietWorld();
    w.startLevel(LEVEL_COUNT);
    w.startWave(9);
    w.beginAssault();
    const seen = new Set<number>();
    for (let i = 0; i < 4000; i++) {
      w.tick(1 / 60);
      for (const p of w.patients) seen.add(p.route);
    }
    expect(seen.size).toBe(w.layout.paths.length);
  });
});

describe("installing a scanner is capacity, so it heals", () => {
  const quiet = () => { const w = quietWorld(); w.startLevel(1); w.beginAssault(); return w; };

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
    expect(w.build(w.layout.slots.length)).toBe(false);
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

  it("is reachable from the rail and from the mobile bar", () => {
    expect((shell.match(/setActiveView\("game"\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("stays out of the main nav lists, in a corner", () => {
    // It is a break, not a tool. Sitting in the rail next to reports and
    // templates puts it on offer to someone who opened the panel to work.
    expect(shell).not.toContain('{ view: "game" as ActiveView');
    expect(shell).not.toContain('{ key: "game" as ActiveView');
    // Reachable all the same, and named for whoever hovers or uses a reader.
    expect(shell).toContain('aria-label={t("nav.rail_game")}');
    expect(shell).toContain('aria-label={t("nav.game")}');
  });

  it("takes its nav label from the shared dictionary, not the split one", () => {
    // The shell renders before the tab is ever opened, so a label living in
    // the game's own dictionary would show as a raw key until someone clicks.
    expect(shell).toContain('t("nav.rail_game")');
    expect(shell).not.toContain('t("game.nav")');
    expect(read("src/lib/i18n.ts")).toContain('"nav.rail_game"');
  });
});
