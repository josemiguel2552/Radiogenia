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
  X,
  Building2,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  RotateCcw,
  Undo2,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
} from "lucide-react";
import { useT, useSection, useModality } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import { MODALITIES, SECTIONS } from "@/lib/types";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";
import { RadiogenBot } from "./radiogen-bot";

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

const SECTION_COLORS: Record<string, string> = {
  "Head and neck": "linear-gradient(135deg, #F43F5E, #BE123C)",
  Thorax: "linear-gradient(135deg, #EF4444, #B91C1C)",
  "Abdomen and pelvis": "linear-gradient(135deg, #F97316, #C2410C)",
  Spine: "linear-gradient(135deg, #84CC16, #4D7C0F)",
  "Upper limbs": "linear-gradient(135deg, #06B6D4, #0E7490)",
  "Lower limbs": "linear-gradient(135deg, #A855F7, #7E22CE)",
  _general: "linear-gradient(135deg, #6B7280, #4B5563)",
};

const GUIDELINE_COLORS = [
  "linear-gradient(135deg, #3B82F6, #1D4ED8)",
  "linear-gradient(135deg, #8B5CF6, #6D28D9)",
  "linear-gradient(135deg, #14B8A6, #0F766E)",
  "linear-gradient(135deg, #F59E0B, #B45309)",
  "linear-gradient(135deg, #EC4899, #BE185D)",
  "linear-gradient(135deg, #10B981, #047857)",
  "linear-gradient(135deg, #6366F1, #4338CA)",
  "linear-gradient(135deg, #EF4444, #B91C1C)",
  "linear-gradient(135deg, #06B6D4, #0E7490)",
  "linear-gradient(135deg, #84CC16, #4D7C0F)",
];

function shortGuideline(source: string): string {
  return source.replace(/\s*\(.*?\)\s*$/, "").trim();
}

export function RecommendationsTab() {
  const t = useT();
  const tSection = useSection();
  const tModality = useModality();
  const [customRecs, setCustomRecs] = useState<ManualRecommendation[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchReadOnly, setSearchReadOnly] = useState(true);
  const [navLevel, setNavLevel] = useState<"sections" | "guidelines" | "list">("sections");
  const [navSection, setNavSection] = useState("");
  const [navGuideline, setNavGuideline] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<ManualRecommendation | null>(null);
  const [editingIsSystem, setEditingIsSystem] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ManualRecommendation | null>(null);
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
  const [recSubTab, setRecSubTab] = useState<"all" | "hospital">("all");

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

  const { prefs } = useUIPrefs();
  const lang: OutputLanguage = (prefs.uiLanguage as OutputLanguage) || "es";

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
      if (!r.overrides && !hiddenSet.has(r.id)) result.push(r);
    }
    return result;
  }, [customRecs, overrideMap, hiddenSet]);

  // Search-filtered recommendations (flat list)
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return visibleRecs.filter((r) => {
      const title = (r.title[lang] || r.title.es || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const text = (r.text[lang] || r.text.es || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const tags = r.tags.join(" ").toLowerCase();
      const source = (r.source || "").toLowerCase();
      return title.includes(searchLower) || text.includes(searchLower) || tags.includes(searchLower) || source.includes(searchLower);
    });
  }, [visibleRecs, search, lang]);

  // Section counts for Level 1
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of visibleRecs) {
      const cat = r.category === "all" ? "_general" : r.category;
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return counts;
  }, [visibleRecs]);

  // Ordered sections for Level 1
  const orderedSections = useMemo(() => {
    const order = [...SECTIONS.map(String), "_general"];
    return [...sectionCounts.keys()].sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [sectionCounts]);

  // Guideline counts for Level 2 (within selected section)
  const guidelineCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of visibleRecs) {
      const cat = r.category === "all" ? "_general" : r.category;
      if (cat !== navSection) continue;
      const key = shortGuideline(r.source || t("mrec.general"));
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [visibleRecs, navSection, t]);

  // Ordered guidelines for Level 2
  const orderedGuidelines = useMemo(() => {
    return [...guidelineCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => key);
  }, [guidelineCounts]);

  // Recommendations for Level 3 (filtered by section + guideline)
  const drillFiltered = useMemo(() => {
    return visibleRecs.filter((r) => {
      const cat = r.category === "all" ? "_general" : r.category;
      if (cat !== navSection) return false;
      const key = shortGuideline(r.source || t("mrec.general"));
      if (key !== navGuideline) return false;
      return true;
    });
  }, [visibleRecs, navSection, navGuideline, t]);

  const hiddenRecs = useMemo(() => {
    const hidden: ManualRecommendation[] = DEFAULT_RECOMMENDATIONS.filter((r) => hiddenSet.has(r.id));
    for (const r of customRecs) {
      if (!r.overrides && hiddenSet.has(r.id)) hidden.push(r);
    }
    return hidden;
  }, [hiddenSet, customRecs]);

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

  const switchToHospitalTab = useCallback(() => {
    setRecSubTab("hospital");
    if (canManageOrg) loadOrgRecs();
  }, [canManageOrg, loadOrgRecs]);

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

  const orgRecsForTab = useMemo(() => {
    return customRecs.filter((r) => r.scope === "org");
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

  function renderRecCard(rec: ManualRecommendation) {
    return (
      <div key={rec.id} className="group p-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900/50 hover:border-brand-soft transition-all">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-xs font-medium text-gray-900 dark:text-white">
                {rec.title[lang] || rec.title.es}
              </span>
              {isOverride(rec) ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400/50 text-amber-600 dark:text-amber-400">
                  {t("mrec.modified")}
                </Badge>
              ) : rec.scope === "org" ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-violet-400/50 text-violet-600 dark:text-violet-400">
                  {(rec as ManualRecommendation & { section_name?: string }).section_name || "Hospital"}
                </Badge>
              ) : rec.scope === "user" ? (
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-brand/50 text-brand">{t("mrec.scope_user")}</Badge>
              ) : null}
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {rec.text[lang] || rec.text.es}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{modLabel(rec.modality)}</Badge>
              <span className="text-[9px] text-gray-400">{rec.source}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {isOverride(rec) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-amber-500" title={t("mrec.restore_original")} onClick={() => restoreOriginal(rec)}>
                <Undo2 className="h-3 w-3" />
              </Button>
            )}
            {rec.scope !== "org" && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-brand" onClick={() => openEdit(rec)}>
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {rec.scope === "org" ? (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600" title={t("mrec.hide_btn")} onClick={() => { const n = [...hiddenIds, rec.id]; setHiddenIds(n); saveHiddenLocal(n); }}>
                <EyeOff className="h-3 w-3" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => setDeleteConfirm(rec)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {/* Radiogen Bot */}
      <div className="flex justify-end">
        <RadiogenBot />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t("mrec.manage_title")}</h2>
        {recSubTab === "all" && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5" />
            {t("mrec.add_new")}
          </Button>
        )}
        {recSubTab === "hospital" && canManageOrg && (
          <Button size="sm" className="gap-1.5 text-xs" onClick={openOrgAdd}>
            <Plus className="h-3.5 w-3.5" />
            {t("mrec.org_add")}
          </Button>
        )}
      </div>

      {hasOrg ? (
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setRecSubTab("all")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${recSubTab === "all" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            {t("mrec.tab_all")}
          </button>
          <button
            type="button"
            onClick={switchToHospitalTab}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${recSubTab === "hospital" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <Building2 className="h-3 w-3" />
            {t("mrec.tab_hospital")}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">{t("mrec.manage_desc")}</p>
      )}

      {recSubTab === "all" && <>
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="search"
          placeholder={t("mrec.search_ph")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-xs"
          readOnly={searchReadOnly}
          onFocus={() => setSearchReadOnly(false)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          name="rg_recsearch_x"
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Search results (flat list) ── */}
      {search.trim() ? (
        <div className="space-y-1.5">
          {searchFiltered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">{t("mrec.no_results")}</div>
          ) : (
            <>
              <p className="text-[10px] text-gray-400">{searchFiltered.length} {t("mrec.total_count")}</p>
              {searchFiltered.map((rec) => renderRecCard(rec))}
            </>
          )}
        </div>

      /* ── Level 1: Anatomical section cards ── */
      ) : navLevel === "sections" ? (
        <div className="space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("mrec.choose_section")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {orderedSections.map((section) => {
              const count = sectionCounts.get(section) || 0;
              const gradient = SECTION_COLORS[section] || SECTION_COLORS._general;
              const label = section === "_general" ? t("mrec.general") : tSection(section);
              return (
                <button
                  key={section}
                  type="button"
                  className="group flex flex-col rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80 overflow-hidden hover:shadow-xl hover:scale-[1.03] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
                  onClick={() => { setNavSection(section); setNavLevel("guidelines"); setSearch(""); }}
                >
                  <div className="h-1.5 w-full" style={{ background: gradient }} />
                  <div className="flex flex-col items-center gap-1.5 p-4">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white text-center leading-tight">{label}</p>
                    <p className="text-[10px] text-gray-400">
                      {count} {t("mrec.total_count")}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {visibleRecs.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">{t("mrec.no_results")}</div>
          )}
        </div>

      /* ── Level 2: Guideline cards (for selected section) ── */
      ) : navLevel === "guidelines" ? (
        <div className="space-y-3">
          {/* Back button */}
          <button
            type="button"
            onClick={() => { setNavLevel("sections"); setNavSection(""); }}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{navSection === "_general" ? t("mrec.general") : tSection(navSection)}</span>
          </button>

          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t("mrec.choose_guideline")}
          </p>

          <div className="grid grid-cols-1 gap-2">
            {orderedGuidelines.map((guideline, idx) => {
              const count = guidelineCounts.get(guideline) || 0;
              const gradient = GUIDELINE_COLORS[idx % GUIDELINE_COLORS.length];
              return (
                <button
                  key={guideline}
                  type="button"
                  className="group flex items-center gap-3 w-full p-3.5 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/80 overflow-hidden hover:shadow-xl hover:scale-[1.01] hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200 text-left"
                  onClick={() => { setNavGuideline(guideline); setNavLevel("list"); }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 group-hover:shadow-lg group-hover:scale-105 transition-all"
                    style={{ background: gradient }}
                  >
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight truncate">{guideline}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {count} {t("mrec.total_count")}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-200 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

      /* ── Level 3: Recommendation list (for selected section + guideline) ── */
      ) : (
        <div className="space-y-2">
          {/* Breadcrumb back */}
          <button
            type="button"
            onClick={() => { setNavLevel("guidelines"); setNavGuideline(""); }}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{navSection === "_general" ? t("mrec.general") : tSection(navSection)}</span>
            <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600" />
            <span className="truncate max-w-[200px]">{navGuideline}</span>
          </button>

          <p className="text-[10px] text-gray-400">{drillFiltered.length} {t("mrec.total_count")}</p>

          {drillFiltered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">{t("mrec.no_results")}</div>
          ) : (
            <div className="space-y-1.5">
              {drillFiltered.map((rec) => renderRecCard(rec))}
            </div>
          )}
        </div>
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
      </>}

      {/* Hospital sub-tab */}
      {recSubTab === "hospital" && (
        <div className="space-y-3">
          {canManageOrg && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("mrec.org_manage_desc")}</p>
          )}

          {canManageOrg ? (
            <>
              {orgRecsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                </div>
              ) : orgRecs.length === 0 ? (
                <div className="text-center py-10">
                  <Building2 className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400">{t("mrec.org_empty")}</p>
                </div>
              ) : (
                <div className="space-y-1.5">
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
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-violet-400/50 text-violet-600 dark:text-violet-400">{rec.section_name}</Badge>
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
            </>
          ) : orgRecsForTab.length === 0 ? (
            <div className="text-center py-10">
              <Building2 className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-xs text-gray-400">{t("mrec.no_hospital_recs")}</p>
              <p className="text-[10px] text-gray-400 mt-1">{t("mrec.no_hospital_recs_hint")}</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {orgRecsForTab.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium text-gray-900 dark:text-white truncate">{rec.title[lang] || rec.title.es}</span>
                      {(rec as ManualRecommendation & { section_name?: string }).section_name && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-violet-400/50 text-violet-600 dark:text-violet-400">
                          {(rec as ManualRecommendation & { section_name?: string }).section_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{rec.text[lang] || rec.text.es}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-400">{modLabel(rec.modality)}</span>
                      <span className="text-[9px] text-gray-400">·</span>
                      <span className="text-[9px] text-gray-400">{rec.source}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-gray-600 shrink-0"
                    title={hiddenSet.has(rec.id) ? t("mrec.restore") : t("mrec.hide_btn")}
                    onClick={() => {
                      if (hiddenSet.has(rec.id)) {
                        const newHidden = hiddenIds.filter((h) => h !== rec.id);
                        setHiddenIds(newHidden);
                        saveHiddenLocal(newHidden);
                      } else {
                        const newHidden = [...hiddenIds, rec.id];
                        setHiddenIds(newHidden);
                        saveHiddenLocal(newHidden);
                      }
                    }}
                  >
                    {hiddenSet.has(rec.id) ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
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

    </div>
  );
}
