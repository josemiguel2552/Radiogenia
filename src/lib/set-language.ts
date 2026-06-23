import type { UILanguage } from "./ui-prefs";

/**
 * Sets the unified platform + report language.
 *
 * The platform UI language and the report output language are a single
 * setting. This helper updates the live UI language (localStorage via
 * uiPrefs), mirrors the value to the server so it persists and syncs across
 * devices, and asks the dashboard to regenerate the current report in the
 * new language.
 */
export function setUnifiedLanguage(
  lang: UILanguage,
  update: (patch: { uiLanguage: UILanguage }) => void,
) {
  update({ uiLanguage: lang });
  fetch("/api/model-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ output_language: lang }),
  })
    .then(() => {
      window.dispatchEvent(new CustomEvent("radiogenai:config-changed"));
    })
    .catch(() => {});
  window.dispatchEvent(
    new CustomEvent("radiogenai:output-lang-changed", { detail: { lang } }),
  );
}
