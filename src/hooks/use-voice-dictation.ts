"use client";

import { useState, useRef, useCallback } from "react";

const SILENCE_TIMEOUT_MS = 2500;
const MAX_CHUNK_MS = 25_000;
const MIN_BLOB_SIZE = 1000;

interface DictationQuota {
  usedSeconds: number;
  limitSeconds: number;
}

interface UseVoiceDictationOptions {
  language?: string;
  studyContext?: string;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onQuotaUpdate?: (quota: DictationQuota) => void;
}

interface QueueItem {
  blob: Blob;
  durationMs: number;
}

export function useVoiceDictation({
  language,
  studyContext,
  onTranscript,
  onError,
  onQuotaUpdate,
}: UseVoiceDictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkStartRef = useRef<number>(0);
  const activeRef = useRef(false);
  const priorTranscriptRef = useRef("");
  const lastTranscriptRef = useRef("");

  // Sequential queue — guarantees chunks are transcribed in order
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);

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
        const priorContext = priorTranscriptRef.current.slice(-200);
        if (priorContext) formData.append("context", priorContext);
        formData.append("duration_seconds", String(Math.max(1, Math.round(item.durationMs / 1000))));

        const res = await fetch("/api/transcribe", { method: "POST", body: formData });
        const data = await res.json();

        if (res.status === 429 && data.code === "DICTATION_LIMIT") {
          onError?.(data.error);
          queueRef.current = [];
          stopInternal();
          break;
        }

        if (res.ok && data.text) {
          let text = data.text.trim();

          // Deduplicate: if the new transcript starts with the tail of the
          // previous one (Whisper echo), strip the overlapping prefix.
          if (lastTranscriptRef.current && text) {
            const prev = lastTranscriptRef.current.toLowerCase();
            const prevWords = prev.split(/\s+/);
            // Check last 4-8 words of previous transcript for overlap
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
  }, [language, studyContext, onTranscript, onError, onQuotaUpdate]);

  const enqueueBlob = useCallback((blob: Blob, durationMs: number) => {
    if (blob.size < MIN_BLOB_SIZE) return;
    queueRef.current.push({ blob, durationMs });
    processQueue();
  }, [processQueue]);

  const cycleRecorder = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording" || !activeRef.current) return;

    const duration = Date.now() - chunkStartRef.current;
    recorder.stop();

    const stream = streamRef.current;
    if (!stream || !activeRef.current) return;

    const mimeType = recorder.mimeType;
    const next = new MediaRecorder(stream, { mimeType });
    recorderRef.current = next;
    chunkStartRef.current = Date.now();

    next.ondataavailable = (e) => {
      if (e.data.size > 0) {
        enqueueBlob(e.data, Date.now() - chunkStartRef.current || duration);
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

    if (rms < 0.015) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          // Only cycle if enough audio has been captured (> 2s)
          const elapsed = Date.now() - chunkStartRef.current;
          if (elapsed > 2000) {
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

  const stopInternal = useCallback(() => {
    activeRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      const duration = Date.now() - chunkStartRef.current;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          enqueueBlob(e.data, duration);
        }
      };
      recorder.stop();
    }
    recorderRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;

    setIsRecording(false);
  }, [enqueueBlob]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;
      activeRef.current = true;
      priorTranscriptRef.current = "";
      lastTranscriptRef.current = "";
      queueRef.current = [];

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

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
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, [enqueueBlob, cycleRecorder, detectSilence, onError]);

  const stopRecording = useCallback(() => {
    stopInternal();
  }, [stopInternal]);

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
    toggleRecording,
    startRecording,
    stopRecording,
  };
}
