"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUIPrefs, SKINS, FONT_FAMILIES, type PanelSide, type FontFamily, type UILanguage, type LayoutMode } from "@/lib/ui-prefs";
import { useT } from "@/lib/i18n";
import { Columns2, LayoutList, Minimize2 } from "lucide-react";

export function AppearanceTab() {
  const { prefs, update, skin: activeSkin } = useUIPrefs();
  const t = useT();

  return (
    <div className="space-y-6">
      {/* UI language */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.ui_language")}
        </Label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
          {([{ v: "es", l: "Español" }, { v: "en", l: "English" }, { v: "pt", l: "Português" }] as { v: UILanguage; l: string }[]).map((lang) => (
            <button
              key={lang.v}
              type="button"
              onClick={() => update({ uiLanguage: lang.v })}
              className={`px-4 py-1.5 text-xs rounded-md transition-colors ${
                prefs.uiLanguage === lang.v
                  ? "bg-white dark:bg-gray-900 shadow-sm font-medium"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={prefs.uiLanguage === lang.v ? { color: `hsl(${activeSkin.vars.primary})` } : undefined}
            >
              {lang.l}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {t("app.ui_lang_hint")}
        </p>
      </div>

      {/* Layout mode */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.layout")}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "classic", icon: LayoutList, desc: t("app.layout_classic_desc") },
            { v: "side-by-side", icon: Columns2, desc: t("app.layout_sidebyside_desc") },
            { v: "compact", icon: Minimize2, desc: t("app.layout_compact_desc") },
          ] as { v: LayoutMode; icon: typeof LayoutList; desc: string }[]).map(({ v, icon: Icon, desc }) => {
            const active = prefs.layout === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => update({ layout: v })}
                className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-lg border transition-all text-center ${
                  active
                    ? "border-transparent shadow-sm bg-brand-soft"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                style={active ? { color: "hsl(var(--primary))" } : undefined}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-medium">{t(`app.layout_${v.replace("-", "")}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">
          {t(`app.layout_${prefs.layout.replace("-", "")}_desc`)}
        </p>
      </div>

      {/* Skin selector */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.skin")}
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {SKINS.map((skin) => {
            const active = prefs.skin === skin.id;
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => update({ skin: skin.id })}
                className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                  active
                    ? "border-current shadow-md scale-[1.03]"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:scale-[1.02]"
                }`}
                style={active ? { borderColor: skin.preview.primary } : undefined}
              >
                <div className="p-1.5" style={{ backgroundColor: skin.preview.bg }}>
                  <div
                    className="rounded-md p-1.5 mb-1"
                    style={{ backgroundColor: skin.preview.card, border: `1px solid ${skin.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    <div className="h-1 w-8 rounded-full mb-1" style={{ backgroundColor: skin.preview.primary }} />
                    <div className="h-1 w-full rounded-full" style={{ backgroundColor: skin.preview.fg, opacity: 0.15 }} />
                    <div className="h-1 w-3/4 rounded-full mt-0.5" style={{ backgroundColor: skin.preview.fg, opacity: 0.1 }} />
                  </div>
                  <div className="flex gap-0.5">
                    <div className="h-3 flex-1 rounded" style={{ backgroundColor: skin.preview.primary }} />
                    <div
                      className="h-3 flex-1 rounded"
                      style={{ backgroundColor: skin.preview.card, border: `1px solid ${skin.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}
                    />
                  </div>
                </div>
                <div
                  className="text-[9px] font-medium py-1 text-center"
                  style={{ backgroundColor: skin.preview.bg, color: skin.preview.fg }}
                >
                  {t(`app.skin_${skin.id}`)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font family */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.font_family")}
        </Label>
        <Select value={prefs.fontFamily} onValueChange={(v) => update({ fontFamily: v as FontFamily })}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                <span style={{ fontFamily: f.stack }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              style={prefs.panelSide === s ? { color: `hsl(${activeSkin.vars.primary})` } : undefined}
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
        onClick={() => {
          update({ skin: "clasico", panelSide: "right", fontSize: 14, fontFamily: "inter", uiLanguage: "es", layout: "classic" });
        }}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
      >
        {t("app.reset_defaults")}
      </button>
    </div>
  );
}
