"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { getRadiologyKeywords } from "@/lib/radiology-keywords";

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
}

interface CachedToken {
  key: string;
  quota?: { usedSeconds: number; limitSeconds: number };
  ts: number;
}

// Token valid for 4 minutes (keys don't rotate often)
const TOKEN_TTL_MS = 4 * 60 * 1000;

export function useVoiceDictation({
  language,
  onTranscript,
  onInterim,
  onError,
  onQuotaUpdate,
  onRecordingDone,
}: UseVoiceDictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [interimText, setInterimText] = useState("");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const lastLevelUpdateRef = useRef(0);

  // ── Deepgram refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const dgStartRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const audioBufferRef = useRef<Blob[]>([]);
  const MAX_RETRIES = 2;

  // ── Pre-fetched token ──
  const cachedTokenRef = useRef<CachedToken | null>(null);
  const startDeepgramRef = useRef<((key: string, skipKeywords?: boolean) => Promise<void>) | null>(null);

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
    setInterimText("");
  }, []);

  // ══════════════════════════════════════════════════════════════
  // DEEPGRAM: WebSocket streaming (optimized for low latency)
  // ══════════════════════════════════════════════════════════════
  const startDeepgram = useCallback(async (apiKey: string, skipKeywords = false) => {
    const stream = await initAudio();
    activeRef.current = true;
    dgStartRef.current = Date.now();

    // Start recording immediately — buffer audio while WebSocket connects
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    audioBufferRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size === 0) return;
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

    // Connect WebSocket in parallel
    const params = new URLSearchParams({
      model: "nova-3",
      language,
      smart_format: "true",
      punctuate: "true",
      numerals: "true",
      interim_results: "true",
      endpointing: "200",
      utterance_end_ms: "1200",
      vad_events: "true",
      channels: "1",
      sample_rate: "16000",
      diarize: "false",
    });

    if (!skipKeywords) {
      const keywords = getRadiologyKeywords(language);
      keywords.forEach((kw) => params.append("keywords", kw));
    }

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return; }
      retryCountRef.current = 0;

      // Flush buffered audio captured while connecting
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
            setInterimText("");
            setIsTranscribing(false);
            onTranscript(transcript);
          } else {
            setInterimText(transcript);
            setIsTranscribing(true);
            onInterim?.(transcript);
          }
        }
      } catch { /* ignore non-JSON */ }
    };

    let wsErrored = false;

    ws.onerror = () => {
      wsErrored = true;
    };

    ws.onclose = (ev) => {
      if (!activeRef.current && !wsErrored) return;

      reportStreamingUsage();
      cleanup();

      // 1008 = Policy Violation (Deepgram's auth rejection)
      const isAuthError = ev.code === 1008;

      if (isAuthError) {
        retryCountRef.current = 0;
        cachedTokenRef.current = null;
        onError?.("Clave de Deepgram inválida o expirada. Genera una nueva en console.deepgram.com y configúrala en Vercel.");
        return;
      }

      if (wsErrored) {
        const canRetry = retryCountRef.current < MAX_RETRIES;
        if (canRetry) {
          retryCountRef.current++;
          const delay = retryCountRef.current * 1000;
          setTimeout(() => {
            cachedTokenRef.current = null;
            fetchToken().then((token) => {
              if (token && startDeepgramRef.current) startDeepgramRef.current(token.key, true);
            });
          }, delay);
          return;
        }
        retryCountRef.current = 0;
        onError?.(`Error de conexión con Deepgram (código: ${ev.code}, razón: ${ev.reason || "desconocida"}). Reintenta en unos segundos.`);
      }
    };
  }, [language, initAudio, runLevelMeter, cleanup, onTranscript, onInterim, onError, fetchToken]);

  startDeepgramRef.current = startDeepgram;

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
    reportStreamingUsage();

    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
    recorderRef.current = null;

    setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "CloseStream" }));
      }
      cleanup();
      setTimeout(() => onRecordingDone?.(), 50);
    }, 300);
  }, [cleanup, reportStreamingUsage, onRecordingDone]);

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
    audioLevel,
    interimText,
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
