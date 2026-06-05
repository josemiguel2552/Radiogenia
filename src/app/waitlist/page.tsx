"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";

const COUNTRIES = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "España", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Portugal", "Puerto Rico",
  "República Dominicana", "United States", "Uruguay", "Venezuela", "Other",
];

export default function WaitlistPage() {
  const { lang, setLang, t } = usePublicLang();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [hospital, setHospital] = useState("");
  const [role, setRole] = useState<"attending" | "resident">("attending");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, country, hospital, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("waitlist.network_error"));
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Logo size="md" forceDark />
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-violet-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">{t("waitlist.success_title")}</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t("waitlist.success_desc")}
            </p>
          </div>
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            {t("waitlist.back_home")}
          </Link>
        </div>
      </div>
    );
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
            {t("waitlist.sidebar")}
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
              <h1 className="text-2xl font-bold text-white mb-1">{t("waitlist.title")}</h1>
              <p className="text-sm text-gray-400">{t("waitlist.subtitle")}</p>
            </div>
            <button
              onClick={() => setLang(nextLang(lang))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Globe className="h-3.5 w-3.5" />
              {langLabel(lang)}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-gray-300 text-sm">{t("waitlist.first_name")}</Label>
                <Input
                  id="firstName"
                  placeholder={t("waitlist.first_name_placeholder")}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
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
                  autoComplete="family-name"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300 text-sm">{t("waitlist.email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t("waitlist.email_placeholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country" className="text-gray-300 text-sm">{t("waitlist.country")}</Label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full h-11 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                autoComplete="organization"
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
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
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
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
              className="w-full h-11 bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] hover:from-[#5b21b6] hover:to-[#6d28d9] font-semibold shadow-lg shadow-violet-500/20"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("waitlist.submit")}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500">
            {t("waitlist.have_account")}{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 font-medium">
              {t("waitlist.signin_link")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
