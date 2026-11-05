"use client";

// The game's strings, registered where they are used.
import "@/lib/i18n-game";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2, Trophy, Coins, Zap, Play, RotateCcw, Hammer, Waves, CheckCircle2, ArrowRight,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import { buildRun, shuffled, TOPICS, type QuizLang, type QuizQuestion } from "@/lib/game-questions";
import {
  BUILDINGS, ROUND_SIZE, ROUNDS_PER_WAVE, STARTING_POINTS, TOTAL_CAPACITY,
  capacityOf, costOf, finalScore, isComplete, pointsFor, waveDemand, waveNumber,
  type Glyph,
} from "@/lib/game-build";
import type { Leaderboard } from "@/lib/game-alias";
import { drawPlan, type WaveView } from "./game-plan";

/** What the board is doing right now. */
type Stage = "idle" | "round" | "build" | "wave" | "over" | "won";

/** How long the wave animation runs before the verdict stands. */
const WAVE_MS = 2600;

/**
 * Build the department.
 *
 * Rounds of seven questions pay points, points put rooms up, and every two
 * rounds a wave of demand arrives that the rooms either absorb or do not.
 * Finish the department and the run is won.
 *
 * What the earlier attempts got wrong, and this is built to avoid: the
 * radiology was a currency generator for a game happening beside it. Here
 * answering is the ONLY thing that builds, the thing built is on screen the
 * whole time, and a wave is decided purely by what was accumulated — no
 * clock, no aim, no reflex anywhere. Losing always has one cause, and the
 * number that causes it is printed a round before it arrives.
 */
export function GameTab() {
  const t = useT();
  const { prefs } = useUIPrefs();
  const lang = ((prefs.uiLanguage || "es") as QuizLang);

  const [stage, setStage] = useState<Stage>("idle");
  const [topics, setTopics] = useState<string[]>([]);

  const [points, setPoints] = useState(STARTING_POINTS);
  const [built, setBuilt] = useState<Glyph[]>([]);
  const [rounds, setRounds] = useState(0);
  const [wavesHeld, setWavesHeld] = useState(0);
  const [selected, setSelected] = useState<Glyph | null>(null);

  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [options, setOptions] = useState<{ text: string; correct: boolean }[]>([]);
  const [inRound, setInRound] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [asked, setAsked] = useState(0);
  const [verdict, setVerdict] = useState<{ ok: boolean; answer: string; source: string } | null>(null);

  const [wave, setWave] = useState<WaveView | null>(null);
  const [score, setScore] = useState(0);

  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [alias, setAlias] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runRef = useRef<QuizQuestion[]>([]);
  const cursorRef = useRef(0);
  const rafRef = useRef(0);
  const viewRef = useRef({ built: [] as Glyph[], points: 0, selected: null as Glyph | null, wave: null as WaveView | null, time: 0 });
  const statsRef = useRef({ answerPoints: 0, correct: 0, asked: 0, startedAt: 0 });

  const capacity = capacityOf(built);
  const nextWave = waveNumber(rounds) + 1;
  const demand = waveDemand(nextWave);

  /* ── Board ───────────────────────────────────────────────────────── */

  const loadBoard = useCallback(() => {
    fetch("/api/game")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Leaderboard | null) => {
        if (!d) return;
        setBoard(d);
        setAlias((prev) => prev || d.alias || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const saveAlias = useCallback(() => {
    if (alias.trim().length < 2) return;
    fetch("/api/game", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: alias.trim() }),
    }).then(() => loadBoard()).catch(() => {});
  }, [alias, loadBoard]);

  const submit = useCallback((total: number, rooms: Glyph[], held: number) => {
    const s = statsRef.current;
    if (s.correct === 0) { setSaveState("idle"); return; }
    setSaveState("saving");
    fetch("/api/game", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: total,
        correct: s.correct,
        wave: held,
        // The column is called integrity; what it carries now is how much of
        // the department got built, as a percentage.
        integrity: Math.round((capacityOf(rooms) / TOTAL_CAPACITY) * 100),
        durationS: Math.round((Date.now() - s.startedAt) / 1000),
      }),
    })
      .then((r) => { setSaveState(r.ok ? "saved" : "failed"); if (r.ok) loadBoard(); })
      .catch(() => setSaveState("failed"));
  }, [loadBoard]);

  /* ── Questions ───────────────────────────────────────────────────── */

  const nextQuestion = useCallback(() => {
    const run = runRef.current;
    if (run.length === 0) return;
    if (cursorRef.current >= run.length) {
      runRef.current = buildRun(topics.length ? topics : undefined);
      cursorRef.current = 0;
    }
    const q = runRef.current[cursorRef.current++];
    setQuestion(q);
    // Shuffled per question, or the right answer sits wherever the bank
    // happened to write it and the player reads positions, not radiology.
    setOptions(shuffled(q.options).map((o) => ({ text: o.t[lang], correct: o.correct })));
    setVerdict(null);
  }, [lang, topics]);

  const nextQuestionRef = useRef(nextQuestion);
  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const answer = useCallback((picked: { text: string; correct: boolean }) => {
    if (verdict) return;
    const s = statsRef.current;
    s.asked += 1;
    setAsked(s.asked);

    const right = question?.options.find((o) => o.correct);
    if (picked.correct) {
      const paid = pointsFor(streak);
      s.correct += 1;
      s.answerPoints += paid;
      setCorrect(s.correct);
      setStreak((n) => n + 1);
      setRoundPoints((n) => n + paid);
      setPoints((n) => n + paid);
      setVerdict({ ok: true, answer: `+${paid}`, source: question?.source || "" });
    } else {
      setStreak(0);
      setVerdict({ ok: false, answer: right ? right.t[lang] : "", source: question?.source || "" });
    }
  }, [lang, question, streak, verdict]);

  /** Moves on from the verdict: another question, or the end of the round. */
  const advance = useCallback(() => {
    const done = inRound + 1;
    if (done >= ROUND_SIZE) {
      setInRound(0);
      setRounds((n) => n + 1);
      setStage("build");
      setVerdict(null);
      return;
    }
    setInRound(done);
    nextQuestionRef.current();
  }, [inRound]);

  /* ── Build and waves ─────────────────────────────────────────────── */

  const buildRoom = useCallback((id: Glyph) => {
    if (built.includes(id)) return;
    const cost = costOf(id);
    if (points < cost) return;
    const after = [...built, id];
    setPoints((n) => n - cost);
    setBuilt(after);
    setSelected(null);
    if (isComplete(after)) {
      const total = finalScore({ answerPoints: statsRef.current.answerPoints, built: after, waves: wavesHeld, complete: true });
      setScore(total);
      setStage("won");
      submit(total, after, wavesHeld);
    }
  }, [built, points, submit, wavesHeld]);

  const runWave = useCallback(() => {
    const n = waveNumber(rounds);
    const held = capacityOf(built) >= waveDemand(n);
    setWave({ n, demand: waveDemand(n), progress: 0, held });
    setStage("wave");

    const started = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - started) / WAVE_MS);
      setWave((w) => (w ? { ...w, progress: p } : w));
      if (p < 1) { requestAnimationFrame(step); return; }
      if (held) {
        setWavesHeld((k) => k + 1);
        setWave(null);
        setStage("round");
        nextQuestionRef.current();
      } else {
        const total = finalScore({ answerPoints: statsRef.current.answerPoints, built, waves: wavesHeld, complete: false });
        setScore(total);
        setStage("over");
        submit(total, built, wavesHeld);
      }
    };
    requestAnimationFrame(step);
  }, [built, rounds, submit, wavesHeld]);

  const continueFromBuild = useCallback(() => {
    if (rounds % ROUNDS_PER_WAVE === 0) { runWave(); return; }
    setStage("round");
    nextQuestionRef.current();
  }, [rounds, runWave]);

  /* ── The plan ────────────────────────────────────────────────────── */

  useEffect(() => {
    viewRef.current = { built, points, selected, wave, time: viewRef.current.time };
  }, [built, points, selected, wave]);

  useEffect(() => {
    if (stage === "idle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();
    const labels = Object.fromEntries(BUILDINGS.map((b) => [b.id, t(`game.room_${b.id}`)])) as Record<Glyph, string>;
    const step = (now: number) => {
      rafRef.current = requestAnimationFrame(step);
      viewRef.current.time += Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = canvas.getContext("2d");
      if (!ctx || w === 0) return;
      drawPlan(ctx, {
        ...viewRef.current,
        labels,
        dark: document.documentElement.classList.contains("dark"),
      }, w, h);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [stage, t]);

  const onCanvasTap = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage !== "build") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const hit = BUILDINGS.find((b) =>
      !built.includes(b.id) &&
      x >= b.plot.x && x <= b.plot.x + b.plot.w &&
      y >= b.plot.y && y <= b.plot.y + b.plot.h);
    setSelected(hit ? hit.id : null);
  };

  /* ── Lifecycle ───────────────────────────────────────────────────── */

  const start = useCallback(() => {
    const run = buildRun(topics.length ? topics : undefined);
    if (run.length === 0) return;
    runRef.current = run;
    cursorRef.current = 0;
    statsRef.current = { answerPoints: 0, correct: 0, asked: 0, startedAt: Date.now() };
    setPoints(STARTING_POINTS); setBuilt([]); setRounds(0); setWavesHeld(0);
    setInRound(0); setRoundPoints(0); setStreak(0); setCorrect(0); setAsked(0);
    setSelected(null); setWave(null); setVerdict(null); setSaveState("idle"); setScore(0);
    setStage("round");
    nextQuestionRef.current();
  }, [topics]);

  const toggleTopic = (topic: string) =>
    setTopics((p) => (p.includes(topic) ? p.filter((x) => x !== topic) : [...p, topic]));

  const accuracy = asked > 0 ? Math.round((correct / asked) * 100) : 0;
  const playing = stage !== "idle" && stage !== "over" && stage !== "won";

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div className="space-y-3 pb-4">
      <header>
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-brand" /> {t("game.title")}
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t("game.subtitle")}</p>
      </header>

      {stage === "idle" && (
        <>
          <div className="rounded-lg border border-[hsl(var(--border))] p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{t("game.how")}</p>
            {[t("game.how_round"), t("game.how_build"), t("game.how_wave"), t("game.how_win")].map((line) => (
              <p key={line} className="text-[11px] text-gray-600 dark:text-gray-300 flex gap-1.5">
                <span className="text-brand">•</span>{line}
              </p>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{t("game.topics")}</p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setTopics([])}
                className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                  topics.length === 0 ? "bg-brand text-white border-brand" : "border-[hsl(var(--border))] text-gray-600 dark:text-gray-300"}`}>
                {t("game.all_topics")}
              </button>
              {TOPICS.map((topic) => (
                <button key={topic} type="button" onClick={() => toggleTopic(topic)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                    topics.includes(topic) ? "bg-brand text-white border-brand" : "border-[hsl(var(--border))] text-gray-600 dark:text-gray-300"}`}>
                  {t(`game.t_${topic}`)}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={start} className="w-full gap-1.5"><Play className="h-4 w-4" />{t("game.start")}</Button>
        </>
      )}

      {playing && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { icon: Coins, label: t("game.points"), value: String(points), tone: "text-amber-600 dark:text-amber-400" },
              { icon: Building2, label: t("game.capacity"), value: `${capacity}`, tone: "text-sky-600 dark:text-sky-400" },
              { icon: Waves, label: t("game.next_wave"), value: `${demand}`, tone: capacity >= demand ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
              { icon: Zap, label: t("game.streak"), value: String(streak), tone: "text-violet-600 dark:text-violet-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-[hsl(var(--border))] px-1.5 py-1 text-center">
                <s.icon className={`h-3 w-3 mx-auto ${s.tone}`} />
                <p className={`text-[12px] font-bold leading-tight ${s.tone}`}>{s.value}</p>
                <p className="text-[8px] uppercase tracking-wide text-gray-400 leading-none">{s.label}</p>
              </div>
            ))}
          </div>

          <canvas
            ref={canvasRef}
            onPointerDown={onCanvasTap}
            className="w-full h-[min(46vh,360px)] rounded-lg border border-[hsl(var(--border))] block touch-manipulation"
          />

          {stage === "round" && (
            <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] p-2.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                <span>{t("game.question")} {inRound + 1}/{ROUND_SIZE}</span>
                <span>+{roundPoints}</span>
              </div>
              <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-snug">{question?.q[lang]}</p>

              {!verdict ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {options.map((o) => (
                    <button key={o.text} type="button" onClick={() => answer(o)}
                      className="text-left text-[11px] leading-snug rounded-md border border-[hsl(var(--border))]
                                 bg-[hsl(var(--card))] px-2 py-2 min-h-[38px] transition-colors
                                 hover:border-brand hover:bg-brand/5 active:bg-brand/10 text-gray-800 dark:text-gray-100">
                      {o.text}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`rounded-md border p-2 ${verdict.ok
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30"}`}>
                  {verdict.ok ? (
                    <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">{verdict.answer} {t("game.points")}</p>
                  ) : (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">{t("game.correct_was")}</p>
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-snug mt-0.5">{verdict.answer}</p>
                    </>
                  )}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t("game.source")}: {verdict.source}</p>
                  <Button size="sm" onClick={advance} className="h-7 text-[11px] gap-1 mt-2 w-full">
                    {t("game.next")} <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {stage === "build" && (
            <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 space-y-2">
              <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                <Hammer className="h-3.5 w-3.5 text-brand" /> {t("game.build_phase")}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {rounds % ROUNDS_PER_WAVE === 0 ? t("game.wave_next_hint") : t("game.round_next_hint")}
              </p>

              {selected ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-800 dark:text-gray-100 flex-1">
                    {t(`game.room_${selected}`)} · {costOf(selected)} · +{BUILDINGS.find((b) => b.id === selected)?.capacity}
                  </span>
                  <Button size="sm" onClick={() => buildRoom(selected)} disabled={points < costOf(selected)}
                    className="h-7 text-[10px] gap-1">
                    <Hammer className="h-3 w-3" />{t("game.build")}
                  </Button>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">{t("game.tap_plot")}</p>
              )}

              <Button size="sm" variant="outline" onClick={continueFromBuild} className="h-8 text-[11px] w-full gap-1.5">
                {rounds % ROUNDS_PER_WAVE === 0 ? <Waves className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                {rounds % ROUNDS_PER_WAVE === 0 ? `${t("game.face_wave")} ${waveNumber(rounds)}` : t("game.next_round")}
              </Button>
            </div>
          )}

          {stage === "wave" && wave && (
            <div className="rounded-lg border border-[hsl(var(--border))] p-2.5 text-center">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{t("game.wave")} {wave.n}</p>
              <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-100 mt-0.5">
                {t("game.capacity")} {capacity} · {t("game.demand")} {wave.demand}
              </p>
            </div>
          )}
        </>
      )}

      {(stage === "over" || stage === "won") && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-4 text-center space-y-3">
          <p className={`text-[11px] font-bold uppercase tracking-wide ${stage === "won" ? "text-emerald-600" : "text-rose-500"}`}>
            {stage === "won" ? t("game.won") : t("game.over")}
          </p>
          {stage === "won" && <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />}
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{score}</p>
          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
            {[
              [t("game.rooms"), `${built.length}/${BUILDINGS.length}`],
              [t("game.waves_held"), String(wavesHeld)],
              [t("game.correct"), `${correct}/${asked}`],
              [t("game.accuracy"), `${accuracy}%`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md bg-[hsl(var(--muted)/0.5)] py-1.5">
                <p className="text-gray-500 dark:text-gray-400 text-[9px]">{k}</p>
                <p className="font-bold text-gray-900 dark:text-white">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 h-3">
            {saveState === "saving" && t("game.saving")}
            {saveState === "saved" && t("game.saved")}
            {saveState === "failed" && t("game.save_failed")}
          </p>
          <div className="flex gap-2">
            <Button onClick={start} className="flex-1 gap-1.5"><RotateCcw className="h-4 w-4" />{t("game.play_again")}</Button>
            <Button variant="outline" onClick={() => setStage("idle")} className="flex-1">{t("game.topics")}</Button>
          </div>
        </div>
      )}

      {!playing && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" /> {t("game.board")}
            </p>
            {board?.myRank && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {t("game.rank")} #{board.myRank} · {board.myBest}
              </span>
            )}
          </div>

          <div className="flex items-end gap-1.5">
            <div className="flex-1">
              <label className="text-[10px] text-gray-500 dark:text-gray-400">{t("game.alias")}</label>
              <Input value={alias} onChange={(e) => setAlias(e.target.value)} maxLength={24} className="h-7 text-xs mt-0.5" />
            </div>
            <Button size="sm" variant="outline" onClick={saveAlias} className="h-7 text-[10px]">{t("game.alias_save")}</Button>
          </div>
          <p className="text-[9px] text-gray-400 leading-snug">{t("game.alias_hint")}</p>

          {board && board.top.length > 0 ? (
            <ol className="space-y-0.5">
              {board.top.map((row) => (
                <li key={`${row.rank}-${row.alias}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded text-[11px] ${
                      row.me ? "bg-brand/10 font-semibold text-brand" : "text-gray-700 dark:text-gray-300"}`}>
                  <span className="w-5 text-right tabular-nums text-gray-400">{row.rank}</span>
                  <span className="flex-1 truncate">{row.alias}{row.me ? ` (${t("game.you")})` : ""}</span>
                  <span className="text-[9px] text-gray-400 tabular-nums">{t("game.wave_short")}{row.wave}</span>
                  <span className="tabular-nums font-bold">{row.score}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[10px] text-gray-400 py-2 text-center">{t("game.board_empty")}</p>
          )}
        </div>
      )}
    </div>
  );
}
