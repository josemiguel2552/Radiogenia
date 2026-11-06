"use client";

/**
 * Whether this visitor agreed to non-essential cookies.
 *
 * The banner used to write the answer to localStorage and nothing else:
 * Google Analytics and the Meta pixel were in the root layout, so they had
 * already loaded and fired a PageView before the banner rendered, and they
 * kept firing whichever button was pressed. Asking a question and ignoring
 * the answer is worse than not asking — under the GDPR a non-essential
 * tracker must not run before consent, and this product sells into EU
 * hospitals.
 *
 * So the answer lives here, the trackers read it, and a change is announced
 * on the same tick rather than waiting for a reload.
 */

const STORAGE_KEY = "cookie_consent";
export const CONSENT_EVENT = "radiogenai:cookie-consent";

export type Consent = "all" | "essential";

/** What this browser last answered, or null if it has not been asked. */
export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    // Private mode and blocked storage both land here. Unknown means not
    // granted, which is the only safe reading of a missing consent.
    return null;
  }
}

export function writeConsent(value: Consent) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch { /* the banner will simply ask again next time */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** True only for an explicit yes. */
export function analyticsAllowed(): boolean {
  return readConsent() === "all";
}
