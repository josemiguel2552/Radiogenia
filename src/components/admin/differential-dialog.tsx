"use client";

/**
 * Differential-diagnosis assistant.
 *
 * A thinking aid for the radiologist, deliberately walled off from the
 * reporting flow: it lives in the admin area, nothing it produces can be
 * copied into a report, and every entity it names links out to the real
 * reference rather than quoting one.
 */

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, Upload, X, Sparkles, ExternalLink, AlertTriangle, Crop, Trash2, ScanSearch,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useUIPrefs } from "@/lib/ui-prefs";
import { BODY_REGIONS, type BodyRegion, type DifferentialResult } from "@/lib/differential";

const MAX_IMAGES = 3;
const MAX_BYTES = 6 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

interface LoadedImage {
  id: string;
  dataUrl: string;
  mediaType: string;
  name: string;
  /** Normalised 0–1 box the radiologist drew, if any. */
  roi?: { x: number; y: number; w: number; h: number };
}

/** Draws the ROI box onto a copy of the image, so the model sees what is meant. */
async function renderWithRoi(img: LoadedImage): Promise<{ base64: string; mediaType: string }> {
  const plain = { base64: img.dataUrl.split(",")[1] || "", mediaType: img.mediaType };
  if (!img.roi) return plain;

  return new Promise((resolve) => {
    const el = new Image();
    el.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = el.naturalWidth;
        canvas.height = el.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(plain);
        ctx.drawImage(el, 0, 0);
        // Thin and unfilled: a marker, not a mask. Filling it would hide the
        // very thing being asked about.
        const { x, y, w, h } = img.roi!;
        ctx.strokeStyle = "#22d3ee";
        ctx.lineWidth = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 220));
        ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height);
        const out = canvas.toDataURL("image/png");
        resolve({ base64: out.split(",")[1] || plain.base64, mediaType: "image/png" });
      } catch {
        resolve(plain);
      }
    };
    el.onerror = () => resolve(plain);
    el.src = img.dataUrl;
  });
}

function RoiCanvas({
  image, onChange,
}: {
  image: LoadedImage;
  onChange: (roi: LoadedImage["roi"]) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  const pointAt = (e: React.PointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  };

  const roi = drag
    ? {
        x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1),
        w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0),
      }
    : image.roi;

  return (
    <div
      ref={boxRef}
      className="relative select-none touch-none cursor-crosshair rounded-md overflow-hidden border border-[hsl(var(--border))] bg-black"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const p = pointAt(e);
        setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
      }}
      onPointerMove={(e) => {
        if (!drag) return;
        const p = pointAt(e);
        setDrag({ ...drag, x1: p.x, y1: p.y });
      }}
      onPointerUp={() => {
        if (!drag) return;
        const box = {
          x: Math.min(drag.x0, drag.x1), y: Math.min(drag.y0, drag.y1),
          w: Math.abs(drag.x1 - drag.x0), h: Math.abs(drag.y1 - drag.y0),
        };
        setDrag(null);
        // A tap is not a box: anything this small is a misclick, and sending a
        // 2-pixel marker would point the model at nothing.
        onChange(box.w > 0.02 && box.h > 0.02 ? box : undefined);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.dataUrl} alt={image.name} className="block w-full h-auto pointer-events-none" />
      {roi && (
        <div
          className="absolute border-2 border-cyan-400 pointer-events-none"
          style={{
            left: `${roi.x * 100}%`, top: `${roi.y * 100}%`,
            width: `${roi.w * 100}%`, height: `${roi.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}

export function DifferentialDialog({ variant = "header" }: { variant?: "header" | "rail" }) {
  const t = useT();
  const { prefs } = useUIPrefs();
  const lang = (prefs.uiLanguage || "es") as "es" | "en" | "pt";

  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [region, setRegion] = useState<BodyRegion | "">("");
  const [modality, setModality] = useState("");
  const [hounsfield, setHounsfield] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DifferentialResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setImages([]); setRegion(""); setModality(""); setHounsfield("");
    setNote(""); setConfirmed(false); setError(null); setResult(null); setLoading(false);
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setError(null);
    const room = MAX_IMAGES - images.length;
    for (const file of Array.from(files).slice(0, room)) {
      if (!ACCEPTED.includes(file.type)) { setError(t("diff.err_type")); continue; }
      if (file.size > MAX_BYTES) { setError(t("diff.err_size")); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        setImages((prev) => prev.length >= MAX_IMAGES ? prev : [...prev, {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          dataUrl: String(reader.result),
          mediaType: file.type,
          name: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    }
  }, [images.length, t]);

  const canSubmit = images.length > 0 && !!region && confirmed && !loading;

  const analyse = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const payload = await Promise.all(images.map(renderWithRoi));
      const res = await fetch("/api/admin/differential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: payload,
          region,
          regionLabel: t(`diff.region_${region}`),
          modality,
          hounsfield,
          clinicalNote: note,
          hasRoi: images.some((i) => i.roi),
          language: lang,
          anonymisationConfirmed: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error === "provider_has_no_vision" ? t("diff.err_no_vision")
          : data?.error === "no_api_key" ? t("diff.err_no_key")
          : data?.error === "unparseable_response" ? t("diff.err_unparseable")
          : t("diff.err_generic"));
        return;
      }
      setResult(data);
    } catch {
      setError(t("diff.err_generic"));
    } finally {
      setLoading(false);
    }
  }, [canSubmit, images, region, modality, hounsfield, note, lang, t]);

  return (
    <>
      {variant === "rail" ? (
        // The report screen's rail: same shape as the views beside it, so it
        // reads as one more place to go rather than a control bolted on.
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={t("diff.open_hint")}
          className="flex flex-col items-center gap-1 w-14 py-1.5 text-cyan-400 hover:bg-gray-800 hover:text-cyan-300 rounded-lg transition-colors cursor-pointer"
        >
          <ScanSearch className="h-[18px] w-[18px]" />
          <span className="text-[9px] font-medium leading-none max-w-full truncate px-0.5">{t("diff.open")}</span>
        </button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand"
          onClick={() => setOpen(true)}
          title={t("diff.open_hint")}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {t("diff.open")}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-brand" />
              {t("diff.title")}
            </DialogTitle>
          </DialogHeader>

          {/* What this is, and what it is not. Stated once, at the top. */}
          <div className="flex gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">{t("diff.disclaimer")}</p>
          </div>

          {!result && (
            <div className="space-y-4">
              {/* ── Images ── */}
              <div>
                <Label className="text-xs mb-1.5 block">
                  {t("diff.images")} <span className="text-gray-400">({images.length}/{MAX_IMAGES})</span>
                </Label>

                {images.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 mb-2">
                    {images.map((img) => (
                      <div key={img.id} className="space-y-1">
                        <RoiCanvas
                          image={img}
                          onChange={(roi) => setImages((prev) => prev.map((p) => p.id === img.id ? { ...p, roi } : p))}
                        />
                        <div className="flex items-center gap-1.5">
                          <Crop className="h-3 w-3 text-gray-400 shrink-0" />
                          <span className="text-[10px] text-gray-500 flex-1 truncate">
                            {img.roi ? t("diff.roi_set") : t("diff.roi_hint")}
                          </span>
                          {img.roi && (
                            <button
                              type="button"
                              className="text-[10px] text-gray-500 hover:text-brand"
                              onClick={() => setImages((prev) => prev.map((p) => p.id === img.id ? { ...p, roi: undefined } : p))}
                            >
                              {t("diff.roi_clear")}
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-gray-400 hover:text-red-500"
                            onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < MAX_IMAGES && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept={ACCEPTED.join(",")}
                      multiple
                      hidden
                      onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
                    />
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => fileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5" />
                      {t("diff.add_image")}
                    </Button>
                  </>
                )}
              </div>

              {/* ── Region + modality ── */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs mb-1.5 block">{t("diff.region")} *</Label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value as BodyRegion)}
                    className="w-full h-9 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-2 text-sm"
                  >
                    <option value="">{t("diff.region_pick")}</option>
                    {BODY_REGIONS.map((r) => (
                      <option key={r} value={r}>{t(`diff.region_${r}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">{t("diff.modality")}</Label>
                  <Input
                    value={modality}
                    onChange={(e) => setModality(e.target.value)}
                    placeholder={t("diff.modality_ph")}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* ── Hounsfield ── */}
              <div>
                <Label className="text-xs mb-1.5 block">{t("diff.hu")}</Label>
                <Input
                  value={hounsfield}
                  onChange={(e) => setHounsfield(e.target.value)}
                  placeholder={t("diff.hu_ph")}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-gray-500 mt-1">{t("diff.hu_hint")}</p>
              </div>

              {/* ── Clinical note ── */}
              <div>
                <Label className="text-xs mb-1.5 block">{t("diff.note")}</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("diff.note_ph")}
                  rows={2}
                  className="text-sm"
                />
              </div>

              {/* ── The one gate that matters ── */}
              <label className="flex items-start gap-2 cursor-pointer rounded-md border border-[hsl(var(--border))] px-3 py-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[11px] leading-relaxed text-gray-600 dark:text-gray-300">{t("diff.anon_confirm")}</span>
              </label>

              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

              <Button className="w-full gap-2" disabled={!canSubmit} onClick={analyse}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? t("diff.analysing") : t("diff.analyse")}
              </Button>
            </div>
          )}

          {/* ── Results ── */}
          {result && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("diff.observation")}</h3>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{result.observation}</p>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("diff.differentials")}</h3>
                {result.items.map((item, i) => (
                  <div key={`${item.name}-${i}`} className="rounded-md border border-[hsl(var(--border))] p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-brand shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        {item.supporting && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("diff.supporting")}: </span>
                            {item.supporting}
                          </p>
                        )}
                        {item.against && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                            <span className="text-amber-600 dark:text-amber-400 font-medium">{t("diff.against")}: </span>
                            {item.against}
                          </p>
                        )}
                        {item.discriminator && (
                          <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                            <span className="text-blue-600 dark:text-blue-400 font-medium">{t("diff.discriminator")}: </span>
                            {item.discriminator}
                          </p>
                        )}
                        <a
                          href={item.radiopaediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline mt-1.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("diff.radiopaedia")}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.nextStep && (
                <div className="rounded-md bg-[hsl(var(--muted)/0.4)] px-3 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t("diff.next_step")}</h3>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{result.nextStep}</p>
                </div>
              )}

              <p className="text-[10px] text-gray-500 leading-relaxed">{t("diff.footer_note")}</p>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5" onClick={reset}>
                  <X className="h-4 w-4" />
                  {t("diff.new")}
                </Button>
                <Button className="flex-1" onClick={() => setOpen(false)}>{t("diff.close")}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
