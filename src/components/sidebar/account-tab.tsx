"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Lock, CreditCard, Check, Loader2, AlertTriangle, CalendarClock, ExternalLink, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { PLANS, CURRENCY, type SubscriptionPlan } from "@/lib/types";

interface SubInfo {
  plan: SubscriptionPlan;
  planConfig: { label: string; price: number; reports: number; dictationMinutes: number };
  used: number;
  limit: number;
  remaining: number;
  periodStart: string;
  nextPeriodDate: string;
  pendingPlan: SubscriptionPlan | null;
  pendingPlanEffectiveDate: string | null;
  hasStripe: boolean;
  dictation: {
    usedMinutes: number;
    limitMinutes: number;
    remainingMinutes: number;
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function AccountTab() {
  const t = useT();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [sub, setSub] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const loadSub = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) setSub(await res.json());
    } catch { /* ignore */ }
    setSubLoading(false);
  }, []);

  useEffect(() => { loadSub(); }, [loadSub]);

  const handlePasswordChange = useCallback(async () => {
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: t("account.pw_min_length") });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: t("account.pw_mismatch") });
      return;
    }
    setPwLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPw,
      });
      if (signInError) {
        setPwMsg({ ok: false, text: t("account.pw_current_wrong") });
        setPwLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) {
        setPwMsg({ ok: false, text: error.message });
      } else {
        setPwMsg({ ok: true, text: t("account.pw_changed") });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      }
    } catch {
      setPwMsg({ ok: false, text: t("gen_error") });
    }
    setPwLoading(false);
  }, [currentPw, newPw, confirmPw, t]);

  const handlePlanChange = useCallback(async () => {
    if (!selectedPlan) return;
    setPlanChangeLoading(true);
    setPlanMsg(null);
    try {
      const res = await fetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.deferred && data.effectiveDate) {
          setPlanMsg({
            ok: true,
            text: t("account.plan_deferred").replace("{date}", formatDate(data.effectiveDate)),
          });
        }
        await loadSub();
        setChangePlanOpen(false);
      }
    } catch { /* ignore */ }
    setPlanChangeLoading(false);
  }, [selectedPlan, loadSub, t]);

  const cancelPendingPlan = useCallback(async () => {
    try {
      await fetch("/api/subscription", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelPending: true }),
      });
      await loadSub();
      setPlanMsg(null);
    } catch { /* ignore */ }
  }, [loadSub]);

  const openBillingPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else if (data.error === "Stripe not configured") {
        setPlanMsg({ ok: false, text: t("account.stripe_not_configured") });
      }
    } catch { /* ignore */ }
    setPortalLoading(false);
  }, [t]);

  const planKeys = Object.keys(PLANS) as SubscriptionPlan[];

  return (
    <div className="space-y-6">
      {/* Password change */}
      <div>
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          {t("account.change_password")}
        </h4>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder={t("account.current_password")}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            type="password"
            placeholder={t("account.new_password")}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            type="password"
            placeholder={t("account.confirm_password")}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="h-8 text-xs"
          />
          {pwMsg && (
            <p className={`text-[11px] ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>
              {pwMsg.ok ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
              {pwMsg.text}
            </p>
          )}
          <Button
            size="sm"
            className="text-xs w-full"
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
          >
            {pwLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("account.update_password")}
          </Button>
        </div>
      </div>

      {/* Subscription */}
      <div>
        <h4 className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
          <CreditCard className="h-3.5 w-3.5" />
          {t("account.subscription")}
        </h4>
        {subLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        ) : sub ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.current_plan")}</span>
                <Badge className="text-[10px]">{sub.planConfig.label}</Badge>
              </div>

              {/* Next renewal date */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{t("account.next_renewal")}</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {formatDate(sub.nextPeriodDate)}
                </span>
              </div>

              {/* Reports usage */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{t("account.reports_usage")}</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {sub.used} / {sub.limit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sub.used / sub.limit) * 100)}%` }}
                />
              </div>

              {/* Dictation usage */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500">{t("account.dictation_usage")}</span>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">
                  {sub.dictation.usedMinutes} / {sub.dictation.limitMinutes} min
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (sub.dictation.usedMinutes / sub.dictation.limitMinutes) * 100)}%` }}
                />
              </div>
            </div>

            {/* Pending plan change notice */}
            {sub.pendingPlan && sub.pendingPlanEffectiveDate && (
              <div className="p-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-start gap-2">
                  <CalendarClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      {t("account.pending_change")}:{" "}
                      <span className="font-semibold">{PLANS[sub.pendingPlan]?.label}</span>
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                      {t("account.effective_date")}: {formatDate(sub.pendingPlanEffectiveDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cancelPendingPlan}
                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
                    title={t("account.cancel_pending")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {planMsg && (
              <p className={`text-[11px] ${planMsg.ok ? "text-green-600" : "text-red-500"}`}>
                {planMsg.ok ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
                {planMsg.text}
              </p>
            )}

            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full"
                onClick={() => { setSelectedPlan(null); setChangePlanOpen(true); setPlanMsg(null); }}
              >
                {t("account.change_plan")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="text-xs w-full gap-1.5"
                onClick={openBillingPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3" />
                    {t("account.manage_payment")}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">{t("account.sub_error")}</p>
        )}
      </div>

      {/* Change plan dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("account.change_plan")}</DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-gray-500">
            {t("account.plan_change_info")}
          </p>
          <div className="space-y-2">
            {planKeys.map((key) => {
              const plan = PLANS[key];
              const isCurrent = sub?.plan === key;
              const isPending = sub?.pendingPlan === key;
              const isSelected = selectedPlan === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => !isCurrent && !isPending && setSelectedPlan(key)}
                  disabled={isCurrent || isPending}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-brand bg-brand/5 ring-1 ring-brand"
                      : isCurrent
                        ? "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{plan.label}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {plan.price === 0 ? t("account.free") : `${CURRENCY}${plan.price}/${t("account.month")}`}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 space-x-3">
                    <span>{plan.reports} {t("account.reports")}</span>
                    <span>{plan.dictationMinutes} min {t("account.dictation")}</span>
                  </div>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[9px] mt-1">{t("account.current")}</Badge>
                  )}
                  {isPending && (
                    <Badge variant="outline" className="text-[9px] mt-1 border-amber-400 text-amber-600">{t("account.pending")}</Badge>
                  )}
                </button>
              );
            })}
          </div>
          {sub?.nextPeriodDate && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <CalendarClock className="h-3 w-3" />
              {t("account.change_effective")}: {formatDate(sub.nextPeriodDate)}
            </p>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button
              size="sm"
              className="text-xs"
              onClick={handlePlanChange}
              disabled={!selectedPlan || planChangeLoading}
            >
              {planChangeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("account.confirm_change")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
