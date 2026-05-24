"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const { lang, setLang, t } = usePublicLang();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) setError(callbackError);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }


  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20" />
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] animate-float-slower" />
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="flex items-center justify-center mb-8">
            <Logo size="lg" forceDark />
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            {t("auth.sidebar_text")}
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden justify-center mb-4">
            <Logo size="md" forceDark />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t("auth.welcome_back")}</h1>
              <p className="text-sm text-gray-400">{t("auth.sign_in_subtitle")}</p>
            </div>
            <button
              onClick={() => setLang(nextLang(lang))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Globe className="h-3.5 w-3.5" />
              {langLabel(lang)}
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300 text-sm">{t("auth.password")}</Label>
                <Link href="/auth/forgot-password" className="text-xs text-blue-400 hover:text-blue-300">
                  {t("auth.forgot")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signin_btn")}
            </Button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">{t("auth.invite_only")}</p>
            <Link href="/waitlist" className="inline-block text-sm text-blue-400 hover:text-blue-300 font-medium">
              {t("auth.join_waitlist")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
