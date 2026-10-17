import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { captureScrollAnchors, needsShrinkMeasure } from "@/lib/scroll-preserve";

/**
 * Clicking a sentence in the findings to correct it used to scroll the page
 * away from that sentence, so it had to be found again by hand.
 *
 * Two causes, both about height: the textarea replacing the highlighted view
 * appeared at its floor height for one frame before growing, and the
 * auto-grow measurement collapsed the box on every keystroke. Either one
 * shortens the document, the browser clamps the scroll offset to the shorter
 * page, and nothing puts it back.
 */

const ROOT = join(__dirname, "../../..");
const source = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

describe("deciding when a box has to be re-measured", () => {
  it("skips the measurement when text only grew", () => {
    // Typing in the middle of a report is the case that moved the page on
    // every single keystroke. A box pinned to its content reports growth by
    // itself, so there is nothing to collapse for.
    expect(needsShrinkMeasure("hay un nódulo", "hay un nódulo de 8 mm")).toBe(false);
    expect(needsShrinkMeasure("a\nb", "a\nb\nc")).toBe(false);
  });

  it("skips it when the text is the same length", () => {
    expect(needsShrinkMeasure("8 mm", "9 mm")).toBe(false);
  });

  it("measures when characters were removed", () => {
    expect(needsShrinkMeasure("hay un nódulo de 8 mm", "hay un nódulo")).toBe(true);
  });

  it("measures when lines dropped even though characters grew", () => {
    // Replacing three short lines with one long sentence: more characters,
    // fewer lines, and a box that genuinely has to come back up.
    const before = "a\nb\nc";
    const after = "una frase bastante más larga que las tres anteriores";
    expect(after.length).toBeGreaterThan(before.length);
    expect(needsShrinkMeasure(before, after)).toBe(true);
  });

  it("always measures the first time, having nothing to compare against", () => {
    expect(needsShrinkMeasure(undefined, "")).toBe(true);
    expect(needsShrinkMeasure(undefined, "hallazgos")).toBe(true);
  });

  it("handles an emptied box", () => {
    expect(needsShrinkMeasure("hallazgos", "")).toBe(true);
  });
});

describe("capturing scroll offsets", () => {
  it("does nothing when there is no window, so it is safe on the server", () => {
    expect(captureScrollAnchors(null)).toEqual([]);
  });
});

describe("the textarea sizes itself before the page is painted", () => {
  const ui = source("src/components/ui/autogrow-textarea.tsx");

  it("measures in a layout effect, not after the paint", () => {
    // With useEffect the box is visible at its floor height for one frame,
    // which is the jump at the moment of clicking into the text.
    expect(ui).toContain("useLayoutEffect");
    expect(ui).not.toContain("React.useEffect(");
  });

  it("grows without collapsing, and lets the caret follow when it does", () => {
    const effect = ui.slice(ui.indexOf("useLayoutEffect"));
    const grow = effect.indexOf("ta.scrollHeight > ta.clientHeight");
    const collapse = effect.indexOf('ta.style.height = "auto"');
    expect(grow).toBeGreaterThan(-1);
    // The growth path returns before ever reaching the collapse.
    expect(collapse).toBeGreaterThan(grow);
    const growBranch = effect.slice(grow, collapse);
    expect(growBranch).toContain("return;");
    // ...and it restores nothing, so dictating at the end still scrolls along.
    expect(growBranch).not.toContain("restoreScrollAnchors");
  });

  it("puts every offset back around a collapse it cannot avoid", () => {
    const effect = ui.slice(ui.indexOf("useLayoutEffect"));
    const capture = effect.indexOf("captureScrollAnchors");
    const collapse = effect.indexOf('ta.style.height = "auto"');
    const restore = effect.indexOf("restoreScrollAnchors");
    // Captured before the mutation — read afterwards it is already clamped.
    expect(capture).toBeGreaterThan(-1);
    expect(collapse).toBeGreaterThan(capture);
    expect(restore).toBeGreaterThan(collapse);
  });

  it("skips the whole thing when nothing can have shrunk", () => {
    expect(ui).toContain("if (!needsShrinkMeasure(previous, text)) return;");
  });
});

describe("clicking a sentence keeps the page where it was", () => {
  const ui = source("src/components/dashboard/dashboard-content.tsx");

  it("captures the offsets in the click handler, before the swap", () => {
    const handler = ui.slice(ui.indexOf("caretRef.current = caretOffsetWithin"));
    const capture = handler.indexOf("captureScrollAnchors");
    const swap = handler.indexOf("setEditing(true)");
    expect(capture).toBeGreaterThan(-1);
    // Before the state change, or the value read is the clamped one.
    expect(swap).toBeGreaterThan(capture);
  });

  it("restores them in a layout effect, after the textarea has its height", () => {
    // React runs children's layout effects first, so the textarea has already
    // sized itself by the time this one corrects the page.
    expect(ui).toContain("restoreScrollAnchors(scrollAnchorsRef.current)");
    const effect = ui.slice(ui.indexOf("useLayoutEffect(() => {\n    const ta = textareaRef.current;"));
    expect(effect.slice(0, 900)).toContain("restoreScrollAnchors");
  });

  it("does not let focus scroll as well, the caret being placed explicitly", () => {
    expect(ui).toContain("ta.focus({ preventScroll: true })");
    expect(ui).not.toContain("ta.focus();");
  });

  it("corrects the way out of editing too", () => {
    const blur = ui.slice(ui.indexOf("onBlur={() => {"));
    expect(blur.slice(0, 300)).toContain("captureScrollAnchors(textareaRef.current)");
    expect(blur.indexOf("captureScrollAnchors")).toBeLessThan(blur.indexOf("setEditing(false)"));
  });
});
