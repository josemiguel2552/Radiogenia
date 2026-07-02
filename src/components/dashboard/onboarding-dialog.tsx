"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Stethoscope, Mic, Sparkles, PenLine, Save, Wrench, ChevronRight, ChevronLeft, Rocket } from "lucide-react";
import { useT } from "@/lib/i18n";

const STORAGE_KEY = "radiogenai_onboarding_done";

const STEPS = [
  { icon: Stethoscope, titleKey: "help.step1_title", descKey: "help.step1_desc", color: "text-violet-500" },
  { icon: Mic, titleKey: "help.step2_title", descKey: "help.step2_desc", color: "text-blue-500" },
  { icon: Sparkles, titleKey: "help.step3_title", descKey: "help.step3_desc", color: "text-purple-500" },
  { icon: PenLine, titleKey: "help.step4_title", descKey: "help.step4_desc", color: "text-amber-500" },
  { icon: Save, titleKey: "help.step5_title", descKey: "help.step5_desc", color: "text-violet-500" },
  { icon: Wrench, titleKey: "help.step6_title", descKey: "help.step6_desc", color: "text-emerald-500" },
];

export function OnboardingDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-brand" />
            {step === 0 ? t("onboarding.welcome") : t("help.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 h-10 w-10 rounded-xl bg-brand-soft flex items-center justify-center ${current.color}`}>
              <current.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t(current.titleKey)}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(current.descKey)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === step ? "bg-brand" : "bg-muted"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t("onboarding.prev")}
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                {t("onboarding.start")}
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                {t("onboarding.next")}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
