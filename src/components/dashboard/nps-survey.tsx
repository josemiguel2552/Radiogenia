"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Loader2, PartyPopper } from "lucide-react";
import { useT } from "@/lib/i18n";

export function NpsSurvey({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/pilot/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback_text: feedback }),
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch { /* ignore */ }
    setSubmitting(false);
  }, [score, feedback, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        {submitted ? (
          <div className="py-8 text-center">
            <PartyPopper className="h-10 w-10 text-brand mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t("pilot.survey_thanks")}</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-sm text-center">{t("pilot.survey_title")}</DialogTitle>
            </DialogHeader>

            <div className="flex justify-center gap-1 py-4">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setScore(n)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= (hover || score)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={t("pilot.survey_feedback")}
              className="w-full h-20 text-xs p-2.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
            />

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={onClose}>
                {t("cancel")}
              </Button>
              <Button size="sm" className="text-xs" onClick={handleSubmit} disabled={score === 0 || submitting}>
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                {t("pilot.survey_submit")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
