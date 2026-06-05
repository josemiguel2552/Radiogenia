"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic, FileText, Brain, Sparkles, Layout, Shield,
  ChevronRight, Check, ArrowRight, Globe,
  Lock, ShieldCheck, Eye, ScrollText, Server, Fingerprint,
  BookOpen, Download,
} from "lucide-react";
import { PLANS, CURRENCY, type SubscriptionPlan } from "@/lib/types";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel, type PublicLang } from "@/lib/public-i18n";

/* ─── Hooks ─── */

function useMouseGlow(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onMove(e: MouseEvent) {
      el!.style.setProperty("--mx", `${e.clientX}px`);
      el!.style.setProperty("--my", `${e.clientY}px`);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [ref]);
}

function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) { setProgress(0); return; }
      setProgress(Math.max(0, Math.min(1, -rect.top / total)));
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, [ref]);
  return progress;
}

function useCountUp(target: number, active: boolean, duration = 1500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * ease));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return val;
}

function revealDelay(ms: number): React.CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as React.CSSProperties;
}

const FEATURE_KEYS = [
  { icon: Mic, key: "voice", color: "from-blue-500 to-indigo-600" },
  { icon: FileText, key: "structured", color: "from-violet-500 to-purple-600" },
  { icon: Brain, key: "style", color: "from-purple-500 to-pink-500" },
  { icon: Sparkles, key: "conclusions", color: "from-indigo-500 to-blue-600" },
  { icon: Layout, key: "templates", color: "from-blue-600 to-cyan-500" },
  { icon: Shield, key: "safety", color: "from-violet-600 to-indigo-500" },
];

const SECURITY_ITEMS = [
  { icon: Lock, key: "encryption" },
  { icon: Fingerprint, key: "pii" },
  { icon: Shield, key: "rls" },
  { icon: Eye, key: "zero_data" },
  { icon: ScrollText, key: "audit" },
  { icon: Server, key: "rate_limit" },
] as const;

const PLAN_ORDER: SubscriptionPlan[] = ["free", "resident", "starter", "professional"];

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang, t } = usePublicLang();
  useMouseGlow(heroRef);
  useScrollReveal();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      progressRef.current?.style.setProperty("--scroll", `${ratio}`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-clip">
      {/* Safeguard: reveal everything if JS is disabled */}
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important;filter:none!important;}`}</style>
      </noscript>

      {/* ─── Scroll progress bar ─── */}
      <div className="fixed top-0 inset-x-0 z-[60] h-0.5 bg-transparent pointer-events-none">
        <div
          ref={progressRef}
          className="scroll-progress h-full w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
          style={{ "--scroll": "0" } as React.CSSProperties}
        />
      </div>

      {/* ─── Navbar ─── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a0a1a]/80 backdrop-blur-xl border-b border-white/5"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size="md" forceDark />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-white transition-colors">{t("nav.pricing")}</a>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <Link
              href="/auth/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              {t("nav.signin")}
            </Link>
            <Link
              href="/waitlist"
              className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-5 py-2 rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {t("nav.get_started")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
        style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_var(--mx)_var(--my),rgba(99,102,241,0.15)_0%,transparent_60%)] transition-[background] duration-100" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-float-slower" />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-float-medium" />
        </div>

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div data-reveal style={revealDelay(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 text-sm text-gray-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            {lang === "es" ? "Informes radiológicos con IA" : lang === "pt" ? "Laudos radiológicos com IA" : "AI-powered radiology reporting"}
          </div>

          <h1 data-reveal style={revealDelay(100)} className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            {lang === "es" ? "Informes radiológicos " : lang === "pt" ? "Laudos radiológicos " : "Radiology reports "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 hero-shimmer" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6, #60a5fa)" }}>
              {lang === "es" ? "en segundos" : lang === "pt" ? "em segundos" : "in seconds"}
            </span>
          </h1>

          <p data-reveal style={revealDelay(200)} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div data-reveal style={revealDelay(300)} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/waitlist"
              className="group flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
            >
              {t("hero.cta_primary")}
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-6 py-3.5 rounded-full border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
            >
              {t("hero.cta_secondary")}
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div data-reveal style={revealDelay(400)} className="mt-16 flex items-center justify-center gap-8 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-violet-500" />
              {t("hero.badge_no_card")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-violet-500" />
              {t("hero.badge_hipaa")}
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-violet-500" />
              {t("hero.badge_encrypt")}
            </span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 bg-white/40 rounded-full animate-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ─── Scroll-driven interactive demo ─── */}
      <ScrollDemo lang={lang} />

      {/* ─── Stats counter bar ─── */}
      <StatsBar lang={lang} />

      {/* ─── Features ─── */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div data-reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {lang === "es" ? (
                <>
                  Todo lo que necesitas para{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    informar más rápido
                  </span>
                </>
              ) : lang === "pt" ? (
                <>
                  Tudo o que você precisa para{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    laudar mais rápido
                  </span>
                </>
              ) : (
                <>
                  Everything you need to{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    report faster
                  </span>
                </>
              )}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t("feat.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_KEYS.map((f, i) => (
              <FeatureCard
                key={f.key}
                icon={f.icon}
                title={t(`feat.${f.key}.title`)}
                desc={t(`feat.${f.key}.desc`)}
                color={f.color}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent" />
        <div className="relative max-w-4xl mx-auto">
          <h2 data-reveal className="text-3xl md:text-4xl font-bold text-center mb-16">
            {t("how.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <div key={step} data-reveal style={revealDelay(i * 120)} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 mb-4">
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(`how.${step}.title`)}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{t(`how.${step}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div data-reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {lang === "es" ? (
                <>
                  Precios simples y{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    transparentes
                  </span>
                </>
              ) : lang === "pt" ? (
                <>
                  Preços simples e{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    transparentes
                  </span>
                </>
              ) : (
                <>
                  Simple,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    transparent
                  </span>{" "}
                  pricing
                </>
              )}
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              {t("pricing.subtitle")}{" "}{t("pricing.all_features")}
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-5 items-start">
            {PLAN_ORDER.map((key, i) => {
              const plan = PLANS[key];
              return (
                <PricingCard key={key} plan={plan} planKey={key} t={t} lang={lang} index={i} />
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
              {t("pricing.note")}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Security & Compliance ─── */}
      <section id="security" className="relative py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent" />
        <div className="relative max-w-6xl mx-auto">
          <div data-reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {lang === "es" ? (
                <>
                  Seguridad y privacidad{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-400">
                    de nivel hospitalario
                  </span>
                </>
              ) : lang === "pt" ? (
                <>
                  Segurança e privacidade{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-400">
                    de nível hospitalar
                  </span>
                </>
              ) : (
                <>
                  Hospital-grade{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-400">
                    security & privacy
                  </span>
                </>
              )}
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              {t("security.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
            {SECURITY_ITEMS.map((item, i) => (
              <div key={item.key} data-reveal style={revealDelay((i % 3) * 100)}>
                <div className="group relative h-full p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/20 transition-all duration-300 hover:bg-white/[0.04]">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/20 border border-violet-500/10 mb-4">
                    <item.icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{t(`security.${item.key}.title`)}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{t(`security.${item.key}.desc`)}</p>
                </div>
              </div>
            ))}
          </div>

          <div data-reveal style={revealDelay(150)} className="flex flex-wrap items-center justify-center gap-6 text-xs text-gray-500">
            {(["soc2", "gdpr", "hipaa_badge", "hsts"] as const).map((badge) => (
              <span key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
                {t(`security.badge_${badge}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div data-reveal className="p-12 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              {t("cta.subtitle")}
            </p>
            <Link
              href="/waitlist"
              className="inline-flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              {t("cta.button")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" forceDark />
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">{t("nav.pricing")}</a>
            <Link href="/legal" className="hover:text-gray-300 transition-colors">{t("footer.legal")}</Link>
            <Link href="/auth/login" className="hover:text-gray-300 transition-colors">{t("nav.signin")}</Link>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Radiogen.AI
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Scroll-driven interactive demo ─── */

const DEMO_TEXTS: Record<PublicLang, string[]> = {
  es: [
    "Pulmones bien ventilados sin opacidades de ocupación alveolar. Silueta cardiomediastínica dentro de límites normales. Senos costofrénicos libres. No se observan lesiones óseas...",
  ],
  en: [
    "Well-aerated lungs without alveolar opacities. Cardiomediastinal silhouette within normal limits. Clear costophrenic angles. No osseous lesions identified...",
  ],
  pt: [
    "Pulmões bem aerados sem opacidades de preenchimento alveolar. Silhueta cardiomediastinal dentro dos limites normais. Seios costofrênicos livres...",
  ],
};

const DEMO_STEPS_DATA: Record<PublicLang, { title: string; desc: string }[]> = {
  es: [
    { title: "Dicta tu informe", desc: "Habla naturalmente y observa cómo tu voz se transcribe en tiempo real" },
    { title: "La IA procesa", desc: "El dictado se envía a la inteligencia artificial que analiza y estructura el contenido" },
    { title: "Informe generado", desc: "El informe final aparece con secciones organizadas y tus guías clínicas accesibles" },
    { title: "Listo para exportar", desc: "Revisa, ajusta y exporta en el formato de tu hospital" },
  ],
  en: [
    { title: "Dictate your report", desc: "Speak naturally and watch your voice transcribed in real time" },
    { title: "AI processes", desc: "The dictation is sent to AI which analyzes and structures the content" },
    { title: "Report generated", desc: "The final report appears with organized sections and your clinical guides accessible" },
    { title: "Ready to export", desc: "Review, adjust, and export in your hospital's format" },
  ],
  pt: [
    { title: "Dite seu laudo", desc: "Fale naturalmente e veja sua voz transcrita em tempo real" },
    { title: "A IA processa", desc: "O ditado é enviado à inteligência artificial que analisa e estrutura o conteúdo" },
    { title: "Laudo gerado", desc: "O laudo final aparece com seções organizadas e seus guias clínicos acessíveis" },
    { title: "Pronto para exportar", desc: "Revise, ajuste e exporte no formato do seu hospital" },
  ],
};

const DEMO_ICONS = [Mic, Brain, FileText, Download];

function ScrollDemo({ lang }: { lang: PublicLang }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(containerRef);

  const totalSteps = 4;
  const stepFloat = progress * totalSteps;
  const activeStep = Math.min(Math.floor(stepFloat), totalSteps - 1);
  const stepProgress = stepFloat - activeStep;

  const steps = DEMO_STEPS_DATA[lang];
  const dictText = DEMO_TEXTS[lang][0];

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: reduce ? "auto" : "160vh" }}
    >
      <div
        className={`${
          reduce ? "relative" : "sticky top-[12vh]"
        } overflow-hidden py-6`}
      >
        <div className="absolute inset-0 -inset-y-[12vh] bg-gradient-to-b from-[#0a0a1a] via-indigo-950/20 to-[#0a0a1a] -z-10" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-[340px_1fr] gap-10 items-center">
            {/* Left: step info */}
            <div className="hidden lg:block space-y-8">
              {steps.map((s, i) => {
                const Icon = DEMO_ICONS[i];
                const isActive = i === activeStep;
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-4 transition-all duration-500 ${
                      isActive ? "opacity-100 translate-x-0" : "opacity-25 -translate-x-2"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-500/30"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-purple-400">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className={`text-sm font-semibold transition-colors duration-300 ${isActive ? "text-white" : "text-gray-500"}`}>
                          {s.title}
                        </span>
                      </div>
                      <p className={`text-xs leading-relaxed transition-colors duration-300 ${isActive ? "text-gray-400" : "text-gray-600"}`}>
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* progress dots */}
              <div className="flex items-center gap-2 pt-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === activeStep
                        ? "w-8 bg-gradient-to-r from-blue-500 to-purple-500"
                        : i < activeStep
                        ? "w-1.5 bg-purple-500/50"
                        : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right: demo screen */}
            <div className="demo-screen rounded-2xl p-1 relative">
              {/* Glow ring behind */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20 blur-sm -z-10" />

              <div className="rounded-xl bg-[#0c0c20] overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-3 py-0.5 rounded bg-white/5 text-[10px] text-gray-500 font-mono">
                      radiogen.ai/dashboard
                    </div>
                  </div>
                </div>

                {/* App mockup body */}
                <div className="relative min-h-[340px] md:min-h-[380px]">
                  <DemoStep0 active={activeStep === 0} progress={stepProgress} text={dictText} />
                  <DemoStepAI active={activeStep === 1} progress={stepProgress} lang={lang} dictText={dictText} />
                  <DemoStepReport active={activeStep === 2} progress={stepProgress} lang={lang} />
                  <DemoStepDone active={activeStep === 3} progress={stepProgress} lang={lang} />
                </div>
              </div>
            </div>

            {/* Mobile step indicator (below screen) */}
            <div className="lg:hidden flex flex-col items-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === activeStep
                        ? "w-8 bg-gradient-to-r from-blue-500 to-purple-500"
                        : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-semibold text-white">{steps[activeStep]?.title}</p>
              <p className="text-xs text-gray-400 text-center max-w-xs">{steps[activeStep]?.desc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Demo step visuals ─── */

function DemoStep0({ active, progress, text }: { active: boolean; progress: number; text: string }) {
  const chars = Math.floor(text.length * (active ? Math.min(progress * 1.5, 1) : 1));
  return (
    <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center gap-5 transition-all duration-500 ${active ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 flex items-center justify-center relative">
        <Mic className="h-6 w-6 text-blue-400" />
        <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-ping" />
      </div>

      <div className="flex items-end justify-center gap-[3px] h-10 w-48">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="waveform-bar w-[5px] rounded-full bg-gradient-to-t from-blue-500/80 to-purple-400/80"
            style={{ "--bar-delay": `${i * 0.06}s`, minHeight: "3px" } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="max-w-sm text-center">
        <p className="text-sm text-gray-300 font-mono leading-relaxed">
          {active ? text.slice(0, chars) : text}
          {active && chars < text.length && (
            <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-text-bottom animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}

function DemoStepAI({ active, progress, lang, dictText }: { active: boolean; progress: number; lang: PublicLang; dictText: string }) {
  const phases = lang === "es"
    ? ["Analizando contexto clínico...", "Estructurando hallazgos...", "Generando conclusión..."]
    : lang === "pt"
    ? ["Analisando contexto clínico...", "Estruturando achados...", "Gerando conclusão..."]
    : ["Analyzing clinical context...", "Structuring findings...", "Generating conclusion..."];

  const activePhase = active ? Math.min(Math.floor(progress * 3.5), 2) : 2;
  const barPct = active ? Math.min(progress * 130, 100) : 100;

  return (
    <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 ${active ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
      {/* Fading dictated text snippet */}
      <p className="text-[11px] text-gray-500/60 text-center max-w-xs truncate font-mono">
        {dictText.slice(0, 70)}...
      </p>

      {/* Animated arrow down */}
      <div className="flex flex-col items-center gap-0.5 text-purple-400/40">
        <div className="w-px h-4 bg-gradient-to-b from-transparent to-purple-400/40" />
        <ChevronRight className="h-3 w-3 rotate-90" />
      </div>

      {/* Brain icon with orbiting particles */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-purple-500/25 flex items-center justify-center">
          <Brain className="h-9 w-9 text-purple-400" />
        </div>
        <div className="absolute inset-0 rounded-full border border-purple-500/10 animate-ping" style={{ animationDuration: "2s" }} />
        {/* Orbit ring 1 */}
        <div className="absolute -inset-3 animate-spin" style={{ animationDuration: "3s" }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400/70 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
        </div>
        {/* Orbit ring 2 */}
        <div className="absolute -inset-5 animate-spin" style={{ animationDuration: "5s", animationDirection: "reverse" }}>
          <div className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-purple-400/70 shadow-[0_0_8px_rgba(192,132,252,0.5)]" />
        </div>
        {/* Orbit ring 3 */}
        <div className="absolute -inset-4 animate-spin" style={{ animationDuration: "4s" }}>
          <div className="absolute top-1/2 right-0 w-1.5 h-1.5 rounded-full bg-pink-400/50" />
        </div>
      </div>

      {/* Processing phases */}
      <div className="space-y-1.5 w-56">
        {phases.map((phase, i) => {
          const done = i < activePhase;
          const current = i === activePhase;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                done ? "text-purple-300/70" : current ? "text-purple-300" : "text-gray-600"
              }`}
            >
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[8px] font-bold transition-all duration-300 ${
                done
                  ? "bg-purple-500/30 text-purple-200"
                  : current
                  ? "bg-purple-500/20 border border-purple-400/40 text-purple-300"
                  : "bg-white/5 text-gray-600"
              }`}>
                {done ? "✓" : current ? "◎" : "○"}
              </div>
              {phase}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="w-56">
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DemoStepReport({ active, progress, lang }: { active: boolean; progress: number; lang: PublicLang }) {
  const sections = lang === "es"
    ? [
        { label: "TÉCNICA", text: "Radiografía PA y lateral de tórax." },
        { label: "HALLAZGOS", text: "Pulmones bien ventilados sin opacidades de ocupación alveolar. Silueta cardiomediastínica normal. Senos costofrénicos libres." },
        { label: "CONCLUSIÓN", text: "Estudio de tórax sin hallazgos patológicos significativos." },
      ]
    : lang === "pt"
    ? [
        { label: "TÉCNICA", text: "Radiografia PA e perfil de tórax." },
        { label: "ACHADOS", text: "Pulmões bem aerados sem opacidades. Silhueta cardiomediastinal normal. Seios costofrênicos livres." },
        { label: "CONCLUSÃO", text: "Estudo de tórax sem achados patológicos significativos." },
      ]
    : [
        { label: "TECHNIQUE", text: "PA and lateral chest radiograph." },
        { label: "FINDINGS", text: "Well-aerated lungs without alveolar opacities. Normal cardiomediastinal silhouette. Clear costophrenic angles." },
        { label: "CONCLUSION", text: "Chest study without significant pathologic findings." },
      ];

  const guideTitle = lang === "es" ? "Guía Fleischner 2017" : lang === "pt" ? "Guia Fleischner 2017" : "Fleischner Guide 2017";
  const showGuide = !active || progress > 0.55;

  return (
    <div className={`absolute inset-0 p-4 md:p-5 transition-all duration-500 ${active ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
      <div className="flex gap-3 h-full">
        {/* Report sections */}
        <div className="flex-1 flex flex-col justify-center gap-2.5">
          {sections.map((s, i) => {
            const show = !active || progress > i * 0.15;
            return (
              <div
                key={i}
                className="transition-all"
                style={{
                  opacity: show ? 1 : 0,
                  transform: show ? "translateY(0)" : "translateY(14px)",
                  transitionDuration: "500ms",
                  transitionDelay: `${i * 100}ms`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-px flex-1 max-w-5 bg-purple-500/30" />
                  <span className="text-[9px] font-bold tracking-widest text-purple-400">{s.label}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
                  <p className="text-xs text-gray-300 leading-relaxed">{s.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clinical guide panel sliding in */}
        <div
          className="w-36 md:w-44 flex flex-col justify-center transition-all"
          style={{
            opacity: showGuide ? 1 : 0,
            transform: showGuide ? "translateX(0)" : "translateX(20px)",
            transitionDuration: "600ms",
          }}
        >
          <div className="rounded-xl bg-gradient-to-b from-purple-500/10 to-indigo-500/10 border border-purple-500/20 p-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen className="h-3 w-3 text-purple-400" />
              <span className="text-[9px] font-bold text-purple-300 truncate">{guideTitle}</span>
            </div>
            {[
              { size: "< 6 mm", action: lang === "es" ? "Sin seguimiento" : "No follow-up" },
              { size: "6–8 mm", action: lang === "es" ? "TC 6-12 m" : "CT 6-12 mo" },
              { size: "> 8 mm", action: lang === "es" ? "PET-CT / biopsia" : "PET-CT / biopsy" },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1 px-1.5 rounded bg-white/[0.04]">
                <span className="text-[10px] font-bold text-white">{r.size}</span>
                <span className="text-[9px] text-gray-400">{r.action}</span>
              </div>
            ))}
            <p className="text-[7px] text-gray-600 pt-0.5">MacMahon et al. 2017</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoStepDone({ active, progress, lang }: { active: boolean; progress: number; lang: PublicLang }) {
  const showCheck = !active || progress > 0.2;
  const showExport = !active || progress > 0.5;
  return (
    <div className={`absolute inset-0 p-6 flex flex-col items-center justify-center gap-5 transition-all duration-500 ${active ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
      <div
        className="transition-all"
        style={{ opacity: showCheck ? 1 : 0, transform: showCheck ? "scale(1)" : "scale(0.5)", transitionDuration: "600ms" }}
      >
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/20 flex items-center justify-center">
          {showCheck && (
            <svg className="checkmark-anim h-8 w-8" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>

      <p className="text-lg font-semibold text-white">
        {lang === "es" ? "Informe completado" : lang === "pt" ? "Laudo concluído" : "Report completed"}
      </p>

      <div
        className="flex items-center gap-3 transition-all duration-500"
        style={{ opacity: showExport ? 1 : 0, transform: showExport ? "translateY(0)" : "translateY(12px)" }}
      >
        <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-500/20">
          <Download className="h-3.5 w-3.5" />
          {lang === "es" ? "Exportar PDF" : lang === "pt" ? "Exportar PDF" : "Export PDF"}
        </div>
        <div className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 font-medium">
          {lang === "es" ? "Copiar texto" : lang === "pt" ? "Copiar texto" : "Copy text"}
        </div>
      </div>

      <p className="text-xs text-gray-500 max-w-xs text-center">
        {lang === "es"
          ? "De la voz al informe final en menos de 30 segundos"
          : lang === "pt"
          ? "Da voz ao laudo final em menos de 30 segundos"
          : "From voice to final report in under 30 seconds"}
      </p>
    </div>
  );
}

/* ─── Animated stats bar ─── */

function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, visible);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center px-6">
      <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400" style={{ animation: visible ? "counter-glow 2s ease-in-out" : "none" }}>
        {count}{suffix}
      </div>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function StatsBar({ lang }: { lang: PublicLang }) {
  const stats = lang === "es"
    ? [
        { value: 104, suffix: "+", label: "Plantillas especializadas" },
        { value: 10, suffix: "x", label: "Más rápido que escribir" },
        { value: 3, suffix: "", label: "Idiomas soportados" },
      ]
    : lang === "pt"
    ? [
        { value: 104, suffix: "+", label: "Modelos especializados" },
        { value: 10, suffix: "x", label: "Mais rápido que digitar" },
        { value: 3, suffix: "", label: "Idiomas suportados" },
      ]
    : [
        { value: 104, suffix: "+", label: "Specialized templates" },
        { value: 10, suffix: "x", label: "Faster than typing" },
        { value: 3, suffix: "", label: "Languages supported" },
      ];

  return (
    <section className="relative py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-0 md:divide-x md:divide-white/10">
          {stats.map((s, i) => (
            <AnimatedStat key={i} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LangToggle({ lang, setLang }: { lang: PublicLang; setLang: (l: PublicLang) => void }) {
  return (
    <button
      onClick={() => setLang(nextLang(lang))}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
      aria-label="Toggle language"
    >
      <Globe className="h-3.5 w-3.5" />
      {langLabel(lang)}
    </button>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, index = 0 }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  index?: number;
}) {
  return (
    <div data-reveal style={revealDelay((index % 3) * 100)}>
      <div className="group relative h-full p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-4 shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-base font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PricingCard({ plan, planKey, t, lang, index = 0 }: {
  plan: typeof PLANS["free"];
  planKey: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: PublicLang;
  index?: number;
}) {
  const isHighlight = plan.highlight;

  return (
    <div data-reveal style={revealDelay(index * 90)} className="h-full">
    <div
      className={`relative h-full p-6 rounded-2xl transition-all duration-300 ${
        isHighlight
          ? "bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 shadow-xl shadow-blue-500/10 scale-[1.02]"
          : planKey === "resident"
          ? "bg-gradient-to-b from-violet-500/10 to-violet-500/10 border-2 border-violet-500/30 shadow-lg shadow-violet-500/10"
          : "bg-white/[0.02] border border-white/5 hover:border-white/10"
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            {t("pricing.most_popular")}
          </span>
        </div>
      )}
      {planKey === "resident" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-violet-500 to-violet-600 rounded-full">
            {lang === "es" ? "Residentes" : lang === "pt" ? "Residentes" : "Residents"}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">{plan.label}</h3>
        <div className="flex items-baseline gap-1">
          {plan.price === 0 ? (
            <span className="text-4xl font-bold">{lang === "es" ? "Gratis" : lang === "pt" ? "Grátis" : "Free"}</span>
          ) : (
            <>
              <span className="text-4xl font-bold">{CURRENCY}{plan.price}</span>
              <span className="text-sm text-gray-400">USD{t("pricing.per_month")}</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            {t(f)}
          </li>
        ))}
      </ul>

      <Link
        href="/waitlist"
        className={`block text-center text-sm font-semibold py-3 rounded-xl transition-all ${
          isHighlight
            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-purple-500/20"
            : planKey === "resident"
            ? "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 shadow-lg shadow-violet-500/20"
            : "bg-white/5 hover:bg-white/10 border border-white/10"
        }`}
      >
        {plan.price === 0
          ? t("pricing.free_cta")
          : planKey === "resident"
          ? lang === "es" ? "Verificar y suscribirse" : lang === "pt" ? "Verificar e assinar" : "Verify & subscribe"
          : `${t("pricing.subscribe_cta")} — ${CURRENCY}${plan.price}${t("pricing.per_month")}`}
      </Link>
    </div>
    </div>
  );
}
