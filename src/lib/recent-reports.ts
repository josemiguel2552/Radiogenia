// ---------------------------------------------------------------------------
// Recent reports — browser-only, session-scoped
// ---------------------------------------------------------------------------
// Keeps the last few generated reports in localStorage so the radiologist can
// glance back at them during a session. Nothing is sent to the server or the
// database, and the list is wiped on logout (see clearRecentReports, called
// from the dashboard shell's logout handler). This keeps zero footprint on the
// platform while giving quick in-session access.

export interface RecentReport {
  id: string;
  title: string;
  findings: string;
  conclusion: string;
  ts: number;
}

const STORAGE_KEY = "radiogenai_recent_reports";
const MAX_ITEMS = 5;
export const RECENT_UPDATED_EVENT = "radiogenai:recent-updated";
export const LOAD_RECENT_EVENT = "radiogenai:load-recent";

export function getRecentReports(): RecentReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addRecentReport(report: {
  title: string;
  findings: string;
  conclusion: string;
}): RecentReport[] {
  if (typeof window === "undefined") return [];
  if (!report.findings || !report.findings.trim()) return getRecentReports();

  const list = getRecentReports();
  // Avoid consecutive duplicates (e.g. re-generation of the same content).
  if (list[0] && list[0].findings === report.findings && list[0].conclusion === report.conclusion) {
    return list;
  }

  const entry: RecentReport = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
    title: report.title || "",
    findings: report.findings,
    conclusion: report.conclusion || "",
  };

  const next = [entry, ...list].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(RECENT_UPDATED_EVENT));
  } catch {
    /* storage full / disabled — ignore */
  }
  return next;
}

export function clearRecentReports(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(RECENT_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
}
