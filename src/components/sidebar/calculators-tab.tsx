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
      return dwin >= 4 ? 4 : 3;
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

  function classify(): { cls: string; risk: string; color: "green" | "blue" | "yellow" | "red" } | null {
    if (!septa || !wall || !enhancement) return null;
    const en = enhancement === "yes";
    const thick = wall === "thick" || septa === "thick";

    if (!en && septa === "none" && wall === "thin") return { cls: "I", risk: t("calc.bosniak_i"), color: "green" };
    if (!en && septa === "thin") return { cls: "II", risk: t("calc.bosniak_ii"), color: "green" };
    if (en && septa === "thin" && wall === "thin") return { cls: "IIF", risk: t("calc.bosniak_iif"), color: "blue" };
    if (en && thick && wall !== "nodular") return { cls: "III", risk: t("calc.bosniak_iii"), color: "yellow" };
    if (wall === "nodular" || (en && thick)) return { cls: "IV", risk: t("calc.bosniak_iv"), color: "red" };
    return { cls: "IIF", risk: t("calc.bosniak_iif"), color: "blue" };
  }

  const result = classify();
  const copyText = result ? `Bosniak ${result.cls}: ${result.risk}` : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-gray-400">Bosniak v2019 (Silverman et al.)</p>
        <ResetButton onClick={() => { setSepta(""); setWall(""); setEnhancement(""); }} />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_septa")}</Label>
        <OptionPills
          options={[
            { key: "none", label: t("calc.bosniak_no_septa") },
            { key: "thin", label: t("calc.bosniak_thin_septa") },
            { key: "thick", label: t("calc.bosniak_thick_septa") },
          ]}
          value={septa}
          onChange={setSepta}
        />
      </div>
      <div>
        <Label className="text-[11px] text-gray-500 dark:text-gray-400 mb-1 block">{t("calc.bosniak_wall")}</Label>
        <OptionPills
          options={[
            { key: "thin", label: t("calc.bosniak_thin_wall") },
            { key: "thick", label: t("calc.bosniak_thick_wall") },
            { key: "nodular", label: t("calc.bosniak_nodular") },
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

/* ═══════════════════════════════════════════
   Main Tab Component
   ═══════════════════════════════════════════ */

type CalcId = "adrenal" | "tirads" | "pirads" | "bosniak" | "thyroid" | "prostate" | "aspects" | "ontrack";

const CALCULATORS: { id: CalcId; emoji: string }[] = [
  { id: "adrenal", emoji: "🔬" },
  { id: "tirads", emoji: "🦋" },
  { id: "pirads", emoji: "♂" },
  { id: "bosniak", emoji: "🫘" },
  { id: "thyroid", emoji: "📐" },
  { id: "prostate", emoji: "📏" },
  { id: "aspects", emoji: "🧠" },
  { id: "ontrack", emoji: "💪" },
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
  };

  const q = search.toLowerCase();
  const filteredCalcs = CALCULATORS.filter(
    (c) => !q || calcLabels[c.id].toLowerCase().includes(q),
  );

  const cheatSheets = useMemo(() => [
    { id: "lungrads", component: <LungRadsSheet />, label: "Lung-RADS" },
    { id: "birads", component: <BiradsSheet />, label: "BI-RADS" },
    { id: "lirads", component: <LiradsSheet />, label: "LI-RADS" },
    { id: "fleischner", component: <FleischnerSheet />, label: "Fleischner" },
    { id: "bts", component: <BtsNodulesSheet />, label: "BTS" },
    { id: "liver", component: <LiverIncidentalSheet />, label: t("calc.liver_title") },
    { id: "adrenal_inc", component: <AdrenalIncidentalSheet />, label: t("calc.adrenal_incidental_title") },
    { id: "pancreas", component: <PancreaticCystSheet />, label: t("calc.pancreas_title") },
    { id: "ovarian", component: <OvarianIncidentalSheet />, label: t("calc.ovarian_title") },
    { id: "gb_polyp", component: <GallbladderPolypSheet />, label: t("calc.gb_polyp_title") },
    { id: "aorta", component: <AorticAneurysmSheet />, label: t("calc.aorta_title") },
    { id: "orads", component: <OradsSheet />, label: "O-RADS" },
    { id: "spine_nom", component: <SpineNomenclatureSheet />, label: t("calc.spine_nomen_title") },
    { id: "foraminal", component: <ForaminalStenosisSheet />, label: t("calc.foraminal_title") },
    { id: "canal", component: <CanalStenosisSheet />, label: t("calc.canal_title") },
    { id: "rc", component: <RotatorCuffSheet />, label: t("calc.rc_title") },
    { id: "bone_tumor", component: <BoneTumorSheet />, label: t("calc.bone_tumor_title") },
    { id: "vfx", component: <VertebralFractureSheet />, label: t("calc.vfx_title") },
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
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cheat Sheets */}
      {(() => {
        const filteredSheets = cheatSheets.filter((s) => !q || s.label.toLowerCase().includes(q));
        if (filteredSheets.length === 0) return null;
        return (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
              {t("calc.cheat_sheets")}
            </p>
            <div className="space-y-1">
              {filteredSheets.map((s) => (
                <div key={s.id}>{s.component}</div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
