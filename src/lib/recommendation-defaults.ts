import type { ManualRecommendation } from "./types";

export const DEFAULT_RECOMMENDATIONS: ManualRecommendation[] = [
  // ═══════════════════════════════════════════
  // THORAX — Fleischner 2017
  // ═══════════════════════════════════════════
  {
    id: "fleisch_solid_lt6_low",
    category: "Thorax",
    modality: "CT",
    title: { es: "Sólido <6mm bajo riesgo", en: "Solid <6mm low risk", pt: "Sólido <6mm baixo risco" },
    text: {
      es: "Nódulo pulmonar sólido <6 mm en paciente de bajo riesgo. No requiere seguimiento según criterios Fleischner 2017.",
      en: "Solid pulmonary nodule <6 mm in low-risk patient. No routine follow-up required per Fleischner 2017 guidelines.",
      pt: "Nódulo pulmonar sólido <6 mm em paciente de baixo risco. Não requer seguimento segundo critérios Fleischner 2017.",
    },
    tags: ["nódulo", "nodule", "sólido", "solid", "pulmonar", "bajo riesgo", "low risk"],
    source: "Fleischner 2017 (MacMahon et al., Radiology 2017)",
    scope: "system",
  },
  {
    id: "fleisch_solid_lt6_high",
    category: "Thorax",
    modality: "CT",
    title: { es: "Sólido <6mm alto riesgo", en: "Solid <6mm high risk", pt: "Sólido <6mm alto risco" },
    text: {
      es: "Nódulo pulmonar sólido <6 mm en paciente de alto riesgo. Se recomienda TC de control opcional a los 12 meses (Fleischner 2017).",
      en: "Solid pulmonary nodule <6 mm in high-risk patient. Optional follow-up CT at 12 months recommended (Fleischner 2017).",
      pt: "Nódulo pulmonar sólido <6 mm em paciente de alto risco. TC de controle opcional em 12 meses recomendado (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "sólido", "solid", "pulmonar", "alto riesgo", "high risk"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_solid_6to8_low",
    category: "Thorax",
    modality: "CT",
    title: { es: "Sólido 6-8mm bajo riesgo", en: "Solid 6-8mm low risk", pt: "Sólido 6-8mm baixo risco" },
    text: {
      es: "Nódulo pulmonar sólido de 6-8 mm en paciente de bajo riesgo. Se recomienda TC de control en 6-12 meses; considerar TC adicional a los 18-24 meses (Fleischner 2017).",
      en: "Solid pulmonary nodule 6-8 mm in low-risk patient. Follow-up CT at 6-12 months recommended; consider CT at 18-24 months (Fleischner 2017).",
      pt: "Nódulo pulmonar sólido de 6-8 mm em paciente de baixo risco. TC de controle em 6-12 meses recomendado; considerar TC adicional em 18-24 meses (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "sólido", "solid", "pulmonar", "6 mm", "7 mm", "8 mm"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_solid_6to8_high",
    category: "Thorax",
    modality: "CT",
    title: { es: "Sólido 6-8mm alto riesgo", en: "Solid 6-8mm high risk", pt: "Sólido 6-8mm alto risco" },
    text: {
      es: "Nódulo pulmonar sólido de 6-8 mm en paciente de alto riesgo. Se recomienda TC de control en 6-12 meses, y TC adicional a los 18-24 meses (Fleischner 2017).",
      en: "Solid pulmonary nodule 6-8 mm in high-risk patient. Follow-up CT at 6-12 months, then CT at 18-24 months recommended (Fleischner 2017).",
      pt: "Nódulo pulmonar sólido de 6-8 mm em paciente de alto risco. TC de controle em 6-12 meses, depois TC em 18-24 meses recomendado (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "sólido", "solid", "pulmonar", "alto riesgo", "high risk"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_solid_gt8",
    category: "Thorax",
    modality: "CT",
    title: { es: "Sólido >8mm", en: "Solid >8mm", pt: "Sólido >8mm" },
    text: {
      es: "Nódulo pulmonar sólido >8 mm. Considerar TC de control a los 3 meses, PET/TC o toma de muestra tisular (Fleischner 2017).",
      en: "Solid pulmonary nodule >8 mm. Consider CT at 3 months, PET/CT, or tissue sampling (Fleischner 2017).",
      pt: "Nódulo pulmonar sólido >8 mm. Considerar TC em 3 meses, PET/TC ou biópsia (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "sólido", "solid", "pulmonar", "PET", "biopsia"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_ggn_lt6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Vidrio deslustrado <6mm", en: "GGN <6mm", pt: "Vidro fosco <6mm" },
    text: {
      es: "Nódulo pulmonar en vidrio deslustrado <6 mm. No requiere seguimiento de rutina (Fleischner 2017).",
      en: "Ground-glass nodule <6 mm. No routine follow-up required (Fleischner 2017).",
      pt: "Nódulo em vidro fosco <6 mm. Não requer seguimento de rotina (Fleischner 2017).",
    },
    tags: ["vidrio", "deslustrado", "ground-glass", "GGN", "subsólido", "subsolid"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_ggn_ge6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Vidrio deslustrado ≥6mm", en: "GGN ≥6mm", pt: "Vidro fosco ≥6mm" },
    text: {
      es: "Nódulo pulmonar en vidrio deslustrado ≥6 mm. Se recomienda TC de control en 6-12 meses para confirmar persistencia, luego TC cada 2 años hasta completar 5 años (Fleischner 2017).",
      en: "Ground-glass nodule ≥6 mm. Follow-up CT at 6-12 months to confirm persistence, then CT every 2 years for 5 years (Fleischner 2017).",
      pt: "Nódulo em vidro fosco ≥6 mm. TC de controle em 6-12 meses para confirmar persistência, depois TC a cada 2 anos por 5 anos (Fleischner 2017).",
    },
    tags: ["vidrio", "deslustrado", "ground-glass", "GGN", "subsólido", "subsolid"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_partsolid_lt6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Parcialmente sólido <6mm", en: "Part-solid <6mm", pt: "Parcialmente sólido <6mm" },
    text: {
      es: "Nódulo pulmonar parcialmente sólido <6 mm. No requiere seguimiento de rutina (Fleischner 2017).",
      en: "Part-solid pulmonary nodule <6 mm. No routine follow-up required (Fleischner 2017).",
      pt: "Nódulo parcialmente sólido <6 mm. Não requer seguimento de rotina (Fleischner 2017).",
    },
    tags: ["parcialmente", "part-solid", "subsólido", "subsolid", "mixto"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_partsolid_ge6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Parcialmente sólido ≥6mm", en: "Part-solid ≥6mm", pt: "Parcialmente sólido ≥6mm" },
    text: {
      es: "Nódulo pulmonar parcialmente sólido ≥6 mm. Se recomienda TC de control en 3-6 meses para confirmar persistencia; si persiste con componente sólido <6 mm, TC anual durante 5 años (Fleischner 2017).",
      en: "Part-solid pulmonary nodule ≥6 mm. Follow-up CT at 3-6 months; if persistent with solid component <6 mm, annual CT for 5 years (Fleischner 2017).",
      pt: "Nódulo parcialmente sólido ≥6 mm. TC de controle em 3-6 meses; se persistente com componente sólido <6 mm, TC anual por 5 anos (Fleischner 2017).",
    },
    tags: ["parcialmente", "part-solid", "subsólido", "subsolid", "mixto", "componente sólido"],
    source: "Fleischner 2017",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — BTS 2015
  // ═══════════════════════════════════════════
  {
    id: "bts_lt5mm",
    category: "Thorax",
    modality: "CT",
    title: { es: "BTS <5mm / <80mm³", en: "BTS <5mm / <80mm³", pt: "BTS <5mm / <80mm³" },
    text: {
      es: "Nódulo pulmonar <5 mm (<80 mm³). No requiere seguimiento según guías BTS 2015.",
      en: "Pulmonary nodule <5 mm (<80 mm³). No follow-up required per BTS 2015 guidelines.",
      pt: "Nódulo pulmonar <5 mm (<80 mm³). Não requer seguimento segundo diretrizes BTS 2015.",
    },
    tags: ["nódulo", "nodule", "BTS", "volumetría", "volumetry"],
    source: "BTS 2015 (Callister et al., Thorax 2015)",
    scope: "system",
  },
  {
    id: "bts_5to6mm",
    category: "Thorax",
    modality: "CT",
    title: { es: "BTS 5-6mm / 80-300mm³", en: "BTS 5-6mm / 80-300mm³", pt: "BTS 5-6mm / 80-300mm³" },
    text: {
      es: "Nódulo pulmonar 5-6 mm (80-300 mm³). Se recomienda TC de control con volumetría a los 3 meses; si estable, alta (BTS 2015).",
      en: "Pulmonary nodule 5-6 mm (80-300 mm³). Follow-up CT with volumetry at 3 months; if stable, discharge (BTS 2015).",
      pt: "Nódulo pulmonar 5-6 mm (80-300 mm³). TC de controle com volumetria em 3 meses; se estável, alta (BTS 2015).",
    },
    tags: ["nódulo", "nodule", "BTS", "volumetría", "volumetry"],
    source: "BTS 2015",
    scope: "system",
  },
  {
    id: "bts_gt6mm",
    category: "Thorax",
    modality: "CT",
    title: { es: "BTS >6mm / >300mm³", en: "BTS >6mm / >300mm³", pt: "BTS >6mm / >300mm³" },
    text: {
      es: "Nódulo pulmonar >6 mm (>300 mm³). Se recomienda TC con volumetría a los 3 meses. Si VDT <400 días: considerar biopsia/resección; VDT 400-600 días: TC al año y a los 2 años; VDT >600 días: alta (BTS 2015).",
      en: "Pulmonary nodule >6 mm (>300 mm³). Follow-up CT with volumetry at 3 months. If VDT <400 days: consider biopsy/resection; VDT 400-600 days: CT at 1 and 2 years; VDT >600 days: discharge (BTS 2015).",
      pt: "Nódulo pulmonar >6 mm (>300 mm³). TC com volumetria em 3 meses. Se TDV <400 dias: considerar biópsia/ressecção; TDV 400-600 dias: TC em 1 e 2 anos; TDV >600 dias: alta (BTS 2015).",
    },
    tags: ["nódulo", "nodule", "BTS", "volumetría", "VDT", "duplicación", "doubling"],
    source: "BTS 2015",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Other
  // ═══════════════════════════════════════════
  {
    id: "thyroid_incidental_ct",
    category: "Thorax",
    modality: "CT",
    title: { es: "Nódulo tiroideo incidental", en: "Incidental thyroid nodule", pt: "Nódulo tireoidiano incidental" },
    text: {
      es: "Nódulo tiroideo incidental >1 cm identificado en TC. Se recomienda valoración ecográfica para caracterización (ACR 2015).",
      en: "Incidental thyroid nodule >1 cm identified on CT. Ultrasound evaluation recommended for characterization (ACR 2015).",
      pt: "Nódulo tireoidiano incidental >1 cm identificado em TC. Avaliação ecográfica recomendada para caracterização (ACR 2015).",
    },
    tags: ["tiroides", "thyroid", "nódulo", "incidental", "incidentaloma"],
    source: "ACR Incidental Thyroid Findings 2015",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN
  // ═══════════════════════════════════════════
  {
    id: "liver_simple_cyst",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Quiste hepático simple", en: "Simple hepatic cyst", pt: "Cisto hepático simples" },
    text: {
      es: "Quiste hepático simple. No requiere seguimiento según criterios ACR (hallazgo benigno sin significancia clínica).",
      en: "Simple hepatic cyst. No follow-up required per ACR criteria (benign finding without clinical significance).",
      pt: "Cisto hepático simples. Não requer seguimento segundo critérios ACR (achado benigno sem significância clínica).",
    },
    tags: ["quiste", "cyst", "hepático", "hepatic", "hígado", "liver", "simple"],
    source: "ACR Incidental Findings 2017",
    scope: "system",
  },
  {
    id: "liver_hemangioma",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Hemangioma hepático típico", en: "Typical hepatic hemangioma", pt: "Hemangioma hepático típico" },
    text: {
      es: "Hemangioma hepático de aspecto típico. No requiere seguimiento (hallazgo benigno).",
      en: "Typical hepatic hemangioma. No follow-up required (benign finding).",
      pt: "Hemangioma hepático de aspecto típico. Não requer seguimento (achado benigno).",
    },
    tags: ["hemangioma", "hepático", "hepatic", "hígado", "liver", "benigno", "benign"],
    source: "ACR Incidental Findings 2017",
    scope: "system",
  },
  {
    id: "liver_indeterminate",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Lesión hepática indeterminada", en: "Indeterminate liver lesion", pt: "Lesão hepática indeterminada" },
    text: {
      es: "Lesión hepática de caracterización indeterminada en TC. Se recomienda RM hepática con contraste hepatoespecífico para mejor caracterización.",
      en: "Indeterminate liver lesion on CT. Hepatobiliary MRI with hepatocyte-specific contrast recommended for further characterization.",
      pt: "Lesão hepática de caracterização indeterminada em TC. RM hepática com contraste hepatoespecífico recomendada para melhor caracterização.",
    },
    tags: ["hepático", "hepatic", "hígado", "liver", "lesión", "lesion", "indeterminada", "indeterminate", "RM", "MRI"],
    source: "ACR Incidental Findings 2017",
    scope: "system",
  },
  {
    id: "lirads_3",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS 3: seguimiento", en: "LI-RADS 3: follow-up", pt: "LI-RADS 3: seguimento" },
    text: {
      es: "Observación hepática LI-RADS 3. Se recomienda repetir estudio con contraste o modalidad alternativa en 3-6 meses (ACR LI-RADS v2018).",
      en: "LI-RADS 3 hepatic observation. Repeat or alternative contrast-enhanced imaging in 3-6 months recommended (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS 3. Repetir estudo contrastado ou modalidade alternativa em 3-6 meses recomendado (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "hepatocarcinoma", "HCC", "cirrosis", "cirrhosis"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },
  {
    id: "renal_bosniak_iif",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Bosniak IIF: seguimiento", en: "Bosniak IIF: follow-up", pt: "Bosniak IIF: seguimento" },
    text: {
      es: "Lesión renal quística Bosniak IIF. Se recomienda seguimiento con imagen a los 6 y 12 meses para confirmar estabilidad (Bosniak 2019).",
      en: "Bosniak IIF cystic renal lesion. Follow-up imaging at 6 and 12 months to confirm stability recommended (Bosniak 2019).",
      pt: "Lesão renal cística Bosniak IIF. Seguimento por imagem em 6 e 12 meses para confirmar estabilidade recomendado (Bosniak 2019).",
    },
    tags: ["Bosniak", "renal", "quiste", "cyst", "quístico", "cystic", "riñón", "kidney"],
    source: "Bosniak Classification v2019 (Silverman et al., Radiology 2019)",
    scope: "system",
  },
  {
    id: "renal_bosniak_iii",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Bosniak III: cirugía", en: "Bosniak III: surgery", pt: "Bosniak III: cirurgia" },
    text: {
      es: "Lesión renal quística Bosniak III. Se recomienda valoración quirúrgica o vigilancia activa según contexto clínico (Bosniak 2019).",
      en: "Bosniak III cystic renal lesion. Surgical evaluation or active surveillance recommended depending on clinical context (Bosniak 2019).",
      pt: "Lesão renal cística Bosniak III. Avaliação cirúrgica ou vigilância ativa recomendada conforme contexto clínico (Bosniak 2019).",
    },
    tags: ["Bosniak", "renal", "quiste", "cyst", "riñón", "kidney", "cirugía", "surgery"],
    source: "Bosniak Classification v2019",
    scope: "system",
  },
  {
    id: "adrenal_lt1cm",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Adrenal <1cm", en: "Adrenal <1cm", pt: "Adrenal <1cm" },
    text: {
      es: "Lesión adrenal <1 cm. Probablemente benigna; no requiere seguimiento en ausencia de antecedente neoplásico (ACR 2017).",
      en: "Adrenal lesion <1 cm. Likely benign; no follow-up required in the absence of known malignancy (ACR 2017).",
      pt: "Lesão adrenal <1 cm. Provavelmente benigna; não requer seguimento na ausência de antecedente neoplásico (ACR 2017).",
    },
    tags: ["adrenal", "suprarrenal", "incidentaloma", "adenoma"],
    source: "ACR Incidental Adrenal Findings 2017",
    scope: "system",
  },
  {
    id: "adrenal_1to4cm",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Adrenal 1-4cm: caracterizar", en: "Adrenal 1-4cm: characterize", pt: "Adrenal 1-4cm: caracterizar" },
    text: {
      es: "Lesión adrenal de 1-4 cm. Se recomienda TC con protocolo de lavado adrenal o RM con secuencia de desplazamiento químico para caracterización (ACR 2017).",
      en: "Adrenal lesion 1-4 cm. Adrenal washout CT or chemical shift MRI recommended for characterization (ACR 2017).",
      pt: "Lesão adrenal de 1-4 cm. TC com protocolo de lavado adrenal ou RM com sequência de deslocamento químico para caracterização (ACR 2017).",
    },
    tags: ["adrenal", "suprarrenal", "incidentaloma", "lavado", "washout", "adenoma"],
    source: "ACR Incidental Adrenal Findings 2017",
    scope: "system",
  },
  {
    id: "adrenal_gt4cm",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Adrenal >4cm: cirugía", en: "Adrenal >4cm: surgery", pt: "Adrenal >4cm: cirurgia" },
    text: {
      es: "Lesión adrenal >4 cm. Se recomienda valoración quirúrgica y estudio bioquímico funcional (ACR 2017).",
      en: "Adrenal lesion >4 cm. Surgical evaluation and functional biochemical workup recommended (ACR 2017).",
      pt: "Lesão adrenal >4 cm. Avaliação cirúrgica e estudo bioquímico funcional recomendados (ACR 2017).",
    },
    tags: ["adrenal", "suprarrenal", "incidentaloma", "cirugía", "surgery", "masa"],
    source: "ACR Incidental Adrenal Findings 2017",
    scope: "system",
  },
  {
    id: "pancreas_cyst_lt15",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Quiste pancreático <1.5cm", en: "Pancreatic cyst <1.5cm", pt: "Cisto pancreático <1.5cm" },
    text: {
      es: "Lesión quística pancreática <1.5 cm sin características preocupantes. Se recomienda RM de control en 2 años (ACR/AGA 2015).",
      en: "Pancreatic cystic lesion <1.5 cm without worrisome features. Follow-up MRI in 2 years recommended (ACR/AGA 2015).",
      pt: "Lesão cística pancreática <1.5 cm sem características preocupantes. RM de controle em 2 anos recomendada (ACR/AGA 2015).",
    },
    tags: ["páncreas", "pancreas", "quiste", "cyst", "IPMN", "mucinoso"],
    source: "ACR Incidental Findings 2017 / AGA Guidelines 2015",
    scope: "system",
  },
  {
    id: "pancreas_cyst_ge3",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Quiste pancreático ≥3cm", en: "Pancreatic cyst ≥3cm", pt: "Cisto pancreático ≥3cm" },
    text: {
      es: "Lesión quística pancreática ≥3 cm o con características preocupantes. Se recomienda valoración con ecoendoscopia (EUS) y posible punción (ACR/AGA 2015).",
      en: "Pancreatic cystic lesion ≥3 cm or with worrisome features. Endoscopic ultrasound (EUS) with possible aspiration recommended (ACR/AGA 2015).",
      pt: "Lesão cística pancreática ≥3 cm ou com características preocupantes. Ecoendoscopia (EUS) com possível punção recomendada (ACR/AGA 2015).",
    },
    tags: ["páncreas", "pancreas", "quiste", "cyst", "IPMN", "preocupante", "worrisome", "EUS"],
    source: "ACR/AGA 2015",
    scope: "system",
  },
  {
    id: "ovarian_premenop_lt5",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico simple <5cm", en: "Simple ovarian cyst <5cm", pt: "Cisto ovariano simples <5cm" },
    text: {
      es: "Quiste ovárico simple <5 cm en paciente premenopáusica. Hallazgo fisiológico (O-RADS 1). No requiere seguimiento (ACR 2020).",
      en: "Simple ovarian cyst <5 cm in premenopausal patient. Physiologic finding (O-RADS 1). No follow-up required (ACR 2020).",
      pt: "Cisto ovariano simples <5 cm em paciente pré-menopausa. Achado fisiológico (O-RADS 1). Não requer seguimento (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "funcional", "functional", "premenopáusica", "fisiológico"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "gb_polyp_lt6",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Pólipo vesicular <6mm", en: "GB polyp <6mm", pt: "Pólipo vesicular <6mm" },
    text: {
      es: "Pólipo de vesícula biliar <6 mm. No requiere seguimiento en ausencia de factores de riesgo (guías ESGAR 2017).",
      en: "Gallbladder polyp <6 mm. No follow-up required in the absence of risk factors (ESGAR 2017 guidelines).",
      pt: "Pólipo de vesícula biliar <6 mm. Não requer seguimento na ausência de fatores de risco (diretrizes ESGAR 2017).",
    },
    tags: ["pólipo", "polyp", "vesícula", "gallbladder", "biliar"],
    source: "ESGAR/EAES Guidelines 2017",
    scope: "system",
  },
  {
    id: "gb_polyp_6to9",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Pólipo vesicular 6-9mm", en: "GB polyp 6-9mm", pt: "Pólipo vesicular 6-9mm" },
    text: {
      es: "Pólipo de vesícula biliar de 6-9 mm. Se recomienda ecografía de control en 6 meses, luego anual durante 2 años (ESGAR 2017).",
      en: "Gallbladder polyp 6-9 mm. Follow-up ultrasound at 6 months, then annually for 2 years recommended (ESGAR 2017).",
      pt: "Pólipo de vesícula biliar de 6-9 mm. Ecografia de controle em 6 meses, depois anual por 2 anos recomendada (ESGAR 2017).",
    },
    tags: ["pólipo", "polyp", "vesícula", "gallbladder", "biliar"],
    source: "ESGAR/EAES Guidelines 2017",
    scope: "system",
  },
  {
    id: "gb_polyp_ge10",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Pólipo vesicular ≥10mm", en: "GB polyp ≥10mm", pt: "Pólipo vesicular ≥10mm" },
    text: {
      es: "Pólipo de vesícula biliar ≥10 mm. Se recomienda valoración quirúrgica (colecistectomía) dado el riesgo de malignidad (ESGAR 2017).",
      en: "Gallbladder polyp ≥10 mm. Surgical evaluation (cholecystectomy) recommended given malignancy risk (ESGAR 2017).",
      pt: "Pólipo de vesícula biliar ≥10 mm. Avaliação cirúrgica (colecistectomia) recomendada dado o risco de malignidade (ESGAR 2017).",
    },
    tags: ["pólipo", "polyp", "vesícula", "gallbladder", "biliar", "colecistectomía"],
    source: "ESGAR/EAES Guidelines 2017",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // NEURO
  // ═══════════════════════════════════════════
  {
    id: "meningioma_lt2",
    category: "Head and neck",
    modality: "MRI",
    title: { es: "Meningioma incidental <2cm", en: "Incidental meningioma <2cm", pt: "Meningioma incidental <2cm" },
    text: {
      es: "Meningioma incidental <2 cm. Se recomienda RM de control al año; si estable, considerar RM cada 2-3 años (EANO 2016).",
      en: "Incidental meningioma <2 cm. Follow-up MRI at 1 year recommended; if stable, consider MRI every 2-3 years (EANO 2016).",
      pt: "Meningioma incidental <2 cm. RM de controle em 1 ano recomendada; se estável, considerar RM a cada 2-3 anos (EANO 2016).",
    },
    tags: ["meningioma", "incidental", "extra-axial", "dural"],
    source: "EANO Guidelines 2016",
    scope: "system",
  },
  {
    id: "aneurysm_lt5mm",
    category: "Head and neck",
    modality: "all",
    title: { es: "Aneurisma cerebral <5mm", en: "Cerebral aneurysm <5mm", pt: "Aneurisma cerebral <5mm" },
    text: {
      es: "Aneurisma intracraneal <5 mm. Se recomienda seguimiento con angio-RM o angio-TC según guías AHA/ASA. Valoración individualizada del riesgo.",
      en: "Intracranial aneurysm <5 mm. Follow-up with MRA or CTA per AHA/ASA guidelines. Individualized risk assessment recommended.",
      pt: "Aneurisma intracraniano <5 mm. Seguimento com angio-RM ou angio-TC conforme diretrizes AHA/ASA. Avaliação individualizada do risco recomendada.",
    },
    tags: ["aneurisma", "aneurysm", "intracraneal", "intracranial", "cerebral", "ACI", "ACM", "MCA"],
    source: "AHA/ASA Guidelines 2015",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // VASCULAR
  // ═══════════════════════════════════════════
  {
    id: "aaa_3to4",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "AAA 3-4cm: eco anual", en: "AAA 3-4cm: annual US", pt: "AAA 3-4cm: eco anual" },
    text: {
      es: "Aneurisma de aorta abdominal de 3-4 cm. Se recomienda ecografía de control anual (SVS 2018).",
      en: "Abdominal aortic aneurysm 3-4 cm. Annual follow-up ultrasound recommended (SVS 2018).",
      pt: "Aneurisma de aorta abdominal de 3-4 cm. Ecografia de controle anual recomendada (SVS 2018).",
    },
    tags: ["aneurisma", "aneurysm", "aorta", "abdominal", "AAA"],
    source: "SVS Practice Guidelines 2018",
    scope: "system",
  },
  {
    id: "aaa_4to55",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "AAA 4-5.5cm: eco 6 meses", en: "AAA 4-5.5cm: US 6 months", pt: "AAA 4-5.5cm: eco 6 meses" },
    text: {
      es: "Aneurisma de aorta abdominal de 4-5.5 cm. Se recomienda ecografía o TC de control cada 6 meses (SVS 2018).",
      en: "Abdominal aortic aneurysm 4-5.5 cm. Follow-up ultrasound or CT every 6 months recommended (SVS 2018).",
      pt: "Aneurisma de aorta abdominal de 4-5.5 cm. Ecografia ou TC de controle a cada 6 meses recomendada (SVS 2018).",
    },
    tags: ["aneurisma", "aneurysm", "aorta", "abdominal", "AAA"],
    source: "SVS Practice Guidelines 2018",
    scope: "system",
  },
  {
    id: "aaa_gt55",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "AAA >5.5cm: cirugía", en: "AAA >5.5cm: surgery", pt: "AAA >5.5cm: cirurgia" },
    text: {
      es: "Aneurisma de aorta abdominal >5.5 cm. Se recomienda valoración quirúrgica urgente (reparación abierta o endovascular) (SVS 2018).",
      en: "Abdominal aortic aneurysm >5.5 cm. Urgent surgical evaluation (open or endovascular repair) recommended (SVS 2018).",
      pt: "Aneurisma de aorta abdominal >5.5 cm. Avaliação cirúrgica urgente (reparo aberto ou endovascular) recomendada (SVS 2018).",
    },
    tags: ["aneurisma", "aneurysm", "aorta", "abdominal", "AAA", "cirugía", "surgery"],
    source: "SVS Practice Guidelines 2018",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // MSK
  // ═══════════════════════════════════════════
  {
    id: "bone_lesion_benign",
    category: "Upper limbs",
    modality: "XRay",
    title: { es: "Lesión ósea probablemente benigna", en: "Likely benign bone lesion", pt: "Lesão óssea provavelmente benigna" },
    text: {
      es: "Lesión ósea de aspecto probablemente benigno. Se recomienda radiografía de control en 6 meses para confirmar estabilidad.",
      en: "Likely benign bone lesion. Follow-up radiograph at 6 months to confirm stability recommended.",
      pt: "Lesão óssea de aspecto provavelmente benigno. Radiografia de controle em 6 meses para confirmar estabilidade recomendada.",
    },
    tags: ["lesión ósea", "bone lesion", "óseo", "bone", "benigno", "benign", "fibroma", "encondroma"],
    source: "ACR Appropriateness Criteria",
    scope: "system",
  },
  {
    id: "compression_fx_atypical",
    category: "Spine",
    modality: "all",
    title: { es: "Fractura vertebral atípica: RM", en: "Atypical vertebral fracture: MRI", pt: "Fratura vertebral atípica: RM" },
    text: {
      es: "Fractura por compresión vertebral con rasgos atípicos. Se recomienda RM de columna para descartar origen patológico/tumoral.",
      en: "Vertebral compression fracture with atypical features. Spine MRI recommended to exclude pathologic/neoplastic etiology.",
      pt: "Fratura por compressão vertebral com características atípicas. RM de coluna recomendada para excluir etiologia patológica/tumoral.",
    },
    tags: ["fractura", "fracture", "compresión", "compression", "vertebral", "patológica", "pathologic", "tumor"],
    source: "ACR Appropriateness Criteria",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Lung-RADS v2022
  // ═══════════════════════════════════════════
  {
    id: "lungrads_3",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 3: sólido 6-<8mm / VD ≥30mm", en: "Lung-RADS 3: solid 6-<8mm / GGN ≥30mm", pt: "Lung-RADS 3: sólido 6-<8mm / VF ≥30mm" },
    text: {
      es: "Lung-RADS 3 (probablemente benigno): incluye nódulo sólido de 6 a <8 mm, parcialmente sólido ≥6 mm con componente sólido <6 mm, o vidrio deslustrado nuevo ≥30 mm. Se recomienda TC de baja dosis de control en 6 meses (ACR Lung-RADS v2022).",
      en: "Lung-RADS 3 (probably benign): includes solid nodule 6 to <8 mm, part-solid ≥6 mm with solid component <6 mm, or new ground-glass nodule ≥30 mm. Low-dose follow-up CT at 6 months recommended (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 3 (provavelmente benigno): inclui nódulo sólido de 6 a <8 mm, parcialmente sólido ≥6 mm com componente sólido <6 mm, ou vidro fosco novo ≥30 mm. TC de baixa dose de controle em 6 meses recomendada (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "nódulo", "nodule", "screening", "pulmón", "lung", "vidrio deslustrado", "ground-glass"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_4a",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 4A: sólido 8-<15mm / PS sólido 6-8mm", en: "Lung-RADS 4A: solid 8-<15mm / PS solid 6-8mm", pt: "Lung-RADS 4A: sólido 8-<15mm / PS sólido 6-8mm" },
    text: {
      es: "Lung-RADS 4A (sospechoso): incluye nódulo sólido de 8 a <15 mm, parcialmente sólido ≥6 mm con componente sólido de 6 a <8 mm, o nódulo nuevo/en crecimiento ≥8 mm. Se recomienda TC de control en 3 meses o PET/TC (ACR Lung-RADS v2022).",
      en: "Lung-RADS 4A (suspicious): includes solid nodule 8 to <15 mm, part-solid ≥6 mm with solid component 6 to <8 mm, or new/growing nodule ≥8 mm. Follow-up CT at 3 months or PET/CT recommended (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 4A (suspeito): inclui nódulo sólido de 8 a <15 mm, parcialmente sólido ≥6 mm com componente sólido de 6 a <8 mm, ou nódulo novo/em crescimento ≥8 mm. TC de controle em 3 meses ou PET/TC recomendada (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "nódulo", "nodule", "sospechoso", "suspicious", "PET", "crecimiento", "growing"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_4b",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 4B/4X: sólido ≥15mm / PS sólido ≥8mm", en: "Lung-RADS 4B/4X: solid ≥15mm / PS solid ≥8mm", pt: "Lung-RADS 4B/4X: sólido ≥15mm / PS sólido ≥8mm" },
    text: {
      es: "Lung-RADS 4B/4X (muy sospechoso): incluye nódulo sólido ≥15 mm o parcialmente sólido con componente sólido ≥8 mm. Categoría 4X si rasgos adicionales sospechosos (espiculación, lóbulo superior, etc.). Se recomienda toma de muestra tisular, PET/TC o TC a corto plazo (ACR Lung-RADS v2022).",
      en: "Lung-RADS 4B/4X (very suspicious): includes solid nodule ≥15 mm or part-solid with solid component ≥8 mm. Category 4X if additional suspicious features (spiculation, upper lobe, etc.). Tissue sampling, PET/CT, or short-term follow-up CT recommended (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 4B/4X (muito suspeito): inclui nódulo sólido ≥15 mm ou parcialmente sólido com componente sólido ≥8 mm. Categoria 4X se características adicionais suspeitas (espiculação, lobo superior, etc.). Biópsia, PET/TC ou TC a curto prazo recomendada (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "nódulo", "nodule", "sospechoso", "suspicious", "biopsia", "biopsy", "PET", "espiculado", "spiculated"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — BI-RADS
  // ═══════════════════════════════════════════
  {
    id: "birads_3",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 3: seguimiento", en: "BI-RADS 3: follow-up", pt: "BI-RADS 3: seguimento" },
    text: {
      es: "Hallazgo mamográfico BI-RADS 3 (probablemente benigno). Se recomienda mamografía de control a los 6 meses (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 3 mammographic finding (probably benign). Follow-up mammography at 6 months recommended (ACR BI-RADS 5th ed.).",
      pt: "Achado mamográfico BI-RADS 3 (provavelmente benigno). Mamografia de controle em 6 meses recomendada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "mamografía", "mammography", "benigno", "benign"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_4",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 4: biopsia", en: "BI-RADS 4: biopsy", pt: "BI-RADS 4: biópsia" },
    text: {
      es: "Hallazgo mamográfico BI-RADS 4 (sospechoso). Se recomienda biopsia tisular para diagnóstico histológico (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 4 mammographic finding (suspicious). Tissue biopsy for histologic diagnosis recommended (ACR BI-RADS 5th ed.).",
      pt: "Achado mamográfico BI-RADS 4 (suspeito). Biópsia tecidual para diagnóstico histológico recomendada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "sospechoso", "suspicious", "biopsia", "biopsy"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_5",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 5: biopsia", en: "BI-RADS 5: biopsy", pt: "BI-RADS 5: biópsia" },
    text: {
      es: "Hallazgo mamográfico BI-RADS 5 (altamente sugestivo de malignidad). Se recomienda biopsia tisular y manejo oncológico (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 5 mammographic finding (highly suggestive of malignancy). Tissue biopsy and oncologic management recommended (ACR BI-RADS 5th ed.).",
      pt: "Achado mamográfico BI-RADS 5 (altamente sugestivo de malignidade). Biópsia tecidual e manejo oncológico recomendados (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "maligno", "malignant", "biopsia", "biopsy"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Breast screening & implants
  // ═══════════════════════════════════════════
  {
    id: "breast_highrisk_screen",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "Mama alto riesgo: RM anual", en: "Breast high risk: annual MRI", pt: "Mama alto risco: RM anual" },
    text: {
      es: "Paciente con riesgo elevado de cáncer de mama (≥20% riesgo vital). Se recomienda mamografía anual complementada con RM mamaria anual (ACR 2023).",
      en: "Patient at high risk for breast cancer (≥20% lifetime risk). Annual mammography supplemented with annual breast MRI recommended (ACR 2023).",
      pt: "Paciente com risco elevado de câncer de mama (≥20% risco vitalício). Mamografia anual complementada com RM mamária anual recomendada (ACR 2023).",
    },
    tags: ["mama", "breast", "alto riesgo", "high risk", "screening", "RM", "MRI", "BRCA"],
    source: "ACR Breast Cancer Screening Recommendations 2023",
    scope: "system",
  },
  {
    id: "breast_implant_intracap",
    category: "Thorax",
    modality: "MRI",
    title: { es: "Rotura intracapsular implante", en: "Intracapsular implant rupture", pt: "Rotura intracapsular implante" },
    text: {
      es: "Rotura intracapsular de implante mamario. Se recomienda seguimiento con RM mamaria periódica; valorar consulta con cirugía plástica (FDA 2020).",
      en: "Intracapsular breast implant rupture. Periodic breast MRI follow-up recommended; consider plastic surgery consultation (FDA 2020).",
      pt: "Rotura intracapsular de implante mamário. Seguimento com RM mamária periódica recomendado; avaliar consulta com cirurgia plástica (FDA 2020).",
    },
    tags: ["implante", "implant", "mama", "breast", "rotura", "rupture", "intracapsular", "silicona", "silicone"],
    source: "FDA Breast Implant Guidelines 2020",
    scope: "system",
  },
  {
    id: "breast_implant_extracap",
    category: "Thorax",
    modality: "MRI",
    title: { es: "Rotura extracapsular implante", en: "Extracapsular implant rupture", pt: "Rotura extracapsular implante" },
    text: {
      es: "Rotura extracapsular de implante mamario con silicona libre. Se recomienda valoración quirúrgica para explantación (FDA 2020).",
      en: "Extracapsular breast implant rupture with free silicone. Surgical evaluation for explantation recommended (FDA 2020).",
      pt: "Rotura extracapsular de implante mamário com silicone livre. Avaliação cirúrgica para explantação recomendada (FDA 2020).",
    },
    tags: ["implante", "implant", "mama", "breast", "rotura", "rupture", "extracapsular", "silicona", "silicone", "cirugía"],
    source: "FDA Breast Implant Guidelines 2020",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — LI-RADS (additional categories)
  // ═══════════════════════════════════════════
  {
    id: "lirads_4",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS 4: probable CHC", en: "LI-RADS 4: probable HCC", pt: "LI-RADS 4: provável CHC" },
    text: {
      es: "Observación hepática LI-RADS 4 (probable CHC). Se recomienda discusión multidisciplinaria; considerar biopsia o tratamiento según contexto clínico (ACR LI-RADS v2018).",
      en: "LI-RADS 4 hepatic observation (probable HCC). Multidisciplinary discussion recommended; consider biopsy or treatment based on clinical context (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS 4 (provável CHC). Discussão multidisciplinar recomendada; considerar biópsia ou tratamento conforme contexto clínico (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "CHC", "HCC", "hepatocarcinoma", "cirrosis", "cirrhosis"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },
  {
    id: "lirads_5",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS 5: CHC definitivo", en: "LI-RADS 5: definite HCC", pt: "LI-RADS 5: CHC definitivo" },
    text: {
      es: "Observación hepática LI-RADS 5 (CHC definitivo). Se recomienda manejo multidisciplinario; no requiere confirmación histológica para tratamiento (ACR LI-RADS v2018).",
      en: "LI-RADS 5 hepatic observation (definite HCC). Multidisciplinary management recommended; histologic confirmation not required for treatment (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS 5 (CHC definitivo). Manejo multidisciplinar recomendado; confirmação histológica não necessária para tratamento (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "CHC", "HCC", "hepatocarcinoma", "cirrosis", "cirrhosis", "tratamiento"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },
  {
    id: "lirads_m",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS M: maligno no CHC", en: "LI-RADS M: malignant non-HCC", pt: "LI-RADS M: maligno não CHC" },
    text: {
      es: "Observación hepática LI-RADS M (probablemente maligno, no específico de CHC). Se recomienda biopsia para diagnóstico histológico (ACR LI-RADS v2018).",
      en: "LI-RADS M hepatic observation (probably malignant, not HCC-specific). Biopsy for histologic diagnosis recommended (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS M (provavelmente maligno, não específico de CHC). Biópsia para diagnóstico histológico recomendada (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "maligno", "malignant", "biopsia", "biopsy", "colangiocarcinoma"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — Pancreatic cyst (fill size gaps)
  // ═══════════════════════════════════════════
  {
    id: "pancreas_cyst_15to25",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Quiste pancreático 1.5-2.5cm", en: "Pancreatic cyst 1.5-2.5cm", pt: "Cisto pancreático 1.5-2.5cm" },
    text: {
      es: "Lesión quística pancreática de 1.5-2.5 cm sin características preocupantes. Se recomienda RM/CPRM de control anual durante 2 años, luego espaciar si estable (ACR IF 2017).",
      en: "Pancreatic cystic lesion 1.5-2.5 cm without worrisome features. Annual MRI/MRCP for 2 years recommended, then lengthen interval if stable (ACR IF 2017).",
      pt: "Lesão cística pancreática de 1.5-2.5 cm sem características preocupantes. RM/CPRM de controle anual por 2 anos recomendada, depois espaçar se estável (ACR IF 2017).",
    },
    tags: ["páncreas", "pancreas", "quiste", "cyst", "IPMN", "mucinoso", "CPRM", "MRCP"],
    source: "ACR Incidental Findings 2017",
    scope: "system",
  },
  {
    id: "pancreas_cyst_25to3",
    category: "Abdomen and pelvis",
    modality: "all",
    title: { es: "Quiste pancreático 2.5-3cm", en: "Pancreatic cyst 2.5-3cm", pt: "Cisto pancreático 2.5-3cm" },
    text: {
      es: "Lesión quística pancreática de 2.5-3 cm. Se recomienda RM/CPRM de control en 6 meses; considerar ecoendoscopia si crecimiento o cambio morfológico (ACR IF 2017).",
      en: "Pancreatic cystic lesion 2.5-3 cm. Follow-up MRI/MRCP in 6 months recommended; consider EUS if growth or morphologic change (ACR IF 2017).",
      pt: "Lesão cística pancreática de 2.5-3 cm. RM/CPRM de controle em 6 meses recomendada; considerar ecoendoscopia se crescimento ou mudança morfológica (ACR IF 2017).",
    },
    tags: ["páncreas", "pancreas", "quiste", "cyst", "IPMN", "mucinoso", "EUS"],
    source: "ACR Incidental Findings 2017",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — Ovarian (expanded by size/status)
  // ═══════════════════════════════════════════
  {
    id: "ovarian_premenop_5to7",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico 5-7cm premenop.", en: "Ovarian cyst 5-7cm premenop.", pt: "Cisto ovariano 5-7cm pré-menop." },
    text: {
      es: "Quiste ovárico simple de 5-7 cm en paciente premenopáusica. Se recomienda ecografía de control en 8-12 semanas para confirmar resolución (ACR 2020).",
      en: "Simple ovarian cyst 5-7 cm in premenopausal patient. Follow-up ultrasound at 8-12 weeks to confirm resolution recommended (ACR 2020).",
      pt: "Cisto ovariano simples de 5-7 cm em paciente pré-menopausa. Ecografia de controle em 8-12 semanas para confirmar resolução recomendada (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "premenopáusica", "premenopausal"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_premenop_gt7",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico >7cm premenop.", en: "Ovarian cyst >7cm premenop.", pt: "Cisto ovariano >7cm pré-menop." },
    text: {
      es: "Quiste ovárico simple >7 cm en paciente premenopáusica. Se recomienda RM pélvica para mejor caracterización (ACR 2020).",
      en: "Simple ovarian cyst >7 cm in premenopausal patient. Pelvic MRI for further characterization recommended (ACR 2020).",
      pt: "Cisto ovariano simples >7 cm em paciente pré-menopausa. RM pélvica para melhor caracterização recomendada (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "premenopáusica", "premenopausal", "RM", "MRI"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_hemorrhagic",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico hemorrágico", en: "Hemorrhagic ovarian cyst", pt: "Cisto ovariano hemorrágico" },
    text: {
      es: "Quiste ovárico hemorrágico típico en paciente premenopáusica. Se recomienda ecografía de control en 6-12 semanas para confirmar resolución (ACR 2020).",
      en: "Typical hemorrhagic ovarian cyst in premenopausal patient. Follow-up ultrasound at 6-12 weeks to confirm resolution recommended (ACR 2020).",
      pt: "Cisto ovariano hemorrágico típico em paciente pré-menopausa. Ecografia de controle em 6-12 semanas para confirmar resolução recomendada (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "hemorrágico", "hemorrhagic", "funcional"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_postmenop_lt3",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico <3cm postmenop.", en: "Ovarian cyst <3cm postmenop.", pt: "Cisto ovariano <3cm pós-menop." },
    text: {
      es: "Quiste ovárico simple <3 cm en paciente postmenopáusica. Probablemente benigno. Se recomienda ecografía de control anual (ACR 2020).",
      en: "Simple ovarian cyst <3 cm in postmenopausal patient. Likely benign. Annual follow-up ultrasound recommended (ACR 2020).",
      pt: "Cisto ovariano simples <3 cm em paciente pós-menopausa. Provavelmente benigno. Ecografia de controle anual recomendada (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "postmenopáusica", "postmenopausal"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_postmenop_3to7",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico 3-7cm postmenop.", en: "Ovarian cyst 3-7cm postmenop.", pt: "Cisto ovariano 3-7cm pós-menop." },
    text: {
      es: "Quiste ovárico simple de 3-7 cm en paciente postmenopáusica. Se recomienda ecografía de control en 6-12 semanas, luego seguimiento anual si estable (ACR 2020).",
      en: "Simple ovarian cyst 3-7 cm in postmenopausal patient. Follow-up ultrasound at 6-12 weeks, then annual follow-up if stable, recommended (ACR 2020).",
      pt: "Cisto ovariano simples de 3-7 cm em paciente pós-menopausa. Ecografia de controle em 6-12 semanas, depois seguimento anual se estável, recomendado (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "postmenopáusica", "postmenopausal"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_postmenop_gt7",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Quiste ovárico >7cm postmenop.", en: "Ovarian cyst >7cm postmenop.", pt: "Cisto ovariano >7cm pós-menop." },
    text: {
      es: "Quiste ovárico >7 cm en paciente postmenopáusica. Se recomienda RM pélvica y valoración ginecológica (ACR 2020).",
      en: "Ovarian cyst >7 cm in postmenopausal patient. Pelvic MRI and gynecologic evaluation recommended (ACR 2020).",
      pt: "Cisto ovariano >7 cm em paciente pós-menopausa. RM pélvica e avaliação ginecológica recomendadas (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "quiste", "cyst", "postmenopáusica", "postmenopausal", "RM", "MRI"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "ovarian_complex",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Masa anexial compleja", en: "Complex adnexal mass", pt: "Massa anexial complexa" },
    text: {
      es: "Masa anexial con componente sólido o características complejas. Se recomienda RM pélvica con protocolo O-RADS y valoración ginecológica (ACR 2020).",
      en: "Adnexal mass with solid component or complex features. Pelvic MRI with O-RADS protocol and gynecologic evaluation recommended (ACR 2020).",
      pt: "Massa anexial com componente sólido ou características complexas. RM pélvica com protocolo O-RADS e avaliação ginecológica recomendadas (ACR 2020).",
    },
    tags: ["ovario", "ovarian", "anexial", "adnexal", "masa", "mass", "sólido", "solid", "complejo", "complex"],
    source: "ACR O-RADS US 2020 (Patel et al., JACR 2020)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — O-RADS MRI
  // ═══════════════════════════════════════════
  {
    id: "orads_3",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "O-RADS MRI 3: intermedio", en: "O-RADS MRI 3: intermediate", pt: "O-RADS MRI 3: intermediário" },
    text: {
      es: "Masa anexial O-RADS MRI 3 (riesgo intermedio de malignidad). Se recomienda seguimiento con RM en 6-12 semanas o valoración ginecológica (ACR O-RADS MRI 2022).",
      en: "O-RADS MRI 3 adnexal mass (intermediate malignancy risk). Follow-up MRI in 6-12 weeks or gynecologic evaluation recommended (ACR O-RADS MRI 2022).",
      pt: "Massa anexial O-RADS MRI 3 (risco intermediário de malignidade). Seguimento com RM em 6-12 semanas ou avaliação ginecológica recomendado (ACR O-RADS MRI 2022).",
    },
    tags: ["O-RADS", "ovario", "ovarian", "anexial", "adnexal", "RM", "MRI"],
    source: "ACR O-RADS MRI 2022 (Thomassin-Naggara et al., Radiology 2022)",
    scope: "system",
  },
  {
    id: "orads_4",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "O-RADS MRI 4: alto riesgo", en: "O-RADS MRI 4: high risk", pt: "O-RADS MRI 4: alto risco" },
    text: {
      es: "Masa anexial O-RADS MRI 4 (alto riesgo de malignidad). Se recomienda valoración quirúrgica con ginecología oncológica (ACR O-RADS MRI 2022).",
      en: "O-RADS MRI 4 adnexal mass (high malignancy risk). Surgical evaluation with gynecologic oncology recommended (ACR O-RADS MRI 2022).",
      pt: "Massa anexial O-RADS MRI 4 (alto risco de malignidade). Avaliação cirúrgica com ginecologia oncológica recomendada (ACR O-RADS MRI 2022).",
    },
    tags: ["O-RADS", "ovario", "ovarian", "anexial", "adnexal", "maligno", "cirugía"],
    source: "ACR O-RADS MRI 2022 (Thomassin-Naggara et al., Radiology 2022)",
    scope: "system",
  },
  {
    id: "orads_5",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "O-RADS MRI 5: muy alto riesgo", en: "O-RADS MRI 5: very high risk", pt: "O-RADS MRI 5: risco muito alto" },
    text: {
      es: "Masa anexial O-RADS MRI 5 (muy alto riesgo de malignidad). Se recomienda derivación urgente a ginecología oncológica para valoración quirúrgica (ACR O-RADS MRI 2022).",
      en: "O-RADS MRI 5 adnexal mass (very high malignancy risk). Urgent referral to gynecologic oncology for surgical evaluation recommended (ACR O-RADS MRI 2022).",
      pt: "Massa anexial O-RADS MRI 5 (risco muito alto de malignidade). Encaminhamento urgente para ginecologia oncológica para avaliação cirúrgica recomendado (ACR O-RADS MRI 2022).",
    },
    tags: ["O-RADS", "ovario", "ovarian", "anexial", "adnexal", "maligno", "malignant", "cirugía", "urgente"],
    source: "ACR O-RADS MRI 2022 (Thomassin-Naggara et al., Radiology 2022)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — Diverticulitis (Hinchey)
  // ═══════════════════════════════════════════
  {
    id: "diverticulitis_abscess",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Diverticulitis con absceso", en: "Diverticulitis with abscess", pt: "Diverticulite com abscesso" },
    text: {
      es: "Diverticulitis aguda complicada con absceso (Hinchey Ib/II). Se recomienda drenaje percutáneo guiado por imagen si absceso >3 cm, antibioterapia intravenosa y consulta quirúrgica (WSES 2020).",
      en: "Complicated acute diverticulitis with abscess (Hinchey Ib/II). Image-guided percutaneous drainage if abscess >3 cm, IV antibiotics, and surgical consultation recommended (WSES 2020).",
      pt: "Diverticulite aguda complicada com abscesso (Hinchey Ib/II). Drenagem percutânea guiada por imagem se abscesso >3 cm, antibioticoterapia intravenosa e consulta cirúrgica recomendados (WSES 2020).",
    },
    tags: ["diverticulitis", "diverticulite", "absceso", "abscess", "Hinchey", "drenaje", "drainage"],
    source: "WSES Guidelines 2020; Modified Hinchey (Wasvary et al., Am Surg 1999)",
    scope: "system",
  },
  {
    id: "diverticulitis_peritonitis",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Diverticulitis con peritonitis", en: "Diverticulitis with peritonitis", pt: "Diverticulite com peritonite" },
    text: {
      es: "Diverticulitis aguda complicada con peritonitis (Hinchey III/IV). Se recomienda consulta quirúrgica urgente (WSES 2020).",
      en: "Complicated acute diverticulitis with peritonitis (Hinchey III/IV). Urgent surgical consultation recommended (WSES 2020).",
      pt: "Diverticulite aguda complicada com peritonite (Hinchey III/IV). Consulta cirúrgica urgente recomendada (WSES 2020).",
    },
    tags: ["diverticulitis", "diverticulite", "peritonitis", "peritonite", "Hinchey", "cirugía", "surgery", "urgente"],
    source: "WSES Guidelines 2020; Modified Hinchey (Wasvary et al., Am Surg 1999)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — Hydronephrosis
  // ═══════════════════════════════════════════
  {
    id: "hydronephrosis_sfu34",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "Hidronefrosis SFU 3-4", en: "Hydronephrosis SFU 3-4", pt: "Hidronefrose SFU 3-4" },
    text: {
      es: "Hidronefrosis grado 3-4 (SFU). Se recomienda valoración urológica y gammagrafía renal (MAG3/DTPA) para evaluar función diferencial (SFU/Nguyen et al., 2014).",
      en: "Grade 3-4 hydronephrosis (SFU). Urologic evaluation and renal scintigraphy (MAG3/DTPA) to assess differential function recommended (SFU/Nguyen et al., 2014).",
      pt: "Hidronefrose grau 3-4 (SFU). Avaliação urológica e cintilografia renal (MAG3/DTPA) para avaliar função diferencial recomendadas (SFU/Nguyen et al., 2014).",
    },
    tags: ["hidronefrosis", "hydronephrosis", "SFU", "renal", "riñón", "kidney", "obstructiva", "obstructive", "urología"],
    source: "SFU Grading System; Nguyen et al., J Pediatr Urol 2014",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // NEURO — Cerebral aneurysm (expanded)
  // ═══════════════════════════════════════════
  {
    id: "aneurysm_3to7_anterior",
    category: "Head and neck",
    modality: "all",
    title: { es: "Aneurisma 3-7mm anterior", en: "Aneurysm 3-7mm anterior", pt: "Aneurisma 3-7mm anterior" },
    text: {
      es: "Aneurisma intracraneal de 3-7 mm en circulación anterior. Se recomienda seguimiento con angio-RM o angio-TC en 6-12 meses; considerar tratamiento si factores de riesgo (AHA/ASA 2015).",
      en: "Intracranial aneurysm 3-7 mm in anterior circulation. Follow-up MRA or CTA in 6-12 months recommended; consider treatment if risk factors present (AHA/ASA 2015).",
      pt: "Aneurisma intracraniano de 3-7 mm em circulação anterior. Seguimento com angio-RM ou angio-TC em 6-12 meses recomendado; considerar tratamento se fatores de risco (AHA/ASA 2015).",
    },
    tags: ["aneurisma", "aneurysm", "intracraneal", "intracranial", "cerebral", "anterior", "ACI", "ACM"],
    source: "AHA/ASA Guidelines 2015 (Thompson et al., Stroke 2015)",
    scope: "system",
  },
  {
    id: "aneurysm_3to7_posterior",
    category: "Head and neck",
    modality: "all",
    title: { es: "Aneurisma 3-7mm posterior", en: "Aneurysm 3-7mm posterior", pt: "Aneurisma 3-7mm posterior" },
    text: {
      es: "Aneurisma intracraneal de 3-7 mm en circulación posterior. Mayor riesgo de ruptura. Se recomienda valoración neuroquirúrgica/neurointervencionista (AHA/ASA 2015; ISUIA 2003).",
      en: "Intracranial aneurysm 3-7 mm in posterior circulation. Higher rupture risk. Neurosurgical/neurointerventional evaluation recommended (AHA/ASA 2015; ISUIA 2003).",
      pt: "Aneurisma intracraniano de 3-7 mm em circulação posterior. Maior risco de ruptura. Avaliação neurocirúrgica/neurointervencionista recomendada (AHA/ASA 2015; ISUIA 2003).",
    },
    tags: ["aneurisma", "aneurysm", "intracraneal", "intracranial", "posterior", "basilar", "vertebral"],
    source: "AHA/ASA Guidelines 2015; ISUIA (Lancet 2003)",
    scope: "system",
  },
  {
    id: "aneurysm_7to12",
    category: "Head and neck",
    modality: "all",
    title: { es: "Aneurisma 7-12mm", en: "Aneurysm 7-12mm", pt: "Aneurisma 7-12mm" },
    text: {
      es: "Aneurisma intracraneal de 7-12 mm. Riesgo significativo de ruptura. Se recomienda valoración neuroquirúrgica/neurointervencionista para considerar tratamiento (AHA/ASA 2015).",
      en: "Intracranial aneurysm 7-12 mm. Significant rupture risk. Neurosurgical/neurointerventional evaluation to consider treatment recommended (AHA/ASA 2015).",
      pt: "Aneurisma intracraniano de 7-12 mm. Risco significativo de ruptura. Avaliação neurocirúrgica/neurointervencionista para considerar tratamento recomendada (AHA/ASA 2015).",
    },
    tags: ["aneurisma", "aneurysm", "intracraneal", "intracranial", "cerebral", "neurocirugía"],
    source: "AHA/ASA Guidelines 2015 (Thompson et al., Stroke 2015)",
    scope: "system",
  },
  {
    id: "aneurysm_ge13",
    category: "Head and neck",
    modality: "all",
    title: { es: "Aneurisma ≥13mm", en: "Aneurysm ≥13mm", pt: "Aneurisma ≥13mm" },
    text: {
      es: "Aneurisma intracraneal ≥13 mm. Alto riesgo de ruptura. Se recomienda valoración neuroquirúrgica/neurointervencionista para tratamiento (clipaje o embolización) (AHA/ASA 2015).",
      en: "Intracranial aneurysm ≥13 mm. High rupture risk. Neurosurgical/neurointerventional evaluation for treatment (clipping or coiling) recommended (AHA/ASA 2015).",
      pt: "Aneurisma intracraniano ≥13 mm. Alto risco de ruptura. Avaliação neurocirúrgica/neurointervencionista para tratamento (clipagem ou embolização) recomendada (AHA/ASA 2015).",
    },
    tags: ["aneurisma", "aneurysm", "intracraneal", "intracranial", "neurocirugía", "clipaje", "embolización"],
    source: "AHA/ASA Guidelines 2015 (Thompson et al., Stroke 2015)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // NEURO — Carotid stenosis
  // ═══════════════════════════════════════════
  {
    id: "carotid_50to69",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "Estenosis carotídea 50-69%", en: "Carotid stenosis 50-69%", pt: "Estenose carotídea 50-69%" },
    text: {
      es: "Estenosis carotídea del 50-69% (NASCET). En pacientes sintomáticos, valorar endarterectomía carotídea (CEA). En asintomáticos, tratamiento médico óptimo y seguimiento ecográfico (AHA/ASA 2021).",
      en: "Carotid stenosis 50-69% (NASCET). In symptomatic patients, carotid endarterectomy (CEA) should be considered. In asymptomatic patients, optimal medical therapy and ultrasound follow-up recommended (AHA/ASA 2021).",
      pt: "Estenose carotídea de 50-69% (NASCET). Em pacientes sintomáticos, considerar endarterectomia carotídea (CEA). Em assintomáticos, terapia médica otimizada e seguimento ecográfico recomendados (AHA/ASA 2021).",
    },
    tags: ["carótida", "carotid", "estenosis", "stenosis", "NASCET", "endarterectomía", "CEA", "placa", "plaque"],
    source: "AHA/ASA Guidelines 2021; NASCET (NEJM 1991)",
    scope: "system",
  },
  {
    id: "carotid_ge70",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "Estenosis carotídea ≥70%", en: "Carotid stenosis ≥70%", pt: "Estenose carotídea ≥70%" },
    text: {
      es: "Estenosis carotídea ≥70% (NASCET). Se recomienda valoración para revascularización (endarterectomía o stent carotídeo), especialmente en pacientes sintomáticos (AHA/ASA 2021).",
      en: "Carotid stenosis ≥70% (NASCET). Evaluation for revascularization (endarterectomy or carotid stenting) recommended, especially in symptomatic patients (AHA/ASA 2021).",
      pt: "Estenose carotídea ≥70% (NASCET). Avaliação para revascularização (endarterectomia ou stent carotídeo) recomendada, especialmente em pacientes sintomáticos (AHA/ASA 2021).",
    },
    tags: ["carótida", "carotid", "estenosis", "stenosis", "NASCET", "endarterectomía", "CEA", "stent", "revascularización"],
    source: "AHA/ASA Guidelines 2021; NASCET (NEJM 1991)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Thoracic aorta
  // ═══════════════════════════════════════════
  {
    id: "thoracic_aorta_ascending",
    category: "Thorax",
    modality: "CT",
    title: { es: "Aorta ascendente ≥5.5cm", en: "Ascending aorta ≥5.5cm", pt: "Aorta ascendente ≥5.5cm" },
    text: {
      es: "Dilatación de la aorta ascendente ≥5.5 cm. Se recomienda valoración de cirugía cardiovascular para reparación electiva. En Marfan ≥5.0 cm; en Loeys-Dietz 4.0-4.5 cm (ACC/AHA 2022).",
      en: "Ascending aortic dilatation ≥5.5 cm. Cardiovascular surgery evaluation for elective repair recommended. In Marfan ≥5.0 cm; in Loeys-Dietz 4.0-4.5 cm (ACC/AHA 2022).",
      pt: "Dilatação da aorta ascendente ≥5.5 cm. Avaliação de cirurgia cardiovascular para reparo eletivo recomendada. Em Marfan ≥5.0 cm; em Loeys-Dietz 4.0-4.5 cm (ACC/AHA 2022).",
    },
    tags: ["aorta", "ascendente", "ascending", "aneurisma", "aneurysm", "torácica", "thoracic", "Marfan", "cirugía"],
    source: "ACC/AHA Aortic Disease Guidelines 2022 (Isselbacher et al.)",
    scope: "system",
  },
  {
    id: "thoracic_aorta_descending",
    category: "Thorax",
    modality: "CT",
    title: { es: "Aorta descendente ≥5.5-6cm", en: "Descending aorta ≥5.5-6cm", pt: "Aorta descendente ≥5.5-6cm" },
    text: {
      es: "Dilatación de la aorta torácica descendente ≥5.5-6.0 cm. Se recomienda valoración para reparación endovascular (TEVAR) o quirúrgica (ACC/AHA 2022).",
      en: "Descending thoracic aortic dilatation ≥5.5-6.0 cm. Evaluation for endovascular (TEVAR) or surgical repair recommended (ACC/AHA 2022).",
      pt: "Dilatação da aorta torácica descendente ≥5.5-6.0 cm. Avaliação para reparo endovascular (TEVAR) ou cirúrgico recomendada (ACC/AHA 2022).",
    },
    tags: ["aorta", "descendente", "descending", "aneurisma", "aneurysm", "torácica", "thoracic", "TEVAR"],
    source: "ACC/AHA Aortic Disease Guidelines 2022 (Isselbacher et al.)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Aortic dissection
  // ═══════════════════════════════════════════
  {
    id: "dissection_stanford_a",
    category: "Thorax",
    modality: "CT",
    title: { es: "Disección aórtica Stanford A", en: "Stanford A aortic dissection", pt: "Dissecção aórtica Stanford A" },
    text: {
      es: "Disección aórtica Stanford tipo A (afecta aorta ascendente). Emergencia quirúrgica. Se recomienda consulta urgente con cirugía cardiovascular (ACC/AHA 2022).",
      en: "Stanford type A aortic dissection (involves ascending aorta). Surgical emergency. Urgent cardiovascular surgery consultation recommended (ACC/AHA 2022).",
      pt: "Dissecção aórtica Stanford tipo A (envolve aorta ascendente). Emergência cirúrgica. Consulta urgente com cirurgia cardiovascular recomendada (ACC/AHA 2022).",
    },
    tags: ["disección", "dissection", "aorta", "Stanford", "tipo A", "type A", "emergencia", "emergency", "cirugía"],
    source: "ACC/AHA Aortic Disease Guidelines 2022 (Isselbacher et al.)",
    scope: "system",
  },
  {
    id: "dissection_stanford_b",
    category: "Thorax",
    modality: "CT",
    title: { es: "Disección aórtica Stanford B", en: "Stanford B aortic dissection", pt: "Dissecção aórtica Stanford B" },
    text: {
      es: "Disección aórtica Stanford tipo B (no afecta aorta ascendente). Se recomienda manejo médico intensivo (control de presión arterial y frecuencia cardíaca) en UCI. Considerar TEVAR si complicada (ACC/AHA 2022).",
      en: "Stanford type B aortic dissection (does not involve ascending aorta). Intensive medical management (blood pressure and heart rate control) in ICU recommended. Consider TEVAR if complicated (ACC/AHA 2022).",
      pt: "Dissecção aórtica Stanford tipo B (não envolve aorta ascendente). Manejo médico intensivo (controle de pressão arterial e frequência cardíaca) em UTI recomendado. Considerar TEVAR se complicada (ACC/AHA 2022).",
    },
    tags: ["disección", "dissection", "aorta", "Stanford", "tipo B", "type B", "TEVAR", "UCI", "ICU"],
    source: "ACC/AHA Aortic Disease Guidelines 2022 (Isselbacher et al.)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Fleischner 2017: Multiple nodules
  // ═══════════════════════════════════════════
  {
    id: "fleisch_multi_solid_lt6_low",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples sólidos <6mm bajo riesgo", en: "Multiple solid <6mm low risk", pt: "Múltiplos sólidos <6mm baixo risco" },
    text: {
      es: "Múltiples nódulos pulmonares sólidos <6 mm en paciente de bajo riesgo. No requiere seguimiento de rutina (Fleischner 2017).",
      en: "Multiple solid pulmonary nodules <6 mm in low-risk patient. No routine follow-up required (Fleischner 2017).",
      pt: "Múltiplos nódulos pulmonares sólidos <6 mm em paciente de baixo risco. Não requer seguimento de rotina (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "sólido", "solid", "pulmonar", "bajo riesgo", "low risk"],
    source: "Fleischner 2017 (MacMahon et al., Radiology 2017)",
    scope: "system",
  },
  {
    id: "fleisch_multi_solid_lt6_high",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples sólidos <6mm alto riesgo", en: "Multiple solid <6mm high risk", pt: "Múltiplos sólidos <6mm alto risco" },
    text: {
      es: "Múltiples nódulos pulmonares sólidos <6 mm en paciente de alto riesgo. Se recomienda TC de control en 3-6 meses; si estables, considerar TC a los 2 y 4 años (Fleischner 2017).",
      en: "Multiple solid pulmonary nodules <6 mm in high-risk patient. Follow-up CT at 3-6 months recommended; if stable, consider CT at 2 and 4 years (Fleischner 2017).",
      pt: "Múltiplos nódulos pulmonares sólidos <6 mm em paciente de alto risco. TC de controle em 3-6 meses recomendado; se estáveis, considerar TC em 2 e 4 anos (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "sólido", "solid", "pulmonar", "alto riesgo", "high risk"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_multi_solid_ge6_low",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples sólidos ≥6mm (dominante) bajo riesgo", en: "Multiple solid ≥6mm (dominant) low risk", pt: "Múltiplos sólidos ≥6mm (dominante) baixo risco" },
    text: {
      es: "Múltiples nódulos pulmonares sólidos con el más grande ≥6 mm en paciente de bajo riesgo. Se recomienda TC de control en 3-6 meses; si estables, considerar TC a los 18-24 meses (Fleischner 2017).",
      en: "Multiple solid pulmonary nodules with dominant nodule ≥6 mm in low-risk patient. Follow-up CT at 3-6 months recommended; if stable, consider CT at 18-24 months (Fleischner 2017).",
      pt: "Múltiplos nódulos pulmonares sólidos com o maior ≥6 mm em paciente de baixo risco. TC de controle em 3-6 meses recomendado; se estáveis, considerar TC em 18-24 meses (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "sólido", "solid", "dominante", "dominant"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_multi_solid_ge6_high",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples sólidos ≥6mm (dominante) alto riesgo", en: "Multiple solid ≥6mm (dominant) high risk", pt: "Múltiplos sólidos ≥6mm (dominante) alto risco" },
    text: {
      es: "Múltiples nódulos pulmonares sólidos con el más grande ≥6 mm en paciente de alto riesgo. Se recomienda TC de control en 3-6 meses; si estables, TC a los 18-24 meses (Fleischner 2017).",
      en: "Multiple solid pulmonary nodules with dominant nodule ≥6 mm in high-risk patient. Follow-up CT at 3-6 months recommended; if stable, CT at 18-24 months (Fleischner 2017).",
      pt: "Múltiplos nódulos pulmonares sólidos com o maior ≥6 mm em paciente de alto risco. TC de controle em 3-6 meses recomendado; se estáveis, TC em 18-24 meses (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "sólido", "solid", "dominante", "dominant", "alto riesgo", "high risk"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_multi_ggn_lt6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples vidrio deslustrado <6mm", en: "Multiple GGNs <6mm", pt: "Múltiplos vidro fosco <6mm" },
    text: {
      es: "Múltiples nódulos pulmonares en vidrio deslustrado <6 mm. Se recomienda TC de control en 2 y 4 años. Si estables, no requiere más seguimiento (Fleischner 2017).",
      en: "Multiple ground-glass nodules <6 mm. Follow-up CT at 2 and 4 years recommended. If stable, no further follow-up required (Fleischner 2017).",
      pt: "Múltiplos nódulos em vidro fosco <6 mm. TC de controle em 2 e 4 anos recomendado. Se estáveis, não requer mais seguimento (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "vidrio", "deslustrado", "ground-glass", "GGN", "subsólido"],
    source: "Fleischner 2017",
    scope: "system",
  },
  {
    id: "fleisch_multi_ggn_ge6",
    category: "Thorax",
    modality: "CT",
    title: { es: "Múltiples vidrio deslustrado ≥6mm (dominante)", en: "Multiple GGNs ≥6mm (dominant)", pt: "Múltiplos vidro fosco ≥6mm (dominante)" },
    text: {
      es: "Múltiples nódulos pulmonares en vidrio deslustrado con el más grande ≥6 mm. Se recomienda TC de control en 3-6 meses. Si persisten, TC cada 2 años durante 5 años (Fleischner 2017).",
      en: "Multiple ground-glass nodules with dominant nodule ≥6 mm. Follow-up CT at 3-6 months recommended. If persistent, CT every 2 years for 5 years (Fleischner 2017).",
      pt: "Múltiplos nódulos em vidro fosco com o maior ≥6 mm. TC de controle em 3-6 meses recomendado. Se persistentes, TC a cada 2 anos por 5 anos (Fleischner 2017).",
    },
    tags: ["nódulo", "nodule", "múltiple", "multiple", "vidrio", "deslustrado", "ground-glass", "GGN", "dominante", "dominant"],
    source: "Fleischner 2017",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — Lung-RADS v2022 (missing categories)
  // ═══════════════════════════════════════════
  {
    id: "lungrads_0",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 0: incompleto", en: "Lung-RADS 0: incomplete", pt: "Lung-RADS 0: incompleto" },
    text: {
      es: "Lung-RADS 0 (incompleto): estudio técnicamente inadecuado o que no permite evaluación completa. Se recomienda repetir TC de baja dosis (ACR Lung-RADS v2022). Comparar con estudios previos si disponibles.",
      en: "Lung-RADS 0 (incomplete): technically inadequate study or incomplete evaluation. Repeat low-dose CT recommended (ACR Lung-RADS v2022). Compare with prior studies if available.",
      pt: "Lung-RADS 0 (incompleto): estudo tecnicamente inadequado ou avaliação incompleta. Repetir TC de baixa dose recomendada (ACR Lung-RADS v2022). Comparar com estudos prévios se disponíveis.",
    },
    tags: ["Lung-RADS", "screening", "incompleto", "incomplete", "pulmón", "lung"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_1",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 1: negativo", en: "Lung-RADS 1: negative", pt: "Lung-RADS 1: negativo" },
    text: {
      es: "Lung-RADS 1 (negativo): sin nódulos pulmonares o nódulos con calcificación benigna completa (grasa, palomita de maíz, central, laminada, difusa). TC de screening anual de baja dosis (ACR Lung-RADS v2022).",
      en: "Lung-RADS 1 (negative): no pulmonary nodules or nodules with complete benite calcification (fat, popcorn, central, laminated, diffuse). Annual low-dose screening CT (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 1 (negativo): sem nódulos pulmonares ou nódulos com calcificação benigna completa (gordura, pipoca, central, laminada, difusa). TC de screening anual de baixa dose (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "negativo", "negative", "screening", "pulmón", "lung", "calcificación", "calcification"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_2",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 2: benigno", en: "Lung-RADS 2: benign", pt: "Lung-RADS 2: benigno" },
    text: {
      es: "Lung-RADS 2 (apariencia benigna): incluye nódulo sólido <6 mm, nuevo nódulo sólido <4 mm, vidrio deslustrado <30 mm, nódulo estable o con calcificación parcial benigna. TC de screening anual de baja dosis (ACR Lung-RADS v2022).",
      en: "Lung-RADS 2 (benign appearance): includes solid nodule <6 mm, new solid nodule <4 mm, ground-glass nodule <30 mm, stable nodule, or nodule with partial benign calcification. Annual low-dose screening CT (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 2 (aparência benigna): inclui nódulo sólido <6 mm, novo nódulo sólido <4 mm, vidro fosco <30 mm, nódulo estável ou com calcificação parcial benigna. TC de screening anual de baixa dose (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "benigno", "benign", "screening", "nódulo", "nodule", "pulmón", "lung"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_4x",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS 4X: rasgos sospechosos adicionales", en: "Lung-RADS 4X: additional suspicious features", pt: "Lung-RADS 4X: características suspeitas adicionais" },
    text: {
      es: "Lung-RADS 4X: nódulo categoría 3 o 4 con rasgos adicionales sospechosos (espiculación, localización en lóbulo superior, crecimiento rápido, linfadenopatía, enfisema adyacente). Aumenta la sospecha independientemente del tamaño. Se recomienda PET/TC, biopsia o resección según contexto clínico (ACR Lung-RADS v2022).",
      en: "Lung-RADS 4X: category 3 or 4 nodule with additional suspicious features (spiculation, upper lobe location, rapid growth, lymphadenopathy, adjacent emphysema). Increases suspicion regardless of size. PET/CT, biopsy, or resection recommended based on clinical context (ACR Lung-RADS v2022).",
      pt: "Lung-RADS 4X: nódulo categoria 3 ou 4 com características adicionais suspeitas (espiculação, localização em lobo superior, crescimento rápido, linfadenopatia, enfisema adjacente). Aumenta a suspeita independentemente do tamanho. PET/TC, biópsia ou ressecção recomendada conforme contexto clínico (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "4X", "sospechoso", "suspicious", "espiculado", "spiculated", "PET", "biopsia", "biopsy"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },
  {
    id: "lungrads_s",
    category: "Thorax",
    modality: "CT",
    title: { es: "Lung-RADS S: hallazgo incidental significativo", en: "Lung-RADS S: significant incidental finding", pt: "Lung-RADS S: achado incidental significativo" },
    text: {
      es: "Lung-RADS S: hallazgo clínicamente significativo no relacionado con cáncer de pulmón (aneurisma aórtico, adenopatías mediastínicas, enfermedad coronaria, hallazgo extrapulmonar relevante). Requiere valoración clínica adicional según el hallazgo (ACR Lung-RADS v2022).",
      en: "Lung-RADS S: clinically significant finding unrelated to lung cancer (aortic aneurysm, mediastinal lymphadenopathy, coronary artery disease, relevant extrapulmonary finding). Additional clinical evaluation per finding required (ACR Lung-RADS v2022).",
      pt: "Lung-RADS S: achado clinicamente significativo não relacionado a câncer de pulmão (aneurisma aórtico, linfadenopatia mediastinal, doença coronariana, achado extrapulmonar relevante). Avaliação clínica adicional conforme o achado necessária (ACR Lung-RADS v2022).",
    },
    tags: ["Lung-RADS", "incidental", "screening", "significativo", "significant", "pulmón", "lung"],
    source: "ACR Lung-RADS v2022 (Christensen JD et al., JACR 2024)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // THORAX — BI-RADS (missing categories)
  // ═══════════════════════════════════════════
  {
    id: "birads_0",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 0: evaluación adicional", en: "BI-RADS 0: additional evaluation", pt: "BI-RADS 0: avaliação adicional" },
    text: {
      es: "BI-RADS 0 (evaluación incompleta). Se necesita evaluación adicional con proyecciones complementarias, ecografía u otra prueba de imagen antes de asignar una categoría definitiva (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 0 (incomplete evaluation). Additional evaluation needed with supplementary views, ultrasound, or other imaging before a final category can be assigned (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 0 (avaliação incompleta). Necessita avaliação adicional com projeções complementares, ecografia ou outro exame de imagem antes de atribuir uma categoria definitiva (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "mamografía", "mammography", "incompleto", "incomplete"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_1",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 1: negativo", en: "BI-RADS 1: negative", pt: "BI-RADS 1: negativo" },
    text: {
      es: "BI-RADS 1 (negativo). No se observan hallazgos mamográficos de interés. Las mamas son simétricas y no hay masas, distorsiones ni calcificaciones sospechosas. Se recomienda mamografía de screening de rutina (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 1 (negative). No mammographic findings of concern. Breasts are symmetric with no masses, distortions, or suspicious calcifications. Routine screening mammography recommended (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 1 (negativo). Sem achados mamográficos de interesse. Mamas simétricas sem massas, distorções ou calcificações suspeitas. Mamografia de screening de rotina recomendada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "mamografía", "mammography", "negativo", "negative", "normal"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_2",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 2: benigno", en: "BI-RADS 2: benign", pt: "BI-RADS 2: benigno" },
    text: {
      es: "BI-RADS 2 (hallazgo benigno). Se identifican hallazgos definitivamente benignos (quiste simple, fibroadenoma calcificado, ganglios intramamarios, calcificaciones vasculares, etc.). No se asocia a malignidad. Se recomienda mamografía de screening de rutina (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 2 (benign finding). Definitively benign findings identified (simple cyst, calcified fibroadenoma, intramammary lymph nodes, vascular calcifications, etc.). Not associated with malignancy. Routine screening mammography recommended (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 2 (achado benigno). Achados definitivamente benignos identificados (cisto simples, fibroadenoma calcificado, linfonodos intramamários, calcificações vasculares, etc.). Não associado a malignidade. Mamografia de screening de rotina recomendada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "mamografía", "mammography", "benigno", "benign", "quiste", "fibroadenoma"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_4a",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 4A: baja sospecha", en: "BI-RADS 4A: low suspicion", pt: "BI-RADS 4A: baixa suspeita" },
    text: {
      es: "BI-RADS 4A (baja sospecha de malignidad, 2-10%). Incluye masa sólida palpable parcialmente circunscrita con ecografía sugestiva de fibroadenoma, quiste complicado probable, absceso. Se recomienda biopsia percutánea; si el resultado es concordante benigno, seguimiento a 6 meses (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 4A (low suspicion for malignancy, 2-10%). Includes palpable partially circumscribed solid mass with ultrasound suggestive of fibroadenoma, probable complicated cyst, abscess. Percutaneous biopsy recommended; if concordant benign result, 6-month follow-up (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 4A (baixa suspeita de malignidade, 2-10%). Inclui massa sólida palpável parcialmente circunscrita com ecografia sugestiva de fibroadenoma, cisto complicado provável, abscesso. Biópsia percutânea recomendada; se resultado concordante benigno, seguimento em 6 meses (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "4A", "baja sospecha", "low suspicion", "biopsia", "biopsy"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_4b",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 4B: sospecha moderada", en: "BI-RADS 4B: moderate suspicion", pt: "BI-RADS 4B: suspeita moderada" },
    text: {
      es: "BI-RADS 4B (sospecha moderada de malignidad, 10-50%). Incluye masa sólida de bordes parcialmente indistintos o microlobulados, grupo de calcificaciones amorfas, distorsión arquitectural nueva. Se recomienda biopsia percutánea con correlación radiopatológica estricta (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 4B (moderate suspicion for malignancy, 10-50%). Includes solid mass with partially indistinct or microlobulated margins, cluster of amorphous calcifications, new architectural distortion. Percutaneous biopsy with strict radiopathologic correlation recommended (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 4B (suspeita moderada de malignidade, 10-50%). Inclui massa sólida com margens parcialmente indistintas ou microlobuladas, grupo de calcificações amorfas, distorção arquitetural nova. Biópsia percutânea com correlação radiopatológica estrita recomendada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "4B", "moderada", "moderate", "biopsia", "biopsy", "calcificaciones", "calcifications"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_4c",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 4C: alta sospecha", en: "BI-RADS 4C: high suspicion", pt: "BI-RADS 4C: alta suspeita" },
    text: {
      es: "BI-RADS 4C (alta sospecha de malignidad, 50-95%). Incluye masa irregular espiculada, calcificaciones pleomorfas finas lineales o segmentarias, masa nueva con retracción cutánea. Se recomienda biopsia percutánea; un resultado benigno no es concordante y debe considerarse rebiopsia o escisión (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 4C (high suspicion for malignancy, 50-95%). Includes irregular spiculated mass, fine linear or segmental pleomorphic calcifications, new mass with skin retraction. Percutaneous biopsy recommended; a benign result is discordant and rebiopsy or excision should be considered (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 4C (alta suspeita de malignidade, 50-95%). Inclui massa irregular espiculada, calcificações pleomórficas finas lineares ou segmentares, massa nova com retração cutânea. Biópsia percutânea recomendada; resultado benigno é discordante e rebiópsia ou excisão deve ser considerada (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "4C", "alta sospecha", "high suspicion", "biopsia", "biopsy", "espiculado", "spiculated"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },
  {
    id: "birads_6",
    category: "Thorax",
    modality: "Mammography",
    title: { es: "BI-RADS 6: malignidad confirmada", en: "BI-RADS 6: known malignancy", pt: "BI-RADS 6: malignidade confirmada" },
    text: {
      es: "BI-RADS 6 (malignidad confirmada por biopsia). Hallazgos ya diagnosticados histológicamente como malignos previo al tratamiento definitivo. Se recomienda completar estadificación y tratamiento según protocolo oncológico (ACR BI-RADS 5ª ed.).",
      en: "BI-RADS 6 (biopsy-proven malignancy). Findings already histologically diagnosed as malignant prior to definitive treatment. Complete staging and treatment per oncologic protocol recommended (ACR BI-RADS 5th ed.).",
      pt: "BI-RADS 6 (malignidade confirmada por biópsia). Achados já diagnosticados histologicamente como malignos antes do tratamento definitivo. Completar estadiamento e tratamento conforme protocolo oncológico recomendado (ACR BI-RADS 5ª ed.).",
    },
    tags: ["BI-RADS", "mama", "breast", "maligno", "malignant", "biopsia", "biopsy", "confirmado", "confirmed", "tratamiento"],
    source: "ACR BI-RADS 5th Edition (2013)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // HEAD AND NECK — ACR TI-RADS 2017
  // ═══════════════════════════════════════════
  {
    id: "tirads_tr1",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "TI-RADS TR1: benigno", en: "TI-RADS TR1: benign", pt: "TI-RADS TR1: benigno" },
    text: {
      es: "ACR TI-RADS TR1 (benigno, 0 puntos): nódulo tiroideo quístico o casi completamente quístico. No requiere PAAF ni seguimiento ecográfico (ACR TI-RADS 2017).",
      en: "ACR TI-RADS TR1 (benign, 0 points): cystic or almost completely cystic thyroid nodule. No FNA or ultrasound follow-up required (ACR TI-RADS 2017).",
      pt: "ACR TI-RADS TR1 (benigno, 0 pontos): nódulo tireoidiano cístico ou quase completamente cístico. Não requer PAAF nem seguimento ecográfico (ACR TI-RADS 2017).",
    },
    tags: ["TI-RADS", "tiroides", "thyroid", "TR1", "benigno", "benign", "quístico", "cystic"],
    source: "ACR TI-RADS 2017 (Tessler FN et al., JACR 2017)",
    scope: "system",
  },
  {
    id: "tirads_tr2",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "TI-RADS TR2: no sospechoso", en: "TI-RADS TR2: not suspicious", pt: "TI-RADS TR2: não suspeito" },
    text: {
      es: "ACR TI-RADS TR2 (no sospechoso, 2 puntos): nódulo tiroideo espongiforme o mixto quístico/sólido con características benignas. No requiere PAAF ni seguimiento ecográfico (ACR TI-RADS 2017).",
      en: "ACR TI-RADS TR2 (not suspicious, 2 points): spongiform or mixed cystic/solid thyroid nodule with benign features. No FNA or ultrasound follow-up required (ACR TI-RADS 2017).",
      pt: "ACR TI-RADS TR2 (não suspeito, 2 pontos): nódulo tireoidiano espongiforme ou misto cístico/sólido com características benignas. Não requer PAAF nem seguimento ecográfico (ACR TI-RADS 2017).",
    },
    tags: ["TI-RADS", "tiroides", "thyroid", "TR2", "no sospechoso", "not suspicious", "espongiforme", "spongiform"],
    source: "ACR TI-RADS 2017 (Tessler FN et al., JACR 2017)",
    scope: "system",
  },
  {
    id: "tirads_tr3",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "TI-RADS TR3: levemente sospechoso", en: "TI-RADS TR3: mildly suspicious", pt: "TI-RADS TR3: levemente suspeito" },
    text: {
      es: "ACR TI-RADS TR3 (levemente sospechoso, 3 puntos). Se recomienda PAAF si ≥2.5 cm; seguimiento ecográfico si ≥1.5 cm. Nódulos <1.5 cm no requieren seguimiento. Seguimiento inicial a 1, 3 y 5 años si procede (ACR TI-RADS 2017).",
      en: "ACR TI-RADS TR3 (mildly suspicious, 3 points). FNA recommended if ≥2.5 cm; ultrasound follow-up if ≥1.5 cm. Nodules <1.5 cm require no follow-up. Initial follow-up at 1, 3, and 5 years if applicable (ACR TI-RADS 2017).",
      pt: "ACR TI-RADS TR3 (levemente suspeito, 3 pontos). PAAF recomendada se ≥2.5 cm; seguimento ecográfico se ≥1.5 cm. Nódulos <1.5 cm não requerem seguimento. Seguimento inicial em 1, 3 e 5 anos se aplicável (ACR TI-RADS 2017).",
    },
    tags: ["TI-RADS", "tiroides", "thyroid", "TR3", "PAAF", "FNA", "seguimiento", "follow-up"],
    source: "ACR TI-RADS 2017 (Tessler FN et al., JACR 2017)",
    scope: "system",
  },
  {
    id: "tirads_tr4",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "TI-RADS TR4: moderadamente sospechoso", en: "TI-RADS TR4: moderately suspicious", pt: "TI-RADS TR4: moderadamente suspeito" },
    text: {
      es: "ACR TI-RADS TR4 (moderadamente sospechoso, 4-6 puntos). Se recomienda PAAF si ≥1.5 cm; seguimiento ecográfico si ≥1.0 cm. Nódulos <1.0 cm no requieren seguimiento. Seguimiento a 1, 2, 3 y 5 años si procede (ACR TI-RADS 2017).",
      en: "ACR TI-RADS TR4 (moderately suspicious, 4-6 points). FNA recommended if ≥1.5 cm; ultrasound follow-up if ≥1.0 cm. Nodules <1.0 cm require no follow-up. Follow-up at 1, 2, 3, and 5 years if applicable (ACR TI-RADS 2017).",
      pt: "ACR TI-RADS TR4 (moderadamente suspeito, 4-6 pontos). PAAF recomendada se ≥1.5 cm; seguimento ecográfico se ≥1.0 cm. Nódulos <1.0 cm não requerem seguimento. Seguimento em 1, 2, 3 e 5 anos se aplicável (ACR TI-RADS 2017).",
    },
    tags: ["TI-RADS", "tiroides", "thyroid", "TR4", "PAAF", "FNA", "moderado", "moderate"],
    source: "ACR TI-RADS 2017 (Tessler FN et al., JACR 2017)",
    scope: "system",
  },
  {
    id: "tirads_tr5",
    category: "Head and neck",
    modality: "Ultrasound",
    title: { es: "TI-RADS TR5: altamente sospechoso", en: "TI-RADS TR5: highly suspicious", pt: "TI-RADS TR5: altamente suspeito" },
    text: {
      es: "ACR TI-RADS TR5 (altamente sospechoso, ≥7 puntos). Se recomienda PAAF si ≥1.0 cm; seguimiento ecográfico si ≥0.5 cm. Nódulos <0.5 cm no requieren seguimiento salvo sospecha de extensión extratiroidea o metástasis ganglionares. Seguimiento anual durante 5 años si procede (ACR TI-RADS 2017).",
      en: "ACR TI-RADS TR5 (highly suspicious, ≥7 points). FNA recommended if ≥1.0 cm; ultrasound follow-up if ≥0.5 cm. Nodules <0.5 cm require no follow-up unless suspicion of extrathyroidal extension or nodal metastases. Annual follow-up for 5 years if applicable (ACR TI-RADS 2017).",
      pt: "ACR TI-RADS TR5 (altamente suspeito, ≥7 pontos). PAAF recomendada se ≥1.0 cm; seguimento ecográfico se ≥0.5 cm. Nódulos <0.5 cm não requerem seguimento salvo suspeita de extensão extratireoidiana ou metástases ganglionares. Seguimento anual por 5 anos se aplicável (ACR TI-RADS 2017).",
    },
    tags: ["TI-RADS", "tiroides", "thyroid", "TR5", "PAAF", "FNA", "altamente sospechoso", "highly suspicious", "biopsia"],
    source: "ACR TI-RADS 2017 (Tessler FN et al., JACR 2017)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — LI-RADS (missing categories)
  // ═══════════════════════════════════════════
  {
    id: "lirads_1",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS 1: definitivamente benigno", en: "LI-RADS 1: definitely benign", pt: "LI-RADS 1: definitivamente benigno" },
    text: {
      es: "Observación hepática LI-RADS 1 (definitivamente benigno): quiste simple, hemangioma típico u otra entidad benigna inequívoca. No requiere seguimiento adicional por imagen en contexto de hepatocarcinoma (ACR LI-RADS v2018).",
      en: "LI-RADS 1 hepatic observation (definitely benign): simple cyst, typical hemangioma, or other unequivocally benign entity. No additional imaging follow-up required in context of HCC surveillance (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS 1 (definitivamente benigno): cisto simples, hemangioma típico ou outra entidade benigna inequívoca. Não requer seguimento adicional por imagem no contexto de hepatocarcinoma (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "benigno", "benign", "quiste", "hemangioma", "cirrosis", "cirrhosis"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },
  {
    id: "lirads_2",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS 2: probablemente benigno", en: "LI-RADS 2: probably benign", pt: "LI-RADS 2: provavelmente benigno" },
    text: {
      es: "Observación hepática LI-RADS 2 (probablemente benigno): nódulo hepático con alta probabilidad de benignidad pero sin criterios definitivos (ej. hemangioma atípico, nódulo siderático). Se recomienda continuar vigilancia habitual de cirrosis sin necesidad de seguimiento específico de la lesión (ACR LI-RADS v2018).",
      en: "LI-RADS 2 hepatic observation (probably benign): hepatic nodule with high probability of benignity but without definitive criteria (e.g., atypical hemangioma, siderotic nodule). Routine cirrhosis surveillance without lesion-specific follow-up recommended (ACR LI-RADS v2018).",
      pt: "Observação hepática LI-RADS 2 (provavelmente benigno): nódulo hepático com alta probabilidade de benignidade mas sem critérios definitivos (ex. hemangioma atípico, nódulo siderótico). Vigilância habitual de cirrose sem seguimento específico da lesão recomendada (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "hepático", "hepatic", "probablemente benigno", "probably benign", "cirrosis", "cirrhosis"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },
  {
    id: "lirads_tiv",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "LI-RADS TIV: tumor en vena", en: "LI-RADS TIV: tumor in vein", pt: "LI-RADS TIV: tumor na veia" },
    text: {
      es: "LI-RADS TIV (tumor en vena): realce inequívoco de tejido blando en la vena porta o vena hepática, diagnóstico de CHC con invasión venosa. Se recomienda discusión multidisciplinaria urgente; no requiere confirmación histológica. Contraindica trasplante hepático en la mayoría de protocolos (ACR LI-RADS v2018).",
      en: "LI-RADS TIV (tumor in vein): unequivocal soft tissue enhancement in the portal or hepatic vein, diagnostic of HCC with venous invasion. Urgent multidisciplinary discussion recommended; histologic confirmation not required. Contraindicates liver transplant in most protocols (ACR LI-RADS v2018).",
      pt: "LI-RADS TIV (tumor na veia): realce inequívoco de tecido mole na veia porta ou veia hepática, diagnóstico de CHC com invasão venosa. Discussão multidisciplinar urgente recomendada; confirmação histológica não necessária. Contraindica transplante hepático na maioria dos protocolos (ACR LI-RADS v2018).",
    },
    tags: ["LI-RADS", "TIV", "hepático", "hepatic", "CHC", "HCC", "tumor en vena", "portal", "invasión", "invasion"],
    source: "ACR LI-RADS v2018",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — Bosniak (missing categories)
  // ═══════════════════════════════════════════
  {
    id: "renal_bosniak_i",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Bosniak I: quiste simple", en: "Bosniak I: simple cyst", pt: "Bosniak I: cisto simples" },
    text: {
      es: "Lesión renal quística Bosniak I (quiste simple): pared imperceptible, contenido homogéneo de densidad agua, sin realce. Hallazgo benigno; no requiere seguimiento (Bosniak 2019).",
      en: "Bosniak I cystic renal lesion (simple cyst): imperceptible wall, homogeneous water-density content, no enhancement. Benign finding; no follow-up required (Bosniak 2019).",
      pt: "Lesão renal cística Bosniak I (cisto simples): parede imperceptível, conteúdo homogêneo de densidade água, sem realce. Achado benigno; não requer seguimento (Bosniak 2019).",
    },
    tags: ["Bosniak", "renal", "quiste", "cyst", "simple", "riñón", "kidney", "benigno", "benign"],
    source: "Bosniak Classification v2019 (Silverman et al., Radiology 2019)",
    scope: "system",
  },
  {
    id: "renal_bosniak_ii",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Bosniak II: mínimamente complicado", en: "Bosniak II: minimally complex", pt: "Bosniak II: minimamente complexo" },
    text: {
      es: "Lesión renal quística Bosniak II (mínimamente complicada): tabiques finos (≤2 mm) sin realce, calcificación fina, o contenido de alta densidad (<3 cm, homogéneo, sin realce). Hallazgo benigno; no requiere seguimiento (Bosniak 2019).",
      en: "Bosniak II cystic renal lesion (minimally complex): thin septa (≤2 mm) without enhancement, thin calcification, or high-density content (<3 cm, homogeneous, no enhancement). Benign finding; no follow-up required (Bosniak 2019).",
      pt: "Lesão renal cística Bosniak II (minimamente complexa): septos finos (≤2 mm) sem realce, calcificação fina, ou conteúdo de alta densidade (<3 cm, homogêneo, sem realce). Achado benigno; não requer seguimento (Bosniak 2019).",
    },
    tags: ["Bosniak", "renal", "quiste", "cyst", "riñón", "kidney", "benigno", "benign", "septo", "calcificación"],
    source: "Bosniak Classification v2019 (Silverman et al., Radiology 2019)",
    scope: "system",
  },
  {
    id: "renal_bosniak_iv",
    category: "Abdomen and pelvis",
    modality: "CT",
    title: { es: "Bosniak IV: claramente maligno", en: "Bosniak IV: clearly malignant", pt: "Bosniak IV: claramente maligno" },
    text: {
      es: "Lesión renal quística Bosniak IV: componente sólido con realce que no corresponde a septo ni pared. Alta probabilidad de carcinoma renal quístico (malignidad >80%). Se recomienda tratamiento quirúrgico (nefrectomía parcial o radical) según tamaño y localización (Bosniak 2019).",
      en: "Bosniak IV cystic renal lesion: enhancing solid component not representing a septum or wall. High probability of cystic renal cell carcinoma (malignancy >80%). Surgical treatment (partial or radical nephrectomy) recommended based on size and location (Bosniak 2019).",
      pt: "Lesão renal cística Bosniak IV: componente sólido com realce que não corresponde a septo nem parede. Alta probabilidade de carcinoma renal cístico (malignidade >80%). Tratamento cirúrgico (nefrectomia parcial ou radical) recomendado conforme tamanho e localização (Bosniak 2019).",
    },
    tags: ["Bosniak", "renal", "quiste", "cyst", "riñón", "kidney", "maligno", "malignant", "cirugía", "surgery", "nefrectomía"],
    source: "Bosniak Classification v2019 (Silverman et al., Radiology 2019)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — O-RADS (missing categories)
  // ═══════════════════════════════════════════
  {
    id: "orads_1",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "O-RADS 1: normal / fisiológico", en: "O-RADS 1: normal / physiologic", pt: "O-RADS 1: normal / fisiológico" },
    text: {
      es: "O-RADS 1 (hallazgo fisiológico/normal): folículos ováricos normales o cuerpo lúteo. Riesgo de malignidad ~0%. No requiere seguimiento adicional (ACR O-RADS US v2022).",
      en: "O-RADS 1 (physiologic/normal finding): normal ovarian follicles or corpus luteum. Malignancy risk ~0%. No additional follow-up required (ACR O-RADS US v2022).",
      pt: "O-RADS 1 (achado fisiológico/normal): folículos ovarianos normais ou corpo lúteo. Risco de malignidade ~0%. Não requer seguimento adicional (ACR O-RADS US v2022).",
    },
    tags: ["O-RADS", "ovario", "ovary", "normal", "fisiológico", "physiologic", "folículo", "cuerpo lúteo"],
    source: "ACR O-RADS US v2022 (Andreotti RF et al., JACR 2020)",
    scope: "system",
  },
  {
    id: "orads_2",
    category: "Abdomen and pelvis",
    modality: "Ultrasound",
    title: { es: "O-RADS 2: casi seguramente benigno", en: "O-RADS 2: almost certainly benign", pt: "O-RADS 2: quase certamente benigno" },
    text: {
      es: "O-RADS 2 (casi seguramente benigno): quiste simple, quiste hemorrágico típico, endometrioma típico, teratoma quístico maduro, quiste paraovárico. Riesgo de malignidad <1%. Se recomienda seguimiento ecográfico opcional a 8-12 semanas en premenopáusicas; en postmenopáusicas, ecografía de control anual (ACR O-RADS US v2022).",
      en: "O-RADS 2 (almost certainly benign): simple cyst, typical hemorrhagic cyst, typical endometrioma, mature cystic teratoma, paraovarian cyst. Malignancy risk <1%. Optional ultrasound follow-up at 8-12 weeks in premenopausal; in postmenopausal, annual follow-up ultrasound (ACR O-RADS US v2022).",
      pt: "O-RADS 2 (quase certamente benigno): cisto simples, cisto hemorrágico típico, endometrioma típico, teratoma cístico maduro, cisto paraovárico. Risco de malignidade <1%. Seguimento ecográfico opcional em 8-12 semanas em pré-menopáusicas; em pós-menopáusicas, ecografia de controle anual (ACR O-RADS US v2022).",
    },
    tags: ["O-RADS", "ovario", "ovary", "benigno", "benign", "quiste", "cyst", "endometrioma", "teratoma"],
    source: "ACR O-RADS US v2022 (Andreotti RF et al., JACR 2020)",
    scope: "system",
  },

  // ═══════════════════════════════════════════
  // ABDOMEN — PI-RADS v2.1
  // ═══════════════════════════════════════════
  {
    id: "pirads_1",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "PI-RADS 1: muy bajo", en: "PI-RADS 1: very low", pt: "PI-RADS 1: muito baixo" },
    text: {
      es: "PI-RADS 1 (probabilidad muy baja de cáncer clínicamente significativo). RM prostática sin hallazgos anómalos. No se recomienda biopsia dirigida por imagen. Seguimiento según criterios clínicos y PSA (ACR PI-RADS v2.1, 2019).",
      en: "PI-RADS 1 (very low probability of clinically significant cancer). Prostate MRI with no abnormal findings. Image-guided biopsy not recommended. Follow-up per clinical criteria and PSA (ACR PI-RADS v2.1, 2019).",
      pt: "PI-RADS 1 (probabilidade muito baixa de câncer clinicamente significativo). RM prostática sem achados anômalos. Biópsia dirigida por imagem não recomendada. Seguimento conforme critérios clínicos e PSA (ACR PI-RADS v2.1, 2019).",
    },
    tags: ["PI-RADS", "próstata", "prostate", "RM", "MRI", "PSA", "muy bajo", "very low"],
    source: "ACR PI-RADS v2.1 (Turkbey B et al., AJR 2019)",
    scope: "system",
  },
  {
    id: "pirads_2",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "PI-RADS 2: bajo", en: "PI-RADS 2: low", pt: "PI-RADS 2: baixo" },
    text: {
      es: "PI-RADS 2 (probabilidad baja de cáncer clínicamente significativo). Hallazgos probablemente benignos (ej. HBP, prostatitis, atrofia). No se recomienda biopsia dirigida por imagen. Seguimiento clínico y de PSA (ACR PI-RADS v2.1, 2019).",
      en: "PI-RADS 2 (low probability of clinically significant cancer). Probably benign findings (e.g., BPH, prostatitis, atrophy). Image-guided biopsy not recommended. Clinical and PSA follow-up (ACR PI-RADS v2.1, 2019).",
      pt: "PI-RADS 2 (probabilidade baixa de câncer clinicamente significativo). Achados provavelmente benignos (ex. HPB, prostatite, atrofia). Biópsia dirigida por imagem não recomendada. Seguimento clínico e de PSA (ACR PI-RADS v2.1, 2019).",
    },
    tags: ["PI-RADS", "próstata", "prostate", "RM", "MRI", "bajo", "low", "HBP", "BPH", "PSA"],
    source: "ACR PI-RADS v2.1 (Turkbey B et al., AJR 2019)",
    scope: "system",
  },
  {
    id: "pirads_3",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "PI-RADS 3: intermedio", en: "PI-RADS 3: intermediate", pt: "PI-RADS 3: intermediário" },
    text: {
      es: "PI-RADS 3 (probabilidad intermedia/equívoca de cáncer clínicamente significativo). Hallazgos equívocos que no permiten clasificar como benigno ni sospechoso. Se recomienda correlación con densidad de PSA, historia clínica y factores de riesgo; considerar biopsia dirigida o vigilancia según contexto (ACR PI-RADS v2.1, 2019).",
      en: "PI-RADS 3 (intermediate/equivocal probability of clinically significant cancer). Equivocal findings that cannot be classified as benign or suspicious. Correlation with PSA density, clinical history, and risk factors recommended; consider targeted biopsy or surveillance based on context (ACR PI-RADS v2.1, 2019).",
      pt: "PI-RADS 3 (probabilidade intermediária/equívoca de câncer clinicamente significativo). Achados equívocos que não permitem classificar como benigno nem suspeito. Correlação com densidade de PSA, história clínica e fatores de risco recomendada; considerar biópsia dirigida ou vigilância conforme contexto (ACR PI-RADS v2.1, 2019).",
    },
    tags: ["PI-RADS", "próstata", "prostate", "RM", "MRI", "intermedio", "intermediate", "equívoco", "equivocal", "PSA"],
    source: "ACR PI-RADS v2.1 (Turkbey B et al., AJR 2019)",
    scope: "system",
  },
  {
    id: "pirads_4",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "PI-RADS 4: alto", en: "PI-RADS 4: high", pt: "PI-RADS 4: alto" },
    text: {
      es: "PI-RADS 4 (probabilidad alta de cáncer clínicamente significativo). Lesión focal con características sospechosas (restricción difusión marcada, realce precoz). Se recomienda biopsia dirigida por fusión RM/ecografía o biopsia cognitiva (ACR PI-RADS v2.1, 2019).",
      en: "PI-RADS 4 (high probability of clinically significant cancer). Focal lesion with suspicious features (marked diffusion restriction, early enhancement). Targeted MRI/ultrasound fusion biopsy or cognitive biopsy recommended (ACR PI-RADS v2.1, 2019).",
      pt: "PI-RADS 4 (probabilidade alta de câncer clinicamente significativo). Lesão focal com características suspeitas (restrição à difusão marcada, realce precoce). Biópsia dirigida por fusão RM/ecografia ou biópsia cognitiva recomendada (ACR PI-RADS v2.1, 2019).",
    },
    tags: ["PI-RADS", "próstata", "prostate", "RM", "MRI", "alto", "high", "biopsia", "biopsy", "fusión", "fusion"],
    source: "ACR PI-RADS v2.1 (Turkbey B et al., AJR 2019)",
    scope: "system",
  },
  {
    id: "pirads_5",
    category: "Abdomen and pelvis",
    modality: "MRI",
    title: { es: "PI-RADS 5: muy alto", en: "PI-RADS 5: very high", pt: "PI-RADS 5: muito alto" },
    text: {
      es: "PI-RADS 5 (probabilidad muy alta de cáncer clínicamente significativo). Lesión focal ≥1.5 cm con criterios mayores de malignidad o extensión extraprostática. Se recomienda biopsia dirigida y estadificación. Valorar invasión de la cápsula, vesículas seminales y ganglios (ACR PI-RADS v2.1, 2019).",
      en: "PI-RADS 5 (very high probability of clinically significant cancer). Focal lesion ≥1.5 cm with major criteria of malignancy or extraprostatic extension. Targeted biopsy and staging recommended. Evaluate capsular invasion, seminal vesicles, and lymph nodes (ACR PI-RADS v2.1, 2019).",
      pt: "PI-RADS 5 (probabilidade muito alta de câncer clinicamente significativo). Lesão focal ≥1.5 cm com critérios maiores de malignidade ou extensão extraprostática. Biópsia dirigida e estadiamento recomendados. Avaliar invasão capsular, vesículas seminais e linfonodos (ACR PI-RADS v2.1, 2019).",
    },
    tags: ["PI-RADS", "próstata", "prostate", "RM", "MRI", "muy alto", "very high", "biopsia", "biopsy", "estadificación", "staging"],
    source: "ACR PI-RADS v2.1 (Turkbey B et al., AJR 2019)",
    scope: "system",
  },
];
