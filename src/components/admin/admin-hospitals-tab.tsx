"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2, Plus, Loader2, Copy, Check, KeyRound, UserPlus, Link as LinkIcon, X,
  ChevronLeft, Users, BarChart3, Mail, Ban, RotateCcw, FileText, Mic, Send, Trash2,
} from "lucide-react";
import { AdminPilotTab } from "@/components/admin/admin-pilot-tab";

interface Hospital {
  id: string; name: string; slug: string; billing_email: string | null;
  max_seats: number; is_active: boolean; is_pilot: boolean; active_members: number;
  signup_token: string;
}
interface Member {
  id: string; user_id: string; is_active: boolean;
  user_name: string | null; user_email: string | null;
  subspecialties: string[]; avg_reports_month: number | null;
  reports_this_month: number; dictation_minutes: number;
}

function randomPassword() {
  // Readable temporary password.
  const words = ["radiogen", "informe", "torax", "estudio", "clinico", "reporte"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w}${n}`;
}

function CopyButton({ text, small }: { text: string; small?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="outline" size="sm"
      className={small ? "h-7 gap-1 text-[11px] px-2" : "h-8 gap-1.5 text-xs"}
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
    >
      {done ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {done ? "Copiado" : "Copiar"}
    </Button>
  );
}

export function AdminHospitalsTab() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Hospital | null>(null);
  const [subView, setSubView] = useState<"team" | "metrics">("team");

  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cSeats, setCSeats] = useState("8");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) setHospitals(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function createHospital() {
    if (!cName.trim()) return;
    setSaving(true);
    try {
      const slug = cName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40) || `h-${Date.now()}`;
      const res = await fetch("/api/admin/organizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cName.trim(), slug, billing_email: cEmail.trim() || null, max_seats: Number(cSeats) || 8 }),
      });
      if (res.ok) {
        setCreateOpen(false); setCName(""); setCEmail(""); setCSeats("8");
        await load();
      }
    } catch { /* ignore */ }
    setSaving(false);
  }

  if (selected) {
    return <HospitalDetail hospital={selected} subView={subView} setSubView={setSubView} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" /> Hospitales
          </h2>
          <p className="text-xs text-gray-500">Alta de hospitales, enlace de invitación, equipo y métricas.</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Nuevo hospital
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>
      ) : hospitals.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">Aún no hay hospitales. Crea el primero.</p>
      ) : (
        <div className="grid gap-3">
          {hospitals.map((h) => (
            <Card key={h.id} className="cursor-pointer hover:border-brand/40 transition-colors" onClick={() => { setSubView("team"); setSelected(h); }}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4.5 w-4.5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{h.name}</p>
                  <p className="text-[11px] text-gray-500">{h.active_members}/{h.max_seats} radiólogos{h.billing_email ? ` · ${h.billing_email}` : ""}</p>
                </div>
                {h.is_pilot && <Badge variant="secondary" className="text-[10px]">Piloto</Badge>}
                {!h.is_active && <Badge variant="outline" className="text-[10px] text-amber-600">Inactivo</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo hospital</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre del hospital</label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Sanatorio Británico" className="h-9" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email de facturación (opcional)</label>
              <Input value={cEmail} onChange={(e) => setCEmail(e.target.value)} placeholder="administracion@hospital.com" className="h-9" type="email" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Número de licencias</label>
              <Input value={cSeats} onChange={(e) => setCSeats(e.target.value.replace(/[^0-9]/g, ""))} className="h-9 w-24" inputMode="numeric" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={createHospital} disabled={saving || !cName.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HospitalDetail({ hospital, subView, setSubView, onBack }: {
  hospital: Hospital; subView: "team" | "metrics"; setSubView: (v: "team" | "metrics") => void; onBack: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [aName, setAName] = useState(""); const [aEmail, setAEmail] = useState(""); const [aPass, setAPass] = useState(randomPassword());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://radiogen.ai";
  const inviteLink = `${origin}/hospital-signup?token=${hospital.signup_token}`;
  const inviteEmail =
`Asunto: Acceso a Radiogen.AI — ${hospital.name}

Hola,

Te damos acceso a Radiogen.AI, la plataforma de informes radiológicos con IA, como parte del equipo de ${hospital.name}.

Para crear tu cuenta (informes y dictado ilimitados), entra en este enlace y completa tus datos:
${inviteLink}

Tendrás acceso inmediato al terminar.

AVISO IMPORTANTE: Radiogen.AI es una herramienta de apoyo para redactar y organizar el informe radiológico. No sustituye el juicio clínico, no emite diagnósticos ni recomendaciones de forma autónoma. El radiólogo es responsable de revisar y validar el informe final. Al darte de alta aceptas estas condiciones.

Dentro de tu perfil tienes acceso a la guía de usuario. Para cualquier duda sobre la aplicación, escríbenos a info@radiogen.ai.

Un saludo,
Equipo Radiogen.AI`;

  type Row = { email: string; status: "idle" | "sending" | "sent" | "failed" };
  const [rows, setRows] = useState<Row[]>([{ email: "", status: "idle" }, { email: "", status: "idle" }, { email: "", status: "idle" }]);

  function setRowEmail(i: number, v: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { email: v, status: "idle" } : row));
  }
  function addRow() { setRows((r) => [...r, { email: "", status: "idle" }]); }
  function removeRow(i: number) { setRows((r) => r.length > 1 ? r.filter((_, idx) => idx !== i) : r); }

  async function sendOne(i: number) {
    const email = rows[i].email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, status: "sending" } : row));
    try {
      const res = await fetch("/api/admin/hospital-invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: hospital.id, emails: [email] }),
      });
      const d = await res.json().catch(() => ({}));
      const ok = res.ok && d.results?.[0]?.sent;
      setRows((r) => r.map((row, idx) => idx === i ? { ...row, status: ok ? "sent" : "failed" } : row));
    } catch {
      setRows((r) => r.map((row, idx) => idx === i ? { ...row, status: "failed" } : row));
    }
  }

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organizations/members?org_id=${hospital.id}`);
      if (res.ok) setMembers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [hospital.id]);
  useEffect(() => { loadMembers(); }, [loadMembers]);

  async function addMember() {
    if (!aName.trim() || !aEmail.trim() || aPass.length < 6) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/admin/organizations/members", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: hospital.id, email: aEmail.trim().toLowerCase(), name: aName.trim(), password: aPass, section_role: "radiologist", is_org_chief: false }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setNotice(`Cuenta creada: ${aEmail.trim().toLowerCase()} · contraseña: ${aPass}`);
        setAddOpen(false); setAName(""); setAEmail(""); setAPass(randomPassword());
        await loadMembers();
      } else {
        setNotice(d.error === "Seat limit reached" ? "Sin licencias libres." : (d.error || "No se pudo añadir."));
      }
    } catch { setNotice("Error de red."); }
    setBusy(false);
  }

  async function resetPassword(m: Member) {
    const np = randomPassword();
    setBusy(true); setNotice(null);
    try {
      const res = await fetch("/api/admin/organizations/members", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: m.user_id, new_password: np }),
      });
      if (res.ok) setNotice(`Nueva contraseña de ${m.user_email}: ${np}`);
      else setNotice("No se pudo reiniciar la contraseña.");
    } catch { setNotice("Error de red."); }
    setBusy(false);
  }

  async function toggleActive(m: Member) {
    setBusy(true); setNotice(null);
    try {
      await fetch("/api/admin/organizations/members", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, is_active: !m.is_active }),
      });
      await loadMembers();
    } catch { /* ignore */ }
    setBusy(false);
  }

  async function deleteMember(m: Member) {
    if (!window.confirm(`¿Eliminar definitivamente la cuenta de ${m.user_name || m.user_email}? Esta acción no se puede deshacer.`)) return;
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/admin/organizations/members?user_id=${m.user_id}`, { method: "DELETE" });
      if (res.ok) { setNotice(`Cuenta eliminada: ${m.user_email}`); await loadMembers(); }
      else setNotice("No se pudo eliminar la cuenta.");
    } catch { setNotice("Error de red."); }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
        <ChevronLeft className="h-3.5 w-3.5" /> Todos los hospitales
      </button>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" /> {hospital.name}
        </h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
          <button onClick={() => setSubView("team")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${subView === "team" ? "bg-white dark:bg-gray-900 shadow-sm" : "text-gray-500"}`}>
            <Users className="h-3.5 w-3.5" /> Equipo
          </button>
          <button onClick={() => setSubView("metrics")} className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 ${subView === "metrics" ? "bg-white dark:bg-gray-900 shadow-sm" : "text-gray-500"}`}>
            <BarChart3 className="h-3.5 w-3.5" /> Métricas y trazabilidad
          </button>
        </div>
      </div>

      {notice && (
        <div className="text-xs bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span className="font-mono">{notice}</span>
          <CopyButton text={notice} small />
        </div>
      )}

      {subView === "metrics" ? (
        <AdminPilotTab fixedOrgId={hospital.id} />
      ) : (
        <>
          {/* Send invitations — one box per email */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Enviar invitación por correo</p>
              <p className="text-[11px] text-gray-500">Se envía desde info@radiogen.ai con el aviso legal incluido. Un correo por casilla; pulsa el botón de enviar de cada uno.</p>

              <div className="space-y-2">
                {rows.map((row, i) => {
                  const valid = /^\S+@\S+\.\S+$/.test(row.email.trim());
                  const sent = row.status === "sent";
                  const failed = row.status === "failed";
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        type="email"
                        value={row.email}
                        onChange={(e) => setRowEmail(i, e.target.value)}
                        placeholder="radiologo@hospital.com"
                        className={`h-9 text-xs flex-1 ${sent ? "border-green-400 dark:border-green-700" : failed ? "border-red-400 dark:border-red-700" : ""}`}
                      />
                      <Button
                        size="icon"
                        variant={sent ? "default" : "outline"}
                        onClick={() => sendOne(i)}
                        disabled={!valid || row.status === "sending"}
                        title={sent ? "Enviado — reenviar" : "Enviar invitación"}
                        className={`h-9 w-9 flex-shrink-0 ${sent ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : failed ? "border-red-400 text-red-500" : ""}`}
                      >
                        {row.status === "sending" ? <Loader2 className="h-4 w-4 animate-spin" />
                          : sent ? <Check className="h-4 w-4" />
                          : <Send className="h-4 w-4" />}
                      </Button>
                      {rows.length > 1 && (
                        <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0" title="Quitar">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <button type="button" onClick={addRow} className="flex items-center gap-1 text-[11px] text-brand hover:underline">
                  <Plus className="h-3 w-3" /> Añadir otro correo
                </button>
                <span className="text-[10px] text-gray-400">{rows.filter((r) => r.status === "sent").length} enviado(s)</span>
              </div>
            </CardContent>
          </Card>

          {/* Invite link + copyable email */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" /> Enlace de invitación (por si lo envías tú mismo)</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={inviteLink} className="h-8 text-[11px] font-mono flex-1" />
                <CopyButton text={inviteLink} small />
              </div>
              <p className="text-[11px] text-gray-500 flex items-center gap-1.5"><Mail className="h-3 w-3" /> Texto del correo (copiable):</p>
              <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-2.5 max-h-48 overflow-y-auto">
                <pre className="text-[10.5px] text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-sans leading-relaxed">{inviteEmail}</pre>
              </div>
              <div className="flex justify-end"><CopyButton text={inviteEmail} small /></div>
            </CardContent>
          </Card>

          {/* Team */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Radiólogos ({members.filter((m) => m.is_active).length}/{hospital.max_seats})</p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => { setAPass(randomPassword()); setAddOpen(true); }}>
              <UserPlus className="h-3.5 w-3.5" /> Añadir manualmente
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>
          ) : members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aún no hay radiólogos. Envíales el enlace de arriba o añádelos manualmente.</p>
          ) : (
            <div className="grid gap-2">
              {members.map((m) => (
                <Card key={m.id} className={m.is_active ? "" : "opacity-60"}>
                  <CardContent className="p-3 flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{m.user_name || "—"}</p>
                      <p className="text-[11px] text-gray-500">{m.user_email}</p>
                      {m.subspecialties?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {m.subspecialties.map((s) => <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300">{s}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1" title="Informes este mes"><FileText className="h-3 w-3" /> {m.reports_this_month}</span>
                      <span className="flex items-center gap-1" title="Minutos de dictado"><Mic className="h-3 w-3" /> {m.dictation_minutes}m</span>
                      {m.avg_reports_month != null && <span className="text-gray-400" title="Informes/mes declarados">~{m.avg_reports_month}/mes</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-brand" title="Reiniciar contraseña" onClick={() => resetPassword(m)} disabled={busy}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      {m.is_active ? (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-500" title="Quitar acceso (reversible)" onClick={() => toggleActive(m)} disabled={busy}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-green-600" title="Reactivar acceso" onClick={() => toggleActive(m)} disabled={busy}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" title="Eliminar definitivamente" onClick={() => deleteMember(m)} disabled={busy}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Añadir radiólogo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Nombre y apellidos" className="h-9" />
            <Input value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="correo@hospital.com" className="h-9" type="email" />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Contraseña temporal (comunícala al radiólogo)</label>
              <Input value={aPass} onChange={(e) => setAPass(e.target.value)} className="h-9 font-mono" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={addMember} disabled={busy || !aName.trim() || !aEmail.trim() || aPass.length < 6}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Añadir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
