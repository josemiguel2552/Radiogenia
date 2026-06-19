"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { CreditCard, Globe, LogOut } from "lucide-react";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { PLANS, type SubscriptionPlan } from "@/lib/types";

export default function PendingPaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <PendingPaymentContent />
    </Suspense>
  );
}

function PendingPaymentContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const { lang, setLang, t } = usePublicLang();

  const planConfig = PLANS[plan as SubscriptionPlan] || PLANS.starter;
  const planLabel = planConfig.label;
  const price = planConfig.price;

  async function handleUseFree() {
    await fetch("/api/auth/clear-pending-plan", { method: "POST" });
    window.location.href = "/dashboard";
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

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

        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-5">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-violet-400" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-white text-center">
            {t("auth.pending_payment_title")}
          </h1>

          <p className="text-sm text-gray-400 text-center leading-relaxed">
            {t("auth.pending_payment_desc", { plan: planLabel, price: `$${price}` })}
          </p>

          <a
            href={`/api/checkout?plan=${encodeURIComponent(plan)}`}
            className="block w-full"
          >
            <Button className="w-full h-11 bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] hover:from-[#5b21b6] hover:to-[#6d28d9] font-semibold shadow-lg shadow-violet-500/20">
              {t("auth.pay_now", { price: `$${price}` })}
            </Button>
          </a>

          <button
            onClick={handleUseFree}
            className="w-full text-sm text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            {t("auth.use_free_instead")}
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("auth.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
