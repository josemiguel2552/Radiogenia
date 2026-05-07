"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Loader2, Users, Building2, FileText, BarChart3,
  Plus, Pencil, Trash2, UserPlus, ChevronDown,
  Check, X, Download, Upload,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DEFAULT_TEMPLATES } from "@/lib/templates";
import { useT } from "@/lib/i18n";
import type { OrgMembership, OrgSection, OrgTemplate, SectionRole } from "@/lib/types";

type Tab = "stats" | "members" | "sections";

interface OrgData {
  membership: OrgMembership;
  organization: { id: string; name: string; slug: string; max_seats: number; is_active: boolean };
  sections: OrgSection[];
  active_members: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  section_id: string | null;
  is_org_chief: boolean;
  section_role: SectionRole;
  is_active: boolean;
  user_email: string;
  user_name: string;
  section_name: string | null;
}

interface MemberStat {
  user_id: string;
  email: string;
  name: string;
  section_id: string | null;
  section_name: string;
  section_role: string;
  is_org_chief: boolean;
  reports_this_month: number;
}

interface StatsData {
  members: MemberStat[];
  sections: { id: string; name: string; members: number; reports: number }[];
  total_reports_this_month: number;
  total_members: number;
}

export default function OrgDashboard() {
  const router = useRouter();
  const t = useT();
  const [tab, setTab] = useState<Tab>("sections");
  const [loading, setLoading] = useState(true);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [sectionSlug, setSectionSlug] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSectionId, setMemberSectionId] = useState("");
  const [memberRole, setMemberRole] = useState<SectionRole>("radiologist");
  const [memberIsChief, setMemberIsChief] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberError, setMemberError] = useState("");

  // Templates
  const [orgTemplates, setOrgTemplates] = useState<OrgTemplate[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSectionId, setImportSectionId] = useState("");
  const [importSearch, setImportSearch] = useState("");
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  // AI upload
  const [uploadingTpls, setUploadingTpls] = useState<string | null>(null);
  const [uploadMsg, setUploadMsg] = useState("");

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [sectionSubTab, setSectionSubTab] = useState<Record<string, "team" | "templates">>({});

  const isOrgChief = orgData?.membership.is_org_chief || false;
  const isSectionChief = !isOrgChief && orgData?.membership.section_role === "section_chief";
  const isSectionEditor = !isOrgChief && orgData?.membership.section_role === "section_editor";
  const canManageMembers = isOrgChief || isSectionChief;
  const canViewStats = isOrgChief || isSectionChief;

  const loadOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/org", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.membership) setOrgData(data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/org/members", { cache: "no-store" });
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/org/stats", { cache: "no-store" });
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/org/templates", { cache: "no-store" });
      if (res.ok) setOrgTemplates(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadOrg(), loadMembers(), loadStats(), loadTemplates()]).finally(() => setLoading(false));
  }, [loadOrg, loadMembers, loadStats, loadTemplates]);

  async function handleSaveSection() {
    if (!sectionName.trim()) return;
    setSavingSection(true);
    const slug = sectionSlug.trim() || sectionName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9áéíóúñü-]/g, "");
    await fetch("/api/org/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sectionName.trim(), slug }),
    });
    setSavingSection(false);
    setShowSectionForm(false);
    setSectionName("");
    setSectionSlug("");
    await loadOrg();
  }

  async function handleDeleteSection(id: string) {
    if (!confirm(t("org.confirm_delete_section"))) return;
    await fetch(`/api/org/sections?id=${id}`, { method: "DELETE" });
    await loadOrg();
  }

  function openAddMember() {
    setEditingMember(null);
    setMemberEmail("");
    setMemberSectionId(orgData?.sections[0]?.id || "");
    setMemberRole("radiologist");
    setMemberIsChief(false);
    setMemberError("");
    setShowMemberForm(true);
  }

  function openEditMember(m: MemberRow) {
    setEditingMember(m);
    setMemberEmail(m.user_email || "");
    setMemberSectionId(m.section_id || "");
    setMemberRole(m.section_role);
    setMemberIsChief(m.is_org_chief);
    setMemberError("");
    setShowMemberForm(true);
  }

  async function handleSaveMember() {
    setSavingMember(true);
    setMemberError("");
    if (editingMember) {
      const res = await fetch("/api/org/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMember.id,
          section_id: memberSectionId || null,
          section_role: memberRole,
          is_org_chief: isOrgChief ? memberIsChief : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMemberError(data.error || "Error");
        setSavingMember(false);
        return;
      }
    } else {
      if (!memberEmail.trim()) {
        setMemberError(t("org.error_enter_email"));
        setSavingMember(false);
        return;
      }
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: memberEmail.trim().toLowerCase(),
          section_id: memberSectionId || null,
          section_role: memberRole,
          is_org_chief: isOrgChief ? memberIsChief : false,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMemberError(data.error === "User not found" ? t("org.error_user_not_found") : data.error || "Error");
        setSavingMember(false);
        return;
      }
    }
    setSavingMember(false);
    setShowMemberForm(false);
    await Promise.all([loadMembers(), loadStats()]);
  }

  async function handleToggleMemberActive(m: MemberRow) {
    await fetch("/api/org/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, is_active: !m.is_active }),
    });
    await Promise.all([loadMembers(), loadStats(), loadOrg()]);
  }

  // ── Templates ──
  async function handleImportTemplates() {
    if (!importSectionId || importSelected.size === 0) return;
    setImporting(true);
    for (const tplId of importSelected) {
      const tpl = DEFAULT_TEMPLATES.find((t) => t.id === tplId);
      if (!tpl) continue;
      await fetch("/api/org/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_id: importSectionId,
          name: tpl.title,
          modality: tpl.technique,
          structure: tpl,
        }),
      });
    }
    setImporting(false);
    setShowImportDialog(false);
    setImportSelected(new Set());
    setImportSearch("");
    await loadTemplates();
  }

  async function handleDeleteTemplate(id: string) {
    if (!confirm(t("org.confirm_delete_template"))) return;
    await fetch(`/api/org/templates?id=${id}`, { method: "DELETE" });
    await loadTemplates();
  }

  async function handleUploadTpls(file: File, sectionId: string) {
    setUploadingTpls(sectionId);
    setUploadMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("section_id", sectionId);
    const res = await fetch("/api/org/upload-templates", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingTpls(null);
    if (!res.ok) { setUploadMsg(data.error || t("org.error_processing")); return; }
    setUploadMsg(`${data.saved} ${t("org.templates_extracted_saved")}`);
    await loadTemplates();
  }

  const roleLabel = (role: string, chief: boolean) => {
    if (chief) return t("org.role_org_chief");
    if (role === "section_chief") return t("org.role_section_chief");
    if (role === "section_editor") return t("org.role_editor");
    return t("org.role_radiologist");
  };

  const roleColor = (role: string, chief: boolean) => {
    if (chief) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    if (role === "section_chief") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (role === "section_editor") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

  const modalityColor = (mod: string) => {
    const m = mod?.toLowerCase() || "";
    if (m.includes("ct") || m.includes("tc")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (m.includes("mr") || m.includes("rm")) return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300";
    if (m.includes("us") || m.includes("eco") || m.includes("ultra")) return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
    if (m.includes("rx") || m.includes("xray") || m.includes("ray")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    if (m.includes("mamo") || m.includes("mamm")) return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

  const getSubTab = (sectionId: string) => sectionSubTab[sectionId] || (canManageMembers ? "team" : "templates");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">{t("org.no_organization")}</p>
      </div>
    );
  }

  const ALL_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "stats", label: t("org.tab_stats"), icon: <BarChart3 className="h-4 w-4" /> },
    { key: "members", label: t("org.tab_members"), icon: <Users className="h-4 w-4" /> },
    { key: "sections", label: t("org.tab_sections"), icon: <Building2 className="h-4 w-4" /> },
  ];

  const TABS = ALL_TABS.filter((t) => {
    if (t.key === "stats" && !canViewStats) return false;
    if (t.key === "members" && !canManageMembers) return false;
    return true;
  });

  const visibleSections = isOrgChief
    ? orgData.sections
    : orgData.sections.filter((s) => s.id === orgData.membership.section_id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-900 dark:to-gray-950">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-3 pt-4 pb-2">
            <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="shrink-0 h-9 w-9 text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="ml-auto text-[11px] text-blue-200">
              {orgData.active_members}/{orgData.organization.max_seats} {t("org.seats")}
            </span>
          </div>
          <div className="pb-5 pl-1">
            <div className="flex items-center gap-3 mb-1">
              <Building2 className="h-7 w-7 text-white/80" />
              <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">{orgData.organization.name}</h1>
            </div>
            <Badge className={`text-[10px] mt-1 ${isOrgChief ? "bg-white/20 text-white border-white/20" : isSectionChief ? "bg-white/20 text-white border-white/20" : "bg-white/20 text-white border-white/20"}`}>
              {isOrgChief ? t("org.role_org_chief") : isSectionChief ? t("org.role_section_chief") : t("org.role_section_editor")}
            </Badge>
            {canViewStats && stats && (
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_members}</p>
                  <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t("org.radiologists")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total_reports_this_month}</p>
                  <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t("org.reports_per_month")}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{orgData.sections.length}</p>
                  <p className="text-[10px] text-blue-200 uppercase tracking-wide">{t("org.tab_sections")}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {/* ── Nav tabs ── */}
        <div className="flex gap-1 mb-5 p-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-x-auto w-fit scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ STATS ═══ */}
        {tab === "stats" && stats && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_members}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{t("org.radiologists")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_reports_this_month}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{t("org.reports_this_month")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sections.length}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{t("org.tab_sections")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_members > 0 ? Math.round(stats.total_reports_this_month / stats.total_members) : 0}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">{t("org.avg_per_radiologist")}</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-section breakdown */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("org.by_section")}</h3>
            <div className="space-y-2">
              {stats.sections.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">{s.members} {t("org.members")}</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white block">{s.reports} {t("org.reports")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Per-radiologist table */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-4">{t("org.by_radiologist")}</h3>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left p-3 font-medium text-gray-500">{t("org.name")}</th>
                        <th className="text-left p-3 font-medium text-gray-500">{t("org.section")}</th>
                        <th className="text-left p-3 font-medium text-gray-500">{t("org.role")}</th>
                        <th className="text-right p-3 font-medium text-gray-500">{t("org.reports_per_month")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.members.map((m) => (
                        <tr key={m.user_id} className="border-b border-gray-50 dark:border-gray-900 last:border-0">
                          <td className="p-3">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{m.name || m.email}</span>
                            {m.name && <span className="text-gray-400 ml-1.5">{m.email}</span>}
                          </td>
                          <td className="p-3 text-gray-600 dark:text-gray-400">{m.section_name}</td>
                          <td className="p-3">
                            <Badge className={`text-[9px] ${roleColor(m.section_role, m.is_org_chief)}`}>
                              {roleLabel(m.section_role, m.is_org_chief)}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-900 dark:text-white">{m.reports_this_month}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ MEMBERS ═══ */}
        {tab === "members" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("org.tab_members")} ({members.filter((m) => m.is_active).length} {t("org.active")})
              </h3>
              <Button size="sm" onClick={openAddMember} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                {t("org.add")}
              </Button>
            </div>

            <div className="space-y-1.5">
              {members.map((m) => (
                <Card key={m.id} className={!m.is_active ? "opacity-50" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        m.is_org_chief ? "bg-purple-500" : m.section_role === "section_chief" ? "bg-blue-500" : "bg-gray-400"
                      }`}>
                        {(m.user_name || m.user_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">
                          {m.user_name || m.user_email}
                        </span>
                        <span className="text-[10px] text-gray-400 block truncate">
                          {m.section_name || t("org.no_section")} {m.user_name ? `· ${m.user_email}` : ""}
                        </span>
                      </div>
                      <Badge className={`text-[9px] ${roleColor(m.section_role, m.is_org_chief)}`}>
                        {roleLabel(m.section_role, m.is_org_chief)}
                      </Badge>
                      {!m.is_active && <Badge variant="secondary" className="text-[9px]">{t("org.inactive")}</Badge>}
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(m)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={`h-7 w-7 ${m.is_active ? "text-amber-500 hover:text-amber-600" : "text-green-500 hover:text-green-600"}`}
                          onClick={() => handleToggleMemberActive(m)}
                          title={m.is_active ? t("org.deactivate") : t("org.reactivate")}
                        >
                          {m.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SECTIONS ═══ */}
        {tab === "sections" && (
          <div className="space-y-5">
            {isOrgChief && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{visibleSections.length} {t("org.sections_count")}</p>
                <Button size="sm" onClick={() => { setSectionName(""); setSectionSlug(""); setShowSectionForm(true); }} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" /> {t("org.new_section")}
                </Button>
              </div>
            )}

            {visibleSections.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="text-center py-14">
                  <div className="h-16 w-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
                    <Building2 className="h-8 w-8 text-blue-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("org.no_sections_title")}</p>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">{t("org.no_sections_desc")}</p>
                </CardContent>
              </Card>
            ) : (
              visibleSections.map((s) => {
                const isExpanded = expandedSection === s.id || visibleSections.length === 1;
                const sMembers = members.filter((m) => m.section_id === s.id && m.is_active);
                const sTemplates = orgTemplates.filter((t) => t.section_id === s.id);
                const sub = getSubTab(s.id);

                return (
                  <Card key={s.id} className="overflow-hidden shadow-sm">
                    {/* Section gradient header */}
                    <button
                      onClick={() => visibleSections.length > 1 && setExpandedSection(isExpanded && visibleSections.length > 1 ? null : s.id)}
                      className={`w-full text-left px-5 py-4 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-gray-900 dark:to-blue-950/30 border-b border-gray-100 dark:border-gray-800 ${visibleSections.length > 1 ? "cursor-pointer hover:from-slate-100 hover:to-blue-50 dark:hover:from-gray-800 dark:hover:to-blue-950/40" : ""} transition-colors`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">{s.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            {canManageMembers && (
                              <span className="text-[11px] text-gray-500 flex items-center gap-1"><Users className="h-3 w-3 text-blue-400" /> {sMembers.length}</span>
                            )}
                            <span className="text-[11px] text-gray-500 flex items-center gap-1"><FileText className="h-3 w-3 text-teal-400" /> {sTemplates.length}</span>
                          </div>
                        </div>
                        {isOrgChief && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDeleteSection(s.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {visibleSections.length > 1 && (
                          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </div>
                    </button>

                    {/* Expanded: sub-tabs + content */}
                    {isExpanded && (
                      <div>
                        {/* Sub-tab bar */}
                        <div className="flex gap-0 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
                          {canManageMembers && (
                            <button onClick={() => setSectionSubTab({ ...sectionSubTab, [s.id]: "team" })}
                              className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2 ${sub === "team" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                              <Users className="h-3.5 w-3.5" /> {t("org.team")}
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sub === "team" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>{sMembers.length}</span>
                            </button>
                          )}
                          <button onClick={() => setSectionSubTab({ ...sectionSubTab, [s.id]: "templates" })}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition-colors border-b-2 ${sub === "templates" ? "border-teal-500 text-teal-600 dark:text-teal-400" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                            <FileText className="h-3.5 w-3.5" /> {t("org.templates")}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${sub === "templates" ? "bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}>{sTemplates.length}</span>
                          </button>
                        </div>

                        {/* Sub-tab content */}
                        <div className="p-5">
                          {/* ── TEAM ── */}
                          {sub === "team" && canManageMembers && (
                            sMembers.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">{t("org.no_members_section")}</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {sMembers.map((m) => (
                                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                                    <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                      m.is_org_chief ? "bg-purple-500" : m.section_role === "section_chief" ? "bg-blue-500" : m.section_role === "section_editor" ? "bg-amber-500" : "bg-gray-400"
                                    }`}>
                                      {(m.user_name || m.user_email || "?")[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block truncate">{m.user_name || m.user_email}</span>
                                      {m.user_name && <span className="text-[10px] text-gray-400 block truncate">{m.user_email}</span>}
                                    </div>
                                    <Badge className={`text-[9px] ${roleColor(m.section_role, m.is_org_chief)}`}>
                                      {roleLabel(m.section_role, m.is_org_chief)}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )
                          )}

                          {/* ── TEMPLATES ── */}
                          {sub === "templates" && (
                            <div>
                              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                <p className="text-xs text-gray-500">{sTemplates.length} {sTemplates.length !== 1 ? t("org.shared_template_other") : t("org.shared_template_one")}</p>
                                <div className="flex gap-2">
                                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    {uploadingTpls === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-violet-500" />}
                                    {uploadingTpls === s.id ? t("org.processing") : t("org.extract_from_word")}
                                    <input type="file" accept=".docx,.doc,.pdf" className="hidden" disabled={!!uploadingTpls}
                                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadTpls(f, s.id); e.target.value = ""; }} />
                                  </label>
                                  <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                    onClick={() => { setImportSectionId(s.id); setImportSelected(new Set()); setImportSearch(""); setShowImportDialog(true); }}>
                                    <Download className="h-3.5 w-3.5" /> {t("org.catalog")}
                                  </Button>
                                </div>
                              </div>
                              {uploadMsg && uploadingTpls === null && (
                                <div className="mb-3 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs text-blue-700 dark:text-blue-300">{uploadMsg}</div>
                              )}
                              {sTemplates.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                                  <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                  <p className="text-xs text-gray-400 mb-1">Sin plantillas en esta sección</p>
                                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto mb-3">Sube un archivo Word con plantillas y la IA las extraerá, o importa desde el catálogo.</p>
                                  <div className="flex gap-2 justify-center">
                                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                      {uploadingTpls === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3 text-violet-500" />}
                                      Extraer de Word
                                      <input type="file" accept=".docx,.doc,.pdf" className="hidden" disabled={!!uploadingTpls}
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadTpls(f, s.id); e.target.value = ""; }} />
                                    </label>
                                    <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                                      onClick={() => { setImportSectionId(s.id); setImportSelected(new Set()); setImportSearch(""); setShowImportDialog(true); }}>
                                      <Download className="h-3 w-3" /> Catálogo
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {sTemplates.map((t) => (
                                    <div key={t.id} className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm transition-all">
                                      <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-4 w-4 text-teal-500" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block truncate">{t.name}</span>
                                        <Badge className={`text-[9px] mt-0.5 ${modalityColor(t.modality)}`}>{t.modality}</Badge>
                                      </div>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={() => handleDeleteTemplate(t.id)}>
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Section form dialog */}
      <Dialog open={showSectionForm} onOpenChange={setShowSectionForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva sección</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input
                value={sectionName}
                onChange={(e) => { setSectionName(e.target.value); setSectionSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9áéíóúñü-]/g, "")); }}
                placeholder="Radiología de Tórax"
                className="h-9"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowSectionForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveSection} disabled={savingSection || !sectionName.trim()}>
                {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member form dialog */}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Editar miembro" : "Añadir miembro"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingMember && (
              <div className="space-y-1.5">
                <Label className="text-xs">Email del usuario</Label>
                <Input
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="doctor@hospital.com"
                  className="h-9"
                  type="email"
                />
                <p className="text-[10px] text-gray-400">El usuario debe estar registrado en Radiogenia</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Sección</Label>
              <Select value={memberSectionId} onValueChange={setMemberSectionId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar sección" /></SelectTrigger>
                <SelectContent>
                  {orgData.sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rol en la sección</Label>
              <Select value={memberRole} onValueChange={(v) => setMemberRole(v as SectionRole)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="radiologist">Radiólogo</SelectItem>
                  <SelectItem value="section_editor">Editor de sección</SelectItem>
                  {isOrgChief && <SelectItem value="section_chief">Jefe de sección</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {isOrgChief && (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberIsChief}
                  onChange={(e) => setMemberIsChief(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Jefe de servicio (acceso a toda la organización)
              </label>
            )}
            {memberError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{memberError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveMember} disabled={savingMember || (!editingMember && !memberEmail.trim())}>
                {savingMember ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingMember ? "Guardar" : "Añadir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import templates dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Importar plantillas al servicio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-1.5">
              <Label className="text-xs">Sección destino</Label>
              <Select value={importSectionId} onValueChange={setImportSectionId}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar sección" /></SelectTrigger>
                <SelectContent>
                  {orgData.sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              value={importSearch}
              onChange={(e) => setImportSearch(e.target.value)}
              placeholder="Buscar plantilla..."
              className="h-9 text-xs"
            />
            <div className="flex-1 overflow-y-auto border rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
              {DEFAULT_TEMPLATES
                .filter((t) => !importSearch || t.title.toLowerCase().includes(importSearch.toLowerCase()) || t.technique.toLowerCase().includes(importSearch.toLowerCase()))
                .map((t) => {
                  const alreadyImported = orgTemplates.some((ot) => ot.section_id === importSectionId && ot.name === t.title);
                  return (
                    <label key={t.id} className={`flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${alreadyImported ? "opacity-40" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={alreadyImported}
                        checked={importSelected.has(t.id)}
                        onChange={(e) => {
                          const next = new Set(importSelected);
                          if (e.target.checked) next.add(t.id); else next.delete(t.id);
                          setImportSelected(next);
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 dark:text-gray-200 block truncate">{t.title}</span>
                      </div>
                      <Badge variant="secondary" className="text-[9px] flex-shrink-0">{t.technique}</Badge>
                      <Badge variant="secondary" className="text-[9px] flex-shrink-0">{t.section}</Badge>
                    </label>
                  );
                })}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-400">{importSelected.size} seleccionadas</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleImportTemplates} disabled={importing || importSelected.size === 0 || !importSectionId}>
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : `Importar (${importSelected.size})`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
