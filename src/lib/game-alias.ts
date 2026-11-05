/**
 * Who a score belongs to on the leaderboard.
 *
 * The board shows an ALIAS, never a name, an email or a hospital. A board
 * that named people would turn a revision game into a comparison between
 * identified radiologists, visible to whoever opens the tab — which is the
 * one thing the productivity rules in this product exist to prevent.
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
