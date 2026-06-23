/**
 * Spacing, radius, shadow and z-index tokens.
 *
 * Radius is driven by the `--radius` CSS variable (0.5rem) defined in
 * `src/app/globals.css`; shadcn components derive sm/md from it. The spacing
 * scale is the Tailwind 4px base scale used throughout the app.
 */

/** Spacing scale in rem (Tailwind base unit = 0.25rem / 4px). */
export const spacing = {
  0: "0",
  px: "1px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

/** Base radius (CSS `--radius`). shadcn derives `md = base - 2px`, `sm = base - 4px`. */
export const radiusBase = "0.5rem";

export const radius = {
  none: "0",
  sm: "calc(0.5rem - 4px)",
  md: "calc(0.5rem - 2px)",
  base: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  /** Brand glow used on primary CTAs (globals.css `.shadow-brand`). */
  brand: "0 4px 14px hsl(var(--primary) / 0.25)",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 40,
  sticky: 45,
  overlay: 50,
  modal: 50,
  toast: 60,
} as const;

export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;
