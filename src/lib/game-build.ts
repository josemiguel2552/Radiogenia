/**
 * Build the department: the rules, with no canvas and no React in them.
 *
 * A run is rounds of seven questions. Each correct answer pays, the payment
 * buys rooms, and every two rounds the department is tested by a wave of
 * demand. Capacity at least matching the demand holds it; short of it, the
 * run is over. Finish the whole department and you have won.
 *
 * The point of this shape, after several that did not work: nothing is
 * bolted on. There is no clock, no aiming and no reflex anywhere — a wave is
 * decided entirely by what you accumulated, so losing always has the same
 * cause and it is one the player can see coming. The questions are not a
 * currency generator for a separate game; they are the only thing that
 * builds the hospital, and the hospital is on screen the whole time.
 */

export type Glyph = "xray" | "us" | "ct" | "mri" | "mammo" | "report" | "pacs" | "ir";

export interface Building {
  id: Glyph;
  cost: number;
  /** How much demand this room absorbs when a wave arrives. */
  capacity: number;
  /** Where it sits on the floor plan, in fractions of the canvas. */
  plot: { x: number; y: number; w: number; h: number };
}

/* A corridor runs down the middle; rooms open off it, four to a side. */
const L = 0.055;
const R = 0.565;
const W = 0.38;
const H = 0.195;
const ROWS = [0.055, 0.285, 0.515, 0.745];

/**
 * The department, in the order it is listed to the player.
 *
 * Capacity per point RISES with price, and that is the whole decision. A
 * big machine is the efficient buy, but saving for it means going into a
 * wave with the capacity you had rather than the capacity you could have
 * had — so the right answer depends on the demand you can already see.
 * Priced the other way round, buying the cheapest room every time would
 * always be correct and there would be nothing to think about.
 */
export const BUILDINGS: Building[] = [
  { id: "xray",   cost: 40,  capacity: 8,  plot: { x: L, y: ROWS[0], w: W, h: H } },
  { id: "us",     cost: 60,  capacity: 13, plot: { x: R, y: ROWS[0], w: W, h: H } },
  { id: "report", cost: 70,  capacity: 16, plot: { x: L, y: ROWS[1], w: W, h: H } },
  { id: "mammo",  cost: 90,  capacity: 22, plot: { x: R, y: ROWS[1], w: W, h: H } },
  { id: "ct",     cost: 110, capacity: 28, plot: { x: L, y: ROWS[2], w: W, h: H } },
  { id: "pacs",   cost: 130, capacity: 35, plot: { x: R, y: ROWS[2], w: W, h: H } },
  { id: "ir",     cost: 150, capacity: 42, plot: { x: L, y: ROWS[3], w: W, h: H } },
  { id: "mri",    cost: 160, capacity: 47, plot: { x: R, y: ROWS[3], w: W, h: H } },
];

export const TOTAL_COST = BUILDINGS.reduce((n, b) => n + b.cost, 0);
export const TOTAL_CAPACITY = BUILDINGS.reduce((n, b) => n + b.capacity, 0);

/* ── The rhythm ──────────────────────────────────────────────────────── */

/** Questions in a round. */
export const ROUND_SIZE = 7;
/** Rounds between waves. */
export const ROUNDS_PER_WAVE = 2;

/**
 * The grant the department opens with.
 *
 * Enough to put one room up before the first wave whatever the first round
 * did. Without it, two unlucky rounds ended a run before the player had
 * seen what the game was — losing at wave one teaches nothing except that
 * the dice were against you.
 */
export const STARTING_POINTS = 50;

/**
 * What wave n asks of the department.
 *
 * Deliberately a straight line, and deliberately printed on screen a round
 * before it arrives. A player who is going to lose should be able to see it
 * coming and spend accordingly — losing to a number you were shown is a
 * lesson; losing to one you were not is a trick.
 */
export function waveDemand(n: number): number {
  return 14 + (Math.max(1, n) - 1) * 31;
}

/** The last wave the finished department could still hold. */
export const LAST_SURVIVABLE_WAVE = (() => {
  let n = 1;
  while (waveDemand(n + 1) <= TOTAL_CAPACITY) n += 1;
  return n;
})();

/* ── What a question pays ────────────────────────────────────────────── */

export const BASE_POINTS = 12;
/** Each consecutive correct answer inside a round adds this. */
export const STREAK_BONUS = 2;
export const MAX_POINTS = 24;

/**
 * What one correct answer pays.
 *
 * Nothing here looks at the clock. This is a revision tool: timing a
 * question measures reading speed, not radiology. The only thing rewarded
 * is a run of right answers, which rewards being sure — and being sure is
 * the thing worth practising.
 */
export function pointsFor(streak: number): number {
  return Math.min(MAX_POINTS, BASE_POINTS + Math.max(0, streak) * STREAK_BONUS);
}

/** The most a round of seven perfect answers can pay. */
export const PERFECT_ROUND = Array.from({ length: ROUND_SIZE }, (_, i) => pointsFor(i))
  .reduce((a, b) => a + b, 0);

/* ── The run ─────────────────────────────────────────────────────────── */

export interface RunState {
  /** Ids of the rooms already built. */
  built: Glyph[];
  points: number;
  /** Rounds finished, across the whole run. */
  rounds: number;
  /** Waves held so far. */
  waves: number;
}

export function capacityOf(built: readonly Glyph[]): number {
  return BUILDINGS.filter((b) => built.includes(b.id)).reduce((n, b) => n + b.capacity, 0);
}

export function costOf(id: Glyph): number {
  return BUILDINGS.find((b) => b.id === id)?.cost ?? 0;
}

/** Whether the next thing to happen is a wave rather than another round. */
export function waveIsNext(rounds: number): boolean {
  return rounds > 0 && rounds % ROUNDS_PER_WAVE === 0;
}

/** Which wave a run of this many finished rounds is facing. */
export function waveNumber(rounds: number): number {
  return Math.floor(rounds / ROUNDS_PER_WAVE);
}

export function isComplete(built: readonly Glyph[]): boolean {
  return built.length === BUILDINGS.length;
}

/* ── The score ───────────────────────────────────────────────────────── */

export const POINTS_PER_WAVE_HELD = 250;
export const POINTS_PER_ROOM = 120;
export const COMPLETION_BONUS = 600;

/**
 * The run's score.
 *
 * Weighted toward the department rather than the questions: two players who
 * answered the same number correctly should be separated by what they did
 * with it, because deciding what to build is the only decision the game
 * asks for and a score that ignored it would make the decision pointless.
 */
export function finalScore(run: {
  answerPoints: number;
  built: readonly Glyph[];
  waves: number;
  complete: boolean;
}): number {
  return Math.round(
    run.answerPoints +
      run.waves * POINTS_PER_WAVE_HELD +
      run.built.length * POINTS_PER_ROOM +
      (run.complete ? COMPLETION_BONUS : 0),
  );
}

/**
 * The most a run of this shape could have scored.
 *
 * The browser keeps the score, so the browser can lie about it. This does
 * not make it honest; it bounds it to something the stated run could have
 * produced, which is the difference between a leaderboard and a text field.
 */
export function maxPossibleScore(correct: number, waves: number, rooms: number): number {
  const clampedRooms = Math.max(0, Math.min(BUILDINGS.length, Math.round(rooms)));
  return finalScore({
    answerPoints: Math.max(0, correct) * MAX_POINTS,
    built: BUILDINGS.slice(0, clampedRooms).map((b) => b.id),
    waves: Math.max(0, Math.min(LAST_SURVIVABLE_WAVE, Math.round(waves))),
    complete: clampedRooms === BUILDINGS.length,
  });
}
