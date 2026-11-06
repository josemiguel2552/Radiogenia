"use client";

/**
 * The consent wall's strings.
 *
 * Split out of the shared dictionary because every page used to download
 * all three languages of every string in the product. The login page was
 * parsing 200 KB of report-view labels it could never show.
 */

import { registerMessages } from "./i18n";

registerMessages({
  es: {
    "consent.title": "Consentimiento requerido",
    "consent.subtitle": "Antes de continuar, debe aceptar los siguientes documentos legales.",
    "consent.intro": "Como usuario vinculado a un centro hospitalario, las leyes de protección de datos aplicables (LGPD en Brasil y normativas equivalentes en Latinoamérica) y la normativa sanitaria requieren su consentimiento explícito antes de utilizar esta plataforma.",
    "consent.doc.terms_of_use": "Términos de Uso",
    "consent.doc.terms_of_use_desc": "Condiciones de uso de la plataforma, limitaciones de responsabilidad y obligaciones del usuario profesional.",
    "consent.doc.privacy_policy": "Política de Privacidad",
    "consent.doc.privacy_policy_desc": "Tratamiento de datos personales, derechos ARCO, transferencias internacionales y medidas de seguridad.",
    "consent.doc.data_processing": "Acuerdo de Tratamiento de Datos",
    "consent.doc.data_processing_desc": "Condiciones de procesamiento de datos clínicos anonimizados mediante inteligencia artificial.",
    "consent.doc.ai_disclaimer": "Aviso sobre IA",
    "consent.doc.ai_disclaimer_desc": "La plataforma estructura la información que el radiólogo dicta. No emite diagnósticos ni recomendaciones. El radiólogo es responsable de validar todo informe antes de su uso clínico.",
    "consent.legal_note": "Su aceptación quedará registrada con fecha, hora e IP a efectos de cumplimiento normativo (Art. 8 LGPD y normativas equivalentes). Puede revocar su consentimiento en cualquier momento contactando al administrador.",
    "consent.accept_all": "Acepto y continúo",
    "consent.read_full": "Leer documento completo",
  },
  en: {
    "consent.title": "Consent required",
    "consent.subtitle": "Before continuing, you must accept the following legal documents.",
    "consent.intro": "As a user linked to a healthcare institution, the applicable data protection laws (Brazil's LGPD and equivalent Latin American regulations) and healthcare regulations require your explicit consent before using this platform.",
    "consent.doc.terms_of_use": "Terms of Use",
    "consent.doc.terms_of_use_desc": "Platform usage conditions, liability limitations, and professional user obligations.",
    "consent.doc.privacy_policy": "Privacy Policy",
    "consent.doc.privacy_policy_desc": "Personal data processing, data subject rights, international transfers, and security measures.",
    "consent.doc.data_processing": "Data Processing Agreement",
    "consent.doc.data_processing_desc": "Conditions for processing anonymized clinical data through artificial intelligence.",
    "consent.doc.ai_disclaimer": "AI Disclaimer",
    "consent.doc.ai_disclaimer_desc": "The platform structures information dictated by the radiologist. It does not issue diagnoses or recommendations. The radiologist is responsible for validating all reports before clinical use.",
    "consent.legal_note": "Your acceptance will be recorded with date, time, and IP address for regulatory compliance (Art. 8 LGPD and equivalent regulations). You may revoke your consent at any time by contacting the administrator.",
    "consent.accept_all": "I accept and continue",
    "consent.read_full": "Read full document",
  },
  pt: {
    "consent.title": "Consentimento necessário",
    "consent.subtitle": "Antes de continuar, você deve aceitar os seguintes documentos legais.",
    "consent.intro": "Como usuário vinculado a uma instituição hospitalar, a Lei Geral de Proteção de Dados (LGPD) e demais normas equivalentes da América Latina, juntamente com a legislação sanitária, exigem seu consentimento explícito antes de usar esta plataforma.",
    "consent.doc.terms_of_use": "Termos de Uso",
    "consent.doc.terms_of_use_desc": "Condições de uso da plataforma, limitações de responsabilidade e obrigações do usuário profissional.",
    "consent.doc.privacy_policy": "Política de Privacidade",
    "consent.doc.privacy_policy_desc": "Tratamento de dados pessoais, direitos do titular, transferências internacionais e medidas de segurança.",
    "consent.doc.data_processing": "Acordo de Tratamento de Dados",
    "consent.doc.data_processing_desc": "Condições de processamento de dados clínicos anonimizados por inteligência artificial.",
    "consent.doc.ai_disclaimer": "Aviso sobre IA",
    "consent.doc.ai_disclaimer_desc": "A plataforma estrutura as informações ditadas pelo radiologista. Não emite diagnósticos nem recomendações. O radiologista é responsável por validar todos os laudos antes do uso clínico.",
    "consent.legal_note": "Sua aceitação será registrada com data, hora e IP para fins de conformidade regulatória (Art. 8 LGPD e normas equivalentes). Você pode revogar seu consentimento a qualquer momento contactando o administrador.",
    "consent.accept_all": "Aceito e continuo",
    "consent.read_full": "Ler documento completo",
  },
});
