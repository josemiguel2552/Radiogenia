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
  Loader2, Check, Eye, Upload, RefreshCw, Sparkles,
  Plug, Wand2, GraduationCap, Brain, Pencil, X, RotateCcw, Search,
} from "lucide-react";
import { PROVIDERS, LANGUAGES, MODALITIES, type AIProvider, type FindingsLength, type NormalFieldsVerbosity, type ParaphraseLevel, type OutputLanguage } from "@/lib/types";
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

interface NormalityPhraseRow {
  modality: string;
  section_label: string;
  default_phrase: string;
  phrase: string;
  is_customized: boolean;
}

export function ModelConfigTab() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "radiologist">("radiologist");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Normality phrases
  const [normalityPhrases, setNormalityPhrases] = useState<NormalityPhraseRow[]>([]);
  const [selectedModality, setSelectedModality] = useState("CT");
  const [showNormality, setShowNormality] = useState(false);
  const [normalitySearch, setNormalitySearch] = useState("");
  const [savingPhrase, setSavingPhrase] = useState<string | null>(null);

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
      if (data.role) setUserRole(data.role);
      setConfig(data);
      setApiKey(data?.api_key_encrypted || "");
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

  useEffect(() => { load(); }, []);
  useEffect(() => { loadNormality(); }, [loadNormality]);

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

  if (loading || !config) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  const selectedProvider = PROVIDERS.find((p) => p.value === config.provider);
  const langLabel = LANGUAGES.find((l) => l.value === config.output_language)?.label || config.output_language;
  const customizedCount = normalityPhrases.filter((p) => p.is_customized).length;
  const filteredPhrases = normalitySearch
    ? normalityPhrases.filter((p) => p.section_label.toLowerCase().includes(normalitySearch.toLowerCase()))
    : normalityPhrases;

  return (
    <div className="space-y-3">
      {/* Active model summary card */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-shrink-0 h-9 w-9 rounded-full bg-accent-soft flex items-center justify-center">
          <Plug className="h-4 w-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
            {userRole === "admin" ? `${selectedProvider?.label || config.provider} / ${config.model_name}` : "AI Model — managed by admin"}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{langLabel}</p>
        </div>
        {dirty && (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] flex-shrink-0">
            Unsaved
          </Badge>
        )}
      </div>

      <Accordion type="single" collapsible defaultValue={userRole === "admin" ? "connection" : "writing"}>
        {/* Connection — admin only */}
        {userRole === "admin" && <AccordionItem value="connection">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Plug className="h-3.5 w-3.5 text-accent" />
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
        </AccordionItem>}

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

        {/* Normality Phrases */}
        <AccordionItem value="style">
          <AccordionTrigger className="text-sm font-semibold">
            <span className="flex items-center gap-2">
              <Brain className="h-3.5 w-3.5 text-emerald-500" />
              Normality phrases
              {customizedCount > 0 && (
                <Badge variant="secondary" className="text-[9px] ml-1">{customizedCount} customized</Badge>
              )}
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs">Use normality phrases</Label>
                <p className="text-[10px] text-gray-400">Inject your preferred phrases for normal sections into AI prompts.</p>
              </div>
              <Switch checked={config.style_learning_enabled} onCheckedChange={(v) => update("style_learning_enabled", v)} />
            </div>

            <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 space-y-2">
              <p className="text-[10px] text-gray-500">
                Each anatomical section has a default phrase for when it is normal (not mentioned in the dictation). Customize them to match your preferred wording.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">{selectedModality}</span> — {normalityPhrases.length} sections
                </span>
                <Badge variant={customizedCount > 0 ? "default" : "secondary"} className="text-[10px]">
                  {customizedCount}/{normalityPhrases.length} customized
                </Badge>
              </div>
            </div>

            <Button size="sm" variant="outline" className="w-full text-xs gap-1.5" onClick={() => setShowNormality(true)}>
              <Pencil className="h-3 w-3" />
              Edit normality phrases
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Fine-Tuning — admin only */}
        {userRole === "admin" && <AccordionItem value="finetune">
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
        </AccordionItem>}
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

      {/* Normality Phrases Editor Dialog */}
      <Dialog open={showNormality} onOpenChange={setShowNormality}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Normality Phrases</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 pb-2">
            <Select value={selectedModality} onValueChange={(v) => { setSelectedModality(v); setNormalitySearch(""); loadNormality(v); }}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODALITIES.filter((m) => m !== "Procedures").map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                value={normalitySearch}
                onChange={(e) => setNormalitySearch(e.target.value)}
                placeholder="Search sections..."
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
              <p className="text-xs text-gray-400 text-center py-6">No sections match your search.</p>
            )}
          </div>
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
          className="w-full text-xs border rounded-md px-2 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-600 resize-none focus:outline-none focus:ring-1 ring-accent"
        />
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => { setDraft(row.phrase); setEditing(false); }}>
            <X className="h-2.5 w-2.5 mr-1" />Cancel
          </Button>
          <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleSave}>
            <Check className="h-2.5 w-2.5 mr-1" />Save
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
            <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-accent" onClick={() => setEditing(true)} title="Edit">
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            {row.is_customized && (
              <Button variant="ghost" size="icon" className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-amber-500" onClick={onReset} title="Reset to default">
                <RotateCcw className="h-2.5 w-2.5" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
              ? "bg-white dark:bg-gray-900 text-accent shadow-sm font-medium"
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
