"use client";

import Link from "next/link";
import { ArrowLeft, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

export default function LegalPage() {
  const { lang, setLang, t } = usePublicLang();

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Logo size="md" forceDark />
          </div>
          <button
            onClick={() => setLang(nextLang(lang))}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Globe className="h-3.5 w-3.5" />
            {langLabel(lang)}
          </button>
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{t("legal.title")}</h1>
        <p className="text-sm text-gray-500 mb-10">{t("legal.updated")}</p>

        <div className="space-y-10 leading-relaxed">
          {/* 1. Nature of the Service */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s1.title")}</h2>
            <p dangerouslySetInnerHTML={{ __html: t("legal.s1.p1").replace(/<b>/g, '<strong class="text-white">').replace(/<\/b>/g, "</strong>") }} />
            <p className="mt-3" dangerouslySetInnerHTML={{ __html: t("legal.s1.p2").replace(/<b>/g, '<strong class="text-white">').replace(/<\/b>/g, "</strong>") }} />
          </section>

          {/* 2. Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s2.title")}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t("legal.s2.items").split("|").map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/<b>/g, '<strong class="text-white">').replace(/<\/b>/g, "</strong>") }} />
              ))}
            </ul>
          </section>

          {/* 3. Professional Responsibility */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s3.title")}</h2>
            <p>{t("legal.s3.intro")}</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              {t("legal.s3.items").split("|").map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 4. Data Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s4.title")}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t("legal.s4.items").split("|").map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/<b>/g, '<strong class="text-white">').replace(/<\/b>/g, "</strong>") }} />
              ))}
            </ul>
          </section>

          {/* 5. Prohibited Uses */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s5.title")}</h2>
            <ul className="list-disc pl-6 space-y-2">
              {t("legal.s5.items").split("|").map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>

          {/* 6. Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s6.title")}</h2>
            <p>{t("legal.s6.p")}</p>
          </section>

          {/* 7. Service Availability */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s7.title")}</h2>
            <p>{t("legal.s7.p")}</p>
          </section>

          {/* 8. Changes to Terms */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s8.title")}</h2>
            <p>{t("legal.s8.p")}</p>
          </section>

          {/* 9. Contact */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">{t("legal.s9.title")}</h2>
            <p>
              {t("legal.s9.p")}{" "}
              <a href="mailto:legal@radiogen.ai" className="text-blue-400 hover:text-blue-300">legal@radiogen.ai</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Radiogen.AI. {t("footer.rights")}
        </div>
      </div>
    </div>
  );
}
