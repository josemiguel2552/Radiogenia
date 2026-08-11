import { describe, it, expect } from "vitest";
import { resolveRegion, regionFeatures, isRestrictedRegion } from "../region";

describe("resolveRegion", () => {
  it("uses the declared account country over the connection country", () => {
    // A Mexican radiologist travelling through Madrid keeps their features.
    expect(resolveRegion("México", "ES")).toBe("open");
    // A Spanish account stays restricted wherever they connect from.
    expect(resolveRegion("España", "MX")).toBe("eu");
  });

  it("recognises EU/EEA/UK countries by name and ISO code", () => {
    for (const c of ["España", "Portugal", "France", "Alemania", "Italia", "IE", "GB", "CH", "NO"]) {
      expect(resolveRegion(c)).toBe("eu");
    }
  });

  it("recognises the United States", () => {
    for (const c of ["United States", "Estados Unidos", "USA", "US"]) {
      expect(resolveRegion(c)).toBe("us");
    }
  });

  it("treats Latin American countries as open", () => {
    for (const c of ["Argentina", "México", "Colombia", "Chile", "Perú", "Brasil"]) {
      expect(resolveRegion(c)).toBe("open");
    }
  });

  it("falls back to the connection country only when nothing was declared", () => {
    expect(resolveRegion(null, "DE")).toBe("eu");
    expect(resolveRegion("", "US")).toBe("us");
    expect(resolveRegion(null, "AR")).toBe("open");
    expect(resolveRegion(null, null)).toBe("open");
  });

  it("does not let an unknown declared country unlock or lock anything unexpectedly", () => {
    expect(resolveRegion("Other", "ES")).toBe("eu"); // unknown name → fall back to IP
    expect(resolveRegion("Other", null)).toBe("open");
  });
});

describe("regionFeatures", () => {
  it("keeps every interpretive feature off in restricted regions", () => {
    for (const r of ["eu", "us"] as const) {
      const f = regionFeatures(r);
      expect(f.classification).toBe(false);
      expect(f.recommendations).toBe(false);
      expect(f.clinicalCheck).toBe(false);
      expect(f.caseAssistant).toBe(false);
      expect(isRestrictedRegion(r)).toBe(true);
    }
  });

  it("enables everything elsewhere", () => {
    const f = regionFeatures("open");
    expect(f.classification && f.recommendations && f.clinicalCheck && f.caseAssistant).toBe(true);
    expect(isRestrictedRegion("open")).toBe(false);
  });
});
