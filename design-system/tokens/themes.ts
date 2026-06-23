/**
 * Theme tokens — the 9 selectable skins.
 *
 * These mirror `SKINS` in `src/lib/ui-prefs.tsx` (the runtime source of truth)
 * but are kept here as plain, framework-agnostic data so design tooling can read
 * them without pulling in React. Each value is an HSL channel triplet; use
 * `hsl()` from `./colors` to render. Keep this file in sync with ui-prefs.tsx.
 */

export type ColorMode = "light" | "dark";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface Theme {
  id: string;
  /** Human label (Spanish, matching the in-app skin names). */
  label: string;
  mode: ColorMode;
  /** Quick hex swatches for theme pickers. */
  preview: { bg: string; primary: string; card: string; fg: string };
  colors: ThemeColors;
}

export const themes: Theme[] = [
  {
    id: "clasico",
    label: "Clásico",
    mode: "light",
    preview: { bg: "#ffffff", primary: "#3b82f6", card: "#ffffff", fg: "#0f172a" },
    colors: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      primary: "221 83% 53%",
      primaryForeground: "210 40% 98%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "221 83% 53%",
    },
  },
  {
    id: "medianoche",
    label: "Medianoche",
    mode: "dark",
    preview: { bg: "#080e28", primary: "#38bdf8", card: "#111940", fg: "#e0f0ff" },
    colors: {
      background: "228 58% 9%",
      foreground: "220 60% 94%",
      card: "228 48% 16%",
      cardForeground: "220 60% 94%",
      popover: "228 48% 16%",
      popoverForeground: "220 60% 94%",
      primary: "199 89% 60%",
      primaryForeground: "228 58% 9%",
      secondary: "228 35% 22%",
      secondaryForeground: "220 50% 90%",
      muted: "228 35% 22%",
      mutedForeground: "225 25% 55%",
      accent: "228 35% 22%",
      accentForeground: "220 50% 90%",
      destructive: "0 62% 40%",
      destructiveForeground: "0 0% 100%",
      border: "228 30% 24%",
      input: "228 30% 24%",
      ring: "199 89% 60%",
    },
  },
  {
    id: "bosque",
    label: "Bosque",
    mode: "light",
    preview: { bg: "#c8e0cb", primary: "#059669", card: "#e6f2e8", fg: "#14332a" },
    colors: {
      background: "145 35% 88%",
      foreground: "155 40% 12%",
      card: "140 30% 94%",
      cardForeground: "155 40% 12%",
      popover: "140 30% 94%",
      popoverForeground: "155 40% 12%",
      primary: "162 83% 34%",
      primaryForeground: "0 0% 100%",
      secondary: "140 25% 82%",
      secondaryForeground: "155 30% 15%",
      muted: "140 25% 82%",
      mutedForeground: "150 15% 40%",
      accent: "140 25% 82%",
      accentForeground: "155 30% 15%",
      destructive: "0 84% 60%",
      destructiveForeground: "0 0% 100%",
      border: "140 22% 78%",
      input: "140 22% 78%",
      ring: "162 83% 34%",
    },
  },
  {
    id: "obsidiana",
    label: "Obsidiana",
    mode: "dark",
    preview: { bg: "#180d30", primary: "#a78bfa", card: "#261547", fg: "#e8e0f8" },
    colors: {
      background: "268 45% 10%",
      foreground: "265 50% 93%",
      card: "268 38% 15%",
      cardForeground: "265 50% 93%",
      popover: "268 38% 15%",
      popoverForeground: "265 50% 93%",
      primary: "263 70% 74%",
      primaryForeground: "268 45% 10%",
      secondary: "268 25% 21%",
      secondaryForeground: "265 30% 88%",
      muted: "268 25% 21%",
      mutedForeground: "265 18% 55%",
      accent: "268 25% 21%",
      accentForeground: "265 30% 88%",
      destructive: "0 62% 45%",
      destructiveForeground: "0 0% 100%",
      border: "268 20% 24%",
      input: "268 20% 24%",
      ring: "263 70% 74%",
    },
  },
  {
    id: "arena",
    label: "Arena",
    mode: "light",
    preview: { bg: "#dfc09e", primary: "#b45309", card: "#f2e4cc", fg: "#2d1f0e" },
    colors: {
      background: "33 55% 84%",
      foreground: "25 45% 12%",
      card: "34 50% 92%",
      cardForeground: "25 45% 12%",
      popover: "34 50% 92%",
      popoverForeground: "25 45% 12%",
      primary: "28 90% 38%",
      primaryForeground: "0 0% 100%",
      secondary: "33 38% 77%",
      secondaryForeground: "25 35% 15%",
      muted: "33 38% 77%",
      mutedForeground: "25 20% 40%",
      accent: "33 38% 77%",
      accentForeground: "25 35% 15%",
      destructive: "0 84% 55%",
      destructiveForeground: "0 0% 100%",
      border: "33 32% 72%",
      input: "33 32% 72%",
      ring: "28 90% 38%",
    },
  },
  {
    id: "coral",
    label: "Coral",
    mode: "dark",
    preview: { bg: "#2a0e18", primary: "#fb7185", card: "#3d1525", fg: "#fde0e8" },
    colors: {
      background: "345 42% 11%",
      foreground: "345 70% 93%",
      card: "345 35% 16%",
      cardForeground: "345 70% 93%",
      popover: "345 35% 16%",
      popoverForeground: "345 70% 93%",
      primary: "350 89% 65%",
      primaryForeground: "345 42% 11%",
      secondary: "345 22% 22%",
      secondaryForeground: "345 40% 88%",
      muted: "345 22% 22%",
      mutedForeground: "345 20% 55%",
      accent: "345 22% 22%",
      accentForeground: "345 40% 88%",
      destructive: "15 80% 50%",
      destructiveForeground: "0 0% 100%",
      border: "345 18% 25%",
      input: "345 18% 25%",
      ring: "350 89% 65%",
    },
  },
  {
    id: "acero",
    label: "Acero",
    mode: "dark",
    preview: { bg: "#1c1d21", primary: "#60a5fa", card: "#28292e", fg: "#d1d3d9" },
    colors: {
      background: "230 5% 12%",
      foreground: "225 10% 86%",
      card: "230 4% 17%",
      cardForeground: "225 10% 86%",
      popover: "230 4% 17%",
      popoverForeground: "225 10% 86%",
      primary: "217 91% 68%",
      primaryForeground: "230 5% 12%",
      secondary: "230 4% 22%",
      secondaryForeground: "225 8% 82%",
      muted: "230 4% 22%",
      mutedForeground: "225 6% 48%",
      accent: "230 4% 22%",
      accentForeground: "225 8% 82%",
      destructive: "0 62% 45%",
      destructiveForeground: "0 0% 100%",
      border: "230 4% 25%",
      input: "230 4% 25%",
      ring: "217 91% 68%",
    },
  },
  {
    id: "cerezo",
    label: "Cerezo",
    mode: "light",
    preview: { bg: "#fbe8ec", primary: "#e11d48", card: "#fff1f4", fg: "#2c0a14" },
    colors: {
      background: "348 65% 95%",
      foreground: "345 50% 10%",
      card: "348 60% 97%",
      cardForeground: "345 50% 10%",
      popover: "348 60% 97%",
      popoverForeground: "345 50% 10%",
      primary: "347 77% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "348 45% 89%",
      secondaryForeground: "345 40% 15%",
      muted: "348 45% 89%",
      mutedForeground: "345 18% 45%",
      accent: "348 45% 89%",
      accentForeground: "345 40% 15%",
      destructive: "15 80% 50%",
      destructiveForeground: "0 0% 100%",
      border: "348 35% 85%",
      input: "348 35% 85%",
      ring: "347 77% 50%",
    },
  },
  {
    id: "oceano",
    label: "Océano",
    mode: "dark",
    preview: { bg: "#091a1e", primary: "#2dd4bf", card: "#122a30", fg: "#d0f0ea" },
    colors: {
      background: "190 42% 7%",
      foreground: "170 40% 90%",
      card: "188 38% 13%",
      cardForeground: "170 40% 90%",
      popover: "188 38% 13%",
      popoverForeground: "170 40% 90%",
      primary: "174 72% 56%",
      primaryForeground: "190 42% 7%",
      secondary: "188 28% 19%",
      secondaryForeground: "170 30% 85%",
      muted: "188 28% 19%",
      mutedForeground: "185 18% 45%",
      accent: "188 28% 19%",
      accentForeground: "170 30% 85%",
      destructive: "0 62% 45%",
      destructiveForeground: "0 0% 100%",
      border: "188 22% 21%",
      input: "188 22% 21%",
      ring: "174 72% 56%",
    },
  },
];

/** Default theme (the one applied on first load). */
export const defaultTheme = themes[0];

export function getTheme(id: string): Theme | undefined {
  return themes.find((t) => t.id === id);
}

/** Semantic CSS-variable names consumed by Tailwind / shadcn (e.g. `--primary`). */
export const cssVarNames: Record<keyof ThemeColors, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  destructiveForeground: "--destructive-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
};
