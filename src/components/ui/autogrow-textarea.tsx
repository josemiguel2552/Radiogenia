"use client";

import * as React from "react";
import { Textarea } from "./textarea";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Height floor in px; the box grows beyond it to fit the content. */
  minHeight?: number;
};

/**
 * Textarea that automatically grows to fit its content, so long reports are
 * fully visible while editing (no inner scrollbar, no manual resizing).
 */
export const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ minHeight = 80, style, value, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef],
    );

    React.useEffect(() => {
      const ta = innerRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      ta.style.height = `${Math.max(minHeight, ta.scrollHeight + 2)}px`;
    }, [value, minHeight]);

    return (
      <Textarea
        ref={setRefs}
        value={value}
        style={{ ...style, minHeight, overflow: "hidden", resize: "none" }}
        {...props}
      />
    );
  },
);
AutoGrowTextarea.displayName = "AutoGrowTextarea";
