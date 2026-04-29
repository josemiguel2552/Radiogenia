"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Plus, Pencil, Trash2, Users, Building2, ChevronRight,
} from "lucide-react";
import type { Organization } from "@/lib/types";

interface OrgWithMembers extends Organization {
  active_members: number;
}

export function AdminOrganizationsTab() {
  const [orgs, setOrgs] = useState<OrgWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgWithMembers | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formSeats, setFormSeats] = useState(50);
  const [saving, setSaving] = useState(false);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organizations");
      if (res.ok) setOrgs(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  function openCreate() {
    setEditingOrg(null);
    setFormName("");
    setFormSlug("");
    setFormEmail("");
    setFormSeats(50);
    setShowForm(true);
  }

  function openEdit(org: OrgWithMembers) {
    setEditingOrg(org);
    setFormName(org.name);
    setFormSlug(org.slug);
    setFormEmail(org.billing_email || "");
    setFormSeats(org.max_seats);
    setShowForm(true);
  }

  async function handleSave() {
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
    setShowForm(false);
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

  async function handleDelete(org: OrgWithMembers) {
    if (!confirm(`Delete "${org.name}"? This will remove all sections, members, and shared resources.`)) return;
    await fetch(`/api/admin/organizations?id=${org.id}`, { method: "DELETE" });
    await loadOrgs();
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Organizations</h2>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New Organization
        </Button>
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No organizations yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orgs.map((org) => (
            <Card key={org.id} className={!org.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.name}</h3>
                      {!org.is_active && <Badge variant="secondary" className="text-[9px]">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-gray-500">{org.slug}</span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {org.active_members}/{org.max_seats} seats
                      </span>
                      {org.billing_email && (
                        <span className="text-[11px] text-gray-400 truncate">{org.billing_email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={org.is_active}
                      onCheckedChange={() => handleToggleActive(org)}
                      className="scale-75"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(org)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(org)}>
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
            <strong>Pricing:</strong> $20/radiologist/month. No report or dictation limits for org members.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Monthly revenue: ${orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members * 20 : 0), 0)}/mo
            ({orgs.reduce((sum, o) => sum + (o.is_active ? o.active_members : 0), 0)} active radiologists)
          </p>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Edit Organization" : "New Organization"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={formName} onChange={(e) => { setFormName(e.target.value); if (!editingOrg) setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Hospital Universitario La Paz" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug (URL identifier)</Label>
              <Input value={formSlug} onChange={(e) => setFormSlug(e.target.value)} placeholder="hospital-la-paz" className="h-9 font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Billing email</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="billing@hospital.com" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max seats</Label>
              <Input type="number" value={formSeats} onChange={(e) => setFormSeats(Number(e.target.value))} min={1} className="h-9 w-24" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving || !formName.trim() || !formSlug.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingOrg ? "Save" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
