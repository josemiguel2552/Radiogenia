/**
 * Keeping the page still while a box changes height.
 *
 * An auto-growing textarea has to measure its content, and the usual way to do
 * that is to collapse it (`height: auto`), read `scrollHeight`, then set the
 * real height. For a long radiology report that collapse is hundreds of pixels
 * of document height appearing and disappearing: the browser clamps the scroll
 * offset to the shorter document and never puts it back, so the sentence the
 * radiologist clicked on ends up off screen and has to be hunted down again.
 *
 * Two things fix it. Measure only when the content may actually have shrunk —
 * growing needs no collapse at all — and put every scroll offset back when a
 * collapse is unavoidable, before the browser paints.
 */

export interface ScrollAnchor {
  target: Element | Window;
  top: number;
  left: number;
}

/**
 * The scroll offsets that a height change under `el` could disturb: the window
 * plus every scrollable ancestor.
 *
 * Capture this BEFORE the mutation. Reading a scroll offset flushes layout, so
 * a value read after the DOM has already changed is the clamped one — the
 * damage is done and there is nothing left to restore.
 */
export function captureScrollAnchors(el: Element | null | undefined): ScrollAnchor[] {
  if (typeof window === "undefined") return [];

  const anchors: ScrollAnchor[] = [
    { target: window, top: window.scrollY, left: window.scrollX },
  ];
  if (!el) return anchors;

  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth) {
      anchors.push({ target: p, top: p.scrollTop, left: p.scrollLeft });
    }
  }
  return anchors;
}

/** Put the captured offsets back. Call it in the same frame as the mutation. */
export function restoreScrollAnchors(anchors: ScrollAnchor[]): void {
  for (const a of anchors) {
    if (a.target === window) {
      // Not scrollTo({behavior}) — this has to be instant, or the correction
      // animates and reads as the very jump it is undoing.
      window.scrollTo(a.left, a.top);
    } else {
      const el = a.target as Element;
      el.scrollTop = a.top;
      el.scrollLeft = a.left;
    }
  }
}

const lineCount = (text: string): number => {
  let n = 1;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
};

/**
 * Whether a text change could have made its box SHORTER, and so needs the
 * collapse-and-measure.
 *
 * Text that only grew cannot need a smaller box, and a box already pinned to
 * its content reports the growth by itself — so the common case, typing or
 * deleting a character in the middle of a report without changing the line
 * count, needs no measurement and therefore moves nothing.
 *
 * `undefined` means nothing has been measured yet, which always needs one.
 */
export function needsShrinkMeasure(previous: string | undefined, next: string): boolean {
  if (previous === undefined) return true;
  if (next.length < previous.length) return true;
  // Characters can grow while lines drop — replacing three short lines with one
  // long sentence — and that box does need to come back up.
  return lineCount(next) < lineCount(previous);
}
