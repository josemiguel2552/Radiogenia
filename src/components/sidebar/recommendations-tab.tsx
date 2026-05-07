"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  User,
  ChevronDown,
  ChevronRight,
  Filter,
  RotateCcw,
  Undo2,
  Eye,
} from "lucide-react";
import { useT, useSection, useModality } from "@/lib/i18n";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import { MODALITIES, SECTIONS } from "@/lib/types";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";

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
        <Button size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5" />
          {t("mrec.add_new")}
        </Button>
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
                <SelectItem value="user">{t("mrec.scope_user")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex gap-3 text-[11px] text-gray-500">
        <span>{filtered.length} {t("mrec.total_count")}</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {filtered.filter((r) => r.scope === "system").length} {t("mrec.scope_system")}</span>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-brand" onClick={() => openEdit(rec)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-gray-400 hover:text-red-500"
                          onClick={() => setDeleteConfirm(rec)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
              <Input value={formSource} onChange={(e) => setFormSource(e.target.value)} className="h-8 text-xs" placeholder="Fleischner 2017, ACR..." />
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
    </div>
  );
}
