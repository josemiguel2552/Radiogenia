"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  Check,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Undo2,
  Eye,
  Download,
  Loader2,
  Settings,
} from "lucide-react";
import { useT, useSection, useModality } from "@/lib/i18n";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import { MODALITIES, SECTIONS } from "@/lib/types";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";

interface RecCatalogItem {
  id: string;
  category: string;
  modality: string;
  title: string;
  text: string;
  tags: string[];
  source: string;
  section_id: string;
  section_name: string;
  imported: boolean;
}

const CUSTOM_KEY = "radiogenai_rec_custom";
const HIDDEN_KEY = "radiogenai_rec_hidden";

function loadCustomLocal(): ManualRecommendation[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch { return []; }
}
function saveCustomLocal(recs: ManualRecommendation[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(recs));
}
function loadHiddenLocal(): string[] {
  try { return JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"); } catch { return []; }
}
function saveHiddenLocal(ids: string[]) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(ids));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

export function RecommendationsTab() {
  const t = useT();
  const tSection = useSection();
  const tModality = useModality();
  const [customRecs, setCustomRecs] = useState<ManualRecommendation[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterMod, setFilterMod] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<ManualRecommendation | null>(null);
  const [editingIsSystem, setEditingIsSystem] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ManualRecommendation | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHidden, setShowHidden] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formCategory, setFormCategory] = useState("all");
  const [formModality, setFormModality] = useState("all");
  const [formSource, setFormSource] = useState("");

  const [hasOrg, setHasOrg] = useState(false);
  const [canManageOrg, setCanManageOrg] = useState(false);
  const [orgSections, setOrgSections] = useState<{ id: string; name: string }[]>([]);
  const [orgMembership, setOrgMembership] = useState<{ section_id: string | null; is_org_chief: boolean } | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<RecCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const [orgManageOpen, setOrgManageOpen] = useState(false);
  const [orgRecs, setOrgRecs] = useState<{ id: string; section_id: string; section_name: string; category: string; modality: string; title: string; text: string; tags: string[]; source: string }[]>([]);
  const [orgRecsLoading, setOrgRecsLoading] = useState(false);
  const [orgEditOpen, setOrgEditOpen] = useState(false);
  const [orgEditId, setOrgEditId] = useState<string | null>(null);
  const [orgFormTitle, setOrgFormTitle] = useState("");
  const [orgFormText, setOrgFormText] = useState("");
  const [orgFormCategory, setOrgFormCategory] = useState("all");
  const [orgFormModality, setOrgFormModality] = useState("all");
  const [orgFormSource, setOrgFormSource] = useState("");
  const [orgFormSectionId, setOrgFormSectionId] = useState("");
  const [orgDeleteConfirm, setOrgDeleteConfirm] = useState<string | null>(null);
  const [orgSaving, setOrgSaving] = useState(false);

  const lang: OutputLanguage = (typeof window !== "undefined" && (localStorage.getItem("radiogenai_lang") as OutputLanguage)) || "es";

  useEffect(() => {
    setCustomRecs(loadCustomLocal());
    setHiddenIds(loadHiddenLocal());
    fetch("/api/recommendations/custom")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.recommendations) {
          setCustomRecs(data.recommendations);
          saveCustomLocal(data.recommendations);
        }
      })
      .catch(() => {});
    fetch("/api/org", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const m = data?.membership;
        setHasOrg(!!m);
        if (m) {
          setOrgMembership({ section_id: m.section_id, is_org_chief: m.is_org_chief });
          const canManage = m.is_org_chief || m.section_role === "section_chief" || m.section_role === "section_editor";
          setCanManageOrg(canManage);
          if (data.sections) setOrgSections(data.sections.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
        }
      })
      .catch(() => {});
  }, []);

  const overrideMap = useMemo(() => {
    const map = new Map<string, ManualRecommendation>();
    for (const r of customRecs) {
      if (r.overrides) map.set(r.overrides, r);
    }
    return map;
  }, [customRecs]);

  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const visibleRecs = useMemo(() => {
    const result: ManualRecommendation[] = [];
    for (const sys of DEFAULT_RECOMMENDATIONS) {
      if (hiddenSet.has(sys.id)) continue;
      const override = overrideMap.get(sys.id);
      result.push(override || sys);
    }
    for (const r of customRecs) {
      if (!r.overrides) result.push(r);
    }
    return result;
  }, [customRecs, overrideMap, hiddenSet]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return visibleRecs.filter((r) => {
      if (filterMod !== "all" && r.modality !== "all" && r.modality !== filterMod) return false;
      if (filterCat !== "all" && r.category !== "all" && r.category !== filterCat) return false;
      if (filterScope !== "all" && r.scope !== filterScope) return false;
      if (searchLower) {
        const title = (r.title[lang] || r.title.es || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const text = (r.text[lang] || r.text.es || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        const tags = r.tags.join(" ").toLowerCase();
        if (!title.includes(searchLower) && !text.includes(searchLower) && !tags.includes(searchLower)) return false;
      }
      return true;
    });
  }, [visibleRecs, filterMod, filterCat, filterScope, search, lang]);

  const grouped = useMemo(() => {
    const map = new Map<string, ManualRecommendation[]>();
    for (const r of filtered) {
      const cat = r.category || "all";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return map;
  }, [filtered]);

  const hiddenRecs = useMemo(() => {
    return DEFAULT_RECOMMENDATIONS.filter((r) => hiddenSet.has(r.id));
  }, [hiddenSet]);

  const toggleCat = useCallback((cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  useEffect(() => {
    setExpandedCats(new Set(grouped.keys()));
  }, [grouped]);

  const openAdd = useCallback(() => {
    setEditingRec(null);
    setEditingIsSystem(false);
    setFormTitle("");
    setFormText("");
    setFormCategory("all");
    setFormModality("all");
    setFormSource(t("mrec.custom_source"));
    setDialogOpen(true);
  }, [t]);

  const openEdit = useCallback((rec: ManualRecommendation) => {
    const isSystem = rec.scope === "system";
    setEditingRec(rec);
    setEditingIsSystem(isSystem);
    setFormTitle(rec.title[lang] || rec.title.es || "");
    setFormText(rec.text[lang] || rec.text.es || "");
    setFormCategory(rec.category);
    setFormModality(rec.modality);
    setFormSource(rec.source);
    setDialogOpen(true);
  }, [lang]);

  const handleSave = useCallback(() => {
    if (!formTitle.trim() || !formText.trim()) return;

    if (editingRec && editingIsSystem) {
      const existingOverride = customRecs.find((r) => r.overrides === editingRec.id);
      const overrideRec: ManualRecommendation = {
        id: existingOverride?.id || `override_${editingRec.id}_${Date.now()}`,
        category: formCategory,
        modality: formModality,
        title: { es: formTitle, en: formTitle, pt: formTitle },
        text: { es: formText, en: formText, pt: formText },
        tags: tokenize(formTitle + " " + formText),
        source: formSource,
        scope: "user",
        overrides: editingRec.id,
      };
      const updated = existingOverride
        ? customRecs.map((r) => r.id === existingOverride.id ? overrideRec : r)
        : [...customRecs, overrideRec];
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch("/api/recommendations/custom", {
        method: existingOverride ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(existingOverride ? { id: existingOverride.id } : {}),
          category: overrideRec.category,
          modality: overrideRec.modality,
          title: formTitle,
          text: formText,
          tags: overrideRec.tags,
          overrides: editingRec.id,
        }),
      }).catch(() => {});
    } else if (editingRec && editingRec.overrides) {
      const updated = customRecs.map((r) =>
        r.id === editingRec.id
          ? {
              ...r,
              title: { es: formTitle, en: formTitle, pt: formTitle },
              text: { es: formText, en: formText, pt: formText },
              category: formCategory,
              modality: formModality,
              source: formSource,
              tags: tokenize(formTitle + " " + formText),
            }
          : r
      );
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch("/api/recommendations/custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRec.id,
          category: formCategory,
          modality: formModality,
          title: formTitle,
          text: formText,
          tags: tokenize(formTitle + " " + formText),
        }),
      }).catch(() => {});
    } else if (editingRec) {
      const updated = customRecs.map((r) =>
        r.id === editingRec.id
          ? {
              ...r,
              title: { es: formTitle, en: formTitle, pt: formTitle },
              text: { es: formText, en: formText, pt: formText },
              category: formCategory,
              modality: formModality,
              source: formSource,
              tags: tokenize(formTitle + " " + formText),
            }
          : r
      );
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch("/api/recommendations/custom", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRec.id,
          category: formCategory,
          modality: formModality,
          title: formTitle,
          text: formText,
          tags: tokenize(formTitle + " " + formText),
        }),
      }).catch(() => {});
    } else {
      const rec: ManualRecommendation = {
        id: `custom_${Date.now()}`,
        category: formCategory,
        modality: formModality,
        title: { es: formTitle, en: formTitle, pt: formTitle },
        text: { es: formText, en: formText, pt: formText },
        tags: tokenize(formTitle + " " + formText),
        source: formSource || t("mrec.custom_source"),
        scope: "user",
      };
      const updated = [...customRecs, rec];
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch("/api/recommendations/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: rec.category, modality: rec.modality, title: formTitle, text: formText, tags: rec.tags }),
      }).catch(() => {});
    }
    setDialogOpen(false);
  }, [editingRec, editingIsSystem, formTitle, formText, formCategory, formModality, formSource, customRecs, t]);

  const handleDelete = useCallback((rec: ManualRecommendation) => {
    if (rec.scope === "system") {
      const newHidden = [...hiddenIds, rec.id];
      setHiddenIds(newHidden);
      saveHiddenLocal(newHidden);
    } else if (rec.overrides) {
      const updated = customRecs.filter((r) => r.id !== rec.id);
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch(`/api/recommendations/custom?id=${rec.id}`, { method: "DELETE" }).catch(() => {});
      const newHidden = [...hiddenIds, rec.overrides];
      setHiddenIds(newHidden);
      saveHiddenLocal(newHidden);
    } else {
      const updated = customRecs.filter((r) => r.id !== rec.id);
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch(`/api/recommendations/custom?id=${rec.id}`, { method: "DELETE" }).catch(() => {});
    }
    setDeleteConfirm(null);
  }, [customRecs, hiddenIds]);

  const restoreRec = useCallback((id: string) => {
    const newHidden = hiddenIds.filter((h) => h !== id);
    setHiddenIds(newHidden);
    saveHiddenLocal(newHidden);
    const override = customRecs.find((r) => r.overrides === id);
    if (override) {
      const updated = customRecs.filter((r) => r.id !== override.id);
      setCustomRecs(updated);
      saveCustomLocal(updated);
      fetch(`/api/recommendations/custom?id=${override.id}`, { method: "DELETE" }).catch(() => {});
    }
  }, [hiddenIds, customRecs]);

  const restoreOriginal = useCallback((rec: ManualRecommendation) => {
    if (!rec.overrides) return;
    const updated = customRecs.filter((r) => r.id !== rec.id);
    setCustomRecs(updated);
    saveCustomLocal(updated);
    fetch(`/api/recommendations/custom?id=${rec.id}`, { method: "DELETE" }).catch(() => {});
  }, [customRecs]);

  const loadOrgRecs = useCallback(async () => {
    setOrgRecsLoading(true);
    try {
      const res = await fetch("/api/org/recommendations");
      if (res.ok) setOrgRecs(await res.json());
    } catch { /* ignore */ }
    setOrgRecsLoading(false);
  }, []);

  const openOrgManage = useCallback(() => {
    setOrgManageOpen(true);
    loadOrgRecs();
  }, [loadOrgRecs]);

  const openOrgAdd = useCallback(() => {
    setOrgEditId(null);
    setOrgFormTitle("");
    setOrgFormText("");
    setOrgFormCategory("all");
    setOrgFormModality("all");
    setOrgFormSource("");
    setOrgFormSectionId(orgMembership?.section_id || orgSections[0]?.id || "");
    setOrgEditOpen(true);
  }, [orgMembership, orgSections]);

  const openOrgEdit = useCallback((rec: typeof orgRecs[0]) => {
    setOrgEditId(rec.id);
    setOrgFormTitle(rec.title);
    setOrgFormText(rec.text);
    setOrgFormCategory(rec.category);
    setOrgFormModality(rec.modality);
    setOrgFormSource(rec.source);
    setOrgFormSectionId(rec.section_id);
    setOrgEditOpen(true);
  }, []);

  const handleOrgSave = useCallback(async () => {
    if (!orgFormTitle.trim() || !orgFormText.trim() || !orgFormSectionId) return;
    setOrgSaving(true);
    try {
      const body = {
        ...(orgEditId ? { id: orgEditId } : {}),
        section_id: orgFormSectionId,
        category: orgFormCategory,
        modality: orgFormModality,
        title: orgFormTitle.trim(),
        text: orgFormText.trim(),
        tags: tokenize(orgFormTitle + " " + orgFormText),
        source: orgFormSource.trim() || "manual",
      };
      await fetch("/api/org/recommendations", {
        method: orgEditId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setOrgEditOpen(false);
      loadOrgRecs();
    } catch { /* ignore */ }
    setOrgSaving(false);
  }, [orgEditId, orgFormSectionId, orgFormCategory, orgFormModality, orgFormTitle, orgFormText, orgFormSource, loadOrgRecs]);

  const handleOrgDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/org/recommendations?id=${id}`, { method: "DELETE" });
      setOrgRecs((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ }
    setOrgDeleteConfirm(null);
  }, []);

  const reloadCustom = useCallback(() => {
    fetch("/api/recommendations/custom")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.recommendations) {
          setCustomRecs(data.recommendations);
          saveCustomLocal(data.recommendations);
        }
      })
      .catch(() => {});
  }, []);

  const openCatalog = useCallback(async () => {
    setCatalogOpen(true);
    setCatalogLoading(true);
    setCatalogSearch("");
    try {
      const res = await fetch("/api/recommendations/catalog");
      if (res.ok) setCatalog(await res.json());
    } catch { /* ignore */ }
    setCatalogLoading(false);
  }, []);

  const toggleImport = useCallback(async (item: RecCatalogItem) => {
    setToggling((prev) => new Set(prev).add(item.id));
    try {
      if (item.imported) {
        await fetch(`/api/recommendations/imports?id=${item.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/recommendations/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      }
      setCatalog((prev) =>
        prev.map((c) => c.id === item.id ? { ...c, imported: !c.imported } : c),
      );
    } catch { /* ignore */ }
    setToggling((prev) => { const next = new Set(prev); next.delete(item.id); return next; });
  }, []);

  const catLabel = (cat: string) => {
    if (cat === "all") return t("mrec.cat_all");
    return tSection(cat);
  };

  const modLabel = (mod: string) => {
    if (mod === "all") return t("mrec.mod_all");
    return tModality(mod);
  };

  const isOverride = (rec: ManualRecommendation) => !!rec.overrides;

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("mrec.manage_title")}</h2>
        <div className="flex items-center gap-1.5">
          {canManageOrg && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20" onClick={openOrgManage}>
              <Settings className="h-3.5 w-3.5" />
              {t("mrec.org_manage")}
            </Button>
          )}
          {hasOrg && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs border-teal-300 text-teal-600 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-400 dark:hover:bg-teal-900/20" onClick={openCatalog}>
              <Download className="h-3.5 w-3.5" />
              {t("mrec.import_section")}
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            {t("mrec.add_new")}
          </Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">{t("mrec.manage_desc")}</p>

      {/* Search + filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder={t("mrec.search_ph")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
            autoComplete="off"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          className="gap-1 text-xs h-9"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-3.5 w-3.5" />
          {t("mrec.filters")}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">{t("mrec.filter_modality")}</label>
            <Select value={filterMod} onValueChange={setFilterMod}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mrec.mod_all")}</SelectItem>
                {MODALITIES.map((m) => (
                  <SelectItem key={m} value={m}>{tModality(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">{t("mrec.filter_category")}</label>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mrec.cat_all")}</SelectItem>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{tSection(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">{t("mrec.filter_scope")}</label>
            <Select value={filterScope} onValueChange={setFilterScope}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("mrec.scope_all")}</SelectItem>
                <SelectItem value="system">{t("mrec.scope_system")}</SelectItem>
                <SelectItem value="org">{t("mrec.scope_org")}</SelectItem>
                <SelectItem value="user">{t("mrec.scope_user")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-[11px] text-gray-500 flex-wrap">
        <span>{filtered.length} {t("mrec.total_count")}</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {filtered.filter((r) => r.scope === "system").length} {t("mrec.scope_system")}</span>
        {filtered.some((r) => r.scope === "org") && (
          <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {filtered.filter((r) => r.scope === "org").length} {t("mrec.scope_org")}</span>
        )}
        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {filtered.filter((r) => r.scope === "user").length} {t("mrec.scope_user")}</span>
      </div>

      {/* Grouped list */}
      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([cat, recs]) => (
          <div key={cat} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCat(cat)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {expandedCats.has(cat) ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-1">{catLabel(cat)}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{recs.length}</Badge>
            </button>
            {expandedCats.has(cat) && (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recs.map((rec) => (
                  <div key={rec.id} className="px-3 py-2.5 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {rec.title[lang] || rec.title.es}
                          </span>
                          {isOverride(rec) ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400/50 text-amber-600 dark:text-amber-400">
                              {t("mrec.modified")}
                            </Badge>
                          ) : rec.scope === "org" ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-teal-400/50 text-teal-600 dark:text-teal-400">
                              {(rec as ManualRecommendation & { section_name?: string }).section_name || "Hospital"}
                            </Badge>
                          ) : (
                            <Badge
                              variant={rec.scope === "system" ? "secondary" : "outline"}
                              className={`text-[9px] px-1 py-0 shrink-0 ${rec.scope === "user" ? "border-brand/50 text-brand" : ""}`}
                            >
                              {rec.scope === "system" ? t("mrec.scope_system") : t("mrec.scope_user")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                          {rec.text[lang] || rec.text.es}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-gray-400">{modLabel(rec.modality)}</span>
                          <span className="text-[9px] text-gray-400">·</span>
                          <span className="text-[9px] text-gray-400">{rec.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isOverride(rec) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-amber-500"
                            title={t("mrec.restore_original")}
                            onClick={() => restoreOriginal(rec)}
                          >
                            <Undo2 className="h-3 w-3" />
                          </Button>
                        )}
                        {rec.scope !== "org" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-brand" onClick={() => openEdit(rec)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {rec.scope !== "org" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteConfirm(rec)}
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
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">{t("mrec.no_results")}</div>
      )}

      {/* Hidden / recoverable section */}
      {hiddenRecs.length > 0 && (
        <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowHidden(!showHidden)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            {showHidden ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
            <Eye className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 flex-1">
              {t("mrec.hidden_recs")} ({hiddenRecs.length})
            </span>
          </button>
          {showHidden && (
            <div className="divide-y divide-gray-100 dark:divide-gray-800 border-t border-dashed border-gray-300 dark:border-gray-700">
              {hiddenRecs.map((rec) => (
                <div key={rec.id} className="px-3 py-2 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate block">
                      {rec.title[lang] || rec.title.es}
                    </span>
                    <span className="text-[9px] text-gray-400">{rec.source}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] gap-1 shrink-0"
                    onClick={() => restoreRec(rec.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("mrec.restore")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingRec
                ? editingIsSystem ? t("mrec.edit_system") : t("mrec.edit_rec")
                : t("mrec.add_new")}
            </DialogTitle>
          </DialogHeader>
          {editingIsSystem && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-md">
              {t("mrec.edit_system_hint")}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_title")}</label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="h-8 text-xs" placeholder={t("mrec.custom_title_ph")} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_text")}</label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                className="w-full h-24 text-xs p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
                placeholder={t("mrec.custom_text_ph")}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.filter_category")}</label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mrec.cat_all")}</SelectItem>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{tSection(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.filter_modality")}</label>
                <Select value={formModality} onValueChange={setFormModality}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mrec.mod_all")}</SelectItem>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{tModality(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_source")}</label>
              <Input value={formSource} onChange={(e) => setFormSource(e.target.value)} className="h-8 text-xs" placeholder={t("mrec.source_ph")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button size="sm" className="text-xs" onClick={handleSave} disabled={!formTitle.trim() || !formText.trim()}>
              {editingRec ? t("save") : t("mrec.add_new")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("mrec.delete_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {deleteConfirm?.scope === "system" || deleteConfirm?.overrides
              ? t("mrec.hide_confirm")
              : t("mrec.delete_confirm")}
          </p>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              {deleteConfirm?.scope === "system" || deleteConfirm?.overrides ? t("mrec.hide_btn") : t("mrec.delete_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org Management Dialog — CRUD org recommendations (chiefs/editors) */}
      <Dialog open={orgManageOpen} onOpenChange={setOrgManageOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4 text-amber-600" />
              {t("mrec.org_manage_title")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("mrec.org_manage_desc")}</p>

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5 text-xs" onClick={openOrgAdd}>
              <Plus className="h-3.5 w-3.5" />
              {t("mrec.org_add")}
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[55vh]">
            {orgRecsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              </div>
            ) : orgRecs.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                {t("mrec.org_empty")}
              </div>
            ) : (
              <div className="space-y-1.5 pr-3 pb-2">
                {orgRecs.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{rec.title}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{rec.text}</p>
                      <div className="flex gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{modLabel(rec.modality)}</Badge>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{catLabel(rec.category)}</Badge>
                        {rec.section_name && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-teal-400/50 text-teal-600 dark:text-teal-400">{rec.section_name}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-500" onClick={() => openOrgEdit(rec)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => setOrgDeleteConfirm(rec.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Org recommendation edit dialog */}
      <Dialog open={orgEditOpen} onOpenChange={setOrgEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {orgEditId ? t("mrec.org_edit") : t("mrec.org_add")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {orgMembership?.is_org_chief && orgSections.length > 1 && (
              <div>
                <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.org_section")}</label>
                <Select value={orgFormSectionId} onValueChange={setOrgFormSectionId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {orgSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_title")}</label>
              <Input value={orgFormTitle} onChange={(e) => setOrgFormTitle(e.target.value)} className="h-8 text-xs" placeholder={t("mrec.custom_title_ph")} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_text")}</label>
              <textarea
                value={orgFormText}
                onChange={(e) => setOrgFormText(e.target.value)}
                className="w-full h-24 text-xs p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
                placeholder={t("mrec.custom_text_ph")}
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.filter_category")}</label>
                <Select value={orgFormCategory} onValueChange={setOrgFormCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mrec.cat_all")}</SelectItem>
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{tSection(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.filter_modality")}</label>
                <Select value={orgFormModality} onValueChange={setOrgFormModality}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("mrec.mod_all")}</SelectItem>
                    {MODALITIES.map((m) => (
                      <SelectItem key={m} value={m}>{tModality(m)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1 block">{t("mrec.form_source")}</label>
              <Input value={orgFormSource} onChange={(e) => setOrgFormSource(e.target.value)} className="h-8 text-xs" placeholder={t("mrec.source_ph")} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button size="sm" className="text-xs" onClick={handleOrgSave} disabled={!orgFormTitle.trim() || !orgFormText.trim() || !orgFormSectionId || orgSaving}>
              {orgSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              {orgEditId ? t("save") : t("mrec.org_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Org recommendation delete confirmation */}
      <Dialog open={!!orgDeleteConfirm} onOpenChange={() => setOrgDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t("mrec.org_delete_title")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-600 dark:text-gray-400">{t("mrec.org_delete_confirm")}</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={() => orgDeleteConfirm && handleOrgDelete(orgDeleteConfirm)}>
              {t("mrec.delete_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Catalog Dialog — browse & import org recommendations */}
      <Dialog open={catalogOpen} onOpenChange={(open) => { if (!open) { setCatalogOpen(false); reloadCustom(); } }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-teal-600" />
              {t("mrec.catalog_title")}
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder={t("mrec.search_ph")}
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
              autoComplete="off"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[60vh]">
            {catalogLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
              </div>
            ) : catalog.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-xs">
                {t("mrec.catalog_empty")}
              </div>
            ) : (() => {
              const q = catalogSearch.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
              const catalogFiltered = catalog.filter((c) =>
                c.title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q) ||
                c.text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q) ||
                c.section_name.toLowerCase().includes(q) ||
                c.category.toLowerCase().includes(q)
              );
              const catalogGrouped = new Map<string, RecCatalogItem[]>();
              catalogFiltered.forEach((c) => {
                const key = c.section_name || "Hospital";
                if (!catalogGrouped.has(key)) catalogGrouped.set(key, []);
                catalogGrouped.get(key)!.push(c);
              });
              const importedCount = catalog.filter((c) => c.imported).length;

              return (
                <div className="space-y-3 pr-3 pb-2">
                  <div className="flex items-center gap-2 px-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {importedCount} {t("mrec.catalog_imported")}
                    </Badge>
                    <span className="text-[10px] text-gray-400">
                      {t("mrec.catalog_of")} {catalog.length} {t("mrec.catalog_available")}
                    </span>
                  </div>

                  {catalogFiltered.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-6">{t("mrec.no_results")}</p>
                  )}

                  {Array.from(catalogGrouped.entries()).map(([secName, items]) => (
                    <div key={secName}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-px flex-1 bg-teal-200 dark:bg-teal-900" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                          {secName}
                        </span>
                        <div className="h-px flex-1 bg-teal-200 dark:bg-teal-900" />
                      </div>

                      <div className="space-y-1">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-md border transition-all ${
                              item.imported
                                ? "border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10"
                                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                {item.text}
                              </p>
                              <div className="flex gap-1.5 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  {modLabel(item.modality)}
                                </Badge>
                                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                                  {catLabel(item.category)}
                                </Badge>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant={item.imported ? "default" : "outline"}
                              className={`h-7 px-3 text-[11px] shrink-0 ${
                                item.imported
                                  ? "bg-teal-600 hover:bg-teal-700 text-white"
                                  : "text-teal-600 border-teal-300 hover:bg-teal-50 dark:border-teal-800 dark:hover:bg-teal-900/20"
                              }`}
                              disabled={toggling.has(item.id)}
                              onClick={() => toggleImport(item)}
                            >
                              {toggling.has(item.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : item.imported ? (
                                <><Check className="h-3 w-3 mr-1" /> {t("mrec.catalog_imported_btn")}</>
                              ) : (
                                <><Plus className="h-3 w-3 mr-1" /> {t("mrec.catalog_import_btn")}</>
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
