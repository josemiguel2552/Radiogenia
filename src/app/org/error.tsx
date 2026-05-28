"use client";

import { useEffect, useState } from "react";

const texts = {
  es: { title: "Error en el panel", desc: "Ha ocurrido un error al cargar esta sección. Tus datos están seguros.", btn: "Reintentar", home: "Ir al inicio" },
  en: { title: "Panel error", desc: "An error occurred while loading this section. Your data is safe.", btn: "Retry", home: "Go to home" },
  pt: { title: "Erro no painel", desc: "Ocorreu um erro ao carregar esta seção. Seus dados estão seguros.", btn: "Tentar novamente", home: "Ir ao início" },
};

export default function OrgError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState<"es" | "en" | "pt">("es");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("radiogenai_ui_prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.uiLanguage && prefs.uiLanguage in texts) setLang(prefs.uiLanguage);
      }
    } catch {}
  }, []);

  const t = texts[lang];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md px-6">
        <p className="text-5xl mb-4">🏥</p>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t.desc}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4 font-mono">Ref: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t.btn}
          </button>
          <a
            href="/org"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t.home}
          </a>
        </div>
      </div>
    </div>
  );
}
