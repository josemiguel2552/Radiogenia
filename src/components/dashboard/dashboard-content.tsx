"use client";

import { useState, useEffect, useMemo } from "react";
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
  ScanSearch,
} from "lucide-react";
import { MODALITIES, SECTIONS, type UserTemplate } from "@/lib/types";
import { StatsPanel } from "./stats-panel";
import { HighlightedText, TraceLegend, useTraceHighlights, type TraceData } from "./trace-highlight";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { AnatomyLoader } from "./anatomy-loader";
import { FloatingDictation } from "./floating-dictation";
import { useT, useSection } from "@/lib/i18n";

export function DashboardContent() {
  const supabase = createClient();
  const t = useT();
  const sec = useSection();

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
  const [voiceError, setVoiceError] = useState<string | null>(null);

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
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceActive, setTraceActive] = useState(false);
  const [loadingTrace, setLoadingTrace] = useState(false);

  // Whisper voice dictation
  const LANG_TO_WHISPER: Record<string, string> = { es: "es", en: "en", pt: "pt", fr: "fr", de: "de", it: "it" };
  const { isRecording, isTranscribing, toggleRecording } = useVoiceDictation({
    language: LANG_TO_WHISPER[outputLanguage] || "es",
    context: "Radiology report dictation. Medical terminology.",
    onTranscript: (text) => {
      setDictation((prev) => {
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + text;
      });
      setTraceData(null);
      setVoiceError(null);
    },
    onError: (err) => setVoiceError(err),
  });

  // Autosave draft
  useEffect(() => {
    const interval = setInterval(() => {
      if (dictation || findings || conclusion || recommendations || clinicalInfo) {
        localStorage.setItem("radiogenai_draft", JSON.stringify({
          clinicalInfo, dictation, findings, conclusion, recommendations,
          selectedModality, selectedSection, selectedTemplateId, contrastOption,
          initialFindings, initialConclusion,
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clinicalInfo, dictation, findings, conclusion, recommendations, selectedModality, selectedSection, selectedTemplateId, contrastOption]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("radiogenai_draft");
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
        if (d.initialFindings) setInitialFindings(d.initialFindings);
        if (d.initialConclusion) setInitialConclusion(d.initialConclusion);
      } catch { /* ignore corrupt draft */ }
    }
  }, []);

  // Seed defaults (if needed) then load templates
  useEffect(() => {
    async function seedAndLoad() {
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch { /* seed may already exist */ }
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
    }
    seedAndLoad();
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

  // Voice recording is handled by useVoiceDictation hook above

  // Generate report
  async function handleGenerate() {
    if (!selectedTemplate || !dictation.trim()) return;

    const templateText = selectedTemplate.structure?.template || "";

    setLoadingFindings(true);
    setLoadingConclusion(true);
    setLoadingRecs(true);
    setFindings("");
    setConclusion("");
    setRecommendations("");
    setInitialFindings("");
    setInitialConclusion("");
    setTraceData(null);
    setTraceActive(false);

    const studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    // Stream findings — text appears progressively
    let findingsText = "";
    try {
      const res = await fetch("/api/generate/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateText,
          dictation,
          modality: selectedTemplate.modality,
          studyType: studyName,
        }),
      });

      if (res.ok && res.body) {
        const lang = res.headers.get("X-Output-Language") || "es";
        setOutputLanguage(lang);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          findingsText += decoder.decode(value, { stream: true });
          setFindings(cleanReport(findingsText));
        }
        findingsText = cleanReport(findingsText);
        setInitialFindings(findingsText);
        setFindings(findingsText);
      } else {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        setFindings(data.error || "Error generating findings");
      }
    } catch (e) {
      setFindings("Error: " + (e instanceof Error ? e.message : "Unknown error"));
    }
    setLoadingFindings(false);

    if (!findingsText) {
      setLoadingConclusion(false);
      setLoadingRecs(false);
      return;
    }

    // Stream conclusion + fetch recommendations in parallel
    const conclusionPromise = (async () => {
      try {
        const res = await fetch("/api/generate/conclusion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingsText,
            clinicalInfo,
            modality: selectedTemplate.modality,
            studyType: studyName,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let text = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
            setConclusion(cleanReport(text));
          }
          const cleaned = cleanReport(text);
          setInitialConclusion(cleaned);
          setConclusion(cleaned);
        } else {
          const data = await res.json().catch(() => ({ error: "Generation failed" }));
          setConclusion(data.error || "Error generating conclusion");
        }
      } catch (e) {
        setConclusion("Error: " + (e instanceof Error ? e.message : "Unknown error"));
      } finally {
        setLoadingConclusion(false);
      }
    })();

    const recsPromise = fetch("/api/generate/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ findingsText }),
    })
      .then((r) => r.json())
      .then((data) => {
        setRecommendations(data.text ? cleanReport(data.text) : data.error || "");
      })
      .catch((e) => {
        setRecommendations("Error: " + e.message);
      })
      .finally(() => {
        setLoadingRecs(false);
      });

    await Promise.all([conclusionPromise, recsPromise]);
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

  async function runTrace() {
    if (!dictation.trim() || !findings.trim()) return;
    setLoadingTrace(true);
    setTraceActive(true);
    try {
      const res = await fetch("/api/generate/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dictation, findings }),
      });
      if (res.ok) {
        const data = await res.json();
        setTraceData(data);
      }
    } catch (e) {
      console.error("Trace failed:", e);
    } finally {
      setLoadingTrace(false);
    }
  }

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const { dictationHighlights, findingsHighlights } = useTraceHighlights(dictation, findings, traceActive ? traceData : null);

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
      window.dispatchEvent(new Event("radiogenai:report-saved"));
    }
    setDictation("");
    setFindings("");
    setConclusion("");
    setRecommendations("");
    setInitialFindings("");
    setInitialConclusion("");
    setClinicalInfo("");
    setTraceData(null);
    setTraceActive(false);
    localStorage.removeItem("radiogenai_draft");
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
            <Wand2 className="h-5 w-5 text-accent" />
            {t("dash.new_report_title")}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t("dash.new_report_hint")}
          </p>
        </div>
        {hasOutput && (
          <Button variant="outline" size="sm" onClick={startNewReport} className="gap-1.5 text-xs">
            <ArrowRight className="h-3.5 w-3.5" />
            {t("dash.next_report")}
          </Button>
        )}
      </div>

      {/* Step 1 — Setup */}
      <StepCard
        step={1}
        title={t("dash.study_setup")}
        description={t("dash.study_setup_hint")}
        complete={setupReady}
        icon={<FileText className="h-4 w-4" />}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
              {t("dash.modality")}
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
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">
                {t("dash.region")}
              </Label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedTemplateId(""); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder={t("dash.any_region")} /></SelectTrigger>
                <SelectContent>
                  {(filteredSections.length > 0 ? filteredSections : SECTIONS.map(String)).map((s) => (
                    <SelectItem key={s} value={s}>{sec(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1.5 block">
                {t("dash.template")}
              </Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={filteredTemplates.length === 0 ? t("dash.no_templates") : t("dash.select_template")} />
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
            <Label className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 block">
              {t("dash.contrast")}
            </Label>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
              {[
                { v: "default", l: t("dash.default") },
                { v: "con_contraste", l: t("dash.with_contrast") },
                { v: "sin_contraste", l: t("dash.without_contrast") },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setContrastOption(opt.v)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    contrastOption === opt.v
                      ? "bg-white dark:bg-gray-900 text-accent shadow-sm font-medium"
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
        title={t("dash.clinical_context")}
        description={t("dash.clinical_context_hint")}
        complete={!!clinicalInfo.trim()}
        icon={<Stethoscope className="h-4 w-4" />}
      >
        <Textarea
          placeholder={t("dash.clinical_placeholder")}
          value={clinicalInfo}
          onChange={(e) => setClinicalInfo(e.target.value)}
          className="min-h-[64px] text-sm resize-none"
        />
        <p className="text-[11px] text-gray-400 mt-1.5">
          {t("dash.clinical_conclusion_hint")}
        </p>
      </StepCard>

      {/* Step 3 — Dictation */}
      <StepCard
        step={3}
        title={t("dash.dictation_title")}
        description={t("dash.dictation_hint")}
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
                {isRecording ? t("dash.listening") : isTranscribing ? t("dash.transcribing") : t("dash.voice_dictation")}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {isRecording ? t("dash.click_to_stop") : isTranscribing ? t("dash.processing_audio") : t("dash.click_to_start")}
              </p>
            </div>
            {isRecording && (
              <Badge className="bg-red-500 text-white animate-pulse">REC</Badge>
            )}
            {!isRecording && isTranscribing && (
              <Badge className="bg-blue-500 text-white animate-pulse gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
          {voiceError && (
            <p className="text-xs text-red-500 dark:text-red-400 px-1">{voiceError}</p>
          )}

          {traceActive && dictationHighlights.length > 0 ? (
            <div>
              <HighlightedText text={dictation} highlights={dictationHighlights} isDark={isDark} />
              <button
                type="button"
                onClick={() => setTraceActive(false)}
                className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-1 underline underline-offset-2"
              >
                {t("dash.back_to_edit")}
              </button>
            </div>
          ) : (
            <Textarea
              placeholder={t("dash.dictation_placeholder")}
              value={dictation}
              onChange={(e) => { setDictation(e.target.value); setTraceData(null); }}
              className="min-h-[140px] text-sm"
            />
          )}

          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full h-10 gap-2 bg-gradient-to-r from-accent to-accent-dark shadow-accent hover:opacity-90 disabled:opacity-50 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dash.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {t("dash.generate")}
              </>
            )}
          </Button>
          {!setupReady && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
              {t("dash.select_template_first")}
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
              {t("dash.generated_report")}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
          </div>

          {/* Anatomy animation — shown only during initial wait (no text yet) */}
          {isGenerating && !findings && !conclusion && !recommendations && (
            <Card>
              <CardContent className="p-0">
                <AnatomyLoader />
              </CardContent>
            </Card>
          )}

          {/* Trace controls */}
          {findings && !loadingFindings && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={traceActive ? () => setTraceActive(false) : runTrace}
                disabled={loadingTrace || !dictation.trim()}
                className="gap-1.5 text-xs"
              >
                {loadingTrace ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ScanSearch className="h-3.5 w-3.5" />
                )}
                {traceActive ? t("dash.exit_trace") : t("dash.trace")}
              </Button>
            </div>
          )}

          {/* Trace legend */}
          {traceActive && traceData && (
            <Card>
              <CardContent className="p-3">
                <TraceLegend trace={traceData} isDark={isDark} />
              </CardContent>
            </Card>
          )}

          <OutputCard
            title={t("dash.findings")}
            icon={<FileText className="h-4 w-4 text-accent" />}
            loading={loadingFindings}
            value={findings}
            onChange={(v) => { setFindings(v); setTraceData(null); }}
            minHeight={170}
            traceHighlights={traceActive ? findingsHighlights : undefined}
            isDark={isDark}
          />

          <OutputCard
            title={t("dash.conclusion")}
            icon={<CircleCheck className="h-4 w-4 text-green-600" />}
            loading={loadingConclusion}
            value={conclusion}
            onChange={setConclusion}
            minHeight={90}
          />

          <RecommendationsCard
            loading={loadingRecs}
            value={recommendations}
            onChange={setRecommendations}
          />

          {/* Action bar */}
          <Card className="sticky bottom-4 shadow-lg border-accent-soft bg-white/95 dark:bg-gray-900/95 backdrop-blur">
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
                    {t("dash.findings")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFormatted("findings_conclusion")}
                    disabled={!findings || !conclusion}
                    className="gap-1.5 text-xs"
                  >
                    {copied === "fc" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {t("dash.plus_conclusion")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyFormatted("full")}
                    disabled={!findings}
                    className="gap-1.5 text-xs"
                  >
                    {copied === "all" ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {t("dash.full_report")}
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={startNewReport}
                  disabled={!findings}
                  className="gap-1.5 text-xs bg-accent text-white hover:opacity-90"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  {t("dash.next_report")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FloatingDictation
        language={LANG_TO_WHISPER[outputLanguage] || "es"}
        onSendText={(text) => {
          setDictation((prev) => {
            const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
            return prev + sep + text;
          });
        }}
      />
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
    <Card className={`overflow-hidden transition-colors ${complete ? "border-accent-soft" : ""}`}>
      <div className="flex items-start gap-3 px-5 pt-5">
        <div
          className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
            complete
              ? "bg-accent text-white"
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
  traceHighlights,
  isDark,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  minHeight: number;
  traceHighlights?: { start: number; end: number; colorIdx: number; fragment: string; section?: string; isUnmatched?: boolean }[];
  isDark?: boolean;
}) {
  const showTrace = traceHighlights && traceHighlights.length > 0;
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
      </div>
      <CardContent className="pt-0 pb-4">
        {loading && !value ? (
          <div
            className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700/50 dark:to-gray-800 animate-pulse rounded-md"
            style={{ height: minHeight }}
          />
        ) : loading && value ? (
          <div
            className="whitespace-pre-wrap text-sm leading-relaxed p-3 border rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
            style={{ minHeight }}
          >
            {value}
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-accent animate-pulse align-text-bottom" />
          </div>
        ) : showTrace ? (
          <HighlightedText text={value} highlights={traceHighlights} isDark={!!isDark} />
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

/* ── Recommendations with traceability ── */

interface ParsedRec {
  number: string;
  recommendation: string;
  guideline: string;
  finding: string;
}

const REC_COLORS = [
  { bg: "rgba(245,158,11,0.12)", border: "#f59e0b", dark: "rgba(251,191,36,0.18)" },
  { bg: "rgba(249,115,22,0.12)", border: "#f97316", dark: "rgba(251,146,60,0.18)" },
  { bg: "rgba(239,68,68,0.12)",  border: "#ef4444", dark: "rgba(248,113,113,0.18)" },
  { bg: "rgba(168,85,247,0.12)", border: "#a855f7", dark: "rgba(192,132,252,0.18)" },
  { bg: "rgba(59,130,246,0.12)", border: "#3b82f6", dark: "rgba(96,165,250,0.18)" },
];

function parseRecommendations(text: string): ParsedRec[] {
  const lines = text.split("\n").filter(l => l.trim());
  const results: ParsedRec[] = [];

  for (const line of lines) {
    const m = line.match(
      /^(\d+)\.\s*(.+?)\s*\(([^)]+)\)\s*[-—–]\s*(?:Hallazgo|Finding|Achado|Résultat|Befund|Reperto)\s*:\s*(.+?)\.?\s*$/i
    );
    if (m) {
      results.push({ number: m[1], recommendation: m[2].trim(), guideline: m[3].trim(), finding: m[4].trim() });
    }
  }
  return results;
}

function RecommendationsCard({
  loading,
  value,
  onChange,
}: {
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const parsed = useMemo(() => parseRecommendations(value), [value]);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const hasStructured = parsed.length > 0 && !editing;
  const noRecs = !loading && value.trim() && parsed.length === 0 && !editing;
  const t = useT();

  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          {t("dash.recommendations")}
        </h3>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />}
          {!loading && value.trim() && (
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
            >
              {editing ? t("view") : t("edit")}
            </button>
          )}
        </div>
      </div>
      <CardContent className="pt-0 pb-4">
        {loading ? (
          <div
            className="bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-700/50 dark:to-gray-800 animate-pulse rounded-md"
            style={{ height: 70 }}
          />
        ) : editing ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm leading-relaxed"
            style={{ minHeight: 70 }}
          />
        ) : hasStructured ? (
          <div className="space-y-2">
            {parsed.map((rec, i) => {
              const color = REC_COLORS[i % REC_COLORS.length];
              return (
                <div
                  key={i}
                  className="rounded-lg p-3 border text-sm"
                  style={{
                    backgroundColor: isDark ? color.dark : color.bg,
                    borderColor: color.border + "40",
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className="flex-shrink-0 mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: color.border }}
                    >
                      {rec.number}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-gray-900 dark:text-gray-100 font-medium">{rec.recommendation}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">({rec.guideline})</p>
                      <div className="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t" style={{ borderColor: color.border + "30" }}>
                        <ArrowRight className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: color.border }} />
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          <span className="font-medium" style={{ color: color.border }}>{t("dash.finding_label")}: </span>
                          {rec.finding}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : noRecs ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{value}</p>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm leading-relaxed"
            style={{ minHeight: 70 }}
          />
        )}
      </CardContent>
    </Card>
  );
}
