"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Copy, Trash2, Loader2, Upload, Check, X, FileText, ChevronDown, ChevronRight } from "lucide-react";
import type { UserTemplate } from "@/lib/types";
import { MODALITIES, SECTIONS } from "@/lib/types";

interface ExtractedTemplate {
  title: string;
  technique: string;
  section: string;
  template: string;
}

export function TemplatesTab() {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editTemplate, setEditTemplate] = useState<UserTemplate | null>(null);
  const [editName, setEditName] = useState("");
  const [editModality, setEditModality] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editStructure, setEditStructure] = useState("");
  const [saving, setSaving] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Word upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedTemplates, setExtractedTemplates] = useState<ExtractedTemplate[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.modality.toLowerCase().includes(search.toLowerCase()) ||
    (t.structure?.section || "").toLowerCase().includes(search.toLowerCase())
  );

  // Group templates by anatomical section
  const grouped = filtered.reduce<Record<string, UserTemplate[]>>((acc, t) => {
    const section = t.structure?.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(t);
    return acc;
  }, {});

  // Sort sections by SECTIONS order
  const sectionOrder = [...SECTIONS.map(String), "Other"];
  const sortedSections = Object.keys(grouped).sort((a, b) => {
    const ia = sectionOrder.indexOf(a);
    const ib = sectionOrder.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  function toggleSection(section: string) {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function openEdit(t: UserTemplate) {
    setEditTemplate(t);
    setEditName(t.name);
    setEditModality(t.modality);
    setEditSection(t.structure?.section || "");
    setEditStructure(t.structure?.template || "");
  }

  async function handleSave() {
    if (!editTemplate) return;
    setSaving(true);
    const updatedStructure = { ...editTemplate.structure, template: editStructure, title: editName, technique: editModality, section: editSection };
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
      body: JSON.stringify({ name: t.name + " (copy)", modality: t.modality, base_template_id: t.base_template_id, structure: t.structure }),
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

  // Word upload handler
  async function handleWordUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setExtractedTemplates([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload/templates", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setExtractedTemplates(data.templates || []);
      } else {
        const data = await res.json();
        alert("Error: " + (data.error || "Upload failed"));
      }
    } catch (err) {
      alert("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function approveExtracted(idx: number) {
    const t = extractedTemplates[idx];
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: t.title,
        modality: t.technique,
        structure: { id: -1, title: t.title, template: t.template, technique: t.technique, section: t.section },
      }),
    });
    setExtractedTemplates((prev) => prev.filter((_, i) => i !== idx));
    load();
  }

  function approveAllExtracted() {
    extractedTemplates.forEach((_, idx) => approveExtracted(idx));
  }

  function rejectExtracted(idx: number) {
    setExtractedTemplates((prev) => prev.filter((_, i) => i !== idx));
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

      {/* Word Upload Zone */}
      <input type="file" accept=".docx,.doc" ref={fileRef} onChange={handleWordUpload} className="hidden" />
      <div
        className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 transition-colors dark:border-gray-600"
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <p className="text-xs text-gray-500">AI is extracting templates...</p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-4 w-4 text-gray-400" />
            <p className="text-xs text-gray-500">Upload Word doc with templates</p>
          </div>
        )}
      </div>

      {/* Extracted templates for review */}
      {extractedTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">{extractedTemplates.length} extracted:</p>
            <Button size="sm" variant="outline" className="h-6 text-xs" onClick={approveAllExtracted}>
              <Check className="h-3 w-3" /> Approve all
            </Button>
          </div>
          {extractedTemplates.map((t, i) => (
            <div key={i} className="p-2.5 border rounded-lg text-xs bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <p className="font-medium text-gray-900 dark:text-white">{t.title}</p>
              <div className="flex gap-1 mt-1 mb-1">
                <Badge variant="secondary" className="text-[10px]">{t.technique}</Badge>
                <Badge variant="outline" className="text-[10px]">{t.section}</Badge>
              </div>
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="outline" className="h-6 text-xs text-green-600" onClick={() => approveExtracted(i)}>
                  <Check className="h-3 w-3" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs text-red-500" onClick={() => rejectExtracted(i)}>
                  <X className="h-3 w-3" /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Template list grouped by section */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center py-6 text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No templates found</p>
          </div>
        )}
        {sortedSections.map((section) => (
          <div key={section}>
            {/* Section header */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center gap-2 py-2 px-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {collapsedSections[section] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {section}
              <Badge variant="secondary" className="text-[10px] ml-auto">{grouped[section].length}</Badge>
            </button>

            {/* Templates in this section */}
            {!collapsedSections[section] && (
              <div className="space-y-1.5 ml-2 mb-2">
                {grouped[section].map((t) => (
                  <div key={t.id} className="p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{t.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className="text-[10px]">{t.modality}</Badge>
                          <Badge variant={t.is_default ? "outline" : "default"} className="text-[10px]">
                            {t.is_default ? "Default" : "Custom"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(t)} title="Edit">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(t)} title="Duplicate">
                          <Copy className="h-3 w-3" />
                        </Button>
                        {!t.is_default && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(t.id)} title="Delete">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
            <div className="grid grid-cols-2 gap-3">
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
                <Label>Anatomical section</Label>
                <Select value={editSection} onValueChange={setEditSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Template structure</Label>
              <Textarea value={editStructure} onChange={(e) => setEditStructure(e.target.value)} className="min-h-[200px] font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
