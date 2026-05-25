"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const texts = {
  es: { title: "Página no encontrada", desc: "La página que buscas no existe o ha sido movida.", btn: "Volver al inicio" },
  en: { title: "Page not found", desc: "The page you are looking for does not exist or has been moved.", btn: "Back to home" },
  pt: { title: "Página não encontrada", desc: "A página que procura não existe ou foi movida.", btn: "Voltar ao início" },
};

export default function NotFound() {
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
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="text-center max-w-md px-6">
        <p className="text-7xl font-bold text-gray-200 dark:text-gray-800 mb-2">404</p>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t.title}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t.desc}
        </p>
        <Link
          href="/"
          className="inline-flex px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {t.btn}
        </Link>
      </div>
    </div>
  );
}
