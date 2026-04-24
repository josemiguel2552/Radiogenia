"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

/* ── Colour presets ─────────────────────────────────────────────── */

export interface ColorPreset {
  name: string;
  primary: string;       // HSL values "221 83% 53%"
  primaryFg: string;
  accent: string;
  gradient: [string, string]; // tailwind classes for logo / avatar gradients
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Blue",
    primary: "221 83% 53%",
    primaryFg: "210 40% 98%",
    accent: "221 83% 53%",
    gradient: ["from-blue-500", "to-blue-700"],
  },
  {
    name: "Teal",
    primary: "173 80% 40%",
    primaryFg: "210 40% 98%",
    accent: "173 80% 40%",
    gradient: ["from-teal-500", "to-teal-700"],
  },
  {
    name: "Violet",
    primary: "262 83% 58%",
    primaryFg: "210 40% 98%",
    accent: "262 83% 58%",
    gradient: ["from-violet-500", "to-violet-700"],
  },
  {
    name: "Rose",
    primary: "347 77% 50%",
    primaryFg: "210 40% 98%",
    accent: "347 77% 50%",
    gradient: ["from-rose-500", "to-rose-700"],
  },
  {
    name: "Amber",
    primary: "38 92% 50%",
    primaryFg: "20 14% 10%",
    accent: "38 92% 50%",
    gradient: ["from-amber-500", "to-amber-700"],
  },
  {
    name: "Emerald",
    primary: "160 84% 39%",
    primaryFg: "210 40% 98%",
    accent: "160 84% 39%",
    gradient: ["from-emerald-500", "to-emerald-700"],
  },
];

/* ── Density ────────────────────────────────────────────────────── */

export type UIDensity = "compact" | "comfortable" | "spacious";

const DENSITY_SCALES: Record<UIDensity, { text: string; gap: string; padding: string; radius: string }> = {
  compact:     { text: "0.8125rem", gap: "0.375rem", padding: "0.875rem", radius: "0.375rem" },
  comfortable: { text: "0.875rem",  gap: "0.5rem",   padding: "1rem",     radius: "0.5rem" },
  spacious:    { text: "0.9375rem", gap: "0.625rem",  padding: "1.25rem",  radius: "0.625rem" },
};

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

export interface UIPreferences {
  colorPreset: string;
  density: UIDensity;
  panelSide: PanelSide;
  fontSize: number;
  fontFamily: FontFamily;
}

const DEFAULTS: UIPreferences = {
  colorPreset: "Blue",
  density: "comfortable",
  panelSide: "right",
  fontSize: 14,
  fontFamily: "inter",
};

const STORAGE_KEY = "radiogenia_ui_prefs";

/* ── Apply to DOM ───────────────────────────────────────────────── */

function applyPreferences(prefs: UIPreferences) {
  const root = document.documentElement;
  const preset = COLOR_PRESETS.find((p) => p.name === prefs.colorPreset) || COLOR_PRESETS[0];
  const density = DENSITY_SCALES[prefs.density];

  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--primary-foreground", preset.primaryFg);
  root.style.setProperty("--ring", preset.accent);

  root.style.setProperty("--radius", density.radius);
  root.style.setProperty("--ui-gap", density.gap);
  root.style.setProperty("--ui-padding", density.padding);

  root.style.setProperty("--ui-font-size", `${prefs.fontSize}px`);
  root.style.fontSize = `${prefs.fontSize}px`;

  const font = FONT_FAMILIES.find((f) => f.value === prefs.fontFamily) || FONT_FAMILIES[0];
  root.style.setProperty("--font-body", font.stack);
}

/* ── Context ────────────────────────────────────────────────────── */

interface UIPrefsCtx {
  prefs: UIPreferences;
  update: (patch: Partial<UIPreferences>) => void;
  preset: ColorPreset;
}

const Ctx = createContext<UIPrefsCtx>({
  prefs: DEFAULTS,
  update: () => {},
  preset: COLOR_PRESETS[0],
});

export function useUIPrefs() {
  return useContext(Ctx);
}

export function UIPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<UIPreferences>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UIPreferences>;
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

  const preset = COLOR_PRESETS.find((p) => p.name === prefs.colorPreset) || COLOR_PRESETS[0];

  if (!hydrated) return null; // avoid flash

  return (
    <Ctx.Provider value={{ prefs, update, preset }}>
      {children}
    </Ctx.Provider>
  );
}
