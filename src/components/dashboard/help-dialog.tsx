"use client";

import { useState } from "react";
import { HelpCircle, Stethoscope, Mic, Sparkles, PenLine, Save, Settings, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

const STEPS = [
  { icon: Stethoscope, titleKey: "help.step1_title", descKey: "help.step1_desc" },
  { icon: Mic, titleKey: "help.step2_title", descKey: "help.step2_desc" },
  { icon: Sparkles, titleKey: "help.step3_title", descKey: "help.step3_desc" },
  { icon: PenLine, titleKey: "help.step4_title", descKey: "help.step4_desc" },
  { icon: Save, titleKey: "help.step5_title", descKey: "help.step5_desc" },
];

export function HelpDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-800 hover:text-gray-200 rounded-lg h-9 w-9" title={t("nav.help")}>
          <HelpCircle className="h-4.5 w-4.5" />
        </Button>
      </DialogTrigger>
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
