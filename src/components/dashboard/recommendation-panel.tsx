"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Plus, X, Star } from "lucide-react";
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

export function RecommendationPanel({ conclusionText, modality, section, outputLanguage, visible }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [usage, setUsage] = useState<UsageMap>({});
  const [customRecs, setCustomRecs] = useState<ManualRecommendation[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customText, setCustomText] = useState("");

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

  const filtered = useMemo(() => {
    return allRecs.filter((r) => {
      if (r.modality !== "all" && r.modality !== currentMod) return false;
      if (section && r.category !== section && r.category !== "all") return false;
      return true;
    });
  }, [allRecs, currentMod, section]);

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
    return scored.filter((s) => s.relevance > 0).slice(0, 6);
  }, [scored]);

  const restRecs = useMemo(() => {
    const suggestedIds = new Set(suggestedRecs.map((s) => s.rec.id));
    const frequentSet = new Set(frequentIds);
    return scored.filter((s) => !suggestedIds.has(s.rec.id) && !frequentSet.has(s.rec.id));
  }, [scored, suggestedRecs, frequentIds]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
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

  function RecPill({ rec, showRemove }: { rec: ManualRecommendation; showRemove?: boolean }) {
    const isSelected = selected.has(rec.id);
    const title = rec.title[outputLanguage] || rec.title.es;
    return (
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => toggle(rec.id)}
          title={rec.text[outputLanguage] || rec.text.es}
          className={`px-2 py-1 text-[11px] rounded-md border transition-colors max-w-[200px] truncate ${
            isSelected
              ? "bg-brand text-white border-brand"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand/50"
          }`}
        >
          {title}
        </button>
        {showRemove && (
          <button type="button" onClick={() => removeCustom(rec.id)} className="text-gray-400 hover:text-red-500">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-white dark:bg-gray-950">
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
        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800">
          {/* Frecuentes */}
          {frequentRecs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2 mb-1">
                <Star className="h-3 w-3" /> {t("mrec.frequent")}
              </p>
              <div className="flex flex-wrap gap-1">
                {frequentRecs.map((r) => <RecPill key={r.id} rec={r} />)}
              </div>
            </div>
          )}

          {/* Sugeridas por relevancia */}
          {suggestedRecs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-1 mb-1">
                {t("mrec.suggested")}
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestedRecs.map((s) => <RecPill key={s.rec.id} rec={s.rec} />)}
              </div>
            </div>
          )}

          {/* Resto colapsable */}
          {restRecs.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mt-1"
              >
                {showAll ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {t("mrec.more")} ({restRecs.length})
              </button>
              {showAll && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {restRecs.map((s) => (
                    <RecPill key={s.rec.id} rec={s.rec} showRemove={s.rec.scope === "user"} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {scored.length === 0 && (
            <p className="text-[10px] text-gray-400 italic mt-2">{t("mrec.no_recs")}</p>
          )}

          {/* Añadir personalizada */}
          {addingCustom ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-1.5 mt-2">
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
                className="w-full h-16 text-xs p-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 resize-none"
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
              className="text-[10px] text-brand hover:text-brand/80 flex items-center gap-1 mt-1"
            >
              <Plus className="h-3 w-3" /> {t("mrec.add_custom")}
            </button>
          )}

          {/* Seleccionadas + copiar */}
          {selected.size > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-2 mt-2">
              <div className="flex items-center justify-between mb-1">
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
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
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
