import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { loadBootstrap, resetBootstrap, cachedConsentVersion, rememberConsent, forgetConsent } from "@/lib/bootstrap";

/**
 * One request to open the dashboard, instead of seven.
 *
 * Opening the dashboard fired consent, region, templates, model config,
 * subscription, signatures and the report count as seven separate requests,
 * each re-validating the session against the Supabase auth server before it
 * could start. Next to the datacentre that is free; on a hospital connection
 * it is seven round trips before the screen is usable, and no amount of
 * bundle trimming touches it.
 *
 * What these guard is the part that is easy to regress: that it stays ONE
 * request however many components ask, and that a failed section degrades to
 * the old endpoint instead of leaving the dashboard empty.
 */

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const store = new Map<string, string>();
beforeEach(() => {
  resetBootstrap();
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("the batch is fetched once, however many components want it", () => {
  it("issues a single request for simultaneous callers", async () => {
    // The consent wall renders before the dashboard it wraps, so both ask.
    // A plain fetch in each would double the very round trip being saved.
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ consent: { required: false } }) }));
    vi.stubGlobal("fetch", fetchMock);

    const [a, b, c] = await Promise.all([loadBootstrap(), loadBootstrap(), loadBootstrap()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/bootstrap");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("keeps serving the same answer to a late caller", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ region: { features: { dictation: true } } }) }));
    vi.stubGlobal("fetch", fetchMock);
    await loadBootstrap();
    const late = await loadBootstrap();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(late.region).toEqual({ features: { dictation: true } });
  });

  it("returns empty sections rather than throwing when the batch fails", async () => {
    // Every caller treats a null section as "ask the old endpoint". A
    // rejected promise here would instead take the whole dashboard down.
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const b = await loadBootstrap();
    expect(b.consent).toBeNull();
    expect(b.templates).toBeNull();
    expect(b.subscription).toBeNull();
  });

  it("treats a non-OK response the same way", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, json: async () => ({ anything: 1 }) })));
    const b = await loadBootstrap();
    expect(b.region).toBeNull();
  });
});

describe("the consent gate remembers, so it stops blocking first paint", () => {
  it("starts with nothing remembered", () => {
    expect(cachedConsentVersion()).toBeNull();
  });

  it("remembers an accepted version and can forget it", () => {
    rememberConsent("1.0");
    expect(cachedConsentVersion()).toBe("1.0");
    forgetConsent();
    expect(cachedConsentVersion()).toBeNull();
  });

  it("survives a browser that refuses storage", () => {
    // Private mode throws on access. The wall must fall back to blocking,
    // not crash the page it is wrapping.
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    });
    expect(() => rememberConsent("1.0")).not.toThrow();
    expect(cachedConsentVersion()).toBeNull();
  });
});

describe("the endpoint composes the real handlers", () => {
  const route = read("src/app/api/bootstrap/route.ts");

  it("reuses each route's own GET instead of reimplementing its queries", () => {
    // A second copy of the subscription or consent rules is a copy that gets
    // corrected in one place and not the other.
    for (const h of ["consentGET", "regionGET", "modelConfigGET", "signaturesGET", "subscriptionGET", "templatesGET", "reportsGET"]) {
      expect(route).toContain(h);
    }
    expect(route).not.toMatch(/from\("(consent_records|user_model_config|reports)"\)/);
  });

  it("runs them in parallel, which is the entire point", () => {
    // Sequentially this would be the same waterfall, just moved to the server.
    expect(route).toContain("await Promise.all([");
    const batch = route.slice(route.indexOf("await Promise.all(["), route.indexOf("]);"));
    expect((batch.match(/section\(/g) || []).length).toBe(7);
  });

  it("isolates a failing section instead of failing the batch", () => {
    const helper = route.slice(route.indexOf("async function section"), route.indexOf("export async function GET"));
    expect(helper).toContain("return null");
    expect(helper).toContain("catch");
  });

  it("asks the reports handler for the count, not the reports", () => {
    expect(route).toContain('searchParams.set("count_only", "1")');
  });
});

describe("the dashboard falls back to the old endpoints", () => {
  const dash = read("src/components/dashboard/dashboard-content.tsx");

  it("pairs every batched read with its individual endpoint", () => {
    // `b.x ?? fetch(...)` is what makes this an optimisation rather than a
    // new single point of failure.
    for (const [key, url] of [
      ["reports", "/api/reports?count_only=1"],
      ["region", "/api/region"],
      ["signatures", "/api/signatures"],
      ["subscription", "/api/subscription"],
      ["templates", "/api/templates"],
      ["config", "/api/model-config"],
    ]) {
      const i = dash.indexOf(`b.${key} ??`);
      expect(`${key}: ${i > -1}`).toBe(`${key}: true`);
      expect(dash.slice(i, i + 220)).toContain(url);
    }
  });

  it("no longer puts the seeding call in front of the first render", () => {
    // /api/seed provisions defaults for an account that has never had them.
    // Nothing on screen reads its result, so everyone else used to wait on
    // a write they did not need.
    const effect = dash.slice(dash.indexOf("async function load()"), dash.indexOf("load();"));
    const seed = effect.indexOf('"/api/seed"');
    const templates = effect.indexOf("b.templates ??");
    expect(seed).toBeGreaterThan(templates);
    expect(effect).toContain("tpl.length === 0");
  });
});
