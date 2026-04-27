"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic, FileText, Brain, Sparkles, Layout, Shield,
  ChevronRight, Check, ArrowRight,
} from "lucide-react";
import { PLANS, type SubscriptionPlan } from "@/lib/types";
import { Logo } from "@/components/ui/logo";

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

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Dictation",
    desc: "Dictate findings naturally. AI transcribes and structures your report in real time.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: FileText,
    title: "Structured Reports",
    desc: "104+ templates across all modalities. Every section filled automatically from your dictation.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Brain,
    title: "Style Learning",
    desc: "The AI learns your preferred phrasing for normal findings and conclusions over time.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Sparkles,
    title: "Smart Conclusions",
    desc: "Automatic conclusions and evidence-based recommendations from your findings.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: Layout,
    title: "Custom Templates",
    desc: "Create and customize templates for any study type. Your structure, your way.",
    color: "from-blue-600 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Clinical Safety",
    desc: "Zero hallucinations policy. AI only uses what you dictate. Full traceability.",
    color: "from-violet-600 to-indigo-500",
  },
];

const PLAN_ORDER: SubscriptionPlan[] = ["free", "starter", "professional"];

export function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useMouseGlow(heroRef);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden">
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
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-5 py-2 rounded-full transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              Get started free
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
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_var(--mx)_var(--my),rgba(99,102,241,0.15)_0%,transparent_60%)] transition-[background] duration-100" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-float-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-float-slower" />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-indigo-500/8 rounded-full blur-[100px] animate-float-medium" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 text-sm text-gray-300 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            AI-powered radiology reporting
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Radiology reports{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              in seconds
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Dictate your findings, and AI generates structured, publication-ready reports.
            Learns your style. Zero hallucinations. 104+ templates across all modalities.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02]"
            >
              Start free — 50 reports/month
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white px-6 py-3.5 rounded-full border border-white/10 hover:border-white/20 transition-all backdrop-blur-sm"
            >
              See how it works
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex items-center justify-center gap-8 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500" />
              HIPAA-conscious design
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-green-500" />
              AES-256 encryption
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-2.5 bg-white/40 rounded-full animate-scroll-dot" />
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                report faster
              </span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              From dictation to structured report in one seamless flow.
              Designed by radiologists, for radiologists.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="relative py-24 px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent" />
        <div className="relative max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Three steps to your report
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Dictate", desc: "Speak your findings naturally or type them. The AI transcribes in real time." },
              { n: "02", title: "Generate", desc: "AI structures your dictation into a complete report using your preferred template." },
              { n: "03", title: "Review & Save", desc: "Edit anything, save. The platform learns your style for next time." },
            ].map((step) => (
              <div key={step.n} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 mb-4">
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    {step.n}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                transparent
              </span>{" "}
              pricing
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Start free. Upgrade when you need more reports.
              Every plan includes all features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLAN_ORDER.map((key) => {
              const plan = PLANS[key];
              return (
                <PricingCard key={key} plan={plan} planKey={key} />
              );
            })}
          </div>

          {/* Token economics note */}
          <div className="mt-12 text-center">
            <p className="text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
              Each report uses approximately 10,000 tokens (~8,000 input + ~2,000 output).
              Cost per report: ~$0.005 with DeepSeek. Plans are calculated to provide
              maximum value while maintaining service quality. All plans include the same AI model and features.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5 backdrop-blur-sm">
            <h2 className="text-3xl font-bold mb-4">Ready to report faster?</h2>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              Join radiologists who save hours every week with AI-powered reporting.
              Start with 50 free reports — no credit card needed.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 text-base font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-8 py-3.5 rounded-full transition-all shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40"
            >
              Get started free
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
            <a href="#features" className="hover:text-gray-300 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">Pricing</a>
            <Link href="/legal" className="hover:text-gray-300 transition-colors">Legal</Link>
            <Link href="/auth/login" className="hover:text-gray-300 transition-colors">Sign in</Link>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} Radiogen.AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/[0.04]">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${color} mb-4 shadow-lg`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ plan, planKey }: { plan: typeof PLANS["free"]; planKey: string }) {
  const isHighlight = plan.highlight;

  return (
    <div
      className={`relative p-6 rounded-2xl transition-all duration-300 ${
        isHighlight
          ? "bg-gradient-to-b from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 shadow-xl shadow-blue-500/10 scale-[1.02]"
          : "bg-white/[0.02] border border-white/5 hover:border-white/10"
      }`}
    >
      {isHighlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
            Most popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-1">{plan.label}</h3>
        <div className="flex items-baseline gap-1">
          {plan.price === 0 ? (
            <span className="text-4xl font-bold">Free</span>
          ) : (
            <>
              <span className="text-4xl font-bold">&euro;{plan.price}</span>
              <span className="text-sm text-gray-400">/month</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        href="/auth/register"
        className={`block text-center text-sm font-semibold py-3 rounded-xl transition-all ${
          isHighlight
            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 shadow-lg shadow-purple-500/20"
            : planKey === "professional"
            ? "bg-white/5 hover:bg-white/10 border border-white/10"
            : "bg-white/5 hover:bg-white/10 border border-white/10"
        }`}
      >
        {plan.price === 0 ? "Get started free" : `Subscribe — €${plan.price}/mo`}
      </Link>
    </div>
  );
}
