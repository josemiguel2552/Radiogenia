/**
 * Domain-specific prompts for Whisper.
 *
 * Whisper uses the `prompt` parameter as conditioning text and truncates
 * to the LAST 224 tokens. These prompts are kept within ~180 tokens and
 * placed AFTER prior-transcript context on the server, so they always
 * fall within the surviving window.
 *
 * Focus: radiology report vocabulary that Whisper commonly mangles,
 * plus voice commands so Whisper transcribes them literally.
 */

const PROMPT_ES = `Dictado de informe radiológico en español. Comandos de voz: nueva línea, punto, coma, punto y aparte, punto y seguido, dos puntos, nueva línea, nuevo párrafo.
Se observa, se identifica, no se evidencia, sin hallazgos significativos, dentro de límites normales, sin alteraciones, sin cambios significativos respecto al estudio previo.
Parénquima pulmonar, parénquima hepático, parénquima renal, diferenciación corticomedular conservada.
Nódulo, masa, lesión focal, quiste, colección, engrosamiento, calcificación, realce, captación de contraste, restricción en difusión, hiperintenso en T2, hipointenso en T1, señal heterogénea.
Fase arterial, fase portal, fase venosa, fase tardía, contraste intravenoso, contraste oral.
Milímetros, centímetros, diámetro máximo, diámetro transverso, diámetro anteroposterior, diámetro craneocaudal, eje mayor, eje menor.
Atelectasia, consolidación, derrame pleural, neumotórax, bronquiectasias, enfisema, cardiomegalia, tromboembolismo pulmonar.
Espondilolistesis, hernia discal, protrusión, extrusión, osteofito, estenosis foraminal, estenosis del canal.
Adenopatía, adenopatías patológicas, ganglio linfático, conglomerado adenopático.
TC, RM, ecografía, FLAIR, difusión, ADC, gadolinio, Hounsfield.
Hipoecoico, hiperecoico, anecoico, homogéneo, heterogéneo, bien delimitado, mal delimitado, contornos lobulados, márgenes irregulares.`;

const PROMPT_EN = `Radiology report dictation in English. Voice commands: new line, period, comma, new paragraph, colon, next line.
No significant abnormality, within normal limits, unremarkable, stable compared to prior, no acute findings, unchanged from previous examination.
Lung parenchyma, hepatic parenchyma, renal parenchyma, preserved corticomedullary differentiation.
Nodule, mass, focal lesion, cyst, collection, thickening, calcification, enhancement, contrast uptake, diffusion restriction, T2 hyperintense, T1 hypointense, heterogeneous signal.
Arterial phase, portal venous phase, delayed phase, intravenous contrast, oral contrast.
Millimeters, centimeters, maximum diameter, transverse diameter, anteroposterior diameter, craniocaudal, long axis, short axis.
Atelectasis, consolidation, pleural effusion, pneumothorax, bronchiectasis, emphysema, cardiomegaly, pulmonary embolism, ground-glass opacity.
Spondylolisthesis, disc herniation, protrusion, extrusion, osteophyte, foraminal stenosis, central canal stenosis.
Lymphadenopathy, pathological lymph nodes, conglomerate lymphadenopathy.
CT, MRI, ultrasound, FLAIR, diffusion-weighted, ADC, gadolinium, Hounsfield units.
Hypoechoic, hyperechoic, anechoic, homogeneous, heterogeneous, well-circumscribed, ill-defined, lobulated contours, irregular margins.`;

const PROMPT_PT = `Ditado de relatório radiológico em português. Comandos de voz: nova linha, ponto, vírgula, novo parágrafo, dois pontos.
Sem alterações significativas, dentro dos limites normais, sem achados significativos, estável em comparação com exame prévio.
Parênquima pulmonar, parênquima hepático, parênquima renal, diferenciação corticomedular preservada.
Nódulo, massa, lesão focal, cisto, coleção, espessamento, calcificação, realce, captação de contraste, restrição à difusão.
Fase arterial, fase portal, fase tardia, contraste intravenoso, contraste oral.
Milímetros, centímetros, diâmetro máximo, diâmetro transverso, diâmetro anteroposterior, eixo maior, eixo menor.
Atelectasia, consolidação, derrame pleural, pneumotórax, bronquiectasias, enfisema, cardiomegalia, tromboembolismo pulmonar.
Espondilolistese, hérnia discal, protrusão, extrusão, osteófito, estenose foraminal.
Linfadenopatia, linfonodos patológicos, conglomerado linfonodal.
TC, RM, ecografia, FLAIR, difusão, ADC, gadolínio, Hounsfield.
Hipoecóico, hiperecóico, anecóico, homogéneo, heterogéneo, bem delimitado, mal delimitado, contornos lobulados, margens irregulares.`;

const PROMPTS: Record<string, string> = {
  es: PROMPT_ES,
  en: PROMPT_EN,
  pt: PROMPT_PT,
};

export function getWhisperPrompt(language: string): string {
  return PROMPTS[language] || PROMPTS["es"];
}
