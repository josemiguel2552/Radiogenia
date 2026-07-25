"use client";

/* Phone-as-dictaphone page. Opened by scanning the QR shown on the desktop.
   The phone runs the exact same dictation pipeline (Deepgram + Whisper refine),
   authenticated by the signed pairing token, and streams the resulting TEXT to
   the desktop over a Supabase Realtime channel. No audio ever travels between
   devices, and this page grants no access to reports or account data. */

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
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const settingsRef = useRef<DesktopSettings>({});
  settingsRef.current = settings;
  const recStartLenRef = useRef(0);

  const send = useCallback((payload: Record<string, unknown>) => {
    channelRef.current?.send({ type: "broadcast", event: "msg", payload }).catch(() => {});
  }, []);

  const {
    isRecording,
    isRefining,
    audioLevel,
    interimText,
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
      setTranscript((prev) => {
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + text;
      });
      setVoiceError(null);
      send({ type: "final", text });
    },
    onError: (err) => setVoiceError(err),
    onWhisperRefine: (whisperText) => {
      setTranscript((prev) => {
        const before = prev.slice(0, recStartLenRef.current);
        const sep = before && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
        return before + sep + whisperText;
      });
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
      recStartLenRef.current = transcript.length;
      setElapsed(0);
      send({ type: "rec-start" });
    } else if (!isRecording && prevRecRef.current) {
      send({ type: "rec-stop" });
    }
    prevRecRef.current = isRecording;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* ── Auto-scroll the transcript ── */
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, interimText]);

  const mmss = `${String(Math.floor(elapsed / 60)).padStart(1, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  /* ── Terminal screens ── */
  if (phase === "loading" || phase === "invalid" || phase === "ended") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-8 text-center bg-gray-50 dark:bg-gray-950">
        <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Radiogen<span className="text-violet-600">.ai</span></span>
        {phase === "loading" ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("rdp.connecting")}</p>
          </>
        ) : (
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
            {phase === "ended" ? t("rdp.ended") : t("rdp.invalid")}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Radiogen<span className="text-violet-600">.ai</span></span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
          desktopPresent
            ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        }`}>
          {desktopPresent ? <MonitorCheck className="h-3.5 w-3.5" /> : <MonitorX className="h-3.5 w-3.5" />}
          {desktopPresent ? t("rdp.connected") : t("rdp.connecting")}
        </span>
      </div>
      <p className="px-4 pb-1 text-[11px] text-gray-400 dark:text-gray-500">{t("rdp.title")}</p>

      {/* Transcript */}
      <div
        ref={transcriptRef}
        className="flex-1 overflow-y-auto mx-4 my-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
      >
        {transcript || interimText ? (
          <p className="text-[15px] leading-relaxed text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
            {transcript}
            {interimText && <span className="text-gray-400 dark:text-gray-500 italic"> {interimText}</span>}
          </p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">{t("rdp.placeholder")}</p>
        )}
      </div>

      {/* Status line */}
      <div className="px-4 min-h-6 flex items-center justify-center gap-2">
        {isRefining && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-300">
            <Wand2 className="h-3 w-3" /> {t("rdp.refining")}
          </span>
        )}
        {voiceError && <span className="text-[11px] text-red-500 text-center">{voiceError}</span>}
        {!desktopPresent && !voiceError && (
          <span className="text-[11px] text-amber-600 dark:text-amber-400 text-center">{t("rdp.no_desktop")}</span>
        )}
      </div>

      {/* Waveform + timer */}
      <div className="h-10 flex items-center justify-center gap-2">
        {isRecording && (
          <>
            <div className="flex items-end gap-[3px] h-6">
              {[0.5, 0.9, 0.7, 1, 0.6, 0.85, 0.45].map((f, i) => (
                <span
                  key={i}
                  className="w-[4px] rounded-full bg-red-500 transition-all duration-75"
                  style={{ height: `${Math.max(15, Math.min(100, audioLevel * 100 * f + 12))}%` }}
                />
              ))}
            </div>
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{mmss} / 6:00</span>
          </>
        )}
      </div>

      {/* Mic button */}
      <div className="flex flex-col items-center gap-3 pb-8 pt-1 px-4">
        <button
          type="button"
          onClick={toggleRecording}
          aria-label={isRecording ? t("rdp.tap_stop") : t("rdp.tap_start")}
          className={`h-24 w-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
            isRecording
              ? "bg-red-500 text-white"
              : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
          style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 22)}px rgba(239,68,68,0.18)` } : undefined}
        >
          {isRecording ? <Square className="h-9 w-9 fill-current" /> : <Mic className="h-10 w-10" />}
        </button>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {isRecording ? t("rdp.tap_stop") : t("rdp.tap_start")}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500">{t("rdp.keep_open")}</p>
      </div>
    </div>
  );
}

export default function RemoteDictationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      }
    >
      <RemoteDictationInner />
    </Suspense>
  );
}
