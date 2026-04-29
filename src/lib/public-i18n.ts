"use client";

import { useState, useEffect, useCallback } from "react";

export type PublicLang = "es" | "en";

const STORAGE_KEY = "radiogenai_public_lang";

function detectLang(): PublicLang {
  if (typeof window === "undefined") return "es";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "es") return stored;
  const nav = navigator.language?.toLowerCase() || "";
  return nav.startsWith("en") ? "en" : "es";
}

const dict: Record<PublicLang, Record<string, string>> = {
  es: {
    // Nav
    "nav.features": "Funciones",
    "nav.pricing": "Precios",
    "nav.signin": "Iniciar sesión",
    "nav.get_started": "Empieza gratis",
    // Hero
    "hero.title": "Informes radiológicos en segundos",
    "hero.subtitle": "Dicta tus hallazgos de forma natural. La IA los transcribe, estructura y formatea en un informe profesional — listo para revisar y firmar.",
    "hero.cta_primary": "Empieza gratis — 30 informes/mes",
    "hero.cta_secondary": "Ver cómo funciona",
    "hero.badge_no_card": "Sin tarjeta de crédito",
    "hero.badge_hipaa": "Diseño consciente de HIPAA",
    "hero.badge_encrypt": "Cifrado AES-256",
    // Features
    "feat.title": "Todo lo que necesitas para informar más rápido",
    "feat.subtitle": "Diseñado por radiólogos, para radiólogos.",
    "feat.voice.title": "Dictado por voz",
    "feat.voice.desc": "Dicta hallazgos de forma natural. La IA transcribe y estructura tu informe en tiempo real.",
    "feat.structured.title": "Informes estructurados",
    "feat.structured.desc": "104+ plantillas en todas las modalidades. Cada sección se rellena automáticamente desde tu dictado.",
    "feat.style.title": "Aprendizaje de estilo",
    "feat.style.desc": "La IA aprende tus frases preferidas para hallazgos normales y conclusiones con el tiempo.",
    "feat.conclusions.title": "Conclusiones inteligentes",
    "feat.conclusions.desc": "Borradores automáticos de conclusiones y recomendaciones basadas en tus hallazgos.",
    "feat.templates.title": "Plantillas personalizables",
    "feat.templates.desc": "Crea y personaliza plantillas para cualquier tipo de estudio. Tu estructura, a tu manera.",
    "feat.safety.title": "Seguridad clínica",
    "feat.safety.desc": "Política de cero alucinaciones. La IA solo usa lo que tú dictas. Trazabilidad completa.",
    // How it works
    "how.title": "Cómo funciona",
    "how.step1.title": "Dicta",
    "how.step1.desc": "Habla tus hallazgos de forma natural o escríbelos. La IA transcribe en tiempo real.",
    "how.step2.title": "Genera",
    "how.step2.desc": "La IA estructura tu dictado en un informe completo usando tu plantilla preferida.",
    "how.step3.title": "Revisa y guarda",
    "how.step3.desc": "Edita lo que necesites y guarda. La plataforma aprende tu estilo para la próxima vez.",
    // Pricing
    "pricing.title": "Precios simples y transparentes",
    "pricing.subtitle": "Empieza gratis. Sube de plan cuando necesites más informes.",
    "pricing.all_features": "Todos los planes incluyen todas las funciones.",
    "pricing.per_month": "/mes",
    "pricing.free_cta": "Empieza gratis",
    "pricing.subscribe_cta": "Suscribirse",
    "pricing.most_popular": "Más popular",
    "pricing.note": "Nuestra estructura de precios está diseñada para ofrecer el máximo valor manteniendo la calidad del servicio. Todos los planes incluyen el mismo modelo de IA y funciones.",
    // Plan features
    "plan.feat.reports_30": "30 informes/mes",
    "plan.feat.reports_150": "150 informes/mes",
    "plan.feat.reports_400": "400 informes/mes",
    "plan.feat.all_modalities": "Todas las modalidades",
    "plan.feat.dictation_30": "30 min dictado por voz/mes",
    "plan.feat.dictation_120": "120 min dictado por voz/mes",
    "plan.feat.dictation_300": "300 min dictado por voz/mes",
    "plan.feat.style_learning": "Aprendizaje de estilo",
    "plan.feat.custom_templates": "Plantillas personalizables",
    "plan.feat.guidelines_2": "2 documentos de guías",
    "plan.feat.guidelines_5": "5 documentos de guías",
    "plan.feat.guidelines_15": "15 documentos de guías",
    "plan.feat.priority_support": "Soporte prioritario",
    "plan.feat.api_access": "Acceso API",
    "plan.feat.bulk_export": "Exportación masiva",
    // CTA
    "cta.title": "¿Listo para informar más rápido?",
    "cta.subtitle": "Únete a los radiólogos que ahorran horas cada semana con informes asistidos por IA.",
    "cta.button": "Empieza con 30 informes gratis",
    // Footer
    "footer.legal": "Legal",
    "footer.rights": "Todos los derechos reservados.",
    // Auth - Login
    "auth.welcome_back": "Bienvenido de nuevo",
    "auth.sign_in_subtitle": "Inicia sesión en tu cuenta",
    "auth.google": "Continuar con Google",
    "auth.or_email": "o inicia sesión con email",
    "auth.email": "Email",
    "auth.email_placeholder": "tu@hospital.com",
    "auth.password": "Contraseña",
    "auth.password_placeholder": "Introduce tu contraseña",
    "auth.forgot": "¿Olvidaste la contraseña?",
    "auth.signin_btn": "Iniciar sesión",
    "auth.no_account": "¿No tienes cuenta?",
    "auth.create_free": "Crea una gratis",
    "auth.sidebar_text": "Informes radiológicos asistidos por IA. Dicta, genera, entrega.",
    // Auth - Register
    "auth.create_account": "Crea tu cuenta",
    "auth.register_subtitle": "Empieza a generar informes estructurados en segundos",
    "auth.or_register": "o regístrate con email",
    "auth.fullname": "Nombre completo",
    "auth.fullname_placeholder": "Dr. Juan Pérez",
    "auth.password_min": "Mín. 6 caracteres",
    "auth.accept_terms": "Acepto los Términos de Uso, Política de Privacidad y Descargo de Responsabilidad.",
    "auth.accept_terms_note": "Radiogen.AI es un asistente de redacción de informes. Los textos generados son borradores indicativos que deben ser revisados y validados antes de su uso clínico.",
    "auth.create_btn": "Crear cuenta",
    "auth.have_account": "¿Ya tienes cuenta?",
    "auth.signin_link": "Iniciar sesión",
    "auth.sidebar_free": "Empieza con 30 informes gratis al mes. Sin tarjeta de crédito.",
    // Auth - Forgot password
    "auth.reset_title": "Restablecer contraseña",
    "auth.reset_subtitle": "Introduce tu email y te enviaremos un enlace para restablecerla.",
    "auth.send_link": "Enviar enlace",
    "auth.check_email": "Revisa tu email",
    "auth.reset_sent": "Hemos enviado un enlace de restablecimiento a {email}. Haz clic en el enlace del email para establecer una nueva contraseña.",
    "auth.back_signin": "Volver a iniciar sesión",
    // Auth - Reset password
    "auth.new_password_title": "Nueva contraseña",
    "auth.new_password_subtitle": "Elige una contraseña segura para tu cuenta.",
    "auth.new_password": "Nueva contraseña",
    "auth.confirm_password": "Confirmar contraseña",
    "auth.confirm_placeholder": "Repite tu contraseña",
    "auth.passwords_mismatch": "Las contraseñas no coinciden",
    "auth.password_too_short": "La contraseña debe tener al menos 6 caracteres",
    "auth.password_updated": "Contraseña actualizada",
    "auth.redirecting": "Redirigiendo al dashboard...",
    "auth.update_btn": "Actualizar contraseña",
    // Legal
    "legal.title": "Términos de Uso, Política de Privacidad y Descargo de Responsabilidad",
    "legal.updated": "Última actualización: Abril 2026",
    "legal.s1.title": "1. Naturaleza del Servicio",
    "legal.s1.p1": "Radiogen.AI es una <b>herramienta de asistencia a la redacción de informes</b> diseñada exclusivamente para radiólogos licenciados y profesionales médicos cualificados. La plataforma utiliza inteligencia artificial para ayudar a estructurar y redactar informes radiológicos basándose en el propio dictado del radiólogo.",
    "legal.s1.p2": "Radiogen.AI <b>NO</b> es una herramienta de diagnóstico. No realiza análisis de imagen, no interpreta imágenes médicas, y no genera diagnósticos clínicos autónomos ni recomendaciones terapéuticas.",
    "legal.s2.title": "2. Limitación de Responsabilidad",
    "legal.s2.items": "Todo el contenido clínico generado por Radiogen.AI se deriva <b>exclusivamente del dictado del radiólogo</b>. La IA no añade hallazgos clínicos, diagnósticos ni valoraciones patológicas que no hayan sido dictados por el usuario.|El <b>radiólogo es el único responsable</b> de revisar, validar, modificar y aprobar cada informe antes de su entrega a pacientes, médicos solicitantes o incorporación a cualquier historia clínica.|Radiogen.AI y sus operadores <b>no asumen responsabilidad alguna</b> por decisiones clínicas, errores diagnósticos, omisiones o cualquier resultado adverso para pacientes derivado del uso de informes generados con esta herramienta.|El usuario reconoce que el texto generado por IA puede contener errores, inexactitudes o expresiones inapropiadas, y acepta la plena responsabilidad de validar el resultado final.",
    "legal.s3.title": "3. Responsabilidad Profesional",
    "legal.s3.intro": "Al utilizar Radiogen.AI, el radiólogo confirma que:",
    "legal.s3.items": "Posee una licencia médica válida y está cualificado para interpretar estudios radiológicos y emitir informes de radiología.|Revisará cada informe generado por IA en su totalidad antes de firmarlo, entregarlo o archivarlo.|Entiende que la IA es un asistente de redacción y que el juicio médico final recae enteramente en el profesional.|No utilizará la plataforma para sustituir la evaluación radiológica profesional.",
    "legal.s4.title": "4. Privacidad y Seguridad de Datos",
    "legal.s4.items": "<b>No se requieren ni almacenan datos identificativos de pacientes.</b> La plataforma procesa únicamente texto de dictado anonimizado. Los usuarios no deben incluir nombres de pacientes, DNI, fechas de nacimiento ni ninguna otra información personal identificable (PII) en sus dictados.|El texto de dictado y los informes generados se almacenan en la cuenta del usuario con fines de aprendizaje de estilo e historial de informes. Estos datos están cifrados en reposo y en tránsito.|Las claves API configuradas por el administrador se cifran mediante AES-256-GCM antes de su almacenamiento.|Radiogen.AI no vende, comparte ni transfiere datos de usuarios a terceros con fines comerciales o de marketing.|El procesamiento de IA se realiza a través del proveedor de modelo de lenguaje configurado por el administrador (ej. OpenAI, DeepSeek, Anthropic). El texto de dictado se envía a estos proveedores para su procesamiento. Los usuarios deben revisar las políticas de privacidad del proveedor de IA configurado.|Los usuarios pueden solicitar la eliminación de su cuenta y todos los datos asociados en cualquier momento contactando al administrador.",
    "legal.s5.title": "5. Usos Prohibidos",
    "legal.s5.items": "Usar Radiogen.AI como sustituto de la evaluación radiológica profesional.|Incluir información identificativa de pacientes en dictados o campos de contexto clínico.|Distribuir informes generados por IA sin revisión y validación previa por un radiólogo cualificado.|Ingeniería inversa, descompilación o intento de extraer el código fuente o algoritmos de la plataforma.|Compartir credenciales de cuenta con personas no autorizadas.",
    "legal.s6.title": "6. Propiedad Intelectual",
    "legal.s6.p": "La plataforma Radiogen.AI, incluyendo su código, diseño, algoritmos y documentación, es propiedad intelectual de sus operadores. Los informes generados por el usuario pertenecen al usuario y a su institución. La plataforma no retiene propiedad alguna sobre el contenido clínico producido por sus usuarios.",
    "legal.s7.title": "7. Disponibilidad del Servicio",
    "legal.s7.p": "Radiogen.AI se proporciona \"tal cual\" sin garantías de ningún tipo, expresas o implícitas. No garantizamos la disponibilidad ininterrumpida del servicio. La plataforma depende de proveedores de IA y de infraestructura de terceros, que pueden experimentar interrupciones o degradación del servicio fuera de nuestro control.",
    "legal.s8.title": "8. Cambios en los Términos",
    "legal.s8.p": "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios materiales. El uso continuado de la plataforma tras la notificación constituye la aceptación de los términos actualizados.",
    "legal.s9.title": "9. Contacto",
    "legal.s9.p": "Para consultas, solicitudes de eliminación de datos o cuestiones legales, contáctenos en",
  },
  en: {
    // Nav
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.signin": "Sign in",
    "nav.get_started": "Get started free",
    // Hero
    "hero.title": "Radiology reports in seconds",
    "hero.subtitle": "Dictate your findings naturally. AI transcribes, structures and formats them into a professional report — ready to review and sign.",
    "hero.cta_primary": "Start free — 30 reports/month",
    "hero.cta_secondary": "See how it works",
    "hero.badge_no_card": "No credit card required",
    "hero.badge_hipaa": "HIPAA-conscious design",
    "hero.badge_encrypt": "AES-256 encryption",
    // Features
    "feat.title": "Everything you need to report faster",
    "feat.subtitle": "Designed by radiologists, for radiologists.",
    "feat.voice.title": "Voice Dictation",
    "feat.voice.desc": "Dictate findings naturally. AI transcribes and structures your report in real time.",
    "feat.structured.title": "Structured Reports",
    "feat.structured.desc": "104+ templates across all modalities. Every section filled automatically from your dictation.",
    "feat.style.title": "Style Learning",
    "feat.style.desc": "The AI learns your preferred phrasing for normal findings and conclusions over time.",
    "feat.conclusions.title": "Smart Conclusions",
    "feat.conclusions.desc": "Automatic conclusion drafts and evidence-based recommendations from your findings.",
    "feat.templates.title": "Custom Templates",
    "feat.templates.desc": "Create and customize templates for any study type. Your structure, your way.",
    "feat.safety.title": "Clinical Safety",
    "feat.safety.desc": "Zero hallucinations policy. AI only uses what you dictate. Full traceability.",
    // How it works
    "how.title": "How it works",
    "how.step1.title": "Dictate",
    "how.step1.desc": "Speak your findings naturally or type them. The AI transcribes in real time.",
    "how.step2.title": "Generate",
    "how.step2.desc": "AI structures your dictation into a complete report using your preferred template.",
    "how.step3.title": "Review & Save",
    "how.step3.desc": "Edit anything, save. The platform learns your style for next time.",
    // Pricing
    "pricing.title": "Simple, transparent pricing",
    "pricing.subtitle": "Start free. Upgrade when you need more reports.",
    "pricing.all_features": "Every plan includes all features.",
    "pricing.per_month": "/mo",
    "pricing.free_cta": "Get started free",
    "pricing.subscribe_cta": "Subscribe",
    "pricing.most_popular": "Most popular",
    "pricing.note": "Our pricing structure is designed to deliver maximum value while maintaining service quality. All plans include the same AI model and features.",
    // Plan features
    "plan.feat.reports_30": "30 reports/month",
    "plan.feat.reports_150": "150 reports/month",
    "plan.feat.reports_400": "400 reports/month",
    "plan.feat.all_modalities": "All modalities",
    "plan.feat.dictation_30": "30 min voice dictation/month",
    "plan.feat.dictation_120": "120 min voice dictation/month",
    "plan.feat.dictation_300": "300 min voice dictation/month",
    "plan.feat.style_learning": "Style learning",
    "plan.feat.custom_templates": "Custom templates",
    "plan.feat.guidelines_2": "2 guideline documents",
    "plan.feat.guidelines_5": "5 guideline documents",
    "plan.feat.guidelines_15": "15 guideline documents",
    "plan.feat.priority_support": "Priority support",
    "plan.feat.api_access": "API access",
    "plan.feat.bulk_export": "Bulk export",
    // CTA
    "cta.title": "Ready to report faster?",
    "cta.subtitle": "Join radiologists who save hours every week with AI-assisted reporting.",
    "cta.button": "Start with 30 free reports",
    // Footer
    "footer.legal": "Legal",
    "footer.rights": "All rights reserved.",
    // Auth - Login
    "auth.welcome_back": "Welcome back",
    "auth.sign_in_subtitle": "Sign in to your account",
    "auth.google": "Continue with Google",
    "auth.or_email": "or sign in with email",
    "auth.email": "Email",
    "auth.email_placeholder": "you@hospital.com",
    "auth.password": "Password",
    "auth.password_placeholder": "Enter your password",
    "auth.forgot": "Forgot password?",
    "auth.signin_btn": "Sign in",
    "auth.no_account": "No account?",
    "auth.create_free": "Create one free",
    "auth.sidebar_text": "AI-powered radiology reporting. Dictate, generate, deliver.",
    // Auth - Register
    "auth.create_account": "Create your account",
    "auth.register_subtitle": "Start generating structured reports in seconds",
    "auth.or_register": "or register with email",
    "auth.fullname": "Full name",
    "auth.fullname_placeholder": "Dr. Jane Smith",
    "auth.password_min": "Min. 6 characters",
    "auth.accept_terms": "I accept the Terms of Use, Privacy Policy and Liability Disclaimer.",
    "auth.accept_terms_note": "Radiogen.AI is a report drafting assistant. Generated texts are indicative drafts that should be reviewed and validated before clinical use.",
    "auth.create_btn": "Create account",
    "auth.have_account": "Already have an account?",
    "auth.signin_link": "Sign in",
    "auth.sidebar_free": "Start with 30 free reports per month. No credit card required.",
    // Auth - Forgot password
    "auth.reset_title": "Reset your password",
    "auth.reset_subtitle": "Enter your email and we'll send you a link to reset your password.",
    "auth.send_link": "Send reset link",
    "auth.check_email": "Check your email",
    "auth.reset_sent": "We sent a password reset link to {email}. Click the link in the email to set a new password.",
    "auth.back_signin": "Back to sign in",
    // Auth - Reset password
    "auth.new_password_title": "Set new password",
    "auth.new_password_subtitle": "Choose a strong password for your account.",
    "auth.new_password": "New password",
    "auth.confirm_password": "Confirm password",
    "auth.confirm_placeholder": "Repeat your password",
    "auth.passwords_mismatch": "Passwords don't match",
    "auth.password_too_short": "Password must be at least 6 characters",
    "auth.password_updated": "Password updated",
    "auth.redirecting": "Redirecting you to the dashboard...",
    "auth.update_btn": "Update password",
    // Legal
    "legal.title": "Terms of Use, Privacy Policy & Liability Disclaimer",
    "legal.updated": "Last updated: April 2026",
    "legal.s1.title": "1. Nature of the Service",
    "legal.s1.p1": "Radiogen.AI is a <b>report drafting assistance tool</b> designed exclusively for licensed radiologists and qualified medical professionals. The platform uses artificial intelligence to help structure and draft radiology reports based on the radiologist's own dictation.",
    "legal.s1.p2": "Radiogen.AI is <b>NOT</b> a diagnostic tool. It does not perform image analysis, does not interpret medical images, and does not generate autonomous clinical diagnoses or therapeutic recommendations.",
    "legal.s2.title": "2. Limitation of Liability",
    "legal.s2.items": "All clinical content generated by Radiogen.AI is derived <b>exclusively from the radiologist's dictation</b>. The AI does not add clinical findings, diagnoses, or pathological assessments that were not dictated by the user.|The <b>radiologist is solely responsible</b> for reviewing, validating, modifying, and approving every report before it is delivered to patients, referring physicians, or incorporated into any medical record.|Radiogen.AI and its operators <b>assume no liability</b> for clinical decisions, diagnostic errors, omissions, or any adverse patient outcomes arising from the use of reports generated with this tool.|The user acknowledges that AI-generated text may contain errors, inaccuracies, or inappropriate phrasing, and accepts full responsibility for validating the final output.",
    "legal.s3.title": "3. Professional Responsibility",
    "legal.s3.intro": "By using Radiogen.AI, the radiologist confirms that:",
    "legal.s3.items": "They hold a valid medical license and are qualified to interpret radiological studies and issue radiology reports.|They will review every AI-generated report in its entirety before signing, delivering, or archiving it.|They understand that the AI is a drafting assistant and that the final medical judgment rests entirely with them.|They will not use the platform to replace professional radiological evaluation.",
    "legal.s4.title": "4. Data Privacy & Security",
    "legal.s4.items": "<b>No patient-identifiable data is required or stored.</b> The platform processes anonymous dictation text only. Users must not include patient names, IDs, dates of birth, or any other personally identifiable information (PII) in their dictation.|Dictation text and generated reports are stored in the user's account for style learning and report history purposes. This data is encrypted at rest and in transit.|API keys configured by the administrator are encrypted using AES-256-GCM before storage.|Radiogen.AI does not sell, share, or transfer user data to third parties for marketing or commercial purposes.|AI processing is performed through the language model provider configured by the administrator (e.g., OpenAI, DeepSeek, Anthropic). Dictation text is sent to these providers for processing. Users should review the privacy policies of the configured AI provider.|Users may request deletion of their account and all associated data at any time by contacting the administrator.",
    "legal.s5.title": "5. Prohibited Uses",
    "legal.s5.items": "Using Radiogen.AI as a substitute for professional radiological evaluation.|Including patient-identifiable information in dictations or clinical context fields.|Distributing AI-generated reports without prior review and validation by a qualified radiologist.|Reverse engineering, decompiling, or attempting to extract the source code or algorithms of the platform.|Sharing account credentials with unauthorized individuals.",
    "legal.s6.title": "6. Intellectual Property",
    "legal.s6.p": "The Radiogen.AI platform, including its code, design, algorithms, and documentation, is the intellectual property of its operators. Reports generated by the user belong to the user and their institution. The platform retains no ownership over the clinical content produced by its users.",
    "legal.s7.title": "7. Service Availability",
    "legal.s7.p": "Radiogen.AI is provided \"as is\" without warranties of any kind, express or implied. We do not guarantee uninterrupted service availability. The platform depends on third-party AI providers and infrastructure, which may experience downtime or service degradation outside our control.",
    "legal.s8.title": "8. Changes to These Terms",
    "legal.s8.p": "We reserve the right to modify these terms at any time. Users will be notified of material changes. Continued use of the platform after notification constitutes acceptance of the updated terms.",
    "legal.s9.title": "9. Contact",
    "legal.s9.p": "For questions, data deletion requests, or legal inquiries, please contact us at",
  },
};

export function usePublicLang() {
  const [lang, setLangState] = useState<PublicLang>("es");

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  const setLang = useCallback((l: PublicLang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // sync with dashboard prefs if present
    try {
      const raw = localStorage.getItem("radiogenai_ui_prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        prefs.uiLanguage = l;
        localStorage.setItem("radiogenai_ui_prefs", JSON.stringify(prefs));
      }
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = dict[lang][key] ?? dict.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(`{${k}}`, String(v));
        }
      }
      return s;
    },
    [lang],
  );

  return { lang, setLang, t };
}
