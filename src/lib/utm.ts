/**
 * Traffic-attribution capture: stores UTM params (and external referrer) from
 * the first landing in localStorage, so the signup can record which channel
 * brought the user (crossed later with activation data, e.g. Meta Ads).
 */

const KEY = "rg_utm";
const PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];

export function captureUtm(): void {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return; // keep first-touch attribution
    const sp = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    for (const k of PARAMS) {
      const v = sp.get(k);
      if (v) utm[k] = v.slice(0, 200);
    }
    if (document.referrer && !document.referrer.includes(window.location.hostname)) {
      utm.referrer = document.referrer.slice(0, 300);
    }
    if (Object.keys(utm).length > 0) localStorage.setItem(KEY, JSON.stringify(utm));
  } catch { /* ignore */ }
}

export function readUtm(): Record<string, string> | undefined {
  try {
    if (typeof window === "undefined") return undefined;
    captureUtm(); // also catch params on the current page (direct ad → /waitlist)
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}
