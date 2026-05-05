"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

export default function RegisterPage() {
  const router = useRouter();
  const { lang, setLang, t } = usePublicLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError(lang === "es"
        ? "Debes aceptar los términos de uso y la política de privacidad para crear una cuenta."
        : lang === "pt"
        ? "Você deve aceitar os termos de uso e a política de privacidade para criar uma conta."
        : "You must accept the terms of use and privacy policy to create an account.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch {
        // Seeding retried on dashboard load
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleSignUp() {
    if (!accepted) {
      setError(lang === "es"
        ? "Debes aceptar los términos de uso y la política de privacidad para crear una cuenta."
        : lang === "pt"
        ? "Você deve aceitar os termos de uso e a política de privacidade para criar uma conta."
        : "You must accept the terms of use and privacy policy to create an account.");
      return;
    }
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] animate-float-slower" />
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="flex items-center justify-center mb-8">
            <Logo size="lg" forceDark />
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            {t("auth.sidebar_free")}
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
              <h1 className="text-2xl font-bold text-white mb-1">{t("auth.create_account")}</h1>
              <p className="text-sm text-gray-400">{t("auth.register_subtitle")}</p>
            </div>
            <button
              onClick={() => setLang(nextLang(lang))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Globe className="h-3.5 w-3.5" />
              {langLabel(lang)}
            </button>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignUp}
            type="button"
            disabled={!accepted}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/10 text-sm font-medium transition-colors ${accepted ? "bg-white/5 hover:bg-white/10 text-white" : "bg-white/[0.02] text-gray-500 cursor-not-allowed"}`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("auth.google")}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[#0a0a1a] text-gray-500">{t("auth.or_register")}</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300 text-sm">{t("auth.fullname")}</Label>
              <Input
                id="name"
                placeholder={t("auth.fullname_placeholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>
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
              <Label htmlFor="password" className="text-gray-300 text-sm">{t("auth.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("auth.password_min")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => { setAccepted(e.target.checked); setError(""); }}
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                  {t("auth.accept_terms").replace(".", "")}{" "}
                  <Link href="/legal" target="_blank" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">
                    {lang === "es" ? "Ver términos" : lang === "pt" ? "Ver termos" : "View terms"}
                  </Link>.
                  {" "}{t("auth.accept_terms_note")}
                </span>
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#1E3A5F] to-[#0F766E] hover:from-[#254A75] hover:to-[#14917F] font-semibold shadow-lg shadow-teal-500/20"
              disabled={loading || !accepted}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.create_btn")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {t("auth.have_account")}{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              {t("auth.signin_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
