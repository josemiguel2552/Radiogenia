"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Lock, CreditCard, Check, Loader2, AlertTriangle, CalendarClock,
  ExternalLink, X, Zap, FileText, Mic, TrendingUp, User, Download, Receipt,
} from "lucide-react";
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

interface BillingDetails {
  paymentMethod: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  nextInvoice: { amountDue: number; currency: string; dueDate: string | null } | null;
  invoices: { id: string; date: string; amount: number; currency: string; pdf: string | null; status: string }[];
}

const CARD_BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  diners: "Diners",
  jcb: "JCB",
  unionpay: "UnionPay",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function UsageBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min(100, (used / total) * 100);
  return (
    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function AccountTab() {
  const t = useT();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [sub, setSub] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [planChangeLoading, setPlanChangeLoading] = useState(false);
  const [planMsg, setPlanMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billing, setBilling] = useState<BillingDetails | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  const loadSub = useCallback(async () => {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) setSub(await res.json());
    } catch { /* ignore */ }
    setSubLoading(false);
  }, []);

  const loadBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/details");
      if (res.ok) setBilling(await res.json());
    } catch { /* ignore */ }
    setBillingLoading(false);
  }, []);

  useEffect(() => {
    loadSub();
    loadBilling();
    createClient().auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, [loadSub, loadBilling]);

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
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <User className="h-5 w-5 text-brand" />
          {t("nav.account")}
        </h2>
        {userEmail && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{userEmail}</p>
        )}
      </div>

      {/* Subscription overview */}
      {subLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : sub ? (
        <>
          {/* Plan card */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{sub.planConfig.label}</span>
                      <Badge className="text-[10px]">
                        {sub.planConfig.price === 0 ? t("account.free") : `${CURRENCY}${sub.planConfig.price}/${t("account.month")}`}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {t("account.next_renewal")}: {formatDate(sub.nextPeriodDate)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => { setSelectedPlan(null); setChangePlanOpen(true); setPlanMsg(null); }}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {t("account.change_plan")}
                </Button>
              </div>

              {/* Usage cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Reports */}
                <div className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-brand" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.reports_usage")}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{sub.used}</span>
                    <span className="text-sm text-gray-400">/ {sub.limit}</span>
                  </div>
                  <UsageBar used={sub.used} total={sub.limit} color="bg-brand" />
                </div>

                {/* Dictation */}
                <div className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="h-4 w-4 text-teal-500" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.dictation_usage")}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{sub.dictation.usedMinutes}</span>
                    <span className="text-sm text-gray-400">/ {sub.dictation.limitMinutes} min</span>
                  </div>
                  <UsageBar used={sub.dictation.usedMinutes} total={sub.dictation.limitMinutes} color="bg-teal-500" />
                </div>
              </div>

              {/* Pending plan change */}
              {sub.pendingPlan && sub.pendingPlanEffectiveDate && (
                <div className="mt-4 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-start gap-2">
                    <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        {t("account.pending_change")}:{" "}
                        <span className="font-semibold">{PLANS[sub.pendingPlan]?.label}</span>
                      </p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        {t("account.effective_date")}: {formatDate(sub.pendingPlanEffectiveDate)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelPendingPlan}
                      className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
                      title={t("account.cancel_pending")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {planMsg && (
                <p className={`mt-3 text-xs ${planMsg.ok ? "text-green-600" : "text-red-500"}`}>
                  {planMsg.ok ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
                  {planMsg.text}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Billing & Payment */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-purple-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("account.billing_payment")}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={openBillingPortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("account.manage_payment")}
                    </>
                  )}
                </Button>
              </div>

              {/* Payment method + next charge row */}
              {billingLoading ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card on file */}
                  <div className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.card_on_file")}</span>
                    </div>
                    {billing?.paymentMethod ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {CARD_BRANDS[billing.paymentMethod.brand] || billing.paymentMethod.brand.toUpperCase()} •••• {billing.paymentMethod.last4}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t("account.expires")} {String(billing.paymentMethod.expMonth).padStart(2, "0")}/{billing.paymentMethod.expYear}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-400 dark:text-gray-500">{t("account.no_payment_method")}</p>
                        <button
                          type="button"
                          onClick={openBillingPortal}
                          className="text-xs text-brand hover:underline mt-1"
                        >
                          {t("account.add_payment_method")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Next charge */}
                  <div className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarClock className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.next_charge")}</span>
                    </div>
                    {billing?.nextInvoice ? (
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {billing.nextInvoice.currency === "usd" ? "$" : billing.nextInvoice.currency.toUpperCase() + " "}
                          {billing.nextInvoice.amountDue.toFixed(2)}
                        </p>
                        {billing.nextInvoice.dueDate && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {t("account.on_date").replace("{date}", formatDate(billing.nextInvoice.dueDate))}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">—</p>
                    )}
                  </div>
                </div>
              )}

              {/* Invoice history */}
              {!billingLoading && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t("account.invoices")}</span>
                    </div>
                    {billing && billing.invoices.length > 0 && (
                      <button
                        type="button"
                        onClick={openBillingPortal}
                        className="text-[11px] text-brand hover:underline flex items-center gap-1"
                      >
                        {t("account.view_all_invoices")}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {billing && billing.invoices.length > 0 ? (
                    <div className="space-y-1.5">
                      {billing.invoices.slice(0, 5).map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/30"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-gray-900 dark:text-white">
                                {inv.currency === "usd" ? "$" : inv.currency.toUpperCase() + " "}
                                {inv.amount.toFixed(2)}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                {formatDate(inv.date)}
                              </p>
                            </div>
                          </div>
                          {inv.pdf && (
                            <a
                              href={inv.pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[11px] text-brand hover:underline shrink-0"
                            >
                              <Download className="h-3 w-3" />
                              PDF
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-gray-500 py-2">{t("account.no_invoices")}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-sm text-gray-400">{t("account.sub_error")}</p>
      )}

      {/* Security */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("account.change_password")}</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t("account.pw_min_length")}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              type="password"
              placeholder={t("account.current_password")}
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="password"
              placeholder={t("account.new_password")}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="h-9 text-sm"
            />
            <Input
              type="password"
              placeholder={t("account.confirm_password")}
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          {pwMsg && (
            <p className={`mt-2 text-xs ${pwMsg.ok ? "text-green-600" : "text-red-500"}`}>
              {pwMsg.ok ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
              {pwMsg.text}
            </p>
          )}
          <Button
            size="sm"
            className="mt-3 text-xs"
            onClick={handlePasswordChange}
            disabled={pwLoading || !currentPw || !newPw || !confirmPw}
          >
            {pwLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("account.update_password")}
          </Button>
        </CardContent>
      </Card>

      {/* Change plan dialog */}
      <Dialog open={changePlanOpen} onOpenChange={setChangePlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("account.change_plan")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">
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
                  className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                    isSelected
                      ? "border-brand bg-brand/5 ring-1 ring-brand"
                      : isCurrent
                        ? "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{plan.label}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.price === 0 ? t("account.free") : `${CURRENCY}${plan.price}/${t("account.month")}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-x-3">
                    <span>{plan.reports} {t("account.reports")}</span>
                    <span>{plan.dictationMinutes} min {t("account.dictation")}</span>
                  </div>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[9px] mt-1.5">{t("account.current")}</Badge>
                  )}
                  {isPending && (
                    <Badge variant="outline" className="text-[9px] mt-1.5 border-amber-400 text-amber-600">{t("account.pending")}</Badge>
                  )}
                </button>
              );
            })}
          </div>
          {sub?.nextPeriodDate && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
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

export function PasswordSection() {
  const t = useT();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleChange = useCallback(async () => {
    setMsg(null);
    if (newPw.length < 6) { setMsg({ ok: false, text: t("account.pw_min_length") }); return; }
    if (newPw !== confirmPw) { setMsg({ ok: false, text: t("account.pw_mismatch") }); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPw,
      });
      if (signInError) { setMsg({ ok: false, text: t("account.pw_current_wrong") }); setLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) { setMsg({ ok: false, text: error.message }); }
      else { setMsg({ ok: true, text: t("account.pw_changed") }); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    } catch { setMsg({ ok: false, text: t("gen_error") }); }
    setLoading(false);
  }, [currentPw, newPw, confirmPw, t]);

  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" />
        {t("account.change_password")}
      </h4>
      <div className="space-y-2">
        <Input type="password" placeholder={t("account.current_password")} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="h-8 text-xs" />
        <Input type="password" placeholder={t("account.new_password")} value={newPw} onChange={(e) => setNewPw(e.target.value)} className="h-8 text-xs" />
        <Input type="password" placeholder={t("account.confirm_password")} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="h-8 text-xs" />
        {msg && (
          <p className={`text-[11px] ${msg.ok ? "text-green-600" : "text-red-500"}`}>
            {msg.ok ? <Check className="inline h-3 w-3 mr-1" /> : <AlertTriangle className="inline h-3 w-3 mr-1" />}
            {msg.text}
          </p>
        )}
        <Button size="sm" className="text-xs w-full" onClick={handleChange} disabled={loading || !currentPw || !newPw || !confirmPw}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("account.update_password")}
        </Button>
      </div>
    </div>
  );
}
