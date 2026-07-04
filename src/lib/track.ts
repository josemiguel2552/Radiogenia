/**
 * Lightweight product-analytics tracking.
 *
 * Records which tools/buttons users actually interact with, into the same
 * audit_logs table shown in the admin Audit tab. Fire-and-forget: tracking
 * must never slow down or break the UI.
 *
 * Actions must be prefixed "ui_" (enforced by the API and a DB constraint).
 */

const recent = new Map<string, number>();
const DEDUPE_MS = 5000;

export function track(action: string, metadata?: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    const key = `${action}:${JSON.stringify(metadata || {})}`;
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < DEDUPE_MS) return;
    recent.set(key, now);
    // Bound the dedupe map.
    if (recent.size > 200) {
      const cutoff = now - DEDUPE_MS;
      for (const [k, ts] of recent) if (ts < cutoff) recent.delete(k);
    }

    fetch("/api/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, metadata: metadata || {} }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never throw from tracking */ }
}
