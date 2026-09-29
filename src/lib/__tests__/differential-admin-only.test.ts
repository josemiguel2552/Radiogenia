import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * The differential assistant reads an image and names diseases. That is the
 * one thing the platform's own legal documents say it does not do — they
 * state, in all three languages, that Radiogen.AI "does NOT interpret medical
 * images" and is not a medical device under the EU MDR.
 *
 * It exists as an admin tool on that basis. Who can reach it is therefore not
 * a UI preference: exposing it to ordinary radiologists would contradict what
 * every user has been asked to consent to. These tests assert the gate on
 * every entry point, because the failure mode is silent — a button that
 * appears for the wrong person looks exactly like one that appears for the
 * right one.
 */

const ROOT = join(__dirname, "../../..");

function source(rel: string): string {
  const path = join(ROOT, rel);
  expect(existsSync(path), `${rel} should exist`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("the endpoint refuses anyone who is not an admin", () => {
  const route = source("src/app/api/admin/differential/route.ts");

  it("calls requireAdmin before doing anything else", () => {
    expect(route).toContain("requireAdmin");
    // Compared at the call sites: both names also appear in the imports at
    // the top, where their order says nothing about what runs first.
    const gate = route.indexOf("await requireAdmin(");
    const modelCall = route.indexOf("await generateWithImages(");
    expect(gate).toBeGreaterThan(-1);
    expect(modelCall).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(modelCall);
  });

  it("does not fall back to a plain session check", () => {
    // getUser() alone would authenticate any logged-in radiologist.
    expect(route).not.toContain("auth.getUser");
  });

  it("lives under the admin API namespace", () => {
    expect(existsSync(join(ROOT, "src/app/api/admin/differential/route.ts"))).toBe(true);
  });
});

describe("every button that opens it is behind the admin role", () => {
  const shell = source("src/components/dashboard/dashboard-shell.tsx");

  it("renders no trigger in the report screen without the role check", () => {
    // Each occurrence must sit inside a `role === "admin"` branch. Checked by
    // looking at what precedes it rather than trusting the file to read well.
    const occurrences = [...shell.matchAll(/<DifferentialDialog/g)].map((m) => m.index ?? 0);
    expect(occurrences.length).toBeGreaterThan(0);
    for (const at of occurrences) {
      const preceding = shell.slice(Math.max(0, at - 400), at);
      expect(preceding).toContain('role === "admin"');
    }
  });

  it("keeps the admin page trigger, which is already behind the admin route", () => {
    expect(source("src/app/admin/page.tsx")).toContain("<DifferentialDialog");
  });
});

describe("it stays out of the reporting flow", () => {
  it("is not imported by the report editor", () => {
    // Nothing it produces may reach a report: the conclusion prompt forbids
    // naming entities, and this names five of them.
    expect(source("src/components/dashboard/dashboard-content.tsx"))
      .not.toContain("differential");
  });

  it("has no route outside the admin namespace", () => {
    for (const rel of [
      "src/app/api/generate/differential/route.ts",
      "src/app/api/differential/route.ts",
    ]) {
      expect(existsSync(join(ROOT, rel)), `${rel} must not exist`).toBe(false);
    }
  });
});
