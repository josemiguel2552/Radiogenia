"use client";

/* ── Image Analysis Panel (Experimental) ─────────────────────
   Screen-capture module: captures ROI from a shared screen,
   detects slice changes, and sends frames to a vision LLM.

   To remove: delete this directory, the API route at
   /api/analyze-image, i18n keys prefixed "img.", and the
   integration point in dashboard-content.tsx (search for
   "IMAGE_ANALYSIS_INTEGRATION").
   ──────────────────────────────────────────────────────────── */

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Monitor, Play, Square, Sparkles, ArrowDownToLine,
  RotateCcw, X, Loader2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import type { UserTemplate } from "@/lib/types";

interface Props {
  templates: UserTemplate[];
  selectedTemplateId: string;
  outputLanguage: string;
  onInsertFindings: (text: string) => void;
  onClose: () => void;
}

type Phase = "idle" | "sharing" | "capturing" | "review" | "analyzing" | "results";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragAction =
  | { kind: "draw"; ox: number; oy: number }
  | { kind: "move"; ox: number; oy: number; orig: Rect }
  | { kind: "resize"; corner: string; ox: number; oy: number; orig: Rect };

const CHECK_MS = 300;
const DIFF_THRESHOLD = 0.05;
const MAX_FRAMES = 20;
const CMP_SIZE = 32;
const OUT_MAX = 768;

function frameDiff(a: ImageData, b: ImageData): number {
  let sum = 0;
  const n = a.data.length;
  for (let i = 0; i < n; i += 4) {
    const ga = a.data[i] * 0.299 + a.data[i + 1] * 0.587 + a.data[i + 2] * 0.114;
    const gb = b.data[i] * 0.299 + b.data[i + 1] * 0.587 + b.data[i + 2] * 0.114;
    sum += Math.abs(ga - gb);
  }
  return sum / (n / 4) / 255;
}

export function ImageAnalysisPanel({
  templates,
  selectedTemplateId,
  outputLanguage,
  onInsertFindings,
  onClose,
}: Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [roi, setRoi] = useState<Rect | null>(null);
  const [liveRoi, setLiveRoi] = useState<Rect | null>(null);
  const [captures, setCaptures] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevDataRef = useRef<ImageData | null>(null);
  const capsRef = useRef<string[]>([]);
  const dragRef = useRef<DragAction | null>(null);

  useEffect(() => {
    return () => stopAll();
  }, []);

  function stopAll() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  // ── Screen share ──
  async function startShare() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" } as MediaTrackConstraints,
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      stream.getTracks()[0].addEventListener("ended", () => {
        stopAll();
        setPhase(capsRef.current.length > 0 ? "review" : "idle");
      });
      setPhase("sharing");
    } catch {
      setError(t("img.share_denied"));
    }
  }

  // ── Video display rect (handles letterboxing) ──
  function vdr(): Rect | null {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c || !v.videoWidth) return null;
    const cw = c.clientWidth;
    const ch = c.clientHeight;
    const va = v.videoWidth / v.videoHeight;
    const ca = cw / ch;
    if (va > ca) {
      const dw = cw;
      const dh = cw / va;
      return { x: 0, y: (ch - dh) / 2, w: dw, h: dh };
    }
    const dh = ch;
    const dw = ch * va;
    return { x: (cw - dw) / 2, y: 0, w: dw, h: dh };
  }

  // ── ROI mouse interaction ──
  function relPos(e: React.MouseEvent): { x: number; y: number } {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitCorner(pos: { x: number; y: number }, r: Rect): string | null {
    const m = 12;
    const cs: Record<string, { x: number; y: number }> = {
      nw: { x: r.x, y: r.y },
      ne: { x: r.x + r.w, y: r.y },
      sw: { x: r.x, y: r.y + r.h },
      se: { x: r.x + r.w, y: r.y + r.h },
    };
    for (const [name, pt] of Object.entries(cs)) {
      if (Math.abs(pos.x - pt.x) < m && Math.abs(pos.y - pt.y) < m) return name;
    }
    return null;
  }

  function insideRoi(pos: { x: number; y: number }, r: Rect): boolean {
    return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
  }

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (phase !== "sharing" && phase !== "capturing") return;
      e.preventDefault();
      const p = relPos(e);
      if (roi) {
        const c = hitCorner(p, roi);
        if (c) {
          dragRef.current = { kind: "resize", corner: c, ox: p.x, oy: p.y, orig: { ...roi } };
          return;
        }
        if (insideRoi(p, roi)) {
          dragRef.current = { kind: "move", ox: p.x, oy: p.y, orig: { ...roi } };
          return;
        }
      }
      setRoi(null);
      dragRef.current = { kind: "draw", ox: p.x, oy: p.y };
    },
    [phase, roi],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      e.preventDefault();
      const p = relPos(e);

      if (d.kind === "draw") {
        setLiveRoi({
          x: Math.min(d.ox, p.x),
          y: Math.min(d.oy, p.y),
          w: Math.abs(p.x - d.ox),
          h: Math.abs(p.y - d.oy),
        });
      } else if (d.kind === "move") {
        setRoi({ ...d.orig, x: d.orig.x + (p.x - d.ox), y: d.orig.y + (p.y - d.oy) });
      } else {
        const dx = p.x - d.ox;
        const dy = p.y - d.oy;
        const r = d.orig;
        let nx = r.x, ny = r.y, nw = r.w, nh = r.h;
        if (d.corner.includes("e")) nw = Math.max(30, r.w + dx);
        if (d.corner.includes("w")) {
          nx = r.x + dx;
          nw = Math.max(30, r.w - dx);
        }
        if (d.corner.includes("s")) nh = Math.max(30, r.h + dy);
        if (d.corner.includes("n")) {
          ny = r.y + dy;
          nh = Math.max(30, r.h - dy);
        }
        setRoi({ x: nx, y: ny, w: nw, h: nh });
      }
    },
    [],
  );

  const onMouseUp = useCallback(() => {
    const d = dragRef.current;
    if (d?.kind === "draw" && liveRoi && liveRoi.w > 20 && liveRoi.h > 20) {
      setRoi(liveRoi);
    }
    setLiveRoi(null);
    dragRef.current = null;
  }, [liveRoi]);

  // ── Capture loop ──
  function startCapture() {
    if (!roi) return;
    prevDataRef.current = null;
    capsRef.current = [];
    setCaptures([]);
    setPhase("capturing");
    timerRef.current = setInterval(checkFrame, CHECK_MS);
  }

  function checkFrame() {
    const video = videoRef.current;
    const r = roi;
    if (!video || !r || !streamRef.current) return;
    if (capsRef.current.length >= MAX_FRAMES) {
      stopCapture();
      return;
    }

    const display = vdr();
    if (!display) return;

    const sx = video.videoWidth / display.w;
    const sy = video.videoHeight / display.h;
    const cropX = (r.x - display.x) * sx;
    const cropY = (r.y - display.y) * sy;
    const cropW = r.w * sx;
    const cropH = r.h * sy;

    const crop = document.createElement("canvas");
    crop.width = Math.round(cropW);
    crop.height = Math.round(cropH);
    const cctx = crop.getContext("2d")!;
    cctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, crop.width, crop.height);

    const cmp = document.createElement("canvas");
    cmp.width = CMP_SIZE;
    cmp.height = CMP_SIZE;
    const cmpCtx = cmp.getContext("2d")!;
    cmpCtx.drawImage(crop, 0, 0, CMP_SIZE, CMP_SIZE);
    const cur = cmpCtx.getImageData(0, 0, CMP_SIZE, CMP_SIZE);

    let shouldCapture = false;
    if (!prevDataRef.current) {
      shouldCapture = true;
    } else if (frameDiff(prevDataRef.current, cur) > DIFF_THRESHOLD) {
      shouldCapture = true;
    }

    if (shouldCapture) {
      prevDataRef.current = cur;
      let ow = crop.width;
      let oh = crop.height;
      if (Math.max(ow, oh) > OUT_MAX) {
        const s = OUT_MAX / Math.max(ow, oh);
        ow = Math.round(ow * s);
        oh = Math.round(oh * s);
      }
      const out = document.createElement("canvas");
      out.width = ow;
      out.height = oh;
      out.getContext("2d")!.drawImage(crop, 0, 0, ow, oh);
      const dataUrl = out.toDataURL("image/jpeg", 0.85);
      capsRef.current = [...capsRef.current, dataUrl];
      setCaptures([...capsRef.current]);
    }
  }

  function stopCapture() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopAll();
    setPhase("review");
  }

  function removeFrame(idx: number) {
    const updated = captures.filter((_, i) => i !== idx);
    capsRef.current = updated;
    setCaptures(updated);
  }

  // ── Analyze ──
  async function analyze() {
    if (captures.length === 0) return;
    setPhase("analyzing");
    setError("");

    const tpl = templates.find((tp) => tp.id === selectedTemplateId);

    try {
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: captures.map((d) => d.replace(/^data:image\/\w+;base64,/, "")),
          template: tpl?.structure?.template || "",
          modality: tpl?.modality || "",
          studyType: tpl?.name || "",
          outputLanguage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Analysis failed" }));
        setError(data.error || `Error ${res.status}`);
        setPhase("results");
        return;
      }

      const data = await res.json();
      setReport(data.findings || "");
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("results");
    }
  }

  function reset() {
    stopAll();
    setPhase("idle");
    setRoi(null);
    setLiveRoi(null);
    setCaptures([]);
    capsRef.current = [];
    setReport("");
    setError("");
    prevDataRef.current = null;
    dragRef.current = null;
  }

  const activeRoi = liveRoi || roi;

  return (
    <Card className="border-cyan-300 dark:border-cyan-700">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium flex items-center gap-2">
            <Monitor className="h-4 w-4 text-cyan-600" />
            {t("img.title")}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 font-medium">
              {t("img.experimental")}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              stopAll();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* IDLE */}
        {phase === "idle" && (
          <div className="text-center py-6 space-y-2">
            <Button onClick={startShare} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Monitor className="h-4 w-4 mr-2" />
              {t("img.start_capture")}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{t("img.hint")}</p>
          </div>
        )}

        {/* SHARING / CAPTURING — video + ROI */}
        {(phase === "sharing" || phase === "capturing") && (
          <>
            <div
              ref={containerRef}
              className="relative bg-black rounded-lg overflow-hidden select-none cursor-crosshair"
              style={{ height: 360 }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
            >
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                muted
                playsInline
              />

              {/* Dim outside ROI */}
              {activeRoi && (
                <>
                  <div
                    className="absolute left-0 right-0 top-0 bg-black/40 pointer-events-none"
                    style={{ height: activeRoi.y }}
                  />
                  <div
                    className="absolute left-0 bg-black/40 pointer-events-none"
                    style={{ top: activeRoi.y, width: activeRoi.x, height: activeRoi.h }}
                  />
                  <div
                    className="absolute right-0 bg-black/40 pointer-events-none"
                    style={{ top: activeRoi.y, left: activeRoi.x + activeRoi.w, height: activeRoi.h }}
                  />
                  <div
                    className="absolute left-0 right-0 bottom-0 bg-black/40 pointer-events-none"
                    style={{ top: activeRoi.y + activeRoi.h }}
                  />

                  {/* ROI border */}
                  <div
                    className="absolute border-2 border-cyan-400 pointer-events-none"
                    style={{ left: activeRoi.x, top: activeRoi.y, width: activeRoi.w, height: activeRoi.h }}
                  />

                  {/* Corner handles (only when not mid-draw) */}
                  {!liveRoi &&
                    roi &&
                    (["nw", "ne", "sw", "se"] as const).map((c) => (
                      <div
                        key={c}
                        className="absolute w-3 h-3 bg-cyan-400 border border-white rounded-sm pointer-events-none"
                        style={{
                          top: c.startsWith("n") ? roi.y - 6 : roi.y + roi.h - 6,
                          left: c.endsWith("w") ? roi.x - 6 : roi.x + roi.w - 6,
                        }}
                      />
                    ))}
                </>
              )}

              {/* Capturing indicator */}
              {phase === "capturing" && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  {captures.length}/{MAX_FRAMES}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {phase === "sharing" && !roi && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("img.draw_roi")}</p>
              )}
              {phase === "sharing" && roi && (
                <Button size="sm" onClick={startCapture} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  <Play className="h-3.5 w-3.5 mr-1" />
                  {t("img.begin_capture")}
                </Button>
              )}
              {phase === "capturing" && (
                <>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {captures.length} {t("img.frames_captured")}
                  </span>
                  <Button size="sm" variant="destructive" onClick={stopCapture}>
                    <Square className="h-3.5 w-3.5 mr-1" />
                    {t("img.stop_capture")}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={reset}>
                {t("img.cancel")}
              </Button>
            </div>

            {/* Thumbnail strip */}
            {captures.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {captures.map((c, i) => (
                  <img
                    key={i}
                    src={c}
                    alt={`Frame ${i + 1}`}
                    className="h-12 rounded border border-gray-300 dark:border-gray-600 shrink-0"
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* REVIEW */}
        {phase === "review" && (
          <div className="space-y-3">
            {captures.length > 0 ? (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {captures.map((c, i) => (
                    <div key={i} className="relative shrink-0 group">
                      <img
                        src={c}
                        alt={`Frame ${i + 1}`}
                        className="h-16 rounded border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => removeFrame(i)}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {captures.length} {t("img.frames_captured")}
                </p>
                <div className="flex gap-2">
                  <Button onClick={analyze} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                    <Sparkles className="h-4 w-4 mr-1" />
                    {t("img.analyze")} ({captures.length})
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t("img.redo")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">{t("img.no_frames")}</p>
                <Button className="mt-2" variant="outline" onClick={reset}>
                  {t("img.redo")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ANALYZING */}
        {phase === "analyzing" && (
          <div className="flex flex-col items-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{t("img.analyzing")}</span>
          </div>
        )}

        {/* RESULTS */}
        {phase === "results" && (
          <div className="space-y-3">
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {report && (
              <>
                <textarea
                  value={report}
                  readOnly
                  className="w-full text-sm p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-h-[120px] resize-y font-mono"
                  rows={8}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => onInsertFindings(report)}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  >
                    <ArrowDownToLine className="h-4 w-4 mr-1" />
                    {t("img.insert_findings")}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    {t("img.redo")}
                  </Button>
                </div>
              </>
            )}
            {!report && !error && (
              <Button variant="outline" onClick={reset}>
                {t("img.redo")}
              </Button>
            )}
          </div>
        )}

        {error && phase !== "results" && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
