import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toErrorResponse, dbErrorResponse } from "@/lib/api-error";
import { cleanAlias, defaultAlias, maxPossibleScore, type LeaderRow } from "@/lib/game-score";

export const dynamic = "force-dynamic";

/** How many rows the board shows. */
const TOP_N = 20;
/** Rows pulled to rank from. Enough for a real board, bounded so one player
 *  with a thousand runs cannot make the query unbounded. */
const SCAN = 2000;

async function aliasFor(service: ReturnType<typeof createServiceClient>, userId: string) {
  const { data } = await service.from("game_profiles").select("alias").eq("user_id", userId).maybeSingle();
  return data?.alias || defaultAlias(userId);
}

/**
 * The board: best run per player, aliases only.
 *
 * Ranking is per PLAYER, not per run — otherwise one good session fills the
 * whole board and nobody else appears on it. The response carries no user
 * ids: a row is an alias, a score, and whether it is yours.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const [{ data: rows, error }, alias] = await Promise.all([
      service
        .from("game_scores")
        .select("user_id, alias, score, wave, created_at")
        .order("score", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(SCAN),
      aliasFor(service, user.id),
    ]);
    if (error) return dbErrorResponse(error);

    const best = new Map<string, { alias: string; score: number; wave: number }>();
    for (const r of rows || []) {
      // Rows arrive best first, so the first one seen for a player is theirs.
      if (!best.has(r.user_id)) best.set(r.user_id, { alias: r.alias, score: r.score, wave: r.wave ?? 0 });
    }
    const ranked = [...best.entries()].sort((a, b) => b[1].score - a[1].score);

    const top: LeaderRow[] = ranked.slice(0, TOP_N).map(([uid, v], i) => ({
      rank: i + 1,
      alias: v.alias,
      score: v.score,
      wave: v.wave,
      me: uid === user.id,
    }));

    const myIndex = ranked.findIndex(([uid]) => uid === user.id);
    return NextResponse.json({
      top,
      myBest: myIndex >= 0 ? ranked[myIndex][1].score : null,
      myRank: myIndex >= 0 ? myIndex + 1 : null,
      alias,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** Saves a finished run, or renames the player. */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const service = createServiceClient();

    // Renaming on its own, from the settings row above the board.
    if (body.alias !== undefined && body.score === undefined) {
      const alias = cleanAlias(body.alias);
      if (!alias) return NextResponse.json({ error: "Invalid alias" }, { status: 400 });
      const { error } = await service
        .from("game_profiles")
        .upsert({ user_id: user.id, alias, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      if (error) return dbErrorResponse(error);
      return NextResponse.json({ alias });
    }

    const score = Number(body.score);
    const correct = Number(body.correct ?? 0);
    const wave = Number(body.wave ?? 0);
    const integrity = Number(body.integrity ?? 0);
    const durationS = Number(body.durationS ?? 0);
    if (!Number.isFinite(score) || score < 0 || !Number.isFinite(correct) || correct < 0) {
      return NextResponse.json({ error: "Invalid score" }, { status: 400 });
    }

    // The browser does the scoring, so the browser can claim anything. This
    // does not make it honest, but it bounds it: a score has to be one that
    // the stated number of correct answers could actually have produced.
    if (score > maxPossibleScore(correct, wave, integrity)) {
      return NextResponse.json({ error: "Score exceeds what that run allows" }, { status: 400 });
    }

    const alias = await aliasFor(service, user.id);
    const { error } = await service.from("game_scores").insert({
      user_id: user.id,
      alias,
      score: Math.round(score),
      correct: Math.round(correct),
      wave: Math.round(wave),
      integrity: Math.round(integrity),
      duration_s: Math.round(durationS),
    });
    if (error) return dbErrorResponse(error);

    return NextResponse.json({ ok: true, alias });
  } catch (error) {
    return toErrorResponse(error);
  }
}
