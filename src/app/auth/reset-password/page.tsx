"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, ArrowLeft, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { lang, setLang, t } = usePublicLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("auth.passwords_mismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.password_too_short"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error updating password");
        setLoading(false);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 2000);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex justify-center flex-1">
            <Link href="/"><Logo size="md" forceDark /></Link>
          </div>
          <button
            onClick={() => setLang(nextLang(lang))}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <Globe className="h-3.5 w-3.5" />
            {langLabel(lang)}
          </button>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t("auth.password_updated")}</h1>
            <p className="text-sm text-gray-400">{t("auth.redirecting")}</p>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t("auth.new_password_title")}</h1>
              <p className="text-sm text-gray-400">{t("auth.new_password_subtitle")}</p>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">{t("auth.new_password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.password_min")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-gray-300 text-sm">{t("auth.confirm_password")}</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder={t("auth.confirm_placeholder")}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] hover:from-[#5b21b6] hover:to-[#6d28d9] font-semibold shadow-lg shadow-violet-500/20"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.update_btn")}
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
