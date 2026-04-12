"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Stethoscope,
  LogOut,
  LayoutDashboard,
  PanelRightOpen,
  PanelRightClose,
  Moon,
  Sun,
  FileText,
  BookOpen,
  Cpu,
} from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { ModelConfigTab } from "@/components/sidebar/model-config-tab";
import type { User } from "@supabase/supabase-js";

export function DashboardShell({ children, user }: { children: React.ReactNode; user: User }) {
  const router = useRouter();
  const [rightOpen, setRightOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Ensure templates are seeded (fallback if registration seeding failed)
  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  // Restore persisted UI preferences
  useEffect(() => {
    const dark = localStorage.getItem("radiogenia_dark") === "1";
    if (dark) {
      document.documentElement.classList.add("dark");
      setDarkMode(true);
    }
    const savedRightOpen = localStorage.getItem("radiogenia_panel");
    if (savedRightOpen !== null) setRightOpen(savedRightOpen === "1");
  }, []);

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
    localStorage.setItem("radiogenia_dark", next ? "1" : "0");
  }

  function togglePanel() {
    const next = !rightOpen;
    setRightOpen(next);
    localStorage.setItem("radiogenia_panel", next ? "1" : "0");
  }

  const userName = user.user_metadata?.name || user.email?.split("@")[0] || "Doctor";
  const initials = userName
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Left rail */}
      <aside className="w-16 bg-gray-900 dark:bg-black flex flex-col items-center py-4 gap-3 border-r border-gray-800">
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
        </div>

        <Separator className="bg-gray-800 w-8" />

        <Button
          variant="ghost"
          size="icon"
          className="text-blue-400 hover:bg-gray-800 hover:text-blue-300 rounded-lg"
          title="Dashboard"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Button>

        <div className="flex-1" />

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg"
          onClick={toggleDark}
          title="Toggle theme"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg"
          onClick={togglePanel}
          title={rightOpen ? "Hide side panel" : "Show side panel"}
        >
          {rightOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
        </Button>

        <Separator className="bg-gray-800 w-8" />

        <div
          className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-gray-800"
          title={userName}
        >
          {initials}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-gray-500 hover:bg-gray-800 hover:text-red-400 rounded-lg"
          onClick={handleLogout}
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top header */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Radiogenia
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                AI radiology reporting · {userName}
              </p>
            </div>
            {!rightOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePanel}
                className="gap-1.5 text-xs"
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                Open panel
              </Button>
            )}
          </div>
        </header>

        <div className="p-6 max-w-6xl mx-auto">{children}</div>
      </main>

      {/* Right sidebar */}
      {rightOpen && (
        <aside className="w-80 min-w-0 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
          <Tabs defaultValue="templates" className="flex-1 flex flex-col">
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 dark:border-gray-800">
              <TabsList className="grid w-full grid-cols-3 h-9">
                <TabsTrigger value="templates" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Templates
                </TabsTrigger>
                <TabsTrigger value="recommendations" className="text-xs gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Guidelines
                </TabsTrigger>
                <TabsTrigger value="model" className="text-xs gap-1.5">
                  <Cpu className="h-3.5 w-3.5" />
                  AI model
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
            </ScrollArea>
          </Tabs>
        </aside>
      )}
    </div>
  );
}
