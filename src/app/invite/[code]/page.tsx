"use client";

/* Legacy invite links. The referral program (30 days of Starter without a
   card) was retired with card-first billing — an invite now simply welcomes
   the visitor and funnels them into the normal 7-day-trial signup. */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Globe, Sparkles } from "lucide-react";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

export default function InvitePage() {
  const { lang, setLang } = usePublicLang();
  const tr = (es: string, en: string, pt: string) => (lang === "es" ? es : lang === "pt" ? pt : en);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="max-w-md w-full space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/"><Logo size="md" forceDark /></Link>
          <button
            onClick={() => setLang(nextLang(lang))}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Globe className="h-3.5 w-3.5" />
            {langLabel(lang)}
          </button>
        </div>

        <div className="p-6 rounded-2xl border border-violet-500/25 bg-violet-500/5 space-y-5 text-center">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-violet-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">
            {tr("Un colega te ha invitado a Radiogen.ai", "A colleague invited you to Radiogen.ai", "Um colega convidou você para o Radiogen.ai")}
          </h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            {tr(
              "Crea tu cuenta y prueba la plataforma gratis durante 7 días. Sin cargo hoy: solo se registra tu tarjeta y puedes cancelar cuando quieras.",
              "Create your account and try the platform free for 7 days. No charge today: your card is only registered and you can cancel anytime.",
              "Crie sua conta e teste a plataforma grátis por 7 dias. Sem cobrança hoje: seu cartão apenas é registrado e você pode cancelar quando quiser.",
            )}
          </p>
          <Link href="/waitlist?plan=starter" className="block">
            <Button className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 font-semibold shadow-lg shadow-violet-500/20">
              {tr("Probar 7 días gratis", "Try 7 days free", "Testar 7 dias grátis")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
