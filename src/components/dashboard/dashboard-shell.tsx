"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Settings,
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
} from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { CalculatorsTab } from "@/components/sidebar/calculators-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { AccountTab } from "@/components/sidebar/account-tab";
import { HelpDialog } from "@/components/dashboard/help-dialog";
import { UIPrefsProvider, useUIPrefs, SKINS } from "@/lib/ui-prefs";
import type { UILanguage } from "@/lib/ui-prefs";
import { LANGUAGES } from "@/lib/types";
import type { Signature, OutputLanguage } from "@/lib/types";
import { useT } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

type ActiveView = "dashboard" | "templates" | "calculators" | "recommendations" | "account";

function DashboardShellInner({ children, user, role }: { children: React.ReactNode; user: User; role: string }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const { prefs, update, skin: activeSkin } = useUIPrefs();
  const t = useT();

  // Org membership (lightweight check)
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

  // Output language (from model config)
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("es");
  useEffect(() => {
    fetch("/api/model-config")
      .then((r) => r.ok ? r.json() : null)
      .then((cfg) => {
        if (cfg?.output_language) setOutputLanguage(cfg.output_language);
      })
      .catch(() => {});

    const handleConfigChanged = () => {
      fetch("/api/model-config").then((r) => r.ok ? r.json() : null).then((cfg) => {
        if (cfg?.output_language) setOutputLanguage(cfg.output_language);
      }).catch(() => {});
    };
    window.addEventListener("radiogenai:config-changed", handleConfigChanged);
    return () => window.removeEventListener("radiogenai:config-changed", handleConfigChanged);
  }, []);

  function handleOutputLangChange(lang: string) {
    setOutputLanguage(lang as OutputLanguage);
    fetch("/api/model-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ output_language: lang }),
    }).then(() => {
      window.dispatchEvent(new CustomEvent("radiogenai:config-changed"));
    }).catch(() => {});
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

  /* ── Main content based on active view ── */
  const mainContent = (
    <>
      <div className={activeView === "dashboard" ? "" : "hidden"}>
        {children}
      </div>
      <div className={activeView === "templates" ? "max-w-4xl mx-auto" : "hidden"}>
        <TemplatesTab />
      </div>
      <div className={activeView === "calculators" ? "max-w-4xl mx-auto" : "hidden"}>
        <CalculatorsTab />
      </div>
      <div className={activeView === "recommendations" ? "max-w-4xl mx-auto" : "hidden"}>
        <RecommendationsTab />
      </div>
      <div className={activeView === "account" ? "max-w-2xl mx-auto" : "hidden"}>
        <AccountTab />
      </div>
    </>
  );

  /* ── Toolbar content (shared between desktop header and mobile drawer) ── */
  const toolbarContent = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {/* Usage stats */}
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
        <FileText className="h-3.5 w-3.5 text-brand flex-shrink-0" />
        <span className="font-semibold">{subReportsUsed}</span>
        <span className="text-gray-400">/{subReportsLimit}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-300">
        <Mic className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
        <span className="font-semibold">{subDictUsedMin}</span>
        <span className="text-gray-400">/{subDictLimitMin} min</span>
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden md:block" />

      {/* Theme circles */}
      <div className="flex items-center gap-1">
        {SKINS.map((skin) => (
          <button
            key={skin.id}
            type="button"
            onClick={() => update({ skin: skin.id })}
            className={`h-4 w-4 rounded-full border-2 transition-all flex-shrink-0 ${
              prefs.skin === skin.id
                ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 border-white dark:border-gray-900 scale-110"
                : "border-transparent hover:scale-110 opacity-80 hover:opacity-100"
            }`}
            style={{ backgroundColor: skin.preview.primary }}
            title={skin.id}
          />
        ))}
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden md:block" />

      {/* Signature button */}
      <button
        type="button"
        onClick={() => setSigDialogOpen(true)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors ${
          signatures.some((s) => s.is_active)
            ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20"
            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        }`}
        title={t("sig.title")}
      >
        <PenLine className="h-3.5 w-3.5" />
      </button>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden md:block" />

      {/* UI language */}
      <div className="flex items-center gap-0.5">
        {(["es", "en", "pt"] as UILanguage[]).map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => update({ uiLanguage: lang })}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              prefs.uiLanguage === lang
                ? "bg-brand text-white"
                : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden md:block" />

      {/* Report output language */}
      <Select value={outputLanguage} onValueChange={handleOutputLangChange}>
        <SelectTrigger className="h-6 w-[110px] text-[11px] border-gray-200 dark:border-gray-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value} className="text-xs">{l.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden bg-[hsl(var(--background))]">
      {/* Desktop left rail */}
      <aside className="hidden md:flex w-14 bg-gray-900 dark:bg-black flex-col items-center py-4 gap-3 border-r border-gray-800 shrink-0">
        <Logo size="sm" variant="icon" />

        <Separator className="bg-gray-800 w-8" />

        <Button
          variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "dashboard" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("dashboard")}
          title={t("nav.reports")}
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "templates" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("templates")}
          title={t("nav.templates")}
        >
          <FileText className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "calculators" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("calculators")}
          title={t("nav.calculators")}
        >
          <Calculator className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost" size="icon"
          className={`rounded-lg h-9 w-9 ${activeView === "recommendations" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("recommendations")}
          title={t("nav.recommendations")}
        >
          <ClipboardList className="h-5 w-5" />
        </Button>

        {!isOrgUser && (
          <Button
            variant="ghost" size="icon"
            className={`rounded-lg h-9 w-9 ${activeView === "account" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
            onClick={() => setActiveView("account")}
            title={t("nav.account")}
          >
            <UserIcon className="h-5 w-5" />
          </Button>
        )}

        {role === "admin" && (
          <Link
            href="/admin"
            className="inline-flex items-center justify-center text-amber-500 hover:bg-gray-800 hover:text-amber-300 rounded-lg h-9 w-9 transition-colors"
            title={t("nav.admin")}
          >
            <Shield className="h-5 w-5" />
          </Link>
        )}

        {orgInfo?.isChief && (
          <Link
            href="/org"
            className="inline-flex items-center justify-center text-blue-400 hover:bg-gray-800 hover:text-blue-300 rounded-lg h-9 w-9 transition-colors"
            title={t("nav.hospital")}
          >
            <Building2 className="h-5 w-5" />
          </Link>
        )}

        <div className="flex-1" />

        {orgInfo?.isMember && (
          <Link
            href="/support"
            className="inline-flex items-center justify-center text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9 transition-colors"
            title={t("nav.support")}
          >
            <MessageSquare className="h-4.5 w-4.5" />
          </Link>
        )}

        <HelpDialog />

        <Separator className="bg-gray-800 w-8" />

        <div
          className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-gray-800"
          title={userName}
        >
          {initials}
        </div>

        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-red-400 rounded-lg h-9 w-9" onClick={handleLogout} title={t("nav.sign_out")}>
          <LogOut className="h-4.5 w-4.5" />
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {/* Header with inline toolbar */}
        <header className="sticky top-0 z-10 bg-[hsl(var(--card)/0.85)] backdrop-blur-xl border-b border-[hsl(var(--border))]">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-2 md:py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
              <Logo size="sm" variant="icon" className="md:hidden" />
              <div className="min-w-0">
                <Logo size="sm" className="hidden md:inline-flex" />
                <h1 className="md:hidden text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">
                  <span className="text-gray-900 dark:text-white">Radiogen</span>
                  <span className="text-violet-600 dark:text-violet-400">.AI</span>
                </h1>
                <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {userName}
                </p>
              </div>
            </div>

            {/* Desktop inline toolbar */}
            <div className="hidden md:flex items-center">
              {toolbarContent}
            </div>

            {/* Mobile settings button */}
            <Button variant="outline" size="sm" onClick={() => setMobileDrawerOpen(true)} className="gap-1.5 text-xs md:hidden h-8 flex-shrink-0">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </header>

        <div className="p-3 md:p-6 max-w-6xl mx-auto">{mainContent}</div>
      </main>

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[hsl(var(--card)/0.95)] backdrop-blur-xl border-t border-[hsl(var(--border))] safe-area-bottom">
        <div className="flex items-center h-14 px-1 overflow-x-auto scrollbar-hide">
          <button
            className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === "dashboard" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("dashboard")}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[9px] font-medium leading-tight">{t("nav.reports")}</span>
          </button>

          <button
            className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === "templates" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("templates")}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[9px] leading-tight">{t("nav.templates")}</span>
          </button>

          <button
            className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === "calculators" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("calculators")}
          >
            <Calculator className="h-5 w-5" />
            <span className="text-[9px] leading-tight">{t("nav.calculators")}</span>
          </button>

          <button
            className={`flex flex-col items-center shrink-0 gap-0.5 py-1.5 px-2 min-w-[48px] ${activeView === "recommendations" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("recommendations")}
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-[9px] leading-tight">{t("nav.recommendations")}</span>
          </button>

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
            <Link
              href="/admin"
              className="flex flex-col items-center shrink-0 gap-0.5 text-amber-500 py-1.5 px-2 min-w-[48px]"
            >
              <Shield className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{t("nav.admin")}</span>
            </Link>
          )}

          {orgInfo?.isChief && (
            <Link
              href="/org"
              className="flex flex-col items-center shrink-0 gap-0.5 text-blue-400 py-1.5 px-2 min-w-[48px]"
            >
              <Building2 className="h-5 w-5" />
              <span className="text-[9px] leading-tight">{t("nav.hospital")}</span>
            </Link>
          )}

          <button
            className="flex flex-col items-center shrink-0 gap-0.5 text-gray-500 py-1.5 px-2 min-w-[48px]"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[9px] leading-tight">{t("nav.sign_out")}</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer (toolbar controls) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-[85vw] max-w-[380px] bg-[hsl(var(--card))] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("nav.config")}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Usage */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("stats.this_month")}</p>
                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                  <FileText className="h-3.5 w-3.5 text-brand" />
                  <span className="font-semibold">{subReportsUsed}/{subReportsLimit}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200">
                  <Mic className="h-3.5 w-3.5 text-violet-500" />
                  <span className="font-semibold">{subDictUsedMin}/{subDictLimitMin} min</span>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("app.skin")}</p>
                <div className="flex flex-wrap gap-2">
                  {SKINS.map((skin) => (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => update({ skin: skin.id })}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        prefs.skin === skin.id
                          ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 border-white dark:border-gray-900 scale-110"
                          : "border-transparent hover:scale-110 opacity-80 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: skin.preview.primary }}
                      title={skin.id}
                    />
                  ))}
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("sig.title")}</p>
                <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => { setSigDialogOpen(true); setMobileDrawerOpen(false); }}>
                  <PenLine className="h-3 w-3" />
                  {t("sig.title")}
                </Button>
              </div>

              {/* UI language */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("app.ui_language")}</p>
                <div className="flex gap-1">
                  {(["es", "en", "pt"] as UILanguage[]).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => update({ uiLanguage: lang })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        prefs.uiLanguage === lang
                          ? "bg-brand text-white"
                          : "text-gray-500 bg-gray-100 dark:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output language */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{t("cfg.output_language")}</p>
                <Select value={outputLanguage} onValueChange={handleOutputLangChange}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Signature management dialog */}
      <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-blue-500" />
              {t("sig.title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t("sig.desc")}</p>

          {signatures.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">{t("sig.no_signatures")}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{t("sig.no_signatures_hint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className={`p-2 rounded-lg border transition-colors ${
                    sig.is_active
                      ? "border-violet-500/40 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSigActive(sig)}
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        sig.is_active
                          ? "border-violet-500 bg-violet-500"
                          : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
                      }`}
                      title={sig.is_active ? t("sig.active") : t("sig.set_active")}
                    >
                      {sig.is_active && <Check className="h-2.5 w-2.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">{sig.label}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">{sig.body.split("\n")[0]}</span>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-brand"
                        onClick={() => { setEditingSig(sig); setSigLabel(sig.label); setSigBody(sig.body); setShowAddSig(true); }}
                        title={t("edit")}
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-red-500"
                        onClick={() => { if (confirm(t("sig.confirm_delete"))) handleDeleteSig(sig.id); }}
                        title={t("delete")}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            size="sm" variant="outline" className="w-full text-xs gap-1.5"
            onClick={() => { setEditingSig(null); setSigLabel(""); setSigBody(""); setShowAddSig(true); }}
          >
            <Plus className="h-3 w-3" />
            {t("sig.add")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Signature add/edit dialog */}
      <Dialog open={showAddSig} onOpenChange={(v) => { setShowAddSig(v); if (!v) setEditingSig(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSig ? t("edit") : t("sig.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.label")}</Label>
              <Input
                value={sigLabel}
                onChange={(e) => setSigLabel(e.target.value)}
                placeholder={t("sig.label_placeholder")}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.body")}</Label>
              <textarea
                value={sigBody}
                onChange={(e) => setSigBody(e.target.value)}
                placeholder={t("sig.body_placeholder")}
                rows={4}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
            {sigBody.trim() && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-gray-400">{t("sig.preview")}</Label>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans">{sigBody}</pre>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAddSig(false); setEditingSig(null); }}>
                {t("cancel")}
              </Button>
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

export function DashboardShell({ children, user, role = "radiologist" }: { children: React.ReactNode; user: User; role?: string }) {
  return (
    <UIPrefsProvider>
      <DashboardShellInner user={user} role={role}>
        {children}
      </DashboardShellInner>
    </UIPrefsProvider>
  );
}
