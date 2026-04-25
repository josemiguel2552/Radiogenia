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
  context?: string;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onQuotaUpdate?: (quota: DictationQuota) => void;
}

export function useVoiceDictation({
  language,
  context,
  onTranscript,
  onError,
  onQuotaUpdate,
}: UseVoiceDictationOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const chunkStartRef = useRef<number>(0);

  const transcribeChunk = useCallback(async (blob: Blob, durationMs: number) => {
    if (blob.size < 1000) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      if (language) formData.append("language", language);
      if (context) formData.append("context", context);
      formData.append("duration_seconds", String(Math.round(durationMs / 1000)));

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (res.status === 429 && data.code === "DICTATION_LIMIT") {
        onError?.(data.error);
        // Auto-stop recording when limit reached
        stopRecordingInternal();
        return;
      }

      if (res.ok && data.text) {
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
      setIsTranscribing(false);
    }
  }, [language, context, onTranscript, onError, onQuotaUpdate]);

  const flushChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
    const durationMs = Date.now() - chunkStartRef.current;
    chunksRef.current = [];
    chunkStartRef.current = Date.now();
    transcribeChunk(blob, durationMs);
  }, [transcribeChunk]);

  const detectSilence = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);

    if (rms < 0.01) {
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => {
          flushChunks();
          silenceTimerRef.current = null;
        }, SILENCE_TIMEOUT_MS);
      }
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    if (mediaRecorderRef.current?.state === "recording") {
      animFrameRef.current = requestAnimationFrame(detectSilence);
    }
  }, [flushChunks]);

  const stopRecordingInternal = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsRecording(false);
  }, []);

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

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      chunkStartRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        flushChunks();
      };

      recorder.start(500);
      setIsRecording(true);

      chunkTimerRef.current = setInterval(() => {
        if (recorder.state === "recording" && chunksRef.current.length > 0) {
          flushChunks();
        }
      }, MAX_CHUNK_MS);

      animFrameRef.current = requestAnimationFrame(detectSilence);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, [flushChunks, detectSilence, onError]);

  const stopRecording = useCallback(() => {
    stopRecordingInternal();
  }, [stopRecordingInternal]);

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
