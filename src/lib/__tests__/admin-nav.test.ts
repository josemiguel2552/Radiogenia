import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * The admin dashboard's ten flat tabs are grouped into five jobs.
 *
 * The failure mode of that regrouping is silent and total: a section left out
 * of every group still exists in the Tab union and still renders its JSX, but
 * nothing can navigate to it any more. Nobody notices until the day they need
 * the audit log. So the grouping is checked against the union itself rather
 * than against a list written out here, which would drift with it.
 */

const ROOT = join(__dirname, "../../..");
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const page = source("src/app/admin/page.tsx");

/** The section keys the page knows about, from `type Tab = ...`. */
function unionSections(): string[] {
  // The union spans several lines now, so read to its semicolon rather than
  // to the first newline — which silently returned nothing.
  const start = page.indexOf("type Tab =");
  const decl = page.slice(start, page.indexOf(";", start));
  return [...decl.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
}

/** The section keys reachable through the group navigation. */
function groupedSections(): string[] {
  const block = page.slice(page.indexOf("const GROUPS:"), page.indexOf("const activeGroup ="));
  return [...block.matchAll(/\{ key: "([a-z]+)", label:/g)].map((m) => m[1]);
}

describe("every section is still reachable", () => {
  it("knows about the same sections the union declares", () => {
    const union = unionSections();
    const grouped = groupedSections();
    expect(union.length).toBeGreaterThan(5);
    for (const key of union) expect(grouped).toContain(key);
  });

  it("puts each section in exactly one group", () => {
    const grouped = groupedSections();
    const seen = new Set<string>();
    for (const key of grouped) {
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("offers no section the page cannot render", () => {
    // The reverse direction: a group entry for a key with no JSX behind it
    // would be a tab that opens an empty page.
    for (const key of groupedSections()) {
      expect(page).toContain(`tab === "${key}"`);
    }
  });

  it("is fewer groups than it used to be tabs", () => {
    const groups = [...page.matchAll(/^      key: "([a-z]+)", label: t\("admin\.grp_/gm)];
    expect(groups.length).toBe(5);
    expect(groups.length).toBeLessThan(unionSections().length);
  });
});

describe("the summary's shortcuts still land somewhere", () => {
  it("every tab the queue points at is in a group", () => {
    // The overview renders a chip per pending item that calls setTab with
    // these keys; a key outside the grouping would navigate nowhere visible.
    const overview = source("src/lib/admin-overview.ts");
    const queueBlock = overview.slice(overview.indexOf("const queue = ["), overview.indexOf("].filter((q) => q.count > 0)"));
    const tabs = [...queueBlock.matchAll(/tab: "([a-z_]+)"/g)].map((m) => m[1]);
    expect(tabs.length).toBe(5);
    for (const t of tabs) expect(groupedSections()).toContain(t);
  });

  it("derives the open group from the open section, not from its own state", () => {
    // Two sources of truth would let the group bar and the content disagree
    // after a shortcut jump.
    expect(page).toContain("const activeGroup = GROUPS.find((g) => g.sections.some((sec) => sec.key === tab))");
  });
});

describe("the badge counts are not the whole overview", () => {
  const route = source("src/app/api/admin/overview/route.ts");

  it("has a count-only mode", () => {
    expect(route).toContain('searchParams.get("only") === "queue"');
    expect(route).toContain("async function queueOnly()");
  });

  it("answers it with counts rather than rows", () => {
    const fn = route.slice(route.indexOf("async function queueOnly()"), route.indexOf("export async function GET"));
    expect(fn).toContain("head: true");
    // No pagination in this path: that is what makes it cheap enough to run
    // on every admin page load.
    expect(fn).not.toContain("fetchAll");
    expect(fn).not.toContain("range(");
  });

  it("returns before the expensive path", () => {
    const gate = route.indexOf('searchParams.get("only") === "queue"');
    const heavy = route.indexOf("WINDOW_DAYS * 24");
    expect(gate).toBeGreaterThan(-1);
    expect(heavy).toBeGreaterThan(gate);
  });

  it("survives a table this database does not have", () => {
    // resident_verifications and waitlist arrive with their own migrations;
    // a missing one must mean "nothing waiting", not a broken dashboard.
    const fn = route.slice(route.indexOf("async function queueOnly()"));
    expect(fn.slice(0, 900)).toContain("catch");
    expect(fn.slice(0, 900)).toContain("return 0");
  });

  it("keeps the badges from holding up the page", () => {
    expect(page).toContain('fetch("/api/admin/overview?only=queue").catch(() => null)');
  });
});

describe("the dashboard no longer carries code it cannot open", () => {
  it("has dropped the organizations tab the hospitals tab replaced", () => {
    // Same organizations and members endpoints; its only unique capability was
    // editing org sections, which each hospital's own chief does at /org.
    expect(() => source("src/components/admin/admin-organizations-tab.tsx")).toThrow();
    expect(page).not.toContain("AdminOrganizationsTab");
  });

  it("left the hospital's own section editor in place", () => {
    const org = source("src/app/org/page.tsx");
    expect(org).toContain('fetch("/api/org/sections"');
  });
});

/**
 * Searching exists so the structure does not have to be learned. Fifteen
 * sections under five groups is a map you would otherwise memorise, and the
 * admin opens this panel a few times a month — often enough to have forgotten
 * which group holds the audit log.
 */
describe("anything can be reached by typing", () => {
  const jump = source("src/components/admin/admin-jump.tsx");

  it("indexes every section, built from the groups themselves", () => {
    // A second hand-written list would fall behind the moment a section is
    // added, and the new one would be the one you cannot find.
    expect(page).toContain("const jumpTargets = GROUPS.flatMap(");
    for (const key of groupedSections()) {
      expect(page).toContain(`${key}:`);
    }
  });

  it("matches on words that are not on the screen", () => {
    // "stripe" is nowhere in the Costs label, and it is what you would type.
    const kw = page.slice(page.indexOf("SECTION_KEYWORDS"), page.indexOf("const jumpTargets"));
    expect(kw).toContain("stripe");
    expect(kw).toContain("fine tuning");
    expect(kw).toContain("pii");
  });

  it("opens on the shortcut and on a plain slash", () => {
    expect(jump).toContain("e.metaKey || e.ctrlKey");
    expect(jump).toMatch(/e\.key === "\/"/);
  });

  it("does not steal the slash while something is being typed", () => {
    // Without this, typing a URL or a decimal into any admin field opens the
    // search instead.
    expect(jump).toContain('closest("input, textarea, [contenteditable]")');
  });

  it("cannot pick past the end of a filtered list", () => {
    // The cursor stays where it was as the list shortens, so Enter would
    // otherwise land on nothing.
    expect(jump).toContain("Math.min(cursor, results.length - 1)");
  });

  it("requires every typed word to match, so two words narrow it", () => {
    expect(jump).toContain("words.every(");
  });
});

describe("one job per section", () => {
  it("splits the platform group's wall into its separate jobs", () => {
    for (const key of ["ai", "dictation", "training", "checklist"]) {
      expect(page).toContain(`{tab === "${key}" && (<>`);
    }
  });

  it("puts fine-tuning in one place instead of two tabs", () => {
    // The data it trains on used to live in Audit and the training run here,
    // so preparing a model meant two tabs that never mentioned each other.
    const training = page.slice(page.indexOf('{tab === "training" && (<>'), page.indexOf('{tab === "checklist" && (<>'));
    expect(training).toContain("Fine-tune Data Generator");
    expect(training).toContain("admin.fine_tuning_title");
  });

  it("loads each panel with the section that shows it", () => {
    // Both of these hung off the audit tab, so opening fine-tuning directly
    // showed an empty data panel until Audit had been visited.
    expect(page).toContain('if (tab === "training" && !ftDataPreview && !ftDataLoading) loadFtDataPreview();');
    const auditEffect = page.slice(page.indexOf('if (tab === "audit") {'));
    expect(auditEffect.slice(0, 300)).toContain("piiStats");
    expect(auditEffect.slice(0, 300)).not.toContain("loadFtDataPreview");
  });
});
