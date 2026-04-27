/**
 * Compact domain-specific prompts for Whisper.
 *
 * Whisper uses the `prompt` parameter as conditioning text and truncates
 * to the LAST 224 tokens. These prompts are kept short (~150 tokens)
 * and placed AFTER prior-transcript context on the server, so they
 * always fall within the surviving window.
 *
 * Focus: dense pathological vocabulary that Whisper commonly mangles.
 */

const PROMPT_ES = `Informe de radiología. Dictado médico en español.
colelitiasis, colecistitis, coledocolitiasis, hepatomegalia, esteatosis, cirrosis, esplenomegalia, hidronefrosis, nefrolitiasis, diverticulosis, diverticulitis, linfadenopatía, apendicitis, ascitis, pancreatitis.
atelectasia, consolidación, derrame pleural, neumotórax, bronquiectasias, enfisema, derrame pericárdico, cardiomegalia, tromboembolismo pulmonar.
estenosis, trombosis, aneurisma, calcificación, aterosclerosis, disección, oclusión.
espondilosis, espondilolistesis, hernia discal, protrusión, extrusión, osteofito, estenosis foraminal, fractura, subluxación.
rotura meniscal, ligamento cruzado, ligamento colateral, tendinopatía, bursitis, condromalacia.
subfrénico, periesplénico, perihepático, perirrenal, retroperitoneal, mesentérico, intraperitoneal.
TC, RM, ecografía, FLAIR, T1, T2, difusión, ADC, gadolinio, Hounsfield.
hipointenso, hiperintenso, hipoecoico, hiperecoico, anecoico, heterogéneo, homogéneo, diferenciación corticomedular.`;

const PROMPT_EN = `Radiology report. Medical dictation in English.
cholelithiasis, cholecystitis, choledocholithiasis, hepatomegaly, steatosis, cirrhosis, splenomegaly, hydronephrosis, nephrolithiasis, diverticulosis, diverticulitis, lymphadenopathy, appendicitis, ascites, pancreatitis.
atelectasis, consolidation, pleural effusion, pneumothorax, bronchiectasis, emphysema, pericardial effusion, cardiomegaly, pulmonary embolism, ground-glass opacity.
stenosis, thrombosis, aneurysm, calcification, atherosclerosis, dissection, occlusion.
spondylosis, spondylolisthesis, disc herniation, protrusion, extrusion, osteophyte, foraminal stenosis, fracture, subluxation.
meniscal tear, cruciate ligament, collateral ligament, tendinopathy, bursitis, chondromalacia.
subphrenic, perisplenic, perihepatic, perinephric, retroperitoneal, mesenteric, intraperitoneal.
CT, MRI, ultrasound, FLAIR, T1-weighted, T2-weighted, diffusion-weighted, ADC, gadolinium, Hounsfield units.
hypointense, hyperintense, hypoechoic, hyperechoic, anechoic, heterogeneous, homogeneous, corticomedullary differentiation.`;

const PROMPT_PT = `Relatório de radiologia. Ditado médico em português.
colelitíase, colecistite, coledocolitíase, hepatomegalia, esteatose, cirrose, esplenomegalia, hidronefrose, nefrolitíase, diverticulose, diverticulite, linfadenopatia, apendicite, ascite, pancreatite.
atelectasia, consolidação, derrame pleural, pneumotórax, bronquiectasias, enfisema, derrame pericárdico, cardiomegalia, tromboembolismo pulmonar.
estenose, trombose, aneurisma, calcificação, aterosclerose, dissecção, oclusão.
espondilose, espondilolistese, hérnia discal, protrusão, extrusão, osteófito, estenose foraminal, fratura, subluxação.
rotura meniscal, ligamento cruzado, ligamento colateral, tendinopatia, bursite, condromalácia.
subfrénico, periesplénico, peri-hepático, perirrenal, retroperitoneal, mesentérico, intraperitoneal.
TC, RM, ecografia, FLAIR, T1, T2, difusão, ADC, gadolínio, Hounsfield.
hipointenso, hiperintenso, hipoecóico, hiperecóico, anecóico, heterogéneo, homogéneo, diferenciação corticomedular.`;

const PROMPTS: Record<string, string> = {
  es: PROMPT_ES,
  en: PROMPT_EN,
  pt: PROMPT_PT,
};

export function getWhisperPrompt(language: string): string {
  return PROMPTS[language] || PROMPTS["es"];
}
