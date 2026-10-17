"use client";

import * as React from "react";
import { Textarea } from "./textarea";
import { captureScrollAnchors, restoreScrollAnchors, needsShrinkMeasure } from "@/lib/scroll-preserve";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Height floor in px; the box grows beyond it to fit the content. */
  minHeight?: number;
};

/**
 * Textarea that automatically grows to fit its content, so long reports are
 * fully visible while editing (no inner scrollbar, no manual resizing).
 *
 * The sizing runs in a LAYOUT effect, before the browser paints: measured
 * after paint, the box appeared at its floor height for one frame and the page
 * jumped — which is what sent the sentence being corrected off screen the
 * moment the radiologist clicked on it.
 */
export const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, Props>(
  ({ minHeight = 80, style, value, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const measuredRef = React.useRef<string | undefined>(undefined);

    const setRefs = React.useCallback(
      (el: HTMLTextAreaElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === "function") forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef],
    );

    React.useLayoutEffect(() => {
      const ta = innerRef.current;
      if (!ta) return;

      const text = typeof value === "string" ? value : String(value ?? "");
      const previous = measuredRef.current;
      measuredRef.current = text;

      const fit = () => `${Math.max(minHeight, ta.scrollHeight + 2)}px`;

      // Content taller than the box: it grew. No collapse needed, and no
      // scroll correction either — the caret should be free to follow the
      // text down as someone dictates or types at the end.
      if (ta.scrollHeight > ta.clientHeight) {
        ta.style.height = fit();
        return;
      }

      // Otherwise the box is already at its content height, and only text that
      // shrank can need it reduced. Skipping the rest is what keeps editing in
      // the middle of a report perfectly still.
      if (!needsShrinkMeasure(previous, text)) return;

      const anchors = captureScrollAnchors(ta);
      ta.style.height = "auto";
      ta.style.height = fit();
      restoreScrollAnchors(anchors);
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
