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
  Plus, Pencil, Trash2, UserPlus, Shield, Crown, ChevronDown,
  Check, X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import type { OrgMembership, OrgSection, SectionRole } from "@/lib/types";

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
  const [tab, setTab] = useState<Tab>("stats");
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

  const isOrgChief = orgData?.membership.is_org_chief || false;

  const loadOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        if (data.membership) setOrgData(data);
      }
    } catch { /* ignore */ }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/org/members");
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/org/stats");
      if (res.ok) setStats(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([loadOrg(), loadMembers(), loadStats()]).finally(() => setLoading(false));
  }, [loadOrg, loadMembers, loadStats]);

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
    if (!confirm("Delete this section? Members will be unassigned.")) return;
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
        setMemberError("Introduce el email del usuario");
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
        setMemberError(data.error === "User not found" ? "No existe un usuario registrado con ese email" : data.error || "Error");
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

  const roleLabel = (role: string, chief: boolean) => {
    if (chief) return "Jefe de Servicio";
    if (role === "section_chief") return "Jefe de Sección";
    if (role === "section_editor") return "Editor";
    return "Radiólogo";
  };

  const roleColor = (role: string, chief: boolean) => {
    if (chief) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    if (role === "section_chief") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    if (role === "section_editor") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  };

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
        <p className="text-gray-500">No organization found</p>
      </div>
    );
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "stats", label: "Estadísticas", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "members", label: "Miembros", icon: <Users className="h-4 w-4" /> },
    { key: "sections", label: "Secciones", icon: <Building2 className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-12 md:h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="shrink-0 h-9 w-9">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Logo size="sm" variant="icon" className="sm:hidden" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate hidden sm:inline">
              {orgData.organization.name}
            </span>
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px]">
              {isOrgChief ? "Jefe de Servicio" : "Jefe de Sección"}
            </Badge>
          </div>
          <span className="ml-auto text-[11px] text-gray-400">
            {orgData.active_members}/{orgData.organization.max_seats} plazas
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="flex gap-1 mb-4 md:mb-6 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-x-auto w-fit scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
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

        {/* ═══ STATS ═══ */}
        {tab === "stats" && stats && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_members}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Radiólogos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_reports_this_month}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Informes este mes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sections.length}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Secciones</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total_members > 0 ? Math.round(stats.total_reports_this_month / stats.total_members) : 0}
                  </p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Media/radiólogo</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-section breakdown */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Por sección</h3>
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
                      <span className="text-xs text-gray-500">{s.members} miembros</span>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white block">{s.reports} informes</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Per-radiologist table */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-4">Por radiólogo</h3>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left p-3 font-medium text-gray-500">Nombre</th>
                        <th className="text-left p-3 font-medium text-gray-500">Sección</th>
                        <th className="text-left p-3 font-medium text-gray-500">Rol</th>
                        <th className="text-right p-3 font-medium text-gray-500">Informes/mes</th>
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
                Miembros ({members.filter((m) => m.is_active).length} activos)
              </h3>
              <Button size="sm" onClick={openAddMember} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                Añadir
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
                          {m.section_name || "Sin sección"} {m.user_name ? `· ${m.user_email}` : ""}
                        </span>
                      </div>
                      <Badge className={`text-[9px] ${roleColor(m.section_role, m.is_org_chief)}`}>
                        {roleLabel(m.section_role, m.is_org_chief)}
                      </Badge>
                      {!m.is_active && <Badge variant="secondary" className="text-[9px]">Inactivo</Badge>}
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(m)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className={`h-7 w-7 ${m.is_active ? "text-amber-500 hover:text-amber-600" : "text-green-500 hover:text-green-600"}`}
                          onClick={() => handleToggleMemberActive(m)}
                          title={m.is_active ? "Desactivar" : "Reactivar"}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Secciones</h3>
              {isOrgChief && (
                <Button size="sm" onClick={() => { setSectionName(""); setSectionSlug(""); setShowSectionForm(true); }} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nueva sección
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {orgData.sections.map((s) => {
                const sMembers = members.filter((m) => m.section_id === s.id && m.is_active);
                return (
                  <Card key={s.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</h4>
                          <p className="text-[10px] text-gray-400">{sMembers.length} miembros</p>
                        </div>
                        {isOrgChief && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeleteSection(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {sMembers.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
                          {sMembers.map((m) => (
                            <div key={m.id} className="flex items-center gap-2 text-xs">
                              <span className="text-gray-700 dark:text-gray-300 flex-1 truncate">{m.user_name || m.user_email}</span>
                              <Badge className={`text-[8px] ${roleColor(m.section_role, m.is_org_chief)}`}>
                                {roleLabel(m.section_role, m.is_org_chief)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
    </div>
  );
}
