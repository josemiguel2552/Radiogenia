"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  Loader2,
  Upload,
  Check,
  X,
  FileText,
  ChevronDown,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import type { UserTemplate } from "@/lib/types";
import { MODALITIES, SECTIONS } from "@/lib/types";
import { useT, useSection } from "@/lib/i18n";

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
  const t = useT();
  const sec = useSection();

  // Word upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedTemplates, setExtractedTemplates] = useState<ExtractedTemplate[]>([]);
  const [reviewOpen, setReviewOpen] = useState(true);

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

  const grouped = filtered.reduce<Record<string, UserTemplate[]>>((acc, t) => {
    const section = t.structure?.section || "Other";
    if (!acc[section]) acc[section] = [];
    acc[section].push(t);
    return acc;
  }, {});

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
    if (!confirm(t("confirm_delete_template"))) return;
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
        structure: { id: -1, title: "New Template", template: "FINDINGS\n{findings}\nCONCLUSION\n{conclusion}", technique: "CT", section: "Head and neck" },
      }),
    });
    load();
  }

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
        setReviewOpen(true);
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

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("tpl.title")}</h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {templates.length} {templates.length === 1 ? t("tpl.template") : t("tpl.templates")} · {t("tpl.grouped_by")}
        </p>
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={t("tpl.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          title={t("tpl.upload_word")}
          className="h-8 w-8 shrink-0"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="default"
          onClick={handleCreateNew}
          title={t("tpl.create_blank")}
          className="h-8 w-8 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <input
        type="file"
        accept=".docx,.doc"
        ref={fileRef}
        onChange={handleWordUpload}
        className="hidden"
      />

      {/* Upload status */}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-soft text-accent">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <p className="text-xs">{t("tpl.extracting")}</p>
        </div>
      )}

      {/* Review queue */}
      {extractedTemplates.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setReviewOpen(!reviewOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-900 dark:text-amber-200">
                {extractedTemplates.length} {t("tpl.extracted_review")}
              </span>
            </div>
            <ChevronDown
              className={`h-3.5 w-3.5 text-amber-700 dark:text-amber-300 transition-transform ${
                reviewOpen ? "" : "-rotate-90"
              }`}
            />
          </button>

          {reviewOpen && (
            <div className="px-3 pb-3 space-y-2">
              <Button
                size="sm"
                variant="outline"
                onClick={approveAllExtracted}
                className="w-full h-7 text-xs gap-1.5 bg-white dark:bg-gray-900"
              >
                <Check className="h-3 w-3 text-green-600" /> {t("approve_all")} {extractedTemplates.length}
              </Button>
              {extractedTemplates.map((ext, i) => (
                <div
                  key={i}
                  className="p-2.5 border border-amber-200/60 dark:border-amber-900/40 rounded-md bg-white dark:bg-gray-900"
                >
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{ext.title}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{ext.technique}</Badge>
                    <Badge variant="outline" className="text-[10px]">{ext.section}</Badge>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] flex-1 gap-1 text-green-600"
                      onClick={() => approveExtracted(i)}
                    >
                      <Check className="h-3 w-3" /> {t("approve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-gray-500 hover:text-red-500"
                      onClick={() => rejectExtracted(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template list */}
      <div className="space-y-1">
        {filtered.length === 0 && (
          <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {search ? t("tpl.no_match") : t("tpl.no_templates")}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {search ? t("tpl.try_different") : t("tpl.create_or_upload")}
            </p>
          </div>
        )}
        {sortedSections.map((section) => {
          const isCollapsed = collapsedSections[section];
          return (
            <div key={section} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(section)}
                className="w-full flex items-center gap-1.5 py-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span className="truncate">{sec(section)}</span>
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-auto">
                  {grouped[section].length}
                </Badge>
              </button>
              {!isCollapsed && (
                <div className="space-y-1 pl-1">
                  {grouped[section].map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group p-2 border border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-900/50 hover:border-accent-soft hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {tpl.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                              {tpl.modality}
                            </Badge>
                            {tpl.is_global ? (
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                                {t("global")}
                              </Badge>
                            ) : (
                              <Badge className="text-[9px] h-4 px-1.5 bg-accent">{t("custom")}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!tpl.is_global && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => openEdit(tpl)}
                              title={t("edit")}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleDuplicate(tpl)}
                            title={tpl.is_global ? t("tpl.customize") : t("duplicate")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {!tpl.is_global && !tpl.is_default && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(tpl.id)}
                              title={t("delete")}
                            >
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
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) setEditTemplate(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("tpl.edit_dialog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">{t("tpl.name")}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("tpl.modality")}</Label>
                <Select value={editModality} onValueChange={setEditModality}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MODALITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("tpl.anatomical_region")}</Label>
                <Select value={editSection} onValueChange={setEditSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("tpl.structure")}</Label>
              <Textarea
                value={editStructure}
                onChange={(e) => setEditStructure(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                {t("tpl.structure_hint")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("tpl.save_changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
