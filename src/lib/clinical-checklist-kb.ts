type Lang = "es" | "en" | "pt";

export const DEFAULT_CLINICAL_CHECKLIST_KB: Record<Lang, string> = {
  es: `# CHECKLIST CLÍNICO — HALLAZGOS ASOCIADOS FRECUENTEMENTE OMITIDOS

## TÓRAX

### Tromboembolismo pulmonar (TEP)
- Signos de sobrecarga de cavidades derechas: ratio VD/VI > 1, rectificación del septo interventricular, reflujo de contraste a venas suprahepáticas/VCI
- Infarto pulmonar (consolidación periférica en cuña)
- Derrame pleural asociado
- Trombosis venosa profunda concomitante (si se incluyen cortes de MMII)
- Trombo en tránsito en cavidades derechas

### Disección aórtica
- Extensión: tipo Stanford A vs B
- Afectación de ramas: troncos supraaórticos, arterias renales, arteria mesentérica superior, arterias ilíacas
- Derrame pericárdico (riesgo de taponamiento en tipo A)
- Insuficiencia aórtica (tipo A)
- Malperfusión orgánica: renal, mesentérica, extremidades

### Masa pulmonar / Neoplasia pulmonar
- Adenopatías mediastínicas e hiliares (tamaño en eje corto)
- Invasión de estructuras mediastínicas (vasos, esófago, cuerpos vertebrales, pared torácica)
- Derrame pleural (descartar implantes pleurales)
- Nódulos pulmonares contralaterales
- Metástasis a distancia: hepáticas, suprarrenales, óseas (en campo de visión)
- Trombosis tumoral de venas pulmonares o VCS

### Neumotórax
- Signos de tensión: desplazamiento mediastínico contralateral, aplanamiento/inversión diafragmática
- Enfisema subcutáneo
- Tubo de drenaje (posición y complicaciones si presente)

### Neumonía / Infección pulmonar
- Derrame pleural paraneumónico / empiema
- Cavitación (absceso pulmonar)
- Adenopatías reactivas
- Afectación bilateral (patrón atípico vs típico)

## ABDOMEN

### Diverticulitis aguda
- Colecciones / abscesos pericolónicos o pélvicos
- Neumoperitoneo (perforación)
- Fístulas (colovesical, colovaginal)
- Obstrucción intestinal secundaria
- Pileflebitis (trombosis de vena mesentérica/portal)
- Engrosamiento de la fascia lateroconal

### Apendicitis aguda
- Signos de perforación: neumoperitoneo localizado, apendicolito extraluminal, colección periapendicular
- Absceso periapendicular
- Líquido libre pélvico / peritoneal
- Plastrón apendicular

### Obstrucción intestinal
- Punto de transición (localización exacta)
- Signos de isquemia: neumatosis intestinal, gas portal, engrosamiento de pared, ausencia de realce
- Asa cerrada (torsión del meso, signo del remolino)
- Hernia como causa (inguinal, femoral, interna, incisional)
- Causa tumoral vs adherencial vs herniaria

### Pancreatitis aguda
- Grado de necrosis pancreática (porcentaje)
- Colecciones peripancreáticas (localización y extensión)
- Complicaciones vasculares: trombosis de vena esplénica/portal/mesentérica, pseudoaneurisma
- Afectación de órganos vecinos
- Grado CTSI (CT Severity Index)

### Isquemia mesentérica
- Trombo en arteria/vena mesentérica superior
- Neumatosis intestinal
- Gas en sistema portal
- Ausencia de realce de la pared intestinal
- Líquido libre mesentérico

### Aneurisma de aorta abdominal
- Signos de rotura: hematoma retroperitoneal, signo de la media luna hipertensa (crescent sign), discontinuidad de la pared
- Extensión a arterias ilíacas
- Relación con arterias renales (infrarrenal vs yuxtarrenal vs suprarrenal)
- Trombo mural
- Compresión de estructuras adyacentes

### Traumatismo abdominal
- Lesión esplénica: grado AAST, hemoperitoneo, extravasación activa de contraste
- Lesión hepática: grado, lesión vascular asociada, hemobilia
- Lesión renal: grado, extravasación urinaria, lesión vascular
- Lesión pancreática: afectación del conducto pancreático
- Hemoperitoneo (cuantificación aproximada)
- Lesión de grandes vasos

## NEURO

### Hemorragia intracraneal (intraparenquimatosa)
- Desplazamiento de línea media (en mm)
- Herniación: subfalcina, uncal (transtentorial), amigdalar, transtentorial ascendente
- Hidrocefalia obstructiva
- Extensión intraventricular (hemoventrículo)
- Edema perilesional
- Malformación vascular subyacente (si patrón atípico)

### Hemorragia subaracnoidea (HSA)
- Aneurisma como causa (localización, tamaño)
- Hidrocefalia aguda
- Vasoespasmo (si angio-TC)
- Extensión intraventricular
- Herniación
- Escala Fisher modificada

### Ictus isquémico agudo
- Oclusión vascular: localización exacta (M1, M2, carótida interna, basilar)
- ASPECTS score
- Colaterales leptomeníngeas
- Transformación hemorrágica
- Herniación (en infartos malignos)
- Estenosis carotídea/vertebral asociada

### Traumatismo craneoencefálico
- Fractura craneal (localización, tipo)
- Hematoma epidural / subdural (grosor máximo, desplazamiento de línea media)
- Contusiones hemorrágicas (localización)
- Lesión axonal difusa (microhemorragias en cuerpo calloso, ganglios basales, tronco)
- Neumoencéfalo
- Herniación

## MUSCULOESQUELÉTICO

### Fractura vertebral
- Afectación de columnas posterior/media (inestabilidad)
- Compromiso del canal raquídeo (porcentaje)
- Fragmento retropulsado
- Edema medular / contusión medular (si RM)
- Fractura por insuficiencia vs patológica (señal anormal del cuerpo vertebral)
- Cifosis segmentaria resultante

### Fractura de pelvis / acetábulo
- Congruencia articular coxofemoral
- Lesión de anillo pélvico (estabilidad: unilateral vs bilateral)
- Lesión vesical / uretral asociada
- Hematoma pélvico / retroperitoneal
- Lesión vascular (extravasación activa)`,

  en: `# CLINICAL CHECKLIST — COMMONLY OMITTED ASSOCIATED FINDINGS

## CHEST

### Pulmonary embolism (PE)
- Right heart strain signs: RV/LV ratio > 1, interventricular septum bowing, contrast reflux into hepatic veins/IVC
- Pulmonary infarction (peripheral wedge-shaped consolidation)
- Associated pleural effusion
- Concomitant deep vein thrombosis (if lower extremity cuts included)
- Right heart thrombus in transit

### Aortic dissection
- Extension: Stanford type A vs B
- Branch vessel involvement: great vessels, renal arteries, superior mesenteric artery, iliac arteries
- Pericardial effusion (tamponade risk in type A)
- Aortic regurgitation (type A)
- Organ malperfusion: renal, mesenteric, extremities

### Lung mass / Pulmonary neoplasm
- Mediastinal and hilar lymphadenopathy (short-axis measurement)
- Invasion of mediastinal structures (vessels, esophagus, vertebral bodies, chest wall)
- Pleural effusion (rule out pleural implants)
- Contralateral pulmonary nodules
- Distant metastases: hepatic, adrenal, osseous (within field of view)
- Tumor thrombosis of pulmonary veins or SVC

### Pneumothorax
- Tension signs: contralateral mediastinal shift, diaphragmatic flattening/inversion
- Subcutaneous emphysema
- Chest tube (position and complications if present)

### Pneumonia / Pulmonary infection
- Parapneumonic effusion / empyema
- Cavitation (lung abscess)
- Reactive lymphadenopathy
- Bilateral involvement (typical vs atypical pattern)

## ABDOMEN

### Acute diverticulitis
- Pericolic or pelvic collections / abscesses
- Pneumoperitoneum (perforation)
- Fistulas (colovesical, colovaginal)
- Secondary bowel obstruction
- Pylephlebitis (mesenteric/portal vein thrombosis)
- Lateroconal fascia thickening

### Acute appendicitis
- Perforation signs: localized pneumoperitoneum, extraluminal appendicolith, periappendiceal collection
- Periappendiceal abscess
- Pelvic / peritoneal free fluid
- Appendiceal phlegmon

### Bowel obstruction
- Transition point (exact location)
- Ischemia signs: pneumatosis intestinalis, portal venous gas, wall thickening, lack of enhancement
- Closed loop (mesenteric torsion, whirl sign)
- Hernia as cause (inguinal, femoral, internal, incisional)
- Tumor vs adhesive vs hernia etiology

### Acute pancreatitis
- Degree of pancreatic necrosis (percentage)
- Peripancreatic collections (location and extent)
- Vascular complications: splenic/portal/mesenteric vein thrombosis, pseudoaneurysm
- Involvement of adjacent organs
- CTSI grade (CT Severity Index)

### Mesenteric ischemia
- Thrombus in superior mesenteric artery/vein
- Pneumatosis intestinalis
- Portal venous gas
- Absent bowel wall enhancement
- Mesenteric free fluid

### Abdominal aortic aneurysm
- Rupture signs: retroperitoneal hematoma, hyperdense crescent sign, wall discontinuity
- Iliac artery extension
- Relationship to renal arteries (infrarenal vs juxtarenal vs suprarenal)
- Mural thrombus
- Compression of adjacent structures

### Abdominal trauma
- Splenic injury: AAST grade, hemoperitoneum, active contrast extravasation
- Hepatic injury: grade, associated vascular injury, hemobilia
- Renal injury: grade, urinary extravasation, vascular injury
- Pancreatic injury: pancreatic duct involvement
- Hemoperitoneum (approximate quantification)
- Great vessel injury

## NEURO

### Intracranial hemorrhage (intraparenchymal)
- Midline shift (in mm)
- Herniation: subfalcine, uncal (transtentorial), tonsillar, ascending transtentorial
- Obstructive hydrocephalus
- Intraventricular extension (hemoventricle)
- Perilesional edema
- Underlying vascular malformation (if atypical pattern)

### Subarachnoid hemorrhage (SAH)
- Aneurysm as cause (location, size)
- Acute hydrocephalus
- Vasospasm (if CTA)
- Intraventricular extension
- Herniation
- Modified Fisher scale

### Acute ischemic stroke
- Vascular occlusion: exact location (M1, M2, internal carotid, basilar)
- ASPECTS score
- Leptomeningeal collaterals
- Hemorrhagic transformation
- Herniation (in malignant infarcts)
- Associated carotid/vertebral stenosis

### Traumatic brain injury
- Skull fracture (location, type)
- Epidural / subdural hematoma (maximum thickness, midline shift)
- Hemorrhagic contusions (location)
- Diffuse axonal injury (microhemorrhages in corpus callosum, basal ganglia, brainstem)
- Pneumocephalus
- Herniation

## MUSCULOSKELETAL

### Vertebral fracture
- Posterior/middle column involvement (instability)
- Spinal canal compromise (percentage)
- Retropulsed fragment
- Cord edema / cord contusion (if MRI)
- Insufficiency vs pathologic fracture (abnormal vertebral body signal)
- Resulting segmental kyphosis

### Pelvic / Acetabular fracture
- Hip joint congruence
- Pelvic ring injury (stability: unilateral vs bilateral)
- Associated bladder / urethral injury
- Pelvic / retroperitoneal hematoma
- Vascular injury (active extravasation)`,

  pt: `# CHECKLIST CLÍNICO — ACHADOS ASSOCIADOS FREQUENTEMENTE OMITIDOS

## TÓRAX

### Tromboembolismo pulmonar (TEP)
- Sinais de sobrecarga de câmaras direitas: razão VD/VE > 1, retificação do septo interventricular, refluxo de contraste para veias supra-hepáticas/VCI
- Infarto pulmonar (consolidação periférica em cunha)
- Derrame pleural associado
- Trombose venosa profunda concomitante (se incluídos cortes de MMII)
- Trombo em trânsito em câmaras direitas

### Dissecção aórtica
- Extensão: tipo Stanford A vs B
- Envolvimento de ramos: troncos supra-aórticos, artérias renais, artéria mesentérica superior, artérias ilíacas
- Derrame pericárdico (risco de tamponamento no tipo A)
- Insuficiência aórtica (tipo A)
- Má perfusão orgânica: renal, mesentérica, extremidades

### Massa pulmonar / Neoplasia pulmonar
- Linfonodomegalias mediastinais e hilares (medida no eixo curto)
- Invasão de estruturas mediastinais (vasos, esôfago, corpos vertebrais, parede torácica)
- Derrame pleural (descartar implantes pleurais)
- Nódulos pulmonares contralaterais
- Metástases a distância: hepáticas, adrenais, ósseas (no campo de visão)
- Trombose tumoral de veias pulmonares ou VCS

### Pneumotórax
- Sinais de tensão: desvio mediastinal contralateral, achatamento/inversão diafragmática
- Enfisema subcutâneo
- Dreno torácico (posição e complicações se presente)

### Pneumonia / Infecção pulmonar
- Derrame pleural parapneumônico / empiema
- Cavitação (abscesso pulmonar)
- Linfonodomegalias reativas
- Envolvimento bilateral (padrão atípico vs típico)

## ABDOME

### Diverticulite aguda
- Coleções / abscessos pericólicos ou pélvicos
- Pneumoperitônio (perfuração)
- Fístulas (colovesical, colovaginal)
- Obstrução intestinal secundária
- Pileflebite (trombose de veia mesentérica/portal)
- Espessamento da fáscia lateroconal

### Apendicite aguda
- Sinais de perfuração: pneumoperitônio localizado, apendicolito extraluminal, coleção periapendicular
- Abscesso periapendicular
- Líquido livre pélvico / peritoneal
- Plastrão apendicular

### Obstrução intestinal
- Ponto de transição (localização exata)
- Sinais de isquemia: pneumatose intestinal, gás portal, espessamento de parede, ausência de realce
- Alça fechada (torção do mesentério, sinal do redemoinho)
- Hérnia como causa (inguinal, femoral, interna, incisional)
- Etiologia tumoral vs aderencial vs herniária

### Pancreatite aguda
- Grau de necrose pancreática (porcentagem)
- Coleções peripancreáticas (localização e extensão)
- Complicações vasculares: trombose de veia esplênica/portal/mesentérica, pseudoaneurisma
- Envolvimento de órgãos adjacentes
- Grau CTSI (CT Severity Index)

### Isquemia mesentérica
- Trombo em artéria/veia mesentérica superior
- Pneumatose intestinal
- Gás no sistema portal
- Ausência de realce da parede intestinal
- Líquido livre mesentérico

### Aneurisma de aorta abdominal
- Sinais de rotura: hematoma retroperitoneal, sinal do crescente hiperdenso, descontinuidade da parede
- Extensão para artérias ilíacas
- Relação com artérias renais (infrarrenal vs justarrenal vs suprarrenal)
- Trombo mural
- Compressão de estruturas adjacentes

### Trauma abdominal
- Lesão esplênica: grau AAST, hemoperitônio, extravasamento ativo de contraste
- Lesão hepática: grau, lesão vascular associada, hemobilia
- Lesão renal: grau, extravasamento urinário, lesão vascular
- Lesão pancreática: envolvimento do ducto pancreático
- Hemoperitônio (quantificação aproximada)
- Lesão de grandes vasos

## NEURO

### Hemorragia intracraniana (intraparenquimatosa)
- Desvio da linha média (em mm)
- Herniação: subfalcina, uncal (transtentorial), tonsilar, transtentorial ascendente
- Hidrocefalia obstrutiva
- Extensão intraventricular (hemoventrículo)
- Edema perilesional
- Malformação vascular subjacente (se padrão atípico)

### Hemorragia subaracnoidea (HSA)
- Aneurisma como causa (localização, tamanho)
- Hidrocefalia aguda
- Vasoespasmo (se angio-TC)
- Extensão intraventricular
- Herniação
- Escala Fisher modificada

### AVC isquêmico agudo
- Oclusão vascular: localização exata (M1, M2, carótida interna, basilar)
- ASPECTS score
- Colaterais leptomeníngeas
- Transformação hemorrágica
- Herniação (em infartos malignos)
- Estenose carotídea/vertebral associada

### Traumatismo cranioencefálico
- Fratura craniana (localização, tipo)
- Hematoma epidural / subdural (espessura máxima, desvio de linha média)
- Contusões hemorrágicas (localização)
- Lesão axonal difusa (micro-hemorragias no corpo caloso, gânglios basais, tronco)
- Pneumoencéfalo
- Herniação

## MUSCULOESQUELÉTICO

### Fratura vertebral
- Envolvimento de coluna posterior/média (instabilidade)
- Compromisso do canal raquidiano (porcentagem)
- Fragmento retropulsado
- Edema medular / contusão medular (se RM)
- Fratura por insuficiência vs patológica (sinal anormal do corpo vertebral)
- Cifose segmentar resultante

### Fratura de pelve / acetábulo
- Congruência articular coxofemoral
- Lesão do anel pélvico (estabilidade: unilateral vs bilateral)
- Lesão vesical / uretral associada
- Hematoma pélvico / retroperitoneal
- Lesão vascular (extravasamento ativo)`,
};

export function getClinicalChecklistKB(lang: Lang): string {
  return DEFAULT_CLINICAL_CHECKLIST_KB[lang] || DEFAULT_CLINICAL_CHECKLIST_KB.en;
}
