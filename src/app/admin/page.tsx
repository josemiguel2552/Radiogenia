"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Shield, Plug, Users, Loader2, Check, X,
  Eye, EyeOff, FileText, Zap, TrendingUp, CreditCard,
  BarChart3, Trash2, UserCog, Crown, RefreshCw,
} from "lucide-react";
import { PROVIDERS, PLANS, type SubscriptionPlan } from "@/lib/types";

interface GlobalConfig {
  id: string;
  provider: string;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  updated_at: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription_plan: string;
  reports_used_this_month: number;
  created_at: string;
  report_count: number;
}

interface Stats {
  totalUsers: number;
  totalReports: number;
  reportsThisMonth: number;
  activeThisMonth: number;
  planCounts: { free: number; starter: number; professional: number };
  mrr: number;
  reportsPerDay: Record<string, number>;
  modalityCounts: Record<string, number>;
}

type Tab = "overview" | "users" | "ai" | "plans";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Config
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [provider, setProvider] = useState("deepseek");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState(false);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);

  const selectedProvider = PROVIDERS.find((p) => p.value === provider);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [statsRes, configRes, usersRes] = await Promise.all([
      fetch("/api/admin/stats").catch(() => null),
      fetch("/api/admin/config").catch(() => null),
      fetch("/api/admin/users").catch(() => null),
    ]);

    if (statsRes?.ok) setStats(await statsRes.json());
    if (configRes?.ok) {
      const d = await configRes.json();
      setConfig(d);
      setProvider(d.provider || "deepseek");
      setModelName(d.model_name || "deepseek-chat");
      setApiKey(d.api_key_encrypted || "");
      setCustomUrl(d.custom_base_url || "");
    }
    if (usersRes?.ok) {
      const d = await usersRes.json();
      setUsers(d.users || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleSaveConfig() {
    setSaving(true);
    setConfigError("");
    setConfigSuccess(false);
    try {
      const body: Record<string, string> = { provider, model_name: modelName };
      if (apiKey && apiKey !== "••••••••") body.api_key = apiKey;
      body.custom_base_url = provider === "custom" ? customUrl : "";

      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setConfigError((await res.json()).error || "Failed");
      } else {
        const d = await res.json();
        setConfig(d);
        setApiKey(d.api_key_encrypted || "");
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
      }
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "Failed");
    }
    setSaving(false);
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider, model_name: modelName,
          api_key: apiKey === "••••••••" ? "" : apiKey,
          custom_base_url: provider === "custom" ? customUrl : "",
        }),
      });
      setTestResult((await res.json()).ok ?? false);
    } catch { setTestResult(false); }
    setTesting(false);
  }

  async function handleSaveUser() {
    if (!editUser) return;
    setSavingUser(true);
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editUser.id,
        role: editRole,
        subscription_plan: editPlan,
      }),
    });
    setSavingUser(false);
    setEditUser(null);
    loadAll();
  }

  async function handleDeleteUser() {
    if (!deleteConfirm) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: deleteConfirm.id }),
    });
    setDeleteConfirm(null);
    loadAll();
  }

  const radiologists = users.filter((u) => u.role !== "admin");
  const totalReports = users.reduce((s, u) => s + u.report_count, 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "ai", label: "AI Config", icon: <Plug className="h-4 w-4" /> },
    { key: "plans", label: "Plans", icon: <CreditCard className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Radiogen.ai</span>
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
              Admin
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto" onClick={loadAll} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tab navigation */}
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={<Users className="h-5 w-5 text-blue-500" />} label="Total Users" value={stats?.totalUsers ?? radiologists.length} />
              <StatCard icon={<FileText className="h-5 w-5 text-purple-500" />} label="Total Reports" value={stats?.totalReports ?? totalReports} />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-green-500" />} label="Reports This Month" value={stats?.reportsThisMonth ?? 0} />
              <StatCard icon={<CreditCard className="h-5 w-5 text-amber-500" />} label="MRR" value={`€${stats?.mrr?.toFixed(2) ?? "0.00"}`} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Plan distribution */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Plan Distribution</h3>
                </div>
                <CardContent className="pt-0 space-y-3">
                  {(["free", "starter", "professional"] as const).map((p) => {
                    const count = stats?.planCounts?.[p] ?? 0;
                    const total = stats?.totalUsers ?? 1;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={p} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">{p}</span>
                          <span className="text-gray-500">{count} users ({pct}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              p === "free" ? "bg-gray-400" : p === "starter" ? "bg-blue-500" : "bg-purple-500"
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Modality usage */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Reports by Modality</h3>
                </div>
                <CardContent className="pt-0 space-y-2">
                  {stats?.modalityCounts && Object.keys(stats.modalityCounts).length > 0 ? (
                    Object.entries(stats.modalityCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 8)
                      .map(([mod, count]) => (
                        <div key={mod} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 dark:text-gray-300">{mod}</span>
                          <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-gray-400 py-4 text-center">No reports yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* AI status */}
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Plug className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedProvider?.label || provider} — {modelName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {config?.updated_at ? `Updated ${new Date(config.updated_at).toLocaleDateString()}` : "Global AI configuration"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab("ai")} className="text-xs gap-1.5">
                  <Plug className="h-3 w-3" /> Configure
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ USERS ═══ */}
        {tab === "users" && (
          <Card>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <Users className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">User Management</h2>
              <Badge variant="secondary" className="ml-auto text-xs">{radiologists.length} radiologists</Badge>
            </div>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">User</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Role</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Plan</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Usage</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Total</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Joined</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const plan = (u.subscription_plan || "free") as SubscriptionPlan;
                      const planConfig = PLANS[plan];
                      const usagePct = u.role === "admin" ? 0 : Math.round(((u.reports_used_this_month || 0) / planConfig.reports) * 100);
                      return (
                        <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium text-xs">{u.name || "—"}</p>
                              <p className="text-[11px] text-gray-500">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {u.role === "admin" ? (
                                <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> Admin</span>
                              ) : "Radiologist"}
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            {u.role !== "admin" && (
                              <Badge
                                className={`text-[10px] ${
                                  plan === "professional"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    : plan === "starter"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {plan === "professional" && <Crown className="h-2.5 w-2.5 mr-0.5" />}
                                {planConfig.label}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {u.role !== "admin" && (
                              <div className="inline-flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${usagePct > 80 ? "bg-red-500" : usagePct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 w-16 text-right">
                                  {u.reports_used_this_month || 0}/{planConfig.reports}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <span className="flex items-center justify-end gap-1 text-gray-600 dark:text-gray-400 text-xs">
                              <FileText className="h-3 w-3" />
                              {u.report_count}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right text-gray-500 text-[11px]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {u.role !== "admin" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setEditUser(u); setEditRole(u.role); setEditPlan(u.subscription_plan || "free"); }}
                                  title="Edit user"
                                >
                                  <UserCog className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => setDeleteConfirm(u)}
                                  title="Delete user"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ AI CONFIG ═══ */}
        {tab === "ai" && (
          <Card>
            <div className="flex items-center gap-2 px-5 pt-5 pb-3">
              <Plug className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Global AI Configuration</h2>
            </div>
            <CardContent className="space-y-4 pt-0 max-w-xl">
              <p className="text-xs text-gray-500">
                This model and API key are used for all radiologists on the platform.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <Select value={provider} onValueChange={(v) => {
                  setProvider(v);
                  const prov = PROVIDERS.find((p) => p.value === v);
                  if (prov?.models.length) setModelName(prov.models[0]);
                  setTestResult(null);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                {selectedProvider && selectedProvider.models.length > 0 ? (
                  <Select value={modelName} onValueChange={(v) => { setModelName(v); setTestResult(null); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedProvider.models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    type="text" value={modelName}
                    onChange={(e) => { setModelName(e.target.value); setTestResult(null); }}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                    placeholder="Model name"
                  />
                )}
              </div>

              {provider === "custom" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Custom Base URL</Label>
                  <input
                    type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                    placeholder="https://your-endpoint.com/v1"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">API Key</Label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"} value={apiKey}
                    onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                    className="w-full px-3 py-2 pr-10 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                    placeholder="Enter API key"
                  />
                  <button type="button" onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleTestConnection}
                  disabled={testing || !apiKey || apiKey === "••••••••"} className="gap-1.5">
                  {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                   testResult === true ? <Check className="h-3.5 w-3.5 text-green-600" /> :
                   testResult === false ? <X className="h-3.5 w-3.5 text-red-500" /> :
                   <Plug className="h-3.5 w-3.5" />}
                  {testResult === true ? "Connected" : testResult === false ? "Failed" : "Test connection"}
                </Button>
                <Button size="sm" onClick={handleSaveConfig} disabled={saving}
                  className="gap-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save configuration
                </Button>
              </div>

              {configError && <p className="text-xs text-red-500">{configError}</p>}
              {configSuccess && <p className="text-xs text-green-600">Configuration saved successfully.</p>}
              {config?.updated_at && (
                <p className="text-[11px] text-gray-400">Last updated: {new Date(config.updated_at).toLocaleString()}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ PLANS ═══ */}
        {tab === "plans" && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {(["free", "starter", "professional"] as const).map((key) => {
                const plan = PLANS[key];
                const count = stats?.planCounts?.[key] ?? 0;
                const revenue = key === "free" ? 0 : count * plan.price;
                return (
                  <Card key={key} className={plan.highlight ? "ring-2 ring-blue-500/30" : ""}>
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{plan.label}</h3>
                        <Badge variant="secondary" className="text-xs">{count} users</Badge>
                      </div>
                      <div className="flex items-baseline gap-1">
                        {plan.price === 0 ? (
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">Free</span>
                        ) : (
                          <>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">&euro;{plan.price}</span>
                            <span className="text-xs text-gray-500">/month</span>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>{plan.reports} reports/month</p>
                        <p>~{plan.tokensPerReport.toLocaleString()} tokens/report</p>
                        <p>Cost/report: ~€0.005</p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Revenue</span>
                          <span className="font-semibold text-gray-900 dark:text-white">€{revenue.toFixed(2)}/mo</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">AI cost</span>
                          <span className="text-gray-600 dark:text-gray-400">~€{(count * plan.reports * 0.005).toFixed(2)}/mo max</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Token Economics</h3>
                <div className="grid md:grid-cols-3 gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">Per Report</p>
                    <p>~8,000 input tokens</p>
                    <p>~2,000 output tokens</p>
                    <p>Total: ~10,000 tokens</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">DeepSeek Pricing</p>
                    <p>Input: $0.27/M tokens</p>
                    <p>Output: $1.10/M tokens</p>
                    <p>Per report: ~$0.004-0.005</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-white">Margins</p>
                    <p>Free: marketing cost (~€0.25/user/mo)</p>
                    <p>Starter: ~92% margin</p>
                    <p>Professional: ~87% margin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit user dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{editUser.name || "—"}</p>
                <p className="text-xs text-gray-500">{editUser.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radiologist">Radiologist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Subscription Plan</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free (50 reports/mo)</SelectItem>
                    <SelectItem value="starter">Starter — €9.99 (150 reports/mo)</SelectItem>
                    <SelectItem value="professional">Professional — €14.99 (400 reports/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white" onClick={handleSaveUser} disabled={savingUser}>
                  {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{deleteConfirm.email}</span>?
                This will remove all their data including reports, templates, and recommendations.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteUser}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-[11px] text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
