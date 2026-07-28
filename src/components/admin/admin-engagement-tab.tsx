"use client";

/* Subscriber CONVERSION tab (card-first billing model). The old
   tool-adoption analytics were retired: what matters now is whether
   signups end up paying — and whether they cancel. */

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, TrendingUp, ArrowRight, CreditCard, Users, CalendarClock } from "lucide-react";
import { useT } from "@/lib/i18n";

type ConvState =
  | "unverified" | "no_card" | "trialing" | "trial_cancelled"
  | "paying" | "cancel_scheduled" | "lapsed" | "bonus";

interface ConvUser {
  id: string; email: string; name: string; signup: string; country: string | null;
  plan: string; state: ConvState; emailVerified: boolean;
  trialStartedAt: string | null; trialEndsAt: string | null;
  cancelledAt: string | null; accessUntil: string | null; endedAt: string | null;
  reportsThisMonth: number;
}

interface ConvData {
  days: number; cohortSize: number; empty?: boolean;
  funnel: { registered: number; verified: number; cardAdded: number; paying: number };
  states: Record<ConvState, number>;
  payingByPlan: Record<string, number>;
  trialCancellations: number;
  trialConversion: { finished: number; paid: number };
  timeline: { day: string; signups: number; cards: number }[];
  users: ConvUser[];
}

const STATE_STYLE: Record<ConvState, string> = {
  unverified: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
  no_card: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  trialing: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  trial_cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  paying: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cancel_scheduled: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  lapsed: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  bonus: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

function fmtD(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function pctOf(n: number, of: number): string {
  return of > 0 ? `${Math.round((n / of) * 100)}%` : "—";
}

export function AdminEngagementTab() {
  const t = useT();
  const [data, setData] = useState<ConvData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriber-analytics?days=${d}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const stateLabel = (s: ConvState): string => {
    switch (s) {
      case "unverified": return t("conv.s_unverified");
      case "no_card": return t("conv.s_no_card");
      case "trialing": return t("admin.bill_trial");
      case "trial_cancelled": return t("admin.bill_trial_cancelled");
      case "paying": return t("admin.bill_paying");
      case "cancel_scheduled": return t("admin.bill_cancelled");
      case "lapsed": return t("conv.s_lapsed");
      case "bonus": return t("admin.bill_bonus");
    }
  };

  const userDates = (u: ConvUser): string[] => {
    const out: string[] = [];
    if (u.trialStartedAt && u.trialEndsAt) out.push(`${t("conv.trial_lbl")} ${fmtD(u.trialStartedAt)} → ${fmtD(u.trialEndsAt)}`);
    if (u.cancelledAt) out.push(`${t("admin.bill_cancelled_on")} ${fmtD(u.cancelledAt)}`);
    if (u.accessUntil) out.push(`${t("admin.bill_access_until")} ${fmtD(u.accessUntil)}`);
    if (u.endedAt) out.push(`${t("admin.bill_ended_on")} ${fmtD(u.endedAt)}`);
    return out;
  };

  const f = data?.funnel;
  const funnelSteps = f
    ? [
        { label: t("conv.f_registered"), value: f.registered, prev: f.registered },
        { label: t("conv.f_verified"), value: f.verified, prev: f.registered },
        { label: t("conv.f_card"), value: f.cardAdded, prev: f.verified },
        { label: t("conv.f_paying"), value: f.paying, prev: f.cardAdded },
      ]
    : [];

  const maxDayBar = data ? Math.max(1, ...data.timeline.map((d) => Math.max(d.signups, d.cards))) : 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp className="h-4 w-4 text-violet-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.tab_engagement")}</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{t("conv.subtitle")}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                days === d
                  ? "bg-violet-600 text-white border-violet-600"
                  : "text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {d} {t("conv.days_label")}
            </button>
          ))}
          <button
            onClick={() => load(days)}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={t("conv.refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
      ) : !data || data.empty ? (
        <p className="text-sm text-gray-500 py-8 text-center">{t("conv.empty")}</p>
      ) : (
        <>
          {/* Funnel */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("conv.funnel_title")}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {funnelSteps.map((s, i) => (
                <div key={s.label} className="flex-1 flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                    <div className="mt-1.5 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                        style={{ width: f && f.registered > 0 ? `${Math.round((s.value / f.registered) * 100)}%` : "0%" }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {i === 0 ? " " : `${pctOf(s.value, s.prev)} ${t("conv.of_prev")}`}
                    </p>
                  </div>
                  {i < funnelSteps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0 hidden sm:block" />}
                </div>
              ))}
            </div>
          </Card>

          {/* Trials + current states */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("conv.trial_title")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{data.states.trialing}</p>
                  <p className="text-[10px] text-gray-500">{t("conv.t_active")}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{data.trialCancellations}</p>
                  <p className="text-[10px] text-gray-500">{t("conv.t_cancelled")}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {data.trialConversion.paid}/{data.trialConversion.finished}
                  </p>
                  <p className="text-[10px] text-gray-500">{t("conv.t_conversion")}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("conv.states_title")}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(data.states) as ConvState[])
                  .filter((s) => data.states[s] > 0)
                  .map((s) => (
                    <Badge key={s} className={`text-[10px] ${STATE_STYLE[s]}`}>
                      {stateLabel(s)}: {data.states[s]}
                      {s === "paying" && Object.keys(data.payingByPlan).length > 0 && (
                        <span className="ml-1 opacity-75">
                          ({Object.entries(data.payingByPlan).map(([p, n]) => `${p} ${n}`).join(" · ")})
                        </span>
                      )}
                    </Badge>
                  ))}
              </div>
            </Card>
          </div>

          {/* Per-day timeline */}
          {data.timeline.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{t("conv.timeline_title")}</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-2 w-2 rounded-sm bg-blue-400" /> {t("conv.tl_signups")}</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-2 w-2 rounded-sm bg-violet-500" /> {t("conv.tl_cards")}</span>
              </div>
              <div className="flex items-end gap-1 h-24 overflow-x-auto pb-1">
                {data.timeline.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-0.5 min-w-[26px]" title={`${d.day}: ${d.signups}/${d.cards}`}>
                    <div className="flex items-end gap-[2px] h-16">
                      <div className="w-2 rounded-t bg-blue-400" style={{ height: `${Math.max(6, (d.signups / maxDayBar) * 100)}%`, opacity: d.signups ? 1 : 0.15 }} />
                      <div className="w-2 rounded-t bg-violet-500" style={{ height: `${Math.max(6, (d.cards / maxDayBar) * 100)}%`, opacity: d.cards ? 1 : 0.15 }} />
                    </div>
                    <span className="text-[8px] text-gray-400">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Users table */}
          <Card className="p-4">
            <p className="text-xs font-semibold text-gray-900 dark:text-white mb-3">
              {t("conv.users_title")} ({data.users.length})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_user")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_joined")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_status")}</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("conv.th_dates")}</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">{t("conv.th_reports")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                      <td className="py-2.5 px-2">
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{u.name !== "—" ? u.name : u.email}</p>
                        <p className="text-[10px] text-gray-500">{u.email}{u.country ? ` · ${u.country}` : ""}</p>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-500 whitespace-nowrap">{fmtD(u.signup)}</td>
                      <td className="py-2.5 px-2">
                        <Badge className={`text-[10px] ${STATE_STYLE[u.state]}`}>{stateLabel(u.state)}</Badge>
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        {userDates(u).map((l) => (
                          <p key={l} className="text-[10px] text-gray-500 whitespace-nowrap">{l}</p>
                        ))}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-600 dark:text-gray-300">{u.reportsThisMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
