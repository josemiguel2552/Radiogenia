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
  // Differential imaging is admin-only, so it travels with the admin strings.
  { prefix: "diff", module: "i18n-admin" },
  { prefix: "org", module: "i18n-org" },
  { prefix: "support", module: "i18n-support" },
  { prefix: "account", module: "i18n-account" },
  // Resident verification sits in the account panel and shares its module.
  { prefix: "rv", module: "i18n-account" },
  { prefix: "pilot", module: "i18n-pilot" },
  { prefix: "game", module: "i18n-game" },
  // The report view and everything it opens.
  { prefix: "dash", module: "i18n-dashboard" },
  { prefix: "classify", module: "i18n-dashboard" },
  { prefix: "pii", module: "i18n-dashboard" },
  { prefix: "app", module: "i18n-dashboard" },
  { prefix: "sig", module: "i18n-dashboard" },
  { prefix: "cfg", module: "i18n-templates" },
  { prefix: "tpl", module: "i18n-templates" },
  { prefix: "norm", module: "i18n-templates" },
  { prefix: "mrec", module: "i18n-mrec" },
  { prefix: "help", module: "i18n-help" },
  { prefix: "consent", module: "i18n-consent" },
  { prefix: "rdp", module: "i18n-rdp" },
  { prefix: "conv", module: "i18n-admin" },
] as const;

/** Modules small enough that the ">100 entries" floor does not apply. */
const SMALL = new Set(["i18n-support", "i18n-pilot", "i18n-org", "i18n-game",
  "i18n-help", "i18n-consent", "i18n-rdp", "i18n-mrec", "i18n-templates"]);

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
    for (const mod of new Set(FAMILIES.map((f) => f.module))) {
      const src = read(`src/lib/${mod}.ts`);
      const counts = ["es", "en", "pt"].map((lang) => {
        const start = src.indexOf(`  ${lang}: {`);
        const end = src.indexOf("  },", start);
        return (src.slice(start, end).match(/^\s+"/gm) || []).length;
      });
      expect(counts[0]).toBe(counts[1]);
      expect(counts[1]).toBe(counts[2]);
      expect(counts[0]).toBeGreaterThan(SMALL.has(mod) ? 8 : 100);
    }
  });

  it("looks in the registry before giving up and showing the key", () => {
    const core = read("src/lib/i18n.ts");
    expect(core).toContain("export function registerMessages");
    expect(core).toContain("ui[lang]?.[key] ?? extra[lang]?.[key] ?? ui.en[key] ?? extra.en[key] ?? key");
  });

  it("left the shared dictionary meaningfully smaller", () => {
    const core = read("src/lib/i18n.ts").length;
    const moved = [...new Set(FAMILIES.map((f) => f.module))]
      .reduce((n, m) => n + read(`src/lib/${m}.ts`).length, 0);
    // What moved out now outweighs what stayed: this was worth doing.
    expect(moved).toBeGreaterThan(core);
  });
});

describe("strings nobody reads are not shipped at all", () => {
  it("has no eng.* namespace left", () => {
    // 113 keys per language of engagement copy outlived the marketing
    // feature they belonged to and were still downloaded by every user.
    const core = read("src/lib/i18n.ts");
    expect(/^\s+"eng\./m.test(core)).toBe(false);
    for (const file of sourceFiles()) {
      expect(`${file}: ${/"eng\.[a-z_0-9]+"/.test(readFileSync(file, "utf8"))}`).toBe(`${file}: false`);
    }
  });
});

describe("the medical vocabulary travels with the report view", () => {
  const VOCAB = ["useSection", "translateSection", "useTemplateName", "translateTemplateName", "useModality"];

  it("is out of the shared dictionary", () => {
    // Section headings, template names and the term dictionary were the
    // single largest thing in the module every page imports. A visitor on
    // the login page was parsing every anatomical heading in three
    // languages to render a password field.
    const core = read("src/lib/i18n.ts");
    expect(core).not.toContain("const sections: Record");
    expect(core).not.toContain("const templateNames: Record");
    expect(core).not.toContain("const tplTerms: Record");
  });

  it("is smaller in the core than what moved out of it", () => {
    const core = read("src/lib/i18n.ts").length;
    const vocab = read("src/lib/i18n-vocab.ts").length;
    expect(vocab).toBeGreaterThan(core * 0.5);
  });

  it("is never imported from the shared dictionary", () => {
    // An import left pointing at @/lib/i18n would pull the vocabulary back
    // into every page, silently undoing the split.
    for (const file of sourceFiles()) {
      const src = readFileSync(file, "utf8");
      for (const name of VOCAB) {
        const fromCore = new RegExp(`import \\{[^}]*\\b${name}\\b[^}]*\\} from "(@/lib/i18n|\\.{1,2}/i18n)"`);
        expect(`${file.replace(ROOT + "/", "")} imports ${name} from core: ${fromCore.test(src)}`)
          .toBe(`${file.replace(ROOT + "/", "")} imports ${name} from core: false`);
      }
    }
  });
});

describe("nothing translates against the raw core table", () => {
  it("keeps _uiDictionary out of every component and page", () => {
    // It holds only what never moved into a feature dictionary, so a lookup
    // against it alone returns the key for everything that did. That is
    // exactly how the phone-dictation page started printing "rdp.invalid"
    // on screen the moment its namespace was split out — a bug no import
    // check could catch, because the import was there and correct.
    const offenders = sourceFiles()
      .filter((f) => readFileSync(f, "utf8").includes("_uiDictionary"))
      .map((f) => f.replace(ROOT + "/", ""));
    expect(offenders).toEqual([]);
  });
});
