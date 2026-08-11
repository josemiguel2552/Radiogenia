"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic, FileText, Brain, Sparkles, Layout, Shield, MessageCircle,
  ChevronRight, Check, ArrowRight, Globe,
  Lock, ShieldCheck, Eye, ScrollText, Fingerprint,
  BookOpen, Tags, Building2, Loader2, Send,
} from "lucide-react";
import { PLANS, CURRENCY, type SubscriptionPlan } from "@/lib/types";
import type { Region } from "@/lib/region";
import { Logo } from "@/components/ui/logo";
import { PriceTooltip } from "@/components/shared/price-tooltip";
import { usePublicLang, nextLang, langLabel, type PublicLang } from "@/lib/public-i18n";
import { captureUtm } from "@/lib/utm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

/* ─── Particle canvas for hero ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const count = 45;
    const maxDist = 140;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(139,92,246,0.35)";
        ctx.fill();
      }
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.12 * (1 - d / maxDist)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      for (const p of particles) {
        p.x = Math.min(p.x, w);
        p.y = Math.min(p.y, h);
      }
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.5 }} />;
}

/* ─── Animated section divider ─── */
function SectionDivider() {
  return (
    <div className="relative py-2">
      <div className="relative h-px mx-auto max-w-3xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
        <div
          className="absolute top-0 h-full w-1/5 bg-gradient-to-r from-transparent via-purple-400/60 to-transparent"
          style={{ animation: "divider-pulse 4s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

/* ─── CTA sparkle positions (deterministic for SSR) ─── */
const CTA_SPARKLES = Array.from({ length: 20 }, (_, i) => ({
  left: ((i * 37 + 13) % 97) + 1,
  top: ((i * 53 + 7) % 93) + 3,
  dur: 8 + (i % 5) * 3,
  delay: (i % 7) * 0.8,
  size: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
}));

/* ─── 3D tilt handlers ─── */
function handleTilt(e: React.MouseEvent<HTMLDivElement>) {
  if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  el.style.transform = `perspective(800px) rotateX(${(y - 0.5) * -8}deg) rotateY(${(x - 0.5) * 8}deg) scale3d(1.03,1.03,1.03)`;
}
function handleTiltReset(e: React.MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = "";
}

/** Feature cards that describe clinical decision support. */
const INTERPRETIVE_FEATURES = new Set(["classify", "bot"]);

const FEATURE_KEYS = [
  { icon: Mic, key: "voice", color: "from-blue-500 to-indigo-600" },
  { icon: FileText, key: "structured", color: "from-violet-500 to-purple-600" },
  { icon: Brain, key: "style", color: "from-purple-500 to-pink-500" },
  { icon: Sparkles, key: "conclusions", color: "from-indigo-500 to-blue-600" },
  { icon: Tags, key: "classify", color: "from-purple-500 to-violet-600" },
  { icon: MessageCircle, key: "bot", color: "from-violet-500 to-fuchsia-500" },
  { icon: Layout, key: "templates", color: "from-blue-600 to-cyan-500" },
  { icon: Shield, key: "safety", color: "from-violet-600 to-indigo-500" },
];

const SECURITY_ITEMS = [
  { icon: Lock, key: "encryption" },
  { icon: Fingerprint, key: "pii" },
  { icon: ShieldCheck, key: "accuracy" },
  { icon: Eye, key: "zero_data" },
  { icon: ScrollText, key: "audit" },
  { icon: BookOpen, key: "flexibility" },
] as const;

// Card-first billing: Starter (with a 7-day free trial), Professional and
// Unlimited. "free" and "resident" are legacy-only states, never sold.
const PLAN_ORDER: SubscriptionPlan[] = ["starter", "professional", "unlimited"];

export function LandingPage({ region = "open" }: { region?: Region }) {
  // In the EU/EEA/UK and the US the interpretive features are not offered, so
  // the public page must not advertise them either.
  const showInterpretive = region === "open";
  const heroRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { lang, setLang, t } = usePublicLang();
  useMouseGlow(heroRef);
  useScrollReveal();
  // First-touch attribution: remember which campaign/channel brought the visitor.
  useEffect(() => { captureUtm(); }, []);

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
            <Link href="/hospitals" className="hover:text-white transition-colors">{t("nav.hospitals")}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <Link
              href="/auth/login"
              className="hidden sm:block text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              {t("nav.signin")}
            </Link>
            <Link
              href="/waitlist"
              className="text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-4 py-2 rounded-full transition-all shadow-lg shadow-purple-500/20"
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

        <ParticleCanvas />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div data-reveal style={revealDelay(0)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 text-sm text-gray-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            {lang === "es" ? "Informes radiológicos con IA" : lang === "pt" ? "Laudos radiológicos com IA" : "AI-powered radiology reporting"}
          </div>

          <h1 data-reveal style={revealDelay(100)} className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            {lang === "es" ? "Informes radiológicos " : lang === "pt" ? "Laudos radiológicos " : "Radiology reports "}
            <span className="text-transparent bg-clip-text hero-shimmer" style={{ backgroundImage: "linear-gradient(90deg, #60a5fa, #c084fc, #f472b6, #60a5fa)" }}>
              {lang === "es" ? "en segundos" : lang === "pt" ? "em segundos" : "in seconds"}
            </span>
          </h1>

          <p data-reveal style={revealDelay(200)} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t("hero.subtitle")}
          </p>

          <div data-reveal style={revealDelay(300)} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/waitlist"
                className="group flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                {t("hero.cta_primary")}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <span className="text-[11px] text-gray-500">{t("hero.cta_microcopy")}</span>
            </div>
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

      {/* ─── Step-by-step showcase ─── */}
      <StepsShowcase lang={lang} showInterpretive={showInterpretive} />

      {/* ─── Stats counter bar ─── */}
      <StatsBar lang={lang} />

      <SectionDivider />

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
            {FEATURE_KEYS.filter((f) => showInterpretive || !INTERPRETIVE_FEATURES.has(f.key)).map((f, i) => (
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

      <SectionDivider />

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

      <SectionDivider />

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

          <div className="grid md:grid-cols-3 gap-5 items-start max-w-5xl mx-auto">
            {PLAN_ORDER.map((key, i) => {
              const plan = PLANS[key];
              return (
                <PricingCard key={key} plan={plan} planKey={key} t={t} lang={lang} index={i} />
              );
            })}
          </div>

          <div className="mt-5 max-w-5xl mx-auto">
            <EnterprisePricingCard t={t} lang={lang} index={PLAN_ORDER.length} />
          </div>

          <div className="mt-12 text-center space-y-4">
            {!showInterpretive && (
              <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed border border-white/10 rounded-xl px-4 py-3 bg-white/[0.02]">
                {t("region.notice")}
              </p>
            )}
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
                <div className="group relative h-full p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-violet-500/30 transition-all duration-500 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]">
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
            {(["soc2", "gdpr", "hipaa_badge", "hsts"] as const).map((badge, i) => (
              <span
                key={badge}
                className="badge-scan flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5"
                style={{ "--scan-delay": `${i * 0.7}s` } as React.CSSProperties}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-violet-500" />
                {t(`security.badge_${badge}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/[0.08] rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <div data-reveal className="relative p-12 rounded-3xl cta-mesh border border-white/10 backdrop-blur-sm overflow-hidden">
            {CTA_SPARKLES.map((s, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-purple-400/40"
                style={{
                  left: `${s.left}%`,
                  top: `${s.top}%`,
                  width: s.size,
                  height: s.size,
                  animation: `sparkle-float ${s.dur}s ease-in-out infinite`,
                  animationDelay: `${s.delay}s`,
                }}
              />
            ))}
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">{t("cta.title")}</h2>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                {t("cta.subtitle")}
              </p>
              <a
                href="/waitlist"
                className="inline-flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
              >
                {t("cta.button")}
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="mt-3 text-[11px] text-gray-500">{t("hero.cta_microcopy")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/"><Logo size="sm" forceDark /></Link>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">{t("nav.features")}</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">{t("nav.pricing")}</a>
            <Link href="/hospitals" className="hover:text-gray-300 transition-colors">{t("nav.hospitals")}</Link>
            <Link href="/guide" className="hover:text-gray-300 transition-colors">{t("footer.guide")}</Link>
            <Link href="/legal" className="hover:text-gray-300 transition-colors">{t("footer.legal")}</Link>
            <Link href="/auth/login" className="hover:text-gray-300 transition-colors">{t("nav.signin")}</Link>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <a href="mailto:hola@radiogen.ai" className="hover:text-gray-300 transition-colors">{t("footer.contact")}: hola@radiogen.ai</a>
            <a href="mailto:info@radiogen.ai" className="hover:text-gray-300 transition-colors">{t("footer.info")}: info@radiogen.ai</a>
            <a href="mailto:soporte@radiogen.ai" className="hover:text-gray-300 transition-colors">{t("footer.support")}: soporte@radiogen.ai</a>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Radiogen.AI
          </p>
        </div>
        <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/5">
          <p className="text-[11px] leading-relaxed text-gray-600 text-center">
            {t("footer.disclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ─── Step-by-step showcase ─── */

const DEMO_TEXTS: Record<PublicLang, string> = {
  es: "Nódulo de 28 mm en lóbulo superior izquierdo con márgenes espiculados. Adenopatía supraclavicular derecha de 15 mm. Nódulo adrenal izquierdo nuevo de 18 mm. Pequeño derrame pleural derecho...",
  en: "28 mm spiculated nodule in the left upper lobe. Right supraclavicular lymphadenopathy measuring 15 mm. New 18 mm left adrenal nodule. Small right pleural effusion...",
  pt: "Nódulo de 28 mm no lobo superior esquerdo com margens espiculadas. Linfonodomegalia supraclavicular direita de 15 mm. Nódulo adrenal esquerdo novo de 18 mm. Pequeno derrame pleural direito...",
};

const STEPS_DATA: Record<PublicLang, { title: string; desc: string }[]> = {
  es: [
    { title: "Dicta tu informe", desc: "Habla naturalmente y tu voz se transcribe en tiempo real con máxima precisión. ¿Sin micrófono en la estación de trabajo? Escanea un código y dicta desde tu móvil" },
    { title: "Informe en tu formato", desc: "La IA analiza tu dictado y genera el informe completo en segundos, en el formato que tú elijas: estructurado por secciones, narrativo no estructurado o solo hallazgos" },
    { title: "Clasificación automática", desc: "Estadifica y clasifica los hallazgos automáticamente usando sistemas estándar: TNM, BI-RADS, TI-RADS y más" },
    { title: "Radiogen Bot", desc: "Consulta clasificaciones, valores de referencia o criterios de seguimiento sin salir de tu informe" },
  ],
  en: [
    { title: "Dictate your report", desc: "Speak naturally and your voice is transcribed in real time with maximum accuracy. No microphone at your workstation? Scan a code and dictate from your phone" },
    { title: "Your report, your format", desc: "AI analyzes your dictation and generates the complete report in seconds, in the format you choose: structured into sections, unstructured narrative, or findings only" },
    { title: "Automatic classification", desc: "Automatically stage and classify findings using standard systems: TNM, BI-RADS, TI-RADS and more" },
    { title: "Radiogen Bot", desc: "Look up classifications, reference values, or follow-up criteria without leaving your report" },
  ],
  pt: [
    { title: "Dite seu laudo", desc: "Fale naturalmente e sua voz é transcrita em tempo real com máxima precisão. Sem microfone na estação de trabalho? Escaneie um código e dite do seu celular" },
    { title: "Laudo no seu formato", desc: "A IA analisa seu ditado e gera o laudo completo em segundos, no formato que você escolher: estruturado em seções, narrativo não estruturado ou só achados" },
    { title: "Classificação automática", desc: "Estadie e classifique os achados automaticamente usando sistemas padrão: TNM, BI-RADS, TI-RADS e mais" },
    { title: "Radiogen Bot", desc: "Consulte classificações, valores de referência ou critérios de seguimento sem sair do laudo" },
  ],
};

const STEP_ICONS = [Mic, FileText, Tags, MessageCircle];
const STEP_COLORS = [
  "from-blue-400 to-blue-600",
  "from-blue-500 to-indigo-600",
  "from-purple-500 to-violet-600",
  "from-violet-500 to-fuchsia-500",
];

function StepsShowcase({ lang, showInterpretive = true }: { lang: PublicLang; showInterpretive?: boolean }) {
  // Steps 3 and 4 (automatic classification and the assistant) are clinical
  // decision support and are not offered — nor advertised — in the EU/US.
  const steps = showInterpretive ? STEPS_DATA[lang] : STEPS_DATA[lang].slice(0, 2);
  const dictText = DEMO_TEXTS[lang];

  return (
    <section className="relative py-24 px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-indigo-950/20 to-[#0a0a1a] pointer-events-none" />
      <div className="relative max-w-6xl mx-auto space-y-6">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i];
          const reverse = i % 2 === 1;
          const isHighlight = i >= 2;
          return (
            <div key={i}>
              <div
                data-reveal
                style={revealDelay(0)}
                className={`grid lg:grid-cols-2 gap-10 items-center ${isHighlight ? "relative rounded-2xl p-6 lg:p-8 border border-purple-500/10 bg-gradient-to-br from-purple-500/[0.04] to-transparent" : ""}`}
              >
                {isHighlight && (
                  <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-purple-500/10 via-transparent to-fuchsia-500/10 blur-sm -z-10" />
                )}
                <div className={`space-y-4 ${reverse ? "lg:order-2" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`${isHighlight ? "w-14 h-14" : "w-12 h-12"} rounded-2xl bg-gradient-to-br ${STEP_COLORS[i]} flex items-center justify-center shadow-lg ${isHighlight ? "shadow-purple-500/20" : ""}`}>
                      <Icon className={`${isHighlight ? "h-7 w-7" : "h-6 w-6"} text-white`} />
                    </div>
                    <span className={`text-sm font-mono ${isHighlight ? "text-purple-300" : "text-blue-400"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className={`font-bold ${isHighlight ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"}`}>{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed max-w-md">{step.desc}</p>
                </div>
                <div className={reverse ? "lg:order-1" : ""}>
                  <MockScreen>
                    {i === 0 && <DictateVisual text={dictText} />}
                    {i === 1 && <ReportVisual lang={lang} />}
                    {i === 2 && <ClassifyVisual lang={lang} />}
                    {i === 3 && <BotVisual lang={lang} />}
                  </MockScreen>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-4">
                  <div className={`w-px h-12 bg-gradient-to-b ${i === 1 ? "from-blue-500/30 via-purple-500/30 to-transparent" : i >= 2 ? "from-purple-500/30 to-transparent" : "from-blue-500/30 to-transparent"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MockScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="demo-screen rounded-2xl p-1 relative">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20 blur-sm -z-10" />
      <div className="rounded-xl bg-[#0c0c20] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="px-3 py-0.5 rounded bg-white/5 text-[10px] text-gray-500 font-mono">radiogen.ai</div>
          </div>
        </div>
        <div className="p-4 md:p-5 min-h-[280px] md:min-h-[340px] flex items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

function DictateVisual({ text }: { text: string }) {
  return (
    <div className="relative flex flex-col items-center justify-center gap-5 w-full">
      {/* Subtle phone-as-dictaphone: a small handset recording in the corner,
          its signal flowing toward the workstation mic. */}
      <div className="absolute -top-1 right-0 flex items-end gap-1.5">
        <div className="flex flex-col gap-[4px] pb-7">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-[2px] rounded-full bg-gradient-to-l from-violet-400/60 to-transparent animate-pulse"
              style={{ width: `${20 - i * 5}px`, animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-[72px] rounded-[9px] border border-violet-400/40 bg-gradient-to-b from-violet-500/15 to-blue-500/10 flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-violet-900/20">
            <span className="block w-4 h-[2px] rounded-full bg-violet-300/40" />
            <span className="relative flex items-center justify-center w-6 h-6">
              <span className="absolute inline-block w-6 h-6 rounded-full bg-violet-400/25 animate-ping" />
              <span className="relative inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/70">
                <Mic className="h-3.5 w-3.5 text-white" />
              </span>
            </span>
            <div className="flex items-end gap-[2px] h-3">
              {[0.5, 1, 0.7, 0.9, 0.6].map((f, i) => (
                <span
                  key={i}
                  className="waveform-bar w-[2.5px] rounded-full bg-violet-300/80"
                  style={{ "--bar-delay": `${i * 0.12}s`, minHeight: `${3 + f * 4}px` } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

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
      <p className="text-sm text-gray-300 font-mono leading-relaxed text-center max-w-sm">{text}</p>
    </div>
  );
}

const REPORT_FORMATS: Record<
  PublicLang,
  {
    tabs: [string, string, string];
    sections: { label: string; text: string }[];
    narrative: string;
    findingsLabel: string;
    findings: string;
  }
> = {
  es: {
    tabs: ["Estructurado", "No estructurado", "Solo hallazgos"],
    sections: [
      { label: "TÉCNICA", text: "TC de tórax con contraste intravenoso." },
      { label: "HALLAZGOS", text: "Nódulo espiculado de 28 mm en lóbulo superior izquierdo. Adenopatía supraclavicular derecha de 15 mm. Nódulo adrenal izquierdo de 18 mm. Pequeño derrame pleural derecho." },
      { label: "CONCLUSIÓN", text: "Masa pulmonar con adenopatía y nódulo adrenal sospechosos de neoplasia pulmonar con diseminación a distancia." },
    ],
    narrative:
      "Nódulo espiculado de 28 mm en el lóbulo superior izquierdo, asociado a adenopatía supraclavicular derecha de 15 mm y nódulo adrenal izquierdo de 18 mm, sospechosos de neoplasia pulmonar con diseminación a distancia. Se acompaña de pequeño derrame pleural derecho.",
    findingsLabel: "HALLAZGOS",
    findings:
      "Nódulo espiculado de 28 mm en lóbulo superior izquierdo. Adenopatía supraclavicular derecha de 15 mm. Nódulo adrenal izquierdo de 18 mm. Pequeño derrame pleural derecho.",
  },
  en: {
    tabs: ["Structured", "Unstructured", "Findings only"],
    sections: [
      { label: "TECHNIQUE", text: "Contrast-enhanced chest CT." },
      { label: "FINDINGS", text: "28 mm spiculated nodule in the left upper lobe. Right supraclavicular lymphadenopathy (15 mm). New 18 mm left adrenal nodule. Small right pleural effusion." },
      { label: "CONCLUSION", text: "Lung mass with lymphadenopathy and adrenal nodule suspicious for pulmonary neoplasia with distant spread." },
    ],
    narrative:
      "28 mm spiculated nodule in the left upper lobe, associated with right supraclavicular lymphadenopathy (15 mm) and an 18 mm left adrenal nodule, suspicious for pulmonary neoplasia with distant spread. Accompanied by a small right pleural effusion.",
    findingsLabel: "FINDINGS",
    findings:
      "28 mm spiculated nodule in the left upper lobe. Right supraclavicular lymphadenopathy (15 mm). New 18 mm left adrenal nodule. Small right pleural effusion.",
  },
  pt: {
    tabs: ["Estruturado", "Não estruturado", "Só achados"],
    sections: [
      { label: "TÉCNICA", text: "TC de tórax com contraste intravenoso." },
      { label: "ACHADOS", text: "Nódulo espiculado de 28 mm no lobo superior esquerdo. Linfonodomegalia supraclavicular direita de 15 mm. Nódulo adrenal esquerdo de 18 mm. Pequeno derrame pleural direito." },
      { label: "CONCLUSÃO", text: "Massa pulmonar com linfonodomegalia e nódulo adrenal suspeitos de neoplasia pulmonar com disseminação à distância." },
    ],
    narrative:
      "Nódulo espiculado de 28 mm no lobo superior esquerdo, associado a linfonodomegalia supraclavicular direita de 15 mm e nódulo adrenal esquerdo de 18 mm, suspeitos de neoplasia pulmonar com disseminação à distância. Acompanha-se de pequeno derrame pleural direito.",
    findingsLabel: "ACHADOS",
    findings:
      "Nódulo espiculado de 28 mm no lobo superior esquerdo. Linfonodomegalia supraclavicular direita de 15 mm. Nódulo adrenal esquerdo de 18 mm. Pequeno derrame pleural direito.",
  },
};

function ReportVisual({ lang }: { lang: PublicLang }) {
  const data = REPORT_FORMATS[lang];
  const [mode, setMode] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMode((m) => (m + 1) % 3), 3800);
    return () => clearInterval(id);
  }, []);

  const sectionBlock = (label: string, text: string, key: string) => (
    <div key={key}>
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 max-w-5 bg-purple-500/30" />
        <span className="text-[9px] font-bold tracking-widest text-purple-400">{label}</span>
      </div>
      <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/5">
        <p className="text-xs text-gray-300 leading-relaxed">{text}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col justify-start gap-3 w-full">
      <div className="flex items-center gap-1.5 flex-wrap">
        {data.tabs.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMode(i)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all duration-300 ${
              mode === i
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "bg-white/[0.04] border border-white/10 text-gray-500"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        key={mode}
        className="flex flex-col gap-2.5 min-h-[220px]"
        style={{ animation: "format-swap 0.45s ease" }}
      >
        {mode === 0 && data.sections.map((s) => sectionBlock(s.label, s.text, s.label))}
        {mode === 1 && (
          <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
            <p className="text-xs text-gray-300 leading-relaxed">{data.narrative}</p>
          </div>
        )}
        {mode === 2 && sectionBlock(data.findingsLabel, data.findings, "findings-only")}
      </div>
    </div>
  );
}

function ClassifyVisual({ lang }: { lang: PublicLang }) {
  const title = lang === "es" ? "Clasificación propuesta" : lang === "pt" ? "Classificação proposta" : "Proposed classification";
  const tnmItems = lang === "es"
    ? [
        { code: "T1c", meaning: "Tumor de 21-30 mm" },
        { code: "N3", meaning: "Adenopatía supraclavicular contralateral" },
        { code: "M1b", meaning: "Metástasis a distancia única (adrenal)" },
        { code: "Estadio IVA", meaning: "" },
      ]
    : lang === "pt"
    ? [
        { code: "T1c", meaning: "Tumor de 21-30 mm" },
        { code: "N3", meaning: "Linfonodomegalia supraclavicular contralateral" },
        { code: "M1b", meaning: "Metástase à distância única (adrenal)" },
        { code: "Estádio IVA", meaning: "" },
      ]
    : [
        { code: "T1c", meaning: "Tumor 21-30 mm" },
        { code: "N3", meaning: "Contralateral supraclavicular lymphadenopathy" },
        { code: "M1b", meaning: "Single distant metastasis (adrenal)" },
        { code: "Stage IVA", meaning: "" },
      ];

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/25 to-violet-500/25 border border-purple-500/30 flex items-center justify-center">
          <Tags className="h-4 w-4 text-purple-400" />
        </div>
        <span className="text-xs font-bold text-purple-300">{title}</span>
      </div>
      <div className="rounded-xl bg-gradient-to-b from-purple-500/10 to-violet-500/10 border border-purple-500/20 p-3 space-y-2">
        <span className="text-[10px] font-bold text-purple-300 tracking-wide">TNM (AJCC 8th ed.)</span>
        {tnmItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-white/[0.04]">
            <span className="text-[11px] font-bold text-white min-w-[70px]">{item.code}</span>
            {item.meaning && <span className="text-[10px] text-gray-400">{item.meaning}</span>}
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <div className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 text-xs font-semibold text-white flex items-center gap-2 shadow-lg shadow-purple-500/20">
          <Check className="h-3.5 w-3.5" />
          {lang === "es" ? "Añadir a conclusión" : lang === "pt" ? "Adicionar à conclusão" : "Add to conclusion"}
        </div>
      </div>
    </div>
  );
}

function BotVisual({ lang }: { lang: PublicLang }) {
  const question = lang === "es"
    ? "¿Qué estudio complementario para estadificación T1c N3 M1b?"
    : lang === "pt"
    ? "Qual exame complementar para estadiamento T1c N3 M1b?"
    : "What complementary study for T1c N3 M1b staging?";
  const answer = lang === "es"
    ? "Para estadio IVA (T1c N3 M1b) se recomienda:\n• PET-CT de cuerpo completo\n• Biopsia de la lesión primaria o metástasis\n• RM cerebral para descartar metástasis"
    : lang === "pt"
    ? "Para estádio IVA (T1c N3 M1b) recomenda-se:\n• PET-CT de corpo inteiro\n• Biópsia da lesão primária ou metástase\n• RM cerebral para excluir metástases"
    : "For stage IVA (T1c N3 M1b) recommended:\n• Whole-body PET-CT to confirm extent\n• Biopsy of primary or accessible metastasis\n• Brain MRI to rule out cerebral metastases";

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 border border-violet-500/30 flex items-center justify-center">
          <Brain className="h-4 w-4 text-violet-400" />
        </div>
        <span className="text-xs font-bold text-violet-300">Radiogen Bot</span>
        <div className="ml-auto flex gap-1 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
          <span className="text-[9px] text-gray-500">Online</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-3">
        <div className="flex justify-end">
          <div className="max-w-[75%] px-3 py-2 rounded-xl rounded-br-sm bg-violet-600/30 border border-violet-500/20">
            <p className="text-xs text-violet-200">{question}</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-bl-sm bg-white/[0.04] border border-white/5">
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{answer}</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 items-center">
        <div className="flex-1 h-8 rounded-full bg-white/[0.03] border border-white/5 flex items-center px-3">
          <span className="text-[10px] text-gray-600">
            {lang === "es" ? "Pregunta sobre guías clínicas..." : lang === "pt" ? "Pergunte sobre guias clínicos..." : "Ask about clinical guidelines..."}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <ArrowRight className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
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
      <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400" style={{ filter: visible ? "drop-shadow(0 0 20px rgba(124,58,237,0.3))" : "none", transition: "filter 1s ease-out" }}>
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
      <div
        className="gradient-border-card tilt-card h-full"
        onMouseMove={handleTilt}
        onMouseLeave={handleTiltReset}
      >
        <div className="gradient-border-inner p-6">
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-4 shadow-lg`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-base font-semibold mb-2">{title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
        </div>
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
          : planKey === "unlimited"
          ? "bg-gradient-to-b from-fuchsia-500/10 to-transparent border-2 border-fuchsia-500/25 shadow-lg shadow-fuchsia-500/10"
          : "bg-white/[0.02] border border-white/5 hover:border-white/10"
      }`}
    >
      {planKey === "starter" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-purple-600 rounded-full whitespace-nowrap">
            {lang === "es" ? "7 días gratis" : lang === "pt" ? "7 dias grátis" : "7 days free"}
          </span>
        </div>
      )}
      {planKey === "unlimited" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-fuchsia-500 to-violet-600 rounded-full whitespace-nowrap">
            {lang === "es" ? "Sin límites" : lang === "pt" ? "Sem limites" : "No limits"}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">{plan.label}</h3>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold">{CURRENCY}{plan.price}</span>
            <span className="text-sm text-gray-400">USD{t("pricing.per_month")}</span>
          </div>
          {planKey === "starter" && (
            <p className="text-xs text-blue-300 mt-1">
              {lang === "es"
                ? "Prueba gratuita de 7 días — sin cargo hoy, cancela cuando quieras"
                : lang === "pt"
                ? "Teste grátis de 7 dias — sem cobrança hoje, cancele quando quiser"
                : "7-day free trial — no charge today, cancel anytime"}
            </p>
          )}
          {plan.price > 0 && <PriceTooltip usd={plan.price} inline />}
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
        href={`/waitlist?plan=${planKey}`}
        className={`block text-center text-sm font-semibold py-3 rounded-full transition-all ${
          isHighlight
            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-purple-500/20"
            : planKey === "unlimited"
            ? "bg-gradient-to-r from-fuchsia-500/80 to-violet-600/80 hover:from-fuchsia-500 hover:to-violet-600 shadow-md shadow-fuchsia-500/10"
            : "bg-gradient-to-r from-blue-500/70 to-purple-600/70 hover:from-blue-500 hover:to-purple-600 shadow-md shadow-purple-500/10"
        }`}
      >
        {planKey === "starter"
          ? lang === "es" ? "Probar 7 días gratis" : lang === "pt" ? "Testar 7 dias grátis" : "Try 7 days free"
          : <>{t("pricing.subscribe_cta")} — {CURRENCY}{plan.price}{t("pricing.per_month")}</>}
      </Link>
    </div>
    </div>
  );
}

/* ─── Enterprise plan — custom quote, opens a contact dialog ─── */

const ENTERPRISE_FEATURE_KEYS = [
  "pricing.enterprise_feat_all_pro",
  "pricing.enterprise_feat_team_licenses",
  "pricing.enterprise_feat_institutional_templates",
  "pricing.enterprise_feat_preferential_config",
  "pricing.enterprise_feat_onboarding",
  "pricing.enterprise_feat_workflow_adaptation",
  "pricing.enterprise_feat_priority_support",
  "pricing.enterprise_feat_institutional_billing",
];

function EnterprisePricingCard({ t, lang, index = 0 }: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: PublicLang;
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/enterprise-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim(), lang }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t("pricing.enterprise_error"));
      }
    } catch {
      setError(t("pricing.enterprise_error"));
    }
    setSending(false);
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      // Reset a beat after the close animation so the form doesn't flash empty.
      setTimeout(() => { setSent(false); setName(""); setEmail(""); setMessage(""); setError(""); }, 200);
    }
  }

  return (
    <div data-reveal style={revealDelay(index * 90)}>
      <div className="relative p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="hidden md:flex h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/10 items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-1">{t("pricing.enterprise_title")}</h3>
            <p className="text-sm text-gray-400 mb-3">{t("pricing.enterprise_subtitle")}</p>
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {ENTERPRISE_FEATURE_KEYS.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-gray-300">
                  <Check className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  {t(f)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="shrink-0 text-center md:text-right">
          <p className="text-2xl font-bold mb-3">{t("pricing.enterprise_price")}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-block text-center text-sm font-semibold py-3 px-6 rounded-full bg-gradient-to-r from-blue-500/70 to-purple-600/70 hover:from-blue-500 hover:to-purple-600 shadow-md shadow-purple-500/10 transition-all"
          >
            {t("pricing.enterprise_cta")}
          </button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md bg-[#0f0f23] border-white/10 text-white">
          {sent ? (
            <div className="py-4 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Check className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-sm font-medium">{t("pricing.enterprise_success")}</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">{t("pricing.enterprise_dialog_title")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t("pricing.enterprise_field_name")}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t("pricing.enterprise_field_email")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">{t("pricing.enterprise_field_message")}</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder={t("pricing.enterprise_field_message_ph")}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-purple-500/20 transition-all disabled:opacity-60"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t("pricing.enterprise_submit")}
                </button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
