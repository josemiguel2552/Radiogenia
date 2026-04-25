"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Zap,
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
  Cpu,
  Palette,
  Shield,
} from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { ModelConfigTab } from "@/components/sidebar/model-config-tab";
import { AppearanceTab } from "@/components/sidebar/appearance-tab";
import { UIPrefsProvider, useUIPrefs } from "@/lib/ui-prefs";
import { useT } from "@/lib/i18n";
import type { User } from "@supabase/supabase-js";

const PANEL_MIN = 240;
const PANEL_MAX = 600;
const PANEL_DEFAULT = 320;

function DashboardShellInner({ children, user, role }: { children: React.ReactNode; user: User; role: string }) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT);
  const dragging = useRef(false);
  const { prefs, preset } = useUIPrefs();
  const t = useT();

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
        : ev.clientX - 56; // 56 = left rail width
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

  /* ── Resize handle ───────────────────────────────────────── */
  const resizeHandle = (
    <div
      onMouseDown={onDragStart}
      className="w-1.5 shrink-0 cursor-col-resize group relative bg-accent-soft-hover transition-colors"
      title="Drag to resize"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-200 dark:bg-gray-700 transition-colors" />
    </div>
  );

  /* ── Sidebar panel ─────────────────────────────────────── */
  const sidebarPanel = panelOpen && (
    <aside
      className="min-w-0 shrink-0 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden"
      style={{
        width: panelWidth,
        [panelSide === "right" ? "borderLeftWidth" : "borderRightWidth"]: "1px",
      }}
    >
      <Tabs defaultValue="templates" className="flex-1 flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="templates" className="text-[10px] gap-1 px-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tab.templates")}</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="text-[10px] gap-1 px-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tab.guidelines")}</span>
            </TabsTrigger>
            <TabsTrigger value="model" className="text-[10px] gap-1 px-1">
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tab.config")}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-[10px] gap-1 px-1">
              <Palette className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("tab.appearance")}</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <ScrollArea className="flex-1">
          <TabsContent value="templates" className="p-4 mt-0">
            <TemplatesTab />
          </TabsContent>
          <TabsContent value="recommendations" className="p-4 mt-0">
            <RecommendationsTab />
          </TabsContent>
          <TabsContent value="model" className="p-4 mt-0">
            <ModelConfigTab />
          </TabsContent>
          <TabsContent value="appearance" className="p-4 mt-0">
            <AppearanceTab />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );

  return (
    <div className="flex h-screen w-screen max-w-[100vw] overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Left rail */}
      <aside className="w-14 bg-gray-900 dark:bg-black flex flex-col items-center py-4 gap-3 border-r border-gray-800 shrink-0">
        <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${preset.gradient[0]} ${preset.gradient[1]} flex items-center justify-center shadow-lg`}>
          <Zap className="h-4.5 w-4.5 text-white" />
        </div>

        <Separator className="bg-gray-800 w-8" />

        <Button variant="ghost" size="icon" className="text-accent hover:bg-gray-800 hover:text-white rounded-lg h-9 w-9" title={t("nav.dashboard")}
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>

        {role === "admin" && (
          <Button
            variant="ghost"
            size="icon"
            className="text-amber-500 hover:bg-gray-800 hover:text-amber-300 rounded-lg h-9 w-9"
            title={t("nav.admin")}
            onClick={() => router.push("/admin")}
          >
            <Shield className="h-5 w-5" />
          </Button>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" onClick={toggleDark} title={t("nav.toggle_theme")}>
          {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>

        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" onClick={togglePanel}
          title={panelOpen ? t("nav.hide_panel") : t("nav.show_panel")}
        >
          {panelOpen ? <PanelCloseIcon className="h-4.5 w-4.5" /> : <PanelOpenIcon className="h-4.5 w-4.5" />}
        </Button>

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

      {/* Panel on the left (if configured) */}
      {panelSide === "left" && sidebarPanel}
      {panelSide === "left" && panelOpen && resizeHandle}

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Radiogen.ai
              </h1>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t("dash.subtitle")} · {userName}
              </p>
            </div>
            {!panelOpen && (
              <Button variant="outline" size="sm" onClick={togglePanel} className="gap-1.5 text-xs">
                <PanelOpenIcon className="h-3.5 w-3.5" />
                {t("nav.tools")}
              </Button>
            )}
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Panel on the right (if configured) */}
      {panelSide === "right" && panelOpen && resizeHandle}
      {panelSide === "right" && sidebarPanel}
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
