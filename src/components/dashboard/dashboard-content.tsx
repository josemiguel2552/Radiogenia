"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Mic,
  MicOff,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Wand2,
  Lightbulb,
  Stethoscope,
  CircleCheck,
  ArrowRight,
} from "lucide-react";
import { MODALITIES, SECTIONS, type UserTemplate } from "@/lib/types";
import { StatsPanel } from "./stats-panel";

export function DashboardContent() {
  const supabase = createClient();

  // Templates state
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [selectedModality, setSelectedModality] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [contrastOption, setContrastOption] = useState<string>("default");

  // Clinical info state
  const [clinicalInfo, setClinicalInfo] = useState("");

  // Dictation state
  const [dictation, setDictation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Report output state
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [initialFindings, setInitialFindings] = useState("");
  const [initialConclusion, setInitialConclusion] = useState("");
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [loadingConclusion, setLoadingConclusion] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<string>("es");

  // Autosave draft
  useEffect(() => {
    const interval = setInterval(() => {
      if (dictation || findings || conclusion || recommendations || clinicalInfo) {
        localStorage.setItem("radiogenia_draft", JSON.stringify({
          clinicalInfo, dictation, findings, conclusion, recommendations,
          selectedModality, selectedSection, selectedTemplateId, contrastOption,
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clinicalInfo, dictation, findings, conclusion, recommendations, selectedModality, selectedSection, selectedTemplateId, contrastOption]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("radiogenia_draft");
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.clinicalInfo) setClinicalInfo(d.clinicalInfo);
        if (d.dictation) setDictation(d.dictation);
        if (d.findings) setFindings(d.findings);
        if (d.conclusion) setConclusion(d.conclusion);
        if (d.recommendations) setRecommendations(d.recommendations);
        if (d.selectedModality) setSelectedModality(d.selectedModality);
        if (d.selectedSection) setSelectedSection(d.selectedSection);
        if (d.selectedTemplateId) setSelectedTemplateId(d.selectedTemplateId);
        if (d.contrastOption) setContrastOption(d.contrastOption);
      } catch { /* ignore corrupt draft */ }
    }
  }, []);

  // Load templates
  useEffect(() => {
    async function load() {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
    }
    load();
  }, []);

  // Filtered data
  const filteredSections = [...new Set(
    templates
      .filter((t) => !selectedModality || t.modality === selectedModality)
      .map((t) => t.structure?.section)
      .filter(Boolean)
  )];

  const filteredTemplates = templates.filter((t) => {
    if (selectedModality && t.modality !== selectedModality) return false;
    if (selectedSection && t.structure?.section !== selectedSection) return false;
    return true;
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Voice recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "es-ES";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setDictation((prev) => prev + " " + transcript);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  }, [isRecording]);

  // Generate report
  async function handleGenerate() {
    if (!selectedTemplate || !dictation.trim()) return;

    const templateText = selectedTemplate.structure?.template || "";

    setLoadingFindings(true);
    setLoadingConclusion(true);
    setLoadingRecs(true);

    const studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    const findingsPromise = fetch("/api/generate/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: templateText,
        dictation,
        modality: selectedTemplate.modality,
        studyType: studyName,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.outputLanguage) setOutputLanguage(data.outputLanguage);
        const cleaned = data.text ? cleanReport(data.text) : data.error || "";
        setInitialFindings(cleaned);
        setFindings(cleaned);
        setLoadingFindings(false);
        return cleaned;
      })
      .catch((e) => {
        setFindings("Error: " + e.message);
        setLoadingFindings(false);
        return "";
      });

    const findingsText = await findingsPromise;

    if (findingsText) {
      fetch("/api/generate/conclusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findingsText,
          clinicalInfo,
          modality: selectedTemplate.modality,
          studyType: studyName,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          const cleaned = data.text ? cleanReport(data.text) : data.error || "";
          setInitialConclusion(cleaned);
          setConclusion(cleaned);
          setLoadingConclusion(false);
        })
        .catch((e) => {
          setConclusion("Error: " + e.message);
          setLoadingConclusion(false);
        });

      fetch("/api/generate/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingsText }),
      })
        .then((r) => r.json())
        .then((data) => {
          setRecommendations(data.text ? cleanReport(data.text) : data.error || "");
          setLoadingRecs(false);
        })
        .catch((e) => {
          setRecommendations("Error: " + e.message);
          setLoadingRecs(false);
        });
    } else {
      setLoadingConclusion(false);
      setLoadingRecs(false);
    }
  }

  function cleanReport(text: string): string {
    return text
      .replace(/\*{2,}(FINDINGS|HALLAZGOS|CONCLUSION|CONCLUSIÓN|CONCLUSIONES|RECOMMENDATIONS|RECOMENDACIONES)\*{2,}/gi, "")
      .replace(/^\s*(FINDINGS|HALLAZGOS|CONCLUSION|CONCLUSIÓN|CONCLUSIONES)\s*$/gim, "")
      .replace(/\*{2,3}([^*]+)\*{2,3}\s*:/g, (_match, name: string) => {
        const trimmed = name.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() + ":";
      })
      .replace(/\*{2,3}([^*]+)\*{2,3}/g, (_match, name: string) => {
        const trimmed = name.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      })
      .replace(/\*+/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  const SECTION_HEADERS: Record<string, { findings: string; conclusion: string; recommendations: string }> = {
    es: { findings: "HALLAZGOS", conclusion: "CONCLUSIÓN", recommendations: "RECOMENDACIONES" },
    en: { findings: "FINDINGS", conclusion: "CONCLUSION", recommendations: "RECOMMENDATIONS" },
    pt: { findings: "ACHADOS", conclusion: "CONCLUSÃO", recommendations: "RECOMENDAÇÕES" },
    fr: { findings: "RÉSULTATS", conclusion: "CONCLUSION", recommendations: "RECOMMANDATIONS" },
    de: { findings: "BEFUNDE", conclusion: "SCHLUSSFOLGERUNG", recommendations: "EMPFEHLUNGEN" },
    it: { findings: "REPERTI", conclusion: "CONCLUSIONE", recommendations: "RACCOMANDAZIONI" },
  };

  const CONTRAST_LABELS: Record<string, { with: string; without: string }> = {
    es: { with: "con contraste", without: "sin contraste" },
    en: { with: "with contrast", without: "without contrast" },
    pt: { with: "com contraste", without: "sem contraste" },
    fr: { with: "avec contraste", without: "sans contraste" },
    de: { with: "mit Kontrastmittel", without: "ohne Kontrastmittel" },
    it: { with: "con contrasto", without: "senza contrasto" },
  };

  function getStudyTitle(): string {
    if (!selectedTemplate) return "";
    let title = selectedTemplate.name;
    const cl = CONTRAST_LABELS[outputLanguage] || CONTRAST_LABELS.es;
    if (contrastOption === "con_contraste") title += " " + cl.with;
    else if (contrastOption === "sin_contraste") title += " " + cl.without;
    return title.toUpperCase();
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyFormatted(mode: "findings" | "findings_conclusion" | "full") {
    const title = getStudyTitle();
    const cleanFindings = cleanReport(findings);
    const cleanConclusion = cleanReport(conclusion);
    const cleanRecs = cleanReport(recommendations);
    const headers = SECTION_HEADERS[outputLanguage] || SECTION_HEADERS.es;

    let text = "";
    if (title) text += title + "\n\n";
    text += headers.findings + "\n" + cleanFindings;
    if (mode === "findings_conclusion" || mode === "full") {
      text += "\n\n" + headers.conclusion + "\n" + cleanConclusion;
    }
    if (mode === "full" && cleanRecs) {
      text += "\n\n" + headers.recommendations + "\n" + cleanRecs;
    }

    const id = mode === "findings" ? "f" : mode === "findings_conclusion" ? "fc" : "all";
    copyText(text, id);
  }

  async function saveReportQuietly() {
    if (!selectedTemplate || !findings) return;

    const studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    const { data: config } = await supabase.from("user_model_config").select("*").single();

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          study_type: studyName,
          modality: selectedTemplate.modality,
          contrast_option: contrastOption,
          raw_dictation: dictation,
          findings_text: findings,
          conclusion_text: conclusion,
          recommendations_text: recommendations,
          initial_findings_text: initialFindings || null,
          initial_conclusion_text: initialConclusion || null,
          template_snapshot: selectedTemplate.structure,
          model_config_snapshot: config,
        }),
      });
      if (!res.ok) {
        console.error("Failed to save report:", await res.text());
      }
    } catch (e) {
      console.error("Failed to save report:", e);
    }
  }

  async function startNewReport() {
    // Auto-save the current report (and trigger style learning) before clearing
    if (findings) {
      await saveReportQuietly();
      // Notify sidebar to refresh style learning stats
      window.dispatchEvent(new Event("radiogenia:report-saved"));
    }
    setDictation("");
    setFindings("");
    setConclusion("");
    setRecommendations("");
    setInitialFindings("");
    setInitialConclusion("");
    setClinicalInfo("");
    localStorage.removeItem("radiogenia_draft");
  }

  const isGenerating = loadingFindings || loadingConclusion || loadingRecs;
  const hasOutput = findings || conclusion || recommendations || isGenerating;
  const setupReady = !!selectedTemplate;
  const canGenerate = setupReady && dictation.trim() && !isGenerating;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <StatsPanel />

      {/* Workflow header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-blue-600" />
            New report
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Pick a template, add the clinical context, dictate, and let AI assemble the report.
          </p>
        </div>
        {hasOutput && (
          <Button variant="outline" size="sm" onClick={startNewReport} className="gap-1.5 text-xs">
            <ArrowRight className="h-3.5 w-3.5" />
            Next report
          </Button>
        )}
      </div>

      {/* Step 1 — Setup */}
      <StepCard
        step={1}
        title="Study setup"
        description="Choose modality, anatomy and template"
        complete={setupReady}
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">
              Modality
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {MODALITIES.map((mod) => (
                <Button
                  key={mod}
                  variant={selectedModality === mod ? "default" : "outline"}
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    setSelectedModality(selectedModality === mod ? "" : mod);
                    setSelectedSection("");
                    setSelectedTemplateId("");
                  }}
                >
                  {mod}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">
                Anatomical region
              </Label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedTemplateId(""); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Any region" /></SelectTrigger>
                <SelectContent>
                  {(filteredSections.length > 0 ? filteredSections : SECTIONS.map(String)).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5 block">
                Template
              </Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={filteredTemplates.length === 0 ? "No templates available" : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 block">
              Contrast
            </Label>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
              {[
                { v: "default", l: "Default" },
                { v: "con_contraste", l: "With contrast" },
                { v: "sin_contraste", l: "Without contrast" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setContrastOption(opt.v)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    contrastOption === opt.v
                      ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm font-medium"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </StepCard>

      {/* Step 2 — Clinical context */}
      <StepCard
        step={2}
        title="Clinical context"
        description="Reason for the study and clinical question (optional)"
        complete={!!clinicalInfo.trim()}
        icon={<Stethoscope className="h-4 w-4" />}
      >
        <Textarea
          placeholder="e.g. 58-year-old male with right upper quadrant pain. Rule out cholelithiasis."
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          className="min-h-[64px] text-sm resize-none"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          The conclusion will prioritize answering this clinical question.
        </p>
      </StepCard>

      {/* Step 3 — Dictation */}
      <StepCard
        step={3}
        title="Dictation"
        description="Speak or type your findings — the AI will format them"
        complete={!!dictation.trim()}
        icon={<Mic className="h-4 w-4" />}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button
              variant={isRecording ? "destructive" : "default"}
              size="icon"
              className={`relative h-10 w-10 rounded-full ${isRecording ? "recording-pulse" : ""}`}
              onClick={toggleRecording}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-900 dark:text-white">
                {isRecording ? "Listening…" : "Voice dictation"}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isRecording ? "Click the mic to stop" : "Click the mic to start dictating, or type below"}
              </p>
            </div>
            {isRecording && (
              <Badge className="bg-red-500 text-white animate-pulse">REC</Badge>
            )}
          </div>

          <Textarea
            placeholder="Type or dictate your findings here..."
            value={dictation}
            onChange={(e) => setDictation(e.target.value)}
            className="min-h-[140px] text-sm"
          />

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-10 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating report…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate report
              </>
            )}
          </Button>
          {!setupReady && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
              Pick a template above to enable generation.
            </p>
          )}
        </div>
      </StepCard>

      {/* Output */}
      {hasOutput && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pt-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
              Generated report
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
          </div>

          <OutputCard
            title="Findings"
            icon={<FileText className="h-4 w-4 text-blue-600" />}
            loading={loadingFindings}
            value={findings}
            onChange={setFindings}
            minHeight={170}
          />

          <OutputCard
            title="Conclusion"
            icon={<CircleCheck className="h-4 w-4 text-green-600" />}
            loading={loadingConclusion}
            value={conclusion}
            onChange={setConclusion}
            minHeight={90}
          />

          <OutputCard
            title="Recommendations"
            icon={<Lightbulb className="h-4 w-4 text-amber-600" />}
            loading={loadingRecs}
            value={recommendations}
            onChange={setRecommendations}
            minHeight={70}
          />

          {/* Action bar */}
          <Card className="sticky bottom-4 shadow-lg border-blue-100 dark:border-blue-900/50 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFormatted("findings")}
                    disabled={!findings}
                    className="gap-1.5 text-xs"
                  >
                    {copied === "f" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Findings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFormatted("findings_conclusion")}
                    disabled={!findings || !conclusion}
                    className="gap-1.5 text-xs"
                  >
                    {copied === "fc" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    + Conclusion
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFormatted("full")}
                    disabled={!findings}
                    className="gap-1.5 text-xs"
                  >
                    {copied === "all" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    Full report
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={startNewReport}
                  disabled={!findings}
                  className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Next report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

/* ────────── Helper components ────────── */

function StepCard({
  step,
  title,
  description,
  complete,
  icon,
  children,
}: {
  step: number;
  title: string;
  description: string;
  complete: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className={`overflow-hidden transition-colors ${complete ? "border-blue-100 dark:border-blue-900/40" : ""}`}>
      <div className="flex items-start gap-3 px-5 pt-5">
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
            complete
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          {complete ? <Check className="h-4 w-4" /> : step}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            {icon}
            {title}
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
      </div>
      <CardContent className="pt-4 pl-[3.75rem] pr-5 pb-5">{children}</CardContent>
    </Card>
  );
}

function OutputCard({
  title,
  icon,
  loading,
  value,
  onChange,
  minHeight,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  minHeight: number;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />}
      </div>
      <CardContent className="pt-0 pb-4">
        {loading ? (
          <div
            className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700/50 dark:to-gray-800 animate-pulse rounded-md"
            style={{ height: minHeight }}
          />
        ) : (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm leading-relaxed"
            style={{ minHeight }}
          />
        )}
      </CardContent>
    </Card>
  );
}
