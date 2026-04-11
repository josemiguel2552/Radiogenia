"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Check, Info, Eye, Trash2, Plus, Upload, RefreshCw, Sparkles } from "lucide-react";
import { PROVIDERS, LANGUAGES, MODALITIES, type AIProvider, type FindingsLength, type NormalFieldsVerbosity, type ParaphraseLevel, type OutputLanguage, type StyleSample } from "@/lib/types";
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

export function ModelConfigTab() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Style samples
  const [samples, setSamples] = useState<StyleSample[]>([]);
  const [showSamples, setShowSamples] = useState(false);
  const [showAddSample, setShowAddSample] = useState(false);
  const [sampleFindings, setSampleFindings] = useState("");
  const [sampleConclusion, setSampleConclusion] = useState("");
  const [sampleModality, setSampleModality] = useState("CT");
  const [sampleStudyType, setSampleStudyType] = useState("");

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

  async function loadSamples() {
    const res = await fetch("/api/style-samples");
    if (res.ok) setSamples(await res.json());
  }

  useEffect(() => { load(); loadSamples(); }, []);

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

  async function handleDeleteSample(id: string) {
    await fetch(`/api/style-samples?id=${id}`, { method: "DELETE" });
    loadSamples();
    load();
  }

  async function handleClearAllSamples() {
    if (!confirm("Clear all style samples?")) return;
    await fetch("/api/style-samples?id=all", { method: "DELETE" });
    loadSamples();
    load();
  }

  async function handleAddSample() {
    if (!sampleFindings.trim()) return;
    await fetch("/api/style-samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        findings_text: sampleFindings,
        conclusion_text: sampleConclusion,
        modality: sampleModality,
        study_type: sampleStudyType,
      }),
    });
    setSampleFindings("");
    setSampleConclusion("");
    setSampleStudyType("");
    setShowAddSample(false);
    loadSamples();
    load();
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

  // Style learning progress
  const styleLevel = config.style_sample_count < 5 ? "No data" :
    config.style_sample_count < 15 ? "Initial" :
    config.style_sample_count < 30 ? "Developing" : "Consolidated";
  const styleProgress = Math.min((config.style_sample_count / 30) * 100, 100);

  // Samples by modality
  const samplesByModality: Record<string, number> = {};
  samples.forEach((s) => { samplesByModality[s.modality] = (samplesByModality[s.modality] || 0) + 1; });

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {dirty && (
          <Badge variant="warning" className="w-full justify-center bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            Configuration modified — unsaved
          </Badge>
        )}

        <Accordion type="multiple" defaultValue={["provider", "params", "style"]}>
          {/* Block A: Provider */}
          <AccordionItem value="provider">
            <AccordionTrigger className="text-sm font-semibold">Provider & Model</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div>
                <Label className="text-xs">Provider</Label>
                <Select value={config.provider} onValueChange={(v) => update("provider", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Model</Label>
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
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {selectedProvider.models.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )
                ) : (
                  <Input value={config.model_name} onChange={(e) => update("model_name", e.target.value)} placeholder="Model name" />
                )}
              </div>

              {config.provider === "custom" && (
                <div>
                  <Label className="text-xs">Custom endpoint URL</Label>
                  <Input value={config.custom_base_url} onChange={(e) => update("custom_base_url", e.target.value)} placeholder="https://..." />
                </div>
              )}

              <div>
                <Label className="text-xs">API Key</Label>
                <Input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setDirty(true); }} placeholder="Enter API key" />
                <p className="text-[10px] text-gray-400 mt-1">Encrypted with AES-256. Only used for your authenticated calls.</p>
              </div>

              <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : testResult === true ? <Check className="h-3.5 w-3.5 text-green-500" /> : null}
                {testResult === true ? "Connected" : testResult === false ? "Failed" : "Test connection"}
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* Block B: Writing parameters */}
          <AccordionItem value="params">
            <AccordionTrigger className="text-sm font-semibold">Writing Parameters</AccordionTrigger>
            <AccordionContent className="space-y-4">
              {/* Findings length */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label className="text-xs">Findings length</Label>
                  <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                    <TooltipContent>Controls how detailed each section is written</TooltipContent>
                  </Tooltip>
                </div>
                <RadioGroup value={config.findings_length} onValueChange={(v) => update("findings_length", v)} className="space-y-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="concise" id="fl-c" /><Label htmlFor="fl-c" className="text-xs font-normal">Concise</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="standard" id="fl-s" /><Label htmlFor="fl-s" className="text-xs font-normal">Standard</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="detailed" id="fl-d" /><Label htmlFor="fl-d" className="text-xs font-normal">Detailed</Label></div>
                </RadioGroup>
              </div>

              {/* Normal fields verbosity */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label className="text-xs">Normal fields verbosity</Label>
                  <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                    <TooltipContent>How unmentioned sections are filled with normal text</TooltipContent>
                  </Tooltip>
                </div>
                <RadioGroup value={config.normal_fields_verbosity} onValueChange={(v) => update("normal_fields_verbosity", v)} className="space-y-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="minimal" id="nv-m" /><Label htmlFor="nv-m" className="text-xs font-normal">Minimal</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="standard" id="nv-s" /><Label htmlFor="nv-s" className="text-xs font-normal">Standard</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="explicit" id="nv-e" /><Label htmlFor="nv-e" className="text-xs font-normal">Explicit</Label></div>
                </RadioGroup>
              </div>

              {/* Paraphrase level */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label className="text-xs">Paraphrase level</Label>
                  <Tooltip><TooltipTrigger><Info className="h-3 w-3 text-gray-400" /></TooltipTrigger>
                    <TooltipContent>Controls if the model can rewrite dictated findings</TooltipContent>
                  </Tooltip>
                </div>
                <RadioGroup value={config.paraphrase_level} onValueChange={(v) => update("paraphrase_level", v)} className="space-y-1">
                  <div className="flex items-center gap-2"><RadioGroupItem value="none" id="pp-n" /><Label htmlFor="pp-n" className="text-xs font-normal">No paraphrase</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="light" id="pp-l" /><Label htmlFor="pp-l" className="text-xs font-normal">Light paraphrase</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="free" id="pp-f" /><Label htmlFor="pp-f" className="text-xs font-normal">Free paraphrase</Label></div>
                </RadioGroup>
              </div>

              {/* Language */}
              <div>
                <Label className="text-xs">Output language</Label>
                <Select value={config.output_language} onValueChange={(v) => update("output_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Block C: Style Learning */}
          <AccordionItem value="style">
            <AccordionTrigger className="text-sm font-semibold">Style Learning</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Enable style learning</Label>
                <Switch checked={config.style_learning_enabled} onCheckedChange={(v) => update("style_learning_enabled", v)} />
              </div>

              {config.style_learning_enabled && (
                <>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{config.style_sample_count} samples</span>
                      <span className="text-gray-500">{styleLevel}</span>
                    </div>
                    <Progress value={styleProgress} className="h-2" />
                  </div>

                  {/* Samples by modality */}
                  {Object.keys(samplesByModality).length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Samples by modality:</Label>
                      {Object.entries(samplesByModality).map(([mod, count]) => (
                        <div key={mod} className="flex justify-between text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded">
                          <span>{mod}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Few-shot count */}
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <Label className="text-xs">Few-shot examples: {config.few_shot_count}</Label>
                    </div>
                    <Slider value={[config.few_shot_count]} min={1} max={5} step={1} onValueChange={(v) => update("few_shot_count", v[0])} />
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowSamples(true); loadSamples(); }}>
                      Manage samples
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowAddSample(true)}>
                      <Plus className="h-3 w-3" /> Add manually
                    </Button>
                  </div>

                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-[10px] text-blue-700 dark:text-blue-300">
                    <Info className="h-3 w-3 inline mr-1" />
                    Style learning injects examples of your own previous reports into the model prompt. It does not fine-tune the base model. Examples are selected by modality and study type similarity. Your reports are never shared or used outside your session.
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Block D: Fine-Tuning */}
          <AccordionItem value="finetune">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                Fine-Tuning (OpenAI)
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {config.provider !== "openai" ? (
                <div className="p-2.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-700 dark:text-yellow-300">
                  <Info className="h-3 w-3 inline mr-1" />
                  Fine-tuning is only available with OpenAI. Switch your provider to OpenAI to use this feature.
                </div>
              ) : (
                <>
                  {/* Step 1: Upload training data */}
                  <input type="file" accept=".docx,.doc,.jsonl,.txt" ref={ftFileRef} onChange={handleFtUpload} className="hidden" />
                  <div>
                    <Label className="text-xs mb-1.5 block">1. Upload training data</Label>
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
                          <p className="text-xs text-gray-500">Word doc or JSONL with examples</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload result */}
                  {ftFileId && (
                    <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg text-xs text-green-700 dark:text-green-300">
                      <Check className="h-3 w-3 inline mr-1" />
                      {ftExamples} training examples uploaded successfully.
                    </div>
                  )}

                  {/* Step 2: Configure & start */}
                  {ftFileId && (
                    <div className="space-y-2">
                      <Label className="text-xs mb-1 block">2. Configure fine-tuning</Label>
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
                        <Label className="text-[10px] text-gray-500">Model suffix</Label>
                        <Input value={ftSuffix} onChange={(e) => setFtSuffix(e.target.value)} placeholder="radiogenia" className="h-8 text-xs" />
                      </div>
                      <Button size="sm" onClick={handleFtStart} disabled={ftStarting} className="w-full bg-purple-600 hover:bg-purple-700">
                        {ftStarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Start fine-tuning
                      </Button>
                    </div>
                  )}

                  {/* Step 3: Job status */}
                  {ftJobId && (
                    <div className="space-y-2">
                      <Label className="text-xs mb-1 block">3. Training status</Label>
                      <div className="p-2.5 border rounded-lg text-xs dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-500">Job:</span>
                          <span className="font-mono text-[10px]">{ftJobId.slice(0, 20)}...</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Status:</span>
                          <Badge variant={
                            ftStatus === "succeeded" ? "default" :
                            ftStatus === "failed" ? "destructive" :
                            "secondary"
                          } className="text-[10px]">
                            {ftStatus || "unknown"}
                          </Badge>
                        </div>
                        {ftModel && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-500">Model:</span>
                            <span className="font-mono text-[10px] text-green-600">{ftModel}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={handleFtCheckStatus} disabled={ftChecking} className="flex-1 text-xs">
                          {ftChecking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          Check status
                        </Button>
                        {ftModel && (
                          <Button size="sm" onClick={useFtModel} className="flex-1 text-xs bg-green-600 hover:bg-green-700">
                            <Check className="h-3 w-3" /> Use this model
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Previous jobs */}
                  {!ftJobId && !ftFileId && (
                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={loadFtJobs}>
                      <RefreshCw className="h-3 w-3" /> Load previous jobs
                    </Button>
                  )}

                  {ftJobs.length > 0 && !ftJobId && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Previous fine-tuning jobs:</Label>
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

                  {/* Error */}
                  {ftError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-600 dark:text-red-400">
                      {ftError}
                    </div>
                  )}

                  <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-[10px] text-purple-700 dark:text-purple-300">
                    <Info className="h-3 w-3 inline mr-1" />
                    Fine-tuning trains a personalized OpenAI model with your reports. Upload a document with JSONL examples (system/user/assistant messages). Training typically takes 15-60 min and costs are billed by OpenAI based on tokens. Once trained, select the model to generate reports in your exact style.
                  </div>
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <Separator />

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !dirty} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save configuration"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setShowPrompt(true)} title="View active prompt">
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

        {/* Manage Samples Dialog */}
        <Dialog open={showSamples} onOpenChange={setShowSamples}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Style Samples</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {samples.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No samples yet</p>}
              {samples.map((s) => (
                <div key={s.id} className="p-3 border rounded-lg text-xs dark:border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-1 mb-1">
                        <Badge variant="secondary" className="text-[10px]">{s.modality}</Badge>
                        <Badge variant="outline" className="text-[10px]">{s.study_type}</Badge>
                        <span className="text-gray-400 text-[10px]">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 line-clamp-2">{s.findings_text}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDeleteSample(s.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="destructive" size="sm" onClick={handleClearAllSamples}>Clear all</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Sample Dialog */}
        <Dialog open={showAddSample} onOpenChange={setShowAddSample}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Style Sample</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Modality</Label>
                  <Select value={sampleModality} onValueChange={setSampleModality}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODALITIES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Study type</Label>
                  <Input value={sampleStudyType} onChange={(e) => setSampleStudyType(e.target.value)} placeholder="e.g. Chest CT scan" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Findings</Label>
                <Textarea value={sampleFindings} onChange={(e) => setSampleFindings(e.target.value)} className="min-h-[120px]" placeholder="Paste your findings text..." />
              </div>
              <div>
                <Label className="text-xs">Conclusion (optional)</Label>
                <Textarea value={sampleConclusion} onChange={(e) => setSampleConclusion(e.target.value)} className="min-h-[60px]" placeholder="Paste conclusion..." />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleAddSample} disabled={!sampleFindings.trim()}>Save sample</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
