// Deepgram keyterm boosters for medical radiology speech recognition.
// ~100 terms per language — only terms Deepgram is likely to misrecognize.
// Common words (hígado, cerebro, normal) are omitted since nova-3 handles them fine.

export const RADIOLOGY_KEYTERMS_ES: string[] = [
  // Anatomía — solo términos técnicos que se confunden
  "parénquima", "mediastino", "retroperitoneal",
  "hilio", "hilar", "subcarinal", "paratraqueal",
  "prevascular", "aortopulmonar", "costodiafragmático",
  "costofrénico", "hemidiafragma", "língula",
  "colédoco", "wirsung", "esplénico",
  "suprarrenal", "mesenterio", "mesentérico", "epiplón",
  // Patología — términos más confundidos
  "adenopatía", "linfadenopatía",
  "neumotórax", "hemotórax", "hidroneumotórax",
  "atelectasia", "consolidación",
  "cavitación", "empiema",
  "tromboembolismo", "trombosis",
  "hepatomegalia", "esplenomegalia", "cardiomegalia",
  "hidronefrosis", "ureterohidronefrosis",
  "bronquiectasias", "loculado",
  "calcificación", "necrosis",
  "estenosis", "ectasia", "aneurisma",
  "metástasis", "neoplasia",
  "colelitiasis", "nefrolitiasis", "urolitiasis",
  "esteatosis", "cirrosis", "ascitis",
  "diverticulosis", "diverticulitis",
  "pancreatitis", "colecistitis",
  "enfisema", "ateromatosis", "aterosclerosis",
  "tromboflebitis", "intususcepción", "vólvulo",
  // Musculoesquelético
  "espondilosis", "espondilolistesis",
  "artropatía", "tendinosis", "tendinitis",
  "trabecular", "epífisis", "metáfisis", "diáfisis",
  "acetábulo", "calcáneo", "astrágalo",
  // Neurológico
  "hipófisis", "subaracnoideo",
  "putamen", "tálamo",
  // Mama
  "birads", "bi-rads", "fibroglandular",
  // Descriptores de imagen — los más confundidos
  "hipoecoico", "hiperecoico", "anecoico", "ecogénico",
  "hipointenso", "hiperintenso", "isointenso",
  "hipodenso", "hiperdenso", "isodenso",
  "heterogéneo", "espiculado", "lobulado",
  "pediculado", "captante",
  // Modalidades técnicas
  "tomografía", "resonancia magnética", "ecografía",
  "angiotomografía", "angiorresonancia",
  "gadolinio", "hounsfield",
  "difusión", "perfusión", "espectroscopia",
  "FLAIR", "STIR",
  // Medidas
  "anteroposterior", "craneocaudal",
];

export const RADIOLOGY_KEYTERMS_PT: string[] = [
  // Anatomia — termos técnicos confusos
  "parênquima", "mediastino", "retroperitoneal",
  "hilo", "hilar", "subcarinal", "paratraqueal",
  "pré-vascular", "aortopulmonar", "costodiafragmático",
  "costofrênico", "hemidiafragma", "língula",
  "colédoco", "wirsung", "esplênico",
  "suprarrenal", "mesentério", "mesentérico",
  // Patologia
  "adenopatia", "linfonodomegalia",
  "pneumotórax", "hemotórax", "hidropneumotórax",
  "atelectasia", "consolidação",
  "cavitação", "empiema",
  "tromboembolismo", "trombose",
  "hepatomegalia", "esplenomegalia", "cardiomegalia",
  "hidronefrose", "ureterohidronefrose",
  "bronquiectasias", "loculado",
  "calcificação", "necrose",
  "estenose", "ectasia", "aneurisma",
  "metástase", "neoplasia",
  "colelitíase", "nefrolitíase", "urolitíase",
  "esteatose", "cirrose", "ascite",
  "diverticulose", "diverticulite",
  "pancreatite", "colecistite",
  "enfisema", "ateromatose", "aterosclerose",
  "tromboflebite", "intussuscepção", "volvo",
  // Musculoesquelético
  "espondilose", "espondilolistese",
  "artropatia", "tendinose", "tendinite",
  "trabecular", "epífise", "metáfise", "diáfise",
  "acetábulo", "calcâneo", "tálus",
  // Neurológico
  "hipófise", "subaracnóideo",
  "putâmen", "tálamo",
  // Mama
  "birads", "bi-rads", "fibroglandular",
  // Descritores de imagem
  "hipoecoico", "hiperecoico", "anecoico", "ecogênico",
  "hipointenso", "hiperintenso", "isointenso",
  "hipodenso", "hiperdenso", "isodenso",
  "heterogêneo", "espiculado", "lobulado",
  "pediculado", "captante",
  // Modalidades
  "tomografia", "ressonância magnética", "ecografia",
  "angiotomografia", "angiorressonância",
  "gadolínio", "hounsfield",
  "difusão", "perfusão", "espectroscopia",
  "FLAIR", "STIR",
  // Medidas
  "anteroposterior", "craniocaudal",
];

export const RADIOLOGY_KEYTERMS_EN: string[] = [
  // Anatomy — technical terms likely misrecognized
  "parenchyma", "mediastinum", "retroperitoneal",
  "hilum", "hilar", "subcarinal", "paratracheal",
  "prevascular", "aortopulmonary", "costophrenic",
  "hemidiaphragm", "lingula",
  "choledochal", "wirsung", "splenic",
  "adrenal", "mesentery", "mesenteric", "omentum",
  // Pathology
  "adenopathy", "lymphadenopathy",
  "pneumothorax", "hemothorax", "hydropneumothorax",
  "atelectasis", "consolidation",
  "cavitation", "empyema",
  "thromboembolism", "thrombosis",
  "hepatomegaly", "splenomegaly", "cardiomegaly",
  "hydronephrosis",
  "bronchiectasis", "loculated",
  "calcification", "necrosis",
  "stenosis", "ectasia", "aneurysm",
  "metastasis", "neoplasm",
  "cholelithiasis", "nephrolithiasis", "urolithiasis",
  "steatosis", "cirrhosis", "ascites",
  "diverticulosis", "diverticulitis",
  "pancreatitis", "cholecystitis",
  "emphysema", "atherosclerosis",
  "thrombophlebitis", "intussusception", "volvulus",
  // Musculoskeletal
  "spondylosis", "spondylolisthesis",
  "arthropathy", "tendinosis", "tendinitis",
  "trabecular", "epiphysis", "metaphysis", "diaphysis",
  "acetabulum", "calcaneus", "talus",
  // Neurological
  "pituitary", "subarachnoid",
  "putamen", "thalamus",
  // Breast
  "birads", "bi-rads", "fibroglandular",
  // Image descriptors
  "hypoechoic", "hyperechoic", "anechoic", "echogenic",
  "hypointense", "hyperintense", "isointense",
  "hypodense", "hyperdense", "isodense",
  "heterogeneous", "spiculated", "lobulated",
  "pedunculated", "enhancing",
  // Modalities
  "tomography", "sonography",
  "CT angiography", "MR angiography",
  "gadolinium", "hounsfield",
  "diffusion", "perfusion", "spectroscopy",
  "FLAIR", "STIR",
  // Measurements
  "anteroposterior", "craniocaudal",
];

export function getRadiologyKeyterms(language: string): string[] {
  if (language.startsWith("es")) return RADIOLOGY_KEYTERMS_ES;
  if (language.startsWith("en")) return RADIOLOGY_KEYTERMS_EN;
  if (language.startsWith("pt")) return RADIOLOGY_KEYTERMS_PT;
  return [];
}

export function resolveDeepgramLanguage(language: string): string {
  if (language === "es" || language === "es-419") return "es-419";
  if (language === "pt" || language === "pt-BR") return "pt-BR";
  return language;
}
