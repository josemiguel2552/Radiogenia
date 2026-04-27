"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Check, Wand2, Brain, Pencil, X, RotateCcw, Search, Sparkles, Trash2,
} from "lucide-react";
import { LANGUAGES, MODALITIES, type AIProvider, type FindingsLength, type NormalFieldsVerbosity, type ParaphraseLevel, type OutputLanguage } from "@/lib/types";
import { useT, useSection, useModality, useTemplateName } from "@/lib/i18n";

interface ModelConfig {
  provider: AIProvider;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  findings_length: FindingsLength;
  normal_fields_verbosity: NormalFieldsVerbosity;
  paraphrase_level: ParaphraseLevel;
  output_language: OutputLanguage;
  few_shot_count: number;
  compact_normals: boolean;
  style_learning_enabled: boolean;
}

interface NormalityPhraseRow {
  modality: string;
  section_label: string;
  default_phrase: string;
  phrase: string;
  is_customized: boolean;
}

interface StylePatternRow {
  id: string;
  modality: string;
  study_type: string;
  kind: string;
  label?: string;
  phrase: string;
  frequency: number;
  last_seen_at: string;
}

interface StyleGroup {
  modality: string;
  study_type: string;
  report_count: number;
  normal_phrases: StylePatternRow[];
  conclusion_phrases: StylePatternRow[];
}

export function ModelConfigTab() {
  const t = useT();
  const sec = useSection();
  const modName = useModality();
  const tplName = useTemplateName();
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Normality phrases
  const [normalityPhrases, setNormalityPhrases] = useState<NormalityPhraseRow[]>([]);
  const [selectedModality, setSelectedModality] = useState("CT");
  const [showNormality, setShowNormality] = useState(false);
  const [normalitySearch, setNormalitySearch] = useState("");
  const [savingPhrase, setSavingPhrase] = useState<string | null>(null);

  // Style learning
  const [styleGroups, setStyleGroups] = useState<StyleGroup[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [showLearnedPhrases, setShowLearnedPhrases] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StyleGroup | null>(null);
  const [deletingPhrase, setDeletingPhrase] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/model-config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
    }
    setLoading(false);
  }

  const loadNormality = useCallback(async (mod?: string) => {
    const m = mod || selectedModality;
    try {
      const res = await fetch(`/api/normality-phrases?modality=${encodeURIComponent(m)}`);
      if (res.ok) setNormalityPhrases(await res.json());
    } catch { /* ignore */ }
  }, [selectedModality]);

  const loadStylePatterns = useCallback(async () => {
    try {
      const res = await fetch("/api/style-patterns");
      if (res.ok) {
        const data = await res.json();
        setStyleGroups(data.groups || []);
        setTotalReports(data.total_reports || 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadNormality(); }, [loadNormality]);
  useEffect(() => { loadStylePatterns(); }, [loadStylePatterns]);

  function update(field: string, value: string | boolean | number) {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setDirty(true);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...config };
    delete body.api_key_encrypted;
    delete body.provider;
    delete body.model_name;
    delete body.custom_base_url;

    const res = await fetch("/api/model-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error("Failed to save config:", await res.text());
    }
    setDirty(false);
    setSaving(false);
    load();
  }

  async function handleSaveNormalityPhrase(modality: string, sectionLabel: string, phrase: string) {
    setSavingPhrase(sectionLabel);
    await fetch("/api/normality-phrases", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modality, section_label: sectionLabel, phrase }),
    });
    await loadNormality(modality);
    setSavingPhrase(null);
  }

  async function handleResetNormalityPhrase(modality: string, sectionLabel: string) {
    setSavingPhrase(sectionLabel);
    await fetch(`/api/normality-phrases?modality=${encodeURIComponent(modality)}&section_label=${encodeURIComponent(sectionLabel)}`, { method: "DELETE" });
    await loadNormality(modality);
    setSavingPhrase(null);
  }

  async function handleDeletePhrase(id: string) {
    setDeletingPhrase(id);
    await fetch(`/api/style-patterns?id=${id}`, { method: "DELETE" });
    await loadStylePatterns();
    if (selectedGroup) {
      setSelectedGroup((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          normal_phrases: prev.normal_phrases.filter((p) => p.id !== id),
          conclusion_phrases: prev.conclusion_phrases.filter((p) => p.id !== id),
        };
      });
    }
    setDeletingPhrase(null);
  }

  async function handleResetGroup(modality: string, studyType: string) {
    await fetch(`/api/style-patterns?group=${encodeURIComponent(modality)}|${encodeURIComponent(studyType)}`, { method: "DELETE" });
    setShowLearnedPhrases(false);
    setSelectedGroup(null);
    await loadStylePatterns();
  }


  if (loading || !config) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  const langLabel = LANGUAGES.find((l) => l.value === config.output_language)?.label || config.output_language;
  const customizedCount = normalityPhrases.filter((p) => p.is_customized).length;
  const filteredPhrases = normalitySearch
    ? normalityPhrases.filter((p) => p.section_label.toLowerCase().includes(normalitySearch.toLowerCase()))
    : normalityPhrases;

  const activeGroups = styleGroups.filter((g) => g.report_count > 0 || g.normal_phrases.length > 0 || g.conclusion_phrases.length > 0);
  const totalPhrases = activeGroups.reduce((sum, g) => sum + g.normal_phrases.length + g.conclusion_phrases.length, 0);

  return (
    <div className="space-y-3">
      {/* Active model summary card */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-brand-soft flex items-center justify-center">
          <Wand2 className="h-4 w-4 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {t("cfg.managed_by_admin")}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{langLabel}</p>
        </div>
        {dirty && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] flex-shrink-0">
            {t("cfg.unsaved")}
          </Badge>
        )}
      </div>

      <Accordion type="single" collapsible defaultValue="writing">
        {/* Writing preferences */}
        <AccordionItem value="writing">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Wand2 className="h-3.5 w-3.5 text-violet-500" />
              {t("cfg.writing_prefs")}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            {/* Compact normals toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">{t("cfg.compact_normals")}</Label>
                <p className="text-[10px] text-gray-400">{t("cfg.compact_normals_hint")}</p>
              </div>
              <Switch checked={!!config.compact_normals} onCheckedChange={(v) => update("compact_normals", v)} />
            </div>

            {/* Language */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{t("cfg.output_language")}</Label>
              <Select value={config.output_language} onValueChange={(v) => update("output_language", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Normality Phrases */}
        <AccordionItem value="normality">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
              {t("cfg.normality")}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {t("cfg.normality_desc")}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{modName(selectedModality)}</span> — {normalityPhrases.length} {t("cfg.sections")}
              </span>
              <Badge variant={customizedCount > 0 ? "default" : "secondary"} className="text-[10px]">
                {customizedCount}/{normalityPhrases.length} {t("cfg.customized")}
              </Badge>
            </div>
            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => setShowNormality(true)}>
              <Pencil className="h-3 w-3" />
              {t("cfg.edit_normality")}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Style Learning */}
        <AccordionItem value="style-learning">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t("cfg.style_learning")}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">{t("cfg.style_learning")}</Label>
                <p className="text-[10px] text-gray-400">{t("cfg.style_learning_desc")}</p>
              </div>
              <Switch
                checked={config.style_learning_enabled !== false}
                onCheckedChange={(v) => update("style_learning_enabled", v)}
              />
            </div>

            {config.style_learning_enabled !== false && (
              <>
                {activeGroups.length > 0 ? (
                  <>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                      {t("cfg.style_learning_summary").replace("{0}", String(activeGroups.length))}
                    </p>

                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
                            <th className="text-left px-2.5 py-1.5 font-medium">{t("cfg.study_type")}</th>
                            <th className="text-center px-1.5 py-1.5 font-medium w-14">{t("cfg.reports_stored")}</th>
                            <th className="text-center px-1.5 py-1.5 font-medium w-14">{t("cfg.phrases_learned")}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {activeGroups.slice(0, 5).map((g) => (
                            <tr
                              key={`${g.modality}|${g.study_type}`}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
                              onClick={() => { setSelectedGroup(g); setShowLearnedPhrases(true); }}
                            >
                              <td className="px-2.5 py-1.5 text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
                                {tplName(g.study_type)}
                              </td>
                              <td className="text-center px-1.5 py-1.5 text-gray-500">
                                <span className="tabular-nums">{Math.min(g.report_count, 10)}</span>
                                <span className="text-gray-400">/10</span>
                              </td>
                              <td className="text-center px-1.5 py-1.5 text-gray-500 tabular-nums">
                                {g.normal_phrases.length + g.conclusion_phrases.length}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {activeGroups.length > 5 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-[10px] text-gray-500 h-6"
                        onClick={() => {
                          setSelectedGroup(null);
                          setShowLearnedPhrases(true);
                        }}
                      >
                        {t("cfg.view_all")} ({activeGroups.length})
                      </Button>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                      <Sparkles className="h-3 w-3 flex-shrink-0" />
                      <span>{totalPhrases} {t("cfg.phrases_learned").toLowerCase()} · {totalReports} {t("cfg.reports_stored").toLowerCase()}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Sparkles className="h-5 w-5 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-relaxed">
                      {t("cfg.no_patterns")}
                    </p>
                  </div>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer */}
      <Button onClick={handleSave} disabled={saving || !dirty} className="w-full h-10">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("cfg.save_config")}
      </Button>

      {/* Normality Phrases Editor Dialog */}
      <Dialog open={showNormality} onOpenChange={setShowNormality}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("cfg.normality_dialog")}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 pb-2">
            <Select value={selectedModality} onValueChange={(v) => { setSelectedModality(v); setNormalitySearch(""); loadNormality(v); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALITIES.filter((m) => m !== "Procedures").map((m) => (
                  <SelectItem key={m} value={m}>{modName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={normalitySearch}
                onChange={(e) => setNormalitySearch(e.target.value)}
                placeholder={`${t("search")}...`}
                className="h-8 text-xs pl-7"
              />
            </div>
            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
              {customizedCount}/{normalityPhrases.length}
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1">
            {filteredPhrases.map((p) => (
              <NormalityPhraseRow
                key={`${p.modality}|${p.section_label}`}
                row={p}
                saving={savingPhrase === p.section_label}
                onSave={(phrase) => handleSaveNormalityPhrase(p.modality, p.section_label, phrase)}
                onReset={() => handleResetNormalityPhrase(p.modality, p.section_label)}
              />
            ))}
            {filteredPhrases.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">{t("no_match_search")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Learned Phrases Dialog */}
      <Dialog open={showLearnedPhrases} onOpenChange={(v) => { setShowLearnedPhrases(v); if (!v) setSelectedGroup(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("cfg.learned_phrases")}</DialogTitle>
          </DialogHeader>

          {selectedGroup ? (
            <LearnedPhrasesDetail
              group={selectedGroup}
              onDelete={handleDeletePhrase}
              onReset={() => handleResetGroup(selectedGroup.modality, selectedGroup.study_type)}
              deletingPhrase={deletingPhrase}
            />
          ) : (
            <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-2">
              {activeGroups.map((g) => (
                <button
                  key={`${g.modality}|${g.study_type}`}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setSelectedGroup(g)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{tplName(g.study_type)}</span>
                      <span className="text-[10px] text-gray-400 ml-2">{modName(g.modality)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {g.normal_phrases.length + g.conclusion_phrases.length} {t("cfg.phrases_learned").toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                </button>
              ))}
              {activeGroups.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-8">{t("cfg.no_patterns")}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────── Helper components ────────── */

function NormalityPhraseRow({ row, saving, onSave, onReset }: {
  row: NormalityPhraseRow;
  saving: boolean;
  onSave: (phrase: string) => void;
  onReset: () => void;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.phrase);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(row.phrase); }, [row.phrase]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.selectionStart = inputRef.current.value.length;
    }
  }, [editing]);

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== row.phrase) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 space-y-1.5 bg-gray-50 dark:bg-gray-800">
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{row.section_label}</span>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") { setDraft(row.phrase); setEditing(false); }
          }}
          rows={2}
          className="w-full text-xs border rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-600 resize-none focus:outline-none focus:ring-1 ring-brand"
        />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setDraft(row.phrase); setEditing(false); }}>
            <X className="h-2.5 w-2.5 mr-1" />{t("cancel")}
          </Button>
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSave}>
            <Check className="h-2.5 w-2.5 mr-1" />{t("save")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2 p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.is_customized ? "border-l-2 border-l-emerald-500" : ""}`}>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 block">{row.section_label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{row.phrase}</span>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        ) : (
          <>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-brand" onClick={() => setEditing(true)} title={t("edit")}>
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            {row.is_customized && (
              <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-amber-500" onClick={onReset} title={t("reset")}>
                <RotateCcw className="h-2.5 w-2.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LearnedPhrasesDetail({ group, onDelete, onReset, deletingPhrase }: {
  group: StyleGroup;
  onDelete: (id: string) => void;
  onReset: () => void;
  deletingPhrase: string | null;
}) {
  const t = useT();
  const modName = useModality();
  const tplName = useTemplateName();

  return (
    <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{tplName(group.study_type)}</span>
          <span className="text-xs text-gray-400 ml-2">{modName(group.modality)}</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[10px] text-red-500 hover:text-red-600 hover:border-red-300 gap-1"
          onClick={onReset}
        >
          <RotateCcw className="h-2.5 w-2.5" />
          {t("cfg.reset_study_type")}
        </Button>
      </div>

      {group.normal_phrases.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            {t("cfg.normal_phrases_label")} ({group.normal_phrases.length})
          </h4>
          <div className="space-y-1">
            {group.normal_phrases.map((p) => (
              <PhraseRow key={p.id} phrase={p} onDelete={onDelete} deleting={deletingPhrase === p.id} />
            ))}
          </div>
        </div>
      )}

      {group.conclusion_phrases.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            {t("cfg.conclusion_phrases_label")} ({group.conclusion_phrases.length})
          </h4>
          <div className="space-y-1">
            {group.conclusion_phrases.map((p) => (
              <PhraseRow key={p.id} phrase={p} onDelete={onDelete} deleting={deletingPhrase === p.id} />
            ))}
          </div>
        </div>
      )}

      {group.normal_phrases.length === 0 && group.conclusion_phrases.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-6">{t("cfg.no_patterns")}</p>
      )}
    </div>
  );
}

function PhraseRow({ phrase, onDelete, deleting }: {
  phrase: StylePatternRow;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const t = useT();
  return (
    <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
      <div className="flex-1 min-w-0">
        {phrase.label && (
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 block">{phrase.label}</span>
        )}
        <span className="text-xs text-gray-700 dark:text-gray-300 block mt-0.5 leading-relaxed">{phrase.phrase}</span>
        <span className="text-[9px] text-gray-400 mt-0.5 block tabular-nums">
          ×{phrase.frequency}
        </span>
      </div>
      <div className="flex-shrink-0 pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {deleting ? (
          <Loader2 className="h-3 w-3 animate-spin text-gray-400" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-gray-400 hover:text-red-500"
            onClick={() => onDelete(phrase.id)}
            title={t("cfg.delete_phrase")}
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
