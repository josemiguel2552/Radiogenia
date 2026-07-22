"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getRadiologyKeyterms, resolveDeepgramLanguage } from "@/lib/radiology-keywords";

const LEVEL_THROTTLE_MS = 80;

// ── Deepgram tuning ──
const DG_TIMESLICE_MS = 100;
const DG_KEEPALIVE_MS = 8000;

interface DictationQuota {
  usedSeconds: number;
  limitSeconds: number;
}

interface UseVoiceDictationOptions {
  language: string;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  onQuotaUpdate?: (quota: DictationQuota) => void;
  onRecordingDone?: () => void;
  onMaxDuration?: () => void;
  onWhisperRefine?: (whisperText: string, deepgramText: string) => void;
  templateSections?: string;
  studyContext?: string;
  modality?: string;
  studyType?: string;
}

interface CachedToken {
  key: string;
  quota?: { usedSeconds: number; limitSeconds: number };
  ts: number;
}

// Token valid for 4 minutes (keys don't rotate often)
const TOKEN_TTL_MS = 4 * 60 * 1000;

// Hard cap on a single dictation session. It auto-stops and transcribes what
// was captured; the user can click dictate again to continue. Keeps long
// unlimited (hospital) sessions bounded.
const MAX_DICTATION_MS = 6 * 60 * 1000;

export function useVoiceDictation({
  language,
  onTranscript,
  onInterim,
  onError,
  onQuotaUpdate,
  onRecordingDone,
  onMaxDuration,
  onWhisperRefine,
  templateSections,
  studyContext,
  modality,
  studyType,
}: UseVoiceDictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimText, setInterimText] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);
  const interimTextRef = useRef("");
  const drainingRef = useRef(false);
  // 6-minute auto-stop
  const maxDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const onMaxDurationRef = useRef(onMaxDuration);
  onMaxDurationRef.current = onMaxDuration;

  // Stable refs so WS onmessage always calls the latest callbacks
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onInterimRef = useRef(onInterim);
  onInterimRef.current = onInterim;

  // ── Deepgram refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const dgStartRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const audioBufferRef = useRef<Blob[]>([]);
  const MAX_RETRIES = 2;

  // ── Whisper refinement refs ──
  const whisperAudioRef = useRef<Blob[]>([]);
  const dgAccumulatedRef = useRef("");
  const whisperSessionRef = useRef(0);
  const onWhisperRefineRef = useRef(onWhisperRefine);
  onWhisperRefineRef.current = onWhisperRefine;
  const templateSectionsRef = useRef(templateSections);
  templateSectionsRef.current = templateSections;
  const studyContextRef = useRef(studyContext);
  studyContextRef.current = studyContext;
  const modalityRef = useRef(modality);
  modalityRef.current = modality;
  const studyTypeRef = useRef(studyType);
  studyTypeRef.current = studyType;

  // ── Pre-fetched token ──
  const cachedTokenRef = useRef<CachedToken | null>(null);
  const startDeepgramRef = useRef<((key: string, skipKeywords?: boolean) => Promise<void>) | null>(null);
  const connectWsRef = useRef<((key: string, skipKeywords?: boolean) => void) | null>(null);

  // ── Pre-fetch token on mount for instant start ──
  const fetchToken = useCallback(async (silent = false): Promise<CachedToken | null> => {
    const cached = cachedTokenRef.current;
    if (cached && Date.now() - cached.ts < TOKEN_TTL_MS) return cached;

    try {
      const res = await fetch("/api/transcribe/token", { method: "POST" });
      if (res.status === 429) {
        const data = await res.json();
        if (!silent) onError?.(data?.error || "Dictation limit reached");
        return null;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (!silent) onError?.(data?.error || "Transcription service unavailable");
        return null;
      }
      const data = await res.json();
      if (!data.key) {
        if (!silent) onError?.("Transcription service not configured");
        return null;
      }
      const token: CachedToken = {
        key: data.key,
        quota: data.quota,
        ts: Date.now(),
      };
      cachedTokenRef.current = token;
      return token;
    } catch {
      return null;
    }
  }, [onError]);

  useEffect(() => {
    fetchToken(true);
  }, [fetchToken]);

  // ══════════════════════════════════════════════════════════════
  // Audio level meter
  // ══════════════════════════════════════════════════════════════
  const runLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);

    const now = Date.now();
    if (now - lastLevelUpdateRef.current > LEVEL_THROTTLE_MS) {
      lastLevelUpdateRef.current = now;
      setAudioLevel(Math.min(1, rms * 8));
    }

    animFrameRef.current = requestAnimationFrame(runLevelMeter);
  }, []);

  // ══════════════════════════════════════════════════════════════
  // Get microphone + audio context
  // ══════════════════════════════════════════════════════════════
  const initAudio = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
        channelCount: 1,
      },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    return stream;
  }, []);

  // ══════════════════════════════════════════════════════════════
  // Cleanup
  // ══════════════════════════════════════════════════════════════
  const cleanup = useCallback(() => {
    activeRef.current = false;

    if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }

    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    recorderRef.current = null;

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "CloseStream" }));
      ws.close();
    }
    wsRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    setIsRecording(false);
    setIsTranscribing(false);
    setAudioLevel(0);
    interimTextRef.current = "";
    setInterimText("");
  }, []);

  const reportStreamingUsage = useCallback(() => {
    if (dgStartRef.current <= 0) return;
    const seconds = Math.round((Date.now() - dgStartRef.current) / 1000);
    dgStartRef.current = 0;
    if (seconds < 1) return;

    fetch("/api/transcribe/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds }),
    }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data?.dictation && onQuotaUpdate) {
        onQuotaUpdate(data.dictation);
      }
    }).catch(() => {});
  }, [onQuotaUpdate]);

  // ══════════════════════════════════════════════════════════════
  // DEEPGRAM: WebSocket connection (can be called independently on retry)
  // ══════════════════════════════════════════════════════════════
  const connectWs = useCallback((apiKey: string, skipKeywords = false) => {
    const dgLang = resolveDeepgramLanguage(language);
    const params = new URLSearchParams({
      model: dgLang.startsWith("en") ? "nova-3-medical" : "nova-3",
      language: dgLang,
      smart_format: "true",
      punctuate: "true",
      numerals: "true",
      interim_results: "true",
      endpointing: "350",
      utterance_end_ms: "1500",
      vad_events: "true",
      channels: "1",
      sample_rate: "16000",
      diarize: "false",
    });

    if (!skipKeywords) {
      const keyterms = getRadiologyKeyterms(dgLang);
      keyterms.forEach((kt) => params.append("keyterm", kt));
    }

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return; }
      retryCountRef.current = 0;

      const buffered = audioBufferRef.current;
      audioBufferRef.current = [];
      for (const chunk of buffered) {
        ws.send(chunk);
      }

      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, DG_KEEPALIVE_MS);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "Results") {
          const alt = msg.channel?.alternatives?.[0];
          const transcript = alt?.transcript || "";

          if (!transcript) return;

          if (msg.is_final) {
            interimTextRef.current = "";
            setInterimText("");
            setIsTranscribing(false);
            dgAccumulatedRef.current += (dgAccumulatedRef.current ? " " : "") + transcript;
            onTranscriptRef.current(transcript);
          } else {
            interimTextRef.current = transcript;
            setInterimText(transcript);
            setIsTranscribing(true);
            onInterimRef.current?.(transcript);
          }
        }
      } catch { /* ignore non-JSON */ }
    };

    let wsErrored = false;

    ws.onerror = () => {
      wsErrored = true;
    };

    ws.onclose = (ev) => {
      if (drainingRef.current) return;
      if (!activeRef.current && !wsErrored) return;

      if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
      wsRef.current = null;

      const isAuthError = ev.code === 1008;

      if (isAuthError) {
        retryCountRef.current = 0;
        cachedTokenRef.current = null;
        reportStreamingUsage();
        cleanup();
        onError?.("Clave de Deepgram inválida o expirada. Genera una nueva en console.deepgram.com y configúrala en Vercel.");
        return;
      }

      if (wsErrored) {
        const canRetry = retryCountRef.current < MAX_RETRIES;
        if (canRetry) {
          retryCountRef.current++;
          setTimeout(() => {
            if (!activeRef.current) return;
            cachedTokenRef.current = null;
            fetchToken(true).then((token) => {
              if (token && activeRef.current && connectWsRef.current) {
                connectWsRef.current(token.key, true);
              } else {
                reportStreamingUsage();
                cleanup();
              }
            });
          }, 500);
          return;
        }
        retryCountRef.current = 0;
        reportStreamingUsage();
        cleanup();
        onError?.(`Error de conexión con Deepgram (código: ${ev.code}, razón: ${ev.reason || "desconocida"}). Reintenta en unos segundos.`);
      }
    };
  }, [language, onError, fetchToken, cleanup, reportStreamingUsage]);

  connectWsRef.current = connectWs;

  // ══════════════════════════════════════════════════════════════
  // Start full pipeline: audio + WebSocket
  // ══════════════════════════════════════════════════════════════
  const startDeepgram = useCallback(async (apiKey: string, skipKeywords = false) => {
    const stream = await initAudio();
    activeRef.current = true;
    dgStartRef.current = Date.now();

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/mp4")
      ? "audio/mp4"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    audioBufferRef.current = [];

    whisperAudioRef.current = [];
    dgAccumulatedRef.current = "";
    whisperSessionRef.current++;

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
      whisperAudioRef.current.push(e.data);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(e.data);
      } else {
        audioBufferRef.current.push(e.data);
      }
    };

    recorder.start(DG_TIMESLICE_MS);
    setIsRecording(true);
    animFrameRef.current = requestAnimationFrame(runLevelMeter);

    // Hard 6-minute cap: auto-stop + transcribe what was captured.
    if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
    maxDurationTimerRef.current = setTimeout(() => {
      maxDurationTimerRef.current = null;
      if (activeRef.current) {
        onMaxDurationRef.current?.();
        stopRecordingRef.current?.();
      }
    }, MAX_DICTATION_MS);

    connectWs(apiKey, skipKeywords);
  }, [initAudio, runLevelMeter, connectWs]);

  startDeepgramRef.current = startDeepgram;

  // ══════════════════════════════════════════════════════════════
  // Whisper refinement: send buffered audio for accurate final transcript
  // ══════════════════════════════════════════════════════════════
  const sendWhisperRefinement = useCallback(async (durationSec: number, snapshotBlobs: Blob[], snapshotDgText: string, sessionId: number) => {
    if (!snapshotBlobs.length || !snapshotDgText.trim() || !onWhisperRefineRef.current) return;

    const blobType = snapshotBlobs[0]?.type || "audio/webm";
    const audioBlob = new Blob(snapshotBlobs, { type: blobType });
    if (audioBlob.size < 1000) return;

    const ext = blobType.includes("mp4") ? "mp4" : "webm";
    setIsRefining(true);
    try {
      const form = new FormData();
      form.append("audio", audioBlob, `dictation.${ext}`);
      form.append("language", language);
      form.append("duration_seconds", String(Math.round(durationSec)));
      form.append("context", snapshotDgText.slice(-200));
      if (templateSectionsRef.current) form.append("template_sections", templateSectionsRef.current);
      if (studyContextRef.current) form.append("study_context", studyContextRef.current);
      if (modalityRef.current) form.append("modality", modalityRef.current);
      if (studyTypeRef.current) form.append("study_type", studyTypeRef.current);

      const res = await fetch("/api/transcribe/refine", { method: "POST", body: form });
      if (whisperSessionRef.current !== sessionId) { setIsRefining(false); return; }
      if (res.ok) {
        const data = await res.json();
        if (data.text?.trim()) {
          onWhisperRefineRef.current(data.text.trim(), snapshotDgText);
        }
      }
    } catch { /* Whisper refinement is best-effort */ }
    setIsRefining(false);
  }, [language]);

  // ══════════════════════════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════════════════════════
  const startRecording = useCallback(async () => {
    try {
      retryCountRef.current = 0;
      const token = await fetchToken();
      if (!token) return;

      if (token.quota && onQuotaUpdate) {
        onQuotaUpdate(token.quota);
      }
      await startDeepgram(token.key);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "No se pudo acceder al micrófono");
    }
  }, [fetchToken, startDeepgram, onError, onQuotaUpdate]);

  const stopRecording = useCallback(() => {
    if (maxDurationTimerRef.current) { clearTimeout(maxDurationTimerRef.current); maxDurationTimerRef.current = null; }
    const durationSec = dgStartRef.current > 0 ? (Date.now() - dgStartRef.current) / 1000 : 0;
    reportStreamingUsage();

    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    recorderRef.current = null;

    // Snapshot audio blobs and DG text immediately, start Whisper refinement NOW (before drain)
    const snapshotBlobs = [...whisperAudioRef.current];
    const snapshotDgText = dgAccumulatedRef.current + (interimTextRef.current ? (dgAccumulatedRef.current ? " " : "") + interimTextRef.current : "");
    whisperAudioRef.current = [];
    dgAccumulatedRef.current = "";

    if (durationSec >= 2) {
      sendWhisperRefinement(durationSec, snapshotBlobs, snapshotDgText, whisperSessionRef.current);
    }

    // Stop the level meter and keep-alive but keep WS open for draining
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    setIsRecording(false);
    drainingRef.current = true;

    const finalize = () => {
      if (!drainingRef.current) return;
      drainingRef.current = false;
      const pending = interimTextRef.current;
      if (pending) {
        interimTextRef.current = "";
        onTranscriptRef.current(pending);
      }
      cleanup();
      setTimeout(() => onRecordingDone?.(), 50);
    };

    // Give recorder's final ondataavailable time to send, then tell Deepgram to finalize
    setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));

        // Patch onmessage: if Deepgram sends a final result during drain, resolve early
        const prevOnMessage = ws.onmessage;
        ws.onmessage = (event) => {
          prevOnMessage?.call(ws, event);
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "Results" && msg.is_final && msg.channel?.alternatives?.[0]?.transcript) {
              finalize();
            }
          } catch { /* ignore */ }
        };

        // Safety timeout — finalize even if Deepgram doesn't respond
        setTimeout(finalize, 1200);
      } else {
        finalize();
      }
    }, 250);
  }, [cleanup, reportStreamingUsage, onRecordingDone, sendWhisperRefinement]);

  stopRecordingRef.current = stopRecording;

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isTranscribing,
    isRefining,
    audioLevel,
    interimText,
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
