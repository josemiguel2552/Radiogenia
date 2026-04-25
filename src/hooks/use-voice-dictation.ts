"use client";

import { useState, useRef, useCallback } from "react";

const SILENCE_TIMEOUT_MS = 1500;
const MAX_CHUNK_MS = 30_000;

interface UseVoiceDictationOptions {
  language?: string;
  context?: string;
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceDictation({
  language,
  context,
  onTranscript,
  onError,
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

  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "audio.webm");
      if (language) formData.append("language", language);
      if (context) formData.append("context", context);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.text) {
        onTranscript(data.text);
      } else if (data.error) {
        onError?.(data.error);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setIsTranscribing(false);
    }
  }, [language, context, onTranscript, onError]);

  const flushChunks = useCallback(() => {
    if (chunksRef.current.length === 0) return;
    const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
    chunksRef.current = [];
    transcribeChunk(blob);
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

      // Set up audio analysis for silence detection
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

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        flushChunks();
      };

      recorder.start(500);
      setIsRecording(true);

      // Force flush every MAX_CHUNK_MS even if no silence detected
      chunkTimerRef.current = setInterval(() => {
        if (recorder.state === "recording" && chunksRef.current.length > 0) {
          flushChunks();
        }
      }, MAX_CHUNK_MS);

      // Start silence detection
      animFrameRef.current = requestAnimationFrame(detectSilence);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, [flushChunks, detectSilence, onError]);

  const stopRecording = useCallback(() => {
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
