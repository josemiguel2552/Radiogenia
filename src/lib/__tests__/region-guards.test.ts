import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Interpretive features (classification, follow-up recommendations, clinical
 * checks, case assistant) are clinical decision support, and offering them in
 * the EU/EEA/UK or the US would make the product a regulated medical device.
 *
 * Recommendations shipped to those regions once already: the region flag
 * existed and was simply never read by the recommendation routes or by the
 * panel that renders them, so nothing failed and nobody noticed. These tests
 * assert the guard is actually present, since a feature that forgets to ask
 * is indistinguishable from one that is allowed.
 */

const ROOT = join(__dirname, "../../..");

function source(rel: string): string {
  const path = join(ROOT, rel);
  expect(existsSync(path), `${rel} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

/** Every route that must refuse the feature outside "open" regions. */
const GUARDED_ROUTES: { file: string; feature: string }[] = [
  { file: "src/app/api/generate/classify/route.ts", feature: "classification" },
  { file: "src/app/api/generate/classify/detect/route.ts", feature: "classification" },
  { file: "src/app/api/generate/classify/preflight/route.ts", feature: "classification" },
  { file: "src/app/api/generate/clinical-check/route.ts", feature: "clinicalCheck" },
  { file: "src/app/api/generate/chatbot/route.ts", feature: "caseAssistant" },
  { file: "src/app/api/recommendations/extract/route.ts", feature: "recommendations" },
  { file: "src/app/api/recommendations/catalog/route.ts", feature: "recommendations" },
  { file: "src/app/api/recommendations/custom/route.ts", feature: "recommendations" },
  { file: "src/app/api/recommendations/imports/route.ts", feature: "recommendations" },
  { file: "src/app/api/org/recommendations/route.ts", feature: "recommendations" },
];

describe("regional guards on interpretive API routes", () => {
  for (const { file, feature } of GUARDED_ROUTES) {
    it(`${file} guards "${feature}"`, () => {
      const src = source(file);
      expect(src).toContain("requireRegionFeature");
      expect(src).toContain(`"${feature}"`);
    });
  }

  it("guards every request handler in each route, not just the first", () => {
    for (const { file } of GUARDED_ROUTES) {
      const src = source(file);
      const handlers = (src.match(/export async function (GET|POST|PUT|DELETE|PATCH)\b/g) || []).length;
      const guards = (src.match(/requireRegionFeature\(/g) || []).length;
      expect(guards, `${file}: ${handlers} handler(s) but ${guards} guard(s)`).toBeGreaterThanOrEqual(handlers);
    }
  });
});

describe("regional gating in the report UI", () => {
  it("only renders the recommendation panel where recommendations are allowed", () => {
    const src = source("src/components/dashboard/dashboard-content.tsx");
    expect(src).toMatch(/visible=\{[^}]*regionFeatures\.recommendations[^}]*\}/);
  });

  it("hides the recommendations entry from every navigation menu", () => {
    const src = source("src/components/dashboard/dashboard-shell.tsx");
    // Each menu entry for the recommendations view carries the region flag.
    const entries = src.match(/key: "recommendations"[^\n]*|view: "recommendations"[^\n]*/g) || [];
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry, `menu entry without a region gate: ${entry.trim()}`).toContain("recommendationsAllowed");
    }
  });
});
