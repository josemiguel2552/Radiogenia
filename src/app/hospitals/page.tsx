"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import {
  Building2,
  FileText,
  Layers,
  BarChart3,
  Users,
  ShieldCheck,
  Globe,
  Loader2,
  Check,
  ArrowLeft,
} from "lucide-react";

const FEATURES = [
  { icon: Building2, titleKey: "hosp.feat_sections_title", descKey: "hosp.feat_sections_desc", color: "text-blue-400" },
  { icon: FileText, titleKey: "hosp.feat_templates_title", descKey: "hosp.feat_templates_desc", color: "text-purple-400" },
  { icon: Layers, titleKey: "hosp.feat_standard_title", descKey: "hosp.feat_standard_desc", color: "text-cyan-400" },
  { icon: BarChart3, titleKey: "hosp.feat_stats_title", descKey: "hosp.feat_stats_desc", color: "text-emerald-400" },
  { icon: Users, titleKey: "hosp.feat_seats_title", descKey: "hosp.feat_seats_desc", color: "text-amber-400" },
  { icon: ShieldCheck, titleKey: "hosp.feat_privacy_title", descKey: "hosp.feat_privacy_desc", color: "text-rose-400" },
];

export default function HospitalsPage() {
  const { lang, setLang, t } = usePublicLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !institution.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/enterprise-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: `[${t("hosp.field_institution")}: ${institution.trim()}]\n\n${message.trim()}`,
          lang,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("hosp.error"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("hosp.error"));
    } finally {
      setSending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30";

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0a0a1a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" forceDark />
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(nextLang(lang))}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              {langLabel(lang)}
            </button>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("hosp.back")}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6">
        {/* Hero */}
        <section className="pt-16 pb-12 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            {t("hosp.title")}
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-gray-400 text-base md:text-lg leading-relaxed">
            {t("hosp.subtitle")}
          </p>
          <a
            href="#contact"
            className="inline-block mt-8 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl transition-all"
          >
            {t("hosp.cta")}
          </a>
        </section>

        {/* Features */}
        <section className="pb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <f.icon className={`h-6 w-6 ${f.color}`} />
                <h3 className="mt-4 font-semibold text-white">{t(f.titleKey)}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{t(f.descKey)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How we start */}
        <section className="pb-16">
          <h2 className="text-xl md:text-2xl font-bold text-center">{t("hosp.how_title")}</h2>
          <div className="mt-8 grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center">
                <div className="mx-auto h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold">
                  {n}
                </div>
                <p className="mt-4 text-sm text-gray-400 leading-relaxed">{t(`hosp.how_step${n}`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact form */}
        <section id="contact" className="pb-20">
          <div className="max-w-xl mx-auto rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold">{t("hosp.form_title")}</h2>
            <p className="mt-2 text-sm text-gray-400">{t("hosp.form_subtitle")}</p>

            {sent ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <Check className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-200">{t("hosp.success")}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("hosp.field_name")}
                  required
                  maxLength={200}
                  className={inputClass}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("hosp.field_email")}
                  required
                  maxLength={300}
                  className={inputClass}
                />
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder={t("hosp.field_institution")}
                  required
                  maxLength={200}
                  className={inputClass}
                />
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("hosp.field_message")}
                  required
                  rows={5}
                  maxLength={3500}
                  className={`${inputClass} resize-none`}
                />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 disabled:opacity-60 text-white px-6 py-3 rounded-xl transition-all"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {sending ? t("hosp.sending") : t("hosp.submit")}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6 text-center">
        <a
          href="mailto:info@radiogen.ai"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          info@radiogen.ai
        </a>
      </footer>
    </div>
  );
}
