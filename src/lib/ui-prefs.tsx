"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

/* ── Colour presets ─────────────────────────────────────────────── */

export interface ColorPreset {
  name: string;
  primary: string;        // HSL values for light mode  "221 83% 53%"
  primaryDark: string;    // HSL values for dark mode (higher lightness)
  primaryFg: string;
  accent: string;
  gradient: [string, string];
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    name: "Blue",
    primary: "221 83% 53%",
    primaryDark: "217 91% 65%",
    primaryFg: "210 40% 98%",
    accent: "221 83% 53%",
    gradient: ["from-blue-500", "to-blue-700"],
  },
  {
    name: "Teal",
    primary: "173 80% 40%",
    primaryDark: "173 80% 55%",
    primaryFg: "210 40% 98%",
    accent: "173 80% 40%",
    gradient: ["from-teal-500", "to-teal-700"],
  },
  {
    name: "Violet",
    primary: "262 83% 58%",
    primaryDark: "262 83% 70%",
    primaryFg: "210 40% 98%",
    accent: "262 83% 58%",
    gradient: ["from-violet-500", "to-violet-700"],
  },
  {
    name: "Rose",
    primary: "347 77% 50%",
    primaryDark: "347 77% 63%",
    primaryFg: "210 40% 98%",
    accent: "347 77% 50%",
    gradient: ["from-rose-500", "to-rose-700"],
  },
  {
    name: "Amber",
    primary: "38 92% 50%",
    primaryDark: "38 92% 60%",
    primaryFg: "20 14% 10%",
    accent: "38 92% 50%",
    gradient: ["from-amber-500", "to-amber-700"],
  },
  {
    name: "Emerald",
    primary: "160 84% 39%",
    primaryDark: "160 84% 55%",
    primaryFg: "210 40% 98%",
    accent: "160 84% 39%",
    gradient: ["from-emerald-500", "to-emerald-700"],
  },
];

/* ── Custom color helpers ──────────────────────────────────────── */

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

export function customHexToPreset(hex: string): { primary: string; primaryDark: string; primaryFg: string } {
  const { h, s, l } = hexToHsl(hex);
  const darkL = Math.min(l + 15, 80);
  const fgL = l > 55 ? 10 : 98;
  return {
    primary: hslString(h, s, l),
    primaryDark: hslString(h, Math.min(s + 5, 100), darkL),
    primaryFg: `210 ${l > 55 ? 14 : 40}% ${fgL}%`,
  };
}

export function hslToHex(hslStr: string): string {
  const parts = hslStr.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return "#3b82f6";
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (c: number) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/* ── Layout mode ───────────────────────────────────────────────── */

export type LayoutMode = "classic" | "side-by-side" | "compact";

/* ── Density ───────────────────────────────────────────────────── */

export type DensityMode = "compact" | "normal" | "spacious";

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
  colorPreset: string;
  customColor: string;
  panelSide: PanelSide;
  fontSize: number;
  fontFamily: FontFamily;
  uiLanguage: UILanguage;
  layout: LayoutMode;
  density: DensityMode;
}

const DEFAULTS: UIPreferences = {
  colorPreset: "Blue",
  customColor: "",
  panelSide: "right",
  fontSize: 14,
  fontFamily: "inter",
  uiLanguage: "es",
  layout: "classic",
  density: "normal",
};

const STORAGE_KEY = "radiogenai_ui_prefs";

/* ── Apply to DOM ───────────────────────────────────────────────── */

function applyPreferences(prefs: UIPreferences) {
  const root = document.documentElement;

  if (prefs.colorPreset === "Custom" && prefs.customColor) {
    const custom = customHexToPreset(prefs.customColor);
    root.style.setProperty("--preset-primary", custom.primary);
    root.style.setProperty("--preset-primary-dark", custom.primaryDark);
    root.style.setProperty("--preset-primary-fg", custom.primaryFg);
  } else {
    const preset = COLOR_PRESETS.find((p) => p.name === prefs.colorPreset) || COLOR_PRESETS[0];
    root.style.setProperty("--preset-primary", preset.primary);
    root.style.setProperty("--preset-primary-dark", preset.primaryDark);
    root.style.setProperty("--preset-primary-fg", preset.primaryFg);
  }

  root.style.setProperty("--ui-font-size", `${prefs.fontSize}px`);
  root.style.fontSize = `${prefs.fontSize}px`;

  const font = FONT_FAMILIES.find((f) => f.value === prefs.fontFamily) || FONT_FAMILIES[0];
  root.style.setProperty("--font-body", font.stack);

  root.dataset.density = prefs.density;
  root.dataset.layout = prefs.layout;
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
