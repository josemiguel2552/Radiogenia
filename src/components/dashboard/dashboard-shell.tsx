"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  LogOut,
  LayoutDashboard,
  FileText,
  Mic,
  Shield,
  X,
  Building2,
  MessageSquare,
  Calculator,
  ClipboardList,
  User as UserIcon,
  PenLine,
  Plus,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Globe,
} from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { CalculatorsTab } from "@/components/sidebar/calculators-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { AccountTab } from "@/components/sidebar/account-tab";
import { HelpDialog } from "@/components/dashboard/help-dialog";
import { UIPrefsProvider, useUIPrefs, SKINS } from "@/lib/ui-prefs";
import type { UILanguage } from "@/lib/ui-prefs";
import { setUnifiedLanguage } from "@/lib/set-language";
import { LANGUAGES } from "@/lib/types";
import type { Signature } from "@/lib/types";
import { useT } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

type ActiveView = "dashboard" | "templates" | "calculators" | "recommendations" | "account";

/* ── Popover helper (click-outside to close) ─────────────────── */

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, ref, close]);
}

/* ── Theme picker popover ──────────────────────────────────────── */

function ThemePicker() {
  const { prefs, update, skin: activeSkin } = useUIPrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-6 w-6 rounded-full ring-2 ring-[hsl(var(--border))] transition-transform hover:scale-110 cursor-pointer"
        style={{ backgroundColor: activeSkin.preview.primary }}
        aria-label="Change theme"
      />
      {open && (
        <div className="absolute top-full right-0 mt-2.5 p-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="grid grid-cols-3 gap-2.5" style={{ width: "198px" }}>
            {SKINS.map((skin) => {
              const active = prefs.skin === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => { update({ skin: skin.id }); setOpen(false); }}
                  className={`relative rounded-lg transition-all overflow-hidden cursor-pointer ${
                    active ? "ring-2 ring-offset-2 ring-[hsl(var(--ring))] scale-[1.03]" : "hover:scale-[1.03] hover:shadow-md"
                  }`}
                  style={{ width: "58px", height: "44px", backgroundColor: skin.preview.bg }}
                >
                  <div
                    className="absolute inset-x-1.5 top-1.5 bottom-3 rounded"
                    style={{ backgroundColor: skin.preview.card, border: `1px solid ${skin.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}
                  >
                    <div className="mt-1.5 mx-1.5 h-1 w-5 rounded-full" style={{ backgroundColor: skin.preview.primary }} />
                    <div className="mt-1 mx-1.5 h-0.5 w-full rounded-full" style={{ backgroundColor: skin.preview.fg, opacity: 0.12 }} />
                  </div>
                  <div
                    className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1.5 w-6 rounded-full"
                    style={{ backgroundColor: skin.preview.primary }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Language popover (unified platform + report language) ─────── */

function LanguagePicker({ lang, onLangChange }: {
  lang: UILanguage;
  onLangChange: (lang: UILanguage) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, open, close);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] cursor-pointer"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="font-semibold">{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2.5 p-4 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150 w-56 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-2">{t("app.language")}</p>
          <div className="flex rounded-md overflow-hidden border border-[hsl(var(--border))]">
            {LANGUAGES.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => onLangChange(l.value)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  lang === l.value
                    ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                }`}
              >
                {l.value.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-snug pt-1">{t("app.language_hint")}</p>
        </div>
      )}
    </div>
  );
}

/* ── Main shell ────────────────────────────────────────────────── */

function DashboardShellInner({ children, user, role }: { children: React.ReactNode; user: User; role: string }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const { prefs, update } = useUIPrefs();
  const t = useT();

  // Org membership
  const [orgInfo, setOrgInfo] = useState<{ isChief: boolean; isMember: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/org", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data?.membership) {
        setOrgInfo({
          isChief: data.membership.is_org_chief || data.membership.section_role === "section_chief" || data.membership.section_role === "section_editor",
          isMember: true,
        });
      } else {
        setOrgInfo({ isChief: false, isMember: false });
      }
    }).catch(() => setOrgInfo({ isChief: false, isMember: false }));
  }, []);

  // Subscription usage
  const [subReportsUsed, setSubReportsUsed] = useState(0);
  const [subReportsLimit, setSubReportsLimit] = useState(30);
  const [subDictUsedMin, setSubDictUsedMin] = useState(0);
  const [subDictLimitMin, setSubDictLimitMin] = useState(30);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSubReportsUsed(data.used ?? 0);
          setSubReportsLimit(data.limit ?? 30);
          setSubDictUsedMin(data.dictation?.usedMinutes ?? 0);
          setSubDictLimitMin(data.dictation?.limitMinutes ?? 30);
        }
      })
      .catch(() => {});

    const refresh = () => {
      fetch("/api/subscription")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setSubReportsUsed(data.used ?? 0);
            setSubDictUsedMin(data.dictation?.usedMinutes ?? 0);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("radiogenai:report-saved", refresh);
    window.addEventListener("radiogenai:report-generated", refresh);
    return () => {
      window.removeEventListener("radiogenai:report-saved", refresh);
      window.removeEventListener("radiogenai:report-generated", refresh);
    };
  }, []);

  // Unified platform + report language. Source of truth is the UI language
  // (uiPrefs, persisted in localStorage). On a fresh device with no saved
  // preference, adopt the language stored server-side so it carries over.
  useEffect(() => {
    fetch("/api/model-config")
      .then((r) => r.ok ? r.json() : null)
      .then((cfg) => {
        if (!cfg?.output_language) return;
        let hasLocalPref = false;
        try { hasLocalPref = !!localStorage.getItem("radiogenai_ui_prefs"); } catch { /* ignore */ }
        if (!hasLocalPref && cfg.output_language !== prefs.uiLanguage) {
          update({ uiLanguage: cfg.output_language as UILanguage });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLanguageChange(lang: UILanguage) {
    if (lang === prefs.uiLanguage) return;
    setUnifiedLanguage(lang, update);
  }

  // Signatures
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [showAddSig, setShowAddSig] = useState(false);
  const [editingSig, setEditingSig] = useState<Signature | null>(null);
  const [sigLabel, setSigLabel] = useState("");
  const [sigBody, setSigBody] = useState("");
  const [savingSig, setSavingSig] = useState(false);

  const loadSignatures = useCallback(async () => {
    try {
      const res = await fetch("/api/signatures");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSignatures(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSignatures(); }, [loadSignatures]);

  async function handleToggleSigActive(sig: Signature) {
    try {
      await fetch("/api/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sig.id, is_active: !sig.is_active }),
      });
    } catch { /* ignore */ }
    await loadSignatures();
  }

  async function handleDeleteSig(id: string) {
    try {
      await fetch(`/api/signatures?id=${id}`, { method: "DELETE" });
    } catch { /* ignore */ }
    await loadSignatures();
  }

  async function handleSaveSig() {
    if (!sigLabel.trim() || !sigBody.trim()) return;
    setSavingSig(true);
    try {
      if (editingSig) {
        await fetch("/api/signatures", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingSig.id, label: sigLabel, body: sigBody }),
        });
      } else {
        await fetch("/api/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: sigLabel, body: sigBody }),
        });
      }
      setSigLabel(""); setSigBody(""); setShowAddSig(false); setEditingSig(null);
      await loadSignatures();
    } catch { /* ignore */ }
    setSavingSig(false);
  }

  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  async function handleLogout() {
    localStorage.removeItem("radiogenai_draft");
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "Doctor";
  const initials = userName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const isOrgUser = !!orgInfo?.isMember;
  const hasActiveSig = signatures.some((s) => s.is_active);

  const rPct = subReportsLimit > 0 ? Math.round((subReportsUsed / subReportsLimit) * 100) : 0;
  const dPct = subDictLimitMin > 0 ? Math.round((subDictUsedMin / subDictLimitMin) * 100) : 0;

  const mainContent = (
    <>
      <div className={activeView === "dashboard" ? "" : "hidden"}>{children}</div>
      <div className={activeView === "templates" ? "max-w-4xl mx-auto" : "hidden"}><TemplatesTab /></div>
      <div className={activeView === "calculators" ? "max-w-4xl mx-auto" : "hidden"}><CalculatorsTab /></div>
      <div className={activeView === "recommendations" ? "max-w-4xl mx-auto" : "hidden"}><RecommendationsTab /></div>
      <div className={activeView === "account" ? "max-w-2xl mx-auto" : "hidden"}><AccountTab /></div>
    </>
  );

  return (
    <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden bg-[hsl(var(--background))]">
      {/* ── Desktop left rail ── */}
      <aside className="hidden md:flex w-14 bg-gray-900 dark:bg-black flex-col items-center py-4 gap-3 border-r border-gray-800 shrink-0">
        <Logo size="sm" variant="icon" />
        <Separator className="bg-gray-800 w-8" />

        <Button variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "dashboard" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("dashboard")} title={t("nav.reports")}>
          <LayoutDashboard className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "templates" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("templates")} title={t("nav.templates")}>
          <FileText className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "calculators" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("calculators")} title={t("nav.calculators")}>
          <Calculator className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "recommendations" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("recommendations")} title={t("nav.recommendations")}>
          <ClipboardList className="h-5 w-5" />
        </Button>
        {!isOrgUser && (
          <Button variant="ghost" size="icon"
            className={`rounded-lg h-9 w-9 ${activeView === "account" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
            onClick={() => setActiveView("account")} title={t("nav.account")}>
            <UserIcon className="h-5 w-5" />
          </Button>
        )}
        {role === "admin" && (
          <Link href="/admin" className="inline-flex items-center justify-center text-amber-500 hover:bg-gray-800 hover:text-amber-300 rounded-lg h-9 w-9 transition-colors" title={t("nav.admin")}>
            <Shield className="h-5 w-5" />
          </Link>
        )}
        {orgInfo?.isChief && (
          <Link href="/org" className="inline-flex items-center justify-center text-blue-400 hover:bg-gray-800 hover:text-blue-300 rounded-lg h-9 w-9 transition-colors" title={t("nav.hospital")}>
            <Building2 className="h-5 w-5" />
          </Link>
        )}
        <div className="flex-1" />
        {orgInfo?.isMember && (
          <Link href="/support" className="inline-flex items-center justify-center text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9 transition-colors" title={t("nav.support")}>
            <MessageSquare className="h-4.5 w-4.5" />
          </Link>
        )}
        <HelpDialog />
        <Separator className="bg-gray-800 w-8" />
        <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-gray-800" title={userName}>
          {initials}
        </div>
        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-red-400 rounded-lg h-9 w-9" onClick={handleLogout} title={t("nav.sign_out")}>
          <LogOut className="h-4.5 w-4.5" />
        </Button>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {/* ── Header bar ── */}
        <header className="sticky top-0 z-10 bg-[hsl(var(--card)/0.9)] backdrop-blur-xl border-b border-[hsl(var(--border))]">
          <div className="max-w-6xl mx-auto px-4 md:px-6 h-11 flex items-center gap-5">
            {/* Left: logo (mobile) / usage stats */}
            <div className="flex items-center gap-2 md:hidden flex-shrink-0">
              <Logo size="sm" variant="icon" />
            </div>

            {/* Usage stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className={`text-xs tabular-nums ${rPct >= 90 ? "text-red-500" : rPct >= 70 ? "text-amber-500" : "text-[hsl(var(--foreground))]"}`}>
                <FileText className="inline h-3 w-3 mr-1 opacity-40" />
                <span className="font-semibold">{subReportsUsed}</span>
                <span className="opacity-40">/{subReportsLimit}</span>
              </span>
              <span className={`text-xs tabular-nums ${dPct >= 90 ? "text-red-500" : dPct >= 70 ? "text-amber-500" : "text-[hsl(var(--foreground))]"}`}>
                <Mic className="inline h-3 w-3 mr-1 opacity-40" />
                <span className="font-semibold">{subDictUsedMin}</span>
                <span className="opacity-40">/{subDictLimitMin}m</span>
              </span>
            </div>

            <div className="flex-1" />

            {/* Right: controls (desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <ThemePicker />

              <button
                type="button"
                onClick={() => setSigDialogOpen(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  hasActiveSig
                    ? "text-[hsl(var(--foreground))] bg-[hsl(var(--muted))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                }`}
                title={t("sig.title")}
              >
                <PenLine className="h-3.5 w-3.5" />
                {hasActiveSig && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
              </button>

              <LanguagePicker
                lang={prefs.uiLanguage}
                onLangChange={handleLanguageChange}
              />
            </div>

            {/* Mobile: settings trigger */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden flex items-center gap-2.5 flex-shrink-0"
            >
              <ThemePickerStatic />
              <PenLine className={`h-3.5 w-3.5 ${hasActiveSig ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))]"}`} />
            </button>
          </div>
        </header>

        <div className="p-3 md:p-6 max-w-6xl mx-auto">{mainContent}</div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[hsl(var(--card)/0.95)] backdrop-blur-xl border-t border-[hsl(var(--border))] safe-area-bottom">
        <div className="flex items-center h-14 px-1 overflow-x-auto scrollbar-hide">
          {([
            { key: "dashboard" as ActiveView, icon: LayoutDashboard, label: t("nav.reports") },
            { key: "templates" as ActiveView, icon: FileText, label: t("nav.templates") },
            { key: "calculators" as ActiveView, icon: Calculator, label: t("nav.calculators") },
            { key: "recommendations" as ActiveView, icon: ClipboardList, label: t("nav.recommendations") },
          ] as const).map((item) => (
            <button
              key={item.key}
              className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === item.key ? "text-brand" : "text-gray-500"}`}
              onClick={() => setActiveView(item.key)}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{item.label}</span>
            </button>
          ))}
          {!isOrgUser && (
            <button
              className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === "account" ? "text-brand" : "text-gray-500"}`}
              onClick={() => setActiveView("account")}
            >
              <UserIcon className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{t("nav.account")}</span>
            </button>
          )}
          {role === "admin" && (
            <Link href="/admin" className="flex flex-col items-center shrink-0 gap-0.5 text-amber-500 py-1.5 px-2 min-w-[48px]">
              <Shield className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{t("nav.admin")}</span>
            </Link>
          )}
          {orgInfo?.isChief && (
            <Link href="/org" className="flex flex-col items-center shrink-0 gap-0.5 text-blue-400 py-1.5 px-2 min-w-[48px]">
              <Building2 className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{t("nav.hospital")}</span>
            </Link>
          )}
          <button className="flex flex-col items-center shrink-0 gap-0.5 text-gray-500 py-1.5 px-2 min-w-[48px]" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="text-[9px] leading-tight">{t("nav.sign_out")}</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer ── */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[85vw] max-w-[340px] bg-[hsl(var(--card))] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
              <span className="text-sm font-semibold">{t("nav.config")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Theme */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">{t("app.skin")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {SKINS.map((skin) => {
                    const active = prefs.skin === skin.id;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        onClick={() => update({ skin: skin.id })}
                        className={`relative rounded-lg border-2 transition-all overflow-hidden ${
                          active ? "border-current shadow-md scale-[1.02]" : "border-[hsl(var(--border))] hover:scale-[1.02]"
                        }`}
                        style={active ? { borderColor: skin.preview.primary } : undefined}
                      >
                        <div className="p-1.5" style={{ backgroundColor: skin.preview.bg }}>
                          <div className="rounded-md p-1.5 mb-1" style={{ backgroundColor: skin.preview.card, border: `1px solid ${skin.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}` }}>
                            <div className="h-1 w-8 rounded-full mb-1" style={{ backgroundColor: skin.preview.primary }} />
                            <div className="h-1 w-full rounded-full" style={{ backgroundColor: skin.preview.fg, opacity: 0.15 }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Signature */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">{t("sig.title")}</p>
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => { setSigDialogOpen(true); setMobileDrawerOpen(false); }}>
                  <PenLine className="h-3 w-3" />
                  {t("sig.title")}
                  {hasActiveSig && <span className="h-1.5 w-1.5 rounded-full bg-green-500 ml-auto" />}
                </Button>
              </div>

              {/* Language (platform + reports unified) */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-3">{t("app.language")}</p>
                <div className="flex rounded-md overflow-hidden border border-[hsl(var(--border))]">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => handleLanguageChange(l.value)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                        prefs.uiLanguage === l.value
                          ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"
                      }`}
                    >
                      {l.value.toUpperCase()}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] leading-snug mt-2">{t("app.language_hint")}</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── Signature dialog ── */}
      <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              {t("sig.title")}
            </DialogTitle>
          </DialogHeader>

          {signatures.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{t("sig.no_signatures")}</p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">{t("sig.no_signatures_hint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto -mx-6 px-6">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className={`p-2.5 rounded-lg border transition-colors ${
                    sig.is_active
                      ? "border-green-500/30 bg-green-50 dark:bg-green-900/10"
                      : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSigActive(sig)}
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        sig.is_active ? "border-green-500 bg-green-500" : "border-gray-300 dark:border-gray-600 hover:border-green-400"
                      }`}
                    >
                      {sig.is_active && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium block truncate">{sig.label}</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] block truncate">{sig.body.split("\n")[0]}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-brand"
                        onClick={() => { setEditingSig(sig); setSigLabel(sig.label); setSigBody(sig.body); setShowAddSig(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-[hsl(var(--muted-foreground))] hover:text-red-500"
                        onClick={() => { if (confirm(t("sig.confirm_delete"))) handleDeleteSig(sig.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-2"
            onClick={() => { setEditingSig(null); setSigLabel(""); setSigBody(""); setShowAddSig(true); }}>
            <Plus className="h-3 w-3" />
            {t("sig.add")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ── Signature add/edit dialog ── */}
      <Dialog open={showAddSig} onOpenChange={(v) => { setShowAddSig(v); if (!v) setEditingSig(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSig ? t("edit") : t("sig.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.label")}</Label>
              <Input value={sigLabel} onChange={(e) => setSigLabel(e.target.value)} placeholder={t("sig.label_placeholder")} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.body")}</Label>
              <textarea value={sigBody} onChange={(e) => setSigBody(e.target.value)} placeholder={t("sig.body_placeholder")} rows={4}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-[hsl(var(--background))] border-[hsl(var(--border))] resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]/50" />
            </div>
            {sigBody.trim() && (
              <div className="p-2.5 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
                <pre className="text-xs text-[hsl(var(--foreground))] whitespace-pre-wrap font-sans">{sigBody}</pre>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAddSig(false); setEditingSig(null); }}>{t("cancel")}</Button>
              <Button size="sm" onClick={handleSaveSig} disabled={savingSig || !sigLabel.trim() || !sigBody.trim()}>
                {savingSig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ThemePickerStatic() {
  const { skin: activeSkin } = useUIPrefs();
  return (
    <span
      className="h-5 w-5 rounded-full ring-2 ring-[hsl(var(--border))] flex-shrink-0"
      style={{ backgroundColor: activeSkin.preview.primary }}
    />
  );
}

export function DashboardShell({ children, user, role = "radiologist" }: { children: React.ReactNode; user: User; role?: string }) {
  return (
    <UIPrefsProvider>
      <DashboardShellInner user={user} role={role}>
        {children}
      </DashboardShellInner>
    </UIPrefsProvider>
  );
}
