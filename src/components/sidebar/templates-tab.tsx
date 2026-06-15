"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ArrowLeft,
  Search,
  Sparkles,
  Building2,
  EyeOff,
  Eye,
} from "lucide-react";
import type { UserTemplate } from "@/lib/types";
import { MODALITIES, SECTIONS } from "@/lib/types";
import { useT, useSection, useTemplateName, useModality } from "@/lib/i18n";
import { SectionEditor, parseTemplateSections, serializeTemplateSections, nextFieldId } from "@/components/shared/template-section-editor";
import type { TemplateField } from "@/components/shared/template-section-editor";
import { TemplateBot } from "./template-bot";

interface ExtractedTemplate {
  title: string;
  technique: string;
  section: string;
  template: string;
}

interface CatalogItem {
  id: string;
  name: string;
  modality: string;
  section_id: string;
  section_name: string;
  imported: boolean;
}

const MODALITY_CARDS: Record<string, { gradient: string; abbrev: string }> = {
  CT: { gradient: "linear-gradient(135deg, #3B82F6, #1D4ED8)", abbrev: "CT" },
  MRI: { gradient: "linear-gradient(135deg, #8B5CF6, #6D28D9)", abbrev: "RM" },
  Ultrasound: { gradient: "linear-gradient(135deg, #14B8A6, #0F766E)", abbrev: "US" },
  XRay: { gradient: "linear-gradient(135deg, #F59E0B, #B45309)", abbrev: "RX" },
  Mammography: { gradient: "linear-gradient(135deg, #EC4899, #BE185D)", abbrev: "MG" },
  RECIST: { gradient: "linear-gradient(135deg, #10B981, #047857)", abbrev: "RC" },
  Procedures: { gradient: "linear-gradient(135deg, #6366F1, #4338CA)", abbrev: "PR" },
};

const SECTION_COLORS: Record<string, string> = {
  "Head and neck": "linear-gradient(135deg, #F43F5E, #BE123C)",
  Thorax: "linear-gradient(135deg, #EF4444, #B91C1C)",
  "Abdomen and pelvis": "linear-gradient(135deg, #F97316, #C2410C)",
  Spine: "linear-gradient(135deg, #84CC16, #4D7C0F)",
  "Upper limbs": "linear-gradient(135deg, #06B6D4, #0E7490)",
  "Lower limbs": "linear-gradient(135deg, #A855F7, #7E22CE)",
  _general: "linear-gradient(135deg, #6B7280, #4B5563)",
};

export function TemplatesTab() {
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [navLevel, setNavLevel] = useState<"modalities" | "sections" | "list">("modalities");
  const [navModality, setNavModality] = useState("");
  const [navSection, setNavSection] = useState("");
  const [editTemplate, setEditTemplate] = useState<UserTemplate | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [editName, setEditName] = useState("");
  const [editModality, setEditModality] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editFields, setEditFields] = useState<TemplateField[]>([]);
  const [saving, setSaving] = useState(false);
  const t = useT();
  const sec = useSection();
  const tplName = useTemplateName();
  const modName = useModality();

  // Word upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [extractedTemplates, setExtractedTemplates] = useState<ExtractedTemplate[]>([]);
  const [reviewOpen, setReviewOpen] = useState(true);

  // Org template catalog (only for hospital members)
  const [hasOrg, setHasOrg] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [tplSubTab, setTplSubTab] = useState<"all" | "hospital">("all");
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  // Hidden global templates
  const [hiddenTemplates, setHiddenTemplates] = useState<{ id: string; name: string; modality: string }[]>([]);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [justHiddenMsg, setJustHiddenMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    setLoading(false);
  }

  async function loadHidden() {
    try {
      const res = await fetch("/api/templates/hidden");
      if (res.ok) setHiddenTemplates(await res.json());
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    loadHidden();
    fetch("/api/org", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setHasOrg(!!data?.membership))
      .catch(() => {});

    const handleTemplatesChanged = () => {
      load();
      loadHidden();
    };
    window.addEventListener("radiogenai:templates-changed", handleTemplatesChanged);
    return () => window.removeEventListener("radiogenai:templates-changed", handleTemplatesChanged);
  }, []);

  // Search-filtered templates (flat list when searching)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return templates.filter((tmpl) =>
      tmpl.name.toLowerCase().includes(q) ||
      tplName(tmpl.name).toLowerCase().includes(q) ||
      tmpl.modality.toLowerCase().includes(q) ||
      modName(tmpl.modality).toLowerCase().includes(q) ||
      (tmpl.structure?.section || "").toLowerCase().includes(q) ||
      sec(tmpl.structure?.section || "").toLowerCase().includes(q)
    );
  }, [templates, search, tplName, modName, sec]);

  // Modality counts for Level 1
  const modalityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tmpl of templates) {
      counts.set(tmpl.modality, (counts.get(tmpl.modality) || 0) + 1);
    }
    return counts;
  }, [templates]);

  // Section counts for Level 2 (filtered by selected modality)
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tmpl of templates) {
      if (tmpl.modality !== navModality) continue;
      const s = tmpl.structure?.section || "_general";
      counts.set(s, (counts.get(s) || 0) + 1);
    }
    return counts;
  }, [templates, navModality]);

  // Templates for Level 3 (filtered by modality + section)
  const drillFiltered = useMemo(() => {
    return templates.filter((tmpl) => {
      if (tmpl.modality !== navModality) return false;
      const s = tmpl.structure?.section || "_general";
      if (s !== navSection) return false;
      return true;
    });
  }, [templates, navModality, navSection]);

  // Ordered sections for level 2
  const orderedSections = useMemo(() => {
    const order = [...SECTIONS.map(String), "_general"];
    return [...sectionCounts.keys()].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [sectionCounts]);

  function openEdit(t: UserTemplate) {
    setCreatingNew(false);
    setEditTemplate(t);
    setEditName(t.name);
    setEditModality(t.modality);
    setEditSection(t.structure?.section || "");
    setEditFields(parseTemplateSections(t.structure?.template || ""));
  }

  async function handleSave() {
    if (!editTemplate) return;
    setSaving(true);
    const templateText = serializeTemplateSections(editFields);
    const updatedStructure = { ...editTemplate.structure, template: templateText, title: editName, technique: editModality, section: editSection };
    if (creatingNew) {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, modality: editModality, structure: updatedStructure }),
      });
    } else {
      await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTemplate.id, name: editName, modality: editModality, structure: updatedStructure }),
      });
    }
    setEditTemplate(null);
    setCreatingNew(false);
    setSaving(false);
    load();
  }

  async function handleDuplicate(tmpl: UserTemplate) {
    const displayName = tplName(tmpl.name);
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: displayName + " (copy)", modality: tmpl.modality, base_template_id: tmpl.base_template_id, structure: tmpl.structure }),
    });
    load();
  }

  async function handleDelete(id: string, isGlobal?: boolean) {
    if (!confirm(isGlobal ? t("tpl.confirm_hide") : t("confirm_delete_template"))) return;
    const qs = isGlobal ? `id=${id}&global=true` : `id=${id}`;
    await fetch(`/api/templates?${qs}`, { method: "DELETE" });
    if (isGlobal) {
      setJustHiddenMsg(t("tpl.hidden_success"));
      setTimeout(() => setJustHiddenMsg(null), 2500);
    }
    load();
    if (isGlobal) loadHidden();
    window.dispatchEvent(new CustomEvent("radiogenai:templates-changed"));
  }

  function handleCreateNew() {
    setCreatingNew(true);
    setEditTemplate({ id: "__new__", name: "", modality: "", structure: { id: -1, title: "", template: "", technique: "", section: "" } } as UserTemplate);
    setEditName("");
    setEditModality("");
    setEditSection("");
    setEditFields([{ id: nextFieldId(), label: "", indent: 0 }]);
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
        alert(t("tpl.upload_error") + ": " + (data.error || ""));
      }
    } catch (err) {
      alert(t("tpl.upload_error") + ": " + (err instanceof Error ? err.message : ""));
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

  async function handleRestore(id: string) {
    setRestoring(id);
    try {
      await fetch(`/api/templates/hidden?id=${id}`, { method: "DELETE" });
      setHiddenTemplates((prev) => prev.filter((h) => h.id !== id));
      load();
    } catch { /* ignore */ }
    setRestoring(null);
    window.dispatchEvent(new CustomEvent("radiogenai:templates-changed"));
  }

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogSearch("");
    try {
      const res = await fetch("/api/templates/catalog");
      if (res.ok) {
        setCatalog(await res.json());
        setCatalogLoaded(true);
      }
    } catch { /* ignore */ }
    setCatalogLoading(false);
  }

  async function openCatalog() {
    setCatalogOpen(true);
    await loadCatalog();
  }

  function switchToHospitalTab() {
    setTplSubTab("hospital");
    if (!catalogLoaded) loadCatalog();
  }

  async function toggleImport(item: CatalogItem) {
    setToggling((prev) => new Set(prev).add(item.id));
    try {
      if (item.imported) {
        await fetch(`/api/templates/imports?org_template_id=${item.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/templates/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_template_id: item.id }),
        });
      }
      setCatalog((prev) =>
        prev.map((c) => c.id === item.id ? { ...c, imported: !c.imported } : c),
      );
    } catch { /* ignore */ }
    setToggling((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
  }

  // Render a single template card (reused in search results and drill-down list)
  function renderTemplateCard(tpl: UserTemplate) {
    return (
      <div
        key={tpl.id}
        className="group flex items-center gap-2 p-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900/50 hover:border-brand-soft hover:shadow-sm transition-all"
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
            {tplName(tpl.name)}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{modName(tpl.modality)}</Badge>
            <Badge variant="outline" className="text-[9px] h-4 px-1.5">{sec(tpl.structure?.section || "")}</Badge>
            {tpl.is_org && (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400">
                {tpl.section_name || "Hospital"}
              </Badge>
            )}
            {!tpl.is_global && !tpl.is_org && (
              <Badge className="text-[9px] h-4 px-1.5 bg-brand">{t("custom")}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          {!tpl.is_global && !tpl.is_org && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(tpl)} title={t("edit")}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDuplicate(tpl)} title={tpl.is_global ? t("tpl.customize") : t("duplicate")}>
            <Copy className="h-3 w-3" />
          </Button>
          {tpl.is_global ? (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-orange-500" onClick={() => handleDelete(tpl.id, true)} title={t("tpl.hide")}>
              <EyeOff className="h-3 w-3" />
            </Button>
          ) : !tpl.is_default && !tpl.is_org && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDelete(tpl.id)} title={t("delete")}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t("tpl.title")}</h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {templates.length} {templates.length === 1 ? t("tpl.template") : t("tpl.templates")}
          </p>
        </div>
        <TemplateBot templates={templates} />
      </div>

      {/* Sub-tabs: All / Hospital */}
      {hasOrg && (
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            type="button"
            onClick={() => setTplSubTab("all")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tplSubTab === "all"
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {t("tpl.tab_all")}
          </button>
          <button
            type="button"
            onClick={switchToHospitalTab}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tplSubTab === "hospital"
                ? "bg-white dark:bg-gray-900 text-violet-700 dark:text-violet-400 shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            {t("tpl.tab_hospital")}
          </button>
        </div>
      )}

      {/* Search + actions */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={t("tpl.search")}
            value={tplSubTab === "all" ? search : catalogSearch}
            onChange={(e) => tplSubTab === "all" ? setSearch(e.target.value) : setCatalogSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            autoComplete="new-password"
            name="rg_tplsearch_x"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore
          />
          {search && tplSubTab === "all" && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {tplSubTab === "all" && (
          <>
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
          </>
        )}
      </div>

      <input
        type="file"
        accept=".docx,.doc,.pdf"
        ref={fileRef}
        onChange={handleWordUpload}
        className="hidden"
      />

      {justHiddenMsg && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs">
          <Check className="h-3.5 w-3.5 shrink-0" />
          {justHiddenMsg}
        </div>
      )}

      {/* ═══ HOSPITAL SECTION TEMPLATES TAB ═══ */}
      {tplSubTab === "hospital" && (
        <div className="space-y-3">
          {catalogLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            </div>
          ) : catalog.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("tpl.no_hospital_templates")}</p>
              <p className="text-[11px] text-gray-400 mt-1">{t("tpl.no_hospital_templates_hint")}</p>
            </div>
          ) : (() => {
            const q = catalogSearch.toLowerCase();
            const filteredCat = catalog.filter((c) =>
              c.name.toLowerCase().includes(q) ||
              tplName(c.name).toLowerCase().includes(q) ||
              c.modality.toLowerCase().includes(q) ||
              modName(c.modality).toLowerCase().includes(q) ||
              c.section_name.toLowerCase().includes(q)
            );
            const groupedCat = new Map<string, CatalogItem[]>();
            filteredCat.forEach((c) => {
              const key = c.section_name || "Hospital";
              if (!groupedCat.has(key)) groupedCat.set(key, []);
              groupedCat.get(key)!.push(c);
            });
            const importedCount = catalog.filter((c) => c.imported).length;

            return (
              <>
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="secondary" className="text-[10px]">
                    {importedCount} {t("tpl.imported_count")}
                  </Badge>
                  <span className="text-[10px] text-gray-400">
                    {t("tpl.of_available").replace("{n}", String(catalog.length))}
                  </span>
                </div>

                {filteredCat.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-6">{t("no_match_search")}</p>
                )}

                {Array.from(groupedCat.entries()).map(([secName, items]) => (
                  <div key={secName} className="space-y-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                        {secName}
                      </span>
                      <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900" />
                    </div>

                    <div className="space-y-1">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-all ${
                            item.imported
                              ? "border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10"
                              : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {tplName(item.name)}
                            </p>
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-0.5">
                              {modName(item.modality)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={item.imported ? "default" : "outline"}
                            className={`h-7 px-3 text-[11px] shrink-0 ${
                              item.imported
                                ? "bg-violet-600 hover:bg-violet-700 text-white"
                                : "text-violet-600 border-violet-300 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20"
                            }`}
                            disabled={toggling.has(item.id)}
                            onClick={() => toggleImport(item)}
                          >
                            {toggling.has(item.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : item.imported ? (
                              <><Check className="h-3 w-3 mr-1" /> {t("tpl.imported")}</>
                            ) : (
                              <><Plus className="h-3 w-3 mr-1" /> {t("tpl.import")}</>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      )}

      {/* ═══ ALL TEMPLATES TAB — Drill-down navigation ═══ */}
      {tplSubTab === "all" && <>

      {/* Upload status */}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-soft text-brand">
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
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{tplName(ext.title)}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{modName(ext.technique)}</Badge>
                    <Badge variant="outline" className="text-[10px]">{sec(ext.section)}</Badge>
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

      {/* ── Search results (flat list) ── */}
      {search.trim() ? (
        <div className="space-y-1">
          {searchFiltered.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("tpl.no_match")}</p>
              <p className="text-[11px] text-gray-400 mt-1">{t("tpl.try_different")}</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-gray-400 mb-1">{searchFiltered.length} {t("tpl.templates")}</p>
              {searchFiltered.map((tpl) => renderTemplateCard(tpl))}
            </>
          )}
        </div>

      /* ── Level 1: Modality cards ── */
      ) : navLevel === "modalities" ? (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("tpl.choose_modality")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MODALITIES.filter((mod) => (modalityCounts.get(mod) || 0) > 0).map((mod) => {
              const count = modalityCounts.get(mod) || 0;
              const card = MODALITY_CARDS[mod];
              return (
                <button
                  key={mod}
                  type="button"
                  className="group flex flex-col rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80 overflow-hidden hover:shadow-xl hover:scale-[1.03] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
                  onClick={() => { setNavModality(mod); setNavLevel("sections"); setSearch(""); }}
                >
                  <div className="h-1.5 w-full" style={{ background: card?.gradient || "linear-gradient(135deg, #6B7280, #4B5563)" }} />
                  <div className="flex flex-col items-center gap-1.5 p-4">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white text-center leading-tight">{modName(mod)}</p>
                    <p className="text-[10px] text-gray-400">
                      {count} {count === 1 ? t("tpl.template") : t("tpl.templates")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Also show modalities with 0 templates if total is 0 */}
          {templates.length === 0 && (
            <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("tpl.no_templates")}</p>
              <p className="text-[11px] text-gray-400 mt-1">{t("tpl.create_or_upload")}</p>
            </div>
          )}
        </div>

      /* ── Level 2: Section cards (for selected modality) ── */
      ) : navLevel === "sections" ? (
        <div className="space-y-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => { setNavLevel("modalities"); setNavModality(""); }}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{modName(navModality)}</span>
          </button>

          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("tpl.choose_section")}
          </p>

          <div className="grid grid-cols-1 gap-2">
            {orderedSections.map((section) => {
              const count = sectionCounts.get(section) || 0;
              const gradient = SECTION_COLORS[section] || SECTION_COLORS._general;
              const label = section === "_general" ? t("tpl.general") : sec(section);
              return (
                <button
                  key={section}
                  type="button"
                  className="group flex items-center gap-3 w-full p-3.5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80 overflow-hidden hover:shadow-xl hover:scale-[1.01] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 text-left"
                  onClick={() => { setNavSection(section); setNavLevel("list"); }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 group-hover:shadow-lg group-hover:scale-105 transition-all"
                    style={{ background: gradient }}
                  >
                    {label.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {count} {count === 1 ? t("tpl.template") : t("tpl.templates")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-200 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

      /* ── Level 3: Template list (for selected modality + section) ── */
      ) : (
        <div className="space-y-2">
          {/* Breadcrumb back */}
          <button
            type="button"
            onClick={() => { setNavLevel("sections"); setNavSection(""); }}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{modName(navModality)}</span>
            <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
            <span>{navSection === "_general" ? t("tpl.general") : sec(navSection)}</span>
          </button>

          <p className="text-[10px] text-gray-400">
            {drillFiltered.length} {drillFiltered.length === 1 ? t("tpl.template") : t("tpl.templates")}
          </p>

          {drillFiltered.length === 0 ? (
            <div className="text-center py-10 px-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-800">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t("tpl.no_match")}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {drillFiltered.map((tpl) => renderTemplateCard(tpl))}
            </div>
          )}
        </div>
      )}

      {/* Hidden globals — restore section */}
      {hiddenTemplates.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setHiddenOpen(!hiddenOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <EyeOff className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {hiddenTemplates.length} {t("tpl.hidden_templates")}
              </span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${hiddenOpen ? "" : "-rotate-90"}`} />
          </button>
          {hiddenOpen && (
            <div className="px-3 pb-3 space-y-1">
              {hiddenTemplates.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-600 dark:text-gray-300 truncate">{tplName(h.name)}</p>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-0.5">{modName(h.modality)}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] gap-1 shrink-0"
                    disabled={restoring === h.id}
                    onClick={() => handleRestore(h.id)}
                  >
                    {restoring === h.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    {t("tpl.restore")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </>}

      {/* Edit / Create Dialog */}
      <Dialog open={!!editTemplate} onOpenChange={(open) => { if (!open) { setEditTemplate(null); setCreatingNew(false); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>{creatingNew ? t("tpl.create_blank") : t("tpl.edit_dialog")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("tpl.name")}</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <Label className="text-xs font-semibold">
              {t("tpl.structure")} ({editFields.length})
            </Label>
            <p className="text-[10px] text-gray-400">{t("tpl.structure_hint")}</p>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
            <div className="space-y-1 pr-3 pb-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                <Badge variant="secondary" className="text-[10px]">{t("tpl.findings_header")}</Badge>
              </div>

              <SectionEditor fields={editFields} onChange={setEditFields} />

              <div className="flex items-center gap-2 px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 mt-2">
                <Badge variant="secondary" className="text-[10px]">{t("tpl.conclusion_header")}</Badge>
                <span className="text-[10px] text-gray-400">{t("tpl.auto_generated")}</span>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || (!editName.trim() && !creatingNew) || (creatingNew && (!editName.trim() || !editModality || !editSection))}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : creatingNew ? t("tpl.create_save") : t("tpl.save_changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Dialog — browse & import org templates */}
      <Dialog open={catalogOpen} onOpenChange={(open) => { if (!open) { setCatalogOpen(false); load(); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-600" />
              Plantillas de sección
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder={t("tpl.search")}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoComplete="new-password"
              name="rg_catsearch_x"
              data-form-type="other"
              data-lpignore="true"
              data-1p-ignore
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[60vh]">
            {catalogLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              </div>
            ) : catalog.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                No hay plantillas de sección disponibles
              </div>
            ) : (() => {
              const q = catalogSearch.toLowerCase();
              const filtered = catalog.filter((c) =>
                c.name.toLowerCase().includes(q) ||
                tplName(c.name).toLowerCase().includes(q) ||
                c.modality.toLowerCase().includes(q) ||
                modName(c.modality).toLowerCase().includes(q) ||
                c.section_name.toLowerCase().includes(q)
              );
              const grouped = new Map<string, CatalogItem[]>();
              filtered.forEach((c) => {
                const key = c.section_name || "Hospital";
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(c);
              });
              const importedCount = catalog.filter((c) => c.imported).length;

              return (
                <div className="space-y-3 pr-3 pb-2">
                  <div className="flex items-center gap-2 px-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {importedCount} importada{importedCount !== 1 ? "s" : ""}
                    </Badge>
                    <span className="text-[10px] text-gray-400">
                      de {catalog.length} disponible{catalog.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {filtered.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">Sin resultados</p>
                  )}

                  {Array.from(grouped.entries()).map(([secName, items]) => (
                    <div key={secName}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                          {secName}
                        </span>
                        <div className="h-px flex-1 bg-violet-200 dark:bg-violet-900" />
                      </div>

                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-all ${
                              item.imported
                                ? "border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10"
                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {tplName(item.name)}
                              </p>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 mt-0.5">
                                {modName(item.modality)}
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant={item.imported ? "default" : "outline"}
                              className={`h-7 px-3 text-[11px] shrink-0 ${
                                item.imported
                                  ? "bg-violet-600 hover:bg-violet-700 text-white"
                                  : "text-violet-600 border-violet-300 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-900/20"
                              }`}
                              disabled={toggling.has(item.id)}
                              onClick={() => toggleImport(item)}
                            >
                              {toggling.has(item.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : item.imported ? (
                                <><Check className="h-3 w-3 mr-1" /> Importada</>
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" /> Importar</>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
