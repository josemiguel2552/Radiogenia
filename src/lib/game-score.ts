/**
 * Radiology Defense: the economy, the wave curve and the score.
 *
 * Kept out of the component so the balance can be read, tested and tuned
 * without a canvas — and so the server can apply the same ceiling the client
 * does when it decides whether a submitted score was reachable.
 */

export interface LeaderRow {
  rank: number;
  alias: string;
  score: number;
  wave: number;
  /** True for the signed-in player's own row. No user ids reach the browser. */
  me: boolean;
}

export interface Leaderboard {
  top: LeaderRow[];
  myBest: number | null;
  myRank: number | null;
  alias: string | null;
}

export interface RunResult {
  score: number;
  correct: number;
  wave: number;
  integrity: number;
  durationS: number;
}

/* ── The base ─────────────────────────────────────────────────────────── */

export const MAX_INTEGRITY = 100;
/** What a wrong answer costs the base. */
export const WRONG_ANSWER_DAMAGE = 9;
/** What one enemy reaching the base costs, before its own weight. */
export const LEAK_DAMAGE = 7;

/* ── The economy ──────────────────────────────────────────────────────── */

export const TURRET_COST = 20;
export const UPGRADE_COST = 30;
export const MAX_TURRET_LEVEL = 3;
export const STARTING_CREDITS = 40;

/**
 * What a correct answer pays.
 *
 * The streak is the whole incentive to be sure rather than fast: guessing
 * resets the multiplier AND damages the base, so a player who waits to know
 * out-builds one who taps. Speed adds a little on top so that knowing it cold
 * still beats knowing it slowly.
 */
export function creditsFor(streak: number, secondsLeft: number): number {
  const multiplier = Math.min(1 + streak * 0.2, 2.5);
  return Math.round(10 * multiplier + Math.max(0, Math.min(6, secondsLeft)));
}

/* ── The wave curve ───────────────────────────────────────────────────── */

export interface WaveSpec {
  wave: number;
  count: number;
  hp: number;
  /** Fraction of the path travelled per second. */
  speed: number;
  /** Seconds between spawns. */
  gap: number;
}

/**
 * How hard wave N is.
 *
 * Count and health climb steadily; speed climbs slowly and flattens, because
 * a wave that outruns the time it takes to read a question stops being a
 * quiz and becomes a reflex test. The ceiling is deliberate.
 */
export function waveSpec(wave: number): WaveSpec {
  return {
    wave,
    count: 3 + Math.floor(wave * 1.4),
    hp: 10 + (wave - 1) * 7,
    speed: Math.min(0.075, 0.028 + (wave - 1) * 0.004),
    gap: Math.max(0.55, 1.6 - (wave - 1) * 0.08),
  };
}

/* ── The score ────────────────────────────────────────────────────────── */

export const POINTS_PER_CORRECT = 50;
export const MAX_ANSWER_MULTIPLIER = 3;
export const POINTS_PER_WAVE = 100;
export const POINTS_PER_INTEGRITY = 5;

/** What one correct answer is worth, given the streak it continues. */
export function answerPoints(streak: number): number {
  return Math.round(POINTS_PER_CORRECT * Math.min(1 + streak * 0.25, MAX_ANSWER_MULTIPLIER));
}

/**
 * The run's final score: how long the base held, and how well it was defended.
 *
 * Survival and accuracy are not added as separate terms because they are not
 * independent — a wrong answer damages the base, so accuracy already buys
 * waves. Counting it twice would make one good streak worth more than a whole
 * extra wave, and the board would stop being about surviving.
 */
export function finalScore(opts: { answerScore: number; wavesCleared: number; integrity: number }): number {
  return Math.round(
    opts.answerScore +
      opts.wavesCleared * POINTS_PER_WAVE +
      Math.max(0, opts.integrity) * POINTS_PER_INTEGRITY,
  );
}

/**
 * The most a run of this shape could possibly have scored.
 *
 * The browser keeps the score, so the browser can lie about it. This does not
 * make it honest; it bounds it. A claim has to be one that the stated number
 * of correct answers, waves and remaining integrity could actually produce,
 * which is the difference between a leaderboard and a text field.
 */
export function maxPossibleScore(correct: number, wave: number, integrity: number): number {
  const bestAnswers = correct * POINTS_PER_CORRECT * MAX_ANSWER_MULTIPLIER;
  return finalScore({
    answerScore: bestAnswers,
    wavesCleared: Math.max(0, wave),
    integrity: Math.min(MAX_INTEGRITY, Math.max(0, integrity)),
  });
}

/* ── Identity on the board ────────────────────────────────────────────── */

/** Aliases are shown to other players, so they are trimmed and bounded. */
export function cleanAlias(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const alias = raw.trim().replace(/\s+/g, " ").slice(0, 24);
  return alias.length >= 2 ? alias : null;
}

/**
 * A default alias for a player who has not picked one.
 *
 * Built from the user id rather than their name or email: the board must not
 * become a directory of who works where, and a default that leaked a real
 * identity would do exactly that for everyone who never opens the settings.
 */
export function defaultAlias(userId: string): string {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `R-${String(h % 10000).padStart(4, "0")}`;
}
