/**
 * Color primitives.
 *
 * Radiogenia stores colors as HSL channel triplets (e.g. "221 83% 53%") so they
 * can be composed with opacity via `hsl(var(--token) / <alpha>)`. The semantic,
 * per-theme color tokens live in `./themes.ts`; this file holds the raw brand
 * palette and a small helper to turn a triplet into a usable CSS color.
 */

/** Wraps an HSL channel triplet into a CSS color. `hsl("221 83% 53%")`. */
export function hsl(triplet: string, alpha?: number): string {
  return alpha === undefined
    ? `hsl(${triplet})`
    : `hsl(${triplet} / ${alpha})`;
}

/**
 * Brand palette — the marketing / accent colors used across the landing page
 * and brand gradients (see globals.css `.bg-brand-gradient`, `.gradient-border-card`).
 */
export const brand = {
  violet: "#7c3aed",
  blue: "#3b82f6",
  pink: "#ec4899",
  indigo: "#6366f1",
} as const;

/** Brand gradient stops, left → right. */
export const brandGradient = [brand.violet, brand.blue, brand.pink] as const;

/**
 * Fixed status colors (not theme-dependent). Tailwind palette references used
 * throughout the app for success / warning / danger / info states.
 */
export const status = {
  success: "#16a34a", // green-600
  warning: "#d97706", // amber-600
  danger: "#ef4444", // red-500
  info: "#3b82f6", // blue-500
} as const;

export type BrandColor = keyof typeof brand;
export type StatusColor = keyof typeof status;
