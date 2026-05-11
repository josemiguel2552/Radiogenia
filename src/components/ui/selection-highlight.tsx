"use client";

import { useRef, useEffect, useCallback } from "react";

interface SelectionHighlightProps {
  text: string;
  range: { start: number; end: number } | null;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

export function SelectionHighlight({ text, range, textareaRef, className }: SelectionHighlightProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, [textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener("scroll", syncScroll);
    return () => ta.removeEventListener("scroll", syncScroll);
  }, [textareaRef, syncScroll]);

  if (!range || range.start === range.end) return null;

  const before = text.slice(0, range.start);
  const selected = text.slice(range.start, range.end);
  const after = text.slice(range.end);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className={`absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-sm ${className ?? ""}`}
    >
      <span className="invisible">{before}</span>
      <span className="visible rounded-sm bg-amber-300/40 dark:bg-amber-500/30 box-decoration-clone">{selected}</span>
      <span className="invisible">{after}</span>
    </div>
  );
}
