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
      updated: "Última actualización: junio 2026",
      sections: [
        {
          title: "1. Naturaleza del Servicio",
          content: [
            "Radiogen.AI es una herramienta de estructuración de informes radiológicos diseñada exclusivamente para radiólogos licenciados y profesionales médicos cualificados. La plataforma organiza y estructura la información que el radiólogo dicta en las secciones de hallazgos y conclusión del informe. El radiólogo decide qué información se incluye; la plataforma únicamente la organiza.",
            "Radiogen.AI NO es una herramienta de diagnóstico. No realiza análisis de imagen, no interpreta imágenes médicas, no genera diagnósticos clínicos autónomos, no emite recomendaciones terapéuticas y no añade información que el radiólogo no haya proporcionado. La herramienta se limita a estructurar y organizar el contenido dictado por el profesional.",
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
            "Todo el contenido clínico estructurado por Radiogen.AI se deriva exclusivamente del dictado del radiólogo. La plataforma no añade hallazgos clínicos, diagnósticos, recomendaciones ni valoraciones patológicas que no hayan sido dictados por el usuario. Su función se limita a organizar la información proporcionada en las secciones correspondientes del informe.",
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
            "Los planes de suscripción y sus límites se detallan en la sección de precios. Los periodos de facturación se renuevan automáticamente cada 30 días. El usuario puede solicitar la baja o cambio de plan en cualquier momento desde la configuración de su cuenta.",
            "Mejora de plan (upgrade): al mejorar a un plan superior, se cobra de inmediato el precio completo del nuevo plan y se inicia un nuevo ciclo de facturación de 30 días desde ese momento. No se aplica prorrateo ni se reembolsa el tiempo restante del plan anterior.",
            "Transferencia de uso en mejora de plan: los informes y minutos de dictado no utilizados del plan anterior se acumulan al nuevo plan durante el primer mes tras la mejora. Una vez finalizado ese primer ciclo de facturación del nuevo plan, el uso acumulado desaparece y los límites se restablecen a los valores normales del nuevo plan.",
            "Reducción de plan (downgrade): al cambiar a un plan inferior, el plan actual permanece activo con todas sus prestaciones hasta el final del periodo de facturación en curso. Una vez finalizado dicho periodo, la cuenta cambia automáticamente al plan inferior seleccionado.",
            "Cancelación: al cancelar la suscripción, el usuario conserva el acceso completo al plan contratado hasta que finalice el periodo de facturación en curso. Transcurrido ese periodo, la cuenta pasa automáticamente al plan gratuito.",
          ],
        },
        {
          title: "10. Modificaciones",
          content: [
            "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios materiales a través de la plataforma. El uso continuado de la plataforma tras la notificación constituye la aceptación de los términos actualizados.",
          ],
        },
        {
          title: "11. Política de Devoluciones",
          content: [
            "Radiogen.AI no emite reembolsos bajo ninguna circunstancia, incluyendo, sin limitación, mejoras de plan, reducciones de plan, cancelaciones, tiempo no utilizado de un periodo de facturación, insatisfacción con el servicio o cualquier otro motivo. Todas las suscripciones se facturan por periodo mensual y el acceso se mantiene hasta el final del periodo pagado.",
            "El usuario puede cancelar su suscripción en cualquier momento desde la configuración de su cuenta. No se realizarán cargos adicionales tras la cancelación.",
          ],
        },
        {
          title: "12. Ley Aplicable",
          content: [
            "Estos términos se rigen por la legislación aplicable en la jurisdicción del operador de la plataforma. Para cualquier controversia derivada de estos términos, las partes se someten a los juzgados y tribunales competentes.",
          ],
        },
        {
          title: "13. Contacto",
          content: [
            "Para consultas, solicitudes de eliminación de datos o cuestiones legales, contáctenos en info@radiogen.ai.",
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
            "Para ejercer cualquiera de estos derechos, el usuario puede enviar una solicitud a info@radiogen.ai indicando claramente el derecho que desea ejercer y proporcionando su identificación. Responderemos en un plazo máximo de 30 días.",
            "El usuario tiene también derecho a presentar una reclamación ante la autoridad de control de protección de datos competente (en España, la AEPD).",
          ],
        },
        {
          title: "6. Transferencias Internacionales y Procesamiento de IA",
          content: [
            "Para la generación de informes, Radiogen.AI envía texto clínico anonimizado a proveedores externos de inteligencia artificial mediante APIs seguras. Antes de cada envío, el sistema aplica de forma obligatoria un filtro de anonimización que detecta y elimina automáticamente cualquier dato identificativo del paciente (nombres, DNI/NIE/CURP/CPF/RUT/cédula, teléfonos, emails, números de historia clínica). Este filtro no puede ser desactivado por el usuario y se ejecuta tanto en el cliente como en el servidor.",
            "Los proveedores de IA utilizados operan bajo acuerdos de procesamiento de datos (DPA) que garantizan: política de retención cero (zero data retention) — los textos enviados no se almacenan ni se utilizan para entrenamiento de modelos de IA; cifrado TLS 1.3 en tránsito; cumplimiento con estándares de seguridad SOC 2 y, cuando aplique, HIPAA (BAA).",
            "En consecuencia, ningún dato identificativo de pacientes es transferido internacionalmente. Los únicos datos enviados a procesamiento externo son descripciones clínicas anonimizadas (ej.: \"masa de 3 cm en lóbulo superior derecho\") que, al carecer de información identificativa, no constituyen datos personales de salud según el RGPD (Considerando 26) ni la mayoría de normativas latinoamericanas de protección de datos.",
            "Los datos personales de los usuarios (cuenta, preferencias, historial de informes) se almacenan exclusivamente en la infraestructura de Radiogen.AI con las medidas de seguridad detalladas en la sección 7.",
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
            "Para consultas sobre privacidad, ejercicio de derechos o solicitudes de eliminación de datos: info@radiogen.ai.",
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
            "El texto de dictado anonimizado se procesa a través de APIs seguras para las siguientes operaciones: estructuración y organización de hallazgos a partir del dictado del radiólogo; organización de conclusiones radiológicas basadas en el dictado; corrección de errores de transcripción por voz; mejora de redacción. En ningún caso se generan diagnósticos ni recomendaciones clínicas.",
            "Antes de cada envío, un filtro obligatorio de anonimización elimina automáticamente cualquier dato identificativo del paciente. Este filtro opera en doble capa (cliente y servidor) y no puede ser desactivado.",
            "Los proveedores de IA operan bajo contratos con política de retención cero (zero data retention): los textos procesados no se almacenan ni se utilizan para entrenamiento de modelos. Radiogen.AI no utiliza los datos de los usuarios para entrenar modelos de IA.",
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
            "La organización cliente tiene derecho a solicitar información sobre las medidas de seguridad implementadas y los subencargados utilizados. Las solicitudes de auditoría deben dirigirse a info@radiogen.ai con un preaviso mínimo de 30 días.",
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
            "Radiogen.AI es una herramienta de estructuración de informes radiológicos. La plataforma toma el dictado del radiólogo y lo organiza en las secciones de hallazgos y conclusión, estructurando la información que el profesional autoriza y escribe. Radiogen.AI NO interpreta imágenes médicas, NO realiza diagnósticos, NO emite recomendaciones clínicas ni terapéuticas, y NO genera hallazgos que no hayan sido dictados por el usuario. La plataforma es exclusivamente una herramienta de organización y estructuración del contenido proporcionado por el radiólogo.",
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
      updated: "Last updated: June 2026",
      sections: [
        {
          title: "1. Nature of the Service",
          content: [
            "Radiogen.AI is a radiology report structuring tool designed exclusively for licensed radiologists and qualified medical professionals. The platform organizes and structures the information dictated by the radiologist into the findings and conclusion sections of the report. The radiologist decides what information is included; the platform only organizes it.",
            "Radiogen.AI is NOT a diagnostic tool. It does not perform image analysis, does not interpret medical images, does not generate autonomous clinical diagnoses, does not issue therapeutic recommendations, and does not add information not provided by the radiologist. The tool is limited to structuring and organizing content dictated by the professional.",
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
            "All clinical content structured by Radiogen.AI is derived exclusively from the radiologist's dictation. The platform does not add clinical findings, diagnoses, recommendations, or pathological assessments not dictated by the user. Its function is limited to organizing the provided information into the corresponding report sections.",
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
            "Subscription plans and their limits are detailed in the pricing section. Billing periods renew automatically every 30 days. Users may request cancellation or plan changes at any time from their account settings.",
            "Plan upgrade: when upgrading to a higher plan, the full price of the new plan is charged immediately and a new 30-day billing cycle begins from that moment. No proration is applied and the remaining time on the previous plan is not refunded.",
            "Usage carryover on upgrade: unused reports and dictation minutes from the previous plan carry over into the new plan for the first month after the upgrade. Once that first billing cycle of the new plan ends, the carried-over usage expires and limits reset to the new plan's standard allowances.",
            "Plan downgrade: when switching to a lower plan, the current plan remains active with all its features until the end of the current billing period. Once that period ends, the account automatically switches to the selected lower plan.",
            "Cancellation: when a subscription is cancelled, the user retains full access to the subscribed plan until the end of the current billing period. After that period, the account automatically switches to the free plan.",
          ],
        },
        {
          title: "10. Modifications",
          content: [
            "We reserve the right to modify these terms at any time. Users will be notified of material changes through the platform. Continued use of the platform after notification constitutes acceptance of the updated terms.",
          ],
        },
        {
          title: "11. Refund Policy",
          content: [
            "Radiogen.AI does not issue refunds under any circumstances, including but not limited to plan upgrades, plan downgrades, cancellations, unused time within a billing period, dissatisfaction with the service, or any other reason. All subscriptions are billed on a monthly basis and access is maintained until the end of the paid period.",
            "Users may cancel their subscription at any time from their account settings. No additional charges will be made after cancellation.",
          ],
        },
        {
          title: "12. Governing Law",
          content: [
            "These terms are governed by the applicable legislation in the jurisdiction of the platform operator. For any dispute arising from these terms, the parties submit to the competent courts.",
          ],
        },
        {
          title: "13. Contact",
          content: [
            "For inquiries, data deletion requests, or legal matters, contact us at info@radiogen.ai.",
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
            "To exercise any of these rights, users may send a request to info@radiogen.ai clearly stating the right they wish to exercise and providing identification. We will respond within a maximum of 30 days.",
            "Users also have the right to lodge a complaint with the competent data protection supervisory authority.",
          ],
        },
        {
          title: "6. International Transfers and AI Processing",
          content: [
            "To generate reports, Radiogen.AI sends anonymized clinical text to external AI providers via secure APIs. Before each transmission, the system applies a mandatory anonymization filter that automatically detects and removes any patient-identifiable data (names, national IDs, phone numbers, emails, medical record numbers). This filter cannot be disabled by the user and runs on both the client and server side.",
            "AI providers operate under Data Processing Agreements (DPAs) that guarantee: zero data retention policy — submitted texts are not stored or used for AI model training; TLS 1.3 encryption in transit; SOC 2 compliance and, where applicable, HIPAA (BAA) compliance.",
            "Consequently, no patient-identifiable data is transferred internationally. The only data sent for external processing consists of anonymized clinical descriptions (e.g., \"3 cm mass in the right upper lobe\") which, lacking identifiable information, do not constitute personal health data under the GDPR (Recital 26) or most data protection regulations.",
            "Users' personal data (account, preferences, report history) is stored exclusively within Radiogen.AI infrastructure with the security measures detailed in section 7.",
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
            "For privacy inquiries, rights exercise, or data deletion requests: info@radiogen.ai.",
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
        { title: "3. AI Processing", content: ["Anonymized dictation text is processed through secure APIs for: structuring and organizing findings from the radiologist's dictation; organizing radiological conclusions based on dictation; voice transcription error correction; writing improvement. In no case are diagnoses or clinical recommendations generated.", "Before each transmission, a mandatory anonymization filter automatically removes any patient-identifiable data. This filter operates in dual layers (client and server) and cannot be disabled.", "AI providers operate under contracts with zero data retention policy: processed texts are not stored or used for model training. Radiogen.AI does not use user data to train AI models."] },
        { title: "4. Sub-processors", content: ["Radiogen.AI uses sub-processors for service provision. The updated list of sub-processors can be consulted by the organization administrator.", "The operator will notify users of changes to sub-processors with at least 30 days' notice."] },
        { title: "5. Security Measures", content: ["Technical measures detailed in the Privacy Policy apply, including: encryption at rest and in transit, per-user isolation (RLS), automatic PII detection, immutable audit logs, rate limiting, and HTTP security headers."] },
        { title: "6. Breach Notification", content: ["In the event of a security breach affecting personal data, Radiogen.AI will notify the affected organization within a maximum of 72 hours of detection, in accordance with Art. 33 of the GDPR."] },
        { title: "7. Data Deletion", content: ["Upon service termination or user request, Radiogen.AI will delete all personal data and generated content within a maximum of 30 days, unless legal retention obligations apply."] },
        { title: "8. Audit Rights", content: ["The client organization has the right to request information about security measures implemented and sub-processors used. Audit requests should be directed to info@radiogen.ai with a minimum of 30 days' notice."] },
      ],
    },
    ai_disclaimer: {
      title: "AI Disclaimer",
      updated: "Last updated: May 2026",
      sections: [
        { title: "1. Nature of AI", content: ["Radiogen.AI is a radiology report structuring tool. The platform takes the radiologist's dictation and organizes it into findings and conclusion sections, structuring the information that the professional authorizes and writes. Radiogen.AI does NOT interpret medical images, does NOT make diagnoses, does NOT issue clinical or therapeutic recommendations, and does NOT generate findings not dictated by the user. The platform is exclusively an organizing and structuring tool for content provided by the radiologist."] },
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
    terms_of_use: { title: "Termos de Uso", updated: "Última atualização: junho 2026", sections: [
      { title: "1. Natureza do Serviço", content: ["Radiogen.AI é uma ferramenta de estruturação de laudos radiológicos projetada exclusivamente para radiologistas licenciados e profissionais médicos qualificados. A plataforma organiza e estrutura as informações ditadas pelo radiologista nas seções de achados e conclusão do laudo. O radiologista decide quais informações são incluídas; a plataforma apenas as organiza.", "Radiogen.AI NÃO é uma ferramenta de diagnóstico. Não realiza análise de imagens, não interpreta imagens médicas, não gera diagnósticos clínicos autônomos, não emite recomendações terapêuticas e não adiciona informações não fornecidas pelo radiologista. A ferramenta limita-se a estruturar e organizar o conteúdo ditado pelo profissional."] },
      { title: "2. Aceitação dos Termos", content: ["Ao acessar e utilizar o Radiogen.AI, o usuário aceita integralmente estes Termos de Uso."] },
      { title: "3. Limitação de Responsabilidade", content: ["Todo o conteúdo clínico estruturado pelo Radiogen.AI é derivado exclusivamente do ditado do radiologista. A plataforma não adiciona achados clínicos, diagnósticos, recomendações nem avaliações patológicas não ditadas pelo usuário. O radiologista é o único responsável por revisar, validar e aprovar cada laudo antes de seu uso clínico.", "O Radiogen.AI e seus operadores não assumem responsabilidade alguma por decisões clínicas, erros diagnósticos ou qualquer resultado adverso decorrente do uso de laudos estruturados com esta ferramenta."] },
      { title: "4. Responsabilidade Profissional", content: ["Ao utilizar o Radiogen.AI, o radiologista confirma que revisará cada laudo gerado por IA em sua totalidade antes de assiná-lo e que entende que a IA é um assistente de redação."] },
      { title: "5. Usos Proibidos", content: ["É proibido usar o Radiogen.AI como substituto da avaliação radiológica profissional, incluir dados identificáveis de pacientes, ou distribuir laudos sem revisão prévia."] },
      { title: "6. Planos e Faturamento", content: [
        "Os planos de assinatura e seus limites estão detalhados na seção de preços. Os períodos de faturamento são renovados automaticamente a cada 30 dias. O usuário pode solicitar cancelamento ou alteração de plano a qualquer momento nas configurações da conta.",
        "Upgrade de plano: ao fazer upgrade para um plano superior, o preço completo do novo plano é cobrado imediatamente e um novo ciclo de faturamento de 30 dias começa a partir desse momento. Não há rateio e o tempo restante do plano anterior não é reembolsado.",
        "Transferência de uso no upgrade: os laudos e minutos de ditado não utilizados do plano anterior são transferidos para o novo plano durante o primeiro mês após o upgrade. Ao final desse primeiro ciclo de faturamento do novo plano, o uso transferido expira e os limites são redefinidos para os valores padrão do novo plano.",
        "Downgrade de plano: ao mudar para um plano inferior, o plano atual permanece ativo com todos os seus recursos até o final do período de faturamento em curso. Após esse período, a conta muda automaticamente para o plano inferior selecionado.",
        "Cancelamento: ao cancelar a assinatura, o usuário mantém o acesso completo ao plano contratado até o final do período de faturamento atual. Após esse período, a conta passa automaticamente para o plano gratuito.",
      ] },
      { title: "7. Política de Reembolso", content: ["O Radiogen.AI não emite reembolsos sob nenhuma circunstância, incluindo, sem limitação, upgrades de plano, downgrades de plano, cancelamentos, tempo não utilizado dentro de um período de faturamento, insatisfação com o serviço ou qualquer outro motivo. Todas as assinaturas são cobradas mensalmente e o acesso é mantido até o final do período pago.", "O usuário pode cancelar sua assinatura a qualquer momento nas configurações da conta. Nenhuma cobrança adicional será realizada após o cancelamento."] },
      { title: "8. Contato", content: ["Para dúvidas ou questões legais: info@radiogen.ai."] },
    ]},
    privacy_policy: { title: "Política de Privacidade", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Responsável pelo Tratamento", content: ["O responsável pelo tratamento dos dados pessoais é o Radiogen.AI."] },
      { title: "2. Dados Coletados", content: ["Dados de conta (nome, e-mail, senha hash, função profissional), dados de uso (laudos, ditados anonimizados, preferências), dados técnicos (IP, user-agent, timestamps). NÃO são coletados dados identificáveis de pacientes."] },
      { title: "3. Base Legal", content: ["Execução do contrato (Art. 6.1.b RGPD), interesse legítimo (Art. 6.1.f), consentimento (Art. 6.1.a), obrigação legal (Art. 6.1.c)."] },
      { title: "4. Direitos do Titular", content: ["Acesso, retificação, exclusão, limitação, portabilidade, oposição e decisões automatizadas (Arts. 15-22 RGPD/LGPD). Solicitações: info@radiogen.ai, prazo de resposta: 30 dias."] },
      { title: "5. Transferências Internacionais e Processamento de IA", content: ["Para a geração de laudos, o Radiogen.AI envia texto clínico anonimizado a provedores externos de inteligência artificial por meio de APIs seguras. Antes de cada envio, o sistema aplica obrigatoriamente um filtro de anonimização que detecta e remove automaticamente qualquer dado identificável do paciente (nomes, CPF/RG, telefones, e-mails, números de prontuário). Este filtro não pode ser desativado pelo usuário e é executado tanto no cliente quanto no servidor.", "Os provedores de IA operam sob acordos de processamento de dados (DPA) que garantem: política de retenção zero — os textos enviados não são armazenados nem utilizados para treinamento de modelos; criptografia TLS 1.3 em trânsito; conformidade SOC 2 e, quando aplicável, HIPAA (BAA).", "Nenhum dado identificável de pacientes é transferido internacionalmente. Os dados pessoais dos usuários são armazenados exclusivamente na infraestrutura do Radiogen.AI."] },
      { title: "6. Medidas de Segurança", content: ["Criptografia AES-256-GCM em repouso, TLS 1.3 em trânsito, RLS no banco de dados, detecção automática de PII, rate limiting, headers de segurança HTTP, trilha de auditoria imutável."] },
      { title: "7. Contato", content: ["info@radiogen.ai."] },
    ]},
    data_processing: { title: "Acordo de Tratamento de Dados", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Objeto", content: ["Este DPA estabelece as condições de processamento de dados clínicos anonimizados pelo Radiogen.AI (Art. 28 RGPD/LGPD)."] },
      { title: "2. Dados Processados", content: ["Texto de ditado radiológico anonimizado, achados e conclusões de laudos, preferências de estilo. NÃO são processados dados identificáveis de pacientes."] },
      { title: "3. Processamento por IA", content: ["O texto anonimizado de ditado é processado por meio de APIs seguras para: estruturação e organização de achados a partir do ditado do radiologista; organização de conclusões radiológicas com base no ditado; correção de erros de transcrição de voz; melhoria de redação. Em nenhum caso são gerados diagnósticos nem recomendações clínicas.", "Antes de cada envio, um filtro obrigatório de anonimização remove automaticamente qualquer dado identificável do paciente. Os provedores operam sob política de retenção zero e os dados NÃO são usados para treinamento de modelos."] },
      { title: "4. Subprocessadores", content: ["O Radiogen.AI utiliza subprocessadores para a prestação do serviço. A lista atualizada pode ser consultada pelo administrador da organização."] },
      { title: "5. Notificação de Violações", content: ["Em caso de violação de segurança, o Radiogen.AI notificará a organização afetada em até 72 horas (Art. 33 RGPD)."] },
      { title: "6. Contato", content: ["info@radiogen.ai."] },
    ]},
    ai_disclaimer: { title: "Aviso sobre Inteligência Artificial", updated: "Última atualização: maio 2026", sections: [
      { title: "1. Natureza da IA", content: ["O Radiogen.AI é uma ferramenta de estruturação de laudos radiológicos. A plataforma organiza as informações ditadas pelo radiologista nas seções de achados e conclusão. O Radiogen.AI NÃO interpreta imagens médicas, NÃO faz diagnósticos, NÃO emite recomendações clínicas e NÃO gera achados não ditados pelo usuário. A plataforma é exclusivamente uma ferramenta de organização e estruturação do conteúdo fornecido pelo radiologista."] },
      { title: "2. Política de Zero Alucinações", content: ["O sistema é projetado para usar apenas informações ditadas pelo radiologista. No entanto, modelos de linguagem são probabilísticos e podem, em casos excepcionais, introduzir texto não ditado. A revisão humana completa é OBRIGATÓRIA."] },
      { title: "3. Limitações Conhecidas", content: ["Erros de transcrição, terminologia cruzada entre modalidades, alterações de pontuação e estrutura, variação de qualidade entre idiomas."] },
      { title: "4. Responsabilidade Profissional", content: ["O radiologista é o ÚNICO responsável pelo conteúdo final do laudo. A assinatura de um laudo gerado com assistência de IA implica revisão e validação completas."] },
      { title: "5. Sem Dados de Pacientes", content: ["A IA processa apenas texto de ditado anonimizado. Dados identificáveis são automaticamente detectados e removidos antes do processamento."] },
      { title: "6. Contato", content: ["info@radiogen.ai."] },
    ]},
  },
};
