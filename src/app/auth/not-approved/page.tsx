"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ShieldCheck, LogOut } from "lucide-react";
import { usePublicLang } from "@/lib/public-i18n";

export default function NotApprovedPage() {
  const { t } = usePublicLang();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Link href="/"><Logo size="md" forceDark /></Link>
        </div>
        <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white">{t("auth.not_approved_title")}</h1>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t("auth.not_approved_desc")}
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            {t("auth.not_approved_contact")}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="border-white/10 text-gray-300 hover:bg-white/5 hover:text-white gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
