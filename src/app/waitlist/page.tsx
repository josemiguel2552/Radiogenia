"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, CheckCircle2, Clock, AlertTriangle, Mail } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { PLANS } from "@/lib/types";

const COUNTRIES = [
  "Argentina", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Ecuador", "El Salvador", "Guatemala", "Honduras", "México",
  "Nicaragua", "Panamá", "Paraguay", "Perú", "Puerto Rico",
  "República Dominicana", "United States", "Uruguay", "Venezuela", "Other",
];

const PAID_PLANS = new Set(["resident", "starter", "professional"]);

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { lang, setLang, t } = usePublicLang();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [hospital, setHospital] = useState("");
  const [role, setRole] = useState<"attending" | "resident">("attending");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<false | "approved" | "pending" | "checkout_failed">(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("waitlist.password_min"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("waitlist.passwords_mismatch"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, country, hospital, role, plan: selectedPlan || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMap: Record<string, string> = {
          already_registered: t("waitlist.already_registered"),
          password_too_short: t("waitlist.password_min"),
        };
        setError(errorMap[data.error] || data.error || "Error");
        setLoading(false);
        return;
      }

      if (data.approved) {
        setSubmitted("approved");
      } else {
        setSubmitted("pending");
      }
    } catch {
      setError(t("waitlist.network_error"));
    }
    setLoading(false);
  }

  async function retryCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch {
      // network error
    }
    setLoading(false);
  }

  if (submitted) {
    const isPending = submitted === "pending";
    const isCheckoutFailed = submitted === "checkout_failed";

    if (isCheckoutFailed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <Link href="/"><Logo size="md" forceDark /></Link>
            </div>
            <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-4">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-amber-500/10">
                  <AlertTriangle className="h-6 w-6 text-amber-400" />
                </div>
              </div>
              <h1 className="text-xl font-bold text-white">
                {lang === "es" ? "Cuenta creada" : lang === "pt" ? "Conta criada" : "Account created"}
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                {lang === "es"
                  ? "Tu cuenta fue creada correctamente, pero no pudimos conectar con la pasarela de pago. Puedes intentarlo de nuevo o acceder con el plan gratuito."
                  : lang === "pt"
                  ? "Sua conta foi criada com sucesso, mas não conseguimos conectar ao gateway de pagamento. Você pode tentar novamente ou acessar com o plano gratuito."
                  : "Your account was created successfully, but we couldn't connect to the payment gateway. You can try again or access with the free plan."}
              </p>
              <div className="flex flex-col gap-3 pt-2">
                <Button
                  onClick={retryCheckout}
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 font-semibold"
                >
                  {loading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : lang === "es" ? "Reintentar pago" : lang === "pt" ? "Tentar pagamento novamente" : "Retry payment"}
                </Button>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {lang === "es" ? "Continuar con plan gratuito →" : lang === "pt" ? "Continuar com plano gratuito →" : "Continue with free plan →"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <Link href="/"><Logo size="md" forceDark /></Link>
          </div>
          <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-4">
            <div className="flex justify-center">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isPending ? "bg-amber-500/10" : "bg-blue-500/10"}`}>
                {isPending
                  ? <Clock className="h-6 w-6 text-amber-400" />
                  : <Mail className="h-6 w-6 text-blue-400" />}
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">
              {t(isPending ? "waitlist.pending_title" : "waitlist.success_title")}
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {t(isPending ? "waitlist.pending_desc" : "waitlist.success_desc")}
            </p>
          </div>
          {!isPending && (
            <Link href="/auth/login" className="text-sm text-blue-400 hover:text-blue-300">
              {t("waitlist.signin_link")}
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a1a]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[100px] animate-float-slower" />
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="flex items-center justify-center mb-8">
            <Link href="/"><Logo size="lg" forceDark /></Link>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            {t("waitlist.sidebar")}
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="flex lg:hidden justify-center mb-4">
            <Link href="/"><Logo size="md" forceDark /></Link>
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

          {PAID_PLANS.has(selectedPlan) && PLANS[selectedPlan as keyof typeof PLANS] && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {lang === "es" ? "Plan seleccionado:" : lang === "pt" ? "Plano selecionado:" : "Selected plan:"}{" "}
                  <span className="text-blue-400">{PLANS[selectedPlan as keyof typeof PLANS].label}</span>
                </p>
                <p className="text-xs text-gray-400">
                  ${PLANS[selectedPlan as keyof typeof PLANS].price} USD{t("pricing.per_month")} — {lang === "es" ? "se cobrará después del registro" : lang === "pt" ? "será cobrado após o registro" : "will be charged after registration"}
                </p>
              </div>
            </div>
          )}

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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300 text-sm">{t("waitlist.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("waitlist.password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300 text-sm">{t("waitlist.confirm_password")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("waitlist.confirm_password_placeholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
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
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 font-semibold shadow-lg shadow-purple-500/20"
              disabled={loading}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : PAID_PLANS.has(selectedPlan)
                  ? lang === "es" ? "Crear cuenta y suscribirse" : lang === "pt" ? "Criar conta e assinar" : "Create account & subscribe"
                  : t("waitlist.submit")}
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
