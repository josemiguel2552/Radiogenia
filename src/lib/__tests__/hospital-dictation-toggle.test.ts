import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * A hospital can buy the platform without voice dictation.
 *
 * The thing that matters is that withholding it is a server decision: hiding
 * the microphone would leave every transcription endpoint reachable by anyone
 * who opened the network tab, and the hospitals most likely to want dictation
 * off are the ones that cannot allow microphone capture at all. So these are
 * source assertions on the gate, including the ORDER of the branches — a
 * "limit reached, upgrade your plan" message for a hospital that was never
 * sold dictation sends the radiologist to billing over something no payment
 * can fix.
 */

const ROOT = join(__dirname, "../../..");
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const TRANSCRIBE_ROUTES = [
  "src/app/api/transcribe/route.ts",
  "src/app/api/transcribe/token/route.ts",
  "src/app/api/transcribe/usage/route.ts",
  "src/app/api/transcribe/refine/route.ts",
  "src/app/api/transcribe/correct/route.ts",
];

describe("the gate lives in one place", () => {
  const helpers = source("src/lib/auth-helpers.ts");

  it("refuses an org member whose hospital has dictation off", () => {
    expect(helpers).toContain("isDictationEnabledForOrg");
    expect(helpers).toContain('reason: "org_disabled"');
  });

  it("checks it inside the org branch, which otherwise returns unlimited", () => {
    // Hospital members are unlimited; the refusal has to come before that
    // early return or it never runs at all.
    const orgBranch = helpers.slice(helpers.indexOf("if (profile?.org_id) {"));
    const check = orgBranch.indexOf("isDictationEnabledForOrg");
    const unlimited = orgBranch.indexOf("limitSeconds: 999999 * 60, plan: \"professional\" }");
    expect(check).toBeGreaterThan(-1);
    expect(unlimited).toBeGreaterThan(check);
  });

  it("treats a missing column as permission, not as a withdrawal", () => {
    // The flag ships before the migration is applied. Reading a column that
    // is not there must not switch dictation off for every hospital at once.
    const fn = helpers.slice(helpers.indexOf("async function isDictationEnabledForOrg"));
    expect(fn.slice(0, 600)).toContain("if (error) return true");
    expect(fn.slice(0, 600)).toContain("dictation_enabled !== false");
  });

  it("lets everyone outside a hospital dictate", () => {
    const fn = helpers.slice(helpers.indexOf("export async function isDictationEnabledForUser"));
    expect(fn.slice(0, 400)).toContain("if (!profile?.org_id) return true");
  });
});

describe("every transcription endpoint honours it", () => {
  for (const rel of TRANSCRIBE_ROUTES) {
    const src = source(rel);

    it(`${rel.split("/").slice(-2).join("/")} refuses a disabled hospital`, () => {
      expect(src).toContain('quota.reason === "org_disabled"');
      expect(src).toContain('code: "DICTATION_DISABLED"');
      // 403, not 429: there is no quota to wait out.
      const branch = src.slice(src.indexOf('quota.reason === "org_disabled"'));
      expect(branch.slice(0, 400)).toContain("status: 403");
    });

    it(`${rel.split("/").slice(-2).join("/")} checks it before the quota message`, () => {
      const disabled = src.indexOf('quota.reason === "org_disabled"');
      const limit = src.indexOf("Dictation limit reached");
      expect(disabled).toBeGreaterThan(-1);
      expect(limit).toBeGreaterThan(disabled);
    });
  }

  it("refuses to pair a phone as a microphone either", () => {
    const src = source("src/app/api/remote-dictation/token/route.ts");
    expect(src).toContain("isDictationEnabledForUser");
    expect(src).toContain('code: "DICTATION_DISABLED"');
  });
});

describe("the interface is told, and does not guess", () => {
  it("carries the entitlement alongside the regional features", () => {
    const region = source("src/app/api/region/route.ts");
    expect(region).toContain("isDictationEnabledForUser");
    expect(region).toContain("...regionFeatures(region), dictation");
  });

  it("leaves dictation out of the regional policy, which does not restrict it", () => {
    // Under the MDR, transcribing what the radiologist says is documentation.
    // Putting it in RegionFeatures would invite requireRegionFeature to be
    // used for it, where it would always pass and gate nothing.
    const reg = source("src/lib/region.ts");
    expect(reg).not.toContain("dictation:");
  });

  it("hides the microphone and the paired phone when it is off", () => {
    const ui = source("src/components/dashboard/dashboard-content.tsx");
    const gated = ui.split("regionFeatures.dictation");
    expect(gated.length).toBeGreaterThan(2);
    // The phone dictation entry point is inside one of those gates.
    const phoneGate = ui.lastIndexOf("regionFeatures.dictation", ui.indexOf("<RemotePhoneDictation"));
    expect(phoneGate).toBeGreaterThan(-1);
  });

  it("defaults to allowing it, so a failed request never removes the microphone", () => {
    const ui = source("src/components/dashboard/dashboard-content.tsx");
    expect(ui).toContain("caseAssistant: true, dictation: true }");
    // A response from before this field must not read as "off".
    expect(ui).toContain("setRegionFeatures({ dictation: true, ...d.features })");
  });
});

describe("the admin can set it on a new hospital and on an existing one", () => {
  const api = source("src/app/api/admin/organizations/route.ts");
  const ui = source("src/components/admin/admin-hospitals-tab.tsx");

  it("accepts it when creating", () => {
    const post = api.slice(api.indexOf("export async function POST"), api.indexOf("export async function PUT"));
    expect(post).toContain("dictation_enabled");
  });

  it("accepts it when editing, in both directions", () => {
    // A boolean check rather than a truthiness one, or it could never be
    // switched back off.
    expect(api).toContain('if (typeof dictation_enabled === "boolean") update.dictation_enabled = dictation_enabled;');
  });

  it("offers the control in the create dialog and on the hospital itself", () => {
    expect(ui).toContain("setCDictation");
    const detail = ui.slice(ui.indexOf("function HospitalDetail"));
    expect(detail).toContain("setEDictation");
    expect(detail).toContain("dictation_enabled: eDictation");
  });

  it("counts the toggle as an unsaved change", () => {
    // Otherwise the save button stays disabled and the switch does nothing.
    expect(ui).toContain("eDictation !== savedCfg.dictation");
  });

  it("defaults to enabled, so no hospital loses dictation by being migrated", () => {
    const migration = source("supabase/migrations/20261015_hospital_dictation_toggle.sql");
    expect(migration).toContain("dictation_enabled boolean not null default true");
  });
});
