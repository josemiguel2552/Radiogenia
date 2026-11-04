/**
 * The question bank for the review game.
 *
 * Every question is answerable from a cheat sheet this app already ships —
 * BI-RADS, Fleischner, Lung-RADS, Bosniak, PI-RADS, TI-RADS, LI-RADS,
 * O-RADS, the Fardon disc nomenclature, Schizas, Lee/Wildermuth, the marrow
 * Dixon check, adrenal washout. That is the point: a wrong answer sends the
 * player to a sheet that is one tab away, and the two never disagree because
 * the sheet is where the question came from.
 *
 * It is a plain data module, not i18n strings, for two reasons. It is only
 * imported by the game view, which is code-split, so nobody who never opens
 * the game downloads a word of it. And a question is not a label: its four
 * options and its source have to travel together or the thing stops being
 * checkable.
 *
 * The distractors are deliberately the neighbouring category rather than
 * something absurd. "BI-RADS 4A vs 4B" is the mistake a radiologist actually
 * makes; "BI-RADS 4B vs a dog" teaches nothing.
 */

export type QuizLang = "es" | "en" | "pt";

export interface QuizOption {
  correct: boolean;
  t: Record<QuizLang, string>;
}

export interface QuizQuestion {
  id: string;
  /** Which classification it comes from, for the topic filter and the stats. */
  topic: string;
  /** Shown after answering, so a miss turns into a reference rather than a buzz. */
  source: string;
  q: Record<QuizLang, string>;
  options: QuizOption[];
}

export const QUESTIONS: QuizQuestion[] = [
  {
    id: "birads_3_rate",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "¿Qué probabilidad de malignidad define a un BI-RADS 3?", en: "What likelihood of malignancy defines BI-RADS 3?", pt: "Que probabilidade de malignidade define um BI-RADS 3?" },
    options: [
      { correct: true, t: { es: "> 0% y ≤ 2%", en: "> 0% and ≤ 2%", pt: "> 0% e ≤ 2%" } },
      { correct: false, t: { es: "0%", en: "0%", pt: "0%" } },
      { correct: false, t: { es: "> 2% y ≤ 10%", en: "> 2% and ≤ 10%", pt: "> 2% e ≤ 10%" } },
      { correct: false, t: { es: "> 10% y ≤ 50%", en: "> 10% and ≤ 50%", pt: "> 10% e ≤ 50%" } },
    ],
  },
  {
    id: "birads_3_mgmt",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "¿Cuál es el manejo de un BI-RADS 3?", en: "What is the management of a BI-RADS 3?", pt: "Qual é o manejo de um BI-RADS 3?" },
    options: [
      { correct: true, t: { es: "Seguimiento a 6, 12 y 24 meses", en: "Follow-up at 6, 12 and 24 months", pt: "Seguimento aos 6, 12 e 24 meses" } },
      { correct: false, t: { es: "Biopsia percutánea", en: "Percutaneous biopsy", pt: "Biópsia percutânea" } },
      { correct: false, t: { es: "Cribado habitual según edad", en: "Routine screening by age", pt: "Rastreio habitual conforme a idade" } },
      { correct: false, t: { es: "Imagen adicional antes de categorizar", en: "Additional imaging before categorising", pt: "Imagem adicional antes de categorizar" } },
    ],
  },
  {
    id: "birads_4b",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "Una lesión con sospecha moderada (> 10% a ≤ 50%) es…", en: "A lesion of moderate suspicion (> 10% to ≤ 50%) is…", pt: "Uma lesão com suspeita moderada (> 10% a ≤ 50%) é…" },
    options: [
      { correct: true, t: { es: "BI-RADS 4B", en: "BI-RADS 4B", pt: "BI-RADS 4B" } },
      { correct: false, t: { es: "BI-RADS 4A", en: "BI-RADS 4A", pt: "BI-RADS 4A" } },
      { correct: false, t: { es: "BI-RADS 4C", en: "BI-RADS 4C", pt: "BI-RADS 4C" } },
      { correct: false, t: { es: "BI-RADS 5", en: "BI-RADS 5", pt: "BI-RADS 5" } },
    ],
  },
  {
    id: "birads_0",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "¿Qué significa la categoría BI-RADS 0?", en: "What does BI-RADS category 0 mean?", pt: "O que significa a categoria BI-RADS 0?" },
    options: [
      { correct: true, t: { es: "Incompleto: falta imagen adicional o comparación con previos", en: "Incomplete: needs more imaging or comparison with priors", pt: "Incompleto: falta imagem adicional ou comparação com prévios" } },
      { correct: false, t: { es: "Sin hallazgos", en: "No findings", pt: "Sem achados" } },
      { correct: false, t: { es: "Malignidad ya probada por biopsia", en: "Malignancy already proven by biopsy", pt: "Malignidade já comprovada por biópsia" } },
      { correct: false, t: { es: "Altamente sospechoso de malignidad", en: "Highly suggestive of malignancy", pt: "Altamente suspeito de malignidade" } },
    ],
  },
  {
    id: "birads_6",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "¿Cuándo se asigna un BI-RADS 6?", en: "When is BI-RADS 6 assigned?", pt: "Quando se atribui um BI-RADS 6?" },
    options: [
      { correct: true, t: { es: "Malignidad confirmada por biopsia, antes del tratamiento definitivo", en: "Biopsy-proven malignancy, before definitive treatment", pt: "Malignidade comprovada por biópsia, antes do tratamento definitivo" } },
      { correct: false, t: { es: "Sospecha ≥ 95% sin biopsia", en: "≥ 95% suspicion without biopsy", pt: "Suspeita ≥ 95% sem biópsia" } },
      { correct: false, t: { es: "Hallazgo probablemente benigno", en: "Probably benign finding", pt: "Achado provavelmente benigno" } },
      { correct: false, t: { es: "Recidiva tras cirugía", en: "Recurrence after surgery", pt: "Recidiva após cirurgia" } },
    ],
  },
  {
    id: "birads_density",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "En v2025, la densidad mamaria se informa sobre todo porque…", en: "In v2025, breast density is reported mainly because…", pt: "Na v2025, a densidade mamária é reportada sobretudo porque…" },
    options: [
      { correct: true, t: { es: "Puede enmascarar lesiones en la mamografía", en: "It can mask lesions on mammography", pt: "Pode mascarar lesões na mamografia" } },
      { correct: false, t: { es: "Determina la categoría BI-RADS final", en: "It sets the final BI-RADS category", pt: "Determina a categoria BI-RADS final" } },
      { correct: false, t: { es: "Obliga a hacer resonancia", en: "It mandates MRI", pt: "Obriga a fazer ressonância" } },
      { correct: false, t: { es: "Sustituye a la ecografía", en: "It replaces ultrasound", pt: "Substitui a ecografia" } },
    ],
  },
  {
    id: "birads_calc",
    topic: "birads",
    source: "ACR BI-RADS® Manual v2025",
    q: { es: "¿Cuál de estas morfologías de calcificación es la MÁS sospechosa?", en: "Which calcification morphology is the MOST suspicious?", pt: "Qual destas morfologias de calcificação é a MAIS suspeita?" },
    options: [
      { correct: true, t: { es: "Lineales finas / lineales ramificadas", en: "Fine linear / fine-linear branching", pt: "Lineares finas / lineares ramificadas" } },
      { correct: false, t: { es: "Cutáneas", en: "Skin", pt: "Cutâneas" } },
      { correct: false, t: { es: "En palomitas de maíz", en: "Popcorn-like", pt: "Em pipoca" } },
      { correct: false, t: { es: "Vasculares", en: "Vascular", pt: "Vasculares" } },
    ],
  },
  {
    id: "fleischner_small",
    topic: "fleischner",
    source: "Fleischner Society 2017 (MacMahon et al., Radiology 2017)",
    q: { es: "Nódulo sólido único < 6 mm en paciente de BAJO riesgo. ¿Qué recomienda Fleischner 2017?", en: "Single solid nodule < 6 mm in a LOW-risk patient. What does Fleischner 2017 recommend?", pt: "Nódulo sólido único < 6 mm em doente de BAIXO risco. O que recomenda Fleischner 2017?" },
    options: [
      { correct: true, t: { es: "No precisa seguimiento rutinario", en: "No routine follow-up", pt: "Não precisa de seguimento de rotina" } },
      { correct: false, t: { es: "TC a los 3 meses", en: "CT at 3 months", pt: "TC aos 3 meses" } },
      { correct: false, t: { es: "TC a los 6-12 meses", en: "CT at 6-12 months", pt: "TC aos 6-12 meses" } },
      { correct: false, t: { es: "PET/TC o biopsia", en: "PET/CT or biopsy", pt: "PET/TC ou biópsia" } },
    ],
  },
  {
    id: "fleischner_mid",
    topic: "fleischner",
    source: "Fleischner Society 2017 (MacMahon et al., Radiology 2017)",
    q: { es: "Nódulo sólido único de 7 mm, riesgo bajo. ¿Seguimiento?", en: "Single solid nodule of 7 mm, low risk. Follow-up?", pt: "Nódulo sólido único de 7 mm, baixo risco. Seguimento?" },
    options: [
      { correct: true, t: { es: "TC a los 6-12 meses", en: "CT at 6-12 months", pt: "TC aos 6-12 meses" } },
      { correct: false, t: { es: "Ninguno", en: "None", pt: "Nenhum" } },
      { correct: false, t: { es: "TC a los 3 meses", en: "CT at 3 months", pt: "TC aos 3 meses" } },
      { correct: false, t: { es: "Biopsia inmediata", en: "Immediate biopsy", pt: "Biópsia imediata" } },
    ],
  },
  {
    id: "lungrads_4a",
    topic: "lungrads",
    source: "ACR Lung-RADS v2022",
    q: { es: "¿Qué manejo corresponde a un Lung-RADS 4A?", en: "What management corresponds to Lung-RADS 4A?", pt: "Que manejo corresponde a um Lung-RADS 4A?" },
    options: [
      { correct: true, t: { es: "TC de baja dosis a los 3 meses", en: "Low-dose CT at 3 months", pt: "TC de baixa dose aos 3 meses" } },
      { correct: false, t: { es: "Cribado anual", en: "Annual screening", pt: "Rastreio anual" } },
      { correct: false, t: { es: "TC a los 6 meses", en: "CT at 6 months", pt: "TC aos 6 meses" } },
      { correct: false, t: { es: "Biopsia o resección inmediata", en: "Immediate biopsy or resection", pt: "Biópsia ou resseção imediata" } },
    ],
  },
  {
    id: "lungrads_3",
    topic: "lungrads",
    source: "ACR Lung-RADS v2022",
    q: { es: "Lung-RADS 3 (probablemente benigno) implica un seguimiento con TC a…", en: "Lung-RADS 3 (probably benign) means follow-up CT at…", pt: "Lung-RADS 3 (provavelmente benigno) implica seguimento com TC aos…" },
    options: [
      { correct: true, t: { es: "6 meses", en: "6 months", pt: "6 meses" } },
      { correct: false, t: { es: "3 meses", en: "3 months", pt: "3 meses" } },
      { correct: false, t: { es: "12 meses", en: "12 months", pt: "12 meses" } },
      { correct: false, t: { es: "24 meses", en: "24 months", pt: "24 meses" } },
    ],
  },
  {
    id: "bosniak_iif",
    topic: "bosniak",
    source: "Bosniak 2019 (Silverman et al., Radiology 2019)",
    q: { es: "¿Qué categoría de Bosniak 2019 requiere seguimiento en lugar de cirugía o alta?", en: "Which Bosniak 2019 category needs follow-up rather than surgery or discharge?", pt: "Que categoria de Bosniak 2019 requer seguimento em vez de cirurgia ou alta?" },
    options: [
      { correct: true, t: { es: "IIF", en: "IIF", pt: "IIF" } },
      { correct: false, t: { es: "II", en: "II", pt: "II" } },
      { correct: false, t: { es: "III", en: "III", pt: "III" } },
      { correct: false, t: { es: "IV", en: "IV", pt: "IV" } },
    ],
  },
  {
    id: "bosniak_iii",
    topic: "bosniak",
    source: "Bosniak 2019 (Silverman et al., Radiology 2019)",
    q: { es: "La probabilidad de malignidad de un Bosniak III se sitúa en torno a…", en: "The likelihood of malignancy of a Bosniak III is around…", pt: "A probabilidade de malignidade de um Bosniak III situa-se em torno de…" },
    options: [
      { correct: true, t: { es: "50%", en: "50%", pt: "50%" } },
      { correct: false, t: { es: "0%", en: "0%", pt: "0%" } },
      { correct: false, t: { es: "5%", en: "5%", pt: "5%" } },
      { correct: false, t: { es: "90%", en: "90%", pt: "90%" } },
    ],
  },
  {
    id: "bosniak_iv",
    topic: "bosniak",
    source: "Bosniak 2019 (Silverman et al., Radiology 2019)",
    q: { es: "¿Qué define a un quiste Bosniak IV frente a un III?", en: "What defines a Bosniak IV cyst against a III?", pt: "O que define um quisto Bosniak IV face a um III?" },
    options: [
      { correct: true, t: { es: "Nódulo mural con realce", en: "An enhancing mural nodule", pt: "Nódulo mural com realce" } },
      { correct: false, t: { es: "Septos finos múltiples", en: "Multiple thin septa", pt: "Septos finos múltiplos" } },
      { correct: false, t: { es: "Calcificación gruesa", en: "Coarse calcification", pt: "Calcificação grosseira" } },
      { correct: false, t: { es: "Contenido hiperdenso homogéneo", en: "Homogeneous hyperdense content", pt: "Conteúdo hiperdenso homogéneo" } },
    ],
  },
  {
    id: "pirads_pz",
    topic: "pirads",
    source: "PI-RADS v2.1",
    q: { es: "En la zona periférica, ¿qué secuencia es dominante en PI-RADS v2.1?", en: "In the peripheral zone, which sequence is dominant in PI-RADS v2.1?", pt: "Na zona periférica, que sequência é dominante no PI-RADS v2.1?" },
    options: [
      { correct: true, t: { es: "Difusión (DWI/ADC)", en: "Diffusion (DWI/ADC)", pt: "Difusão (DWI/ADC)" } },
      { correct: false, t: { es: "T2", en: "T2", pt: "T2" } },
      { correct: false, t: { es: "Perfusión dinámica (DCE)", en: "Dynamic contrast (DCE)", pt: "Perfusão dinâmica (DCE)" } },
      { correct: false, t: { es: "Espectroscopia", en: "Spectroscopy", pt: "Espetroscopia" } },
    ],
  },
  {
    id: "pirads_tz",
    topic: "pirads",
    source: "PI-RADS v2.1",
    q: { es: "En la zona transicional, la secuencia dominante es…", en: "In the transition zone, the dominant sequence is…", pt: "Na zona transicional, a sequência dominante é…" },
    options: [
      { correct: true, t: { es: "T2", en: "T2", pt: "T2" } },
      { correct: false, t: { es: "Difusión (DWI/ADC)", en: "Diffusion (DWI/ADC)", pt: "Difusão (DWI/ADC)" } },
      { correct: false, t: { es: "DCE", en: "DCE", pt: "DCE" } },
      { correct: false, t: { es: "T1 con contraste tardío", en: "Late contrast T1", pt: "T1 com contraste tardio" } },
    ],
  },
  {
    id: "pirads_dce",
    topic: "pirads",
    source: "PI-RADS v2.1",
    q: { es: "Un PI-RADS 3 en zona periférica con DCE positivo pasa a…", en: "A PI-RADS 3 in the peripheral zone with positive DCE becomes…", pt: "Um PI-RADS 3 na zona periférica com DCE positivo passa a…" },
    options: [
      { correct: true, t: { es: "PI-RADS 4", en: "PI-RADS 4", pt: "PI-RADS 4" } },
      { correct: false, t: { es: "Se mantiene en 3", en: "Stays at 3", pt: "Mantém-se em 3" } },
      { correct: false, t: { es: "PI-RADS 5", en: "PI-RADS 5", pt: "PI-RADS 5" } },
      { correct: false, t: { es: "PI-RADS 2", en: "PI-RADS 2", pt: "PI-RADS 2" } },
    ],
  },
  {
    id: "tirads_tr5",
    topic: "tirads",
    source: "ACR TI-RADS (Tessler et al., JACR 2017)",
    q: { es: "¿A partir de cuántos puntos un nódulo tiroideo es ACR TI-RADS 5?", en: "From how many points is a thyroid nodule ACR TI-RADS 5?", pt: "A partir de quantos pontos um nódulo tiroideu é ACR TI-RADS 5?" },
    options: [
      { correct: true, t: { es: "7 puntos o más", en: "7 points or more", pt: "7 pontos ou mais" } },
      { correct: false, t: { es: "3 puntos", en: "3 points", pt: "3 pontos" } },
      { correct: false, t: { es: "4 a 6 puntos", en: "4 to 6 points", pt: "4 a 6 pontos" } },
      { correct: false, t: { es: "10 puntos", en: "10 points", pt: "10 pontos" } },
    ],
  },
  {
    id: "tirads_tall",
    topic: "tirads",
    source: "ACR TI-RADS (Tessler et al., JACR 2017)",
    q: { es: "¿Cuál de estos rasgos suma MÁS puntos en ACR TI-RADS?", en: "Which of these features scores the MOST points in ACR TI-RADS?", pt: "Qual destas características soma MAIS pontos no ACR TI-RADS?" },
    options: [
      { correct: true, t: { es: "Microcalcificaciones puntiformes", en: "Punctate echogenic foci", pt: "Microcalcificações puntiformes" } },
      { correct: false, t: { es: "Composición espongiforme", en: "Spongiform composition", pt: "Composição esponjiforme" } },
      { correct: false, t: { es: "Isoecogenicidad", en: "Isoechogenicity", pt: "Isoecogenicidade" } },
      { correct: false, t: { es: "Márgenes lisos", en: "Smooth margins", pt: "Margens lisas" } },
    ],
  },
  {
    id: "lirads_lr5",
    topic: "lirads",
    source: "ACR LI-RADS v2018",
    q: { es: "¿Qué categoría LI-RADS equivale a CHC definitivo?", en: "Which LI-RADS category equals definite HCC?", pt: "Que categoria LI-RADS equivale a CHC definitivo?" },
    options: [
      { correct: true, t: { es: "LR-5", en: "LR-5", pt: "LR-5" } },
      { correct: false, t: { es: "LR-4", en: "LR-4", pt: "LR-4" } },
      { correct: false, t: { es: "LR-M", en: "LR-M", pt: "LR-M" } },
      { correct: false, t: { es: "LR-TIV", en: "LR-TIV", pt: "LR-TIV" } },
    ],
  },
  {
    id: "lirads_aphe",
    topic: "lirads",
    source: "ACR LI-RADS v2018",
    q: { es: "¿Cuál es el rasgo mayor imprescindible para categorizar como LR-4 o LR-5?", en: "Which major feature is indispensable to categorise as LR-4 or LR-5?", pt: "Qual é a característica maior indispensável para categorizar como LR-4 ou LR-5?" },
    options: [
      { correct: true, t: { es: "Realce arterial no periférico (APHE)", en: "Non-rim arterial phase hyperenhancement (APHE)", pt: "Realce arterial não periférico (APHE)" } },
      { correct: false, t: { es: "Restricción a la difusión", en: "Diffusion restriction", pt: "Restrição à difusão" } },
      { correct: false, t: { es: "Hiperintensidad en T2", en: "T2 hyperintensity", pt: "Hiperintensidade em T2" } },
      { correct: false, t: { es: "Grasa intralesional", en: "Intralesional fat", pt: "Gordura intralesional" } },
    ],
  },
  {
    id: "lirads_tiv",
    topic: "lirads",
    source: "ACR LI-RADS v2018",
    q: { es: "Un trombo tumoral en vena porta con realce se categoriza como…", en: "An enhancing tumour thrombus in the portal vein is categorised as…", pt: "Um trombo tumoral na veia porta com realce categoriza-se como…" },
    options: [
      { correct: true, t: { es: "LR-TIV", en: "LR-TIV", pt: "LR-TIV" } },
      { correct: false, t: { es: "LR-5", en: "LR-5", pt: "LR-5" } },
      { correct: false, t: { es: "LR-M", en: "LR-M", pt: "LR-M" } },
      { correct: false, t: { es: "LR-3", en: "LR-3", pt: "LR-3" } },
    ],
  },
  {
    id: "spine_prot",
    topic: "spine",
    source: "Fardon et al., Spine J 2014",
    q: { es: "¿Qué distingue una PROTRUSIÓN de una extrusión?", en: "What distinguishes a PROTRUSION from an extrusion?", pt: "O que distingue uma PROTRUSÃO de uma extrusão?" },
    options: [
      { correct: true, t: { es: "La base es más ancha que la profundidad del material desplazado", en: "The base is wider than the depth of the displaced material", pt: "A base é mais larga que a profundidade do material deslocado" } },
      { correct: false, t: { es: "La base es más estrecha que la profundidad", en: "The base is narrower than the depth", pt: "A base é mais estreita que a profundidade" } },
      { correct: false, t: { es: "Supera el 50% de la circunferencia", en: "It exceeds 50% of the circumference", pt: "Ultrapassa 50% da circunferência" } },
      { correct: false, t: { es: "Pierde continuidad con el disco", en: "It loses continuity with the disc", pt: "Perde continuidade com o disco" } },
    ],
  },
  {
    id: "spine_bulge",
    topic: "spine",
    source: "Fardon et al., Spine J 2014",
    q: { es: "Material discal que sobrepasa el anillo en > 50% de la circunferencia es…", en: "Disc material extending beyond the ring over > 50% of the circumference is…", pt: "Material discal que ultrapassa o anel em > 50% da circunferência é…" },
    options: [
      { correct: true, t: { es: "Un bulging: NO es una hernia", en: "A bulge: NOT a herniation", pt: "Um bulging: NÃO é uma hérnia" } },
      { correct: false, t: { es: "Una protrusión de base ancha", en: "A broad-based protrusion", pt: "Uma protrusão de base larga" } },
      { correct: false, t: { es: "Una extrusión", en: "An extrusion", pt: "Uma extrusão" } },
      { correct: false, t: { es: "Una hernia focal", en: "A focal herniation", pt: "Uma hérnia focal" } },
    ],
  },
  {
    id: "spine_focal",
    topic: "spine",
    source: "Fardon et al., Spine J 2014",
    q: { es: "Una hernia FOCAL afecta a qué porcentaje de la circunferencia discal?", en: "A FOCAL herniation involves what percentage of the disc circumference?", pt: "Uma hérnia FOCAL afeta que percentagem da circunferência discal?" },
    options: [
      { correct: true, t: { es: "< 25%", en: "< 25%", pt: "< 25%" } },
      { correct: false, t: { es: "25-50%", en: "25-50%", pt: "25-50%" } },
      { correct: false, t: { es: "> 50%", en: "> 50%", pt: "> 50%" } },
      { correct: false, t: { es: "100%", en: "100%", pt: "100%" } },
    ],
  },
  {
    id: "spine_seq",
    topic: "spine",
    source: "Fardon et al., Spine J 2014",
    q: { es: "¿Qué define a un SECUESTRO discal?", en: "What defines a disc SEQUESTRATION?", pt: "O que define um SEQUESTRO discal?" },
    options: [
      { correct: true, t: { es: "Fragmento sin continuidad con el disco de origen", en: "A fragment with no continuity with the parent disc", pt: "Fragmento sem continuidade com o disco de origem" } },
      { correct: false, t: { es: "Fragmento desplazado en sentido craneal o caudal", en: "A fragment displaced cranially or caudally", pt: "Fragmento deslocado cranial ou caudalmente" } },
      { correct: false, t: { es: "Base más ancha que la profundidad", en: "Base wider than the depth", pt: "Base mais larga que a profundidade" } },
      { correct: false, t: { es: "Afectación de más del 50% del anillo", en: "Involvement of over 50% of the ring", pt: "Envolvimento de mais de 50% do anel" } },
    ],
  },
  {
    id: "spine_zone",
    topic: "spine",
    source: "Fardon et al., Spine J 2014",
    q: { es: "La zona FORAMINAL en el plano axial se define entre…", en: "The FORAMINAL zone on the axial plane is defined between…", pt: "A zona FORAMINAL no plano axial define-se entre…" },
    options: [
      { correct: true, t: { es: "Los bordes medial y lateral del pedículo", en: "The medial and lateral edges of the pedicle", pt: "As bordas medial e lateral do pedículo" } },
      { correct: false, t: { es: "Los bordes mediales de ambas carillas", en: "The medial edges of both facets", pt: "As bordas mediais de ambas as facetas" } },
      { correct: false, t: { es: "Lateral al borde lateral del pedículo", en: "Lateral to the lateral pedicle edge", pt: "Lateral à borda lateral do pedículo" } },
      { correct: false, t: { es: "Entre carilla y pedículo", en: "Between facet and pedicle", pt: "Entre faceta e pedículo" } },
    ],
  },
  {
    id: "schizas_d",
    topic: "schizas",
    source: "Schizas et al., Spine 2010",
    q: { es: "En la clasificación de Schizas, ¿qué separa un grado D de un grado C?", en: "In the Schizas classification, what separates grade D from grade C?", pt: "Na classificação de Schizas, o que separa um grau D de um grau C?" },
    options: [
      { correct: true, t: { es: "La ausencia de grasa epidural posterior", en: "The absence of posterior epidural fat", pt: "A ausência de gordura epidural posterior" } },
      { correct: false, t: { es: "La ausencia de LCR visible", en: "The absence of visible CSF", pt: "A ausência de LCR visível" } },
      { correct: false, t: { es: "Que las raíces no se individualizan", en: "That rootlets are not separable", pt: "Que as raízes não se individualizam" } },
      { correct: false, t: { es: "El diámetro anteroposterior del canal", en: "The AP diameter of the canal", pt: "O diâmetro anteroposterior do canal" } },
    ],
  },
  {
    id: "schizas_b",
    topic: "schizas",
    source: "Schizas et al., Spine 2010",
    q: { es: "Schizas grado B: las raíces ocupan todo el saco pero…", en: "Schizas grade B: the rootlets fill the sac but…", pt: "Schizas grau B: as raízes ocupam todo o saco mas…" },
    options: [
      { correct: true, t: { es: "Todavía se ve LCR", en: "CSF is still visible", pt: "Ainda se vê LCR" } },
      { correct: false, t: { es: "No se ve nada de LCR", en: "No CSF at all is visible", pt: "Não se vê nada de LCR" } },
      { correct: false, t: { es: "Falta la grasa epidural", en: "The epidural fat is gone", pt: "Falta a gordura epidural" } },
      { correct: false, t: { es: "Las raíces están en herradura dorsal", en: "The rootlets are in a dorsal horseshoe", pt: "As raízes estão em ferradura dorsal" } },
    ],
  },
  {
    id: "foraminal_3",
    topic: "foraminal",
    source: "Lee CK et al., Spine 1988 / Wildermuth et al., Radiology 1998",
    q: { es: "¿Qué define al grado 3 de estenosis foraminal?", en: "What defines grade 3 foraminal stenosis?", pt: "O que define o grau 3 de estenose foraminal?" },
    options: [
      { correct: true, t: { es: "Colapso o cambio morfológico de la raíz", en: "Root collapse or morphological change", pt: "Colapso ou alteração morfológica da raiz" } },
      { correct: false, t: { es: "Obliteración de la grasa en 2 direcciones opuestas", en: "Fat obliterated in 2 opposing directions", pt: "Obliteração da gordura em 2 direções opostas" } },
      { correct: false, t: { es: "Obliteración de la grasa en las 4 direcciones", en: "Fat obliterated in all 4 directions", pt: "Obliteração da gordura nas 4 direções" } },
      { correct: false, t: { es: "Grasa perineural conservada", en: "Preserved perineural fat", pt: "Gordura perineural preservada" } },
    ],
  },
  {
    id: "foraminal_2",
    topic: "foraminal",
    source: "Lee CK et al., Spine 1988 / Wildermuth et al., Radiology 1998",
    q: { es: "Grado 2 de estenosis foraminal: obliteración de la grasa…", en: "Grade 2 foraminal stenosis: fat obliterated…", pt: "Grau 2 de estenose foraminal: obliteração da gordura…" },
    options: [
      { correct: true, t: { es: "En las 4 direcciones, sin cambio morfológico de la raíz", en: "In all 4 directions, with no morphological change of the root", pt: "Nas 4 direções, sem alteração morfológica da raiz" } },
      { correct: false, t: { es: "En 2 direcciones opuestas", en: "In 2 opposing directions", pt: "Em 2 direções opostas" } },
      { correct: false, t: { es: "Solo en sentido vertical", en: "Vertically only", pt: "Apenas em sentido vertical" } },
      { correct: false, t: { es: "Con colapso de la raíz", en: "With root collapse", pt: "Com colapso da raiz" } },
    ],
  },
  {
    id: "dixon_drop",
    topic: "marrow",
    source: "Lecouvet et al., European Radiology 2026",
    q: { es: "En el chequeo Dixon de médula ósea, ¿qué caída de señal apoya grasa microscópica conservada?", en: "In the marrow Dixon check, what signal drop supports preserved microscopic fat?", pt: "No teste Dixon da medula óssea, que queda de sinal apoia gordura microscópica preservada?" },
    options: [
      { correct: true, t: { es: "≥ 20%", en: "≥ 20%", pt: "≥ 20%" } },
      { correct: false, t: { es: "≥ 5%", en: "≥ 5%", pt: "≥ 5%" } },
      { correct: false, t: { es: "≥ 50%", en: "≥ 50%", pt: "≥ 50%" } },
      { correct: false, t: { es: "Cualquier caída, por mínima que sea", en: "Any drop, however small", pt: "Qualquer queda, por mínima que seja" } },
    ],
  },
  {
    id: "dixon_nodrop",
    topic: "marrow",
    source: "Lecouvet et al., European Radiology 2026",
    q: { es: "Caída de señal mínima o ausente entre fase y fase opuesta sugiere…", en: "Minimal or absent signal drop between in- and opposed-phase suggests…", pt: "Queda de sinal mínima ou ausente entre fase e fase oposta sugere…" },
    options: [
      { correct: true, t: { es: "Pérdida de grasa microscópica: sospecha de sustitución medular", en: "Loss of microscopic fat: suspicion of marrow replacement", pt: "Perda de gordura microscópica: suspeita de substituição medular" } },
      { correct: false, t: { es: "Médula roja normal", en: "Normal red marrow", pt: "Medula vermelha normal" } },
      { correct: false, t: { es: "Reconversión medular", en: "Marrow reconversion", pt: "Reconversão medular" } },
      { correct: false, t: { es: "Artefacto de desplazamiento químico", en: "Chemical shift artefact", pt: "Artefacto de desvio químico" } },
    ],
  },
  {
    id: "marrow_t1",
    topic: "marrow",
    source: "Saifuddin et al., BJR 2023",
    q: { es: "En T1, la médula roja normal es típicamente…", en: "On T1, normal red marrow is typically…", pt: "Em T1, a medula vermelha normal é tipicamente…" },
    options: [
      { correct: true, t: { es: "Más oscura que la grasa pero MÁS BRILLANTE que el músculo", en: "Darker than fat but BRIGHTER than muscle", pt: "Mais escura que a gordura mas MAIS BRILHANTE que o músculo" } },
      { correct: false, t: { es: "Más oscura que el músculo", en: "Darker than muscle", pt: "Mais escura que o músculo" } },
      { correct: false, t: { es: "Igual de brillante que la grasa", en: "As bright as fat", pt: "Tão brilhante como a gordura" } },
      { correct: false, t: { es: "Isointensa al disco intervertebral", en: "Isointense to the disc", pt: "Isointensa ao disco intervertebral" } },
    ],
  },
  {
    id: "marrow_cause",
    topic: "marrow",
    source: "Saifuddin et al., BJR 2023",
    q: { es: "¿Cuál de estas NO es una causa típica de reconversión medular?", en: "Which of these is NOT a typical cause of marrow reconversion?", pt: "Qual destas NÃO é uma causa típica de reconversão medular?" },
    options: [
      { correct: true, t: { es: "Tratamiento con bifosfonatos", en: "Bisphosphonate treatment", pt: "Tratamento com bifosfonatos" } },
      { correct: false, t: { es: "Anemia", en: "Anaemia", pt: "Anemia" } },
      { correct: false, t: { es: "G-CSF", en: "G-CSF", pt: "G-CSF" } },
      { correct: false, t: { es: "Tabaquismo o deporte de resistencia", en: "Smoking or endurance activity", pt: "Tabagismo ou desporto de resistência" } },
    ],
  },
  {
    id: "adrenal_abs",
    topic: "adrenal",
    source: "ACR Incidental Findings Committee 2017",
    q: { es: "¿Qué lavado absoluto define a un adenoma suprarrenal?", en: "What absolute washout defines an adrenal adenoma?", pt: "Que lavagem absoluta define um adenoma suprarrenal?" },
    options: [
      { correct: true, t: { es: "≥ 60%", en: "≥ 60%", pt: "≥ 60%" } },
      { correct: false, t: { es: "≥ 40%", en: "≥ 40%", pt: "≥ 40%" } },
      { correct: false, t: { es: "≥ 80%", en: "≥ 80%", pt: "≥ 80%" } },
      { correct: false, t: { es: "≥ 20%", en: "≥ 20%", pt: "≥ 20%" } },
    ],
  },
  {
    id: "adrenal_hu",
    topic: "adrenal",
    source: "ACR Incidental Findings Committee 2017",
    q: { es: "Una lesión suprarrenal con densidad sin contraste < 10 UH es…", en: "An adrenal lesion with unenhanced density < 10 HU is…", pt: "Uma lesão suprarrenal com densidade sem contraste < 10 UH é…" },
    options: [
      { correct: true, t: { es: "Un adenoma rico en lípidos", en: "A lipid-rich adenoma", pt: "Um adenoma rico em lípidos" } },
      { correct: false, t: { es: "Un feocromocitoma", en: "A phaeochromocytoma", pt: "Um feocromocitoma" } },
      { correct: false, t: { es: "Una metástasis", en: "A metastasis", pt: "Uma metástase" } },
      { correct: false, t: { es: "Un carcinoma suprarrenal", en: "An adrenal carcinoma", pt: "Um carcinoma suprarrenal" } },
    ],
  },
  {
    id: "adrenal_rel",
    topic: "adrenal",
    source: "ACR Incidental Findings Committee 2017",
    q: { es: "El lavado RELATIVO que apoya adenoma es de al menos…", en: "The RELATIVE washout supporting adenoma is at least…", pt: "A lavagem RELATIVA que apoia adenoma é de pelo menos…" },
    options: [
      { correct: true, t: { es: "40%", en: "40%", pt: "40%" } },
      { correct: false, t: { es: "60%", en: "60%", pt: "60%" } },
      { correct: false, t: { es: "20%", en: "20%", pt: "20%" } },
      { correct: false, t: { es: "80%", en: "80%", pt: "80%" } },
    ],
  },
  {
    id: "aspects_regions",
    topic: "aspects",
    source: "ASPECTS (Barber et al., Lancet 2000)",
    q: { es: "¿Sobre cuántas regiones se puntúa el ASPECTS?", en: "Over how many regions is ASPECTS scored?", pt: "Sobre quantas regiões se pontua o ASPECTS?" },
    options: [
      { correct: true, t: { es: "10", en: "10", pt: "10" } },
      { correct: false, t: { es: "7", en: "7", pt: "7" } },
      { correct: false, t: { es: "12", en: "12", pt: "12" } },
      { correct: false, t: { es: "5", en: "5", pt: "5" } },
    ],
  },
  {
    id: "nascet",
    topic: "carotid",
    source: "NASCET (N Engl J Med 1991)",
    q: { es: "Según NASCET, una estenosis carotídea es SEVERA a partir de…", en: "By NASCET, a carotid stenosis is SEVERE from…", pt: "Segundo NASCET, uma estenose carotídea é GRAVE a partir de…" },
    options: [
      { correct: true, t: { es: "70%", en: "70%", pt: "70%" } },
      { correct: false, t: { es: "50%", en: "50%", pt: "50%" } },
      { correct: false, t: { es: "30%", en: "30%", pt: "30%" } },
      { correct: false, t: { es: "90%", en: "90%", pt: "90%" } },
    ],
  },
  {
    id: "aaa_threshold",
    topic: "aorta",
    source: "ACR / ESVS",
    q: { es: "El umbral habitual de reparación de un aneurisma de aorta abdominal en varones es…", en: "The usual repair threshold for an abdominal aortic aneurysm in men is…", pt: "O limiar habitual de reparação de um aneurisma da aorta abdominal em homens é…" },
    options: [
      { correct: true, t: { es: "5,5 cm", en: "5.5 cm", pt: "5,5 cm" } },
      { correct: false, t: { es: "4,0 cm", en: "4.0 cm", pt: "4,0 cm" } },
      { correct: false, t: { es: "6,5 cm", en: "6.5 cm", pt: "6,5 cm" } },
      { correct: false, t: { es: "3,0 cm", en: "3.0 cm", pt: "3,0 cm" } },
    ],
  },
  {
    id: "dissection_a",
    topic: "aorta",
    source: "Stanford / DeBakey classification",
    q: { es: "Una disección aórtica que afecta a la aorta ascendente es…", en: "An aortic dissection involving the ascending aorta is…", pt: "Uma disseção aórtica que envolve a aorta ascendente é…" },
    options: [
      { correct: true, t: { es: "Stanford A: cirugía urgente", en: "Stanford A: urgent surgery", pt: "Stanford A: cirurgia urgente" } },
      { correct: false, t: { es: "Stanford B: manejo médico", en: "Stanford B: medical management", pt: "Stanford B: manejo médico" } },
      { correct: false, t: { es: "DeBakey III", en: "DeBakey III", pt: "DeBakey III" } },
      { correct: false, t: { es: "Siempre manejo conservador", en: "Always conservative", pt: "Sempre manejo conservador" } },
    ],
  },
  {
    id: "orads_1",
    topic: "orads",
    source: "ACR O-RADS MRI 2022",
    q: { es: "En O-RADS, ¿qué categoría corresponde a un ovario normal premenopáusico?", en: "In O-RADS, which category is a normal premenopausal ovary?", pt: "No O-RADS, que categoria corresponde a um ovário normal pré-menopáusico?" },
    options: [
      { correct: true, t: { es: "O-RADS 1", en: "O-RADS 1", pt: "O-RADS 1" } },
      { correct: false, t: { es: "O-RADS 0", en: "O-RADS 0", pt: "O-RADS 0" } },
      { correct: false, t: { es: "O-RADS 2", en: "O-RADS 2", pt: "O-RADS 2" } },
      { correct: false, t: { es: "O-RADS 3", en: "O-RADS 3", pt: "O-RADS 3" } },
    ],
  },
];

/** Every topic present in the bank, in the order it first appears. */
export const TOPICS: string[] = [...new Set(QUESTIONS.map((q) => q.topic))];

/**
 * A shuffled run of questions.
 *
 * Fisher-Yates over a copy: shuffling in place would reorder the exported
 * bank for everything else in the session, and `sort(() => Math.random() - 0.5)`
 * is not a shuffle — it leaves the first items far likelier to stay put.
 */
export function shuffled<T>(items: readonly T[], rnd: () => number = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A run of questions, optionally narrowed to some topics. */
export function buildRun(topics?: string[], rnd: () => number = Math.random): QuizQuestion[] {
  const pool = topics && topics.length > 0
    ? QUESTIONS.filter((q) => topics.includes(q.topic))
    : QUESTIONS;
  return shuffled(pool, rnd);
}
