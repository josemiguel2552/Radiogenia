"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Check, Wand2, Brain, Pencil, X, RotateCcw, Search,
  PenLine, Plus, Trash2,
} from "lucide-react";
import { LANGUAGES, DICTATION_LANGUAGES, MODALITIES, type AIProvider, type FindingsLength, type NormalFieldsVerbosity, type ParaphraseLevel, type OutputLanguage, type Signature } from "@/lib/types";
import { useT, useModality, useSection } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";

interface ModelConfig {
  provider: AIProvider;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  findings_length: FindingsLength;
  normal_fields_verbosity: NormalFieldsVerbosity;
  paraphrase_level: ParaphraseLevel;
  output_language: OutputLanguage;
  dictation_language: string;
  compact_normals: boolean;
}

interface NormalityPhraseRow {
  modality: string;
  section_label: string;
  default_phrase: string;
  phrase: string;
  is_customized: boolean;
}

export function ModelConfigTab() {
  const t = useT();
  const modName = useModality();
  const secName = useSection();
  const { prefs } = useUIPrefs();
  const uiLang = (prefs.uiLanguage || "es") as "es" | "en";
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

  // Signatures
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [showAddSig, setShowAddSig] = useState(false);
  const [editingSig, setEditingSig] = useState<Signature | null>(null);
  const [sigLabel, setSigLabel] = useState("");
  const [sigBody, setSigBody] = useState("");
  const [savingSig, setSavingSig] = useState(false);
  const [sigError, setSigError] = useState<string | null>(null);
  const [sigSetupNeeded, setSigSetupNeeded] = useState(false);

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
      const res = await fetch(`/api/normality-phrases?modality=${encodeURIComponent(m)}&lang=${uiLang}`);
      if (res.ok) setNormalityPhrases(await res.json());
    } catch { /* ignore */ }
  }, [selectedModality, uiLang]);

  const loadSignatures = useCallback(async () => {
    try {
      const res = await fetch("/api/signatures");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSignatures(data);
          setSigSetupNeeded(false);
        } else if (data?.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
        }
      } else {
        const data = await res.json().catch(() => null);
        if (data?.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadNormality(); }, [loadNormality]);
  useEffect(() => { loadSignatures(); }, [loadSignatures]);

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

  async function handleSaveSig() {
    if (!sigLabel.trim() || !sigBody.trim()) return;
    setSavingSig(true);
    setSigError(null);
    try {
      const res = editingSig
        ? await fetch("/api/signatures", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingSig.id, label: sigLabel, body: sigBody }),
          })
        : await fetch("/api/signatures", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: sigLabel, body: sigBody }),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        if (err.error === "SETUP_REQUIRED") {
          setSigSetupNeeded(true);
          setSigError("Run migration 015_signatures.sql in the Supabase SQL Editor.");
        } else {
          setSigError(err.error || "Failed to save signature");
        }
        setSavingSig(false);
        return;
      }
      setSigLabel(""); setSigBody(""); setShowAddSig(false); setEditingSig(null);
      setSigError(null);
      await loadSignatures();
    } catch {
      setSigError("Network error saving signature");
    }
    setSavingSig(false);
  }

  async function handleToggleSigActive(sig: Signature) {
    try {
      const res = await fetch("/api/signatures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sig.id, is_active: !sig.is_active }),
      });
      if (!res.ok) console.error("Toggle signature error:", await res.text());
    } catch (e) {
      console.error("Toggle signature error:", e);
    }
    await loadSignatures();
  }

  async function handleDeleteSig(id: string) {
    try {
      const res = await fetch(`/api/signatures?id=${id}`, { method: "DELETE" });
      if (!res.ok) console.error("Delete signature error:", await res.text());
    } catch (e) {
      console.error("Delete signature error:", e);
    }
    await loadSignatures();
  }

  if (loading || !config) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  const langLabel = LANGUAGES.find((l) => l.value === config.output_language)?.label || config.output_language;
  const customizedCount = normalityPhrases.filter((p) => p.is_customized).length;
  const filteredPhrases = normalitySearch
    ? normalityPhrases.filter((p) => {
        const q = normalitySearch.toLowerCase();
        return p.section_label.toLowerCase().includes(q) || secName(p.section_label).toLowerCase().includes(q);
      })
    : normalityPhrases;

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
            {/* Report language */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{t("cfg.output_language")}</Label>
              <Select value={config.output_language} onValueChange={(v) => update("output_language", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Dictation language */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">{t("cfg.dictation_language")}</Label>
              <p className="text-[10px] text-gray-400 mb-1.5">{t("cfg.dictation_language_hint")}</p>
              <Select value={config.dictation_language || "auto"} onValueChange={(v) => update("dictation_language", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DICTATION_LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

          </AccordionContent>
        </AccordionItem>

        {/* Normality Phrases */}
        <AccordionItem value="normality">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-violet-500" />
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

        {/* Signatures */}
        <AccordionItem value="signatures">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <PenLine className="h-3.5 w-3.5 text-blue-500" />
              {t("sig.title")}
              {signatures.some((s) => s.is_active) && (
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {t("sig.desc")}
            </p>

            {sigSetupNeeded && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">Setup required</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  Run migration <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">015_signatures.sql</code> in the Supabase SQL Editor to enable signatures.
                </p>
              </div>
            )}

            {!sigSetupNeeded && signatures.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-xs text-gray-400">{t("sig.no_signatures")}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t("sig.no_signatures_hint")}</p>
              </div>
            ) : !sigSetupNeeded && (
              <div className="space-y-1.5">
                {signatures.map((sig) => (
                  <div
                    key={sig.id}
                    className={`p-2 rounded-lg border transition-colors ${
                      sig.is_active
                        ? "border-violet-500/40 bg-green-50 dark:bg-green-900/10"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSigActive(sig)}
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          sig.is_active
                            ? "border-violet-500 bg-violet-500"
                            : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
                        }`}
                        title={sig.is_active ? t("sig.active") : t("sig.set_active")}
                      >
                        {sig.is_active && <Check className="h-2.5 w-2.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 block truncate">{sig.label}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">{sig.body.split("\n")[0]}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-brand"
                          onClick={() => { setEditingSig(sig); setSigLabel(sig.label); setSigBody(sig.body); setShowAddSig(true); }}
                          title={t("edit")}
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-5 w-5 text-gray-400 hover:text-red-500"
                          onClick={() => { if (confirm(t("sig.confirm_delete"))) handleDeleteSig(sig.id); }}
                          title={t("delete")}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              size="sm" variant="outline" className="w-full text-xs gap-1.5"
              onClick={() => { setEditingSig(null); setSigLabel(""); setSigBody(""); setShowAddSig(true); }}
            >
              <Plus className="h-3 w-3" />
              {t("sig.add")}
            </Button>
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
                translateLabel={secName}
              />
            ))}
            {filteredPhrases.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">{t("no_match_search")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Add/Edit Dialog */}
      <Dialog open={showAddSig} onOpenChange={(v) => { setShowAddSig(v); if (!v) setEditingSig(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSig ? t("edit") : t("sig.add")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.label")}</Label>
              <Input
                value={sigLabel}
                onChange={(e) => setSigLabel(e.target.value)}
                placeholder={t("sig.label_placeholder")}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("sig.body")}</Label>
              <textarea
                value={sigBody}
                onChange={(e) => setSigBody(e.target.value)}
                placeholder={t("sig.body_placeholder")}
                rows={4}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
              />
            </div>
            {sigBody.trim() && (
              <div className="space-y-1.5">
                <Label className="text-[10px] text-gray-400">{t("sig.preview")}</Label>
                <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-sans">{sigBody}</pre>
                </div>
              </div>
            )}
            {sigError && (
              <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{sigError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAddSig(false); setEditingSig(null); setSigError(null); }}>
                {t("cancel")}
              </Button>
              <Button size="sm" onClick={handleSaveSig} disabled={savingSig || !sigLabel.trim() || !sigBody.trim()}>
                {savingSig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ────────── Helper components ────────── */

function NormalityPhraseRow({ row, saving, onSave, onReset, translateLabel }: {
  row: NormalityPhraseRow;
  saving: boolean;
  onSave: (phrase: string) => void;
  onReset: () => void;
  translateLabel: (name: string) => string;
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
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{translateLabel(row.section_label)}</span>
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
    <div className={`flex items-start gap-2 p-2 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.is_customized ? "border-l-2 border-l-violet-500" : ""}`}>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 block">{translateLabel(row.section_label)}</span>
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

