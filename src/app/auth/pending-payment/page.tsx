"use client";

/* Card-first activation wall. Every individual account without an active
   subscription lands here (dashboard layout redirect): choose the 7-day
   Starter trial (card required, first charge on day 7, no refunds) or a
   Professional subscription charged immediately. There is no free escape. */

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Globe, LogOut, Check, Sparkles, CreditCard } from "lucide-react";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { PLANS, TRIAL_DAYS, CURRENCY } from "@/lib/types";

export default function PendingPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <PendingPaymentContent />
    </Suspense>
  );
}

function PendingPaymentContent() {
  const { lang, setLang } = usePublicLang();
  const starter = PLANS.starter;
  const professional = PLANS.professional;

  const tr = (es: string, en: string, pt: string) => (lang === "es" ? es : lang === "pt" ? pt : en);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="max-w-2xl w-full space-y-6">
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

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">
            {tr("Activa tu cuenta", "Activate your account", "Ative sua conta")}
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            {tr(
              `Para usar Radiogen.ai necesitas activar un plan. Empieza con ${TRIAL_DAYS} días de prueba gratis.`,
              `To use Radiogen.ai you need an active plan. Start with a ${TRIAL_DAYS}-day free trial.`,
              `Para usar o Radiogen.ai você precisa de um plano ativo. Comece com ${TRIAL_DAYS} dias de teste grátis.`,
            )}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Starter — 7-day trial */}
          <div className="relative p-6 rounded-2xl border-2 border-violet-500/40 bg-gradient-to-b from-violet-500/10 to-blue-500/5 space-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-blue-500 rounded-full text-white whitespace-nowrap">
                {tr(`${TRIAL_DAYS} días gratis`, `${TRIAL_DAYS} days free`, `${TRIAL_DAYS} dias grátis`)}
              </span>
            </div>
            <div className="pt-1">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-400" /> {starter.label}
              </h2>
              <p className="text-2xl font-bold text-white mt-1">
                {tr("Gratis hoy", "Free today", "Grátis hoje")}
                <span className="text-sm font-normal text-gray-400"> · {CURRENCY}{starter.price}
                  {tr("/mes después", "/mo after", "/mês depois")}
                </span>
              </p>
            </div>
            <ul className="space-y-2 text-[13px] text-gray-300">
              {[
                tr(`${starter.reports} informes + ${starter.dictationMinutes} min de dictado al mes`, `${starter.reports} reports + ${starter.dictationMinutes} min dictation per month`, `${starter.reports} laudos + ${starter.dictationMinutes} min de ditado por mês`),
                tr("Sin cargo hoy — solo se registra la tarjeta", "No charge today — card is only registered", "Sem cobrança hoje — o cartão apenas é registrado"),
                tr(`El día ${TRIAL_DAYS} se cobra ${CURRENCY}${starter.price}/mes salvo que canceles antes`, `On day ${TRIAL_DAYS} you're charged ${CURRENCY}${starter.price}/mo unless you cancel first`, `No dia ${TRIAL_DAYS} é cobrado ${CURRENCY}${starter.price}/mês salvo cancelamento prévio`),
                tr("Cancela en cualquier momento desde tu cuenta", "Cancel anytime from your account", "Cancele a qualquer momento na sua conta"),
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <a href="/api/checkout?plan=starter" className="block">
              <Button className="w-full h-11 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 font-semibold shadow-lg shadow-violet-500/20">
                {tr(`Empezar prueba de ${TRIAL_DAYS} días`, `Start ${TRIAL_DAYS}-day trial`, `Começar teste de ${TRIAL_DAYS} dias`)}
              </Button>
            </a>
          </div>

          {/* Professional — immediate subscription */}
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
            <div className="pt-1">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-400" /> {professional.label}
              </h2>
              <p className="text-2xl font-bold text-white mt-1">
                {CURRENCY}{professional.price}
                <span className="text-sm font-normal text-gray-400">{tr("/mes", "/mo", "/mês")}</span>
              </p>
            </div>
            <ul className="space-y-2 text-[13px] text-gray-300">
              {[
                tr(`${professional.reports} informes + ${professional.dictationMinutes} min de dictado al mes`, `${professional.reports} reports + ${professional.dictationMinutes} min dictation per month`, `${professional.reports} laudos + ${professional.dictationMinutes} min de ditado por mês`),
                tr("Documentos de guías y exportación masiva", "Guideline documents & bulk export", "Documentos de diretrizes e exportação em massa"),
                tr("Soporte prioritario", "Priority support", "Suporte prioritário"),
                tr("Cargo inmediato, sin periodo de prueba", "Charged today, no trial period", "Cobrança imediata, sem período de teste"),
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <a href="/api/checkout?plan=professional" className="block">
              <Button variant="outline" className="w-full h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold">
                {tr("Suscribirse ahora", "Subscribe now", "Assinar agora")}
              </Button>
            </a>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 text-center max-w-lg mx-auto leading-relaxed">
          {tr(
            `Te enviaremos un recordatorio por correo el día 6, antes del primer cargo. Los pagos no son reembolsables; puedes cancelar la suscripción en cualquier momento y conservarás el acceso hasta el final del periodo pagado.`,
            `We'll email you a reminder on day 6, before the first charge. Payments are non-refundable; you can cancel your subscription at any time and keep access until the end of the paid period.`,
            `Enviaremos um lembrete por e-mail no dia 6, antes da primeira cobrança. Os pagamentos não são reembolsáveis; você pode cancelar a assinatura a qualquer momento e manter o acesso até o fim do período pago.`,
          )}
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {tr("Cerrar sesión", "Log out", "Sair")}
          </button>
        </div>
      </div>
    </div>
  );
}
