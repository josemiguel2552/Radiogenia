"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, LogOut, LayoutDashboard, PanelRightOpen, PanelRightClose, Moon, Sun } from "lucide-react";
import { TemplatesTab } from "@/components/sidebar/templates-tab";
import { RecommendationsTab } from "@/components/sidebar/recommendations-tab";
import { ModelConfigTab } from "@/components/sidebar/model-config-tab";
import type { User } from "@supabase/supabase-js";

export function DashboardShell({ children, user }: { children: React.ReactNode; user: User }) {
  const router = useRouter();
  const [rightOpen, setRightOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  function toggleDark() {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? "dark" : ""}`}>
      {/* Left sidebar */}
      <aside className="w-16 bg-gray-900 flex flex-col items-center py-4 gap-4">
        <div className="text-blue-400">
          <Stethoscope className="h-7 w-7" />
        </div>
        <Separator className="bg-gray-700 w-8" />
        <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800" title="Dashboard">
          <LayoutDashboard className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-800" onClick={toggleDark} title="Toggle theme">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-800" onClick={() => setRightOpen(!rightOpen)} title="Toggle sidebar">
          {rightOpen ? <PanelRightClose className="h-5 w-5" /> : <PanelRightOpen className="h-5 w-5" />}
        </Button>
        <Separator className="bg-gray-700 w-8" />
        <Button variant="ghost" size="icon" className="text-gray-400 hover:bg-gray-800" onClick={handleLogout} title="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
        <div className="p-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Radiogenia</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Welcome, {user.user_metadata?.name || user.email}
              </p>
            </div>
          </div>
          {children}
        </div>
      </main>

      {/* Right sidebar */}
      {rightOpen && (
        <aside className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col">
          <Tabs defaultValue="templates" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4 grid w-[calc(100%-2rem)] grid-cols-3">
              <TabsTrigger value="templates" className="text-xs">Templates</TabsTrigger>
              <TabsTrigger value="recommendations" className="text-xs">Recs</TabsTrigger>
              <TabsTrigger value="model" className="text-xs">AI Model</TabsTrigger>
            </TabsList>
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
