"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ChevronDown, ChevronRight, Copy, Check, Plus, X, Search, ClipboardList, Sparkles, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n";
import { DEFAULT_RECOMMENDATIONS } from "@/lib/recommendation-defaults";
import type { ManualRecommendation, OutputLanguage } from "@/lib/types";
import { copyToClipboard } from "@/lib/copy-text";

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
  "Abdomen and pelvis": "🩻",
  "Head and neck": "🧠",
  "Spine": "🦴",
  "Upper limbs": "💪",
  "Lower limbs": "🦵",
  "Breast": "🩺",
};

// Soft tinted background per category for a cohesive, less "emoji-soup" look.
const CATEGORY_COLORS: Record<string, string> = {
  "Thorax": "bg-sky-100 dark:bg-sky-900/30",
  "Abdomen and pelvis": "bg-amber-100 dark:bg-amber-900/30",
  "Head and neck": "bg-violet-100 dark:bg-violet-900/30",
  "Spine": "bg-emerald-100 dark:bg-emerald-900/30",
  "Upper limbs": "bg-rose-100 dark:bg-rose-900/30",
  "Lower limbs": "bg-indigo-100 dark:bg-indigo-900/30",
  "Breast": "bg-pink-100 dark:bg-pink-900/30",
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

// ── Topic (sub-category) within an anatomical section ──────────────
// Derived from the recommendation id prefix so the 100+ guideline entries
// don't need per-row edits. Lets the browse view sub-group by theme.
const TOPIC_ORDER = [
  // Thorax
  "pulm_nodules", "lung_screening", "thoracic_aorta", "aortic_dissection", "breast",
  // Abdomen & pelvis
  "liver", "renal_cyst", "adrenal", "pancreatic_cyst", "ovarian", "prostate",
  "gb_polyp", "aaa", "diverticulitis", "hydronephrosis",
  // Head & neck
  "thyroid", "cerebral_aneurysm", "carotid", "meningioma",
  // MSK
  "bone_lesion", "vertebral_fracture",
  "other",
];

const TOPIC_LABELS: Record<string, Record<string, string>> = {
  pulm_nodules: { es: "Nódulos pulmonares incidentales", en: "Incidental pulmonary nodules", pt: "Nódulos pulmonares incidentais" },
  lung_screening: { es: "Cribado pulmonar (Lung-RADS)", en: "Lung screening (Lung-RADS)", pt: "Rastreio pulmonar (Lung-RADS)" },
  thoracic_aorta: { es: "Aorta torácica", en: "Thoracic aorta", pt: "Aorta torácica" },
  aortic_dissection: { es: "Disección aórtica", en: "Aortic dissection", pt: "Dissecção aórtica" },
  breast: { es: "Mama (BI-RADS)", en: "Breast (BI-RADS)", pt: "Mama (BI-RADS)" },
  liver: { es: "Hígado (LI-RADS)", en: "Liver (LI-RADS)", pt: "Fígado (LI-RADS)" },
  renal_cyst: { es: "Quiste renal (Bosniak)", en: "Renal cyst (Bosniak)", pt: "Cisto renal (Bosniak)" },
  adrenal: { es: "Glándula suprarrenal", en: "Adrenal gland", pt: "Glândula adrenal" },
  pancreatic_cyst: { es: "Quiste pancreático", en: "Pancreatic cyst", pt: "Cisto pancreático" },
  ovarian: { es: "Ovario y anexos (O-RADS)", en: "Ovary & adnexa (O-RADS)", pt: "Ovário e anexos (O-RADS)" },
  prostate: { es: "Próstata (PI-RADS)", en: "Prostate (PI-RADS)", pt: "Próstata (PI-RADS)" },
  gb_polyp: { es: "Pólipo vesicular", en: "Gallbladder polyp", pt: "Pólipo da vesícula" },
  aaa: { es: "Aneurisma de aorta abdominal", en: "Abdominal aortic aneurysm", pt: "Aneurisma da aorta abdominal" },
  diverticulitis: { es: "Diverticulitis", en: "Diverticulitis", pt: "Diverticulite" },
  hydronephrosis: { es: "Hidronefrosis", en: "Hydronephrosis", pt: "Hidronefrose" },
  thyroid: { es: "Tiroides (TI-RADS)", en: "Thyroid (TI-RADS)", pt: "Tireoide (TI-RADS)" },
  cerebral_aneurysm: { es: "Aneurisma cerebral", en: "Cerebral aneurysm", pt: "Aneurisma cerebral" },
  carotid: { es: "Estenosis carotídea", en: "Carotid stenosis", pt: "Estenose carotídea" },
  meningioma: { es: "Meningioma incidental", en: "Incidental meningioma", pt: "Meningioma incidental" },
  bone_lesion: { es: "Lesión ósea", en: "Bone lesion", pt: "Lesão óssea" },
  vertebral_fracture: { es: "Fractura vertebral", en: "Vertebral fracture", pt: "Fratura vertebral" },
  other: { es: "Otras", en: "Other", pt: "Outras" },
};

function deriveTopic(rec: ManualRecommendation): string {
  const id = rec.id || "";
  // Thorax
  if (/^fleisch_|^bts_/.test(id)) return "pulm_nodules";
  if (/^lungrads_/.test(id)) return "lung_screening";
  if (/^birads_|^breast_/.test(id)) return "breast";
  if (/^thoracic_aorta_/.test(id)) return "thoracic_aorta";
  if (/^dissection_/.test(id)) return "aortic_dissection";
  // Abdomen & pelvis
  if (/^liver_|^lirads_/.test(id)) return "liver";
  if (/^renal_bosniak_/.test(id)) return "renal_cyst";
  if (/^adrenal_/.test(id)) return "adrenal";
  if (/^pancreas_cyst_/.test(id)) return "pancreatic_cyst";
  if (/^ovarian_|^orads_/.test(id)) return "ovarian";
  if (/^pirads_/.test(id)) return "prostate";
  if (/^gb_polyp_/.test(id)) return "gb_polyp";
  if (/^aaa_/.test(id)) return "aaa";
  if (/^diverticulitis_/.test(id)) return "diverticulitis";
  if (/^hydronephrosis_/.test(id)) return "hydronephrosis";
  // Head & neck
  if (/^thyroid_|^tirads_/.test(id)) return "thyroid";
  if (/^aneurysm_/.test(id)) return "cerebral_aneurysm";
  if (/^carotid_/.test(id)) return "carotid";
  if (/^meningioma_/.test(id)) return "meningioma";
  // MSK
  if (/^bone_lesion/.test(id)) return "bone_lesion";
  if (/^compression_fx/.test(id)) return "vertebral_fracture";
  return "other";
}

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

  const suggestedRecs = useMemo(() => {
    return scored.filter((s) => s.relevance > 0).slice(0, 8);
  }, [scored]);

  // Two-level grouping: anatomical section → topic → recommendations.
  const groupedByCategory = useMemo(() => {
    const searchTokens = searchQuery ? tokenize(searchQuery) : [];
    const groups = new Map<string, Map<string, ManualRecommendation[]>>();

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
      const topic = deriveTopic(rec);
      if (!groups.has(cat)) groups.set(cat, new Map());
      const topicMap = groups.get(cat)!;
      if (!topicMap.has(topic)) topicMap.set(topic, []);
      topicMap.get(topic)!.push(rec);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => {
        const ai = CATEGORY_ORDER.indexOf(a);
        const bi = CATEGORY_ORDER.indexOf(b);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      })
      .map(([cat, topicMap]) => {
        const topics = [...topicMap.entries()].sort(([a], [b]) => {
          const ai = TOPIC_ORDER.indexOf(a);
          const bi = TOPIC_ORDER.indexOf(b);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });
        const count = topics.reduce((n, [, recs]) => n + recs.length, 0);
        return { cat, topics, count };
      });
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
    copyToClipboard(texts.join("\n"));
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
        className={`w-full text-left pl-2 pr-2.5 py-1.5 rounded-lg border-l-2 border transition-all group ${
          isSelected
            ? "bg-brand/10 border-brand/30 border-l-brand dark:bg-brand/20"
            : "bg-[hsl(var(--card))] border-transparent border-l-transparent hover:bg-gray-50 hover:border-l-gray-200 dark:hover:bg-gray-800/50 dark:hover:border-l-gray-700"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 h-4 w-4 rounded-[5px] border flex-shrink-0 flex items-center justify-center transition-colors ${
            isSelected ? "bg-brand border-brand" : "border-gray-300 dark:border-gray-600 group-hover:border-brand/50"
          }`}>
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-medium ${isSelected ? "text-brand" : "text-gray-800 dark:text-gray-200"}`}>
                {title}
              </span>
              {rec.source && (
                <span className="text-[8px] uppercase tracking-wide text-gray-400 dark:text-gray-500 flex-shrink-0 px-1 py-px rounded bg-gray-100 dark:bg-gray-800">{rec.source.split("(")[0].trim()}</span>
              )}
              {showRemove && (
                <button type="button" onClick={(e) => { e.stopPropagation(); removeCustom(rec.id); }}
                  className="text-gray-400 hover:text-red-500 ml-auto flex-shrink-0">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">{text}</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className={`border rounded-xl overflow-hidden bg-[hsl(var(--card))] transition-shadow ${open ? "border-brand/20 shadow-sm" : "border-[hsl(var(--border))]"}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="h-4 w-4 text-brand" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200">
            {t("mrec.title")}
          </span>
          <span className="block text-[10px] text-gray-400 dark:text-gray-500 truncate">
            {selected.size > 0 ? t("mrec.added_hint") : t("mrec.subtitle")}
          </span>
        </span>
        {selected.size > 0 && (
          <span className="text-[10px] bg-brand text-white px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
            {selected.size}
          </span>
        )}
        {open ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-3 pb-2.5 border-t border-gray-100 dark:border-gray-800 max-h-[60vh] overflow-y-auto">
          {/* Suggested chips */}
          {suggestedRecs.length > 0 && (
            <div className="pt-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3 w-3 text-brand" />
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("mrec.suggested_label")}</span>
              </div>
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
                      className={`inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-[11px] border transition-all ${
                        isOn
                          ? "bg-brand text-white border-brand font-medium shadow-sm"
                          : "bg-[hsl(var(--card))] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand/40 hover:bg-brand/5"
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${
                        isOn ? "bg-white/25" : "border border-gray-300 dark:border-gray-600"
                      }`}>
                        {isOn ? <Check className="h-2.5 w-2.5 text-white" /> : <Plus className="h-2.5 w-2.5 text-gray-400" />}
                      </span>
                      {title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {suggestedRecs.length === 0 && !browsing && (
            <div className="flex flex-col items-center text-center gap-1 py-4">
              <span className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-gray-400" />
              </span>
              <p className="text-[10px] text-gray-400">{t("mrec.no_recs")}</p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => { setBrowsing(!browsing); if (browsing) setSearchQuery(""); }}
              className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                browsing ? "bg-brand/10 text-brand font-medium" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <ListFilter className="h-3 w-3" />
              {t("mrec.browse_all")}
            </button>
            <button
              type="button"
              onClick={() => { if (browsing) { setAddingCustom(true); } else { setBrowsing(true); setAddingCustom(true); } }}
              className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-brand flex items-center gap-0.5 px-1.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={t("mrec.add_custom")}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="flex-1" />
            {selected.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {t("mrec.clear")}
                </button>
                <button
                  type="button"
                  onClick={copySelected}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? t("copied") : `${selected.size} · ${t("mrec.copy_selected")}`}
                </button>
              </>
            )}
          </div>

          {/* Browsing section */}
          {browsing && (
            <div className="space-y-2 pt-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="search"
                  name="rec-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("mrec.search_placeholder")}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full h-7 pl-7 pr-2 text-[11px] rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-brand/50"
                />
              </div>

              {groupedByCategory.length > 0 && (
                <div className="space-y-1">
                  {groupedByCategory.map(({ cat: category, topics, count }) => {
                    const isExpanded = expandedCategories.has(category) || !!searchQuery;
                    const catLabel = CATEGORY_LABELS[category]?.[outputLanguage] || CATEGORY_LABELS[category]?.es || category;
                    const icon = CATEGORY_ICONS[category] || "📄";
                    const catColor = CATEGORY_COLORS[category] || "bg-gray-100 dark:bg-gray-800";
                    const selectedInCat = topics.reduce((n, [, recs]) => n + recs.filter((r) => selected.has(r.id)).length, 0);
                    const showTopicHeaders = topics.length > 1 || (topics[0] && topics[0][0] !== "other");
                    return (
                      <div key={category} className="rounded-lg border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[11px] flex-shrink-0 ${catColor}`}>{icon}</span>
                          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 flex-1">{catLabel}</span>
                          {selectedInCat > 0 && (
                            <span className="text-[9px] bg-brand text-white px-1.5 py-0.5 rounded-full font-semibold">{selectedInCat}</span>
                          )}
                          <span className="text-[9px] text-gray-400 tabular-nums">{count}</span>
                          {isExpanded ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
                        </button>
                        {isExpanded && (
                          <div className="px-2 pb-2 space-y-2">
                            {topics.map(([topicKey, recs]) => {
                              const topicLabel = TOPIC_LABELS[topicKey]?.[outputLanguage] || TOPIC_LABELS[topicKey]?.es || topicKey;
                              const selectedInTopic = recs.filter((r) => selected.has(r.id)).length;
                              return (
                                <div key={topicKey} className="space-y-1">
                                  {showTopicHeaders && (
                                    <div className="flex items-center gap-1.5 px-1 pt-1">
                                      <span className="h-1 w-1 rounded-full bg-brand/50 flex-shrink-0" />
                                      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 flex-1 truncate">{topicLabel}</span>
                                      {selectedInTopic > 0 && (
                                        <span className="text-[8px] text-brand font-semibold">{selectedInTopic}</span>
                                      )}
                                    </div>
                                  )}
                                  {recs.map((r) => <RecItem key={r.id} rec={r} showRemove={r.scope === "user"} />)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {groupedByCategory.length === 0 && searchQuery && (
                <p className="text-[10px] text-gray-400 italic text-center py-2">{t("mrec.no_recs")}</p>
              )}

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
        </div>
      )}
    </div>
  );
}
