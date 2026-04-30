"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import {
  LogOut,
  LayoutDashboard,
  PanelRightOpen,
  PanelRightClose,
  PanelLeftOpen,
  PanelLeftClose,
  Moon,
  Sun,
  FileText,
  BookOpen,
  Settings,
  Shield,
  X,
  Menu,
  Building2,
  MessageSquare,
} from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { ModelConfigTab } from "@/components/sidebar/model-config-tab";
import { AppearanceTab } from "@/components/sidebar/appearance-tab";
import { HelpDialog } from "@/components/dashboard/help-dialog";
import { UIPrefsProvider, useUIPrefs } from "@/lib/ui-prefs";
import { useT } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

type ActiveView = "dashboard" | "templates" | "recommendations";

const PANEL_MIN = 240;
const PANEL_MAX = 600;
const PANEL_DEFAULT = 320;

function DashboardShellInner({ children, user, role }: { children: React.ReactNode; user: User; role: string }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const dragging = useRef(false);
  const { prefs, preset } = useUIPrefs();
  const t = useT();

  // Org membership (lightweight check)
  const [orgInfo, setOrgInfo] = useState<{ isChief: boolean; isMember: boolean } | null>(null);
  useEffect(() => {
    fetch("/api/org", { cache: "no-store" }).then((r) => r.ok ? r.json() : null).then((data) => {
      if (data?.membership) {
        setOrgInfo({
          isChief: data.membership.is_org_chief || data.membership.section_role === "section_chief",
          isMember: true,
        });
      } else {
        setOrgInfo({ isChief: false, isMember: false });
      }
    }).catch(() => setOrgInfo({ isChief: false, isMember: false }));
  }, []);

  useEffect(() => {
    const dark = localStorage.getItem("radiogenai_dark") === "1";
    if (dark) {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
    const saved = localStorage.getItem("radiogenai_panel");
    if (saved !== null) setPanelOpen(saved === "1");
    const savedWidth = localStorage.getItem("radiogenai_panel_width");
    if (savedWidth) setPanelWidth(Math.max(PANEL_MIN, Math.min(PANEL_MAX, Number(savedWidth))));
  }, []);

  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileDrawerOpen]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const side = prefs.panelSide;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = side === "right"
        ? window.innerWidth - ev.clientX
        : ev.clientX - 56;
      const clamped = Math.max(PANEL_MIN, Math.min(PANEL_MAX, newWidth));
      setPanelWidth(clamped);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setPanelWidth((w) => {
        localStorage.setItem("radiogenai_panel_width", String(w));
        return w;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [prefs.panelSide]);

  async function handleLogout() {
    const supabase = createClient();
    localStorage.removeItem("radiogenai_draft");
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  function toggleDark() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("radiogenai_dark", next ? "1" : "0");
  }

  function togglePanel() {
    const next = !panelOpen;
    setPanelOpen(next);
    localStorage.setItem("radiogenai_panel", next ? "1" : "0");
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "Doctor";
  const initials = userName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const panelSide = prefs.panelSide;

  const PanelOpenIcon = panelSide === "right" ? PanelRightOpen : PanelLeftOpen;
  const PanelCloseIcon = panelSide === "right" ? PanelRightClose : PanelLeftClose;

  /* ── Resize handle (desktop only) ───────────────────────── */
  const resizeHandle = (
    <div
      onMouseDown={onDragStart}
      className="w-1.5 shrink-0 cursor-col-resize group relative bg-brand-soft-hover transition-colors hidden md:block"
      title="Drag to resize"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200 dark:bg-gray-700 transition-colors" />
    </div>
  );

  /* ── Sidebar config panel (merged Appearance + AI Config) ── */
  const sidebarContent = (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" />
            {t("nav.config")}
          </h3>
          <ModelConfigTab />
        </div>
        <Separator />
        <AppearanceTab />
      </div>
    </ScrollArea>
  );

  /* ── Desktop sidebar panel ────────────────────────────────── */
  const showSidebar = panelOpen && activeView === "dashboard";
  const desktopSidebarPanel = showSidebar && (
    <aside
      className="hidden md:flex shrink-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-col overflow-y-auto overflow-x-hidden"
      style={{
        width: panelWidth,
        [panelSide === "right" ? "borderLeftWidth" : "borderRightWidth"]: "1px",
      }}
    >
      {sidebarContent}
    </aside>
  );

  /* ── Mobile drawer overlay (config only) ─────────────────── */
  const mobileDrawer = mobileDrawerOpen && (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setMobileDrawerOpen(false)}
      />
      <aside className="absolute inset-y-0 right-0 w-[85vw] max-w-[380px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("nav.config")}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileDrawerOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {sidebarContent}
        </div>
      </aside>
    </div>
  );

  /* ── Top navigation tabs ── */
  const topTabs: { key: ActiveView; label: string; icon: React.ReactNode }[] = [
    { key: "dashboard", label: t("nav.reports"), icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "templates", label: t("nav.templates"), icon: <FileText className="h-4 w-4" /> },
    { key: "recommendations", label: t("nav.guidelines"), icon: <BookOpen className="h-4 w-4" /> },
  ];

  /* ── Main content based on active view ── */
  const mainContent = (
    <>
      <div className={activeView === "dashboard" ? "" : "hidden"}>
        {children}
      </div>
      <div className={activeView === "templates" ? "max-w-4xl mx-auto" : "hidden"}>
        <TemplatesTab />
      </div>
      <div className={activeView === "recommendations" ? "max-w-4xl mx-auto" : "hidden"}>
        <RecommendationsTab />
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden bg-gray-50 dark:bg-gray-950">
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
          className={`rounded-lg h-9 w-9 ${activeView === "recommendations" ? "text-brand bg-gray-800" : "text-gray-500 hover:bg-gray-800 hover:text-white"}`}
          onClick={() => setActiveView("recommendations")}
          title={t("nav.guidelines")}
        >
          <BookOpen className="h-5 w-5" />
        </Button>

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
            title="Hospital"
          >
            <Building2 className="h-5 w-5" />
          </Link>
        )}

        <div className="flex-1" />

        {orgInfo?.isMember && (
          <Link
            href="/support"
            className="inline-flex items-center justify-center text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9 transition-colors"
            title="Soporte"
          >
            <MessageSquare className="h-4.5 w-4.5" />
          </Link>
        )}

        <HelpDialog />

        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" onClick={toggleDark} title={t("nav.toggle_theme")}>
          {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        {activeView === "dashboard" && (
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" onClick={togglePanel}
            title={panelOpen ? t("nav.hide_panel") : t("nav.show_panel")}
          >
            {panelOpen ? <PanelCloseIcon className="h-4.5 w-4.5" /> : <PanelOpenIcon className="h-4.5 w-4.5" />}
          </Button>
        )}

        <Separator className="bg-gray-800 w-8" />

        <div
          className={`h-8 w-8 rounded-full bg-gradient-to-br ${preset.gradient[0]} ${preset.gradient[1]} flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-gray-800`}
          title={userName}
        >
          {initials}
        </div>

        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-red-400 rounded-lg h-9 w-9" onClick={handleLogout} title={t("nav.sign_out")}>
          <LogOut className="h-4.5 w-4.5" />
        </Button>
      </aside>

      {/* Desktop panel on the left (if configured) */}
      {panelSide === "left" && desktopSidebarPanel}
      {panelSide === "left" && showSidebar && resizeHandle}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
        {/* Header with top tabs */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-2.5 md:py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size="sm" variant="icon" className="md:hidden" />
              <div className="min-w-0">
                <Logo size="sm" className="hidden md:inline-flex" />
                <h1 className="md:hidden text-base font-bold tracking-tight text-gray-900 dark:text-white truncate">
                  <span className="text-[#1E3A5F] dark:text-white">Radiogen</span>
                  <span className="text-teal-600 dark:text-teal-400">.AI</span>
                </h1>
                <p className="text-[10px] md:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {userName}
                </p>
              </div>
            </div>

            {/* Desktop top tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {topTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveView(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    activeView === tab.key
                      ? "bg-white dark:bg-gray-900 text-brand shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {activeView === "dashboard" && !panelOpen && (
                <Button variant="outline" size="sm" onClick={togglePanel} className="gap-1.5 text-xs hidden md:flex">
                  <PanelOpenIcon className="h-3.5 w-3.5" />
                  {t("nav.config")}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggleDark} className="h-8 w-8 md:hidden text-gray-500">
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMobileDrawerOpen(true)} className="gap-1.5 text-xs md:hidden h-8">
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-3 md:p-6 max-w-6xl mx-auto">{mainContent}</div>
      </main>

      {/* Desktop panel on the right (if configured) */}
      {panelSide === "right" && showSidebar && resizeHandle}
      {panelSide === "right" && desktopSidebarPanel}

      {/* ── Mobile bottom navigation ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-2">
          <button
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] ${activeView === "dashboard" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("dashboard")}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[9px] font-medium">{t("nav.reports")}</span>
          </button>

          <button
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] ${activeView === "templates" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("templates")}
          >
            <FileText className="h-5 w-5" />
            <span className="text-[9px]">{t("nav.templates")}</span>
          </button>

          <button
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 min-w-[56px] ${activeView === "recommendations" ? "text-brand" : "text-gray-500"}`}
            onClick={() => setActiveView("recommendations")}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[9px]">{t("nav.guidelines")}</span>
          </button>

          <button
            className="flex flex-col items-center gap-0.5 text-gray-500 py-1.5 px-3 min-w-[56px]"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px]">{t("nav.config")}</span>
          </button>

          {role === "admin" && (
            <Link
              href="/admin"
              className="flex flex-col items-center gap-0.5 text-amber-500 py-1.5 px-3 min-w-[56px]"
            >
              <Shield className="h-5 w-5" />
              <span className="text-[9px]">Admin</span>
            </Link>
          )}

          {orgInfo?.isChief && (
            <Link
              href="/org"
              className="flex flex-col items-center gap-0.5 text-blue-400 py-1.5 px-3 min-w-[56px]"
            >
              <Building2 className="h-5 w-5" />
              <span className="text-[9px]">Hospital</span>
            </Link>
          )}

          <button
            className="flex flex-col items-center gap-0.5 text-gray-500 py-1.5 px-3 min-w-[56px]"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[9px]">{t("nav.sign_out")}</span>
          </button>
        </div>
      </nav>

      {/* Mobile drawer (config only) */}
      {mobileDrawer}
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
