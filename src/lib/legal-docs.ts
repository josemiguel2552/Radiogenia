export type LegalDocType = "terms_of_use" | "privacy_policy" | "data_processing" | "ai_disclaimer";

export const LEGAL_DOC_TYPES: LegalDocType[] = ["terms_of_use", "privacy_policy", "data_processing", "ai_disclaimer"];

interface DocSection {
  title: string;
  content: string[];
}

interface LegalDoc {
  title: string;
  updated: string;
  sections: DocSection[];
}

type Docs = Record<LegalDocType, LegalDoc>;

export const LEGAL_DOCS: Record<string, Docs> = {
  es: {
    terms_of_use: {
      title: "Términos de Uso",
      updated: "Última actualización: mayo 2026",
      sections: [
        {
          title: "1. Naturaleza del Servicio",
          content: [
            "Radiogen.AI es una herramienta de asistencia a la redacción de informes radiológicos diseñada exclusivamente para radiólogos licenciados y profesionales médicos cualificados. La plataforma utiliza inteligencia artificial para ayudar a estructurar y redactar informes basándose en el propio dictado del radiólogo.",
            "Radiogen.AI NO es una herramienta de diagnóstico. No realiza análisis de imagen, no interpreta imágenes médicas y no genera diagnósticos clínicos autónomos ni recomendaciones terapéuticas.",
          ],
        },
        {
          title: "2. Aceptación de los Términos",
          content: [
            "Al acceder y utilizar Radiogen.AI, el usuario acepta íntegramente estos Términos de Uso. Si no está de acuerdo con alguna de las condiciones aquí establecidas, debe abstenerse de utilizar la plataforma.",
            "El uso continuado de la plataforma tras la publicación de modificaciones a estos términos constituye la aceptación de dichas modificaciones.",
          ],
        },
        {
          title: "3. Requisitos de Acceso",
          content: [
            "Para utilizar Radiogen.AI, el usuario debe: (a) poseer una licencia médica válida y estar cualificado para interpretar estudios radiológicos y emitir informes de radiología; (b) ser mayor de edad según la legislación de su país de residencia; (c) pertenecer a una organización o centro sanitario registrado en la plataforma, o haber sido invitado mediante un código de acceso válido.",
          ],
        },
        {
          title: "4. Limitación de Responsabilidad",
          content: [
            "Todo el contenido clínico generado por Radiogen.AI se deriva exclusivamente del dictado del radiólogo. La IA no añade hallazgos clínicos, diagnósticos ni valoraciones patológicas que no hayan sido dictados por el usuario.",
            "El radiólogo es el único responsable de revisar, validar, modificar y aprobar cada informe antes de su entrega a pacientes, médicos solicitantes o incorporación a cualquier historia clínica.",
            "Radiogen.AI y sus operadores no asumen responsabilidad alguna por decisiones clínicas, errores diagnósticos, omisiones o cualquier resultado adverso para pacientes derivado del uso de informes generados con esta herramienta.",
            "El usuario reconoce que el texto generado por IA puede contener errores, inexactitudes o expresiones inapropiadas, y acepta la plena responsabilidad de validar el resultado final.",
          ],
        },
        {
          title: "5. Responsabilidad Profesional",
          content: [
            "Al utilizar Radiogen.AI, el radiólogo confirma que: revisará cada informe generado por IA en su totalidad antes de firmarlo, entregarlo o archivarlo; entiende que la IA es un asistente de redacción y que el juicio médico final recae enteramente en el profesional; no utilizará la plataforma para sustituir la evaluación radiológica profesional.",
          ],
        },
        {
          title: "6. Usos Prohibidos",
          content: [
            "Queda expresamente prohibido: usar Radiogen.AI como sustituto de la evaluación radiológica profesional; incluir información identificativa de pacientes en dictados o campos de contexto clínico; distribuir informes generados por IA sin revisión y validación previa por un radiólogo cualificado; ingeniería inversa, descompilación o intento de extraer el código fuente o algoritmos de la plataforma; compartir credenciales de cuenta con personas no autorizadas; utilizar la plataforma para fines distintos a la redacción de informes radiológicos.",
          ],
        },
        {
          title: "7. Propiedad Intelectual",
          content: [
            "La plataforma Radiogen.AI, incluyendo su código, diseño, algoritmos, plantillas, documentación y marca, es propiedad intelectual de sus operadores. Los informes generados por el usuario pertenecen al usuario y a su institución. La plataforma no retiene propiedad alguna sobre el contenido clínico producido por sus usuarios.",
          ],
        },
        {
          title: "8. Disponibilidad del Servicio",
          content: [
            "Radiogen.AI se proporciona \"tal cual\" sin garantías de ningún tipo, expresas o implícitas. No garantizamos la disponibilidad ininterrumpida del servicio. La plataforma depende de infraestructura tecnológica que puede experimentar interrupciones o degradación del servicio fuera de nuestro control.",
          ],
        },
        {
          title: "9. Planes y Facturación",
          content: [
            "Los planes de suscripción y sus límites se detallan en la sección de precios. Los periodos de facturación se renuevan automáticamente cada 30 días. El usuario puede solicitar la baja o cambio de plan en cualquier momento contactando al administrador.",
          ],
        },
        {
          title: "10. Modificaciones",
          content: [
            "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios materiales a través de la plataforma. El uso continuado de la plataforma tras la notificación constituye la aceptación de los términos actualizados.",
          ],
        },
        {
          title: "11. Ley Aplicable",
          content: [
            "Estos términos se rigen por la legislación aplicable en la jurisdicción del operador de la plataforma. Para cualquier controversia derivada de estos términos, las partes se someten a los juzgados y tribunales competentes.",
          ],
        },
        {
          title: "12. Contacto",
          content: [
            "Para consultas, solicitudes de eliminación de datos o cuestiones legales, contáctenos en legal@radiogen.ai.",
          ],
        },
      ],
    },
    privacy_policy: {
      title: "Política de Privacidad",
      updated: "Última actualización: mayo 2026",
      sections: [
        {
          title: "1. Responsable del Tratamiento",
          content: [
            "El responsable del tratamiento de los datos personales es Radiogen.AI (en adelante, \"el Operador\"). Los datos de contacto para el ejercicio de derechos se encuentran al final de este documento.",
          ],
        },
        {
          title: "2. Datos Personales que Recopilamos",
          content: [
            "Datos de cuenta: nombre completo, dirección de correo electrónico, contraseña (hash), rol profesional, organización/hospital.",
            "Datos de uso: informes generados, historial de dictados (texto anonimizado), preferencias de estilo, plantillas personalizadas, registros de auditoría.",
            "Datos técnicos: dirección IP, user-agent del navegador, marcas de tiempo de acceso, logs de consentimiento.",
            "Datos de facturación: gestionados íntegramente por Stripe. Radiogen.AI no almacena números de tarjeta ni datos bancarios.",
            "NO se recopilan datos identificativos de pacientes. La plataforma está diseñada para procesar únicamente texto de dictado anonimizado. El usuario tiene la obligación de no incluir datos de pacientes en sus dictados.",
          ],
        },
        {
          title: "3. Finalidades y Base Legal del Tratamiento",
          content: [
            "Ejecución del contrato (Art. 6.1.b RGPD): prestación del servicio de asistencia a la redacción de informes, gestión de la cuenta de usuario, facturación y soporte.",
            "Interés legítimo (Art. 6.1.f RGPD): mejora del servicio mediante análisis de uso agregado (no individual), prevención de fraude y abuso, seguridad de la plataforma.",
            "Consentimiento (Art. 6.1.a RGPD): aprendizaje de estilo del usuario (personalización de informes), comunicaciones opcionales sobre el servicio.",
            "Obligación legal (Art. 6.1.c RGPD): conservación de registros de facturación y auditoría según la normativa fiscal y sanitaria aplicable.",
          ],
        },
        {
          title: "4. Periodo de Conservación",
          content: [
            "Datos de cuenta: mientras la cuenta esté activa, y hasta 30 días después de la solicitud de baja.",
            "Historial de informes y dictados: mientras la cuenta esté activa. Se eliminan junto con la cuenta.",
            "Datos de aprendizaje de estilo: mientras la cuenta esté activa.",
            "Registros de auditoría: 2 años desde su generación.",
            "Registros de consentimiento: 5 años desde la aceptación (para cumplimiento del Art. 7 RGPD).",
            "Datos de facturación: según la legislación fiscal aplicable (generalmente 5-6 años).",
          ],
        },
        {
          title: "5. Derechos del Interesado",
          content: [
            "De conformidad con el RGPD (Arts. 15-22), el usuario tiene derecho a: acceso a sus datos personales; rectificación de datos inexactos; supresión de sus datos (\"derecho al olvido\"); limitación del tratamiento; portabilidad de los datos; oposición al tratamiento; no ser objeto de decisiones automatizadas.",
            "Para ejercer cualquiera de estos derechos, el usuario puede enviar una solicitud a legal@radiogen.ai indicando claramente el derecho que desea ejercer y proporcionando su identificación. Responderemos en un plazo máximo de 30 días.",
            "El usuario tiene también derecho a presentar una reclamación ante la autoridad de control de protección de datos competente (en España, la AEPD).",
          ],
        },
        {
          title: "6. Transferencias Internacionales",
          content: [
            "El procesamiento de IA se realiza íntegramente en la infraestructura de Radiogen.AI. El texto de dictado anonimizado es procesado dentro de nuestra plataforma con medidas de seguridad que garantizan la protección de los datos.",
            "Cuando las necesidades del servicio requieran transferencias internacionales de datos, estas estarán amparadas por: las Cláusulas Contractuales Tipo de la Comisión Europea (SCCs); el marco de adecuación de la UE-EE.UU. (EU-U.S. Data Privacy Framework) cuando sea aplicable.",
          ],
        },
        {
          title: "7. Medidas de Seguridad",
          content: [
            "Radiogen.AI implementa las siguientes medidas técnicas y organizativas: cifrado AES-256-GCM de claves API y datos sensibles en reposo; cifrado TLS 1.3 para todas las comunicaciones en tránsito; HSTS con preload habilitado; Row-Level Security (RLS) en base de datos para aislamiento de usuarios; detección y eliminación automática de PII (datos identificativos de pacientes) en servidor; rate limiting por usuario en todos los endpoints; cabeceras de seguridad HTTP (X-Frame-Options, CSP, nosniff); registro de auditoría inmutable; sesiones con duración máxima de 6 horas; cookies seguras con SameSite=Lax.",
          ],
        },
        {
          title: "8. Cookies",
          content: [
            "Radiogen.AI utiliza cookies estrictamente necesarias para el funcionamiento del servicio (sesión de autenticación, preferencias de idioma). No se utilizan cookies de seguimiento ni de publicidad. El usuario puede consultar la política de cookies en el banner informativo al acceder a la plataforma.",
          ],
        },
        {
          title: "9. Contacto",
          content: [
            "Para consultas sobre privacidad, ejercicio de derechos o solicitudes de eliminación de datos: legal@radiogen.ai.",
          ],
        },
      ],
    },
    data_processing: {
      title: "Acuerdo de Tratamiento de Datos",
      updated: "Última actualización: mayo 2026",
      sections: [
        {
          title: "1. Objeto y Ámbito",
          content: [
            "Este Acuerdo de Tratamiento de Datos (DPA) establece las condiciones bajo las cuales Radiogen.AI procesa datos clínicos anonimizados en nombre del usuario y su organización, en cumplimiento del Art. 28 del RGPD.",
          ],
        },
        {
          title: "2. Categorías de Datos Procesados",
          content: [
            "Texto de dictado radiológico anonimizado (transcripción de voz a texto).",
            "Hallazgos y conclusiones de informes radiológicos (texto generado).",
            "Preferencias de estilo del radiólogo (frases normales, plantillas).",
            "NO se procesan datos identificativos de pacientes. El sistema detecta y elimina automáticamente cualquier dato personal (DNI, NIE, teléfonos, nombres, NHC, CPF, CURP, RUT, cédula) antes del procesamiento.",
          ],
        },
        {
          title: "3. Procesamiento mediante IA",
          content: [
            "El texto de dictado anonimizado se procesa mediante modelos de inteligencia artificial para las siguientes operaciones: generación de hallazgos estructurados a partir del dictado; generación de conclusiones radiológicas; corrección de errores de transcripción por voz; mejora de redacción.",
            "Radiogen.AI no utiliza los datos de los usuarios para entrenar modelos de IA. Todos los datos procesados son tratados de forma transitoria y no se almacenan con fines de entrenamiento.",
          ],
        },
        {
          title: "4. Subencargados",
          content: [
            "Radiogen.AI utiliza subencargados para la prestación del servicio. La lista actualizada de subencargados puede ser consultada por el administrador de la organización.",
            "El operador notificará a los usuarios sobre cambios en los subencargados con al menos 30 días de antelación.",
          ],
        },
        {
          title: "5. Medidas de Seguridad",
          content: [
            "Se aplican las medidas técnicas detalladas en la Política de Privacidad, incluyendo: cifrado en reposo y tránsito, aislamiento por usuario (RLS), detección automática de PII, registros de auditoría inmutables, rate limiting, y cabeceras de seguridad HTTP.",
          ],
        },
        {
          title: "6. Notificación de Brechas",
          content: [
            "En caso de brecha de seguridad que afecte a datos personales, Radiogen.AI notificará a la organización afectada en un plazo máximo de 72 horas desde la detección, de conformidad con el Art. 33 del RGPD. La notificación incluirá: naturaleza de la brecha, categorías de datos afectados, medidas adoptadas, y punto de contacto.",
          ],
        },
        {
          title: "7. Eliminación de Datos",
          content: [
            "A la finalización del servicio o a solicitud del usuario, Radiogen.AI eliminará todos los datos personales y contenido generado en un plazo máximo de 30 días, salvo que exista obligación legal de conservación. El usuario recibirá confirmación de la eliminación.",
          ],
        },
        {
          title: "8. Derechos de Auditoría",
          content: [
            "La organización cliente tiene derecho a solicitar información sobre las medidas de seguridad implementadas y los subencargados utilizados. Las solicitudes de auditoría deben dirigirse a legal@radiogen.ai con un preaviso mínimo de 30 días.",
          ],
        },
      ],
    },
    ai_disclaimer: {
      title: "Aviso sobre Inteligencia Artificial",
      updated: "Última actualización: mayo 2026",
      sections: [
        {
          title: "1. Naturaleza de la IA",
          content: [
            "Radiogen.AI utiliza modelos de lenguaje de inteligencia artificial (LLM) como asistente de redacción. La IA procesa el dictado del radiólogo y genera borradores de informes estructurados. La IA NO interpreta imágenes médicas, NO realiza diagnósticos y NO genera hallazgos clínicos que no hayan sido dictados por el usuario.",
          ],
        },
        {
          title: "2. Política de Cero Alucinaciones",
          content: [
            "El sistema está diseñado con una política estricta de \"cero alucinaciones\": la IA solo debe utilizar la información proporcionada en el dictado del radiólogo para generar el informe. No obstante, los modelos de lenguaje son probabilísticos y pueden, en casos excepcionales, introducir texto no dictado, omitir información dictada o reformular hallazgos de forma que altere su significado.",
            "Por esta razón, la revisión humana completa de cada informe antes de su uso clínico es OBLIGATORIA, no opcional.",
          ],
        },
        {
          title: "3. Limitaciones Conocidas",
          content: [
            "Errores de transcripción: el motor de voz a texto (Whisper) puede malinterpretar términos médicos, especialmente en entornos ruidosos o con acentos marcados. El sistema aplica correcciones automáticas, pero no es infalible.",
            "Terminología cruzada: aunque el sistema adapta su vocabulario por modalidad (TC, RM, ecografía, etc.), puede en ocasiones utilizar terminología incorrecta para la modalidad del estudio.",
            "Puntuación y estructura: la IA añade puntuación y estructura al dictado continuo, lo que puede ocasionalmente alterar la agrupación de hallazgos.",
            "Idioma: el sistema soporta español, inglés y portugués. La calidad de la corrección puede variar entre idiomas.",
          ],
        },
        {
          title: "4. Responsabilidad del Profesional",
          content: [
            "El radiólogo es el ÚNICO responsable del contenido final del informe radiológico. La firma o aprobación de un informe generado con asistencia de IA implica que el profesional ha revisado, validado y asume la responsabilidad completa de su contenido.",
            "Radiogen.AI no asume responsabilidad por errores, omisiones o consecuencias adversas derivadas de informes que no hayan sido adecuadamente revisados por un profesional cualificado.",
          ],
        },
        {
          title: "5. Sin Datos de Pacientes",
          content: [
            "La IA procesa exclusivamente texto de dictado. No tiene acceso a imágenes médicas, datos demográficos de pacientes ni historial clínico. El sistema detecta y elimina automáticamente datos identificativos de pacientes (PII) que puedan aparecer en el dictado antes del procesamiento.",
          ],
        },
        {
          title: "6. Transparencia",
          content: [
            "Radiogen.AI mantiene un registro de auditoría de todas las operaciones de IA: generación de hallazgos, conclusiones, correcciones de dictado y mejoras de redacción. Este registro está disponible para el administrador de la organización.",
            "Los costes asociados al procesamiento de IA se registran y son consultables en el panel de administración.",
          ],
        },
        {
          title: "7. Mejora Continua",
          content: [
            "El sistema de corrección de dictados y generación de informes se mejora continuamente. Los cambios en los modelos de IA, reglas de corrección o comportamiento del sistema se documentan y comunican a los administradores. Radiogen.AI no utiliza los datos de los usuarios para entrenar modelos de IA.",
          ],
        },
      ],
    },
  },
  en: {
    terms_of_use: {
      title: "Terms of Use",
      updated: "Last updated: May 2026",
      sections: [
        {
          title: "1. Nature of the Service",
          content: [
            "Radiogen.AI is a radiology report drafting assistance tool designed exclusively for licensed radiologists and qualified medical professionals. The platform uses artificial intelligence to help structure and draft reports based on the radiologist's own dictation.",
            "Radiogen.AI is NOT a diagnostic tool. It does not perform image analysis, does not interpret medical images, and does not generate autonomous clinical diagnoses or therapeutic recommendations.",
          ],
        },
        {
          title: "2. Acceptance of Terms",
          content: [
            "By accessing and using Radiogen.AI, the user fully accepts these Terms of Use. If you do not agree with any of the conditions set forth herein, you must refrain from using the platform.",
            "Continued use of the platform after the publication of modifications to these terms constitutes acceptance of said modifications.",
          ],
        },
        {
          title: "3. Access Requirements",
          content: [
            "To use Radiogen.AI, the user must: (a) hold a valid medical license and be qualified to interpret radiological studies and issue radiology reports; (b) be of legal age according to the legislation of their country of residence; (c) belong to an organization or healthcare center registered on the platform, or have been invited via a valid access code.",
          ],
        },
        {
          title: "4. Limitation of Liability",
          content: [
            "All clinical content generated by Radiogen.AI is derived exclusively from the radiologist's dictation. The AI does not add clinical findings, diagnoses, or pathological assessments that were not dictated by the user.",
            "The radiologist is solely responsible for reviewing, validating, modifying, and approving every report before it is delivered to patients, referring physicians, or incorporated into any medical record.",
            "Radiogen.AI and its operators assume no liability for clinical decisions, diagnostic errors, omissions, or any adverse patient outcomes arising from the use of reports generated with this tool.",
            "The user acknowledges that AI-generated text may contain errors, inaccuracies, or inappropriate phrasing, and accepts full responsibility for validating the final output.",
          ],
        },
        {
          title: "5. Professional Responsibility",
          content: [
            "By using Radiogen.AI, the radiologist confirms that: they will review every AI-generated report in its entirety before signing, delivering, or archiving it; they understand that the AI is a drafting assistant and that the final medical judgment rests entirely with them; they will not use the platform to replace professional radiological evaluation.",
          ],
        },
        {
          title: "6. Prohibited Uses",
          content: [
            "The following are expressly prohibited: using Radiogen.AI as a substitute for professional radiological evaluation; including patient-identifiable information in dictations or clinical context fields; distributing AI-generated reports without prior review and validation by a qualified radiologist; reverse engineering, decompiling, or attempting to extract the source code or algorithms of the platform; sharing account credentials with unauthorized individuals; using the platform for purposes other than radiology report drafting.",
          ],
        },
        {
          title: "7. Intellectual Property",
          content: [
            "The Radiogen.AI platform, including its code, design, algorithms, templates, documentation, and branding, is the intellectual property of its operators. Reports generated by the user belong to the user and their institution. The platform retains no ownership over the clinical content produced by its users.",
          ],
        },
        {
          title: "8. Service Availability",
          content: [
            "Radiogen.AI is provided \"as is\" without warranties of any kind, express or implied. We do not guarantee uninterrupted service availability. The platform depends on technology infrastructure that may experience downtime or service degradation outside our control.",
          ],
        },
        {
          title: "9. Plans and Billing",
          content: [
            "Subscription plans and their limits are detailed in the pricing section. Billing periods renew automatically every 30 days. Users may request cancellation or plan changes at any time by contacting the administrator.",
          ],
        },
        {
          title: "10. Modifications",
          content: [
            "We reserve the right to modify these terms at any time. Users will be notified of material changes through the platform. Continued use of the platform after notification constitutes acceptance of the updated terms.",
          ],
        },
        {
          title: "11. Governing Law",
          content: [
            "These terms are governed by the applicable legislation in the jurisdiction of the platform operator. For any dispute arising from these terms, the parties submit to the competent courts.",
          ],
        },
        {
          title: "12. Contact",
          content: [
            "For inquiries, data deletion requests, or legal matters, contact us at legal@radiogen.ai.",
          ],
        },
      ],
    },
    privacy_policy: {
      title: "Privacy Policy",
      updated: "Last updated: May 2026",
      sections: [
        {
          title: "1. Data Controller",
          content: [
            "The data controller for personal data is Radiogen.AI (hereinafter, \"the Operator\"). Contact details for exercising rights can be found at the end of this document.",
          ],
        },
        {
          title: "2. Personal Data We Collect",
          content: [
            "Account data: full name, email address, password (hash), professional role, organization/hospital.",
            "Usage data: generated reports, dictation history (anonymized text), style preferences, custom templates, audit logs.",
            "Technical data: IP address, browser user-agent, access timestamps, consent logs.",
            "Billing data: managed entirely by Stripe. Radiogen.AI does not store card numbers or banking data.",
            "NO patient-identifiable data is collected. The platform is designed to process only anonymized dictation text. Users are obligated not to include patient data in their dictations.",
          ],
        },
        {
          title: "3. Purposes and Legal Basis",
          content: [
            "Contract performance (Art. 6.1.b GDPR): provision of report drafting assistance, user account management, billing, and support.",
            "Legitimate interest (Art. 6.1.f GDPR): service improvement through aggregate usage analysis, fraud and abuse prevention, platform security.",
            "Consent (Art. 6.1.a GDPR): user style learning (report personalization), optional service communications.",
            "Legal obligation (Art. 6.1.c GDPR): retention of billing and audit records as required by applicable tax and healthcare regulations.",
          ],
        },
        {
          title: "4. Retention Period",
          content: [
            "Account data: while the account is active, and up to 30 days after deletion request.",
            "Report and dictation history: while the account is active. Deleted with the account.",
            "Style learning data: while the account is active.",
            "Audit logs: 2 years from generation.",
            "Consent records: 5 years from acceptance (for Art. 7 GDPR compliance).",
            "Billing data: as required by applicable tax legislation (generally 5-6 years).",
          ],
        },
        {
          title: "5. Data Subject Rights",
          content: [
            "Under the GDPR (Arts. 15-22), users have the right to: access their personal data; rectification of inaccurate data; erasure of their data (\"right to be forgotten\"); restriction of processing; data portability; objection to processing; not be subject to automated decisions.",
            "To exercise any of these rights, users may send a request to legal@radiogen.ai clearly stating the right they wish to exercise and providing identification. We will respond within a maximum of 30 days.",
            "Users also have the right to lodge a complaint with the competent data protection supervisory authority.",
          ],
        },
        {
          title: "6. International Transfers",
          content: [
            "AI processing is performed within the Radiogen.AI infrastructure. Anonymized dictation text is processed within our platform with security measures that ensure data protection.",
            "Where service requirements necessitate international data transfers, these are covered by: EU Standard Contractual Clauses (SCCs); the EU-U.S. Data Privacy Framework where applicable.",
          ],
        },
        {
          title: "7. Security Measures",
          content: [
            "Radiogen.AI implements the following technical and organizational measures: AES-256-GCM encryption of API keys and sensitive data at rest; TLS 1.3 encryption for all communications in transit; HSTS with preload enabled; database Row-Level Security (RLS) for user isolation; automatic server-side PII detection and removal; per-user rate limiting on all endpoints; HTTP security headers (X-Frame-Options, CSP, nosniff); immutable audit trail; maximum 6-hour sessions; secure cookies with SameSite=Lax.",
          ],
        },
        {
          title: "8. Cookies",
          content: [
            "Radiogen.AI uses strictly necessary cookies for service operation (authentication session, language preferences). No tracking or advertising cookies are used.",
          ],
        },
        {
          title: "9. Contact",
          content: [
            "For privacy inquiries, rights exercise, or data deletion requests: legal@radiogen.ai.",
          ],
        },
      ],
    },
    data_processing: {
      title: "Data Processing Agreement",
      updated: "Last updated: May 2026",
      sections: [
        { title: "1. Object and Scope", content: ["This Data Processing Agreement (DPA) establishes the conditions under which Radiogen.AI processes anonymized clinical data on behalf of the user and their organization, in compliance with Art. 28 of the GDPR."] },
        { title: "2. Data Categories Processed", content: ["Anonymized radiology dictation text (voice-to-text transcription).", "Report findings and conclusions (generated text).", "Radiologist style preferences (normal phrases, templates).", "NO patient-identifiable data is processed. The system automatically detects and removes any personal data (IDs, phone numbers, names, medical record numbers) before processing."] },
        { title: "3. AI Processing", content: ["Anonymized dictation text is processed through AI models for: generation of structured findings from dictation; generation of radiological conclusions; voice transcription error correction; writing improvement.", "Radiogen.AI does not use user data to train AI models. All processed data is handled transiently and is not stored for training purposes."] },
        { title: "4. Sub-processors", content: ["Radiogen.AI uses sub-processors for service provision. The updated list of sub-processors can be consulted by the organization administrator.", "The operator will notify users of changes to sub-processors with at least 30 days' notice."] },
        { title: "5. Security Measures", content: ["Technical measures detailed in the Privacy Policy apply, including: encryption at rest and in transit, per-user isolation (RLS), automatic PII detection, immutable audit logs, rate limiting, and HTTP security headers."] },
        { title: "6. Breach Notification", content: ["In the event of a security breach affecting personal data, Radiogen.AI will notify the affected organization within a maximum of 72 hours of detection, in accordance with Art. 33 of the GDPR."] },
        { title: "7. Data Deletion", content: ["Upon service termination or user request, Radiogen.AI will delete all personal data and generated content within a maximum of 30 days, unless legal retention obligations apply."] },
        { title: "8. Audit Rights", content: ["The client organization has the right to request information about security measures implemented and sub-processors used. Audit requests should be directed to legal@radiogen.ai with a minimum of 30 days' notice."] },
      ],
    },
    ai_disclaimer: {
      title: "AI Disclaimer",
      updated: "Last updated: May 2026",
      sections: [
        { title: "1. Nature of AI", content: ["Radiogen.AI uses large language models (LLMs) as a drafting assistant. The AI processes the radiologist's dictation and generates structured report drafts. The AI does NOT interpret medical images, does NOT make diagnoses, and does NOT generate clinical findings not dictated by the user."] },
        { title: "2. Zero Hallucination Policy", content: ["The system is designed with a strict \"zero hallucination\" policy: the AI should only use information provided in the radiologist's dictation. However, language models are probabilistic and may, in exceptional cases, introduce undictated text, omit dictated information, or rephrase findings in ways that alter meaning.", "For this reason, complete human review of every report before clinical use is MANDATORY, not optional."] },
        { title: "3. Known Limitations", content: ["Transcription errors: the speech-to-text engine (Whisper) may misinterpret medical terms, especially in noisy environments or with strong accents. Automatic corrections are applied but are not infallible.", "Cross-modality terminology: while the system adapts vocabulary by modality (CT, MRI, ultrasound, etc.), it may occasionally use incorrect terminology for the study modality.", "Punctuation and structure: the AI adds punctuation and structure to continuous dictation, which may occasionally alter finding groupings.", "Language: the system supports Spanish, English, and Portuguese. Correction quality may vary between languages."] },
        { title: "4. Professional Responsibility", content: ["The radiologist is the SOLE party responsible for the final content of the radiology report. Signing or approving an AI-assisted report implies that the professional has reviewed, validated, and assumes complete responsibility for its content.", "Radiogen.AI assumes no liability for errors, omissions, or adverse consequences arising from reports that have not been adequately reviewed by a qualified professional."] },
        { title: "5. No Patient Data", content: ["The AI processes only dictation text. It has no access to medical images, patient demographics, or clinical history. The system automatically detects and removes patient-identifiable data (PII) from dictation before processing."] },
        { title: "6. Transparency", content: ["Radiogen.AI maintains an audit trail of all AI operations: findings generation, conclusions, dictation corrections, and writing improvements. This log is available to the organization administrator.", "AI processing costs are recorded and can be consulted in the administration panel."] },
        { title: "7. Continuous Improvement", content: ["The dictation correction and report generation system is continuously improved. Changes to AI models, correction rules, or system behavior are documented and communicated to administrators. Radiogen.AI does not use user data to train AI models."] },
      ],
    },
  },
  pt: {
    terms_of_use: { title: "Termos de Uso", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Natureza do Serviço", content: ["Radiogen.AI é uma ferramenta de assistência à redação de laudos radiológicos projetada exclusivamente para radiologistas licenciados e profissionais médicos qualificados. A plataforma utiliza inteligência artificial para ajudar a estruturar e redigir laudos com base no próprio ditado do radiologista.", "Radiogen.AI NÃO é uma ferramenta de diagnóstico. Não realiza análise de imagens, não interpreta imagens médicas e não gera diagnósticos clínicos autônomos nem recomendações terapêuticas."] },
      { title: "2. Aceitação dos Termos", content: ["Ao acessar e utilizar o Radiogen.AI, o usuário aceita integralmente estes Termos de Uso."] },
      { title: "3. Limitação de Responsabilidade", content: ["Todo o conteúdo clínico gerado pelo Radiogen.AI é derivado exclusivamente do ditado do radiologista. O radiologista é o único responsável por revisar, validar e aprovar cada laudo antes de seu uso clínico.", "O Radiogen.AI e seus operadores não assumem responsabilidade alguma por decisões clínicas, erros diagnósticos ou qualquer resultado adverso decorrente do uso de laudos gerados com esta ferramenta."] },
      { title: "4. Responsabilidade Profissional", content: ["Ao utilizar o Radiogen.AI, o radiologista confirma que revisará cada laudo gerado por IA em sua totalidade antes de assiná-lo e que entende que a IA é um assistente de redação."] },
      { title: "5. Usos Proibidos", content: ["É proibido usar o Radiogen.AI como substituto da avaliação radiológica profissional, incluir dados identificáveis de pacientes, ou distribuir laudos sem revisão prévia."] },
      { title: "6. Contato", content: ["Para dúvidas ou questões legais: legal@radiogen.ai."] },
    ]},
    privacy_policy: { title: "Política de Privacidade", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Responsável pelo Tratamento", content: ["O responsável pelo tratamento dos dados pessoais é o Radiogen.AI."] },
      { title: "2. Dados Coletados", content: ["Dados de conta (nome, e-mail, senha hash, função profissional), dados de uso (laudos, ditados anonimizados, preferências), dados técnicos (IP, user-agent, timestamps). NÃO são coletados dados identificáveis de pacientes."] },
      { title: "3. Base Legal", content: ["Execução do contrato (Art. 6.1.b RGPD), interesse legítimo (Art. 6.1.f), consentimento (Art. 6.1.a), obrigação legal (Art. 6.1.c)."] },
      { title: "4. Direitos do Titular", content: ["Acesso, retificação, exclusão, limitação, portabilidade, oposição e decisões automatizadas (Arts. 15-22 RGPD/LGPD). Solicitações: legal@radiogen.ai, prazo de resposta: 30 dias."] },
      { title: "5. Transferências Internacionais", content: ["O processamento de IA é realizado na infraestrutura do Radiogen.AI. Quando necessárias, transferências internacionais de dados são amparadas por SCCs e o framework EU-EUA."] },
      { title: "6. Medidas de Segurança", content: ["Criptografia AES-256-GCM em repouso, TLS 1.3 em trânsito, RLS no banco de dados, detecção automática de PII, rate limiting, headers de segurança HTTP, trilha de auditoria imutável."] },
      { title: "7. Contato", content: ["legal@radiogen.ai."] },
    ]},
    data_processing: { title: "Acordo de Tratamento de Dados", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Objeto", content: ["Este DPA estabelece as condições de processamento de dados clínicos anonimizados pelo Radiogen.AI (Art. 28 RGPD/LGPD)."] },
      { title: "2. Dados Processados", content: ["Texto de ditado radiológico anonimizado, achados e conclusões de laudos, preferências de estilo. NÃO são processados dados identificáveis de pacientes."] },
      { title: "3. Processamento por IA", content: ["O texto anonimizado é processado por modelos de inteligência artificial para geração de achados, conclusões e correção de ditado. Os dados NÃO são usados para treinamento de modelos."] },
      { title: "4. Subprocessadores", content: ["O Radiogen.AI utiliza subprocessadores para a prestação do serviço. A lista atualizada pode ser consultada pelo administrador da organização."] },
      { title: "5. Notificação de Violações", content: ["Em caso de violação de segurança, o Radiogen.AI notificará a organização afetada em até 72 horas (Art. 33 RGPD)."] },
      { title: "6. Contato", content: ["legal@radiogen.ai."] },
    ]},
    ai_disclaimer: { title: "Aviso sobre Inteligência Artificial", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Natureza da IA", content: ["O Radiogen.AI utiliza modelos de linguagem (LLMs) como assistente de redação. A IA NÃO interpreta imagens médicas, NÃO faz diagnósticos e NÃO gera achados clínicos não ditados pelo usuário."] },
      { title: "2. Política de Zero Alucinações", content: ["O sistema é projetado para usar apenas informações ditadas pelo radiologista. No entanto, modelos de linguagem são probabilísticos e podem, em casos excepcionais, introduzir texto não ditado. A revisão humana completa é OBRIGATÓRIA."] },
      { title: "3. Limitações Conhecidas", content: ["Erros de transcrição, terminologia cruzada entre modalidades, alterações de pontuação e estrutura, variação de qualidade entre idiomas."] },
      { title: "4. Responsabilidade Profissional", content: ["O radiologista é o ÚNICO responsável pelo conteúdo final do laudo. A assinatura de um laudo gerado com assistência de IA implica revisão e validação completas."] },
      { title: "5. Sem Dados de Pacientes", content: ["A IA processa apenas texto de ditado anonimizado. Dados identificáveis são automaticamente detectados e removidos antes do processamento."] },
      { title: "6. Contato", content: ["legal@radiogen.ai."] },
    ]},
  },
};
