"use client";

import { useMemo, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { AlertTriangle, Check, ShieldAlert } from "lucide-react";
import { useT } from "@/lib/i18n";

const TRACE_COLORS = [
  { bg: "rgba(59,130,246,0.18)",  text: "#3b82f6",  dark: "rgba(96,165,250,0.22)" },
  { bg: "rgba(16,185,129,0.18)",  text: "#10b981",  dark: "rgba(52,211,153,0.22)" },
  { bg: "rgba(245,158,11,0.18)",  text: "#f59e0b",  dark: "rgba(251,191,36,0.22)" },
  { bg: "rgba(139,92,246,0.18)",  text: "#8b5cf6",  dark: "rgba(167,139,250,0.22)" },
  { bg: "rgba(236,72,153,0.18)",  text: "#ec4899",  dark: "rgba(244,114,182,0.22)" },
  { bg: "rgba(6,182,212,0.18)",   text: "#06b6d4",  dark: "rgba(34,211,238,0.22)" },
  { bg: "rgba(249,115,22,0.18)",  text: "#f97316",  dark: "rgba(251,146,60,0.22)" },
  { bg: "rgba(34,197,94,0.18)",   text: "#22c55e",  dark: "rgba(74,222,128,0.22)" },
  { bg: "rgba(168,85,247,0.18)",  text: "#a855f7",  dark: "rgba(192,132,252,0.22)" },
  { bg: "rgba(14,165,233,0.18)",  text: "#0ea5e9",  dark: "rgba(56,189,248,0.22)" },
];

const UNMATCHED_COLOR = { bg: "rgba(239,68,68,0.2)", text: "#ef4444", dark: "rgba(248,113,113,0.25)" };
const HALLUCINATION_COLOR = { bg: "rgba(168,85,247,0.2)", text: "#a855f7", dark: "rgba(192,132,252,0.25)" };

export interface TraceMapping {
  dictation_fragment: string;
  section: string;
  matched: boolean;
}

export interface TraceUnmatched {
  dictation_fragment: string;
  reason: string;
}

export interface TraceHallucination {
  findings_fragment: string;
  section: string;
  reason: string;
}

export interface TraceRepairedItem {
  dictation_fragment: string;
  inserted_into_section: string;
  reason: string;
}

export interface TraceData {
  mappings: TraceMapping[];
  unmatched: TraceUnmatched[];
  hallucinations: TraceHallucination[];
  repairedItems?: TraceRepairedItem[];
}

function normalizeForSearch(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

interface HighlightSpan {
  start: number;
  end: number;
  colorIdx: number;
  fragment: string;
  section?: string;
  isUnmatched?: boolean;
  isHallucination?: boolean;
}

function findBestMatch(text: string, fragment: string): { start: number; end: number } | null {
  const normalText = normalizeForSearch(text);
  const normalFrag = normalizeForSearch(fragment);

  const idx = normalText.indexOf(normalFrag);
  if (idx !== -1) {
    let origStart = 0, normalPos = 0;
    const lowerText = text.toLowerCase();
    while (normalPos < idx && origStart < text.length) {
      if (/\s/.test(lowerText[origStart])) {
        while (origStart < text.length && /\s/.test(lowerText[origStart])) origStart++;
        normalPos++;
      } else {
        origStart++;
        normalPos++;
      }
    }
    const start = origStart;
    let origEnd = start, matchLen = 0;
    while (matchLen < normalFrag.length && origEnd < text.length) {
      if (/\s/.test(lowerText[origEnd])) {
        while (origEnd < text.length && /\s/.test(lowerText[origEnd])) origEnd++;
        matchLen++;
      } else {
        origEnd++;
        matchLen++;
      }
    }
    return { start, end: origEnd };
  }

  const fragWords = normalFrag.split(/\s+/).filter(w => w.length > 2);
  if (fragWords.length === 0) return null;

  const lines = text.split("\n");
  let bestScore = 0;
  let bestRange: { start: number; end: number } | null = null;
  let offset = 0;

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    const lineWords = lineLower.split(/\s+/);
    let matches = 0;
    for (const fw of fragWords) {
      if (lineWords.some(lw => lw.includes(fw))) matches++;
    }
    const score = matches / fragWords.length;
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestRange = { start: offset, end: offset + line.length };
    }
    offset += line.length + 1;
  }

  return bestRange;
}

function buildHighlights(text: string, fragments: { fragment: string; colorIdx: number; section?: string; isUnmatched?: boolean; isHallucination?: boolean }[]): HighlightSpan[] {
  const spans: HighlightSpan[] = [];

  for (const f of fragments) {
    const match = findBestMatch(text, f.fragment);
    if (!match) continue;

    let overlap = false;
    for (const existing of spans) {
      if (match.start < existing.end && match.end > existing.start) {
        overlap = true;
        break;
      }
    }
    if (overlap) continue;

    spans.push({ ...match, colorIdx: f.colorIdx, fragment: f.fragment, section: f.section, isUnmatched: f.isUnmatched, isHallucination: f.isHallucination });
  }

  spans.sort((a, b) => a.start - b.start);
  return spans;
}

function buildParts(text: string, highlights: HighlightSpan[]) {
  const result: { text: string; highlight?: HighlightSpan }[] = [];
  let pos = 0;
  for (const h of highlights) {
    if (h.start > pos) result.push({ text: text.slice(pos, h.start) });
    result.push({ text: text.slice(h.start, h.end), highlight: h });
    pos = h.end;
  }
  if (pos < text.length) result.push({ text: text.slice(pos) });
  return result;
}

function renderParts(parts: ReturnType<typeof buildParts>, isDark: boolean) {
  return parts.map((p, i) => {
    if (!p.highlight) return <span key={i}>{p.text}</span>;
    const h = p.highlight;
    const color = h.isHallucination
      ? HALLUCINATION_COLOR
      : h.isUnmatched
      ? UNMATCHED_COLOR
      : TRACE_COLORS[h.colorIdx % TRACE_COLORS.length];
    const tooltip = h.isHallucination
      ? `⚠ Hallucination — ${h.section}`
      : h.isUnmatched
      ? `⚠ Not found in findings`
      : `→ ${h.section}`;
    return (
      <mark
        key={i}
        className="rounded px-0.5 relative cursor-default"
        style={{
          backgroundColor: isDark ? color.dark : color.bg,
          color: "inherit",
          borderBottom: `2px solid ${color.text}`,
          textDecoration: h.isHallucination ? "line-through" : undefined,
        }}
        title={tooltip}
      >
        {p.text}
      </mark>
    );
  });
}

export interface HighlightedTextHandle {
  getText: () => string;
}

export const HighlightedText = forwardRef<HighlightedTextHandle, {
  text: string;
  highlights: HighlightSpan[];
  isDark: boolean;
  editable?: boolean;
  minHeight?: number;
}>(function HighlightedText({ text, highlights, isDark, editable, minHeight }, fwdRef) {
  const divRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => buildParts(text, highlights), [text, highlights]);

  useImperativeHandle(fwdRef, () => ({
    getText: () => divRef.current?.innerText || text,
  }), [text]);

  return (
    <div
      ref={divRef}
      contentEditable={editable}
      suppressContentEditableWarning
      className={`text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-md border bg-white dark:bg-gray-900 min-h-[80px] ${
        editable
          ? "border-blue-300 dark:border-blue-600 outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
          : "border-gray-200 dark:border-gray-700"
      }`}
      style={minHeight ? { minHeight } : undefined}
    >
      {renderParts(parts, isDark)}
    </div>
  );
});

export function TraceLegend({ trace, isDark }: { trace: TraceData; isDark: boolean }) {
  const t = useT();
  const sections = useMemo(() => {
    const map = new Map<string, number>();
    trace.mappings.forEach((m, i) => {
      if (!map.has(m.section)) map.set(m.section, i);
    });
    return Array.from(map.entries());
  }, [trace.mappings]);

  const hasRepairs = (trace.repairedItems?.length || 0) > 0;
  const hasUnmatched = trace.unmatched.length > 0;
  const total = trace.mappings.length + trace.unmatched.length;
  const matched = trace.mappings.length;
  const allGood = !hasUnmatched && trace.hallucinations.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {t("trace.title")}: {matched}/{total}
        </span>
        <div className="flex items-center gap-2">
          {allGood && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
              <Check className="h-3 w-3" />
              {t("trace.all_verified")}
            </span>
          )}
          {hasRepairs && (
            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Check className="h-3 w-3" />
              {trace.repairedItems!.length} {t("trace.auto_repaired_count")}
            </span>
          )}
          {hasUnmatched && (
            <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {trace.unmatched.length} {t("trace.omissions")}
            </span>
          )}
          {trace.hallucinations.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <ShieldAlert className="h-3 w-3" />
              {trace.hallucinations.length} {t("trace.hallucinations")}
            </span>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${total > 0 ? (matched / total) * 100 : 0}%`,
            backgroundColor: allGood ? "#22c55e" : hasUnmatched ? "#f59e0b" : "#a855f7",
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sections.map(([section, colorIdx]) => (
          <span
            key={section}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isDark ? TRACE_COLORS[colorIdx % TRACE_COLORS.length].dark : TRACE_COLORS[colorIdx % TRACE_COLORS.length].bg,
              borderBottom: `2px solid ${TRACE_COLORS[colorIdx % TRACE_COLORS.length].text}`,
            }}
          >
            {section}
          </span>
        ))}
      </div>

      {hasUnmatched && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">
            {t("trace.omitted_title")}
          </span>
          {trace.unmatched.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <AlertTriangle className="h-3 w-3 mt-0.5 text-red-500 dark:text-red-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-800 dark:text-gray-200">&ldquo;{item.dictation_fragment}&rdquo;</span>
                <span className="text-gray-500 dark:text-gray-400"> — {item.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {trace.hallucinations.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
            {t("trace.hallucination_title")}
          </span>
          {trace.hallucinations.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
            >
              <ShieldAlert className="h-3 w-3 mt-0.5 text-purple-500 dark:text-purple-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-800 dark:text-gray-200">&ldquo;{item.findings_fragment}&rdquo;</span>
                <span className="text-gray-500 dark:text-gray-400"> ({item.section}) — {item.reason}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasRepairs && (
        <div className="space-y-1 pt-1">
          <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
            {t("trace.repaired_title")}
          </span>
          {trace.repairedItems!.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11px] px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
            >
              <Check className="h-3 w-3 mt-0.5 text-blue-500 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-gray-800 dark:text-gray-200">&ldquo;{item.dictation_fragment}&rdquo;</span>
                <span className="text-gray-500 dark:text-gray-400"> → {item.inserted_into_section}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function useTraceHighlights(dictation: string, findings: string, trace: TraceData | null) {
  return useMemo(() => {
    if (!trace) return { dictationHighlights: [] as HighlightSpan[], findingsHighlights: [] as HighlightSpan[] };

    const sectionColorMap = new Map<string, number>();
    let nextColor = 0;
    for (const m of trace.mappings) {
      if (!sectionColorMap.has(m.section)) {
        sectionColorMap.set(m.section, nextColor++);
      }
    }

    const dictFrags = [
      ...trace.mappings.map(m => ({
        fragment: m.dictation_fragment,
        colorIdx: sectionColorMap.get(m.section) || 0,
        section: m.section,
      })),
      ...trace.unmatched.map(u => ({
        fragment: u.dictation_fragment,
        colorIdx: -1,
        section: undefined,
        isUnmatched: true as const,
      })),
    ];

    const findingsFrags = [
      ...trace.mappings.map(m => ({
        fragment: m.dictation_fragment,
        colorIdx: sectionColorMap.get(m.section) || 0,
        section: m.section,
      })),
      ...trace.hallucinations.map(h => ({
        fragment: h.findings_fragment,
        colorIdx: -1,
        section: h.section,
        isHallucination: true as const,
      })),
    ];

    return {
      dictationHighlights: buildHighlights(dictation, dictFrags),
      findingsHighlights: buildHighlights(findings, findingsFrags),
    };
  }, [dictation, findings, trace]);
}
