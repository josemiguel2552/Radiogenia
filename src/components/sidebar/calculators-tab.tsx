"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
  BookOpenCheck,
  RotateCcw,
} from "lucide-react";
import { useT } from "@/lib/i18n";

/* ═══════════════════════════════════════════
   Shared helpers
   ═══════════════════════════════════════════ */

function NumInput({
  label,
  value,
  onChange,
  unit,
  placeholder,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <Label className="text-[11px] text-gray-500 dark:text-gray-400">{label}</Label>
      <div className="flex items-center gap-1.5 mt-0.5">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "0"}
          className="h-8 text-xs flex-1"
          min={min}
          max={max}
          step={step ?? 0.1}
        />
        {unit && <span className="text-[10px] text-gray-400 shrink-0 w-6">{unit}</span>}
      </div>
    </div>
  );
}

function ResultBox({
  label,
  value,
  interpretation,
  color,
}: {
  label: string;
  value: string;
  interpretation?: string;
  color?: "green" | "yellow" | "red" | "blue" | "gray";
}) {
  const colorMap = {
    green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-300",
    yellow: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300",
    red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300",
    blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300",
    gray: "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300",
  };
  return (
    <div className={`rounded-md border px-3 py-2 ${colorMap[color || "gray"]}`}>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-sm font-bold">{value}</p>
      {interpretation && <p className="text-[11px] mt-0.5 opacity-80">{interpretation}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const t = useT();
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-[11px] gap-1.5"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3 text-violet-500" /> : <Copy className="h-3 w-3" />}
      {copied ? t("calc.copied") : t("calc.copy")}
    </Button>
  );
}

function OptionPills({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
            value === o.key
              ? "bg-brand text-white border-brand"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MultiPills({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() =>
            onChange(
              value.includes(o.key)
                ? value.filter((v) => v !== o.key)
                : [...value, o.key]
            )
          }
          className={`px-2 py-1 text-[11px] rounded-md border transition-colors ${
            value.includes(o.key)
              ? "bg-brand text-white border-brand"
              : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-brand/50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-0.5"
    >
      <RotateCcw className="h-2.5 w-2.5" /> {t("calc.reset")}
    </button>
  );
}

/* ═══════════════════════════════════════════
   1. Adrenal CT Washout
   ═══════════════════════════════════════════ */

function AdrenalWashout() {
  const t = useT();
  const [pre, setPre] = useState("");
  const [post60, setPost60] = useState("");
  const [delayed, setDelayed] = useState("");

  const preN = parseFloat(pre);
  const postN = parseFloat(post60);
  const delN = parseFloat(delayed);

  const hasPre = pre !== "" && !isNaN(preN);
  const hasPost = post60 !== "" && !isNaN(postN);
  const hasDelayed = delayed !== "" && !isNaN(delN);

  const apw = hasPre && hasPost && hasDelayed && (postN - preN) !== 0
    ? ((postN - delN) / (postN - preN)) * 100
    : null;

  const rpw = hasPost && hasDelayed && postN !== 0
    ? ((postN - delN) / postN) * 100
    : null;

  function interpret() {
    if (hasPre && preN <= 10) return { text: t("calc.adrenal_low_density"), color: "green" as const };
    if (apw !== null && apw >= 60) return { text: t("calc.adrenal_adenoma_apw"), color: "green" as const };
    if (rpw !== null && rpw >= 40) return { text: t("calc.adrenal_adenoma_rpw"), color: "green" as const };
    if (apw !== null || rpw !== null) return { text: t("calc.adrenal_indeterminate"), color: "yellow" as const };
    return null;
  }

  const result = interpret();
  const copyText = (() => {
    const parts: string[] = [];
    if (apw !== null) parts.push(`APW ${apw.toFixed(1)}%`);
    if (rpw !== null) parts.push(`RPW ${rpw.toFixed(1)}%`);
    const values = parts.length > 0 ? `${t("calc.copy_adrenal")} ${parts.join(", ")}.` : "";
    if (result) return values ? `${values} ${result.text}.` : result.text;
    return values;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">doi:10.2214/AJR.22.27901</p>
        <ResetButton onClick={() => { setPre(""); setPost60(""); setDelayed(""); }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumInput label={t("calc.pre_contrast")} value={pre} onChange={setPre} unit="HU" />
        <NumInput label={t("calc.post_60s")} value={post60} onChange={setPost60} unit="HU" />
        <NumInput label={t("calc.delayed_15m")} value={delayed} onChange={setDelayed} unit="HU" />
      </div>
      {hasPre && preN <= 10 && (
        <ResultBox label={t("calc.pre_density")} value={`${preN} HU`} interpretation={t("calc.adrenal_low_density")} color="green" />
      )}
      {apw !== null && (
        <ResultBox
          label="APW (Absolute Percentage Washout)"
          value={`${apw.toFixed(1)}%`}
          interpretation={apw >= 60 ? t("calc.adrenal_adenoma_apw") : t("calc.adrenal_indeterminate")}
          color={apw >= 60 ? "green" : "yellow"}
        />
      )}
      {rpw !== null && (
        <ResultBox
          label="RPW (Relative Percentage Washout)"
          value={`${rpw.toFixed(1)}%`}
          interpretation={rpw >= 40 ? t("calc.adrenal_adenoma_rpw") : t("calc.adrenal_indeterminate")}
          color={rpw >= 40 ? "green" : "yellow"}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   2. Thyroid Volume
   ═══════════════════════════════════════════ */

function ThyroidVolume() {
  const t = useT();
  const [rL, setRL] = useState("");
  const [rW, setRW] = useState("");
  const [rH, setRH] = useState("");
  const [lL, setLL] = useState("");
  const [lW, setLW] = useState("");
  const [lH, setLH] = useState("");
  const [isthmus, setIsthmus] = useState("");

  const calc = (a: string, b: string, c: string) => {
    const an = parseFloat(a), bn = parseFloat(b), cn = parseFloat(c);
    if (!a || !b || !c || isNaN(an) || isNaN(bn) || isNaN(cn)) return null;
    return an * bn * cn * 0.523;
  };

  const rightVol = calc(rL, rW, rH);
  const leftVol = calc(lL, lW, lH);
  const total = rightVol !== null && leftVol !== null ? rightVol + leftVol : null;
  const isthN = parseFloat(isthmus);

  const interpret = (vol: number) => {
    if (vol > 25) return { text: t("calc.thyroid_enlarged"), color: "yellow" as const };
    return { text: t("calc.thyroid_normal"), color: "green" as const };
  };

  const copyText = (() => {
    const parts: string[] = [];
    if (rightVol !== null) parts.push(`${t("calc.copy_thyroid_right")} ${rightVol.toFixed(1)} mL`);
    if (leftVol !== null) parts.push(`${t("calc.copy_thyroid_left")} ${leftVol.toFixed(1)} mL`);
    if (total !== null) parts.push(`${t("calc.copy_thyroid_total")} ${total.toFixed(1)} mL`);
    if (!isNaN(isthN) && isthmus) parts.push(`${t("calc.copy_thyroid_isthmus")} ${isthN} mm`);
    if (parts.length === 0) return "";
    const interp = total !== null ? ` ${interpret(total).text}.` : "";
    return `${t("calc.copy_thyroid")} ${parts.join(", ")}.${interp}`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">V = L x W x H x 0.523</p>
        <ResetButton onClick={() => { setRL(""); setRW(""); setRH(""); setLL(""); setLW(""); setLH(""); setIsthmus(""); }} />
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("calc.right_lobe")}</p>
        <div className="grid grid-cols-3 gap-2">
          <NumInput label={`${t("calc.length")} (cm)`} value={rL} onChange={setRL} />
          <NumInput label={`${t("calc.width")} (cm)`} value={rW} onChange={setRW} />
          <NumInput label={`${t("calc.height")} (cm)`} value={rH} onChange={setRH} />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("calc.left_lobe")}</p>
        <div className="grid grid-cols-3 gap-2">
          <NumInput label={`${t("calc.length")} (cm)`} value={lL} onChange={setLL} />
          <NumInput label={`${t("calc.width")} (cm)`} value={lW} onChange={setLW} />
          <NumInput label={`${t("calc.height")} (cm)`} value={lH} onChange={setLH} />
        </div>
      </div>
      <NumInput label={`${t("calc.isthmus")} (mm)`} value={isthmus} onChange={setIsthmus} />
      {rightVol !== null && <ResultBox label={t("calc.right_lobe")} value={`${rightVol.toFixed(1)} mL`} color="blue" />}
      {leftVol !== null && <ResultBox label={t("calc.left_lobe")} value={`${leftVol.toFixed(1)} mL`} color="blue" />}
      {total !== null && (
        <ResultBox
          label={t("calc.total_volume")}
          value={`${total.toFixed(1)} mL`}
          interpretation={interpret(total).text}
          color={interpret(total).color}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   3. Prostate Volume + PSA Density
   ═══════════════════════════════════════════ */

function ProstateVolume() {
  const t = useT();
  const [l, setL] = useState("");
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [psa, setPsa] = useState("");

  const ln = parseFloat(l), wn = parseFloat(w), hn = parseFloat(h), psaN = parseFloat(psa);
  const vol = l && w && h && !isNaN(ln) && !isNaN(wn) && !isNaN(hn)
    ? ln * wn * hn * 0.523
    : null;
  const density = vol && psa && !isNaN(psaN) && vol > 0 ? psaN / vol : null;

  const copyText = (() => {
    const parts: string[] = [];
    if (vol !== null) parts.push(t("calc.copy_prostate").replace("{vol}", vol.toFixed(1)));
    if (density !== null) {
      parts.push(t("calc.copy_psa_density").replace("{density}", density.toFixed(3)));
      parts.push(density >= 0.15 ? t("calc.psa_elevated") : t("calc.psa_normal"));
    }
    return parts.join(" ");
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">V = L x W x H x 0.523</p>
        <ResetButton onClick={() => { setL(""); setW(""); setH(""); setPsa(""); }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumInput label={`${t("calc.length")} (cm)`} value={l} onChange={setL} />
        <NumInput label={`${t("calc.width")} (cm)`} value={w} onChange={setW} />
        <NumInput label={`${t("calc.height")} (cm)`} value={h} onChange={setH} />
      </div>
      <NumInput label="PSA (ng/mL)" value={psa} onChange={setPsa} placeholder={t("calc.optional")} />
      {vol !== null && (
        <ResultBox
          label={t("calc.prostate_volume")}
          value={`${vol.toFixed(1)} mL`}
          interpretation={vol > 80 ? "> 80 mL" : vol > 40 ? "40–80 mL" : vol > 25 ? "25–40 mL" : "< 25 mL"}
          color="blue"
        />
      )}
      {density !== null && (
        <ResultBox
          label="PSA Density"
          value={`${density.toFixed(3)} ng/mL/cc`}
          interpretation={density >= 0.15 ? t("calc.psa_elevated") : t("calc.psa_normal")}
          color={density >= 0.15 ? "yellow" : "green"}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   4. ACR TI-RADS
   ═══════════════════════════════════════════ */

const TIRADS_CATEGORIES = [
  {
    key: "composition",
    options: [
      { key: "cystic", label: "Cystic/spongiform", pts: 0 },
      { key: "mixed", label: "Mixed cystic-solid", pts: 1 },
      { key: "solid", label: "Solid / almost solid", pts: 2 },
    ],
  },
  {
    key: "echogenicity",
    options: [
      { key: "anechoic", label: "Anechoic", pts: 0 },
      { key: "hyper_iso", label: "Hyper/isoechoic", pts: 1 },
      { key: "hypo", label: "Hypoechoic", pts: 2 },
      { key: "very_hypo", label: "Very hypoechoic", pts: 3 },
    ],
  },
  {
    key: "shape",
    options: [
      { key: "wider", label: "Wider than tall", pts: 0 },
      { key: "taller", label: "Taller than wide", pts: 3 },
    ],
  },
  {
    key: "margin",
    options: [
      { key: "smooth", label: "Smooth / ill-defined", pts: 0 },
      { key: "lobulated", label: "Lobulated / irregular", pts: 2 },
      { key: "extension", label: "Extra-thyroidal extension", pts: 3 },
    ],
  },
  {
    key: "foci",
    options: [
      { key: "none", label: "None / comet-tail", pts: 0 },
      { key: "macro", label: "Macrocalcifications", pts: 1 },
      { key: "peripheral", label: "Peripheral (rim) calc.", pts: 2 },
      { key: "punctate", label: "Punctate echogenic foci", pts: 3 },
    ],
  },
];

function getTiradsLevel(pts: number): { level: string; label: string; color: "green" | "blue" | "yellow" | "red" | "gray" } {
  if (pts <= 1) return { level: "TR1", label: "Benign", color: "green" };
  if (pts === 2) return { level: "TR2", label: "Not suspicious", color: "green" };
  if (pts === 3) return { level: "TR3", label: "Mildly suspicious", color: "blue" };
  if (pts <= 6) return { level: "TR4", label: "Moderately suspicious", color: "yellow" };
  return { level: "TR5", label: "Highly suspicious", color: "red" };
}

function getTiradsRec(level: string, t: (k: string) => string): string {
  const recs: Record<string, string> = {
    TR1: t("calc.tirads_tr1_rec"),
    TR2: t("calc.tirads_tr2_rec"),
    TR3: t("calc.tirads_tr3_rec"),
    TR4: t("calc.tirads_tr4_rec"),
    TR5: t("calc.tirads_tr5_rec"),
  };
  return recs[level] || "";
}

function TiradsCalc() {
  const t = useT();
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [fociSelections, setFociSelections] = useState<string[]>([]);

  const categoryLabels: Record<string, string> = {
    composition: t("calc.tirads_composition"),
    echogenicity: t("calc.tirads_echogenicity"),
    shape: t("calc.tirads_shape"),
    margin: t("calc.tirads_margin"),
    foci: t("calc.tirads_foci"),
  };

  const fociCategory = TIRADS_CATEGORIES.find((c) => c.key === "foci")!;
  const fociPts = fociSelections.reduce((sum, key) => {
    const opt = fociCategory.options.find((o) => o.key === key);
    return sum + (opt?.pts ?? 0);
  }, 0);

  const totalPts = TIRADS_CATEGORIES.reduce((sum, cat) => {
    if (cat.key === "foci") return sum + fociPts;
    const sel = selections[cat.key];
    if (!sel) return sum;
    const opt = cat.options.find((o) => o.key === sel);
    return sum + (opt?.pts ?? 0);
  }, 0);

  const allSelected = TIRADS_CATEGORIES.filter((c) => c.key !== "foci").every((cat) => selections[cat.key])
    && fociSelections.length > 0;
  const result = allSelected ? getTiradsLevel(totalPts) : null;

  const copyText = result
    ? t("calc.copy_tirads")
        .replace("{level}", result.level)
        .replace("{label}", result.label)
        .replace("{pts}", String(totalPts))
        .replace("{rec}", getTiradsRec(result.level, t))
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">ACR TI-RADS 2017 (Tessler et al., JACR)</p>
        <ResetButton onClick={() => { setSelections({}); setFociSelections([]); }} />
      </div>
      {TIRADS_CATEGORIES.map((cat) => (
        <div key={cat.key}>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{categoryLabels[cat.key]}</Label>
          {cat.key === "foci" ? (
            <MultiPills
              options={cat.options.map((o) => ({ key: o.key, label: `${o.label} (${o.pts})` }))}
              value={fociSelections}
              onChange={setFociSelections}
            />
          ) : (
            <OptionPills
              options={cat.options.map((o) => ({ key: o.key, label: `${o.label} (${o.pts})` }))}
              value={selections[cat.key] || ""}
              onChange={(v) => setSelections((p) => ({ ...p, [cat.key]: v }))}
            />
          )}
        </div>
      ))}
      {result && (
        <ResultBox
          label={`${result.level} — ${result.label}`}
          value={`${totalPts} ${t("calc.points")}`}
          interpretation={getTiradsRec(result.level, t)}
          color={result.color}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   5. PI-RADS v2.1
   ═══════════════════════════════════════════ */

function PiradsCalc() {
  const t = useT();
  const [zone, setZone] = useState("");
  const [t2, setT2Score] = useState("");
  const [dwi, setDwi] = useState("");
  const [dce, setDce] = useState("");

  function calcPirads(): number | null {
    const t2n = parseInt(t2), dwin = parseInt(dwi), dcen = parseInt(dce);
    if (!zone || isNaN(t2n) || isNaN(dwin)) return null;

    if (zone === "pz") {
      if (dwin <= 2) return dwin;
      if (dwin >= 4) return dwin;
      // DWI = 3
      if (!dce || isNaN(dcen)) return null;
      return dcen > 0 ? 4 : 3;
    } else {
      // TZ
      if (t2n <= 2) return t2n;
      if (t2n >= 4) return t2n;
      // T2 = 3
      if (isNaN(dwin)) return null;
      return dwin >= 5 ? 4 : 3;
    }
  }

  const score = calcPirads();

  const piradsColors: Record<number, "green" | "blue" | "yellow" | "red"> = {
    1: "green", 2: "green", 3: "yellow", 4: "red", 5: "red",
  };

  const piradsLabels: Record<number, string> = {
    1: t("calc.pirads_1"),
    2: t("calc.pirads_2"),
    3: t("calc.pirads_3"),
    4: t("calc.pirads_4"),
    5: t("calc.pirads_5"),
  };

  const copyText = score
    ? t("calc.copy_pirads")
        .replace("{score}", String(score))
        .replace("{interpretation}", piradsLabels[score])
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">PI-RADS v2.1 (ACR 2019)</p>
        <ResetButton onClick={() => { setZone(""); setT2Score(""); setDwi(""); setDce(""); }} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.pirads_zone")}</Label>
        <OptionPills
          options={[
            { key: "pz", label: t("calc.pirads_pz") },
            { key: "tz", label: t("calc.pirads_tz") },
          ]}
          value={zone}
          onChange={setZone}
        />
      </div>
      {zone && (
        <>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">
              {zone === "pz" ? "DWI" : "T2W"} ({t("calc.dominant_sequence")})
            </Label>
            <OptionPills
              options={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: String(n) }))}
              value={zone === "pz" ? dwi : t2}
              onChange={zone === "pz" ? setDwi : setT2Score}
            />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">
              {zone === "pz" ? "T2W" : "DWI"} ({t("calc.secondary_sequence")})
            </Label>
            <OptionPills
              options={[1, 2, 3, 4, 5].map((n) => ({ key: String(n), label: String(n) }))}
              value={zone === "pz" ? t2 : dwi}
              onChange={zone === "pz" ? setT2Score : setDwi}
            />
          </div>
          {zone === "pz" && (
            <div>
              <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">DCE</Label>
              <OptionPills
                options={[
                  { key: "0", label: t("calc.negative") },
                  { key: "1", label: t("calc.positive") },
                ]}
                value={dce}
                onChange={setDce}
              />
            </div>
          )}
        </>
      )}
      {score !== null && (
        <ResultBox
          label={`PI-RADS ${score}`}
          value={piradsLabels[score]}
          color={piradsColors[score]}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   6. Bosniak 2019
   ═══════════════════════════════════════════ */

function BosniakCalc() {
  const t = useT();
  const [septa, setSepta] = useState("");
  const [wall, setWall] = useState("");
  const [enhancement, setEnhancement] = useState("");
  const [nodular, setNodular] = useState("");
  const [calcification, setCalcification] = useState("");

  function classify(): { cls: string; risk: string; color: "green" | "blue" | "yellow" | "red" } | null {
    if (!septa || !wall || !enhancement || !nodular || !calcification) return null;
    const en = enhancement === "yes";

    if (nodular === "yes") return { cls: "IV", risk: t("calc.bosniak_iv_risk"), color: "red" };
    if (septa === "thick_irreg" && en) return { cls: "III", risk: t("calc.bosniak_iii_risk"), color: "yellow" };
    if (wall === "thick_irreg" && en) return { cls: "III", risk: t("calc.bosniak_iii_risk"), color: "yellow" };
    if ((wall === "min_thick" && en) || (septa === "many_thin" && en) || calcification === "thick") return { cls: "IIF", risk: t("calc.bosniak_iif_risk"), color: "blue" };
    if (septa === "few_thin" && (wall === "thin") && !en) return { cls: "II", risk: t("calc.bosniak_ii_risk"), color: "green" };
    if (septa === "none" && wall === "thin" && !en) return { cls: "I", risk: t("calc.bosniak_i_risk"), color: "green" };
    return { cls: "IIF", risk: t("calc.bosniak_iif_risk"), color: "blue" };
  }

  const result = classify();
  const copyText = result
    ? t("calc.copy_bosniak")
        .replace("{cls}", result.cls)
        .replace("{risk}", result.risk)
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Bosniak v2019 (Silverman et al., Radiology 2019)</p>
        <ResetButton onClick={() => { setSepta(""); setWall(""); setEnhancement(""); setNodular(""); setCalcification(""); }} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_septa")}</Label>
        <OptionPills
          options={[
            { key: "none", label: t("calc.bosniak_septa_none") },
            { key: "few_thin", label: t("calc.bosniak_septa_few_thin") },
            { key: "many_thin", label: t("calc.bosniak_septa_many_thin") },
            { key: "thick_irreg", label: t("calc.bosniak_septa_thick_irreg") },
          ]}
          value={septa}
          onChange={setSepta}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_wall")}</Label>
        <OptionPills
          options={[
            { key: "thin", label: t("calc.bosniak_wall_thin") },
            { key: "min_thick", label: t("calc.bosniak_wall_min_thick") },
            { key: "thick_irreg", label: t("calc.bosniak_wall_thick_irreg") },
          ]}
          value={wall}
          onChange={setWall}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_enhancement")}</Label>
        <OptionPills
          options={[
            { key: "no", label: t("calc.no") },
            { key: "yes", label: t("calc.yes") },
          ]}
          value={enhancement}
          onChange={setEnhancement}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_nodular_tissue")}</Label>
        <OptionPills
          options={[
            { key: "no", label: t("calc.no") },
            { key: "yes", label: t("calc.yes") },
          ]}
          value={nodular}
          onChange={setNodular}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_calcification")}</Label>
        <OptionPills
          options={[
            { key: "none", label: t("calc.bosniak_calc_none") },
            { key: "thin", label: t("calc.bosniak_calc_thin") },
            { key: "thick", label: t("calc.bosniak_calc_thick") },
          ]}
          value={calcification}
          onChange={setCalcification}
        />
      </div>
      {result && (
        <ResultBox label={`Bosniak ${result.cls}`} value={result.risk} color={result.color} />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   7. ASPECTS
   ═══════════════════════════════════════════ */

const ASPECTS_REGIONS = [
  { key: "C", label: "Caudate (C)" },
  { key: "L", label: "Lentiform (L)" },
  { key: "IC", label: "Internal capsule (IC)" },
  { key: "I", label: "Insular cortex (I)" },
  { key: "M1", label: "M1 – Anterior MCA" },
  { key: "M2", label: "M2 – MCA lateral" },
  { key: "M3", label: "M3 – Posterior MCA" },
  { key: "M4", label: "M4 – Anterior sup." },
  { key: "M5", label: "M5 – Lateral sup." },
  { key: "M6", label: "M6 – Posterior sup." },
];

function AspectsCalc() {
  const t = useT();
  const [affected, setAffected] = useState<Set<string>>(new Set());

  const score = 10 - affected.size;

  function toggle(key: string) {
    setAffected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const interpret = score <= 5
    ? { text: t("calc.aspects_low"), color: "red" as const }
    : score <= 7
      ? { text: t("calc.aspects_moderate"), color: "yellow" as const }
      : { text: t("calc.aspects_high"), color: "green" as const };

  const copyText = t("calc.copy_aspects")
    .replace("{score}", String(score))
    .replace("{interpretation}", interpret.text);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Barber et al., Lancet 2000</p>
        <ResetButton onClick={() => setAffected(new Set())} />
      </div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("calc.aspects_instruction")}</p>
      <div className="grid grid-cols-2 gap-1">
        {ASPECTS_REGIONS.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => toggle(r.key)}
            className={`px-2 py-1.5 text-[11px] rounded-md border text-left transition-colors ${
              affected.has(r.key)
                ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 line-through"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResultBox
        label="ASPECTS"
        value={`${score} / 10`}
        interpretation={interpret.text}
        color={interpret.color}
      />
      <CopyButton text={copyText} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   8. On-track / Off-track (Shoulder instability)
   ═══════════════════════════════════════════ */

function OnTrackOffTrack() {
  const t = useT();
  const [glenoidW, setGlenoidW] = useState("");
  const [boneLoss, setBoneLoss] = useState("");
  const [hsi, setHsi] = useState("");

  const gw = parseFloat(glenoidW);
  const bl = parseFloat(boneLoss);
  const hs = parseFloat(hsi);

  const hasAll = glenoidW && boneLoss && hsi && !isNaN(gw) && !isNaN(bl) && !isNaN(hs) && gw > 0;

  const glenoidTrack = hasAll ? (0.83 * gw) - bl : null;
  const isOffTrack = glenoidTrack !== null && hs > glenoidTrack;

  const copyText = glenoidTrack !== null
    ? `Glenoid track: ${glenoidTrack.toFixed(1)} mm. HSI: ${hs} mm. ${isOffTrack ? "OFF-TRACK" : "ON-TRACK"}. ${isOffTrack ? t("calc.offtrack_interpretation") : t("calc.ontrack_interpretation")}`
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Di Giacomo et al., JBJS 2014; Yamamoto et al., AJSM 2007</p>
        <ResetButton onClick={() => { setGlenoidW(""); setBoneLoss(""); setHsi(""); }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumInput label={t("calc.glenoid_width")} value={glenoidW} onChange={setGlenoidW} unit="mm" />
        <NumInput label={t("calc.bone_loss")} value={boneLoss} onChange={setBoneLoss} unit="mm" />
        <NumInput label={t("calc.hsi")} value={hsi} onChange={setHsi} unit="mm" />
      </div>
      <p className="text-[10px] text-gray-400 leading-relaxed">{t("calc.ontrack_formula")}</p>
      {glenoidTrack !== null && (
        <>
          <ResultBox label="Glenoid track" value={`${glenoidTrack.toFixed(1)} mm`} color="blue" />
          <ResultBox
            label={isOffTrack ? "OFF-TRACK" : "ON-TRACK"}
            value={isOffTrack ? t("calc.offtrack_interpretation") : t("calc.ontrack_interpretation")}
            interpretation={`HSI (${hs} mm) ${isOffTrack ? ">" : "≤"} Glenoid track (${glenoidTrack.toFixed(1)} mm)`}
            color={isOffTrack ? "red" : "green"}
          />
        </>
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   9. Renal Lesion Characterization (Multiphase CT)
   ═══════════════════════════════════════════ */

function RenalLesionCalc() {
  const t = useT();
  const [unenh, setUnenh] = useState("");
  const [cm, setCm] = useState("");
  const [np, setNp] = useState("");
  const [dp, setDp] = useState("");
  const [size, setSize] = useState("");
  const [homog, setHomog] = useState("");

  const unenhN = parseFloat(unenh);
  const cmN = parseFloat(cm);
  const npN = parseFloat(np);
  const sizeN = parseFloat(size);

  const hasUnenh = unenh !== "" && !isNaN(unenhN);
  const hasCm = cm !== "" && !isNaN(cmN);
  const hasNp = np !== "" && !isNaN(npN);
  const hasSize = size !== "" && !isNaN(sizeN);

  const enhancement = hasUnenh && (hasCm || hasNp)
    ? Math.max(hasCm ? cmN : -Infinity, hasNp ? npN : -Infinity) - unenhN
    : null;

  function interpret(): { text: string; color: "green" | "blue" | "yellow" | "red" } | null {
    if (!hasUnenh || enhancement === null) return null;
    if (unenhN <= 20 && enhancement < 20) return { text: t("calc.renal_simple_cyst"), color: "green" };
    if (unenhN > 70 && Math.abs(enhancement) < 10) return { text: t("calc.renal_hyperdense"), color: "green" };
    if (unenhN >= -10 && unenhN <= 20 && enhancement >= 10 && enhancement < 20) return { text: t("calc.renal_indeterminate"), color: "yellow" };
    if (enhancement >= 20 && homog === "homog" && hasSize && sizeN < 30) return { text: t("calc.renal_small_enhancing"), color: "yellow" };
    if (enhancement >= 20 && homog === "heterog") return { text: t("calc.renal_heterog_mass"), color: "red" };
    if (enhancement >= 20 && homog === "homog" && hasSize && sizeN >= 30) return { text: t("calc.renal_enhancing_mass"), color: "red" };
    if (enhancement >= 20) return { text: t("calc.renal_enhancing_mass"), color: "red" };
    return null;
  }

  const result = interpret();
  const copyParts: string[] = [];
  if (enhancement !== null) copyParts.push(`${t("calc.renal_enhancement")}: ${enhancement.toFixed(0)} HU`);
  if (result) copyParts.push(result.text);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Bosniak v2019 / ACR Incidental Findings 2017</p>
        <ResetButton onClick={() => { setUnenh(""); setCm(""); setNp(""); setDp(""); setSize(""); setHomog(""); }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label={t("calc.renal_unenh")} value={unenh} onChange={setUnenh} unit="HU" />
        <NumInput label={t("calc.renal_cm_phase")} value={cm} onChange={setCm} unit="HU" />
        <NumInput label={t("calc.renal_np_phase")} value={np} onChange={setNp} unit="HU" />
        <NumInput label={t("calc.renal_dp_phase")} value={dp} onChange={setDp} unit="HU" placeholder={t("calc.optional")} />
      </div>
      <NumInput label={`${t("calc.size")} (mm)`} value={size} onChange={setSize} unit="mm" />
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.renal_homog")}</Label>
        <OptionPills
          options={[
            { key: "homog", label: t("calc.renal_homog") },
            { key: "heterog", label: t("calc.renal_heterog") },
          ]}
          value={homog}
          onChange={setHomog}
        />
      </div>
      {enhancement !== null && (
        <ResultBox label={t("calc.renal_enhancement")} value={`${enhancement.toFixed(0)} HU`} color={enhancement >= 20 ? "yellow" : "blue"} />
      )}
      {result && (
        <ResultBox label={t("calc.renal_title")} value={result.text} color={result.color} />
      )}
      {copyParts.length > 0 && <CopyButton text={copyParts.join(". ")} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   10. Lung TNM 9th Edition (2024)
   ═══════════════════════════════════════════ */

function LungTNMCalc() {
  const t = useT();
  const [tumorType, setTumorType] = useState("");
  const [tumorSize, setTumorSize] = useState("");
  const [invasions, setInvasions] = useState<string[]>([]);
  const [nodeLocation, setNodeLocation] = useState("");
  const [metsType, setMetsType] = useState("");

  const typeOptions = [
    { key: "standard", label: t("calc.lung_type_standard") },
    { key: "in_situ", label: t("calc.lung_type_in_situ") },
    { key: "minimally_inv", label: t("calc.lung_type_minimally_inv") },
  ];

  const sizeOptions = [
    { key: "le1", label: "≤1 cm" },
    { key: "1to2", label: "1-2 cm" },
    { key: "2to3", label: "2-3 cm" },
    { key: "3to4", label: "3-4 cm" },
    { key: "4to5", label: "4-5 cm" },
    { key: "5to7", label: "5-7 cm" },
    { key: "gt7", label: ">7 cm" },
  ];

  const invasionOptions = [
    { key: "visceral_pleura", label: t("calc.lung_inv_visceral_pleura") },
    { key: "main_bronchus", label: t("calc.lung_inv_main_bronchus") },
    { key: "atelectasis", label: t("calc.lung_inv_atelectasis") },
    { key: "chest_wall", label: t("calc.lung_inv_chest_wall") },
    { key: "same_lobe", label: t("calc.lung_inv_same_lobe") },
    { key: "mediastinum", label: t("calc.lung_inv_mediastinum") },
    { key: "trachea_esoph", label: t("calc.lung_inv_trachea") },
    { key: "diff_lobe", label: t("calc.lung_inv_diff_lobe") },
  ];

  const nodeOptions = [
    { key: "none", label: t("calc.lung_node_none") },
    { key: "hilar", label: t("calc.lung_node_hilar") },
    { key: "mediastinal_single", label: t("calc.lung_node_mediastinal_single") },
    { key: "mediastinal_multi", label: t("calc.lung_node_mediastinal_multi") },
    { key: "contralateral", label: t("calc.lung_node_contralateral") },
  ];

  const metsOptions = [
    { key: "none", label: t("calc.lung_mets_none") },
    { key: "contralateral_pleural", label: t("calc.lung_mets_contralateral") },
    { key: "single_extra", label: t("calc.lung_mets_single_extra") },
    { key: "multi_extra", label: t("calc.lung_mets_multi_extra") },
  ];

  function deriveT(): string {
    if (tumorType === "in_situ") return "Tis";
    if (tumorType === "minimally_inv") return "T1mi";

    const hasT4Inv = invasions.some((i) => ["mediastinum", "trachea_esoph", "diff_lobe"].includes(i));
    const hasT3Inv = invasions.some((i) => ["chest_wall", "same_lobe"].includes(i));
    const hasT2Inv = invasions.some((i) => ["visceral_pleura", "main_bronchus", "atelectasis"].includes(i));

    const sizeT: Record<string, number> = {
      le1: 1, "1to2": 2, "2to3": 3, "3to4": 4, "4to5": 5, "5to7": 6, gt7: 7,
    };
    const sLevel = sizeT[tumorSize] || 0;

    let tLevel = sLevel <= 1 ? 1 : sLevel <= 2 ? 2 : sLevel <= 3 ? 3 : sLevel <= 4 ? 4 : sLevel <= 5 ? 5 : sLevel <= 6 ? 6 : 7;
    if (hasT2Inv && tLevel < 4) tLevel = 4;
    if (hasT3Inv && tLevel < 6) tLevel = 6;
    if (hasT4Inv) tLevel = 7;

    if (!tumorSize && !hasT2Inv && !hasT3Inv && !hasT4Inv) return "";

    const tMap: Record<number, string> = { 1: "T1a", 2: "T1b", 3: "T1c", 4: "T2a", 5: "T2b", 6: "T3", 7: "T4" };
    return tMap[tLevel] || "";
  }

  function deriveN(): string {
    if (!nodeLocation) return "";
    const nMap: Record<string, string> = {
      none: "N0", hilar: "N1", mediastinal_single: "N2a", mediastinal_multi: "N2b", contralateral: "N3",
    };
    return nMap[nodeLocation] || "";
  }

  function deriveM(): string {
    if (!metsType) return "";
    const mMap: Record<string, string> = {
      none: "M0", contralateral_pleural: "M1a", single_extra: "M1b", multi_extra: "M1c",
    };
    return mMap[metsType] || "";
  }

  const tStage = deriveT();
  const nStage = deriveN();
  const mStage = deriveM();

  function getStage(): { stage: string; color: "green" | "blue" | "yellow" | "red" } | null {
    if (!tStage || !nStage || !mStage) return null;

    if (mStage === "M1c") return { stage: "IVB", color: "red" };
    if (mStage === "M1a" || mStage === "M1b") return { stage: "IVA", color: "red" };

    const isT12 = ["Tis", "T1mi", "T1a", "T1b", "T1c", "T2a", "T2b"].includes(tStage);
    const isT1T2 = ["T1mi", "T1a", "T1b", "T1c", "T2a", "T2b"].includes(tStage);
    const isT34 = tStage === "T3" || tStage === "T4";
    const isT1T3 = isT1T2 || tStage === "T3";

    if (nStage === "N3") {
      if (isT34) return { stage: "IIIC", color: "red" };
      if (isT1T3) return { stage: "IIIB", color: "red" };
    }
    if (nStage === "N2b") {
      if (isT34) return { stage: "IIIB", color: "red" };
      if (isT12) return { stage: "IIIA", color: "yellow" };
    }
    if (nStage === "N2a") {
      if (isT34) return { stage: "IIIB", color: "red" };
      if (isT1T2) return { stage: "IIIA", color: "yellow" };
    }
    if (nStage === "N1") {
      if (tStage === "T4") return { stage: "IIIA", color: "yellow" };
      if (tStage === "T3") return { stage: "IIIA", color: "yellow" };
      if (isT1T2) return { stage: "IIB", color: "yellow" };
    }
    if (nStage === "N0") {
      if (tStage === "T4") return { stage: "IIIA", color: "yellow" };
      if (tStage === "T3") return { stage: "IIB", color: "yellow" };
      if (tStage === "T2b") return { stage: "IIA", color: "blue" };
      if (tStage === "T2a") return { stage: "IB", color: "blue" };
      if (tStage === "T1c") return { stage: "IA3", color: "green" };
      if (tStage === "T1b") return { stage: "IA2", color: "green" };
      if (tStage === "T1a" || tStage === "T1mi") return { stage: "IA1", color: "green" };
      if (tStage === "Tis") return { stage: "0", color: "green" };
    }
    return { stage: "—", color: "yellow" };
  }

  const result = getStage();
  const copyText = result
    ? `${tStage} ${nStage} ${mStage} — ${t("calc.stage")} ${result.stage}`
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">IASLC TNM 9th ed. (2024)</p>
        <ResetButton onClick={() => { setTumorType(""); setTumorSize(""); setInvasions([]); setNodeLocation(""); setMetsType(""); }} />
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.lung_tumor_type")}</Label>
        <OptionPills options={typeOptions} value={tumorType} onChange={setTumorType} />
      </div>

      {tumorType === "standard" && (
        <>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.lung_size")}</Label>
            <OptionPills options={sizeOptions} value={tumorSize} onChange={setTumorSize} />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.lung_invasion")}</Label>
            <MultiPills options={invasionOptions} value={invasions} onChange={setInvasions} />
          </div>
        </>
      )}

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.lung_node_location")}</Label>
        <OptionPills options={nodeOptions} value={nodeLocation} onChange={setNodeLocation} />
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.lung_mets_type")}</Label>
        <OptionPills options={metsOptions} value={metsType} onChange={setMetsType} />
      </div>

      {tStage && <p className="text-[10px] text-gray-500 font-medium">T → {tStage}</p>}
      {nStage && <p className="text-[10px] text-gray-500 font-medium">N → {nStage}</p>}
      {mStage && <p className="text-[10px] text-gray-500 font-medium">M → {mStage}</p>}

      {result && (
        <ResultBox
          label={t("calc.stage")}
          value={`${t("calc.stage")} ${result.stage}`}
          interpretation={`${tStage} ${nStage} ${mStage}`}
          color={result.color}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   11. Laryngeal TNM (8th edition)
   ═══════════════════════════════════════════ */

function LarynxTNMCalc() {
  const t = useT();
  const [subsite, setSubsite] = useState("");
  const [tCriteria, setTCriteria] = useState<string[]>([]);
  const [nodeNumber, setNodeNumber] = useState("");
  const [nodeLaterality, setNodeLaterality] = useState("");
  const [nodeSize, setNodeSize] = useState("");
  const [nodeENE, setNodeENE] = useState("");
  const [hasMets, setHasMets] = useState("");

  const subsiteOptions = [
    { key: "supraglottic", label: t("calc.supraglottic") },
    { key: "glottic", label: t("calc.glottic") },
    { key: "subglottic", label: t("calc.subglottic") },
  ];

  const supraglotticCriteria = [
    { key: "one_subsite", label: t("calc.larynx_crit_one_subsite") },
    { key: "multi_subsite", label: t("calc.larynx_crit_multi_subsite") },
    { key: "cord_fixation", label: t("calc.larynx_crit_cord_fixation") },
    { key: "preepiglottic", label: t("calc.larynx_crit_preepiglottic") },
    { key: "paraglottic", label: t("calc.larynx_crit_paraglottic") },
    { key: "inner_thyroid", label: t("calc.larynx_crit_inner_thyroid") },
    { key: "through_cartilage", label: t("calc.larynx_crit_through_cartilage") },
    { key: "soft_tissues", label: t("calc.larynx_crit_soft_tissues") },
    { key: "prevertebral", label: t("calc.larynx_crit_prevertebral") },
    { key: "carotid", label: t("calc.larynx_crit_carotid") },
  ];

  const glotticCriteria = [
    { key: "one_cord", label: t("calc.larynx_crit_one_cord") },
    { key: "both_cords", label: t("calc.larynx_crit_both_cords") },
    { key: "extension_supra_sub", label: t("calc.larynx_crit_extension_supra_sub") },
    { key: "impaired_mobility", label: t("calc.larynx_crit_impaired_mobility") },
    { key: "cord_fixation", label: t("calc.larynx_crit_cord_fixation") },
    { key: "paraglottic", label: t("calc.larynx_crit_paraglottic") },
    { key: "inner_thyroid", label: t("calc.larynx_crit_inner_thyroid") },
    { key: "through_cartilage", label: t("calc.larynx_crit_through_cartilage") },
    { key: "soft_tissues", label: t("calc.larynx_crit_soft_tissues") },
    { key: "prevertebral", label: t("calc.larynx_crit_prevertebral") },
    { key: "carotid", label: t("calc.larynx_crit_carotid") },
  ];

  const subglotticCriteria = [
    { key: "limited_subglottis", label: t("calc.larynx_crit_limited_subglottis") },
    { key: "extends_cords", label: t("calc.larynx_crit_extends_cords") },
    { key: "cord_fixation", label: t("calc.larynx_crit_cord_fixation") },
    { key: "paraglottic", label: t("calc.larynx_crit_paraglottic") },
    { key: "inner_thyroid", label: t("calc.larynx_crit_inner_thyroid") },
    { key: "through_cartilage", label: t("calc.larynx_crit_through_cartilage") },
    { key: "soft_tissues", label: t("calc.larynx_crit_soft_tissues") },
    { key: "prevertebral", label: t("calc.larynx_crit_prevertebral") },
    { key: "carotid", label: t("calc.larynx_crit_carotid") },
  ];

  const criteriaMap: Record<string, { key: string; label: string }[]> = {
    supraglottic: supraglotticCriteria,
    glottic: glotticCriteria,
    subglottic: subglotticCriteria,
  };

  const nodeNumberOptions = [
    { key: "none", label: t("calc.larynx_node_none") },
    { key: "single", label: t("calc.larynx_node_single") },
    { key: "multiple", label: t("calc.larynx_node_multiple") },
  ];

  const nodeLateralityOptions = [
    { key: "ipsilateral", label: t("calc.larynx_node_ipsilateral") },
    { key: "bilateral", label: t("calc.larynx_node_bilateral") },
  ];

  const nodeSizeOptions = [
    { key: "le3", label: "≤3 cm" },
    { key: "3to6", label: "3-6 cm" },
    { key: "gt6", label: ">6 cm" },
  ];

  const nodeENEOptions = [
    { key: "negative", label: "ENE(−)" },
    { key: "positive", label: "ENE(+)" },
  ];

  const metsOptions = [
    { key: "no", label: t("calc.larynx_mets_no") },
    { key: "yes", label: t("calc.larynx_mets_yes") },
  ];

  function deriveT(): string {
    if (!subsite || tCriteria.length === 0) return "";
    const has = (k: string) => tCriteria.includes(k);
    const hasT4b = has("prevertebral") || has("carotid");
    const hasT4a = has("through_cartilage") || has("soft_tissues");
    const hasT3 = has("cord_fixation") || has("paraglottic") || has("inner_thyroid") || has("preepiglottic");

    if (hasT4b) return "T4b";
    if (hasT4a) return "T4a";
    if (hasT3) return "T3";

    if (subsite === "supraglottic") {
      if (has("multi_subsite")) return "T2";
      if (has("one_subsite")) return "T1";
    }
    if (subsite === "glottic") {
      if (has("extension_supra_sub") || has("impaired_mobility")) return "T2";
      if (has("both_cords")) return "T1b";
      if (has("one_cord")) return "T1a";
    }
    if (subsite === "subglottic") {
      if (has("extends_cords")) return "T2";
      if (has("limited_subglottis")) return "T1";
    }
    return "";
  }

  function deriveN(): string {
    if (!nodeNumber) return "";
    if (nodeNumber === "none") return "N0";
    if (nodeENE === "positive") return "N3b";
    if (nodeSize === "gt6") return "N3a";
    if (nodeNumber === "multiple" && nodeLaterality === "ipsilateral" && nodeSize !== "gt6") return "N2b";
    if (nodeLaterality === "bilateral") return "N2c";
    if (nodeNumber === "single" && nodeLaterality === "ipsilateral") {
      if (nodeSize === "3to6") return "N2a";
      if (nodeSize === "le3") return "N1";
    }
    if (!nodeLaterality || !nodeSize) return "";
    return "";
  }

  function deriveM(): string {
    if (!hasMets) return "";
    return hasMets === "yes" ? "M1" : "M0";
  }

  const tStage = deriveT();
  const nStage = deriveN();
  const mStage = deriveM();

  function getStage(): { stage: string; color: "green" | "blue" | "yellow" | "red" } | null {
    if (!tStage || !nStage || !mStage) return null;

    if (mStage === "M1") return { stage: "IVC", color: "red" };
    if (nStage === "N3a" || nStage === "N3b") return { stage: "IVB", color: "red" };
    if (tStage === "T4b") return { stage: "IVB", color: "red" };

    const isN2 = ["N2a", "N2b", "N2c"].includes(nStage);
    const isT1 = ["T1", "T1a", "T1b"].includes(tStage);
    const isT1toT4a = !tStage.includes("T4b");

    if (isN2 && isT1toT4a) return { stage: "IVA", color: "red" };
    if (tStage === "T4a" && (nStage === "N0" || nStage === "N1")) return { stage: "IVA", color: "red" };

    if (nStage === "N1") {
      if (isT1 || tStage === "T2" || tStage === "T3") return { stage: "III", color: "yellow" };
    }
    if (nStage === "N0") {
      if (tStage === "T3") return { stage: "III", color: "yellow" };
      if (tStage === "T2") return { stage: "II", color: "blue" };
      if (isT1) return { stage: "I", color: "green" };
    }
    return { stage: "—", color: "yellow" };
  }

  const result = getStage();
  const copyText = result ? `${tStage} ${nStage} ${mStage} — ${t("calc.stage")} ${result.stage}` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">AJCC 8th ed. (2017)</p>
        <ResetButton onClick={() => { setSubsite(""); setTCriteria([]); setNodeNumber(""); setNodeLaterality(""); setNodeSize(""); setNodeENE(""); setHasMets(""); }} />
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.subsite")}</Label>
        <OptionPills options={subsiteOptions} value={subsite} onChange={(v) => { setSubsite(v); setTCriteria([]); }} />
      </div>

      {subsite && (
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_t_criteria")}</Label>
          <MultiPills options={criteriaMap[subsite]} value={tCriteria} onChange={setTCriteria} />
        </div>
      )}

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_node_number")}</Label>
        <OptionPills options={nodeNumberOptions} value={nodeNumber} onChange={setNodeNumber} />
      </div>

      {nodeNumber && nodeNumber !== "none" && (
        <>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_node_laterality")}</Label>
            <OptionPills options={nodeLateralityOptions} value={nodeLaterality} onChange={setNodeLaterality} />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_node_size")}</Label>
            <OptionPills options={nodeSizeOptions} value={nodeSize} onChange={setNodeSize} />
          </div>
          <div>
            <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_node_ene")}</Label>
            <OptionPills options={nodeENEOptions} value={nodeENE} onChange={setNodeENE} />
          </div>
        </>
      )}

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.larynx_mets")}</Label>
        <OptionPills options={metsOptions} value={hasMets} onChange={setHasMets} />
      </div>

      {tStage && <p className="text-[10px] text-gray-500 font-medium">T → {tStage}</p>}
      {nStage && <p className="text-[10px] text-gray-500 font-medium">N → {nStage}</p>}
      {mStage && <p className="text-[10px] text-gray-500 font-medium">M → {mStage}</p>}

      {result && (
        <ResultBox
          label={t("calc.stage")}
          value={`${t("calc.stage")} ${result.stage}`}
          interpretation={`${tStage} ${nStage} ${mStage}`}
          color={result.color}
        />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHEAT SHEETS
   ═══════════════════════════════════════════ */

function CheatSheet({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <BookOpenCheck className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex-1">{title}</span>
        {open ? <ChevronDown className="h-3 w-3 text-gray-400" /> : <ChevronRight className="h-3 w-3 text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[10px] text-gray-400 italic">{source}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function SheetTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((h, i) => (
              <th key={i} className="text-left py-1 px-1.5 font-semibold text-gray-600 dark:text-gray-300">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-gray-800/50">
              {row.map((cell, j) => (
                <td key={j} className="py-1 px-1.5 text-gray-600 dark:text-gray-300">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FleischnerSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.fleischner_title")} source="Fleischner Society 2017 (MacMahon et al., Radiology 2017)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.solid_nodules")}</p>
      <SheetTable
        headers={[t("calc.size"), t("calc.low_risk"), t("calc.high_risk")]}
        rows={[
          ["< 6 mm", t("calc.fleischner_s_small_low"), t("calc.fleischner_s_small_high")],
          ["6–8 mm", t("calc.fleischner_s_med_low"), t("calc.fleischner_s_med_high")],
          ["> 8 mm", t("calc.fleischner_s_large"), t("calc.fleischner_s_large")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.subsolid_nodules")}</p>
      <SheetTable
        headers={[t("calc.type"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          ["GGN", "< 6 mm", t("calc.fleischner_ggn_small")],
          ["GGN", ">= 6 mm", t("calc.fleischner_ggn_large")],
          [t("calc.part_solid"), "< 6 mm", t("calc.fleischner_ps_small")],
          [t("calc.part_solid"), ">= 6 mm", t("calc.fleischner_ps_large")],
        ]}
      />
    </CheatSheet>
  );
}

function LiverIncidentalSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.liver_title")} source="ACR Incidental Findings Committee 2017">
      <SheetTable
        headers={[t("calc.finding"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          [t("calc.liver_cyst"), t("calc.any_size"), t("calc.liver_cyst_rec")],
          [t("calc.liver_hemangioma"), "< 3 cm", t("calc.liver_hemangioma_small")],
          [t("calc.liver_hemangioma"), ">= 3 cm", t("calc.liver_hemangioma_large")],
          [t("calc.liver_fnhlike"), t("calc.any_size"), t("calc.liver_fnh_rec")],
          [t("calc.liver_hypo_lesion"), "< 1 cm", t("calc.liver_hypo_small")],
          [t("calc.liver_hypo_lesion"), "1–1.5 cm", t("calc.liver_hypo_medium")],
          [t("calc.liver_hypo_lesion"), "> 1.5 cm", t("calc.liver_hypo_large")],
        ]}
      />
    </CheatSheet>
  );
}

function AdrenalIncidentalSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.adrenal_incidental_title")} source="ACR Incidental Findings Committee 2017 / Mayo et al.">
      <SheetTable
        headers={[t("calc.finding"), t("calc.recommendation")]}
        rows={[
          [t("calc.adrenal_hom_low"), t("calc.adrenal_hom_low_rec")],
          [t("calc.adrenal_hom_mid"), t("calc.adrenal_hom_mid_rec")],
          [t("calc.adrenal_large"), t("calc.adrenal_large_rec")],
          [t("calc.adrenal_suspicious"), t("calc.adrenal_suspicious_rec")],
        ]}
      />
    </CheatSheet>
  );
}

function PancreaticCystSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.pancreas_title")} source="ACR Incidental Findings Committee 2017 / AGA 2015 / Fukuoka IAP 2017">
      <SheetTable
        headers={[t("calc.size"), t("calc.recommendation")]}
        rows={[
          ["< 1.5 cm", t("calc.pancreas_small")],
          ["1.5–2.5 cm", t("calc.pancreas_medium")],
          ["> 2.5 cm", t("calc.pancreas_large")],
          [t("calc.pancreas_worrisome"), t("calc.pancreas_worrisome_rec")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.pancreas_char_title")}</p>
      <SheetTable
        headers={[t("calc.pancreas_char_type"), t("calc.pancreas_char_imaging"), t("calc.pancreas_char_location"), t("calc.pancreas_char_duct"), t("calc.pancreas_char_malignancy")]}
        rows={[
          [t("calc.pancreas_scn"), t("calc.pancreas_scn_img"), t("calc.pancreas_scn_loc"), t("calc.pancreas_scn_duct"), t("calc.pancreas_scn_malig")],
          [t("calc.pancreas_mcn"), t("calc.pancreas_mcn_img"), t("calc.pancreas_mcn_loc"), t("calc.pancreas_mcn_duct"), t("calc.pancreas_mcn_malig")],
          [t("calc.pancreas_bdipmn"), t("calc.pancreas_bdipmn_img"), t("calc.pancreas_bdipmn_loc"), t("calc.pancreas_bdipmn_duct"), t("calc.pancreas_bdipmn_malig")],
          [t("calc.pancreas_mdipmn"), t("calc.pancreas_mdipmn_img"), t("calc.pancreas_mdipmn_loc"), t("calc.pancreas_mdipmn_duct"), t("calc.pancreas_mdipmn_malig")],
          [t("calc.pancreas_spn"), t("calc.pancreas_spn_img"), t("calc.pancreas_spn_loc"), t("calc.pancreas_spn_duct"), t("calc.pancreas_spn_malig")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.pancreas_fukuoka")}</p>
      <SheetTable
        headers={[t("calc.category"), t("calc.description")]}
        rows={[
          [t("calc.pancreas_worrisome_features"), t("calc.pancreas_wf_list")],
          [t("calc.pancreas_high_risk"), t("calc.pancreas_hr_list")],
        ]}
      />
    </CheatSheet>
  );
}

function LiradsSheet() {
  const t = useT();
  return (
    <CheatSheet title="LI-RADS" source="ACR LI-RADS v2018">
      <SheetTable
        headers={[t("calc.category"), t("calc.description"), t("calc.malignancy_probability")]}
        rows={[
          ["LR-NC", t("calc.lirads_nc"), t("calc.lirads_nc_prob")],
          ["LR-1", t("calc.lirads_1"), t("calc.lirads_1_prob")],
          ["LR-2", t("calc.lirads_2"), t("calc.lirads_2_prob")],
          ["LR-3", t("calc.lirads_3"), t("calc.lirads_3_prob")],
          ["LR-4", t("calc.lirads_4"), t("calc.lirads_4_prob")],
          ["LR-5", t("calc.lirads_5"), t("calc.lirads_5_prob")],
          ["LR-M", t("calc.lirads_m"), t("calc.lirads_m_prob")],
          ["LR-TIV", t("calc.lirads_tiv"), "100%"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.lirads_major_features")}</p>
      <SheetTable
        headers={[t("calc.lirads_feature"), t("calc.lirads_definition")]}
        rows={[
          [t("calc.lirads_aphe"), t("calc.lirads_aphe_def")],
          [t("calc.lirads_washout"), t("calc.lirads_washout_def")],
          [t("calc.lirads_capsule"), t("calc.lirads_capsule_def")],
          [t("calc.lirads_growth"), t("calc.lirads_growth_def")],
          [t("calc.lirads_size"), t("calc.lirads_size_def")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.lirads_dx_table")}</p>
      <SheetTable
        headers={[t("calc.lirads_dx_size"), t("calc.lirads_dx_no_extra"), t("calc.lirads_dx_one"), t("calc.lirads_dx_two")]}
        rows={[
          ["< 10 mm", "LR-3", "LR-4", "LR-4"],
          ["10–19 mm", "LR-3", "LR-4", "LR-5"],
          ["≥ 20 mm", "LR-4", "LR-5", "LR-5"],
        ]}
      />
    </CheatSheet>
  );
}

function TesticularTorsionSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.torsion_title")} source="ACR Appropriateness Criteria 2022 / Blaivas M et al., Acad Emerg Med 2001">
      <SheetTable
        headers={[t("calc.torsion_finding"), t("calc.torsion_description"), t("calc.torsion_significance")]}
        rows={[
          [t("calc.torsion_doppler_absent"), t("calc.torsion_doppler_absent_desc"), t("calc.torsion_doppler_absent_sig")],
          [t("calc.torsion_whirlpool"), t("calc.torsion_whirlpool_desc"), t("calc.torsion_whirlpool_sig")],
          [t("calc.torsion_enlarge"), t("calc.torsion_enlarge_desc"), t("calc.torsion_enlarge_sig")],
          [t("calc.torsion_hydrocele"), t("calc.torsion_hydrocele_desc"), t("calc.torsion_hydrocele_sig")],
          [t("calc.torsion_wall"), t("calc.torsion_wall_desc"), t("calc.torsion_wall_sig")],
          [t("calc.torsion_epi"), t("calc.torsion_epi_desc"), t("calc.torsion_epi_sig")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.torsion_timing")}</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>{t("calc.torsion_time_6")}</p>
        <p>{t("calc.torsion_time_12")}</p>
        <p>{t("calc.torsion_time_24")}</p>
      </div>
      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-2">{t("calc.torsion_urgent")}</p>
    </CheatSheet>
  );
}

function OradsSheet() {
  const t = useT();
  return (
    <CheatSheet title="O-RADS" source="ACR O-RADS MRI 2022 (Thomassin-Naggara et al., Radiology 2022)">
      <SheetTable
        headers={[t("calc.score"), t("calc.risk_level"), t("calc.recommendation")]}
        rows={[
          ["1", t("calc.orads_1"), t("calc.orads_1_rec")],
          ["2", t("calc.orads_2"), t("calc.orads_2_rec")],
          ["3", t("calc.orads_3"), t("calc.orads_3_rec")],
          ["4", t("calc.orads_4"), t("calc.orads_4_rec")],
          ["5", t("calc.orads_5"), t("calc.orads_5_rec")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── New Cheat Sheets ── */

function LungRadsSheet() {
  const t = useT();
  return (
    <CheatSheet title="Lung-RADS v2022" source="ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)">
      <SheetTable
        headers={[t("calc.category"), t("calc.finding"), t("calc.recommendation")]}
        rows={[
          ["0", t("calc.lungrads_0"), t("calc.lungrads_0_rec")],
          ["1", t("calc.lungrads_1"), t("calc.lungrads_1_rec")],
          ["2", t("calc.lungrads_2"), t("calc.lungrads_2_rec")],
          ["3", t("calc.lungrads_3"), t("calc.lungrads_3_rec")],
          ["4A", t("calc.lungrads_4a"), t("calc.lungrads_4a_rec")],
          ["4B", t("calc.lungrads_4b"), t("calc.lungrads_4b_rec")],
          ["4X", t("calc.lungrads_4x"), t("calc.lungrads_4x_rec")],
          ["S", t("calc.lungrads_s"), t("calc.lungrads_s_rec")],
        ]}
      />
    </CheatSheet>
  );
}

function BiradsSheet() {
  const t = useT();
  return (
    <CheatSheet title="BI-RADS v2025" source="ACR BI-RADS v2025 Manual (Dec 2025)">
      <SheetTable
        headers={[t("calc.category"), t("calc.description"), t("calc.recommendation")]}
        rows={[
          ["0a", t("calc.birads_0a"), t("calc.birads_0a_rec")],
          ["0b", t("calc.birads_0b"), t("calc.birads_0b_rec")],
          ["1", t("calc.birads_1"), t("calc.birads_1_rec")],
          ["2", t("calc.birads_2"), t("calc.birads_2_rec")],
          ["3", t("calc.birads_3"), t("calc.birads_3_rec")],
          ["4A", t("calc.birads_4a"), t("calc.birads_4a_rec")],
          ["4B", t("calc.birads_4b"), t("calc.birads_4b_rec")],
          ["4C", t("calc.birads_4c"), t("calc.birads_4c_rec")],
          ["5", t("calc.birads_5"), t("calc.birads_5_rec")],
          ["6", t("calc.birads_6"), t("calc.birads_6_rec")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.birads_v2025_changes")}</p>
      <SheetTable
        headers={[t("calc.birads_topic"), t("calc.birads_change")]}
        rows={[
          [t("calc.birads_ch_cat0"), t("calc.birads_ch_cat0_d")],
          [t("calc.birads_ch_cem"), t("calc.birads_ch_cem_d")],
          [t("calc.birads_ch_density"), t("calc.birads_ch_density_d")],
          [t("calc.birads_ch_lexicon"), t("calc.birads_ch_lexicon_d")],
          [t("calc.birads_ch_ln"), t("calc.birads_ch_ln_d")],
        ]}
      />
    </CheatSheet>
  );
}

function BtsNodulesSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.bts_title")} source="British Thoracic Society (Callister et al., Thorax 2015)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.solid_nodules")}</p>
      <SheetTable
        headers={[t("calc.size"), t("calc.recommendation")]}
        rows={[
          ["< 5 mm / < 80 mm³", t("calc.bts_solid_tiny")],
          ["5–6 mm / 80–300 mm³", t("calc.bts_solid_small")],
          ["6–8 mm / 300–500 mm³", t("calc.bts_solid_medium")],
          ["> 8 mm / > 500 mm³", t("calc.bts_solid_large")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.subsolid_nodules")}</p>
      <SheetTable
        headers={[t("calc.type"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          ["GGN", "< 5 mm", t("calc.bts_ggn_tiny")],
          ["GGN", "≥ 5 mm", t("calc.bts_ggn_large")],
          [t("calc.part_solid"), t("calc.any_size"), t("calc.bts_partsol")],
        ]}
      />
    </CheatSheet>
  );
}

function OvarianIncidentalSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.ovarian_title")} source="ACR Incidental Findings Committee (Patel et al., JACR 2020)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.premenopausal")}</p>
      <SheetTable
        headers={[t("calc.finding"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          [t("calc.simple_cyst"), "< 5 cm", t("calc.ovarian_pre_simple_small")],
          [t("calc.simple_cyst"), "5–7 cm", t("calc.ovarian_pre_simple_med")],
          [t("calc.simple_cyst"), "> 7 cm", t("calc.ovarian_pre_simple_large")],
          [t("calc.hemorrhagic_cyst"), "< 5 cm", t("calc.ovarian_pre_hem_small")],
          [t("calc.hemorrhagic_cyst"), "≥ 5 cm", t("calc.ovarian_pre_hem_large")],
          [t("calc.complex_lesion"), t("calc.any_size"), t("calc.ovarian_complex")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.postmenopausal")}</p>
      <SheetTable
        headers={[t("calc.finding"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          [t("calc.simple_cyst"), "< 3 cm", t("calc.ovarian_post_simple_small")],
          [t("calc.simple_cyst"), "3–7 cm", t("calc.ovarian_post_simple_med")],
          [t("calc.simple_cyst"), "> 7 cm", t("calc.ovarian_post_simple_large")],
          [t("calc.complex_lesion"), t("calc.any_size"), t("calc.ovarian_complex")],
        ]}
      />
    </CheatSheet>
  );
}

function GallbladderPolypSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.gb_polyp_title")} source="Wiles et al., Radiology 2017 / Joint ESG-ESGAR Guideline 2022">
      <SheetTable
        headers={[t("calc.size"), t("calc.risk_factors"), t("calc.recommendation")]}
        rows={[
          ["< 5 mm", t("calc.none"), t("calc.gb_tiny")],
          ["5–9 mm", t("calc.no"), t("calc.gb_small_low")],
          ["5–9 mm", t("calc.yes"), t("calc.gb_small_high")],
          ["≥ 10 mm", t("calc.any"), t("calc.gb_large")],
          [t("calc.gb_growth"), t("calc.any"), t("calc.gb_growth_rec")],
        ]}
      />
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
        {t("calc.gb_risk_note")}
      </p>
    </CheatSheet>
  );
}

function AorticAneurysmSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.aorta_title")} source="ACC/AHA 2022 (Isselbacher et al.) / ESC 2024 / SVS 2018">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.aorta_thresholds")}</p>
      <SheetTable
        headers={[t("calc.location"), t("calc.diameter_surgical"), t("calc.special")]}
        rows={[
          [t("calc.aorta_root"), "> 5.5 cm", "Marfan > 5.0 cm; Loeys-Dietz 4.0–4.5 cm"],
          [t("calc.asc_aorta"), "> 5.5 cm", "BAV > 5.0–5.5 cm"],
          [t("calc.aortic_arch"), "> 5.5 cm", "—"],
          [t("calc.desc_thoracic"), "> 5.5–6.0 cm", "TEVAR > 5.5 cm"],
          [t("calc.infrarenal_aaa"), "> 5.5 cm (H) / > 5.0 cm (M)", "EVAR > 5.5 cm"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.aorta_followup")}</p>
      <SheetTable
        headers={[t("calc.diameter"), t("calc.imaging_interval")]}
        rows={[
          ["< 4.0 cm (AAA)", t("calc.aorta_fu_small")],
          ["4.0–4.9 cm", t("calc.aorta_fu_med")],
          ["5.0–5.4 cm", t("calc.aorta_fu_large")],
          [t("calc.aorta_growth_fast"), t("calc.aorta_fu_fast")],
        ]}
      />
    </CheatSheet>
  );
}

function SpineNomenclatureSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.spine_nomen_title")} source="Combined Task Forces of NASS, ASSR, ASNR (Fardon et al., Spine J 2014)">
      <SheetTable
        headers={[t("calc.term"), t("calc.definition")]}
        rows={[
          [t("calc.spine_normal"), t("calc.spine_normal_def")],
          [t("calc.spine_bulge"), t("calc.spine_bulge_def")],
          [t("calc.spine_protrusion"), t("calc.spine_protrusion_def")],
          [t("calc.spine_extrusion"), t("calc.spine_extrusion_def")],
          [t("calc.spine_sequestration"), t("calc.spine_sequestration_def")],
          [t("calc.spine_migration"), t("calc.spine_migration_def")],
        ]}
      />
      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
        {t("calc.spine_nomen_note")}
      </p>
    </CheatSheet>
  );
}

function ForaminalStenosisSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.foraminal_title")} source="Lee et al., AJNR 1988 / Wildermuth et al., Radiology 1998">
      <SheetTable
        headers={[t("calc.grade"), t("calc.description"), t("calc.foraminal_fat")]}
        rows={[
          ["0", t("calc.foraminal_g0"), t("calc.foraminal_g0_fat")],
          ["1", t("calc.foraminal_g1"), t("calc.foraminal_g1_fat")],
          ["2", t("calc.foraminal_g2"), t("calc.foraminal_g2_fat")],
          ["3", t("calc.foraminal_g3"), t("calc.foraminal_g3_fat")],
        ]}
      />
    </CheatSheet>
  );
}

function CanalStenosisSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.canal_title")} source="Schizas et al., Spine 2010">
      <SheetTable
        headers={[t("calc.grade"), t("calc.description"), t("calc.csf_rootlets")]}
        rows={[
          ["A (A1–A4)", t("calc.canal_a"), t("calc.canal_a_csf")],
          ["B", t("calc.canal_b"), t("calc.canal_b_csf")],
          ["C", t("calc.canal_c"), t("calc.canal_c_csf")],
          ["D", t("calc.canal_d"), t("calc.canal_d_csf")],
        ]}
      />
    </CheatSheet>
  );
}

function ShoulderCoronal() {
  return (
    <svg viewBox="0 0 320 260" className="w-full max-w-[320px] mx-auto">
      {/* Acromion */}
      <path d="M90,52 Q100,42 160,40 Q180,40 190,48" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      {/* Clavicle hint */}
      <path d="M90,52 L50,58" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      {/* Humeral head */}
      <ellipse cx="185" cy="115" rx="52" ry="55" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Humeral shaft */}
      <path d="M145,160 L135,240 M225,160 L215,240" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
      <path d="M135,240 Q175,248 215,240" stroke="#94a3b8" strokeWidth="2" fill="none" />
      {/* Greater tuberosity bump */}
      <path d="M225,80 Q240,95 237,120" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      {/* Glenoid */}
      <path d="M120,72 Q112,115 120,158" fill="none" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
      {/* Scapula body hint */}
      <path d="M120,158 Q100,175 85,210 M120,72 Q105,55 90,52" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
      {/* Labrum sup */}
      <ellipse cx="118" cy="72" rx="6" ry="5" fill="#a78bfa" stroke="#7c3aed" strokeWidth="1.5" />
      {/* Labrum inf */}
      <ellipse cx="118" cy="158" rx="6" ry="5" fill="#a78bfa" stroke="#7c3aed" strokeWidth="1.5" />
      {/* Supraspinatus tendon */}
      <path d="M100,58 Q140,50 175,58 Q200,62 228,78" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
      {/* Infraspinatus tendon */}
      <path d="M105,165 Q130,175 170,165 Q210,148 235,120" fill="none" stroke="#06b6d4" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* Subscapularis tendon (anterior, coming "toward viewer" on coronal) */}
      <path d="M118,90 Q130,88 148,80 Q162,74 170,70" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" strokeDasharray="6,3" />
      {/* Teres minor */}
      <path d="M110,178 Q145,185 180,172 Q215,155 237,132" fill="none" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      {/* Biceps tendon (long head) */}
      <path d="M118,72 Q140,65 160,70 Q168,78 170,95 L170,200" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="4,2" opacity="0.8" />
      {/* Labels */}
      <g className="text-[9px] fill-gray-600 dark:fill-gray-300" style={{ fontSize: "9px" }}>
        {/* Supraspinatus label */}
        <line x1="150" y1="52" x2="150" y2="28" stroke="#f97316" strokeWidth="0.8" />
        <rect x="100" y="16" width="100" height="14" rx="3" fill="#f97316" opacity="0.15" />
        <text x="150" y="26" textAnchor="middle" fill="#f97316" fontWeight="600">Supraspinatus</text>
        {/* Infraspinatus label */}
        <line x1="240" y1="130" x2="270" y2="140" stroke="#06b6d4" strokeWidth="0.8" />
        <text x="272" y="144" fill="#06b6d4" fontWeight="600" style={{ fontSize: "8.5px" }}>Infraspinatus</text>
        {/* Subscapularis label */}
        <line x1="135" y1="84" x2="42" y2="84" stroke="#22c55e" strokeWidth="0.8" />
        <text x="40" y="82" textAnchor="end" fill="#22c55e" fontWeight="600" style={{ fontSize: "8.5px" }}>Subscapularis</text>
        <text x="40" y="92" textAnchor="end" fill="#22c55e" style={{ fontSize: "7.5px" }}>(anterior)</text>
        {/* Teres minor label */}
        <line x1="245" y1="150" x2="270" y2="162" stroke="#ec4899" strokeWidth="0.8" />
        <text x="272" y="166" fill="#ec4899" fontWeight="600" style={{ fontSize: "8.5px" }}>Teres minor</text>
        {/* Labrum label */}
        <line x1="112" y1="72" x2="45" y2="62" stroke="#7c3aed" strokeWidth="0.8" />
        <text x="43" y="60" textAnchor="end" fill="#7c3aed" fontWeight="600" style={{ fontSize: "8.5px" }}>Labrum</text>
        {/* Biceps label */}
        <line x1="170" y1="190" x2="215" y2="200" stroke="#eab308" strokeWidth="0.8" />
        <text x="217" y="204" fill="#eab308" style={{ fontSize: "8px" }}>Biceps (LH)</text>
        {/* Acromion label */}
        <text x="130" y="38" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Acromion</text>
        {/* Greater tuberosity */}
        <text x="258" y="94" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "7.5px" }}>GT</text>
      </g>
      {/* Coronal T2 FS label */}
      <text x="160" y="254" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8.5px", fontStyle: "italic" }}>Coronal T2 FS</text>
    </svg>
  );
}

function KneeSagittal() {
  return (
    <svg viewBox="0 0 280 300" className="w-full max-w-[280px] mx-auto">
      {/* Femur shaft */}
      <path d="M105,0 L100,70 M165,0 L170,70" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
      {/* Femoral condyle */}
      <path d="M100,70 Q95,90 90,110 Q85,140 100,165 Q120,190 140,192 Q160,192 175,180 Q192,165 195,140 Q195,110 185,90 Q178,75 170,70" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Tibial plateau */}
      <path d="M65,200 L210,200 L210,208 Q200,205 140,205 Q80,205 65,208 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Tibial eminence */}
      <path d="M125,200 L133,192 L140,200" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Tibia shaft */}
      <path d="M85,208 L80,295 M185,208 L190,295" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
      {/* Patella */}
      <ellipse cx="78" cy="130" rx="14" ry="22" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" className="dark:fill-gray-700 dark:stroke-gray-500" transform="rotate(-10,78,130)" />
      {/* Medial meniscus (triangular wedge) */}
      <path d="M150,200 L180,200 L168,188 Z" fill="#f97316" opacity="0.35" stroke="#f97316" strokeWidth="1.5" />
      {/* Lateral meniscus */}
      <path d="M120,200 L90,200 L102,188 Z" fill="#f97316" opacity="0.35" stroke="#f97316" strokeWidth="1.5" />
      {/* ACL */}
      <path d="M115,195 Q125,165 160,155 Q165,148 162,140" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* PCL */}
      <path d="M155,200 Q148,175 120,160 Q112,152 110,142" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* MCL (medial side — right in sagittal) */}
      <path d="M200,130 L205,200 L205,235" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* Patellar tendon */}
      <path d="M82,150 Q95,175 110,198" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="4,2" opacity="0.7" />
      {/* Quadriceps tendon */}
      <path d="M82,110 L105,40" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="4,2" opacity="0.7" />
      {/* Labels */}
      <g style={{ fontSize: "9px" }}>
        {/* ACL label */}
        <line x1="148" y1="152" x2="195" y2="128" stroke="#ef4444" strokeWidth="0.8" />
        <rect x="195" y="120" width="34" height="14" rx="3" fill="#ef4444" opacity="0.15" />
        <text x="212" y="130" textAnchor="middle" fill="#ef4444" fontWeight="600" style={{ fontSize: "9px" }}>ACL</text>
        {/* PCL label */}
        <line x1="118" y1="148" x2="38" y2="135" stroke="#3b82f6" strokeWidth="0.8" />
        <rect x="15" y="127" width="33" height="14" rx="3" fill="#3b82f6" opacity="0.15" />
        <text x="31" y="137" textAnchor="middle" fill="#3b82f6" fontWeight="600" style={{ fontSize: "9px" }}>PCL</text>
        {/* Meniscus labels */}
        <line x1="172" y1="192" x2="225" y2="175" stroke="#f97316" strokeWidth="0.8" />
        <text x="227" y="172" fill="#f97316" fontWeight="600" style={{ fontSize: "8px" }}>MM</text>
        <line x1="98" y1="192" x2="42" y2="180" stroke="#f97316" strokeWidth="0.8" />
        <text x="40" y="178" textAnchor="end" fill="#f97316" fontWeight="600" style={{ fontSize: "8px" }}>ML</text>
        {/* MCL label */}
        <text x="212" y="218" fill="#22c55e" fontWeight="600" style={{ fontSize: "8px" }}>MCL</text>
        {/* Patella */}
        <text x="48" y="130" textAnchor="end" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Patella</text>
        {/* Femur/Tibia */}
        <text x="135" y="15" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Femur</text>
        <text x="135" y="290" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Tibia</text>
      </g>
      <text x="140" y="298" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8.5px", fontStyle: "italic" }}>Sagittal T2 FS</text>
    </svg>
  );
}

function AnkleAxial() {
  return (
    <svg viewBox="0 0 320 310" className="w-full max-w-[320px] mx-auto">
      {/* Tibia cross-section */}
      <ellipse cx="145" cy="130" rx="55" ry="45" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Fibula cross-section */}
      <ellipse cx="248" cy="145" rx="16" ry="18" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Tendons as colored dots with consistent size */}
      {/* Anterior: Tibialis anterior */}
      <circle cx="100" cy="85" r="6" fill="#22c55e" stroke="#16a34a" strokeWidth="1.5" />
      {/* Anterior: EHL */}
      <circle cx="125" cy="78" r="5" fill="#86efac" stroke="#16a34a" strokeWidth="1" />
      {/* Anterior: EDL */}
      <circle cx="150" cy="78" r="5" fill="#86efac" stroke="#16a34a" strokeWidth="1" />
      {/* Medial side (Tom Dick ANd Harry): */}
      {/* Tibialis posterior */}
      <circle cx="78" cy="138" r="6" fill="#f97316" stroke="#ea580c" strokeWidth="1.5" />
      {/* FDL */}
      <circle cx="72" cy="158" r="5.5" fill="#fb923c" stroke="#ea580c" strokeWidth="1.5" />
      {/* Posterior tibial artery + nerve */}
      <circle cx="70" cy="176" r="4" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
      <circle cx="78" cy="182" r="3" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
      {/* FHL */}
      <circle cx="88" cy="192" r="5.5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
      {/* Posterior: Achilles */}
      <ellipse cx="175" cy="210" rx="10" ry="14" fill="#a78bfa" stroke="#7c3aed" strokeWidth="2" />
      {/* Lateral: Peroneus brevis + longus */}
      <circle cx="260" cy="178" r="5.5" fill="#06b6d4" stroke="#0891b2" strokeWidth="1.5" />
      <circle cx="270" cy="162" r="5.5" fill="#22d3ee" stroke="#0891b2" strokeWidth="1.5" />
      {/* Leader lines and labels */}
      <g style={{ fontSize: "8.5px" }}>
        {/* Tib. Anterior */}
        <line x1="94" y1="82" x2="28" y2="60" stroke="#16a34a" strokeWidth="0.7" />
        <text x="26" y="58" textAnchor="end" fill="#22c55e" fontWeight="600">Tib. ant.</text>
        {/* Tib. Posterior */}
        <line x1="72" y1="136" x2="14" y2="118" stroke="#ea580c" strokeWidth="0.7" />
        <text x="12" y="116" textAnchor="end" fill="#f97316" fontWeight="600">Tib. post. (T)</text>
        {/* FDL */}
        <line x1="66" y1="156" x2="14" y2="140" stroke="#ea580c" strokeWidth="0.7" />
        <text x="12" y="138" textAnchor="end" fill="#fb923c" fontWeight="600">FDL (D)</text>
        {/* Art + Nerve */}
        <line x1="64" y1="176" x2="14" y2="168" stroke="#ef4444" strokeWidth="0.7" />
        <text x="12" y="166" textAnchor="end" fill="#ef4444" fontWeight="600">A. + N. (AN)</text>
        {/* FHL */}
        <line x1="82" y1="194" x2="22" y2="205" stroke="#d97706" strokeWidth="0.7" />
        <text x="20" y="208" textAnchor="end" fill="#f59e0b" fontWeight="600">FHL (H)</text>
        {/* Achilles */}
        <line x1="175" y1="225" x2="175" y2="248" stroke="#7c3aed" strokeWidth="0.7" />
        <text x="175" y="258" textAnchor="middle" fill="#a78bfa" fontWeight="600">Achilles</text>
        {/* Peroneus brevis */}
        <line x1="266" y1="178" x2="298" y2="192" stroke="#0891b2" strokeWidth="0.7" />
        <text x="300" y="196" fill="#06b6d4" fontWeight="600" style={{ fontSize: "8px" }}>Per. brevis</text>
        {/* Peroneus longus */}
        <line x1="276" y1="160" x2="298" y2="150" stroke="#0891b2" strokeWidth="0.7" />
        <text x="300" y="154" fill="#22d3ee" fontWeight="600" style={{ fontSize: "8px" }}>Per. longus</text>
        {/* Bone labels */}
        <text x="145" y="134" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "9px" }}>Tibia</text>
        <text x="248" y="149" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Fib.</text>
        {/* Orientation markers */}
        <text x="115" y="48" textAnchor="middle" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "8px" }}>ANT</text>
        <text x="155" y="276" textAnchor="middle" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "8px" }}>POST</text>
        <text x="4" y="170" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "8px" }}>MED</text>
        <text x="295" y="130" className="fill-gray-300 dark:fill-gray-600" style={{ fontSize: "8px" }}>LAT</text>
      </g>
      {/* Mnemonic bar */}
      <rect x="40" y="286" width="240" height="18" rx="4" fill="#f97316" opacity="0.1" />
      <text x="160" y="298" textAnchor="middle" fill="#f97316" style={{ fontSize: "8px", fontWeight: 600 }}>Tom · Dick · ANd · Harry</text>
    </svg>
  );
}

function AnkleLateral() {
  return (
    <svg viewBox="0 0 320 230" className="w-full max-w-[320px] mx-auto">
      {/* Fibula */}
      <path d="M195,0 L190,5 Q185,30 180,60 Q175,80 178,95" fill="none" stroke="#94a3b8" strokeWidth="3" />
      <ellipse cx="178" cy="100" rx="14" ry="18" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Talus */}
      <path d="M100,105 Q130,85 175,90 Q200,95 215,110 Q220,130 200,140 Q160,150 120,145 Q95,135 100,105" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Calcaneus */}
      <path d="M60,145 Q50,155 50,170 Q55,195 90,200 Q140,205 170,195 Q185,185 185,165 Q180,150 160,148 Q120,145 60,145" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" className="dark:fill-gray-700 dark:stroke-gray-500" />
      {/* Navicular hint */}
      <ellipse cx="90" cy="118" rx="18" ry="12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3,2" />
      {/* ATFL */}
      <path d="M178,108 Q155,108 130,105" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* CFL */}
      <path d="M178,112 Q168,135 155,160 Q148,172 140,180" fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* PTFL */}
      <path d="M182,115 Q200,125 210,130" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
      {/* Labels */}
      <g style={{ fontSize: "9px" }}>
        {/* ATFL */}
        <line x1="150" y1="105" x2="130" y2="78" stroke="#ef4444" strokeWidth="0.7" />
        <rect x="90" y="68" width="52" height="14" rx="3" fill="#ef4444" opacity="0.12" />
        <text x="116" y="78" textAnchor="middle" fill="#ef4444" fontWeight="700">ATFL</text>
        {/* CFL */}
        <line x1="152" y1="165" x2="185" y2="182" stroke="#3b82f6" strokeWidth="0.7" />
        <rect x="186" y="174" width="38" height="14" rx="3" fill="#3b82f6" opacity="0.12" />
        <text x="205" y="184" textAnchor="middle" fill="#3b82f6" fontWeight="700">CFL</text>
        {/* PTFL */}
        <line x1="210" y1="130" x2="240" y2="125" stroke="#22c55e" strokeWidth="0.7" />
        <rect x="240" y="117" width="48" height="14" rx="3" fill="#22c55e" opacity="0.12" />
        <text x="264" y="127" textAnchor="middle" fill="#22c55e" fontWeight="700">PTFL</text>
        {/* Bone labels */}
        <text x="195" y="15" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8px" }}>Fibula</text>
        <text x="150" y="125" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "9px" }}>Talus</text>
        <text x="115" y="180" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "9px" }}>Calcaneus</text>
      </g>
      <text x="160" y="222" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "8.5px", fontStyle: "italic" }}>Lateral view — Coronal T2 FS</text>
    </svg>
  );
}

function MRIShoulderSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.mri_shoulder_title")} source="Stoller DW, Magnetic Resonance Imaging in Orthopaedics & Sports Medicine, 3rd ed.">
      <ShoulderCoronal />
      <SheetTable
        headers={[t("calc.mri_shoulder_structure"), t("calc.mri_shoulder_insertion"), t("calc.mri_shoulder_best_seq")]}
        rows={[
          [t("calc.mri_shoulder_supra"), t("calc.mri_shoulder_supra_ins"), t("calc.mri_shoulder_supra_seq")],
          [t("calc.mri_shoulder_infra"), t("calc.mri_shoulder_infra_ins"), t("calc.mri_shoulder_infra_seq")],
          [t("calc.mri_shoulder_subsc"), t("calc.mri_shoulder_subsc_ins"), t("calc.mri_shoulder_subsc_seq")],
          [t("calc.mri_shoulder_tmin"), t("calc.mri_shoulder_tmin_ins"), t("calc.mri_shoulder_tmin_seq")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.mri_shoulder_labrum")}</p>
      <SheetTable
        headers={[t("calc.mri_shoulder_structure"), t("calc.mri_shoulder_best_seq")]}
        rows={[
          [t("calc.mri_shoulder_labrum_ant"), t("calc.mri_shoulder_labrum_seq")],
          [t("calc.mri_shoulder_labrum_post"), t("calc.mri_shoulder_labrum_seq")],
          [t("calc.mri_shoulder_labrum_sup"), t("calc.mri_shoulder_labrum_seq")],
        ]}
      />
    </CheatSheet>
  );
}

function MRIKneeSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.mri_knee_title")} source="Stoller DW; Helms CA, Fundamentals of Skeletal Radiology, 4th ed.">
      <KneeSagittal />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-1">{t("calc.mri_knee_tear_grades")}</p>
      <div className="text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
        <p>{t("calc.mri_knee_g1")}</p>
        <p>{t("calc.mri_knee_g2")}</p>
        <p>{t("calc.mri_knee_g3")}</p>
      </div>
      <SheetTable
        headers={[t("calc.mri_knee_lig"), t("calc.mri_knee_lig_seq")]}
        rows={[
          [t("calc.mri_knee_acl"), t("calc.mri_knee_acl_seq")],
          [t("calc.mri_knee_pcl"), t("calc.mri_knee_pcl_seq")],
          [t("calc.mri_knee_mcl"), t("calc.mri_knee_mcl_seq")],
          [t("calc.mri_knee_lcl"), t("calc.mri_knee_lcl_seq")],
        ]}
      />
      <p className="text-[10px] text-gray-500 italic mt-1">{t("calc.mri_knee_cartilage")}</p>
    </CheatSheet>
  );
}

function MRIAnkleSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.mri_ankle_title")} source="Rosenberg ZS et al., MRI of the Ankle and Foot; Stoller DW">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.mri_ankle_tendons")}</p>
      <AnkleAxial />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.mri_ankle_ligaments")}</p>
      <AnkleLateral />
      <p className="text-[10px] text-gray-500 italic mt-1">{t("calc.mri_ankle_mnemonic")}</p>
    </CheatSheet>
  );
}

function RotatorCuffSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.rc_title")} source="Ellman classification (Ellman, Clin Orthop 1990) / Snyder arthroscopic (Snyder et al., Arthroscopy 1991)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.rc_partial")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description"), t("calc.rc_thickness")]}
        rows={[
          ["I", t("calc.rc_p1"), "< 3 mm / < 25%"],
          ["II", t("calc.rc_p2"), "3–6 mm / 25–50%"],
          ["III", t("calc.rc_p3"), "> 6 mm / > 50%"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.rc_full")}</p>
      <SheetTable
        headers={[t("calc.size"), t("calc.rc_tear_size")]}
        rows={[
          [t("calc.rc_small"), "< 1 cm"],
          [t("calc.rc_medium"), "1–3 cm"],
          [t("calc.rc_large"), "3–5 cm"],
          [t("calc.rc_massive"), "> 5 cm"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.rc_retraction")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description")]}
        rows={[
          ["I (Patte)", t("calc.rc_patte_1")],
          ["II", t("calc.rc_patte_2")],
          ["III", t("calc.rc_patte_3")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.rc_fatty")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description")]}
        rows={[
          ["0 (Goutallier)", t("calc.rc_gout_0")],
          ["1", t("calc.rc_gout_1")],
          ["2", t("calc.rc_gout_2")],
          ["3", t("calc.rc_gout_3")],
          ["4", t("calc.rc_gout_4")],
        ]}
      />
    </CheatSheet>
  );
}

function BoneTumorSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.bone_tumor_title")} source="WHO Classification of Tumours of Soft Tissue and Bone, 5th ed. 2020 / Radiologyassistant.nl adapted">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.bone_tumor_age")}</p>
      <SheetTable
        headers={[t("calc.age_group"), t("calc.common_benign"), t("calc.common_malignant")]}
        rows={[
          ["0–10", t("calc.bone_010_ben"), t("calc.bone_010_mal")],
          ["10–30", t("calc.bone_1030_ben"), t("calc.bone_1030_mal")],
          ["30–40", t("calc.bone_3040_ben"), t("calc.bone_3040_mal")],
          ["> 40", t("calc.bone_40_ben"), t("calc.bone_40_mal")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.bone_tumor_location")}</p>
      <SheetTable
        headers={[t("calc.location"), t("calc.epiphysis"), t("calc.metaphysis"), t("calc.diaphysis")]}
        rows={[
          [t("calc.common_benign"), t("calc.bone_epi_ben"), t("calc.bone_meta_ben"), t("calc.bone_dia_ben")],
          [t("calc.common_malignant"), t("calc.bone_epi_mal"), t("calc.bone_meta_mal"), t("calc.bone_dia_mal")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.bone_tumor_matrix")}</p>
      <SheetTable
        headers={[t("calc.pattern"), t("calc.suggests")]}
        rows={[
          [t("calc.bone_matrix_chondroid"), t("calc.bone_matrix_chondroid_dx")],
          [t("calc.bone_matrix_osteoid"), t("calc.bone_matrix_osteoid_dx")],
          [t("calc.bone_matrix_gg"), t("calc.bone_matrix_gg_dx")],
          [t("calc.bone_periost_solid"), t("calc.bone_periost_solid_dx")],
          [t("calc.bone_periost_lamellated"), t("calc.bone_periost_lamellated_dx")],
          [t("calc.bone_periost_sunburst"), t("calc.bone_periost_sunburst_dx")],
        ]}
      />
    </CheatSheet>
  );
}

function VertebralFractureSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.vfx_title")} source="Genant et al., JBMR 1993 / AO Spine Classification (Vaccaro et al., Spine 2013)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.vfx_genant")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.height_loss"), t("calc.description")]}
        rows={[
          ["0", "< 20%", t("calc.vfx_g0")],
          ["1 (" + t("calc.mild") + ")", "20–25%", t("calc.vfx_g1")],
          ["2 (" + t("calc.moderate") + ")", "25–40%", t("calc.vfx_g2")],
          ["3 (" + t("calc.severe") + ")", "> 40%", t("calc.vfx_g3")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.vfx_ao")}</p>
      <SheetTable
        headers={[t("calc.type"), t("calc.description")]}
        rows={[
          ["A0", t("calc.vfx_a0")],
          ["A1", t("calc.vfx_a1")],
          ["A2", t("calc.vfx_a2")],
          ["A3", t("calc.vfx_a3")],
          ["A4", t("calc.vfx_a4")],
          ["B1", t("calc.vfx_b1")],
          ["B2", t("calc.vfx_b2")],
          ["B3", t("calc.vfx_b3")],
          ["C", t("calc.vfx_c")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Thorax: new sheets ── */

function ThyroidIncidentalSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.thyroid_incidental_title")} source="ACR White Paper (Hoang et al., JACR 2015)">
      <SheetTable
        headers={[t("calc.finding"), t("calc.size"), t("calc.recommendation")]}
        rows={[
          [t("calc.thyroid_inc_low"), "< 1 cm", t("calc.thyroid_inc_low_rec")],
          [t("calc.thyroid_inc_low"), "1–1.5 cm", t("calc.thyroid_inc_med_rec")],
          [t("calc.thyroid_inc_low"), "> 1.5 cm", t("calc.thyroid_inc_large_rec")],
          [t("calc.thyroid_inc_suspicious"), t("calc.any_size"), t("calc.thyroid_inc_suspicious_rec")],
          [t("calc.thyroid_inc_age"), "—", t("calc.thyroid_inc_age_rec")],
        ]}
      />
    </CheatSheet>
  );
}

function MediastinalLNSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.mediastinal_ln_title")} source="IASLC Lymph Node Map (Rusch et al., J Thorac Oncol 2009)">
      <SheetTable
        headers={[t("calc.station"), t("calc.location"), t("calc.description")]}
        rows={[
          ["1", t("calc.mln_1_loc"), t("calc.mln_1_desc")],
          ["2R / 2L", t("calc.mln_2_loc"), t("calc.mln_2_desc")],
          ["3A / 3P", t("calc.mln_3_loc"), t("calc.mln_3_desc")],
          ["4R / 4L", t("calc.mln_4_loc"), t("calc.mln_4_desc")],
          ["5", t("calc.mln_5_loc"), t("calc.mln_5_desc")],
          ["6", t("calc.mln_6_loc"), t("calc.mln_6_desc")],
          ["7", t("calc.mln_7_loc"), t("calc.mln_7_desc")],
          ["8", t("calc.mln_8_loc"), t("calc.mln_8_desc")],
          ["9", t("calc.mln_9_loc"), t("calc.mln_9_desc")],
          ["10–14", t("calc.mln_10_loc"), t("calc.mln_10_desc")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Breast: new sheets ── */

function BreastDensitySheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.breast_density_title")} source="ACR BI-RADS Atlas, 5th ed. (2013)">
      <SheetTable
        headers={[t("calc.category"), t("calc.description"), t("calc.sensitivity")]}
        rows={[
          ["A", t("calc.breast_density_a"), t("calc.breast_density_a_sens")],
          ["B", t("calc.breast_density_b"), t("calc.breast_density_b_sens")],
          ["C", t("calc.breast_density_c"), t("calc.breast_density_c_sens")],
          ["D", t("calc.breast_density_d"), t("calc.breast_density_d_sens")],
        ]}
      />
    </CheatSheet>
  );
}

function BreastScreeningSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.breast_screening_title")} source="ACR (2023) / ACS / NCCN / EUSOBI">
      <SheetTable
        headers={[t("calc.risk_level"), t("calc.criteria"), t("calc.recommendation")]}
        rows={[
          [t("calc.breast_avg_risk"), t("calc.breast_avg_criteria"), t("calc.breast_avg_rec")],
          [t("calc.breast_inter_risk"), t("calc.breast_inter_criteria"), t("calc.breast_inter_rec")],
          [t("calc.breast_high_risk"), t("calc.breast_high_criteria"), t("calc.breast_high_rec")],
        ]}
      />
    </CheatSheet>
  );
}

function BreastUSLexiconSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.breast_us_title")} source="ACR BI-RADS US Lexicon, 5th ed. (2013)">
      <SheetTable
        headers={[t("calc.feature"), t("calc.benign_features"), t("calc.suspicious_features")]}
        rows={[
          [t("calc.breast_us_shape"), t("calc.breast_us_shape_ben"), t("calc.breast_us_shape_sus")],
          [t("calc.breast_us_margin"), t("calc.breast_us_margin_ben"), t("calc.breast_us_margin_sus")],
          [t("calc.breast_us_orient"), t("calc.breast_us_orient_ben"), t("calc.breast_us_orient_sus")],
          [t("calc.breast_us_echo"), t("calc.breast_us_echo_ben"), t("calc.breast_us_echo_sus")],
          [t("calc.breast_us_post"), t("calc.breast_us_post_ben"), t("calc.breast_us_post_sus")],
        ]}
      />
    </CheatSheet>
  );
}

function BreastImplantSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.breast_implant_title")} source="ACR / FDA (2020) / NCCN Guidelines">
      <SheetTable
        headers={[t("calc.finding"), t("calc.description"), t("calc.recommendation")]}
        rows={[
          [t("calc.implant_intact"), t("calc.implant_intact_desc"), t("calc.implant_intact_rec")],
          [t("calc.implant_intracap"), t("calc.implant_intracap_desc"), t("calc.implant_intracap_rec")],
          [t("calc.implant_extracap"), t("calc.implant_extracap_desc"), t("calc.implant_extracap_rec")],
          [t("calc.implant_bialcl"), t("calc.implant_bialcl_desc"), t("calc.implant_bialcl_rec")],
          [t("calc.implant_contract"), t("calc.implant_contract_desc"), t("calc.implant_contract_rec")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Neuro: new sheets ── */

function FazekasSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.fazekas_title")} source="Fazekas et al., AJR 1987 / Modified Fazekas">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.fazekas_pvh")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description")]}
        rows={[
          ["0", t("calc.fazekas_pvh_0")],
          ["1", t("calc.fazekas_pvh_1")],
          ["2", t("calc.fazekas_pvh_2")],
          ["3", t("calc.fazekas_pvh_3")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.fazekas_dwmh")}</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description")]}
        rows={[
          ["0", t("calc.fazekas_dwmh_0")],
          ["1", t("calc.fazekas_dwmh_1")],
          ["2", t("calc.fazekas_dwmh_2")],
          ["3", t("calc.fazekas_dwmh_3")],
        ]}
      />
    </CheatSheet>
  );
}

function CerebralAneurysmSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.cerebral_aneurysm_title")} source="AHA/ASA (Thompson et al., Stroke 2015) / ISUIA (Lancet 2003)">
      <SheetTable
        headers={[t("calc.size"), t("calc.location"), t("calc.recommendation")]}
        rows={[
          ["< 3 mm", t("calc.aneurysm_any_loc"), t("calc.aneurysm_tiny_rec")],
          ["3–7 mm", t("calc.aneurysm_anterior"), t("calc.aneurysm_small_ant_rec")],
          ["3–7 mm", t("calc.aneurysm_posterior"), t("calc.aneurysm_small_post_rec")],
          ["7–12 mm", t("calc.aneurysm_any_loc"), t("calc.aneurysm_med_rec")],
          ["13–24 mm", t("calc.aneurysm_any_loc"), t("calc.aneurysm_large_rec")],
          ["≥ 25 mm", t("calc.aneurysm_any_loc"), t("calc.aneurysm_giant_rec")],
        ]}
      />
    </CheatSheet>
  );
}

function FisherSAHSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.fisher_title")} source="Modified Fisher (Frontera et al., Neurosurgery 2006)">
      <SheetTable
        headers={[t("calc.grade"), t("calc.description"), t("calc.vasospasm_risk")]}
        rows={[
          ["0", t("calc.fisher_0"), t("calc.fisher_0_risk")],
          ["1", t("calc.fisher_1"), t("calc.fisher_1_risk")],
          ["2", t("calc.fisher_2"), t("calc.fisher_2_risk")],
          ["3", t("calc.fisher_3"), t("calc.fisher_3_risk")],
          ["4", t("calc.fisher_4"), t("calc.fisher_4_risk")],
        ]}
      />
    </CheatSheet>
  );
}

function BrainTumorSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.brain_tumor_title")} source="WHO CNS Tumors, 5th ed. (2021)">
      <SheetTable
        headers={[t("calc.grade"), t("calc.description"), t("calc.examples")]}
        rows={[
          ["1", t("calc.who_cns_1"), t("calc.who_cns_1_ex")],
          ["2", t("calc.who_cns_2"), t("calc.who_cns_2_ex")],
          ["3", t("calc.who_cns_3"), t("calc.who_cns_3_ex")],
          ["4", t("calc.who_cns_4"), t("calc.who_cns_4_ex")],
        ]}
      />
    </CheatSheet>
  );
}

function VascularTerritoriesSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.vasc_territories_title")} source="Tatu et al., Neurology 1998">
      <SheetTable
        headers={[t("calc.artery"), t("calc.territory"), t("calc.key_structures")]}
        rows={[
          ["ACA", t("calc.vasc_aca"), t("calc.vasc_aca_struct")],
          ["MCA sup.", t("calc.vasc_mca_sup"), t("calc.vasc_mca_sup_struct")],
          ["MCA inf.", t("calc.vasc_mca_inf"), t("calc.vasc_mca_inf_struct")],
          ["MCA lenticulo.", t("calc.vasc_mca_lent"), t("calc.vasc_mca_lent_struct")],
          ["PCA", t("calc.vasc_pca"), t("calc.vasc_pca_struct")],
          ["PICA", t("calc.vasc_pica"), t("calc.vasc_pica_struct")],
          ["AICA", t("calc.vasc_aica"), t("calc.vasc_aica_struct")],
          ["SCA", t("calc.vasc_sca"), t("calc.vasc_sca_struct")],
          ["Basilar", t("calc.vasc_basilar"), t("calc.vasc_basilar_struct")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Vascular: new sheets ── */

function AorticDissectionSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.dissection_title")} source="Stanford (Daily et al., 1970) / DeBakey (1965) / ESC 2024">
      <SheetTable
        headers={[t("calc.classification"), t("calc.description"), t("calc.recommendation")]}
        rows={[
          ["Stanford A", t("calc.dissection_a"), t("calc.dissection_a_rec")],
          ["Stanford B", t("calc.dissection_b"), t("calc.dissection_b_rec")],
          ["DeBakey I", t("calc.dissection_db1"), "≈ Stanford A"],
          ["DeBakey II", t("calc.dissection_db2"), "≈ Stanford A"],
          ["DeBakey III", t("calc.dissection_db3"), "≈ Stanford B"],
        ]}
      />
    </CheatSheet>
  );
}

function WholeAortaCTASheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.whole_aorta_title")} source="ACC/AHA 2022 (Isselbacher et al.) / ESC 2024 / Rogers et al., JCCT 2016">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.aorta_normal_diameters")}</p>
      <SheetTable
        headers={[t("calc.segment"), t("calc.male_cm"), t("calc.female_cm"), t("calc.aneurysm_threshold")]}
        rows={[
          [t("calc.aorta_root_sov"), "3.4–3.7", "3.0–3.3", "> 4.5 cm"],
          [t("calc.stj"), "2.9–3.2", "2.6–2.9", "—"],
          [t("calc.mid_ascending"), "3.0–3.5", "2.7–3.2", "> 4.5 cm"],
          [t("calc.aortic_arch_seg"), "2.5–3.0", "2.3–2.7", "> 4.0 cm"],
          [t("calc.aortic_isthmus"), "2.0–2.5", "1.8–2.3", "—"],
          [t("calc.mid_descending"), "2.3–2.8", "2.1–2.5", "> 4.0 cm"],
          [t("calc.suprarenal_seg"), "2.0–2.5", "1.8–2.2", "> 3.5 cm"],
          [t("calc.infrarenal_seg"), "1.7–2.1", "1.5–1.8", "> 3.0 cm"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.aorta_measure_landmarks")}</p>
      <SheetTable
        headers={[t("calc.level"), t("calc.landmark")]}
        rows={[
          [t("calc.aorta_root_sov"), t("calc.lm_sov")],
          [t("calc.stj"), t("calc.lm_stj")],
          [t("calc.mid_ascending"), t("calc.lm_asc")],
          [t("calc.proximal_arch"), t("calc.lm_prox_arch")],
          [t("calc.mid_arch"), t("calc.lm_mid_arch")],
          [t("calc.aortic_isthmus"), t("calc.lm_isthmus")],
          [t("calc.mid_descending"), t("calc.lm_desc")],
          [t("calc.suprarenal_seg"), t("calc.lm_suprarenal")],
          [t("calc.infrarenal_seg"), t("calc.lm_infrarenal")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.arch_variants")}</p>
      <SheetTable
        headers={[t("calc.variant"), t("calc.prevalence"), t("calc.description")]}
        rows={[
          [t("calc.arch_normal"), "~70%", t("calc.arch_normal_desc")],
          [t("calc.arch_bovine"), "~20–27%", t("calc.arch_bovine_desc")],
          [t("calc.arch_aberrant_rsa"), "~1–2%", t("calc.arch_aberrant_rsa_desc")],
          [t("calc.arch_lva_from_arch"), "~5%", t("calc.arch_lva_from_arch_desc")],
          [t("calc.arch_right_sided"), "~0.1%", t("calc.arch_right_sided_desc")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.aorta_checklist")}</p>
      <SheetTable
        headers={[t("calc.segment"), t("calc.key_findings")]}
        rows={[
          [t("calc.root_ascending"), t("calc.check_root_asc")],
          [t("calc.arch_branches"), t("calc.check_arch")],
          [t("calc.desc_thoracic_seg"), t("calc.check_desc")],
          [t("calc.abdominal_visceral"), t("calc.check_abd")],
          [t("calc.iliac_seg"), t("calc.check_iliac")],
          [t("calc.wall_periaortic"), t("calc.check_wall")],
        ]}
      />
    </CheatSheet>
  );
}

function CarotidStenosisSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.carotid_title")} source="NASCET (NEJM 1991) / Grant et al., Radiology 2003 (consensus)">
      <SheetTable
        headers={[t("calc.stenosis_degree"), "PSV (cm/s)", "EDV (cm/s)", "ICA/CCA ratio"]}
        rows={[
          [t("calc.carotid_normal"), "< 125", "< 40", "< 2.0"],
          ["< 50%", "< 125", "< 40", "< 2.0"],
          ["50–69%", "125–230", "40–100", "2.0–4.0"],
          ["≥ 70%", "> 230", "> 100", "> 4.0"],
          [t("calc.carotid_near_occl"), t("calc.carotid_variable"), t("calc.carotid_variable"), "—"],
          [t("calc.carotid_occluded"), t("calc.carotid_no_flow"), "—", "—"],
        ]}
      />
    </CheatSheet>
  );
}

function PadClassSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.pad_title")} source="Rutherford (JVS 1997) / Fontaine (1954)">
      <SheetTable
        headers={["Fontaine", "Rutherford", t("calc.description")]}
        rows={[
          ["I", "0", t("calc.pad_0")],
          ["IIa", "1", t("calc.pad_1")],
          ["IIb", "2–3", t("calc.pad_2")],
          ["III", "4", t("calc.pad_4")],
          ["IV", "5", t("calc.pad_5")],
          ["IV", "6", t("calc.pad_6")],
        ]}
      />
    </CheatSheet>
  );
}

function DVTPESheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.dvt_pe_title")} source="ESC 2019 / AHA 2011 / CTPA reporting standards">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.pe_location")}</p>
      <SheetTable
        headers={[t("calc.location"), t("calc.description"), t("calc.severity")]}
        rows={[
          [t("calc.pe_saddle"), t("calc.pe_saddle_desc"), t("calc.pe_saddle_sev")],
          [t("calc.pe_central"), t("calc.pe_central_desc"), t("calc.pe_central_sev")],
          [t("calc.pe_lobar"), t("calc.pe_lobar_desc"), t("calc.pe_lobar_sev")],
          [t("calc.pe_segmental"), t("calc.pe_segmental_desc"), t("calc.pe_segmental_sev")],
          [t("calc.pe_subseg"), t("calc.pe_subseg_desc"), t("calc.pe_subseg_sev")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.rv_strain")}</p>
      <SheetTable
        headers={[t("calc.finding"), t("calc.description")]}
        rows={[
          ["RV/LV > 1.0", t("calc.rv_ratio")],
          [t("calc.septal_bow"), t("calc.septal_bow_desc")],
          [t("calc.reflux_ivc"), t("calc.reflux_ivc_desc")],
        ]}
      />
    </CheatSheet>
  );
}

function DiverticulitisSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.divert_title")} source="Modified Hinchey classification (Wasvary et al., Am Surg 1999); WSES guidelines 2020">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Modified Hinchey</p>
      <SheetTable
        headers={[t("calc.grade"), t("calc.description")]}
        rows={[
          [t("calc.divert_0"), t("calc.divert_0_desc")],
          [t("calc.divert_1a"), t("calc.divert_1a_desc")],
          [t("calc.divert_1b"), t("calc.divert_1b_desc")],
          [t("calc.divert_2"), t("calc.divert_2_desc")],
          [t("calc.divert_3"), t("calc.divert_3_desc")],
          [t("calc.divert_4"), t("calc.divert_4_desc")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-2">{t("calc.divert_ct_title")}</p>
      <SheetTable
        headers={[t("calc.finding"), t("calc.description")]}
        rows={[
          [t("calc.divert_uncomp"), t("calc.divert_uncomp_desc")],
          [t("calc.divert_abscess"), t("calc.divert_abscess_desc")],
          [t("calc.divert_perf"), t("calc.divert_perf_desc")],
          [t("calc.divert_fistula"), t("calc.divert_fistula_desc")],
          [t("calc.divert_obst"), t("calc.divert_obst_desc")],
        ]}
      />
    </CheatSheet>
  );
}

/* ═══════════════════════════════════════════
   12. Nodule Doubling Time
   ═══════════════════════════════════════════ */

function NoduleDTCalc() {
  const t = useT();
  const [mode, setMode] = useState<"diameter" | "volume">("diameter");
  const [date1, setDate1] = useState("");
  const [date2, setDate2] = useState("");
  const [val1, setVal1] = useState("");
  const [val2, setVal2] = useState("");

  function compute(): { vdt: number; text: string; color: "green" | "blue" | "yellow" | "red" } | null {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    if (!date1 || !date2 || isNaN(v1) || isNaN(v2) || v1 <= 0 || v2 <= 0) return null;

    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const deltaDays = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
    if (deltaDays <= 0) return null;

    const vol1 = mode === "volume" ? v1 : (Math.PI / 6) * Math.pow(v1, 3);
    const vol2 = mode === "volume" ? v2 : (Math.PI / 6) * Math.pow(v2, 3);

    if (vol2 <= vol1) {
      return { vdt: -1, text: t("calc.dt_stable_shrinking"), color: "green" };
    }

    const vdt = (deltaDays * Math.LN2) / Math.log(vol2 / vol1);

    let color: "green" | "blue" | "yellow" | "red" = "green";
    let text = "";
    if (vdt < 100) { color = "red"; text = t("calc.dt_fast"); }
    else if (vdt < 400) { color = "yellow"; text = t("calc.dt_intermediate"); }
    else if (vdt < 600) { color = "blue"; text = t("calc.dt_slow"); }
    else { color = "green"; text = t("calc.dt_very_slow"); }

    return { vdt: Math.round(vdt), text, color };
  }

  const result = compute();
  const pctGrowth = (() => {
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    if (isNaN(v1) || isNaN(v2) || v1 <= 0) return null;
    const vol1 = mode === "volume" ? v1 : (Math.PI / 6) * Math.pow(v1, 3);
    const vol2 = mode === "volume" ? v2 : (Math.PI / 6) * Math.pow(v2, 3);
    return ((vol2 - vol1) / vol1 * 100).toFixed(1);
  })();

  const copyText = result && result.vdt > 0
    ? `VDT = ${result.vdt} ${t("calc.days")}. ${result.text}. ${t("calc.dt_vol_growth")}: ${pctGrowth}%`
    : result ? result.text : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Schwartz formula (Radiology 2014)</p>
        <ResetButton onClick={() => { setMode("diameter"); setDate1(""); setDate2(""); setVal1(""); setVal2(""); }} />
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.dt_mode")}</Label>
        <OptionPills
          options={[
            { key: "diameter", label: t("calc.dt_diameter") },
            { key: "volume", label: t("calc.dt_volume") },
          ]}
          value={mode}
          onChange={(v) => { setMode(v as "diameter" | "volume"); setVal1(""); setVal2(""); }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400">{t("calc.dt_date1")}</Label>
          <Input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} className="h-8 text-xs mt-0.5" />
        </div>
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400">{t("calc.dt_date2")}</Label>
          <Input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} className="h-8 text-xs mt-0.5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumInput
          label={mode === "diameter" ? `${t("calc.dt_size1")} (mm)` : `${t("calc.dt_vol1")} (mm³)`}
          value={val1}
          onChange={setVal1}
          min={0}
          step={mode === "diameter" ? 0.1 : 1}
        />
        <NumInput
          label={mode === "diameter" ? `${t("calc.dt_size2")} (mm)` : `${t("calc.dt_vol2")} (mm³)`}
          value={val2}
          onChange={setVal2}
          min={0}
          step={mode === "diameter" ? 0.1 : 1}
        />
      </div>

      {result && result.vdt > 0 && (
        <ResultBox
          label={t("calc.dt_vdt")}
          value={`${result.vdt} ${t("calc.days")}`}
          interpretation={`${result.text}. ${t("calc.dt_vol_growth")}: ${pctGrowth}%`}
          color={result.color}
        />
      )}
      {result && result.vdt <= 0 && (
        <ResultBox label={t("calc.dt_vdt")} value={result.text} color={result.color} />
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   T1/T2 Mapping & ECV Calculator
   ═══════════════════════════════════════════ */

function T1T2MappingCalc() {
  const [nativeT1, setNativeT1] = useState("");
  const [nativeT2, setNativeT2] = useState("");
  const [postT1Myo, setPostT1Myo] = useState("");
  const [preT1Blood, setPreT1Blood] = useState("");
  const [postT1Blood, setPostT1Blood] = useState("");
  const [hematocrit, setHematocrit] = useState("");
  const [fieldStrength, setFieldStrength] = useState<"1.5" | "3">("1.5");

  const nT1 = parseFloat(nativeT1);
  const nT2 = parseFloat(nativeT2);
  const pT1M = parseFloat(postT1Myo);
  const preT1B = parseFloat(preT1Blood);
  const pT1B = parseFloat(postT1Blood);
  const hct = parseFloat(hematocrit);

  const canCalcECV =
    nativeT1 !== "" && !isNaN(nT1) && nT1 > 0 &&
    postT1Myo !== "" && !isNaN(pT1M) && pT1M > 0 &&
    preT1Blood !== "" && !isNaN(preT1B) && preT1B > 0 &&
    postT1Blood !== "" && !isNaN(pT1B) && pT1B > 0 &&
    hematocrit !== "" && !isNaN(hct) && hct > 0 && hct < 100;

  const ecv = canCalcECV
    ? (1 - hct / 100) * ((1 / pT1M - 1 / nT1) / (1 / pT1B - 1 / preT1B)) * 100
    : null;

  function interpretT1() {
    if (nativeT1 === "" || isNaN(nT1)) return null;
    const normalLow = fieldStrength === "1.5" ? 950 : 1050;
    const normalHigh = fieldStrength === "1.5" ? 1050 : 1200;
    if (nT1 < normalLow) return { text: "T1 reducido: considerar sobrecarga de hierro, Fabry, grasa/lipoma", color: "blue" as const };
    if (nT1 > normalHigh) return { text: "T1 elevado: considerar fibrosis, amiloidosis, edema", color: "red" as const };
    return { text: "T1 nativo dentro de rango normal", color: "green" as const };
  }

  function interpretT2() {
    if (nativeT2 === "" || isNaN(nT2)) return null;
    const normalLow = fieldStrength === "1.5" ? 45 : 40;
    const normalHigh = fieldStrength === "1.5" ? 55 : 50;
    if (nT2 > normalHigh) return { text: "T2 elevado: edema agudo / miocarditis", color: "red" as const };
    if (nT2 < normalLow) return { text: "T2 reducido: considerar sobrecarga de hierro", color: "blue" as const };
    return { text: "T2 nativo dentro de rango normal", color: "green" as const };
  }

  function interpretECV() {
    if (ecv === null) return null;
    if (ecv >= 25 && ecv <= 30) return { text: "ECV normal (25-30%)", color: "green" as const };
    if (ecv > 30 && ecv <= 40) return { text: "ECV elevado: fibrosis intersticial, edema", color: "yellow" as const };
    if (ecv > 40) return { text: "ECV muy elevado: amiloidosis, fibrosis severa", color: "red" as const };
    if (ecv < 25) return { text: "ECV bajo: considerar artefacto o variante", color: "blue" as const };
    return null;
  }

  const t1Result = interpretT1();
  const t2Result = interpretT2();
  const ecvResult = interpretECV();

  const copyText = [
    nativeT1 ? `T1 nativo: ${nativeT1} ms` : "",
    nativeT2 ? `T2 nativo: ${nativeT2} ms` : "",
    ecv !== null ? `ECV: ${ecv.toFixed(1)}%` : "",
    t1Result ? t1Result.text : "",
    t2Result ? t2Result.text : "",
    ecvResult ? ecvResult.text : "",
  ].filter(Boolean).join(". ");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">SCMR Consensus (Messroghli et al., JCMR 2017)</p>
        <ResetButton onClick={() => { setNativeT1(""); setNativeT2(""); setPostT1Myo(""); setPreT1Blood(""); setPostT1Blood(""); setHematocrit(""); }} />
      </div>

      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">Campo magnético</Label>
        <OptionPills
          options={[
            { key: "1.5", label: "1.5T" },
            { key: "3", label: "3T" },
          ]}
          value={fieldStrength}
          onChange={(v) => setFieldStrength(v as "1.5" | "3")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumInput label="T1 nativo miocardio" value={nativeT1} onChange={setNativeT1} unit="ms" min={0} step={1} />
        <NumInput label="T2 nativo miocardio" value={nativeT2} onChange={setNativeT2} unit="ms" min={0} step={1} />
      </div>

      <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">Para cálculo de ECV:</p>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="T1 post-contraste mio" value={postT1Myo} onChange={setPostT1Myo} unit="ms" min={0} step={1} />
        <NumInput label="T1 pre-contraste sangre" value={preT1Blood} onChange={setPreT1Blood} unit="ms" min={0} step={1} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="T1 post-contraste sangre" value={postT1Blood} onChange={setPostT1Blood} unit="ms" min={0} step={1} />
        <NumInput label="Hematocrito" value={hematocrit} onChange={setHematocrit} unit="%" min={0} max={100} step={1} />
      </div>

      {t1Result && (
        <ResultBox label="T1 nativo" value={`${nativeT1} ms`} interpretation={t1Result.text} color={t1Result.color} />
      )}
      {t2Result && (
        <ResultBox label="T2 nativo" value={`${nativeT2} ms`} interpretation={t2Result.text} color={t2Result.color} />
      )}
      {ecv !== null && ecvResult && (
        <ResultBox label="ECV" value={`${ecv.toFixed(1)}%`} interpretation={ecvResult.text} color={ecvResult.color} />
      )}

      {/* Reference table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-md p-2 mt-2">
        <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Valores de referencia ({fieldStrength}T)</p>
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-0.5 px-1 font-semibold text-gray-600 dark:text-gray-300">Parámetro</th>
              <th className="text-left py-0.5 px-1 font-semibold text-gray-600 dark:text-gray-300">Normal</th>
              <th className="text-left py-0.5 px-1 font-semibold text-gray-600 dark:text-gray-300">Patológico</th>
            </tr>
          </thead>
          <tbody className="text-gray-600 dark:text-gray-400">
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <td className="py-0.5 px-1">T1 nativo</td>
              <td className="py-0.5 px-1">{fieldStrength === "1.5" ? "950–1050 ms" : "1050–1200 ms"}</td>
              <td className="py-0.5 px-1">↑ fibrosis, amiloide, edema; ↓ hierro, Fabry</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <td className="py-0.5 px-1">T2 nativo</td>
              <td className="py-0.5 px-1">{fieldStrength === "1.5" ? "45–55 ms" : "40–50 ms"}</td>
              <td className="py-0.5 px-1">↑ edema agudo, miocarditis</td>
            </tr>
            <tr className="border-b border-gray-100 dark:border-gray-800/50">
              <td className="py-0.5 px-1">ECV</td>
              <td className="py-0.5 px-1">25–30%</td>
              <td className="py-0.5 px-1">↑ fibrosis, amiloidosis, edema</td>
            </tr>
          </tbody>
        </table>
      </div>

      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CHEAT SHEETS — additional
   ═══════════════════════════════════════════ */

function ResistiveIndexSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.ri_title")} source="AIUM Practice Parameters; Bude & Rubin, Radiology 1999">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.ri_formula")}</p>
      <p className="text-[10px] text-gray-500 mb-2">RI = (PSV − EDV) / PSV</p>
      <SheetTable
        headers={[t("calc.ri_artery"), t("calc.ri_normal_ri"), t("calc.ri_notes")]}
        rows={[
          [t("calc.ri_renal"), "0.50–0.70", t("calc.ri_renal_note")],
          [t("calc.ri_hepatic"), "0.55–0.80", t("calc.ri_hepatic_note")],
          [t("calc.ri_splenic"), "0.50–0.70", t("calc.ri_splenic_note")],
          [t("calc.ri_ica"), "0.50–0.70", t("calc.ri_ica_note")],
          [t("calc.ri_ophthalmic"), "0.65–0.75", t("calc.ri_ophthalmic_note")],
          [t("calc.ri_uterine"), "0.80–0.90", t("calc.ri_uterine_note")],
          [t("calc.ri_umbilical"), "0.55–0.70", t("calc.ri_umbilical_note")],
          [t("calc.ri_mca"), "0.70–0.80", t("calc.ri_mca_note")],
        ]}
      />
    </CheatSheet>
  );
}

function TransplantUSSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.tx_us_title")} source="ACR Appropriateness Criteria 2022; AIUM Practice Parameters">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.tx_hepatic")}</p>
      <SheetTable
        headers={[t("calc.tx_parameter"), t("calc.tx_normal"), t("calc.tx_abnormal")]}
        rows={[
          [t("calc.tx_ha_ri"), "0.50–0.80", t("calc.tx_ha_ri_abn")],
          [t("calc.tx_ha_psv"), "30–100 cm/s", t("calc.tx_ha_psv_abn")],
          [t("calc.tx_ha_at"), "< 0.08 s", t("calc.tx_ha_at_abn")],
          [t("calc.tx_pv_vel"), "20–40 cm/s", t("calc.tx_pv_vel_abn")],
          [t("calc.tx_pv_flow"), t("calc.tx_pv_hepatopetal"), t("calc.tx_pv_flow_abn")],
          [t("calc.tx_hv_wave"), t("calc.tx_hv_triphasic"), t("calc.tx_hv_wave_abn")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.tx_renal")}</p>
      <SheetTable
        headers={[t("calc.tx_parameter"), t("calc.tx_normal"), t("calc.tx_abnormal")]}
        rows={[
          [t("calc.tx_ra_ri"), "0.50–0.80", t("calc.tx_ra_ri_abn")],
          [t("calc.tx_ra_psv"), "< 200 cm/s", t("calc.tx_ra_psv_abn")],
          [t("calc.tx_seg_ri"), "0.50–0.70", t("calc.tx_seg_ri_abn")],
          [t("calc.tx_rv_flow"), t("calc.tx_rv_continuous"), t("calc.tx_rv_flow_abn")],
          [t("calc.tx_at"), "< 0.07 s", t("calc.tx_at_abn")],
        ]}
      />
    </CheatSheet>
  );
}

/* ══════════════════════════════════════════════
   CAD-RADS 2.0 Quick Reference
   Source: Cury RC et al., Radiology 2022;305(3):209-221
   ══════════════════════════════════════════════ */

function CadRadsSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.cadrads_title")} source="Cury RC et al., CAD-RADS 2.0. Radiology 2022;305(3):209-221">
      <SheetTable
        headers={[t("calc.cadrads_grade"), t("calc.cadrads_stenosis"), t("calc.cadrads_interpretation"), t("calc.cadrads_management")]}
        rows={[
          ["0", "0%", t("calc.cadrads_none"), t("calc.cadrads_no_further")],
          ["1", "1–24%", t("calc.cadrads_minimal"), t("calc.cadrads_preventive")],
          ["2", "25–49%", t("calc.cadrads_mild"), t("calc.cadrads_preventive")],
          ["3", "50–69%", t("calc.cadrads_moderate"), t("calc.cadrads_functional")],
          ["4A", "70–99%", t("calc.cadrads_severe_focal"), t("calc.cadrads_ica")],
          ["4B", "LM ≥50% / 3v ≥70%", t("calc.cadrads_severe_lm"), t("calc.cadrads_ica")],
          ["5", "100%", t("calc.cadrads_occlusion"), t("calc.cadrads_ica")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.cadrads_modifiers")}</p>
      <SheetTable
        headers={[t("calc.cadrads_modifier"), t("calc.cadrads_meaning")]}
        rows={[
          ["/S", t("calc.cadrads_stent")],
          ["/G", t("calc.cadrads_graft")],
          ["/V", t("calc.cadrads_vuln")],
          ["/I", t("calc.cadrads_nondiag")],
          ["/E", t("calc.cadrads_exception")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.cadrads_plaque")}</p>
      <SheetTable
        headers={[t("calc.cadrads_grade"), t("calc.cadrads_plaque_desc")]}
        rows={[
          ["P1", t("calc.cadrads_p1")],
          ["P2", t("calc.cadrads_p2")],
          ["P3", t("calc.cadrads_p3")],
          ["P4", t("calc.cadrads_p4")],
        ]}
      />
    </CheatSheet>
  );
}

/* ══════════════════════════════════════════════
   Cardiac MRI — Myocardial Enhancement Patterns
   Sources:
   - Mahrholdt H et al., Eur Heart J 2005;26(15):1461-1474
   - Cerqueira MD et al., Circulation 2002;105:539-542 (AHA 17-segment)
   - Defined by Defined DJ Kim et al., Circulation 1999;100:1992-2002
   ══════════════════════════════════════════════ */

function BullseyeDiagram() {
  const lad = "#ef4444";
  const rca = "#3b82f6";
  const lcx = "#22c55e";
  const cx = 100;
  const cy = 100;

  const segmentArc = (rInner: number, rOuter: number, startAngle: number, endAngle: number, fill: string, label: string) => {
    const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
    const x1o = cx + rOuter * Math.cos(toRad(startAngle));
    const y1o = cy + rOuter * Math.sin(toRad(startAngle));
    const x2o = cx + rOuter * Math.cos(toRad(endAngle));
    const y2o = cy + rOuter * Math.sin(toRad(endAngle));
    const x1i = cx + rInner * Math.cos(toRad(endAngle));
    const y1i = cy + rInner * Math.sin(toRad(endAngle));
    const x2i = cx + rInner * Math.cos(toRad(startAngle));
    const y2i = cy + rInner * Math.sin(toRad(startAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const midAngle = (startAngle + endAngle) / 2;
    const rMid = (rInner + rOuter) / 2;
    const tx = cx + rMid * Math.cos(toRad(midAngle));
    const ty = cy + rMid * Math.sin(toRad(midAngle));
    return (
      <g key={label}>
        <path
          d={`M ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${rInner} ${rInner} 0 ${large} 0 ${x2i} ${y2i} Z`}
          fill={fill} fillOpacity={0.25} stroke={fill} strokeWidth={1.5}
        />
        <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight="bold" fill={fill}>{label}</text>
      </g>
    );
  };

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[220px] mx-auto">
      {/* Basal ring (1-6): 60° each, starting at 120° (anterior=top) */}
      {segmentArc(62, 90, 120, 180, lad, "1")}
      {segmentArc(62, 90, 60, 120, lad, "2")}
      {segmentArc(62, 90, 0, 60, rca, "3")}
      {segmentArc(62, 90, 300, 360, rca, "4")}
      {segmentArc(62, 90, 240, 300, lcx, "5")}
      {segmentArc(62, 90, 180, 240, lcx, "6")}
      {/* Mid ring (7-12) */}
      {segmentArc(36, 62, 120, 180, lad, "7")}
      {segmentArc(36, 62, 60, 120, lad, "8")}
      {segmentArc(36, 62, 0, 60, rca, "9")}
      {segmentArc(36, 62, 300, 360, rca, "10")}
      {segmentArc(36, 62, 240, 300, lcx, "11")}
      {segmentArc(36, 62, 180, 240, lcx, "12")}
      {/* Apical ring (13-16): 90° each */}
      {segmentArc(14, 36, 135, 225, lad, "13")}
      {segmentArc(14, 36, 45, 135, lad, "14")}
      {segmentArc(14, 36, 315, 405, rca, "15")}
      {segmentArc(14, 36, 225, 315, lcx, "16")}
      {/* Apex (17) */}
      <circle cx={cx} cy={cy} r={14} fill={lad} fillOpacity={0.25} stroke={lad} strokeWidth={1.5} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={7} fontWeight="bold" fill={lad}>17</text>
      {/* Legend */}
      <rect x={5} y={175} width={10} height={10} rx={2} fill={lad} fillOpacity={0.4} stroke={lad} strokeWidth={1} />
      <text x={18} y={183} fontSize={8} fill={lad} fontWeight="bold">LAD</text>
      <rect x={50} y={175} width={10} height={10} rx={2} fill={rca} fillOpacity={0.4} stroke={rca} strokeWidth={1} />
      <text x={63} y={183} fontSize={8} fill={rca} fontWeight="bold">RCA</text>
      <rect x={95} y={175} width={10} height={10} rx={2} fill={lcx} fillOpacity={0.4} stroke={lcx} strokeWidth={1} />
      <text x={108} y={183} fontSize={8} fill={lcx} fontWeight="bold">LCx</text>
    </svg>
  );
}

function LGEPatternDiagrams() {
  const t = useT();
  const wallColor = "#d1d5db";
  const lgeColor = "#fbbf24";
  const myoColor = "#9ca3af";

  const CrossSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 80 80" className="w-16 h-16">
        {/* Epicardium */}
        <circle cx={40} cy={40} r={36} fill="none" stroke={wallColor} strokeWidth={1} />
        {/* Myocardium */}
        <circle cx={40} cy={40} r={36} fill={myoColor} fillOpacity={0.15} />
        {/* Endocardium / cavity */}
        <circle cx={40} cy={40} r={22} fill="white" stroke={wallColor} strokeWidth={1} />
        {children}
      </svg>
      <span className="text-[9px] text-center font-medium text-gray-600 dark:text-gray-400 leading-tight">{label}</span>
    </div>
  );

  return (
    <div className="mt-2">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2">{t("calc.cmr_ischemic_vs_non")}</p>
      <div className="grid grid-cols-4 gap-2">
        <CrossSection label={t("calc.cmr_subendo")}>
          {/* Subendocardial LGE — inner ring partial */}
          <path d="M 40 18 A 22 22 0 0 1 62 40 L 56.5 40 A 16.5 16.5 0 0 0 40 23.5 Z" fill={lgeColor} fillOpacity={0.7} />
        </CrossSection>
        <CrossSection label={t("calc.cmr_transmural")}>
          {/* Transmural LGE — full wall segment */}
          <path d="M 40 4 A 36 36 0 0 1 76 40 L 62 40 A 22 22 0 0 0 40 18 Z" fill={lgeColor} fillOpacity={0.7} />
        </CrossSection>
        <CrossSection label={t("calc.cmr_midwall")}>
          {/* Mid-wall LGE — ring in middle of wall at septum */}
          <path d="M 24 20 A 30 30 0 0 0 24 60" fill="none" stroke={lgeColor} strokeWidth={5} strokeOpacity={0.7} />
        </CrossSection>
        <CrossSection label={t("calc.cmr_epicardial")}>
          {/* Epicardial LGE — outer ring partial */}
          <path d="M 40 4 A 36 36 0 0 1 76 40 L 71 40 A 31 31 0 0 0 40 9 Z" fill={lgeColor} fillOpacity={0.7} />
        </CrossSection>
      </div>
    </div>
  );
}

function CardiacMRISheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.cmr_title")} source="Mahrholdt H et al., Eur Heart J 2005; Cerqueira MD et al., Circulation 2002; Kim RJ et al., Circulation 1999">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.cmr_lge_patterns")}</p>
      <SheetTable
        headers={[t("calc.cmr_pattern"), t("calc.cmr_location"), t("calc.cmr_diseases")]}
        rows={[
          [t("calc.cmr_ischemic"), t("calc.cmr_ischemic_loc"), t("calc.cmr_ischemic_dis")],
          [t("calc.cmr_midwall"), t("calc.cmr_midwall_loc"), t("calc.cmr_midwall_dis")],
          [t("calc.cmr_epicardial"), t("calc.cmr_epicardial_loc"), t("calc.cmr_epicardial_dis")],
          [t("calc.cmr_diffuse_sub"), t("calc.cmr_diffuse_sub_loc"), t("calc.cmr_diffuse_sub_dis")],
          [t("calc.cmr_rvi"), t("calc.cmr_rvi_loc"), t("calc.cmr_rvi_dis")],
          [t("calc.cmr_patchy"), t("calc.cmr_patchy_loc"), t("calc.cmr_patchy_dis")],
          [t("calc.cmr_inferolat"), t("calc.cmr_inferolat_loc"), t("calc.cmr_inferolat_dis")],
        ]}
      />
      <LGEPatternDiagrams />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.cmr_coronary_territories")}</p>
      <BullseyeDiagram />
      <SheetTable
        headers={[t("calc.cmr_territory"), t("calc.cmr_segments")]}
        rows={[
          ["LAD", t("calc.cmr_lad_segments")],
          ["RCA", t("calc.cmr_rca_segments")],
          ["LCx", t("calc.cmr_lcx_segments")],
        ]}
      />
    </CheatSheet>
  );
}

function CTPerfusionDiagrams() {
  const patterns = [
    { label: "Normal", cbf: "N", cbv: "N", mtt: "N", tmax: "N", color: "#22c55e", bgColor: "#dcfce7" },
    { label: "Core (infarto)", cbf: "↓↓", cbv: "↓↓", mtt: "↑↑", tmax: "↑↑", color: "#ef4444", bgColor: "#fee2e2" },
    { label: "Penumbra", cbf: "↓", cbv: "N/↑", mtt: "↑", tmax: "↑", color: "#eab308", bgColor: "#fef9c3" },
    { label: "Perfusión de lujo", cbf: "↑", cbv: "↑", mtt: "N/↓", tmax: "N", color: "#3b82f6", bgColor: "#dbeafe" },
  ];
  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-2">Patrones visuales CTP</p>
      <div className="grid grid-cols-2 gap-2">
        {patterns.map((p) => (
          <div key={p.label} className="border border-gray-200 dark:border-gray-700 rounded-md p-1.5">
            <p className="text-[10px] font-semibold text-center mb-1" style={{ color: p.color }}>{p.label}</p>
            <svg viewBox="0 0 100 50" className="w-full h-10">
              {/* CBF box */}
              <rect x="2" y="5" width="22" height="40" rx="3" fill={p.bgColor} stroke={p.color} strokeWidth="1.5" />
              <text x="13" y="22" textAnchor="middle" fontSize="7" fill={p.color} fontWeight="bold">CBF</text>
              <text x="13" y="36" textAnchor="middle" fontSize="9" fill={p.color} fontWeight="bold">{p.cbf}</text>
              {/* CBV box */}
              <rect x="27" y="5" width="22" height="40" rx="3" fill={p.bgColor} stroke={p.color} strokeWidth="1.5" />
              <text x="38" y="22" textAnchor="middle" fontSize="7" fill={p.color} fontWeight="bold">CBV</text>
              <text x="38" y="36" textAnchor="middle" fontSize="9" fill={p.color} fontWeight="bold">{p.cbv}</text>
              {/* MTT box */}
              <rect x="52" y="5" width="22" height="40" rx="3" fill={p.bgColor} stroke={p.color} strokeWidth="1.5" />
              <text x="63" y="22" textAnchor="middle" fontSize="7" fill={p.color} fontWeight="bold">MTT</text>
              <text x="63" y="36" textAnchor="middle" fontSize="9" fill={p.color} fontWeight="bold">{p.mtt}</text>
              {/* Tmax box */}
              <rect x="77" y="5" width="22" height="40" rx="3" fill={p.bgColor} stroke={p.color} strokeWidth="1.5" />
              <text x="88" y="22" textAnchor="middle" fontSize="6.5" fill={p.color} fontWeight="bold">Tmax</text>
              <text x="88" y="36" textAnchor="middle" fontSize="9" fill={p.color} fontWeight="bold">{p.tmax}</text>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

function CTPerfusionSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.ctp_title")} source="AHA/ASA 2019 guidelines; Wintermark et al., AJNR 2005; RAPID CTP thresholds (validated in DEFUSE 3, DAWN trials)">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.ctp_params")}</p>
      <SheetTable
        headers={[t("calc.ctp_param"), t("calc.ctp_meaning"), t("calc.ctp_normal")]}
        rows={[
          ["CBF", t("calc.ctp_cbf_desc"), "50–60 mL/100g/min"],
          ["CBV", t("calc.ctp_cbv_desc"), "4–5 mL/100g"],
          ["MTT", t("calc.ctp_mtt_desc"), "4–6 s"],
          ["TTP", t("calc.ctp_ttp_desc"), t("calc.ctp_ttp_normal")],
          ["Tmax", t("calc.ctp_tmax_desc"), "< 6 s"],
        ]}
      />
      <CTPerfusionDiagrams />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.ctp_ischemia")}</p>
      <SheetTable
        headers={[t("calc.ctp_zone"), t("calc.ctp_criteria"), t("calc.ctp_interpretation")]}
        rows={[
          [t("calc.ctp_core"), "CBF < 30% / rCBV ↓↓", t("calc.ctp_core_desc")],
          [t("calc.ctp_penumbra"), "Tmax > 6 s, CBV " + t("calc.ctp_preserved"), t("calc.ctp_penumbra_desc")],
          [t("calc.ctp_oligemia"), "Tmax 4–6 s", t("calc.ctp_oligemia_desc")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.ctp_selection")}</p>
      <SheetTable
        headers={[t("calc.ctp_trial"), t("calc.ctp_criteria")]}
        rows={[
          ["DAWN (6–24h)", t("calc.ctp_dawn")],
          ["DEFUSE 3 (6–16h)", t("calc.ctp_defuse")],
        ]}
      />
    </CheatSheet>
  );
}

/* ═══════════════════════════════════════════
   CHEAT SHEETS — Pediatric Radiology
   ═══════════════════════════════════════════ */

function PediatricCXRSheet() {
  return (
    <CheatSheet title="Radiografía de tórax pediátrica" source="ACR Appropriateness Criteria Pediatric; Caffey&apos;s Pediatric Diagnostic Imaging">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Timo normal vs patología</p>
      <SheetTable
        headers={["Hallazgo", "Timo normal", "Patológico"]}
        rows={[
          ["Forma", "Vela de barco / signo de ola", "Masa mediastínica irregular"],
          ["Bordes", "Lisos, ondulados con costillas", "Lobulados, irregulares"],
          ["Signo de la vela", "Presente < 2 años (normal)", "Ausente en neonato = DiGeorge"],
          ["Compresión", "No comprime vía aérea", "Desplaza/comprime tráquea"],
          ["Evolución", "Involuciona con estrés/edad", "Crece progresivamente"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Patrones comunes por edad</p>
      <SheetTable
        headers={["Patología", "Edad típica", "Patrón radiológico clave"]}
        rows={[
          ["SDR (EMH)", "Pretérmino", "Vidrio esmerilado difuso, broncograma aéreo, bajo volumen"],
          ["TTN", "RN término (cesárea)", "Líquido cisural, cardiomegalia leve, hiperinflación, resolución 24-48h"],
          ["SAM", "RN postérmino", "Hiperinsuflación, atelectasias parcheadas, neumotórax"],
          ["Bronquiolitis", "< 2 años (VRS)", "Hiperinsuflación, engrosamiento peribronquial, atelectasias subsegmentarias"],
          ["Neumonía redonda", "< 8 años", "Opacidad redonda (simula masa), típica en lóbulos inferiores"],
          ["Cuerpo extraño", "1-3 años", "Atrapamiento aéreo unilateral (espiración), enfisema obstructivo"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Abordaje sistemático Rx tórax pediátrica</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>1. <span className="font-semibold">Técnica:</span> Rotación (clavículas simétricas), inspiración (6 costillas ant.), penetración</p>
        <p>2. <span className="font-semibold">Vía aérea:</span> Tráquea centrada, calibre subglótico, bronquios principales</p>
        <p>3. <span className="font-semibold">Timo/mediastino:</span> Normal hasta 2-3 años, silueta cardíaca</p>
        <p>4. <span className="font-semibold">Pulmones:</span> Volumen, simetría, patrón (intersticial vs alveolar)</p>
        <p>5. <span className="font-semibold">Corazón:</span> ICT &lt; 0.60 en neonatos, &lt; 0.55 en &gt; 1 año</p>
        <p>6. <span className="font-semibold">Huesos/partes blandas:</span> Fracturas, enfisema subcutáneo, catéteres</p>
      </div>
    </CheatSheet>
  );
}

function PediatricHydronephrosisSheet() {
  return (
    <CheatSheet title="Hidronefrosis pediátrica" source="SFU Grading System; UTD Classification (Nguyen et al., J Pediatr Urol 2014); ACR Appropriateness Criteria 2020">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Clasificación SFU (Society of Fetal Urology)</p>
      <SheetTable
        headers={["Grado", "Hallazgo ecográfico", "Significado clínico"]}
        rows={[
          ["Grado 1", "Pelvis renal ligeramente dilatada", "Leve, generalmente fisiológica"],
          ["Grado 2", "Pelvis dilatada + algunos cálices visualizados", "Leve-moderada"],
          ["Grado 3", "Pelvis + todos los cálices dilatados, parénquima normal", "Moderada, requiere seguimiento"],
          ["Grado 4", "Dilatación severa + adelgazamiento del parénquima", "Severa, probable obstrucción"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">DAP (Diámetro anteroposterior pelvis renal)</p>
      <SheetTable
        headers={["Edad/Trimestre", "Normal", "Leve", "Moderada", "Severa"]}
        rows={[
          ["2do trimestre", "< 4 mm", "4-7 mm", "7-10 mm", "> 10 mm"],
          ["3er trimestre", "< 7 mm", "7-10 mm", "10-15 mm", "> 15 mm"],
          ["Neonato (< 48h)", "< 10 mm", "10-15 mm", "15-20 mm", "> 20 mm"],
          ["Lactante (> 48h)", "< 10 mm", "10-15 mm", "15-20 mm", "> 20 mm"],
          ["Niño > 1 año", "< 10 mm", "10-15 mm", "15-20 mm", "> 20 mm"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Clasificación UTD (Urinary Tract Dilation)</p>
      <SheetTable
        headers={["Categoría", "Criterios", "Seguimiento"]}
        rows={[
          ["UTD P1 (prenatal bajo riesgo)", "DAP 4-7mm (2T) o 7-10mm (3T), sin dilatación calicial", "Eco postnatal > 48h"],
          ["UTD P2 (prenatal riesgo intermedio)", "DAP 7-10mm (2T) o 10-15mm (3T), dilatación calicial", "Eco postnatal + considerar CUMS"],
          ["UTD P3 (prenatal alto riesgo)", "DAP >10mm (2T) o >15mm (3T), parénquima anormal, uréter dilatado, vejiga anormal", "Eco urgente + CUMS + renograma"],
          ["UTD A1 (postnatal bajo riesgo)", "DAP 10-15mm, cálices centrales dilatados, parénquima normal", "Eco seriada, resolución esperada"],
          ["UTD A2-3 (postnatal alto riesgo)", "DAP >15mm, dilatación periférica, parénquima adelgazado, uréter visible", "CUMS + renograma MAG3 + urología"],
        ]}
      />
    </CheatSheet>
  );
}

function PediatricTumorsSheet() {
  return (
    <CheatSheet title="Tumores pediátricos por edad" source="ESPR Guidelines">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Tumores comunes por grupo etario</p>
      <SheetTable
        headers={["Edad", "Tumor", "Localización", "Características imagen"]}
        rows={[
          ["< 1 año", "Neuroblastoma", "Suprarrenal/paraespinal", "Masa heterogénea, calcificaciones (90%), cruza línea media, envuelve vasos"],
          ["< 1 año", "Teratoma sacrococcígeo", "Sacro/pelvis", "Masa mixta sólido-quística, grasa, calcificaciones"],
          ["1-5 años", "Tumor de Wilms (nefroblastoma)", "Renal", "Masa intrarrenal bien definida, pseudocápsula, trombo vena renal/VCI (4-10%)"],
          ["1-5 años", "Hepatoblastoma", "Hígado", "Masa sólida heterogénea, calcificaciones, AFP elevada"],
          ["1-5 años", "Rabdomiosarcoma", "Cabeza/cuello, GU", "Masa sólida invasiva, realce heterogéneo"],
          ["5-10 años", "Linfoma (Hodgkin/NH)", "Mediastino/abdomen", "Adenopatías, masa mediastínica anterior, patrón sandwich"],
          ["5-10 años", "Tumores fosa posterior", "Cerebelo/4to ventrículo", "Meduloblastoma (vermis), astrocitoma (hemisferio), ependimoma (4V)"],
          ["> 10 años", "Osteosarcoma", "Metáfisis huesos largos", "Masa ósea agresiva, reacción perióstica sunburst, triángulo de Codman"],
          ["> 10 años", "Sarcoma de Ewing", "Diáfisis/huesos planos", "Lesión permeativa, reacción perióstica en capas de cebolla, masa partes blandas"],
          ["> 10 años", "Tumores células germinales", "Mediastino/gónadas/pineal", "Masa heterogénea, calcificaciones, marcadores séricos"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Claves diagnósticas</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>• <span className="font-semibold">Neuroblastoma vs Wilms:</span> NB cruza línea media, envuelve vasos, calcifica; Wilms desplaza vasos, intrarrenal, pseudocápsula</p>
        <p>• <span className="font-semibold">Meduloblastoma vs Ependimoma:</span> Medulo en vermis, restricción difusión; Ependimoma sale por forámenes de Luschka</p>
        <p>• <span className="font-semibold">Osteosarcoma vs Ewing:</span> Osteo en metáfisis, produce osteoide; Ewing en diáfisis, reacción perióstica laminar</p>
      </div>
    </CheatSheet>
  );
}

function CryptorchidismSheet() {
  return (
    <CheatSheet title="Criptorquidia - Ecografía" source="AUA/EAU Guidelines on Cryptorchidism; ESPR Guidelines Pediatric Scrotal US">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Clasificación por localización</p>
      <SheetTable
        headers={["Localización", "Frecuencia", "Hallazgo ecográfico"]}
        rows={[
          ["Canalicular (canal inguinal)", "72%", "Testículo entre anillo inguinal interno y externo"],
          ["Inguinal superficial (ectópico)", "20%", "Superficial al anillo externo, fuera del trayecto normal"],
          ["Abdominal (intraperitoneal)", "8%", "No visible por eco; requiere RM o laparoscopia"],
          ["Prescrotal (alto escrotal)", "Variable", "En la parte superior del escroto, testículo retráctil"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Protocolo ecográfico</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>1. <span className="font-semibold">Transductor:</span> Lineal alta frecuencia (7-15 MHz)</p>
        <p>2. <span className="font-semibold">Exploración:</span> Desde anillo inguinal interno → canal inguinal → escroto</p>
        <p>3. <span className="font-semibold">Medir:</span> Longitud, ancho, grosor del testículo; comparar con contralateral</p>
        <p>4. <span className="font-semibold">Doppler color:</span> Evaluar vascularización (flujo reducido en testículo atrófico)</p>
        <p>5. <span className="font-semibold">Maniobra de Valsalva:</span> Diferenciar retráctil vs verdadero no descendido</p>
      </div>
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Criterios de medición</p>
      <SheetTable
        headers={["Parámetro", "Normal", "Sospecha atrofia"]}
        rows={[
          ["Volumen testicular (fórmula elipsoide)", "Longitud × Ancho × AP × 0.52", "< 50% del contralateral"],
          ["Longitud neonato", "10-15 mm", "< 8 mm"],
          ["Longitud 1-10 años (prepuberal)", "15-20 mm", "< 10 mm o asimetría marcada"],
          ["Ecogenicidad", "Homogénea, hipoecogénica respecto a partes blandas", "Heterogénea, hiperecogénica"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Cuándo sospechar malignidad</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>• Testículo no descendido en adulto (riesgo ×5-10 de tumor testicular)</p>
        <p>• Masa focal sólida hipervascular dentro del testículo</p>
        <p>• Microcalcificaciones (≥5 por campo): asociadas a neoplasia intratubular (TIN)</p>
        <p>• Aumento de tamaño unilateral sin antecedente inflamatorio</p>
        <p>• Seminoma es el tipo más frecuente en testículos no descendidos</p>
      </div>
    </CheatSheet>
  );
}

function TransfontanellarUSSheet() {
  return (
    <CheatSheet title="Ecografía transfontanelar" source="Papile et al., J Pediatr 1978; de Vries PVL Grading; AIUM Practice Parameter Neurosonography 2020">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Anatomía normal - Referencias</p>
      <SheetTable
        headers={["Estructura", "Plano coronal", "Plano sagital"]}
        rows={[
          ["Cuerpo calloso", "Línea ecogénica entre hemisferios", "Estructura curvilínea superior al 3er ventrículo"],
          ["Ventrículos laterales", "Cavidades anecoicas bilaterales simétricas", "Cuerpo, asta frontal y occipital"],
          ["Plexo coroideo", "Ecogénico dentro de ventrículos laterales", "Recorre el piso del ventrículo"],
          ["Surco caudotalámico", "Entre núcleo caudado y tálamo", "Ubicación de la matriz germinal"],
          ["Cisterna magna", "No se ve bien", "Espacio anecoico posterior al cerebelo (< 10 mm)"],
          ["Tálamos", "Estructuras ecogénicas mediales", "Rodean el 3er ventrículo"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Hemorragia de la matriz germinal - Clasificación de Papile</p>
      <SheetTable
        headers={["Grado", "Hallazgo", "Pronóstico"]}
        rows={[
          ["Grado I", "Hemorragia subependimaria (matriz germinal aislada)", "Excelente, resolución espontánea"],
          ["Grado II", "Hemorragia intraventricular SIN dilatación (< 50% ventrículo)", "Bueno, baja morbilidad"],
          ["Grado III", "Hemorragia intraventricular CON dilatación ventricular (> 50%)", "Reservado, hidrocefalia 50-80%"],
          ["Grado IV", "Hemorragia intraparenquimatosa (infarto hemorrágico periventricular)", "Malo, secuelas motoras/cognitivas severas"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Leucomalacia periventricular (LPV) - Clasificación de De Vries</p>
      <SheetTable
        headers={["Grado", "Eco fase aguda", "Eco fase crónica", "Pronóstico"]}
        rows={[
          ["Grado I", "Hiperecogenicidad periventricular transitoria (< 7 días)", "Normal", "Bueno"],
          ["Grado II", "Hiperecogenicidad periventricular persistente (> 7 días)", "Quistes periventriculares pequeños frontoparietal", "Variable, diplejía espástica posible"],
          ["Grado III", "Hiperecogenicidad periventricular extensa", "Quistes periventriculares extensos (fronto-parieto-occipital)", "Malo, cuadriplejía espástica"],
          ["Grado IV", "Hiperecogenicidad sustancia blanca difusa incluyendo subcortical", "Quistes extensos subcorticales + porencefalia", "Muy malo, discapacidad severa"],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">Mediciones de referencia</p>
      <div className="text-[10px] text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
        <p>• <span className="font-semibold">Índice ventricular (Levene):</span> Distancia entre hoz y pared lateral del ventrículo. Normal &lt; 13 mm en RN a término</p>
        <p>• <span className="font-semibold">Ancho del asta frontal:</span> Normal &lt; 3 mm en neonatos</p>
        <p>• <span className="font-semibold">Ratio ventrículo/hemisferio:</span> Normal &lt; 0.35</p>
        <p>• <span className="font-semibold">3er ventrículo:</span> Normal &lt; 3 mm en neonato a término</p>
      </div>
    </CheatSheet>
  );
}

/* ══════════════════════════════════════════════
   Anatomy Quick References
   ══════════════════════════════════════════════ */

/* ── Thigh axial MRI diagram (mid-thigh, based on Radiopaedia/Netter) ── */
function ThighAxial() {
  return (
    <svg viewBox="0 0 520 540" className="w-full max-w-[480px] mx-auto">
      {/* ── Skin & subcutaneous fat ── */}
      <ellipse cx="260" cy="255" rx="195" ry="210" fill="#fdf4e8" stroke="#c9a87c" strokeWidth="2" className="dark:fill-[#2a2420] dark:stroke-[#7a6550]" />
      <ellipse cx="260" cy="255" rx="183" ry="198" fill="#fef6ee" stroke="none" className="dark:fill-[#252018]" />

      {/* ── Fascia lata ── */}
      <ellipse cx="260" cy="255" rx="175" ry="190" fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" className="dark:stroke-gray-600" />

      {/* ── FEMUR (slightly posterior of center) ── */}
      <circle cx="260" cy="240" r="26" fill="#d4d8e0" stroke="#5a6270" strokeWidth="3" className="dark:fill-gray-600 dark:stroke-gray-400" />
      <circle cx="260" cy="240" r="11" fill="#b8bcc6" stroke="#7a8090" strokeWidth="1.2" className="dark:fill-gray-500 dark:stroke-gray-400" />
      <text x="260" y="244" textAnchor="middle" className="fill-gray-500 dark:fill-gray-300" style={{ fontSize: "8px" }} fontWeight="700">Fémur</text>

      {/* ── ANTERIOR COMPARTMENT ── */}
      {/* Recto femoral — oval, most superficial, centered anterior to femur */}
      <path d="M228,100 Q244,82 276,82 Q296,82 312,100 Q318,118 312,132 Q296,146 276,146 Q248,146 232,136 Q222,122 228,100 Z"
        fill="#93c5fd" stroke="#2563eb" strokeWidth="1.5" opacity="0.75" className="dark:fill-blue-800/50 dark:stroke-blue-400" />
      <text x="270" y="118" textAnchor="middle" fill="#1d4ed8" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-blue-300">Recto femoral</text>

      {/* Vasto intermedio — flat crescent directly over femur, deep to rectus */}
      <path d="M214,148 Q236,140 260,138 Q284,140 306,148 Q316,168 312,188 Q290,200 260,202 Q230,200 208,188 Q204,168 214,148 Z"
        fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.2" opacity="0.65" className="dark:fill-blue-900/40 dark:stroke-blue-400" />
      <text x="260" y="174" textAnchor="middle" fill="#2563eb" fontWeight="600" style={{ fontSize: "7.5px" }} className="dark:fill-blue-300">V. intermedio</text>

      {/* Vasto lateral — large crescent wrapping anterolateral side of femur */}
      <path d="M316,108 Q352,130 370,170 Q378,210 372,252 Q362,282 340,296 Q320,288 310,264 Q302,238 304,212 Q308,180 310,152 Q312,128 316,108 Z"
        fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.4" opacity="0.65" className="dark:fill-blue-800/45 dark:stroke-blue-400" />
      <text x="348" y="195" textAnchor="middle" fill="#1d4ed8" fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-blue-300">Vasto</text>
      <text x="348" y="208" textAnchor="middle" fill="#1d4ed8" style={{ fontSize: "7.5px" }} className="dark:fill-blue-300">lateral</text>

      {/* Vasto medial — crescent wrapping anteromedial side of femur */}
      <path d="M204,108 Q168,130 150,170 Q142,210 148,252 Q158,282 180,296 Q200,288 210,264 Q218,238 216,212 Q212,180 210,152 Q208,128 204,108 Z"
        fill="#93c5fd" stroke="#3b82f6" strokeWidth="1.4" opacity="0.65" className="dark:fill-blue-800/45 dark:stroke-blue-400" />
      <text x="172" y="195" textAnchor="middle" fill="#1d4ed8" fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-blue-300">Vasto</text>
      <text x="172" y="208" textAnchor="middle" fill="#1d4ed8" style={{ fontSize: "7.5px" }} className="dark:fill-blue-300">medial</text>

      {/* Sartorio — small oval, anteromedial superficial */}
      <ellipse cx="148" cy="118" rx="16" ry="14" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1.4" opacity="0.85" className="dark:fill-blue-700/60 dark:stroke-blue-300" />
      <text x="148" y="122" textAnchor="middle" fill="#1e3a5f" fontWeight="700" style={{ fontSize: "7px" }} className="dark:fill-blue-200">Sart.</text>

      {/* ── Lateral intermuscular septum ── */}
      <line x1="300" y1="264" x2="378" y2="280" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,2" className="dark:stroke-gray-500" />
      <text x="392" y="276" fill="#64748b" style={{ fontSize: "5.5px" }} className="dark:fill-gray-400">Septo lat.</text>

      {/* ── Medial intermuscular septum ── */}
      <line x1="190" y1="296" x2="122" y2="310" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4,2" className="dark:stroke-gray-500" />

      {/* ── TFL / Cintilla iliotibial — thin strip on the lateral superficial surface ── */}
      <path d="M388,155 Q398,175 402,210 Q400,250 392,270 Q384,260 382,210 Q384,175 388,155 Z"
        fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.3" opacity="0.75" className="dark:fill-violet-800/50 dark:stroke-violet-400" />
      <line x1="402" y1="212" x2="470" y2="198" stroke="#7c3aed" strokeWidth="0.8" className="dark:stroke-violet-400" />
      <text x="472" y="194" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Cintilla IT</text>

      {/* ── MEDIAL COMPARTMENT ── */}
      {/* Aductor largo — triangular, most anterior of adductors */}
      <path d="M145,300 Q128,314 118,340 Q118,364 132,376 Q150,380 162,370 Q170,352 168,330 Q164,310 154,300 Z"
        fill="#86efac" stroke="#22c55e" strokeWidth="1.4" opacity="0.7" className="dark:fill-green-800/50 dark:stroke-green-400" />
      <text x="142" y="340" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-green-300">Ad.</text>
      <text x="142" y="352" textAnchor="middle" fill="#15803d" style={{ fontSize: "7px" }} className="dark:fill-green-300">largo</text>

      {/* Aductor corto — smaller, deep to longus */}
      <path d="M170,290 Q160,298 158,316 Q162,332 174,336 Q186,332 188,316 Q186,298 178,290 Z"
        fill="#4ade80" stroke="#16a34a" strokeWidth="1.1" opacity="0.65" className="dark:fill-green-900/40 dark:stroke-green-400" />
      <text x="174" y="318" textAnchor="middle" fill="#15803d" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-green-300">Ad. corto</text>

      {/* Aductor magno — large, deepest, wraps from medial toward posterior */}
      <path d="M192,288 Q176,308 172,340 Q180,378 204,398 Q232,408 260,400 Q282,388 288,364 Q286,336 272,310 Q256,292 232,284 Q210,284 192,288 Z"
        fill="#bbf7d0" stroke="#22c55e" strokeWidth="1.4" opacity="0.55" className="dark:fill-green-900/35 dark:stroke-green-400" />
      <text x="234" y="358" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-green-300">Aductor magno</text>

      {/* Grácil — thin strip, most medial and superficial */}
      <path d="M105,320 Q96,330 94,348 Q98,366 108,372 Q120,368 122,348 Q120,330 112,320 Z"
        fill="#34d399" stroke="#059669" strokeWidth="1.3" opacity="0.8" className="dark:fill-emerald-800/50 dark:stroke-emerald-400" />
      <line x1="96" y1="346" x2="36" y2="352" stroke="#059669" strokeWidth="0.8" className="dark:stroke-emerald-400" />
      <text x="34" y="350" textAnchor="end" fill="#059669" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-emerald-300">Grácil</text>

      {/* ── POSTERIOR COMPARTMENT ── */}
      {/* Semimembranoso — large oval, posteromedial */}
      <path d="M168,392 Q156,404 152,424 Q158,444 174,450 Q194,446 200,426 Q198,404 186,392 Z"
        fill="#fca5a5" stroke="#ef4444" strokeWidth="1.4" opacity="0.7" className="dark:fill-red-900/50 dark:stroke-red-400" />
      <text x="176" y="420" textAnchor="middle" fill="#b91c1c" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-red-300">Semimem-</text>
      <text x="176" y="432" textAnchor="middle" fill="#b91c1c" style={{ fontSize: "6.5px" }} className="dark:fill-red-300">branoso</text>

      {/* Semitendinoso — smaller oval, medial to semimembranoso */}
      <path d="M132,378 Q120,390 116,408 Q120,424 132,430 Q146,426 150,408 Q148,390 140,378 Z"
        fill="#f87171" stroke="#dc2626" strokeWidth="1.3" opacity="0.75" className="dark:fill-red-800/50 dark:stroke-red-400" />
      <line x1="118" y1="405" x2="36" y2="415" stroke="#dc2626" strokeWidth="0.8" className="dark:stroke-red-400" />
      <text x="34" y="412" textAnchor="end" fill="#dc2626" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-red-300">Semitendinoso</text>

      {/* Bíceps femoral cabeza larga — posterolateral */}
      <path d="M310,374 Q296,386 290,410 Q296,436 314,444 Q336,438 344,416 Q342,392 328,378 Z"
        fill="#fecdd3" stroke="#e11d48" strokeWidth="1.4" opacity="0.7" className="dark:fill-rose-900/50 dark:stroke-rose-400" />
      <text x="316" y="412" textAnchor="middle" fill="#be123c" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-rose-300">Bíceps</text>
      <text x="316" y="424" textAnchor="middle" fill="#be123c" style={{ fontSize: "6.5px" }} className="dark:fill-rose-300">fem. (CL)</text>

      {/* Bíceps femoral cabeza corta — lateral, adjacent to cabeza larga */}
      <path d="M336,340 Q326,350 322,372 Q328,386 340,388 Q354,384 358,368 Q356,350 346,340 Z"
        fill="#fda4af" stroke="#e11d48" strokeWidth="1.1" opacity="0.65" className="dark:fill-rose-800/40 dark:stroke-rose-400" />
      <line x1="358" y1="362" x2="472" y2="356" stroke="#e11d48" strokeWidth="0.8" className="dark:stroke-rose-400" />
      <text x="474" y="352" fill="#be123c" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-rose-300">Bíceps fem.</text>
      <text x="474" y="362" fill="#be123c" style={{ fontSize: "6.5px" }} className="dark:fill-rose-300">(cabeza corta)</text>

      {/* ── NEUROVASCULAR ── */}
      {/* Femoral vessels — anteromedial, in adductor canal */}
      <circle cx="168" cy="222" r="6" fill="#ef4444" stroke="#991b1b" strokeWidth="1.3" />
      <text x="168" y="224" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>A</text>
      <circle cx="182" cy="230" r="5.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.2" />
      <text x="182" y="232" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>V</text>
      <line x1="160" y1="216" x2="42" y2="188" stroke="#991b1b" strokeWidth="0.8" />
      <text x="40" y="180" textAnchor="end" fill="#ef4444" fontWeight="700" style={{ fontSize: "7.5px" }}>A. femoral</text>
      <text x="40" y="191" textAnchor="end" fill="#3b82f6" fontWeight="700" style={{ fontSize: "7.5px" }}>V. femoral</text>

      {/* V. femoral profunda */}
      <circle cx="198" cy="266" r="4" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="1" opacity="0.7" />
      <text x="198" y="268" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "3.5px" }}>VP</text>

      {/* N. ciático — posterior, between adductor magnus and hamstrings */}
      <circle cx="280" cy="380" r="6" fill="#facc15" stroke="#92400e" strokeWidth="1.5" />
      <line x1="288" y1="376" x2="472" y2="382" stroke="#a16207" strokeWidth="0.8" className="dark:stroke-yellow-500" />
      <text x="474" y="380" fill="#ca8a04" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-yellow-300">N. ciático</text>

      {/* V. safena magna — subcutaneous, medial */}
      <circle cx="102" cy="276" r="3.5" fill="#818cf8" stroke="#4f46e5" strokeWidth="1" />
      <line x1="98" y1="276" x2="36" y2="276" stroke="#4f46e5" strokeWidth="0.6" />
      <text x="34" y="280" textAnchor="end" fill="#6366f1" style={{ fontSize: "6.5px" }}>V. safena magna</text>

      {/* ── Orientation ── */}
      <text x="260" y="52" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">ANTERIOR</text>
      <text x="260" y="490" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">POSTERIOR</text>
      <text x="24" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">MED</text>
      <text x="496" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">LAT</text>

      {/* ── Legend ── */}
      <g transform="translate(70,504)">
        {[
          { c: "#3b82f6", l: "Anterior" },
          { c: "#22c55e", l: "Medial" },
          { c: "#ef4444", l: "Posterior" },
          { c: "#7c3aed", l: "Lateral (IT)" },
        ].map((item, i) => (
          <g key={`tlg${i}`} transform={`translate(${i * 100},0)`}>
            <rect x="0" y="0" width="10" height="10" rx="2" fill={item.c} opacity="0.6" />
            <text x="14" y="9" fill={item.c} fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-current">{item.l}</text>
          </g>
        ))}
      </g>

      {/* Level label */}
      <text x="260" y="528" textAnchor="middle" fill="#9ca3af" style={{ fontSize: "7px" }} className="dark:fill-gray-500">Corte axial — tercio medio del muslo</text>
    </svg>
  );
}

/* ── Leg (below knee) axial MRI diagram (mid-calf, based on Radiopaedia) ── */
function LegAxial() {
  return (
    <svg viewBox="0 0 520 540" className="w-full max-w-[480px] mx-auto">
      {/* ── Skin & subcutaneous fat ── */}
      <path d="M260,60 C370,60 430,120 440,200 Q445,280 420,350 Q390,420 260,440 Q130,420 100,350 Q75,280 80,200 C90,120 150,60 260,60 Z"
        fill="#fdf4e8" stroke="#c9a87c" strokeWidth="2" className="dark:fill-[#2a2420] dark:stroke-[#7a6550]" />
      <path d="M260,70 C362,70 420,126 428,200 Q432,274 410,342 Q382,410 260,428 Q138,410 110,342 Q88,274 92,200 C100,126 158,70 260,70 Z"
        fill="#fef6ee" stroke="none" className="dark:fill-[#252018]" />

      {/* ── Crural fascia ── */}
      <path d="M260,78 C356,78 412,130 420,198 Q424,268 404,334 Q378,400 260,416 Q142,400 116,334 Q96,268 100,198 C108,130 164,78 260,78 Z"
        fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,2" className="dark:stroke-gray-600" />

      {/* ── TIBIA (anteromedial, triangular cross-section) ── */}
      <path d="M175,140 Q195,115 235,110 Q262,115 272,140 Q268,178 250,198 Q220,210 186,204 Q168,190 170,162 Z"
        fill="#d4d8e0" stroke="#5a6270" strokeWidth="3" className="dark:fill-gray-600 dark:stroke-gray-400" />
      <text x="220" y="165" textAnchor="middle" className="fill-gray-500 dark:fill-gray-300" style={{ fontSize: "10px" }} fontWeight="700">Tibia</text>
      {/* Tibial crest (anterior subcutaneous border) */}
      <path d="M200,112 Q218,108 236,112" fill="none" stroke="#475569" strokeWidth="2" className="dark:stroke-gray-400" />

      {/* ── FIBULA (posterolateral, small round) ── */}
      <ellipse cx="368" cy="200" rx="16" ry="20" fill="#d4d8e0" stroke="#5a6270" strokeWidth="2.5" className="dark:fill-gray-600 dark:stroke-gray-400" />
      <text x="368" y="204" textAnchor="middle" className="fill-gray-500 dark:fill-gray-300" style={{ fontSize: "8px" }} fontWeight="700">Fíb.</text>

      {/* ── Interosseous membrane ── */}
      <line x1="274" y1="172" x2="352" y2="194" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4,2" className="dark:stroke-gray-500" />
      <text x="312" y="178" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "6px" }} transform="rotate(8,312,178)">Membr. interósea</text>

      {/* ── ANTERIOR COMPARTMENT ── */}
      {/* Tibial anterior — largest, medial, directly lateral to tibia */}
      <path d="M244,90 Q262,82 284,88 Q310,104 318,142 Q316,172 300,186 Q280,192 264,186 Q254,176 250,156 Q244,126 244,90 Z"
        fill="#93c5fd" stroke="#2563eb" strokeWidth="1.5" opacity="0.75" className="dark:fill-blue-800/50 dark:stroke-blue-400" />
      <text x="282" y="132" textAnchor="middle" fill="#1d4ed8" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-blue-300">Tibial</text>
      <text x="282" y="145" textAnchor="middle" fill="#1d4ed8" style={{ fontSize: "8px" }} className="dark:fill-blue-300">anterior</text>

      {/* EHL — between tibialis anterior and EDL */}
      <path d="M300,98 Q314,92 326,100 Q340,118 342,150 Q338,174 326,180 Q314,176 308,158 Q302,130 300,98 Z"
        fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.2" opacity="0.65" className="dark:fill-blue-900/40 dark:stroke-blue-400" />
      <text x="322" y="142" textAnchor="middle" fill="#2563eb" fontWeight="600" style={{ fontSize: "7.5px" }} className="dark:fill-blue-300">EHL</text>

      {/* EDL — most lateral in anterior compartment */}
      <path d="M332,102 Q344,96 356,104 Q368,122 370,156 Q366,180 354,186 Q342,182 336,162 Q330,132 332,102 Z"
        fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.1" opacity="0.6" className="dark:fill-blue-900/35 dark:stroke-blue-400" />
      <text x="352" y="146" textAnchor="middle" fill="#2563eb" fontWeight="600" style={{ fontSize: "7.5px" }} className="dark:fill-blue-300">EDL</text>

      {/* ── LATERAL COMPARTMENT ── */}
      {/* Peroneo largo — superficial, lateral to fibula */}
      <path d="M378,160 Q400,170 410,208 Q408,254 396,278 Q380,288 368,274 Q358,248 360,218 Q364,180 378,160 Z"
        fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.4" opacity="0.7" className="dark:fill-violet-800/50 dark:stroke-violet-400" />
      <text x="390" y="218" textAnchor="middle" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Peroneo</text>
      <text x="390" y="231" textAnchor="middle" fill="#6d28d9" style={{ fontSize: "7px" }} className="dark:fill-violet-300">largo</text>

      {/* Peroneo corto — deep, posterior to fibula */}
      <path d="M358,230 Q350,244 350,268 Q354,290 366,296 Q380,292 384,268 Q382,244 374,230 Z"
        fill="#a78bfa" stroke="#7c3aed" strokeWidth="1.2" opacity="0.65" className="dark:fill-violet-900/45 dark:stroke-violet-400" />
      <line x1="384" y1="264" x2="478" y2="258" stroke="#7c3aed" strokeWidth="0.8" className="dark:stroke-violet-400" />
      <text x="480" y="254" fill="#6d28d9" fontWeight="600" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Peroneo</text>
      <text x="480" y="265" fill="#6d28d9" style={{ fontSize: "7px" }} className="dark:fill-violet-300">corto</text>

      {/* ── Anterior crural septum (between anterior & lateral) ── */}
      <line x1="368" y1="180" x2="386" y2="164" stroke="#64748b" strokeWidth="0.8" strokeDasharray="3,2" className="dark:stroke-gray-500" />

      {/* ── DEEP POSTERIOR COMPARTMENT ── */}
      {/* Tibial posterior — deepest, adjacent to interosseous membrane, between tibia and fibula */}
      <path d="M224,216 Q240,208 268,210 Q304,218 326,236 Q336,260 328,282 Q310,296 284,298 Q256,296 236,282 Q220,262 218,240 Q218,224 224,216 Z"
        fill="#fdba74" stroke="#ea580c" strokeWidth="1.4" opacity="0.65" className="dark:fill-orange-800/50 dark:stroke-orange-400" />
      <text x="276" y="258" textAnchor="middle" fill="#c2410c" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-orange-300">Tibial posterior</text>

      {/* FDL — medial, adjacent to posterior tibia */}
      <path d="M178,216 Q168,230 164,258 Q170,286 184,296 Q200,292 206,264 Q204,234 194,218 Z"
        fill="#fed7aa" stroke="#ea580c" strokeWidth="1.2" opacity="0.65" className="dark:fill-orange-900/40 dark:stroke-orange-400" />
      <text x="186" y="260" textAnchor="middle" fill="#c2410c" fontWeight="600" style={{ fontSize: "7.5px" }} className="dark:fill-orange-300">FDL</text>

      {/* FHL — lateral, adjacent to posterior fibula */}
      <path d="M320,260 Q330,270 342,290 Q350,318 344,340 Q332,350 316,340 Q302,320 296,296 Q298,272 312,260 Z"
        fill="#fde68a" stroke="#d97706" strokeWidth="1.2" opacity="0.6" className="dark:fill-amber-900/40 dark:stroke-amber-400" />
      <text x="324" y="306" textAnchor="middle" fill="#b45309" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-amber-300">FHL</text>

      {/* ── Transverse intermuscular septum (separates deep from superficial posterior) ── */}
      <line x1="148" y1="310" x2="340" y2="340" stroke="#64748b" strokeWidth="0.8" strokeDasharray="4,2" className="dark:stroke-gray-500" />
      <text x="244" y="320" textAnchor="middle" fill="#64748b" style={{ fontSize: "5px" }} className="dark:fill-gray-500">Septo transverso</text>

      {/* ── SUPERFICIAL POSTERIOR COMPARTMENT ── */}
      {/* Gastrocnemio medial — large, posteromedial bulk */}
      <path d="M130,316 Q112,336 108,370 Q114,404 142,416 Q172,418 194,402 Q206,378 202,348 Q194,324 170,314 Q148,312 130,316 Z"
        fill="#fca5a5" stroke="#ef4444" strokeWidth="1.4" opacity="0.7" className="dark:fill-red-900/50 dark:stroke-red-400" />
      <text x="156" y="366" textAnchor="middle" fill="#b91c1c" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-red-300">Gastrocnemio</text>
      <text x="156" y="380" textAnchor="middle" fill="#b91c1c" style={{ fontSize: "7.5px" }} className="dark:fill-red-300">medial</text>

      {/* Gastrocnemio lateral — large, posterolateral bulk */}
      <path d="M302,326 Q322,334 338,356 Q342,386 328,406 Q308,418 282,414 Q260,404 252,382 Q248,354 258,336 Q276,322 302,326 Z"
        fill="#fca5a5" stroke="#ef4444" strokeWidth="1.4" opacity="0.7" className="dark:fill-red-900/50 dark:stroke-red-400" />
      <text x="298" y="370" textAnchor="middle" fill="#b91c1c" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-red-300">Gastrocnemio</text>
      <text x="298" y="384" textAnchor="middle" fill="#b91c1c" style={{ fontSize: "7.5px" }} className="dark:fill-red-300">lateral</text>

      {/* Sóleo — large, flat, deep to gastrocnemius, spanning both sides */}
      <path d="M190,296 Q218,290 260,288 Q302,290 330,298 Q340,316 338,340 Q318,354 260,358 Q202,354 182,340 Q178,316 190,296 Z"
        fill="#f87171" stroke="#dc2626" strokeWidth="1.2" opacity="0.6" className="dark:fill-red-800/40 dark:stroke-red-400" />
      <text x="260" y="330" textAnchor="middle" fill="#b91c1c" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-red-300">Sóleo</text>

      {/* Plantar tendon (tiny) */}
      <circle cx="240" cy="346" r="2" fill="#fecaca" stroke="#ef4444" strokeWidth="0.8" opacity="0.7" />
      <text x="240" y="358" textAnchor="middle" fill="#ef4444" style={{ fontSize: "4.5px" }}>Plant.</text>

      {/* ── NEUROVASCULAR ── */}
      {/* A/V tibial anterior — between tibialis anterior and EHL on interosseous membrane */}
      <circle cx="302" cy="100" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="1.3" />
      <text x="302" y="102" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "4.5px" }}>A</text>
      <circle cx="312" cy="100" r="3.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1" />
      <text x="312" y="102" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "4px" }}>V</text>
      <line x1="316" y1="96" x2="478" y2="82" stroke="#991b1b" strokeWidth="0.8" />
      <text x="480" y="78" fill="#ef4444" fontWeight="700" style={{ fontSize: "7.5px" }}>A/V tibial ant.</text>

      {/* N. peroneo profundo */}
      <circle cx="294" cy="92" r="3" fill="#facc15" stroke="#92400e" strokeWidth="1.2" />
      <line x1="294" y1="88" x2="440" y2="68" stroke="#a16207" strokeWidth="0.7" />
      <text x="442" y="66" fill="#ca8a04" fontWeight="700" style={{ fontSize: "7px" }} className="dark:fill-yellow-300">N. peroneo prof.</text>

      {/* A/V tibial posterior — between FDL and tibialis posterior */}
      <circle cx="206" cy="282" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="1.3" />
      <text x="206" y="284" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "4.5px" }}>A</text>
      <circle cx="196" cy="288" r="3.5" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1" />
      <text x="196" y="290" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "4px" }}>V</text>
      <line x1="192" y1="292" x2="42" y2="330" stroke="#991b1b" strokeWidth="0.8" />
      <text x="40" y="326" textAnchor="end" fill="#ef4444" fontWeight="700" style={{ fontSize: "7.5px" }}>A/V tibial post.</text>

      {/* N. tibial */}
      <circle cx="216" cy="294" r="3" fill="#facc15" stroke="#92400e" strokeWidth="1.2" />
      <line x1="212" y1="298" x2="42" y2="348" stroke="#a16207" strokeWidth="0.7" />
      <text x="40" y="346" textAnchor="end" fill="#ca8a04" fontWeight="700" style={{ fontSize: "7px" }} className="dark:fill-yellow-300">N. tibial</text>

      {/* A. peronea — between tibialis posterior and FHL */}
      <circle cx="330" cy="284" r="3.5" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
      <line x1="334" y1="282" x2="478" y2="282" stroke="#991b1b" strokeWidth="0.7" />
      <text x="480" y="286" fill="#ef4444" style={{ fontSize: "7px" }}>A. peronea</text>

      {/* V. safena magna — subcutaneous, posteromedial */}
      <circle cx="142" cy="228" r="3.5" fill="#818cf8" stroke="#4f46e5" strokeWidth="1" />
      <line x1="138" y1="228" x2="42" y2="228" stroke="#4f46e5" strokeWidth="0.6" />
      <text x="40" y="232" textAnchor="end" fill="#6366f1" style={{ fontSize: "6.5px" }}>V. safena magna</text>

      {/* V. safena menor — subcutaneous, posterior midline */}
      <circle cx="260" cy="420" r="3" fill="#818cf8" stroke="#4f46e5" strokeWidth="1" />
      <text x="260" y="434" textAnchor="middle" fill="#6366f1" style={{ fontSize: "6px" }}>V. safena menor</text>

      {/* ── Orientation ── */}
      <text x="260" y="50" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">ANTERIOR</text>
      <text x="260" y="478" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">POSTERIOR</text>
      <text x="30" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">MED</text>
      <text x="490" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" style={{ fontSize: "10px" }} fontWeight="600">LAT</text>

      {/* ── Legend ── */}
      <g transform="translate(50,494)">
        {[
          { c: "#3b82f6", l: "Anterior" },
          { c: "#7c3aed", l: "Lateral" },
          { c: "#f97316", l: "Post. profundo" },
          { c: "#ef4444", l: "Post. superficial" },
        ].map((item, i) => (
          <g key={`llg${i}`} transform={`translate(${i * 112},0)`}>
            <rect x="0" y="0" width="10" height="10" rx="2" fill={item.c} opacity="0.6" />
            <text x="14" y="9" fill={item.c} fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-current">{item.l}</text>
          </g>
        ))}
      </g>

      {/* Level label */}
      <text x="260" y="524" textAnchor="middle" fill="#9ca3af" style={{ fontSize: "7px" }} className="dark:fill-gray-500">Corte axial — tercio medio de la pierna</text>
    </svg>
  );
}

function MRIThighLegSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.mri_thigh_title")} source="Stoller DW, MRI in Orthopaedics & Sports Medicine; Netter, Atlas of Human Anatomy">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.mri_thigh_axial")}</p>
      <ThighAxial />
      <SheetTable
        headers={[t("calc.compartment"), t("calc.muscles"), t("calc.innervation")]}
        rows={[
          [t("calc.mri_thigh_ant"), t("calc.mri_thigh_ant_m"), t("calc.mri_thigh_ant_n")],
          [t("calc.mri_thigh_med"), t("calc.mri_thigh_med_m"), t("calc.mri_thigh_med_n")],
          [t("calc.mri_thigh_post"), t("calc.mri_thigh_post_m"), t("calc.mri_thigh_post_n")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.mri_leg_axial")}</p>
      <LegAxial />
      <SheetTable
        headers={[t("calc.compartment"), t("calc.muscles"), t("calc.innervation")]}
        rows={[
          [t("calc.mri_leg_ant"), t("calc.mri_leg_ant_m"), t("calc.mri_leg_ant_n")],
          [t("calc.mri_leg_lat"), t("calc.mri_leg_lat_m"), t("calc.mri_leg_lat_n")],
          [t("calc.mri_leg_dp"), t("calc.mri_leg_dp_m"), t("calc.mri_leg_dp_n")],
          [t("calc.mri_leg_sp"), t("calc.mri_leg_sp_m"), t("calc.mri_leg_sp_n")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Neck axial anatomy diagram (suprahyoid, oropharynx C2-C3, based on Radiopaedia/Harnsberger) ── */
function NeckAxial() {
  return (
    <svg viewBox="0 0 700 530" className="w-full max-w-[680px] mx-auto">
      {/* ── Skin outline ── */}
      <path d="M350,52 C448,52 524,108 532,198 Q536,280 520,356 Q496,420 350,438 Q204,420 180,356 Q164,280 168,198 C176,108 252,52 350,52 Z"
        fill="#fdf4e8" stroke="#c9a87c" strokeWidth="2" className="dark:fill-[#2a2420] dark:stroke-[#7a6550]" />
      <path d="M350,62 C440,62 516,114 522,198 Q524,274 510,346 Q488,408 350,424 Q212,408 190,346 Q176,274 178,198 C184,114 260,62 350,62 Z"
        fill="#fef6ee" stroke="none" className="dark:fill-[#252018]" />

      {/* ── Investing fascia (SLDCF) ── */}
      <path d="M350,68 C436,68 510,118 516,198 Q518,270 506,340 Q486,404 350,418 Q214,404 194,340 Q180,270 184,198 C190,118 264,68 350,68 Z"
        fill="none" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="4,3" opacity="0.4" className="dark:stroke-gray-600" />

      {/* ── Mandible (U-shape at suprahyoid, with rami) ── */}
      <path d="M248,76 Q300,62 350,58 Q400,62 452,76 L448,84 Q400,70 350,66 Q300,70 252,84 Z"
        fill="#d4d8e0" stroke="#5a6270" strokeWidth="2" className="dark:fill-gray-600 dark:stroke-gray-400" />
      <text x="350" y="78" textAnchor="middle" fill="#475569" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-gray-400">Mandíbula</text>
      {/* Right ramus */}
      <path d="M216,90 Q208,104 198,132 Q190,164 188,192 L196,194 Q198,166 206,136 Q214,110 222,94 Z"
        fill="#d4d8e0" stroke="#5a6270" strokeWidth="1.8" className="dark:fill-gray-600 dark:stroke-gray-400" />
      {/* Left ramus */}
      <path d="M484,90 Q492,104 502,132 Q510,164 512,192 L504,194 Q502,166 494,136 Q486,110 478,94 Z"
        fill="#d4d8e0" stroke="#5a6270" strokeWidth="1.8" className="dark:fill-gray-600 dark:stroke-gray-400" />

      {/* ── MASTICATOR SPACE (bilateral) — sandwich: masseter | ramus | medial pterygoid ── */}
      {/* Right — Masseter (lateral to ramus) */}
      <path d="M180,100 Q172,112 166,140 Q164,168 168,190 Q176,200 188,196 Q194,188 196,166 Q196,138 192,112 Q188,100 180,100 Z"
        fill="#d8b4fe" stroke="#7c3aed" strokeWidth="1.3" opacity="0.7" className="dark:fill-violet-800/45 dark:stroke-violet-400" />
      <text x="178" y="150" textAnchor="middle" fill="#7c3aed" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-violet-300">Masetero</text>
      {/* Right — Medial pterygoid (medial to ramus) */}
      <path d="M218,98 Q210,110 206,136 Q206,164 210,186 Q216,194 228,190 Q232,180 232,160 Q232,132 228,110 Q224,98 218,98 Z"
        fill="#c084fc" stroke="#7c3aed" strokeWidth="1.2" opacity="0.6" className="dark:fill-violet-700/35 dark:stroke-violet-400" />
      <text x="218" y="150" textAnchor="middle" fill="#6d28d9" fontWeight="600" style={{ fontSize: "5.5px" }} className="dark:fill-violet-300">Pt. med.</text>
      {/* Left — Masseter */}
      <path d="M520,100 Q528,112 534,140 Q536,168 532,190 Q524,200 512,196 Q506,188 504,166 Q504,138 508,112 Q512,100 520,100 Z"
        fill="#d8b4fe" stroke="#7c3aed" strokeWidth="1.3" opacity="0.7" className="dark:fill-violet-800/45 dark:stroke-violet-400" />
      <text x="522" y="150" textAnchor="middle" fill="#7c3aed" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-violet-300">Masetero</text>
      {/* Left — Medial pterygoid */}
      <path d="M482,98 Q490,110 494,136 Q494,164 490,186 Q484,194 472,190 Q468,180 468,160 Q468,132 472,110 Q476,98 482,98 Z"
        fill="#c084fc" stroke="#7c3aed" strokeWidth="1.2" opacity="0.6" className="dark:fill-violet-700/35 dark:stroke-violet-400" />
      <text x="482" y="150" textAnchor="middle" fill="#6d28d9" fontWeight="600" style={{ fontSize: "5.5px" }} className="dark:fill-violet-300">Pt. med.</text>
      {/* Label — right side callout */}
      <line x1="164" y1="138" x2="22" y2="112" stroke="#7c3aed" strokeWidth="0.7" className="dark:stroke-violet-400" />
      <text x="20" y="106" textAnchor="start" fill="#7c3aed" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-violet-400">Esp. masticador</text>
      <text x="20" y="118" textAnchor="start" fill="#7c3aed" style={{ fontSize: "7px" }} className="dark:fill-violet-300">Masetero · Rama mandibular</text>
      <text x="20" y="128" textAnchor="start" fill="#7c3aed" style={{ fontSize: "7px" }} className="dark:fill-violet-300">Pterigoideo medial · V3</text>

      {/* ── PHARYNGEAL MUCOSAL SPACE — horseshoe around airway ── */}
      <path d="M290,96 Q320,84 350,82 Q380,84 410,96 Q428,118 428,150 Q428,182 410,204 Q380,222 350,224 Q320,222 290,204 Q272,182 272,150 Q272,118 290,96 Z"
        fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" opacity="0.45" className="dark:fill-blue-900/30 dark:stroke-blue-400" />
      {/* Constrictor muscles (dashed ring) */}
      <path d="M304,106 Q328,96 350,94 Q372,96 396,106 Q410,124 410,150 Q410,176 396,194 Q372,208 350,210 Q328,208 304,194 Q290,176 290,150 Q290,124 304,106 Z"
        fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.4" className="dark:stroke-blue-400" />
      {/* Airway lumen */}
      <ellipse cx="350" cy="150" rx="30" ry="26" fill="#0f172a" stroke="#475569" strokeWidth="1.5" opacity="0.18" className="dark:fill-white/10 dark:stroke-gray-500" />
      <text x="350" y="154" textAnchor="middle" fill="#475569" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-gray-400">Vía aérea</text>
      {/* Tonsils */}
      <ellipse cx="298" cy="150" rx="8" ry="12" fill="#93c5fd" stroke="#3b82f6" strokeWidth="0.8" opacity="0.5" className="dark:fill-blue-800/40 dark:stroke-blue-400" />
      <text x="298" y="153" textAnchor="middle" fill="#2563eb" style={{ fontSize: "4.5px" }} className="dark:fill-blue-300">T</text>
      <ellipse cx="402" cy="150" rx="8" ry="12" fill="#93c5fd" stroke="#3b82f6" strokeWidth="0.8" opacity="0.5" className="dark:fill-blue-800/40 dark:stroke-blue-400" />
      <text x="402" y="153" textAnchor="middle" fill="#2563eb" style={{ fontSize: "4.5px" }} className="dark:fill-blue-300">T</text>
      {/* Pharyngeal raphe */}
      <line x1="350" y1="176" x2="350" y2="210" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.4" className="dark:stroke-blue-300" />
      {/* Label — top */}
      <text x="350" y="98" textAnchor="middle" fill="#2563eb" fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-blue-400">Espacio mucoso faríngeo</text>
      <text x="350" y="218" textAnchor="middle" fill="#2563eb" style={{ fontSize: "6px" }} className="dark:fill-blue-300">Constrictores · Mucosa · Amígdalas (T)</text>

      {/* ── PARAPHARYNGEAL SPACE (bilateral) — triangular fat wedge ── */}
      <path d="M268,112 Q258,130 252,158 Q248,186 254,208 L268,204 Q264,182 266,156 Q270,130 276,114 Z"
        fill="#dcfce7" stroke="#22c55e" strokeWidth="1.4" opacity="0.65" className="dark:fill-green-900/40 dark:stroke-green-400" />
      <path d="M432,112 Q442,130 448,158 Q452,186 446,208 L432,204 Q436,182 434,156 Q430,130 424,114 Z"
        fill="#dcfce7" stroke="#22c55e" strokeWidth="1.4" opacity="0.65" className="dark:fill-green-900/40 dark:stroke-green-400" />
      {/* Fat stippling */}
      {[{x:262,y:136},{x:260,y:160},{x:258,y:182},{x:438,y:136},{x:440,y:160},{x:442,y:182}].map((p,i) => (
        <circle key={`ppf${i}`} cx={p.x} cy={p.y} r="1.8" fill="#22c55e" opacity="0.22" className="dark:fill-green-400" />
      ))}
      {/* Label — left callout */}
      <line x1="250" y1="168" x2="22" y2="168" stroke="#16a34a" strokeWidth="0.7" className="dark:stroke-green-400" />
      <text x="20" y="156" textAnchor="start" fill="#16a34a" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-green-400">Esp. parafaríngeo</text>
      <text x="20" y="168" textAnchor="start" fill="#16a34a" style={{ fontSize: "7px" }} className="dark:fill-green-300">Grasa (hiperintenso T1)</text>
      <text x="20" y="179" textAnchor="start" fill="#16a34a" style={{ fontSize: "6.5px" }} className="dark:fill-green-300">Su desplazamiento = clave Dx</text>

      {/* ── PAROTID SPACE (bilateral) — posterior to ramus ── */}
      <path d="M166,200 Q154,208 146,230 Q142,256 148,276 Q158,292 180,296 Q200,290 208,270 Q212,248 208,226 Q204,210 194,200 Q180,196 166,200 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" opacity="0.6" className="dark:fill-amber-900/40 dark:stroke-amber-400" />
      <path d="M208,240 Q216,234 224,238 Q228,246 224,256 Q216,260 208,254 Q204,248 208,240 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" className="dark:fill-amber-900/30 dark:stroke-amber-400" />
      <text x="176" y="248" textAnchor="middle" fill="#d97706" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-amber-400">Parótida</text>
      <circle cx="192" cy="232" r="3" fill="#60a5fa" stroke="#2563eb" strokeWidth="0.8" opacity="0.6" />
      {/* Left parotid */}
      <path d="M534,200 Q546,208 554,230 Q558,256 552,276 Q542,292 520,296 Q500,290 492,270 Q488,248 492,226 Q496,210 506,200 Q520,196 534,200 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" opacity="0.6" className="dark:fill-amber-900/40 dark:stroke-amber-400" />
      <path d="M492,240 Q484,234 476,238 Q472,246 476,256 Q484,260 492,254 Q496,248 492,240 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="0.8" opacity="0.4" className="dark:fill-amber-900/30 dark:stroke-amber-400" />
      <text x="524" y="248" textAnchor="middle" fill="#d97706" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-amber-400">Parótida</text>
      {/* Label */}
      <line x1="144" y1="262" x2="22" y2="242" stroke="#d97706" strokeWidth="0.7" className="dark:stroke-amber-400" />
      <text x="20" y="234" textAnchor="start" fill="#d97706" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-amber-400">Esp. parotídeo</text>
      <text x="20" y="246" textAnchor="start" fill="#d97706" style={{ fontSize: "7px" }} className="dark:fill-amber-300">Parótida (sup. + lóbulo profundo)</text>
      <text x="20" y="257" textAnchor="start" fill="#d97706" style={{ fontSize: "7px" }} className="dark:fill-amber-300">ACE · VII · V. retromandibular</text>

      {/* ── CAROTID SPACE (bilateral) — posterior to PPS ── */}
      <path d="M222,222 Q210,230 204,252 Q202,274 210,290 Q220,302 238,300 Q250,292 254,272 Q256,252 250,234 Q242,222 230,218 Z"
        fill="#fecaca" stroke="#ef4444" strokeWidth="1.4" opacity="0.55" className="dark:fill-red-900/40 dark:stroke-red-400" />
      <circle cx="228" cy="254" r="5.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.2" />
      <text x="228" y="256" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>ACI</text>
      <ellipse cx="238" cy="274" rx="7" ry="6" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.2" opacity="0.8" />
      <text x="238" y="276" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>VYI</text>
      {/* Left carotid */}
      <path d="M478,222 Q490,230 496,252 Q498,274 490,290 Q480,302 462,300 Q450,292 446,272 Q444,252 450,234 Q458,222 470,218 Z"
        fill="#fecaca" stroke="#ef4444" strokeWidth="1.4" opacity="0.55" className="dark:fill-red-900/40 dark:stroke-red-400" />
      <circle cx="472" cy="254" r="5.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.2" />
      <text x="472" y="256" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>ACI</text>
      <ellipse cx="462" cy="274" rx="7" ry="6" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.2" opacity="0.8" />
      <text x="462" y="276" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "5px" }}>VYI</text>
      {/* Label — right side */}
      <line x1="500" y1="268" x2="580" y2="252" stroke="#dc2626" strokeWidth="0.7" className="dark:stroke-red-400" />
      <text x="582" y="244" textAnchor="start" fill="#dc2626" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-red-400">Esp. carotídeo</text>
      <text x="582" y="256" textAnchor="start" fill="#dc2626" style={{ fontSize: "7px" }} className="dark:fill-red-300">ACI · VYI · PC IX, X, XI, XII</text>
      <text x="582" y="267" textAnchor="start" fill="#dc2626" style={{ fontSize: "7px" }} className="dark:fill-red-300">Cadena simpática cervical</text>

      {/* ── SCM (bilateral) ── */}
      <path d="M178,296 Q164,304 156,322 Q152,342 158,360 Q168,372 188,370 Q202,362 206,342 Q206,320 198,304 Q190,296 178,296 Z"
        fill="#d1d5db" stroke="#6b7280" strokeWidth="1.3" opacity="0.7" className="dark:fill-gray-600/40 dark:stroke-gray-400" />
      <text x="180" y="338" textAnchor="middle" fill="#374151" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-gray-300">ECM</text>
      <path d="M522,296 Q536,304 544,322 Q548,342 542,360 Q532,372 512,370 Q498,362 494,342 Q494,320 502,304 Q510,296 522,296 Z"
        fill="#d1d5db" stroke="#6b7280" strokeWidth="1.3" opacity="0.7" className="dark:fill-gray-600/40 dark:stroke-gray-400" />
      <text x="520" y="338" textAnchor="middle" fill="#374151" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-gray-300">ECM</text>

      {/* ── RETROPHARYNGEAL SPACE ── */}
      <path d="M278,230 Q314,224 350,222 Q386,224 422,230 Q428,244 422,258 Q386,264 350,266 Q314,264 278,258 Q272,244 278,230 Z"
        fill="#fed7aa" stroke="#f97316" strokeWidth="1.2" opacity="0.55" className="dark:fill-orange-900/40 dark:stroke-orange-400" />
      <text x="350" y="248" textAnchor="middle" fill="#ea580c" fontWeight="600" style={{ fontSize: "8px" }} className="dark:fill-orange-400">Retrofaríngeo</text>
      <circle cx="304" cy="242" r="3" fill="#fb923c" stroke="#ea580c" strokeWidth="0.7" opacity="0.5" />
      <circle cx="396" cy="242" r="3" fill="#fb923c" stroke="#ea580c" strokeWidth="0.7" opacity="0.5" />
      <text x="350" y="262" textAnchor="middle" fill="#ea580c" style={{ fontSize: "5.5px" }} className="dark:fill-orange-300">Ganglios de Rouvière</text>

      {/* ── DANGER SPACE ── */}
      <path d="M282,266 Q316,270 350,272 Q384,270 418,266 Q420,274 418,282 Q384,286 350,288 Q316,286 282,282 Q280,274 282,266 Z"
        fill="#fef9c3" stroke="#eab308" strokeWidth="0.6" strokeDasharray="2,2" opacity="0.3" className="dark:fill-yellow-900/20 dark:stroke-yellow-500" />
      <text x="350" y="278" textAnchor="middle" fill="#ca8a04" style={{ fontSize: "5.5px" }} className="dark:fill-yellow-400">Espacio peligroso</text>

      {/* ── PERIVERTEBRAL SPACE ── */}
      <path d="M240,290 Q294,278 350,276 Q406,278 460,290 Q480,316 480,348 Q474,380 452,398 Q406,414 350,416 Q294,414 248,398 Q226,380 220,348 Q220,316 240,290 Z"
        fill="#cffafe" stroke="#06b6d4" strokeWidth="1.3" opacity="0.4" className="dark:fill-cyan-900/28 dark:stroke-cyan-400" />
      {/* Longus colli */}
      <path d="M306,292 Q328,284 350,282 Q372,284 394,292 Q402,306 396,318 Q374,326 350,328 Q326,326 304,318 Q298,306 306,292 Z"
        fill="#a5f3fc" stroke="#06b6d4" strokeWidth="0.9" opacity="0.5" className="dark:fill-cyan-800/30 dark:stroke-cyan-400" />
      <text x="350" y="310" textAnchor="middle" fill="#0891b2" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-cyan-400">Longus colli / capitis</text>
      {/* Scalenes */}
      <path d="M244,302 Q236,320 234,346 Q238,370 248,382 L264,374 Q256,360 254,340 Q254,316 260,302 Z"
        fill="#67e8f9" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" className="dark:fill-cyan-800/25 dark:stroke-cyan-400" />
      <text x="246" y="344" textAnchor="middle" fill="#0891b2" style={{ fontSize: "5.5px" }} className="dark:fill-cyan-300">Escaleno</text>
      <path d="M456,302 Q464,320 466,346 Q462,370 452,382 L436,374 Q444,360 446,340 Q446,316 440,302 Z"
        fill="#67e8f9" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" className="dark:fill-cyan-800/25 dark:stroke-cyan-400" />
      <text x="454" y="344" textAnchor="middle" fill="#0891b2" style={{ fontSize: "5.5px" }} className="dark:fill-cyan-300">Escaleno</text>
      {/* Label — right side */}
      <line x1="466" y1="340" x2="580" y2="330" stroke="#06b6d4" strokeWidth="0.7" className="dark:stroke-cyan-400" />
      <text x="582" y="322" textAnchor="start" fill="#0891b2" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-cyan-400">Esp. perivertebral</text>
      <text x="582" y="334" textAnchor="start" fill="#0891b2" style={{ fontSize: "7px" }} className="dark:fill-cyan-300">Longus colli/capitis · Escalenos</text>
      <text x="582" y="345" textAnchor="start" fill="#0891b2" style={{ fontSize: "7px" }} className="dark:fill-cyan-300">Arterias vertebrales</text>

      {/* ── Vertebral body ── */}
      <path d="M316,326 Q328,318 350,316 Q372,318 384,326 Q392,340 392,356 Q388,374 378,382 Q364,388 350,388 Q336,388 322,382 Q312,374 308,356 Q308,340 316,326 Z"
        fill="#d4d8e0" stroke="#5a6270" strokeWidth="2.5" className="dark:fill-gray-600 dark:stroke-gray-400" />
      <text x="350" y="364" textAnchor="middle" className="fill-gray-500 dark:fill-gray-300" fontWeight="700" style={{ fontSize: "8px" }}>Vértebra</text>
      <ellipse cx="350" cy="336" rx="14" ry="12" fill="white" stroke="#7a8090" strokeWidth="1" className="dark:fill-gray-900 dark:stroke-gray-600" />
      <circle cx="350" cy="336" r="7" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
      <text x="350" y="326" textAnchor="middle" fill="#b45309" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-yellow-400">Médula</text>
      <circle cx="324" cy="350" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="0.9" opacity="0.7" />
      <text x="324" y="352" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "3.5px" }}>AV</text>
      <circle cx="376" cy="350" r="4" fill="#ef4444" stroke="#991b1b" strokeWidth="0.9" opacity="0.7" />
      <text x="376" y="352" textAnchor="middle" fill="white" fontWeight="700" style={{ fontSize: "3.5px" }}>AV</text>

      {/* ── POSTERIOR CERVICAL SPACE (bilateral) ── */}
      <path d="M208,362 Q194,370 186,390 Q184,410 192,424 Q204,434 226,430 Q242,422 248,404 Q248,384 240,370 Q228,360 208,362 Z"
        fill="#fbcfe8" stroke="#ec4899" strokeWidth="1.2" opacity="0.5" className="dark:fill-pink-900/40 dark:stroke-pink-400" />
      <text x="216" y="400" textAnchor="middle" fill="#db2777" fontWeight="600" style={{ fontSize: "6px" }} className="dark:fill-pink-400">Cerv. post.</text>
      <path d="M492,362 Q506,370 514,390 Q516,410 508,424 Q496,434 474,430 Q458,422 452,404 Q452,384 460,370 Q472,360 492,362 Z"
        fill="#fbcfe8" stroke="#ec4899" strokeWidth="1.2" opacity="0.5" className="dark:fill-pink-900/40 dark:stroke-pink-400" />
      <text x="484" y="400" textAnchor="middle" fill="#db2777" fontWeight="600" style={{ fontSize: "6px" }} className="dark:fill-pink-400">Cerv. post.</text>
      {/* Label — right side */}
      <line x1="516" y1="402" x2="580" y2="388" stroke="#ec4899" strokeWidth="0.7" className="dark:stroke-pink-400" />
      <text x="582" y="382" textAnchor="start" fill="#db2777" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-pink-400">Esp. cervical posterior</text>
      <text x="582" y="394" textAnchor="start" fill="#db2777" style={{ fontSize: "7px" }} className="dark:fill-pink-300">N. espinal accesorio (XI)</text>
      <text x="582" y="405" textAnchor="start" fill="#db2777" style={{ fontSize: "7px" }} className="dark:fill-pink-300">Grasa · Ganglios nivel V</text>

      {/* ── Paraspinal muscles ── */}
      <path d="M282,394 Q316,386 350,384 Q384,386 418,394 Q428,412 426,432 Q414,444 350,448 Q286,444 274,432 Q272,412 282,394 Z"
        fill="#d1d5db" stroke="#6b7280" strokeWidth="1" opacity="0.4" className="dark:fill-gray-600/30 dark:stroke-gray-400" />
      <text x="350" y="424" textAnchor="middle" fill="#6b7280" fontWeight="600" style={{ fontSize: "6.5px" }} className="dark:fill-gray-400">Paraespinales</text>

      {/* ── Fascial boundaries (dashed) ── */}
      <path d="M290,210 Q320,206 350,204 Q380,206 410,210" fill="none" stroke="#60a5fa" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.35" className="dark:stroke-blue-300" />
      <path d="M248,290 Q298,280 350,278 Q402,280 452,290" fill="none" stroke="#06b6d4" strokeWidth="0.7" strokeDasharray="2,2" opacity="0.35" className="dark:stroke-cyan-300" />

      {/* ── Orientation ── */}
      <text x="350" y="42" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontWeight="600" style={{ fontSize: "10px" }}>ANTERIOR</text>
      <text x="350" y="476" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontWeight="600" style={{ fontSize: "10px" }}>POSTERIOR</text>
      <text x="138" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontWeight="600" style={{ fontSize: "10px" }}>D</text>
      <text x="562" y="260" textAnchor="middle" className="fill-gray-400 dark:fill-gray-500" fontWeight="600" style={{ fontSize: "10px" }}>I</text>

      {/* ── Legend ── */}
      <g transform="translate(30,490)">
        {[
          { c: "#3b82f6", l: "Mucoso faríngeo" },
          { c: "#22c55e", l: "Parafaríngeo" },
          { c: "#7c3aed", l: "Masticador" },
          { c: "#f59e0b", l: "Parotídeo" },
          { c: "#ef4444", l: "Carotídeo" },
          { c: "#f97316", l: "Retrofaríngeo" },
          { c: "#06b6d4", l: "Perivertebral" },
          { c: "#ec4899", l: "Cervical post." },
        ].map((item, i) => (
          <g key={`nlg${i}`} transform={`translate(${i * 82},0)`}>
            <rect x="0" y="0" width="7" height="7" rx="1.5" fill={item.c} opacity="0.7" />
            <text x="10" y="7" fill="#6b7280" style={{ fontSize: "6px" }} className="dark:fill-gray-400">{item.l}</text>
          </g>
        ))}
      </g>

      {/* Level */}
      <text x="350" y="518" textAnchor="middle" fill="#9ca3af" fontWeight="500" style={{ fontSize: "7.5px" }} className="dark:fill-gray-500">Nivel orofaringe (C2-C3) — Suprahioideo</text>
    </svg>
  );
}

/* ── Neck lymph node stations diagram (coronal schematic) ── */
function NeckLymphNodeStations() {
  return (
    <svg viewBox="0 0 440 520" className="w-full max-w-[400px] mx-auto">
      {/* Head/jaw outline */}
      <path d="M220,30 Q280,30 310,60 Q330,90 330,120 Q326,150 310,168 Q280,188 260,196 L260,200 L180,200 L180,196 Q160,188 130,168 Q114,150 110,120 Q110,90 130,60 Q160,30 220,30 Z"
        fill="#fdf4e8" stroke="#c9a87c" strokeWidth="1.5" className="dark:fill-[#2a2420] dark:stroke-[#7a6550]" />
      {/* Mandible hint */}
      <path d="M140,150 Q180,168 220,172 Q260,168 300,150" fill="none" stroke="#94a3b8" strokeWidth="1" className="dark:stroke-gray-500" />
      {/* Chin */}
      <path d="M180,168 Q220,180 260,168" fill="none" stroke="#c9a87c" strokeWidth="1" className="dark:stroke-[#7a6550]" />
      {/* Hyoid bone */}
      <line x1="160" y1="214" x2="280" y2="214" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,2" className="dark:stroke-gray-500" />
      <text x="290" y="218" fill="#94a3b8" style={{ fontSize: "6.5px" }} className="dark:fill-gray-500">Hioides</text>
      {/* Cricoid cartilage */}
      <line x1="170" y1="310" x2="270" y2="310" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,2" className="dark:stroke-gray-500" />
      <text x="280" y="314" fill="#94a3b8" style={{ fontSize: "6.5px" }} className="dark:fill-gray-500">Cricoides</text>
      {/* Clavicle */}
      <path d="M60,440 Q140,430 220,428 Q300,430 380,440" fill="none" stroke="#94a3b8" strokeWidth="2" className="dark:stroke-gray-500" />
      <text x="388" y="444" fill="#94a3b8" style={{ fontSize: "6.5px" }} className="dark:fill-gray-500">Clavícula</text>
      {/* SCM outline (bilateral) */}
      <path d="M164,190 Q150,240 146,310 Q144,380 148,430" fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2" className="dark:stroke-gray-500" />
      <path d="M276,190 Q290,240 294,310 Q296,380 292,430" fill="none" stroke="#6b7280" strokeWidth="1" strokeDasharray="3,2" className="dark:stroke-gray-500" />
      <text x="134" y="300" fill="#6b7280" style={{ fontSize: "5.5px" }} transform="rotate(-4,134,300)" className="dark:fill-gray-500">ECM</text>
      <text x="300" y="300" fill="#6b7280" style={{ fontSize: "5.5px" }} transform="rotate(4,300,300)" className="dark:fill-gray-500">ECM</text>
      {/* Trapezius hint */}
      <path d="M100,220 Q88,300 82,380 Q78,430 76,450" fill="none" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3,2" className="dark:stroke-gray-600" />
      <path d="M340,220 Q352,300 358,380 Q362,430 364,450" fill="none" stroke="#9ca3af" strokeWidth="0.8" strokeDasharray="3,2" className="dark:stroke-gray-600" />

      {/* ── LEVEL Ia — Submental ── */}
      <ellipse cx="220" cy="186" rx="26" ry="12" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5" opacity="0.7" className="dark:fill-blue-900/40 dark:stroke-blue-400" />
      <text x="220" y="190" textAnchor="middle" fill="#1d4ed8" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-blue-300">Ia</text>

      {/* ── LEVEL Ib — Submandibular (bilateral) ── */}
      <ellipse cx="168" cy="174" rx="22" ry="14" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.3" opacity="0.6" className="dark:fill-blue-800/40 dark:stroke-blue-400" />
      <text x="168" y="178" textAnchor="middle" fill="#1d4ed8" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-blue-300">Ib</text>
      <ellipse cx="272" cy="174" rx="22" ry="14" fill="#bfdbfe" stroke="#3b82f6" strokeWidth="1.3" opacity="0.6" className="dark:fill-blue-800/40 dark:stroke-blue-400" />
      <text x="272" y="178" textAnchor="middle" fill="#1d4ed8" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-blue-300">Ib</text>

      {/* ── LEVEL IIa — Upper jugular anterior (bilateral) ── */}
      <path d="M154,220 Q142,230 140,254 Q144,276 158,282 Q172,278 176,254 Q174,230 164,220 Z"
        fill="#dcfce7" stroke="#22c55e" strokeWidth="1.4" opacity="0.65" className="dark:fill-green-900/40 dark:stroke-green-400" />
      <text x="158" y="256" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-green-300">IIa</text>
      <path d="M276,220 Q288,230 290,254 Q286,276 272,282 Q258,278 254,254 Q256,230 266,220 Z"
        fill="#dcfce7" stroke="#22c55e" strokeWidth="1.4" opacity="0.65" className="dark:fill-green-900/40 dark:stroke-green-400" />
      <text x="272" y="256" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "8px" }} className="dark:fill-green-300">IIa</text>

      {/* ── LEVEL IIb — Upper jugular posterior (bilateral) ── */}
      <path d="M124,226 Q114,236 112,256 Q116,272 126,276 Q138,272 140,256 Q138,236 132,226 Z"
        fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.2" opacity="0.55" className="dark:fill-green-800/30 dark:stroke-green-400" />
      <text x="126" y="256" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-green-300">IIb</text>
      <path d="M308,226 Q318,236 320,256 Q316,272 306,276 Q294,272 292,256 Q294,236 300,226 Z"
        fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.2" opacity="0.55" className="dark:fill-green-800/30 dark:stroke-green-400" />
      <text x="306" y="256" textAnchor="middle" fill="#15803d" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-green-300">IIb</text>

      {/* ── LEVEL III — Middle jugular (bilateral) ── */}
      <path d="M150,290 Q138,302 136,330 Q140,356 154,362 Q170,358 174,330 Q172,302 162,290 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" opacity="0.65" className="dark:fill-amber-900/40 dark:stroke-amber-400" />
      <text x="156" y="332" textAnchor="middle" fill="#b45309" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-amber-300">III</text>
      <path d="M278,290 Q290,302 292,330 Q288,356 274,362 Q258,358 254,330 Q256,302 266,290 Z"
        fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.4" opacity="0.65" className="dark:fill-amber-900/40 dark:stroke-amber-400" />
      <text x="274" y="332" textAnchor="middle" fill="#b45309" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-amber-300">III</text>

      {/* ── LEVEL IV — Lower jugular (bilateral) ── */}
      <path d="M146,370 Q134,382 132,408 Q136,430 150,436 Q166,432 170,408 Q168,382 158,370 Z"
        fill="#fecaca" stroke="#ef4444" strokeWidth="1.4" opacity="0.65" className="dark:fill-red-900/40 dark:stroke-red-400" />
      <text x="152" y="408" textAnchor="middle" fill="#b91c1c" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-red-300">IV</text>
      <path d="M282,370 Q294,382 296,408 Q292,430 278,436 Q262,432 258,408 Q260,382 270,370 Z"
        fill="#fecaca" stroke="#ef4444" strokeWidth="1.4" opacity="0.65" className="dark:fill-red-900/40 dark:stroke-red-400" />
      <text x="278" y="408" textAnchor="middle" fill="#b91c1c" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-red-300">IV</text>

      {/* ── LEVEL Va — Posterior triangle upper (bilateral) ── */}
      <path d="M100,288 Q88,302 86,330 Q90,352 102,358 Q116,354 118,330 Q116,302 108,288 Z"
        fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.3" opacity="0.6" className="dark:fill-violet-900/40 dark:stroke-violet-400" />
      <text x="102" y="328" textAnchor="middle" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Va</text>
      <path d="M332,288 Q344,302 346,330 Q342,352 330,358 Q316,354 314,330 Q316,302 324,288 Z"
        fill="#e9d5ff" stroke="#7c3aed" strokeWidth="1.3" opacity="0.6" className="dark:fill-violet-900/40 dark:stroke-violet-400" />
      <text x="330" y="328" textAnchor="middle" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Va</text>

      {/* ── LEVEL Vb — Posterior triangle lower (bilateral) ── */}
      <path d="M96,366 Q84,380 82,408 Q86,430 98,436 Q112,432 114,408 Q112,380 104,366 Z"
        fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.2" opacity="0.55" className="dark:fill-violet-800/35 dark:stroke-violet-400" />
      <text x="98" y="406" textAnchor="middle" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Vb</text>
      <path d="M336,366 Q348,380 350,408 Q346,430 334,436 Q320,432 318,408 Q320,380 328,366 Z"
        fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1.2" opacity="0.55" className="dark:fill-violet-800/35 dark:stroke-violet-400" />
      <text x="334" y="406" textAnchor="middle" fill="#6d28d9" fontWeight="700" style={{ fontSize: "7.5px" }} className="dark:fill-violet-300">Vb</text>

      {/* ── LEVEL VI — Anterior/central (visceral) ── */}
      <path d="M192,314 Q206,306 220,304 Q234,306 248,314 Q254,340 248,366 Q234,374 220,376 Q206,374 192,366 Q186,340 192,314 Z"
        fill="#cffafe" stroke="#06b6d4" strokeWidth="1.4" opacity="0.6" className="dark:fill-cyan-900/40 dark:stroke-cyan-400" />
      <text x="220" y="344" textAnchor="middle" fill="#0891b2" fontWeight="700" style={{ fontSize: "9px" }} className="dark:fill-cyan-300">VI</text>

      {/* ── LEVEL VII — Superior mediastinal ── */}
      <path d="M198,448 Q210,442 220,440 Q230,442 242,448 Q248,464 242,478 Q230,484 220,484 Q210,484 198,478 Q192,464 198,448 Z"
        fill="#fbcfe8" stroke="#ec4899" strokeWidth="1.3" opacity="0.6" className="dark:fill-pink-900/40 dark:stroke-pink-400" />
      <text x="220" y="468" textAnchor="middle" fill="#db2777" fontWeight="700" style={{ fontSize: "8.5px" }} className="dark:fill-pink-300">VII</text>

      {/* ── Labels on right margin ── */}
      <line x1="244" y1="186" x2="352" y2="176" stroke="#3b82f6" strokeWidth="0.6" />
      <text x="356" y="172" fill="#1d4ed8" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-blue-300">Ia — Submentoniano</text>
      <text x="356" y="182" fill="#1d4ed8" style={{ fontSize: "6.5px" }} className="dark:fill-blue-300">Ib — Submandibular</text>

      <line x1="178" y1="248" x2="352" y2="232" stroke="#22c55e" strokeWidth="0.6" />
      <text x="356" y="228" fill="#15803d" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-green-300">IIa — Yugular sup. (ant. al XI)</text>
      <text x="356" y="238" fill="#15803d" style={{ fontSize: "6.5px" }} className="dark:fill-green-300">IIb — Yugular sup. (post. al XI)</text>

      <line x1="176" y1="328" x2="352" y2="298" stroke="#f59e0b" strokeWidth="0.6" />
      <text x="356" y="298" fill="#b45309" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-amber-300">III — Yugular medio</text>

      <line x1="172" y1="406" x2="352" y2="362" stroke="#ef4444" strokeWidth="0.6" />
      <text x="356" y="362" fill="#b91c1c" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-red-300">IV — Yugular inferior</text>

      <line x1="120" y1="328" x2="356" y2="378" stroke="#7c3aed" strokeWidth="0.6" />
      <text x="356" y="378" fill="#6d28d9" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-violet-300">Va — Triáng. post. superior</text>
      <text x="356" y="388" fill="#6d28d9" style={{ fontSize: "6.5px" }} className="dark:fill-violet-300">Vb — Triáng. post. inferior</text>

      <line x1="250" y1="342" x2="352" y2="408" stroke="#06b6d4" strokeWidth="0.6" />
      <text x="356" y="408" fill="#0891b2" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-cyan-300">VI — Compartimiento anterior</text>
      <text x="356" y="418" fill="#0891b2" style={{ fontSize: "6.5px" }} className="dark:fill-cyan-300">(prelaríngeo, pretraqueal, paratraqueal)</text>

      <line x1="244" y1="466" x2="352" y2="438" stroke="#ec4899" strokeWidth="0.6" />
      <text x="356" y="438" fill="#db2777" fontWeight="600" style={{ fontSize: "7px" }} className="dark:fill-pink-300">VII — Mediastínico superior</text>

      {/* Level label */}
      <text x="220" y="506" textAnchor="middle" fill="#9ca3af" style={{ fontSize: "7px" }} className="dark:fill-gray-500">Estaciones ganglionares cervicales (AJCC/UICC)</text>
    </svg>
  );
}

function NeckAnatomySheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.neck_anatomy_title")} source="Harnsberger HR, Diagnostic Imaging: Head and Neck; Som PM & Curtin HD, Head and Neck Imaging">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.neck_spaces")}</p>
      <NeckAxial />
      <SheetTable
        headers={[t("calc.space"), t("calc.neck_contents"), t("calc.neck_pathology")]}
        rows={[
          [t("calc.neck_pharyngeal_mucosal"), t("calc.neck_pharyngeal_mucosal_c"), t("calc.neck_pharyngeal_mucosal_p")],
          [t("calc.neck_parapharyngeal"), t("calc.neck_parapharyngeal_c"), t("calc.neck_parapharyngeal_p")],
          [t("calc.neck_masticator"), t("calc.neck_masticator_c"), t("calc.neck_masticator_p")],
          [t("calc.neck_parotid"), t("calc.neck_parotid_c"), t("calc.neck_parotid_p")],
          [t("calc.neck_carotid"), t("calc.neck_carotid_c"), t("calc.neck_carotid_p")],
          [t("calc.neck_retropharyngeal"), t("calc.neck_retropharyngeal_c"), t("calc.neck_retropharyngeal_p")],
          [t("calc.neck_prevertebral"), t("calc.neck_prevertebral_c"), t("calc.neck_prevertebral_p")],
          [t("calc.neck_posterior_cervical"), t("calc.neck_posterior_cervical_c"), t("calc.neck_posterior_cervical_p")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.neck_ln_stations")}</p>
      <NeckLymphNodeStations />
      <SheetTable
        headers={[t("calc.level"), t("calc.neck_ln_name"), t("calc.neck_ln_boundaries")]}
        rows={[
          ["Ia", t("calc.neck_ln_ia"), t("calc.neck_ln_ia_b")],
          ["Ib", t("calc.neck_ln_ib"), t("calc.neck_ln_ib_b")],
          ["IIa", t("calc.neck_ln_iia"), t("calc.neck_ln_iia_b")],
          ["IIb", t("calc.neck_ln_iib"), t("calc.neck_ln_iib_b")],
          ["III", t("calc.neck_ln_iii"), t("calc.neck_ln_iii_b")],
          ["IV", t("calc.neck_ln_iv"), t("calc.neck_ln_iv_b")],
          ["Va", t("calc.neck_ln_va"), t("calc.neck_ln_va_b")],
          ["Vb", t("calc.neck_ln_vb"), t("calc.neck_ln_vb_b")],
          ["VI", t("calc.neck_ln_vi"), t("calc.neck_ln_vi_b")],
          ["VII", t("calc.neck_ln_vii"), t("calc.neck_ln_vii_b")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.neck_pharynx_larynx")}</p>
      <SheetTable
        headers={[t("calc.structure"), t("calc.neck_level"), t("calc.neck_key_landmarks")]}
        rows={[
          [t("calc.neck_nasopharynx"), "C1", t("calc.neck_nasopharynx_l")],
          [t("calc.neck_oropharynx"), "C2-C3", t("calc.neck_oropharynx_l")],
          [t("calc.neck_hypopharynx"), "C3-C6", t("calc.neck_hypopharynx_l")],
          [t("calc.neck_supraglottis"), "C3-C4", t("calc.neck_supraglottis_l")],
          [t("calc.neck_glottis"), "C5", t("calc.neck_glottis_l")],
          [t("calc.neck_subglottis"), "C5-C6", t("calc.neck_subglottis_l")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Neuro: Complex Infarct Syndromes ── */

function ComplexInfarctSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.infarct_title")} source="Brazis PW, Localization in Clinical Neurology 8th ed; Caplan LR, Stroke 2019; Goyal M, Neuroradiology 2000">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.infarct_brainstem")}</p>
      <SheetTable
        headers={[t("calc.syndrome"), t("calc.vascular_territory"), t("calc.structures"), t("calc.clinical_key")]}
        rows={[
          ["Wallenberg", "PICA / A. vertebral", t("calc.infarct_wallenberg_s"), t("calc.infarct_wallenberg_c")],
          ["Dejerine", "ASA / perf. vertebral", t("calc.infarct_dejerine_s"), t("calc.infarct_dejerine_c")],
          ["Weber", "Perf. paramedianas (PCA)", t("calc.infarct_weber_s"), t("calc.infarct_weber_c")],
          ["Claude", "Perf. paramedianas (PCA)", t("calc.infarct_claude_s"), t("calc.infarct_claude_c")],
          ["Benedikt", "Perf. paramedianas (PCA)", t("calc.infarct_benedikt_s"), t("calc.infarct_benedikt_c")],
          ["Millard-Gubler", "Perf. pontinas (basilar)", t("calc.infarct_mg_s"), t("calc.infarct_mg_c")],
          ["Foville", "Perf. pontinas (basilar)", t("calc.infarct_foville_s"), t("calc.infarct_foville_c")],
          [t("calc.infarct_locked"), "Basilar / perf. bilat.", t("calc.infarct_locked_s"), t("calc.infarct_locked_c")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.infarct_special")}</p>
      <SheetTable
        headers={[t("calc.pattern"), t("calc.vascular_territory"), t("calc.key_imaging"), t("calc.clinical_key")]}
        rows={[
          ["Percheron", t("calc.infarct_percheron_t"), t("calc.infarct_percheron_i"), t("calc.infarct_percheron_c")],
          ["Top of basilar", t("calc.infarct_topbasilar_t"), t("calc.infarct_topbasilar_i"), t("calc.infarct_topbasilar_c")],
          [t("calc.infarct_watershed_ext"), "ACA/MCA, MCA/PCA", t("calc.infarct_watershed_ext_i"), t("calc.infarct_watershed_ext_c")],
          [t("calc.infarct_watershed_int"), t("calc.infarct_watershed_int_t"), t("calc.infarct_watershed_int_i"), t("calc.infarct_watershed_int_c")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.infarct_secondary")}</p>
      <SheetTable
        headers={[t("calc.pattern"), t("calc.mechanism"), t("calc.key_imaging"), t("calc.timeline")]}
        rows={[
          [t("calc.infarct_olivary"), t("calc.infarct_olivary_m"), t("calc.infarct_olivary_i"), t("calc.infarct_olivary_tl")],
          [t("calc.infarct_wallerian"), t("calc.infarct_wallerian_m"), t("calc.infarct_wallerian_i"), t("calc.infarct_wallerian_tl")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Neuro: Demyelinating Diseases ── */

function DemyelinatingSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.demyel_title")} source="Thompson AJ, Lancet Neurol 2025 (McDonald 2024); Wingerchuk DM, Neurology 2015; Banwell B, Lancet Neurol 2023">
      <SheetTable
        headers={[t("calc.disease"), t("calc.key_mri_findings"), t("calc.distribution"), t("calc.ddx_clue")]}
        rows={[
          [t("calc.demyel_ms"), t("calc.demyel_ms_f"), t("calc.demyel_ms_d"), t("calc.demyel_ms_dx")],
          [t("calc.demyel_nmosd"), t("calc.demyel_nmosd_f"), t("calc.demyel_nmosd_d"), t("calc.demyel_nmosd_dx")],
          ["MOGAD", t("calc.demyel_mogad_f"), t("calc.demyel_mogad_d"), t("calc.demyel_mogad_dx")],
          ["ADEM", t("calc.demyel_adem_f"), t("calc.demyel_adem_d"), t("calc.demyel_adem_dx")],
          ["PML", t("calc.demyel_pml_f"), t("calc.demyel_pml_d"), t("calc.demyel_pml_dx")],
          [t("calc.demyel_osm"), t("calc.demyel_osm_f"), t("calc.demyel_osm_d"), t("calc.demyel_osm_dx")],
          ["Marchiafava-Bignami", t("calc.demyel_mb_f"), t("calc.demyel_mb_d"), t("calc.demyel_mb_dx")],
          [t("calc.demyel_balo"), t("calc.demyel_balo_f"), t("calc.demyel_balo_d"), t("calc.demyel_balo_dx")],
          ["Susac", t("calc.demyel_susac_f"), t("calc.demyel_susac_d"), t("calc.demyel_susac_dx")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.demyel_mcdonald")}</p>
      <SheetTable
        headers={[t("calc.criterion"), t("calc.requirement")]}
        rows={[
          [t("calc.demyel_dis"), t("calc.demyel_dis_req")],
          [t("calc.demyel_dit"), t("calc.demyel_dit_req")],
          [t("calc.demyel_cvs"), t("calc.demyel_cvs_req")],
          [t("calc.demyel_prl"), t("calc.demyel_prl_req")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Neuro: Degenerative Diseases ── */

function DegenerativeSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.degen_title")} source="Defined imaging signs per Harper L, JNNP 2015; Quattrone A, Radiology 2008; Collie DA, AJNR 2003">
      <SheetTable
        headers={[t("calc.disease"), t("calc.key_mri_sign"), t("calc.atrophy_pattern"), t("calc.ddx_clue")]}
        rows={[
          [t("calc.degen_ad"), t("calc.degen_ad_s"), t("calc.degen_ad_a"), t("calc.degen_ad_dx")],
          [t("calc.degen_ftd_bv"), t("calc.degen_ftd_bv_s"), t("calc.degen_ftd_bv_a"), t("calc.degen_ftd_bv_dx")],
          [t("calc.degen_ftd_sem"), t("calc.degen_ftd_sem_s"), t("calc.degen_ftd_sem_a"), t("calc.degen_ftd_sem_dx")],
          [t("calc.degen_ftd_nf"), t("calc.degen_ftd_nf_s"), t("calc.degen_ftd_nf_a"), t("calc.degen_ftd_nf_dx")],
          [t("calc.degen_dlb"), t("calc.degen_dlb_s"), t("calc.degen_dlb_a"), t("calc.degen_dlb_dx")],
          [t("calc.degen_pd"), t("calc.degen_pd_s"), t("calc.degen_pd_a"), t("calc.degen_pd_dx")],
          ["MSA-C", t("calc.degen_msac_s"), t("calc.degen_msac_a"), t("calc.degen_msac_dx")],
          ["MSA-P", t("calc.degen_msap_s"), t("calc.degen_msap_a"), t("calc.degen_msap_dx")],
          ["PSP", t("calc.degen_psp_s"), t("calc.degen_psp_a"), t("calc.degen_psp_dx")],
          ["CBD", t("calc.degen_cbd_s"), t("calc.degen_cbd_a"), t("calc.degen_cbd_dx")],
          [t("calc.degen_hd"), t("calc.degen_hd_s"), t("calc.degen_hd_a"), t("calc.degen_hd_dx")],
          ["ALS/ELA", t("calc.degen_als_s"), t("calc.degen_als_a"), t("calc.degen_als_dx")],
          ["CJD/ECJ", t("calc.degen_cjd_s"), t("calc.degen_cjd_a"), t("calc.degen_cjd_dx")],
          [t("calc.degen_nph"), t("calc.degen_nph_s"), t("calc.degen_nph_a"), t("calc.degen_nph_dx")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Thorax: Interstitial Lung Diseases ── */

function InterstitialLungSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.ild_title")} source="Raghu G et al, ATS/ERS/JRS/ALAT 2022 (IPF); Raghu G et al, AJRCCM 2020 (HP); Travis WD et al, AJRCCM 2013">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.ild_uip_class")}</p>
      <SheetTable
        headers={[t("calc.ild_pattern"), t("calc.ild_hrct_features"), t("calc.ild_distribution")]}
        rows={[
          [t("calc.ild_uip_typical"), t("calc.ild_uip_typical_f"), t("calc.ild_uip_typical_d")],
          [t("calc.ild_uip_probable"), t("calc.ild_uip_probable_f"), t("calc.ild_uip_probable_d")],
          [t("calc.ild_uip_indet"), t("calc.ild_uip_indet_f"), t("calc.ild_uip_indet_d")],
          [t("calc.ild_uip_alt"), t("calc.ild_uip_alt_f"), t("calc.ild_uip_alt_d")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.ild_hp_class")}</p>
      <SheetTable
        headers={[t("calc.ild_pattern"), t("calc.ild_hrct_features"), t("calc.ild_distribution")]}
        rows={[
          [t("calc.ild_hp_typical"), t("calc.ild_hp_typical_f"), t("calc.ild_hp_typical_d")],
          [t("calc.ild_hp_compatible"), t("calc.ild_hp_compatible_f"), t("calc.ild_hp_compatible_d")],
          [t("calc.ild_hp_indet"), t("calc.ild_hp_indet_f"), t("calc.ild_hp_indet_d")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.ild_other")}</p>
      <SheetTable
        headers={[t("calc.ild_pattern"), t("calc.ild_hrct_features"), t("calc.ild_key_clue")]}
        rows={[
          ["NSIP", t("calc.ild_nsip_f"), t("calc.ild_nsip_c")],
          [t("calc.ild_op"), t("calc.ild_op_f"), t("calc.ild_op_c")],
          ["LIP", t("calc.ild_lip_f"), t("calc.ild_lip_c")],
          ["DIP", t("calc.ild_dip_f"), t("calc.ild_dip_c")],
        ]}
      />
    </CheatSheet>
  );
}

/* ── Pediatrics: Hip Ultrasound & DDH ── */

function PediatricHipUSSheet() {
  const t = useT();
  return (
    <CheatSheet title={t("calc.hip_us_title")} source="Graf R, J Pediatr Orthop 1984; ACR Appropriateness Criteria 2019; AIUM Practice Parameter 2018">
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">{t("calc.hip_graf")}</p>
      <SheetTable
        headers={[t("calc.type"), t("calc.hip_alpha"), t("calc.hip_beta"), t("calc.description")]}
        rows={[
          ["I", "≥ 60°", "< 77°", t("calc.hip_type1")],
          ["IIa", "50–59°", "—", t("calc.hip_type2a")],
          ["IIb", "50–59°", "—", t("calc.hip_type2b")],
          ["IIc", "43–49°", "< 77°", t("calc.hip_type2c")],
          ["IId", "43–49°", "> 77°", t("calc.hip_type2d")],
          ["IIIa", "< 43°", "—", t("calc.hip_type3a")],
          ["IIIb", "< 43°", "—", t("calc.hip_type3b")],
          ["IV", "< 43°", "—", t("calc.hip_type4")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.hip_angles")}</p>
      <SheetTable
        headers={[t("calc.measurement"), t("calc.definition"), t("calc.interpretation")]}
        rows={[
          [t("calc.hip_alpha_angle"), t("calc.hip_alpha_def"), t("calc.hip_alpha_int")],
          [t("calc.hip_beta_angle"), t("calc.hip_beta_def"), t("calc.hip_beta_int")],
        ]}
      />
      <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-3">{t("calc.hip_treatment")}</p>
      <SheetTable
        headers={[t("calc.finding"), t("calc.age"), t("calc.recommendation")]}
        rows={[
          [t("calc.hip_tx_2a"), "< 3 m", t("calc.hip_tx_2a_rec")],
          [t("calc.hip_tx_2b"), "> 3 m", t("calc.hip_tx_2b_rec")],
          [t("calc.hip_tx_3_red"), "< 6 m", t("calc.hip_tx_3_red_rec")],
          [t("calc.hip_tx_3_irred"), t("calc.any_age"), t("calc.hip_tx_3_irred_rec")],
          [t("calc.hip_tx_failed"), "> 6–12 m", t("calc.hip_tx_failed_rec")],
        ]}
      />
    </CheatSheet>
  );
}

/* ═══════════════════════════════════════════
   Main Tab Component
   ═══════════════════════════════════════════ */

type CalcId = "adrenal" | "tirads" | "pirads" | "bosniak" | "thyroid" | "prostate" | "aspects" | "ontrack" | "renal" | "lung_tnm" | "larynx_tnm" | "nodule_dt" | "t1t2_mapping";

const CALCULATORS: { id: CalcId; emoji: string }[] = [
  { id: "adrenal", emoji: "🔬" },
  { id: "tirads", emoji: "🦋" },
  { id: "pirads", emoji: "♂" },
  { id: "bosniak", emoji: "🫘" },
  { id: "thyroid", emoji: "📐" },
  { id: "prostate", emoji: "📏" },
  { id: "aspects", emoji: "🧠" },
  { id: "ontrack", emoji: "💪" },
  { id: "renal", emoji: "🫘" },
  { id: "lung_tnm", emoji: "🫁" },
  { id: "larynx_tnm", emoji: "🗣️" },
  { id: "nodule_dt", emoji: "📈" },
  { id: "t1t2_mapping", emoji: "❤️‍🔥" },
];

export function CalculatorsTab() {
  const t = useT();
  const [openCalc, setOpenCalc] = useState<CalcId | null>(null);
  const [search, setSearch] = useState("");

  const calcLabels: Record<CalcId, string> = {
    adrenal: t("calc.adrenal_title"),
    tirads: "ACR TI-RADS",
    pirads: "PI-RADS v2.1",
    bosniak: "Bosniak 2019",
    thyroid: t("calc.thyroid_title"),
    prostate: t("calc.prostate_title"),
    aspects: "ASPECTS",
    ontrack: t("calc.ontrack_title"),
    renal: t("calc.renal_title"),
    lung_tnm: t("calc.lung_tnm_title"),
    larynx_tnm: t("calc.larynx_tnm_title"),
    nodule_dt: t("calc.dt_title"),
    t1t2_mapping: "T1/T2 Mapping & ECV",
  };

  const q = search.toLowerCase();
  const filteredCalcs = CALCULATORS.filter(
    (c) => !q || calcLabels[c.id].toLowerCase().includes(q),
  );

  const [openSection, setOpenSection] = useState<string | null>(null);

  type SheetEntry = { id: string; component: React.ReactNode; label: string };
  type SheetSection = { key: string; label: string; icon: string; sheets: SheetEntry[] };

  const sheetSections: SheetSection[] = useMemo(() => [
    {
      key: "thorax", label: t("calc.section_thorax"), icon: "🫁",
      sheets: [
        { id: "lungrads", component: <LungRadsSheet />, label: "Lung-RADS" },
        { id: "fleischner", component: <FleischnerSheet />, label: "Fleischner 2017" },
        { id: "ild", component: <InterstitialLungSheet />, label: t("calc.ild_title") },
        { id: "bts", component: <BtsNodulesSheet />, label: "BTS 2015" },
        { id: "thyroid_inc", component: <ThyroidIncidentalSheet />, label: t("calc.thyroid_incidental_title") },
        { id: "mediastinal_ln", component: <MediastinalLNSheet />, label: t("calc.mediastinal_ln_title") },
      ],
    },
    {
      key: "abdomen", label: t("calc.section_abdomen"), icon: "🩻",
      sheets: [
        { id: "lirads", component: <LiradsSheet />, label: "LI-RADS" },
        { id: "liver", component: <LiverIncidentalSheet />, label: t("calc.liver_title") },
        { id: "adrenal_inc", component: <AdrenalIncidentalSheet />, label: t("calc.adrenal_incidental_title") },
        { id: "pancreas", component: <PancreaticCystSheet />, label: t("calc.pancreas_title") },
        { id: "gb_polyp", component: <GallbladderPolypSheet />, label: t("calc.gb_polyp_title") },
        { id: "ovarian", component: <OvarianIncidentalSheet />, label: t("calc.ovarian_title") },
        { id: "orads", component: <OradsSheet />, label: "O-RADS" },
        { id: "torsion", component: <TesticularTorsionSheet />, label: t("calc.torsion_title") },
        { id: "diverticulitis", component: <DiverticulitisSheet />, label: t("calc.divert_title") },
      ],
    },
    {
      key: "breast", label: t("calc.section_breast"), icon: "🎗️",
      sheets: [
        { id: "birads", component: <BiradsSheet />, label: "BI-RADS" },
        { id: "breast_density", component: <BreastDensitySheet />, label: t("calc.breast_density_title") },
        { id: "breast_us", component: <BreastUSLexiconSheet />, label: t("calc.breast_us_title") },
        { id: "breast_screening", component: <BreastScreeningSheet />, label: t("calc.breast_screening_title") },
        { id: "breast_implant", component: <BreastImplantSheet />, label: t("calc.breast_implant_title") },
      ],
    },
    {
      key: "neuro", label: t("calc.section_neuro"), icon: "🧠",
      sheets: [
        { id: "fazekas", component: <FazekasSheet />, label: t("calc.fazekas_title") },
        { id: "vasc_terr", component: <VascularTerritoriesSheet />, label: t("calc.vasc_territories_title") },
        { id: "cerebral_aneur", component: <CerebralAneurysmSheet />, label: t("calc.cerebral_aneurysm_title") },
        { id: "fisher", component: <FisherSAHSheet />, label: t("calc.fisher_title") },
        { id: "brain_tumor", component: <BrainTumorSheet />, label: t("calc.brain_tumor_title") },
        { id: "ct_perfusion", component: <CTPerfusionSheet />, label: t("calc.ctp_title") },
        { id: "neck_anatomy", component: <NeckAnatomySheet />, label: t("calc.neck_anatomy_title") },
        { id: "complex_infarct", component: <ComplexInfarctSheet />, label: t("calc.infarct_title") },
        { id: "demyelinating", component: <DemyelinatingSheet />, label: t("calc.demyel_title") },
        { id: "degenerative", component: <DegenerativeSheet />, label: t("calc.degen_title") },
      ],
    },
    {
      key: "msk", label: t("calc.section_msk"), icon: "🦴",
      sheets: [
        { id: "mri_shoulder", component: <MRIShoulderSheet />, label: t("calc.mri_shoulder_title") },
        { id: "mri_knee", component: <MRIKneeSheet />, label: t("calc.mri_knee_title") },
        { id: "mri_ankle", component: <MRIAnkleSheet />, label: t("calc.mri_ankle_title") },
        { id: "mri_thigh_leg", component: <MRIThighLegSheet />, label: t("calc.mri_thigh_title") },
        { id: "rc", component: <RotatorCuffSheet />, label: t("calc.rc_title") },
        { id: "bone_tumor", component: <BoneTumorSheet />, label: t("calc.bone_tumor_title") },
        { id: "vfx", component: <VertebralFractureSheet />, label: t("calc.vfx_title") },
        { id: "spine_nom", component: <SpineNomenclatureSheet />, label: t("calc.spine_nomen_title") },
        { id: "foraminal", component: <ForaminalStenosisSheet />, label: t("calc.foraminal_title") },
        { id: "canal", component: <CanalStenosisSheet />, label: t("calc.canal_title") },
      ],
    },
    {
      key: "vascular", label: t("calc.section_vascular"), icon: "❤️",
      sheets: [
        { id: "whole_aorta", component: <WholeAortaCTASheet />, label: t("calc.whole_aorta_title") },
        { id: "aorta", component: <AorticAneurysmSheet />, label: t("calc.aorta_title") },
        { id: "dissection", component: <AorticDissectionSheet />, label: t("calc.dissection_title") },
        { id: "carotid", component: <CarotidStenosisSheet />, label: t("calc.carotid_title") },
        { id: "pad", component: <PadClassSheet />, label: t("calc.pad_title") },
        { id: "dvt_pe", component: <DVTPESheet />, label: t("calc.dvt_pe_title") },
        { id: "ri", component: <ResistiveIndexSheet />, label: t("calc.ri_title") },
        { id: "transplant_us", component: <TransplantUSSheet />, label: t("calc.tx_us_title") },
        { id: "cadrads", component: <CadRadsSheet />, label: "CAD-RADS 2.0" },
        { id: "cardiac_mri", component: <CardiacMRISheet />, label: t("calc.cmr_title") },
      ],
    },
    {
      key: "pediatrics", label: t("calc.section_pediatrics"), icon: "👶",
      sheets: [
        { id: "ped_cxr", component: <PediatricCXRSheet />, label: t("calc.ped_cxr") },
        { id: "ped_hydro", component: <PediatricHydronephrosisSheet />, label: t("calc.ped_hydro") },
        { id: "ped_tumors", component: <PediatricTumorsSheet />, label: t("calc.ped_tumors") },
        { id: "ped_crypto", component: <CryptorchidismSheet />, label: t("calc.ped_crypto") },
        { id: "ped_transf", component: <TransfontanellarUSSheet />, label: t("calc.ped_transf") },
        { id: "ped_hip", component: <PediatricHipUSSheet />, label: t("calc.hip_us_title") },
      ],
    },
  ], [t]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Calculator className="h-4 w-4 text-brand" />
          {t("calc.tab_title")}
        </h2>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{t("calc.tab_subtitle")}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          placeholder={t("calc.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Calculators */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
          {t("calc.calculators")}
        </p>
        <div className="space-y-1">
          {filteredCalcs.map((c) => (
            <div key={c.id} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCalc(openCalc === c.id ? null : c.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                  openCalc === c.id
                    ? "bg-brand/5 dark:bg-brand/10"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              >
                <span className="text-sm">{c.emoji}</span>
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex-1">{calcLabels[c.id]}</span>
                {openCalc === c.id
                  ? <ChevronDown className="h-3 w-3 text-gray-400" />
                  : <ChevronRight className="h-3 w-3 text-gray-400" />}
              </button>
              {openCalc === c.id && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
                  {c.id === "adrenal" && <AdrenalWashout />}
                  {c.id === "tirads" && <TiradsCalc />}
                  {c.id === "pirads" && <PiradsCalc />}
                  {c.id === "bosniak" && <BosniakCalc />}
                  {c.id === "thyroid" && <ThyroidVolume />}
                  {c.id === "prostate" && <ProstateVolume />}
                  {c.id === "aspects" && <AspectsCalc />}
                  {c.id === "ontrack" && <OnTrackOffTrack />}
                  {c.id === "renal" && <RenalLesionCalc />}
                  {c.id === "lung_tnm" && <LungTNMCalc />}
                  {c.id === "larynx_tnm" && <LarynxTNMCalc />}
                  {c.id === "nodule_dt" && <NoduleDTCalc />}
                  {c.id === "t1t2_mapping" && <T1T2MappingCalc />}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cheat Sheets — grouped by section */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
          {t("calc.cheat_sheets")}
        </p>
        <div className="space-y-1.5">
          {sheetSections.map((sec) => {
            const filtered = sec.sheets.filter((s) => !q || s.label.toLowerCase().includes(q) || sec.label.toLowerCase().includes(q));
            if (q && filtered.length === 0) return null;
            const isOpen = openSection === sec.key || !!q;
            return (
              <div key={sec.key} className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenSection(openSection === sec.key ? null : sec.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    isOpen ? "bg-gray-50 dark:bg-gray-800/50" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  }`}
                >
                  <span className="text-sm">{sec.icon}</span>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex-1">{sec.label}</span>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{filtered.length}</Badge>
                  {isOpen
                    ? <ChevronDown className="h-3 w-3 text-gray-400" />
                    : <ChevronRight className="h-3 w-3 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="px-2 pb-2 space-y-1">
                    {(q ? filtered : sec.sheets).map((s) => (
                      <div key={s.id}>{s.component}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
