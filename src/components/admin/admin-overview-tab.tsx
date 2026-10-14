"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n";
import type { Overview, Trend } from "@/lib/admin-overview";
import {
  Loader2, RefreshCw, TrendingUp, TrendingDown, Users, FileText, CreditCard, Mic,
  Building2, Plug, AlertTriangle, ArrowRight, ThumbsUp, Activity, Wallet, ChevronRight,
} from "lucide-react";

interface ProviderBalance {
  provider: string;
  balance?: number | null;
  balanceCurrency?: string | null;
  providerSpendMtd?: number | null;
  loggedSpendMtd: number;
  status?: string;
}

/**
 * The admin overview: one screen that answers "how is it going" without
 * opening the other nine tabs.
 *
 * Every figure is shown against the same window a month earlier, because the
 * old overview's bare counters could not distinguish a good month from a
 * collapse. Nothing here edits anything — the configuration editors that used
 * to live on this tab were not summaries of anything, and sat between the
 * admin and the numbers they came for.
 */
export function AdminOverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const t = useT();
  const [data, setData] = useState<Overview | null>(null);
  const [balances, setBalances] = useState<ProviderBalance[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, bal] = await Promise.all([
        fetch("/api/admin/overview"),
        fetch("/api/admin/ai-balance"),
      ]);
      if (ov.ok) setData(await ov.json());
      if (bal.ok) {
        const d = await bal.json();
        setBalances(Array.isArray(d) ? d : d.providers || []);
      }
    } catch { /* leave the refresh button so it can be retried */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;
  }
  if (!data) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm text-gray-500">{t("admin.ov.no_data")}</p>
        <Button size="sm" variant="outline" onClick={load} className="text-xs gap-1.5">
          <RefreshCw className="h-3 w-3" /> {t("conv.refresh")}
        </Button>
      </div>
    );
  }

  const { money, growth, activity, cost, hospitals, queue, quality } = data;
  const eur = (n: number) => `${n.toFixed(2)} €`;
  const usd = (n: number) => `$${n.toFixed(2)}`;
  const pct = (n: number | null) => (n == null ? "—" : `${n}%`);

  const QUEUE_LABEL: Record<string, string> = {
    tickets: t("admin.ov.q_tickets"),
    residents: t("admin.ov.q_residents"),
    seat_orders: t("admin.ov.q_seat_orders"),
    approvals: t("admin.ov.q_approvals"),
    waitlist: t("admin.ov.q_waitlist"),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500 max-w-xl">{t("admin.ov.subtitle")}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{new Date(data.generatedAt).toLocaleTimeString()}</span>
          <button
            onClick={load}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={t("conv.refresh")}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {data.truncated && (
        <div className="flex items-start gap-2 text-[11px] rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>{t("admin.ov.truncated")}</span>
        </div>
      )}

      {/* What needs doing — the only part of this screen that is a to-do list */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {t("admin.ov.queue")}
          </p>
          {queue.length === 0 ? (
            <p className="text-[11px] text-gray-400">{t("admin.ov.queue_empty")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {queue.map((q) => (
                <button
                  key={q.key}
                  onClick={() => onNavigate(q.tab)}
                  className="group flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2 hover:border-amber-400 transition-colors"
                >
                  <span className="text-base font-bold text-amber-700 dark:text-amber-300">{q.count}</span>
                  <span className="text-[11px] text-gray-700 dark:text-gray-300">{QUEUE_LABEL[q.key] || q.key}</span>
                  <ChevronRight className="h-3 w-3 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* The six figures the rest of the screen explains */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi icon={<CreditCard className="h-4 w-4 text-amber-500" />} label={t("admin.mrr")} value={eur(money.mrr)} />
        <Kpi icon={<FileText className="h-4 w-4 text-purple-500" />} label={t("admin.ov.reports_30d")} value={activity.reports.current} trend={activity.reports} />
        <Kpi icon={<Activity className="h-4 w-4 text-blue-500" />} label={t("admin.ov.active_30d")} value={activity.activeUsers.current} trend={activity.activeUsers} />
        <Kpi icon={<Users className="h-4 w-4 text-emerald-500" />} label={t("admin.ov.signups")} value={growth.signups.current} trend={growth.signups} />
        <Kpi icon={<Wallet className="h-4 w-4 text-rose-500" />} label={t("admin.ov.ai_cost")} value={usd(cost.aiCost.current)} trend={cost.aiCost} invert />
        <Kpi icon={<TrendingUp className="h-4 w-4 text-violet-500" />} label={t("admin.ov.margin")} value={pct(cost.grossMarginPct)} />
      </div>

      {/* Direction, day by day */}
      <div className="grid md:grid-cols-2 gap-4">
        <SparkCard title={t("admin.ov.reports_trend")} series={activity.reportsPerDay} color="#8b5cf6" />
        <SparkCard title={t("admin.ov.signups_trend")} series={growth.signupsPerDay} color="#10b981" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* ── Business ── */}
        <Section title={t("admin.ov.sec_money")} icon={<CreditCard className="h-3.5 w-3.5 text-amber-500" />} onOpen={() => onNavigate("engagement")}>
          <Rows rows={[
            [t("admin.ov.paying"), String(money.paying)],
            [t("admin.ov.trialing"), String(money.trialing)],
            [t("admin.ov.cancel_scheduled"), String(money.cancelScheduled), money.cancelScheduled > 0 ? "warn" : undefined],
            [t("admin.ov.lapsed"), String(money.lapsed)],
            [t("admin.ov.trial_conversion"), money.finishedTrials > 0 ? `${pct(money.trialConversionPct)} (${money.finishedTrials})` : "—"],
            [t("admin.ov.arpu"), eur(money.arpu)],
            [t("admin.ov.verified_rate"), pct(growth.verifiedPct)],
            [t("admin.ov.total_users"), String(growth.totalUsers)],
          ]} />
          {Object.keys(money.mrrByPlan).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              {Object.entries(money.mrrByPlan).sort((a, b) => b[1] - a[1]).map(([plan, value]) => (
                <div key={plan} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="capitalize text-gray-600 dark:text-gray-300">{plan}</span>
                    <span className="text-gray-500">{eur(value)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${money.mrr > 0 ? Math.max((value / money.mrr) * 100, 2) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── Usage ── */}
        <Section title={t("admin.ov.sec_activity")} icon={<FileText className="h-3.5 w-3.5 text-purple-500" />} onOpen={() => onNavigate("users")}>
          <Rows rows={[
            [t("admin.ov.reports_today"), String(activity.reportsToday)],
            [t("admin.ov.reports_7d"), String(activity.reports7d)],
            [t("admin.ov.active_7d"), String(activity.activeUsers7d)],
            [t("admin.ov.per_active_user"), activity.reportsPerActiveUser == null ? "—" : String(activity.reportsPerActiveUser)],
            [t("admin.ov.dictation_min"), `${activity.dictationMinutes} min`],
          ]} />
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">{t("admin.ov.modalities")}</p>
            {activity.topModalities.length === 0 ? (
              <p className="text-[11px] text-gray-400">{t("admin.ov.no_data")}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {activity.topModalities.map((m) => (
                  <Badge key={m.modality} variant="secondary" className="text-[10px]">{m.modality} · {m.count}</Badge>
                ))}
              </div>
            )}
          </div>
        </Section>

        {/* ── Cost ── */}
        <Section title={t("admin.ov.sec_cost")} icon={<Wallet className="h-3.5 w-3.5 text-rose-500" />} onOpen={() => onNavigate("costs")}>
          <Rows rows={[
            [t("admin.ov.cost_per_report"), cost.costPerReport == null ? "—" : `$${cost.costPerReport.toFixed(4)}`],
            [t("admin.ov.margin"), pct(cost.grossMarginPct)],
            [t("admin.ov.calls"), String(cost.calls.current)],
            [t("admin.ov.error_rate"), pct(cost.errorRatePct), (cost.errorRatePct ?? 0) > 2 ? "warn" : undefined],
          ]} />
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
              <Plug className="h-3 w-3" /> {t("admin.ai_balance_title")}
            </p>
            {balances === null ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {balances.map((p) => {
                  const low = p.balance != null && p.balance < 5;
                  return (
                    <div key={p.provider} className="rounded-lg border border-gray-100 dark:border-gray-800 px-2 py-1.5">
                      <p className="text-[10px] text-gray-500 truncate">{p.provider}</p>
                      <p className={`text-sm font-bold ${low ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        {p.balance != null
                          ? `${p.balanceCurrency === "USD" ? "$" : ""}${p.balance.toFixed(2)}`
                          : p.providerSpendMtd != null ? usd(p.providerSpendMtd) : "—"}
                      </p>
                      <p className="text-[9px] text-gray-400">{usd(p.loggedSpendMtd)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Section>

        {/* ── Hospitals ── */}
        <Section title={t("admin.ov.sec_hospitals")} icon={<Building2 className="h-3.5 w-3.5 text-blue-500" />} onOpen={() => onNavigate("hospitals")}>
          <Rows rows={[
            [t("admin.ov.hospitals_total"), `${hospitals.total} (${hospitals.active} ${t("admin.ov.hospitals_active")})`],
            [t("admin.ov.seats"), `${hospitals.seatsUsed} / ${hospitals.seatsTotal}`],
            [t("admin.ov.gifted"), String(hospitals.gifted)],
            [t("admin.ov.pending_orders"), hospitals.pendingOrders > 0 ? `${hospitals.pendingOrders} · ${eur(hospitals.pendingOrdersValue)}` : "0", hospitals.pendingOrders > 0 ? "warn" : undefined],
          ]} />
          {hospitals.seatsTotal > 0 && (
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((hospitals.seatsUsed / hospitals.seatsTotal) * 100, 100)}%` }} />
            </div>
          )}
          {Object.keys(hospitals.byRegion).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1.5">{t("admin.ov.by_region")}</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(hospitals.byRegion).map(([r, n]) => (
                  <Badge key={r} variant="secondary" className="text-[10px]">
                    {r === "eu" ? "Europa" : r === "us" ? "EE.UU." : r === "open" ? "Latam" : t("admin.ov.region_auto")} · {n}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* ── Quality ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5 text-emerald-500" /> {t("admin.ov.sec_quality")}
            </p>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={() => onNavigate("audit")}>
              {t("admin.ov.view")} <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-gray-500">{t("admin.ov.dictation_satisfaction")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{pct(quality.dictationPct)}</p>
              <p className="text-[10px] text-gray-400">
                <Mic className="h-2.5 w-2.5 inline mr-0.5" />
                {quality.dictationUp} / {quality.dictationUp + quality.dictationDown}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">{t("admin.ov.error_rate")}</p>
              <p className={`text-xl font-bold ${(cost.errorRatePct ?? 0) > 2 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                {pct(cost.errorRatePct)}
              </p>
              <p className="text-[10px] text-gray-400">{cost.calls.current} {t("admin.ov.calls").toLowerCase()}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500">{t("admin.ov.per_active_user")}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{activity.reportsPerActiveUser ?? "—"}</p>
              <p className="text-[10px] text-gray-400">{t("admin.ov.vs_prev")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * A headline figure with its direction.
 *
 * `invert` is for the figures where up is bad — the AI bill rising 40% is not
 * a green arrow, and colouring it like growth is how a dashboard trains its
 * reader to ignore it.
 */
function Kpi({ icon, label, value, trend, invert }: {
  icon: React.ReactNode; label: string; value: string | number; trend?: Trend; invert?: boolean;
}) {
  const t = useT();
  const delta = trend?.changePct;
  const up = delta != null && delta > 0;
  const good = delta == null || delta === 0 ? null : invert ? !up : up;
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">{icon}</div>
        <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
        <p className="text-[10px] text-gray-500 leading-snug">{label}</p>
        {trend && (
          <p className={`text-[10px] mt-1 flex items-center gap-0.5 ${
            good === null ? "text-gray-400" : good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}>
            {delta == null ? (
              // Nothing to divide by: say so instead of inventing a percentage.
              <span className="text-gray-400">{trend.current > 0 ? t("admin.ov.new_from_zero") : "—"}</span>
            ) : (
              <>
                {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {delta > 0 ? "+" : ""}{delta}%
              </>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, icon, onOpen, children }: {
  title: string; icon: React.ReactNode; onOpen: () => void; children: React.ReactNode;
}) {
  const t = useT();
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            {icon} {title}
          </p>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={onOpen}>
            {t("admin.ov.view")} <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Rows({ rows }: { rows: (readonly [string, string, string?])[] }) {
  return (
    <div className="space-y-1">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex items-center justify-between text-[11px] gap-2">
          <span className="text-gray-500 truncate">{label}</span>
          <span className={`font-semibold tabular-nums flex-shrink-0 ${
            tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-gray-900 dark:text-white"
          }`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/** A 30-day sparkline. Plain SVG: a chart library for one polyline is not worth the bundle. */
function SparkCard({ title, series, color }: { title: string; series: { day: string; value: number }[]; color: string }) {
  const t = useT();
  const max = Math.max(1, ...series.map((s) => s.value));
  const total = series.reduce((a, s) => a + s.value, 0);
  const W = 300, H = 48;
  const step = series.length > 1 ? W / (series.length - 1) : W;
  const points = series.map((s, i) => `${(i * step).toFixed(1)},${(H - (s.value / max) * (H - 4) - 2).toFixed(1)}`).join(" ");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{title}</p>
          <span className="text-[10px] text-gray-400" title={`${t("admin.ov.vs_prev")}`}>{total}</span>
        </div>
        {total === 0 ? (
          <p className="text-[11px] text-gray-400 py-3">{t("admin.ov.no_data")}</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none" role="img" aria-label={title}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <polyline points={`0,${H} ${points} ${W},${H}`} fill={color} fillOpacity="0.12" stroke="none" />
          </svg>
        )}
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>{series[0]?.day.slice(5)}</span>
          <span>{series[series.length - 1]?.day.slice(5)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
