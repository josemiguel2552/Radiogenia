export interface ChecklistCondition {
  id: string;
  name: string;
  findings: string[];
}

export interface ChecklistSection {
  id: string;
  name: string;
  conditions: ChecklistCondition[];
}

export const DEFAULT_CHECKLIST_SECTIONS: ChecklistSection[] = [
  {
    id: "chest",
    name: "Tórax / Chest",
    conditions: [
      {
        id: "pe",
        name: "Tromboembolismo pulmonar (TEP) / Pulmonary Embolism (PE)",
        findings: [
          "Signos de sobrecarga de cavidades derechas: ratio VD/VI > 1, rectificación del septo interventricular, reflujo de contraste a venas suprahepáticas/VCI",
          "Infarto pulmonar (consolidación periférica en cuña)",
          "Derrame pleural asociado",
          "Trombosis venosa profunda concomitante (si se incluyen cortes de MMII)",
          "Trombo en tránsito en cavidades derechas",
        ],
      },
      {
        id: "aortic-dissection",
        name: "Disección aórtica / Aortic Dissection",
        findings: [
          "Extensión: tipo Stanford A vs B",
          "Afectación de ramas: troncos supraaórticos, arterias renales, arteria mesentérica superior, arterias ilíacas",
          "Derrame pericárdico (riesgo de taponamiento en tipo A)",
          "Insuficiencia aórtica (tipo A)",
          "Malperfusión orgánica: renal, mesentérica, extremidades",
        ],
      },
      {
        id: "lung-mass",
        name: "Masa pulmonar / Neoplasia pulmonar / Lung Mass",
        findings: [
          "Adenopatías mediastínicas e hiliares (tamaño en eje corto)",
          "Invasión de estructuras mediastínicas (vasos, esófago, cuerpos vertebrales, pared torácica)",
          "Derrame pleural (descartar implantes pleurales)",
          "Nódulos pulmonares contralaterales",
          "Metástasis a distancia: hepáticas, suprarrenales, óseas (en campo de visión)",
          "Trombosis tumoral de venas pulmonares o VCS",
        ],
      },
      {
        id: "pneumothorax",
        name: "Neumotórax / Pneumothorax",
        findings: [
          "Signos de tensión: desplazamiento mediastínico contralateral, aplanamiento/inversión diafragmática",
          "Enfisema subcutáneo",
          "Tubo de drenaje (posición y complicaciones si presente)",
        ],
      },
      {
        id: "pneumonia",
        name: "Neumonía / Infección pulmonar / Pneumonia",
        findings: [
          "Derrame pleural paraneumónico / empiema",
          "Cavitación (absceso pulmonar)",
          "Adenopatías reactivas",
          "Afectación bilateral (patrón atípico vs típico)",
        ],
      },
    ],
  },
  {
    id: "abdomen",
    name: "Abdomen",
    conditions: [
      {
        id: "diverticulitis",
        name: "Diverticulitis aguda / Acute Diverticulitis",
        findings: [
          "Colecciones / abscesos pericolónicos o pélvicos",
          "Neumoperitoneo (perforación)",
          "Fístulas (colovesical, colovaginal)",
          "Obstrucción intestinal secundaria",
          "Pileflebitis (trombosis de vena mesentérica/portal)",
          "Engrosamiento de la fascia lateroconal",
        ],
      },
      {
        id: "appendicitis",
        name: "Apendicitis aguda / Acute Appendicitis",
        findings: [
          "Signos de perforación: neumoperitoneo localizado, apendicolito extraluminal, colección periapendicular",
          "Absceso periapendicular",
          "Líquido libre pélvico / peritoneal",
          "Plastrón apendicular",
        ],
      },
      {
        id: "bowel-obstruction",
        name: "Obstrucción intestinal / Bowel Obstruction",
        findings: [
          "Punto de transición (localización exacta)",
          "Signos de isquemia: neumatosis intestinal, gas portal, engrosamiento de pared, ausencia de realce",
          "Asa cerrada (torsión del meso, signo del remolino)",
          "Hernia como causa (inguinal, femoral, interna, incisional)",
          "Causa tumoral vs adherencial vs herniaria",
        ],
      },
      {
        id: "pancreatitis",
        name: "Pancreatitis aguda / Acute Pancreatitis",
        findings: [
          "Grado de necrosis pancreática (porcentaje)",
          "Colecciones peripancreáticas (localización y extensión)",
          "Complicaciones vasculares: trombosis de vena esplénica/portal/mesentérica, pseudoaneurisma",
          "Afectación de órganos vecinos",
          "Grado CTSI (CT Severity Index)",
        ],
      },
      {
        id: "mesenteric-ischemia",
        name: "Isquemia mesentérica / Mesenteric Ischemia",
        findings: [
          "Trombo en arteria/vena mesentérica superior",
          "Neumatosis intestinal",
          "Gas en sistema portal",
          "Ausencia de realce de la pared intestinal",
          "Líquido libre mesentérico",
        ],
      },
      {
        id: "aaa",
        name: "Aneurisma de aorta abdominal / AAA",
        findings: [
          "Signos de rotura: hematoma retroperitoneal, signo de la media luna hipertensa (crescent sign), discontinuidad de la pared",
          "Extensión a arterias ilíacas",
          "Relación con arterias renales (infrarrenal vs yuxtarrenal vs suprarrenal)",
          "Trombo mural",
          "Compresión de estructuras adyacentes",
        ],
      },
      {
        id: "abdominal-trauma",
        name: "Traumatismo abdominal / Abdominal Trauma",
        findings: [
          "Lesión esplénica: grado AAST, hemoperitoneo, extravasación activa de contraste",
          "Lesión hepática: grado, lesión vascular asociada, hemobilia",
          "Lesión renal: grado, extravasación urinaria, lesión vascular",
          "Lesión pancreática: afectación del conducto pancreático",
          "Hemoperitoneo (cuantificación aproximada)",
          "Lesión de grandes vasos",
        ],
      },
    ],
  },
  {
    id: "neuro",
    name: "Neuro",
    conditions: [
      {
        id: "ich",
        name: "Hemorragia intracraneal (intraparenquimatosa) / ICH",
        findings: [
          "Desplazamiento de línea media (en mm)",
          "Herniación: subfalcina, uncal (transtentorial), amigdalar, transtentorial ascendente",
          "Hidrocefalia obstructiva",
          "Extensión intraventricular (hemoventrículo)",
          "Edema perilesional",
          "Malformación vascular subyacente (si patrón atípico)",
        ],
      },
      {
        id: "sah",
        name: "Hemorragia subaracnoidea (HSA) / SAH",
        findings: [
          "Aneurisma como causa (localización, tamaño)",
          "Hidrocefalia aguda",
          "Vasoespasmo (si angio-TC)",
          "Extensión intraventricular",
          "Herniación",
          "Escala Fisher modificada",
        ],
      },
      {
        id: "acute-stroke",
        name: "Ictus isquémico agudo / Acute Ischemic Stroke",
        findings: [
          "Oclusión vascular: localización exacta (M1, M2, carótida interna, basilar)",
          "ASPECTS score",
          "Colaterales leptomeníngeas",
          "Transformación hemorrágica",
          "Herniación (en infartos malignos)",
          "Estenosis carotídea/vertebral asociada",
        ],
      },
      {
        id: "tbi",
        name: "Traumatismo craneoencefálico / TBI",
        findings: [
          "Fractura craneal (localización, tipo)",
          "Hematoma epidural / subdural (grosor máximo, desplazamiento de línea media)",
          "Contusiones hemorrágicas (localización)",
          "Lesión axonal difusa (microhemorragias en cuerpo calloso, ganglios basales, tronco)",
          "Neumoencéfalo",
          "Herniación",
        ],
      },
    ],
  },
  {
    id: "msk",
    name: "Musculoesquelético / MSK",
    conditions: [
      {
        id: "vertebral-fracture",
        name: "Fractura vertebral / Vertebral Fracture",
        findings: [
          "Afectación de columnas posterior/media (inestabilidad)",
          "Compromiso del canal raquídeo (porcentaje)",
          "Fragmento retropulsado",
          "Edema medular / contusión medular (si RM)",
          "Fractura por insuficiencia vs patológica (señal anormal del cuerpo vertebral)",
          "Cifosis segmentaria resultante",
        ],
      },
      {
        id: "pelvic-fracture",
        name: "Fractura de pelvis / acetábulo / Pelvic Fracture",
        findings: [
          "Congruencia articular coxofemoral",
          "Lesión de anillo pélvico (estabilidad: unilateral vs bilateral)",
          "Lesión vesical / uretral asociada",
          "Hematoma pélvico / retroperitoneal",
          "Lesión vascular (extravasación activa)",
        ],
      },
    ],
  },
];

export function sectionsToText(sections: ChecklistSection[]): string {
  return sections
    .map((s) => {
      const header = `## ${s.name}`;
      const conditions = s.conditions
        .map((c) => {
          const items = c.findings.map((f) => `- ${f}`).join("\n");
          return `### ${c.name}\n${items}`;
        })
        .join("\n\n");
      return `${header}\n\n${conditions}`;
    })
    .join("\n\n");
}

export function getClinicalChecklistKB(): string {
  return sectionsToText(DEFAULT_CHECKLIST_SECTIONS);
}
