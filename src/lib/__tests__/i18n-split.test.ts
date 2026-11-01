import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * The dictionary is split by feature, and a split dictionary fails silently.
 *
 * All three languages of every string used to sit in one module that every
 * page imports: a radiologist writing a report downloaded and parsed the lot,
 * 44% of it calculator tables and another 16% the admin dashboard — neither
 * reachable from that page. Moving them out is only safe while every file
 * that uses a key also imports the module that registers it. Miss one and the
 * key itself appears on screen, in production, with nothing failing.
 */

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Every .ts/.tsx under src, except the dictionaries and these tests. */
function sourceFiles(dir = join(ROOT, "src")): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__") continue;
      out.push(...sourceFiles(full));
    } else if (/\.tsx?$/.test(name) && !/^i18n(-\w+)?\.ts$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const FAMILIES = [
  { prefix: "calc", module: "i18n-calc" },
  // Same consumer as calc.*, so the same dictionary.
  { prefix: "crit", module: "i18n-calc" },
  { prefix: "admin", module: "i18n-admin" },
] as const;

describe("a feature's strings travel with the feature", () => {
  for (const { prefix, module } of FAMILIES) {
    it(`every file using ${prefix}.* imports ${module}`, () => {
      const offenders: string[] = [];
      for (const file of sourceFiles()) {
        const src = readFileSync(file, "utf8");
        if (!new RegExp(`"${prefix}\\.[a-zA-Z0-9_.]+"`).test(src)) continue;
        if (!src.includes(module)) offenders.push(file.replace(ROOT + "/", ""));
      }
      expect(offenders).toEqual([]);
    });

    it(`${module} registers all three languages`, () => {
      const src = read(`src/lib/${module}.ts`);
      expect(src).toContain("registerMessages({");
      for (const lang of ["es:", "en:", "pt:"]) expect(src).toContain(`  ${lang} {`);
    });

    it(`${prefix}.* is out of the shared dictionary`, () => {
      // The point of the exercise: these must not be in the module every page
      // imports, or nothing was saved.
      const core = read("src/lib/i18n.ts");
      expect(new RegExp(`^\\s+"${prefix}\\.`, "m").test(core)).toBe(false);
    });
  }

  it("keeps the same number of entries in each language", () => {
    // A string present in one language and missing in another is a key shown
    // raw to whoever picked that language.
    for (const { module } of FAMILIES) {
      const src = read(`src/lib/${module}.ts`);
      const counts = ["es", "en", "pt"].map((lang) => {
        const start = src.indexOf(`  ${lang}: {`);
        const end = src.indexOf("  },", start);
        return (src.slice(start, end).match(/^\s+"/gm) || []).length;
      });
      expect(counts[0]).toBe(counts[1]);
      expect(counts[1]).toBe(counts[2]);
      expect(counts[0]).toBeGreaterThan(100);
    }
  });

  it("looks in the registry before giving up and showing the key", () => {
    const core = read("src/lib/i18n.ts");
    expect(core).toContain("export function registerMessages");
    expect(core).toContain("ui[lang]?.[key] ?? extra[lang]?.[key] ?? ui.en[key] ?? extra.en[key] ?? key");
  });

  it("left the shared dictionary meaningfully smaller", () => {
    const core = read("src/lib/i18n.ts").length;
    const calc = read("src/lib/i18n-calc.ts").length;
    const admin = read("src/lib/i18n-admin.ts").length;
    // What moved out is comparable to what stayed: this was worth doing.
    expect(calc + admin).toBeGreaterThan(core * 0.8);
  });
});
