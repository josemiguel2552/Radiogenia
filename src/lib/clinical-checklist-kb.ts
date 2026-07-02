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
      {
        id: "pleural-effusion",
        name: "Derrame pleural / Pleural Effusion",
        findings: [
          "Signos de empiema: realce pleural (split pleura sign), loculaciones, gas en el espacio pleural",
          "Masa o engrosamiento pleural subyacente (sospecha de malignidad)",
          "Atelectasia compresiva asociada y desplazamiento mediastínico",
          "Cuantificación aproximada y lateralidad",
        ],
      },
      {
        id: "mediastinal-mass",
        name: "Masa mediastínica / Mediastinal Mass",
        findings: [
          "Compartimento (anterior, medio, posterior) — orienta el diagnóstico",
          "Compresión o invasión de vía aérea y estructuras vasculares (SVC, arterias pulmonares)",
          "Adenopatías asociadas en otras estaciones",
          "Extensión a pared torácica o columna",
          "Derrame pleural o pericárdico asociado",
        ],
      },
      {
        id: "heart-failure",
        name: "Insuficiencia cardíaca / Edema pulmonar / Heart Failure",
        findings: [
          "Cardiomegalia (índice cardiotorácico o volumen de cavidades)",
          "Derrames pleurales bilaterales (típicamente derecho > izquierdo)",
          "Líneas septales / engrosamiento de septos interlobulillares",
          "Redistribución vascular / edema en alas de mariposa",
        ],
      },
      {
        id: "pericardial-effusion",
        name: "Derrame pericárdico / Pericardial Effusion",
        findings: [
          "Cuantificación (leve, moderado, severo) y densidad (hemático vs seroso)",
          "Signos de taponamiento: rectificación o abombamiento septal, reflujo a VCI dilatada",
          "Realce o engrosamiento pericárdico (pericarditis, carcinomatosis)",
          "Masa cardíaca o pericárdica asociada",
        ],
      },
      {
        id: "ild-fibrosis",
        name: "Enfermedad intersticial / Fibrosis pulmonar / ILD",
        findings: [
          "Patrón predominante (reticulación, vidrio deslustrado, panalización, nódulos)",
          "Distribución (subpleural vs peribroncovascular; predominio basal vs apical) — clave para UIP vs NSIP",
          "Bronquiectasias / bronquiolectasias de tracción",
          "Signos de exacerbación aguda (vidrio deslustrado sobreañadido)",
          "Hipertensión pulmonar asociada (calibre de arteria pulmonar)",
        ],
      },
      {
        id: "chest-trauma",
        name: "Traumatismo torácico / Chest Trauma",
        findings: [
          "Número y localización de fracturas costales; volet costal (fracturas en ≥3 costillas consecutivas en 2 puntos)",
          "Neumotórax y hemotórax (aunque sean laminares)",
          "Contusión / laceración pulmonar",
          "Lesión de grandes vasos (hematoma mediastínico, pseudoaneurisma aórtico)",
          "Neumomediastino y lesión de vía aérea",
          "Lesión diafragmática (herniación de vísceras)",
        ],
      },
      {
        id: "hemoptysis",
        name: "Hemoptisis / Hemoptysis",
        findings: [
          "Origen probable del sangrado: cavitación, masa endobronquial, bronquiectasias",
          "Hipertrofia de arterias bronquiales (diámetro >2 mm) — relevante para embolización",
          "Signos de aspergiloma / micetoma (bola fúngica móvil en cavidad)",
          "Vidrio deslustrado como marcador del lóbulo sangrante",
        ],
      },
      {
        id: "pulmonary-hypertension",
        name: "Hipertensión pulmonar / Pulmonary Hypertension",
        findings: [
          "Diámetro de la arteria pulmonar principal (>29 mm o ratio AP/aorta >1)",
          "Dilatación / hipertrofia de cavidades derechas",
          "Signos de TEP crónico: webs, estenosis, perfusión en mosaico",
          "Reflujo de contraste a VCI y venas suprahepáticas",
        ],
      },
      {
        id: "esophageal-perforation",
        name: "Perforación esofágica / Esophageal Perforation",
        findings: [
          "Neumomediastino y enfisema cervical subcutáneo",
          "Colección / absceso mediastínico y mediastinitis",
          "Derrame pleural (típicamente izquierdo) e hidroneumotórax",
          "Fuga de contraste oral (localización del defecto)",
        ],
      },
      {
        id: "pulmonary-nodule",
        name: "Nódulo pulmonar incidental / Incidental Pulmonary Nodule",
        findings: [
          "Sólido vs subsólido (vidrio deslustrado / parcialmente sólido) — determina el algoritmo de seguimiento",
          "Tamaño exacto (mm) y comparación con estudios previos (crecimiento)",
          "Márgenes espiculados, retracción pleural o realce (rasgos de sospecha)",
          "Categoría Fleischner / Lung-RADS aplicable",
        ],
      },
      {
        id: "bronchiectasis",
        name: "Bronquiectasias / Bronchiectasis",
        findings: [
          "Distribución (central vs periférica; predominio lobar) — orienta la causa",
          "Signos de infección/exacerbación activa (impactación mucoide, árbol en brote, consolidación)",
          "Micetoma en bronquiectasia quística",
          "Atrapamiento aéreo asociado",
        ],
      },
      {
        id: "tuberculosis",
        name: "Tuberculosis pulmonar / Pulmonary Tuberculosis",
        findings: [
          "Actividad: cavitación, árbol en brote, consolidación (vs secuela fibrocicatricial)",
          "Distribución típica (segmentos apicales y posteriores)",
          "Adenopatías con centro necrótico",
          "Diseminación miliar; derrame o empiema tuberculoso",
        ],
      },
      {
        id: "aspiration-pneumonia",
        name: "Neumonía por aspiración / Aspiration Pneumonia",
        findings: [
          "Distribución gravitacional (segmentos dependientes: posteriores de LLSS, basales)",
          "Cavitación / absceso pulmonar",
          "Cuerpo extraño endobronquial",
          "Empiema asociado",
        ],
      },
      {
        id: "svc-syndrome",
        name: "Síndrome de vena cava superior / SVC Syndrome",
        findings: [
          "Causa (masa mediastínica, adenopatías, trombo) y grado de estenosis/oclusión",
          "Circulación colateral desarrollada",
          "Trombo asociado en la VCS y extensión a aurícula derecha",
        ],
      },
      {
        id: "atelectasis",
        name: "Atelectasia / Atelectasis",
        findings: [
          "Causa obstructiva (tapón mucoso vs masa endobronquial) — clave",
          "Volumen colapsado y desplazamiento de estructuras",
          "Broncograma aéreo (sugiere no obstructiva)",
          "Derrame asociado",
        ],
      },
      {
        id: "ards",
        name: "SDRA / Distrés respiratorio agudo / ARDS",
        findings: [
          "Extensión y distribución (dependiente, en gradiente) de consolidaciones y vidrio deslustrado",
          "Barotrauma: neumotórax, neumomediastino, enfisema intersticial",
          "Derrames asociados",
          "Consolidación focal nueva (sobreinfección)",
        ],
      },
      {
        id: "lymphangitic-carcinomatosis",
        name: "Linfangitis carcinomatosa / Lymphangitic Carcinomatosis",
        findings: [
          "Engrosamiento nodular de septos interlobulillares y haces broncovasculares",
          "Distribución (unilateral orienta a origen pulmonar; bilateral a metastásica)",
          "Adenopatías hiliares/mediastínicas",
          "Derrame pleural asociado",
        ],
      },
      {
        id: "central-airway-lesion",
        name: "Lesión de tráquea / vía aérea central / Central Airway Lesion",
        findings: [
          "Grado de estenosis luminal (porcentaje) — riesgo de vía aérea",
          "Lesión intraluminal vs compresión extrínseca vs infiltración parietal",
          "Extensión longitudinal",
          "Afectación de carina y bronquios principales",
        ],
      },
      {
        id: "cardiac-mass-thrombus",
        name: "Masa cardíaca / trombo intracavitario / Cardiac Mass",
        findings: [
          "Localización (cavidad, pared) y movilidad (riesgo embólico)",
          "Trombo vs tumor (realce tras contraste)",
          "Obstrucción del flujo o afectación valvular",
          "Derrame pericárdico asociado",
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
      {
        id: "cholecystitis",
        name: "Colecistitis aguda / Acute Cholecystitis",
        findings: [
          "Signos de complicación: colecistitis gangrenosa (pared irregular, membranas), enfisematosa (gas parietal), perforación (defecto de pared, colección pericolecística)",
          "Coledocolitiasis asociada y calibre de la vía biliar",
          "Absceso perivesicular o hepático adyacente",
          "Síndrome de Mirizzi (compresión de vía biliar por lito en cístico)",
        ],
      },
      {
        id: "cholangitis",
        name: "Colangitis / Coledocolitiasis / Cholangitis",
        findings: [
          "Nivel y causa de la obstrucción biliar (lito, estenosis, masa)",
          "Dilatación de vía biliar intra y extrahepática (calibre del colédoco)",
          "Abscesos hepáticos (microabscesos en colangitis supurativa)",
          "Aerobilia o material purulento (bilis densa)",
          "Trombosis portal asociada",
        ],
      },
      {
        id: "cirrhosis-portal-htn",
        name: "Cirrosis / Hipertensión portal / Cirrhosis",
        findings: [
          "Lesiones focales hepáticas sospechosas de CHC (descripción con fases si disponibles)",
          "Signos de hipertensión portal: varices (esofágicas, gástricas, esplenorrenales), esplenomegalia, ascitis, recanalización de la umbilical",
          "Permeabilidad y calibre de la vena porta (trombosis benigna vs tumoral)",
          "Signos de descompensación (ascitis, derrame pleural hepático)",
        ],
      },
      {
        id: "liver-abscess",
        name: "Absceso hepático / Liver Abscess",
        findings: [
          "Número, tamaño y segmentos afectados (drenabilidad)",
          "Gas interno (sugiere pioógeno / formador de gas)",
          "Trombosis / pileflebitis de vena porta asociada",
          "Origen: apendicitis, diverticulitis, patología biliar (buscar el foco)",
          "Afectación pleural o pericárdica por contigüidad",
        ],
      },
      {
        id: "gi-bleeding",
        name: "Hemorragia digestiva (angio-TC) / GI Bleeding",
        findings: [
          "Extravasación activa de contraste (comparar fases: arterial vs portal)",
          "Localización exacta del punto sangrante (segmento intestinal)",
          "Causa subyacente: divertículo, angiodisplasia, tumor, úlcera",
          "Hemoperitoneo o sangre intraluminal (densidad espontánea alta en fase simple)",
        ],
      },
      {
        id: "perforated-viscus",
        name: "Perforación de víscera hueca / Perforated Viscus",
        findings: [
          "Localización del gas libre (supra vs inframesocólico orienta el origen)",
          "Punto de perforación: defecto de pared, engrosamiento focal, fuga de contraste",
          "Líquido libre y peritonitis (realce peritoneal)",
          "Causa probable: úlcera, diverticulitis, tumor, cuerpo extraño",
        ],
      },
      {
        id: "colitis",
        name: "Colitis / Colitis",
        findings: [
          "Distribución (pancolitis vs segmentaria; continua vs parcheada) — orienta etiología",
          "Signos de gravedad: megacolon tóxico (>6 cm), neumatosis, perforación",
          "Signos de isquemia (territorio vascular, ausencia de realce)",
          "Ascitis y afectación de la grasa pericólica",
        ],
      },
      {
        id: "urolithiasis",
        name: "Cólico renal / Urolitiasis / Urolithiasis",
        findings: [
          "Tamaño, densidad (UH) y localización exacta del lito (relevante para manejo)",
          "Grado de hidronefrosis / hidrouréter",
          "Rotura de fórnix (urinoma perirrenal)",
          "Signos de pielonefritis sobreañadida (nefrograma estriado)",
          "Riñón único o anomalías que cambien la urgencia",
        ],
      },
      {
        id: "pyelonephritis",
        name: "Pielonefritis / Pyelonephritis",
        findings: [
          "Absceso renal o perirrenal (tamaño, drenabilidad)",
          "Pielonefritis enfisematosa (gas parenquimatoso) — urgencia urológica",
          "Obstrucción asociada (pionefrosis) — requiere drenaje urgente",
          "Extensión perirrenal (fascia de Gerota) y a psoas",
        ],
      },
      {
        id: "renal-mass",
        name: "Masa renal / Renal Mass",
        findings: [
          "Realce (diferencia quiste complicado vs tumor sólido)",
          "Extensión a vena renal y VCI (nivel del trombo tumoral)",
          "Adenopatías retroperitoneales",
          "Afectación de glándula suprarrenal ipsilateral y órganos vecinos",
          "Riñón contralateral (lesiones sincrónicas, función)",
        ],
      },
      {
        id: "ovarian-torsion",
        name: "Torsión ovárica / Ovarian Torsion",
        findings: [
          "Ovario aumentado de tamaño con folículos periféricos",
          "Signo del remolino del pedículo vascular (whirlpool)",
          "Ausencia de realce ovárico (isquemia establecida)",
          "Lesión ovárica subyacente predisponente (quiste, teratoma)",
          "Líquido libre pélvico",
        ],
      },
      {
        id: "ectopic-pregnancy",
        name: "Embarazo ectópico / Ectopic Pregnancy",
        findings: [
          "Masa anexial extraovárica (anillo tubárico) y su lateralidad",
          "Hemoperitoneo (cuantificación — signo de rotura)",
          "Útero vacío con reacción decidual (correlacionar con beta-hCG)",
          "Actividad cardíaca embrionaria ectópica (contraindica manejo médico en algunos protocolos)",
        ],
      },
      {
        id: "postop-abdomen",
        name: "Abdomen postquirúrgico / Postoperative Abdomen",
        findings: [
          "Colecciones: localización, tamaño, gas interno (absceso vs seroma), drenabilidad",
          "Fuga anastomótica (contraste extraluminal, gas perianastomótico)",
          "Íleo vs obstrucción mecánica precoz",
          "Hallazgos vasculares postoperatorios (trombosis, sangrado activo)",
        ],
      },
      {
        id: "epiploic-appendagitis",
        name: "Apendagitis epiploica / infarto omental / Epiploic Appendagitis",
        findings: [
          "Lesión ovalada con grasa central y anillo hiperdenso adyacente al colon",
          "Descartar diverticulitis o apendicitis como alternativa (evita cirugía innecesaria)",
          "Ausencia de engrosamiento parietal significativo del colon",
        ],
      },
      {
        id: "adrenal-mass",
        name: "Masa suprarrenal / Adrenal Mass",
        findings: [
          "Densidad basal (UH) y lavado de contraste (adenoma vs no adenoma)",
          "Tamaño y crecimiento respecto a previos",
          "Rasgos de malignidad (bordes irregulares, necrosis, invasión)",
          "Bilateralidad; en contexto oncológico, sospecha metastásica",
        ],
      },
      {
        id: "abdominal-wall-hernia",
        name: "Hernia de pared abdominal complicada / Abdominal Wall Hernia",
        findings: [
          "Contenido (asa, grasa) y signos de incarceración/estrangulación (falta de realce, líquido)",
          "Obstrucción intestinal proximal asociada",
          "Tipo y localización del defecto",
        ],
      },
      {
        id: "inflammatory-bowel-disease",
        name: "Enfermedad inflamatoria intestinal (Crohn) / IBD",
        findings: [
          "Segmentos afectados y longitud; patrón salteado",
          "Actividad (realce mural, ingurgitación vascular — signo del peine)",
          "Complicaciones: fístulas, abscesos, estenosis con obstrucción",
          "Perforación / neumoperitoneo",
        ],
      },
      {
        id: "peritoneal-carcinomatosis",
        name: "Carcinomatosis peritoneal / Peritoneal Carcinomatosis",
        findings: [
          "Implantes peritoneales (localización, tamaño) y omental cake",
          "Ascitis asociada",
          "Obstrucción intestinal por implantes",
          "Resecabilidad (afectación de raíz del mesenterio, intestino delgado difuso)",
        ],
      },
      {
        id: "pancreatic-mass",
        name: "Masa pancreática / Pancreatic Mass",
        findings: [
          "Relación con vasos (tronco celíaco, AMS, vena porta/mesentérica) — resecabilidad",
          "Dilatación de vía biliar y conducto pancreático (signo del doble conducto)",
          "Metástasis hepáticas y adenopatías",
          "Atrofia parenquimatosa distal",
        ],
      },
      {
        id: "gallbladder-carcinoma",
        name: "Carcinoma de vesícula / pólipo / Gallbladder Carcinoma",
        findings: [
          "Engrosamiento parietal focal/irregular o masa que reemplaza la vesícula",
          "Invasión hepática y de vía biliar",
          "Adenopatías regionales y metástasis",
          "Pólipo >10 mm o de crecimiento (rasgo de sospecha)",
        ],
      },
      {
        id: "retroperitoneal-mass",
        name: "Masa / hematoma retroperitoneal / Retroperitoneal Mass",
        findings: [
          "Origen (adenopatías/linfoma, sarcoma, hematoma) y relación con grandes vasos (englobamiento vs desplazamiento)",
          "Extravasación activa si es hematoma",
          "Hidronefrosis por englobamiento ureteral",
          "Extensión a psoas y pared",
        ],
      },
      {
        id: "splenic-lesion",
        name: "Lesión esplénica no traumática / Splenic Lesion",
        findings: [
          "Infarto (cuña periférica hipodensa) vs absceso (gas, realce en anillo) vs masa",
          "Origen embólico (buscar cardiopatía) o infeccioso",
          "Esplenomegalia asociada",
          "Rotura espontánea (hemoperitoneo)",
        ],
      },
      {
        id: "adnexal-mass",
        name: "Masa anexial / Adnexal Mass (O-RADS)",
        findings: [
          "Componentes sólidos con realce, septos gruesos o proyecciones papilares (rasgos de sospecha)",
          "Ascitis e implantes peritoneales",
          "Bilateralidad",
          "Torsión asociada",
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
      {
        id: "brain-tumor",
        name: "Tumor cerebral / Brain Tumor",
        findings: [
          "Efecto de masa: desviación de línea media (mm), herniación (subfalcina, uncal, amigdalina)",
          "Edema perilesional (vasogénico) y su extensión",
          "Hidrocefalia obstructiva asociada",
          "Lesiones múltiples (orienta a metástasis) — buscar en todo el estudio",
          "Sangrado intratumoral",
        ],
      },
      {
        id: "brain-abscess",
        name: "Absceso cerebral / Brain Abscess",
        findings: [
          "Restricción de la difusión central (diferencia absceso de tumor necrótico)",
          "Ventriculitis asociada (nivel/detritos intraventriculares, realce ependimario) — empeora pronóstico",
          "Edema y efecto de masa",
          "Foco de origen: sinusitis, otomastoiditis, cardiopatía (buscarlo)",
        ],
      },
      {
        id: "hydrocephalus",
        name: "Hidrocefalia / Hydrocephalus",
        findings: [
          "Causa obstructiva (nivel de la obstrucción: acueducto, IV ventrículo, agujeros)",
          "Edema transependimario (agudización, requiere actuación)",
          "Comparación con estudios previos (progresión)",
          "Funcionamiento de válvula de derivación si existe (trayecto, colecciones)",
        ],
      },
      {
        id: "venous-sinus-thrombosis",
        name: "Trombosis venosa cerebral / Venous Sinus Thrombosis",
        findings: [
          "Extensión del trombo (senos afectados, venas corticales, sistema profundo)",
          "Infarto venoso (no respeta territorios arteriales) y transformación hemorrágica",
          "Signo del delta vacío tras contraste",
          "Edema cerebral y efecto de masa asociado",
        ],
      },
      {
        id: "cervical-spine-trauma",
        name: "Traumatismo cervical / Cervical Spine Trauma",
        findings: [
          "Alineación (listesis, aumento de espacios interespinosos — lesión ligamentosa)",
          "Estabilidad de la fractura (afectación de 2-3 columnas)",
          "Hematoma prevertebral / epidural",
          "Extensión a agujeros transversos (lesión de arteria vertebral — valorar angio)",
          "Compromiso del canal y de la médula (si RM: contusión, sección)",
        ],
      },
      {
        id: "cord-compression",
        name: "Compresión medular / Cord Compression",
        findings: [
          "Nivel(es) exacto(s) de compresión — urgencia neuroquirúrgica/radioterápica",
          "Causa: metástasis vertebral, absceso epidural, hematoma, hernia discal",
          "Mielopatía (hiperseñal T2 intramedular)",
          "Estabilidad vertebral asociada (colapso, afectación de elementos posteriores)",
        ],
      },
      {
        id: "orbital-cellulitis",
        name: "Celulitis orbitaria / Orbital Cellulitis",
        findings: [
          "Preseptal vs postseptal (cambia el manejo radicalmente)",
          "Absceso subperióstico u orbitario (indicación quirúrgica)",
          "Sinusitis de origen (etmoidal típicamente)",
          "Trombosis de vena oftálmica superior / seno cavernoso",
          "Afectación del nervio óptico",
        ],
      },
      {
        id: "carotid-dissection",
        name: "Disección carotídea / vertebral / Carotid Dissection",
        findings: [
          "Hematoma mural (semiluna hiperintensa en T1 con saturación grasa)",
          "Grado de estenosis u oclusión de la luz",
          "Pseudoaneurisma asociado",
          "Infarto cerebral distal (embólico o hemodinámico)",
          "Extensión intracraneal de la disección",
        ],
      },
      {
        id: "meningitis-complications",
        name: "Meningitis complicada / Complicated Meningitis",
        findings: [
          "Empiema subdural o absceso epidural",
          "Ventriculitis (detritos, realce ependimario)",
          "Infartos por vasculitis (típicos en meningitis bacteriana/TBC)",
          "Hidrocefalia comunicante",
          "Realce leptomeníngeo patológico y su distribución",
        ],
      },
      {
        id: "subdural-hematoma-chronic",
        name: "Hematoma subdural crónico / Chronic Subdural Hematoma",
        findings: [
          "Componente agudo sobreañadido (resangrado — membranas, niveles líquido-líquido)",
          "Efecto de masa: desviación de línea media, borramiento de surcos",
          "Bilateralidad (puede enmascarar el desplazamiento)",
          "Herniación",
        ],
      },
      {
        id: "pituitary-mass",
        name: "Masa hipofisaria / apoplejía / Pituitary Mass",
        findings: [
          "Extensión supraselar y compresión del quiasma óptico",
          "Invasión de senos cavernosos (englobamiento carotídeo)",
          "Apoplejía (hemorragia/necrosis aguda) — urgencia",
          "Hidrocefalia por compresión del III ventrículo",
        ],
      },
      {
        id: "posterior-fossa-lesion",
        name: "Lesión de fosa posterior / Posterior Fossa Lesion",
        findings: [
          "Efecto de masa sobre el IV ventrículo → hidrocefalia obstructiva (urgencia)",
          "Compresión o desplazamiento del tronco encefálico",
          "Herniación amigdalar descendente o transtentorial ascendente",
          "Edema asociado",
        ],
      },
      {
        id: "demyelinating-disease",
        name: "Enfermedad desmielinizante (EM) / Demyelinating Disease",
        findings: [
          "Lesiones activas (realce tras contraste) vs crónicas",
          "Distribución típica (periventricular perpendicular, yuxtacortical, infratentorial, medular)",
          "Carga lesional y comparación con previos (lesiones nuevas)",
          "Lesión medular asociada",
        ],
      },
      {
        id: "cerebral-metastases",
        name: "Metástasis cerebrales / Cerebral Metastases",
        findings: [
          "Número y localización (unión córtico-subcortical) — buscar en todo el estudio",
          "Edema desproporcionado y efecto de masa/herniación",
          "Componente hemorrágico",
          "Afectación leptomeníngea",
        ],
      },
      {
        id: "avm-vascular-malformation",
        name: "Malformación vascular (MAV) / Vascular Malformation",
        findings: [
          "Nido, arterias aferentes y drenaje venoso (drenaje venoso profundo = mayor riesgo)",
          "Aneurismas de flujo asociados",
          "Hemorragia aguda",
          "Efecto de masa y edema",
        ],
      },
      {
        id: "hypoxic-ischemic-encephalopathy",
        name: "Encefalopatía hipóxico-isquémica / HIE",
        findings: [
          "Pérdida de diferenciación córtico-subcortical y borramiento de surcos (edema difuso)",
          "Afectación de ganglios basales y tálamos",
          "Signo del cerebelo blanco (white cerebellum)",
          "Herniación",
        ],
      },
      {
        id: "intracranial-vasculopathy",
        name: "Vasculopatía intracraneal (vasculitis / moyamoya) / Intracranial Vasculopathy",
        findings: [
          "Estenosis y oclusiones multifocales y su distribución",
          "Infartos en distintos territorios y de distintas edades",
          "Circulación colateral (moyamoya)",
          "Realce parietal arterial (vasculitis)",
        ],
      },
      {
        id: "spinal-cord-tumor",
        name: "Tumor medular / Spinal Cord Tumor",
        findings: [
          "Compartimento (intramedular, intradural-extramedular, extradural) — orienta el diagnóstico",
          "Extensión (niveles) y ensanchamiento medular",
          "Realce y componente quístico/siringomielia asociada",
          "Compresión medular / mielopatía",
        ],
      },
      {
        id: "cauda-equina-syndrome",
        name: "Síndrome de cola de caballo / Cauda Equina Syndrome",
        findings: [
          "Causa compresiva (hernia discal masiva, masa, hematoma, absceso) y nivel",
          "Grado de compresión del saco tecal y aglutinación de raíces",
          "Realce (proceso inflamatorio o tumoral)",
          "Urgencia quirúrgica — señalar",
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
      {
        id: "spondylodiscitis",
        name: "Espondilodiscitis / Spondylodiscitis",
        findings: [
          "Absceso epidural (compresión medular asociada) — urgencia",
          "Absceso de psoas o paravertebral",
          "Destrucción de platillos vertebrales y colapso (estabilidad)",
          "Niveles afectados (multifocalidad — típica de TBC)",
          "Afectación del arco posterior (orienta a TBC vs piógena)",
        ],
      },
      {
        id: "septic-arthritis",
        name: "Artritis séptica / Septic Arthritis",
        findings: [
          "Derrame articular (indicación de artrocentesis urgente)",
          "Osteomielitis adyacente (edema óseo, erosiones)",
          "Colecciones periarticulares / afectación de partes blandas",
          "Erosiones y destrucción del cartílago (cronicidad)",
        ],
      },
      {
        id: "necrotizing-fasciitis",
        name: "Fascitis necrotizante / Necrotizing Fasciitis",
        findings: [
          "Gas en partes blandas siguiendo planos fasciales — hallazgo clave, urgencia quirúrgica",
          "Líquido y engrosamiento a lo largo de las fascias profundas",
          "Extensión anatómica exacta (planificación quirúrgica)",
          "Miositis / necrosis muscular asociada",
        ],
      },
      {
        id: "bone-metastases",
        name: "Metástasis óseas / Bone Metastases",
        findings: [
          "Riesgo de fractura patológica (destrucción cortical >50%, hueso de carga)",
          "Compresión medular o radicular asociada (nivel)",
          "Patrón (lítico, blástico, mixto) y distribución",
          "Fractura patológica ya establecida",
          "Masa de partes blandas asociada",
        ],
      },
      {
        id: "hip-fracture",
        name: "Fractura de cadera / cuello femoral / Hip Fracture",
        findings: [
          "Localización (intracapsular vs extracapsular) — cambia el tratamiento",
          "Desplazamiento y conminución",
          "Fractura oculta (edema en RM si radiografía dudosa)",
          "Fractura patológica subyacente",
        ],
      },
      {
        id: "long-bone-fracture",
        name: "Fractura de hueso largo / Long Bone Fracture",
        findings: [
          "Desplazamiento, angulación y conminución",
          "Lesión vascular asociada (angio si déficit de pulsos)",
          "Riesgo de síndrome compartimental (edema muscular tenso)",
          "Extensión intraarticular",
        ],
      },
      {
        id: "osteomyelitis",
        name: "Osteomielitis / Osteomyelitis",
        findings: [
          "Absceso intraóseo (Brodie) o de partes blandas asociado",
          "Secuestro y afectación cortical",
          "Extensión articular (artritis séptica)",
          "Trayecto fistuloso a piel",
        ],
      },
      {
        id: "primary-bone-tumor",
        name: "Tumor óseo primario / Primary Bone Tumor",
        findings: [
          "Rasgos de agresividad (patrón permeativo, reacción perióstica interrumpida, masa de partes blandas)",
          "Matriz (condroide, osteoide) — orienta el tipo",
          "Extensión intramedular y a partes blandas (planificación)",
          "Afectación articular o neurovascular",
        ],
      },
      {
        id: "pathological-fracture",
        name: "Fractura patológica / Pathological Fracture",
        findings: [
          "Lesión ósea subyacente (lítica/blástica) y su naturaleza",
          "Otras localizaciones de carga en riesgo (buscar más lesiones)",
          "Masa de partes blandas asociada",
          "Colapso o inestabilidad si es vertebral",
        ],
      },
      {
        id: "avascular-necrosis",
        name: "Necrosis avascular / Avascular Necrosis",
        findings: [
          "Estadio (colapso subcondral, signo de la media luna) — determina el tratamiento",
          "Afectación de la superficie articular",
          "Bilateralidad (valorar contralateral)",
          "Edema óseo asociado (RM)",
        ],
      },
      {
        id: "soft-tissue-mass",
        name: "Masa de partes blandas / Soft-Tissue Mass",
        findings: [
          "Rasgos de sospecha (>5 cm, profunda a la fascia, heterogénea, realce)",
          "Relación con paquete neurovascular y hueso",
          "Extensión compartimental (planificación quirúrgica)",
          "Adenopatías regionales",
        ],
      },
      {
        id: "tendon-rupture",
        name: "Rotura tendinosa mayor / Major Tendon Rupture",
        findings: [
          "Rotura completa vs parcial y gap entre cabos (retracción)",
          "Tendón afectado (Aquiles, cuádriceps, rotuliano, manguito)",
          "Derrame o hematoma asociado",
          "Cronicidad (retracción, atrofia)",
        ],
      },
      {
        id: "joint-dislocation",
        name: "Luxación articular / Joint Dislocation",
        findings: [
          "Dirección de la luxación y fracturas asociadas (fractura-luxación)",
          "Lesión neurovascular asociada",
          "Congruencia tras reducción y cuerpos libres intraarticulares",
          "Lesiones de partes blandas (Bankart, Hill-Sachs en el hombro)",
        ],
      },
      {
        id: "stress-insufficiency-fracture",
        name: "Fractura de estrés / insuficiencia / Stress Fracture",
        findings: [
          "Localización de riesgo (cuello femoral, base del 5º metatarsiano, cortical anterior de tibia)",
          "Línea de fractura vs solo edema óseo",
          "Enfermedad ósea subyacente (insuficiencia)",
          "Bilateralidad",
        ],
      },
    ],
  },
  {
    id: "head-neck",
    name: "Cabeza y cuello / Head & Neck",
    conditions: [
      {
        id: "neck-abscess",
        name: "Absceso cervical profundo / Deep Neck Abscess",
        findings: [
          "Espacios cervicales afectados (parafaríngeo, retrofaríngeo, submandibular…)",
          "Compromiso de la vía aérea (desviación, estenosis) — urgencia",
          "Extensión mediastínica (mediastinitis descendente)",
          "Trombosis de vena yugular interna (síndrome de Lemierre)",
          "Colección drenable vs flemón",
        ],
      },
      {
        id: "sinusitis-complications",
        name: "Sinusitis complicada / Complicated Sinusitis",
        findings: [
          "Complicación orbitaria (celulitis, absceso subperióstico)",
          "Complicación intracraneal: empiema epidural/subdural, absceso, trombosis de senos",
          "Erosión ósea de las paredes sinusales",
          "Signos de sinusitis fúngica invasiva (inmunodeprimido: invasión de grasa, erosión agresiva)",
        ],
      },
      {
        id: "sialolithiasis",
        name: "Sialolitiasis / Sialoadenitis / Sialolithiasis",
        findings: [
          "Localización del lito (conducto vs intraglandular) y tamaño",
          "Dilatación ductal proximal",
          "Signos de sobreinfección o absceso glandular",
          "Masa glandular subyacente que simule inflamación",
        ],
      },
      {
        id: "thyroid-nodule-mass",
        name: "Nódulo / masa tiroidea / Thyroid Nodule",
        findings: [
          "Rasgos de sospecha (microcalcificaciones, hipoecogenicidad marcada, más alto que ancho, márgenes irregulares) — TI-RADS",
          "Extensión extratiroidea e invasión de estructuras (tráquea, esófago, nervio recurrente)",
          "Adenopatías cervicales sospechosas",
          "Desviación o compresión traqueal",
        ],
      },
      {
        id: "salivary-gland-mass",
        name: "Masa de glándula salival (parótida) / Salivary Gland Mass",
        findings: [
          "Lóbulo superficial vs profundo (relación con el nervio facial) — planificación",
          "Rasgos de malignidad (márgenes infiltrantes, adenopatías, invasión perineural)",
          "Multiplicidad o bilateralidad (Warthin)",
          "Extensión al espacio parafaríngeo",
        ],
      },
      {
        id: "laryngeal-hypopharyngeal-cancer",
        name: "Cáncer laríngeo / hipofaríngeo / Laryngeal Cancer",
        findings: [
          "Subsitio y extensión (comisura anterior, espacio paraglótico y preepiglótico)",
          "Invasión de cartílagos (tiroides, cricoides) — estadio T",
          "Afectación de la vía aérea",
          "Adenopatías cervicales (niveles) y metástasis",
        ],
      },
      {
        id: "oral-oropharyngeal-cancer",
        name: "Cáncer de cavidad oral / orofaringe / Oral Cancer",
        findings: [
          "Tamaño y profundidad de invasión; cruce de la línea media",
          "Invasión ósea (mandíbula/maxilar) e invasión perineural",
          "Adenopatías cervicales (niveles, extensión extracapsular)",
          "Extensión a espacios profundos",
        ],
      },
      {
        id: "cervical-lymphadenopathy",
        name: "Adenopatías cervicales / Cervical Lymphadenopathy",
        findings: [
          "Rasgos de malignidad (necrosis central, redondeamiento, extensión extracapsular)",
          "Nivel(es) y lateralidad — orienta el primario",
          "Patrón (metastásico vs linfoma vs infeccioso)",
          "Buscar el tumor primario (mucosa, tiroides, piel)",
        ],
      },
      {
        id: "nasopharyngeal-mass",
        name: "Masa nasofaríngea / Nasopharyngeal Mass",
        findings: [
          "Extensión a la base del cráneo e invasión perineural (agujeros)",
          "Afectación del espacio parafaríngeo y músculos",
          "Adenopatías retrofaríngeas y cervicales",
          "Ocupación del oído medio por disfunción tubárica",
        ],
      },
      {
        id: "orbital-mass",
        name: "Masa orbitaria / Orbital Mass",
        findings: [
          "Localización (intraconal vs extraconal) — orienta el diagnóstico",
          "Afectación del nervio óptico y músculos extraoculares",
          "Remodelado/erosión ósea y extensión intracraneal o sinusal",
          "Compromiso visual por compresión",
        ],
      },
      {
        id: "cholesteatoma-otomastoiditis",
        name: "Colesteatoma / otomastoiditis complicada / Cholesteatoma",
        findings: [
          "Erosión osicular y de la pared del ático (scutum)",
          "Complicaciones: erosión del tegmen, del canal facial o del conducto semicircular lateral (fístula)",
          "Absceso o trombosis de senos (complicación intracraneal)",
          "Extensión del tejido de partes blandas",
        ],
      },
      {
        id: "epiglottitis",
        name: "Epiglotitis / supraglotitis / Epiglottitis",
        findings: [
          "Engrosamiento de epiglotis y pliegues aritenoepiglóticos — compromiso de vía aérea",
          "Absceso asociado (epiglótico, retrofaríngeo)",
          "Grado de estrechamiento de la vía aérea",
          "Enfisema o edema cervical",
        ],
      },
      {
        id: "carotid-body-paraganglioma",
        name: "Paraganglioma / tumor del cuerpo carotídeo / Paraganglioma",
        findings: [
          "Localización y separación de carótidas interna y externa (signo de la lira)",
          "Vascularización/realce intenso y flow voids",
          "Multicentricidad (buscar otros paragangliomas)",
          "Extensión a la base del cráneo o compresión de la vía aérea",
        ],
      },
    ],
  },
  {
    id: "vascular",
    name: "Vascular",
    conditions: [
      {
        id: "dvt",
        name: "Trombosis venosa profunda / DVT",
        findings: [
          "Extensión exacta del trombo (límite proximal — cambia el manejo)",
          "Trombo flotante (alto riesgo embólico)",
          "Afectación iliocava vs femoropoplítea vs distal",
          "Signos de síndrome de May-Thurner (compresión de ilíaca común izquierda)",
          "TEP asociado si el estudio lo incluye",
        ],
      },
      {
        id: "evar-endoleak",
        name: "Seguimiento EVAR / Endofuga / Endoleak",
        findings: [
          "Tipo de endofuga (I-V) — determina el manejo",
          "Crecimiento del saco aneurismático respecto a previos (medidas comparadas)",
          "Permeabilidad de ramas y migración de la endoprótesis",
          "Integridad del dispositivo (fractura, desconexión de módulos)",
        ],
      },
      {
        id: "acute-limb-ischemia",
        name: "Isquemia arterial aguda de miembro / Acute Limb Ischemia",
        findings: [
          "Nivel de oclusión y longitud del segmento ocluido",
          "Estado del lecho distal (reconstitución por colaterales) — viabilidad",
          "Émbolo vs trombosis sobre placa",
          "Colaterales desarrolladas",
        ],
      },
      {
        id: "peripheral-arterial-disease",
        name: "Enfermedad arterial periférica / PAD",
        findings: [
          "Localización y grado de estenosis (>50% significativa) y oclusiones",
          "Calcificación parietal (dificulta el tratamiento endovascular)",
          "Estado del lecho distal (runoff) — planificación de revascularización",
          "Aneurismas coexistentes",
        ],
      },
      {
        id: "thoracic-aortic-aneurysm",
        name: "Aneurisma de aorta torácica / Thoracic Aortic Aneurysm",
        findings: [
          "Diámetro máximo y comparación con previos (crecimiento)",
          "Signos de rotura o fisura inminente (hematoma, crescent sign)",
          "Extensión (raíz, ascendente, arco, descendente) y relación con troncos supraaórticos",
          "Trombo mural",
        ],
      },
      {
        id: "peripheral-aneurysm",
        name: "Aneurisma periférico (poplíteo / ilíaco) / Peripheral Aneurysm",
        findings: [
          "Diámetro y trombo mural (riesgo embólico y de trombosis)",
          "Permeabilidad y estado del lecho distal",
          "Bilateralidad (valorar contralateral) y AAA asociado",
          "Signos de rotura",
        ],
      },
      {
        id: "renal-artery-stenosis",
        name: "Estenosis de arteria renal / Renal Artery Stenosis",
        findings: [
          "Grado y localización (ostial vs troncular; ateromatosa vs displasia fibromuscular)",
          "Asimetría de tamaño renal o atrofia",
          "Bilateralidad o riñón único",
          "Infartos renales",
        ],
      },
      {
        id: "vascular-trauma-pseudoaneurysm",
        name: "Traumatismo vascular / pseudoaneurisma / Vascular Trauma",
        findings: [
          "Extravasación activa de contraste (sangrado) — urgencia",
          "Pseudoaneurisma y fístula arteriovenosa",
          "Oclusión o disección traumática",
          "Hematoma y efecto de masa",
        ],
      },
      {
        id: "carotid-stenosis",
        name: "Estenosis carotídea / Carotid Stenosis",
        findings: [
          "Grado de estenosis (criterios NASCET)",
          "Morfología de la placa (ulceración, hemorragia intraplaca — placa vulnerable)",
          "Bilateralidad y lesión en tándem intracraneal",
          "Infartos en el territorio",
        ],
      },
      {
        id: "large-vessel-vasculitis",
        name: "Vasculitis de gran vaso (Takayasu / arteritis) / Large-Vessel Vasculitis",
        findings: [
          "Engrosamiento parietal circunferencial y realce (actividad)",
          "Estenosis, oclusiones y aneurismas; distribución",
          "Afectación de troncos supraaórticos y aorta",
          "Comparación con previos (progresión)",
        ],
      },
      {
        id: "portomesenteric-thrombosis",
        name: "Trombosis venosa portal / mesentérica / Portomesenteric Thrombosis",
        findings: [
          "Extensión (porta, esplénica, mesentérica superior) y agudo vs crónico (cavernomatosis)",
          "Isquemia intestinal asociada (edema mural, neumatosis) — urgencia",
          "Trombo tumoral vs blando (realce) en contexto de CHC",
          "Causa (cirrosis, estado protrombótico, infección)",
        ],
      },
      {
        id: "aortic-graft-infection",
        name: "Infección de prótesis vascular / Aortic Graft Infection",
        findings: [
          "Colección o gas periprotésico (tardío = infección)",
          "Pseudoaneurisma anastomótico",
          "Fístula aortoentérica (gas, contraste, contacto con duodeno) — urgencia",
          "Afectación de estructuras vecinas",
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
