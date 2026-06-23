/**
 * Radiogenia design tokens — single entry point.
 *
 * Source of truth: extracted from `src/lib/ui-prefs.tsx` (themes & fonts) and
 * `src/app/globals.css` (radius, brand utilities). Keep in sync when those change.
 */

export * from "./colors";
export * from "./themes";
export * from "./typography";
export * from "./spacing";

import { hsl, brand, brandGradient, status } from "./colors";
import { themes, defaultTheme, getTheme, cssVarNames } from "./themes";
import {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  baseFontSize,
  defaultFontStack,
} from "./typography";
import { spacing, radius, radiusBase, shadows, zIndex } from "./spacing";

/** Convenience object grouping every token namespace. */
export const tokens = {
  color: { hsl, brand, brandGradient, status },
  themes,
  defaultTheme,
  getTheme,
  cssVarNames,
  typography: {
    fontFamilies,
    fontSizes,
    fontWeights,
    lineHeights,
    letterSpacing,
    baseFontSize,
    defaultFontStack,
  },
  spacing,
  radius,
  radiusBase,
  shadows,
  zIndex,
} as const;

export default tokens;
