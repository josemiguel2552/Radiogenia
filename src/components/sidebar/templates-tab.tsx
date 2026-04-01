"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Copy, Trash2, Loader2 } from "lucide-react";
import type { UserTemplate } from "@/lib/types";
import { MODALITIES } from "@/lib/types";

export function TemplatesTab() {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTemplate, setEditTemplate] = useState<UserTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editModality, setEditModality] = useState("");
  const [editStructure, setEditStructure] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.modality.toLowerCase().includes(search.toLowerCase())
  );

  function openEdit(t: UserTemplate) {
    setEditTemplate(t);
    setEditName(t.name);
    setEditModality(t.modality);
    setEditStructure(t.structure?.template || "");
  }

  async function handleSave() {
    if (!editTemplate) return;
    setSaving(true);

    const updatedStructure = { ...editTemplate.structure, template: editStructure, title: editName, technique: editModality };

    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editTemplate.id, name: editName, modality: editModality, structure: updatedStructure }),
    });

    setEditTemplate(null);
    setSaving(false);
    load();
  }

  async function handleDuplicate(t: UserTemplate) {
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: t.name + " (copy)",
        modality: t.modality,
        base_template_id: t.base_template_id,
        structure: t.structure,
      }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    load();
  }

  async function handleCreateNew() {
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Template",
        modality: "CT",
        structure: { id: -1, title: "New Template", template: "****FINDINGS****\n{findings}\n****CONCLUSION****\n{conclusion}", technique: "CT", section: "Head and neck" },
      }),
    });
    load();
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button size="icon" variant="outline" onClick={handleCreateNew} title="New template">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((t) => (
          <div key={t.id} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-900 dark:text-white">{t.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-xs">{t.modality}</Badge>
                  <Badge variant={t.is_default ? "outline" : "default"} className="text-xs">
                    {t.is_default ? "Original" : "Custom"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)} title="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(t)} title="Duplicate">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {!t.is_default && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(t.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <Label>Modality</Label>
              <Select value={editModality} onValueChange={setEditModality}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODALITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template Structure</Label>
              <Textarea value={editStructure} onChange={(e) => setEditStructure(e.target.value)} className="min-h-[200px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
