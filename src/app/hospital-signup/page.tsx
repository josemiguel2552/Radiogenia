"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Globe, Check, AlertTriangle, Building2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/client";
import { usePublicLang, nextLang, langLabel, type PublicLang } from "@/lib/public-i18n";

const SUBSPECIALTIES: Record<PublicLang, string[]> = {
  es: ["Neurorradiología", "Cabeza y cuello", "Tórax", "Cardiovascular", "Abdomen", "Genitourinario", "Musculoesquelético", "Mama", "Pediátrica", "Intervencionista", "Medicina nuclear / molecular", "Urgencias", "Oncológica", "General"],
  en: ["Neuroradiology", "Head and neck", "Chest", "Cardiovascular", "Abdomen", "Genitourinary", "Musculoskeletal", "Breast", "Pediatric", "Interventional", "Nuclear / molecular", "Emergency", "Oncologic", "General"],
  pt: ["Neurorradiologia", "Cabeça e pescoço", "Tórax", "Cardiovascular", "Abdome", "Geniturinário", "Musculoesquelético", "Mama", "Pediátrica", "Intervencionista", "Medicina nuclear / molecular", "Urgências", "Oncológica", "Geral"],
};

const S: Record<PublicLang, Record<string, string>> = {
  es: {
    joining: "Te unes a", title: "Crea tu cuenta de radiólogo",
    subtitle: "Completa tus datos y tendrás acceso inmediato a la plataforma.",
    name: "Nombre y apellidos", subs: "Subespecialidad(es) en radiología", subs_hint: "Selecciona una o varias",
    avg: "Informes aproximados al mes", email: "Email", pass: "Elige una contraseña",
    pass_hint: "Mínimo 6 caracteres", submit: "Crear cuenta y entrar", creating: "Creando…",
    err_generic: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    err_dupe: "Ya existe una cuenta con ese correo. Escríbenos a info@radiogen.ai.",
    err_seats: "El hospital ha alcanzado su número de licencias. Contacta con tu coordinador.",
    err_subs: "Selecciona al menos una subespecialidad.",
    err_invalid: "Este enlace de alta no es válido o ha caducado.",
    loading: "Cargando…", have: "¿Ya tienes cuenta?", signin: "Inicia sesión",
  },
  en: {
    joining: "You're joining", title: "Create your radiologist account",
    subtitle: "Fill in your details and get immediate access to the platform.",
    name: "Full name", subs: "Radiology subspecialty(ies)", subs_hint: "Select one or more",
    avg: "Approximate reports per month", email: "Email", pass: "Choose a password",
    pass_hint: "At least 6 characters", submit: "Create account and enter", creating: "Creating…",
    err_generic: "Could not create the account. Please try again.",
    err_dupe: "An account with that email already exists. Email us at info@radiogen.ai.",
    err_seats: "The hospital has reached its license count. Contact your coordinator.",
    err_subs: "Select at least one subspecialty.",
    err_invalid: "This signup link is invalid or has expired.",
    loading: "Loading…", have: "Already have an account?", signin: "Sign in",
  },
  pt: {
    joining: "Você entra em", title: "Crie sua conta de radiologista",
    subtitle: "Preencha seus dados e tenha acesso imediato à plataforma.",
    name: "Nome completo", subs: "Subespecialidade(s) em radiologia", subs_hint: "Selecione uma ou mais",
    avg: "Laudos aproximados por mês", email: "Email", pass: "Escolha uma senha",
    pass_hint: "Mínimo 6 caracteres", submit: "Criar conta e entrar", creating: "Criando…",
    err_generic: "Não foi possível criar a conta. Tente novamente.",
    err_dupe: "Já existe uma conta com esse email. Escreva para info@radiogen.ai.",
    err_seats: "O hospital atingiu o número de licenças. Contate seu coordenador.",
    err_subs: "Selecione ao menos uma subespecialidade.",
    err_invalid: "Este link de cadastro é inválido ou expirou.",
    loading: "Carregando…", have: "Já tem conta?", signin: "Entrar",
  },
};

function HospitalSignupInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { lang, setLang } = usePublicLang();
  const token = params.get("token") || "";
  const t = (k: string) => S[lang][k] || S.es[k] || k;

  const [hospital, setHospital] = useState<string | null>(null);
  const [tokenState, setTokenState] = useState<"loading" | "ok" | "invalid">("loading");
  const [name, setName] = useState("");
  const [subs, setSubs] = useState<string[]>([]);
  const [avg, setAvg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setTokenState("invalid"); return; }
    fetch(`/api/hospital-signup/info?token=${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { setHospital(d.hospital?.name || null); setTokenState("ok"); })
      .catch(() => setTokenState("invalid"));
  }, [token]);

  function toggleSub(s: string) {
    setSubs((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (subs.length === 0) { setError(t("err_subs")); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hospital-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, name: name.trim(), email: email.trim(), password,
          subspecialties: subs, avgReportsMonth: avg ? Number(avg) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error === "already_registered") setError(t("err_dupe"));
        else if (d.error === "seats_full") setError(t("err_seats"));
        else if (d.error === "invalid_token") setError(t("err_invalid"));
        else setError(t("err_generic"));
        setSubmitting(false);
        return;
      }
      // Immediate access: sign in with the credentials just created.
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError) {
        // Account exists but auto-login failed — send them to login.
        router.push("/auth/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("err_generic"));
      setSubmitting(false);
    }
  }

  const inputCls = "w-full h-11 rounded-lg bg-white/5 border border-white/10 px-3.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/"><Logo size="md" forceDark /></Link>
          <button onClick={() => setLang(nextLang(lang))} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
            <Globe className="h-3.5 w-3.5" />{langLabel(lang)}
          </button>
        </div>

        {tokenState === "loading" && (
          <div className="text-center py-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />{t("loading")}</div>
        )}

        {tokenState === "invalid" && (
          <div className="text-center space-y-3 py-10">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-white font-semibold">{t("err_invalid")}</p>
            <p className="text-sm text-gray-400">info@radiogen.ai</p>
          </div>
        )}

        {tokenState === "ok" && (
          <>
            <div>
              {hospital && (
                <p className="flex items-center gap-1.5 text-xs text-blue-300 mb-2">
                  <Building2 className="h-3.5 w-3.5" />{t("joining")} <span className="font-semibold">{hospital}</span>
                </p>
              )}
              <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
              <p className="text-sm text-gray-400 mt-1">{t("subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-gray-300 mb-1.5 block">{t("name")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} className={inputCls} autoComplete="name" />
              </div>

              <div>
                <label className="text-xs text-gray-300 mb-1 block">{t("subs")}</label>
                <p className="text-[10px] text-gray-500 mb-2">{t("subs_hint")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUBSPECIALTIES[lang].map((s) => {
                    const on = subs.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSub(s)}
                        className={`px-2.5 py-1.5 rounded-full text-[11px] border transition-colors ${on ? "bg-blue-500/20 border-blue-500/50 text-blue-200 font-medium" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"}`}>
                        {on && <Check className="h-2.5 w-2.5 inline mr-1" />}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300 mb-1.5 block">{t("avg")}</label>
                <input value={avg} onChange={(e) => setAvg(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="120" className={inputCls} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-300 mb-1.5 block">{t("email")}</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} autoComplete="email" />
                </div>
                <div>
                  <label className="text-xs text-gray-300 mb-1.5 block">{t("pass")}</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={inputCls} autoComplete="new-password" />
                  <p className="text-[10px] text-gray-500 mt-1">{t("pass_hint")}</p>
                </div>
              </div>

              {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={submitting}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-[#1e1b4b] to-[#7c3aed] hover:from-[#5b21b6] hover:to-[#6d28d9] font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />{t("creating")}</> : t("submit")}
              </button>

              <p className="text-center text-xs text-gray-500">
                {t("have")} <Link href="/auth/login" className="text-blue-400 hover:text-blue-300">{t("signin")}</Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function HospitalSignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a1a]" />}>
      <HospitalSignupInner />
    </Suspense>
  );
}
