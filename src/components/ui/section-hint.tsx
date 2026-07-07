"use client";

import { useState } from "react";
import { X, Lightbulb } from "lucide-react";

/**
 * Brief, discreet onboarding hint shown at the top of a section. Dismissible;
 * the dismissal persists in localStorage so it only nags until closed once.
 */
export function SectionHint({ id, text }: { id: string; text: string }) {
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(`rg_hint_${id}`) !== "1"; } catch { return true; }
  });

  if (!visible) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-violet-100 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20 px-3 py-2">
      <Lightbulb className="h-3.5 w-3.5 text-violet-500 shrink-0 mt-0.5" />
      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug flex-1">{text}</p>
      <button
        type="button"
        onClick={() => { try { localStorage.setItem(`rg_hint_${id}`, "1"); } catch { /* ignore */ } setVisible(false); }}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
        aria-label="close"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
