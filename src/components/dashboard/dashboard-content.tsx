"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Stethoscope,
  CircleCheck,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Flag,
  Pencil,
  CheckCheck,
  Wand2,
  GraduationCap,
  AlignLeft,
  List,
  X,
  RotateCcw,
  Trash2,
  HelpCircle,
  EyeOff,
} from "lucide-react";
import { MODALITIES, SECTIONS, PLANS, DICTATION_LANGUAGES, type UserTemplate, type SubscriptionPlan } from "@/lib/types";
import { HighlightedText, TraceLegend, useTraceHighlights, type TraceData } from "./trace-highlight";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { processVoiceCommands } from "@/lib/voice-commands";
import { AnatomyLoader } from "./anatomy-loader";
import { FloatingDictation } from "./floating-dictation";
import { useT, useSection, useTemplateName, useModality } from "@/lib/i18n";
import { detectPii, type PiiMatch } from "@/lib/pii-detect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ResidentVerificationForm } from "@/components/resident-verification-form";
import { RecommendationPanel } from "./recommendation-panel";
import { SelectionHighlight } from "@/components/ui/selection-highlight";

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
  const [lightParaphrase, setLightParaphrase] = useState(false);
  const [conclusionStyle, setConclusionStyle] = useState<"concise" | "grouped">("grouped");

  // Dictation state
  const [dictation, setDictation] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const correctedLenRef = useRef(0);
  const dictationRef = useRef("");
  const correctTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const correctionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const correctingRef = useRef(false);
  const templatesRef = useRef(templates);
  const selectedTemplateIdRef = useRef(selectedTemplateId);
  const resolvedDictLangRef = useRef("");
  const [dictSelRange, setDictSelRange] = useState<{ start: number; end: number } | null>(null);
  const dictSelRangeRef = useRef<{ start: number; end: number } | null>(null);
  const dictTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Report output state
  const [findings, setFindings] = useState("");
  const emptyConcVersions = { concise: "", grouped: "" };
  const [conclusionVersions, setConclusionVersions] = useState<Record<string, string>>({ ...emptyConcVersions });
  const [initialFindings, setInitialFindings] = useState("");
  const [initialConclusion, setInitialConclusion] = useState("");
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [loadingConcStyles, setLoadingConcStyles] = useState<Record<string, boolean>>({ concise: false, grouped: false });
  const conclusion = conclusionVersions[conclusionStyle] || "";
  const setConclusion = useCallback((v: string) => {
    setConclusionVersions((prev) => ({ ...prev, [conclusionStyle]: v }));
  }, [conclusionStyle]);
  const loadingConclusion = Object.values(loadingConcStyles).some(Boolean);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedRecTexts, setSelectedRecTexts] = useState<string[]>([]);
  const [outputLanguage, setOutputLanguage] = useState<string>("es");
  const [dictationLanguage, setDictationLanguage] = useState<string>("es");
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceActive, setTraceActive] = useState(false);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  // Hidden templates
  const [hiddenTemplates, setHiddenTemplates] = useState<{ id: string; name: string; modality: string }[]>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [reportModeInfo, setReportModeInfo] = useState<string | null>(null);
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);

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
  const runCorrection = useRef((force?: boolean) => {
    if (correctingRef.current) return;
    const full = dictationRef.current;
    const alreadyCorrected = correctedLenRef.current;
    const newText = full.slice(alreadyCorrected).trim();
    if (!newText || (!force && newText.length < 3)) {
      if (newText) return;
      correctedLenRef.current = full.length;
      setIsCorrecting(false);
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
        correctedLenRef.current = snapshotStart + snapshotText.length;
      })
      .finally(() => {
        correctingRef.current = false;
        const remaining = dictationRef.current.length - correctedLenRef.current;
        if (remaining > 0) {
          setTimeout(() => runCorrection.current(remaining <= 3), 150);
        } else {
          setIsCorrecting(false);
        }
      });
  });

  const startCorrectionLoop = useRef(() => {
    if (correctionIntervalRef.current) return;
    correctionIntervalRef.current = setInterval(() => {
      runCorrection.current();
    }, 5000);
  });

  const stopCorrectionLoop = useRef(() => {
    if (correctionIntervalRef.current) {
      clearInterval(correctionIntervalRef.current);
      correctionIntervalRef.current = null;
    }
  });

  const scheduleDebouncedCorrection = useRef(() => {
    if (correctTimerRef.current) clearTimeout(correctTimerRef.current);
    correctTimerRef.current = setTimeout(() => {
      runCorrection.current();
    }, 1500);
  });

  const whisperDictationStartRef = useRef(0);
  const whisperTemplateSectionsRef = useRef("");
  const whisperStudyContextRef = useRef<string | undefined>(undefined);
  const whisperModalityRef = useRef("");
  const whisperStudyTypeRef = useRef("");

  const { isRecording, isTranscribing, isRefining, audioLevel, interimText, toggleRecording } = useVoiceDictation({
    language: resolvedDictLang,
    templateSections: whisperTemplateSectionsRef.current,
    studyContext: whisperStudyContextRef.current,
    modality: whisperModalityRef.current,
    studyType: whisperStudyTypeRef.current,
    onTranscript: (rawText) => {
      const text = processVoiceCommands(rawText, resolvedDictLangRef.current || resolvedDictLang);
      setDictation((prev) => {
        const sel = dictSelRangeRef.current;
        if (sel && sel.start !== sel.end) {
          const before = prev.slice(0, sel.start);
          const after = prev.slice(sel.end);
          setDictSelRange(null);
          dictSelRangeRef.current = null;
          return before + text + after;
        }
        if (whisperDictationStartRef.current === 0) {
          whisperDictationStartRef.current = prev.length + (prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? 1 : 0);
        }
        const sep = prev && !prev.endsWith(" ") && !prev.endsWith("\n") ? " " : "";
        return prev + sep + text;
      });
      setTraceData(null);
      setVoiceError(null);
      startCorrectionLoop.current();
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
      stopCorrectionLoop.current();
      if (correctTimerRef.current) { clearTimeout(correctTimerRef.current); correctTimerRef.current = null; }
      const waitAndCorrect = () => {
        if (correctingRef.current) {
          setTimeout(waitAndCorrect, 100);
          return;
        }
        const remaining = dictationRef.current.length - correctedLenRef.current;
        if (remaining > 0) {
          runCorrection.current(true);
        }
      };
      setTimeout(waitAndCorrect, 250);
    },
    onWhisperRefine: (whisperText, _deepgramText) => {
      const startIdx = whisperDictationStartRef.current;
      whisperDictationStartRef.current = 0;
      setDictation((prev) => {
        const before = prev.slice(0, startIdx);
        const sep = before && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
        const updated = before + sep + whisperText;
        correctedLenRef.current = updated.length;
        return updated;
      });
      setIsCorrecting(false);
      setTraceData(null);
    },
  });

  useEffect(() => { dictationRef.current = dictation; }, [dictation]);
  useEffect(() => { templatesRef.current = templates; }, [templates]);
  useEffect(() => { selectedTemplateIdRef.current = selectedTemplateId; }, [selectedTemplateId]);
  useEffect(() => { resolvedDictLangRef.current = resolvedDictLang; }, [resolvedDictLang]);
  useEffect(() => { dictSelRangeRef.current = dictSelRange; }, [dictSelRange]);

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

  // Autosave draft with timestamp
  useEffect(() => {
    const interval = setInterval(() => {
      if (dictation || findings || conclusion || clinicalInfo) {
        localStorage.setItem("radiogenai_draft", JSON.stringify({
          savedAt: Date.now(),
          clinicalInfo, dictation, findings, conclusion,
          conclusionVersions,
          selectedModality, selectedSection, selectedTemplateId, contrastOption,
          initialFindings, initialConclusion,
        }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [clinicalInfo, dictation, findings, conclusion, conclusionVersions, selectedModality, selectedSection, selectedTemplateId, contrastOption]);

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

  // Load draft on mount — discard if older than 15 minutes; fall back to last template
  useEffect(() => {
    const raw = localStorage.getItem("radiogenai_draft");
    if (raw) {
      try {
        const d = JSON.parse(raw);
        const age = Date.now() - (d.savedAt || 0);
        if (age > 15 * 60 * 1000) {
          localStorage.removeItem("radiogenai_draft");
        } else {
          if (d.clinicalInfo) setClinicalInfo(d.clinicalInfo);
          if (d.dictation) setDictation(d.dictation);
          if (d.findings) setFindings(d.findings);
          if (d.conclusionVersions) {
            setConclusionVersions(d.conclusionVersions);
          } else if (d.conclusion) {
            setConclusionVersions((prev) => ({ ...prev, [conclusionStyle]: d.conclusion }));
          }
          if (d.selectedModality) setSelectedModality(d.selectedModality);
          if (d.selectedSection) setSelectedSection(d.selectedSection);
          if (d.selectedTemplateId) setSelectedTemplateId(d.selectedTemplateId);
          if (d.contrastOption) setContrastOption(d.contrastOption);
          if (d.initialFindings) setInitialFindings(d.initialFindings);
          if (d.initialConclusion) setInitialConclusion(d.initialConclusion);
          return;
        }
      } catch { /* ignore corrupt draft */ }
    }
    // No valid draft — restore last used template selection
    try {
      const tplRaw = localStorage.getItem("radiogenai_last_template");
      if (tplRaw) {
        const tpl = JSON.parse(tplRaw);
        if (tpl.modality) setSelectedModality(tpl.modality);
        if (tpl.section) setSelectedSection(tpl.section);
        if (tpl.templateId) setSelectedTemplateId(tpl.templateId);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist template selection across sessions
  useEffect(() => {
    if (!selectedModality && !selectedSection && !selectedTemplateId) return;
    localStorage.setItem("radiogenai_last_template", JSON.stringify({
      modality: selectedModality,
      section: selectedSection,
      templateId: selectedTemplateId,
    }));
  }, [selectedModality, selectedSection, selectedTemplateId]);

  // Seed defaults (if needed) then load templates + user config
  useEffect(() => {
    async function seedAndLoad() {
      const [, tplRes, cfgRes] = await Promise.all([
        fetch("/api/seed", { method: "POST" }).catch(() => null),
        fetch("/api/templates"),
        fetch("/api/model-config").catch(() => null),
      ]);
      if (tplRes.ok) setTemplates(await tplRes.json());
      if (cfgRes?.ok) {
        const cfg = await cfgRes.json();
        if (cfg.dictation_language) setDictationLanguage(cfg.dictation_language);
        if (cfg.output_language) setOutputLanguage(cfg.output_language);
        if (cfg.conclusion_style && (cfg.conclusion_style === "concise" || cfg.conclusion_style === "grouped")) setConclusionStyle(cfg.conclusion_style);
      }
    }
    seedAndLoad();

    // Listen for template changes from other components
    const handleTemplatesChanged = () => {
      fetch("/api/templates").then(r => r.ok ? r.json() : null).then(data => {
        if (data) setTemplates(data);
      }).catch(() => {});
    };
    window.addEventListener("radiogenai:templates-changed", handleTemplatesChanged);
    return () => window.removeEventListener("radiogenai:templates-changed", handleTemplatesChanged);
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

  const templateFieldLabels = useMemo(() => {
    if (!selectedTemplate) return [];
    const text = selectedTemplate.structure?.template || "";
    const re = /\*{2,3}([^*]+)\*{2,3}/g;
    const skip = new Set(["FINDINGS", "HALLAZGOS", "ACHADOS", "CONCLUSION", "CONCLUSIÓN", "CONCLUSÃO", "CONCLUSIONES"]);
    const labels: string[] = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      const label = m[1].trim();
      if (label.length > 1 && !skip.has(label.toUpperCase())) {
        labels.push(sec(label));
      }
    }
    return labels;
  }, [selectedTemplate, sec]);

  useEffect(() => { whisperTemplateSectionsRef.current = templateFieldLabels.join(", "); }, [templateFieldLabels]);
  useEffect(() => {
    whisperStudyContextRef.current = selectedTemplate ? `${selectedTemplate.modality || ""} ${selectedTemplate.name || ""}`.trim() : undefined;
    whisperModalityRef.current = selectedTemplate?.modality || "";
    whisperStudyTypeRef.current = selectedTemplate?.name || "";
  }, [selectedTemplate]);

  async function handleHideTemplate(tpl: UserTemplate) {
    if (tpl.is_global) {
      await fetch(`/api/templates?id=${tpl.id}&global=true`, { method: "DELETE" });
    } else if (!tpl.is_org) {
      await fetch(`/api/templates?id=${tpl.id}`, { method: "DELETE" });
    }
    setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
    if (selectedTemplateId === tpl.id) setSelectedTemplateId("");
    window.dispatchEvent(new CustomEvent("radiogenai:templates-changed"));
  }

  async function loadHiddenTemplates() {
    try {
      const res = await fetch("/api/templates/hidden");
      if (res.ok) setHiddenTemplates(await res.json());
    } catch { /* ignore */ }
  }

  async function handleRestoreTemplate(id: string) {
    await fetch(`/api/templates/hidden?id=${id}`, { method: "DELETE" });
    setHiddenTemplates((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
    window.dispatchEvent(new CustomEvent("radiogenai:templates-changed"));
  }

  // Voice recording is handled by useVoiceDictation hook above

  // Generate report
  type ReportMode = "structured" | "compact" | "dictation_only";
  async function handleGenerate(mode: ReportMode = "structured") {
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
    setLoadingConcStyles({ concise: true, grouped: true });
    setFindings("");
    setConclusionVersions({ ...emptyConcVersions });
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
          ...(lightParaphrase ? { paraphraseOverride: "free" } : {}),
          reportMode: mode,
          outputLanguage,
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
          setFindings(t("gen_error") + ": " + streamError);
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
        setFindings(data.error || t("gen_error_findings"));
      }
    } catch (e) {
      findingsFailed = true;
      setFindings(t("gen_error") + ": " + (e instanceof Error ? e.message : t("gen_error_unknown")));
    }
    setLoadingFindings(false);

    if (findingsFailed || !findingsText) {
      if (!findingsFailed) setFindings(t("error.empty_generation"));
      setLoadingConcStyles({ concise: false, grouped: false });
      return;
    }

    // Run trace+repair and conclusion in parallel
    let conclusionText = "";
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
            setRepairMessage(t("trace.auto_repaired").replace("{0}", String(result.repaired_items?.length || "")));
          }

          setTraceData({
            mappings: result.mappings,
            unmatched: result.unmatched,
            hallucinations: result.hallucinations,
            repairedItems: result.repaired_items || [],
          });
          setTraceActive(true);
        }
      } catch (e) {
        console.error("Auto-trace failed:", e);
      } finally {
        setLoadingTrace(false);
      }
    })();

    const concStyles = ["concise", "grouped"] as const;
    const activeStyle = conclusionStyle;

    const conclusionPromise = Promise.all(concStyles.map((style) => (async () => {
      try {
        const res = await fetch("/api/generate/conclusion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingsText,
            clinicalInfo,
            modality: selectedTemplate.modality,
            studyType: studyName,
            conclusionStyle: style,
            outputLanguage,
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
            if (style === activeStyle) {
              setConclusionVersions((prev) => ({ ...prev, [style]: cleanReport(text) }));
            }
          }
          if (streamError) {
            setConclusionVersions((prev) => ({ ...prev, [style]: t("gen_error") + ": " + streamError }));
          } else {
            const cleaned = cleanReport(text);
            setConclusionVersions((prev) => ({ ...prev, [style]: cleaned }));
            if (style === activeStyle) {
              conclusionText = cleaned;
              setInitialConclusion(cleaned);
            }
            if (style === activeStyle) {
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
          }
        } else {
          const data = await res.json().catch(() => ({ error: "Generation failed" }));
          setConclusionVersions((prev) => ({ ...prev, [style]: data.error || t("gen_error_conclusion") }));
        }
      } catch (e) {
        setConclusionVersions((prev) => ({ ...prev, [style]: t("gen_error") + ": " + (e instanceof Error ? e.message : t("gen_error_unknown")) }));
      } finally {
        setLoadingConcStyles((prev) => ({ ...prev, [style]: false }));
      }
    })()));

    await Promise.all([tracePromise, conclusionPromise]);
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
            recommendations_text: "",
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

  const copyFormattedRef = useRef<(mode: "findings" | "findings_conclusion" | "full") => void>(null as unknown as (mode: "findings" | "findings_conclusion" | "full") => void);

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyFormatted(mode: "findings" | "findings_conclusion" | "full") {
    const title = getStudyTitle();
    const cleanFindings = cleanReport(findings);
    const cleanConclusion = cleanReport(conclusion);
    const headers = SECTION_HEADERS[outputLanguage] || SECTION_HEADERS.es;

    let text = "";
    if (title) text += title + "\n\n";
    text += headers.findings + "\n" + cleanFindings;
    if (mode === "findings_conclusion" || mode === "full") {
      text += "\n\n" + headers.conclusion + "\n" + cleanConclusion;
    }
    if (selectedRecTexts.length > 0 && (mode === "findings_conclusion" || mode === "full")) {
      text += "\n\n" + headers.recommendations + "\n" + selectedRecTexts.map((t) => "- " + t).join("\n");
    }
    if (mode !== "findings" && activeSignatureRef.current) {
      text += "\n\n" + activeSignatureRef.current;
    }

    const id = mode === "findings" ? "f" : mode === "findings_conclusion" ? "fc" : "all";
    copyText(text, id);

    logCorrectionIfNeeded();
    flushCorrections().catch(() => {});
    fetch("/api/signatures").then((sRes) => {
      if (sRes.ok) return sRes.json();
    }).then((sigs: { is_active: boolean; body: string }[] | undefined) => {
      if (sigs) {
        const active = sigs.find((s) => s.is_active);
        activeSignatureRef.current = active ? active.body : null;
      }
    }).catch(() => {});
  }
  copyFormattedRef.current = copyFormatted;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault();
        copyFormattedRef.current?.("findings_conclusion");
      }
      if (e.ctrlKey && e.key === "a") {
        const tag = (e.target as HTMLElement)?.tagName;
        const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          toggleRecording();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleRecording]);

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
          recommendations_text: "",
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
    setConclusionVersions({ ...emptyConcVersions });
    setInitialFindings("");
    setInitialConclusion("");
    setClinicalInfo("");
    setTraceData(null);
    setTraceActive(false);
    setRepairMessage(null);
    setPiiMatches([]);
    setPiiDismissed(false);
    setGenerationDurationMs(null);
    setLastSavedReportId(null);
    setErrorReported(false);
    correctionLoggedRef.current = false;
    correctedLenRef.current = 0;
    stopCorrectionLoop.current();
    if (correctTimerRef.current) { clearTimeout(correctTimerRef.current); correctTimerRef.current = null; }
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

  const isGenerating = loadingFindings || loadingConclusion;
  const hasOutput = findings || conclusion || isGenerating;
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
                  ref={dictTextareaRef}
                  placeholder={t("dash.dictation_placeholder")}
                  value={dictation}
                  onChange={(e) => { setDictation(e.target.value); setTraceData(null); setRepairMessage(null); }}
                  onSelect={(e) => {
                    const ta = e.currentTarget;
                    if (ta.selectionStart !== ta.selectionEnd) {
                      setDictSelRange({ start: ta.selectionStart, end: ta.selectionEnd });
                    } else {
                      setDictSelRange(null);
                    }
                  }}
                  className="min-h-[140px] md:min-h-[180px] text-sm pr-14"
                />
                <SelectionHighlight text={dictation} range={dictSelRange} textareaRef={dictTextareaRef} className="px-3 py-2 pr-14" />
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  className={`absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 rounded-full transition-shadow ${isRecording ? "recording-pulse" : ""}`}
                  style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 12)}px rgba(239,68,68,${0.15 + audioLevel * 0.25})` } : undefined}
                  onClick={toggleRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {!isRecording && !isTranscribing && !isCorrecting && !isRefining && (
                  <div className="absolute top-1 right-1">
                    <span className="text-[7px] font-bold px-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 uppercase">Beta</span>
                  </div>
                )}
                {(isRecording || isTranscribing || isCorrecting || isRefining) && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className={`text-[10px] ${isRecording ? "bg-red-500 text-white animate-pulse" : isRefining ? "bg-emerald-500 text-white animate-pulse gap-1" : isCorrecting ? "bg-purple-500 text-white animate-pulse gap-1" : "bg-blue-500 text-white animate-pulse gap-1"}`}>
                      {isRecording ? "REC" : isRefining ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Refining</> : isCorrecting ? <><Wand2 className="h-2.5 w-2.5" /> Correcting</> : <><Loader2 className="h-2.5 w-2.5 animate-spin" /> STT</>}
                    </Badge>
                  </div>
                )}
              </div>
              {dictSelRange && dictSelRange.start !== dictSelRange.end && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Pencil className="h-3 w-3 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Texto seleccionado — al dictar se reemplazará
                  </p>
                  <button onClick={() => setDictSelRange(null)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="h-3 w-3" /></button>
                </div>
              )}
              {interimText && isRecording && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-300 italic">{interimText}</p>
                </div>
              )}
              {voiceError && <p className="text-xs text-red-500 dark:text-red-400">{voiceError}</p>}
              {piiWarningBanner}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("structured")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><List className="h-3.5 w-3.5" /> {t("dash.generate_structured")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "structured" ? null : "structured"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-indigo-300/60 hover:bg-indigo-300 transition-colors" />
                </div>
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("compact")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><AlignLeft className="h-3.5 w-3.5" /> {t("dash.generate_compact")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "compact" ? null : "compact"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-teal-300/60 hover:bg-teal-300 transition-colors" />
                </div>
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("dictation_only")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><Pencil className="h-3.5 w-3.5" /> {t("dash.generate_dictation_only")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "dictation_only" ? null : "dictation_only"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-amber-300/60 hover:bg-amber-300 transition-colors" />
                </div>
              </div>
              {reportModeInfo && (
                <div className="text-[11px] px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 animate-[fade-in_0.15s_ease-out]">
                  {t(`dash.mode_info_${reportModeInfo}`)}
                </div>
              )}
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
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setShowTemplateHelp(!showTemplateHelp)} className={`p-1 rounded-full transition-colors ${showTemplateHelp ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40" : "text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"}`}>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSetupCollapsed(true)}
                    className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                  >
                    <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                  </button>
                </div>
              </div>
              {showTemplateHelp && (
                <div className="text-[11px] text-gray-600 dark:text-gray-300 mb-3 px-3 py-2 leading-relaxed rounded-md bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 animate-[fade-in_0.15s_ease-out]">
                  {t("dash.templates_help")}
                </div>
              )}

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

                {selectedTemplate && (
                  <button
                    type="button"
                    onClick={() => handleHideTemplate(selectedTemplate)}
                    className="p-1.5 text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors rounded"
                    title={t("dash.hide_template")}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                )}

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
                  ref={dictTextareaRef}
                  placeholder={t("dash.dictation_placeholder")}
                  value={dictation}
                  onChange={(e) => { setDictation(e.target.value); setTraceData(null); setRepairMessage(null); }}
                  onSelect={(e) => {
                    const ta = e.currentTarget;
                    if (ta.selectionStart !== ta.selectionEnd) {
                      setDictSelRange({ start: ta.selectionStart, end: ta.selectionEnd });
                    } else {
                      setDictSelRange(null);
                    }
                  }}
                  className="min-h-[140px] md:min-h-[180px] text-sm pr-14 resize-none"
                />
                <SelectionHighlight text={dictation} range={dictSelRange} textareaRef={dictTextareaRef} className="px-3 py-2 pr-14" />
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  className={`absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 rounded-full transition-shadow ${isRecording ? "recording-pulse" : ""}`}
                  style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 12)}px rgba(239,68,68,${0.15 + audioLevel * 0.25})` } : undefined}
                  onClick={toggleRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {!isRecording && !isTranscribing && !isCorrecting && !isRefining && (
                  <div className="absolute top-1 right-1">
                    <span className="text-[7px] font-bold px-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 uppercase">Beta</span>
                  </div>
                )}
                {(isRecording || isTranscribing || isCorrecting || isRefining) && (
                  <div className="absolute bottom-2 right-2">
                    <Badge className={`text-[10px] ${isRecording ? "bg-red-500 text-white animate-pulse" : isRefining ? "bg-emerald-500 text-white animate-pulse gap-1" : isCorrecting ? "bg-purple-500 text-white animate-pulse gap-1" : "bg-blue-500 text-white animate-pulse gap-1"}`}>
                      {isRecording ? "REC" : isRefining ? <><Loader2 className="h-2.5 w-2.5 animate-spin" /> Refining</> : isCorrecting ? <><Wand2 className="h-2.5 w-2.5" /> Correcting</> : <><Loader2 className="h-2.5 w-2.5 animate-spin" /> STT</>}
                    </Badge>
                  </div>
                )}
              </div>
              {dictSelRange && dictSelRange.start !== dictSelRange.end && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <Pencil className="h-3 w-3 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Texto seleccionado — al dictar se reemplazará
                  </p>
                  <button onClick={() => setDictSelRange(null)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="h-3 w-3" /></button>
                </div>
              )}
              {interimText && isRecording && (
                <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-600 dark:text-blue-300 italic">{interimText}</p>
                </div>
              )}
              {voiceError && <p className="text-xs text-red-500 dark:text-red-400">{voiceError}</p>}
              {piiWarningBanner}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("structured")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><List className="h-3.5 w-3.5" /> {t("dash.generate_structured")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "structured" ? null : "structured"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-indigo-300/60 hover:bg-indigo-300 transition-colors" />
                </div>
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("compact")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><AlignLeft className="h-3.5 w-3.5" /> {t("dash.generate_compact")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "compact" ? null : "compact"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-teal-300/60 hover:bg-teal-300 transition-colors" />
                </div>
                <div className="relative">
                  <Button
                    onClick={() => handleGenerate("dictation_only")}
                    disabled={!canGenerate}
                    className="w-full h-11 md:h-9 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                  >
                    {isGenerating ? <LoadingDots size="xs" /> : <><Pencil className="h-3.5 w-3.5" /> {t("dash.generate_dictation_only")}</>}
                  </Button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setReportModeInfo(reportModeInfo === "dictation_only" ? null : "dictation_only"); }} className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-sm bg-amber-300/60 hover:bg-amber-300 transition-colors" />
                </div>
              </div>
              {reportModeInfo && (
                <div className="text-[11px] px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 animate-[fade-in_0.15s_ease-out]">
                  {t(`dash.mode_info_${reportModeInfo}`)}
                </div>
              )}
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

      {/* ── Template watermark ── */}
      {!hasOutput && selectedTemplate && templateFieldLabels.length > 0 && (
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              {t("dash.template_fields")}
            </p>
            <ul className="space-y-0.5">
              {templateFieldLabels.map((label) => (
                <li key={label} className="text-xs text-gray-300 dark:text-gray-600">
                  {label}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Output ── */}
      {hasOutput && (
        <div className="space-y-3">
          {isGenerating && !findings && !conclusion && (
            <Card><CardContent className="p-0"><AnatomyLoader /></CardContent></Card>
          )}

          {loadingTrace && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <LoadingDots size="sm" className="text-blue-500" />
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
            onChange={(v) => { setFindings(v); reportDirtyRef.current = true; }}
            onEdit={() => { setTraceData(null); setRepairMessage(null); }}
            minHeight={140}
            traceHighlights={findingsHighlights.length > 0 ? findingsHighlights : undefined}
            traceLocked={loadingTrace}
            isDark={isDark}
          />

          <OutputCard
            title={t("dash.conclusion")}
            icon={<CircleCheck className="h-3.5 w-3.5 text-green-600" />}
            loading={loadingConcStyles[conclusionStyle] ?? false}
            value={conclusion}
            onChange={(v) => { setConclusionVersions((prev) => ({ ...prev, [conclusionStyle]: v })); reportDirtyRef.current = true; }}
            minHeight={70}
            headerExtra={
              <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
                {(["concise", "grouped"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setConclusionStyle(s);
                      fetch("/api/model-config", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ conclusion_style: s }),
                      }).catch(() => {});
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      conclusionStyle === s
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : loadingConcStyles[s] ? "text-gray-400 dark:text-gray-500"
                        : conclusionVersions[s] ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {loadingConcStyles[s] && s !== conclusionStyle ? <LoadingDots size="xs" className="inline-flex mr-0.5" /> : null}
                    {t(`dash.conclusion_${s}`)}
                  </button>
                ))}
              </div>
            }
          />

          <RecommendationPanel
            conclusionText={conclusion}
            modality={selectedModality}
            section={selectedSection}
            outputLanguage={outputLanguage as "es" | "en" | "pt"}
            visible={!!conclusion}
            onSelectionChange={setSelectedRecTexts}
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
                    <kbd className="hidden md:inline ml-0.5 px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[9px] text-gray-400 font-mono leading-none">⇧ Space</kbd>
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
                {reportingError ? <LoadingDots size="sm" /> : t("dash.report_error_send")}
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

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              {t("dash.restore_templates_title")}
            </DialogTitle>
          </DialogHeader>
          {hiddenTemplates.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{t("dash.no_hidden_templates")}</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {hiddenTemplates.map((tpl) => (
                <div key={tpl.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{tpl.name}</p>
                    <p className="text-[10px] text-gray-400">{tpl.modality}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-7 text-xs gap-1"
                    onClick={() => handleRestoreTemplate(tpl.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("dash.restore")}
                  </Button>
                </div>
              ))}
            </div>
          )}
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
  onEdit,
  minHeight,
  headerExtra,
  traceHighlights,
  traceLocked,
  isDark,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  onEdit?: () => void;
  minHeight: number;
  headerExtra?: React.ReactNode;
  traceHighlights?: { start: number; end: number; colorIdx: number; fragment: string; section?: string; isUnmatched?: boolean }[];
  traceLocked?: boolean;
  isDark?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const showTrace = traceHighlights && traceHighlights.length > 0;

  useEffect(() => {
    if (!showTrace) setEditing(false);
  }, [showTrace]);

  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3 pb-1.5 gap-2">
        <h3 className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 shrink-0">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          {headerExtra}
          {showTrace && !traceLocked && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-[10px] text-brand hover:text-brand/80 font-medium transition-colors"
            >
              <Pencil className="h-3 w-3" />
              {t("edit")}
            </button>
          )}
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(false); onEdit?.(); }}
              className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 dark:text-green-400 font-medium transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              OK
            </button>
          )}
          {loading && <LoadingDots size="xs" className="text-brand" />}
        </div>
      </div>
      <CardContent className="pt-0 px-4 pb-3">
        {loading && !value ? (
          <div
            className="relative overflow-hidden rounded-md bg-gray-100 dark:bg-gray-800"
            style={{ height: minHeight }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        ) : loading && value ? (
          <div
            className="streaming-cursor whitespace-pre-wrap text-sm leading-relaxed p-3 border rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 animate-[fade-in_0.15s_ease-out]"
            style={{ minHeight }}
          >
            {value}
          </div>
        ) : showTrace && !editing ? (
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

