"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useUIPrefs, COLOR_PRESETS, FONT_FAMILIES, type PanelSide, type FontFamily, type UILanguage } from "@/lib/ui-prefs";
import { useT } from "@/lib/i18n";

export function AppearanceTab() {
  const { prefs, update } = useUIPrefs();
  const t = useT();

  return (
    <div className="space-y-6">
      {/* UI language */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.ui_language")}
        </Label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
          {([{ v: "es", l: "Español" }, { v: "en", l: "English" }] as { v: UILanguage; l: string }[]).map((lang) => (
            <button
              key={lang.v}
              type="button"
              onClick={() => update({ uiLanguage: lang.v })}
              className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
                prefs.uiLanguage === lang.v
                  ? "bg-white dark:bg-gray-900 shadow-sm font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={prefs.uiLanguage === lang.v ? { color: `hsl(${COLOR_PRESETS.find((c) => c.name === prefs.colorPreset)?.primary || ""})` } : undefined}
            >
              {lang.l}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {t("app.ui_lang_hint")}
        </p>
      </div>

      {/* Accent colour */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.accent")}
        </Label>
        <div className="grid grid-cols-6 gap-2">
          {COLOR_PRESETS.map((p) => {
            const active = prefs.colorPreset === p.name;
            return (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => update({ colorPreset: p.name })}
                className={`h-8 w-full rounded-lg transition-all ${
                  active ? "ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-900 scale-110" : "hover:scale-105"
                }`}
                style={{ background: `hsl(${p.primary})` }}
              />
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {t("app.current")}: {prefs.colorPreset}
        </p>
      </div>

      {/* Font family */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.font_family")}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {FONT_FAMILIES.map((f) => {
            const active = prefs.fontFamily === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => update({ fontFamily: f.value as FontFamily })}
                className={`px-3 py-2 text-xs rounded-lg border transition-all text-left ${
                  active
                    ? "border-transparent shadow-sm font-medium bg-brand-soft"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                style={active ? { color: "hsl(var(--primary))" } : undefined}
              >
                <span style={{ fontFamily: f.stack }}>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font size */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
          {t("app.font_size")}: {prefs.fontSize}px
        </Label>
        <Slider
          value={[prefs.fontSize]}
          min={12}
          max={18}
          step={1}
          onValueChange={(v) => update({ fontSize: v[0] })}
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>12px</span>
          <span>18px</span>
        </div>
      </div>

      {/* Panel side */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.panel_position")}
        </Label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
          {(["left", "right"] as PanelSide[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => update({ panelSide: s })}
              className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
                prefs.panelSide === s
                  ? "bg-white dark:bg-gray-900 shadow-sm font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={prefs.panelSide === s ? { color: `hsl(${COLOR_PRESETS.find((c) => c.name === prefs.colorPreset)?.primary || ""})` } : undefined}
            >
              {t(`app.${s}`)}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {t("app.panel_hint")}
        </p>
      </div>

      {/* Reset */}
      <button
        type="button"
        onClick={() => update({ colorPreset: "Blue", panelSide: "right", fontSize: 14, fontFamily: "inter", uiLanguage: "es" })}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
      >
        {t("app.reset_defaults")}
      </button>
    </div>
  );
}
