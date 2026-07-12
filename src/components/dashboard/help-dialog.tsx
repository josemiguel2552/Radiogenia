"use client";

import { useState, useEffect } from "react";
import { HelpCircle, Stethoscope, Mic, Sparkles, PenLine, Save, Wrench, Settings, Scale, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const STEPS = [
  { icon: Stethoscope, titleKey: "help.step1_title", descKey: "help.step1_desc" },
  { icon: Mic, titleKey: "help.step2_title", descKey: "help.step2_desc" },
  { icon: Sparkles, titleKey: "help.step3_title", descKey: "help.step3_desc" },
  { icon: PenLine, titleKey: "help.step4_title", descKey: "help.step4_desc" },
  { icon: Save, titleKey: "help.step5_title", descKey: "help.step5_desc" },
  { icon: Wrench, titleKey: "help.step6_title", descKey: "help.step6_desc" },
];

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS = [
  { keys: [`${mod}+A`], labelKey: "help.shortcut_dictation" },
  { keys: ["Shift+Space"], labelKey: "help.shortcut_copy" },
  { keys: [`${mod}+Enter`], labelKey: "help.shortcut_generate" },
  { keys: [`${mod}+N`], labelKey: "help.shortcut_new" },
  { keys: [`${mod}+/`], labelKey: "help.shortcut_help" },
  { keys: ["?"], labelKey: "help.shortcut_cheatsheet" },
];

export function HelpDialog({ showTrigger = true }: { showTrigger?: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onOpenHelp() { setOpen(true); }
    // Discreet cheat-sheet shortcut: "?" opens help (unless typing in a field).
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("radiogenai:open-help", onOpenHelp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("radiogenai:open-help", onOpenHelp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" title={t("nav.help")}>
            <HelpCircle className="h-4.5 w-4.5" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{t("help.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {STEPS.map((step) => (
            <div key={step.titleKey} className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-brand-soft flex items-center justify-center">
                <step.icon className="h-4 w-4 text-brand" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t(step.titleKey)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(step.descKey)}</p>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                <Keyboard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{t("help.shortcuts_title")}</p>
                <div className="space-y-1.5">
                  {SHORTCUTS.map((s) => (
                    <div key={s.labelKey} className="flex items-center justify-between gap-4">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{t(s.labelKey)}</span>
                      <kbd className="shrink-0 px-1.5 py-0.5 text-[11px] font-mono bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {s.keys.join(" + ")}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Settings className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("help.config_title")}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("help.config_desc")}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Scale className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t("help.legal_title")}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("help.legal_desc")}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
