"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  ThumbsUp,
  ThumbsDown,
  AlignLeft,
  List,
  X,
  RotateCcw,
  HelpCircle,
  Heart,
  Target,
  Search,
  Tags,
  ClipboardCheck,
  Plus,
} from "lucide-react";
import { MODALITIES, SECTIONS, PLANS, DICTATION_LANGUAGES, type UserTemplate, type SubscriptionPlan } from "@/lib/types";
import { HighlightedText, TraceLegend, useTraceHighlights, type TraceData } from "./trace-highlight";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useVoiceDictation } from "@/hooks/use-voice-dictation";
import { processVoiceCommands } from "@/lib/voice-commands";
import { AnatomyLoader } from "./anatomy-loader";
// FloatingDictation removed — dictation is inline only
import { useT, useSection, useTemplateName, useModality } from "@/lib/i18n";
import { detectPii, stripPii, type PiiMatch } from "@/lib/pii-detect";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RecommendationPanel } from "./recommendation-panel";
import { SelectionHighlight } from "@/components/ui/selection-highlight";
import { toast } from "sonner";
import { NpsSurvey } from "./nps-survey";
import { RadiogenBot } from "@/components/sidebar/radiogen-bot";
import { OnboardingDialog } from "./onboarding-dialog";
import { computeEditDistance, computeStructuralCompleteness } from "@/lib/pilot-metrics";
import { useUIPrefs } from "@/lib/ui-prefs";
import { copyToClipboard } from "@/lib/copy-text";
import { track } from "@/lib/track";
import { AutoGrowTextarea } from "@/components/ui/autogrow-textarea";

export function DashboardContent() {
  const supabase = createClient();
  const t = useT();
  const sec = useSection();
  const tplName = useTemplateName();
  const modName = useModality();
  const { prefs: uiPrefs } = useUIPrefs();

  // Templates state
  const [templates, setTemplates] = useState<UserTemplate[]>([]);
  const [selectedModality, setSelectedModality] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateSearchReadOnly, setTemplateSearchReadOnly] = useState(true);
  const [contrastOption, setContrastOption] = useState<string>("default");
  const [cardiacTechniques, setCardiacTechniques] = useState<Record<string, boolean>>({});
  const [recistBaseline, setRecistBaseline] = useState(true);
  const [recistPriorReport, setRecistPriorReport] = useState("");

  // Clinical info state
  const [clinicalInfo, setClinicalInfo] = useState("");
  // Start open but thin: a visible hint of where clinical context goes (so it
  // isn't typed into the findings box). The textarea auto-grows with content.
  const [clinicalOpen, setClinicalOpen] = useState(true);

  // First-time user (never generated a report): shows the "try an example"
  // button and the one-time post-generation classify nudge. Verified against
  // the server (report count) and then remembered locally.
  const [isFirstTime, setIsFirstTime] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem("rg_ftu_done") === "1") return; } catch { return; }
    fetch("/api/reports?count_only=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if ((d.count || 0) > 0) {
          try { localStorage.setItem("rg_ftu_done", "1"); } catch { /* ignore */ }
        } else {
          setIsFirstTime(true);
        }
      })
      .catch(() => {});
  }, []);
  const markFirstUseDone = () => {
    try { localStorage.setItem("rg_ftu_done", "1"); } catch { /* ignore */ }
    setIsFirstTime(false);
  };

  // One-time 👍/👎 after the first dictation session, to learn why users who
  // try dictation don't come back (perceived transcription quality).
  const [dictFeedback, setDictFeedback] = useState<"hidden" | "show" | "done">("hidden");
  const rateDictation = (verdict: "up" | "down") => {
    track("ui_dictation_feedback", { verdict });
    try { localStorage.setItem("rg_dict_fb_done", "1"); } catch { /* ignore */ }
    setDictFeedback("done");
    window.setTimeout(() => setDictFeedback("hidden"), 2500);
  };
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [lightParaphrase, setLightParaphrase] = useState(false);
  const [conclusionStyle, setConclusionStyle] = useState<"concise" | "grouped">("grouped");
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);
  const [detectingSystems, setDetectingSystems] = useState(false);
  const [detectedSystems, setDetectedSystems] = useState<{ id: string; label: string }[] | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<Set<string>>(new Set());
  const [preflightQuestions, setPreflightQuestions] = useState<{ id: string; question: string; options: string[] }[] | null>(null);
  const [preflightAnswers, setPreflightAnswers] = useState<Record<string, string>>({});
  const [preflightSystems, setPreflightSystems] = useState<string[]>([]);
  const [checkingPreflight, setCheckingPreflight] = useState(false);
  const [classifyEmpty, setClassifyEmpty] = useState(false);

  // Clinical check state
  const [clinicalCheckRunning, setClinicalCheckRunning] = useState(false);
  const [clinicalSuggestions, setClinicalSuggestions] = useState<{
    id: string;
    question: string;
    section: string;
    options: { label: string; insertText: string }[];
  }[] | null>(null);
  const [clinicalAnswers, setClinicalAnswers] = useState<Record<string, number | null>>({});
  const [clinicalEmpty, setClinicalEmpty] = useState(false);

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
  const loadingConclusion = Object.values(loadingConcStyles).some(Boolean);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedRecTexts, setSelectedRecTexts] = useState<string[]>([]);
  // Report output language is unified with the platform UI language.
  const outputLanguage = uiPrefs.uiLanguage;
  const handleGenerateRef = useRef<(mode?: ReportMode, langOverride?: string) => void>(() => {});
  const detectSystemsRef = useRef<() => void>(() => {});
  // Post-generation auto-save (called via ref so it sees fresh state) and
  // abandonment tracking (generated but never copied when leaving the page).
  const saveReportQuietlyRef = useRef<() => Promise<void>>(async () => {});
  const abandonRef = useRef({ generated: false, copied: false });
  useEffect(() => {
    const onPageHide = () => {
      if (abandonRef.current.generated && !abandonRef.current.copied) {
        track("ui_abandon_after_generate");
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);
  const [dictationLanguage, setDictationLanguage] = useState<string>("es");
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [traceActive, setTraceActive] = useState(false);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [repairMessage, setRepairMessage] = useState<string | null>(null);

  // Hidden templates
  const [reportMode, setReportModeState] = useState<ReportMode>("structured");
  const setReportMode = (mode: ReportMode) => {
    setReportModeState(mode);
    try { localStorage.setItem("rg_report_mode", mode); } catch {};
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem("rg_report_mode") as ReportMode | null;
      if (saved && ["structured", "compact", "dictation_only", "unstructured"].includes(saved)) setReportModeState(saved);
    } catch {}
  }, []);
  const [showTemplateHelp, setShowTemplateHelp] = useState(false);

  // PII detection
  const [piiMatches, setPiiMatches] = useState<PiiMatch[]>([]);
  const [_piiDismissed, setPiiDismissed] = useState(false); // kept for reset logic

  // Pilot metrics
  const reportStartTimeRef = useRef(0);
  const dictationCharsRef = useRef(0);
  const [showNpsSurvey, setShowNpsSurvey] = useState(false);

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
  const abortControllerRef = useRef<AbortController | null>(null);
  // Cancel any in-flight generation streams when the component unmounts.
  useEffect(() => () => { abortControllerRef.current?.abort(); }, []);
  interface ReportSnapshot {
    dictation: string; findings: string; conclusionVersions: Record<string, string>;
    initialFindings: string; initialConclusion: string; clinicalInfo: string;
    selectedTemplateId: string; contrastOption: string; cardiacTechniques: Record<string, boolean>;
    traceData: TraceData | null; traceActive: boolean; lastSavedReportId: string | null;
    generationDurationMs: number | null; errorReported: boolean;
  }
  const previousReportRef = useRef<ReportSnapshot | null>(null);
  const [hasPreviousReport, setHasPreviousReport] = useState(false);
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

  // Subscription usage (inline — replaces StatsPanel)
  const [_subPlan, setSubPlan] = useState<string>("free");
  const [_subReportsUsed, setSubReportsUsed] = useState(0);
  const [_subReportsLimit, setSubReportsLimit] = useState(30);
  const [_subDictUsedMin, setSubDictUsedMin] = useState(0);
  const [_subDictLimitMin, setSubDictLimitMin] = useState(30);
  const [_subLoaded, setSubLoaded] = useState(false);

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

  const whisperDictationStartRef = useRef(-1);
  const whisperSkipRef = useRef(false);
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
      dictationCharsRef.current += text.length;
      setDictation((prev) => {
        const sel = dictSelRangeRef.current;
        if (sel && sel.start !== sel.end) {
          whisperSkipRef.current = true;
          const before = prev.slice(0, sel.start);
          const after = prev.slice(sel.end);
          setDictSelRange(null);
          dictSelRangeRef.current = null;
          return before + text + after;
        }
        if (whisperDictationStartRef.current === -1) {
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
      if (whisperSkipRef.current || whisperDictationStartRef.current === -1) {
        whisperSkipRef.current = false;
        return;
      }
      const processed = processVoiceCommands(whisperText, resolvedDictLangRef.current || resolvedDictLang);
      const startIdx = whisperDictationStartRef.current;
      whisperDictationStartRef.current = -1;
      setDictation((prev) => {
        if (startIdx > prev.length) return prev;
        const before = prev.slice(0, startIdx);
        const sep = before && !before.endsWith(" ") && !before.endsWith("\n") ? " " : "";
        const updated = before + sep + processed;
        correctedLenRef.current = updated.length;
        return updated;
      });
      setIsCorrecting(false);
      setTraceData(null);
    },
  });

  useEffect(() => {
    if (isRecording) {
      whisperDictationStartRef.current = -1;
      whisperSkipRef.current = false;
    }
  }, [isRecording]);

  // Show the one-time dictation feedback prompt when a recording session ends.
  const prevRecordingRef = useRef(false);
  useEffect(() => {
    if (prevRecordingRef.current && !isRecording && dictationRef.current.trim()) {
      try {
        if (localStorage.getItem("rg_dict_fb_done") !== "1") setDictFeedback("show");
      } catch { /* ignore */ }
    }
    prevRecordingRef.current = isRecording;
  }, [isRecording]);

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

      // Flush pilot metrics edit distance on unload
      if (s.lastSavedReportId && s.initialFindings) {
        const finalText = s.findings + s.conclusion;
        const origText = s.initialFindings + s.initialConclusion;
        const editDist = computeEditDistance(origText, finalText);
        navigator.sendBeacon(
          "/api/metrics",
          new Blob([JSON.stringify({
            _method: "PATCH",
            report_id: s.lastSavedReportId,
            final_length: finalText.length,
            edit_distance: editDist,
            report_end_at: new Date().toISOString(),
            final_findings_text: s.findings,
            final_conclusion_text: s.conclusion,
          })], { type: "application/json" }),
        );
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
    // Listen for config changes (language, dictation language, etc.)
    const handleConfigChanged = () => {
      fetch("/api/model-config").then(r => r.ok ? r.json() : null).then(cfg => {
        if (!cfg) return;
        if (cfg.dictation_language) setDictationLanguage(cfg.dictation_language);
        if (cfg.conclusion_style && (cfg.conclusion_style === "concise" || cfg.conclusion_style === "grouped")) setConclusionStyle(cfg.conclusion_style);
      }).catch(() => {});
    };
    const handleLangChanged = (e: Event) => {
      const lang = (e as CustomEvent).detail?.lang;
      if (lang) {
        // The UI language (source of truth) is updated by the shell via uiPrefs;
        // here we just regenerate the current report in the new language.
        handleGenerateRef.current(undefined, lang);
      }
    };
    // Onboarding email deep-link (/dashboard?tool=classify): run classification.
    const handleOpenClassify = () => detectSystemsRef.current();
    window.addEventListener("radiogenai:templates-changed", handleTemplatesChanged);
    window.addEventListener("radiogenai:config-changed", handleConfigChanged);
    window.addEventListener("radiogenai:output-lang-changed", handleLangChanged);
    window.addEventListener("radiogenai:open-classify", handleOpenClassify);
    return () => {
      window.removeEventListener("radiogenai:templates-changed", handleTemplatesChanged);
      window.removeEventListener("radiogenai:config-changed", handleConfigChanged);
      window.removeEventListener("radiogenai:output-lang-changed", handleLangChanged);
      window.removeEventListener("radiogenai:open-classify", handleOpenClassify);
    };
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

  const searchResults = useMemo(() => {
    if (!templateSearch.trim()) return templates.slice(0, 30);
    const q = templateSearch.toLowerCase();
    return templates.filter((t) =>
      tplName(t.name).toLowerCase().includes(q) ||
      (t.modality || "").toLowerCase().includes(q) ||
      (t.structure?.section || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [templates, templateSearch, tplName]);

  const isCardiacMri = useMemo(() => {
    if (!selectedTemplate) return false;
    const name = (selectedTemplate.name || "").toLowerCase();
    return selectedTemplate.modality === "MRI" && /card[ií]a|cardiac|coraz[oó]n/.test(name);
  }, [selectedTemplate]);

  const isRecistStudy = useMemo(() => {
    if (!selectedTemplate) return false;
    if (selectedTemplate.modality === "RECIST") return true;
    const name = (selectedTemplate.name || "").toLowerCase();
    return /recist|seguimiento\s*(oncol|tumoral)|tumor\s*response|oncol[oó]g.*seguimiento/.test(name);
  }, [selectedTemplate]);

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

  // Hidden-template management (load/restore) lives in templates-tab.tsx.

  // Voice recording is handled by useVoiceDictation hook above

  // Generate report
  // First-time helper: fill a realistic sample case (chest CT) so a new user
  // can press Generate and see the product working without a real case at hand.
  function loadExampleCase() {
    track("ui_try_example");
    const samples: Record<string, string> = {
      es: "Masa pulmonar de 43 milímetros en el lóbulo superior izquierdo, de bordes espiculados. Adenopatía supraclavicular izquierda de 15 milímetros. Pequeño derrame pleural derecho. Resto sin alteraciones significativas.",
      en: "43 millimeter pulmonary mass in the left upper lobe with spiculated margins. 15 millimeter left supraclavicular adenopathy. Small right pleural effusion. No other significant findings.",
      pt: "Massa pulmonar de 43 milímetros no lobo superior esquerdo, com margens espiculadas. Adenopatia supraclavicular esquerda de 15 milímetros. Pequeno derrame pleural direito. Restante sem alterações significativas.",
    };
    const tpl =
      templates.find((tp) => tp.modality === "CT" && /t[oó]rax|chest/i.test(tp.name)) ||
      templates.find((tp) => tp.modality === "CT") ||
      templates[0];
    if (tpl) {
      setSelectedModality(tpl.modality);
      if (tpl.structure?.section) setSelectedSection(tpl.structure.section);
      setSelectedTemplateId(tpl.id);
    }
    setDictation(samples[outputLanguage] || samples.es);
    correctedLenRef.current = 0;
    setTraceData(null);
    if (!reportStartTimeRef.current) reportStartTimeRef.current = Date.now();
    toast(t("dash.example_loaded"), { duration: 8000 });
  }

  type ReportMode = "structured" | "compact" | "dictation_only" | "unstructured";
  async function handleGenerate(mode: ReportMode = "structured", langOverride?: string) {
    const effectiveLang = langOverride ?? outputLanguage;
    if (!selectedTemplate || !dictation.trim()) return;
    // First generation ever → after it completes, nudge toward the classify tool.
    const firstGen = isFirstTime;

    // Log any pending corrections from the previous report before starting a new generation
    logCorrectionIfNeeded();
    if (lastSavedReportId && reportDirtyRef.current) {
      await flushCorrections();
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

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

    let studyName = selectedTemplate.name +
      (contrastOption === "con_contraste" ? " con contraste" : contrastOption === "sin_contraste" ? " sin contraste" : "");

    const activeTechs = Object.entries(cardiacTechniques).filter(([, v]) => v).map(([k]) => k);
    if (activeTechs.length > 0) {
      studyName += ` (${activeTechs.join(", ")})`;
    }

    // Stream findings — text appears progressively
    let findingsText = "";
    let findingsFailed = false;
    try {
      const res = await fetch("/api/generate/findings", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: templateText,
          dictation,
          modality: selectedTemplate.modality,
          studyType: studyName,
          ...(lightParaphrase ? { paraphraseOverride: "free" } : {}),
          reportMode: mode,
          outputLanguage: effectiveLang,
          ...(activeTechs.length > 0 ? { cardiacTechniques: activeTechs } : {}),
          ...(isRecistStudy ? { recistConfig: { isBaseline: recistBaseline, priorReport: recistBaseline ? undefined : recistPriorReport || undefined } } : {}),
        }),
      });

      if (res.ok && res.body) {
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
      if (signal.aborted) { setLoadingFindings(false); setLoadingConcStyles({ concise: false, grouped: false }); return; }
      findingsFailed = true;
      setFindings(t("gen_error") + ": " + (e instanceof Error ? e.message : t("gen_error_unknown")));
    }
    setLoadingFindings(false);

    if (signal.aborted) { setLoadingConcStyles({ concise: false, grouped: false }); return; }

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
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dictation, findings: findingsText, outputLanguage: effectiveLang }),
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
          signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingsText,
            clinicalInfo,
            modality: selectedTemplate.modality,
            studyType: studyName,
            conclusionStyle: style,
            outputLanguage: effectiveLang,
            ...(activeTechs.length > 0 ? { cardiacTechniques: activeTechs } : {}),
            ...(isRecistStudy ? { recistConfig: { isBaseline: recistBaseline, priorReport: recistBaseline ? undefined : recistPriorReport || undefined } } : {}),
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

    // Auto-save the generated report as a draft so nothing is lost if the user
    // closes the tab without copying (via ref: the closure state is stale here).
    if (!signal.aborted) {
      abandonRef.current = { generated: true, copied: false };
      window.setTimeout(() => { saveReportQuietlyRef.current().catch(() => {}); }, 1000);
    }

    // One-time (first report ever): point the user to the classify tool while
    // they're looking at their first generated result.
    if (firstGen && !signal.aborted) {
      markFirstUseDone();
      window.setTimeout(() => toast(t("dash.first_gen_nudge"), { duration: 12000 }), 1500);
    }

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

            // Pilot metrics — fire-and-forget
            const templateTextForMetrics = templateText;
            const totalInputChars = dictation.length;
            const dictChars = dictationCharsRef.current;
            const { total: secTotal, filled: secFilled } = computeStructuralCompleteness(templateTextForMetrics, findingsText);
            const aiDraftLen = findingsText.length + conclusionText.length;
            fetch("/api/metrics", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                report_id: saved.id,
                report_start_at: reportStartTimeRef.current ? new Date(reportStartTimeRef.current).toISOString() : null,
                report_end_at: new Date().toISOString(),
                dictation_chars: dictChars,
                manual_chars: Math.max(0, totalInputChars - dictChars),
                total_chars: totalInputChars,
                template_sections_total: secTotal,
                template_sections_filled: secFilled,
                ai_draft_length: aiDraftLen,
                final_length: aiDraftLen,
                edit_distance: 0,
                ai_findings_text: findingsText,
                ai_conclusion_text: conclusionText,
                study_type: studyName,
              }),
            }).catch(() => {});

            // Check NPS survey eligibility
            fetch("/api/pilot/survey").then((r) => r.ok ? r.json() : null).then((d) => {
              if (d?.showSurvey) setShowNpsSurvey(true);
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

  handleGenerateRef.current = (mode, lang) => {
    if (findings.trim() && selectedTemplate && dictation.trim()) {
      handleGenerate(mode ?? reportMode, lang);
    }
  };

  function stopGeneration() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoadingFindings(false);
    setLoadingConcStyles({ concise: false, grouped: false });
    setLoadingTrace(false);
    toast(t("toast.generation_stopped"));
  }

  detectSystemsRef.current = () => { handleDetectSystems(); };
  async function handleDetectSystems() {
    track("ui_classify_clicked");
    if (!conclusion.trim() || detectingSystems) return;
    setDetectingSystems(true);
    setDetectedSystems(null);
    setSelectedSystems(new Set());
    setPreflightQuestions(null);
    setPreflightAnswers({});
    setClassifyEmpty(false);
    try {
      const res = await fetch("/api/generate/classify/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conclusion: conclusion.trim(),
          findings: findings.trim(),
          language: outputLanguage,
        }),
      });
      if (!res.ok) {
        toast.error(t("gen_error"));
        return;
      }
      const data = await res.json();
      const systems: { id: string; label: string }[] = data.systems || [];
      if (systems.length === 0) {
        setClassifyEmpty(true);
        return;
      }
      if (systems.length === 1) {
        setDetectedSystems(null);
        await runPreflight(systems.map((s) => s.id));
        return;
      }
      setDetectedSystems(systems);
      setSelectedSystems(new Set(systems.map((s) => s.id)));
    } catch {
      toast.error(t("gen_error"));
    } finally {
      setDetectingSystems(false);
    }
  }

  async function runPreflight(systemIds: string[]) {
    setCheckingPreflight(true);
    setDetectedSystems(null);
    try {
      const res = await fetch("/api/generate/classify/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conclusion: conclusion.trim(),
          findings: findings.trim(),
          language: outputLanguage,
          systems: systemIds,
        }),
      });
      if (!res.ok) {
        await runClassify(systemIds);
        return;
      }
      const data = await res.json();
      const questions: { id: string; question: string; options: string[] }[] = data.questions || [];
      if (questions.length === 0) {
        await runClassify(systemIds);
        return;
      }
      setPreflightSystems(systemIds);
      setPreflightQuestions(questions);
      setPreflightAnswers({});
    } catch {
      await runClassify(systemIds);
    } finally {
      setCheckingPreflight(false);
    }
  }

  function buildAdditionalContext(): string {
    return Object.entries(preflightAnswers)
      .map(([qId, answer]) => {
        const q = preflightQuestions?.find((pq) => pq.id === qId);
        return q ? `${q.question} → ${answer}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  async function runClassify(systemIds?: string[], extraContext?: string) {
    setClassifying(true);
    setClassifyResult(null);
    setDetectedSystems(null);
    setPreflightQuestions(null);
    setClassifyEmpty(false);
    try {
      const res = await fetch("/api/generate/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conclusion: conclusion.trim(),
          findings: findings.trim(),
          language: outputLanguage,
          ...(systemIds && systemIds.length > 0 ? { systems: systemIds } : {}),
          ...(extraContext ? { additionalContext: extraContext } : {}),
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        toast.error(text || t("gen_error"));
        return;
      }
      const data = await res.json();
      if (data.classifications && String(data.classifications).trim()) {
        setClassifyResult(data.classifications);
      } else {
        setClassifyEmpty(true);
      }
    } catch {
      toast.error(t("gen_error"));
    } finally {
      setClassifying(false);
    }
  }

  function applyClassification() {
    if (!classifyResult) return;
    const trimmedConclusion = conclusion.trimEnd();
    const separator = trimmedConclusion ? "\n\n" : "";
    setConclusionVersions((prev) => ({
      ...prev,
      [conclusionStyle]: trimmedConclusion + separator + classifyResult,
    }));
    reportDirtyRef.current = true;
    setClassifyResult(null);
    toast.success(t("classify.applied"));
  }

  async function handleClinicalCheck() {
    if (clinicalCheckRunning || (!findings.trim() && !conclusion.trim())) return;
    track("ui_clinical_check_clicked");
    setClinicalCheckRunning(true);
    setClinicalSuggestions(null);
    setClinicalAnswers({});
    setClinicalEmpty(false);
    try {
      const res = await fetch("/api/generate/clinical-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findings: findings.trim(),
          conclusion: conclusion.trim(),
          language: outputLanguage,
        }),
      });
      if (!res.ok) {
        toast.error(t("gen_error"));
        return;
      }
      const data = await res.json();
      const suggestions = data.suggestions || [];
      if (suggestions.length === 0) {
        setClinicalEmpty(true);
        return;
      }
      setClinicalSuggestions(suggestions);
    } catch {
      toast.error(t("gen_error"));
    } finally {
      setClinicalCheckRunning(false);
    }
  }

  function applyClinicalSuggestion(suggestionId: string, insertText: string) {
    if (!insertText.trim()) {
      setClinicalAnswers((prev) => ({ ...prev, [suggestionId]: -1 }));
      return;
    }

    const suggestion = clinicalSuggestions?.find((s) => s.id === suggestionId);
    if (!suggestion) return;

    const sectionName = suggestion.section.toLowerCase().replace(/[:\s]+$/, "");
    const lines = findings.split("\n");
    let inserted = false;

    for (let i = 0; i < lines.length; i++) {
      const lineSection = lines[i].split(":")[0]?.toLowerCase().trim();
      if (lineSection && sectionName.includes(lineSection) || lineSection && lineSection.includes(sectionName)) {
        lines[i] = lines[i].trimEnd().replace(/\.?\s*$/, ". ") + insertText;
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      const othersLabel = outputLanguage === "es" ? "Otros hallazgos" : outputLanguage === "pt" ? "Outros achados" : "Additional findings";
      const othersIdx = lines.findIndex((l) => l.toLowerCase().startsWith(othersLabel.toLowerCase()));
      if (othersIdx >= 0) {
        lines[othersIdx] = lines[othersIdx].trimEnd().replace(/\.?\s*$/, ". ") + insertText;
      } else {
        lines.push(`${othersLabel}: ${insertText}`);
      }
      toast(t("clinical_check.section_not_found"));
    }

    setFindings(lines.join("\n"));
    reportDirtyRef.current = true;
    setClinicalAnswers((prev) => ({ ...prev, [suggestionId]: -1 }));
    toast.success(t("clinical_check.added"));
  }

  function cleanReport(text: string): string {
    const cleaned = text
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

    const lines = cleaned.split("\n");
    const seen = new Map<string, number>();
    const merged: string[] = [];
    for (const line of lines) {
      const ci = line.indexOf(":");
      if (ci === -1) { merged.push(line); continue; }
      const key = line.slice(0, ci).trim().toLowerCase();
      const val = line.slice(ci + 1).trim();
      if (seen.has(key)) {
        const idx = seen.get(key)!;
        const prev = merged[idx];
        const pci = prev.indexOf(":");
        const pval = prev.slice(pci + 1).trim();
        const prefix = prev.slice(0, pci + 1);
        merged[idx] = `${prefix} ${pval.endsWith(".") ? pval : pval + "."} ${val}`;
      } else {
        seen.set(key, merged.length);
        merged.push(line);
      }
    }
    return merged.join("\n");
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
    copyToClipboard(text);
    setCopied(id);
    toast.success(t("toast.copied"));
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
    track("ui_copy_report", { mode });
    abandonRef.current.copied = true;

    logCorrectionIfNeeded();
    // Persist on copy too, in case the post-generation auto-save failed.
    if (!lastSavedReportId) saveReportQuietly(true).catch(() => {});
    else flushCorrections().catch(() => {});

    // Update pilot metrics with final edit distance + final texts
    if (lastSavedReportId && initialFindings) {
      const finalText = findings + conclusion;
      const origText = initialFindings + initialConclusion;
      const editDist = computeEditDistance(origText, finalText);
      const recsText = selectedRecTexts.length > 0 ? selectedRecTexts.map((r) => "- " + r).join("\n") : "";
      fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _method: "PATCH",
          report_id: lastSavedReportId,
          final_length: finalText.length,
          edit_distance: editDist,
          report_end_at: new Date().toISOString(),
          final_findings_text: findings,
          final_conclusion_text: conclusion,
          recommendations_text: recsText,
        }),
      }).catch(() => {});
    }

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

  const startNewReportRef = useRef(startNewReport);
  startNewReportRef.current = startNewReport;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault();
        copyFormattedRef.current?.("full");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleGenerateRef.current("structured");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        startNewReportRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        window.dispatchEvent(new Event("radiogenai:open-help"));
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

  async function saveReportQuietly(auto = false) {
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
          toast.success(t(auto ? "toast.report_autosaved" : "toast.report_saved"));
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

  saveReportQuietlyRef.current = () => saveReportQuietly(true);

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

  function startNewReport() {
    track("ui_new_report");
    abandonRef.current = { generated: false, copied: false };
    logCorrectionIfNeeded();
    if (findings) {
      previousReportRef.current = {
        dictation, findings, conclusionVersions, initialFindings, initialConclusion,
        clinicalInfo, selectedTemplateId, contrastOption, cardiacTechniques,
        traceData, traceActive, lastSavedReportId, generationDurationMs, errorReported,
      };
      setHasPreviousReport(true);
      if (!lastSavedReportId) saveReportQuietly().catch(() => {});
      else flushCorrections().catch(() => {});
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
    reportStartTimeRef.current = 0;
    dictationCharsRef.current = 0;
    setCardiacTechniques({});
    stopCorrectionLoop.current();
    if (correctTimerRef.current) { clearTimeout(correctTimerRef.current); correctTimerRef.current = null; }
    localStorage.removeItem("radiogenai_draft");
    toast(t("toast.new_report"));
  }

  function restorePreviousReport() {
    const snap = previousReportRef.current;
    if (!snap) return;
    setDictation(snap.dictation);
    setFindings(snap.findings);
    setConclusionVersions(snap.conclusionVersions);
    setInitialFindings(snap.initialFindings);
    setInitialConclusion(snap.initialConclusion);
    setClinicalInfo(snap.clinicalInfo);
    setSelectedTemplateId(snap.selectedTemplateId);
    setContrastOption(snap.contrastOption);
    setCardiacTechniques(snap.cardiacTechniques);
    setTraceData(snap.traceData);
    setTraceActive(snap.traceActive);
    setLastSavedReportId(snap.lastSavedReportId);
    setGenerationDurationMs(snap.generationDurationMs);
    setErrorReported(snap.errorReported);
    previousReportRef.current = null;
    setHasPreviousReport(false);
    toast(t("toast.report_restored"));
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
      toast.success(t("toast.report_error_sent"));
    } catch { /* ignore */ }
    setReportingError(false);
  }

  const isGenerating = loadingFindings || loadingConclusion;
  const hasOutput = findings || conclusion || isGenerating;
  const setupReady = !!selectedTemplate;
  const showPiiWarning = piiMatches.length > 0 && dictation.trim();
  const canGenerate = setupReady && dictation.trim() && !isGenerating && !showPiiWarning;

  function handleAutoCleanPii() {
    const dictResult = stripPii(dictation);
    const clinicalResult = stripPii(clinicalInfo);
    setDictation(dictResult.cleaned);
    setClinicalInfo(clinicalResult.cleaned);
    toast.success(t("pii.auto_cleaned").replace("{0}", String(dictResult.strippedCount + clinicalResult.strippedCount)));
  }

  const piiWarningBanner = showPiiWarning ? (
    <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-2.5 space-y-1.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-red-800 dark:text-red-200">{t("pii.warning_title")}</p>
          <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5">{t("pii.warning_block")}</p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {piiMatches.map((m, i) => (
              <Badge key={i} variant="outline" className="text-[10px] border-red-400 dark:border-red-600 text-red-700 dark:text-red-300">
                {t(`pii.type.${m.type}`)}: {m.value}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleAutoCleanPii}
              className="px-2.5 py-1 text-[11px] font-medium bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
            >
              {t("pii.auto_clean")}
            </button>
            <button
              type="button"
              onClick={() => { setDictation(""); setClinicalInfo(""); }}
              className="px-2.5 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline underline-offset-2"
            >
              {t("pii.clear_all")}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  const sbs = uiPrefs.layout === "side-by-side";

  return (
    <div
      className={
        sbs
          ? "grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-3 md:gap-4 items-start"
          : "flex flex-col gap-3 md:gap-4"
      }
    >
      {/* ── Input column: setup + dictation ── */}
      <div className="flex flex-col gap-3 md:gap-4 min-w-0">
      <div className="grid grid-cols-1 gap-3 md:gap-4">
      {setupCollapsed ? (
          <div
            className="flex items-center gap-2 px-3 py-2.5 md:py-2 rounded-lg border bg-[hsl(var(--muted)/0.8)] cursor-pointer hover:bg-[hsl(var(--muted))] transition-colors"
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
              {clinicalInfo.trim() && <span className="h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />}
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
          </div>
      ) : (
          <Card className="border-[hsl(var(--border)/0.55)] shadow-none">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
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
                    aria-label={t("dash.collapse_setup")}
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

              {/* Template search */}
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  type="search"
                  placeholder={t("dash.search_template")}
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                  readOnly={templateSearchReadOnly}
                  onPointerDown={() => setTemplateSearchReadOnly(false)}
                  onFocus={() => setTemplateSearchReadOnly(false)}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  name="rg_tplsearch_x"
                  data-form-type="other"
                  data-lpignore="true"
                  data-1p-ignore
                  aria-label={t("dash.search_template")}
                />
                {templateSearch.trim() && searchResults.length > 0 && (
                  <ul role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-md border bg-[hsl(var(--card))] shadow-lg">
                    {searchResults.map((tpl) => (
                      <li key={tpl.id} role="option" aria-selected={selectedTemplateId === tpl.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedTemplateId(tpl.id); setSelectedModality(tpl.modality); setTemplateSearch(""); track("ui_template_selected", { template: tpl.name, modality: tpl.modality }); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 ${selectedTemplateId === tpl.id ? "bg-brand-soft text-brand font-medium" : ""}`}
                        >
                          <span className="font-medium">{tplName(tpl.name)}</span>
                          <span className="ml-1.5 text-gray-400">{modName(tpl.modality)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Modality chips */}
              <fieldset className="mb-2">
                <legend className="sr-only">{t("dash.modality")}</legend>
                <div className="flex flex-wrap gap-1" role="group" aria-label={t("dash.modality")}>
                  {MODALITIES.map((mod) => (
                    <Button
                      key={mod}
                      variant={selectedModality === mod ? "default" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      aria-pressed={selectedModality === mod}
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
              </fieldset>

              {/* Region + Template + Contrast */}
              <div className="grid gap-2 mb-2 grid-cols-1 sm:grid-cols-3">
                <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setSelectedTemplateId(""); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={t("dash.any_region")} /></SelectTrigger>
                  <SelectContent>
                    {(filteredSections.length > 0 ? filteredSections : SECTIONS.map(String)).map((s) => (
                      <SelectItem key={s} value={s}>{sec(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-8 text-xs">
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
                              <SelectLabel className="text-[10px] text-violet-600 dark:text-violet-400 uppercase tracking-wider">{secName}</SelectLabel>
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

                {/* Contrast toggle */}
                <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 bg-gray-50 dark:bg-gray-800">
                  {[
                    { v: "default", l: t("dash.contrast_auto") },
                    { v: "con_contraste", l: "C+" },
                    { v: "sin_contraste", l: "C−" },
                  ].map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      aria-pressed={contrastOption === opt.v}
                      onClick={() => setContrastOption(opt.v)}
                      className={`flex-1 px-1.5 py-1 text-[11px] whitespace-nowrap rounded-md transition-colors ${
                        contrastOption === opt.v
                          ? "bg-[hsl(var(--card))] text-brand shadow-sm font-medium"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cardiac MRI techniques + dictation guide */}
              {isCardiacMri && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-red-800 dark:text-red-300">{t("dash.cardiac_techniques")}</p>
                    <Heart className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: "contrast", label: t("dash.cardiac_contrast") },
                      { key: "stress", label: t("dash.cardiac_stress") },
                      { key: "mapping", label: t("dash.cardiac_mapping") },
                      { key: "strain", label: t("dash.cardiac_strain") },
                    ].map((tech) => (
                      <button
                        key={tech.key}
                        type="button"
                        onClick={() => setCardiacTechniques((prev) => ({ ...prev, [tech.key]: !prev[tech.key] }))}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                          cardiacTechniques[tech.key]
                            ? "bg-red-100 dark:bg-red-900/40 border-red-400 dark:border-red-700 text-red-700 dark:text-red-300"
                            : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        }`}
                      >
                        {tech.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[10px] leading-relaxed text-red-900/70 dark:text-red-300/70 space-y-1 pt-0.5">
                    <p className="font-semibold text-red-800 dark:text-red-300">{t("dash.cardiac_guide_title")}</p>
                    <p>• <b>{t("dash.cardiac_guide_patient")}</b>: {t("dash.cardiac_guide_patient_vals")}</p>
                    <p>• {t("dash.cardiac_guide_quality")}</p>
                    <p>• {t("dash.cardiac_guide_lv_walls")}</p>
                    <p>• {t("dash.cardiac_guide_lv_vols")}</p>
                    <p>• {t("dash.cardiac_guide_lv_motion")}</p>
                    <p>• {t("dash.cardiac_guide_rv")}</p>
                    <p>• {t("dash.cardiac_guide_rv_motion")}</p>
                    <p>• {t("dash.cardiac_guide_atria")}</p>
                    <p>• {t("dash.cardiac_guide_pericardium")}</p>
                    <p>• {t("dash.cardiac_guide_valvular")}</p>
                    {cardiacTechniques.contrast && <p>• <b>{t("dash.cardiac_contrast")}</b>: {t("dash.cardiac_guide_lge")}</p>}
                    {cardiacTechniques.mapping && <p>• <b>Mapping</b>: {t("dash.cardiac_guide_mapping")}</p>}
                    {cardiacTechniques.stress && <p>• <b>{t("dash.cardiac_stress")}</b>: {t("dash.cardiac_guide_stress")}</p>}
                    {cardiacTechniques.strain && <p>• <b>Strain</b>: {t("dash.cardiac_guide_strain")}</p>}
                  </div>
                </div>
              )}

              {/* RECIST 1.1 config + dictation guide */}
              {isRecistStudy && (
                <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300">RECIST 1.1</p>
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { key: true, label: t("dash.recist_baseline") },
                      { key: false, label: t("dash.recist_followup") },
                    ].map((opt) => (
                      <button
                        key={String(opt.key)}
                        type="button"
                        onClick={() => setRecistBaseline(opt.key)}
                        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                          recistBaseline === opt.key
                            ? "bg-indigo-100 dark:bg-indigo-900/40 border-indigo-400 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                            : "bg-[hsl(var(--card))] border-[hsl(var(--border))] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {!recistBaseline && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-indigo-700 dark:text-indigo-300">
                        {t("dash.recist_prior_report")}
                      </label>
                      <textarea
                        value={recistPriorReport}
                        onChange={(e) => setRecistPriorReport(e.target.value)}
                        placeholder={t("dash.recist_prior_placeholder")}
                        className="w-full rounded-md border border-indigo-200 dark:border-indigo-800 bg-[hsl(var(--card))] px-2.5 py-2 text-[11px] leading-relaxed text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y min-h-[60px] max-h-[200px]"
                        rows={3}
                      />
                    </div>
                  )}
                  <div className="text-[10px] leading-relaxed text-indigo-900/70 dark:text-indigo-300/70 space-y-1 pt-0.5">
                    <p className="font-semibold text-indigo-800 dark:text-indigo-300">{t("dash.recist_guide_title")}</p>
                    <p>• {t("dash.recist_guide_target")}</p>
                    <p>• {t("dash.recist_guide_nontarget")}</p>
                    <p>• {t("dash.recist_guide_new")}</p>
                    <p className="text-indigo-600/60 dark:text-indigo-400/60 italic">• {t("dash.recist_guide_calc")}</p>
                  </div>
                </div>
              )}

              {/* Row 3: Clinical context (collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setClinicalOpen(!clinicalOpen)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  {t("dash.clinical_context")}
                  {clinicalInfo.trim() && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                  <ChevronDown className={`h-3 w-3 transition-transform ${clinicalOpen ? "rotate-180" : ""}`} />
                </button>
                {clinicalOpen && (
                  <AutoGrowTextarea
                    placeholder={t("dash.clinical_placeholder")}
                    value={clinicalInfo}
                    onChange={(e) => setClinicalInfo(e.target.value)}
                    className="mt-2 text-xs"
                    minHeight={38}
                  />
                )}
              </div>
            </CardContent>
          </Card>
      )}

      {/* ── Dictation ── */}
      <div>
          <Card className="border-[hsl(var(--border)/0.55)] shadow-none">
            <CardContent className="space-y-3 p-4">
              {/* Language selector */}
              <div className="flex items-center gap-1.5">
                <Mic className="h-3 w-3 text-gray-400 shrink-0" />
                <Select value={resolvedDictLang} onValueChange={changeDictLang}>
                  <SelectTrigger className="h-6 w-[72px] text-[10px] px-2 py-0 border-gray-200 dark:border-gray-700">
                    <SelectValue>{resolvedDictLang.toUpperCase()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DICTATION_LANGUAGES.filter(l => l.value !== "auto").map((l) => (
                      <SelectItem key={l.value} value={l.value} className="text-xs">{l.value.toUpperCase()} — {l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <AutoGrowTextarea
                  ref={dictTextareaRef}
                  placeholder={t("dash.dictation_placeholder")}
                  value={dictation}
                  onChange={(e) => { setDictation(e.target.value); correctedLenRef.current = 0; setTraceData(null); setRepairMessage(null); if (!reportStartTimeRef.current) reportStartTimeRef.current = Date.now(); }}
                  onSelect={(e) => {
                    const ta = e.currentTarget;
                    if (ta.selectionStart !== ta.selectionEnd) {
                      setDictSelRange({ start: ta.selectionStart, end: ta.selectionEnd });
                    } else {
                      setDictSelRange(null);
                    }
                  }}
                  className="text-sm pr-14"
                  minHeight={230}
                />
                <SelectionHighlight text={dictation} range={dictSelRange} textareaRef={dictTextareaRef} className="px-3 py-2 pr-14" />
                {isFirstTime && !dictation.trim() && !isRecording && !isTranscribing && (
                  <button
                    type="button"
                    onClick={loadExampleCase}
                    className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                  >
                    <Sparkles className="h-3 w-3" />
                    {t("dash.try_example")}
                  </button>
                )}
                <Button
                  variant={isRecording ? "destructive" : "secondary"}
                  size="icon"
                  className={`absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 rounded-full transition-shadow ${isRecording ? "recording-pulse" : ""}`}
                  style={isRecording ? { boxShadow: `0 0 0 ${Math.round(audioLevel * 12)}px rgba(239,68,68,${0.15 + audioLevel * 0.25})` } : undefined}
                  onClick={() => { if (!isRecording) track("ui_dictation_start"); toggleRecording(); }}
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
                    <Badge className={`text-[10px] ${isRecording ? "bg-red-500 text-white animate-pulse" : isRefining ? "bg-violet-500 text-white animate-pulse gap-1" : isCorrecting ? "bg-purple-500 text-white animate-pulse gap-1" : "bg-blue-500 text-white animate-pulse gap-1"}`}>
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
              {dictFeedback !== "hidden" && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {dictFeedback === "done" ? (
                    <span className="text-green-600 dark:text-green-400">{t("dash.dict_fb_thanks")}</span>
                  ) : (
                    <>
                      <span>{t("dash.dict_fb_q")}</span>
                      <button type="button" onClick={() => rateDictation("up")} className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors" aria-label="good">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => rateDictation("down")} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" aria-label="bad">
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-[10px] italic text-gray-400 dark:text-gray-500">
                        {t("dash.dict_fb_hint")}
                      </span>
                    </>
                  )}
                </div>
              )}
              {piiWarningBanner}
              <div className="flex items-center gap-1.5">
                <Select value={reportMode} onValueChange={(v) => setReportMode(v as ReportMode)}>
                  <SelectTrigger className="h-9 md:h-8 text-[11px] flex-1 min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="structured" description={t("dash.mode_info_structured")}>
                      <span className="flex items-center gap-1.5"><List className="h-3 w-3" /> {t("dash.generate_structured")}</span>
                    </SelectItem>
                    <SelectItem value="compact" description={t("dash.mode_info_compact")}>
                      <span className="flex items-center gap-1.5"><AlignLeft className="h-3 w-3" /> {t("dash.generate_compact")}</span>
                    </SelectItem>
                    <SelectItem value="dictation_only" description={t("dash.mode_info_dictation_only")}>
                      <span className="flex items-center gap-1.5"><Pencil className="h-3 w-3" /> {t("dash.generate_dictation_only")}</span>
                    </SelectItem>
                    <SelectItem value="unstructured" description={t("dash.mode_info_unstructured")}>
                      <span className="flex items-center gap-1.5"><FileText className="h-3 w-3" /> {t("dash.generate_unstructured")}</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setLightParaphrase(!lightParaphrase)}
                        className={`h-9 md:h-8 px-2 flex items-center gap-1 rounded-md border transition-colors shrink-0 text-[11px] font-medium ${lightParaphrase ? "bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-600 dark:text-purple-400" : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("dash.paraphrase_short")}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {t("dash.light_paraphrase")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isGenerating ? (
                  <Button
                    onClick={stopGeneration}
                    variant="destructive"
                    className="h-9 md:h-8 px-4 text-xs gap-1.5 shrink-0"
                  >
                    <X className="h-3.5 w-3.5" /> {t("dash.stop_generation")}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGenerate(reportMode)}
                    disabled={!canGenerate}
                    className="h-9 md:h-8 px-4 text-xs gap-1.5 bg-brand hover:bg-brand/90 shadow-brand disabled:opacity-50 text-white font-semibold shrink-0"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> {t("dash.generate")}
                  </Button>
                )}
              </div>
              {!setupCollapsed && !setupReady && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center">
                  {t("dash.select_template_first")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Template watermark (discreet one-liner) ── */}
          {!hasOutput && selectedTemplate && templateFieldLabels.length > 0 && (
            <div className="mt-2 px-3 py-1.5 rounded-lg border border-dashed border-[hsl(var(--border)/0.5)]">
              <p className="text-[10px] leading-relaxed text-gray-300 dark:text-gray-600">
                <span className="font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1.5">
                  {t("dash.template_fields")}:
                </span>
                {templateFieldLabels.join(" · ")}
              </p>
            </div>
          )}
      </div>
      </div>

      <div className="flex justify-end">
        <RadiogenBot />
      </div>
      </div>

      {/* ── Output column ── */}
      {(hasOutput || sbs) && (
        <div className="min-w-0 flex flex-col gap-2">
          {!hasOutput && sbs && (
            <div className="hidden lg:flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[hsl(var(--border))] min-h-[300px] text-center px-6">
              <FileText className="h-8 w-8 text-[hsl(var(--muted-foreground))] opacity-40" />
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("dash.report_placeholder")}</p>
            </div>
          )}
          {hasOutput && (
          <div className="space-y-2">
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

            {/* Unified report card: findings + conclusion in one box, tools on the bottom edge.
                Slight brand tint + accent border so the final report reads as a distinct document. */}
            <Card className="border-brand-soft shadow-md bg-[hsl(var(--primary)/0.02)] dark:bg-[hsl(var(--primary)/0.05)]">
            {getStudyTitle() && (
              <div className="px-4 pt-3 -mb-1.5">
                <p className="text-sm font-bold uppercase tracking-wide text-[hsl(var(--foreground))]">
                  {getStudyTitle()}
                </p>
              </div>
            )}
            <OutputCard
              bare
              airy
              title={t("dash.findings")}
              icon={<FileText className="h-3.5 w-3.5 text-brand" />}
              loading={loadingFindings}
              loadingLabel={t("gen.phase_findings")}
              value={findings}
              onChange={(v) => { setFindings(v); reportDirtyRef.current = true; }}
              onEdit={() => { setTraceData(null); setRepairMessage(null); }}
              minHeight={140}
              traceHighlights={findingsHighlights.length > 0 ? findingsHighlights : undefined}
              traceLocked={loadingTrace}
              isDark={isDark}
            />

            <OutputCard
              bare
              title={t("dash.conclusion")}
              icon={<CircleCheck className="h-3.5 w-3.5 text-green-600" />}
              loading={loadingConcStyles[conclusionStyle] ?? false}
              loadingLabel={conclusionStyle === "grouped" ? t("gen.phase_conclusion_refine") : t("gen.phase_conclusion")}
              value={conclusion}
              onChange={(v) => { setConclusionVersions((prev) => ({ ...prev, [conclusionStyle]: v })); reportDirtyRef.current = true; }}
              minHeight={110}
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
                          ? "bg-[hsl(var(--card))] text-[hsl(var(--card-foreground))] shadow-sm"
                          : loadingConcStyles[s] ? "text-gray-400 dark:text-gray-500"
                          : conclusionVersions[s] ? "text-green-600 dark:text-violet-400 hover:text-green-700 dark:hover:text-green-300"
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

            {/* Report tools: review + classification on the bottom edge of the unified card */}
            {(findings.trim() || conclusion.trim()) && (
            <div className="border-t border-[hsl(var(--border)/0.5)] bg-[hsl(var(--muted)/0.25)] rounded-b-[inherit] px-4 py-2.5 space-y-2">
              {findings.trim() && clinicalSuggestions && (
                  <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300">{t("clinical_check.title")}</p>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-200/60 dark:bg-amber-800/40 text-amber-600 dark:text-amber-400 font-medium">{t("clinical_check.beta")}</span>
                      </div>
                      <button type="button" onClick={() => setClinicalSuggestions(null)} className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        {t("clinical_check.dismiss")}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-2">{t("clinical_check.hint")}</p>
                    <div className="space-y-2.5">
                      {clinicalSuggestions.map((s) => {
                        const answered = clinicalAnswers[s.id] !== undefined;
                        if (answered) return null;
                        return (
                          <div key={s.id} className="border border-amber-100 dark:border-amber-900/30 rounded-md p-2 bg-white/50 dark:bg-gray-900/30">
                            <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{s.question}</p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-1">→ {s.section}</p>
                            <div className="flex flex-wrap gap-1">
                              {s.options.map((opt, optIdx) => (
                                <button
                                  key={optIdx}
                                  type="button"
                                  onClick={() => {
                                    if (opt.insertText.trim()) {
                                      applyClinicalSuggestion(s.id, opt.insertText);
                                    } else {
                                      setClinicalAnswers((prev) => ({ ...prev, [s.id]: -1 }));
                                    }
                                  }}
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                    opt.insertText.trim()
                                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300"
                                  }`}
                                >
                                  {opt.insertText.trim() ? <Plus className="h-2.5 w-2.5" /> : null}
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {clinicalSuggestions.every((s) => clinicalAnswers[s.id] !== undefined) && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-1">
                          {t("clinical_check.no_suggestions")}
                        </p>
                      )}
                    </div>
                  </div>
              )}
              {conclusion.trim() && (
                classifyResult ? (
                  <div className="border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 p-2.5">
                    <p className="text-[10px] font-medium text-violet-700 dark:text-violet-300 mb-1.5">{t("classify.preview_title")}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-2">{classifyResult}</p>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button type="button" onClick={() => setClassifyResult(null)} className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        {t("classify.dismiss")}
                      </button>
                      <button type="button" onClick={applyClassification} className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                        <Check className="h-2.5 w-2.5" />
                        {t("classify.apply")}
                      </button>
                    </div>
                  </div>
                ) : detectedSystems ? (
                  <div className="border border-violet-200 dark:border-violet-800 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 p-2.5">
                    <p className="text-[10px] font-medium text-violet-700 dark:text-violet-300 mb-1">{t("classify.select_systems")}</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-2">{t("classify.select_hint")}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {detectedSystems.map((sys) => {
                        const isOn = selectedSystems.has(sys.id);
                        return (
                          <button
                            key={sys.id}
                            type="button"
                            onClick={() => setSelectedSystems((prev) => {
                              const next = new Set(prev);
                              if (next.has(sys.id)) next.delete(sys.id); else next.add(sys.id);
                              return next;
                            })}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                              isOn
                                ? "bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
                                : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            <div className={`h-3 w-3 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                              isOn ? "bg-violet-500 border-violet-500" : "border-gray-300 dark:border-gray-600"
                            }`}>
                              {isOn && <Check className="h-2 w-2 text-white" />}
                            </div>
                            {sys.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button type="button" onClick={() => setDetectedSystems(null)} className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                        {t("classify.dismiss")}
                      </button>
                      <button
                        type="button"
                        onClick={() => runPreflight([...selectedSystems])}
                        disabled={selectedSystems.size === 0 || classifying || checkingPreflight}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
                      >
                        {(classifying || checkingPreflight) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tags className="h-3 w-3" />}
                        {checkingPreflight ? t("classify.checking_data") : t("classify.run_selected")} ({selectedSystems.size})
                      </button>
                    </div>
                  </div>
                ) : preflightQuestions ? (
                  <div className="border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-2.5">
                    <p className="text-[10px] font-medium text-amber-700 dark:text-amber-300 mb-1">{t("classify.preflight_title")}</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-2">{t("classify.preflight_hint")}</p>
                    <div className="space-y-2.5 mb-2.5">
                      {preflightQuestions.map((q) => (
                        <div key={q.id}>
                          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">{q.question}</p>
                          <div className="flex flex-wrap gap-1">
                            {q.options.map((opt) => {
                              const isSelected = preflightAnswers[q.id] === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => setPreflightAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                                  className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                    isSelected
                                      ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 font-medium"
                                      : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => { setPreflightQuestions(null); runClassify(preflightSystems); }}
                        className="text-[10px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        {t("classify.preflight_skip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => { const ctx = buildAdditionalContext(); setPreflightQuestions(null); runClassify(preflightSystems, ctx); }}
                        disabled={classifying || Object.keys(preflightAnswers).length === 0}
                        className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
                      >
                        {classifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tags className="h-3 w-3" />}
                        {t("classify.preflight_submit")}
                      </button>
                    </div>
                  </div>
                ) : null
              )}

              {/* Bottom row: copy full report (left) + review/classify tools (right) */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  size="sm"
                  onClick={() => copyFormatted("full")}
                  disabled={!findings}
                  className="gap-1.5 text-xs h-8 md:h-7 bg-brand text-brand-fg hover:opacity-90"
                >
                  {copied === "all" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {t("dash.copy_report")}
                  <kbd className="hidden md:inline ml-0.5 px-1 py-0.5 rounded bg-white/20 text-[9px] font-mono leading-none">⇧ Space</kbd>
                </Button>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {findings.trim() && !clinicalSuggestions && (
                    <div className="flex items-center gap-1.5">
                      {clinicalEmpty && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">{t("clinical_check.no_suggestions")}</span>
                      )}
                      <button
                        type="button"
                        onClick={handleClinicalCheck}
                        disabled={clinicalCheckRunning}
                        className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium transition-colors disabled:opacity-50"
                      >
                        {clinicalCheckRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardCheck className="h-3 w-3" />}
                        {clinicalCheckRunning ? t("clinical_check.running") : clinicalEmpty ? t("clinical_check.recheck") : t("clinical_check.button")}
                        <span className="text-[8px] px-1 py-0 rounded bg-amber-100/60 dark:bg-amber-800/30 text-amber-500 dark:text-amber-400 font-medium ml-0.5">{t("clinical_check.beta")}</span>
                      </button>
                    </div>
                  )}
                  {conclusion.trim() && !classifyResult && !detectedSystems && !preflightQuestions && (
                    <div className="flex items-center gap-1.5">
                      {classifyEmpty && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 italic">{t("classify.none_detected")}</span>
                      )}
                      <button
                        type="button"
                        onClick={handleDetectSystems}
                        disabled={classifying || detectingSystems || checkingPreflight}
                        className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium transition-colors disabled:opacity-50"
                      >
                        {(classifying || detectingSystems || checkingPreflight) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tags className="h-3 w-3" />}
                        {detectingSystems ? t("classify.detecting") : checkingPreflight ? t("classify.checking_data") : classifyEmpty ? t("classify.recheck") : t("classify.button")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )}
            </Card>

            <RecommendationPanel
              conclusionText={conclusion}
              modality={selectedModality}
              section={selectedSection}
              outputLanguage={outputLanguage as "es" | "en" | "pt"}
              visible={!!conclusion}
              onSelectionChange={setSelectedRecTexts}
            />

            {/* Action bar */}
            <Card className="sticky bottom-16 md:bottom-3 shadow-lg border-brand-soft bg-[hsl(var(--card)/0.95)] backdrop-blur">
              <CardContent className="p-2 md:p-2.5">
                <div className="flex flex-wrap items-center gap-1.5 justify-between">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(selectedRecTexts.map((r) => "- " + r).join("\n"), "recs")}
                      disabled={selectedRecTexts.length === 0}
                      className="gap-1 text-xs h-8 md:h-7"
                    >
                      {copied === "recs" ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                      {t("dash.copy_recommendation")}
                      {selectedRecTexts.length > 0 && <span className="text-[10px] text-gray-400">({selectedRecTexts.length})</span>}
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
                  <div className="flex items-center gap-1.5">
                    {hasPreviousReport && (
                      <Button size="sm" variant="outline" onClick={restorePreviousReport} className="gap-1 text-[11px] h-7 md:h-6 px-2 text-muted-foreground">
                        <RotateCcw className="h-2.5 w-2.5" />
                        {t("dash.restore_previous")}
                      </Button>
                    )}
                    <Button size="sm" onClick={startNewReport} disabled={!findings} className="gap-1 text-xs h-8 md:h-7 bg-brand text-brand-fg hover:opacity-90">
                      <ArrowRight className="h-3 w-3" />
                      {t("dash.next_report")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      )}

      <NpsSurvey open={showNpsSurvey} onClose={() => setShowNpsSurvey(false)} />
      <OnboardingDialog />

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
                      onClick={async () => {
                        setLimitDialogOpen(false);
                        const res = await fetch("/api/subscription", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ plan: nextPlan }),
                        });
                        const data = await res.json();
                        if (data.needsCheckout) {
                          const checkoutRes = await fetch("/api/checkout", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ plan: nextPlan }),
                          });
                          const checkoutData = await checkoutRes.json();
                          if (checkoutData.url) {
                            window.location.href = checkoutData.url;
                            return;
                          }
                        }
                        if (res.ok) window.location.reload();
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("limit.upgrade")} — {PLANS[nextPlan].label} ({PLANS[nextPlan].reports} inf. + {PLANS[nextPlan].dictationMinutes} min) ${PLANS[nextPlan].price}/mo
                    </Button>
                  )}
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
  footerExtra,
  traceHighlights,
  traceLocked,
  isDark,
  loadingLabel,
  bare = false,
  airy = false,
}: {
  title: string;
  icon: React.ReactNode;
  loading: boolean;
  value: string;
  onChange: (v: string) => void;
  onEdit?: () => void;
  minHeight: number;
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
  loadingLabel?: string;
  traceHighlights?: { start: number; end: number; colorIdx: number; fragment: string; section?: string; isUnmatched?: boolean }[];
  traceLocked?: boolean;
  isDark?: boolean;
  bare?: boolean;
  /** Extra line spacing on screen only — the copied text keeps its own line breaks. */
  airy?: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const showTrace = traceHighlights && traceHighlights.length > 0;

  useEffect(() => {
    if (!showTrace) setEditing(false);
  }, [showTrace]);

  const Wrapper = bare ? "div" : Card;
  return (
    <Wrapper>
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
              className="flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 dark:text-violet-400 font-medium transition-colors"
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
            {loadingLabel && (
              <span className="absolute inset-0 flex items-center justify-center text-[11px] text-gray-400 dark:text-gray-500 animate-[fade-in_0.4s_ease-out]">
                {loadingLabel}
              </span>
            )}
          </div>
        ) : loading && value ? (
          <div
            className={`streaming-cursor whitespace-pre-wrap text-sm ${airy ? "leading-loose" : "leading-relaxed"} text-gray-900 dark:text-gray-100 animate-[fade-in_0.15s_ease-out] ${
              bare ? "py-2" : "p-3 border rounded-md bg-white dark:bg-gray-950"
            }`}
            style={{ minHeight }}
          >
            {value}
          </div>
        ) : showTrace && !editing ? (
          <HighlightedText text={value} highlights={traceHighlights} isDark={!!isDark} />
        ) : (
          <AutoGrowTextarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`text-sm ${airy ? "leading-loose" : "leading-relaxed"} ${
              bare ? "border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" : ""
            }`}
            minHeight={minHeight}
          />
        )}
        {footerExtra && <div className="mt-1.5">{footerExtra}</div>}
      </CardContent>
    </Wrapper>
  );
}

