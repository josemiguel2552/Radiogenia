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
    preview: { bg: "#0f172a", primary: "#60a5fa", card: "#1e293b", fg: "#f1f5f9" },
    vars: {
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      card: "217 33% 10%",
      "card-foreground": "210 40% 98%",
      popover: "217 33% 10%",
      "popover-foreground": "210 40% 98%",
      primary: "217 91% 65%",
      "primary-foreground": "222 84% 4.9%",
      secondary: "217.2 32.6% 17.5%",
      "secondary-foreground": "210 40% 98%",
      muted: "217.2 32.6% 17.5%",
      "muted-foreground": "215 20.2% 65.1%",
      accent: "217.2 32.6% 17.5%",
      "accent-foreground": "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      "destructive-foreground": "210 40% 98%",
      border: "217.2 32.6% 17.5%",
      input: "217.2 32.6% 17.5%",
      ring: "217 91% 65%",
    },
  },
  {
    id: "bosque",
    isDark: false,
    preview: { bg: "#f0faf4", primary: "#10b981", card: "#ffffff", fg: "#14332a" },
    vars: {
      background: "145 30% 97%",
      foreground: "160 40% 10%",
      card: "0 0% 100%",
      "card-foreground": "160 40% 10%",
      popover: "0 0% 100%",
      "popover-foreground": "160 40% 10%",
      primary: "160 84% 39%",
      "primary-foreground": "0 0% 100%",
      secondary: "150 25% 93%",
      "secondary-foreground": "160 30% 15%",
      muted: "150 25% 93%",
      "muted-foreground": "150 12% 45%",
      accent: "150 25% 93%",
      "accent-foreground": "160 30% 15%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "150 20% 88%",
      input: "150 20% 88%",
      ring: "160 84% 39%",
    },
  },
  {
    id: "obsidiana",
    isDark: true,
    preview: { bg: "#1a1625", primary: "#a78bfa", card: "#231f33", fg: "#ede9fe" },
    vars: {
      background: "260 25% 8%",
      foreground: "260 50% 95%",
      card: "260 20% 12%",
      "card-foreground": "260 50% 95%",
      popover: "260 20% 12%",
      "popover-foreground": "260 50% 95%",
      primary: "262 83% 68%",
      "primary-foreground": "260 25% 8%",
      secondary: "260 15% 18%",
      "secondary-foreground": "260 30% 90%",
      muted: "260 15% 18%",
      "muted-foreground": "260 15% 60%",
      accent: "260 15% 18%",
      "accent-foreground": "260 30% 90%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "260 15% 20%",
      input: "260 15% 20%",
      ring: "262 83% 68%",
    },
  },
  {
    id: "arena",
    isDark: false,
    preview: { bg: "#faf6f0", primary: "#d97706", card: "#fefcf8", fg: "#2d1f0e" },
    vars: {
      background: "36 40% 96%",
      foreground: "30 40% 10%",
      card: "36 50% 99%",
      "card-foreground": "30 40% 10%",
      popover: "36 50% 99%",
      "popover-foreground": "30 40% 10%",
      primary: "38 92% 50%",
      "primary-foreground": "30 40% 10%",
      secondary: "36 30% 91%",
      "secondary-foreground": "30 25% 15%",
      muted: "36 30% 91%",
      "muted-foreground": "30 15% 45%",
      accent: "36 30% 91%",
      "accent-foreground": "30 25% 15%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "36 25% 85%",
      input: "36 25% 85%",
      ring: "38 92% 50%",
    },
  },
  {
    id: "coral",
    isDark: true,
    preview: { bg: "#1c1517", primary: "#f43f5e", card: "#261e21", fg: "#fce7f3" },
    vars: {
      background: "350 15% 9%",
      foreground: "350 60% 95%",
      card: "350 12% 13%",
      "card-foreground": "350 60% 95%",
      popover: "350 12% 13%",
      "popover-foreground": "350 60% 95%",
      primary: "347 77% 60%",
      "primary-foreground": "0 0% 100%",
      secondary: "350 10% 18%",
      "secondary-foreground": "350 30% 90%",
      muted: "350 10% 18%",
      "muted-foreground": "350 15% 60%",
      accent: "350 10% 18%",
      "accent-foreground": "350 30% 90%",
      destructive: "0 62% 45%",
      "destructive-foreground": "0 0% 100%",
      border: "350 10% 20%",
      input: "350 10% 20%",
      ring: "347 77% 60%",
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
