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
    <CheatSheet title={t("calc.pancreas_title")} source="ACR Incidental Findings Committee 2017 / AGA 2015">
      <SheetTable
        headers={[t("calc.size"), t("calc.recommendation")]}
        rows={[
          ["< 1.5 cm", t("calc.pancreas_small")],
          ["1.5–2.5 cm", t("calc.pancreas_medium")],
          ["> 2.5 cm", t("calc.pancreas_large")],
          [t("calc.pancreas_worrisome"), t("calc.pancreas_worrisome_rec")],
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
          ["LR-1", t("calc.lirads_1"), t("calc.lirads_1_prob")],
          ["LR-2", t("calc.lirads_2"), t("calc.lirads_2_prob")],
          ["LR-3", t("calc.lirads_3"), t("calc.lirads_3_prob")],
          ["LR-4", t("calc.lirads_4"), t("calc.lirads_4_prob")],
          ["LR-5", t("calc.lirads_5"), t("calc.lirads_5_prob")],
          ["LR-M", t("calc.lirads_m"), t("calc.lirads_m_prob")],
          ["LR-TIV", t("calc.lirads_tiv"), "100%"],
        ]}
      />
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
    <CheatSheet title="BI-RADS" source="ACR BI-RADS Atlas, 5th ed. (2013)">
      <SheetTable
        headers={[t("calc.category"), t("calc.description"), t("calc.recommendation")]}
        rows={[
          ["0", t("calc.birads_0"), t("calc.birads_0_rec")],
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
      ],
    },
    {
      key: "msk", label: t("calc.section_msk"), icon: "🦴",
      sheets: [
        { id: "mri_shoulder", component: <MRIShoulderSheet />, label: t("calc.mri_shoulder_title") },
        { id: "mri_knee", component: <MRIKneeSheet />, label: t("calc.mri_knee_title") },
        { id: "mri_ankle", component: <MRIAnkleSheet />, label: t("calc.mri_ankle_title") },
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
        { id: "aorta", component: <AorticAneurysmSheet />, label: t("calc.aorta_title") },
        { id: "dissection", component: <AorticDissectionSheet />, label: t("calc.dissection_title") },
        { id: "carotid", component: <CarotidStenosisSheet />, label: t("calc.carotid_title") },
        { id: "pad", component: <PadClassSheet />, label: t("calc.pad_title") },
        { id: "dvt_pe", component: <DVTPESheet />, label: t("calc.dvt_pe_title") },
        { id: "ri", component: <ResistiveIndexSheet />, label: t("calc.ri_title") },
        { id: "transplant_us", component: <TransplantUSSheet />, label: t("calc.tx_us_title") },
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
