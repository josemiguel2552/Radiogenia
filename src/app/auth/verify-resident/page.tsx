"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Globe } from "lucide-react";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { ResidentVerificationForm } from "@/components/resident-verification-form";

export default function VerifyResidentPage() {
  const { lang, setLang, t } = usePublicLang();

  async function handleSkip() {
    await fetch("/api/auth/clear-pending-plan", { method: "POST" });
    window.location.href = "/dashboard";
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

        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
          <h1 className="text-xl font-bold text-white text-center">
            {t("auth.verify_resident_title")}
          </h1>
          <p className="text-sm text-gray-400 text-center leading-relaxed">
            {t("auth.verify_resident_desc")}
          </p>
          <ResidentVerificationForm />
        </div>

        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors"
          >
            {t("auth.skip_use_free")}
          </button>
        </div>
      </div>
    </div>
  );
}
