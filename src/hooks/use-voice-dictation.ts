"use client";

import { useState, useRef, useCallback } from "react";

const LEVEL_THROTTLE_MS = 80;

// ── Whisper fallback constants ──
const SILENCE_TIMEOUT_MS = 1500;
const MAX_CHUNK_MS = 25_000;
const MIN_BLOB_SIZE = 2000;
const MIN_CHUNK_DURATION_MS = 1500;

interface DictationQuota {
  usedSeconds: number;
  limitSeconds: number;
}

interface UseVoiceDictationOptions {
  language?: string;
  studyContext?: string;
  templateSections?: string;
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (error: string) => void;
  onQuotaUpdate?: (quota: DictationQuota) => void;
}

interface QueueItem {
  blob: Blob;
  durationMs: number;
}

type Provider = "deepgram" | "whisper";

export function useVoiceDictation({
  language,
  studyContext,
  templateSections,
  onTranscript,
  onInterim,
  onError,
  onQuotaUpdate,
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
  const providerRef = useRef<Provider>("whisper");
  const lastLevelUpdateRef = useRef(0);

  // ── Deepgram refs ──
  const wsRef = useRef<WebSocket | null>(null);
  const dgStartRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Whisper fallback refs ──
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkStartRef = useRef(0);
  const priorTranscriptRef = useRef("");
  const lastTranscriptRef = useRef("");
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);

  // ══════════════════════════════════════════════════════════════
  // Audio level meter (shared by both providers)
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
  // Shared: get microphone + audio context
  // ══════════════════════════════════════════════════════════════
  const initAudio = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });
    streamRef.current = stream;

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    return stream;
  }, []);

  // ══════════════════════════════════════════════════════════════
  // Cleanup (shared)
  // ══════════════════════════════════════════════════════════════
  const cleanup = useCallback(() => {
    activeRef.current = false;

    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
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
  // DEEPGRAM: WebSocket streaming
  // ══════════════════════════════════════════════════════════════
  const startDeepgram = useCallback(async (apiKey: string) => {
    const stream = await initAudio();
    activeRef.current = true;
    dgStartRef.current = Date.now();

    // Build Deepgram WebSocket URL
    const params = new URLSearchParams({
      model: "nova-3",
      smart_format: "true",
      punctuate: "true",
      interim_results: "true",
      endpointing: "300",
      utterance_end_ms: "1500",
      vad_events: "true",
    });
    if (language) {
      params.set("language", language);
    } else {
      params.set("detect_language", "true");
    }

    const ws = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, ["token", apiKey]);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return; }

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      recorder.start(250);
      setIsRecording(true);
      animFrameRef.current = requestAnimationFrame(runLevelMeter);

      // Keep-alive every 8 seconds
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 8000);
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

    ws.onerror = () => {
      onError?.("Connection error — retrying with Whisper");
      cleanup();
    };

    ws.onclose = (event) => {
      if (activeRef.current) {
        // Unexpected close — report usage and stop
        reportStreamingUsage();
        cleanup();
      }
    };
  }, [language, initAudio, runLevelMeter, cleanup, onTranscript, onInterim, onError]);

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
  // WHISPER: batch fallback (existing logic, optimized timings)
  // ══════════════════════════════════════════════════════════════
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsTranscribing(true);

    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      try {
        const formData = new FormData();
        formData.append("audio", item.blob, "dictation.webm");
        if (language) formData.append("language", language);
        if (studyContext) formData.append("study_context", studyContext);
        if (templateSections) formData.append("template_sections", templateSections);
        const priorContext = priorTranscriptRef.current.slice(-200);
        if (priorContext) formData.append("context", priorContext);
        formData.append("duration_seconds", String(Math.max(1, Math.round(item.durationMs / 1000))));

        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();

        if (res.status === 429 && data.code === "DICTATION_LIMIT") {
          onError?.(data.error);
          queueRef.current = [];
          cleanup();
          break;
        }

        if (res.ok && data.text) {
          let text = data.text.trim();

          if (lastTranscriptRef.current && text) {
            const prev = lastTranscriptRef.current.toLowerCase();
            const prevWords = prev.split(/\s+/);
            for (let overlap = Math.min(8, prevWords.length); overlap >= 3; overlap--) {
              const tail = prevWords.slice(-overlap).join(" ");
              const cur = text.toLowerCase();
              if (cur.startsWith(tail)) {
                text = text.slice(tail.length).trim();
                break;
              }
            }
          }

          if (text) {
            lastTranscriptRef.current = text;
            priorTranscriptRef.current += " " + text;
            onTranscript(text);
          }
          if (data.dictation && onQuotaUpdate) {
            onQuotaUpdate(data.dictation);
          }
        } else if (data.error) {
          onError?.(data.error);
        }
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Transcription failed");
      }
    }

    processingRef.current = false;
    setIsTranscribing(false);
  }, [language, studyContext, templateSections, onTranscript, onError, onQuotaUpdate, cleanup]);

  const enqueueBlob = useCallback((blob: Blob, durationMs: number) => {
    if (blob.size < MIN_BLOB_SIZE || durationMs < 800) return;
    queueRef.current.push({ blob, durationMs });
    processQueue();
  }, [processQueue]);

  const cycleRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording" || !activeRef.current) return;

    recorder.stop();

    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;

    const mimeType = recorder.mimeType;
    const next = new MediaRecorder(stream, { mimeType });
    recorderRef.current = next;
    chunkStartRef.current = Date.now();

    next.ondataavailable = (e) => {
      if (e.data.size > 0) {
        enqueueBlob(e.data, Date.now() - chunkStartRef.current);
      }
    };
    next.onstop = () => {};
    next.start();
  }, [enqueueBlob]);

  const detectSilence = useCallback(() => {
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

    if (rms < 0.015) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          const elapsed = Date.now() - chunkStartRef.current;
          if (elapsed > MIN_CHUNK_DURATION_MS) {
            cycleRecorder();
          }
        }, SILENCE_TIMEOUT_MS);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    animFrameRef.current = requestAnimationFrame(detectSilence);
  }, [cycleRecorder]);

  const startWhisper = useCallback(async () => {
    const stream = await initAudio();
    activeRef.current = true;
    priorTranscriptRef.current = "";
    lastTranscriptRef.current = "";
    queueRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    chunkStartRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        enqueueBlob(e.data, Date.now() - chunkStartRef.current);
      }
    };
    recorder.onstop = () => {};

    recorder.start();
    setIsRecording(true);

    const scheduleMaxChunk = () => {
      chunkTimerRef.current = setTimeout(() => {
        if (activeRef.current) {
          cycleRecorder();
          scheduleMaxChunk();
        }
      }, MAX_CHUNK_MS);
    };
    scheduleMaxChunk();

    animFrameRef.current = requestAnimationFrame(detectSilence);
  }, [initAudio, enqueueBlob, cycleRecorder, detectSilence]);

  // ══════════════════════════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════════════════════════
  const startRecording = useCallback(async () => {
    try {
      // Check which provider to use
      const tokenRes = await fetch("/api/transcribe/token", { method: "POST" });
      const tokenData = tokenRes.ok ? await tokenRes.json() : null;

      if (tokenRes.status === 429) {
        onError?.(tokenData?.error || "Dictation limit reached");
        return;
      }

      if (tokenData?.provider === "deepgram" && tokenData.key) {
        providerRef.current = "deepgram";
        if (tokenData.quota && onQuotaUpdate) {
          onQuotaUpdate(tokenData.quota);
        }
        await startDeepgram(tokenData.key);
      } else {
        providerRef.current = "whisper";
        await startWhisper();
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, [startDeepgram, startWhisper, onError, onQuotaUpdate]);

  const stopRecording = useCallback(() => {
    if (providerRef.current === "deepgram") {
      reportStreamingUsage();

      // Flush final audio: stop recorder, then close WebSocket after a small delay
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
      }, 500);
    } else {
      // Whisper: enqueue last chunk then cleanup
      const recorder = recorderRef.current;
      if (recorder && recorder.state === "recording") {
        const duration = Date.now() - chunkStartRef.current;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) enqueueBlob(e.data, duration);
        };
        recorder.stop();
      }
      recorderRef.current = null;
      activeRef.current = false;
      if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
      if (chunkTimerRef.current) { clearTimeout(chunkTimerRef.current); chunkTimerRef.current = null; }
      if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
      analyserRef.current = null;
      setIsRecording(false);
      setAudioLevel(0);
    }
  }, [cleanup, enqueueBlob, reportStreamingUsage]);

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
