// Deepgram keyword boosters for medical radiology speech recognition.
// Format: "term:intensity" — intensity 1-5 (5 = strongest boost).
// Budget: ~280 keywords max to stay within WebSocket URL limits.
// Intensity 5: phonetically ambiguous terms Deepgram consistently mangles.
// Intensity 4: core radiology vocabulary used in nearly every report.
// Intensity 3: important but less frequent terms.

export const RADIOLOGY_KEYWORDS_ES: string[] = [
  // ═══ INTENSITY 5: most misrecognized ═══════════════════════
  "nódulo:5", "nódulos:5",
  "lóbulo:5", "lóbulos:5",
  "pleural:5", "pleurales:5",
  "hilar:5", "hiliares:5", "hilio:5",
  "adenopatía:5", "adenopatías:5",
  "derrame pleural:5",
  "neumotórax:5", "hemotórax:5",
  "atelectasia:5", "atelectasias:5",
  "parénquima:5", "parenquimatoso:5", "parenquimatosa:5",

  // ═══ INTENSITY 4: core radiology vocabulary ════════════════

  // ── Tórax ──
  "lóbulo superior:4", "lóbulo medio:4", "lóbulo inferior:4",
  "língula:4",
  "bronquio:4", "bronquios:4", "bronquial:4", "bronquiectasias:4",
  "tráquea:4", "traqueal:4",
  "carina:4", "subcarinal:4",
  "mediastino:4", "mediastínico:4", "mediastínica:4",
  "pericárdico:4", "pericárdica:4", "pericardio:4",
  "pleura:4", "cisura:4",
  "intersticial:4",
  "consolidación:4", "consolidaciones:4",
  "opacidad:4", "opacidades:4",
  "vidrio deslustrado:4", "vidrio esmerilado:4",
  "enfisema:4",
  "fibrosis:4",
  "nódulo pulmonar:4",
  "derrame pericárdico:4",
  "cardiomegalia:4",
  "hilios pulmonares:4",

  // ── Abdomen / pelvis ──
  "hepático:4", "hepática:4", "hígado:4",
  "hepatomegalia:4",
  "esteatosis:4", "esteatosis hepática:4",
  "esplénico:4", "esplénica:4", "bazo:4",
  "esplenomegalia:4",
  "pancreático:4", "pancreática:4", "páncreas:4",
  "colédoco:4",
  "vesícula biliar:4",
  "colelitiasis:4", "coledocolitiasis:4",
  "colecistitis:4",
  "renal:4", "renales:4", "riñón:4",
  "suprarrenal:4", "suprarrenales:4",
  "hidronefrosis:4",
  "nefrolitiasis:4", "urolitiasis:4",
  "litiasis:4",
  "ureteral:4", "uréter:4",
  "peritoneal:4",
  "retroperitoneal:4",
  "ascitis:4",
  "mesentérico:4", "mesentérica:4",
  "divertículo:4", "diverticulosis:4", "diverticulitis:4",
  "aorta:4", "aórtico:4", "aórtica:4",
  "aneurisma:4",
  "trombosis:4", "trombo:4",

  // ── Columna / MSK ──
  "vertebral:4", "vertebrales:4", "vértebra:4",
  "intervertebral:4",
  "cervical:4",
  "lumbar:4",
  "protrusión:4", "protrusiones:4",
  "hernia discal:4",
  "estenosis:4",
  "canal raquídeo:4", "canal medular:4",
  "foraminal:4", "foramen:4",
  "fractura:4", "fracturas:4",
  "metástasis:4",

  // ── Cabeza / cuello ──
  "hidrocefalia:4",
  "isquemia:4", "isquémico:4", "isquémica:4",
  "infarto:4",
  "hemorragia:4",
  "hematoma:4",

  // ── Mama ──
  "BIRADS:4", "BI-RADS:4",
  "mamografía:4",
  "microcalcificaciones:4", "microcalcificación:4",
  "fibroadenoma:4",
  "quiste:4", "quistes:4",
  "axilar:4", "axilares:4",

  // ── Vascular ──
  "oclusión:4",
  "tromboembolismo:4", "tromboembolia:4",
  "embolismo pulmonar:4", "TEP:4",
  "disección:4",
  "calcificación:4", "calcificaciones:4",

  // ── Ecografía señal ──
  "ecoestructura:4",
  "ecogénico:4", "ecogénica:4",
  "anecoico:4", "anecoica:4",
  "hipoecoico:4", "hipoecoica:4",
  "hiperecoico:4", "hiperecoica:4",
  "Doppler:4",

  // ── RM señal ──
  "hipointenso:4", "hipointensa:4",
  "hiperintenso:4", "hiperintensa:4",
  "T1:4", "T2:4", "FLAIR:4", "STIR:4",
  "difusión:4", "restricción de la difusión:4",
  "gadolinio:4", "captación:4", "realce:4",

  // ── TC densidad ──
  "hipodensidad:4", "hipodensa:4", "hipodenso:4",
  "hiperdensidad:4", "hiperdensa:4", "hiperdenso:4",
  "contraste:4",

  // ── Descriptores / medidas ──
  "eje corto:4", "eje largo:4",
  "supraclavicular:4", "infraclavicular:4",
  "paratraqueal:4", "paratraqueales:4",
  "subcarinal:4",
];

export const RADIOLOGY_KEYWORDS_EN: string[] = [
  // ═══ INTENSITY 5 ═══
  "nodule:5", "nodules:5",
  "lobe:5", "lobes:5",
  "pleural:5",
  "hilar:5", "hilum:5",
  "adenopathy:5", "lymphadenopathy:5",
  "pleural effusion:5",
  "pneumothorax:5", "hemothorax:5",
  "atelectasis:5",
  "parenchyma:5", "parenchymal:5",

  // ═══ INTENSITY 4 ═══
  "upper lobe:4", "middle lobe:4", "lower lobe:4",
  "lingula:4",
  "bronchus:4", "bronchi:4", "bronchiectasis:4",
  "trachea:4", "tracheal:4",
  "carina:4", "subcarinal:4",
  "mediastinum:4", "mediastinal:4",
  "pericardial:4", "pericardium:4",
  "interstitial:4",
  "consolidation:4",
  "opacity:4", "opacities:4",
  "ground glass:4",
  "emphysema:4",
  "fibrosis:4",
  "cardiomegaly:4",
  "hepatic:4", "liver:4", "hepatomegaly:4",
  "steatosis:4",
  "splenic:4", "spleen:4", "splenomegaly:4",
  "pancreatic:4", "pancreas:4",
  "cholelithiasis:4", "cholecystitis:4",
  "renal:4", "kidney:4",
  "adrenal:4",
  "hydronephrosis:4",
  "nephrolithiasis:4",
  "peritoneal:4", "retroperitoneal:4",
  "ascites:4",
  "mesenteric:4",
  "diverticulosis:4", "diverticulitis:4",
  "aorta:4", "aortic:4",
  "aneurysm:4",
  "thrombosis:4", "thrombus:4",
  "vertebral:4", "intervertebral:4",
  "cervical:4", "lumbar:4",
  "protrusion:4", "herniation:4",
  "stenosis:4",
  "spinal canal:4", "foraminal:4",
  "fracture:4", "fractures:4",
  "metastasis:4", "metastatic:4",
  "hydrocephalus:4",
  "ischemia:4", "ischemic:4",
  "hemorrhage:4",
  "hematoma:4",
  "BIRADS:4", "BI-RADS:4",
  "microcalcifications:4",
  "fibroadenoma:4",
  "axillary:4",
  "occlusion:4",
  "pulmonary embolism:4",
  "dissection:4",
  "calcification:4", "calcifications:4",
  "anechoic:4", "hypoechoic:4", "hyperechoic:4",
  "Doppler:4",
  "hypointense:4", "hyperintense:4",
  "T1:4", "T2:4", "FLAIR:4", "STIR:4",
  "diffusion:4", "restricted diffusion:4",
  "gadolinium:4", "enhancement:4",
  "hypodense:4", "hyperdense:4",
  "short axis:4", "long axis:4",
  "supraclavicular:4", "infraclavicular:4",
  "paratracheal:4",
];

export function getRadiologyKeywords(language: string): string[] {
  if (language === "es") return RADIOLOGY_KEYWORDS_ES;
  if (language === "en") return RADIOLOGY_KEYWORDS_EN;
  if (language === "pt") return RADIOLOGY_KEYWORDS_ES;
  return [];
}
