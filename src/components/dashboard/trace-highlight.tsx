"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

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

export interface TraceMapping {
  dictation_fragment: string;
  section: string;
  matched: boolean;
}

export interface TraceUnmatched {
  dictation_fragment: string;
  reason: string;
}

export interface TraceData {
  mappings: TraceMapping[];
  unmatched: TraceUnmatched[];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
}

function findBestMatch(text: string, fragment: string): { start: number; end: number } | null {
  const normalText = normalizeForSearch(text);
  const normalFrag = normalizeForSearch(fragment);

  // Exact match on normalized text
  const idx = normalText.indexOf(normalFrag);
  if (idx !== -1) {
    // Map back to original positions
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

  // Fallback: word-level overlap search
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

function buildHighlights(text: string, fragments: { fragment: string; colorIdx: number; section?: string; isUnmatched?: boolean }[]): HighlightSpan[] {
  const spans: HighlightSpan[] = [];
  const used = new Set<number>();

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

    spans.push({ ...match, colorIdx: f.colorIdx, fragment: f.fragment, section: f.section, isUnmatched: f.isUnmatched });
  }

  spans.sort((a, b) => a.start - b.start);
  return spans;
}

export function HighlightedText({
  text,
  highlights,
  isDark,
}: {
  text: string;
  highlights: HighlightSpan[];
  isDark: boolean;
}) {
  const parts = useMemo(() => {
    const result: { text: string; highlight?: HighlightSpan }[] = [];
    let pos = 0;
    for (const h of highlights) {
      if (h.start > pos) {
        result.push({ text: text.slice(pos, h.start) });
      }
      result.push({ text: text.slice(h.start, h.end), highlight: h });
      pos = h.end;
    }
    if (pos < text.length) {
      result.push({ text: text.slice(pos) });
    }
    return result;
  }, [text, highlights]);

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 min-h-[80px]">
      {parts.map((p, i) =>
        p.highlight ? (
          <mark
            key={i}
            className="rounded px-0.5 relative cursor-default"
            style={{
              backgroundColor: p.highlight.isUnmatched
                ? (isDark ? UNMATCHED_COLOR.dark : UNMATCHED_COLOR.bg)
                : (isDark ? TRACE_COLORS[p.highlight.colorIdx % TRACE_COLORS.length].dark : TRACE_COLORS[p.highlight.colorIdx % TRACE_COLORS.length].bg),
              color: "inherit",
              borderBottom: `2px solid ${p.highlight.isUnmatched ? UNMATCHED_COLOR.text : TRACE_COLORS[p.highlight.colorIdx % TRACE_COLORS.length].text}`,
            }}
            title={p.highlight.isUnmatched ? `⚠ Not found in findings` : `→ ${p.highlight.section}`}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </div>
  );
}

export function TraceLegend({ trace, isDark }: { trace: TraceData; isDark: boolean }) {
  const sections = useMemo(() => {
    const map = new Map<string, number>();
    trace.mappings.forEach((m, i) => {
      if (!map.has(m.section)) map.set(m.section, i);
    });
    return Array.from(map.entries());
  }, [trace.mappings]);

  const total = trace.mappings.length + trace.unmatched.length;
  const matched = trace.mappings.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Traceability: {matched}/{total} phrases mapped
        </span>
        {trace.unmatched.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
            <AlertTriangle className="h-3 w-3" />
            {trace.unmatched.length} unmatched
          </span>
        )}
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${total > 0 ? (matched / total) * 100 : 0}%`,
            backgroundColor: trace.unmatched.length > 0 ? "#f59e0b" : "#22c55e",
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
        {trace.unmatched.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              backgroundColor: isDark ? UNMATCHED_COLOR.dark : UNMATCHED_COLOR.bg,
              borderBottom: `2px solid ${UNMATCHED_COLOR.text}`,
              color: UNMATCHED_COLOR.text,
            }}
          >
            Unmatched
          </span>
        )}
      </div>
    </div>
  );
}

export function useTraceHighlights(dictation: string, findings: string, trace: TraceData | null) {
  return useMemo(() => {
    if (!trace) return { dictationHighlights: [], findingsHighlights: [] };

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

    const findingsFrags = trace.mappings.map(m => ({
      fragment: m.dictation_fragment,
      colorIdx: sectionColorMap.get(m.section) || 0,
      section: m.section,
    }));

    return {
      dictationHighlights: buildHighlights(dictation, dictFrags),
      findingsHighlights: buildHighlights(findings, findingsFrags),
    };
  }, [dictation, findings, trace]);
}
