"use client";

import { Label } from "@/components/ui/label";
import { useUIPrefs, SKINS, type UILanguage } from "@/lib/ui-prefs";
import { setUnifiedLanguage } from "@/lib/set-language";
import { useT } from "@/lib/i18n";

export function AppearanceTab() {
  const { prefs, update, skin: activeSkin } = useUIPrefs();
  const t = useT();

  return (
    <div className="space-y-6">
      {/* Language (platform + reports unified) */}
      <div>
        <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 block">
          {t("app.language")}
        </Label>
        <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
          {([{ v: "es", l: "Español" }, { v: "en", l: "English" }, { v: "pt", l: "Português" }] as { v: UILanguage; l: string }[]).map((lang) => (
            <button
              key={lang.v}
              type="button"
              onClick={() => { if (lang.v !== prefs.uiLanguage) setUnifiedLanguage(lang.v, update); }}
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
          {t("app.language_hint")}
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

      {/* Reset */}
      <button
        type="button"
        onClick={() => {
          update({ skin: "clasico" });
          if (prefs.uiLanguage !== "es") setUnifiedLanguage("es", update);
        }}
        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
      >
        {t("app.reset_defaults")}
      </button>
    </div>
  );
}
