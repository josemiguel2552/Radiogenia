"use client";

// The game's strings, registered where they are used.
import "@/lib/i18n-game";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Trophy, Coins, Zap, Play, RotateCcw, ChevronUp, Hammer, Waves } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import { buildRun, shuffled, TOPICS, type QuizLang, type QuizQuestion } from "@/lib/game-questions";
import {
  answerPoints, creditsFor, finalScore,
  MAX_INTEGRITY, MAX_TURRET_LEVEL, STARTING_CREDITS, TURRET_COST, UPGRADE_COST, WRONG_ANSWER_DAMAGE,
  type Leaderboard, type RunResult,
} from "@/lib/game-score";
import { World } from "./game-engine";
import { draw } from "./game-render";

type Phase = "idle" | "playing" | "over";

/** How long the right answer and its source stay on screen after a miss. */
const MISS_MS = 2300;
/** How long a question stands before it counts as unanswered. */
const QUESTION_S = 14;

/**
 * Radiology Defense.
 *
 * Waves of findings advance on a hospital. The only way to hold them is to
 * answer: a correct answer pays credits, credits buy turrets, a wrong one
 * takes a bite out of the base. That is the whole design — the quiz is not
 * bolted onto a tower defence, it IS the economy, so there is never a moment
 * where the radiology is the optional part.
 *
 * It plays with one thumb: tap an answer, tap a slot, tap build. No dragging
 * and no aiming, because the point is revising between reports on whatever
 * device is to hand.
 *
 * The simulation and the drawing live in their own modules. React owns the
 * question, the HUD and the board here, and never the sixty frames a second.
 */
export function GameTab() {
  const t = useT();
  const { prefs } = useUIPrefs();
  const lang = ((prefs.uiLanguage || "es") as QuizLang);

  const [phase, setPhase] = useState<Phase>("idle");
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [options, setOptions] = useState<{ text: string; correct: boolean }[]>([]);
  const [miss, setMiss] = useState<{ answer: string; source: string } | null>(null);
  const [topics, setTopics] = useState<string[]>([]);

  const [integrity, setIntegrity] = useState(MAX_INTEGRITY);
  const [credits, setCredits] = useState(STARTING_CREDITS);
  const [wave, setWave] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [asked, setAsked] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  /** The level of the turret on the selected slot, or 0 for an empty one.
   *  Mirrored into state because reading it out of the world ref during
   *  render is exactly the tear concurrent rendering is allowed to produce. */
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_S);
  const [built, setBuilt] = useState(0);
  const [wavesCleared, setWavesCleared] = useState(0);

  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [alias, setAlias] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const runRef = useRef<QuizQuestion[]>([]);
  const cursorRef = useRef(0);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const askedAtRef = useRef(0);
  const lockRef = useRef(false);
  const statsRef = useRef({ answerScore: 0, correct: 0, asked: 0, streak: 0, startedAt: 0, wavesCleared: 0 });
  const creditsRef = useRef(STARTING_CREDITS);
  const selectedRef = useRef<number | null>(null);
  const nextQuestionRef = useRef<() => void>(() => {});
  const answerRef = useRef<(p: { text: string; correct: boolean } | null) => void>(() => {});
  const endRunRef = useRef<() => void>(() => {});

  /* ── Leaderboard ─────────────────────────────────────────────────── */

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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alias: alias.trim() }),
    }).then(() => loadBoard()).catch(() => {});
  }, [alias, loadBoard]);

  const submit = useCallback((result: RunResult) => {
    if (result.correct === 0) { setSaveState("idle"); return; }
    setSaveState("saving");
    fetch("/api/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
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
    // Shuffled per question: otherwise the right answer sits wherever the
    // bank happened to write it, and after three rounds the player is
    // reading positions instead of radiology.
    setOptions(shuffled(q.options).map((o) => ({ text: o.t[lang], correct: o.correct })));
    askedAtRef.current = performance.now();
    setTimeLeft(QUESTION_S);
    lockRef.current = false;
  }, [lang, topics]);

  useEffect(() => { nextQuestionRef.current = nextQuestion; }, [nextQuestion]);

  const endRun = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const s = statsRef.current;
    const integrityLeft = worldRef.current?.integrity ?? 0;
    const total = finalScore({ answerScore: s.answerScore, wavesCleared: s.wavesCleared, integrity: integrityLeft });
    setScore(total);
    setPhase("over");
    submit({
      score: total,
      correct: s.correct,
      wave: s.wavesCleared,
      integrity: integrityLeft,
      durationS: Math.round((Date.now() - s.startedAt) / 1000),
    });
  }, [submit]);

  useEffect(() => { endRunRef.current = endRun; }, [endRun]);

  /** One answer: right, wrong, or the clock running out. */
  const answer = useCallback((picked: { text: string; correct: boolean } | null) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const s = statsRef.current;
    const world = worldRef.current;
    s.asked += 1;
    setAsked(s.asked);

    if (picked?.correct) {
      const secondsLeft = Math.max(0, QUESTION_S - (performance.now() - askedAtRef.current) / 1000);
      s.correct += 1;
      s.answerScore += answerPoints(s.streak);
      s.streak += 1;
      creditsRef.current += creditsFor(s.streak - 1, secondsLeft);
      setCredits(creditsRef.current);
      setCorrect(s.correct);
      setStreak(s.streak);
      nextQuestionRef.current();
      return;
    }

    // A miss costs the base. That is what ties the quiz to the battlefield:
    // not knowing it is not a lost point, it is a breach.
    s.streak = 0;
    setStreak(0);
    world?.damageBase(WRONG_ANSWER_DAMAGE);
    if (world) setIntegrity(world.integrity);
    const right = question?.options.find((o) => o.correct);
    setMiss({ answer: right ? right.t[lang] : "", source: question?.source || "" });
    window.setTimeout(() => {
      setMiss(null);
      if ((worldRef.current?.integrity ?? 0) <= 0) endRunRef.current();
      else nextQuestionRef.current();
    }, MISS_MS);
  }, [lang, question]);

  useEffect(() => { answerRef.current = answer; }, [answer]);

  /* ── Build ───────────────────────────────────────────────────────── */

  const buildOrUpgrade = useCallback(() => {
    const world = worldRef.current;
    if (!world || selected === null) return;
    const existing = world.turretAt(selected);
    if (!existing) {
      if (creditsRef.current < TURRET_COST || !world.build(selected)) return;
      creditsRef.current -= TURRET_COST;
    } else if (existing.level < MAX_TURRET_LEVEL) {
      if (creditsRef.current < UPGRADE_COST || !world.upgrade(selected)) return;
      creditsRef.current -= UPGRADE_COST;
    } else {
      return;
    }
    setCredits(creditsRef.current);
    setSelectedLevel(world.turretAt(selected)?.level ?? 0);
    setBuilt((n) => n + 1);
  }, [selected]);

  /* ── The loop ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (phase !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let w = 0;
    let h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let ended = false;
    lastRef.current = performance.now();
    const step = (now: number) => {
      rafRef.current = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const world = worldRef.current;
      if (!world || w === 0) return;

      world.tick(dt);

      // The question has its own clock. Letting it run out is a miss: a base
      // under attack does not wait for the radiologist to feel ready.
      if (!lockRef.current) {
        const left = QUESTION_S - (now - askedAtRef.current) / 1000;
        setTimeLeft(Math.max(0, left));
        if (left <= 0) answerRef.current(null);
      }

      const ctx = canvas.getContext("2d");
      if (ctx) {
        const dark = document.documentElement.classList.contains("dark");
        draw(ctx, world, w, h, { dark, brand: "" }, selectedRef.current, creditsRef.current);
      }

      if (world.integrity <= 0 && !ended) {
        ended = true;
        endRunRef.current();
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [phase]);

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /* ── Lifecycle ───────────────────────────────────────────────────── */

  const start = useCallback(() => {
    const run = buildRun(topics.length ? topics : undefined);
    if (run.length === 0) return;
    runRef.current = run;
    cursorRef.current = 0;
    statsRef.current = { answerScore: 0, correct: 0, asked: 0, streak: 0, startedAt: Date.now(), wavesCleared: 0 };
    creditsRef.current = STARTING_CREDITS;

    const world = new World({
      onLeak: () => setIntegrity(worldRef.current?.integrity ?? 0),
      onWaveCleared: (cleared) => {
        statsRef.current.wavesCleared = cleared;
        setWavesCleared(cleared);
        // A cleared wave pays a dividend, so holding the line is worth
        // something on its own and not only the answers that bought it.
        creditsRef.current += 15 + cleared * 5;
        setCredits(creditsRef.current);
        window.setTimeout(() => {
          const next = cleared + 1;
          setWave(next);
          worldRef.current?.startWave(next);
        }, 1200);
      },
    });
    worldRef.current = world;
    world.startWave(1);

    setPhase("playing");
    setIntegrity(MAX_INTEGRITY);
    setCredits(STARTING_CREDITS);
    setWave(1); setScore(0); setCorrect(0); setAsked(0); setStreak(0); setWavesCleared(0);
    setSelected(null); setSelectedLevel(0); setMiss(null); setSaveState("idle"); setBuilt(0);
    nextQuestionRef.current();
  }, [topics]);

  const onCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const slot = worldRef.current?.slotNear(
      (e.clientX - r.left) / r.width,
      (e.clientY - r.top) / r.height,
      r.width / r.height,
    ) ?? null;
    setSelected(slot);
    setSelectedLevel(slot === null ? 0 : worldRef.current?.turretAt(slot)?.level ?? 0);
  };

  const toggleTopic = (topic: string) =>
    setTopics((p) => (p.includes(topic) ? p.filter((x) => x !== topic) : [...p, topic]));

  /* ── Render ──────────────────────────────────────────────────────── */

  const accuracy = asked > 0 ? Math.round((correct / asked) * 100) : 0;
  const slotCost = selectedLevel > 0 ? UPGRADE_COST : TURRET_COST;
  const slotMaxed = selectedLevel >= MAX_TURRET_LEVEL;

  return (
    <div className="space-y-3 pb-4">
      <header>
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-brand" /> {t("game.title")}
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{t("game.subtitle")}</p>
      </header>

      {phase === "idle" && (
        <>
          <div className="rounded-lg border border-[hsl(var(--border))] p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{t("game.how")}</p>
            {[t("game.how_answer"), t("game.how_build"), t("game.how_wrong"), t("game.how_waves")].map((line) => (
              <p key={line} className="text-[11px] text-gray-600 dark:text-gray-300 flex gap-1.5">
                <span className="text-brand">•</span>{line}
              </p>
            ))}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{t("game.topics")}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button" onClick={() => setTopics([])}
                className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                  topics.length === 0 ? "bg-brand text-white border-brand" : "border-[hsl(var(--border))] text-gray-600 dark:text-gray-300"}`}
              >{t("game.all_topics")}</button>
              {TOPICS.map((topic) => (
                <button
                  key={topic} type="button" onClick={() => toggleTopic(topic)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                    topics.includes(topic) ? "bg-brand text-white border-brand" : "border-[hsl(var(--border))] text-gray-600 dark:text-gray-300"}`}
                >{t(`game.t_${topic}`)}</button>
              ))}
            </div>
          </div>

          <Button onClick={start} className="w-full gap-1.5"><Play className="h-4 w-4" />{t("game.start")}</Button>
        </>
      )}

      {phase === "playing" && (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { icon: Shield, label: t("game.integrity"), value: `${integrity}%`, tone: integrity > 40 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500" },
              { icon: Waves, label: t("game.wave"), value: String(wave), tone: "text-sky-600 dark:text-sky-400" },
              { icon: Coins, label: t("game.credits"), value: String(credits), tone: "text-amber-600 dark:text-amber-400" },
              { icon: Zap, label: t("game.streak"), value: String(streak), tone: "text-violet-600 dark:text-violet-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-md border border-[hsl(var(--border))] px-1.5 py-1 text-center">
                <s.icon className={`h-3 w-3 mx-auto ${s.tone}`} />
                <p className={`text-[12px] font-bold leading-tight ${s.tone}`}>{s.value}</p>
                <p className="text-[8px] uppercase tracking-wide text-gray-400 leading-none">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="h-1.5 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
            <div
              className={`h-full transition-[width] duration-300 ${integrity > 40 ? "bg-emerald-500" : "bg-rose-500"}`}
              style={{ width: `${integrity}%` }}
            />
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              onPointerDown={onCanvasPointer}
              className="w-full h-[min(46vh,340px)] rounded-lg border border-[hsl(var(--border))] touch-manipulation block"
            />
            {miss && (
              <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--background)/0.9)] backdrop-blur-[2px] p-4 rounded-lg">
                <div className="text-center max-w-sm">
                  <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wide">{t("game.breach")}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{t("game.correct_was")}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 leading-snug">{miss.answer}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-2">{t("game.source")}: {miss.source}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 min-h-[30px]">
            {selected === null ? (
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Hammer className="h-3 w-3" />{t("game.tap_slot")}
              </p>
            ) : (
              <>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {t("game.slot")} {selected + 1}{selectedLevel > 0 ? ` · ${t("game.level")} ${selectedLevel}` : ""}
                </span>
                <Button
                  size="sm" onClick={buildOrUpgrade} disabled={slotMaxed || credits < slotCost}
                  className="h-7 text-[10px] gap-1 ml-auto"
                >
                  {selectedLevel > 0 ? <ChevronUp className="h-3 w-3" /> : <Hammer className="h-3 w-3" />}
                  {slotMaxed ? t("game.maxed") : `${selectedLevel > 0 ? t("game.upgrade") : t("game.build")} · ${slotCost}`}
                </Button>
              </>
            )}
          </div>

          <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.4)] p-2.5 space-y-2">
            <div className="h-1 w-full rounded-full bg-[hsl(var(--muted))] overflow-hidden">
              <div className={`h-full ${timeLeft > 4 ? "bg-brand" : "bg-rose-500"}`} style={{ width: `${(timeLeft / QUESTION_S) * 100}%` }} />
            </div>
            <p className="text-[12px] font-semibold text-gray-900 dark:text-white leading-snug">{question?.q[lang]}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {options.map((o) => (
                <button
                  key={o.text}
                  type="button"
                  disabled={!!miss}
                  onClick={() => answerRef.current(o)}
                  className="text-left text-[11px] leading-snug rounded-md border border-[hsl(var(--border))]
                             bg-[hsl(var(--card))] px-2 py-2 min-h-[38px] transition-colors
                             hover:border-brand hover:bg-brand/5 active:bg-brand/10
                             disabled:opacity-50 text-gray-800 dark:text-gray-100"
                >
                  {o.text}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {phase === "over" && (
        <div className="rounded-lg border border-[hsl(var(--border))] p-4 text-center space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-rose-500">{t("game.over")}</p>
          <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{score}</p>
          <div className="grid grid-cols-4 gap-1.5 text-[11px]">
            {[
              [t("game.wave"), String(wavesCleared)],
              [t("game.correct"), `${correct}/${asked}`],
              [t("game.accuracy"), `${accuracy}%`],
              [t("game.turrets"), String(built)],
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
            <Button variant="outline" onClick={() => setPhase("idle")} className="flex-1">{t("game.topics")}</Button>
          </div>
        </div>
      )}

      {phase !== "playing" && (
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
