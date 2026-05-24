-- DEMO DATA: Fake pilot hospital with 10 users and 40 reports.
-- Run this to see how the pilot tab looks with data.
-- Run 20260524_pilot_demo_cleanup.sql to remove all of it.

-- 1. Create pilot organization
INSERT INTO public.organizations (id, name, is_pilot, created_at)
VALUES ('demo-pilot-org-001', 'Hospital Universitario Demo', true, now() - interval '30 days')
ON CONFLICT (id) DO NOTHING;

-- 2. Create 10 user profiles
INSERT INTO public.profiles (id, name, email, role, subscription_plan) VALUES
  ('demo-user-001', 'Dra. María García López', 'maria.garcia@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-002', 'Dr. Carlos Fernández Ruiz', 'carlos.fernandez@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-003', 'Dra. Ana Martínez Soto', 'ana.martinez@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-004', 'Dr. Javier Rodríguez Peña', 'javier.rodriguez@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-005', 'Dra. Laura Sánchez Gil', 'laura.sanchez@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-006', 'Dr. Pablo Moreno Díaz', 'pablo.moreno@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-007', 'Dra. Elena Torres Vega', 'elena.torres@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-008', 'Dr. Andrés Jiménez Roca', 'andres.jimenez@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-009', 'Dra. Sofía Navarro Blanco', 'sofia.navarro@demo-hospital.es', 'radiologist', 'professional'),
  ('demo-user-010', 'Dr. Miguel Herrera Campos', 'miguel.herrera@demo-hospital.es', 'radiologist', 'professional')
ON CONFLICT (id) DO NOTHING;

-- 3. Link users to org with sections and roles
INSERT INTO public.org_members (user_id, org_id, section_id, is_org_chief, section_role, staff_type, is_active) VALUES
  ('demo-user-001', 'demo-pilot-org-001', null, true, 'section_chief', 'attending', true),
  ('demo-user-002', 'demo-pilot-org-001', null, false, 'radiologist', 'attending', true),
  ('demo-user-003', 'demo-pilot-org-001', null, false, 'radiologist', 'attending', true),
  ('demo-user-004', 'demo-pilot-org-001', null, false, 'radiologist', 'attending', true),
  ('demo-user-005', 'demo-pilot-org-001', null, false, 'radiologist', 'attending', true),
  ('demo-user-006', 'demo-pilot-org-001', null, false, 'radiologist', 'resident', true),
  ('demo-user-007', 'demo-pilot-org-001', null, false, 'radiologist', 'resident', true),
  ('demo-user-008', 'demo-pilot-org-001', null, false, 'radiologist', 'resident', true),
  ('demo-user-009', 'demo-pilot-org-001', null, false, 'radiologist', 'resident', true),
  ('demo-user-010', 'demo-pilot-org-001', null, false, 'radiologist', 'resident', true)
ON CONFLICT DO NOTHING;

-- 4. Insert 40 report metrics spread across 14 days, 10 users
INSERT INTO public.report_metrics (
  user_id, org_id, report_id,
  report_start_at, report_end_at, duration_seconds,
  dictation_chars, manual_chars, total_chars,
  template_sections_total, template_sections_filled,
  ai_draft_length, final_length, edit_distance,
  ai_findings_text, final_findings_text,
  ai_conclusion_text, final_conclusion_text,
  recommendations_text, study_type, created_at
) VALUES
-- Day 1 (14 days ago) — 3 reports
('demo-user-001', 'demo-pilot-org-001', 'demo-rpt-001', now()-interval '14 days'+interval '8 hours', now()-interval '14 days'+interval '8 hours 4 minutes', 240, 320, 45, 365, 12, 10, 1200, 1180, 85,
 'Parénquima cerebral: Morfología y señal normales sin lesiones focales.
Ventrículos laterales: De tamaño y configuración normales.
Línea media: Centrada, sin desplazamiento.
Espacios subaracnoideos: Sin ensanchamiento patológico.',
 'Parénquima cerebral: Morfología y señal normales sin lesiones focales.
Ventrículos laterales: De tamaño y configuración normales.
Línea media: Centrada, sin desplazamiento.
Espacios subaracnoideos: Sin ensanchamiento significativo.',
 '1. Estudio dentro de límites normales.',
 '1. Estudio dentro de límites normales. Sin hallazgos relevantes.',
 '', 'RM Cerebral', now()-interval '14 days'),

('demo-user-002', 'demo-pilot-org-001', 'demo-rpt-002', now()-interval '14 days'+interval '9 hours', now()-interval '14 days'+interval '9 hours 6 minutes', 360, 280, 120, 400, 14, 12, 1400, 1450, 220,
 'Hígado: De tamaño normal. Lesión hipodensa de 15 mm en segmento VI.
Vesícula biliar: Distendida, sin litiasis.
Vía biliar: De calibre normal.',
 'Hígado: De tamaño normal. Lesión focal hipodensa de 15 mm en segmento VI, de contornos bien definidos, sugestiva de quiste simple.
Vesícula biliar: Distendida, de paredes finas, sin litiasis.
Vía biliar: De calibre normal, sin dilatación.',
 '1. Lesión hipodensa de 15 mm en segmento VI hepático.',
 '1. Lesión focal hipodensa de 15 mm en segmento VI hepático, de características benignas.',
 'Correlacionar con ecografía abdominal si indicado clínicamente.', 'TC Abdomen con contraste', now()-interval '14 days'),

('demo-user-006', 'demo-pilot-org-001', 'demo-rpt-003', now()-interval '14 days'+interval '10 hours', now()-interval '14 days'+interval '10 hours 8 minutes', 480, 150, 200, 350, 10, 8, 980, 1100, 350,
 'Parénquima pulmonar: Nódulo sólido de 6 mm en lóbulo inferior derecho.',
 'Parénquima pulmonar: Nódulo pulmonar sólido de 6 mm en segmento basal posterior del lóbulo inferior derecho, de nueva aparición respecto al estudio previo.
Mediastino: Sin adenopatías significativas.',
 '1. Nódulo pulmonar de 6 mm en LID.',
 '1. Nódulo pulmonar sólido de 6 mm en LID de nueva aparición.',
 'Control en 6-12 meses según directrices Fleischner.', 'TC Tórax', now()-interval '14 days'),

-- Day 3 (12 days ago) — 4 reports
('demo-user-003', 'demo-pilot-org-001', 'demo-rpt-004', now()-interval '12 days'+interval '8 hours', now()-interval '12 days'+interval '8 hours 3 minutes', 180, 410, 20, 430, 8, 8, 900, 890, 45,
 'Columna lumbar: Discopatía degenerativa L4-L5 con protrusión discal posterior.',
 'Columna lumbar: Discopatía degenerativa L4-L5 con protrusión discal posterior sin compromiso radicular.',
 '1. Discopatía L4-L5 con protrusión discal.',
 '1. Discopatía degenerativa L4-L5 con protrusión discal posterior sin compromiso radicular significativo.',
 '', 'RM Lumbar', now()-interval '12 days'),

('demo-user-004', 'demo-pilot-org-001', 'demo-rpt-005', now()-interval '12 days'+interval '9 hours', now()-interval '12 days'+interval '9 hours 5 minutes', 300, 380, 30, 410, 12, 11, 1100, 1080, 70,
 'Riñón derecho: De tamaño normal. Quiste cortical simple de 22 mm en polo inferior.',
 'Riñón derecho: De tamaño normal (11 cm). Quiste cortical simple de 22 mm en polo inferior.',
 '1. Quiste renal simple derecho de 22 mm, sin significación clínica.',
 '1. Quiste renal simple derecho de 22 mm.',
 '', 'TC Abdomen', now()-interval '12 days'),

('demo-user-005', 'demo-pilot-org-001', 'demo-rpt-006', now()-interval '12 days'+interval '10 hours', now()-interval '12 days'+interval '10 hours 7 minutes', 420, 290, 80, 370, 14, 12, 1300, 1380, 180,
 'Mama derecha: Nódulo sólido de 12 mm en CSE a las 10h.',
 'Mama derecha: Nódulo sólido de 12 mm en cuadrante superoexterno a las 10 horas, de contornos parcialmente definidos, hipoecoico.',
 '1. Nódulo sólido mamario derecho de 12 mm en CSE.',
 '1. Nódulo sólido de 12 mm en CSE de mama derecha, parcialmente definido.',
 'Se recomienda biopsia con aguja gruesa.', 'Ecografía mamaria', now()-interval '12 days'),

('demo-user-007', 'demo-pilot-org-001', 'demo-rpt-007', now()-interval '12 days'+interval '11 hours', now()-interval '12 days'+interval '11 hours 5 minutes', 300, 350, 40, 390, 10, 9, 1050, 1020, 90,
 'Articulación de rodilla: Rotura del menisco interno en asta posterior.',
 'Articulación de rodilla: Lesión meniscal del cuerno posterior del menisco interno, en probable relación con rotura degenerativa.',
 '1. Rotura del menisco interno.',
 '1. Lesión del cuerno posterior del menisco interno compatible con rotura degenerativa.',
 '', 'RM Rodilla', now()-interval '12 days'),

-- Day 5 (10 days ago) — 4 reports
('demo-user-001', 'demo-pilot-org-001', 'demo-rpt-008', now()-interval '10 days'+interval '8 hours', now()-interval '10 days'+interval '8 hours 3 minutes', 180, 400, 15, 415, 12, 11, 1150, 1130, 55,
 'Parénquima cerebral: Sin alteraciones de señal significativas.',
 'Parénquima cerebral: Sin alteraciones de señal significativas. Pequeños focos de gliosis en sustancia blanca periventricular.',
 '1. Cambios microvasculares inespecíficos.',
 '1. Focos aislados de gliosis en sustancia blanca periventricular, de probable origen microangiopático.',
 '', 'RM Cerebral', now()-interval '10 days'),

('demo-user-002', 'demo-pilot-org-001', 'demo-rpt-009', now()-interval '10 days'+interval '9 hours', now()-interval '10 days'+interval '9 hours 4 minutes', 240, 350, 25, 375, 14, 13, 1280, 1260, 60,
 'Hígado: Sin lesiones focales. Vesícula biliar: Normal.',
 'Hígado: Tamaño y morfología normales, sin lesiones focales. Vesícula biliar: Normal.',
 '1. Estudio sin hallazgos relevantes.',
 '1. Estudio abdominal dentro de límites normales.',
 '', 'TC Abdomen', now()-interval '10 days'),

('demo-user-008', 'demo-pilot-org-001', 'demo-rpt-010', now()-interval '10 days'+interval '10 hours', now()-interval '10 days'+interval '10 hours 9 minutes', 540, 180, 250, 430, 10, 7, 950, 1200, 450,
 'Parénquima pulmonar: Múltiples nódulos bilaterales.',
 'Parénquima pulmonar: Múltiples nódulos pulmonares bilaterales, el mayor de 18 mm en LSD. Derrame pleural bilateral de predominio derecho.',
 '1. Múltiples nódulos pulmonares bilaterales.',
 '1. Múltiples nódulos pulmonares bilaterales, el mayor de 18 mm en LSD. Derrame pleural bilateral.',
 'Valorar PET-TC para caracterización.', 'TC Tórax con contraste', now()-interval '10 days'),

('demo-user-009', 'demo-pilot-org-001', 'demo-rpt-011', now()-interval '10 days'+interval '11 hours', now()-interval '10 days'+interval '11 hours 6 minutes', 360, 300, 60, 360, 8, 7, 1000, 1050, 150,
 'Columna cervical: Hernia discal C5-C6 posterolateral izquierda.',
 'Columna cervical: Hernia discal C5-C6 posterolateral izquierda con contacto radicular C6 izquierdo sin compromiso medular.',
 '1. Hernia discal C5-C6 izquierda.',
 '1. Hernia discal C5-C6 posterolateral izquierda con contacto radicular C6.',
 '', 'RM Cervical', now()-interval '10 days'),

-- Day 7 (8 days ago) — 5 reports
('demo-user-003', 'demo-pilot-org-001', 'demo-rpt-012', now()-interval '8 days'+interval '8 hours', now()-interval '8 days'+interval '8 hours 2 minutes 30 seconds', 150, 420, 10, 430, 12, 12, 1180, 1170, 30,
 'Articulación de hombro: Tendinopatía del supraespinoso sin rotura.',
 'Articulación de hombro: Tendinopatía del supraespinoso sin rotura macroscópica.',
 '1. Tendinopatía del supraespinoso.',
 '1. Tendinopatía del supraespinoso sin signos de rotura.',
 '', 'RM Hombro', now()-interval '8 days'),

('demo-user-004', 'demo-pilot-org-001', 'demo-rpt-013', now()-interval '8 days'+interval '9 hours', now()-interval '8 days'+interval '9 hours 4 minutes', 240, 370, 30, 400, 10, 9, 1080, 1060, 65,
 'Cráneo: Sin fracturas. Encéfalo: Sin hemorragias agudas.',
 'Cráneo: Integridad ósea conservada. Encéfalo: Sin hemorragias agudas intra ni extraaxiales.',
 '1. TC craneal sin hallazgos agudos.',
 '1. Estudio craneal urgente sin evidencia de hemorragia aguda.',
 '', 'TC Cráneo urgente', now()-interval '8 days'),

('demo-user-005', 'demo-pilot-org-001', 'demo-rpt-014', now()-interval '8 days'+interval '10 hours', now()-interval '8 days'+interval '10 hours 5 minutes', 300, 330, 50, 380, 14, 12, 1220, 1280, 160,
 'Útero: Mioma intramural de 35 mm en pared anterior.',
 'Útero: Mioma intramural de 35 mm en pared anterior del cuerpo uterino, sin componente submucoso.',
 '1. Mioma uterino intramural de 35 mm.',
 '1. Mioma intramural de 35 mm en pared anterior uterina sin componente submucoso.',
 '', 'Ecografía pélvica', now()-interval '8 days'),

('demo-user-006', 'demo-pilot-org-001', 'demo-rpt-015', now()-interval '8 days'+interval '11 hours', now()-interval '8 days'+interval '11 hours 4 minutes', 240, 380, 25, 405, 12, 11, 1100, 1090, 55,
 'Aorta abdominal: Ectasia de 28 mm infrarrenal.',
 'Aorta abdominal: Ectasia fusiforme de 28 mm a nivel infrarrenal, sin criterios de aneurisma.',
 '1. Ectasia aórtica infrarrenal de 28 mm.',
 '1. Ectasia aórtica abdominal infrarrenal de 28 mm.',
 '', 'TC Abdomen con contraste', now()-interval '8 days'),

('demo-user-010', 'demo-pilot-org-001', 'demo-rpt-016', now()-interval '8 days'+interval '12 hours', now()-interval '8 days'+interval '12 hours 7 minutes', 420, 250, 100, 350, 10, 8, 980, 1100, 280,
 'Tórax: Consolidación en base pulmonar derecha.',
 'Tórax: Consolidación parenquimatosa en segmento basal posterior derecho con broncograma aéreo. Pequeño derrame pleural derecho asociado.',
 '1. Consolidación basal derecha.',
 '1. Consolidación basal posterior derecha con broncograma aéreo y pequeño derrame pleural asociado.',
 '', 'Radiografía de tórax', now()-interval '8 days'),

-- Day 9 (6 days ago) — 5 reports
('demo-user-001', 'demo-pilot-org-001', 'demo-rpt-017', now()-interval '6 days'+interval '8 hours', now()-interval '6 days'+interval '8 hours 2 minutes', 120, 450, 5, 455, 12, 12, 1200, 1195, 20,
 'Parénquima cerebral: Estudio normal para la edad del paciente.',
 'Parénquima cerebral: Estudio normal para la edad del paciente.',
 '1. RM cerebral dentro de límites normales.',
 '1. RM cerebral dentro de límites normales.',
 '', 'RM Cerebral', now()-interval '6 days'),

('demo-user-002', 'demo-pilot-org-001', 'demo-rpt-018', now()-interval '6 days'+interval '9 hours', now()-interval '6 days'+interval '9 hours 3 minutes', 180, 400, 20, 420, 14, 13, 1350, 1330, 50,
 'Páncreas: De tamaño y morfología normales. Conducto de Wirsung no dilatado.',
 'Páncreas: De tamaño y morfología normales. Conducto pancreático principal no dilatado.',
 '1. Estudio pancreático normal.',
 '1. Estudio pancreático sin alteraciones.',
 '', 'TC Abdomen', now()-interval '6 days'),

('demo-user-007', 'demo-pilot-org-001', 'demo-rpt-019', now()-interval '6 days'+interval '10 hours', now()-interval '6 days'+interval '10 hours 4 minutes', 240, 360, 30, 390, 10, 9, 1050, 1030, 70,
 'Tobillo: Esguince del ligamento peroneoastragalino anterior grado II.',
 'Tobillo: Lesión del ligamento peroneoastragalino anterior compatible con esguince grado II. Edema óseo subcondral en astrágalo.',
 '1. Esguince grado II del LPAA.',
 '1. Esguince grado II del ligamento peroneoastragalino anterior con edema óseo asociado.',
 '', 'RM Tobillo', now()-interval '6 days'),

('demo-user-008', 'demo-pilot-org-001', 'demo-rpt-020', now()-interval '6 days'+interval '11 hours', now()-interval '6 days'+interval '11 hours 5 minutes', 300, 310, 60, 370, 12, 10, 1100, 1150, 160,
 'Mama izquierda: Microcalcificaciones agrupadas en UCS.',
 'Mama izquierda: Grupo de microcalcificaciones pleomórficas en unión de cuadrantes superiores, de distribución segmentaria.',
 '1. Microcalcificaciones agrupadas en mama izquierda.',
 '1. Microcalcificaciones pleomórficas agrupadas en UCS de mama izquierda.',
 'Biopsia estereotáxica recomendada.', 'Mamografía', now()-interval '6 days'),

('demo-user-009', 'demo-pilot-org-001', 'demo-rpt-021', now()-interval '6 days'+interval '12 hours', now()-interval '6 days'+interval '12 hours 3 minutes', 180, 380, 25, 405, 8, 8, 980, 970, 40,
 'Columna lumbar: Sin hallazgos significativos. Alineación conservada.',
 'Columna lumbar: Alineación normal. Sin alteraciones de señal significativas. Discos intervertebrales de altura conservada.',
 '1. RM lumbar sin hallazgos relevantes.',
 '1. RM lumbar dentro de límites normales.',
 '', 'RM Lumbar', now()-interval '6 days'),

-- Day 10 (5 days ago) — 4 reports
('demo-user-003', 'demo-pilot-org-001', 'demo-rpt-022', now()-interval '5 days'+interval '8 hours', now()-interval '5 days'+interval '8 hours 2 minutes', 120, 460, 5, 465, 10, 10, 1050, 1040, 25,
 'Tiroides: Nódulo quístico de 8 mm en lóbulo derecho.',
 'Tiroides: Nódulo predominantemente quístico de 8 mm en tercio medio del lóbulo derecho. TI-RADS 2.',
 '1. Nódulo tiroideo derecho de 8 mm.',
 '1. Nódulo tiroideo quístico de 8 mm en lóbulo derecho.',
 '', 'Ecografía tiroidea', now()-interval '5 days'),

('demo-user-004', 'demo-pilot-org-001', 'demo-rpt-023', now()-interval '5 days'+interval '9 hours', now()-interval '5 days'+interval '9 hours 3 minutes 30 seconds', 210, 390, 20, 410, 14, 13, 1280, 1260, 55,
 'Riñones: Litiasis de 5 mm en cáliz inferior derecho sin uropatía obstructiva.',
 'Riñones: Litiasis cálcica de 5 mm en grupo calicial inferior derecho sin dilatación de la vía excretora.',
 '1. Litiasis renal derecha de 5 mm sin obstrucción.',
 '1. Litiasis de 5 mm en cáliz inferior derecho sin uropatía obstructiva.',
 '', 'TC Abdomen sin contraste', now()-interval '5 days'),

('demo-user-005', 'demo-pilot-org-001', 'demo-rpt-024', now()-interval '5 days'+interval '10 hours', now()-interval '5 days'+interval '10 hours 4 minutes', 240, 350, 35, 385, 12, 11, 1150, 1180, 100,
 'Cadera derecha: Cambios degenerativos coxofemorales moderados.',
 'Cadera derecha: Cambios degenerativos coxofemorales moderados con pinzamiento articular superior y osteofitos marginales. Edema óseo subcondral acetabular.',
 '1. Artrosis coxofemoral derecha moderada.',
 '1. Cambios degenerativos coxofemorales derechos moderados con edema subcondral.',
 '', 'RM Cadera', now()-interval '5 days'),

('demo-user-010', 'demo-pilot-org-001', 'demo-rpt-025', now()-interval '5 days'+interval '11 hours', now()-interval '5 days'+interval '11 hours 6 minutes', 360, 270, 80, 350, 10, 8, 950, 1050, 250,
 'Abdomen: Apendicitis aguda. Apéndice de 12 mm con realce parietal.',
 'Abdomen: Apéndice cecal aumentado de calibre (12 mm) con realce parietal y estriación de la grasa periapendicular. Hallazgos compatibles con apendicitis aguda no complicada.',
 '1. Apendicitis aguda.',
 '1. Hallazgos compatibles con apendicitis aguda no complicada.',
 '', 'TC Abdomen urgente', now()-interval '5 days'),

-- Day 12 (3 days ago) — 5 reports
('demo-user-001', 'demo-pilot-org-001', 'demo-rpt-026', now()-interval '3 days'+interval '8 hours', now()-interval '3 days'+interval '8 hours 1 minute 45 seconds', 105, 480, 3, 483, 12, 12, 1220, 1215, 15,
 'Hígado: Normal. Vía biliar: Normal. Páncreas: Normal.',
 'Hígado: Tamaño y ecoestructura normales. Vía biliar: No dilatada. Páncreas: Sin alteraciones ecográficas.',
 '1. Ecografía abdominal normal.',
 '1. Ecografía abdominal dentro de límites normales.',
 '', 'Ecografía abdominal', now()-interval '3 days'),

('demo-user-002', 'demo-pilot-org-001', 'demo-rpt-027', now()-interval '3 days'+interval '9 hours', now()-interval '3 days'+interval '9 hours 3 minutes', 180, 410, 15, 425, 14, 14, 1380, 1370, 35,
 'Tórax: Sin derrame pleural. Parénquima pulmonar limpio.',
 'Tórax: Sin derrame pleural. Parénquima pulmonar sin consolidaciones ni nódulos.',
 '1. TC torácico sin hallazgos patológicos.',
 '1. TC torácico dentro de límites normales.',
 '', 'TC Tórax', now()-interval '3 days'),

('demo-user-006', 'demo-pilot-org-001', 'demo-rpt-028', now()-interval '3 days'+interval '10 hours', now()-interval '3 days'+interval '10 hours 3 minutes', 180, 390, 20, 410, 10, 9, 1080, 1060, 60,
 'Rodilla: Rotura completa del LCA. Edema óseo en cóndilo femoral externo.',
 'Rodilla: Rotura completa del ligamento cruzado anterior. Contusión ósea en cóndilo femoral lateral y meseta tibial externa (patrón pivot shift).',
 '1. Rotura completa del LCA.',
 '1. Rotura completa del LCA con contusión ósea en patrón pivot shift.',
 '', 'RM Rodilla', now()-interval '3 days'),

('demo-user-007', 'demo-pilot-org-001', 'demo-rpt-029', now()-interval '3 days'+interval '11 hours', now()-interval '3 days'+interval '11 hours 3 minutes 30 seconds', 210, 370, 25, 395, 8, 8, 1020, 1000, 50,
 'Columna dorsal: Fractura por compresión de D12.',
 'Columna dorsal: Fractura vertebral por compresión de D12 con pérdida del 30% de la altura del cuerpo vertebral anterior. Sin compromiso del canal medular.',
 '1. Fractura compresiva de D12.',
 '1. Fractura vertebral compresiva de D12 con pérdida de altura del 30%, sin compromiso medular.',
 '', 'RM Dorsal', now()-interval '3 days'),

('demo-user-009', 'demo-pilot-org-001', 'demo-rpt-030', now()-interval '3 days'+interval '12 hours', now()-interval '3 days'+interval '12 hours 4 minutes', 240, 340, 40, 380, 12, 10, 1100, 1130, 110,
 'Pelvis: Quiste ovárico izquierdo de 45 mm de contenido complejo.',
 'Pelvis: Quiste ovárico izquierdo de 45 mm con componente sólido y tabiques gruesos, de características indeterminadas.',
 '1. Quiste ovárico izquierdo complejo de 45 mm.',
 '1. Lesión quística ovárica izquierda de 45 mm con componente sólido, de características indeterminadas.',
 'Valorar RM pélvica para caracterización.', 'Ecografía pélvica', now()-interval '3 days'),

-- Day 13 (2 days ago) — 5 reports
('demo-user-003', 'demo-pilot-org-001', 'demo-rpt-031', now()-interval '2 days'+interval '8 hours', now()-interval '2 days'+interval '8 hours 2 minutes', 120, 440, 8, 448, 10, 10, 1050, 1040, 25,
 'Parótidas: De tamaño y ecoestructura normales bilateralmente.',
 'Parótidas: De tamaño y ecoestructura normales bilateralmente. Sin masas ni dilatación ductal.',
 '1. Ecografía parotídea normal.',
 '1. Ecografía parotídea bilateral dentro de límites normales.',
 '', 'Ecografía cervical', now()-interval '2 days'),

('demo-user-004', 'demo-pilot-org-001', 'demo-rpt-032', now()-interval '2 days'+interval '9 hours', now()-interval '2 days'+interval '9 hours 3 minutes', 180, 400, 18, 418, 14, 13, 1300, 1280, 50,
 'Abdomen: Esplenomegalia de 16 cm. Resto sin hallazgos.',
 'Abdomen: Esplenomegalia homogénea (16 cm de eje craneocaudal). Hígado, páncreas, riñones y suprarrenales sin alteraciones.',
 '1. Esplenomegalia homogénea (16 cm).',
 '1. Esplenomegalia homogénea de 16 cm sin otras alteraciones abdominales.',
 '', 'TC Abdomen', now()-interval '2 days'),

('demo-user-005', 'demo-pilot-org-001', 'demo-rpt-033', now()-interval '2 days'+interval '10 hours', now()-interval '2 days'+interval '10 hours 4 minutes', 240, 360, 30, 390, 12, 11, 1180, 1200, 80,
 'Mama izquierda: Masa espiculada de 20 mm en CSI.',
 'Mama izquierda: Masa espiculada de 20 mm en cuadrante superointerno a las 1-2 horas, con retracción cutánea asociada.',
 '1. Masa espiculada de 20 mm en CSI de mama izquierda.',
 '1. Masa espiculada de 20 mm en CSI de mama izquierda con retracción cutánea.',
 'Biopsia con aguja gruesa indicada.', 'Mamografía', now()-interval '2 days'),

('demo-user-008', 'demo-pilot-org-001', 'demo-rpt-034', now()-interval '2 days'+interval '11 hours', now()-interval '2 days'+interval '11 hours 5 minutes', 300, 320, 55, 375, 10, 8, 1000, 1080, 200,
 'Cráneo: Hematoma subdural agudo frontoparietal derecho de 8 mm.',
 'Cráneo: Colección subdural aguda frontoparietal derecha de 8 mm de espesor máximo con desplazamiento de la línea media de 4 mm hacia la izquierda. Efecto de masa sobre el ventrículo lateral derecho.',
 '1. Hematoma subdural agudo derecho de 8 mm.',
 '1. Hematoma subdural agudo frontoparietal derecho de 8 mm con desplazamiento de línea media de 4 mm.',
 'Valoración neuroquirúrgica urgente.', 'TC Cráneo urgente', now()-interval '2 days'),

('demo-user-010', 'demo-pilot-org-001', 'demo-rpt-035', now()-interval '2 days'+interval '12 hours', now()-interval '2 days'+interval '12 hours 5 minutes', 300, 290, 65, 355, 8, 7, 950, 1020, 190,
 'Columna lumbar: Estenosis de canal L3-L4 y L4-L5.',
 'Columna lumbar: Estenosis degenerativa del canal raquídeo a nivel L3-L4 (diámetro AP 8 mm) y L4-L5 (diámetro AP 9 mm) por hipertrofia facetaria y protrusión discal.',
 '1. Estenosis de canal lumbar L3-L5.',
 '1. Estenosis degenerativa del canal raquídeo L3-L4 y L4-L5.',
 '', 'RM Lumbar', now()-interval '2 days'),

-- Day 14 (1 day ago) — 5 reports
('demo-user-001', 'demo-pilot-org-001', 'demo-rpt-036', now()-interval '1 day'+interval '8 hours', now()-interval '1 day'+interval '8 hours 1 minute 30 seconds', 90, 500, 2, 502, 12, 12, 1250, 1245, 12,
 'Cerebro: Normal. Senos paranasales: Ocupación parcial del seno maxilar derecho.',
 'Cerebro: Sin alteraciones. Senos paranasales: Ocupación mucoide parcial del seno maxilar derecho.',
 '1. RM cerebral normal. Sinusopatía maxilar derecha como hallazgo incidental.',
 '1. RM cerebral sin alteraciones significativas. Sinusopatía maxilar derecha incidental.',
 '', 'RM Cerebral', now()-interval '1 day'),

('demo-user-002', 'demo-pilot-org-001', 'demo-rpt-037', now()-interval '1 day'+interval '9 hours', now()-interval '1 day'+interval '9 hours 2 minutes 30 seconds', 150, 430, 12, 442, 14, 14, 1380, 1370, 28,
 'Tórax: TEP segmentario en arteria pulmonar del LID.',
 'Tórax: Defecto de repleción en arteria segmentaria basal del lóbulo inferior derecho compatible con tromboembolismo pulmonar agudo.',
 '1. TEP agudo segmentario en LID.',
 '1. Tromboembolismo pulmonar agudo segmentario en arteria basal del LID.',
 '', 'Angio-TC pulmonar', now()-interval '1 day'),

('demo-user-003', 'demo-pilot-org-001', 'demo-rpt-038', now()-interval '1 day'+interval '10 hours', now()-interval '1 day'+interval '10 hours 2 minutes', 120, 450, 8, 458, 10, 10, 1100, 1090, 30,
 'Abdomen: Colelitiasis múltiple sin signos de colecistitis.',
 'Abdomen: Múltiples litiasis en vesícula biliar sin signos ecográficos de colecistitis aguda. Vía biliar no dilatada.',
 '1. Colelitiasis múltiple sin complicaciones.',
 '1. Colelitiasis múltiple sin signos de colecistitis aguda.',
 '', 'Ecografía abdominal', now()-interval '1 day'),

('demo-user-006', 'demo-pilot-org-001', 'demo-rpt-039', now()-interval '1 day'+interval '11 hours', now()-interval '1 day'+interval '11 hours 3 minutes', 180, 380, 22, 402, 12, 11, 1150, 1130, 55,
 'Cadera izquierda: Necrosis avascular de la cabeza femoral estadio II.',
 'Cadera izquierda: Alteración de señal en la cabeza femoral izquierda con patrón de doble línea en T2, compatible con necrosis avascular estadio II de Ficat. Sin colapso articular.',
 '1. Necrosis avascular de cabeza femoral izquierda estadio II.',
 '1. Necrosis avascular de cabeza femoral izquierda (Ficat II) sin colapso.',
 '', 'RM Cadera', now()-interval '1 day'),

('demo-user-007', 'demo-pilot-org-001', 'demo-rpt-040', now()-interval '1 day'+interval '12 hours', now()-interval '1 day'+interval '12 hours 3 minutes', 180, 370, 28, 398, 10, 9, 1020, 1000, 60,
 'Hombro derecho: Rotura parcial del tendón supraespinoso de espesor parcial articular.',
 'Hombro derecho: Rotura parcial articular del tendón supraespinoso en su inserción, de aproximadamente 50% del espesor. Bursitis subacromial-subdeltoidea asociada.',
 '1. Rotura parcial del supraespinoso.',
 '1. Rotura parcial articular del tendón supraespinoso (50% del espesor) con bursitis subacromial.',
 '', 'RM Hombro', now()-interval '1 day');

-- 5. Insert NPS surveys (6 responses)
INSERT INTO public.pilot_survey_responses (user_id, org_id, score, feedback_text, created_at) VALUES
  ('demo-user-001', 'demo-pilot-org-001', 5, 'Excelente herramienta, ahorra mucho tiempo en informes rutinarios.', now()-interval '5 days'),
  ('demo-user-002', 'demo-pilot-org-001', 4, 'Muy útil, aunque a veces el dictado necesita corrección.', now()-interval '5 days'),
  ('demo-user-003', 'demo-pilot-org-001', 5, 'La mejor herramienta de dictado que he probado. La IA estructura muy bien.', now()-interval '4 days'),
  ('demo-user-005', 'demo-pilot-org-001', 4, 'Funciona bien para ecografía y mamografía. Falta personalización de frases.', now()-interval '3 days'),
  ('demo-user-007', 'demo-pilot-org-001', 3, 'Útil pero necesita mejorar en estudios MSK complejos.', now()-interval '2 days'),
  ('demo-user-009', 'demo-pilot-org-001', 4, 'Como residente me ayuda mucho a estructurar los informes correctamente.', now()-interval '1 day');
