// Deepgram keyword boosters for medical radiology speech recognition.
// Format: "term:intensity" — intensity 1-5 (5 = strongest boost).
// Kept minimal (~20 per language) to stay within Deepgram WebSocket limits.

export const RADIOLOGY_KEYWORDS_ES: string[] = [
  "nódulo:5", "nódulos:5",
  "lóbulo:5", "lóbulos:5",
  "pleural:5", "pleurales:5",
  "hilar:5", "hiliares:5", "hilio:5",
  "adenopatía:5", "adenopatías:5",
  "derrame pleural:5",
  "neumotórax:5", "hemotórax:5",
  "atelectasia:5", "atelectasias:5",
  "parénquima:5", "parenquimatoso:5", "parenquimatosa:5",
  "mediastino:5", "pericárdico:5",
  "hipoecoico:5", "hiperecoico:5",
  "hipointenso:5", "hiperintenso:5",
  "hipodenso:5", "hiperdenso:5",
  "retroperitoneal:5",
  "colédoco:5", "colelitiasis:5",
  "hepatomegalia:5", "esplenomegalia:5",
  "hidronefrosis:5", "bronquiectasias:5",
  "cardiomegalia:5", "tromboembolismo:5",
  "esteatosis:5", "diverticulosis:5",
  "supraclavicular:5", "infraclavicular:5",
  "paratraqueal:5",
];

export const RADIOLOGY_KEYWORDS_EN: string[] = [
  "nodule:5", "nodules:5",
  "lobe:5", "lobes:5",
  "pleural:5",
  "hilar:5", "hilum:5",
  "adenopathy:5", "lymphadenopathy:5",
  "pleural effusion:5",
  "pneumothorax:5", "hemothorax:5",
  "atelectasis:5",
  "parenchyma:5", "parenchymal:5",
  "mediastinum:5",
  "hypoechoic:5", "hyperechoic:5",
  "hypointense:5", "hyperintense:5",
  "hypodense:5", "hyperdense:5",
  "retroperitoneal:5",
  "hepatomegaly:5", "splenomegaly:5",
  "hydronephrosis:5", "bronchiectasis:5",
  "cardiomegaly:5", "thromboembolism:5",
];

export function getRadiologyKeywords(language: string): string[] {
  if (language === "es") return RADIOLOGY_KEYWORDS_ES;
  if (language === "en") return RADIOLOGY_KEYWORDS_EN;
  if (language === "pt") return RADIOLOGY_KEYWORDS_ES;
  return [];
}
