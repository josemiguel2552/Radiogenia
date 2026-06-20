"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Plus, X, Star, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";

interface Props {
  conclusionText: string;
  modality: string;
  section: string;
  outputLanguage: OutputLanguage;
  visible: boolean;
  onSelectionChange?: (texts: string[]) => void;
}

type UsageMap = Record<string, number>;

const STORAGE_KEY = "radiogenai_rec_usage";
const CUSTOM_KEY = "radiogenai_rec_custom";
const HIDDEN_KEY = "radiogenai_rec_hidden";

function loadUsageLocal(): UsageMap {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveUsageLocal(m: UsageMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}
function loadCustomLocal(): ManualRecommendation[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]"); } catch { return []; }
}
function saveCustomLocal(recs: ManualRecommendation[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(recs));
}

async function fetchUsageFromDB(): Promise<UsageMap | null> {
  try {
    const res = await fetch("/api/recommendations/usage");
    if (!res.ok) return null;
    const data = await res.json();
    const map: UsageMap = {};
    for (const row of data.usage || []) map[row.recommendation_id] = row.usage_count;
    return map;
  } catch { return null; }
}

async function fetchCustomFromDB(): Promise<ManualRecommendation[] | null> {
  try {
    const res = await fetch("/api/recommendations/custom");
    if (!res.ok) return null;
    return (await res.json()).recommendations || null;
  } catch { return null; }
}

function trackUsageAPI(ids: string[]) {
  fetch("/api/recommendations/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recommendation_ids: ids }),
  }).catch(() => {});
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

function scoreRelevance(rec: ManualRecommendation, conclusionTokens: string[], lang: OutputLanguage): number {
  const tagTokens = rec.tags.flatMap((t) =>
    t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\W+/)
  );
  const titleTokens = tokenize(rec.title[lang] || rec.title.es || "");
  const allTokens = [...tagTokens, ...titleTokens];
  let score = 0;
  for (const ct of conclusionTokens) {
    if (allTokens.some((tt) => tt.includes(ct) || ct.includes(tt))) score++;
  }
  return score;
}

const CATEGORY_ICONS: Record<string, string> = {
  "Thorax": "🫁",
  "Abdomen and pelvis": "🫀",
  "Head and neck": "🧠",
  "Spine": "🦴",
  "Upper limbs": "💪",
  "Lower limbs": "🦵",
  "Breast": "🩺",
};

const CATEGORY_ORDER = ["Thorax", "Abdomen and pelvis", "Head and neck", "Spine", "Upper limbs", "Lower limbs", "Breast"];

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  "Thorax": { es: "Tórax", en: "Thorax", pt: "Tórax" },
  "Abdomen and pelvis": { es: "Abdomen y pelvis", en: "Abdomen & pelvis", pt: "Abdome e pelve" },
  "Head and neck": { es: "Cabeza y cuello", en: "Head & neck", pt: "Cabeça e pescoço" },
  "Spine": { es: "Columna", en: "Spine", pt: "Coluna" },
  "Upper limbs": { es: "Miembros superiores", en: "Upper limbs", pt: "Membros superiores" },
  "Lower limbs": { es: "Miembros inferiores", en: "Lower limbs", pt: "Membros inferiores" },
  "Breast": { es: "Mama", en: "Breast", pt: "Mama" },
};

export function RecommendationPanel({ conclusionText, modality, section, outputLanguage, visible, onSelectionChange }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageMap>({});
  const [customRecs, setCustomRecs] = useState<ManualRecommendation[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    setUsage(loadUsageLocal());
    setCustomRecs(loadCustomLocal());
    try { setHiddenIds(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]")); } catch { /* */ }
    fetchUsageFromDB().then((dbUsage) => {
      if (dbUsage) { setUsage(dbUsage); saveUsageLocal(dbUsage); }
    });
    fetchCustomFromDB().then((dbCustom) => {
      if (dbCustom) { setCustomRecs(dbCustom); saveCustomLocal(dbCustom); }
    });
  }, []);

  useEffect(() => {
    if (visible && conclusionText) setOpen(true);
  }, [visible, conclusionText]);

  useEffect(() => {
    if (open && section) {
      setExpandedCategories(new Set([section]));
    }
  }, [open, section]);

  const modMap: Record<string, string> = {
    CT: "CT", MRI: "MRI", Ultrasound: "Ultrasound", XRay: "XRay",
    Mammography: "Mammography", Procedures: "Procedures",
  };
  const currentMod = modMap[modality] || modality;

  const allRecs = useMemo(() => {
    const hiddenSet = new Set(hiddenIds);
    const overrideMap = new Map<string, ManualRecommendation>();
    for (const r of customRecs) {
      if (r.overrides) overrideMap.set(r.overrides, r);
    }
    const result: ManualRecommendation[] = [];
    for (const sys of DEFAULT_RECOMMENDATIONS) {
      if (hiddenSet.has(sys.id)) continue;
      result.push(overrideMap.get(sys.id) || sys);
    }
    for (const r of customRecs) {
      if (!r.overrides) result.push(r);
    }
    return result;
  }, [customRecs, hiddenIds]);

  useEffect(() => {
    if (onSelectionChange) {
      const texts = allRecs
        .filter((r) => selected.has(r.id))
        .map((r) => r.text[outputLanguage] || r.text.es);
      onSelectionChange(texts);
    }
  }, [selected, allRecs, outputLanguage, onSelectionChange]);

  const filtered = useMemo(() => {
    return allRecs.filter((r) => {
      if (r.modality !== "all" && r.modality !== currentMod) return false;
      return true;
    });
  }, [allRecs, currentMod]);

  const conclusionTokens = useMemo(() => tokenize(conclusionText), [conclusionText]);

  const scored = useMemo(() => {
    return filtered
      .map((r) => ({ rec: r, relevance: scoreRelevance(r, conclusionTokens, outputLanguage) }))
      .sort((a, b) => b.relevance - a.relevance);
  }, [filtered, conclusionTokens, outputLanguage]);

  const frequentIds = useMemo(() => {
    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);
  }, [usage]);

  const frequentRecs = useMemo(() => {
    return frequentIds
      .map((id) => allRecs.find((r) => r.id === id))
      .filter((r): r is ManualRecommendation => !!r);
  }, [frequentIds, allRecs]);

  const suggestedRecs = useMemo(() => {
    return scored.filter((s) => s.relevance > 0).slice(0, 8);
  }, [scored]);

  const groupedByCategory = useMemo(() => {
    const searchTokens = searchQuery ? tokenize(searchQuery) : [];
    const groups = new Map<string, ManualRecommendation[]>();

    for (const { rec } of scored) {
      if (searchTokens.length > 0) {
        const recTokens = [
          ...tokenize(rec.title[outputLanguage] || rec.title.es || ""),
          ...rec.tags.flatMap((tg) => tokenize(tg)),
        ];
        const matches = searchTokens.some((st) =>
          recTokens.some((rt) => rt.includes(st) || st.includes(rt))
        );
        if (!matches) continue;
      }
      const cat = rec.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(rec);
    }

    const sorted = [...groups.entries()].sort(([a], [b]) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    return sorted;
  }, [scored, searchQuery, outputLanguage]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  const copySelected = useCallback(() => {
    const selectedRecs = allRecs.filter((r) => selected.has(r.id));
    const texts = selectedRecs.map((r) => "- " + (r.text[outputLanguage] || r.text.es));
    navigator.clipboard.writeText(texts.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    const newUsage = { ...usage };
    for (const r of selectedRecs) {
      newUsage[r.id] = (newUsage[r.id] || 0) + 1;
    }
    setUsage(newUsage);
    saveUsageLocal(newUsage);
    trackUsageAPI(selectedRecs.map((r) => r.id));
  }, [selected, allRecs, outputLanguage, usage]);

  const addCustomRec = useCallback(() => {
    if (!customTitle.trim() || !customText.trim()) return;
    const rec: ManualRecommendation = {
      id: `custom_${Date.now()}`,
      category: section || "all",
      modality: currentMod || "all",
      title: { es: customTitle, en: customTitle, pt: customTitle },
      text: { es: customText, en: customText, pt: customText },
      tags: tokenize(customTitle + " " + customText),
      source: t("mrec.custom_source"),
      scope: "user",
    };
    const updated = [...customRecs, rec];
    setCustomRecs(updated);
    saveCustomLocal(updated);
    fetch("/api/recommendations/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: rec.category, modality: rec.modality, title: customTitle, text: customText, tags: rec.tags }),
    }).catch(() => {});
    setCustomTitle("");
    setCustomText("");
    setAddingCustom(false);
  }, [customTitle, customText, customRecs, section, currentMod, t]);

  const removeCustom = useCallback((id: string) => {
    const updated = customRecs.filter((r) => r.id !== id);
    setCustomRecs(updated);
    saveCustomLocal(updated);
    fetch(`/api/recommendations/custom?id=${id}`, { method: "DELETE" }).catch(() => {});
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, [customRecs]);

  if (!visible) return null;

  function RecItem({ rec, showRemove }: { rec: ManualRecommendation; showRemove?: boolean }) {
    const isSelected = selected.has(rec.id);
    const title = rec.title[outputLanguage] || rec.title.es;
    const text = rec.text[outputLanguage] || rec.text.es;
    return (
      <button
        type="button"
        onClick={() => toggle(rec.id)}
        className={`w-full text-left px-2.5 py-1.5 rounded-md border transition-colors group ${
          isSelected
            ? "bg-brand/10 border-brand/30 dark:bg-brand/20"
            : "bg-[hsl(var(--card))] border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 h-3.5 w-3.5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
            isSelected ? "bg-brand border-brand" : "border-gray-300 dark:border-gray-600"
          }`}>
            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isSelected ? "text-brand" : "text-gray-800 dark:text-gray-200"}`}>
                {title}
              </span>
              {rec.source && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500 flex-shrink-0">{rec.source.split("(")[0].trim()}</span>
              )}
              {showRemove && (
                <button type="button" onClick={(e) => { e.stopPropagation(); removeCustom(rec.id); }}
                  className="text-gray-400 hover:text-red-500 ml-auto flex-shrink-0">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{text}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="border border-[hsl(var(--border))] rounded-lg overflow-hidden bg-[hsl(var(--card))]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="text-sm">📋</span>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1">
          {t("mrec.title")}
        </span>
        {selected.size > 0 && (
          <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded-full font-medium">
            {selected.size}
          </span>
        )}
        {open ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-100 dark:border-gray-800 max-h-[60vh] overflow-y-auto">
          {/* Suggested by relevance — chips */}
          {suggestedRecs.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1.5">
                {t("mrec.suggested")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedRecs.map((s) => {
                  const isOn = selected.has(s.rec.id);
                  const title = s.rec.title[outputLanguage] || s.rec.title.es;
                  return (
                    <button
                      key={s.rec.id}
                      type="button"
                      onClick={() => toggle(s.rec.id)}
                      title={s.rec.text[outputLanguage] || s.rec.text.es}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-colors ${
                        isOn
                          ? "bg-brand/10 border-brand/30 text-brand font-medium dark:bg-brand/20"
                          : "bg-[hsl(var(--card))] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 border transition-colors ${
                        isOn ? "bg-brand border-brand" : "border-gray-300 dark:border-gray-600"
                      }`} />
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frequent — chips */}
          {frequentRecs.length > 0 && (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1.5">
                <Star className="h-3 w-3" /> {t("mrec.frequent")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {frequentRecs.map((r) => {
                  const isOn = selected.has(r.id);
                  const title = r.title[outputLanguage] || r.title.es;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggle(r.id)}
                      title={r.text[outputLanguage] || r.text.es}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] border transition-colors ${
                        isOn
                          ? "bg-brand/10 border-brand/30 text-brand font-medium dark:bg-brand/20"
                          : "bg-[hsl(var(--card))] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 border transition-colors ${
                        isOn ? "bg-brand border-brand" : "border-gray-300 dark:border-gray-600"
                      }`} />
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Browse all toggle */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
            <button
              type="button"
              onClick={() => { setBrowsing(!browsing); if (browsing) setSearchQuery(""); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              {browsing ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              {outputLanguage === "en" ? "Browse all" : outputLanguage === "pt" ? "Ver todas" : "Ver todas"}
            </button>
          </div>

          {/* Browsing section — collapsed by default */}
          {browsing && (
            <div className="space-y-2">
              {/* Search — inside browse section */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("mrec.search_placeholder")}
                  className="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand/50"
                />
              </div>

              {/* Grouped by category/organ */}
              {groupedByCategory.length > 0 && (
                <div className="space-y-1">
                  {groupedByCategory.map(([category, recs]) => {
                    const isExpanded = expandedCategories.has(category) || !!searchQuery;
                    const catLabel = CATEGORY_LABELS[category]?.[outputLanguage] || CATEGORY_LABELS[category]?.es || category;
                    const icon = CATEGORY_ICONS[category] || "📄";
                    const selectedInCat = recs.filter((r) => selected.has(r.id)).length;
                    return (
                      <div key={category} className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <span className="text-xs">{icon}</span>
                          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 flex-1">{catLabel}</span>
                          <span className="text-[9px] text-gray-400">{recs.length}</span>
                          {selectedInCat > 0 && (
                            <span className="text-[9px] bg-brand/10 text-brand px-1 py-0.5 rounded-full font-medium">{selectedInCat}</span>
                          )}
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-2 pb-2 space-y-1">
                            {recs.map((r) => <RecItem key={r.id} rec={r} showRemove={r.scope === "user"} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* No results */}
              {groupedByCategory.length === 0 && searchQuery && (
                <p className="text-[10px] text-gray-400 italic text-center py-2">{t("mrec.no_recs")}</p>
              )}

              {/* Add custom */}
              {addingCustom ? (
                <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1.5">
                  <Input
                    placeholder={t("mrec.custom_title_ph")}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="h-7 text-xs"
                  />
                  <textarea
                    placeholder={t("mrec.custom_text_ph")}
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    className="w-full h-16 text-xs p-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] resize-none"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-[10px]" onClick={addCustomRec}>{t("save")}</Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setAddingCustom(false)}>{t("cancel")}</Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCustom(true)}
                  className="text-[10px] text-brand hover:text-brand/80 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> {t("mrec.add_custom")}
                </button>
              )}
            </div>
          )}

          {/* Selected summary + copy — always visible at bottom */}
          {selected.size > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">
                  {t("mrec.selected")} ({selected.size})
                </p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] gap-1"
                    onClick={copySelected}
                  >
                    {copied ? <Check className="h-3 w-3 text-violet-500" /> : <Copy className="h-3 w-3" />}
                    {copied ? t("copied") : t("mrec.copy_selected")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] text-gray-400"
                    onClick={() => setSelected(new Set())}
                  >
                    {t("mrec.clear")}
                  </Button>
                </div>
              </div>
              <ul className="space-y-1">
                {allRecs
                  .filter((r) => selected.has(r.id))
                  .map((r) => (
                    <li key={r.id} className="text-[10px] text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-brand/30">
                      {r.text[outputLanguage] || r.text.es}
                      <span className="text-[9px] text-gray-400 ml-1">({r.source})</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
