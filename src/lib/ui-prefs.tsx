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
    preview: { bg: "#0d1a2d", primary: "#38bdf8", card: "#132440", fg: "#e0f0ff" },
    vars: {
      background: "215 55% 11%",
      foreground: "205 60% 94%",
      card: "215 48% 16%",
      "card-foreground": "205 60% 94%",
      popover: "215 48% 16%",
      "popover-foreground": "205 60% 94%",
      primary: "199 89% 60%",
      "primary-foreground": "215 55% 11%",
      secondary: "215 35% 22%",
      "secondary-foreground": "205 50% 90%",
      muted: "215 35% 22%",
      "muted-foreground": "210 25% 58%",
      accent: "215 35% 22%",
      "accent-foreground": "205 50% 90%",
      destructive: "0 62% 40%",
      "destructive-foreground": "0 0% 100%",
      border: "215 30% 24%",
      input: "215 30% 24%",
      ring: "199 89% 60%",
    },
  },
  {
    id: "bosque",
    isDark: false,
    preview: { bg: "#dceee0", primary: "#059669", card: "#f0f8f2", fg: "#14332a" },
    vars: {
      background: "140 30% 90%",
      foreground: "155 40% 12%",
      card: "140 30% 96%",
      "card-foreground": "155 40% 12%",
      popover: "140 30% 96%",
      "popover-foreground": "155 40% 12%",
      primary: "162 83% 34%",
      "primary-foreground": "0 0% 100%",
      secondary: "140 22% 84%",
      "secondary-foreground": "155 30% 15%",
      muted: "140 22% 84%",
      "muted-foreground": "150 15% 40%",
      accent: "140 22% 84%",
      "accent-foreground": "155 30% 15%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "140 22% 80%",
      input: "140 22% 80%",
      ring: "162 83% 34%",
    },
  },
  {
    id: "obsidiana",
    isDark: true,
    preview: { bg: "#19102b", primary: "#a78bfa", card: "#22173b", fg: "#e8e0f8" },
    vars: {
      background: "265 40% 11%",
      foreground: "265 50% 93%",
      card: "265 35% 16%",
      "card-foreground": "265 50% 93%",
      popover: "265 35% 16%",
      "popover-foreground": "265 50% 93%",
      primary: "263 70% 74%",
      "primary-foreground": "265 40% 11%",
      secondary: "265 22% 22%",
      "secondary-foreground": "265 30% 88%",
      muted: "265 22% 22%",
      "muted-foreground": "265 18% 55%",
      accent: "265 22% 22%",
      "accent-foreground": "265 30% 88%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "265 18% 25%",
      input: "265 18% 25%",
      ring: "263 70% 74%",
    },
  },
  {
    id: "arena",
    isDark: false,
    preview: { bg: "#ead5b8", primary: "#b45309", card: "#f8eeda", fg: "#2d1f0e" },
    vars: {
      background: "32 50% 85%",
      foreground: "25 45% 12%",
      card: "35 55% 93%",
      "card-foreground": "25 45% 12%",
      popover: "35 55% 93%",
      "popover-foreground": "25 45% 12%",
      primary: "28 90% 38%",
      "primary-foreground": "0 0% 100%",
      secondary: "34 35% 78%",
      "secondary-foreground": "25 35% 15%",
      muted: "34 35% 78%",
      "muted-foreground": "25 20% 40%",
      accent: "34 35% 78%",
      "accent-foreground": "25 35% 15%",
      destructive: "0 84% 55%",
      "destructive-foreground": "0 0% 100%",
      border: "34 30% 72%",
      input: "34 30% 72%",
      ring: "28 90% 38%",
    },
  },
  {
    id: "coral",
    isDark: true,
    preview: { bg: "#2d1119", primary: "#fb7185", card: "#3d1824", fg: "#fde0e8" },
    vars: {
      background: "345 40% 12%",
      foreground: "345 70% 93%",
      card: "345 35% 17%",
      "card-foreground": "345 70% 93%",
      popover: "345 35% 17%",
      "popover-foreground": "345 70% 93%",
      primary: "350 89% 65%",
      "primary-foreground": "345 40% 12%",
      secondary: "345 20% 23%",
      "secondary-foreground": "345 40% 88%",
      muted: "345 20% 23%",
      "muted-foreground": "345 20% 55%",
      accent: "345 20% 23%",
      "accent-foreground": "345 40% 88%",
      destructive: "15 80% 50%",
      "destructive-foreground": "0 0% 100%",
      border: "345 18% 26%",
      input: "345 18% 26%",
      ring: "350 89% 65%",
    },
  },
];

/* ── Layout mode ───────────────────────────────────────────────── */

export type LayoutMode = "classic" | "side-by-side" | "compact";

/* ── Panel side ─────────────────────────────────────────────────── */

export type PanelSide = "left" | "right";

/* ── Font families ─────────────────────────────────────────────── */

export type FontFamily = "inter" | "system" | "mono" | "serif";

export const FONT_FAMILIES: { value: FontFamily; label: string; stack: string }[] = [
  { value: "inter",  label: "Inter",     stack: "'Inter', system-ui, -apple-system, sans-serif" },
  { value: "system", label: "System",    stack: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { value: "mono",   label: "Monospace", stack: "'SF Mono', 'Fira Code', 'JetBrains Mono', ui-monospace, monospace" },
  { value: "serif",  label: "Serif",     stack: "'Georgia', 'Times New Roman', ui-serif, serif" },
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
