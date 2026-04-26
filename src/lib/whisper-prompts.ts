/**
 * Rich domain-specific prompts for Whisper.
 * Whisper uses the `prompt` parameter as conditioning text — including
 * real vocabulary dramatically improves recognition of technical terms.
 */

const PROMPT_ES = `Informe de radiología. Dictado médico con terminología radiológica.

Hígado de tamaño normal, ecoestructura homogénea, sin lesiones focales. Vesícula biliar normodistendida, de paredes finas, sin litiasis. Vía biliar no dilatada. Páncreas de morfología normal, sin alteraciones. Bazo homogéneo, de tamaño normal. Riñones de tamaño y morfología normales, con buena diferenciación corticomedular, sin ectasia piélica ni litiasis. Aorta abdominal de calibre normal. No se observa líquido libre intraperitoneal.

Parénquima pulmonar sin consolidaciones ni infiltrados. No se observan nódulos pulmonares. Mediastino sin adenopatías significativas. Silueta cardíaca de tamaño normal. No hay derrame pleural ni pericárdico. Estructuras vasculares de calibre normal. Tráquea y bronquios principales permeables.

Cerebro de morfología normal. Sistema ventricular de tamaño y configuración normales. No se observan lesiones intra ni extraaxiales. Estructuras de la línea media centradas. Fosa posterior sin alteraciones. Senos paranasales y celdillas mastoideas neumatizados.

Columna vertebral con altura y señal de los cuerpos vertebrales conservadas. Discos intervertebrales sin protrusiones significativas. Canal raquídeo de amplitud normal. Médula espinal de señal normal.

Articulación de morfología conservada. Superficies articulares congruentes. Ligamentos íntegros. Meniscos de morfología y señal normales. No se observa derrame articular significativo.

TC, RM, RX, ecografía, mamografía, densitometría, PET-TC, angio-TC, angio-RM, TCMD. Axial, coronal, sagital, T1, T2, FLAIR, difusión, ADC, contraste intravenoso, gadolinio, secuencias potenciadas. Hipointenso, hiperintenso, isointenso, hipoecoico, hiperecoico, anecoico. Milímetros, centímetros, Hounsfield.`;

const PROMPT_EN = `Radiology report. Medical dictation with radiological terminology.

Liver is normal in size with homogeneous echotexture, no focal lesions identified. Gallbladder is normally distended with thin walls, no cholelithiasis. Common bile duct is not dilated. Pancreas is normal in morphology without abnormality. Spleen is homogeneous and normal in size. Kidneys are normal in size and morphology with good corticomedullary differentiation, no hydronephrosis or nephrolithiasis. Abdominal aorta is normal in caliber. No free intraperitoneal fluid.

Lung parenchyma is clear without consolidation or infiltrates. No pulmonary nodules identified. Mediastinum without significant lymphadenopathy. Cardiac silhouette is normal in size. No pleural or pericardial effusion. Vascular structures are normal in caliber. Trachea and main bronchi are patent.

Brain is normal in morphology. Ventricular system is normal in size and configuration. No intra-axial or extra-axial lesions identified. Midline structures are central. Posterior fossa without abnormality. Paranasal sinuses and mastoid air cells are well pneumatized.

Vertebral column with preserved vertebral body height and signal. Intervertebral discs without significant protrusions. Spinal canal is normal in caliber. Spinal cord signal is normal.

Joint morphology is preserved. Articular surfaces are congruent. Ligaments are intact. Menisci are normal in morphology and signal. No significant joint effusion.

CT, MRI, radiograph, ultrasound, mammography, DEXA, PET-CT, CTA, MRA, MDCT. Axial, coronal, sagittal, T1-weighted, T2-weighted, FLAIR, diffusion, ADC, intravenous contrast, gadolinium. Hypointense, hyperintense, isointense, hypoechoic, hyperechoic, anechoic. Millimeters, centimeters, Hounsfield units.`;

const PROMPT_PT = `Relatório de radiologia. Ditado médico com terminologia radiológica.

Fígado de dimensões normais, ecoestrutura homogénea, sem lesões focais. Vesícula biliar normodistendida, paredes finas, sem litíase. Via biliar não dilatada. Pâncreas de morfologia normal. Baço homogéneo, de dimensões normais. Rins de dimensões e morfologia normais, boa diferenciação corticomedular, sem ectasia piélica nem litíase. Aorta abdominal de calibre normal. Sem líquido livre intraperitoneal.

TC, RM, RX, ecografia, mamografia, densitometria, PET-TC, angio-TC. Axial, coronal, sagital, T1, T2, FLAIR, difusão, ADC, contraste endovenoso, gadolínio. Hipointenso, hiperintenso, isointenso. Milímetros, centímetros, Hounsfield.`;

const PROMPTS: Record<string, string> = {
  es: PROMPT_ES,
  en: PROMPT_EN,
  pt: PROMPT_PT,
};

export function getWhisperPrompt(language: string): string {
  return PROMPTS[language] || PROMPTS["es"];
}
