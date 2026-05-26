import { describe, it, expect } from "vitest";
import { _uiDictionary } from "../i18n";

describe("i18n completeness", () => {
  const es = _uiDictionary.es;
  const en = _uiDictionary.en;
  const pt = _uiDictionary.pt;

  const esKeys = new Set(Object.keys(es));
  const enKeys = new Set(Object.keys(en));
  const ptKeys = new Set(Object.keys(pt));

  it("Spanish dictionary has entries", () => {
    expect(esKeys.size).toBeGreaterThan(100);
  });

  it("English dictionary has entries", () => {
    expect(enKeys.size).toBeGreaterThan(100);
  });

  it("Portuguese dictionary has entries", () => {
    expect(ptKeys.size).toBeGreaterThan(100);
  });

  it("English has all Spanish keys", () => {
    const missing = [...esKeys].filter((k) => !enKeys.has(k));
    if (missing.length > 0) {
      console.warn("Keys in ES missing from EN:", missing.slice(0, 20));
    }
    expect(missing).toEqual([]);
  });

  it("Portuguese has all Spanish keys", () => {
    const missing = [...esKeys].filter((k) => !ptKeys.has(k));
    if (missing.length > 0) {
      console.warn("Keys in ES missing from PT:", missing.slice(0, 20));
    }
    expect(missing).toEqual([]);
  });

  it("Spanish has all English keys", () => {
    const missing = [...enKeys].filter((k) => !esKeys.has(k));
    if (missing.length > 0) {
      console.warn("Keys in EN missing from ES:", missing.slice(0, 20));
    }
    expect(missing).toEqual([]);
  });

  it("no empty translation values", () => {
    const emptyEs = Object.entries(es).filter(([, v]) => !v.trim());
    const emptyEn = Object.entries(en).filter(([, v]) => !v.trim());
    const emptyPt = Object.entries(pt).filter(([, v]) => !v.trim());
    expect(emptyEs).toEqual([]);
    expect(emptyEn).toEqual([]);
    expect(emptyPt).toEqual([]);
  });
});
