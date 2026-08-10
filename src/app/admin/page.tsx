"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Shield, Plug, Users, Loader2, Check, X, Mic,
  Eye, EyeOff, FileText, Zap, TrendingUp, CreditCard,
  BarChart3, Trash2, UserCog, UserPlus, Crown, RefreshCw,
  Upload, GraduationCap, ChevronDown, ClipboardList, Flag, Download, Database,
  MessageSquare, DollarSign, Sparkles, ShieldAlert, Plus,
  ThumbsUp, ThumbsDown, Building2,
} from "lucide-react";
import { PROVIDERS, PLANS, type SubscriptionPlan } from "@/lib/types";
import { DEFAULT_CHECKLIST_SECTIONS } from "@/lib/clinical-checklist-kb";
import { useT } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import nextDynamic from "next/dynamic";

// Admin tabs are code-split: each one's JS (charts libraries included)
// downloads only when its tab is first opened, keeping the initial
// admin load light.
const adminTabLoading = () => (
  <div className="py-16 flex justify-center">
    <div className="h-5 w-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
  </div>
);
const AdminSupportTab = nextDynamic(() => import("@/components/admin/admin-support-tab").then((m) => m.AdminSupportTab), { ssr: false, loading: adminTabLoading });
const AdminResidentsTab = nextDynamic(() => import("@/components/admin/admin-residents-tab").then((m) => m.AdminResidentsTab), { ssr: false, loading: adminTabLoading });
const AdminWaitlistTab = nextDynamic(() => import("@/components/admin/admin-waitlist-tab").then((m) => m.AdminWaitlistTab), { ssr: false, loading: adminTabLoading });
const AdminCostsTab = nextDynamic(() => import("@/components/admin/admin-costs-tab").then((m) => m.AdminCostsTab), { ssr: false, loading: adminTabLoading });
const AdminHospitalsTab = nextDynamic(() => import("@/components/admin/admin-hospitals-tab").then((m) => m.AdminHospitalsTab), { ssr: false, loading: adminTabLoading });
const AdminEngagementTab = nextDynamic(() => import("@/components/admin/admin-engagement-tab").then((m) => m.AdminEngagementTab), { ssr: false, loading: adminTabLoading });
const AdminManualDownload = nextDynamic(() => import("@/components/admin/admin-manual-download").then((m) => m.AdminManualDownload), { ssr: false, loading: adminTabLoading });

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
  trainedTokens: number | null;
  trainingFile: string | null;
  nEpochs: number | string | null;
}

interface FtFileInfo {
  filename: string;
  bytes: number;
  createdAt: number;
}

type TaskKey = "findings" | "conclusion" | "trace" | "dictation_correction" | "improve_writing" | "data_augmentation" | "classify" | "chatbot";

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
  approved?: boolean;
  invitation_code?: string;
  country?: string;
  hospital?: string;
  professional_role?: string;
  org_id?: string | null;
  email_verified?: boolean | null;
  stripe_subscription_id?: string | null;
  pending_plan?: string | null;
  pending_plan_effective_date?: string | null;
  billing_period_start?: string | null;
  trial_used_at?: string | null;
  trial_ends_at?: string | null;
  subscription_ended_at?: string | null;
  subscription_cancelled_at?: string | null;
  last_payment_at?: string | null;
  last_payment_amount?: number | null;
  last_payment_failed_at?: string | null;
  last_invoice_url?: string | null;
}

/* ── Billing status per user (card-first model) ─────────────────
   Derives who is actually paying, who is on trial (and when the first
   charge lands), who cancelled (and when), and who never activated. */
function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

/* Billing moments need the hour: Stripe charges at the exact time of day the
   subscription started, not at midnight. */
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function billingInfo(u: UserRow, t: (k: string) => string): { label: string; cls: string; lines: string[]; kind?: "none" | "failed" } | null {
  if (u.role === "admin") return null;
  if (u.org_id) {
    return { label: t("admin.bill_hospital"), cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300", lines: [] };
  }
  // An unpaid charge is the most actionable state — surface it first.
  if (u.last_payment_failed_at) {
    return {
      label: t("admin.bill_failed"),
      cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      kind: "failed",
      lines: [`${t("admin.bill_failed_on")} ${fmtDateTime(u.last_payment_failed_at)}`],
    };
  }
  const trialActive = !!u.trial_ends_at && Date.parse(u.trial_ends_at) > Date.now();
  const cancelPending = u.pending_plan === "free";
  const cancelledLine = u.subscription_cancelled_at ? `${t("admin.bill_cancelled_on")} ${fmtShortDate(u.subscription_cancelled_at)}` : null;

  if (trialActive && !cancelPending) {
    return {
      label: t("admin.bill_trial"),
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      lines: [`${t("admin.bill_charge_on")} ${fmtDateTime(u.trial_ends_at!)}`],
    };
  }
  if (trialActive && cancelPending) {
    return {
      label: t("admin.bill_trial_cancelled"),
      cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      lines: [cancelledLine, `${t("admin.bill_access_until")} ${fmtDateTime(u.trial_ends_at!)}`].filter(Boolean) as string[],
    };
  }
  if (u.subscription_plan && u.subscription_plan !== "free" && u.stripe_subscription_id) {
    if (cancelPending) {
      return {
        label: t("admin.bill_cancelled"),
        cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
        lines: [
          u.last_payment_at ? `✓ ${t("admin.bill_paid_on")} ${fmtDateTime(u.last_payment_at)}${u.last_payment_amount != null ? ` · $${Number(u.last_payment_amount).toFixed(2)}` : ""}` : null,
          cancelledLine,
          u.pending_plan_effective_date ? `${t("admin.bill_access_until")} ${fmtDateTime(u.pending_plan_effective_date)}` : null,
        ].filter(Boolean) as string[],
      };
    }
    const renews = u.billing_period_start ? new Date(u.billing_period_start) : null;
    if (renews) renews.setMonth(renews.getMonth() + 1);
    return {
      label: t("admin.bill_paying"),
      cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      lines: [
        u.last_payment_at
          ? `✓ ${t("admin.bill_paid_on")} ${fmtDateTime(u.last_payment_at)}${u.last_payment_amount != null ? ` · $${Number(u.last_payment_amount).toFixed(2)}` : ""}`
          : null,
        u.trial_used_at ? `${t("admin.bill_since")} ${fmtShortDate(u.trial_used_at)}` : null,
        renews ? `${t("admin.bill_renews")} ${fmtDateTime(renews.toISOString())}` : null,
      ].filter(Boolean) as string[],
    };
  }
  if (u.subscription_plan && u.subscription_plan !== "free") {
    return { label: t("admin.bill_bonus"), cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", lines: [] };
  }
  return {
    label: t("admin.bill_none"),
    cls: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
    kind: "none",
    lines: [
      // Why they never activated: email never verified (they never reached
      // Stripe) vs. verified but abandoned before entering the card.
      u.email_verified === false ? t("admin.bill_email_unverified") : t("admin.bill_no_payment"),
      u.trial_used_at ? t("admin.bill_trial_used") : null,
      u.subscription_ended_at ? `${t("admin.bill_ended_on")} ${fmtShortDate(u.subscription_ended_at)}` : null,
    ].filter(Boolean) as string[],
  };
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
  dictationFeedback?: { up: number; down: number };
}

type Tab = "overview" | "users" | "ai" | "residents" | "support" | "audit" | "engagement" | "waitlist" | "costs" | "hospitals";

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
  const [modelName, setModelName] = useState("deepseek-v4-pro");
  const [apiKey, setApiKey] = useState("");
  const [whisperKey, setWhisperKey] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
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
    data_augmentation: { provider: "", model: "" },
    classify: { provider: "", model: "" },
    chatbot: { provider: "", model: "" },
  });

  // Fine-tuning
  const [ftJobs, setFtJobs] = useState<FtJob[]>([]);
  const [ftModelsList, setFtModelsList] = useState<string[]>([]);
  const [ftFileMap, setFtFileMap] = useState<Record<string, FtFileInfo>>({});
  const [ftUploading, setFtUploading] = useState(false);
  const [ftStarting, setFtStarting] = useState(false);
  const [ftFileId, setFtFileId] = useState<string | null>(null);
  const [ftExamples, setFtExamples] = useState(0);
  const [ftSuffix, setFtSuffix] = useState("radiogenai");
  const [ftBaseModel, setFtBaseModel] = useState("gpt-4o-mini-2024-07-18");
  const [ftError, setFtError] = useState("");
  const [ftChecking, setFtChecking] = useState(false);

  // Clinical checklist KB
  const [checklistSections, setChecklistSections] = useState<{ id: string; name: string; conditions: { id: string; name: string; findings: string[] }[] }[]>([]);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [checklistExpanded, setChecklistExpanded] = useState(false);
  const [checklistDirty, setChecklistDirty] = useState(false);

  // How many default scenarios (sections/conditions) are missing from the
  // current checklist — used to offer a non-destructive "add defaults" action.
  const missingDefaultsCount = (() => {
    let n = 0;
    for (const ds of DEFAULT_CHECKLIST_SECTIONS) {
      const cur = checklistSections.find((s) => s.id === ds.id);
      if (!cur) { n += ds.conditions.length; continue; }
      for (const dc of ds.conditions) {
        if (!cur.conditions.some((c) => c.id === dc.id)) n += 1;
      }
    }
    return n;
  })();

  // Merge default scenarios that are missing, WITHOUT touching existing edits.
  function addMissingDefaults() {
    setChecklistSections((prev) => {
      const next = prev.map((s) => ({ ...s, conditions: [...s.conditions] }));
      for (const ds of DEFAULT_CHECKLIST_SECTIONS) {
        const cur = next.find((s) => s.id === ds.id);
        if (!cur) {
          next.push({ id: ds.id, name: ds.name, conditions: ds.conditions.map((c) => ({ ...c, findings: [...c.findings] })) });
          continue;
        }
        for (const dc of ds.conditions) {
          if (!cur.conditions.some((c) => c.id === dc.id)) {
            cur.conditions.push({ ...dc, findings: [...dc.findings] });
          }
        }
      }
      return next;
    });
    setChecklistDirty(true);
  }
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Users
  const [users, setUsers] = useState<UserRow[]>([]);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [savingUser, setSavingUser] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserRow | null>(null);
  const [activationSent, setActivationSent] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [createOpen, setCreateOpen] = useState(false);

  /* ── Live AI provider balance / spend ── */
  interface AiBalanceCard {
    provider: "deepseek" | "openai" | "claude";
    balance: number | null;
    balanceCurrency: string | null;
    providerSpendMtd: number | null;
    loggedSpendMtd: number;
    status: "ok" | "no_key" | "unsupported" | "error";
    detail?: string;
  }
  const [aiBalance, setAiBalance] = useState<AiBalanceCard[] | null>(null);
  const [aiBalanceLoading, setAiBalanceLoading] = useState(false);

  const loadAiBalance = useCallback(async () => {
    setAiBalanceLoading(true);
    try {
      const res = await fetch("/api/admin/ai-balance");
      if (res.ok) {
        const d = await res.json();
        setAiBalance(d.providers || []);
      }
    } catch { /* card shows unavailable */ }
    setAiBalanceLoading(false);
  }, []);

  useEffect(() => { if (tab === "overview") loadAiBalance(); }, [tab, loadAiBalance]);

  /* ── Legacy purge (accounts from before the card-first cutover) ── */
  interface PurgeCandidate {
    id: string; email: string | null; name: string | null; created_at: string;
    country: string | null; hospital: string | null; plan: string;
    email_verified: boolean | null; report_count: number;
  }
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeCandidates, setPurgeCandidates] = useState<PurgeCandidate[]>([]);
  const [purgeSelected, setPurgeSelected] = useState<Set<string>>(new Set());
  const [purgeRunning, setPurgeRunning] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);

  async function openPurgeDialog() {
    setPurgeOpen(true);
    setPurgeLoading(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/admin/purge-legacy-users");
      if (res.ok) {
        const d = await res.json();
        const cands: PurgeCandidate[] = d.candidates || [];
        setPurgeCandidates(cands);
        setPurgeSelected(new Set(cands.map((c) => c.id)));
      }
    } catch { /* dialog shows empty */ }
    setPurgeLoading(false);
  }

  function togglePurgeUser(id: string) {
    setPurgeSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runPurge() {
    if (purgeSelected.size === 0) return;
    setPurgeRunning(true);
    setPurgeResult(null);
    try {
      const res = await fetch("/api/admin/purge-legacy-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: Array.from(purgeSelected) }),
      });
      const d = await res.json();
      if (res.ok) {
        setPurgeResult(t("admin.purge_done").replace("{n}", String(d.deleted)));
        setPurgeCandidates((prev) => prev.filter((c) => !purgeSelected.has(c.id)));
        setPurgeSelected(new Set());
        loadAll();
      } else {
        setPurgeResult(d.error || "Error");
      }
    } catch {
      setPurgeResult("Error");
    }
    setPurgeRunning(false);
  }

  const [retrying, setRetrying] = useState<Record<string, "sending" | "paid" | "declined" | "error">>({});

  async function retryPayment(userId: string) {
    setRetrying((p) => ({ ...p, [userId]: "sending" }));
    try {
      const res = await fetch("/api/admin/retry-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const d = await res.json().catch(() => ({}));
      setRetrying((p) => ({ ...p, [userId]: d.ok ? "paid" : d.declined ? "declined" : "error" }));
      if (d.ok) loadAll();
    } catch {
      setRetrying((p) => ({ ...p, [userId]: "error" }));
    }
  }

  async function sendActivationReminder(userId: string) {
    setActivationSent((p) => ({ ...p, [userId]: "sending" }));
    try {
      const res = await fetch("/api/admin/activation-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      setActivationSent((p) => ({ ...p, [userId]: res.ok ? "sent" : "error" }));
    } catch {
      setActivationSent((p) => ({ ...p, [userId]: "error" }));
    }
  }
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
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditLoadingMore, setAuditLoadingMore] = useState(false);

  // PII monitoring
  interface PiiStatsData { totalEvents: number; totalStripped: number; byType: Record<string, number>; byEndpoint: Record<string, number>; last7days: Record<string, number> }
  const [piiStats, setPiiStats] = useState<PiiStatsData | null>(null);
  const [piiStatsLoading, setPiiStatsLoading] = useState(false);

  // Fine-tune data generation
  interface FtPreview { total: number; preview: { messages: { role: string; content: string }[] }[]; modalities: string[] }
  const [ftDataPreview, setFtDataPreview] = useState<FtPreview | null>(null);
  const [ftDataLoading, setFtDataLoading] = useState(false);
  const [ftDataModality, setFtDataModality] = useState<string>("all");
  const [ftCorrectionsOnly, setFtCorrectionsOnly] = useState(false);
  const [ftDataError, setFtDataError] = useState<string | null>(null);
  const [ftExporting, setFtExporting] = useState(false);
  const [ftGenerating, setFtGenerating] = useState(false);
  const [ftNEpochs, setFtNEpochs] = useState<string>("auto");
  const [ftLearningRate, setFtLearningRate] = useState<string>("auto");
  const [ftBatchSize, setFtBatchSize] = useState<string>("auto");
  const [ftAugmenting, setFtAugmenting] = useState(false);
  const [ftAugmentResult, setFtAugmentResult] = useState<{ originalCount: number; syntheticCount: number; totalCount: number } | null>(null);

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
      setModelName(d.model_name || "deepseek-v4-pro");
      setApiKey(d.api_key_encrypted || "");
      setWhisperKey(d.whisper_api_key_encrypted || "");
      setAnthropicKey(d.anthropic_api_key_encrypted || "");
      setGoogleKey(d.google_api_key_encrypted || "");
      setDeepseekKey(d.deepseek_api_key_encrypted || "");
      setOpenrouterKey(d.openrouter_api_key_encrypted || "");
      setCustomProvKey(d.custom_api_key_encrypted || "");
      setCustomUrl(d.custom_base_url || "");
      const isCombo = d.findings_provider === "combo";
      setTaskOverrides({
        findings: isCombo ? { provider: "", model: "" } : { provider: d.findings_provider || "", model: d.findings_model || "" },
        conclusion: { provider: d.conclusion_provider || "", model: d.conclusion_model || "" },
        trace: { provider: d.trace_provider || "", model: d.trace_model || "" },
        dictation_correction: { provider: d.dictation_correction_provider || "", model: d.dictation_correction_model || "" },
        improve_writing: { provider: d.improve_writing_provider || "", model: d.improve_writing_model || "" },
        data_augmentation: { provider: d.data_augmentation_provider || "", model: d.data_augmentation_model || "" },
        classify: { provider: d.classify_provider || "", model: d.classify_model || "" },
        chatbot: { provider: d.chatbot_provider || "", model: d.chatbot_model || "" },
      });
    }

    try {
      const ftRes = await fetch("/api/finetune/status");
      if (ftRes?.ok) {
        const ftData = await ftRes.json();
        setFtJobs(ftData.jobs || []);
        setFtModelsList(ftData.ftModels || []);
        setFtFileMap(ftData.fileMap || {});
      }
    } catch { /* fine-tune listing may fail if not OpenAI */ }
    if (usersRes?.ok) {
      const d = await usersRes.json();
      setUsers(d.users || []);
    }

    try {
      const auditRes = await fetch("/api/admin/audit-logs?limit=200");
      if (auditRes?.ok) {
        const d = await auditRes.json();
        setAuditLogs(d.logs || []);
        setAuditCursor(d.nextCursor || null);
      }
    } catch { /* audit_logs table may not exist yet */ }

    try {
      const ckRes = await fetch("/api/admin/clinical-checklist");
      if (ckRes?.ok) {
        const d = await ckRes.json();
        setChecklistSections(d.sections || []);
        setChecklistDirty(false);
      }
    } catch { /* clinical_checklist_kb column may not exist yet */ }

    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleChecklistChat() {
    const msg = chatMessage.trim();
    if (!msg || chatLoading) return;
    setChatMessage("");
    setChatLoading(true);
    setChatHistory((prev) => [...prev, { role: "user", text: msg }]);
    try {
      const res = await fetch("/api/admin/clinical-checklist/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, sections: checklistSections }),
      });
      if (!res.ok) {
        setChatHistory((prev) => [...prev, { role: "bot", text: "Error processing request." }]);
        return;
      }
      const data = await res.json();
      if (data.sections) {
        setChecklistSections(data.sections);
        setChecklistDirty(true);
      }
      setChatHistory((prev) => [...prev, { role: "bot", text: data.summary || "Done." }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "bot", text: "Error." }]);
    } finally {
      setChatLoading(false);
    }
  }

  const loadMoreAuditLogs = useCallback(async () => {
    if (!auditCursor || auditLoadingMore) return;
    setAuditLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?limit=200&cursor=${encodeURIComponent(auditCursor)}`);
      if (res.ok) {
        const d = await res.json();
        setAuditLogs((prev) => [...prev, ...(d.logs || [])]);
        setAuditCursor(d.nextCursor || null);
      }
    } catch { /* ignore */ }
    setAuditLoadingMore(false);
  }, [auditCursor, auditLoadingMore]);

  useEffect(() => {
    if (tab === "audit") {
      if (!ftDataPreview && !ftDataLoading) loadFtDataPreview();
      if (!piiStats && !piiStatsLoading) {
        setPiiStatsLoading(true);
        fetch("/api/admin/pii-stats")
          .then((r) => r.ok ? r.json() : null)
          .then((d) => { if (d) setPiiStats(d); })
          .catch(() => {})
          .finally(() => setPiiStatsLoading(false));
      }
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
      if (openrouterKey && openrouterKey !== "••••••••") body.openrouter_api_key = openrouterKey;
      if (customProvKey && customProvKey !== "••••••••") body.custom_api_key = customProvKey;
      body.custom_base_url = provider === "custom" ? customUrl : "";

      for (const task of ["findings", "conclusion", "trace", "dictation_correction", "improve_writing", "data_augmentation", "classify", "chatbot"] as TaskKey[]) {
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
        setConfigError((await res.json()).error || t("admin.failed"));
      } else {
        const d = await res.json();
        setConfig(d);
        setApiKey(d.api_key_encrypted || "");
        setWhisperKey(d.whisper_api_key_encrypted || "");
        setAnthropicKey(d.anthropic_api_key_encrypted || "");
        setGoogleKey(d.google_api_key_encrypted || "");
        setDeepseekKey(d.deepseek_api_key_encrypted || "");
        setOpenrouterKey(d.openrouter_api_key_encrypted || "");
        setCustomProvKey(d.custom_api_key_encrypted || "");
        setConfigSuccess(true);
        setTimeout(() => setConfigSuccess(false), 3000);
      }
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : t("admin.failed"));
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
      if (!res.ok) { setFtError(data.error || t("admin.ft_upload_failed")); return; }
      setFtFileId(data.fileId);
      setFtExamples(data.validExamples);
    } catch (e) {
      setFtError(e instanceof Error ? e.message : t("admin.ft_upload_failed"));
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
        body: JSON.stringify({ fileId: ftFileId, baseModel: ftBaseModel, suffix: ftSuffix, nEpochs: ftNEpochs, learningRateMultiplier: ftLearningRate, batchSize: ftBatchSize }),
      });
      const data = await res.json();
      if (!res.ok) { setFtError(data.error || t("admin.ft_failed_start")); return; }
      setFtJobs((prev) => [{ jobId: data.jobId, status: data.status, model: data.model, fineTunedModel: null, createdAt: data.createdAt, finishedAt: null, trainedTokens: null, trainingFile: null, nEpochs: null }, ...prev]);
      setFtFileId(null);
    } catch (e) {
      setFtError(e instanceof Error ? e.message : t("admin.failed"));
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
        setFtJobs((prev) => prev.map((j) => j.jobId === jobId ? { ...j, status: data.status, fineTunedModel: data.fineTunedModel, finishedAt: data.finishedAt, trainedTokens: data.trainedTokens } : j));
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

  async function handleApproveUser(userId: string, approved: boolean) {
    await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, approved }),
    });
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

  async function loadFtDataPreview() {
    setFtDataLoading(true);
    setFtDataError(null);
    try {
      const params = new URLSearchParams({ preview: "true" });
      if (ftDataModality !== "all") params.set("modality", ftDataModality);
      if (ftCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data/openai?${params}`);
      const d = await res.json();
      if (!res.ok) { setFtDataError(d.error); return; }
      setFtDataPreview(d);
    } catch (e) {
      setFtDataError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setFtDataLoading(false);
    }
  }

  async function handleExportFtData() {
    setFtExporting(true);
    try {
      const params = new URLSearchParams();
      if (ftDataModality !== "all") params.set("modality", ftDataModality);
      if (ftCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data/openai?${params}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `radiogenai-finetune-${new Date().toISOString().slice(0, 10)}.jsonl`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch { /* ignore */ }
    setFtExporting(false);
  }

  async function handleGenerateAndUpload() {
    setFtGenerating(true);
    setFtError("");
    setFtFileId(null);
    try {
      const params = new URLSearchParams();
      if (ftDataModality !== "all") params.set("modality", ftDataModality);
      if (ftCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data/openai?${params}`);
      if (!res.ok) { setFtError("Failed to generate training data"); return; }
      const blob = await res.blob();
      if (blob.size < 10) { setFtError("No correction data found to generate training examples"); return; }

      const form = new FormData();
      form.append("file", blob, `radiogenai-finetune-${new Date().toISOString().slice(0, 10)}.jsonl`);
      const uploadRes = await fetch("/api/finetune/upload", { method: "POST", body: form });
      const data = await uploadRes.json();
      if (!uploadRes.ok) { setFtError(data.error || "Upload failed"); return; }
      setFtFileId(data.fileId);
      setFtExamples(data.validExamples);
    } catch (e) {
      setFtError(e instanceof Error ? e.message : "Failed");
    } finally {
      setFtGenerating(false);
    }
  }

  async function handleAugmentData() {
    setFtAugmenting(true);
    setFtDataError(null);
    setFtAugmentResult(null);
    try {
      const params = new URLSearchParams();
      if (ftDataModality !== "all") params.set("modality", ftDataModality);
      if (ftCorrectionsOnly) params.set("corrections_only", "true");
      const res = await fetch(`/api/admin/training-data/openai?${params}`);
      if (!res.ok) { setFtDataError("Failed to fetch training data"); setFtAugmenting(false); return; }
      const jsonlText = await res.text();
      const lines = jsonlText.split("\n").filter((l) => l.trim());
      if (lines.length === 0) { setFtDataError("No training examples to augment"); setFtAugmenting(false); return; }

      const examples = lines.map((l) => JSON.parse(l));
      const augRes = await fetch("/api/admin/training-data/augment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examples }),
      });
      const augData = await augRes.json();
      if (!augRes.ok) { setFtDataError(augData.error || "Augmentation failed"); setFtAugmenting(false); return; }

      setFtAugmentResult({ originalCount: augData.originalCount, syntheticCount: augData.syntheticCount, totalCount: augData.totalCount });

      const blob = new Blob([augData.jsonl], { type: "application/jsonl" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `radiogenai-finetune-augmented-${new Date().toISOString().slice(0, 10)}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFtDataError(e instanceof Error ? e.message : "Augmentation failed");
    } finally {
      setFtAugmenting(false);
    }
  }

  const radiologists = users.filter((u) => u.role !== "admin");
  const pendingUsers = users.filter((u) => u.approved === false && u.invitation_code);
  const totalReports = users.reduce((s, u) => s + u.report_count, 0);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: t("admin.tab_overview"), icon: <BarChart3 className="h-4 w-4" /> },
    { key: "users", label: t("admin.tab_users"), icon: <Users className="h-4 w-4" /> },
    { key: "ai", label: t("admin.tab_ai_config"), icon: <Plug className="h-4 w-4" /> },
    { key: "residents", label: t("admin.tab_residents"), icon: <GraduationCap className="h-4 w-4" /> },
    { key: "support", label: t("admin.tab_support"), icon: <MessageSquare className="h-4 w-4" /> },
    { key: "waitlist", label: t("admin.tab_waitlist"), icon: <UserPlus className="h-4 w-4" /> },
    { key: "audit", label: t("admin.tab_audit"), icon: <ClipboardList className="h-4 w-4" /> },
    { key: "engagement", label: t("admin.tab_engagement"), icon: <TrendingUp className="h-4 w-4" /> },
    { key: "costs", label: t("admin.tab_costs"), icon: <DollarSign className="h-4 w-4" /> },
    { key: "hospitals", label: "Hospitales", icon: <Building2 className="h-4 w-4" /> },
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
        {/* Tab navigation */}
        <div className="flex flex-wrap gap-1 mb-4 md:mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              ref={(el) => { if (tb.key === tab && el) el.scrollIntoView({ block: "nearest", inline: "nearest" }); }}
              onClick={() => setTab(tb.key)}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                tab === tb.key
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tb.icon}
              <span>{tb.label}</span>
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Live AI provider balance / month-to-date spend */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Plug className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.ai_balance_title")}</h3>
                <button
                  onClick={loadAiBalance}
                  className="ml-auto p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  title={t("conv.refresh")}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${aiBalanceLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-3 gap-3">
                  {(aiBalance || []).map((p) => {
                    const name = p.provider === "deepseek" ? "DeepSeek" : p.provider === "openai" ? "OpenAI" : "Claude";
                    const low = p.balance != null && p.balance < 5;
                    return (
                      <div key={p.provider} className="p-3.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{name}</p>
                        {p.balance != null ? (
                          <>
                            <p className={`text-2xl font-bold ${low ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                              {p.balanceCurrency === "USD" ? "$" : ""}{p.balance.toFixed(2)}
                              {p.balanceCurrency && p.balanceCurrency !== "USD" && (
                                <span className="text-xs font-normal text-gray-400"> {p.balanceCurrency}</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-500">{t("admin.ai_balance_label")}</p>
                          </>
                        ) : p.providerSpendMtd != null ? (
                          <>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">${p.providerSpendMtd.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-500">{t("admin.ai_spend_provider")}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-2xl font-bold text-gray-400">—</p>
                            <p className="text-[10px] text-gray-500">
                              {p.status === "unsupported"
                                ? t("admin.ai_balance_unsupported")
                                : p.status === "no_key"
                                ? t("admin.ai_balance_no_key")
                                : t("admin.ai_balance_error")}
                            </p>
                          </>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-800">
                          {t("admin.ai_spend_logged")}: ${p.loggedSpendMtd.toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                  {!aiBalance && (
                    <div className="sm:col-span-3 flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard icon={<Users className="h-5 w-5 text-blue-500" />} label={t("admin.total_users")} value={stats?.totalUsers ?? radiologists.length} />
              <StatCard icon={<FileText className="h-5 w-5 text-purple-500" />} label={t("admin.total_reports")} value={stats?.totalReports ?? totalReports} />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-violet-500" />} label={t("admin.reports_this_month")} value={stats?.reportsThisMonth ?? 0} />
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

            {/* Clinical checklist KB */}
            <Card>
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.clinical_checklist_title")}</h3>
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">Beta</Badge>
                  {checklistDirty && <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px]">Sin guardar</Badge>}
                </div>
                <div className="flex items-center gap-1.5">
                  {checklistDirty && (
                    <Button
                      size="sm"
                      className="text-xs bg-amber-600 hover:bg-amber-700 text-white h-7"
                      disabled={savingChecklist}
                      onClick={async () => {
                        setSavingChecklist(true);
                        try {
                          const res = await fetch("/api/admin/clinical-checklist", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ sections: checklistSections }),
                          });
                          if (res.ok) { setChecklistDirty(false); }
                        } finally { setSavingChecklist(false); }
                      }}
                    >
                      {savingChecklist ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                      {t("admin.clinical_checklist_save")}
                    </Button>
                  )}
                  {missingDefaultsCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 gap-1 border-amber-300 text-amber-700 dark:text-amber-300 dark:border-amber-700"
                      onClick={addMissingDefaults}
                      title={t("admin.clinical_checklist_add_defaults_hint")}
                    >
                      <Plus className="h-3 w-3" />
                      {t("admin.clinical_checklist_add_defaults")} ({missingDefaultsCount})
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setChecklistExpanded(!checklistExpanded)} className="text-xs gap-1 h-7">
                    <ChevronDown className={`h-3 w-3 transition-transform ${checklistExpanded ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>
              {checklistExpanded && (
                <CardContent className="pt-0 space-y-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("admin.clinical_checklist_desc")}</p>

                  {/* Structured sections view */}
                  <div className="space-y-2">
                    {checklistSections.map((section) => {
                      const isOpen = expandedSections.has(section.id);
                      return (
                        <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedSections((prev) => {
                              const next = new Set(prev);
                              if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
                              return next;
                            })}
                            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <ChevronDown className={`h-3.5 w-3.5 text-gray-500 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
                              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{section.name}</span>
                              <Badge variant="secondary" className="text-[10px]">{section.conditions.length}</Badge>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="px-3 py-2 space-y-2.5">
                              {section.conditions.map((condition) => (
                                <div key={condition.id} className="pl-4 border-l-2 border-amber-300 dark:border-amber-700">
                                  <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">{condition.name}</p>
                                  <ul className="space-y-0.5">
                                    {condition.findings.map((finding, fi) => (
                                      <li key={fi} className="text-[10px] text-gray-500 dark:text-gray-400 flex items-start gap-1">
                                        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                                        <span>{finding}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {checklistSections.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">No hay condiciones configuradas</p>
                    )}
                  </div>

                  {/* Chat interface */}
                  <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/30 dark:bg-amber-950/10 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">{t("admin.checklist_chat_title")}</span>
                    </div>

                    {chatHistory.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 mb-2">
                        {chatHistory.map((msg, i) => (
                          <div key={i} className={`text-[11px] px-2.5 py-1.5 rounded-lg ${
                            msg.role === "user"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ml-8"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 mr-8 border border-gray-200 dark:border-gray-700"
                          }`}>
                            {msg.text}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && chatMessage.trim() && !chatLoading) {
                            e.preventDefault();
                            handleChecklistChat();
                          }
                        }}
                        placeholder={t("admin.checklist_chat_placeholder")}
                        className="flex-1 text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        disabled={chatLoading}
                      />
                      <Button
                        size="sm"
                        className="text-xs bg-amber-600 hover:bg-amber-700 text-white h-7 px-3"
                        disabled={chatLoading || !chatMessage.trim()}
                        onClick={handleChecklistChat}
                      >
                        {chatLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "→"}
                      </Button>
                    </div>
                    <p className="text-[9px] text-gray-400 dark:text-gray-500">{t("admin.checklist_chat_hint")}</p>
                  </div>

                  {/* Reset */}
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        const res = await fetch("/api/admin/clinical-checklist", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sections: [] }),
                        });
                        if (res.ok) {
                          const reload = await fetch("/api/admin/clinical-checklist");
                          if (reload.ok) {
                            const d = await reload.json();
                            setChecklistSections(d.sections || []);
                            setChecklistDirty(false);
                          }
                        }
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {t("admin.clinical_checklist_reset")}
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Hospital manual download */}
            <Card>
              <AdminManualDownload />
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
              {pendingUsers.length > 0 && (
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">
                  {pendingUsers.length} {t("admin.pending_users")}
                </Badge>
              )}
              <Button
                size="sm"
                variant="outline"
                className="ml-auto gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                onClick={openPurgeDialog}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("admin.purge_btn")}
              </Button>
              <Button
                size="sm"
                className="gap-1.5 h-8 text-xs bg-gradient-to-r from-blue-500 to-purple-600 text-white"
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
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_status")}</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_plan")}</th>
                      <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_billing")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.th_reports_mo")}</th>
                      <th className="text-right py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_dictation_mo")}</th>
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
                              {(u.hospital || u.country) && (
                                <p className="text-[10px] text-gray-400">{[u.hospital, u.country].filter(Boolean).join(" · ")}</p>
                              )}
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
                              u.approved === false && u.invitation_code ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-[10px]">
                                    {t("admin.pending_approval")}
                                  </Badge>
                                  <Button
                                    variant="ghost" size="icon" className="h-6 w-6"
                                    onClick={() => handleApproveUser(u.id, true)}
                                    title={t("admin.approve")}
                                  >
                                    <Check className="h-3.5 w-3.5 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-6 w-6"
                                    onClick={() => { setDeleteConfirm(u); }}
                                    title={t("admin.reject")}
                                  >
                                    <X className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px]">
                                  {t("admin.approved")}
                                </Badge>
                              )
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {u.role !== "admin" && (
                              <Badge
                                className={`text-[10px] ${
                                  plan === "unlimited"
                                    ? "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300"
                                    : plan === "professional"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                                    : plan === "starter"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                }`}
                              >
                                {(plan === "professional" || plan === "unlimited") && <Crown className="h-2.5 w-2.5 mr-0.5" />}
                                {planConfig.label}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-2">
                            {(() => {
                              const bi = billingInfo(u, t);
                              if (!bi) return null;
                              const sendState = activationSent[u.id];
                              return (
                                <div className="space-y-0.5">
                                  <Badge className={`text-[10px] ${bi.cls}`}>{bi.label}</Badge>
                                  {bi.lines.map((l) => (
                                    <p key={l} className="text-[10px] text-gray-500 whitespace-nowrap">{l}</p>
                                  ))}
                                  {bi.kind === "failed" && (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        disabled={retrying[u.id] === "sending"}
                                        onClick={() => retryPayment(u.id)}
                                        className="text-[10px] font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-60 whitespace-nowrap"
                                      >
                                        {retrying[u.id] === "sending" ? "…"
                                          : retrying[u.id] === "paid" ? `✓ ${t("admin.bill_retry_ok")}`
                                          : retrying[u.id] === "declined" ? t("admin.bill_retry_declined")
                                          : t("admin.bill_retry")}
                                      </button>
                                      {u.last_invoice_url && (
                                        <a
                                          href={u.last_invoice_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[10px] text-gray-500 hover:underline whitespace-nowrap"
                                        >
                                          {t("admin.bill_invoice_link")}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {bi.kind === "none" && (
                                    <button
                                      type="button"
                                      disabled={sendState === "sending" || sendState === "sent"}
                                      onClick={() => sendActivationReminder(u.id)}
                                      className="text-[10px] font-medium text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-60 disabled:no-underline whitespace-nowrap"
                                    >
                                      {sendState === "sent"
                                        ? `✓ ${t("admin.bill_activation_sent")}`
                                        : sendState === "sending"
                                        ? "…"
                                        : sendState === "error"
                                        ? t("admin.bill_activation_error")
                                        : t("admin.bill_send_activation")}
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-2 text-right hidden md:table-cell">
                            {u.role !== "admin" && (
                              <div className="inline-flex items-center gap-2">
                                <div className="w-14 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${usagePct > 80 ? "bg-red-500" : usagePct > 50 ? "bg-amber-500" : "bg-violet-500"}`}
                                    style={{ width: `${Math.min(usagePct, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-gray-500 w-14 text-right">
                                  {u.reports_used_this_month || 0}/{planConfig.reports}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-2 text-right">
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
                                  title={t("admin.delete_user")}
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
                  { key: "data_augmentation" as TaskKey, label: t("admin.task_data_augmentation"), desc: t("admin.task_data_augmentation_desc") },
                  { key: "classify" as TaskKey, label: t("admin.task_classify"), desc: t("admin.task_classify_desc") },
                  { key: "chatbot" as TaskKey, label: t("admin.task_chatbot"), desc: t("admin.task_chatbot_desc") },
                ]).map(({ key, label, desc }) => {
                  const o = taskOverrides[key];
                  const taskProv = PROVIDERS.find((p) => p.value === o.provider);
                  return (
                    <div key={key} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{label}</p>
                          <p className="text-[10px] text-gray-400">{desc}</p>
                        </div>
                        {o.provider && o.model ? (
                          <Badge variant="secondary" className="text-[10px]">{o.provider}/{o.model.split("/").pop()}</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-gray-400">{t("admin.default")}</Badge>
                        )}
                      </div>
                      {(
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
                  for (const task of ["findings", "conclusion", "trace", "dictation_correction", "improve_writing", "data_augmentation", "classify", "chatbot"] as TaskKey[]) {
                    const p = taskOverrides[task].provider;
                    if (p && p !== provider) extraProviders.add(p);
                  }

                  const keyConfig: { prov: string; label: string; value: string; setter: (v: string) => void; hint?: string }[] = [
                    { prov: "claude", label: "Anthropic (Claude)", value: anthropicKey, setter: setAnthropicKey },
                    { prov: "gemini", label: "Google (Gemini)", value: googleKey, setter: setGoogleKey },
                    { prov: "deepseek", label: "DeepSeek", value: deepseekKey, setter: setDeepseekKey },
                    { prov: "openrouter", label: "OpenRouter", value: openrouterKey, setter: setOpenrouterKey },
                    { prov: "custom", label: t("admin.custom_endpoint"), value: customProvKey, setter: setCustomProvKey },
                    { prov: "openai", label: "OpenAI", value: whisperKey, setter: setWhisperKey, hint: t("admin.uses_whisper_key") },
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
                                    <Check className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
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

            {/* ── Dictation pipeline config ── */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Mic className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.dictation_config_title")}</h2>
              </div>
              <CardContent className="pt-0 space-y-4 max-w-xl">
                <p className="text-xs text-gray-500">{t("admin.dictation_config_desc")}</p>

                {/* Pipeline visual */}
                <div className="space-y-3 p-3 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/30 dark:bg-blue-900/10">
                  <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{t("admin.dictation_pipeline")}</p>

                  {/* Step 1: STT */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">1</div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.dict_step_stt")}</p>
                      <p className="text-[10px] text-gray-500">{t("admin.dict_step_stt_desc")}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">Whisper-1 (OpenAI)</Badge>
                        <Badge variant="outline" className="text-[10px]">temp: 0</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Postprocess */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-[10px] font-bold text-violet-600 dark:text-violet-400">2</div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.dict_step_postprocess")}</p>
                      <p className="text-[10px] text-gray-500">{t("admin.dict_step_postprocess_desc")}</p>
                    </div>
                  </div>

                  {/* Step 3: AI Correction */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400">3</div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.dict_step_correction")}</p>
                      <p className="text-[10px] text-gray-500">{t("admin.dict_step_correction_desc")}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {taskOverrides.dictation_correction.provider || provider || "openai"}: {taskOverrides.dictation_correction.model || "gpt-4o-mini"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: PII stripping */}
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-[10px] font-bold text-red-600 dark:text-red-400">4</div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.dict_step_pii")}</p>
                      <p className="text-[10px] text-gray-500">{t("admin.dict_step_pii_desc")}</p>
                    </div>
                  </div>
                </div>

                {/* Correction rules */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("admin.dict_rules_title")}</p>
                  <p className="text-[10px] text-gray-500">{t("admin.dict_rules_desc")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "punctuation", icon: "✏️" },
                      { key: "compounds", icon: "🔗" },
                      { key: "homophones", icon: "🔊" },
                      { key: "voice_cmds", icon: "🎤" },
                      { key: "accents", icon: "Á" },
                      { key: "units", icon: "📏" },
                    ] as const).map((rule) => (
                      <div key={rule.key} className="flex items-start gap-2 p-2 rounded-md border dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-xs flex-shrink-0 mt-0.5">{rule.icon}</span>
                        <div>
                          <p className="text-[11px] font-medium text-gray-900 dark:text-white">{t(`admin.dict_rule_${rule.key}`)}</p>
                          <p className="text-[10px] text-gray-400 leading-tight">{t(`admin.dict_rule_${rule.key}_desc`)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modality-aware terminology */}
                <div className="p-3 rounded-lg border dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-xs font-semibold text-gray-900 dark:text-white">{t("admin.dict_modality_title")}</p>
                  </div>
                  <p className="text-[10px] text-gray-500">{t("admin.dict_modality_desc")}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {["TC/CT", "RM/MRI", "Eco/US", "Rx/XRay", "MG/Mammo"].map((mod) => (
                      <Badge key={mod} variant="secondary" className="text-[10px]">{mod}</Badge>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-amber-500 flex-shrink-0" />
                  {t("admin.dict_model_hint")}
                </p>
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

                {/* Step 1: Generate or upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">{t("admin.ft_step1")}</Label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-9 text-xs gap-1.5" onClick={handleGenerateAndUpload} disabled={ftGenerating || ftUploading}>
                      {ftGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
                      {t("admin.ft_generate_from_corrections")}
                    </Button>
                    <label className="flex items-center justify-center gap-1.5 h-9 px-3 border-2 border-dashed rounded-md cursor-pointer text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors dark:border-gray-700 dark:hover:border-purple-500">
                      <Upload className="h-3.5 w-3.5" />
                      {ftUploading ? t("admin.ft_uploading") : t("admin.ft_upload_file")}
                      <input type="file" accept=".jsonl,.txt,.json" className="hidden"
                        onChange={(e) => { if (e.target.files?.[0]) handleFtUpload(e.target.files[0]); }} />
                    </label>
                  </div>
                  {ftFileId && <p className="text-[10px] text-green-600">{t("admin.ft_file_uploaded")}: {ftFileId} ({ftExamples} {t("admin.ft_examples_ready")})</p>}
                </div>

                {/* Step 2: Configure & start */}
                {ftFileId && (
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold">{t("admin.ft_step2")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">{t("admin.ft_base_model")}</Label>
                        <Select value={ftBaseModel} onValueChange={setFtBaseModel}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o-mini-2024-07-18">gpt-4o-mini ({t("admin.ft_recommended")})</SelectItem>
                            <SelectItem value="gpt-4o-2024-08-06">gpt-4o ({t("admin.ft_higher_quality")})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">{t("admin.ft_suffix")}</Label>
                        <input type="text" value={ftSuffix} onChange={(e) => setFtSuffix(e.target.value)}
                          className="w-full h-8 px-2 border rounded-md text-xs bg-white dark:bg-gray-900 dark:border-gray-700"
                          placeholder="radiogenai" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">Epochs</Label>
                        <Select value={ftNEpochs} onValueChange={setFtNEpochs}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto ({t("admin.ft_recommended")})</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">Learning rate</Label>
                        <Select value={ftLearningRate} onValueChange={setFtLearningRate}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto ({t("admin.ft_recommended")})</SelectItem>
                            <SelectItem value="0.1">0.1x</SelectItem>
                            <SelectItem value="0.5">0.5x</SelectItem>
                            <SelectItem value="1">1x</SelectItem>
                            <SelectItem value="1.8">1.8x ({t("admin.ft_default")})</SelectItem>
                            <SelectItem value="2">2x</SelectItem>
                            <SelectItem value="5">5x</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-400">Batch size</Label>
                        <Select value={ftBatchSize} onValueChange={setFtBatchSize}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto ({t("admin.ft_recommended")})</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="8">8</SelectItem>
                            <SelectItem value="16">16</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleFtStart} disabled={ftStarting}
                      className="gap-1.5 bg-purple-600 hover:bg-purple-500 text-white">
                      {ftStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                      {t("admin.ft_start")}
                    </Button>
                  </div>
                )}

                {ftError && <p className="text-xs text-red-500">{ftError}</p>}

                {/* Step 3: Jobs list */}
                {ftJobs.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">{t("admin.ft_jobs")} ({ftJobs.length})</Label>
                    <div className="space-y-2">
                      {ftJobs.map((job) => {
                        const file = job.trainingFile ? ftFileMap[job.trainingFile] : null;
                        return (
                          <div key={job.jobId} className="p-3 rounded-lg border text-xs dark:border-gray-700 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-mono text-[10px] text-gray-500 truncate">{job.jobId}</p>
                              </div>
                              <Badge variant={job.status === "succeeded" ? "default" : job.status === "failed" ? "destructive" : "secondary"}
                                className="text-[10px] flex-shrink-0">
                                {job.status}
                              </Badge>
                              {job.status !== "succeeded" && job.status !== "failed" && (
                                <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={() => handleFtCheckStatus(job.jobId)}
                                  disabled={ftChecking}>
                                  <RefreshCw className={`h-3 w-3 ${ftChecking ? "animate-spin" : ""}`} />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                              <div>
                                <span className="text-gray-400">{t("admin.ft_base_model")}: </span>
                                <span className="text-gray-700 dark:text-gray-300">{job.model}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">{t("admin.ft_date")}: </span>
                                <span className="text-gray-700 dark:text-gray-300">{new Date(job.createdAt * 1000).toLocaleDateString()}</span>
                              </div>
                              {job.finishedAt && (
                                <div>
                                  <span className="text-gray-400">{t("admin.ft_finished")}: </span>
                                  <span className="text-gray-700 dark:text-gray-300">{new Date(job.finishedAt * 1000).toLocaleDateString()}</span>
                                </div>
                              )}
                              {job.trainedTokens != null && (
                                <div>
                                  <span className="text-gray-400">Tokens: </span>
                                  <span className="text-gray-700 dark:text-gray-300">{job.trainedTokens.toLocaleString()}</span>
                                </div>
                              )}
                              {job.nEpochs != null && (
                                <div>
                                  <span className="text-gray-400">Epochs: </span>
                                  <span className="text-gray-700 dark:text-gray-300">{job.nEpochs}</span>
                                </div>
                              )}
                              {file && (
                                <div className="col-span-2">
                                  <span className="text-gray-400">{t("admin.ft_training_file")}: </span>
                                  <span className="text-gray-700 dark:text-gray-300">{file.filename}</span>
                                  <span className="text-gray-400 ml-1">({(file.bytes / 1024).toFixed(0)} KB)</span>
                                </div>
                              )}
                            </div>

                            {job.fineTunedModel && (
                              <div className="pt-1 border-t dark:border-gray-700">
                                <span className="text-gray-400 text-[10px]">{t("admin.ft_result_model")}: </span>
                                <Badge variant="outline" className="text-[10px] text-purple-600">
                                  {job.fineTunedModel}
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {t("admin.ft_jobs_hint")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ PLANS ═══ */}
        {/* ═══ RESIDENTS ═══ */}
        {tab === "residents" && <AdminResidentsTab />}

        {/* ═══ SUPPORT ═══ */}
        {tab === "support" && <AdminSupportTab />}

        {/* ═══ WAITLIST ═══ */}
        {tab === "waitlist" && <AdminWaitlistTab />}

        {/* ═══ COSTS ═══ */}
        {tab === "costs" && <AdminCostsTab />}

        {tab === "hospitals" && <AdminHospitalsTab />}

        {/* ═══ SUBSCRIBER ENGAGEMENT ═══ */}
        {tab === "engagement" && <AdminEngagementTab />}

        {/* ═══ AUDIT LOGS ═══ */}
        {tab === "audit" && (
          <div className="space-y-4">
            {/* PII Monitor */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <ShieldAlert className="h-4 w-4 text-orange-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.pii_monitor")}</h2>
                {piiStats && <Badge variant="secondary" className="text-xs">{piiStats.totalEvents} {t("admin.pii_events")}</Badge>}
              </div>
              <CardContent className="pt-0">
                {piiStatsLoading ? (
                  <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-400" /></div>
                ) : piiStats && piiStats.totalEvents > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-center">
                        <p className="text-xl font-bold text-orange-700 dark:text-orange-300">{piiStats.totalStripped}</p>
                        <p className="text-[10px] text-orange-500">{t("admin.pii_total_stripped")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{piiStats.totalEvents}</p>
                        <p className="text-[10px] text-blue-500">{t("admin.pii_requests_with_pii")}</p>
                      </div>
                      {Object.entries(piiStats.byType).sort(([, a], [, b]) => b - a).slice(0, 2).map(([type, count]) => (
                        <div key={type} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-center">
                          <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{count}</p>
                          <p className="text-[10px] text-gray-500">{type.toUpperCase()}</p>
                        </div>
                      ))}
                    </div>
                    {Object.keys(piiStats.byType).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(piiStats.byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-[10px] gap-1">
                            {type.toUpperCase()} <span className="font-bold">{count}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {Object.keys(piiStats.byEndpoint).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-gray-400 self-center">{t("admin.pii_by_endpoint")}:</span>
                        {Object.entries(piiStats.byEndpoint).sort(([, a], [, b]) => b - a).map(([ep, count]) => (
                          <Badge key={ep} variant="secondary" className="text-[10px] gap-1">
                            {ep} <span className="font-bold">{count}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-3">{t("admin.pii_no_events")}</p>
                )}
              </CardContent>
            </Card>

            {/* Voice dictation satisfaction: 👍 vs 👎, counted server-side over all logs */}
            {(() => {
              const up = stats?.dictationFeedback?.up ?? 0;
              const down = stats?.dictationFeedback?.down ?? 0;
              const total = up + down;
              const satisfaction = total > 0 ? Math.round((up / total) * 100) : 0;
              return (
                <Card>
                  <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                    <Mic className="h-4 w-4 text-violet-500" />
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.dict_fb_title")}</h2>
                    <span className="text-[10px] text-gray-400">{t("admin.dict_fb_hint")}</span>
                  </div>
                  <CardContent className="pt-0">
                    {total === 0 ? (
                      <p className="text-xs text-gray-400 py-2">{t("admin.dict_fb_none")}</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
                            <p className="text-xl font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-1.5">
                              <ThumbsUp className="h-4 w-4" /> {up}
                            </p>
                            <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">{t("admin.dict_fb_positive")}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-center">
                            <p className="text-xl font-bold text-red-700 dark:text-red-300 flex items-center justify-center gap-1.5">
                              <ThumbsDown className="h-4 w-4" /> {down}
                            </p>
                            <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{t("admin.dict_fb_negative")}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-center">
                            <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{satisfaction}%</p>
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 mt-0.5">{t("admin.dict_fb_satisfaction")}</p>
                          </div>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <div className="h-full bg-green-400/80" style={{ width: `${satisfaction}%` }} />
                          <div className="h-full bg-red-400/70" style={{ width: `${100 - satisfaction}%` }} />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Tool-usage summary: which features users actually touch */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.usage_summary")}</h2>
                <span className="text-[10px] text-gray-400">{t("admin.usage_summary_hint")}</span>
              </div>
              <CardContent className="pt-0">
                {(() => {
                  const counts = new Map<string, { total: number; users: Set<string> }>();
                  for (const l of auditLogs) {
                    const entry = counts.get(l.action) || { total: 0, users: new Set<string>() };
                    entry.total += 1;
                    if (l.user_email) entry.users.add(l.user_email);
                    counts.set(l.action, entry);
                  }
                  const rows = [...counts.entries()].sort((a, b) => b[1].total - a[1].total);
                  if (rows.length === 0) return <p className="text-xs text-gray-500 py-2">—</p>;
                  const max = rows[0][1].total || 1;
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
                      {rows.map(([action, v]) => (
                        <div key={action} className="flex items-center gap-2">
                          <span className={`text-[11px] w-44 shrink-0 truncate ${action.startsWith("ui_") ? "text-violet-600 dark:text-violet-400" : "text-gray-700 dark:text-gray-300"}`}>
                            {action.replace(/^ui_/, "· ")}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div className="h-full rounded-full bg-violet-400/70" style={{ width: `${Math.max(4, Math.round((v.total / max) * 100))}%` }} />
                          </div>
                          <span className="text-[11px] tabular-nums text-gray-500 w-16 text-right shrink-0">{v.total} · {v.users.size}u</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <ClipboardList className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.audit_logs")}</h2>
                <Badge variant="secondary" className="text-xs">{auditLogs.length} {t("admin.entries")}</Badge>
                <div className="ml-auto flex gap-1">
                  {["all", "generate_findings", "generate_conclusion", "correction_logged", "save_report", "report_error", "ui"].map((f) => (
                    <Button
                      key={f}
                      variant={auditFilter === f ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setAuditFilter(f)}
                    >
                      {f === "all" ? t("admin.filter_all") : f === "generate_findings" ? t("admin.filter_findings") : f === "generate_conclusion" ? t("admin.filter_conclusions") : f === "correction_logged" ? t("admin.filter_corrections") : f === "save_report" ? t("admin.filter_saves") : f === "ui" ? t("admin.filter_ui") : t("admin.filter_errors")}
                    </Button>
                  ))}
                </div>
              </div>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_date")}</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_user")}</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_action")}</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.th_provider_model")}</th>
                        <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 hidden md:table-cell">{t("admin.th_duration")}</th>
                        <th className="text-left py-2 px-2 text-xs font-medium text-gray-500">{t("admin.th_details")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs
                        .filter((l) => auditFilter === "all" || (auditFilter === "ui" ? l.action.startsWith("ui_") : l.action === auditFilter))
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
                                  {isCorrection ? t("admin.correction") : log.action.replace(/_/g, " ")}
                                </Badge>
                                {log.had_corrections && !isCorrection && (
                                  <Badge variant="outline" className="text-[10px] ml-1">{t("admin.edited")}</Badge>
                                )}
                                {isCorrection && !!meta?.conclusion_changed && (
                                  <Badge className="text-[10px] ml-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{t("admin.conclusion_label")}</Badge>
                                )}
                                {isCorrection && !!meta?.findings_changed && (
                                  <Badge className="text-[10px] ml-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">{t("admin.findings_label")}</Badge>
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
                                    return parts.length > 0 ? parts.join(" · ") : t("admin.radiologist_correction");
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
                                    <span className="font-medium">{t("admin.error_report")}:</span> {String(meta.note)}
                                  </div>
                                )}

                                {hasTraceIssues && (
                                  <div className="flex gap-3 text-xs">
                                    <Badge variant="secondary" className="text-[10px]">{Number(meta.trace_mappings) || 0} {t("admin.matched")}</Badge>
                                    {(Number(meta.trace_unmatched) || 0) > 0 && (
                                      <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                        {Number(meta.trace_unmatched)} {t("admin.omissions")}
                                      </Badge>
                                    )}
                                    {(Number(meta.trace_hallucinations) || 0) > 0 && (
                                      <Badge variant="destructive" className="text-[10px]">
                                        {Number(meta.trace_hallucinations)} {t("admin.hallucinations")}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {!!meta?.raw_dictation && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{t("admin.dictation_input")}</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {String(meta.raw_dictation)}
                                    </pre>
                                  </div>
                                )}

                                {!!meta?.generated_findings && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">{t("admin.generated_findings")}</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                      {String(meta.generated_findings)}
                                    </pre>
                                  </div>
                                )}

                                {!!meta?.generated_conclusion && !isCorrection && (
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1">{t("admin.generated_conclusion")}</p>
                                    <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                      {String(meta.generated_conclusion)}
                                    </pre>
                                  </div>
                                )}

                                {isCorrection && !!meta?.conclusion_changed && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{t("admin.original_conclusion_ai")}</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.original_conclusion || "—")}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 mb-1">{t("admin.corrected_conclusion_rad")}</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.corrected_conclusion || "—")}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {isCorrection && !!meta?.findings_changed && (
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{t("admin.original_findings_ai")}</p>
                                      <pre className="text-xs bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2.5 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                        {String(meta.original_findings || "—")}
                                      </pre>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-500 mb-1">{t("admin.corrected_findings_rad")}</p>
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
                      {auditLogs.filter((l) => auditFilter === "all" || (auditFilter === "ui" ? l.action.startsWith("ui_") : l.action === auditFilter)).length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400 text-xs">
                            {t("admin.no_audit_logs")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {auditCursor && (
                  <div className="flex justify-center pt-3 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={loadMoreAuditLogs}
                      disabled={auditLoadingMore}
                    >
                      {auditLoadingMore ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> {t("admin.loading")}</>
                      ) : (
                        <>{t("admin.load_more")} ({auditLogs.length} {t("admin.loaded")})</>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fine-tune Data Generator */}
            <Card>
              <div className="flex items-center gap-2 px-5 pt-5 pb-3 flex-wrap">
                <GraduationCap className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.ft_data_title")}</h2>
                {ftDataPreview && <Badge variant="secondary" className="text-xs">{ftDataPreview.total} {t("admin.ft_examples_count")}</Badge>}
                <div className="ml-auto flex flex-wrap gap-1.5 items-center">
                  <Select value={ftDataModality} onValueChange={(v) => setFtDataModality(v)}>
                    <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("admin.all_modalities")}</SelectItem>
                      <SelectItem value="CT">CT</SelectItem>
                      <SelectItem value="MRI">MRI</SelectItem>
                      <SelectItem value="XRay">XRay</SelectItem>
                      <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                      <SelectItem value="Mammography">Mammography</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => setFtCorrectionsOnly((v) => !v)}
                    className={`h-7 px-2.5 text-xs rounded-md border transition-colors ${
                      ftCorrectionsOnly
                        ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-medium"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                    title={t("admin.ft_corrections_only_hint")}
                  >
                    {t("admin.ft_corrections_only")}
                  </button>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={loadFtDataPreview} disabled={ftDataLoading}>
                    {ftDataLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    {t("admin.load")}
                  </Button>
                  <Button size="sm" className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white" onClick={handleExportFtData} disabled={ftExporting || !ftDataPreview?.total}>
                    {ftExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                    {t("admin.ft_download_jsonl")}
                  </Button>
                </div>
              </div>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-gray-500">{t("admin.ft_data_desc")}</p>
                {ftDataError && (
                  <div className="px-3 py-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    {ftDataError}
                  </div>
                )}
                {ftDataLoading ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400 mb-2" />
                    <p className="text-xs text-gray-400">{t("admin.loading")}...</p>
                  </div>
                ) : ftDataPreview ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{ftDataPreview.total}</p>
                        <p className="text-[10px] text-purple-500">{t("admin.ft_training_examples")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                        <p className="text-lg font-bold text-gray-700 dark:text-gray-300">{ftDataPreview.modalities.length}</p>
                        <p className="text-[10px] text-gray-500">{t("admin.ft_modalities")}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-lg font-bold text-green-700 dark:text-green-300">{ftDataPreview.total >= 10 ? "✓" : "✗"}</p>
                        <p className="text-[10px] text-violet-500">{t("admin.ft_min_examples")}</p>
                      </div>
                    </div>

                    <div className="border border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        <p className="text-xs font-medium text-gray-900 dark:text-white">{t("admin.ft_augment_title")}</p>
                      </div>
                      <p className="text-[11px] text-gray-500">{t("admin.ft_augment_desc")}</p>
                      <Button size="sm" className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-500 text-white" onClick={handleAugmentData} disabled={ftAugmenting || !ftDataPreview.total}>
                        {ftAugmenting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {ftAugmenting ? t("admin.ft_augmenting") : t("admin.ft_augment_button")}
                      </Button>
                      {ftAugmentResult && (
                        <p className="text-[11px] text-green-600">
                          {t("admin.ft_augment_result").replace("{0}", String(ftAugmentResult.originalCount)).replace("{1}", String(ftAugmentResult.syntheticCount)).replace("{2}", String(ftAugmentResult.totalCount))}
                        </p>
                      )}
                    </div>

                    {ftDataPreview.preview.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{t("admin.ft_preview")}</p>
                        {ftDataPreview.preview.slice(0, 3).map((ex, i) => {
                          const userMsg = ex.messages.find((m) => m.role === "user");
                          const assistantMsg = ex.messages.find((m) => m.role === "assistant");
                          return (
                            <div key={i} className="border border-gray-200 dark:border-gray-800 rounded-lg p-3 space-y-2">
                              <div>
                                <p className="text-[10px] font-semibold text-blue-500 mb-0.5">{t("admin.ft_input")}</p>
                                <pre className="text-[11px] bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2 whitespace-pre-wrap max-h-24 overflow-y-auto">{userMsg?.content?.slice(0, 500) || "—"}</pre>
                              </div>
                              <div>
                                <p className="text-[10px] font-semibold text-green-600 mb-0.5">{t("admin.ft_expected_output")}</p>
                                <pre className="text-[11px] bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 p-2 whitespace-pre-wrap max-h-24 overflow-y-auto">{assistantMsg?.content?.slice(0, 500) || "—"}</pre>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    {t("admin.ft_no_data")}
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
            <DialogTitle>{t("admin.edit_user")}</DialogTitle>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{editUser.name || "—"}</p>
                <p className="text-xs text-gray-500">{editUser.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.role")}</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="radiologist">{t("admin.role_radiologist")}</SelectItem>
                    <SelectItem value="admin">{t("admin.role_admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.subscription_plan")}</Label>
                <Select value={editPlan} onValueChange={setEditPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{t("admin.plan_free")}</SelectItem>
                    <SelectItem value="starter">{t("admin.plan_starter")}</SelectItem>
                    <SelectItem value="professional">{t("admin.plan_professional")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditUser(null)}>{t("cancel")}</Button>
                <Button className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white" onClick={handleSaveUser} disabled={savingUser}>
                  {savingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={purgeOpen} onOpenChange={(o) => { if (!purgeRunning) setPurgeOpen(o); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              {t("admin.purge_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t("admin.purge_desc")}</p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t("admin.purge_review")}</p>
            {purgeLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
            ) : purgeCandidates.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">{t("admin.purge_empty")}</p>
            ) : (
              <div className="max-h-72 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                {purgeCandidates.map((c) => (
                  <label key={c.id} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <input
                      type="checkbox"
                      checked={purgeSelected.has(c.id)}
                      onChange={() => togglePurgeUser(c.id)}
                      className="mt-0.5 accent-red-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{c.email}</p>
                      <p className="text-[10px] text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()} · {[c.country, c.hospital].filter(Boolean).join(" · ") || "—"}
                        {c.report_count > 0 && <span className="text-amber-600 dark:text-amber-400"> · {c.report_count} inf.</span>}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {purgeResult && (
              <p className="text-xs font-medium text-green-600 dark:text-green-400">{purgeResult}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" className="text-xs" disabled={purgeRunning} onClick={() => setPurgeOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                size="sm"
                className="text-xs bg-red-600 hover:bg-red-700 text-white gap-1.5"
                disabled={purgeRunning || purgeSelected.size === 0}
                onClick={runPurge}
              >
                {purgeRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {t("admin.purge_confirm").replace("{n}", String(purgeSelected.size))}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.delete_user")}</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("admin.delete_user_confirm")} <span className="font-semibold text-gray-900 dark:text-white">{deleteConfirm.email}</span>?
                {t("admin.delete_user_warning")}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>{t("cancel")}</Button>
                <Button variant="destructive" className="flex-1" onClick={handleDeleteUser}>{t("delete")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) setCreateOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("admin.add_user")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.email")}</Label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.password")}</Label>
              <Input
                type="password"
                placeholder={t("admin.min_6_chars")}
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.plan")}</Label>
              <Select value={createPlan} onValueChange={setCreatePlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">{t("admin.plan_free")}</SelectItem>
                  <SelectItem value="starter">{t("admin.plan_starter")}</SelectItem>
                  <SelectItem value="professional">{t("admin.plan_professional")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <X className="h-3 w-3" /> {createError}
              </p>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>{t("cancel")}</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                onClick={handleCreateUser}
                disabled={creatingUser}
              >
                {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.create")}
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
