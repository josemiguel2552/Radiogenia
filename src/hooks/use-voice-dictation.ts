"use client";

import { useState, useRef, useCallback } from "react";

const SILENCE_TIMEOUT_MS = 1500;
const MAX_CHUNK_MS = 30_000;

interface DictationQuota {
  usedSeconds: number;
  limitSeconds: number;
}

interface UseVoiceDictationOptions {
  language?: string;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onQuotaUpdate?: (quota: DictationQuota) => void;
}

export function useVoiceDictation({
  language,
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
  const pendingTranscriptions = useRef(0);
  const priorTranscriptRef = useRef("");

  const transcribeBlob = useCallback(async (blob: Blob, durationMs: number) => {
    if (blob.size < 500) return;
    pendingTranscriptions.current++;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "dictation.webm");
      if (language) formData.append("language", language);
      // Send only prior transcript as context — the server appends domain
      // vocabulary at the end so it falls within Whisper's 224-token window.
      const priorContext = priorTranscriptRef.current.slice(-200);
      if (priorContext) formData.append("context", priorContext);
      formData.append("duration_seconds", String(Math.max(1, Math.round(durationMs / 1000))));

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 429 && data.code === "DICTATION_LIMIT") {
        onError?.(data.error);
        stopInternal();
        return;
      }

      if (res.ok && data.text) {
        priorTranscriptRef.current += " " + data.text;
        onTranscript(data.text);
        if (data.dictation && onQuotaUpdate) {
          onQuotaUpdate(data.dictation);
        }
      } else if (data.error) {
        onError?.(data.error);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      pendingTranscriptions.current--;
      if (pendingTranscriptions.current <= 0) {
        pendingTranscriptions.current = 0;
        setIsTranscribing(false);
      }
    }
  }, [language, onTranscript, onError, onQuotaUpdate]);

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
        transcribeBlob(e.data, Date.now() - chunkStartRef.current || duration);
      }
    };
    next.onstop = () => {};
    next.start();
  }, [transcribeBlob]);

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
          cycleRecorder();
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
          transcribeBlob(e.data, duration);
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
  }, [transcribeBlob]);

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
          transcribeBlob(e.data, Date.now() - chunkStartRef.current);
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
  }, [transcribeBlob, cycleRecorder, detectSilence, onError]);

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
