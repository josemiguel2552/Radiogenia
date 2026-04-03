"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { BarChart3, FileText, Mic, MicOff, Loader2, Copy, Save, Check } from "lucide-react";
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

  // Dictation state
  const [dictation, setDictation] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Report output state
  const [findings, setFindings] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [loadingConclusion, setLoadingConclusion] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [outputLanguage, setOutputLanguage] = useState<string>("es");

  // Autosave draft
  useEffect(() => {
    const interval = setInterval(() => {
      if (dictation || findings || conclusion || recommendations) {
        localStorage.setItem("radiogenia_draft", JSON.stringify({
          dictation, findings, conclusion, recommendations,
          selectedModality, selectedSection, selectedTemplateId, contrastOption,
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [dictation, findings, conclusion, recommendations, selectedModality, selectedSection, selectedTemplateId, contrastOption]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem("radiogenia_draft");
    if (draft) {
      try {
        const d = JSON.parse(draft);
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

    // Launch all 3 agents in parallel
    setLoadingFindings(true);
    setLoadingConclusion(true);
    setLoadingRecs(true);

    // Agent 1: Findings
    const findingsPromise = fetch("/api/generate/findings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: templateText, dictation, modality: selectedTemplate.modality }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.outputLanguage) setOutputLanguage(data.outputLanguage);
        const cleaned = data.text ? cleanReport(data.text) : data.error || "";
        setFindings(cleaned);
        setLoadingFindings(false);
        return cleaned;
      })
      .catch((e) => {
        setFindings("Error: " + e.message);
        setLoadingFindings(false);
        return "";
      });

    // Wait for findings before launching conclusion & recs
    const findingsText = await findingsPromise;

    if (findingsText) {
      // Agent 2: Conclusion
      fetch("/api/generate/conclusion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingsText }),
      })
        .then((r) => r.json())
        .then((data) => {
          setConclusion(data.text ? cleanReport(data.text) : data.error || "");
          setLoadingConclusion(false);
        })
        .catch((e) => {
          setConclusion("Error: " + e.message);
          setLoadingConclusion(false);
        });

      // Agent 3: Recommendations
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

  // Clean AI output: strip asterisks/markdown artifacts, fix casing
  function cleanReport(text: string): string {
    return text
      // Remove **** section markers like ****FINDINGS**** or ****CONCLUSION****
      .replace(/\*{2,}(FINDINGS|HALLAZGOS|CONCLUSION|CONCLUSIÓN|CONCLUSIONES|RECOMMENDATIONS|RECOMENDACIONES)\*{2,}/gi, "")
      // Remove standalone section headers like "FINDINGS", "CONCLUSION" on their own line
      .replace(/^\s*(FINDINGS|HALLAZGOS|CONCLUSION|CONCLUSIÓN|CONCLUSIONES)\s*$/gim, "")
      // Convert ***Section***: or **Section**: to Sentence case:
      .replace(/\*{2,3}([^*]+)\*{2,3}\s*:/g, (_match, name: string) => {
        const trimmed = name.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase() + ":";
      })
      // Convert remaining ***Section*** or **Section** (no colon) to Sentence case
      .replace(/\*{2,3}([^*]+)\*{2,3}/g, (_match, name: string) => {
        const trimmed = name.trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      })
      // Remove any remaining stray asterisks
      .replace(/\*+/g, "")
      // Clean up excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  // Section headers by language
  const SECTION_HEADERS: Record<string, { findings: string; conclusion: string; recommendations: string }> = {
    es: { findings: "HALLAZGOS", conclusion: "CONCLUSIÓN", recommendations: "RECOMENDACIONES" },
    en: { findings: "FINDINGS", conclusion: "CONCLUSION", recommendations: "RECOMMENDATIONS" },
    pt: { findings: "ACHADOS", conclusion: "CONCLUSÃO", recommendations: "RECOMENDAÇÕES" },
    fr: { findings: "RÉSULTATS", conclusion: "CONCLUSION", recommendations: "RECOMMANDATIONS" },
    de: { findings: "BEFUNDE", conclusion: "SCHLUSSFOLGERUNG", recommendations: "EMPFEHLUNGEN" },
    it: { findings: "REPERTI", conclusion: "CONCLUSIONE", recommendations: "RACCOMANDAZIONI" },
  };

  // Build the study title line
  function getStudyTitle(): string {
    if (!selectedTemplate) return "";
    let title = selectedTemplate.name;
    if (contrastOption === "con_contraste") title += " con contraste";
    else if (contrastOption === "sin_contraste") title += " sin contraste";
    return title.toUpperCase();
  }

  // Copy functions
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

  // Save report
  async function handleSave() {
    if (!selectedTemplate) return;
    setSaving(true);

    const studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    const { data: config } = await supabase.from("user_model_config").select("*").single();

    await fetch("/api/reports", {
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
        template_snapshot: selectedTemplate.structure,
        model_config_snapshot: config,
      }),
    });

    localStorage.removeItem("radiogenia_draft");
    setSaving(false);
  }

  const isGenerating = loadingFindings || loadingConclusion || loadingRecs;

  return (
    <div className="space-y-6">
      {/* Stats Panel */}
      <StatsPanel />

      <Separator />

      {/* Step 1: Study Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            New Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modality toggle buttons */}
          <div>
            <Label className="text-xs text-gray-500 mb-2 block">Modality</Label>
            <div className="flex flex-wrap gap-2">
              {MODALITIES.map((mod) => (
                <Button
                  key={mod}
                  variant={selectedModality === mod ? "default" : "outline"}
                  size="sm"
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Anatomical section */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Anatomical Section</Label>
              <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedTemplateId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {(filteredSections.length > 0 ? filteredSections : SECTIONS.map(String)).map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Report type */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Report Type</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Contrast option */}
            <div>
              <Label className="text-xs text-gray-500 mb-2 block">Contrast</Label>
              <RadioGroup value={contrastOption} onValueChange={setContrastOption} className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="default" id="c-default" />
                  <Label htmlFor="c-default" className="text-sm font-normal">Default</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="con_contraste" id="c-con" />
                  <Label htmlFor="c-con" className="text-sm font-normal">With</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <RadioGroupItem value="sin_contraste" id="c-sin" />
                  <Label htmlFor="c-sin" className="text-sm font-normal">Without</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Dictation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Dictation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className={`relative ${isRecording ? "recording-pulse" : ""}`}
              onClick={toggleRecording}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <span className="text-sm text-gray-500">
              {isRecording ? "Recording... Click to stop" : "Click to start dictation"}
            </span>
          </div>
          <Textarea
            placeholder="Dictate or type your findings here..."
            value={dictation}
            onChange={(e) => setDictation(e.target.value)}
            className="min-h-[120px]"
          />
          <Button
            onClick={handleGenerate}
            disabled={!selectedTemplate || !dictation.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 3: Report Output */}
      {(findings || conclusion || recommendations || isGenerating) && (
        <div className="grid gap-4">
          {/* Findings */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Findings</CardTitle>
                {loadingFindings && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </CardHeader>
            <CardContent>
              {loadingFindings ? (
                <div className="h-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md" />
              ) : (
                <Textarea value={findings} onChange={(e) => setFindings(e.target.value)} className="min-h-[150px]" />
              )}
            </CardContent>
          </Card>

          {/* Conclusion */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Conclusion</CardTitle>
                {loadingConclusion && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </CardHeader>
            <CardContent>
              {loadingConclusion ? (
                <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md" />
              ) : (
                <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} className="min-h-[80px]" />
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recommendations</CardTitle>
                {loadingRecs && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </CardHeader>
            <CardContent>
              {loadingRecs ? (
                <div className="h-16 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-md" />
              ) : (
                <Textarea value={recommendations} onChange={(e) => setRecommendations(e.target.value)} className="min-h-[60px]" />
              )}
            </CardContent>
          </Card>

          {/* Step 4: Copy & Save buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copyFormatted("findings")}>
              {copied === "f" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Findings
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyFormatted("findings_conclusion")}>
              {copied === "fc" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Findings + Conclusion
            </Button>
            <Button variant="outline" size="sm" onClick={() => copyFormatted("full")}>
              {copied === "all" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              Copy Full Report
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !findings}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Report
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
