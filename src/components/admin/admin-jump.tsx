"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, CornerDownLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export interface JumpTarget {
  /** The section key to open, or an action to run. */
  key: string;
  label: string;
  /** The group it lives under, shown as a breadcrumb. */
  group: string;
  /** Extra words that should match it, for things not in its label. */
  keywords?: string;
  icon?: React.ReactNode;
}

/**
 * Jump to anywhere in the dashboard by typing what you want.
 *
 * Fifteen sections under five groups is a structure you otherwise have to
 * learn before you can use it — and the admin opens this panel a few times a
 * month, which is exactly often enough to have forgotten. Searching means
 * never having to know which group holds the audit log.
 *
 * Matching is on the label, the group and a list of keywords, so "neumonía"
 * finds the clinical checklist and "stripe" finds costs even though neither
 * word is on screen.
 */
export function AdminJump({
  targets,
  onPick,
  open,
  setOpen,
}: {
  targets: JumpTarget[];
  onPick: (key: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K from anywhere, and "/" when not already typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    const words = q.split(/\s+/);
    return targets.filter((tg) => {
      const hay = `${tg.label} ${tg.group} ${tg.keywords || ""}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [targets, query]);

  // A cursor left past the end of a shortened list would Enter into nothing.
  const active = results.length > 0 ? Math.min(cursor, results.length - 1) : 0;

  // Cleared on the way out rather than in an effect on the way in, which
  // would set state during the opening render for no reason.
  function close() {
    setQuery("");
    setCursor(0);
    setOpen(false);
  }

  function pick(key: string) {
    onPick(key);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("admin.jump_open")}</DialogTitle>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[hsl(var(--border))]">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
              else if (e.key === "Enter" && results[active]) { e.preventDefault(); pick(results[active].key); }
            }}
            placeholder={t("admin.jump_placeholder")}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <span className="w-6 shrink-0" aria-hidden />
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {results.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">{t("admin.jump_empty")}</p>
          ) : (
            results.map((tg, i) => (
              <button
                key={tg.key}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(tg.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  i === active ? "bg-gray-100 dark:bg-gray-800" : ""
                }`}
              >
                <span className="text-gray-400 shrink-0">{tg.icon}</span>
                <span className="text-sm text-gray-900 dark:text-white flex-1 truncate">{tg.label}</span>
                <span className="text-xs text-gray-400 shrink-0">{tg.group}</span>
                {i === active && <CornerDownLeft className="h-3 w-3 text-gray-400 shrink-0" />}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
