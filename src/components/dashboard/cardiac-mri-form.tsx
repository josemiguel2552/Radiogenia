"use client";

import { useState, useCallback, useEffect } from "react";
import { ChevronDown, Heart, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Sex = "male" | "female";

interface Range {
  male: [number, number];
  female: [number, number];
}

const LV_RANGES: Record<string, Range> = {
  anteroseptalWall: { male: [0, 12], female: [0, 10] },
  inferolateralWall: { male: [0, 11], female: [0, 10] },
  edVolume: { male: [83, 207], female: [70, 155] },
  edVolumeIndex: { male: [47, 107], female: [45, 93] },
  esVolume: { male: [19, 88], female: [15, 64] },
  esVolumeIndex: { male: [11, 47], female: [10, 38] },
  strokeVolume: { male: [55, 127], female: [47, 99] },
  ejectionFraction: { male: [51, 76], female: [52, 79] },
  mass: { male: [57, 152], female: [43, 103] },
  massIndex: { male: [36, 75], female: [30, 59] },
  eddDimension: { male: [0, 999], female: [0, 999] },
  eddIndex: { male: [0, 30], female: [0, 32] },
};

const RV_RANGES: Record<string, Range> = {
  edVolume: { male: [87, 244], female: [68, 176] },
  edVolumeIndex: { male: [53, 123], female: [48, 104] },
  esVolume: { male: [29, 117], female: [20, 80] },
  esVolumeIndex: { male: [17, 59], female: [13, 48] },
  strokeVolume: { male: [43, 146], female: [39, 109] },
  ejectionFraction: { male: [42, 72], female: [46, 74] },
};

const ATRIA_RANGES: Record<string, Range> = {
  laDimension: { male: [33, 53], female: [31, 51] },
  laDimensionIndex: { male: [16, 29], female: [18, 32] },
  raDimension: { male: [37, 59], female: [32, 54] },
  raDimensionIndex: { male: [21, 32], female: [20, 34] },
};

const T1_RANGE_15T: [number, number] = [942, 1074];
const ECV_RANGE: [number, number] = [20, 31];
const T2_RANGE_15T: [number, number] = [46, 58];

interface NumericField {
  key: string;
  label: string;
  unit: string;
  ranges?: Record<string, Range>;
  rangeKey?: string;
}

const LV_FIELDS: NumericField[] = [
  { key: "anteroseptalWall", label: "Anteroseptal wall thickness", unit: "mm", ranges: LV_RANGES, rangeKey: "anteroseptalWall" },
  { key: "inferolateralWall", label: "Inferolateral wall thickness", unit: "mm", ranges: LV_RANGES, rangeKey: "inferolateralWall" },
  { key: "eddDimension", label: "LV End-diastolic dimension", unit: "mm" },
  { key: "eddIndex", label: "LV End-diastolic dimension index", unit: "mm/m²", ranges: LV_RANGES, rangeKey: "eddIndex" },
  { key: "edVolume", label: "LV End-diastolic volume", unit: "ml", ranges: LV_RANGES, rangeKey: "edVolume" },
  { key: "edVolumeIndex", label: "LV End-diastolic volume index", unit: "ml/m²", ranges: LV_RANGES, rangeKey: "edVolumeIndex" },
  { key: "esVolume", label: "LV End-systolic volume", unit: "ml", ranges: LV_RANGES, rangeKey: "esVolume" },
  { key: "esVolumeIndex", label: "LV End-systolic volume index", unit: "ml/m²", ranges: LV_RANGES, rangeKey: "esVolumeIndex" },
  { key: "strokeVolume", label: "LV Stroke volume", unit: "ml", ranges: LV_RANGES, rangeKey: "strokeVolume" },
  { key: "cardiacOutput", label: "Cardiac output", unit: "L/min" },
  { key: "ejectionFraction", label: "LV Ejection fraction", unit: "%", ranges: LV_RANGES, rangeKey: "ejectionFraction" },
  { key: "mass", label: "LV mass", unit: "g", ranges: LV_RANGES, rangeKey: "mass" },
  { key: "massIndex", label: "LV mass index", unit: "g/m²", ranges: LV_RANGES, rangeKey: "massIndex" },
];

const RV_FIELDS: NumericField[] = [
  { key: "eddDimension", label: "RV End-diastolic dimension", unit: "mm" },
  { key: "edVolume", label: "RV End-diastolic volume", unit: "ml", ranges: RV_RANGES, rangeKey: "edVolume" },
  { key: "edVolumeIndex", label: "RV End-diastolic volume index", unit: "ml/m²", ranges: RV_RANGES, rangeKey: "edVolumeIndex" },
  { key: "esVolume", label: "RV End-systolic volume", unit: "ml", ranges: RV_RANGES, rangeKey: "esVolume" },
  { key: "esVolumeIndex", label: "RV End-systolic volume index", unit: "ml/m²", ranges: RV_RANGES, rangeKey: "esVolumeIndex" },
  { key: "strokeVolume", label: "RV Stroke volume", unit: "ml", ranges: RV_RANGES, rangeKey: "strokeVolume" },
  { key: "ejectionFraction", label: "RV Ejection fraction", unit: "%", ranges: RV_RANGES, rangeKey: "ejectionFraction" },
];

const ATRIA_FIELDS: NumericField[] = [
  { key: "laDimension", label: "LA dimension (4ch transverse)", unit: "mm", ranges: ATRIA_RANGES, rangeKey: "laDimension" },
  { key: "laDimensionIndex", label: "LA dimension index", unit: "mm/m²", ranges: ATRIA_RANGES, rangeKey: "laDimensionIndex" },
  { key: "raDimension", label: "RA dimension (4ch transverse)", unit: "mm", ranges: ATRIA_RANGES, rangeKey: "raDimension" },
  { key: "raDimensionIndex", label: "RA dimension index", unit: "mm/m²", ranges: ATRIA_RANGES, rangeKey: "raDimensionIndex" },
];

const TECHNIQUES = [
  { key: "vectorcardiographic", label: "Vectorcardiographic gating" },
  { key: "scout", label: "Scout images" },
  { key: "cine", label: "SSFP cine imaging" },
  { key: "delayedEnhancement", label: "Late gadolinium enhancement (LGE)" },
  { key: "gadolinium", label: "IV gadolinium contrast" },
  { key: "t1Mapping", label: "T1 mapping" },
  { key: "t2Mapping", label: "T2 mapping" },
  { key: "perfusion", label: "Perfusion imaging" },
  { key: "flow", label: "Flow quantification" },
] as const;

function isAbnormal(value: number, range: [number, number]): boolean {
  return value < range[0] || value > range[1];
}

function rangeLabel(range: [number, number], unit: string): string {
  return `${range[0]}-${range[1]} ${unit}`;
}

interface FormValues {
  [key: string]: string;
}

export interface CardiacMriOutput {
  dictationText: string;
  hasValues: boolean;
}

interface Props {
  outputLanguage: string;
  onOutput: (output: CardiacMriOutput) => void;
}

export function CardiacMriForm({ outputLanguage, onOutput }: Props) {
  const [sex, setSex] = useState<Sex>("male");
  const [bsa, setBsa] = useState("");
  const [fieldStrength, setFieldStrength] = useState("1.5");
  const [heartRate, setHeartRate] = useState("");
  const [examQuality, setExamQuality] = useState("Good");

  const [techniques, setTechniques] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    TECHNIQUES.forEach((t) => { init[t.key] = t.key === "vectorcardiographic" || t.key === "scout" || t.key === "cine"; });
    return init;
  });

  const [lvValues, setLvValues] = useState<FormValues>({});
  const [rvValues, setRvValues] = useState<FormValues>({});
  const [atriaValues, setAtriaValues] = useState<FormValues>({});
  const [lvWallMotion, setLvWallMotion] = useState("Normal");
  const [rvWallMotion, setRvWallMotion] = useState("Normal");

  const [pericardialThickness, setPericardialThickness] = useState("Normal");
  const [pericardialEffusion, setPericardialEffusion] = useState("None");
  const [valves, setValves] = useState("No significant valvular abnormality.");
  const [lateEnhancement, setLateEnhancement] = useState("");

  const [t1Base, setT1Base] = useState("");
  const [t1Mid, setT1Mid] = useState("");
  const [t1Apex, setT1Apex] = useState("");
  const [ecvBase, setEcvBase] = useState("");
  const [ecvMid, setEcvMid] = useState("");
  const [ecvApex, setEcvApex] = useState("");
  const [t2Base, setT2Base] = useState("");
  const [t2Mid, setT2Mid] = useState("");
  const [t2Apex, setT2Apex] = useState("");
  const [hematocrit, setHematocrit] = useState("");

  const [additionalFindings, setAdditionalFindings] = useState("");

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    patient: true, techniques: true, lv: true, rv: false, atria: false,
    pericardium: false, valves: false, mapping: false, lge: false, additional: false,
  });

  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleTechnique = (key: string) => setTechniques((prev) => ({ ...prev, [key]: !prev[key] }));

  const buildDictationText = useCallback((): string => {
    const es = outputLanguage === "es";
    const lines: string[] = [];

    // Techniques
    const selectedTechs = TECHNIQUES.filter((t) => techniques[t.key]);
    if (selectedTechs.length > 0) {
      lines.push(es ? "Técnicas realizadas:" : "Techniques Performed:");
      selectedTechs.forEach((t) => lines.push(`- ${t.label}`));
      lines.push("");
    }

    lines.push(`${es ? "Calidad del examen" : "Exam Quality"}: ${examQuality}`);
    lines.push(`${es ? "Intensidad de campo" : "Field strength"}: ${fieldStrength || "___"} T`);
    if (bsa) lines.push(`BSA: ${bsa} m²`);
    lines.push("");

    // LV
    lines.push(es ? "Ventrículo izquierdo (VI)" : "Left Ventricle (LV)");
    for (const f of LV_FIELDS) {
      const v = lvValues[f.key];
      if (!v) continue;
      const num = parseFloat(v);
      const range = f.ranges && f.rangeKey ? f.ranges[f.rangeKey]?.[sex] : null;
      let rangeStr = "";
      if (range && range[1] < 999) rangeStr = ` (${es ? "normal" : "normal"}: ${range[0]}-${range[1]} ${f.unit} ${es ? "para" : "for"} ${sex === "male" ? (es ? "hombre" : "male") : (es ? "mujer" : "female")})`;
      lines.push(`${f.label}: ${v} ${f.unit}${rangeStr}`);
    }
    if (heartRate && lvValues.cardiacOutput) {
      lines.push(`${es ? "Gasto cardíaco" : "Cardiac output"} = ${lvValues.cardiacOutput} L/min (${es ? "frecuencia cardíaca" : "heart rate"} ${heartRate} bpm)`);
    }
    lines.push(`${es ? "Motilidad regional del VI" : "LV regional wall motion"}: ${lvWallMotion}`);
    lines.push("");

    // RV
    lines.push(es ? "Ventrículo derecho (VD)" : "Right Ventricle (RV)");
    for (const f of RV_FIELDS) {
      const v = rvValues[f.key];
      if (!v) continue;
      const range = f.ranges && f.rangeKey ? f.ranges[f.rangeKey]?.[sex] : null;
      let rangeStr = "";
      if (range) rangeStr = ` (normal: ${range[0]}-${range[1]} ${f.unit} ${es ? "para" : "for"} ${sex === "male" ? (es ? "hombre" : "male") : (es ? "mujer" : "female")})`;
      lines.push(`${f.label}: ${v} ${f.unit}${rangeStr}`);
    }
    lines.push(`${es ? "Motilidad regional del VD" : "RV regional wall motion"}: ${rvWallMotion}`);
    lines.push("");

    // Atria
    lines.push(es ? "Aurículas" : "Atria");
    for (const f of ATRIA_FIELDS) {
      const v = atriaValues[f.key];
      if (!v) continue;
      const range = f.ranges && f.rangeKey ? f.ranges[f.rangeKey]?.[sex] : null;
      let rangeStr = "";
      if (range) rangeStr = ` (normal: ${range[0]}-${range[1]} ${es ? "para" : "for"} ${sex === "male" ? (es ? "hombre" : "male") : (es ? "mujer" : "female")})`;
      lines.push(`${f.label}: ${v} ${f.unit}${rangeStr}`);
    }
    lines.push("");

    // Pericardium
    lines.push(es ? "Pericardio" : "Pericardium");
    lines.push(`${es ? "Grosor pericárdico" : "Pericardial thickness"}: ${pericardialThickness}`);
    lines.push(`${es ? "Derrame pericárdico" : "Pericardial effusion"}: ${pericardialEffusion}`);
    lines.push("");

    // Valves
    lines.push(es ? "Morfología y función valvular" : "Valvular morphology and function");
    lines.push(valves);
    lines.push("");

    // LGE
    if (techniques.delayedEnhancement) {
      lines.push(es ? "Realce tardío de gadolinio (RTG)" : "Late Gadolinium Enhancement (LGE)");
      lines.push(lateEnhancement || (es ? "Sin realce tardío patológico." : "No pathological late enhancement."));
      lines.push("");
    }

    // Mapping
    if (techniques.t1Mapping || techniques.t2Mapping) {
      lines.push(es ? "Mapas de caracterización tisular" : "Tissue Characterization Mapping");
      const ft = fieldStrength || "1.5";
      if (techniques.t1Mapping && (t1Base || t1Mid || t1Apex)) {
        const vals = [t1Base, t1Mid, t1Apex].filter(Boolean);
        const t1Range = ft === "1.5" ? T1_RANGE_15T : [1000, 1200] as [number, number];
        const abnT1 = vals.some((v) => isAbnormal(parseFloat(v), t1Range));
        lines.push(`${es ? "T1 nativo miocárdico del VI a" : "Native myocardial T1 values at"} ${ft}T (Base: ${t1Base || "___"} ms; Mid: ${t1Mid || "___"} ms; Apex: ${t1Apex || "___"} ms) — ${abnT1 ? (es ? "fuera de" : "outside") : (es ? "dentro de" : "within")} ${es ? "los rangos normales locales" : "the local normal ranges"} (${t1Range[0]}-${t1Range[1]} ms).`);
      }
      if (techniques.t1Mapping && (ecvBase || ecvMid || ecvApex)) {
        const abnEcv = [ecvBase, ecvMid, ecvApex].filter(Boolean).some((v) => isAbnormal(parseFloat(v), ECV_RANGE));
        lines.push(`ECV ${es ? "miocárdico del VI" : "LV myocardial"} (Base: ${ecvBase || "___"}%; Mid: ${ecvMid || "___"}%; Apex: ${ecvApex || "___"}%) — ${abnEcv ? (es ? "fuera de" : "outside") : (es ? "dentro de" : "within")} ${es ? "los rangos normales" : "normal ranges"} (${ECV_RANGE[0]}-${ECV_RANGE[1]}%).`);
        if (hematocrit) lines.push(`Hematocrit: ${hematocrit}`);
      }
      if (techniques.t2Mapping && (t2Base || t2Mid || t2Apex)) {
        const t2Range = ft === "1.5" ? T2_RANGE_15T : [40, 52] as [number, number];
        const abnT2 = [t2Base, t2Mid, t2Apex].filter(Boolean).some((v) => isAbnormal(parseFloat(v), t2Range));
        lines.push(`${es ? "T2 nativo miocárdico del VI a" : "Native T2 values at"} ${ft}T (Base: ${t2Base || "___"} ms; Mid: ${t2Mid || "___"} ms; Apex: ${t2Apex || "___"} ms) — ${abnT2 ? (es ? "fuera de" : "outside") : (es ? "dentro de" : "within")} ${es ? "los rangos normales locales" : "the local normal ranges"} (${t2Range[0]}-${t2Range[1]} ms).`);
        if (!abnT2) {
          lines.push(es ? "Sin evidencia de edema miocárdico." : "No evidence of myocardial edema.");
        }
      }
      lines.push("");
    }

    // Additional
    if (additionalFindings.trim()) {
      lines.push(es ? "Hallazgos adicionales" : "Additional Findings");
      lines.push(additionalFindings.trim());
      lines.push("");
    }

    return lines.join("\n");
  }, [
    outputLanguage, sex, bsa, fieldStrength, heartRate, examQuality,
    techniques, lvValues, rvValues, atriaValues, lvWallMotion, rvWallMotion,
    pericardialThickness, pericardialEffusion, valves, lateEnhancement,
    t1Base, t1Mid, t1Apex, ecvBase, ecvMid, ecvApex,
    t2Base, t2Mid, t2Apex, hematocrit, additionalFindings,
  ]);

  useEffect(() => {
    const hasValues = Object.values(lvValues).some(Boolean) || Object.values(rvValues).some(Boolean);
    onOutput({ dictationText: buildDictationText(), hasValues });
  }, [buildDictationText, onOutput, lvValues, rvValues]);

  const handleReset = () => {
    setLvValues({});
    setRvValues({});
    setAtriaValues({});
    setLvWallMotion("Normal");
    setRvWallMotion("Normal");
    setPericardialThickness("Normal");
    setPericardialEffusion("None");
    setValves("No significant valvular abnormality.");
    setLateEnhancement("");
    setT1Base(""); setT1Mid(""); setT1Apex("");
    setEcvBase(""); setEcvMid(""); setEcvApex("");
    setT2Base(""); setT2Mid(""); setT2Apex("");
    setHematocrit("");
    setAdditionalFindings("");
  };

  const es = outputLanguage === "es";

  function MeasurementInput({
    field,
    values,
    setValues,
  }: {
    field: NumericField;
    values: FormValues;
    setValues: React.Dispatch<React.SetStateAction<FormValues>>;
  }) {
    const v = values[field.key] || "";
    const num = parseFloat(v);
    const range = field.ranges && field.rangeKey ? field.ranges[field.rangeKey]?.[sex] : null;
    const abnormal = range && v && !isNaN(num) && range[1] < 999 && isAbnormal(num, range);

    return (
      <div className="flex items-center gap-2 py-0.5">
        <label className="text-[11px] text-gray-600 dark:text-gray-400 min-w-0 flex-1 truncate">{field.label}</label>
        <div className="flex items-center gap-1 shrink-0">
          <Input
            type="number"
            step="any"
            value={v}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className={`w-[72px] h-7 text-xs text-right tabular-nums ${abnormal ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300" : ""}`}
            placeholder="___"
          />
          <span className="text-[10px] text-gray-400 w-[36px]">{field.unit}</span>
        </div>
        {range && range[1] < 999 && (
          <span className={`text-[9px] w-[80px] text-right tabular-nums shrink-0 ${abnormal ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            {rangeLabel(range, "")}
          </span>
        )}
      </div>
    );
  }

  function SectionHeader({ id, label, icon }: { id: string; label: string; icon?: React.ReactNode }) {
    const open = openSections[id];
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
        {icon}
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex-1 text-left">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    );
  }

  const filledCount = [...Object.values(lvValues), ...Object.values(rvValues), ...Object.values(atriaValues)].filter(Boolean).length;

  return (
    <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1 cardiac-form">
      <div className="flex items-center justify-between px-1 mb-1">
        <div className="flex items-center gap-1.5">
          <Heart className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{es ? "RM Cardíaca — Modo experto" : "Cardiac MRI — Expert mode"}</span>
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 tabular-nums">{filledCount} {es ? "valores" : "values"}</Badge>
          )}
          <button type="button" onClick={handleReset} className="text-[10px] text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors">
            <RotateCcw className="h-2.5 w-2.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Patient info */}
      <SectionHeader id="patient" label={es ? "Datos del paciente" : "Patient Data"} />
      {openSections.patient && (
        <div className="px-2 pb-2 space-y-1.5">
          <div className="flex gap-2 items-center">
            <label className="text-[11px] text-gray-500 w-12">{es ? "Sexo" : "Sex"}</label>
            <div className="flex gap-1">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${sex === s ? "bg-brand text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  {s === "male" ? (es ? "Hombre" : "Male") : (es ? "Mujer" : "Female")}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <label className="text-[11px] text-gray-500">BSA</label>
              <Input type="number" step="0.01" value={bsa} onChange={(e) => setBsa(e.target.value)} className="w-16 h-7 text-xs text-right" placeholder="___" />
              <span className="text-[10px] text-gray-400">m²</span>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[11px] text-gray-500">{es ? "Campo" : "Field"}</label>
              <select
                value={fieldStrength}
                onChange={(e) => setFieldStrength(e.target.value)}
                className="h-7 text-xs border rounded px-1.5 bg-white dark:bg-gray-900 dark:border-gray-700"
              >
                <option value="1.5">1.5T</option>
                <option value="3">3T</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <label className="text-[11px] text-gray-500">HR</label>
              <Input type="number" value={heartRate} onChange={(e) => setHeartRate(e.target.value)} className="w-14 h-7 text-xs text-right" placeholder="___" />
              <span className="text-[10px] text-gray-400">bpm</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-gray-500 w-20">{es ? "Calidad" : "Quality"}</label>
            <select
              value={examQuality}
              onChange={(e) => setExamQuality(e.target.value)}
              className="h-7 text-xs border rounded px-1.5 bg-white dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="Good">{es ? "Buena" : "Good"}</option>
              <option value="Adequate">{es ? "Adecuada" : "Adequate"}</option>
              <option value="Limited">{es ? "Limitada" : "Limited"}</option>
            </select>
          </div>
        </div>
      )}

      {/* Techniques */}
      <SectionHeader id="techniques" label={es ? "Técnicas realizadas" : "Techniques Performed"} />
      {openSections.techniques && (
        <div className="px-2 pb-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
          {TECHNIQUES.map((t) => (
            <label key={t.key} className="flex items-center gap-1.5 cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={techniques[t.key] || false}
                onChange={() => toggleTechnique(t.key)}
                className="h-3 w-3 rounded border-gray-300 text-brand accent-brand"
              />
              <span className="text-[11px] text-gray-600 dark:text-gray-400">{t.label}</span>
            </label>
          ))}
        </div>
      )}

      {/* LV */}
      <SectionHeader id="lv" label={es ? "Ventrículo izquierdo (VI)" : "Left Ventricle (LV)"} icon={<Heart className="h-3 w-3 text-red-400" />} />
      {openSections.lv && (
        <div className="px-2 pb-2 space-y-0.5">
          {LV_FIELDS.map((f) => <MeasurementInput key={f.key} field={f} values={lvValues} setValues={setLvValues} />)}
          <div className="flex items-center gap-2 py-0.5">
            <label className="text-[11px] text-gray-600 dark:text-gray-400 flex-1">{es ? "Motilidad regional" : "Regional wall motion"}</label>
            <Input value={lvWallMotion} onChange={(e) => setLvWallMotion(e.target.value)} className="w-[180px] h-7 text-xs" />
          </div>
        </div>
      )}

      {/* RV */}
      <SectionHeader id="rv" label={es ? "Ventrículo derecho (VD)" : "Right Ventricle (RV)"} icon={<Heart className="h-3 w-3 text-blue-400" />} />
      {openSections.rv && (
        <div className="px-2 pb-2 space-y-0.5">
          {RV_FIELDS.map((f) => <MeasurementInput key={f.key} field={f} values={rvValues} setValues={setRvValues} />)}
          <div className="flex items-center gap-2 py-0.5">
            <label className="text-[11px] text-gray-600 dark:text-gray-400 flex-1">{es ? "Motilidad regional" : "Regional wall motion"}</label>
            <Input value={rvWallMotion} onChange={(e) => setRvWallMotion(e.target.value)} className="w-[180px] h-7 text-xs" />
          </div>
        </div>
      )}

      {/* Atria */}
      <SectionHeader id="atria" label={es ? "Aurículas" : "Atria"} />
      {openSections.atria && (
        <div className="px-2 pb-2 space-y-0.5">
          {ATRIA_FIELDS.map((f) => <MeasurementInput key={f.key} field={f} values={atriaValues} setValues={setAtriaValues} />)}
        </div>
      )}

      {/* Pericardium */}
      <SectionHeader id="pericardium" label={es ? "Pericardio" : "Pericardium"} />
      {openSections.pericardium && (
        <div className="px-2 pb-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500 flex-1">{es ? "Grosor pericárdico" : "Pericardial thickness"}</label>
            <Input value={pericardialThickness} onChange={(e) => setPericardialThickness(e.target.value)} className="w-[180px] h-7 text-xs" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-500 flex-1">{es ? "Derrame" : "Effusion"}</label>
            <select
              value={pericardialEffusion}
              onChange={(e) => setPericardialEffusion(e.target.value)}
              className="h-7 text-xs border rounded px-1.5 bg-white dark:bg-gray-900 dark:border-gray-700"
            >
              <option value="None">{es ? "Ninguno" : "None"}</option>
              <option value="Trace">{es ? "Mínimo" : "Trace"}</option>
              <option value="Small">{es ? "Pequeño" : "Small"}</option>
              <option value="Moderate">{es ? "Moderado" : "Moderate"}</option>
              <option value="Large">{es ? "Grande" : "Large"}</option>
            </select>
          </div>
        </div>
      )}

      {/* Valves */}
      <SectionHeader id="valves" label={es ? "Válvulas" : "Valves"} />
      {openSections.valves && (
        <div className="px-2 pb-2">
          <Textarea
            value={valves}
            onChange={(e) => setValves(e.target.value)}
            className="min-h-[48px] text-xs resize-none"
            placeholder={es ? "Morfología y función valvular..." : "Valvular morphology and function..."}
          />
        </div>
      )}

      {/* Late enhancement */}
      {techniques.delayedEnhancement && (
        <>
          <SectionHeader id="lge" label={es ? "Realce tardío (RTG/LGE)" : "Late Gadolinium Enhancement"} />
          {openSections.lge && (
            <div className="px-2 pb-2">
              <Textarea
                value={lateEnhancement}
                onChange={(e) => setLateEnhancement(e.target.value)}
                className="min-h-[48px] text-xs resize-none"
                placeholder={es ? "Describir patrón de realce tardío..." : "Describe late enhancement pattern..."}
              />
            </div>
          )}
        </>
      )}

      {/* Mapping */}
      {(techniques.t1Mapping || techniques.t2Mapping) && (
        <>
          <SectionHeader id="mapping" label={es ? "Mapping tisular" : "Tissue Mapping"} />
          {openSections.mapping && (
            <div className="px-2 pb-2 space-y-2">
              {techniques.t1Mapping && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-500">T1 {es ? "nativo" : "native"} (ms) — {es ? "Normal" : "Normal"}: {fieldStrength === "1.5" ? `${T1_RANGE_15T[0]}-${T1_RANGE_15T[1]}` : "1000-1200"}</p>
                  <div className="flex gap-2">
                    {[
                      { label: "Base", value: t1Base, set: setT1Base },
                      { label: "Mid", value: t1Mid, set: setT1Mid },
                      { label: "Apex", value: t1Apex, set: setT1Apex },
                    ].map((seg) => {
                      const t1Range = fieldStrength === "1.5" ? T1_RANGE_15T : [1000, 1200] as [number, number];
                      const abn = seg.value && isAbnormal(parseFloat(seg.value), t1Range);
                      return (
                        <div key={seg.label} className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-500">{seg.label}</label>
                          <Input type="number" value={seg.value} onChange={(e) => seg.set(e.target.value)} className={`w-16 h-7 text-xs text-right ${abn ? "border-red-400 bg-red-50 dark:bg-red-950/30" : ""}`} placeholder="___" />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-medium text-gray-500 mt-1">ECV (%) — {es ? "Normal" : "Normal"}: {ECV_RANGE[0]}-{ECV_RANGE[1]}%</p>
                  <div className="flex gap-2">
                    {[
                      { label: "Base", value: ecvBase, set: setEcvBase },
                      { label: "Mid", value: ecvMid, set: setEcvMid },
                      { label: "Apex", value: ecvApex, set: setEcvApex },
                    ].map((seg) => {
                      const abn = seg.value && isAbnormal(parseFloat(seg.value), ECV_RANGE);
                      return (
                        <div key={seg.label} className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-500">{seg.label}</label>
                          <Input type="number" step="0.1" value={seg.value} onChange={(e) => seg.set(e.target.value)} className={`w-16 h-7 text-xs text-right ${abn ? "border-red-400 bg-red-50 dark:bg-red-950/30" : ""}`} placeholder="___" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <label className="text-[10px] text-gray-500">Hematocrit</label>
                    <Input type="text" value={hematocrit} onChange={(e) => setHematocrit(e.target.value)} className="w-20 h-7 text-xs" placeholder="___" />
                  </div>
                </div>
              )}
              {techniques.t2Mapping && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-500">T2 {es ? "nativo" : "native"} (ms) — {es ? "Normal" : "Normal"}: {fieldStrength === "1.5" ? `${T2_RANGE_15T[0]}-${T2_RANGE_15T[1]}` : "40-52"}</p>
                  <div className="flex gap-2">
                    {[
                      { label: "Base", value: t2Base, set: setT2Base },
                      { label: "Mid", value: t2Mid, set: setT2Mid },
                      { label: "Apex", value: t2Apex, set: setT2Apex },
                    ].map((seg) => {
                      const t2Range = fieldStrength === "1.5" ? T2_RANGE_15T : [40, 52] as [number, number];
                      const abn = seg.value && isAbnormal(parseFloat(seg.value), t2Range);
                      return (
                        <div key={seg.label} className="flex items-center gap-1">
                          <label className="text-[10px] text-gray-500">{seg.label}</label>
                          <Input type="number" value={seg.value} onChange={(e) => seg.set(e.target.value)} className={`w-16 h-7 text-xs text-right ${abn ? "border-red-400 bg-red-50 dark:bg-red-950/30" : ""}`} placeholder="___" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Additional */}
      <SectionHeader id="additional" label={es ? "Hallazgos adicionales" : "Additional Findings"} />
      {openSections.additional && (
        <div className="px-2 pb-2">
          <Textarea
            value={additionalFindings}
            onChange={(e) => setAdditionalFindings(e.target.value)}
            className="min-h-[48px] text-xs resize-none"
            placeholder={es ? "Otros hallazgos no incluidos en las secciones anteriores..." : "Other findings not covered above..."}
          />
        </div>
      )}
    </div>
  );
}
