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
  UserPlus, Shield, Crown, Check, X,
} from "lucide-react";
import type { Organization, OrgSection, SectionRole } from "@/lib/types";

interface OrgWithMembers extends Organization {
  active_members: number;
}

interface MemberRow {
  id: string;
  user_id: string;
  section_id: string | null;
  is_org_chief: boolean;
  section_role: SectionRole;
  is_active: boolean;
  user_email: string | null;
  user_name: string | null;
  section_name: string | null;
}

export function AdminOrganizationsTab() {
  const [orgs, setOrgs] = useState<OrgWithMembers[]>([]);
  const [loading, setLoading] = useState(true);

  // Org form
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgWithMembers | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSeats, setFormSeats] = useState(50);
  const [saving, setSaving] = useState(false);

  // Selected org for management
  const [selectedOrg, setSelectedOrg] = useState<OrgWithMembers | null>(null);
  const [sections, setSections] = useState<OrgSection[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Section form
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [savingSection, setSavingSection] = useState(false);

  // Member form
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberSectionId, setMemberSectionId] = useState("");
  const [memberRole, setMemberRole] = useState<SectionRole>("radiologist");
  const [memberIsChief, setMemberIsChief] = useState(false);
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) setOrgs(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const loadOrgDetail = useCallback(async (org: OrgWithMembers) => {
    setLoadingDetail(true);
    try {
      const [secRes, memRes] = await Promise.all([
        fetch(`/api/admin/organizations/sections?org_id=${org.id}`),
        fetch(`/api/admin/organizations/members?org_id=${org.id}`),
      ]);
      if (secRes.ok) setSections(await secRes.json());
      if (memRes.ok) setMembers(await memRes.json());
    } catch { /* ignore */ }
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
    setShowOrgForm(true);
  }

  function openEditOrg(org: OrgWithMembers) {
    setEditingOrg(org);
    setFormName(org.name);
    setFormSlug(org.slug);
    setFormEmail(org.billing_email || "");
    setFormSeats(org.max_seats);
    setShowOrgForm(true);
  }

  async function handleSaveOrg() {
    if (!formName.trim() || !formSlug.trim()) return;
    setSaving(true);
    const body = {
      ...(editingOrg ? { id: editingOrg.id } : {}),
      name: formName.trim(),
      slug: formSlug.trim().toLowerCase().replace(/\s+/g, "-"),
      billing_email: formEmail.trim() || null,
      max_seats: formSeats,
    };
    await fetch("/api/admin/organizations", {
      method: editingOrg ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setShowOrgForm(false);
    await loadOrgs();
  }

  async function handleToggleActive(org: OrgWithMembers) {
    await fetch("/api/admin/organizations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: org.id, is_active: !org.is_active }),
    });
    await loadOrgs();
  }

  async function handleDeleteOrg(org: OrgWithMembers) {
    if (!confirm(`Eliminar "${org.name}"? Se borrarán todas las secciones, miembros y recursos compartidos.`)) return;
    await fetch(`/api/admin/organizations?id=${org.id}`, { method: "DELETE" });
    setSelectedOrg(null);
    await loadOrgs();
  }

  // ── Sections ──
  async function handleCreateSection() {
    if (!sectionName.trim() || !selectedOrg) return;
    setSavingSection(true);
    const slug = sectionName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9áéíóúñü-]/g, "");
    await fetch("/api/admin/organizations/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: selectedOrg.id, name: sectionName.trim(), slug }),
    });
    setSavingSection(false);
    setShowSectionForm(false);
    setSectionName("");
    await loadOrgDetail(selectedOrg);
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Eliminar sección? Los miembros quedarán sin sección asignada.")) return;
    await fetch(`/api/admin/organizations/sections?id=${id}`, { method: "DELETE" });
    if (selectedOrg) await loadOrgDetail(selectedOrg);
  }

  // ── Members ──
  function openAddMember() {
    setEditingMember(null);
    setMemberEmail("");
    setMemberSectionId(sections[0]?.id || "");
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
    if (!selectedOrg) return;
    setSavingMember(true);
    setMemberError("");

    if (editingMember) {
      const res = await fetch("/api/admin/organizations/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMember.id,
          section_id: memberSectionId && memberSectionId !== "none" ? memberSectionId : null,
          section_role: memberRole,
          is_org_chief: memberIsChief,
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
      const res = await fetch("/api/admin/organizations/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: selectedOrg.id,
          email: memberEmail.trim().toLowerCase(),
          section_id: memberSectionId && memberSectionId !== "none" ? memberSectionId : null,
          section_role: memberRole,
          is_org_chief: memberIsChief,
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
    await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
  }

  async function handleToggleMember(m: MemberRow) {
    if (!selectedOrg) return;
    await fetch("/api/admin/organizations/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: m.id, is_active: !m.is_active }),
    });
    await Promise.all([loadOrgDetail(selectedOrg), loadOrgs()]);
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;

  // ════════════════════════════════════════════
  // DETAIL VIEW — Managing a specific org
  // ════════════════════════════════════════════
  if (selectedOrg) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrg(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{selectedOrg.name}</h2>
            <span className="text-[11px] text-gray-400">{selectedOrg.slug} · {selectedOrg.active_members}/{selectedOrg.max_seats} plazas</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => openEditOrg(selectedOrg)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>

        {loadingDetail ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
        ) : (
          <>
            {/* ── Sections ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Secciones ({sections.length})</h3>
                <Button size="sm" onClick={() => { setSectionName(""); setShowSectionForm(true); }} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Nueva sección
                </Button>
              </div>

              {sections.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-6">
                    <p className="text-xs text-gray-400">No hay secciones. Crea las secciones del servicio de radiología.</p>
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
                            <span className="text-[10px] text-gray-400">{sMembers.length} miembros</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 flex-shrink-0" onClick={() => handleDeleteSection(s.id)}>
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
                  Miembros ({members.filter((m) => m.is_active).length} activos)
                </h3>
                <Button size="sm" onClick={openAddMember} className="gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Añadir miembro
                </Button>
              </div>

              {members.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-6">
                    <p className="text-xs text-gray-400">No hay miembros. Añade al jefe de servicio primero.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <Card key={m.id} className={!m.is_active ? "opacity-50" : ""}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
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
                          <Badge className={`text-[9px] flex-shrink-0 ${roleColor(m.section_role, m.is_org_chief)}`}>
                            {roleLabel(m.section_role, m.is_org_chief)}
                          </Badge>
                          {!m.is_active && <Badge variant="secondary" className="text-[9px] flex-shrink-0">Inactivo</Badge>}
                          <div className="flex gap-0.5 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditMember(m)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className={`h-7 w-7 ${m.is_active ? "text-amber-500 hover:text-amber-600" : "text-green-500 hover:text-green-600"}`}
                              onClick={() => handleToggleMember(m)}
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
              )}
            </div>
          </>
        )}

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
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Radiología de Tórax"
                  className="h-9"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowSectionForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleCreateSection} disabled={savingSection || !sectionName.trim()}>
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
              {editingMember && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {editingMember.user_name || editingMember.user_email}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Sección</Label>
                <Select value={memberSectionId} onValueChange={setMemberSectionId}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Seleccionar sección" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin sección</SelectItem>
                    {sections.map((s) => (
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
                    <SelectItem value="section_chief">Jefe de sección</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={memberIsChief}
                  onChange={(e) => setMemberIsChief(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <div>
                  <span className="font-medium">Jefe de servicio</span>
                  <span className="text-gray-400 ml-1">(acceso total al hospital)</span>
                </div>
              </label>
              {memberError && (
                <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{memberError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowMemberForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveMember} disabled={savingMember}>
                  {savingMember ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingMember ? "Guardar" : "Añadir"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Org edit dialog (reused) */}
        <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingOrg ? "Editar organización" : "Nueva organización"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingOrg) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Hospital Universitario La Paz" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Slug</Label>
                <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="hospital-la-paz" className="h-9 font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email de facturación</Label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="billing@hospital.com" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plazas máximas</Label>
                <Input type="number" value={formSeats} onChange={(e) => setFormSeats(Number(e.target.value))} min={1} className="h-9 w-24" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowOrgForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSaveOrg} disabled={saving || !formName.trim() || !formSlug.trim()}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingOrg ? "Guardar" : "Crear"}
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
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Hospitales</h2>
        <Button size="sm" onClick={openCreateOrg} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Nuevo hospital
        </Button>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay hospitales</p>
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
                      {!org.is_active && <Badge variant="secondary" className="text-[9px]">Inactivo</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-500">{org.slug}</span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.active_members}/{org.max_seats} plazas
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
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditOrg(org)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDeleteOrg(org)}>
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
            <strong>Pricing:</strong> 20 €/radiólogo/mes. Sin límites de informes ni dictados para miembros del hospital.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Revenue mensual: {orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members * 20 : 0), 0)} €/mes
            ({orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members : 0), 0)} radiólogos activos)
          </p>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Editar organización" : "Nuevo hospital"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingOrg) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Hospital Universitario La Paz" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (identificador URL)</Label>
              <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="hospital-la-paz" className="h-9 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email de facturación</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="billing@hospital.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Plazas máximas</Label>
              <Input type="number" value={formSeats} onChange={(e) => setFormSeats(Number(e.target.value))} min={1} className="h-9 w-24" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowOrgForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveOrg} disabled={saving || !formName.trim() || !formSlug.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingOrg ? "Guardar" : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
