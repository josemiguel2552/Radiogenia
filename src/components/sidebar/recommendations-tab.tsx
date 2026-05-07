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
} from "lucide-react";
import { useT, useSection, useModality } from "@/lib/i18n";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import { MODALITIES, SECTIONS } from "@/lib/types";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";

const CUSTOM_KEY = "radiogenai_rec_custom";

function loadCustomLocal(): ManualRecommendation[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch { return []; }
}
function saveCustomLocal(recs: ManualRecommendation[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(recs));
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
  const [search, setSearch] = useState("");
  const [filterMod, setFilterMod] = useState<string>("all");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterScope, setFilterScope] = useState<string>("all");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<ManualRecommendation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formCategory, setFormCategory] = useState("all");
  const [formModality, setFormModality] = useState("all");
  const [formSource, setFormSource] = useState("");

  const lang: OutputLanguage = (typeof window !== "undefined" && (localStorage.getItem("radiogenai_lang") as OutputLanguage)) || "es";

  useEffect(() => {
    setCustomRecs(loadCustomLocal());
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

  const allRecs = useMemo(() => [...DEFAULT_RECOMMENDATIONS, ...customRecs], [customRecs]);

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return allRecs.filter((r) => {
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
  }, [allRecs, filterMod, filterCat, filterScope, search, lang]);

  const grouped = useMemo(() => {
    const map = new Map<string, ManualRecommendation[]>();
    for (const r of filtered) {
      const cat = r.category || "all";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(r);
    }
    return map;
  }, [filtered]);

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
    setFormTitle("");
    setFormText("");
    setFormCategory("all");
    setFormModality("all");
    setFormSource(t("mrec.custom_source"));
    setDialogOpen(true);
  }, [t]);

  const openEdit = useCallback((rec: ManualRecommendation) => {
    setEditingRec(rec);
    setFormTitle(rec.title[lang] || rec.title.es || "");
    setFormText(rec.text[lang] || rec.text.es || "");
    setFormCategory(rec.category);
    setFormModality(rec.modality);
    setFormSource(rec.source);
    setDialogOpen(true);
  }, [lang]);

  const handleSave = useCallback(() => {
    if (!formTitle.trim() || !formText.trim()) return;

    if (editingRec) {
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
  }, [editingRec, formTitle, formText, formCategory, formModality, formSource, customRecs, t]);

  const handleDelete = useCallback((id: string) => {
    const updated = customRecs.filter((r) => r.id !== id);
    setCustomRecs(updated);
    saveCustomLocal(updated);
    fetch(`/api/recommendations/custom?id=${id}`, { method: "DELETE" }).catch(() => {});
    setDeleteConfirm(null);
  }, [customRecs]);

  const catLabel = (cat: string) => {
    if (cat === "all") return t("mrec.cat_all");
    return tSection(cat);
  };

  const modLabel = (mod: string) => {
    if (mod === "all") return t("mrec.mod_all");
    return tModality(mod);
  };

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
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {rec.title[lang] || rec.title.es}
                          </span>
                          <Badge
                            variant={rec.scope === "system" ? "secondary" : "outline"}
                            className={`text-[9px] px-1 py-0 shrink-0 ${rec.scope === "user" ? "border-brand/50 text-brand" : ""}`}
                          >
                            {rec.scope === "system" ? t("mrec.scope_system") : t("mrec.scope_user")}
                          </Badge>
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
                      {rec.scope === "user" && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-brand" onClick={() => openEdit(rec)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={() => setDeleteConfirm(rec.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editingRec ? t("mrec.edit_rec") : t("mrec.add_new")}
            </DialogTitle>
          </DialogHeader>
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
          <p className="text-xs text-gray-600 dark:text-gray-400">{t("mrec.delete_confirm")}</p>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="text-xs">{t("cancel")}</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" className="text-xs" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              {t("mrec.delete_btn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
