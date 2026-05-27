"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, Users, Building2, ArrowLeft,
  UserPlus, Shield, Crown, Check, X, KeyRound, Eye, EyeOff,
  Network, Settings,
} from "lucide-react";
import type { Organization, OrgSection, SectionRole } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { toSlug } from "@/lib/slug";

interface OrgWithMembers extends Organization {
  active_members: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  section_id: string | null;
  is_org_chief: boolean;
  section_role: SectionRole;
  staff_type: "attending" | "resident";
  is_active: boolean;
  consent_accepted_at: string | null;
  user_email: string | null;
  user_name: string | null;
  section_name: string | null;
}

export function AdminOrganizationsTab() {
  const t = useT();
  const [orgs, setOrgs] = useState<OrgWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  // Org form
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgWithMembers | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSeats, setFormSeats] = useState(50);
  const [formIsPilot, setFormIsPilot] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgError, setOrgError] = useState("");

  // Selected org for management
  const [selectedOrg, setSelectedOrg] = useState<OrgWithMembers | null>(null);
  const [sections, setSections] = useState<OrgSection[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<"chart" | "manage">("chart");

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState("");

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [memberSectionId, setMemberSectionId] = useState("");
  const [memberRole, setMemberRole] = useState<SectionRole>("radiologist");
  const [memberStaffType, setMemberStaffType] = useState<"attending" | "resident">("attending");
  const [memberIsChief, setMemberIsChief] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");

  // Password reset
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetMember, setResetMember] = useState<MemberRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations", { cache: "no-store" });
      if (res.ok) setOrgs(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const [detailError, setDetailError] = useState("");

  const loadOrgDetail = useCallback(async (org: OrgWithMembers) => {
    setLoadingDetail(true);
    setDetailError("");
    try {
      const [secRes, memRes] = await Promise.all([
        fetch(`/api/admin/organizations/sections?org_id=${org.id}`, { cache: "no-store" }),
        fetch(`/api/admin/organizations/members?org_id=${org.id}`, { cache: "no-store" }),
      ]);
      if (!secRes.ok) {
        const err = await secRes.json().catch(() => ({ error: `HTTP ${secRes.status}` }));
        setDetailError(`${t("admin.org.sections")}: ${err.error || secRes.statusText}`);
      }
      if (!memRes.ok) {
        const err = await memRes.json().catch(() => ({ error: `HTTP ${memRes.status}` }));
        setDetailError((prev) => prev ? `${prev} | ${t("admin.org.members")}: ${err.error || memRes.statusText}` : `${t("admin.org.members")}: ${err.error || memRes.statusText}`);
      }
      setSections(secRes.ok ? await secRes.json() : []);
      setMembers(memRes.ok ? await memRes.json() : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("admin.org.network_error");
      setDetailError(msg);
      setSections([]);
      setMembers([]);
    }
    setLoadingDetail(false);
  }, []);

  function openManage(org: OrgWithMembers) {
    setSelectedOrg(org);
    loadOrgDetail(org);
  }

  function openCreateOrg() {
    setEditingOrg(null);
    setFormName("");
    setFormSlug("");
    setFormEmail("");
    setFormSeats(50);
    setFormIsPilot(false);
    setOrgError("");
    setShowOrgForm(true);
  }

  function openEditOrg(org: OrgWithMembers) {
    setEditingOrg(org);
    setFormName(org.name);
    setFormSlug(org.slug);
    setFormEmail(org.billing_email || "");
    setFormSeats(org.max_seats);
    setFormIsPilot(org.is_pilot || false);
    setOrgError("");
    setShowOrgForm(true);
  }

  async function handleSaveOrg() {
    if (!formName.trim() || !formSlug.trim()) return;
    setSaving(true);
    setOrgError("");
    const body = {
      ...(editingOrg ? { id: editingOrg.id } : {}),
      name: formName.trim(),
      slug: toSlug(formSlug),
      billing_email: formEmail.trim() || null,
      max_seats: formSeats,
      is_pilot: formIsPilot,
    };
    try {
      const res = await fetch("/api/admin/organizations", {
        method: editingOrg ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setOrgError(data.error || t("admin.org.error_saving_org"));
        setSaving(false);
        return;
      }
    } catch {
      setOrgError(t("admin.org.network_error"));
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowOrgForm(false);
    await loadOrgs();
  }

  async function handleToggleActive(org: OrgWithMembers) {
    setOrgError("");
    try {
      const res = await fetch("/api/admin/organizations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: org.id, is_active: !org.is_active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setOrgError(data.error || t("admin.org.error_toggling_org"));
      }
    } catch {
      setOrgError(t("admin.org.network_error"));
    }
    await loadOrgs();
  }

  async function handleDeleteOrg(org: OrgWithMembers) {
    if (!confirm(t("admin.org.confirm_delete_org").replace("{name}", org.name))) return;
    setOrgError("");
    try {
      const res = await fetch(`/api/admin/organizations?id=${org.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setOrgError(data.error || t("admin.org.error_deleting_org"));
        return;
      }
    } catch {
      setOrgError(t("admin.org.network_error"));
      return;
    }
    setSelectedOrg(null);
    await loadOrgs();
  }

  // ── Sections ──
  async function handleCreateSection() {
    if (!sectionName.trim() || !selectedOrg) return;
    setSavingSection(true);
    setSectionError("");
    const slug = toSlug(sectionName);
    try {
      const res = await fetch("/api/admin/organizations/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: selectedOrg.id, name: sectionName.trim(), slug }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setSectionError(data.error || t("admin.org.error_creating_section"));
        setSavingSection(false);
        return;
      }
      setSavingSection(false);
      setShowSectionForm(false);
      setSectionName("");
      await loadOrgDetail(selectedOrg);
    } catch (e) {
      setSectionError(t("admin.org.network_error_creating_section"));
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm(t("admin.org.confirm_delete_section"))) return;
    const res = await fetch(`/api/admin/organizations/sections?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Error" }));
      alert(data.error || t("admin.org.error_deleting_section"));
    }
    if (selectedOrg) await loadOrgDetail(selectedOrg);
  }

  // ── Members ──
  function openAddMember() {
    setEditingMember(null);
    setIsNewUser(true);
    setMemberName("");
    setMemberEmail("");
    setMemberPassword("");
    setShowPassword(false);
    setMemberSectionId(sections[0]?.id || "");
    setMemberRole("radiologist");
    setMemberStaffType("attending");
    setMemberIsChief(false);
    setMemberError("");
    setMemberSuccess("");
    setShowMemberForm(true);
  }

  function openEditMember(m: MemberRow) {
    setEditingMember(m);
    setIsNewUser(false);
    setMemberName(m.user_name || "");
    setMemberEmail(m.user_email || "");
    setMemberPassword("");
    setMemberSectionId(m.section_id || "");
    setMemberRole(m.section_role);
    setMemberStaffType(m.staff_type || "attending");
    setMemberIsChief(m.is_org_chief);
    setMemberError("");
    setMemberSuccess("");
    setShowMemberForm(true);
  }

  function openPasswordReset(m: MemberRow) {
    setResetMember(m);
    setNewPassword("");
    setResetError("");
    setResetSuccess("");
    setShowPasswordReset(true);
  }

  async function handleResetPassword() {
    if (!resetMember || !newPassword) return;
    setResettingPassword(true);
    setResetError("");
    setResetSuccess("");
    const res = await fetch("/api/admin/organizations/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: resetMember.user_id, new_password: newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      setResetError(data.error || "Error");
    } else {
      setResetSuccess(t("admin.org.password_updated_for").replace("{name}", resetMember.user_name || resetMember.user_email || ""));
    }
    setResettingPassword(false);
  }

  async function handleSaveMember() {
    if (!selectedOrg) return;
    setSavingMember(true);
    setMemberError("");
    setMemberSuccess("");

    try {
      if (editingMember) {
        const res = await fetch("/api/admin/organizations/members", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingMember.id,
            section_id: memberSectionId && memberSectionId !== "none" ? memberSectionId : null,
            section_role: memberRole,
            staff_type: memberStaffType,
            is_org_chief: memberIsChief,
          }),
        });
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        if (!res.ok) {
          setMemberError(data.error || t("admin.org.error_updating_member"));
          setSavingMember(false);
          return;
        }
        setSavingMember(false);
        setShowMemberForm(false);
        await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
      } else {
        if (!memberEmail.trim()) {
          setMemberError(t("admin.org.enter_user_email"));
          setSavingMember(false);
          return;
        }
        if (isNewUser && (!memberPassword || memberPassword.length < 6)) {
          setMemberError(t("admin.org.password_min_6"));
          setSavingMember(false);
          return;
        }

        const body: Record<string, unknown> = {
          org_id: selectedOrg.id,
          email: memberEmail.trim().toLowerCase(),
          section_id: memberSectionId && memberSectionId !== "none" ? memberSectionId : null,
          section_role: memberRole,
          staff_type: memberStaffType,
          is_org_chief: memberIsChief,
        };
        if (isNewUser) {
          body.name = memberName.trim();
          body.password = memberPassword;
        }

        const res = await fetch("/api/admin/organizations/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const result = await res.json().catch(() => ({ error: `Error ${res.status}` }));

        if (!res.ok) {
          setMemberError(result.error || t("admin.org.error_adding_member"));
          setSavingMember(false);
          return;
        }

        if (result.user_created) {
          setMemberSuccess(`${t("admin.org.account_created")}. Email: ${memberEmail.trim().toLowerCase()} / ${t("admin.org.password")}: ${memberPassword}`);
          setSavingMember(false);
          await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
          return;
        }

        setSavingMember(false);
        setShowMemberForm(false);
        await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
      }
    } catch (e) {
      setMemberError(t("admin.org.network_error_saving"));
      setSavingMember(false);
    }
  }

  async function handleToggleMember(m: MemberRow) {
    if (!selectedOrg) return;
    setDetailError("");
    try {
      const res = await fetch("/api/admin/organizations/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, is_active: !m.is_active }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: `Error ${res.status}` }));
        setDetailError(data.error || t("admin.org.error_toggling_member"));
      }
    } catch {
      setDetailError(t("admin.org.network_error"));
    }
    await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
  }

  const roleLabel = (role: string, chief: boolean) => {
    if (chief) return t("admin.org.role_org_chief");
    if (role === "section_chief") return t("admin.org.role_section_chief");
    if (role === "section_editor") return t("admin.org.role_editor");
    return t("admin.org.role_radiologist");
  };

  const roleColor = (role: string, chief: boolean) => {
    if (chief) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    if (role === "section_chief") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (role === "section_editor") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;

  // ════════════════════════════════════════════
  // DETAIL VIEW — Managing a specific org
  // ════════════════════════════════════════════

  const activeMembers = members.filter((m) => m.is_active);
  const chiefs = activeMembers.filter((m) => m.is_org_chief);
  const unassigned = activeMembers.filter((m) => !m.section_id && !m.is_org_chief);

  if (selectedOrg) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedOrg(null); setDetailTab("chart"); }} aria-label={t("common.back")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedOrg.name}</h2>
            <span className="text-[11px] text-gray-400">{selectedOrg.slug} · {selectedOrg.active_members}/{selectedOrg.max_seats} {t("admin.org.seats")}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => openEditOrg(selectedOrg)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            {t("edit")}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl w-fit">
          <button
            onClick={() => setDetailTab("chart")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              detailTab === "chart" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            {t("admin.org.org_chart")}
          </button>
          <button
            onClick={() => setDetailTab("manage")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              detailTab === "manage" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            {t("admin.org.management")}
          </button>
        </div>

        {detailError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs text-red-600 dark:text-red-400">{detailError}</p>
          </div>
        )}

        {loadingDetail ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
        ) : (
          <>
            {/* ═══════ ORGANIGRAMA TAB ═══════ */}
            {detailTab === "chart" && (
              <div className="space-y-6">
                {members.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Network className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">{t("admin.org.chart_empty")}</p>
                      <Button size="sm" className="mt-4 gap-1.5" onClick={() => setDetailTab("manage")}>
                        <Settings className="h-3.5 w-3.5" />
                        {t("admin.org.go_to_management")}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="overflow-x-auto pb-4">
                    <div className="flex flex-col items-center min-w-fit">
                      {/* Hospital top node */}
                      <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white text-center shadow-lg">
                        <Building2 className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-sm font-bold">{selectedOrg.name}</p>
                        <p className="text-[10px] opacity-80">{activeMembers.length} {t("admin.org.active_members")}</p>
                      </div>

                      {/* Connector line down */}
                      {chiefs.length > 0 && <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />}

                      {/* Chiefs row */}
                      {chiefs.length > 0 && (
                        <div className="flex gap-3 justify-center flex-wrap">
                          {chiefs.map((c) => (
                            <button key={c.id} onClick={() => openEditMember(c)}
                              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 transition-colors cursor-pointer"
                            >
                              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {(c.user_name || c.user_email || "?")[0].toUpperCase()}
                              </div>
                              <div className="text-left">
                                <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">{c.user_name || c.user_email}</p>
                                <p className="text-[10px] text-purple-600 dark:text-purple-400">{t("admin.org.role_org_chief")}</p>
                              </div>
                              <Pencil className="h-3 w-3 text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Connector to sections */}
                      {sections.length > 0 && <div className="w-px h-6 bg-gray-300 dark:bg-gray-700" />}

                      {/* Horizontal rail connecting sections */}
                      {sections.length > 1 && (
                        <div className="flex items-start justify-center">
                          <div className="h-px bg-gray-300 dark:bg-gray-700" style={{ width: `${Math.max((sections.length - 1) * 220, 200)}px` }} />
                        </div>
                      )}

                      {/* Section columns */}
                      {sections.length > 0 && (
                        <div className="flex gap-4 justify-center flex-wrap mt-0">
                          {sections.map((s) => {
                            const sMembers = activeMembers.filter((m) => m.section_id === s.id && !m.is_org_chief);
                            const sChief = sMembers.find((m) => m.section_role === "section_chief");
                            const sEditors = sMembers.filter((m) => m.section_role === "section_editor");
                            const sRads = sMembers.filter((m) => m.section_role === "radiologist");

                            return (
                              <div key={s.id} className="flex flex-col items-center w-48">
                                {/* Connector down from rail */}
                                {sections.length > 1 && <div className="w-px h-4 bg-gray-300 dark:bg-gray-700" />}

                                {/* Section header */}
                                <div className="w-full px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-center">
                                  <p className="text-[11px] font-bold text-blue-800 dark:text-blue-200">{s.name}</p>
                                  <p className="text-[9px] text-blue-500">{sMembers.length} {t("admin.org.members_count")}</p>
                                </div>

                                {/* Members in this section */}
                                {sMembers.length > 0 && <div className="w-px h-3 bg-gray-200 dark:bg-gray-800" />}

                                <div className="w-full space-y-1">
                                  {/* Section chief */}
                                  {sChief && (
                                    <button onClick={() => openEditMember(sChief)}
                                      className="group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-transparent hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                                    >
                                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {(sChief.user_name || sChief.user_email || "?")[0].toUpperCase()}
                                      </div>
                                      <div className="flex-1 text-left min-w-0">
                                        <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">{sChief.user_name || sChief.user_email}</p>
                                        <p className="text-[9px] text-blue-500">{t("admin.org.role_section_chief")}</p>
                                      </div>
                                    </button>
                                  )}

                                  {/* Editors */}
                                  {sEditors.map((e) => (
                                    <button key={e.id} onClick={() => openEditMember(e)}
                                      className="group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                                    >
                                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {(e.user_name || e.user_email || "?")[0].toUpperCase()}
                                      </div>
                                      <div className="flex-1 text-left min-w-0">
                                        <p className="text-[11px] font-medium text-gray-800 dark:text-gray-200 truncate">{e.user_name || e.user_email}</p>
                                        <p className="text-[9px] text-amber-500">{t("admin.org.role_editor")}</p>
                                      </div>
                                    </button>
                                  ))}

                                  {/* Radiologists */}
                                  {sRads.map((r) => (
                                    <button key={r.id} onClick={() => openEditMember(r)}
                                      className="group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                                    >
                                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${r.staff_type === "resident" ? "bg-emerald-500" : "bg-gray-400"}`}>
                                        {(r.user_name || r.user_email || "?")[0].toUpperCase()}
                                      </div>
                                      <div className="flex-1 text-left min-w-0">
                                        <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{r.user_name || r.user_email}</p>
                                        <p className="text-[9px] text-gray-400">{r.staff_type === "resident" ? t("admin.org.staff_resident") : t("admin.org.role_radiologist")}</p>
                                      </div>
                                    </button>
                                  ))}

                                  {sMembers.length === 0 && (
                                    <p className="text-[10px] text-gray-400 text-center py-2 italic">{t("admin.org.no_members")}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Unassigned members */}
                      {unassigned.length > 0 && (
                        <div className="mt-6 w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{t("admin.org.unassigned_section")}</span>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
                          </div>
                          <div className="flex gap-2 flex-wrap justify-center">
                            {unassigned.map((u) => (
                              <button key={u.id} onClick={() => openEditMember(u)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 hover:border-gray-400 transition-colors cursor-pointer"
                              >
                                <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                  {(u.user_name || u.user_email || "?")[0].toUpperCase()}
                                </div>
                                <span className="text-[11px] text-gray-600 dark:text-gray-400">{u.user_name || u.user_email}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick action bar */}
                <div className="flex gap-2 justify-center pt-2">
                  <Button size="sm" variant="outline" onClick={openAddMember} className="gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" />
                    {t("admin.org.add_member")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSectionName(""); setShowSectionForm(true); }} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    {t("admin.org.new_section")}
                  </Button>
                </div>
              </div>
            )}

            {/* ═══════ GESTIÓN TAB ═══════ */}
            {detailTab === "manage" && (
              <>
                {/* ── Sections ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t("admin.org.sections")} ({sections.length})</h3>
                    <Button size="sm" onClick={() => { setSectionName(""); setShowSectionForm(true); }} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      {t("admin.org.new_section")}
                    </Button>
                  </div>

                  {sections.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-6">
                        <p className="text-xs text-gray-400">{t("admin.org.no_sections_hint")}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sections.map((s) => {
                        const sMembers = members.filter((m) => m.section_id === s.id && m.is_active);
                        return (
                          <Card key={s.id}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 text-blue-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block truncate">{s.name}</span>
                                <span className="text-[10px] text-gray-400">{sMembers.length} {t("admin.org.members_count")}</span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 flex-shrink-0" onClick={() => handleDeleteSection(s.id)} aria-label={t("common.delete")}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Members ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {t("admin.org.members")} ({activeMembers.length} {t("admin.org.active_lc")}{members.length > activeMembers.length ? `, ${members.length - activeMembers.length} ${t("admin.org.inactive_lc")}` : ""})
                    </h3>
                    <Button size="sm" onClick={openAddMember} className="gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("admin.org.add_member")}
                    </Button>
                  </div>

                  {members.length === 0 ? (
                    <Card>
                      <CardContent className="text-center py-6">
                        <p className="text-xs text-gray-400">{t("admin.org.no_members_hint")}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-1.5">
                      {members.map((m) => (
                        <Card key={m.id} className={!m.is_active ? "opacity-50" : ""}>
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                                m.is_org_chief ? "bg-purple-500" : m.section_role === "section_chief" ? "bg-blue-500" : m.section_role === "section_editor" ? "bg-amber-500" : "bg-gray-400"
                              }`}>
                                {(m.user_name || m.user_email || "?")[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">
                                  {m.user_name || m.user_email}
                                </span>
                                <span className="text-[10px] text-gray-400 block truncate">
                                  {m.section_name || t("admin.org.no_section")} {m.user_name ? `· ${m.user_email}` : ""}
                                </span>
                              </div>
                              <Badge className={`text-[9px] flex-shrink-0 ${roleColor(m.section_role, m.is_org_chief)}`}>
                                {roleLabel(m.section_role, m.is_org_chief)}
                              </Badge>
                              {m.staff_type === "resident" && (
                                <Badge variant="outline" className="text-[9px] flex-shrink-0 border-emerald-400/50 text-emerald-600 dark:text-emerald-400">
                                  {t("admin.org.staff_resident")}
                                </Badge>
                              )}
                              {!m.consent_accepted_at && m.is_active && (
                                <Badge variant="outline" className="text-[9px] flex-shrink-0 border-red-400/50 text-red-500 dark:text-red-400">
                                  {t("admin.org.consent_pending")}
                                </Badge>
                              )}
                              {!m.is_active && <Badge variant="secondary" className="text-[9px] flex-shrink-0">{t("admin.org.inactive")}</Badge>}
                              <div className="flex gap-0.5 flex-shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(m)} title={t("admin.org.edit_role")}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-600" onClick={() => openPasswordReset(m)} title={t("admin.org.change_password")}>
                                  <KeyRound className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon"
                                  className={`h-7 w-7 ${m.is_active ? "text-amber-500 hover:text-amber-600" : "text-green-500 hover:text-green-600"}`}
                                  onClick={() => handleToggleMember(m)}
                                  title={m.is_active ? t("admin.org.deactivate") : t("admin.org.reactivate")}
                                >
                                  {m.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Section form dialog */}
        <Dialog open={showSectionForm} onOpenChange={(open) => { setShowSectionForm(open); if (!open) setSectionError(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("admin.org.new_section")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.org.name")}</Label>
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder={t("admin.org.section_name_placeholder")}
                  className="h-9"
                />
              </div>
              {sectionError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{sectionError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowSectionForm(false)}>{t("cancel")}</Button>
                <Button size="sm" onClick={handleCreateSection} disabled={savingSection || !sectionName.trim()}>
                  {savingSection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin.org.create")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Member form dialog */}
        <Dialog open={showMemberForm} onOpenChange={(open) => { setShowMemberForm(open); if (!open) setMemberSuccess(""); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMember ? t("admin.org.edit_member") : t("admin.org.add_member_to_hospital")}</DialogTitle>
            </DialogHeader>

            {memberSuccess ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">{t("admin.org.account_created_success")}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-mono select-all">{memberSuccess}</p>
                  <p className="text-[10px] text-green-500 mt-2">{t("admin.org.copy_credentials_hint")}</p>
                </div>
                <Button size="sm" className="w-full" onClick={() => { setShowMemberForm(false); setMemberSuccess(""); }}>{t("close")}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mode toggle — only when adding, not editing */}
                {!editingMember && (
                  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    <button
                      onClick={() => setIsNewUser(true)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        isNewUser ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"
                      }`}
                    >
                      {t("admin.org.create_new_account")}
                    </button>
                    <button
                      onClick={() => setIsNewUser(false)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        !isNewUser ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm" : "text-gray-500"
                      }`}
                    >
                      {t("admin.org.existing_user")}
                    </button>
                  </div>
                )}

                {/* Editing — show who */}
                {editingMember && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      editingMember.is_org_chief ? "bg-purple-500" : "bg-gray-400"
                    }`}>
                      {(editingMember.user_name || editingMember.user_email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{editingMember.user_name || editingMember.user_email}</span>
                      {editingMember.user_name && <span className="text-[10px] text-gray-400 ml-1.5">{editingMember.user_email}</span>}
                    </div>
                  </div>
                )}

                {/* Name — only for new user creation */}
                {!editingMember && isNewUser && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.org.full_name")}</Label>
                    <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder={t("admin.org.full_name_placeholder")} className="h-9" />
                  </div>
                )}

                {/* Email */}
                {!editingMember && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.org.email")}</Label>
                    <Input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="doctor@hospital.com" className="h-9" type="email" />
                    {!isNewUser && <p className="text-[10px] text-gray-400">{t("admin.org.user_must_have_account")}</p>}
                  </div>
                )}

                {/* Password — only for new user creation */}
                {!editingMember && isNewUser && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("admin.org.password")}</Label>
                    <div className="relative">
                      <Input
                        value={memberPassword}
                        onChange={(e) => setMemberPassword(e.target.value)}
                        placeholder={t("admin.org.min_6_chars")}
                        className="h-9 pr-9"
                        type={showPassword ? "text" : "password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">{t("admin.org.share_credentials_hint")}</p>
                  </div>
                )}

                {/* Section */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("admin.org.section")}</Label>
                  <Select value={memberSectionId} onValueChange={setMemberSectionId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("admin.org.select_section")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("admin.org.no_section")}</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("admin.org.role")}</Label>
                  <Select value={memberRole} onValueChange={(v) => setMemberRole(v as SectionRole)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="radiologist">{t("admin.org.role_radiologist")}</SelectItem>
                      <SelectItem value="section_editor">{t("admin.org.role_section_editor")}</SelectItem>
                      <SelectItem value="section_chief">{t("admin.org.role_section_chief")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Staff type */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("admin.org.staff_type")}</Label>
                  <Select value={memberStaffType} onValueChange={(v) => setMemberStaffType(v as "attending" | "resident")}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attending">{t("admin.org.staff_attending")}</SelectItem>
                      <SelectItem value="resident">{t("admin.org.staff_resident")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Org chief checkbox */}
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={memberIsChief} onChange={(e) => setMemberIsChief(e.target.checked)} className="rounded border-gray-300" />
                  <div>
                    <span className="font-medium">{t("admin.org.role_org_chief")}</span>
                    <span className="text-gray-400 ml-1">({t("admin.org.full_hospital_access")})</span>
                  </div>
                </label>

                {memberError && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{memberError}</p>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setShowMemberForm(false)}>{t("cancel")}</Button>
                  <Button size="sm" onClick={handleSaveMember} disabled={savingMember}>
                    {savingMember ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingMember ? t("save") : isNewUser ? t("admin.org.create_account_and_add") : t("admin.org.add")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Password reset dialog */}
        <Dialog open={showPasswordReset} onOpenChange={(open) => { setShowPasswordReset(open); if (!open) setResetSuccess(""); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("admin.org.reset_password")}</DialogTitle>
            </DialogHeader>
            {resetMember && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {resetMember.user_name || resetMember.user_email}
                  </span>
                  {resetMember.user_name && <span className="text-[10px] text-gray-400">{resetMember.user_email}</span>}
                </div>

                {resetSuccess ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-green-700 dark:text-green-300">{resetSuccess}</p>
                      <p className="text-xs font-mono mt-1 select-all text-green-600">{newPassword}</p>
                      <p className="text-[10px] text-green-500 mt-1">{t("admin.org.share_new_password_hint")}</p>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setShowPasswordReset(false)}>{t("close")}</Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("admin.org.new_password")}</Label>
                      <Input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t("admin.org.min_6_chars")}
                        className="h-9"
                        type="text"
                        minLength={6}
                      />
                    </div>
                    {resetError && (
                      <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{resetError}</p>
                    )}
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => setShowPasswordReset(false)}>{t("cancel")}</Button>
                      <Button size="sm" onClick={handleResetPassword} disabled={resettingPassword || newPassword.length < 6}>
                        {resettingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin.org.change_password")}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Org edit dialog (reused) */}
        <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingOrg ? t("admin.org.edit_organization") : t("admin.org.new_organization")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.org.name")}</Label>
                <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingOrg) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Hospital Universitario La Paz" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.org.slug")}</Label>
                <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="hospital-la-paz" className="h-9 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.org.billing_email")}</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="billing@hospital.com" className="h-9" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("admin.org.max_seats")}</Label>
                <Input type="number" value={formSeats} onChange={(e) => setFormSeats(Number(e.target.value))} min={1} className="h-9 w-24" />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={formIsPilot} onChange={(e) => setFormIsPilot(e.target.checked)} className="rounded border-gray-300" />
                <div>
                  <span className="font-medium">{t("pilot.is_pilot")}</span>
                  <span className="text-gray-400 ml-1">({t("pilot.is_pilot_hint")})</span>
                </div>
              </label>
              {orgError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{orgError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowOrgForm(false)}>{t("cancel")}</Button>
                <Button size="sm" onClick={handleSaveOrg} disabled={saving || !formName.trim() || !formSlug.trim()}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingOrg ? t("save") : t("admin.org.create")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════
  // LIST VIEW — All organizations
  // ════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("admin.org.hospitals")}</h2>
        <Button size="sm" onClick={openCreateOrg} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {t("admin.org.new_hospital")}
        </Button>
      </div>

      {orgError && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{orgError}</p>
        </div>
      )}

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">{t("admin.org.no_hospitals")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <Card
              key={org.id}
              className={`cursor-pointer transition-colors hover:border-blue-200 dark:hover:border-blue-800 ${!org.is_active ? "opacity-60" : ""}`}
              onClick={() => openManage(org)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.name}</h3>
                      {org.is_pilot && <Badge variant="outline" className="text-[9px] border-indigo-400/50 text-indigo-600 dark:text-indigo-400">{t("pilot.is_pilot")}</Badge>}
                      {!org.is_active && <Badge variant="secondary" className="text-[9px]">{t("admin.org.inactive")}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-500">{org.slug}</span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.active_members}/{org.max_seats} {t("admin.org.seats")}
                      </span>
                      {org.billing_email && (
                        <span className="text-[11px] text-gray-400 truncate">{org.billing_email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={org.is_active}
                      onCheckedChange={() => handleToggleActive(org)}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOrg(org)} aria-label={t("common.edit")}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteOrg(org)} aria-label={t("common.delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-gray-500">
            <strong>{t("admin.org.pricing_label")}:</strong> {t("admin.org.pricing_detail")}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {t("admin.org.monthly_revenue")}: {orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members * 20 : 0), 0)} €/{t("admin.org.month_abbr")}
            ({orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members : 0), 0)} {t("admin.org.active_radiologists")})
          </p>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOrg ? t("admin.org.edit_organization") : t("admin.org.new_hospital")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.org.name")}</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingOrg) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Hospital Universitario La Paz" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.org.slug_url")}</Label>
              <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="hospital-la-paz" className="h-9 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.org.billing_email")}</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="billing@hospital.com" className="h-9" type="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("admin.org.max_seats")}</Label>
              <Input type="number" value={formSeats} onChange={(e) => setFormSeats(Number(e.target.value))} min={1} className="h-9 w-24" />
            </div>
            {orgError && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{orgError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowOrgForm(false)}>{t("cancel")}</Button>
              <Button size="sm" onClick={handleSaveOrg} disabled={saving || !formName.trim() || !formSlug.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingOrg ? t("save") : t("admin.org.create")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
