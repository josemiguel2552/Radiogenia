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
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
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
  const copyText = [
    apw !== null ? `APW: ${apw.toFixed(1)}%` : "",
    rpw !== null ? `RPW: ${rpw.toFixed(1)}%` : "",
    result ? result.text : "",
  ].filter(Boolean).join(". ");

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

  const copyParts: string[] = [];
  if (rightVol !== null) copyParts.push(`${t("calc.right_lobe")}: ${rightVol.toFixed(1)} mL`);
  if (leftVol !== null) copyParts.push(`${t("calc.left_lobe")}: ${leftVol.toFixed(1)} mL`);
  if (total !== null) copyParts.push(`${t("calc.total_volume")}: ${total.toFixed(1)} mL`);
  if (!isNaN(isthN) && isthmus) copyParts.push(`${t("calc.isthmus")}: ${isthN} mm`);

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
      {copyParts.length > 0 && <CopyButton text={copyParts.join(". ")} />}
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

  const copyParts: string[] = [];
  if (vol !== null) copyParts.push(`${t("calc.prostate_volume")}: ${vol.toFixed(1)} mL`);
  if (density !== null) copyParts.push(`PSA density: ${density.toFixed(3)} ng/mL/cc`);

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
      {copyParts.length > 0 && <CopyButton text={copyParts.join(". ")} />}
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

  const categoryLabels: Record<string, string> = {
    composition: t("calc.tirads_composition"),
    echogenicity: t("calc.tirads_echogenicity"),
    shape: t("calc.tirads_shape"),
    margin: t("calc.tirads_margin"),
    foci: t("calc.tirads_foci"),
  };

  const totalPts = TIRADS_CATEGORIES.reduce((sum, cat) => {
    const sel = selections[cat.key];
    if (!sel) return sum;
    const opt = cat.options.find((o) => o.key === sel);
    return sum + (opt?.pts ?? 0);
  }, 0);

  const allSelected = TIRADS_CATEGORIES.every((cat) => selections[cat.key]);
  const result = allSelected ? getTiradsLevel(totalPts) : null;

  const copyText = result
    ? `ACR TI-RADS: ${result.level} (${result.label}, ${totalPts} pts). ${getTiradsRec(result.level, t)}`
    : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">ACR TI-RADS 2017</p>
        <ResetButton onClick={() => setSelections({})} />
      </div>
      {TIRADS_CATEGORIES.map((cat) => (
        <div key={cat.key}>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{categoryLabels[cat.key]}</Label>
          <OptionPills
            options={cat.options.map((o) => ({ key: o.key, label: `${o.label} (${o.pts})` }))}
            value={selections[cat.key] || ""}
            onChange={(v) => setSelections((p) => ({ ...p, [cat.key]: v }))}
          />
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

  const copyText = score ? `PI-RADS ${score}: ${piradsLabels[score]}` : "";

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
  const copyText = result ? `Bosniak ${result.cls}: ${result.risk}` : "";

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

  const copyText = `ASPECTS: ${score}/10. ${interpret.text}`;

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
  const [tStage, setTStage] = useState("");
  const [nStage, setNStage] = useState("");
  const [mStage, setMStage] = useState("");

  const tOptions = [
    { key: "Tis", label: "Tis" },
    { key: "T1mi", label: "T1mi" },
    { key: "T1a", label: "T1a" },
    { key: "T1b", label: "T1b" },
    { key: "T1c", label: "T1c" },
    { key: "T2a", label: "T2a" },
    { key: "T2b", label: "T2b" },
    { key: "T3", label: "T3" },
    { key: "T4", label: "T4" },
  ];

  const nOptions = [
    { key: "N0", label: "N0" },
    { key: "N1", label: "N1" },
    { key: "N2a", label: "N2a" },
    { key: "N2b", label: "N2b" },
    { key: "N3", label: "N3" },
  ];

  const mOptions = [
    { key: "M0", label: "M0" },
    { key: "M1a", label: "M1a" },
    { key: "M1b", label: "M1b" },
    { key: "M1c", label: "M1c" },
  ];

  const tDescs: Record<string, string> = {
    Tis: t("calc.lung_tis"),
    T1mi: t("calc.lung_t1mi"),
    T1a: t("calc.lung_t1a"),
    T1b: t("calc.lung_t1b"),
    T1c: t("calc.lung_t1c"),
    T2a: t("calc.lung_t2a"),
    T2b: t("calc.lung_t2b"),
    T3: t("calc.lung_t3"),
    T4: t("calc.lung_t4"),
  };

  const nDescs: Record<string, string> = {
    N0: t("calc.lung_n0"),
    N1: t("calc.lung_n1"),
    N2a: t("calc.lung_n2a"),
    N2b: t("calc.lung_n2b"),
    N3: t("calc.lung_n3"),
  };

  const mDescs: Record<string, string> = {
    M0: t("calc.lung_m0"),
    M1a: t("calc.lung_m1a"),
    M1b: t("calc.lung_m1b"),
    M1c: t("calc.lung_m1c"),
  };

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
      if (isT12) return { stage: "IIIB", color: "red" };
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
  const descParts: string[] = [];
  if (tStage) descParts.push(`${tStage}: ${tDescs[tStage]}`);
  if (nStage) descParts.push(`${nStage}: ${nDescs[nStage]}`);
  if (mStage) descParts.push(`${mStage}: ${mDescs[mStage]}`);
  const copyText = result ? `${tStage} ${nStage} ${mStage} — ${t("calc.stage")} ${result.stage}. ${descParts.join(". ")}` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">IASLC TNM 9th ed. (2024)</p>
        <ResetButton onClick={() => { setTStage(""); setNStage(""); setMStage(""); }} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.t_stage")}</Label>
        <OptionPills options={tOptions} value={tStage} onChange={setTStage} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.n_stage")}</Label>
        <OptionPills options={nOptions} value={nStage} onChange={setNStage} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.m_stage")}</Label>
        <OptionPills options={mOptions} value={mStage} onChange={setMStage} />
      </div>
      {tStage && <p className="text-[10px] text-gray-500">{tStage}: {tDescs[tStage]}</p>}
      {nStage && <p className="text-[10px] text-gray-500">{nStage}: {nDescs[nStage]}</p>}
      {mStage && <p className="text-[10px] text-gray-500">{mStage}: {mDescs[mStage]}</p>}
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
  const [tStage, setTStage] = useState("");
  const [nStage, setNStage] = useState("");
  const [mStage, setMStage] = useState("");

  const supraglotticT = [
    { key: "T1", label: "T1" },
    { key: "T2", label: "T2" },
    { key: "T3", label: "T3" },
    { key: "T4a", label: "T4a" },
    { key: "T4b", label: "T4b" },
  ];

  const glotticT = [
    { key: "T1a", label: "T1a" },
    { key: "T1b", label: "T1b" },
    { key: "T2", label: "T2" },
    { key: "T3", label: "T3" },
    { key: "T4a", label: "T4a" },
    { key: "T4b", label: "T4b" },
  ];

  const subglotticT = [
    { key: "T1", label: "T1" },
    { key: "T2", label: "T2" },
    { key: "T3", label: "T3" },
    { key: "T4a", label: "T4a" },
    { key: "T4b", label: "T4b" },
  ];

  const tOptionsMap: Record<string, { key: string; label: string }[]> = {
    supraglottic: supraglotticT,
    glottic: glotticT,
    subglottic: subglotticT,
  };

  const nOptions = [
    { key: "N0", label: "N0" },
    { key: "N1", label: "N1" },
    { key: "N2a", label: "N2a" },
    { key: "N2b", label: "N2b" },
    { key: "N2c", label: "N2c" },
    { key: "N3a", label: "N3a" },
    { key: "N3b", label: "N3b" },
  ];

  const mOptions = [
    { key: "M0", label: "M0" },
    { key: "M1", label: "M1" },
  ];

  const tDescKeys: Record<string, Record<string, string>> = {
    supraglottic: {
      T1: "calc.larynx_t1", T2: "calc.larynx_t2", T3: "calc.larynx_t3", T4a: "calc.larynx_t4a", T4b: "calc.larynx_t4b",
    },
    glottic: {
      T1a: "calc.larynx_t1a", T1b: "calc.larynx_t1b", T2: "calc.larynx_t2", T3: "calc.larynx_t3", T4a: "calc.larynx_t4a", T4b: "calc.larynx_t4b",
    },
    subglottic: {
      T1: "calc.larynx_t1", T2: "calc.larynx_t2", T3: "calc.larynx_t3", T4a: "calc.larynx_t4a", T4b: "calc.larynx_t4b",
    },
  };

  const nDescKeys: Record<string, string> = {
    N0: "calc.larynx_n0", N1: "calc.larynx_n1", N2a: "calc.larynx_n2a", N2b: "calc.larynx_n2b",
    N2c: "calc.larynx_n2c", N3a: "calc.larynx_n3a", N3b: "calc.larynx_n3b",
  };

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
  const tDesc = subsite && tStage && tDescKeys[subsite]?.[tStage] ? t(tDescKeys[subsite][tStage]) : "";
  const nDesc = nStage ? t(nDescKeys[nStage]) : "";
  const copyText = result ? `${tStage} ${nStage} ${mStage} — ${t("calc.stage")} ${result.stage}` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">AJCC 8th ed. (2017)</p>
        <ResetButton onClick={() => { setSubsite(""); setTStage(""); setNStage(""); setMStage(""); }} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.subsite")}</Label>
        <OptionPills
          options={[
            { key: "supraglottic", label: t("calc.supraglottic") },
            { key: "glottic", label: t("calc.glottic") },
            { key: "subglottic", label: t("calc.subglottic") },
          ]}
          value={subsite}
          onChange={(v) => { setSubsite(v); setTStage(""); }}
        />
      </div>
      {subsite && (
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.t_stage")}</Label>
          <OptionPills options={tOptionsMap[subsite]} value={tStage} onChange={setTStage} />
        </div>
      )}
      {subsite && (
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.n_stage")}</Label>
          <OptionPills options={nOptions} value={nStage} onChange={setNStage} />
        </div>
      )}
      {subsite && (
        <div>
          <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.m_stage")}</Label>
          <OptionPills options={mOptions} value={mStage} onChange={setMStage} />
        </div>
      )}
      {tStage && tDesc && <p className="text-[10px] text-gray-500">{tStage}: {tDesc}</p>}
      {nStage && nDesc && <p className="text-[10px] text-gray-500">{nStage}: {nDesc}</p>}
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
        <BookOpenCheck className="h-3.5 w-3.5 text-teal-500 shrink-0" />
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
    <CheatSheet title="O-RADS" source="ACR O-RADS MRI 2020">
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
    <CheatSheet title="Lung-RADS v2022" source="ACR Lung-RADS v2022 (Defined et al., Radiology 2022)">
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
    <CheatSheet title={t("calc.gb_polyp_title")} source="European Society of Gastrointestinal & Abdominal Radiology (Defined et al., Eur Radiol 2017) / Joint ESG-ESGAR 2022">
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
          [t("calc.aorta_root"), "> 5.5 cm", "Marfan > 5.0 cm; Loeys-Dietz > 4.2 cm"],
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
    <CheatSheet title={t("calc.foraminal_title")} source="Lee et al., AJNR 1988 / Defined by Wildermuth et al., Radiology 1998">
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
          ["2 (" + t("calc.moderate") + ")", "26–40%", t("calc.vfx_g2")],
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
    <CheatSheet title={t("calc.breast_implant_title")} source="ACR / FDA (2020) / Defined NCCN">
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
    <CheatSheet title={t("calc.vasc_territories_title")} source="Defined anatomy / Tatu et al., Neurology 1998">
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
    <CheatSheet title={t("calc.dvt_pe_title")} source="Defined radiology findings / Defined CTPA reporting">
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
    <CheatSheet title={t("calc.divert_title")} source="Modified Hinchey classification (Wasvary et al., Dis Colon Rectum 1999); WSES guidelines 2020">
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
   Main Tab Component
   ═══════════════════════════════════════════ */

type CalcId = "adrenal" | "tirads" | "pirads" | "bosniak" | "thyroid" | "prostate" | "aspects" | "ontrack" | "renal" | "lung_tnm" | "larynx_tnm";

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
      ],
    },
    {
      key: "msk", label: t("calc.section_msk"), icon: "🦴",
      sheets: [
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
