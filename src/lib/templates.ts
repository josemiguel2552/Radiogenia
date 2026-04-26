import { Template } from "./types";

const F = "****FINDINGS****\n";
const C = "\n****CONCLUSION****\n{conclusion}";
function t(id: number, title: string, technique: string, section: string, fields: string): Template {
  return { id, title, template: F + fields + C, technique, section };
}
function sec(label: string): string { return `***${label}***: {${label.toLowerCase()}}`; }
function fld(label: string): string { return `**${label}**: {${label.toLowerCase()}}`; }

export const DEFAULT_TEMPLATES: Template[] = [
  // ═══════════════════════════════════════════
  //  RADIOGRAFÍAS (XRay)
  // ═══════════════════════════════════════════
  t(1, "Radiografía de tórax", "XRay", "Thorax", [
    fld("Lung parenchyma"),
    fld("Mediastinum and hila"),
    fld("Cardiac silhouette"),
    fld("Pleura and diaphragm"),
    fld("Bone structures"),
    fld("Soft tissues"),
  ].join("\n")),

  t(2, "Radiografía de abdomen", "XRay", "Abdomen and pelvis", [
    fld("Bowel gas pattern"),
    fld("Solid organ outlines"),
    fld("Peritoneal fat planes"),
    fld("Soft tissues"),
    fld("Bone structures"),
    fld("Other findings"),
  ].join("\n")),

  t(3, "Radiografía de tobillo", "XRay", "Lower limbs", [
    fld("Distal tibia and fibula"),
    fld("Talus"),
    fld("Calcaneus"),
    fld("Ankle joint"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(4, "Radiografía de pie", "XRay", "Lower limbs", [
    fld("Tarsal bones"),
    fld("Metatarsals"),
    fld("Phalanges"),
    fld("Joints and alignment"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(5, "Radiografía de cráneo", "XRay", "Head and neck", [
    fld("Calvarium"),
    fld("Skull base"),
    fld("Facial bones"),
    fld("Paranasal sinuses"),
    fld("Orbits"),
    fld("Mandible"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(6, "Radiografía de columna cervical", "XRay", "Spine", [
    fld("Vertebral bodies C1-C7"),
    fld("Intervertebral disc spaces"),
    fld("Facet joints"),
    fld("Spinous processes"),
    fld("Alignment and curvature"),
    fld("Prevertebral soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(7, "Radiografía de columna torácica", "XRay", "Spine", [
    fld("Vertebral bodies T1-T12"),
    fld("Intervertebral disc spaces"),
    fld("Pedicles and posterior elements"),
    fld("Alignment and curvature"),
    fld("Costovertebral joints"),
    fld("Paravertebral soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(8, "Radiografía de columna lumbar", "XRay", "Spine", [
    fld("Vertebral bodies L1-L5"),
    fld("Intervertebral disc spaces"),
    fld("Facet joints"),
    fld("Sacroiliac joints"),
    fld("Alignment and curvature"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(9, "Radiografía de pelvis", "XRay", "Abdomen and pelvis", [
    fld("Femoral heads and acetabula"),
    fld("Hip joints"),
    fld("Sacroiliac joints"),
    fld("Pubic symphysis"),
    fld("Iliac bones"),
    fld("Sacrum and coccyx"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  // ═══════════════════════════════════════════
  //  TOMOGRAFÍAS (CT)
  // ═══════════════════════════════════════════
  t(10, "TC de cráneo", "CT", "Head and neck", [
    fld("Supratentorial brain parenchyma"),
    fld("Infratentorial brain parenchyma"),
    fld("Ventricular system and midline"),
    fld("Extra-axial spaces"),
    fld("Skull and extracranial soft tissues"),
    fld("Paranasal sinuses and mastoid cells"),
    fld("Orbits"),
    fld("Included cervical structures"),
  ].join("\n")),

  t(11, "TC de cuello", "CT", "Head and neck", [
    sec("Salivary glands") + "\n" + fld("Parotids") + "\n" + fld("Submandibular glands"),
    fld("Nasopharynx"),
    fld("Oropharynx"),
    sec("Larynx") + "\n" + fld("Vocal cords") + "\n" + fld("Piriform sinuses") + "\n" + fld("Epiglottis"),
    fld("Trachea and cervical esophagus"),
    fld("Thyroid gland"),
    fld("Parapharyngeal and retropharyngeal spaces"),
    fld("Cervical vascular structures"),
    fld("Cervical lymph nodes"),
    fld("Bone structures"),
  ].join("\n")),

  t(12, "TC de cabeza y cuello", "CT", "Head and neck", [
    fld("Supratentorial brain parenchyma"),
    fld("Infratentorial brain parenchyma"),
    fld("Ventricular system and midline"),
    fld("Extra-axial spaces"),
    fld("Skull and paranasal sinuses"),
    fld("Orbits"),
    fld("Salivary glands"),
    fld("Nasopharynx and oropharynx"),
    fld("Larynx"),
    fld("Thyroid gland"),
    fld("Cervical vascular structures"),
    fld("Cervical lymph nodes"),
    fld("Cervical spine"),
  ].join("\n")),

  t(13, "TC de cuello y tórax", "CT", "Thorax", [
    fld("Cervical soft tissues and salivary glands"),
    fld("Thyroid gland"),
    fld("Cervical vascular structures"),
    fld("Cervical lymph nodes"),
    fld("Lung parenchyma"),
    fld("Mediastinal lymph nodes"),
    fld("Trachea and bronchi"),
    fld("Esophagus"),
    fld("Aorta and great vessels"),
    fld("Heart and pericardium"),
    fld("Pleura and diaphragm"),
    fld("Bone structures"),
  ].join("\n")),

  t(14, "TC de tórax", "CT", "Thorax", [
    fld("Lung parenchyma"),
    fld("Mediastinal lymph nodes"),
    fld("Trachea and bronchi"),
    fld("Esophagus"),
    fld("Aorta and pulmonary arteries"),
    fld("Heart and pericardium"),
    fld("Pleura"),
    fld("Diaphragm"),
    fld("Thoracic wall"),
    fld("Thyroid and supradiaphragmatic tissues"),
    fld("Bone structures"),
    fld("Included portions of the abdomen"),
  ].join("\n")),

  t(15, "TC de tórax y abdomen", "CT", "Thorax", [
    fld("Lung parenchyma"),
    fld("Mediastinal lymph nodes"),
    fld("Trachea and bronchi"),
    fld("Esophagus"),
    fld("Aorta and pulmonary arteries"),
    fld("Heart and pericardium"),
    fld("Pleura and diaphragm"),
    fld("Liver"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Adrenal glands"),
    fld("Kidneys and ureters"),
    fld("Bladder"),
    fld("Peritoneum and retroperitoneum"),
    fld("Stomach and bowel"),
    fld("Bone structures"),
  ].join("\n")),

  t(16, "TC de abdomen", "CT", "Abdomen and pelvis", [
    fld("Liver"),
    fld("Portal vein and hepatic artery"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Adrenal glands"),
    fld("Kidneys and ureters"),
    fld("Bladder"),
    fld("Peritoneum and retroperitoneum"),
    fld("Stomach and bowel"),
    fld("Pelvic structures"),
    fld("Abdominal aorta and iliac arteries"),
    fld("Bone structures"),
    fld("Included portions of the thorax"),
  ].join("\n")),

  t(17, "TC de tórax, abdomen y pelvis", "CT", "Thorax", [
    fld("Lung parenchyma"),
    fld("Mediastinal lymph nodes"),
    fld("Trachea and bronchi"),
    fld("Esophagus"),
    fld("Aorta and pulmonary arteries"),
    fld("Heart and pericardium"),
    fld("Pleura and diaphragm"),
    fld("Liver"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Adrenal glands"),
    fld("Kidneys and ureters"),
    fld("Bladder"),
    fld("Peritoneum and retroperitoneum"),
    fld("Stomach and bowel"),
    fld("Pelvic organs"),
    fld("Abdominal aorta and iliac arteries"),
    fld("Bone structures"),
  ].join("\n")),

  t(18, "AngioTC de miembros inferiores", "CT", "Lower limbs", [
    fld("Abdominal aorta and iliac arteries"),
    fld("Intraabdominal organs"),
    "**Left lower limb**:\n" + [
      "   " + fld("Common and superficial femoral arteries left"),
      "   " + fld("Popliteal artery left"),
      "   " + fld("Tibial and peroneal arteries left"),
      "   " + fld("Distal arteries of the foot left"),
    ].join("\n"),
    "**Right lower limb**:\n" + [
      "   " + fld("Common and superficial femoral arteries right"),
      "   " + fld("Popliteal artery right"),
      "   " + fld("Tibial and peroneal arteries right"),
      "   " + fld("Distal arteries of the foot right"),
    ].join("\n"),
    fld("Bone structures and soft tissues"),
  ].join("\n")),

  // ═══════════════════════════════════════════
  //  RESONANCIAS (MRI)
  // ═══════════════════════════════════════════
  t(19, "RM de abdomen", "MRI", "Abdomen and pelvis", [
    fld("Liver"),
    fld("Portal vein and hepatic artery"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Adrenal glands"),
    fld("Kidneys"),
    fld("Bladder"),
    fld("Peritoneum and retroperitoneum"),
    fld("Stomach and bowel"),
    fld("Pelvic structures"),
    fld("Bone structures"),
  ].join("\n")),

  t(20, "RM de hígado", "MRI", "Abdomen and pelvis", [
    fld("Liver parenchyma"),
    fld("Hepatic focal lesions"),
    fld("Portal vein and hepatic veins"),
    fld("Hepatic artery"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Adrenal glands and kidneys"),
    fld("Other intraabdominal structures"),
    fld("Bone structures"),
  ].join("\n")),

  t(21, "RM de páncreas", "MRI", "Abdomen and pelvis", [
    fld("Pancreas"),
    fld("Pancreatic duct"),
    fld("Gallbladder and bile ducts"),
    fld("Liver"),
    fld("Spleen"),
    fld("Adrenal glands and kidneys"),
    fld("Peripancreatic fat and vessels"),
    fld("Peritoneum and retroperitoneum"),
    fld("Other intraabdominal structures"),
  ].join("\n")),

  t(22, "RM de pelvis femenina", "MRI", "Abdomen and pelvis", [
    fld("Uterus"),
    fld("Endometrium"),
    fld("Cervix"),
    fld("Ovaries"),
    fld("Fallopian tubes"),
    fld("Vagina"),
    fld("Bladder"),
    fld("Rectum and sigmoid"),
    fld("Peritoneum and retroperitoneum"),
    fld("Pelvic lymph nodes"),
    fld("Bone structures"),
  ].join("\n")),

  t(23, "RM cardíaca", "MRI", "Thorax", [
    "**Cardiac morphology and function**:\n" + [
      "   " + fld("LV volumes and ejection fraction"),
      "   " + fld("RV volumes and ejection fraction"),
      "   " + fld("LV myocardial mass"),
      "   " + fld("Wall motion abnormalities"),
    ].join("\n"),
    "**Tissue characterization**:\n" + [
      "   " + fld("T2-weighted signal"),
      "   " + fld("T1 and T2 mapping"),
      "   " + fld("ECV"),
    ].join("\n"),
    "**Late gadolinium enhancement (LGE)**:\n" + [
      "   " + fld("LGE presence and distribution"),
      "   " + fld("LGE location and burden"),
    ].join("\n"),
    fld("Valves"),
    fld("Pericardium"),
    fld("Pleural spaces"),
    fld("Other findings"),
  ].join("\n")),

  t(24, "RM cerebral", "MRI", "Head and neck", [
    fld("Supratentorial brain parenchyma"),
    fld("Infratentorial brain parenchyma"),
    fld("Ventricular system and midline"),
    fld("Extra-axial spaces"),
    fld("Skull and extracranial soft tissues"),
    fld("Orbits"),
    fld("Paranasal sinuses and mastoid cells"),
    fld("Intracranial vascular structures"),
    fld("Included cervical spine"),
  ].join("\n")),

  t(25, "RM de cuello", "MRI", "Head and neck", [
    sec("Salivary glands") + "\n" + fld("Parotids") + "\n" + fld("Submandibular glands"),
    fld("Nasopharynx"),
    fld("Oropharynx"),
    sec("Larynx") + "\n" + fld("Vocal cords") + "\n" + fld("Piriform sinuses") + "\n" + fld("Epiglottis"),
    fld("Trachea"),
    fld("Thyroid gland"),
    fld("Parapharyngeal and retropharyngeal spaces"),
    fld("Cervical vascular structures"),
    fld("Cervical lymph nodes"),
    fld("Bone structures"),
  ].join("\n")),

  t(26, "RM de rodilla", "MRI", "Lower limbs", [
    fld("Medial meniscus"),
    fld("Lateral meniscus"),
    fld("Anterior cruciate ligament"),
    fld("Posterior cruciate ligament"),
    fld("Medial collateral ligament"),
    fld("Lateral collateral ligament"),
    fld("Patellar tendon and quadriceps tendon"),
    fld("Articular cartilage"),
    fld("Joint effusion and synovium"),
    fld("Bone structures"),
    fld("Soft tissues and popliteal fossa"),
  ].join("\n")),

  t(27, "RM de pie", "MRI", "Lower limbs", [
    fld("Tarsal bones"),
    fld("Metatarsals and phalanges"),
    fld("Joints and alignment"),
    fld("Tendons"),
    fld("Ligaments"),
    fld("Plantar fascia"),
    fld("Soft tissues"),
    fld("Bone marrow signal"),
  ].join("\n")),

  t(28, "RM de tobillo", "MRI", "Lower limbs", [
    fld("Achilles tendon"),
    fld("Peroneal tendons"),
    fld("Posterior tibial tendon"),
    fld("Anterior tendons"),
    fld("Lateral ligament complex"),
    fld("Medial (deltoid) ligament"),
    fld("Syndesmosis"),
    fld("Tibiotalar and subtalar joints"),
    fld("Bone structures"),
    fld("Soft tissues"),
  ].join("\n")),

  t(29, "RM de hombro", "MRI", "Upper limbs", [
    fld("Supraspinatus tendon"),
    fld("Infraspinatus tendon"),
    fld("Subscapularis tendon"),
    fld("Teres minor tendon"),
    fld("Biceps tendon"),
    fld("Subacromial-subdeltoid bursa"),
    fld("Glenohumeral joint"),
    fld("Labrum"),
    fld("Acromioclavicular joint"),
    fld("Bone structures"),
    fld("Soft tissues"),
  ].join("\n")),

  t(30, "RM de columna cervical", "MRI", "Spine", [
    fld("Vertebral bodies C1-C7"),
    fld("Intervertebral discs"),
    fld("Spinal cord"),
    fld("Neural foramina"),
    fld("Facet joints"),
    fld("Ligaments"),
    fld("Paravertebral soft tissues"),
    fld("Craniocervical junction"),
  ].join("\n")),

  t(31, "RM de columna torácica", "MRI", "Spine", [
    fld("Vertebral bodies T1-T12"),
    fld("Intervertebral discs"),
    fld("Spinal cord"),
    fld("Neural foramina"),
    fld("Facet joints"),
    fld("Ligaments"),
    fld("Paravertebral soft tissues"),
  ].join("\n")),

  t(32, "RM de columna lumbar", "MRI", "Spine", [
    fld("Vertebral bodies L1-L5"),
    fld("Intervertebral discs"),
    fld("Conus medullaris and cauda equina"),
    fld("Neural foramina"),
    fld("Facet joints"),
    fld("Ligaments"),
    fld("Paravertebral soft tissues"),
    fld("Sacrum"),
  ].join("\n")),

  t(33, "RM de articulaciones sacroilíacas", "MRI", "Spine", [
    fld("Right sacroiliac joint"),
    fld("Left sacroiliac joint"),
    fld("Sacral bone marrow"),
    fld("Iliac bone marrow"),
    fld("Periarticular soft tissues"),
    fld("Lumbar spine"),
    fld("Other findings"),
  ].join("\n")),

  t(34, "RM de columna completa", "MRI", "Spine", [
    "**Cervical spine**:\n" + [
      "   " + fld("Vertebral bodies cervical"),
      "   " + fld("Intervertebral discs cervical"),
      "   " + fld("Spinal cord cervical"),
      "   " + fld("Neural foramina cervical"),
    ].join("\n"),
    "**Thoracic spine**:\n" + [
      "   " + fld("Vertebral bodies thoracic"),
      "   " + fld("Intervertebral discs thoracic"),
      "   " + fld("Spinal cord thoracic"),
      "   " + fld("Neural foramina thoracic"),
    ].join("\n"),
    "**Lumbar spine**:\n" + [
      "   " + fld("Vertebral bodies lumbar"),
      "   " + fld("Intervertebral discs lumbar"),
      "   " + fld("Conus medullaris and cauda equina"),
      "   " + fld("Neural foramina lumbar"),
    ].join("\n"),
    fld("Ligaments"),
    fld("Paravertebral soft tissues"),
  ].join("\n")),

  // ═══════════════════════════════════════════
  //  MAMOGRAFÍA
  // ═══════════════════════════════════════════
  t(35, "Mamografía", "Mammography", "Thorax", [
    fld("Breast composition"),
    fld("Right breast"),
    fld("Left breast"),
    fld("Axillary lymph nodes"),
    fld("Skin and nipple"),
  ].join("\n")),

  // ═══════════════════════════════════════════
  //  ECOGRAFÍAS (Ultrasound)
  // ═══════════════════════════════════════════
  t(36, "Ecografía de abdomen", "Ultrasound", "Abdomen and pelvis", [
    fld("Liver"),
    fld("Portal vein"),
    fld("Gallbladder and bile ducts"),
    fld("Spleen"),
    fld("Pancreas"),
    fld("Right kidney"),
    fld("Left kidney"),
    fld("Bladder"),
    fld("Aorta"),
    fld("Free fluid"),
    fld("Other findings"),
  ].join("\n")),

  t(37, "Ecografía de cuello", "Ultrasound", "Head and neck", [
    fld("Thyroid gland"),
    fld("Salivary glands"),
    fld("Cervical lymph nodes"),
    fld("Cervical vascular structures"),
    fld("Soft tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(38, "Ecografía de tiroides", "Ultrasound", "Head and neck", [
    fld("Right thyroid lobe"),
    fld("Left thyroid lobe"),
    fld("Isthmus"),
    fld("Thyroid nodules"),
    fld("Cervical lymph nodes"),
    fld("Other findings"),
  ].join("\n")),

  t(39, "Ecografía de mama", "Ultrasound", "Thorax", [
    fld("Right breast parenchyma"),
    fld("Left breast parenchyma"),
    fld("Focal lesions"),
    fld("Ductal system"),
    fld("Axillary lymph nodes"),
    fld("Skin and subcutaneous tissues"),
    fld("Other findings"),
  ].join("\n")),

  t(40, "Ecografía de partes blandas", "Ultrasound", "Upper limbs", [
    fld("Skin and subcutaneous tissues"),
    fld("Muscles and fasciae"),
    fld("Tendons"),
    fld("Vascular structures"),
    fld("Nerves"),
    fld("Other findings"),
  ].join("\n")),

  t(41, "Doppler de cuello", "Ultrasound", "Head and neck", [
    fld("Right common carotid artery"),
    fld("Right internal carotid artery"),
    fld("Right external carotid artery"),
    fld("Right vertebral artery"),
    fld("Left common carotid artery"),
    fld("Left internal carotid artery"),
    fld("Left external carotid artery"),
    fld("Left vertebral artery"),
    fld("Jugular veins"),
    fld("Other findings"),
  ].join("\n")),

  t(42, "Doppler venoso de miembros inferiores", "Ultrasound", "Lower limbs", [
    fld("Right common femoral vein"),
    fld("Right superficial femoral vein"),
    fld("Right popliteal vein"),
    fld("Right tibial and peroneal veins"),
    fld("Left common femoral vein"),
    fld("Left superficial femoral vein"),
    fld("Left popliteal vein"),
    fld("Left tibial and peroneal veins"),
    fld("Great saphenous veins"),
    fld("Small saphenous veins"),
    fld("Other findings"),
  ].join("\n")),

  t(43, "Doppler arterial de miembros inferiores", "Ultrasound", "Lower limbs", [
    fld("Right common femoral artery"),
    fld("Right superficial femoral artery"),
    fld("Right popliteal artery"),
    fld("Right tibial and peroneal arteries"),
    fld("Left common femoral artery"),
    fld("Left superficial femoral artery"),
    fld("Left popliteal artery"),
    fld("Left tibial and peroneal arteries"),
    fld("Ankle-brachial index"),
    fld("Other findings"),
  ].join("\n")),

  t(44, "Doppler venoso de miembros superiores", "Ultrasound", "Upper limbs", [
    fld("Right subclavian vein"),
    fld("Right axillary vein"),
    fld("Right brachial veins"),
    fld("Right basilic and cephalic veins"),
    fld("Left subclavian vein"),
    fld("Left axillary vein"),
    fld("Left brachial veins"),
    fld("Left basilic and cephalic veins"),
    fld("Other findings"),
  ].join("\n")),
];
