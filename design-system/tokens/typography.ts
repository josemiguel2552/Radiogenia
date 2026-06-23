/**
 * Typography tokens.
 *
 * Font families mirror `FONT_FAMILIES` in `src/lib/ui-prefs.tsx`. The base font
 * size is user-adjustable at runtime (default 14px); the type scale below is the
 * effective set of sizes used across the app (Tailwind `text-*` plus the small
 * `text-[Npx]` steps that the dense UI relies on).
 */

export interface FontFamily {
  value: string;
  label: string;
  stack: string;
}

export const fontFamilies: FontFamily[] = [
  { value: "inter", label: "Inter", stack: "'Inter', system-ui, -apple-system, sans-serif" },
  { value: "system", label: "System", stack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { value: "roboto", label: "Roboto", stack: "'Roboto', 'Helvetica Neue', Arial, sans-serif" },
  { value: "poppins", label: "Poppins", stack: "'Poppins', system-ui, sans-serif" },
  { value: "lato", label: "Lato", stack: "'Lato', 'Helvetica Neue', Arial, sans-serif" },
  { value: "opensans", label: "Open Sans", stack: "'Open Sans', system-ui, sans-serif" },
  { value: "mono", label: "Monospace", stack: "'SF Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace" },
  { value: "serif", label: "Serif", stack: "'Georgia', 'Times New Roman', ui-serif, serif" },
  { value: "garamond", label: "Garamond", stack: "'EB Garamond', 'Garamond', 'Times New Roman', serif" },
  { value: "source", label: "Source Sans", stack: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif" },
];

/** Default body font (CSS variable `--font-body`). */
export const defaultFontStack = fontFamilies[0].stack;

/** Base font size in px. User-adjustable; this is the default. */
export const baseFontSize = 14;

/**
 * Font size scale (px). Includes the sub-12px steps used in Radiogenia's dense
 * panels (`text-[9px]`…`text-[11px]`) plus the standard Tailwind sizes.
 */
export const fontSizes = {
  "2xs": "9px",
  xs2: "10px",
  xs3: "11px",
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "20px",
  "2xl": "24px",
  "3xl": "30px",
  "4xl": "36px",
  "5xl": "48px",
} as const;

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeights = {
  none: "1",
  tight: "1.25",
  snug: "1.375",
  normal: "1.5",
  relaxed: "1.625",
} as const;

export const letterSpacing = {
  tight: "-0.01em",
  normal: "0",
  wide: "0.025em",
  widest: "0.1em",
} as const;

export type FontSize = keyof typeof fontSizes;
export type FontWeight = keyof typeof fontWeights;
