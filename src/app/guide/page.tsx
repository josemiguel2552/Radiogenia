"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Globe, Menu, X, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePublicLang, nextLang, langLabel } from "@/lib/public-i18n";
import { GUIDE_SECTIONS, GUIDE_META, GUIDE_CONTACT, type GuideLang } from "@/lib/guide-content";

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-4 text-[15px] leading-relaxed text-gray-300">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          em: ({ children }) => <em className="text-gray-200">{children}</em>,
          ul: ({ children }) => <ul className="mb-4 ml-1 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 ml-4 space-y-2 list-decimal marker:text-blue-400 marker:font-semibold">{children}</ol>,
          li: ({ children }) => (
            <li className="relative pl-4 text-[15px] leading-relaxed text-gray-300 [ul>&]:before:content-['·'] [ul>&]:before:absolute [ul>&]:before:left-0 [ul>&]:before:text-blue-400 [ul>&]:before:font-bold">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <div className="my-4 px-4 py-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/15 text-sm text-gray-300 leading-relaxed [&>p]:mb-0">
              {children}
            </div>
          ),
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/[0.04]">{children}</thead>,
          th: ({ children }) => <th className="text-left px-4 py-2.5 font-semibold text-gray-200 border-b border-white/10">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2.5 text-gray-300 border-b border-white/5">{children}</td>,
          a: ({ children, href }) => <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-2">{children}</a>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function GuidePage() {
  const { lang, setLang } = usePublicLang();
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState<string>(GUIDE_SECTIONS[0].chapters[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const meta = GUIDE_META[lang as GuideLang];
  const contact = GUIDE_CONTACT[lang as GuideLang];
  const totalChapters = GUIDE_SECTIONS.reduce((n, s) => n + s.chapters.length, 0);

  useEffect(() => {
    const ids = GUIDE_SECTIONS.flatMap((s) => s.chapters.map((c) => c.id));
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) obs.observe(el);
    }
    observerRef.current = obs;
    return () => obs.disconnect();
  }, [lang]);

  const nav = (
    <nav className="space-y-6">
      {GUIDE_SECTIONS.map((section) => (
        <div key={section.id}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 px-3">
            {section.title[lang as GuideLang]}
          </p>
          <ul className="space-y-0.5">
            {section.chapters.map((ch) => (
              <li key={ch.id}>
                <a
                  href={`#${ch.id}`}
                  onClick={() => setNavOpen(false)}
                  className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active === ch.id
                      ? "bg-blue-500/10 text-blue-300 font-medium"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03]"
                  }`}
                >
                  {ch.title[lang as GuideLang]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="px-3 pt-2 border-t border-white/5">
        <a
          href="#contact"
          onClick={() => setNavOpen(false)}
          className="block py-1.5 text-sm text-gray-400 hover:text-gray-200"
        >
          {contact.title}
        </a>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400 shrink-0"
              aria-label="menu"
            >
              {navOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <Link href="/" className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors shrink-0">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{lang === "es" ? "Volver al sitio" : lang === "pt" ? "Voltar ao site" : "Back to site"}</span>
            </Link>
            <span className="text-gray-700 hidden sm:inline">·</span>
            <Link href="/" className="hidden sm:flex items-center gap-1.5 shrink-0">
              <Logo size="sm" forceDark />
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(["es", "en", "pt"] as GuideLang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${lang === l ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-6 flex gap-10">
        {/* Sidebar (desktop) */}
        <aside className="hidden lg:block w-56 shrink-0 py-10">
          <div className="sticky top-24">{nav}</div>
        </aside>

        {/* Sidebar (mobile, toggled) */}
        {navOpen && (
          <div className="lg:hidden fixed inset-0 z-20 bg-[#0a0a1a] pt-14 px-4 overflow-y-auto">
            <div className="py-6">{nav}</div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 py-10 max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-[11px] text-gray-500">
            <span>{meta.docLabel} · v1.0</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{meta.title}</h1>
          <p className="text-gray-400 leading-relaxed mb-4">{meta.subtitle}</p>
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-12">
            <span>{meta.readTime}</span>
            <span>·</span>
            <span>{totalChapters} {lang === "es" ? "capítulos" : lang === "pt" ? "capítulos" : "chapters"}</span>
          </div>

          {GUIDE_SECTIONS.map((section) => (
            <div key={section.id} className="mb-14">
              {section.chapters.map((ch) => (
                <section key={ch.id} id={ch.id} className="mb-14 scroll-mt-24">
                  <p className="text-[11px] font-semibold text-blue-400 tracking-wider mb-1.5">
                    — {lang === "es" ? "Capítulo" : lang === "pt" ? "Capítulo" : "Chapter"} {ch.number}
                  </p>
                  <h2 className="text-2xl font-bold mb-4">{ch.title[lang as GuideLang]}.</h2>
                  <MarkdownBlock content={ch.body[lang as GuideLang]} />
                </section>
              ))}
            </div>
          ))}

          <section id="contact" className="mb-14 scroll-mt-24 pt-6 border-t border-white/5">
            <p className="text-[11px] font-semibold text-blue-400 tracking-wider mb-1.5">— {lang === "es" ? "Referencia" : lang === "pt" ? "Referência" : "Reference"}</p>
            <h2 className="text-2xl font-bold mb-2">{contact.title}.</h2>
            <p className="text-gray-400 mb-5">{contact.intro}</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-40 shrink-0">{contact.support}</span>
                <a href="mailto:info@radiogen.ai" className="text-blue-400 hover:text-blue-300">info@radiogen.ai</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-40 shrink-0">{contact.general}</span>
                <a href="mailto:info@radiogen.ai" className="text-blue-400 hover:text-blue-300">info@radiogen.ai</a>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-40 shrink-0">{contact.site}</span>
                <a href="https://radiogen.ai" className="text-blue-400 hover:text-blue-300">radiogen.ai</a>
              </div>
            </div>

            <div className="mt-10 flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-gray-500" />
              <button onClick={() => setLang(nextLang(lang))} className="text-xs text-gray-500 hover:text-gray-300">
                {langLabel(lang)}
              </button>
            </div>

            <Link
              href="/dashboard"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 px-6 py-3 rounded-full transition-all"
            >
              {lang === "es" ? "Abrir Radiogen.AI" : lang === "pt" ? "Abrir o Radiogen.AI" : "Open Radiogen.AI"}
            </Link>
          </section>
        </main>
      </div>
    </div>
  );
}
