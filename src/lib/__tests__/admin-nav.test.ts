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
  const line = page.slice(page.indexOf("type Tab ="), page.indexOf("\n", page.indexOf("type Tab =")));
  return [...line.matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
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
