"use client";

import { useEffect, useState } from "react";

const texts = {
  es: { title: "Algo salió mal", desc: "Ha ocurrido un error inesperado. Puedes intentar recargar la página o contactar con soporte si el problema persiste.", btn: "Reintentar" },
  en: { title: "Something went wrong", desc: "An unexpected error occurred. You can try reloading the page or contact support if the problem persists.", btn: "Retry" },
  pt: { title: "Algo deu errado", desc: "Ocorreu um erro inesperado. Pode tentar recarregar a página ou contactar o suporte se o problema persistir.", btn: "Tentar novamente" },
};

export default function GlobalError({
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
    <html lang={lang}>
      <body className="antialiased bg-gray-950 text-white flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <p className="text-6xl mb-4">&#9888;&#65039;</p>
          <h1 className="text-xl font-bold mb-2">{t.title}</h1>
          <p className="text-sm text-gray-400 mb-6">{t.desc}</p>
          {error.digest && (
            <p className="text-xs text-gray-600 mb-4 font-mono">Ref: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {t.btn}
          </button>
        </div>
      </body>
    </html>
  );
}
