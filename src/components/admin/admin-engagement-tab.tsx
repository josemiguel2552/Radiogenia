"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, TrendingUp, TrendingDown, RefreshCw, Users, Calendar,
  AlertTriangle, Sparkles, ArrowRight, Mail, Send,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/* ── Types (mirror /api/admin/subscriber-analytics) ── */

interface EngUser {
  id: string; email: string; name: string; signup: string; plan: string; paying: boolean;
  emailVerified: boolean; approved: boolean; events: number; generations: number;
  reportsSaved: number; copied: number; reports: number; activeDays: number;
  features: string[]; featureCount: number; errors: number; corrections: number;
  lastSeen: string | null; ttfrMinutes: number | null; returned: boolean;
  segment: "bounced" | "one_and_done" | "engaged" | "champion"; score: number;
}
interface EngData {
  days: number; cohortSize: number; empty?: boolean; totalEvents: number;
  planCounts: Record<string, number>; paying: number; unverified: number; unapproved: number;
  funnel: { registered: number; activated: number; started: number; generated: number; completed: number; exploredTool: number; returned: number };
  segments: { bounced: number; one_and_done: number; engaged: number; champion: number };
  retention: { day0: number; d1_7: number; d8plus: number };
  returnedRate: number;
  ttfr: { median: number | null; count: number };
  featureAdoption: { feature: string; users: number; pct: number; returnedRateAmong: number; retentionLift: number | null }[];
  friction: { abandoned: number; errorUsers: number; errorEvents: number; correctionUsers: number; notActivated: number };
  topCalculators: { calc: string; users: number }[];
  topTemplates: { template: string; users: number }[];
  users: EngUser[];
}

const SEGMENT_STYLE: Record<string, { bar: string; badge: string }> = {
  bounced: { bar: "bg-gray-400", badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  one_and_done: { bar: "bg-amber-400", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  engaged: { bar: "bg-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  champion: { bar: "bg-violet-500", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
};

function prettyId(s: string): string {
  return s.replace(/_/g, " ");
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function AdminEngagementTab() {
  const t = useT();
  const [data, setData] = useState<EngData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [testing, setTesting] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");

  const sendTest = async (lang: "es" | "en" | "pt", type: "tools" | "report_types" | "guidelines") => {
    setTesting(`${type}-${lang}`);
    setTestMsg(null);
    try {
      const res = await fetch("/api/admin/onboarding-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, type, to: testTo.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      setTestMsg(res.ok ? `${t("eng.test_sent")} ${d.sentTo || ""}` : (d.error || t("eng.test_error")));
    } catch {
      setTestMsg(t("eng.test_error"));
    }
    setTesting(null);
  };

  // One-time broadcast to already-registered users.
  const [bcCount, setBcCount] = useState<number | null>(null);
  const [bcBusy, setBcBusy] = useState(false);
  const [bcMsg, setBcMsg] = useState<string | null>(null);

  const bcPreview = async () => {
    setBcBusy(true); setBcMsg(null);
    try {
      const res = await fetch("/api/admin/onboarding-broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setBcCount(d.wouldSend ?? 0); setBcMsg(`${t("eng.bc_would")} ${d.wouldSend ?? 0} ${t("eng.bc_users")}`); }
      else setBcMsg(d.error || t("eng.bc_error"));
    } catch { setBcMsg(t("eng.bc_error")); }
    setBcBusy(false);
  };

  const bcSend = async () => {
    if (!window.confirm(t("eng.bc_confirm"))) return;
    setBcBusy(true); setBcMsg(t("eng.bc_sending"));
    try {
      const res = await fetch("/api/admin/onboarding-broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 100 }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const remaining = d.remaining ?? 0;
        setBcCount(remaining);
        setBcMsg(remaining > 0
          ? `${t("eng.bc_sent")}: ${d.sent} · ${t("eng.bc_remaining")}: ${remaining}`
          : `${t("eng.bc_done")} (${t("eng.bc_sent")}: ${d.sent})`);
      } else setBcMsg(d.error || t("eng.bc_error"));
    } catch { setBcMsg(t("eng.bc_error")); }
    setBcBusy(false);
  };

  // Resend verification email to unverified users.
  const [rvBusy, setRvBusy] = useState(false);
  const [rvMsg, setRvMsg] = useState<string | null>(null);
  const rvPreview = async () => {
    setRvBusy(true); setRvMsg(null);
    try {
      const res = await fetch("/api/admin/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const d = await res.json().catch(() => ({}));
      setRvMsg(res.ok ? `${t("eng.rv_would")} ${d.unverified ?? 0}` : (d.error || t("eng.rv_error")));
    } catch { setRvMsg(t("eng.rv_error")); }
    setRvBusy(false);
  };
  const rvSend = async () => {
    if (!window.confirm(t("eng.rv_confirm"))) return;
    setRvBusy(true); setRvMsg(t("eng.rv_sending"));
    try {
      const res = await fetch("/api/admin/resend-verification", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      setRvMsg(res.ok ? `${t("eng.rv_sent")} ${d.sent ?? 0}` : (d.error || t("eng.rv_error")));
    } catch { setRvMsg(t("eng.rv_error")); }
    setRvBusy(false);
  };

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriber-analytics?days=${d}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short" }) : t("eng.never");

  const segLabel = (s: string) => t(`eng.seg_${s}`);
  const featLabel = (f: string) => t(`eng.feat_${f}`);

  /* ── Header (always shown) ── */
  const header = (
    <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" /> {t("eng.title")}
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("eng.subtitle")}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              days === d
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-violet-400"
            }`}
          >
            {d}{t("eng.days").charAt(0)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load(days)}
          className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-violet-600 hover:border-violet-400 transition-colors"
          title={t("eng.refresh")}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>

    {/* Send the automatic emails to your own inbox to preview them for real. */}
    <div className="rounded-lg border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <Mail className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-[11px] text-gray-600 dark:text-gray-300">{t("eng.test_hint")}</span>
      </div>
      <input
        type="email"
        value={testTo}
        onChange={(e) => setTestTo(e.target.value)}
        placeholder={t("eng.test_to_ph")}
        className="ml-5 w-[calc(100%-1.25rem)] max-w-xs px-2 py-1 text-[11px] rounded-md border border-violet-200 dark:border-violet-900/50 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
      />
      {(["tools", "report_types", "guidelines"] as const).map((type) => (
        <div key={type} className="flex flex-wrap items-center gap-1.5 pl-5">
          <span className="text-[11px] text-gray-500 dark:text-gray-400 w-32">{t(type === "tools" ? "eng.test_tools" : type === "report_types" ? "eng.test_types" : "eng.test_guidelines")}</span>
          {(["es", "en", "pt"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              disabled={testing !== null}
              onClick={() => sendTest(lang, type)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-violet-300 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/40 disabled:opacity-50 transition-colors"
            >
              {testing === `${type}-${lang}` ? t("eng.test_sending") : lang.toUpperCase()}
            </button>
          ))}
        </div>
      ))}
      {testMsg && <span className="text-[11px] text-green-600 dark:text-green-400 block pl-5">{testMsg}</span>}
    </div>

    {/* One-time broadcast to already-registered users. */}
    <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Send className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100">{t("eng.bc_title")}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{t("eng.bc_hint")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 pl-5">
        <button
          type="button"
          disabled={bcBusy}
          onClick={bcPreview}
          className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {t("eng.bc_preview")}
        </button>
        <button
          type="button"
          disabled={bcBusy}
          onClick={bcSend}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {bcBusy ? t("eng.bc_sending") : (bcCount && bcCount > 0 ? `${t("eng.bc_continue")} (${bcCount})` : t("eng.bc_send"))}
        </button>
        {bcMsg && <span className="text-[11px] text-amber-700 dark:text-amber-300">{bcMsg}</span>}
      </div>
    </div>

    {/* Resend verification email to unverified users. */}
    <div className="rounded-lg border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-100">{t("eng.rv_title")}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{t("eng.rv_hint")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-2 pl-5">
        <button
          type="button"
          disabled={rvBusy}
          onClick={rvPreview}
          className="px-2.5 py-1 text-[11px] font-medium rounded-md border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {t("eng.rv_preview")}
        </button>
        <button
          type="button"
          disabled={rvBusy}
          onClick={rvSend}
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {rvBusy ? t("eng.rv_sending") : t("eng.rv_send")}
        </button>
        {rvMsg && <span className="text-[11px] text-blue-700 dark:text-blue-300">{rvMsg}</span>}
      </div>
    </div>
    </div>
  );

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {header}
        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("eng.loading")}
        </div>
      </div>
    );
  }

  if (!data || data.empty || data.cohortSize === 0) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-8 text-center text-sm text-gray-400">{t("eng.empty")}</Card>
      </div>
    );
  }

  /* ── Funnel ── */
  const f = data.funnel;
  const funnelSteps: { key: string; value: number }[] = [
    { key: "registered", value: f.registered },
    { key: "activated", value: f.activated },
    { key: "started", value: f.started },
    { key: "generated", value: f.generated },
    { key: "completed", value: f.completed },
    { key: "explored", value: f.exploredTool },
    { key: "returned", value: f.returned },
  ];
  // Biggest consecutive drop.
  let dropIdx = -1; let dropAmt = -1;
  for (let i = 1; i < funnelSteps.length; i++) {
    const d = funnelSteps[i - 1].value - funnelSteps[i].value;
    if (d > dropAmt) { dropAmt = d; dropIdx = i; }
  }

  const seg = data.segments;
  const segTotal = seg.bounced + seg.one_and_done + seg.engaged + seg.champion || 1;

  const frictionItems = [
    { key: "fr_abandoned", value: data.friction.abandoned, icon: AlertTriangle },
    { key: "fr_errors", value: data.friction.errorUsers, icon: AlertTriangle },
    { key: "fr_corrections", value: data.friction.correctionUsers, icon: AlertTriangle },
    { key: "fr_not_activated", value: data.friction.notActivated, icon: AlertTriangle },
    { key: "fr_unverified", value: data.unverified, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-4">
      {header}

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/40">
          <Users className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-sm font-bold text-violet-700 dark:text-violet-300">{data.cohortSize}</span>
          <span className="text-[11px] text-violet-600/80 dark:text-violet-400/80">{t("eng.cohort")} · {t("eng.in_days")} {data.days} {t("eng.days")}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{data.totalEvents}</span>
          <span className="text-[11px] text-gray-500">{t("eng.events")}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/40">
          <span className="text-sm font-bold text-green-700 dark:text-green-300">{data.paying}</span>
          <span className="text-[11px] text-green-600/80 dark:text-green-400/80">{t("eng.paying_users")}</span>
        </div>
      </div>

      {/* ── Activation funnel ── */}
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.funnel_title")}</h3>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{t("eng.funnel_hint")}</p>
        <div className="space-y-1.5">
          {funnelSteps.map((s, i) => {
            const p = f.registered ? s.value / f.registered : 0;
            const isDrop = i === dropIdx;
            return (
              <div key={s.key}>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-gray-600 dark:text-gray-300">{t(`eng.step_${s.key}`)}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">{s.value} · {pct(p)}</span>
                </div>
                <div className="h-4 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full rounded ${isDrop ? "bg-amber-400" : "bg-violet-500"}`}
                    style={{ width: `${Math.max(p * 100, s.value > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {dropIdx > 0 && dropAmt > 0 && (
          <p className="mt-3 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5" />
            {t("eng.insight_dropoff")} «{t(`eng.step_${funnelSteps[dropIdx - 1].key}`)}» {t("eng.and")} «{t(`eng.step_${funnelSteps[dropIdx].key}`)}» (−{dropAmt}).
          </p>
        )}
      </Card>

      {/* ── Engagement segments ── */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.segments_title")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["bounced", "one_and_done", "engaged", "champion"] as const).map((k) => {
            const v = seg[k];
            const style = SEGMENT_STYLE[k];
            return (
              <div key={k} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{v}</span>
                  <Badge variant="secondary" className={`text-[10px] ${style.badge}`}>{pct(v / segTotal)}</Badge>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className={`h-full ${style.bar}`} style={{ width: `${(v / segTotal) * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-200">{segLabel(k)}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{t(`eng.seg_${k}_desc`)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Retention & activation ── */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.retention_title")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: t("eng.ret_day0"), value: `${data.retention.day0}` },
            { label: t("eng.ret_d1_7"), value: `${data.retention.d1_7}` },
            { label: t("eng.ret_d8"), value: `${data.retention.d8plus}` },
            { label: t("eng.ttfr"), value: data.ttfr.median != null ? `${data.ttfr.median} ${t("eng.minutes")}` : "—" },
          ].map((s, i) => (
            <div key={i} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Feature adoption ── */}
      <Card className="p-5">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.features_title")}</h3>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">{t("eng.features_hint")}</p>
        <div className="space-y-2">
          {data.featureAdoption.map((fa) => {
            const lift = fa.retentionLift;
            const better = lift != null && lift >= 1.15;
            const worse = lift != null && lift <= 0.85;
            return (
              <div key={fa.feature} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-600 dark:text-gray-300 w-28 shrink-0">{featLabel(fa.feature)}</span>
                <div className="flex-1 h-4 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div className="h-full rounded bg-violet-400" style={{ width: `${Math.max(fa.pct * 100, fa.users > 0 ? 2 : 0)}%` }} />
                </div>
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 w-16 text-right">{fa.users} · {pct(fa.pct)}</span>
                <span className="w-24 text-right">
                  {(better || worse) && (
                    <span className={`text-[10px] inline-flex items-center gap-0.5 ${better ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {better ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {better ? t("eng.retain_better") : t("eng.retain_worse")}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── What attracts them ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("eng.top_calculators")}</h3>
          {data.topCalculators.length === 0 ? (
            <p className="text-[11px] text-gray-400">{t("eng.no_data")}</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topCalculators.map((c) => (
                <li key={c.calc} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-700 dark:text-gray-200">{prettyId(c.calc)}</span>
                  <span className="text-gray-500">{c.users} {t("eng.by_users")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t("eng.top_templates")}</h3>
          {data.topTemplates.length === 0 ? (
            <p className="text-[11px] text-gray-400">{t("eng.no_data")}</p>
          ) : (
            <ul className="space-y-1.5">
              {data.topTemplates.map((c) => (
                <li key={c.template} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-700 dark:text-gray-200 truncate pr-2">{prettyId(c.template)}</span>
                  <span className="text-gray-500 shrink-0">{c.users} {t("eng.by_users")}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── Friction signals ── */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.friction_title")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {frictionItems.map((fi) => (
            <div key={fi.key} className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
              <p className={`text-lg font-bold ${fi.value > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400"}`}>{fi.value}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">{t(`eng.${fi.key}`)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Per-user table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("eng.users_title")}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-y border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-left">
                <th className="px-3 py-2 font-medium">{t("eng.col_user")}</th>
                <th className="px-3 py-2 font-medium">{t("eng.col_signup")}</th>
                <th className="px-3 py-2 font-medium">{t("eng.col_plan")}</th>
                <th className="px-3 py-2 font-medium text-center">{t("eng.col_reports")}</th>
                <th className="px-3 py-2 font-medium text-center">{t("eng.col_days")}</th>
                <th className="px-3 py-2 font-medium text-center">{t("eng.col_tools")}</th>
                <th className="px-3 py-2 font-medium">{t("eng.col_lastseen")}</th>
                <th className="px-3 py-2 font-medium">{t("eng.col_segment")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("eng.col_score")}</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-800 dark:text-gray-200 truncate max-w-[180px]">{u.email}</span>
                      {u.paying && <Badge variant="secondary" className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">$</Badge>}
                      {!u.emailVerified && <span className="text-amber-500" title={t("eng.fr_unverified")}>●</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(u.signup)}</td>
                  <td className="px-3 py-2 text-gray-500">{u.plan}</td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-200">{u.reports}</td>
                  <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-200">{u.activeDays}</td>
                  <td className="px-3 py-2 text-center text-gray-500" title={u.features.join(", ")}>{u.featureCount}</td>
                  <td className="px-3 py-2 text-gray-500">{fmtDate(u.lastSeen)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className={`text-[9px] ${SEGMENT_STYLE[u.segment].badge}`}>{segLabel(u.segment)}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-10 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-violet-500" style={{ width: `${u.score}%` }} />
                      </div>
                      <span className="text-gray-500 w-6 text-right">{u.score}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
