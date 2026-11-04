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

/* ── The department ───────────────────────────────────────────────────── */

/* ── The base ─────────────────────────────────────────────────────────── */

export const MAX_INTEGRITY = 100;
/** What a wrong answer costs the hospital. Ten per cent heavier than it was. */
export const WRONG_ANSWER_DAMAGE = 10;
/** The backlog one unimaged arrival leaves, before their own weight. */
export const LEAK_LOAD = 8;
/**
 * What installing a scanner gives back.
 *
 * A scanner is capacity, and capacity is what the hospital was short of. It
 * also gives a player who is losing a route back that is not "answer faster"
 * — which, in a revision game, would only ever mean "guess".
 */
export const BUILD_HEAL = 10;

/* ── The economy ──────────────────────────────────────────────────────── */

export const SCANNER_COST = 20;
export const UPGRADE_COST = 30;
export const MAX_SCANNER_LEVEL = 3;
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
/**
 * How hard wave N is.
 *
 * Every dial is ten per cent harsher than the previous tuning: more people
 * arrive, each needs more imaging, they walk faster and they arrive closer
 * together. The speed ceiling moved up with the rest but is still a ceiling,
 * because a wave that crosses faster than a question can be read stops being
 * a quiz and becomes a reflex test.
 */
export function waveSpec(wave: number): WaveSpec {
  return {
    wave,
    count: 3 + Math.floor(wave * 1.54),
    hp: Math.round((10 + (wave - 1) * 7) * 1.1),
    // Fractions of one corridor per second.
    speed: Math.min(0.064, 0.0231 + (wave - 1) * 0.0033),
    gap: Math.max(0.5, 1.45 - (wave - 1) * 0.073),
  };
}

/* ── How long a question stands ───────────────────────────────────────── */

/** The clock a short question gets, in seconds. */
export const QUESTION_BASE_S = 14;

/**
 * The clock this particular question deserves.
 *
 * A fixed timer punishes the questions that are worth the most: the ones
 * whose stem names three findings, or whose four options are full sentences
 * rather than "LR-5". The player is not slower on those, they simply have
 * more to read, and a timer that cannot tell the difference is measuring
 * reading speed instead of radiology.
 *
 * Two steps rather than a smooth curve, so the clock is predictable: a long
 * stem buys two seconds, long options buy one more.
 */
export function questionSeconds(stemChars: number, optionChars: number): number {
  let seconds = QUESTION_BASE_S;
  if (stemChars > 58) seconds += 2;
  if (optionChars > 110) seconds += 1;
  return seconds;
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
