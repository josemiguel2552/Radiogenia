"use client";

/* Phone-as-dictaphone page. Opened by scanning the QR shown on the desktop.
   The phone runs the exact same dictation pipeline (Deepgram + Whisper refine),
   authenticated by the signed pairing token, and streams the resulting TEXT to
   the desktop over a Supabase Realtime channel. The transcript is deliberately
   NOT shown here — the phone is just the microphone; the text lives on the
   desktop. No audio ever travels between devices, and this page grants no
   access to reports or account data. */

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { _uiDictionary } from "@/lib/i18n";
import { Mic, Square, Loader2, MonitorCheck, MonitorX, Wand2 } from "lucide-react";

type Phase = "loading" | "invalid" | "ready" | "ended";

interface DesktopSettings {
  language?: string;
  templateSections?: string;
  studyContext?: string;
  modality?: string;
  studyType?: string;
}

/* Siri-style symmetric bar profile: tall center, tapered edges, slight
   per-bar variation so the wave feels organic. Deterministic on purpose. */
const BAR_COUNT = 26;
const BAR_FACTORS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const center = (BAR_COUNT - 1) / 2;
  const envelope = 1 - Math.abs(i - center) / (center + 1.5);
  const ripple = 0.72 + 0.28 * Math.abs(Math.sin(i * 2.4 + 0.9));
  return Math.max(0.12, envelope * ripple);
});

function Waveform({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-[3px] h-20 w-full max-w-xs mx-auto" aria-hidden>
      {BAR_FACTORS.map((f, i) => {
        const h = active ? Math.min(100, 8 + level * 165 * f) : 8;
        return (
          <span
            key={i}
            className={`w-[5px] rounded-full transition-all duration-100 ${
              active ? "bg-gradient-to-t from-violet-500 to-fuchsia-400" : "bg-white/15"
            }`}
            style={{ height: `${Math.max(6, h)}%` }}
          />
        );
      })}
    </div>
  );
}

function RemoteDictationInner() {
  const params = useSearchParams();
  const token = params.get("t") || "";
  const uiLang = (["es", "en", "pt"].includes(params.get("lang") || "") ? params.get("lang") : "es") as "es" | "en" | "pt";
  const t = useCallback(
    (key: string) => _uiDictionary[uiLang]?.[key] ?? _uiDictionary.en[key] ?? key,
    [uiLang],
  );

  const [phase, setPhase] = useState<Phase>("loading");
  const [desktopPresent, setDesktopPresent] = useState(false);
  const [settings, setSettings] = useState<DesktopSettings>({});
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  const send = useCallback((payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: "broadcast", event: "msg", payload }).catch(() => {});
  }, []);

  const {
    isRecording,
    isRefining,
    audioLevel,
    toggleRecording,
    stopRecording,
  } = useVoiceDictation({
    language: settings.language || params.get("dl") || "es",
    remoteToken: token,
    templateSections: settings.templateSections,
    studyContext: settings.studyContext,
    modality: settings.modality,
    studyType: settings.studyType,
    onTranscript: (text) => {
      setVoiceError(null);
      send({ type: "final", text });
    },
    onError: (err) => setVoiceError(err),
    onWhisperRefine: (whisperText) => {
      send({ type: "refine", text: whisperText });
    },
  });

  /* ── Validate token + join realtime channel ── */
  useEffect(() => {
    if (!token) { setPhase("invalid"); return; }
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    (async () => {
      try {
        const res = await fetch("/api/remote-dictation/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (!res.ok) { setPhase("invalid"); return; }
        const { channelId } = await res.json();

        const supabase = createClient();
        channel = supabase.channel(`rd-${channelId}`, {
          config: { broadcast: { self: false }, presence: { key: "phone" } },
        });
        channelRef.current = channel;

        channel
          .on("broadcast", { event: "msg" }, ({ payload }) => {
            if (!payload) return;
            if (payload.type === "settings") {
              setSettings({
                language: payload.language,
                templateSections: payload.templateSections,
                studyContext: payload.studyContext,
                modality: payload.modality,
                studyType: payload.studyType,
              });
            } else if (payload.type === "end") {
              setPhase("ended");
            }
          })
          .on("presence", { event: "sync" }, () => {
            const state = channel!.presenceState();
            setDesktopPresent(Boolean(state["desktop"]?.length));
          })
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel!.track({ role: "phone" });
              channel!.send({ type: "broadcast", event: "msg", payload: { type: "hello" } }).catch(() => {});
              if (!cancelled) setPhase("ready");
            }
          });
      } catch {
        if (!cancelled) setPhase("invalid");
      }
    })();

    return () => {
      cancelled = true;
      channelRef.current = null;
      channel?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── Notify desktop of recording state; keep local timer ── */
  const prevRecRef = useRef(false);
  useEffect(() => {
    if (isRecording && !prevRecRef.current) {
      setElapsed(0);
      send({ type: "rec-start" });
    } else if (!isRecording && prevRecRef.current) {
      send({ type: "rec-stop" });
    }
    prevRecRef.current = isRecording;
  }, [isRecording, send]);

  useEffect(() => {
    if (!isRecording) return;
    const iv = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [isRecording]);

  /* ── End session cleanly if the desktop unlinks while recording ── */
  useEffect(() => {
    if (phase === "ended" && isRecording) stopRecording();
  }, [phase, isRecording, stopRecording]);

  /* ── Keep the screen awake while the page is open ── */
  useEffect(() => {
    let lock: { release?: () => Promise<void> } | null = null;
    const acquire = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lock = await (navigator as any).wakeLock?.request("screen");
      } catch { /* not supported / not allowed */ }
    };
    acquire();
    const onVis = () => { if (document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.().catch(() => {});
    };
  }, []);

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  /* ── Terminal screens ── */
  if (phase === "loading" || phase === "invalid" || phase === "ended") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-5 px-8 text-center bg-[#0e0b22]">
        <span className="text-xl font-bold tracking-tight text-white">Radiogen<span className="text-violet-400">.ai</span></span>
        {phase === "loading" ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            <p className="text-sm text-white/60">{t("rdp.connecting")}</p>
          </>
        ) : (
          <p className="text-sm text-white/70 max-w-xs leading-relaxed">
            {phase === "ended" ? t("rdp.ended") : t("rdp.invalid")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex flex-col overflow-hidden bg-[#0e0b22] text-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl transition-opacity duration-700"
        style={{
          background: "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)",
          opacity: isRecording ? 0.55 + audioLevel * 0.45 : 0.3,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.18), transparent 70%)" }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-5">
        <div>
          <span className="text-lg font-bold tracking-tight">Radiogen<span className="text-violet-400">.ai</span></span>
          <p className="text-[11px] text-white/40 -mt-0.5">{t("rdp.title")}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium backdrop-blur ${
          desktopPresent
            ? "bg-green-500/15 text-green-300 border-green-500/30"
            : "bg-amber-500/15 text-amber-300 border-amber-500/30"
        }`}>
          {desktopPresent ? <MonitorCheck className="h-3.5 w-3.5" /> : <MonitorX className="h-3.5 w-3.5" />}
          {desktopPresent ? t("rdp.connected") : t("rdp.connecting")}
        </span>
      </div>

      {/* Center stage: waveform + timer */}
      <div className="relative flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <Waveform level={audioLevel} active={isRecording} />

        <div className="h-10 flex items-center justify-center">
          {isRecording ? (
            <p className="text-3xl font-mono tabular-nums font-light tracking-wider">
              {mmss}<span className="text-white/30 text-lg"> / 6:00</span>
            </p>
          ) : isRefining ? (
            <span className="inline-flex items-center gap-2 text-sm text-violet-300">
              <Wand2 className="h-4 w-4" /> {t("rdp.refining")}
            </span>
          ) : (
            <p className="text-sm text-white/50">{t("rdp.text_on_desktop")}</p>
          )}
        </div>

        <div className="h-5">
          {voiceError ? (
            <p className="text-[11px] text-red-400 text-center max-w-xs">{voiceError}</p>
          ) : !desktopPresent ? (
            <p className="text-[11px] text-amber-300/90 text-center max-w-xs">{t("rdp.no_desktop")}</p>
          ) : isRecording ? (
            <p className="text-[11px] text-white/40">{t("rdp.listening")} · {t("rdp.text_on_desktop")}</p>
          ) : null}
        </div>
      </div>

      {/* Mic button */}
      <div className="relative flex flex-col items-center gap-4 pb-10 px-6">
        <div className="relative">
          {isRecording && (
            <>
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-red-500/30 transition-transform duration-100"
                style={{ transform: `scale(${1.15 + audioLevel * 0.9})` }}
              />
              <span aria-hidden className="absolute inset-0 rounded-full bg-red-500/20 animate-ping [animation-duration:2s]" />
            </>
          )}
          <button
            type="button"
            onClick={toggleRecording}
            aria-label={isRecording ? t("rdp.tap_stop") : t("rdp.tap_start")}
            className={`relative h-24 w-24 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
              isRecording
                ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-900/50"
                : "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-900/50 hover:brightness-110"
            }`}
          >
            {isRecording ? <Square className="h-8 w-8 fill-white text-white" /> : <Mic className="h-10 w-10 text-white" />}
          </button>
        </div>
        <p className="text-sm font-medium text-white/80">
          {isRecording ? t("rdp.tap_stop") : t("rdp.tap_start")}
        </p>
        <p className="text-[11px] text-white/30">{t("rdp.keep_open")}</p>
      </div>
    </div>
  );
}

export default function RemoteDictationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-[#0e0b22]">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      }
    >
      <RemoteDictationInner />
    </Suspense>
  );
}
