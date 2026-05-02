"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  FileText,
  Mic,
  MicOff,
  Loader2,
  Copy,
  Check,
  Sparkles,
  Lightbulb,
  Stethoscope,
  CircleCheck,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Flag,
  Pencil,
  Wand2,
  GraduationCap,
} from "lucide-react";
import { MODALITIES, SECTIONS, PLANS, DICTATION_LANGUAGES, type UserTemplate, type SubscriptionPlan } from "@/lib/types";
import { HighlightedText, TraceLegend, useTraceHighlights, type TraceData } from "./trace-highlight";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { processVoiceCommands } from "@/lib/voice-commands";
import { AnatomyLoader } from "./anatomy-loader";
import { FloatingDictation } from "./floating-dictation";
import { useT, useSection, useTemplateName, useModality } from "@/lib/i18n";
import { detectPii, type PiiMatch } from "@/lib/pii-detect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResidentVerificationForm } from "@/components/resident-verification-form";

export function DashboardContent() {
  const supabase = createClient();
  const t = useT();
  const sec = useSection();
  const tplName = useTemplateName();
  const modName = useModality();

  // Templates state
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [selectedModality, setSelectedModality] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [contrastOption, setContrastOption] = useState<string>("default");

  // Clinical info state
  const [clinicalInfo, setClinicalInfo] = useState("");
  const [clinicalOpen, setClinicalOpen] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [recsOpen, setRecsOpen] = useState(false);
  const [lightParaphrase, setLightParaphrase] = useState(false);

  // Dictation state
  const [dictation, setDictation] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const correctedLenRef = useRef(0);
  const dictationRef = useRef("");
  const correctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctingRef = useRef(false);
  const templatesRef = useRef(templates);
  const selectedTemplateIdRef = useRef(selectedTemplateId);
  const resolvedDictLangRef = useRef("");

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
  const [dictationLanguage, setDictationLanguage] = useState<string>("es");
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceActive, setTraceActive] = useState(false);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  // PII detection
  const [piiMatches, setPiiMatches] = useState<PiiMatch[]>([]);
  const [piiDismissed, setPiiDismissed] = useState(false);

  // Active signature for copy
  const activeSignatureRef = useRef<string | null>(null);
  const refreshSignature = () => {
    fetch("/api/signatures").then((r) => r.ok ? r.json() : []).then((sigs: { is_active: boolean; body: string }[]) => {
      const active = sigs.find((s) => s.is_active);
      activeSignatureRef.current = active ? active.body : null;
    }).catch(() => {});
  };
  useEffect(() => { refreshSignature(); }, []);

  // Audit: timing + error reporting
  const generateStartRef = useRef<number>(0);
  const [generationDurationMs, setGenerationDurationMs] = useState<number | null>(null);
  const [lastSavedReportId, setLastSavedReportId] = useState<string | null>(null);
  const reportDirtyRef = useRef(false);
  const correctionLoggedRef = useRef(false);
  // Refs for unmount/beforeunload — always hold latest values
  const correctionSnapshotRef = useRef({
    lastSavedReportId: null as string | null,
    initialConclusion: "",
    conclusion: "",
    initialFindings: "",
    findings: "",
    templateName: "",
    modality: "",
  });
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ used: number; limit: number; plan: string } | null>(null);
  const [limitType, setLimitType] = useState<"reports" | "dictation">("reports");
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorNote, setErrorNote] = useState("");
  const [errorReported, setErrorReported] = useState(false);
  const [reportingError, setReportingError] = useState(false);
  const [residentDialogOpen, setResidentDialogOpen] = useState(false);

  // Subscription usage (inline — replaces StatsPanel)
  const [subPlan, setSubPlan] = useState<string>("free");
  const [subReportsUsed, setSubReportsUsed] = useState(0);
  const [subReportsLimit, setSubReportsLimit] = useState(30);
  const [subDictUsedMin, setSubDictUsedMin] = useState(0);
  const [subDictLimitMin, setSubDictLimitMin] = useState(30);
  const [subLoaded, setSubLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/subscription")
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then((data) => {
        setSubPlan(data.plan || "free");
        setSubReportsUsed(data.used ?? 0);
        setSubReportsLimit(data.limit ?? 30);
        setSubDictUsedMin(data.dictation?.usedMinutes ?? 0);
        setSubDictLimitMin(data.dictation?.limitMinutes ?? 30);
        setSubLoaded(true);
      })
      .catch(() => setSubLoaded(true));

    const refresh = () => {
      fetch("/api/subscription")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setSubReportsUsed(data.used ?? 0);
            setSubDictUsedMin(data.dictation?.usedMinutes ?? 0);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("radiogenai:report-saved", refresh);
    window.addEventListener("radiogenai:report-generated", refresh);
    return () => {
      window.removeEventListener("radiogenai:report-saved", refresh);
      window.removeEventListener("radiogenai:report-generated", refresh);
    };
  }, []);

  // Resolve dictation language — always explicit (never "auto" to the engine)
  const resolvedDictLang = dictationLanguage === "auto"
    ? (outputLanguage || "es")
    : dictationLanguage;

  const changeDictLang = (lang: string) => {
    setDictationLanguage(lang);
    fetch("/api/model-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dictation_language: lang }),
    }).catch(() => {});
  };
  const correctUncorrectedTextFn = useRef((immediate?: boolean) => {
    if (correctingRef.current && !immediate) return;
    const full = dictationRef.current;
    const alreadyCorrected = correctedLenRef.current;
    const newText = full.slice(alreadyCorrected).trim();
    if (!newText || newText.length < 3) {
      correctedLenRef.current = full.length;
      return;
    }
    correctingRef.current = true;
    setIsCorrecting(true);
    const snapshotStart = alreadyCorrected;
    const snapshotText = newText;
    const tpl = templatesRef.current.find((tp) => tp.id === selectedTemplateIdRef.current);
    fetch("/api/transcribe/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: snapshotText,
        modality: tpl?.modality || "",
        studyType: tpl?.name || "",
        language: resolvedDictLangRef.current,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.corrected && data.corrected !== snapshotText) {
          setDictation((prev) => {
            const idx = prev.indexOf(snapshotText, snapshotStart);
            if (idx === -1) {
              correctedLenRef.current = prev.length;
              return prev;
            }
            const result = prev.slice(0, idx) + data.corrected + prev.slice(idx + snapshotText.length);
            correctedLenRef.current = idx + data.corrected.length;
            return result;
          });
        } else {
          correctedLenRef.current = snapshotStart + snapshotText.length;
        }
      })
      .catch(() => {
        correctedLenRef.current = dictationRef.current.length;
      })
      .finally(() => {
        correctingRef.current = false;
        setIsCorrecting(false);
      });
  });

  const scheduleDebouncedCorrection = useRef(() => {
    if (correctTimerRef.current) clearTimeout(correctTimerRef.current);
    correctTimerRef.current = setTimeout(() => {
      correctUncorrectedTextFn.current();
    }, 1500);
  });

  const { isRecording, isTranscribing, audioLevel, interimText, toggleRecording } = useVoiceDictation({
    language: resolvedDictLang,
    onTranscript: (rawText) => {
      const text = processVoiceCommands(rawText, resolvedDictLang);
      setDictation((prev) => {
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + text;
      });
      setTraceData(null);
      setVoiceError(null);
      scheduleDebouncedCorrection.current();
    },
    onInterim: () => {},
    onQuotaUpdate: (quota) => {
      setSubDictUsedMin(Math.round(quota.usedSeconds / 60));
    },
    onError: (err) => {
      if (err.includes("Dictation limit") || err.includes("Límite de dictado") || err.includes("dictation")) {
        const subRes = fetch("/api/subscription").then((r) => r.ok ? r.json() : null);
        subRes.then((data) => {
          if (data) {
            setLimitType("dictation");
            setLimitInfo({
              used: data.dictation?.usedMinutes ?? 0,
              limit: data.dictation?.limitMinutes ?? 0,
              plan: data.plan || "free",
            });
            setLimitDialogOpen(true);
          }
        });
      }
      setVoiceError(err);
    },
    onRecordingDone: () => {
      if (correctTimerRef.current) clearTimeout(correctTimerRef.current);
      const waitForPending = () => {
        if (correctingRef.current) {
          setTimeout(() => waitForPending(), 100);
          return;
        }
        correctUncorrectedTextFn.current(true);
      };
      waitForPending();
    },
  });

  useEffect(() => { dictationRef.current = dictation; }, [dictation]);
  useEffect(() => { templatesRef.current = templates; }, [templates]);
  useEffect(() => { selectedTemplateIdRef.current = selectedTemplateId; }, [selectedTemplateId]);
  useEffect(() => { resolvedDictLangRef.current = resolvedDictLang; }, [resolvedDictLang]);

  // PII detection — debounced on dictation + clinical info changes
  useEffect(() => {
    const combined = `${dictation}\n${clinicalInfo}`.trim();
    if (!combined) { setPiiMatches([]); return; }
    const timer = setTimeout(() => {
      setPiiMatches(detectPii(combined));
      setPiiDismissed(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [dictation, clinicalInfo]);

  // Auto-open recommendations when they arrive
  useEffect(() => {
    if (recommendations && !loadingRecs) setRecsOpen(true);
  }, [recommendations, loadingRecs]);

  // Autosave draft with timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      if (dictation || findings || conclusion || recommendations || clinicalInfo) {
        localStorage.setItem("radiogenai_draft", JSON.stringify({
          savedAt: Date.now(),
          clinicalInfo, dictation, findings, conclusion, recommendations,
          selectedModality, selectedSection, selectedTemplateId, contrastOption,
          initialFindings, initialConclusion,
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clinicalInfo, dictation, findings, conclusion, recommendations, selectedModality, selectedSection, selectedTemplateId, contrastOption]);

  // Keep snapshot ref in sync for unmount / beforeunload / visibilitychange
  useEffect(() => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    correctionSnapshotRef.current = {
      lastSavedReportId,
      initialConclusion,
      conclusion,
      initialFindings,
      findings,
      templateName: tpl?.name || "",
      modality: tpl?.modality || "",
    };
  }, [lastSavedReportId, initialConclusion, conclusion, initialFindings, findings, templates, selectedTemplateId]);

  // Flush corrections on visibilitychange, beforeunload, and component unmount
  useEffect(() => {
    function flushViaBeacon() {
      const s = correctionSnapshotRef.current;

      // Flush report edits to the reports table
      if (s.lastSavedReportId && reportDirtyRef.current) {
        const conclusionChanged = !!(s.initialConclusion && s.conclusion !== s.initialConclusion);
        const findingsChanged = !!(s.initialFindings && s.findings !== s.initialFindings);
        reportDirtyRef.current = false;
        navigator.sendBeacon(
          "/api/reports",
          new Blob([JSON.stringify({
            _method: "PATCH",
            id: s.lastSavedReportId,
            findings_text: s.findings,
            conclusion_text: s.conclusion,
            had_corrections: conclusionChanged || findingsChanged,
          })], { type: "application/json" }),
        );
      }

      // Log corrections independently
      if (!correctionLoggedRef.current) {
        const conclusionChanged = !!(s.initialConclusion && s.conclusion !== s.initialConclusion);
        const findingsChanged = !!(s.initialFindings && s.findings !== s.initialFindings);
        if (conclusionChanged || findingsChanged) {
          correctionLoggedRef.current = true;
          navigator.sendBeacon(
            "/api/audit-logs",
            new Blob([JSON.stringify({
              action: "correction_logged",
              report_id: s.lastSavedReportId || null,
              had_corrections: true,
              metadata: {
                study_type: s.templateName,
                modality: s.modality,
                conclusion_changed: conclusionChanged,
                findings_changed: findingsChanged,
                original_conclusion: s.initialConclusion || "",
                corrected_conclusion: conclusionChanged ? s.conclusion : "",
                original_findings: findingsChanged ? s.initialFindings.slice(0, 3000) : "",
                corrected_findings: findingsChanged ? s.findings.slice(0, 3000) : "",
              },
            })], { type: "application/json" }),
          );
        }
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "hidden") flushViaBeacon();
    }
    function handleBeforeUnload() {
      flushViaBeacon();
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Component unmount (e.g. switching to templates/recommendations view)
      flushViaBeacon();
    };
  }, []);

  // Load draft on mount — discard if older than 15 minutes
  useEffect(() => {
    const raw = localStorage.getItem("radiogenai_draft");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      const age = Date.now() - (d.savedAt || 0);
      if (age > 15 * 60 * 1000) {
        localStorage.removeItem("radiogenai_draft");
        return;
      }
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
  }, []);

  // Seed defaults (if needed) then load templates + user config
  useEffect(() => {
    async function seedAndLoad() {
      try {
        await fetch("/api/seed", { method: "POST" });
      } catch { /* seed may already exist */ }
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
      try {
        const cfgRes = await fetch("/api/model-config");
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          if (cfg.dictation_language) setDictationLanguage(cfg.dictation_language);
        }
      } catch { /* ignore */ }
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

    // Log any pending corrections from the previous report before starting a new generation
    logCorrectionIfNeeded();
    if (lastSavedReportId && reportDirtyRef.current) {
      await flushCorrections();
    }

    const templateText = selectedTemplate.structure?.template || "";

    generateStartRef.current = Date.now();
    setGenerationDurationMs(null);
    setLastSavedReportId(null);
    correctionLoggedRef.current = false;
    setErrorReported(false);
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
    setRepairMessage(null);

    const studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    // Stream findings — text appears progressively
    let findingsText = "";
    let findingsFailed = false;
    try {
      const res = await fetch("/api/generate/findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateText,
          dictation,
          modality: selectedTemplate.modality,
          studyType: studyName,
          ...(lightParaphrase ? { paraphraseOverride: "light" } : {}),
        }),
      });

      if (res.ok && res.body) {
        const lang = res.headers.get("X-Output-Language") || "es";
        setOutputLanguage(lang);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let streamError = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (chunk.includes("__STREAM_ERROR__:")) {
            streamError = chunk.split("__STREAM_ERROR__:")[1] || "AI provider error";
            break;
          }
          findingsText += chunk;
          setFindings(cleanReport(findingsText));
        }
        if (streamError) {
          findingsFailed = true;
          setFindings("Error: " + streamError);
        } else {
          findingsText = cleanReport(findingsText);
          setInitialFindings(findingsText);
          setFindings(findingsText);
          window.dispatchEvent(new Event("radiogenai:report-generated"));
        }
      } else if (res.status === 429) {
        findingsFailed = true;
        const data = await res.json().catch(() => ({}));
        setLimitType("reports");
        setLimitInfo({ used: data.used || 0, limit: data.limit || 0, plan: data.plan || "free" });
        setLimitDialogOpen(true);
      } else {
        findingsFailed = true;
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        setFindings(data.error || "Error generating findings");
      }
    } catch (e) {
      findingsFailed = true;
      setFindings("Error: " + (e instanceof Error ? e.message : "Unknown error"));
    }
    setLoadingFindings(false);

    if (findingsFailed || !findingsText) {
      if (!findingsFailed) setFindings(t("error.empty_generation"));
      setLoadingConclusion(false);
      setLoadingRecs(false);
      return;
    }

    // Run trace+repair, conclusion, and recommendations ALL IN PARALLEL
    let conclusionText = "";
    let recsText = "";
    let traceStats = { mappings: 0, unmatched: 0, hallucinations: 0 };

    const tracePromise = (async () => {
      setLoadingTrace(true);
      try {
        const traceRes = await fetch("/api/generate/trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dictation, findings: findingsText, outputLanguage }),
        });
        if (traceRes.ok) {
          const result = await traceRes.json();
          if (!result.hallucinations) result.hallucinations = [];
          if (!result.mappings) result.mappings = [];
          if (!result.unmatched) result.unmatched = [];

          traceStats = {
            mappings: result.mappings.length,
            unmatched: result.unmatched.length,
            hallucinations: result.hallucinations.length,
          };

          if (result.repaired && result.corrected_findings) {
            findingsText = cleanReport(result.corrected_findings);
            setFindings(findingsText);
            setInitialFindings(findingsText);
            setRepairMessage(t("trace.auto_repaired").replace("{0}", ""));
          }

          setTraceData({
            mappings: result.mappings,
            unmatched: result.unmatched,
            hallucinations: result.hallucinations,
          });
          setTraceActive(true);
        }
      } catch (e) {
        console.error("Auto-trace failed:", e);
      } finally {
        setLoadingTrace(false);
      }
    })();

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
          let streamError = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk.includes("__STREAM_ERROR__:")) {
              streamError = chunk.split("__STREAM_ERROR__:")[1] || "AI provider error";
              break;
            }
            text += chunk;
            setConclusion(cleanReport(text));
          }
          if (streamError) {
            setConclusion("Error: " + streamError);
          } else {
            const cleaned = cleanReport(text);
            conclusionText = cleaned;
            setInitialConclusion(cleaned);
            setConclusion(cleaned);
            // Audit: log conclusion generation
            fetch("/api/audit-logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "generate_conclusion",
                duration_ms: Date.now() - generateStartRef.current,
                metadata: {
                  study_type: studyName,
                  modality: selectedTemplate.modality,
                  conclusion_length: cleaned.length,
                },
              }),
            }).catch(() => {});
          }
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
        recsText = data.text ? cleanReport(data.text) : "";
        setRecommendations(recsText || data.error || "");
      })
      .catch((e) => {
        setRecommendations("Error: " + e.message);
      })
      .finally(() => {
        setLoadingRecs(false);
      });

    await Promise.all([tracePromise, conclusionPromise, recsPromise]);
    const durationMs = Date.now() - generateStartRef.current;
    setGenerationDurationMs(durationMs);

    // Log trace quality metrics — include dictation + generated text so admin can review
    if (traceStats.mappings > 0 || traceStats.unmatched > 0 || traceStats.hallucinations > 0) {
      fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_findings",
          duration_ms: durationMs,
          metadata: {
            study_type: studyName,
            modality: selectedTemplate.modality,
            findings_length: findingsText.length,
            trace_mappings: traceStats.mappings,
            trace_unmatched: traceStats.unmatched,
            trace_hallucinations: traceStats.hallucinations,
            raw_dictation: dictation?.slice(0, 2000) || "",
            generated_findings: findingsText?.slice(0, 3000) || "",
            generated_conclusion: conclusionText?.slice(0, 1500) || "",
          },
        }),
      }).catch(() => {});
    }

    // Auto-save using local variables (React state is stale in this closure)
    if (findingsText && selectedTemplate) {
      let config: Record<string, unknown> | null = null;
      try {
        const { data } = await supabase.from("user_model_config").select("*").single();
        config = data;
      } catch { /* config is optional for the save */ }

      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            study_type: studyName,
            modality: selectedTemplate.modality,
            contrast_option: contrastOption,
            raw_dictation: dictation,
            clinical_context: clinicalInfo || "",
            findings_text: findingsText,
            conclusion_text: conclusionText,
            recommendations_text: recsText,
            initial_findings_text: findingsText,
            initial_conclusion_text: conclusionText,
            template_snapshot: selectedTemplate.structure,
            model_config_snapshot: config,
            generation_duration_ms: durationMs,
            provider_used: (config?.provider as string) || null,
            model_used: (config?.model_name as string) || null,
            had_corrections: false,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          if (saved?.id) {
            setLastSavedReportId(saved.id);
            reportDirtyRef.current = false;
            fetch("/api/audit-logs", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "save_report",
                report_id: saved.id,
                provider: (config?.provider as string) || null,
                model: (config?.model_name as string) || null,
                duration_ms: durationMs,
                had_corrections: false,
                metadata: {
                  study_type: studyName,
                  modality: selectedTemplate.modality,
                  trace_mappings: traceStats.mappings,
                  trace_unmatched: traceStats.unmatched,
                  trace_hallucinations: traceStats.hallucinations,
                },
              }),
            }).catch(() => {});
          }
        } else {
          const errBody = await res.text().catch(() => "");
          console.error("Report save failed:", res.status, errBody);
        }
      } catch (e) {
        console.error("Failed to auto-save report:", e);
      }
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
    let title = tplName(selectedTemplate.name);
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

  async function copyFormatted(mode: "findings" | "findings_conclusion" | "full") {
    logCorrectionIfNeeded();
    await flushCorrections();
    // Refresh signature in case user changed it in the sidebar
    try {
      const sRes = await fetch("/api/signatures");
      if (sRes.ok) {
        const sigs: { is_active: boolean; body: string }[] = await sRes.json();
        const active = sigs.find((s) => s.is_active);
        activeSignatureRef.current = active ? active.body : null;
      }
    } catch { /* use cached value */ }

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
    if (mode !== "findings" && activeSignatureRef.current) {
      text += "\n\n" + activeSignatureRef.current;
    }

    const id = mode === "findings" ? "f" : mode === "findings_conclusion" ? "fc" : "all";
    copyText(text, id);
  }

  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const { findingsHighlights } = useTraceHighlights(dictation, findings, traceData);

  async function saveReportQuietly() {
    if (!selectedTemplate || !findings) return;
    if (lastSavedReportId) return;

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
          clinical_context: clinicalInfo || "",
          findings_text: findings,
          conclusion_text: conclusion,
          recommendations_text: recommendations,
          initial_findings_text: initialFindings || null,
          initial_conclusion_text: initialConclusion || null,
          template_snapshot: selectedTemplate.structure,
          model_config_snapshot: config,
          generation_duration_ms: generationDurationMs,
          provider_used: config?.provider || null,
          model_used: config?.model_name || null,
          had_corrections: false,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        if (saved?.id) {
          setLastSavedReportId(saved.id);
          reportDirtyRef.current = false;
          fetch("/api/audit-logs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save_report",
              report_id: saved.id,
              provider: config?.provider || null,
              model: config?.model_name || null,
              duration_ms: generationDurationMs,
              had_corrections: false,
              metadata: { study_type: studyName, modality: selectedTemplate.modality },
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Failed to save report:", e);
    }
  }

  function logCorrectionIfNeeded() {
    if (correctionLoggedRef.current) return;
    const conclusionChanged = !!(initialConclusion && conclusion !== initialConclusion);
    const findingsChanged = !!(initialFindings && findings !== initialFindings);
    if (!conclusionChanged && !findingsChanged) return;

    correctionLoggedRef.current = true;
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    fetch("/api/audit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "correction_logged",
        report_id: lastSavedReportId || null,
        had_corrections: true,
        metadata: {
          study_type: tpl?.name || "",
          modality: tpl?.modality || "",
          conclusion_changed: conclusionChanged,
          findings_changed: findingsChanged,
          original_conclusion: initialConclusion || "",
          corrected_conclusion: conclusionChanged ? conclusion : "",
          original_findings: findingsChanged ? (initialFindings || "").slice(0, 3000) : "",
          corrected_findings: findingsChanged ? (findings || "").slice(0, 3000) : "",
        },
      }),
    }).catch(() => {});
  }

  async function flushCorrections() {
    if (!lastSavedReportId || !reportDirtyRef.current) return;

    const conclusionChanged = !!(initialConclusion && conclusion !== initialConclusion);
    const findingsChanged = !!(initialFindings && findings !== initialFindings);
    const hadCorrections = conclusionChanged || findingsChanged;

    reportDirtyRef.current = false;
    try {
      await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lastSavedReportId,
          findings_text: findings,
          conclusion_text: conclusion,
          had_corrections: hadCorrections,
        }),
      });
    } catch { /* non-critical */ }
  }

  async function startNewReport() {
    logCorrectionIfNeeded();
    if (findings) {
      if (!lastSavedReportId) await saveReportQuietly();
      else await flushCorrections();
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
    setRepairMessage(null);
    setRecsOpen(false);
    setPiiMatches([]);
    setPiiDismissed(false);
    setGenerationDurationMs(null);
    setLastSavedReportId(null);
    setErrorReported(false);
    correctionLoggedRef.current = false;
    correctedLenRef.current = 0;
    localStorage.removeItem("radiogenai_draft");
  }

  async function handleReportError() {
    setReportingError(true);
    try {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "report_error",
          report_id: lastSavedReportId,
          metadata: {
            note: errorNote,
            study_type: selectedTemplate?.name,
            modality: selectedTemplate?.modality,
            had_findings: !!findings,
            had_conclusion: !!conclusion,
            raw_dictation: dictation?.slice(0, 2000) || "",
            generated_findings: initialFindings?.slice(0, 3000) || "",
            generated_conclusion: initialConclusion?.slice(0, 1500) || "",
          },
        }),
      });
      setErrorReported(true);
      setErrorDialogOpen(false);
      setErrorNote("");
    } catch { /* ignore */ }
    setReportingError(false);
  }

  const isGenerating = loadingFindings || loadingConclusion || loadingRecs;
  const hasOutput = findings || conclusion || recommendations || isGenerating;
  const setupReady = !!selectedTemplate;
  const showPiiWarning = piiMatches.length > 0 && !piiDismissed && dictation.trim();
  const canGenerate = setupReady && dictation.trim() && !isGenerating && !showPiiWarning;

  const piiWarningBanner = showPiiWarning ? (
    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">{t("pii.warning_title")}</p>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{t("pii.warning_detail")}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {piiMatches.map((m, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300">
                {t(`pii.type.${m.type}`)}: {m.value}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPiiDismissed(true)}
        className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 underline underline-offset-2"
      >
        {t("pii.proceed")}
      </button>
    </div>
  ) : null;

  const rPct = subReportsLimit > 0 ? Math.min(100, Math.round((subReportsUsed / subReportsLimit) * 100)) : 0;
  const dPct = subDictLimitMin > 0 ? Math.min(100, Math.round((subDictUsedMin / subDictLimitMin) * 100)) : 0;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* ── Usage bar ── */}
      <div className="rounded-lg border bg-white dark:bg-gray-900 px-3 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {t("stats.plan")}: <span className="text-gray-700 dark:text-gray-200 capitalize">{subPlan}</span>
          </span>
          <div className="flex items-center gap-2">
            {subPlan === "free" && (
              <button
                type="button"
                className="text-[10px] text-green-600 dark:text-green-400 hover:underline"
                onClick={() => setResidentDialogOpen(true)}
              >
                Residente?
              </button>
            )}
            <span className="text-[10px] text-gray-400">{t("stats.this_month")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FileText className={`h-3.5 w-3.5 flex-shrink-0 ${rPct >= 90 ? "text-red-500" : rPct >= 70 ? "text-amber-500" : "text-brand"}`} />
          <span className="text-xs font-semibold text-gray-900 dark:text-white w-16">{subReportsUsed}<span className="font-normal text-gray-400">/{subReportsLimit}</span></span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${rPct >= 90 ? "bg-red-500" : rPct >= 70 ? "bg-amber-500" : "bg-brand"}`} style={{ width: `${rPct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Mic className={`h-3.5 w-3.5 flex-shrink-0 ${dPct >= 90 ? "text-red-500" : dPct >= 70 ? "text-amber-500" : "text-violet-500"}`} />
          <span className="text-xs font-semibold text-gray-900 dark:text-white w-16">{subDictUsedMin}<span className="font-normal text-gray-400">/{subDictLimitMin} min</span></span>
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${dPct >= 90 ? "bg-red-500" : dPct >= 70 ? "bg-amber-500" : "bg-violet-500"}`} style={{ width: `${dPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Input: study setup (left) + dictation (right) ── */}
      {setupCollapsed ? (
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg border bg-gray-50/80 dark:bg-gray-800/80 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
            onClick={() => setSetupCollapsed(false)}
          >
            <Stethoscope className="h-3.5 w-3.5 text-brand" />
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 truncate flex-1 min-w-0">
              {selectedModality && <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">{modName(selectedModality)}</Badge>}
              {selectedTemplate ? (
                <span className="truncate font-medium">{tplName(selectedTemplate.name)}</span>
              ) : (
                <span className="text-gray-400">{t("dash.select_template_first")}</span>
              )}
              {contrastOption !== "default" && (
                <Badge variant="outline" className="text-[10px] h-5 flex-shrink-0">
                  {contrastOption === "con_contraste" ? "C+" : "C−"}
                </Badge>
              )}
              {clinicalInfo.trim() && <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />}
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          </div>

          <Card>
            <CardContent className="p-3 space-y-2.5">
              {/* Language selector */}
              <div className="flex items-center gap-1">
                <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                {DICTATION_LANGUAGES.filter(l => l.value !== "auto").map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => changeDictLang(l.value)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      resolvedDictLang === l.value
                        ? "bg-brand text-white"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {l.value.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Textarea
                  placeholder={t("dash.dictation_placeholder")}
                  value={dictation}
                  onChange={(e) => { setDictation(e.target.value); setTraceData(null); setRepairMessage(null); }}
                  className="min-h-[140px] md:min-h-[180px] text-sm pr-14"
                />
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  className={`absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 rounded-full transition-shadow ${isRecording ? "recording-pulse" : ""}`}
                  style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 12)}px rgba(239,68,68,${0.15 + audioLevel * 0.25})` } : undefined}
                  onClick={toggleRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {(isRecording || isTranscribing || isCorrecting) && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className={`text-[10px] ${isRecording ? "bg-red-500 text-white animate-pulse" : isCorrecting ? "bg-purple-500 text-white animate-pulse gap-1" : "bg-blue-500 text-white animate-pulse gap-1"}`}>
                      {isRecording ? "REC" : isCorrecting ? <><Wand2 className="h-2.5 w-2.5" /> Correcting</> : <><Loader2 className="h-2.5 w-2.5 animate-spin" /> STT</>}
                    </Badge>
                  </div>
                )}
              </div>
              {interimText && isRecording && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-300 italic">{interimText}</p>
                </div>
              )}
              {voiceError && <p className="text-xs text-red-500 dark:text-red-400">{voiceError}</p>}
              {piiWarningBanner}
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full h-11 md:h-9 gap-2 bg-brand-gradient shadow-brand hover:opacity-90 disabled:opacity-50 text-brand-fg"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("dash.generating")}</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> {t("dash.generate")}</>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setLightParaphrase(!lightParaphrase)}
                className={`flex items-center gap-1.5 text-[11px] transition-colors ${lightParaphrase ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
              >
                <Wand2 className="h-3 w-3" />
                {t("dash.light_paraphrase")}
              </button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Study setup — horizontal strip */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Stethoscope className="h-3.5 w-3.5 text-brand" />
                  {t("dash.study_setup")}
                </h3>
                <button
                  type="button"
                  onClick={() => setSetupCollapsed(true)}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                >
                  <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                </button>
              </div>

              {/* Row 1: Modality pills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {MODALITIES.map((mod) => (
                  <Button
                    key={mod}
                    variant={selectedModality === mod ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-[11px]"
                    onClick={() => {
                      setSelectedModality(selectedModality === mod ? "" : mod);
                      setSelectedSection("");
                      setSelectedTemplateId("");
                    }}
                  >
                    {modName(mod)}
                  </Button>
                ))}
              </div>

              {/* Row 2: Region + Template + Contrast — responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedTemplateId(""); }}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={t("dash.any_region")} /></SelectTrigger>
                  <SelectContent>
                    {(filteredSections.length > 0 ? filteredSections : SECTIONS.map(String)).map((s) => (
                      <SelectItem key={s} value={s}>{sec(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={filteredTemplates.length === 0 ? t("dash.no_templates") : t("dash.select_template")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const hasOrgTemplates = filteredTemplates.some((tp) => tp.is_org);
                      if (!hasOrgTemplates) {
                        return filteredTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>{tplName(tpl.name)}</SelectItem>
                        ));
                      }
                      const own = filteredTemplates.filter((tp) => !tp.is_global && !tp.is_org);
                      const sectionGroups = new Map<string, typeof filteredTemplates>();
                      filteredTemplates.filter((tp) => tp.is_org).forEach((tp) => {
                        const key = tp.section_name || "Hospital";
                        if (!sectionGroups.has(key)) sectionGroups.set(key, []);
                        sectionGroups.get(key)!.push(tp);
                      });
                      const global = filteredTemplates.filter((tp) => tp.is_global && !tp.is_org);
                      return (
                        <>
                          {own.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-wider">Mis plantillas</SelectLabel>
                              {own.map((tp) => <SelectItem key={tp.id} value={tp.id}>{tplName(tp.name)}</SelectItem>)}
                            </SelectGroup>
                          )}
                          {Array.from(sectionGroups.entries()).map(([secName, tpls]) => (
                            <SelectGroup key={secName}>
                              <SelectLabel className="text-[10px] text-teal-600 dark:text-teal-400 uppercase tracking-wider">{secName}</SelectLabel>
                              {tpls.map((tp) => <SelectItem key={tp.id} value={tp.id}>{tplName(tp.name)}</SelectItem>)}
                            </SelectGroup>
                          ))}
                          {global.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-[10px] text-gray-400 uppercase tracking-wider">Globales</SelectLabel>
                              {global.map((tp) => <SelectItem key={tp.id} value={tp.id}>{tplName(tp.name)}</SelectItem>)}
                            </SelectGroup>
                          )}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>

                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
                  {[
                    { v: "default", l: t("dash.default") },
                    { v: "con_contraste", l: "C+" },
                    { v: "sin_contraste", l: "C−" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setContrastOption(opt.v)}
                      className={`flex-1 px-2 py-1.5 text-xs rounded-md transition-colors ${
                        contrastOption === opt.v
                          ? "bg-white dark:bg-gray-900 text-brand shadow-sm font-medium"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Clinical context (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setClinicalOpen(!clinicalOpen)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {t("dash.clinical_context")}
                  {clinicalInfo.trim() && <span className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                  <ChevronDown className={`h-3 w-3 transition-transform ${clinicalOpen ? "rotate-180" : ""}`} />
                </button>
                {clinicalOpen && (
                  <Textarea
                    placeholder={t("dash.clinical_placeholder")}
                    value={clinicalInfo}
                    onChange={(e) => setClinicalInfo(e.target.value)}
                    className="mt-2 min-h-[56px] text-xs resize-none"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dictation + Generate */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Language selector */}
              <div className="flex items-center gap-1">
                <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                {DICTATION_LANGUAGES.filter(l => l.value !== "auto").map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => changeDictLang(l.value)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
                      resolvedDictLang === l.value
                        ? "bg-brand text-white"
                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {l.value.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Textarea
                  placeholder={t("dash.dictation_placeholder")}
                  value={dictation}
                  onChange={(e) => { setDictation(e.target.value); setTraceData(null); setRepairMessage(null); }}
                  className="min-h-[140px] md:min-h-[180px] text-sm pr-14 resize-none"
                />
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  className={`absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 rounded-full transition-shadow ${isRecording ? "recording-pulse" : ""}`}
                  style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 12)}px rgba(239,68,68,${0.15 + audioLevel * 0.25})` } : undefined}
                  onClick={toggleRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {(isRecording || isTranscribing || isCorrecting) && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className={`text-[10px] ${isRecording ? "bg-red-500 text-white animate-pulse" : isCorrecting ? "bg-purple-500 text-white animate-pulse gap-1" : "bg-blue-500 text-white animate-pulse gap-1"}`}>
                      {isRecording ? "REC" : isCorrecting ? <><Wand2 className="h-2.5 w-2.5" /> Correcting</> : <><Loader2 className="h-2.5 w-2.5 animate-spin" /> STT</>}
                    </Badge>
                  </div>
                )}
              </div>
              {interimText && isRecording && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-300 italic">{interimText}</p>
                </div>
              )}
              {voiceError && <p className="text-xs text-red-500 dark:text-red-400">{voiceError}</p>}
              {piiWarningBanner}
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full h-11 md:h-9 gap-2 bg-brand-gradient shadow-brand hover:opacity-90 disabled:opacity-50 text-brand-fg"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {t("dash.generating")}</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> {t("dash.generate")}</>
                )}
              </Button>
              <button
                type="button"
                onClick={() => setLightParaphrase(!lightParaphrase)}
                className={`flex items-center gap-1.5 text-[11px] transition-colors ${lightParaphrase ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
              >
                <Wand2 className="h-3 w-3" />
                {t("dash.light_paraphrase")}
              </button>
              {!setupReady && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                  {t("dash.select_template_first")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Output ── */}
      {hasOutput && (
        <div className="space-y-3">
          {isGenerating && !findings && !conclusion && !recommendations && (
            <Card><CardContent className="p-0"><AnatomyLoader /></CardContent></Card>
          )}

          {loadingTrace && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
              <span className="text-xs text-blue-700 dark:text-blue-300">{t("dash.verifying")}</span>
            </div>
          )}

          {repairMessage && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-300">{repairMessage}</span>
            </div>
          )}

          {traceData && (
            <Card><CardContent className="p-3"><TraceLegend trace={traceData} isDark={isDark} /></CardContent></Card>
          )}

          <OutputCard
            title={t("dash.findings")}
            icon={<FileText className="h-3.5 w-3.5 text-brand" />}
            loading={loadingFindings}
            value={findings}
            onChange={(v) => { setFindings(v); reportDirtyRef.current = true; setTraceData(null); setRepairMessage(null); }}
            minHeight={140}
            traceHighlights={findingsHighlights.length > 0 ? findingsHighlights : undefined}
            traceLocked={loadingTrace}
            isDark={isDark}
          />

          <OutputCard
            title={t("dash.conclusion")}
            icon={<CircleCheck className="h-3.5 w-3.5 text-green-600" />}
            loading={loadingConclusion}
            value={conclusion}
            onChange={(v) => { setConclusion(v); reportDirtyRef.current = true; }}
            minHeight={70}
          />

          <RecommendationsCard
            loading={loadingRecs}
            value={recommendations}
            onChange={setRecommendations}
            open={recsOpen}
            onToggle={() => setRecsOpen(!recsOpen)}
          />

          {/* Action bar */}
          <Card className="sticky bottom-16 md:bottom-3 shadow-lg border-brand-soft bg-white/95 dark:bg-gray-900/95 backdrop-blur">
            <CardContent className="p-2 md:p-2.5">
              <div className="flex flex-wrap items-center gap-1.5 justify-between">
                <div className="flex flex-wrap gap-1">
                  <Button variant="outline" size="sm" onClick={() => copyFormatted("findings")} disabled={!findings} className="gap-1 text-xs h-8 md:h-7">
                    {copied === "f" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {t("dash.findings")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyFormatted("findings_conclusion")} disabled={!findings || !conclusion} className="gap-1 text-xs h-8 md:h-7">
                    {copied === "fc" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {t("dash.plus_conclusion")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyFormatted("full")} disabled={!findings} className="gap-1 text-xs h-8 md:h-7">
                    {copied === "all" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                    {t("dash.full_report")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setErrorDialogOpen(true); setErrorNote(""); }}
                    disabled={!findings || errorReported}
                    className="gap-1 text-xs h-8 md:h-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {errorReported ? <Check className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                    {t("dash.report_error")}
                  </Button>
                </div>
                <Button size="sm" onClick={startNewReport} disabled={!findings} className="gap-1 text-xs h-8 md:h-7 bg-brand text-brand-fg hover:opacity-90">
                  <ArrowRight className="h-3 w-3" />
                  {t("dash.next_report")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FloatingDictation
        language={resolvedDictLang}
        onSendText={(text) => {
          setDictation((prev) => {
            const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
            return prev + sep + text;
          });
        }}
      />

      {/* Limit reached dialog (reports or dictation) */}
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t(limitType === "dictation" ? "limit.title_dictation" : "limit.title")}
            </DialogTitle>
          </DialogHeader>
          {limitInfo && (() => {
            const plan = limitInfo.plan as SubscriptionPlan;
            const planLabel = PLANS[plan]?.label || plan;
            const nextPlan = plan === "free" ? "starter" : plan === "resident" ? "starter" : plan === "starter" ? "professional" : null;
            const descKey = limitType === "dictation" ? "limit.desc_dictation" : "limit.desc";
            const usedLabel = limitType === "dictation" ? `${limitInfo.used} min` : String(limitInfo.used);
            const limitLabel = limitType === "dictation" ? `${limitInfo.limit} min` : String(limitInfo.limit);
            return (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t(descKey).replace("{used}", usedLabel).replace("{limit}", limitLabel).replace("{plan}", planLabel)}
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: "100%" }} />
                </div>
                <div className="space-y-2">
                  {nextPlan && (
                    <Button
                      className="w-full gap-2 bg-brand-gradient text-brand-fg hover:opacity-90"
                      onClick={() => {
                        window.open(`mailto:info@radiogen.ai?subject=Upgrade to ${PLANS[nextPlan].label}&body=I'd like to upgrade from ${planLabel} to ${PLANS[nextPlan].label} ($${PLANS[nextPlan].price}/month).`, "_blank");
                        setLimitDialogOpen(false);
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("limit.upgrade")} — {PLANS[nextPlan].label} ({PLANS[nextPlan].reports} inf. + {PLANS[nextPlan].dictationMinutes} min) ${PLANS[nextPlan].price}/mo
                    </Button>
                  )}
                  {plan === "free" && (
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                      onClick={() => {
                        setLimitDialogOpen(false);
                        setResidentDialogOpen(true);
                      }}
                    >
                      <GraduationCap className="h-4 w-4" />
                      Residente? — 150 inf. + 120 min $4.99/mo
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      window.open("mailto:info@radiogen.ai?subject=Buy extra reports&body=I'd like to purchase 100 extra reports + 90 min dictation for my current billing period.", "_blank");
                      setLimitDialogOpen(false);
                    }}
                  >
                    {t("limit.buy_extra")} {t("limit.buy_extra_price").replace("{price}", "4.99")} (+90 min)
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-red-500" />
              {t("dash.report_error_title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("dash.report_error_placeholder")}
              value={errorNote}
              onChange={(e) => setErrorNote(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setErrorDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleReportError}
                disabled={reportingError}
              >
                {reportingError ? <Loader2 className="h-4 w-4 animate-spin" /> : t("dash.report_error_send")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resident verification dialog */}
      <Dialog open={residentDialogOpen} onOpenChange={setResidentDialogOpen}>
        <DialogContent className="max-w-md">
          <ResidentVerificationForm
            onStatusChange={(status) => {
              if (status === "approved") {
                setSubPlan("resident");
                setResidentDialogOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ────────── Helper components ────────── */

function OutputCard({
  title,
  icon,
  loading,
  value,
  onChange,
  minHeight,
  traceHighlights,
  traceLocked,
  isDark,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  minHeight: number;
  traceHighlights?: { start: number; end: number; colorIdx: number; fragment: string; section?: string; isUnmatched?: boolean }[];
  traceLocked?: boolean;
  isDark?: boolean;
}) {
  const t = useT();
  const showTrace = traceHighlights && traceHighlights.length > 0;
  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {showTrace && !traceLocked && (
            <button
              type="button"
              onClick={() => onChange(value)}
              className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80 font-medium transition-colors"
            >
              <Pencil className="h-3 w-3" />
              {t("edit")}
            </button>
          )}
          {loading && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
        </div>
      </div>
      <CardContent className="pt-0 px-4 pb-3">
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
            <span className="inline-block w-0.5 h-4 ml-0.5 bg-brand animate-pulse align-text-bottom" />
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
  open,
  onToggle,
}: {
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const parsed = useMemo(() => parseRecommendations(value), [value]);
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const hasStructured = parsed.length > 0 && !editing;
  const noRecs = !loading && value.trim() && parsed.length === 0 && !editing;
  const t = useT();

  const hasContent = loading || value.trim();

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors rounded-t-xl"
      >
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
          {t("dash.recommendations")}
          {!open && hasContent && !loading && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
              {parsed.length || (value.trim() ? 1 : 0)}
            </Badge>
          )}
        </h3>
        <div className="flex items-center gap-1.5">
          {loading && <Loader2 className="h-3 w-3 animate-spin text-brand" />}
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>
      {open && (
        <CardContent className="pt-0 px-4 pb-3">
          {!loading && value.trim() && (
            <div className="flex justify-end mb-1.5">
              <button
                type="button"
                onClick={() => setEditing(!editing)}
                className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
              >
                {editing ? t("view") : t("edit")}
              </button>
            </div>
          )}
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
      )}
    </Card>
  );
}
