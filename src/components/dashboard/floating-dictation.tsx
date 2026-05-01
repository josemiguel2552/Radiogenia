"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, X, Minimize2, Maximize2, Send, Loader2, GripVertical, Keyboard } from "lucide-react";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { processVoiceCommands } from "@/lib/voice-commands";
import { useT } from "@/lib/i18n";

interface FloatingDictationProps {
  language: string;
  onSendText: (text: string) => void;
}

export function FloatingDictation({ language, onSendText }: FloatingDictationProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [buffer, setBuffer] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: -1, y: -1 });
  const [selRange, setSelRange] = useState<{ start: number; end: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Position initialization
  useEffect(() => {
    if (position.x === -1) {
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 80 });
    }
  }, []);

  const { isRecording, isTranscribing, interimText, toggleRecording, stopRecording } = useVoiceDictation({
    language,
    onTranscript: (rawText) => {
      const text = processVoiceCommands(rawText, language);
      setBuffer((prev) => {
        if (selRange && selRange.start !== selRange.end) {
          const before = prev.slice(0, selRange.start);
          const after = prev.slice(selRange.end);
          setSelRange(null);
          return before + text + after;
        }
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + text;
      });
      setVoiceError(null);
      if (!expanded) setExpanded(true);
    },
    onInterim: () => { if (!expanded) setExpanded(true); },
    onError: (err) => setVoiceError(err),
  });

  // Track selection in textarea
  const handleSelect = useCallback(() => {
    const ta = textareaRef.current;
    if (ta && ta.selectionStart !== ta.selectionEnd) {
      setSelRange({ start: ta.selectionStart, end: ta.selectionEnd });
    } else {
      setSelRange(null);
    }
  }, []);

  // Global keyboard shortcut: + key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "+" && !isInput) {
        e.preventDefault();
        toggleRecording();
        if (!expanded) setExpanded(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRecording, expanded]);

  // Dragging
  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    dragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - position.x, y: clientY - position.y };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 60, cx - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, cy - dragOffset.current.y)),
      });
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchmove", onMove);
    document.addEventListener("touchend", onUp);
  }, [position]);

  function handleSend() {
    if (!buffer.trim()) return;
    onSendText(buffer.trim());
    setBuffer("");
    setExpanded(false);
    setSelRange(null);
  }

  function handleClose() {
    if (isRecording) stopRecording();
    setExpanded(false);
  }

  const hasText = buffer.trim().length > 0;
  const wordCount = buffer.trim() ? buffer.trim().split(/\s+/).length : 0;

  // Collapsed: just the mic FAB
  if (!expanded) {
    return (
      <div
        ref={containerRef}
        className="fixed z-[9999] select-none"
        style={{ left: position.x, top: position.y }}
      >
        <button
          type="button"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          onClick={(e) => {
            if (!dragging.current) {
              setExpanded(true);
            }
          }}
          className={`h-14 w-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 recording-pulse"
              : isTranscribing
              ? "bg-blue-500"
              : "bg-brand-gradient-br hover:shadow-brand/40"
          }`}
          title={`${t("dash.voice_dictation")} (+)`}
        >
          {isRecording ? (
            <MicOff className="h-6 w-6 text-white" />
          ) : isTranscribing ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Mic className="h-6 w-6 text-brand-fg" />
          )}
        </button>

        {/* Shortcut hint */}
        <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gray-900 dark:bg-gray-100 flex items-center justify-center shadow">
          <span className="text-[9px] font-bold text-white dark:text-gray-900">+</span>
        </div>

        {/* Text indicator badge */}
        {hasText && !expanded && (
          <div className="absolute -top-2 -left-2 h-6 min-w-[1.5rem] px-1 rounded-full bg-brand text-brand-fg text-[10px] font-bold flex items-center justify-center shadow">
            {wordCount}
          </div>
        )}
      </div>
    );
  }

  // Expanded: full dictation panel
  return (
    <div
      ref={containerRef}
      className="fixed z-[9999] select-none"
      style={{ left: Math.min(position.x, window.innerWidth - 320), top: Math.max(8, position.y - 340) }}
    >
      <div className="w-[300px] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 cursor-move"
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <GripVertical className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1">
            {t("dash.voice_dictation")}
          </span>
          <div className="flex items-center gap-0.5">
            <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-mono">+</kbd>
            <button type="button" onClick={() => setExpanded(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
              <Minimize2 className="h-3.5 w-3.5 text-gray-400" />
            </button>
            <button type="button" onClick={handleClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors">
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Text area */}
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={buffer}
            onChange={(e) => setBuffer(e.target.value)}
            onSelect={handleSelect}
            placeholder={t("dash.dictation_placeholder")}
            className="w-full h-[180px] text-sm resize-none border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand/50 placeholder:text-gray-400"
          />

          {/* Selection indicator */}
          {selRange && selRange.start !== selRange.end && (
            <p className="text-[10px] text-brand mt-1 flex items-center gap-1">
              <Keyboard className="h-3 w-3" />
              {t("dash.float_selection_hint")}
            </p>
          )}

          {interimText && isRecording && (
            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 italic truncate">{interimText}</p>
          )}

          {voiceError && (
            <p className="text-[10px] text-red-500 mt-1 truncate">{voiceError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-3 pb-3">
          {/* Mic toggle */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isRecording
                ? "bg-red-500 hover:bg-red-600 recording-pulse"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-5 w-5 text-white" />
            ) : isTranscribing ? (
              <Loader2 className="h-5 w-5 text-brand animate-spin" />
            ) : (
              <Mic className="h-5 w-5 text-brand" />
            )}
          </button>

          {/* Status */}
          <div className="flex-1 min-w-0">
            {isRecording ? (
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">{t("dash.listening")}</span>
              </div>
            ) : isTranscribing ? (
              <span className="text-[11px] text-blue-600 dark:text-blue-400">{t("dash.transcribing")}</span>
            ) : hasText ? (
              <span className="text-[11px] text-gray-500">{wordCount} {wordCount === 1 ? t("word") : t("words")}</span>
            ) : (
              <span className="text-[11px] text-gray-400">{t("dash.float_ready")}</span>
            )}
          </div>

          {/* Send to dashboard */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasText}
            className="h-9 px-3 rounded-lg bg-brand text-brand-fg text-xs font-medium flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            <Send className="h-3.5 w-3.5" />
            {t("dash.float_send")}
          </button>
        </div>
      </div>
    </div>
  );
}
