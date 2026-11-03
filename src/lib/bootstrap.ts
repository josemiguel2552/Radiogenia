"use client";

/**
 * The dashboard's opening payload, fetched once and shared.
 *
 * Two components need this data before the screen is usable — the consent
 * wall, which renders first, and the dashboard behind it — and they mount at
 * different moments. A plain fetch in each would issue the request twice, so
 * the promise itself is the cache: whoever asks first starts it, everyone
 * else awaits the same one.
 *
 * Every field is nullable on purpose. `/api/bootstrap` returns null for any
 * section whose handler failed rather than failing the batch, and callers
 * fall back to the individual endpoint for whatever is missing. That keeps
 * this an optimisation and never a new way for the dashboard to break.
 */

export interface BootstrapConsent {
  required: boolean;
  pending?: string[];
  org_name?: string;
  version?: string;
}

export interface BootstrapPayload {
  consent: BootstrapConsent | null;
  region: { features?: Record<string, boolean>; region?: string; isAdmin?: boolean } | null;
  config: Record<string, unknown> | null;
  signatures: { is_active: boolean; body: string }[] | null;
  subscription: Record<string, unknown> | null;
  templates: unknown[] | null;
  reports: { count?: number } | null;
}

const EMPTY: BootstrapPayload = {
  consent: null, region: null, config: null,
  signatures: null, subscription: null, templates: null, reports: null,
};

let inflight: Promise<BootstrapPayload> | null = null;

/** The shared request. Starts it on the first call; returns the same promise after. */
export function loadBootstrap(): Promise<BootstrapPayload> {
  if (!inflight) {
    inflight = fetch("/api/bootstrap")
      .then((r) => (r.ok ? r.json() : EMPTY))
      .catch(() => EMPTY);
  }
  return inflight;
}

/** Drops the cache so the next caller refetches. For tests and explicit reloads. */
export function resetBootstrap() {
  inflight = null;
}

/* ── The consent gate's memory ──────────────────────────────────────────
   The wall used to hold a full-screen spinner over the whole dashboard
   until /api/consent answered, so every single load paid a round trip
   before anything could render — for the sake of a question that is
   "no" for every user who has already accepted. Remembering the accepted
   version locally lets those loads paint immediately while the real check
   runs behind them; the wall still appears if the answer comes back yes. */

const CONSENT_KEY = "rg_consent_version";

/** The consent version this browser last recorded as fully accepted. */
export function cachedConsentVersion(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function rememberConsent(version: string | undefined) {
  try {
    localStorage.setItem(CONSENT_KEY, version || "1.0");
  } catch { /* private mode: the wall simply blocks again next time */ }
}

export function forgetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch { /* ignore */ }
}
