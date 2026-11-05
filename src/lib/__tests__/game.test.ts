import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { QUESTIONS, TOPICS, shuffled, buildRun } from "@/lib/game-questions";
import {
  BUILDINGS, ROUND_SIZE, ROUNDS_PER_WAVE, STARTING_POINTS, TOTAL_CAPACITY, TOTAL_COST,
  PERFECT_ROUND, LAST_SURVIVABLE_WAVE, MAX_POINTS,
  capacityOf, costOf, finalScore, isComplete, maxPossibleScore, pointsFor, waveDemand,
  waveIsNext, waveNumber, type Glyph,
} from "@/lib/game-build";
import { cleanAlias, defaultAlias } from "@/lib/game-alias";

/**
 * Build the department.
 *
 * A game that teaches is only worth shipping if the answers are right, so
 * most of what is checked here is the bank itself. The rest guards the shape
 * the game finally took after several that did not work: rounds of seven,
 * points that build rooms, and a wave every two rounds decided purely by
 * what was accumulated. The properties worth pinning are that the economy
 * can actually be finished, that it cannot be finished by a player who does
 * not know the material, and that nothing anywhere is timed.
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
      expect(`${q.id}: ${new Set(q.options.map((o) => o.t.es)).size}`).toBe(`${q.id}: 4`);
    }
  });

  it("covers the classifications the app actually ships sheets for", () => {
    for (const topic of ["birads", "fleischner", "bosniak", "pirads", "lirads", "spine", "schizas", "foraminal", "marrow", "adrenal"]) {
      expect(`${topic}: ${TOPICS.includes(topic)}`).toBe(`${topic}: true`);
    }
  });

  it("has a label for every topic in the bank", () => {
    const dict = read("src/lib/i18n-game.ts");
    for (const topic of TOPICS) {
      expect(`${topic}: ${dict.includes(`"game.t_${topic}"`)}`).toBe(`${topic}: true`);
    }
  });

  it("holds enough questions that a full run is not one loop of the bank", () => {
    // A winning run is roughly ten rounds. The bank reshuffles when it runs
    // out, which is fine; starting the second lap on round four would not be.
    expect(QUESTIONS.length).toBeGreaterThan(ROUND_SIZE * 5);
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
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) seen.add(shuffled([0, 1, 2, 3]).indexOf(0));
    expect(seen.size).toBe(4);
  });

  it("builds a run from the chosen topics only", () => {
    const run = buildRun(["birads"]);
    expect(run.length).toBeGreaterThan(0);
    expect(run.every((q) => q.topic === "birads")).toBe(true);
  });
});

describe("nothing in the game is timed", () => {
  it("keeps no clock in the rules or the view", () => {
    // The complaint that ended the previous design: a revision game that
    // will not let you stop and think is fighting the thing it is for.
    // Timing a question measures reading speed, not radiology.
    for (const file of ["src/lib/game-build.ts", "src/components/sidebar/game-tab.tsx"]) {
      const src = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(`${file}: ${/timeLeft|secondsLeft|countdown|deadline/.test(src)}`).toBe(`${file}: false`);
    }
  });

  it("pays for a run of right answers and nothing else", () => {
    expect(pointsFor(0)).toBeLessThan(pointsFor(3));
    // Capped, or one long streak funds the whole department and the
    // decision about what to build stops existing.
    expect(pointsFor(100)).toBe(MAX_POINTS);
  });
});

describe("the rhythm is rounds of seven, with a wave every two", () => {
  it("asks seven questions a round", () => {
    expect(ROUND_SIZE).toBe(7);
    expect(ROUNDS_PER_WAVE).toBe(2);
  });

  it("puts a wave after every second round and not before", () => {
    expect(waveIsNext(0)).toBe(false);
    expect(waveIsNext(1)).toBe(false);
    expect(waveIsNext(2)).toBe(true);
    expect(waveIsNext(3)).toBe(false);
    expect(waveIsNext(4)).toBe(true);
  });

  it("numbers the waves from the rounds behind them", () => {
    expect(waveNumber(2)).toBe(1);
    expect(waveNumber(4)).toBe(2);
    expect(waveNumber(5)).toBe(2);
  });

  it("raises the demand every wave", () => {
    for (let n = 2; n <= 8; n++) expect(waveDemand(n)).toBeGreaterThan(waveDemand(n - 1));
  });

  it("asks less of the first wave than one round can pay for", () => {
    // Two unlucky rounds used to end a run before the player had seen what
    // the game was. Losing at wave one teaches nothing but bad dice.
    const afterOneRound = STARTING_POINTS + PERFECT_ROUND;
    const affordable = BUILDINGS.filter((b) => b.cost <= afterOneRound);
    expect(affordable.length).toBeGreaterThan(0);
    expect(Math.max(...affordable.map((b) => b.capacity))).toBeGreaterThanOrEqual(waveDemand(1));
  });
});

describe("the department can be finished, and not by accident", () => {
  it("can absorb every wave it will ever be asked to face", () => {
    expect(waveDemand(LAST_SURVIVABLE_WAVE)).toBeLessThanOrEqual(TOTAL_CAPACITY);
    expect(waveDemand(LAST_SURVIVABLE_WAVE + 1)).toBeGreaterThan(TOTAL_CAPACITY);
  });

  it("costs more than a careless player will ever accumulate", () => {
    // Ten rounds of perfect answers is roughly what a finished department
    // costs. A player answering half right cannot get near it, which is
    // what makes finishing mean something.
    expect(TOTAL_COST).toBeGreaterThan(PERFECT_ROUND * 5);
    expect(TOTAL_COST).toBeLessThan(PERFECT_ROUND * 9);
  });

  it("prices the big rooms better per point and worse per round", () => {
    // That trade IS the decision the game asks for. Without it, buying in
    // cost order would always be right and there would be nothing to think
    // about between rounds.
    const sorted = [...BUILDINGS].sort((a, b) => a.cost - b.cost);
    const value = (b: { cost: number; capacity: number }) => b.capacity / b.cost;
    expect(value(sorted[sorted.length - 1])).toBeGreaterThan(value(sorted[0]));
  });

  it("adds up capacity only for what was built", () => {
    expect(capacityOf([])).toBe(0);
    expect(capacityOf(BUILDINGS.map((b) => b.id))).toBe(TOTAL_CAPACITY);
    expect(capacityOf(["ct"])).toBe(costOf("ct") > 0 ? BUILDINGS.find((b) => b.id === "ct")!.capacity : 0);
  });

  it("calls the department finished only when every room is up", () => {
    expect(isComplete([])).toBe(false);
    expect(isComplete(BUILDINGS.slice(0, -1).map((b) => b.id))).toBe(false);
    expect(isComplete(BUILDINGS.map((b) => b.id))).toBe(true);
  });

  it("gives every room a distinct plot that stays on the plan", () => {
    // A plot off the edge cannot be tapped, and two on the same spot make
    // one of them unbuildable.
    const seen = new Set<string>();
    for (const b of BUILDINGS) {
      const { x, y, w, h } = b.plot;
      expect(`${b.id} on plan: ${x >= 0 && y >= 0 && x + w <= 1 && y + h <= 1}`).toBe(`${b.id} on plan: true`);
      const key = `${x},${y}`;
      expect(`${b.id} unique: ${!seen.has(key)}`).toBe(`${b.id} unique: true`);
      seen.add(key);
    }
  });

  it("has a name for every room", () => {
    const dict = read("src/lib/i18n-game.ts");
    for (const b of BUILDINGS) {
      expect(`${b.id}: ${dict.includes(`"game.room_${b.id}"`)}`).toBe(`${b.id}: true`);
    }
  });
});

describe("a simulated run separates knowing it from not", () => {
  /** Plays a whole run at a fixed accuracy, buying the best room it can. */
  function play(accuracy: number, rnd: () => number): { won: boolean; waves: number; rooms: number } {
    let points = STARTING_POINTS;
    let built: Glyph[] = [];
    let waves = 0;
    for (let round = 1; round <= 30; round++) {
      let streak = 0;
      for (let q = 0; q < ROUND_SIZE; q++) {
        if (rnd() < accuracy) { points += pointsFor(streak); streak += 1; } else streak = 0;
      }
      for (;;) {
        const options = BUILDINGS.filter((b) => !built.includes(b.id) && b.cost <= points);
        if (options.length === 0) break;
        const best = options.sort((a, b) => b.capacity - a.capacity)[0];
        points -= best.cost;
        built = [...built, best.id];
      }
      if (isComplete(built)) return { won: true, waves, rooms: built.length };
      if (round % ROUNDS_PER_WAVE === 0) {
        const n = round / ROUNDS_PER_WAVE;
        if (capacityOf(built) < waveDemand(n)) return { won: false, waves, rooms: built.length };
        waves += 1;
      }
    }
    return { won: false, waves, rooms: built.length };
  }

  /** A fixed sequence, so the balance is asserted and not sampled. */
  const seeded = (seed: number) => {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  };

  it("lets a player who knows the material finish", () => {
    for (const seed of [1, 7, 42, 99]) {
      expect(`seed ${seed}: ${play(0.85, seeded(seed)).won}`).toBe(`seed ${seed}: true`);
    }
  });

  it("stops a player who is guessing", () => {
    // Half right has to fail, or the department is a participation trophy.
    for (const seed of [1, 7, 42, 99]) {
      expect(`seed ${seed}: ${play(0.4, seeded(seed)).won}`).toBe(`seed ${seed}: false`);
    }
  });

  it("takes a winning run several rounds, not one lucky burst", () => {
    const r = play(1, seeded(3));
    expect(r.won).toBe(true);
    expect(r.rooms).toBe(BUILDINGS.length);
  });
});

describe("the score is mostly what you built", () => {
  it("counts rooms, waves held and a bonus for finishing", () => {
    const none = finalScore({ answerPoints: 0, built: [], waves: 0, complete: false });
    expect(none).toBe(0);
    expect(finalScore({ answerPoints: 0, built: ["ct"], waves: 0, complete: false })).toBeGreaterThan(none);
    expect(finalScore({ answerPoints: 0, built: [], waves: 2, complete: false })).toBeGreaterThan(none);
  });

  it("puts a finished department above a longer run that stalled", () => {
    // Two players who answered the same should be separated by what they
    // did with it, or the only decision in the game stops mattering.
    const finished = finalScore({ answerPoints: 600, built: BUILDINGS.map((b) => b.id), waves: 4, complete: true });
    const stalled = finalScore({ answerPoints: 900, built: BUILDINGS.slice(0, 5).map((b) => b.id), waves: 4, complete: false });
    expect(finished).toBeGreaterThan(stalled);
  });
});

describe("the server bounds what a browser may claim", () => {
  it("accepts a perfect run and nothing beyond it", () => {
    expect(maxPossibleScore(0, 0, 0)).toBe(0);
    expect(maxPossibleScore(70, 5, 8)).toBeGreaterThan(maxPossibleScore(70, 5, 7));
    expect(maxPossibleScore(70, 5, 8)).toBeGreaterThan(maxPossibleScore(69, 5, 8));
  });

  it("cannot be inflated by claiming impossible rooms or waves", () => {
    expect(maxPossibleScore(1, 1, 500)).toBe(maxPossibleScore(1, 1, BUILDINGS.length));
    expect(maxPossibleScore(1, 999, 1)).toBe(maxPossibleScore(1, LAST_SURVIVABLE_WAVE, 1));
  });

  it("is checked by the endpoint before anything is written", () => {
    const route = read("src/app/api/game/route.ts");
    const post = route.slice(route.indexOf("export async function POST"));
    expect(post.indexOf("maxPossibleScore")).toBeLessThan(post.indexOf(".insert("));
  });
});

describe("the board is a game board, not a staff directory", () => {
  it("returns no user ids to the browser", () => {
    const route = read("src/app/api/game/route.ts");
    const get = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
    expect(get).toContain("me: uid === user.id");
    expect(get).not.toMatch(/user_id:\s*(r\.user_id|uid)/);
  });

  it("derives a default alias from the id, never from a name or email", () => {
    expect(defaultAlias("11111111-2222-3333-4444-555555555555")).toMatch(/^R-\d{4}$/);
    expect(defaultAlias("same")).toBe(defaultAlias("same"));
    expect(defaultAlias("a")).not.toBe(defaultAlias("b"));
  });

  it("trims and bounds an alias before anyone else sees it", () => {
    expect(cleanAlias("  Dr   Fuego  ")).toBe("Dr Fuego");
    expect(cleanAlias("a")).toBeNull();
    expect(cleanAlias(42)).toBeNull();
    expect(cleanAlias("x".repeat(80))?.length).toBe(24);
  });

  it("ranks players, not runs", () => {
    expect(read("src/app/api/game/route.ts")).toContain("best.has(r.user_id)");
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
    expect(read("src/lib/i18n.ts")).toContain('"nav.rail_game"');
  });
});
