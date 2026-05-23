"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ShieldCheck, FileText, Lock, Brain } from "lucide-react";
import { useT } from "@/lib/i18n";

interface ConsentStatus {
  required: boolean;
  pending: string[];
  org_name: string;
  version: string;
}

const DOC_ICONS: Record<string, typeof FileText> = {
  terms_of_use: FileText,
  privacy_policy: Lock,
  data_processing: ShieldCheck,
  ai_disclaimer: Brain,
};

export function ConsentWall({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/consent")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.required) {
          setStatus(data);
        } else {
          setDone(true);
        }
      })
      .catch(() => setDone(true))
      .finally(() => setLoading(false));
  }, []);

  const toggleDoc = useCallback((doc: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(doc)) next.delete(doc);
      else next.add(doc);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!status) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: Array.from(accepted) }),
      });
      if (res.ok) {
        setDone(true);
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }, [status, accepted]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950 z-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  if (done) return <>{children}</>;

  if (!status) return <>{children}</>;

  const allChecked = status.pending.every((d) => accepted.has(d));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950 z-50 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <ShieldCheck className="h-12 w-12 text-brand mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("consent.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {status.org_name} — {t("consent.subtitle")}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
            {t("consent.intro")}
          </p>

          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3">
              {status.pending.map((doc) => {
                const Icon = DOC_ICONS[doc] || FileText;
                const isChecked = accepted.has(doc);
                return (
                  <label
                    key={doc}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      isChecked
                        ? "border-brand/50 bg-brand/5 dark:bg-brand/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDoc(doc)}
                      className="mt-0.5 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isChecked ? "text-brand" : "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t(`consent.doc.${doc}`)}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {t(`consent.doc.${doc}_desc`)}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 mb-4">
          <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
            {t("consent.legal_note")}
          </p>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-400">
            v{status.version} · {new Date().toLocaleDateString()}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={!allChecked || submitting}
            className="gap-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {t("consent.accept_all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
