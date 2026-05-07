"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Shield, Plug, Users, Loader2, Check, X, Mic,
  Eye, EyeOff, FileText, Zap, TrendingUp, CreditCard,
  BarChart3, Trash2, UserCog, UserPlus, Crown, RefreshCw,
  Upload, GraduationCap, ChevronDown, ClipboardList, Flag, Download, Database,
  Building2, MessageSquare,
} from "lucide-react";
import { PROVIDERS, PLANS, type SubscriptionPlan } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { AdminOrganizationsTab } from "@/components/admin/admin-organizations-tab";
import { AdminSupportTab } from "@/components/admin/admin-support-tab";
import { AdminResidentsTab } from "@/components/admin/admin-residents-tab";
import { AdminWaitlistTab } from "@/components/admin/admin-waitlist-tab";

interface GlobalConfig {
  id: string;
  provider: string;
  model_name: string;
  api_key_encrypted: string;
  whisper_api_key_encrypted: string;
  anthropic_api_key_encrypted: string;
  google_api_key_encrypted: string;
  deepseek_api_key_encrypted: string;
  custom_api_key_encrypted: string;
  custom_base_url: string;
  findings_provider: string | null;
  findings_model: string | null;
  conclusion_provider: string | null;
  conclusion_model: string | null;
  trace_provider: string | null;
  trace_model: string | null;
  dictation_correction_provider: string | null;
  dictation_correction_model: string | null;
  improve_writing_provider: string | null;
  improve_writing_model: string | null;
  updated_at: string;
}

interface FtJob {
  jobId: string;
  status: string;
  fineTunedModel: string | null;
  model: string;
  createdAt: number;
  finishedAt: number | null;
}

type TaskKey = "findings" | "conclusion" | "trace" | "dictation_correction" | "improve_writing";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  subscription_plan: string;
  reports_used_this_month: number;
  dictation_seconds_used: number;
  created_at: string;
  report_count: number;
}

interface Stats {
  totalUsers: number;
  totalReports: number;
  reportsThisMonth: number;
  activeThisMonth: number;
  planCounts: { free: number; resident: number; starter: number; professional: number };
  mrr: number;
  totalDictationMinutes: number;
  reportsPerDay: Record<string, number>;
  modalityCounts: Record<string, number>;
}

type Tab = "overview" | "users" | "ai" | "plans" | "orgs" | "residents" | "support" | "audit" | "waitlist";

export default function AdminPage() {
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);

  // Config
  const [config, setConfig] = useState<GlobalConfig | null>(null);
  const [provider, setProvider] = useState("deepseek");
  const [modelName, setModelName] = useState("deepseek-chat");
  const [apiKey, setApiKey] = useState("");
  const [whisperKey, setWhisperKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [customProvKey, setCustomProvKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [showWhisperKey, setShowWhisperKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState("");
  const [configSuccess, setConfigSuccess] = useState(false);

  // Per-task model overrides
  const [taskOverrides, setTaskOverrides] = useState<Record<TaskKey, { provider: string; model: string }>>({
    findings: { provider: "", model: "" },
    conclusion: { provider: "", model: "" },
    trace: { provider: "", model: "" },
    dictation_correction: { provider: "", model: "" },
    improve_writing: { provider: "", model: "" },
  });

  // Combo pipeline
  const [findingsCombo, setFindingsCombo] = useState(false);

  // Fine-tuning
  const [ftJobs, setFtJobs] = useState<FtJob[]>([]);
  const [ftModelsList, setFtModelsList] = useState<string[]>([]);
  const [ftUploading, setFtUploading] = useState(false);
  const [ftStarting, setFtStarting] = useState(false);
  const [ftFileId, setFtFileId] = useState<string | null>(null);
  const [ftExamples, setFtExamples] = useState(0);
  const [ftSuffix, setFtSuffix] = useState("radiogenai");
  const [ftBaseModel, setFtBaseModel] = useState("gpt-4o-mini-2024-07-18");
  const [ftError, setFtError] = useState("");
  const [ftChecking, setFtChecking] = useState(false);

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPlan, setCreatePlan] = useState("free");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");

  // Audit logs
  interface AuditLog {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    report_id: string | null;
    action: string;
    provider: string | null;
    model: string | null;
    duration_ms: number | null;
    had_corrections: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
  }
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [auditLoading, setAuditLoading] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Training data
  interface TrainingRow {
    id: string;
    user_email: string | null;
    user_name: string | null;
    study_type: string;
    modality: string;
    raw_dictation: string;
    clinical_context: string | null;
    initial_findings_text: string | null;
    initial_conclusion_text: string | null;
    findings_text: string;
    conclusion_text: string;
    had_corrections: boolean;
    provider_used: string | null;
    model_used: string | null;
    error_reported: boolean;
    error_report_note: string | null;
    created_at: string;
  }
  const [trainingData, setTrainingData] = useState<TrainingRow[]>([]);
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [trainingModality, setTrainingModality] = useState<string>("all");
  const [trainingCorrectionsOnly, setTrainingCorrectionsOnly] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

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
      setWhisperKey(d.whisper_api_key_encrypted || "");
      setAnthropicKey(d.anthropic_api_key_encrypted || "");
      setGoogleKey(d.google_api_key_encrypted || "");
      setDeepseekKey(d.deepseek_api_key_encrypted || "");
      setCustomProvKey(d.custom_api_key_encrypted || "");
      setCustomUrl(d.custom_base_url || "");
      const isCombo = d.findings_provider === "combo";
      setTaskOverrides({
        findings: isCombo ? { provider: "", model: "" } : { provider: d.findings_provider || "", model: d.findings_model || "" },
        conclusion: { provider: d.conclusion_provider || "", model: d.conclusion_model || "" },
        trace: { provider: d.trace_provider || "", model: d.trace_model || "" },
        dictation_correction: { provider: d.dictation_correction_provider || "", model: d.dictation_correction_model || "" },
        improve_writing: { provider: d.improve_writing_provider || "", model: d.improve_writing_model || "" },
      });
      setFindingsCombo(isCombo);
    }

    try {
      const ftRes = await fetch("/api/finetune/status");
      if (ftRes?.ok) {
        const ftData = await ftRes.json();
        setFtJobs(ftData.jobs || []);
        setFtModelsList(ftData.ftModels || []);
      }
    } catch { /* fine-tune listing may fail if not OpenAI */ }
    if (usersRes?.ok) {
      const d = await usersRes.json();
      setUsers(d.users || []);
    }

    try {
      const auditRes = await fetch("/api/admin/audit-logs?limit=100");
      if (auditRes?.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs || []);
      }
    } catch { /* audit_logs table may not exist yet */ }

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (tab === "audit" && trainingData.length === 0 && !trainingLoading) {
      loadTrainingData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleSaveConfig() {
    setSaving(true);
    setConfigError("");
    setConfigSuccess(false);
    try {
      const body: Record<string, string> = { provider, model_name: modelName };
      if (apiKey && apiKey !== "••••••••") body.api_key = apiKey;
      if (whisperKey && whisperKey !== "••••••••") body.whisper_api_key = whisperKey;
      if (anthropicKey && anthropicKey !== "••••••••") body.anthropic_api_key = anthropicKey;
      if (googleKey && googleKey !== "••••••••") body.google_api_key = googleKey;
      if (deepseekKey && deepseekKey !== "••••••••") body.deepseek_api_key = deepseekKey;
      if (customProvKey && customProvKey !== "••••••••") body.custom_api_key = customProvKey;
      body.custom_base_url = provider === "custom" ? customUrl : "";

      for (const task of ["findings", "conclusion", "trace", "dictation_correction", "improve_writing"] as TaskKey[]) {
        if (task === "findings" && findingsCombo) {
          body.findings_provider = "combo";
          body.findings_model = "gpt4mini+deepseek-v3";
          continue;
        }
        const o = taskOverrides[task];
        body[`${task}_provider`] = o.provider || "";
        body[`${task}_model`] = o.model || "";
      }

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
        setWhisperKey(d.whisper_api_key_encrypted || "");
        setAnthropicKey(d.anthropic_api_key_encrypted || "");
        setGoogleKey(d.google_api_key_encrypted || "");
        setDeepseekKey(d.deepseek_api_key_encrypted || "");
        setCustomProvKey(d.custom_api_key_encrypted || "");
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

  function updateTaskOverride(task: TaskKey, field: "provider" | "model", value: string) {
    setTaskOverrides((prev) => ({
      ...prev,
      [task]: { ...prev[task], [field]: value },
    }));
  }

  async function handleFtUpload(file: File) {
    setFtUploading(true);
    setFtError("");
    setFtFileId(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/finetune/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { setFtError(data.error || "Upload failed"); return; }
      setFtFileId(data.fileId);
      setFtExamples(data.validExamples);
    } catch (e) {
      setFtError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setFtUploading(false);
    }
  }

  async function handleFtStart() {
    if (!ftFileId) return;
    setFtStarting(true);
    setFtError("");
    try {
      const res = await fetch("/api/finetune/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: ftFileId, baseModel: ftBaseModel, suffix: ftSuffix }),
      });
      const data = await res.json();
      if (!res.ok) { setFtError(data.error || "Failed to start"); return; }
      setFtJobs((prev) => [{ jobId: data.jobId, status: data.status, model: data.model, fineTunedModel: null, createdAt: data.createdAt, finishedAt: null }, ...prev]);
      setFtFileId(null);
    } catch (e) {
      setFtError(e instanceof Error ? e.message : "Failed");
    } finally {
      setFtStarting(false);
    }
  }

  async function handleFtCheckStatus(jobId: string) {
    setFtChecking(true);
    try {
      const res = await fetch("/api/finetune/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFtJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, status: data.status, fineTunedModel: data.fineTunedModel, finishedAt: data.finishedAt } : j));
      }
    } catch { /* ignore */ }
    setFtChecking(false);
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

  async function handleCreateUser() {
    setCreateError("");
    if (!createEmail || !createPassword) {
      setCreateError(t("admin.email_password_required"));
      return;
    }
    if (createPassword.length < 6) {
      setCreateError(t("admin.password_min_length"));
      return;
    }
    setCreatingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          subscription_plan: createPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || t("admin.failed_create_user"));
      } else {
        setCreateOpen(false);
        setCreateEmail("");
        setCreatePassword("");
        setCreatePlan("free");
        loadAll();
      }
    } catch {
      setCreateError(t("admin.network_error"));
    }
    setCreatingUser(false);
  }

  async function loadTrainingData() {
    setTrainingLoading(true);
    setTrainingError(null);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (trainingModality !== "all") params.set("modality", trainingModality);
      if (trainingCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data?${params}`);
      const d = await res.json();
      if (d.error) {
        setTrainingError(d.error);
      }
      setTrainingData(d.reports || []);
    } catch (e) {
      setTrainingError(e instanceof Error ? e.message : t("admin.failed_load_training"));
    }
    setTrainingLoading(false);
  }

  async function handleExportJsonl() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "jsonl", limit: "500" });
      if (trainingModality !== "all") params.set("modality", trainingModality);
      if (trainingCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `radiogenai-training-${new Date().toISOString().slice(0, 10)}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    setExporting(false);
  }

  const radiologists = users.filter((u) => u.role !== "admin");
  const totalReports = users.reduce((s, u) => s + u.report_count, 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("admin.tab_overview"), icon: <BarChart3 className="h-4 w-4" /> },
    { key: "users", label: t("admin.tab_users"), icon: <Users className="h-4 w-4" /> },
    { key: "ai", label: t("admin.tab_ai_config"), icon: <Plug className="h-4 w-4" /> },
    { key: "plans", label: t("admin.tab_plans"), icon: <CreditCard className="h-4 w-4" /> },
    { key: "orgs", label: t("admin.tab_hospitals"), icon: <Building2 className="h-4 w-4" /> },
    { key: "residents", label: t("admin.tab_residents"), icon: <GraduationCap className="h-4 w-4" /> },
    { key: "support", label: t("admin.tab_support"), icon: <MessageSquare className="h-4 w-4" /> },
    { key: "waitlist", label: t("admin.tab_waitlist"), icon: <UserPlus className="h-4 w-4" /> },
    { key: "audit", label: t("admin.tab_audit"), icon: <ClipboardList className="h-4 w-4" /> },
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
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-12 md:h-14 flex items-center gap-3 md:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Logo size="sm" variant="icon" className="sm:hidden" />
            <Logo size="sm" className="hidden sm:inline-flex" />
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
              {t("admin.badge")}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto h-9 w-9" onClick={loadAll} title={t("admin.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* Tab navigation — scrollable on mobile */}
        <div className="flex gap-1 mb-4 md:mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto w-full md:w-fit scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon={<Users className="h-5 w-5 text-blue-500" />} label={t("admin.total_users")} value={stats?.totalUsers ?? radiologists.length} />
              <StatCard icon={<FileText className="h-5 w-5 text-purple-500" />} label={t("admin.total_reports")} value={stats?.totalReports ?? totalReports} />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-green-500" />} label={t("admin.reports_this_month")} value={stats?.reportsThisMonth ?? 0} />
              <StatCard icon={<Mic className="h-5 w-5 text-violet-500" />} label={t("admin.dictation_min")} value={`${stats?.totalDictationMinutes ?? 0} min`} />
              <StatCard icon={<CreditCard className="h-5 w-5 text-amber-500" />} label={t("admin.mrr")} value={`$${stats?.mrr?.toFixed(2) ?? "0.00"}`} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Plan distribution */}
              <Card>
                <div className="px-5 pt-5 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.plan_distribution")}</h3>
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
                          <span className="text-gray-500">{count} {t("admin.users_count")} ({pct}%)</span>
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
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.reports_by_modality")}</h3>
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
                    <p className="text-xs text-gray-400 py-4 text-center">{t("admin.no_reports_yet")}</p>
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
                    {config?.updated_at ? `${t("admin.updated")} ${new Date(config.updated_at).toLocaleDateString()}` : t("admin.global_ai_config")}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setTab("ai")} className="text-xs gap-1.5">
                  <Plug className="h-3 w-3" /> {t("admin.configure")}
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
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.user_management")}</h2>
              <Badge variant="secondary" className="text-xs">{radiologists.length} {t("admin.radiologists")}</Badge>
              <Button
                size="sm"
                className="ml-auto gap-1.5 h-8 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                onClick={() => { setCreateOpen(true); setCreateError(""); }}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("admin.add_user")}
              </Button>
            </div>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_user")}</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden sm:table-cell">{t("admin.th_role")}</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_plan")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.th_reports_mo")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden lg:table-cell">{t("admin.th_dictation_mo")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_total")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.th_joined")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const plan = (u.subscription_plan || "free") as SubscriptionPlan;
                      const planConfig = PLANS[plan];
                      const usagePct = u.role === "admin" ? 0 : Math.round(((u.reports_used_this_month || 0) / planConfig.reports) * 100);
                      const dictUsedMin = Math.round((u.dictation_seconds_used || 0) / 60);
                      const dictLimitMin = planConfig.dictationMinutes;
                      const dictPct = u.role === "admin" ? 0 : (dictLimitMin > 0 ? Math.round((dictUsedMin / dictLimitMin) * 100) : 0);
                      return (
                        <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                          <td className="py-3 px-2">
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium text-xs">{u.name || "—"}</p>
                              <p className="text-[11px] text-gray-500">{u.email}</p>
                            </div>
                          </td>
                          <td className="py-3 px-2 hidden sm:table-cell">
                            <Badge
                              variant={u.role === "admin" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {u.role === "admin" ? (
                                <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> {t("admin.role_admin")}</span>
                              ) : t("admin.role_radiologist")}
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
                          <td className="py-3 px-2 text-right hidden md:table-cell">
                            {u.role !== "admin" && (
                              <div className="inline-flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${usagePct > 80 ? "bg-red-500" : usagePct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 w-14 text-right">
                                  {u.reports_used_this_month || 0}/{planConfig.reports}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right hidden lg:table-cell">
                            {u.role !== "admin" && (
                              <div className="inline-flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${dictPct > 80 ? "bg-red-500" : dictPct > 50 ? "bg-amber-500" : "bg-violet-500"}`}
                                    style={{ width: `${Math.min(dictPct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 w-16 text-right">
                                  {dictUsedMin}/{dictLimitMin}m
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
                          <td className="py-3 px-2 text-right text-gray-500 text-[11px] hidden md:table-cell">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-2 text-right">
                            {u.role !== "admin" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setEditUser(u); setEditRole(u.role); setEditPlan(u.subscription_plan || "free"); }}
                                  title={t("admin.edit_user")}
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
          <div className="space-y-4">
            {/* ── Default model + keys ── */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Plug className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.default_model_keys")}</h2>
              </div>
              <CardContent className="space-y-4 pt-0 max-w-xl">
                <p className="text-xs text-gray-500">
                  {t("admin.default_provider_desc")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.provider")}</Label>
                    <Select value={provider} onValueChange={(v) => {
                      setProvider(v);
                      const prov = PROVIDERS.find((p) => p.value === v);
                      if (prov?.models.length) setModelName(prov.models[0]);
                      setTestResult(null);
                    }}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.model")}</Label>
                    {(() => {
                      const base = selectedProvider?.models || [];
                      const ft = provider === "openai"
                        ? ftModelsList
                        : [];
                      const all = [...base, ...ft];
                      const inList = !modelName || all.includes(modelName);
                      return all.length > 0 ? (
                        <Select value={modelName} onValueChange={(v) => { setModelName(v); setTestResult(null); }}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {base.length > 0 && <SelectGroup><SelectLabel className="text-[10px]">{t("admin.standard")}</SelectLabel>
                              {base.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectGroup>}
                            {ft.length > 0 && <SelectGroup><SelectLabel className="text-[10px]">{t("admin.fine_tuned")}</SelectLabel>
                              {ft.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                            </SelectGroup>}
                            {!inList && modelName && (
                              <SelectGroup><SelectLabel className="text-[10px]">{t("admin.current")}</SelectLabel>
                                <SelectItem value={modelName}>{modelName}</SelectItem>
                              </SelectGroup>
                            )}
                          </SelectContent>
                        </Select>
                      ) : (
                        <input type="text" value={modelName}
                          onChange={(e) => { setModelName(e.target.value); setTestResult(null); }}
                          className="w-full h-9 px-3 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                          placeholder={t("admin.model_name")} />
                      );
                    })()}
                  </div>
                </div>

                {provider === "custom" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.custom_base_url")}</Label>
                    <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)}
                      className="w-full h-9 px-3 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                      placeholder="https://your-endpoint.com/v1" />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.api_key")}</Label>
                    <div className="relative">
                      <input type={showKey ? "text" : "password"} value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                        className="w-full h-9 px-3 pr-9 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                        placeholder={t("admin.api_key")} />
                      <button type="button" onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.whisper_key")}</Label>
                    <div className="relative">
                      <input type={showWhisperKey ? "text" : "password"} value={whisperKey}
                        onChange={(e) => setWhisperKey(e.target.value)}
                        className="w-full h-9 px-3 pr-9 border rounded-md text-sm bg-white dark:bg-gray-900 dark:border-gray-700"
                        placeholder="sk-..." />
                      <button type="button" onClick={() => setShowWhisperKey(!showWhisperKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showWhisperKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={handleTestConnection}
                    disabled={testing || !apiKey || apiKey === "••••••••"} className="gap-1.5">
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                     testResult === true ? <Check className="h-3.5 w-3.5 text-green-600" /> :
                     testResult === false ? <X className="h-3.5 w-3.5 text-red-500" /> :
                     <Plug className="h-3.5 w-3.5" />}
                    {testResult === true ? t("admin.connected") : testResult === false ? t("admin.failed") : t("admin.test")}
                  </Button>
                  <Button size="sm" onClick={handleSaveConfig} disabled={saving}
                    className="gap-1.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {t("admin.save_all")}
                  </Button>
                </div>
                {configError && <p className="text-xs text-red-500">{configError}</p>}
                {configSuccess && <p className="text-xs text-green-600">{t("admin.config_saved")}</p>}
                {config?.updated_at && (
                  <p className="text-[11px] text-gray-400">{t("admin.last_updated")}: {new Date(config.updated_at).toLocaleString()}</p>
                )}
              </CardContent>
            </Card>

            {/* ── Per-task model overrides ── */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Zap className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.per_task_overrides")}</h2>
              </div>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-gray-500">
                  {t("admin.per_task_desc")}
                </p>
                {([
                  { key: "findings" as TaskKey, label: t("admin.task_findings"), desc: t("admin.task_findings_desc") },
                  { key: "conclusion" as TaskKey, label: t("admin.task_conclusion"), desc: t("admin.task_conclusion_desc") },
                  { key: "trace" as TaskKey, label: t("admin.task_traceability"), desc: t("admin.task_traceability_desc") },
                  { key: "dictation_correction" as TaskKey, label: t("admin.task_dictation_correction"), desc: t("admin.task_dictation_correction_desc") },
                  { key: "improve_writing" as TaskKey, label: t("admin.task_improve_writing"), desc: t("admin.task_improve_writing_desc") },
                ]).map(({ key, label, desc }) => {
                  const isComboOverride = key === "findings" && findingsCombo;
                  const o = taskOverrides[key];
                  const taskProv = PROVIDERS.find((p) => p.value === o.provider);
                  return (
                    <div key={key} className={`rounded-lg border p-3 space-y-2 ${isComboOverride ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10" : ""}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
                          <p className="text-[10px] text-gray-400">{desc}</p>
                        </div>
                        {isComboOverride ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">{t("admin.combo_active")}</Badge>
                        ) : o.provider && o.model ? (
                          <Badge variant="secondary" className="text-[10px]">{o.provider}/{o.model.split("/").pop()}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-gray-400">{t("admin.default")}</Badge>
                        )}
                      </div>
                      {isComboOverride ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {t("admin.combo_managed")}
                        </p>
                      ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 items-end">
                        <Select value={o.provider || "default"} onValueChange={(v) => {
                          const val = v === "default" ? "" : v;
                          updateTaskOverride(key, "provider", val);
                          if (val) {
                            const p = PROVIDERS.find((pp) => pp.value === val);
                            if (p?.models.length) updateTaskOverride(key, "model", p.models[0]);
                          } else {
                            updateTaskOverride(key, "model", "");
                          }
                        }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">{t("admin.default")}</SelectItem>
                            {PROVIDERS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {o.provider ? (
                          (() => {
                            const baseModels = taskProv?.models || [];
                            const ftModels = o.provider === "openai"
                              ? ftModelsList
                              : [];
                            const allModels = [...baseModels, ...ftModels];
                            const currentInList = !o.model || allModels.includes(o.model);
                            return allModels.length > 0 ? (
                              <Select value={o.model} onValueChange={(v) => updateTaskOverride(key, "model", v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("admin.model")} /></SelectTrigger>
                                <SelectContent>
                                  {baseModels.length > 0 && <SelectGroup><SelectLabel className="text-[10px]">{t("admin.standard")}</SelectLabel>
                                    {baseModels.map((m) => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                  </SelectGroup>}
                                  {ftModels.length > 0 && <SelectGroup><SelectLabel className="text-[10px]">{t("admin.fine_tuned")}</SelectLabel>
                                    {ftModels.map((m) => (
                                      <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                  </SelectGroup>}
                                  {!currentInList && o.model && (
                                    <SelectGroup><SelectLabel className="text-[10px]">{t("admin.current")}</SelectLabel>
                                      <SelectItem value={o.model}>{o.model}</SelectItem>
                                    </SelectGroup>
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <input type="text" value={o.model}
                                onChange={(e) => updateTaskOverride(key, "model", e.target.value)}
                                className="h-8 px-2 border rounded-md text-xs bg-white dark:bg-gray-900 dark:border-gray-700"
                                placeholder={t("admin.model_name")} />
                            );
                          })()
                        ) : (
                          <div className="h-8 px-2 flex items-center text-xs text-gray-400 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                            {modelName}
                          </div>
                        )}
                        {o.provider && (
                          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400 hover:text-red-500"
                            onClick={() => { updateTaskOverride(key, "provider", ""); updateTaskOverride(key, "model", ""); }}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      )}
                    </div>
                  );
                })}

                {/* Provider API keys — show fields for providers that need a separate key */}
                {(() => {
                  // Collect all providers in use across task overrides that differ from default
                  const extraProviders = new Set<string>();
                  for (const task of ["findings", "conclusion", "trace", "dictation_correction", "improve_writing"] as TaskKey[]) {
                    const p = taskOverrides[task].provider;
                    if (p && p !== provider) extraProviders.add(p);
                  }

                  const keyConfig: { prov: string; label: string; value: string; setter: (v: string) => void; hint?: string }[] = [
                    { prov: "claude", label: "Anthropic (Claude)", value: anthropicKey, setter: setAnthropicKey },
                    { prov: "gemini", label: "Google (Gemini)", value: googleKey, setter: setGoogleKey },
                    { prov: "deepseek", label: "DeepSeek", value: deepseekKey, setter: setDeepseekKey },
                    { prov: "custom", label: "Custom Endpoint", value: customProvKey, setter: setCustomProvKey },
                    { prov: "openai", label: "OpenAI", value: whisperKey, setter: setWhisperKey, hint: "Uses the Whisper key above" },
                  ];

                  // Show fields only for providers different from the default (main key covers default)
                  const toShow = keyConfig.filter((k) => extraProviders.has(k.prov));

                  if (toShow.length === 0) return null;

                  return (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <Label className="text-xs font-semibold text-gray-900 dark:text-white">{t("admin.provider_api_keys")}</Label>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {t("admin.main_key_covers")} {PROVIDERS.find((p) => p.value === provider)?.label || provider}. {t("admin.add_keys_other_providers")}
                      </p>
                      <div className="space-y-2">
                        {toShow.map((k) => {
                          const isSaved = k.value === "••••••••";
                          return (
                            <div key={k.prov} className="flex items-center gap-2">
                              <Label className="text-xs text-gray-600 dark:text-gray-400 w-32 flex-shrink-0">{k.label}</Label>
                              {k.hint ? (
                                <div className="flex-1 h-8 px-2 flex items-center text-xs text-gray-400 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                                  {isSaved ? t("admin.configured_whisper_key") : k.hint}
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="password"
                                    value={k.value}
                                    onChange={(e) => k.setter(e.target.value)}
                                    className="flex-1 h-8 px-2 border rounded-md text-xs bg-white dark:bg-gray-900 dark:border-gray-700"
                                    placeholder={isSaved ? `••••••••  (${t("admin.saved")})` : t("admin.api_key")}
                                  />
                                  {k.value && !isSaved && (
                                    <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                                  )}
                                  {isSaved && (
                                    <Badge variant="secondary" className="text-[9px] flex-shrink-0">{t("admin.saved")}</Badge>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* ── Combo GPT-4 Mini + DeepSeek V3 ── */}
            <Card className={findingsCombo ? "ring-2 ring-emerald-500/30" : ""}>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Shield className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.combo_title")}</h2>
                {findingsCombo && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">{t("admin.active")}</Badge>}
              </div>
              <CardContent className="pt-0 space-y-3 max-w-xl">
                <p className="text-xs text-gray-500">
                  {t("admin.combo_desc")}
                </p>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("admin.enable_combo")}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {t("admin.enable_combo_desc")}
                    </p>
                  </div>
                  <Switch checked={findingsCombo} onCheckedChange={setFindingsCombo} />
                </div>

                {findingsCombo && (
                  <div className="space-y-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{t("admin.pipeline_stages")}</p>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">1</div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.combo_stage1_title")}</p>
                        <p className="text-[10px] text-gray-500">{t("admin.combo_stage1_desc")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400">2</div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.combo_stage2_title")}</p>
                        <p className="text-[10px] text-gray-500">{t("admin.combo_stage2_desc")}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      {t("admin.combo_note")}
                    </div>

                    {/* Key requirement indicators */}
                    <div className="mt-2 space-y-1">
                      {(() => {
                        const hasOpenAI = (apiKey && apiKey !== "••••••••" && provider === "openai") || (whisperKey && whisperKey !== "••••••••");
                        const hasDeepSeek = (apiKey && apiKey !== "••••••••" && provider === "deepseek") || (deepseekKey && deepseekKey !== "••••••••");
                        return (
                          <>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {hasOpenAI ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-400" />}
                              <span className={hasOpenAI ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                                {t("admin.openai_key")} {hasOpenAI ? t("admin.key_configured") : t("admin.key_required_openai")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              {hasDeepSeek ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-red-400" />}
                              <span className={hasDeepSeek ? "text-green-600 dark:text-green-400" : "text-red-500"}>
                                {t("admin.deepseek_key")} {hasDeepSeek ? t("admin.key_configured") : t("admin.key_required_deepseek")}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Fine-tuning (OpenAI) ── */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <GraduationCap className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.fine_tuning_title")}</h2>
              </div>
              <CardContent className="pt-0 space-y-4 max-w-xl">
                <p className="text-xs text-gray-500">
                  {t("admin.fine_tuning_desc")}
                </p>

                {/* Step 1: Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("admin.ft_step1")}</Label>
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 h-9 px-3 border-2 border-dashed rounded-md cursor-pointer text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors dark:border-gray-700 dark:hover:border-purple-500">
                      <Upload className="h-3.5 w-3.5" />
                      {ftUploading ? t("admin.ft_uploading") : ftFileId ? `${ftExamples} ${t("admin.ft_examples_ready")}` : t("admin.ft_choose_file")}
                      <input type="file" accept=".jsonl,.txt,.json" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFtUpload(e.target.files[0]); }} />
                    </label>
                  </div>
                  {ftFileId && <p className="text-[10px] text-green-600">{t("admin.ft_file_uploaded")}: {ftFileId}</p>}
                </div>

                {/* Step 2: Configure & start */}
                {ftFileId && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">2. Configure & start job</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">Base model</Label>
                        <Select value={ftBaseModel} onValueChange={setFtBaseModel}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o-mini-2024-07-18">gpt-4o-mini (recommended)</SelectItem>
                            <SelectItem value="gpt-4o-2024-08-06">gpt-4o (higher quality)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">Suffix</Label>
                        <input type="text" value={ftSuffix} onChange={(e) => setFtSuffix(e.target.value)}
                          className="w-full h-8 px-2 border rounded-md text-xs bg-white dark:bg-gray-900 dark:border-gray-700"
                          placeholder="radiogenai" />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleFtStart} disabled={ftStarting}
                      className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white">
                      {ftStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      Start fine-tuning
                    </Button>
                  </div>
                )}

                {ftError && <p className="text-xs text-red-500">{ftError}</p>}

                {/* Step 3: Jobs list */}
                {ftJobs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Fine-tuning jobs</Label>
                    <div className="space-y-1.5">
                      {ftJobs.map((job) => (
                        <div key={job.jobId} className="flex items-center gap-2 p-2 rounded-md border text-xs dark:border-gray-700">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-[10px] text-gray-500 truncate">{job.jobId}</p>
                            <p className="text-gray-700 dark:text-gray-300">{job.model}</p>
                          </div>
                          <Badge variant={job.status === "succeeded" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
                            className="text-[10px] flex-shrink-0">
                            {job.status}
                          </Badge>
                          {job.fineTunedModel && (
                            <Badge variant="outline" className="text-[10px] text-purple-600 flex-shrink-0 max-w-[140px] truncate">
                              {job.fineTunedModel}
                            </Badge>
                          )}
                          {job.status !== "succeeded" && job.status !== "failed" && (
                            <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleFtCheckStatus(job.jobId)}
                              disabled={ftChecking}>
                              <RefreshCw className={`h-3 w-3 ${ftChecking ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      Once a job succeeds, copy the fine-tuned model name and assign it to any task above.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                        <p>Cost/report: ~$0.005</p>
                      </div>
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Revenue</span>
                          <span className="font-semibold text-gray-900 dark:text-white">${revenue.toFixed(2)}/mo</span>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">AI cost</span>
                          <span className="text-gray-600 dark:text-gray-400">~${(count * plan.reports * 0.005).toFixed(2)}/mo max</span>
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
                    <p>Free: marketing cost (~$0.03/user/mo)</p>
                    <p>Starter: ~87% margin</p>
                    <p>Professional: ~75% margin</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ HOSPITALS ═══ */}
        {tab === "orgs" && <AdminOrganizationsTab />}

        {/* ═══ RESIDENTS ═══ */}
        {tab === "residents" && <AdminResidentsTab />}

        {/* ═══ SUPPORT ═══ */}
        {tab === "support" && <AdminSupportTab />}

        {/* ═══ WAITLIST ═══ */}
        {tab === "waitlist" && <AdminWaitlistTab />}

        {/* ═══ AUDIT LOGS ═══ */}
        {tab === "audit" && (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Audit Logs</h2>
                <Badge variant="secondary" className="text-xs">{auditLogs.length} entries</Badge>
                <div className="ml-auto flex gap-1">
                  {["all", "generate_findings", "generate_conclusion", "correction_logged", "save_report", "report_error"].map((f) => (
                    <Button
                      key={f}
                      variant={auditFilter === f ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAuditFilter(f)}
                    >
                      {f === "all" ? "All" : f === "generate_findings" ? "Findings" : f === "generate_conclusion" ? "Conclusions" : f === "correction_logged" ? "Corrections" : f === "save_report" ? "Saves" : "Errors"}
                    </Button>
                  ))}
                </div>
              </div>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Date</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">User</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Action</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">Provider / Model</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">Duration</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs
                        .filter((l) => auditFilter === "all" || l.action === auditFilter)
                        .map((log) => {
                        const meta = log.metadata as Record<string, unknown>;
                        const isCorrection = log.action === "correction_logged";
                        const hasDetail = !!(meta?.raw_dictation || meta?.generated_findings || meta?.note || isCorrection);
                        const hasTraceIssues = (Number(meta?.trace_unmatched) || 0) > 0 || (Number(meta?.trace_hallucinations) || 0) > 0;
                        const isExpanded = expandedAuditId === log.id;
                        return (
                        <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/50">
                          <td colSpan={6} className="p-0">
                            <button
                              type="button"
                              className={`w-full text-left flex items-center hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors ${hasDetail || hasTraceIssues ? "cursor-pointer" : "cursor-default"}`}
                              onClick={() => (hasDetail || hasTraceIssues) && setExpandedAuditId(isExpanded ? null : log.id)}
                            >
                              <span className="py-2.5 px-2 text-[11px] text-gray-500 whitespace-nowrap w-[140px] shrink-0">
                                {new Date(log.created_at).toLocaleString()}
                              </span>
                              <span className="py-2.5 px-2 w-[130px] shrink-0">
                                <span className="block text-xs font-medium text-gray-900 dark:text-white truncate">{log.user_name}</span>
                                <span className="block text-[10px] text-gray-500 truncate">{log.user_email}</span>
                              </span>
                              <span className="py-2.5 px-2 shrink-0">
                                <Badge
                                  variant={log.action === "report_error" ? "destructive" : "secondary"}
                                  className={`text-[10px] ${isCorrection ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : ""}`}
                                >
                                  {log.action === "report_error" && <Flag className="h-2.5 w-2.5 mr-0.5" />}
                                  {isCorrection ? "correction" : log.action.replace(/_/g, " ")}
                                </Badge>
                                {log.had_corrections && !isCorrection && (
                                  <Badge variant="outline" className="text-[10px] ml-1">edited</Badge>
                                )}
                                {isCorrection && !!meta?.conclusion_changed && (
                                  <Badge className="text-[10px] ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">conclusion</Badge>
                                )}
                                {isCorrection && !!meta?.findings_changed && (
                                  <Badge className="text-[10px] ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">findings</Badge>
                                )}
                              </span>
                              <span className="py-2.5 px-2 text-xs text-gray-600 dark:text-gray-400 hidden md:inline w-[140px] shrink-0">
                                {log.provider && log.model ? `${log.provider} / ${log.model}` : "—"}
                              </span>
                              <span className="py-2.5 px-2 text-xs text-gray-500 text-right hidden md:inline w-[60px] shrink-0">
                                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                              </span>
                              <span className="py-2.5 px-2 text-xs text-gray-600 dark:text-gray-400 flex-1 min-w-0 truncate">
                                {(() => {
                                  if (log.action === "report_error" && meta?.note) return String(meta.note);
                                  if (isCorrection) {
                                    const parts: string[] = [];
                                    if (meta?.study_type) parts.push(String(meta.study_type));
                                    if (meta?.modality) parts.push(String(meta.modality));
                                    return parts.length > 0 ? parts.join(" · ") : "Radiologist correction";
                                  }
                                  const parts: string[] = [];
                                  if (meta?.study_type) parts.push(String(meta.study_type));
                                  if (typeof meta?.trace_mappings === "number") {
                                    parts.push(`${meta.trace_mappings} ok, ${meta.trace_unmatched || 0} omit, ${meta.trace_hallucinations || 0} halluc`);
                                  }
                                  return parts.length > 0 ? parts.join(" · ") : "—";
                                })()}
                              </span>
                              {(hasDetail || hasTraceIssues) && (
                                <span className="py-2.5 px-2 shrink-0">
                                  <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                                </span>
                              )}
                            </button>

                            {isExpanded && (hasDetail || hasTraceIssues) && (
                              <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                                {!!meta?.note && (
                                  <div className="px-3 py-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                                    <span className="font-medium">Error report:</span> {String(meta.note)}
                                  </div>
                                )}

                                {hasTraceIssues && (
                                  <div className="flex gap-3 text-xs">
                                    <Badge variant="secondary" className="text-[10px]">{Number(meta.trace_mappings) || 0} matched</Badge>
                                    {(Number(meta.trace_unmatched) || 0) > 0 && (
                                      <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                        {Number(meta.trace_unmatched)} omissions
                                      </Badge>
                                    )}
                                    {(Number(meta.trace_hallucinations) || 0) > 0 && (
                                      <Badge variant="destructive" className="text-[10px]">
                                        {Number(meta.trace_hallucinations)} hallucinations
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {!!meta?.raw_dictation && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Dictation input</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {String(meta.raw_dictation)}
                                    </pre>
                                  </div>
                                )}

                                {!!meta?.generated_findings && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">Generated findings</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                      {String(meta.generated_findings)}
                                    </pre>
                                  </div>
                                )}

                                {!!meta?.generated_conclusion && !isCorrection && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1">Generated conclusion</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {String(meta.generated_conclusion)}
                                    </pre>
                                  </div>
                                )}

                                {isCorrection && !!meta?.conclusion_changed && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Original conclusion (AI)</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.original_conclusion || "—")}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">Corrected conclusion (radiologist)</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.corrected_conclusion || "—")}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {isCorrection && !!meta?.findings_changed && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Original findings (AI)</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.original_findings || "—")}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500 mb-1">Corrected findings (radiologist)</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-purple-200 dark:border-purple-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.corrected_findings || "—")}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                      {auditLogs.filter((l) => auditFilter === "all" || l.action === auditFilter).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                            No audit logs yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Training Data */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 flex-wrap">
                <Database className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Training Data</h2>
                <Badge variant="secondary" className="text-xs">{trainingData.length} reports</Badge>
                <div className="ml-auto flex flex-wrap gap-1.5 items-center">
                  <Select value={trainingModality} onValueChange={(v) => setTrainingModality(v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All modalities</SelectItem>
                      <SelectItem value="CT">CT</SelectItem>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="XRay">XRay</SelectItem>
                      <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                      <SelectItem value="Mammography">Mammography</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={trainingCorrectionsOnly}
                      onChange={(e) => setTrainingCorrectionsOnly(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Corrections only
                  </label>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={loadTrainingData} disabled={trainingLoading}>
                    {trainingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Load
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleExportJsonl} disabled={exporting || trainingData.length === 0}>
                    {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    Export JSONL
                  </Button>
                </div>
              </div>
              <CardContent className="pt-0">
                {trainingError && (
                  <div className="mb-3 px-3 py-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    <span className="font-medium">Error loading training data:</span> {trainingError}
                  </div>
                )}
                {trainingLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-xs text-gray-400">Loading training data...</p>
                  </div>
                ) : trainingData.length === 0 && !trainingError ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No training data yet — reports are saved automatically when radiologists generate reports
                  </div>
                ) : trainingData.length === 0 ? null : (
                  <div className="space-y-2">
                    {trainingData.map((r) => {
                      const isExpanded = expandedReportId === r.id;
                      const findingsChanged = r.initial_findings_text && r.initial_findings_text !== r.findings_text;
                      const conclusionChanged = r.initial_conclusion_text && r.initial_conclusion_text !== r.conclusion_text;
                      return (
                        <div key={r.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                            onClick={() => setExpandedReportId(isExpanded ? null : r.id)}
                          >
                            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                            <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary" className="text-[10px]">{r.modality}</Badge>
                              <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{r.study_type}</span>
                              {r.had_corrections && <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">corrected</Badge>}
                              {r.error_reported && <Badge variant="destructive" className="text-[10px] gap-0.5"><Flag className="h-2 w-2" />error</Badge>}
                            </div>
                            <span className="text-[10px] text-gray-400 shrink-0">
                              {r.user_name || r.user_email || "—"} · {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
                              {r.error_report_note && (
                                <div className="px-3 py-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                                  <span className="font-medium">Error report:</span> {r.error_report_note}
                                </div>
                              )}

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Input (dictation + clinical context)</p>
                                {r.clinical_context && (
                                  <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-20 overflow-y-auto mb-1.5 text-gray-500">{r.clinical_context}</pre>
                                )}
                                <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto">{r.raw_dictation || "—"}</pre>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">
                                    AI Generated {findingsChanged && <span className="text-amber-500 normal-case">(modified by radiologist)</span>}
                                  </p>
                                  <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
{r.initial_findings_text || r.findings_text || "—"}
{"\n\n---\n\n"}
{r.initial_conclusion_text || r.conclusion_text || "—"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1">
                                    Final Report {(findingsChanged || conclusionChanged) && <span className="text-amber-500 normal-case">(corrected)</span>}
                                  </p>
                                  <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
{r.findings_text || "—"}
{"\n\n---\n\n"}
{r.conclusion_text || "—"}
                                  </pre>
                                </div>
                              </div>

                              <div className="flex gap-3 text-[10px] text-gray-400">
                                {r.provider_used && <span>Provider: {r.provider_used}</span>}
                                {r.model_used && <span>Model: {r.model_used}</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    <SelectItem value="free">Free (30 reports/mo)</SelectItem>
                    <SelectItem value="starter">Starter — $7.99 (150 reports/mo)</SelectItem>
                    <SelectItem value="professional">Professional — $15.99 (400 reports/mo)</SelectItem>
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

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                placeholder="Min. 6 characters"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plan</Label>
              <Select value={createPlan} onValueChange={setCreatePlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (50 reports/mo)</SelectItem>
                  <SelectItem value="starter">Starter — $7.99 (150 reports/mo)</SelectItem>
                  <SelectItem value="professional">Professional — $15.99 (400 reports/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> {createError}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                onClick={handleCreateUser}
                disabled={creatingUser}
              >
                {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </div>
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
