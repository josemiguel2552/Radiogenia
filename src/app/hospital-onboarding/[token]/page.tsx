"use client";

/* Institutional onboarding: the hospital opens the link we sent, declares how
   many seats it needs and which radiologists will use them, signs the
   institutional terms and pays — by card (Stripe, per-seat subscription) or by
   bank transfer (we email the details and enable access once received). */

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/logo";
import { Loader2, Globe, Building2, CreditCard, Landmark, Check, Plus, Trash2, AlertTriangle } from "lucide-react";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { HOSPITAL_TERMS, SEAT_PRICE_EUR, MIN_SEATS, type HospitalTermsLang } from "@/lib/hospital-terms";

export default function HospitalOnboardingPage() {
  const params = useParams();
  const search = useSearchParams();
  const token = String(params?.token || "");
  const { lang, setLang } = usePublicLang();
  const terms = HOSPITAL_TERMS[(["es", "en", "pt"].includes(lang) ? lang : "es") as HospitalTermsLang];
  const tr = (es: string, en: string, pt: string) => (lang === "es" ? es : lang === "pt" ? pt : en);

  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [emails, setEmails] = useState<string[]>(["", ""]);
  const [contactName, setContactName] = useState("");
  const [signerRole, setSignerRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [billingDetails, setBillingDetails] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<"card" | "transfer">("card");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "card" | "transfer">(search.get("paid") === "1" ? "card" : null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/hospital-onboarding/info?token=${encodeURIComponent(token)}`);
      if (!res.ok) { setInvalid(true); return; }
      const d = await res.json();
      setOrgName(d.orgName);
    } catch { setInvalid(true); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const seats = emails.length;
  const total = (seats * SEAT_PRICE_EUR).toFixed(2);

  const setEmailAt = (i: number, v: string) =>
    setEmails((prev) => prev.map((e, idx) => (idx === i ? v : e)));
  const addSeat = () => setEmails((prev) => (prev.length < 200 ? [...prev, ""] : prev));
  const removeSeat = (i: number) =>
    setEmails((prev) => (prev.length > MIN_SEATS ? prev.filter((_, idx) => idx !== i) : prev));

  async function submit() {
    setError("");
    const clean = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (clean.length !== seats) {
      setError(tr("Completa el correo de cada licencia.", "Fill in the email for every licence.", "Preencha o e-mail de cada licença."));
      return;
    }
    if (new Set(clean).size !== clean.length) {
      setError(tr("Hay correos repetidos.", "There are duplicate emails.", "Há e-mails repetidos."));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hospital-onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token, seats, emails: clean, paymentMethod: method,
          contactName, contactEmail, billingDetails, signerRole,
          acceptedTerms: accepted,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        const map: Record<string, string> = {
          migration_pending: tr("El sistema aún no está listo. Escríbenos a info@radiogen.ai.", "The system is not ready yet. Please write to info@radiogen.ai.", "O sistema ainda não está pronto. Escreva para info@radiogen.ai."),
          stripe_not_configured: tr("El pago con tarjeta no está disponible ahora. Elige transferencia o escríbenos.", "Card payment is unavailable right now. Choose transfer or write to us.", "O pagamento com cartão não está disponível. Escolha transferência ou escreva-nos."),
          emails_count_mismatch: tr("Completa el correo de cada licencia.", "Fill in the email for every licence.", "Preencha o e-mail de cada licença."),
        };
        setError(map[d.error] || d.error || "Error");
        setSubmitting(false);
        return;
      }
      if (d.method === "card" && d.url) { window.location.href = d.url; return; }
      setDone("transfer");
    } catch {
      setError(tr("Error de red. Inténtalo de nuevo.", "Network error. Please try again.", "Erro de rede. Tente novamente."));
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a]"><Loader2 className="h-6 w-6 animate-spin text-violet-400" /></div>;
  }

  if (invalid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a1a] px-6 text-center">
        <Link href="/"><Logo size="md" forceDark /></Link>
        <p className="text-sm text-gray-400 max-w-sm">
          {tr("Este enlace no es válido o ha caducado. Escríbenos a info@radiogen.ai.",
              "This link is invalid or expired. Please write to info@radiogen.ai.",
              "Este link é inválido ou expirou. Escreva para info@radiogen.ai.")}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <Link href="/" className="inline-block"><Logo size="md" forceDark /></Link>
          <div className="p-6 rounded-2xl border border-green-500/20 bg-green-500/5 space-y-3">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-white">
              {done === "card"
                ? tr("¡Pago recibido!", "Payment received!", "Pagamento recebido!")
                : tr("Solicitud registrada", "Request registered", "Solicitação registada")}
            </h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {done === "card"
                ? tr("Cada radiólogo recibirá ahora un correo para crear su contraseña y entrar a la plataforma.",
                     "Each radiologist will now receive an email to create their password and access the platform.",
                     "Cada radiologista receberá agora um e-mail para criar a sua senha e aceder à plataforma.")
                : tr("Te hemos enviado los datos bancarios por correo. En cuanto recibamos la transferencia habilitaremos los accesos y cada radiólogo recibirá un correo para crear su contraseña.",
                     "We've emailed you the bank details. As soon as we receive the transfer we'll enable access and each radiologist will get an email to create their password.",
                     "Enviámos os dados bancários por e-mail. Assim que recebermos a transferência habilitaremos os acessos e cada radiologista receberá um e-mail para criar a sua senha.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] py-10 px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/"><Logo size="md" forceDark /></Link>
          <button onClick={() => setLang(nextLang(lang))} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/5">
            <Globe className="h-3.5 w-3.5" />{langLabel(lang)}
          </button>
        </div>

        <div className="text-center space-y-1.5">
          <div className="flex justify-center mb-2">
            <div className="h-11 w-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">{orgName}</h1>
          <p className="text-sm text-gray-400">
            {tr("Alta de licencias para tu institución", "Licence setup for your institution", "Ativação de licenças para a sua instituição")}
          </p>
        </div>

        {/* 1 — Seats */}
        <section className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <h2 className="text-sm font-semibold text-white">
            1. {tr("Licencias y radiólogos", "Licences and radiologists", "Licenças e radiologistas")}
          </h2>
          <p className="text-xs text-gray-400">
            {tr(`Mínimo ${MIN_SEATS} licencias. Cada licencia es para un radiólogo, con informes y dictado ilimitados.`,
                `Minimum ${MIN_SEATS} licences. Each licence is for one radiologist, with unlimited reports and dictation.`,
                `Mínimo ${MIN_SEATS} licenças. Cada licença é para um radiologista, com laudos e ditado ilimitados.`)}
          </p>
          <div className="space-y-2">
            {emails.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-16 shrink-0">
                  {tr("Licencia", "Licence", "Licença")} {i + 1}
                </span>
                <Input
                  type="email"
                  value={e}
                  onChange={(ev) => setEmailAt(i, ev.target.value)}
                  placeholder={tr("correo del radiólogo", "radiologist's email", "e-mail do radiologista")}
                  className="h-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => removeSeat(i)}
                  disabled={emails.length <= MIN_SEATS}
                  className="p-2 text-gray-500 hover:text-red-400 disabled:opacity-30"
                  aria-label="remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSeat} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
            <Plus className="h-3.5 w-3.5" /> {tr("Añadir licencia", "Add licence", "Adicionar licença")}
          </button>
          <div className="flex items-baseline justify-between pt-2 border-t border-white/10">
            <span className="text-xs text-gray-400">
              {seats} × {SEAT_PRICE_EUR.toFixed(2)} €{tr("/mes", "/mo", "/mês")}
            </span>
            <span className="text-xl font-bold text-white">{total} €<span className="text-xs font-normal text-gray-400">{tr("/mes", "/mo", "/mês")}</span></span>
          </div>
        </section>

        {/* 2 — Institution contact */}
        <section className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <h2 className="text-sm font-semibold text-white">
            2. {tr("Datos de la institución", "Institution details", "Dados da instituição")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">{tr("Nombre y apellidos", "Full name", "Nome completo")}</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-10 bg-white/5 border-white/10 text-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-300 text-xs">{tr("Cargo", "Role", "Cargo")}</Label>
              <Input value={signerRole} onChange={(e) => setSignerRole(e.target.value)} className="h-10 bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">{tr("Correo de contacto y facturación", "Contact & billing email", "E-mail de contacto e faturação")}</Label>
            <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-10 bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-300 text-xs">
              {tr("Datos fiscales (razón social, NIF/CIF, dirección)", "Tax details (legal name, tax ID, address)", "Dados fiscais (razão social, NIF, endereço)")}
            </Label>
            <textarea
              value={billingDetails}
              onChange={(e) => setBillingDetails(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-white/5 border border-white/10 text-white text-sm p-2.5 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </section>

        {/* 3 — Terms */}
        <section className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <h2 className="text-sm font-semibold text-white">3. {terms.title}</h2>
          <p className="text-xs text-gray-400">{terms.intro}</p>
          <div className="max-h-56 overflow-y-auto space-y-2.5 p-3 rounded-lg bg-black/30 border border-white/5">
            {terms.clauses.map((c) => (
              <div key={c.title}>
                <p className="text-[11px] font-semibold text-gray-200">{c.title}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 accent-violet-500" />
            <span className="text-[11px] text-gray-300 leading-relaxed">{terms.acceptLabel}</span>
          </label>
        </section>

        {/* 4 — Payment */}
        <section className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] space-y-3">
          <h2 className="text-sm font-semibold text-white">4. {tr("Forma de pago", "Payment method", "Forma de pagamento")}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMethod("card")}
              className={`p-3.5 rounded-xl border text-left transition-colors ${method === "card" ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white"><CreditCard className="h-4 w-4 text-violet-400" /> {tr("Tarjeta", "Card", "Cartão")}</span>
              <span className="block text-[11px] text-gray-400 mt-1">
                {tr("Acceso inmediato tras el pago.", "Immediate access after payment.", "Acesso imediato após o pagamento.")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMethod("transfer")}
              className={`p-3.5 rounded-xl border text-left transition-colors ${method === "transfer" ? "border-violet-500/50 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white"><Landmark className="h-4 w-4 text-violet-400" /> {tr("Transferencia", "Bank transfer", "Transferência")}</span>
              <span className="block text-[11px] text-gray-400 mt-1">
                {tr("Te enviamos los datos bancarios por correo.", "We'll email you the bank details.", "Enviamos os dados bancários por e-mail.")}
              </span>
            </button>
          </div>
          {method === "transfer" && (
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              {tr("Enviaremos los datos bancarios al correo de contacto indicado arriba. El acceso se habilita al recibir la transferencia.",
                  "We'll send the bank details to the contact email above. Access is enabled once the transfer is received.",
                  "Enviaremos os dados bancários para o e-mail de contacto acima. O acesso é habilitado ao receber a transferência.")}
            </p>
          )}
        </section>

        {error && (
          <p className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />{error}
          </p>
        )}

        <Button
          onClick={submit}
          disabled={submitting || !accepted || !contactName || !contactEmail}
          className="w-full h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 font-semibold text-base"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" />
            : method === "card"
              ? tr(`Pagar ${total} €/mes`, `Pay €${total}/mo`, `Pagar ${total} €/mês`)
              : tr("Solicitar datos bancarios", "Request bank details", "Solicitar dados bancários")}
        </Button>
        <p className="text-[11px] text-gray-500 text-center pb-6">
          {tr("Los pagos no son reembolsables. Puedes cancelar en cualquier momento escribiendo a info@radiogen.ai.",
              "Payments are non-refundable. You can cancel anytime by writing to info@radiogen.ai.",
              "Os pagamentos não são reembolsáveis. Pode cancelar quando quiser escrevendo para info@radiogen.ai.")}
        </p>
      </div>
    </div>
  );
}
