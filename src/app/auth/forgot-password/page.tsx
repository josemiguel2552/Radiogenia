"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, Mail, Globe, UserPlus, Clock } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

type ResetState = "form" | "sent" | "not_registered" | "waitlisted";

export default function ForgotPasswordPage() {
  const { lang, setLang, t } = usePublicLang();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ResetState>("form");
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const checkRes = await fetch("/api/auth/check-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!checkRes.ok) {
        setError("Error checking email. Please try again.");
        setLoading(false);
        return;
      }

      const { status } = await checkRes.json();

      if (status === "waitlisted") {
        setState("waitlisted");
        setLoading(false);
        return;
      }

      if (status === "unknown") {
        setState("not_registered");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setState("sent");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  const langToggle = (
    <button
      onClick={() => setLang(nextLang(lang))}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
    >
      <Globe className="h-3.5 w-3.5" />
      {langLabel(lang)}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex justify-center flex-1">
            <Logo size="md" forceDark />
          </div>
          {langToggle}
        </div>

        {state === "sent" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("auth.check_email")}</h1>
            <p className="text-sm text-gray-400">
              {t("auth.reset_sent", { email })}
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("auth.back_signin")}
            </Link>
          </div>
        )}

        {state === "not_registered" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <UserPlus className="h-6 w-6 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("auth.reset_not_registered")}</h1>
            <p className="text-sm text-gray-400">
              {t("auth.reset_join_waitlist")}
            </p>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Link
                href="/waitlist"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#1E3A5F] to-[#0F766E] text-white text-sm font-semibold hover:from-[#254A75] hover:to-[#14917F] shadow-lg shadow-teal-500/20"
              >
                <UserPlus className="h-4 w-4" />
                {t("auth.join_waitlist")}
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.back_signin")}
              </Link>
            </div>
          </div>
        )}

        {state === "waitlisted" && (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-4">
              <Clock className="h-6 w-6 text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("auth.reset_already_waitlisted")}</h1>
            <div className="flex flex-col items-center gap-3 pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.back_signin")}
              </Link>
            </div>
          </div>
        )}

        {state === "form" && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t("auth.reset_title")}</h1>
              <p className="text-sm text-gray-400">
                {t("auth.reset_subtitle")}
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300 text-sm">{t("auth.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("auth.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#1E3A5F] to-[#0F766E] hover:from-[#254A75] hover:to-[#14917F] font-semibold shadow-lg shadow-teal-500/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.send_link")}
              </Button>
            </form>

            <p className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("auth.back_signin")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
