import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { resolveRegion, regionFeatures } from "@/lib/region";

/**
 * A hospital decides the regime its radiologists work under, and whether it is
 * buying seats or being given them. Both were previously impossible to set:
 * the region was inferred per user — from a country the hospital signup form
 * never asks for, then from the IP the signup arrived through — so members of
 * one institution could land on different feature sets, and a Latin American
 * hospital could get the European documentation-only interface.
 *
 * These are source assertions rather than runtime ones: the paths they guard
 * run against Supabase and Stripe, and what matters is that the gate exists at
 * all. A missing one fails silently, which is the whole problem.
 */

const ROOT = join(__dirname, "../../..");
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("the region a hospital chooses reaches its radiologists", () => {
  const signup = source("src/app/api/hospital-signup/route.ts");

  it("reads the region off the organization", () => {
    expect(signup).toContain('"id, name, is_active, max_seats, region"');
  });

  it("writes it onto the profile it creates", () => {
    expect(signup).toContain("region_override");
    expect(signup).toMatch(/org\.region === "eu"/);
  });

  it("accepts only the three real regions", () => {
    // Anything else must leave the inference alone rather than store junk.
    for (const bad of ['"latam"', '"europe"', '"ue"']) {
      expect(signup).not.toContain(`org.region === ${bad}`);
    }
  });
});

describe("the override decides the feature set", () => {
  const helpers = source("src/lib/auth-helpers.ts");

  it("is honoured before falling back to the country", () => {
    const override = helpers.indexOf("region_override");
    const fallback = helpers.indexOf("return resolveRegion(data?.country, connectionCountry)");
    expect(override).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(override);
  });

  it("still infers when the hospital set nothing", () => {
    // A hospital on "automatic" must behave exactly as before.
    expect(resolveRegion(null, "ES")).toBe("eu");
    expect(resolveRegion(null, "US")).toBe("us");
    expect(resolveRegion(null, "AR")).toBe("open");
  });

  it("means what it is meant to mean", () => {
    expect(regionFeatures("open").classification).toBe(true);
    for (const r of ["eu", "us"] as const) {
      const f = regionFeatures(r);
      expect(f.classification).toBe(false);
      expect(f.recommendations).toBe(false);
      expect(f.clinicalCheck).toBe(false);
      expect(f.caseAssistant).toBe(false);
    }
  });
});

describe("a gifted hospital is never asked for money", () => {
  const submit = source("src/app/api/hospital-onboarding/submit/route.ts");

  it("activates the seats instead of reaching Stripe", () => {
    expect(submit).toContain('org.billing_mode === "gifted"');
    const gate = submit.indexOf('org.billing_mode === "gifted"');
    const stripe = submit.indexOf("STRIPE_SECRET_KEY");
    expect(gate).toBeGreaterThan(-1);
    expect(stripe).toBeGreaterThan(gate);
  });

  it("returns before the payment branch rather than alongside it", () => {
    const gifted = submit.slice(submit.indexOf('org.billing_mode === "gifted"'));
    expect(gifted.slice(0, 600)).toContain("activateSeatOrder");
    expect(gifted.slice(0, 600)).toContain("return NextResponse.json");
  });

  it("tells the page, so it can drop the prices", () => {
    expect(source("src/app/api/hospital-onboarding/info/route.ts"))
      .toContain('gifted: org.billing_mode === "gifted"');
  });

  it("defaults to paid, so gifting is always a deliberate choice", () => {
    const migration = source("supabase/migrations/20261014_hospital_region_and_gifting.sql");
    expect(migration).toContain("billing_mode text NOT NULL DEFAULT 'paid'");
    expect(migration).toContain("CHECK (billing_mode IN ('paid', 'gifted'))");
  });
});

describe("the radiologist signup asks for an email confirmation and nothing else", () => {
  const signup = source("src/app/api/hospital-signup/route.ts");

  it("creates the account unconfirmed, so Supabase itself holds the gate", () => {
    expect(signup).toContain("email_confirm: false");
    expect(signup).toContain("email_verified: false");
  });

  it("sends a confirmation link", () => {
    expect(signup).toContain("generateLink");
    expect(signup).toContain("sendWelcomeEmail");
    expect(signup).toContain("needsConfirmation: true");
  });

  it("never puts a payment step in front of them", () => {
    for (const term of ["stripe", "checkout", "pending_checkout_plan", "price"]) {
      expect(signup.toLowerCase()).not.toContain(term);
    }
  });

  it("stops signing them in straight away, which would now fail", () => {
    const page = source("src/app/hospital-signup/page.tsx");
    expect(page).not.toContain("signInWithPassword");
    expect(page).toContain("confirm_title");
  });
});
