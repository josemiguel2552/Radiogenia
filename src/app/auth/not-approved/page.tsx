"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ShieldCheck, LogOut } from "lucide-react";
import { usePublicLang } from "@/lib/public-i18n";

export default function NotApprovedPage() {
  const router = useRouter();
  const { t } = usePublicLang();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Logo size="md" forceDark />
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
            {t("auth.not_approved_waitlist")}
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
          <Button
            onClick={() => router.push("/waitlist")}
            className="bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] hover:from-[#5b21b6] hover:to-[#6d28d9]"
          >
            {t("auth.join_waitlist")}
          </Button>
        </div>
      </div>
    </div>
  );
}
