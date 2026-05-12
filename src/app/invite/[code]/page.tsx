"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, CheckCircle2, Gift, FileText, CreditCard } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

const COUNTRIES = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "España", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Portugal", "Puerto Rico",
  "República Dominicana", "United States", "Uruguay", "Venezuela", "Other",
];

type PageState = "loading" | "form" | "success" | "invalid" | "exhausted";

export default function InvitePage() {
  const params = useParams();
  const code = (params.code as string || "").toUpperCase();
  const { lang, setLang, t } = usePublicLang();

  const [state, setState] = useState<PageState>("loading");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [hospital, setHospital] = useState("");
  const [role, setRole] = useState<"attending" | "resident">("attending");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!code) { setState("invalid"); return; }
    fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).then(async (res) => {
      if (res.ok) setState("form");
      else {
        const data = await res.json();
        setState(data.error === "code_exhausted" ? "exhausted" : "invalid");
      }
    }).catch(() => setState("invalid"));
  }, [code]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError(t("auth.password_too_short") || "Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { invitation_code: code } },
      });

      if (signUpError) {
        setError(signUpError.message);
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          country,
          hospital: hospital.trim(),
          role,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "code_exhausted") {
          setState("exhausted");
          return;
        }
        setError(t("invite.error_generic"));
        setSubmitting(false);
        return;
      }

      setState("success");
    } catch {
      setError(t("invite.error_generic"));
    }
    setSubmitting(false);
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    );
  }

  if (state === "invalid" || state === "exhausted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center"><Logo size="md" forceDark /></div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
            <p className="text-sm text-gray-400">
              {state === "exhausted" ? t("invite.code_exhausted") : t("invite.invalid_code")}
            </p>
          </div>
          <Link href="/waitlist" className="text-sm text-blue-400 hover:text-blue-300">
            {t("nav.get_started")}
          </Link>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center"><Logo size="md" forceDark /></div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">{t("invite.success_title")}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">{t("invite.success_desc")}</p>
          </div>
          <Link href="/auth/login" className="text-sm text-blue-400 hover:text-blue-300">
            {t("invite.signin_link")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/20 to-blue-600/20" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-teal-600/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] animate-float-slower" />
        <div className="relative z-10 max-w-sm text-center px-8 space-y-6">
          <div className="flex items-center justify-center mb-4">
            <Logo size="lg" forceDark />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10">
              <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
                <Gift className="h-4 w-4 text-teal-400" />
              </div>
              <p className="text-sm text-gray-300 text-left">{t("invite.starter_free")}</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10">
              <div className="h-9 w-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-sm text-gray-300 text-left">{t("invite.reports_150")}</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] border border-white/10">
              <div className="h-9 w-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-sm text-gray-300 text-left">{t("invite.no_card")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div className="flex lg:hidden justify-center mb-4">
            <Logo size="md" forceDark />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{t("invite.title")}</h1>
              <p className="text-sm text-gray-400">{t("invite.subtitle")}</p>
            </div>
            <button
              onClick={() => setLang(nextLang(lang))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Globe className="h-3.5 w-3.5" />
              {langLabel(lang)}
            </button>
          </div>

          {/* Mobile perks */}
          <div className="lg:hidden flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Gift className="h-3.5 w-3.5 text-teal-400" /> Starter 30d</span>
            <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5 text-blue-400" /> 150 reports</span>
            <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-purple-400" /> {t("invite.no_card")}</span>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300 text-sm">{t("waitlist.first_name")}</Label>
                <Input
                  id="firstName"
                  placeholder={t("waitlist.first_name_placeholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-teal-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-gray-300 text-sm">{t("waitlist.last_name")}</Label>
                <Input
                  id="lastName"
                  placeholder={t("waitlist.last_name_placeholder")}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm">{t("invite.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("invite.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-teal-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300 text-sm">{t("invite.password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("invite.password_placeholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-teal-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-300 text-sm">{t("waitlist.country")}</Label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full h-11 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="" disabled className="bg-[#0a0a1a] text-gray-500">{t("waitlist.country_placeholder")}</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} className="bg-[#0a0a1a]">{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital" className="text-gray-300 text-sm">{t("waitlist.hospital")}</Label>
              <Input
                id="hospital"
                placeholder={t("waitlist.hospital_placeholder")}
                value={hospital}
                onChange={(e) => setHospital(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-teal-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 text-sm">{t("waitlist.role")}</Label>
              <div className="flex gap-3">
                {(["attending", "resident"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      role === r
                        ? "border-teal-500/50 bg-teal-500/10 text-teal-400"
                        : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/5 hover:text-gray-300"
                    }`}
                  >
                    {t(`waitlist.role_${r}`)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-[#0F766E] to-[#1E3A5F] hover:from-[#14917F] hover:to-[#254A75] font-semibold shadow-lg shadow-teal-500/20"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("invite.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {t("invite.have_account")}{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              {t("invite.signin_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
