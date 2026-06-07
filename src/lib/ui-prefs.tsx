"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

/* ── Skin system ───────────────────────────────────────────────── */

export interface SkinVars {
  background: string;
  foreground: string;
  card: string;
  "card-foreground": string;
  popover: string;
  "popover-foreground": string;
  primary: string;
  "primary-foreground": string;
  secondary: string;
  "secondary-foreground": string;
  muted: string;
  "muted-foreground": string;
  accent: string;
  "accent-foreground": string;
  destructive: string;
  "destructive-foreground": string;
  border: string;
  input: string;
  ring: string;
}

export interface Skin {
  id: string;
  isDark: boolean;
  preview: { bg: string; primary: string; card: string; fg: string };
  vars: SkinVars;
}

export const SKINS: Skin[] = [
  {
    id: "clasico",
    isDark: false,
    preview: { bg: "#ffffff", primary: "#3b82f6", card: "#ffffff", fg: "#0f172a" },
    vars: {
      background: "0 0% 100%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      "card-foreground": "222.2 84% 4.9%",
      popover: "0 0% 100%",
      "popover-foreground": "222.2 84% 4.9%",
      primary: "221 83% 53%",
      "primary-foreground": "210 40% 98%",
      secondary: "210 40% 96.1%",
      "secondary-foreground": "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      "muted-foreground": "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      "accent-foreground": "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      "destructive-foreground": "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "221 83% 53%",
    },
  },
  {
    id: "medianoche",
    isDark: true,
    preview: { bg: "#080e28", primary: "#38bdf8", card: "#111940", fg: "#e0f0ff" },
    vars: {
      background: "228 58% 9%",
      foreground: "220 60% 94%",
      card: "228 48% 16%",
      "card-foreground": "220 60% 94%",
      popover: "228 48% 16%",
      "popover-foreground": "220 60% 94%",
      primary: "199 89% 60%",
      "primary-foreground": "228 58% 9%",
      secondary: "228 35% 22%",
      "secondary-foreground": "220 50% 90%",
      muted: "228 35% 22%",
      "muted-foreground": "225 25% 55%",
      accent: "228 35% 22%",
      "accent-foreground": "220 50% 90%",
      destructive: "0 62% 40%",
      "destructive-foreground": "0 0% 100%",
      border: "228 30% 24%",
      input: "228 30% 24%",
      ring: "199 89% 60%",
    },
  },
  {
    id: "bosque",
    isDark: false,
    preview: { bg: "#c8e0cb", primary: "#059669", card: "#e6f2e8", fg: "#14332a" },
    vars: {
      background: "145 35% 88%",
      foreground: "155 40% 12%",
      card: "140 30% 94%",
      "card-foreground": "155 40% 12%",
      popover: "140 30% 94%",
      "popover-foreground": "155 40% 12%",
      primary: "162 83% 34%",
      "primary-foreground": "0 0% 100%",
      secondary: "140 25% 82%",
      "secondary-foreground": "155 30% 15%",
      muted: "140 25% 82%",
      "muted-foreground": "150 15% 40%",
      accent: "140 25% 82%",
      "accent-foreground": "155 30% 15%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "140 22% 78%",
      input: "140 22% 78%",
      ring: "162 83% 34%",
    },
  },
  {
    id: "obsidiana",
    isDark: true,
    preview: { bg: "#180d30", primary: "#a78bfa", card: "#261547", fg: "#e8e0f8" },
    vars: {
      background: "268 45% 10%",
      foreground: "265 50% 93%",
      card: "268 38% 15%",
      "card-foreground": "265 50% 93%",
      popover: "268 38% 15%",
      "popover-foreground": "265 50% 93%",
      primary: "263 70% 74%",
      "primary-foreground": "268 45% 10%",
      secondary: "268 25% 21%",
      "secondary-foreground": "265 30% 88%",
      muted: "268 25% 21%",
      "muted-foreground": "265 18% 55%",
      accent: "268 25% 21%",
      "accent-foreground": "265 30% 88%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "268 20% 24%",
      input: "268 20% 24%",
      ring: "263 70% 74%",
    },
  },
  {
    id: "arena",
    isDark: false,
    preview: { bg: "#dfc09e", primary: "#b45309", card: "#f2e4cc", fg: "#2d1f0e" },
    vars: {
      background: "33 55% 84%",
      foreground: "25 45% 12%",
      card: "34 50% 92%",
      "card-foreground": "25 45% 12%",
      popover: "34 50% 92%",
      "popover-foreground": "25 45% 12%",
      primary: "28 90% 38%",
      "primary-foreground": "0 0% 100%",
      secondary: "33 38% 77%",
      "secondary-foreground": "25 35% 15%",
      muted: "33 38% 77%",
      "muted-foreground": "25 20% 40%",
      accent: "33 38% 77%",
      "accent-foreground": "25 35% 15%",
      destructive: "0 84% 55%",
      "destructive-foreground": "0 0% 100%",
      border: "33 32% 72%",
      input: "33 32% 72%",
      ring: "28 90% 38%",
    },
  },
  {
    id: "coral",
    isDark: true,
    preview: { bg: "#2a0e18", primary: "#fb7185", card: "#3d1525", fg: "#fde0e8" },
    vars: {
      background: "345 42% 11%",
      foreground: "345 70% 93%",
      card: "345 35% 16%",
      "card-foreground": "345 70% 93%",
      popover: "345 35% 16%",
      "popover-foreground": "345 70% 93%",
      primary: "350 89% 65%",
      "primary-foreground": "345 42% 11%",
      secondary: "345 22% 22%",
      "secondary-foreground": "345 40% 88%",
      muted: "345 22% 22%",
      "muted-foreground": "345 20% 55%",
      accent: "345 22% 22%",
      "accent-foreground": "345 40% 88%",
      destructive: "15 80% 50%",
      "destructive-foreground": "0 0% 100%",
      border: "345 18% 25%",
      input: "345 18% 25%",
      ring: "350 89% 65%",
    },
  },
  {
    id: "acero",
    isDark: true,
    preview: { bg: "#1c1d21", primary: "#60a5fa", card: "#28292e", fg: "#d1d3d9" },
    vars: {
      background: "230 5% 12%",
      foreground: "225 10% 86%",
      card: "230 4% 17%",
      "card-foreground": "225 10% 86%",
      popover: "230 4% 17%",
      "popover-foreground": "225 10% 86%",
      primary: "217 91% 68%",
      "primary-foreground": "230 5% 12%",
      secondary: "230 4% 22%",
      "secondary-foreground": "225 8% 82%",
      muted: "230 4% 22%",
      "muted-foreground": "225 6% 48%",
      accent: "230 4% 22%",
      "accent-foreground": "225 8% 82%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "230 4% 25%",
      input: "230 4% 25%",
      ring: "217 91% 68%",
    },
  },
  {
    id: "cerezo",
    isDark: false,
    preview: { bg: "#fbe8ec", primary: "#e11d48", card: "#fff1f4", fg: "#2c0a14" },
    vars: {
      background: "348 65% 95%",
      foreground: "345 50% 10%",
      card: "348 60% 97%",
      "card-foreground": "345 50% 10%",
      popover: "348 60% 97%",
      "popover-foreground": "345 50% 10%",
      primary: "347 77% 50%",
      "primary-foreground": "0 0% 100%",
      secondary: "348 45% 89%",
      "secondary-foreground": "345 40% 15%",
      muted: "348 45% 89%",
      "muted-foreground": "345 18% 45%",
      accent: "348 45% 89%",
      "accent-foreground": "345 40% 15%",
      destructive: "15 80% 50%",
      "destructive-foreground": "0 0% 100%",
      border: "348 35% 85%",
      input: "348 35% 85%",
      ring: "347 77% 50%",
    },
  },
  {
    id: "oceano",
    isDark: true,
    preview: { bg: "#091a1e", primary: "#2dd4bf", card: "#122a30", fg: "#d0f0ea" },
    vars: {
      background: "190 42% 7%",
      foreground: "170 40% 90%",
      card: "188 38% 13%",
      "card-foreground": "170 40% 90%",
      popover: "188 38% 13%",
      "popover-foreground": "170 40% 90%",
      primary: "174 72% 56%",
      "primary-foreground": "190 42% 7%",
      secondary: "188 28% 19%",
      "secondary-foreground": "170 30% 85%",
      muted: "188 28% 19%",
      "muted-foreground": "185 18% 45%",
      accent: "188 28% 19%",
      "accent-foreground": "170 30% 85%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "188 22% 21%",
      input: "188 22% 21%",
      ring: "174 72% 56%",
    },
  },
];

/* ── Layout mode ───────────────────────────────────────────────── */

export type LayoutMode = "classic" | "side-by-side" | "compact";

/* ── Panel side ─────────────────────────────────────────────────── */

export type PanelSide = "left" | "right";

/* ── Font families ─────────────────────────────────────────────── */

export type FontFamily = "inter" | "system" | "roboto" | "poppins" | "lato" | "opensans" | "mono" | "serif" | "garamond" | "source";

export const FONT_FAMILIES: { value: FontFamily; label: string; stack: string }[] = [
  { value: "inter",      label: "Inter",        stack: "'Inter', system-ui, -apple-system, sans-serif" },
  { value: "system",     label: "System",       stack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { value: "roboto",     label: "Roboto",       stack: "'Roboto', 'Helvetica Neue', Arial, sans-serif" },
  { value: "poppins",    label: "Poppins",      stack: "'Poppins', system-ui, sans-serif" },
  { value: "lato",       label: "Lato",         stack: "'Lato', 'Helvetica Neue', Arial, sans-serif" },
  { value: "opensans",   label: "Open Sans",    stack: "'Open Sans', system-ui, sans-serif" },
  { value: "mono",       label: "Monospace",    stack: "'SF Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace" },
  { value: "serif",      label: "Serif",        stack: "'Georgia', 'Times New Roman', ui-serif, serif" },
  { value: "garamond",   label: "Garamond",     stack: "'EB Garamond', 'Garamond', 'Times New Roman', serif" },
  { value: "source",     label: "Source Sans",  stack: "'Source Sans 3', 'Source Sans Pro', system-ui, sans-serif" },
];

/* ── Full prefs shape ───────────────────────────────────────────── */

export type UILanguage = "es" | "en" | "pt";

export interface UIPreferences {
  skin: string;
  panelSide: PanelSide;
  fontSize: number;
  fontFamily: FontFamily;
  uiLanguage: UILanguage;
  layout: LayoutMode;
}

const DEFAULTS: UIPreferences = {
  skin: "clasico",
  panelSide: "right",
  fontSize: 14,
  fontFamily: "inter",
  uiLanguage: "es",
  layout: "classic",
};

const STORAGE_KEY = "radiogenai_ui_prefs";

/* ── Apply to DOM ───────────────────────────────────────────────── */

function applyPreferences(prefs: UIPreferences) {
  const root = document.documentElement;
  const skin = SKINS.find((s) => s.id === prefs.skin) || SKINS[0];

  for (const [key, value] of Object.entries(skin.vars)) {
    root.style.setProperty(`--${key}`, value);
  }

  root.classList.toggle("dark", skin.isDark);
  localStorage.setItem("radiogenai_dark", skin.isDark ? "1" : "0");
  window.dispatchEvent(new CustomEvent("radiogenai:dark-changed", { detail: skin.isDark }));

  root.style.setProperty("--ui-font-size", `${prefs.fontSize}px`);
  root.style.fontSize = `${prefs.fontSize}px`;

  const font = FONT_FAMILIES.find((f) => f.value === prefs.fontFamily) || FONT_FAMILIES[0];
  root.style.setProperty("--font-body", font.stack);

  root.dataset.layout = prefs.layout;
}

/* ── Context ────────────────────────────────────────────────────── */

interface UIPrefsCtx {
  prefs: UIPreferences;
  update: (patch: Partial<UIPreferences>) => void;
  skin: Skin;
}

const Ctx = createContext<UIPrefsCtx>({
  prefs: DEFAULTS,
  update: () => {},
  skin: SKINS[0],
});

export function useUIPrefs() {
  return useContext(Ctx);
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPreferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UIPreferences>;
        // Migrate old prefs that had colorPreset/density instead of skin
        if (!saved.skin && "colorPreset" in saved) {
          saved.skin = "clasico";
        }
        const merged = { ...DEFAULTS, ...saved };
        setPrefs(merged);
        applyPreferences(merged);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<UIPreferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      applyPreferences(next);
      return next;
    });
  }, []);

  const skin = SKINS.find((s) => s.id === prefs.skin) || SKINS[0];

  if (!hydrated) return null;

  return (
    <Ctx.Provider value={{ prefs, update, skin }}>
      {children}
    </Ctx.Provider>
  );
}
