"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Loader2, Check, Eye, Trash2, Upload, RefreshCw, Sparkles,
  Plug, Wand2, GraduationCap, Brain,
} from "lucide-react";
import { PROVIDERS, LANGUAGES, type AIProvider, type FindingsLength, type NormalFieldsVerbosity, type ParaphraseLevel, type OutputLanguage } from "@/lib/types";
import { buildFullPromptPreview } from "@/lib/prompts";

interface ModelConfig {
  provider: AIProvider;
  model_name: string;
  api_key_encrypted: string;
  custom_base_url: string;
  findings_length: FindingsLength;
  normal_fields_verbosity: NormalFieldsVerbosity;
  paraphrase_level: ParaphraseLevel;
  output_language: OutputLanguage;
  style_learning_enabled: boolean;
  style_sample_count: number;
  few_shot_count: number;
}

interface StylePatternGroup {
  modality: string;
  study_type: string;
  report_count: number;
  normal_phrases: { id: string; label: string | null; phrase: string; frequency: number; last_seen_at: string }[];
  conclusion_phrases: { id: string; phrase: string; frequency: number; last_seen_at: string }[];
}

export function ModelConfigTab() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Style patterns (new system)
  const [patternGroups, setPatternGroups] = useState<StylePatternGroup[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [showPhrases, setShowPhrases] = useState(false);

  // Prompt preview
  const [showPrompt, setShowPrompt] = useState(false);

  // Fine-tuning
  const [ftUploading, setFtUploading] = useState(false);
  const [ftFileId, setFtFileId] = useState<string | null>(null);
  const [ftExamples, setFtExamples] = useState(0);
  const [ftStarting, setFtStarting] = useState(false);
  const [ftJobId, setFtJobId] = useState<string | null>(null);
  const [ftStatus, setFtStatus] = useState<string | null>(null);
  const [ftModel, setFtModel] = useState<string | null>(null);
  const [ftError, setFtError] = useState<string | null>(null);
  const [ftChecking, setFtChecking] = useState(false);
  const [ftJobs, setFtJobs] = useState<{ jobId: string; status: string; fineTunedModel: string | null; model: string; createdAt: number }[]>([]);
  const [ftSuffix, setFtSuffix] = useState("radiogenia");
  const [ftBaseModel, setFtBaseModel] = useState("gpt-4o-mini-2024-07-18");
  const ftFileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/model-config");
    if (res.ok) {
      const data = await res.json();
      setConfig(data);
      setApiKey(data?.api_key_encrypted || "");
    }
    setLoading(false);
  }

  async function loadPatterns() {
    const res = await fetch("/api/style-patterns");
    if (res.ok) {
      const data = await res.json();
      setPatternGroups(data.groups || []);
      setTotalReports(data.total_reports || 0);
    }
  }

  useEffect(() => {
    load();
    loadPatterns();
    // Refresh stats when a report is saved from the dashboard
    const onSaved = () => loadPatterns();
    window.addEventListener("radiogenia:report-saved", onSaved);
    return () => window.removeEventListener("radiogenia:report-saved", onSaved);
  }, []);

  function update(field: string, value: string | boolean | number) {
    if (!config) return;
    setConfig({ ...config, [field]: value });
    setDirty(true);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    const body: Record<string, unknown> = { ...config };
    if (apiKey && apiKey !== "••••••••") {
      body.api_key = apiKey;
    }
    delete body.api_key_encrypted;

    await fetch("/api/model-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setDirty(false);
    setSaving(false);
    load();
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: config?.provider,
        modelName: config?.model_name,
        apiKey: apiKey !== "••••••••" ? apiKey : "",
        customBaseUrl: config?.custom_base_url,
      }),
    });
    const data = await res.json();
    setTestResult(data.success);
    setTesting(false);
  }

  async function handleDeletePattern(id: string) {
    await fetch(`/api/style-patterns?id=${id}`, { method: "DELETE" });
    loadPatterns();
  }

  async function handleResetGroup(modality: string, studyType: string) {
    if (!confirm(`Reset all learned phrases for ${studyType} (${modality})?`)) return;
    await fetch(`/api/style-patterns?group=${encodeURIComponent(modality + "|" + studyType)}`, { method: "DELETE" });
    loadPatterns();
  }

  // Fine-tuning functions
  async function loadFtJobs() {
    try {
      const res = await fetch("/api/finetune/status");
      if (res.ok) {
        const data = await res.json();
        setFtJobs(data.jobs || []);
      }
    } catch { /* ignore */ }
  }

  async function handleFtUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFtUploading(true);
    setFtError(null);
    setFtFileId(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/finetune/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setFtFileId(data.fileId);
        setFtExamples(data.validExamples);
        if (data.skippedErrors > 0) {
          setFtError(`${data.skippedErrors} lines skipped (invalid format)`);
        }
      } else {
        setFtError(data.error || "Upload failed");
      }
    } catch (err) {
      setFtError(err instanceof Error ? err.message : "Upload failed");
    }
    setFtUploading(false);
    if (ftFileRef.current) ftFileRef.current.value = "";
  }

  async function handleFtStart() {
    if (!ftFileId) return;
    setFtStarting(true);
    setFtError(null);

    try {
      const res = await fetch("/api/finetune/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: ftFileId, baseModel: ftBaseModel, suffix: ftSuffix }),
      });
      const data = await res.json();
      if (res.ok) {
        setFtJobId(data.jobId);
        setFtStatus(data.status);
        setFtFileId(null);
      } else {
        setFtError(data.error || "Failed to start");
      }
    } catch (err) {
      setFtError(err instanceof Error ? err.message : "Failed to start");
    }
    setFtStarting(false);
  }

  async function handleFtCheckStatus() {
    if (!ftJobId) return;
    setFtChecking(true);

    try {
      const res = await fetch("/api/finetune/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: ftJobId }),
      });
      const data = await res.json();
      if (res.ok) {
        setFtStatus(data.status);
        if (data.fineTunedModel) {
          setFtModel(data.fineTunedModel);
        }
        if (data.error) setFtError(data.error);
      }
    } catch { /* ignore */ }
    setFtChecking(false);
  }

  function useFtModel() {
    if (!ftModel) return;
    update("provider", "openai");
    update("model_name", ftModel);
    setDirty(true);
  }

  if (loading || !config) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>;

  const selectedProvider = PROVIDERS.find((p) => p.value === config.provider);
  const langLabel = LANGUAGES.find((l) => l.value === config.output_language)?.label || config.output_language;
  const totalPhrases = patternGroups.reduce((sum, g) => sum + g.normal_phrases.length + g.conclusion_phrases.length, 0);

  return (
    <div className="space-y-3">
      {/* Active model summary card */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <Plug className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {selectedProvider?.label || config.provider} / {config.model_name}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{langLabel}</p>
        </div>
        {dirty && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] flex-shrink-0">
            Unsaved
          </Badge>
        )}
      </div>

      <Accordion type="single" collapsible defaultValue="connection">
        {/* Connection */}
        <AccordionItem value="connection">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Plug className="h-3.5 w-3.5 text-blue-500" />
              Connection
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">Provider</Label>
              <Select value={config.provider} onValueChange={(v) => update("provider", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">Model</Label>
              {selectedProvider && selectedProvider.models.length > 0 ? (
                config.model_name.startsWith("ft:") ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                      <Sparkles className="h-3 w-3 text-purple-500" />
                      <span className="text-xs font-mono truncate">{config.model_name}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full text-xs h-7" onClick={() => update("model_name", selectedProvider.models[0])}>
                      Switch to standard model
                    </Button>
                  </div>
                ) : (
                  <Select value={config.model_name} onValueChange={(v) => update("model_name", v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedProvider.models.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              ) : (
                <Input value={config.model_name} onChange={(e) => update("model_name", e.target.value)} placeholder="Model name" className="h-9" />
              )}
            </div>

            {config.provider === "custom" && (
              <div>
                <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">Endpoint URL</Label>
                <Input value={config.custom_base_url} onChange={(e) => update("custom_base_url", e.target.value)} placeholder="https://..." className="h-9" />
              </div>
            )}

            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">API Key</Label>
              <Input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setDirty(true); }} placeholder="Enter API key" className="h-9" />
              <p className="text-[10px] text-gray-400 mt-1">Encrypted with AES-256-GCM. Never leaves your server.</p>
            </div>

            <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing} className="w-full gap-1.5">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : testResult === true ? <Check className="h-3.5 w-3.5 text-green-500" /> : null}
              {testResult === true ? "Connected" : testResult === false ? "Connection failed" : "Test connection"}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Writing preferences */}
        <AccordionItem value="writing">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Wand2 className="h-3.5 w-3.5 text-violet-500" />
              Writing preferences
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pt-1">
            {/* Findings length */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">Findings length</Label>
              <p className="text-[10px] text-gray-400 mb-2">Controls how detailed each anatomical section is written.</p>
              <SegmentedPill
                value={config.findings_length}
                options={[
                  { value: "concise", label: "Concise" },
                  { value: "standard", label: "Standard" },
                  { value: "detailed", label: "Detailed" },
                ]}
                onChange={(v) => update("findings_length", v)}
              />
            </div>

            {/* Normal fields verbosity */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">Normal fields verbosity</Label>
              <p className="text-[10px] text-gray-400 mb-2">How sections the radiologist did not mention are filled.</p>
              <SegmentedPill
                value={config.normal_fields_verbosity}
                options={[
                  { value: "minimal", label: "Minimal" },
                  { value: "standard", label: "Standard" },
                  { value: "explicit", label: "Explicit" },
                ]}
                onChange={(v) => update("normal_fields_verbosity", v)}
              />
            </div>

            {/* Paraphrase level */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">Paraphrase level</Label>
              <p className="text-[10px] text-gray-400 mb-2">Whether the AI can rephrase dictated findings.</p>
              <SegmentedPill
                value={config.paraphrase_level}
                options={[
                  { value: "none", label: "Literal" },
                  { value: "light", label: "Light" },
                  { value: "free", label: "Free" },
                ]}
                onChange={(v) => update("paraphrase_level", v)}
              />
            </div>

            {/* Language */}
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">Output language</Label>
              <Select value={config.output_language} onValueChange={(v) => update("output_language", v)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Style Learning */}
        <AccordionItem value="style">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
              Style learning
              {config.style_learning_enabled && totalReports > 0 && (
                <Badge variant="secondary" className="text-[9px] ml-1">{totalReports} reports</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Automatic learning</Label>
                <p className="text-[10px] text-gray-400">Learn your writing style from corrections.</p>
              </div>
              <Switch checked={config.style_learning_enabled} onCheckedChange={(v) => update("style_learning_enabled", v)} />
            </div>

            {config.style_learning_enabled && (
              <>
                {/* Global progress */}
                <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900 dark:text-white">Training progress</span>
                    <Badge variant={totalReports >= 10 ? "default" : "secondary"} className="text-[10px]">
                      {totalReports < 3 ? "Starting" : totalReports < 10 ? "Learning" : "Trained"}
                    </Badge>
                  </div>
                  <Progress value={Math.min((totalReports / 10) * 100, 100)} className="h-2" />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>{totalReports} report{totalReports !== 1 ? "s" : ""} saved</span>
                    <span>{totalReports < 3 ? `${3 - totalReports} more to activate` : totalReports < 10 ? `${10 - totalReports} more to consolidate` : "Fully trained"}</span>
                  </div>
                  {totalPhrases > 0 && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      {totalPhrases} phrase{totalPhrases !== 1 ? "s" : ""} learned across {patternGroups.filter((g) => g.normal_phrases.length + g.conclusion_phrases.length > 0).length} study type{patternGroups.filter((g) => g.normal_phrases.length + g.conclusion_phrases.length > 0).length !== 1 ? "s" : ""}.
                    </p>
                  )}
                </div>

                {/* Per study type breakdown */}
                {patternGroups.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase tracking-wide text-gray-500 block">By study type</Label>
                    {patternGroups
                      .sort((a, b) => b.report_count - a.report_count)
                      .slice(0, 6)
                      .map((g) => {
                        const phrases = g.normal_phrases.length + g.conclusion_phrases.length;
                        const pct = Math.min((g.report_count / 10) * 100, 100);
                        return (
                          <div key={`${g.modality}|${g.study_type}`} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-gray-900 dark:text-white truncate block">{g.study_type}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{g.modality}</span>
                            </div>
                            <Progress value={pct} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-gray-400">
                              <span>{g.report_count}/10 reports</span>
                              {phrases > 0 && <span>{phrases} phrases</span>}
                            </div>
                          </div>
                        );
                      })}
                    {patternGroups.length > 6 && (
                      <p className="text-[10px] text-gray-400 text-center">
                        + {patternGroups.length - 6} more
                      </p>
                    )}
                  </div>
                )}

                {patternGroups.length === 0 && (
                  <div className="text-center py-3">
                    <Brain className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No reports yet.</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Generate a report, correct it, and click &quot;Next report&quot; to start training.
                    </p>
                  </div>
                )}

                {/* Few-shot count */}
                <div>
                  <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">
                    Max phrases injected: {config.few_shot_count}
                  </Label>
                  <Slider value={[config.few_shot_count]} min={1} max={10} step={1} onValueChange={(v) => update("few_shot_count", v[0])} />
                </div>

                {totalPhrases > 0 && (
                  <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowPhrases(true)}>
                    View learned phrases
                  </Button>
                )}

                <p className="text-[10px] text-gray-400">
                  Style is learned automatically when you move to the next report. Only wording changes are captured — never clinical findings.
                </p>
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Fine-Tuning */}
        <AccordionItem value="finetune">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 text-purple-500" />
              Fine-tuning (OpenAI)
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            {config.provider !== "openai" ? (
              <p className="text-xs text-gray-500 py-2">
                Switch your provider to OpenAI to enable fine-tuning.
              </p>
            ) : (
              <>
                {/* Step 1: Upload */}
                <input type="file" accept=".docx,.doc,.jsonl,.txt" ref={ftFileRef} onChange={handleFtUpload} className="hidden" />

                <div className="space-y-3">
                  {/* Step indicator */}
                  <FtStep n={1} label="Upload training data" active={!ftFileId && !ftJobId}>
                    <div
                      className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-purple-400 transition-colors dark:border-gray-600"
                      onClick={() => ftFileRef.current?.click()}
                    >
                      {ftUploading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                          <p className="text-xs text-gray-500">Uploading to OpenAI...</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="h-4 w-4 text-gray-400" />
                          <p className="text-xs text-gray-500">Word doc or JSONL</p>
                        </div>
                      )}
                    </div>
                  </FtStep>

                  {ftFileId && (
                    <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-300">
                      <Check className="h-3 w-3 inline mr-1" />
                      {ftExamples} examples uploaded.
                    </div>
                  )}

                  {/* Step 2: Configure & start */}
                  <FtStep n={2} label="Configure & start" active={!!ftFileId}>
                    {ftFileId && (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-[10px] text-gray-500">Base model</Label>
                          <Select value={ftBaseModel} onValueChange={setFtBaseModel}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="gpt-4o-mini-2024-07-18">gpt-4o-mini (recommended)</SelectItem>
                              <SelectItem value="gpt-4o-2024-08-06">gpt-4o (higher quality)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-gray-500">Suffix</Label>
                          <Input value={ftSuffix} onChange={(e) => setFtSuffix(e.target.value)} placeholder="radiogenia" className="h-8 text-xs" />
                        </div>
                        <Button size="sm" onClick={handleFtStart} disabled={ftStarting} className="w-full bg-purple-600 hover:bg-purple-700 gap-1.5">
                          {ftStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          Start fine-tuning
                        </Button>
                      </div>
                    )}
                  </FtStep>

                  {/* Step 3: Status */}
                  <FtStep n={3} label="Training status" active={!!ftJobId}>
                    {ftJobId && (
                      <div className="space-y-2">
                        <div className="p-2.5 border rounded-lg text-xs dark:border-gray-700 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Job:</span>
                            <span className="font-mono text-[10px]">{ftJobId.slice(0, 20)}...</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <Badge variant={ftStatus === "succeeded" ? "default" : ftStatus === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                              {ftStatus || "unknown"}
                            </Badge>
                          </div>
                          {ftModel && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Model:</span>
                              <span className="font-mono text-[10px] text-green-600">{ftModel}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleFtCheckStatus} disabled={ftChecking} className="flex-1 text-xs gap-1">
                            {ftChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                            Refresh
                          </Button>
                          {ftModel && (
                            <Button size="sm" onClick={useFtModel} className="flex-1 text-xs bg-green-600 hover:bg-green-700 gap-1">
                              <Check className="h-3 w-3" /> Use model
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </FtStep>
                </div>

                {/* Previous jobs */}
                {!ftJobId && !ftFileId && (
                  <Button size="sm" variant="outline" className="w-full text-xs gap-1" onClick={loadFtJobs}>
                    <RefreshCw className="h-3 w-3" /> Load previous jobs
                  </Button>
                )}

                {ftJobs.length > 0 && !ftJobId && (
                  <div className="space-y-1.5">
                    {ftJobs.map((job) => (
                      <div key={job.jobId} className="p-2 border rounded-lg text-xs dark:border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px]">{job.model}</span>
                          <Badge variant={job.status === "succeeded" ? "default" : "secondary"} className="text-[10px]">{job.status}</Badge>
                        </div>
                        {job.fineTunedModel && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-mono text-[10px] text-green-600 truncate flex-1">{job.fineTunedModel}</span>
                            <Button size="sm" variant="ghost" className="h-5 text-[10px] text-green-600 ml-1" onClick={() => {
                              update("provider", "openai");
                              update("model_name", job.fineTunedModel!);
                              setDirty(true);
                            }}>
                              Use
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {ftError && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                    {ftError}
                  </div>
                )}

                <p className="text-[10px] text-gray-400">
                  Fine-tuning trains a personalized OpenAI model. Training typically takes 15-60 min. Costs billed by OpenAI.
                </p>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Footer actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving || !dirty} className="flex-1 h-10">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save configuration"}
        </Button>
        <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setShowPrompt(true)} title="Preview active prompt">
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Prompt Preview Dialog */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Active Prompt Preview</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-4 rounded-lg whitespace-pre-wrap font-mono">
            {buildFullPromptPreview({
              template: "[Selected template structure]",
              findingsLength: config.findings_length,
              normalFieldsVerbosity: config.normal_fields_verbosity,
              paraphraseLevel: config.paraphrase_level,
              outputLanguage: config.output_language,
              styleSamplesCount: config.style_learning_enabled ? config.few_shot_count : 0,
            })}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Learned Phrases Dialog */}
      <Dialog open={showPhrases} onOpenChange={setShowPhrases}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Learned Phrases</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {patternGroups.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No phrases learned yet.</p>
            )}
            {patternGroups.map((g) => {
              const key = `${g.modality}|${g.study_type}`;
              return (
                <div key={key} className="border rounded-lg dark:border-gray-700 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800">
                    <div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-white">{g.study_type}</span>
                      <Badge variant="secondary" className="text-[10px] ml-2">{g.modality}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-red-500 hover:text-red-600" onClick={() => handleResetGroup(g.modality, g.study_type)}>
                      Reset
                    </Button>
                  </div>
                  <div className="divide-y dark:divide-gray-700">
                    {g.normal_phrases.length > 0 && (
                      <div className="px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Normal phrases</p>
                        {g.normal_phrases.slice(0, 10).map((p) => (
                          <div key={p.id} className="flex items-start justify-between gap-2 py-1">
                            <div className="min-w-0">
                              <span className="text-[10px] text-gray-500">{p.label}: </span>
                              <span className="text-xs text-gray-700 dark:text-gray-300">{p.phrase}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-[9px]">{p.frequency}x</Badge>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-500" onClick={() => handleDeletePattern(p.id)}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {g.conclusion_phrases.length > 0 && (
                      <div className="px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">Conclusion phrases</p>
                        {g.conclusion_phrases.slice(0, 10).map((p) => (
                          <div key={p.id} className="flex items-start justify-between gap-2 py-1">
                            <span className="text-xs text-gray-700 dark:text-gray-300 min-w-0">{p.phrase}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge variant="outline" className="text-[9px]">{p.frequency}x</Badge>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400 hover:text-red-500" onClick={() => handleDeletePattern(p.id)}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────── Helper components ────────── */

function SegmentedPill({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value === opt.value
              ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm font-medium"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FtStep({ n, label, active, children }: {
  n: number;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative pl-7 ${active ? "" : "opacity-50"}`}>
      <div className={`absolute left-0 top-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
        active ? "bg-purple-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
      }`}>
        {n}
      </div>
      <Label className="text-xs mb-1.5 block font-medium">{label}</Label>
      {children}
    </div>
  );
}
