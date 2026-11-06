"use client";

import { useCallback } from "react";
import { useUIPrefs, type UILanguage } from "./ui-prefs";

const ui: Record<UILanguage, Record<string, string>> = {
  es: {
    // Common
    save: "Guardar", cancel: "Cancelar", delete: "Eliminar", edit: "Editar",
    duplicate: "Duplicar", search: "Buscar", loading: "Cargando...", close: "Cerrar",
    view: "Ver", reset: "Restablecer", confirm: "Confirmar", copy: "Copiar", copied: "Copiado",
    approve: "Aprobar", reject: "Rechazar", "approve_all": "Aprobar todas",
    upload: "Subir", new: "Nuevo", custom: "Personalizada", global: "Global",
    word: "palabra", words: "palabras", other: "Otros",
    "confirm_delete": "¿Está seguro de que desea eliminar?",
    "no_match_search": "Sin resultados para la búsqueda",
    "gen_error": "Error",
    "gen.phase_findings": "Estructurando hallazgos…",
    "gen.phase_conclusion": "Redactando conclusión…",
    "gen_error_findings": "Error al generar hallazgos",
    "gen_error_conclusion": "Error al generar conclusión",
    "clinical_check.button": "Revisar informe",
    "clinical_check.recheck": "Volver a revisar",
    "clinical_check.running": "Analizando...",
    "conclusion.diag_warning": "Revisa: la conclusión podría contener lenguaje interpretativo o diagnóstico. La herramienta solo describe hallazgos; el diagnóstico es tu responsabilidad. Términos detectados:",
    "conclusion.diag_dismiss": "Descartar",
    "clinical_check.title": "Sugerencias clínicas",
    "clinical_check.beta": "Beta",
    "clinical_check.hint": "Datos que podrían mejorar el informe",
    "clinical_check.no_suggestions": "No se encontraron datos faltantes relevantes.",
    "clinical_check.add": "Añadir",
    "clinical_check.skip": "Omitir",
    "clinical_check.dismiss": "Cerrar",
    "clinical_check.added": "Dato añadido al informe",
    "clinical_check.section_not_found": "Sección no encontrada, dato añadido a otros hallazgos",
    "gen_error_unknown": "Error desconocido",
    job: "Trabajo", status: "Estado", model: "Modelo", use: "Usar",
    "stats.title": "Estadísticas", "stats.all_time": "Total histórico",
    "stats.total_reports": "Informes totales", "stats.this_month": "Este mes",
    "stats.plan": "Plan actual", "stats.remaining": "Restantes",
    "stats.no_reports": "Sin informes en este periodo",
    "stats.dictation_used": "Dictado (Beta)",
    "stats.today": "Hoy", "stats.week": "Semana", "stats.month": "Mes",
    "limit.title": "Límite de informes alcanzado",
    "limit.title_dictation": "Límite de dictado alcanzado",
    "limit.desc": "Has usado {used} de {limit} informes de tu plan {plan} este mes.",
    "limit.desc_dictation": "Has usado {used} de {limit} minutos de dictado de tu plan {plan} este mes.",
    "limit.upgrade": "Subir de plan",
    "limit.buy_extra": "Comprar 100 informes extra",
    "limit.buy_extra_price": "por ${price}",
    "confirm_delete_template": "¿Eliminar esta plantilla?",
    "confirm_delete_recommendation": "¿Eliminar esta recomendación?",
    // Dashboard
    "rd.button": "Dictar desde el móvil",
    "rd.scan": "Escanea este código con la cámara del móvil",
    "rd.scan_hint": "Se abrirá una página en el teléfono para dictar. El texto aparece aquí, en la caja de dictado.",
    "rd.waiting": "Esperando al móvil…",
    "rd.connected": "Móvil vinculado",
    "rd.connected_hint": "Ya puedes dictar desde el teléfono. El texto aparecerá en la caja de dictado.",
    "rd.phone_recording": "Dictando desde el móvil…",
    "rd.disconnect": "Desvincular móvil",
    "rd.link_info": "El vínculo dura hasta 8 horas o hasta que lo desvincules.",
    "rd.error": "No se pudo generar el código. Inténtalo de nuevo.",
    "verify.banner": "Confirma tu email para mantener el acceso — te quedan {0} días. Te enviamos un enlace al registrarte (revisa también el spam).",
    "verify.resend": "Reenviar correo",
    "verify.sending": "Enviando…",
    "verify.sent": "Enviado ✓ Revisa tu bandeja",
    "trace.title": "Trazabilidad",
    "trace.all_verified": "Todo verificado",
    "trace.omissions": "omisiones",
    "trace.hallucinations": "alucinaciones",
    "trace.auto_repaired": "Se integraron {0} hallazgo(s) omitido(s) automáticamente",
    "trace.auto_repaired_count": "corregido(s) automáticamente",
    "trace.repaired_title": "Correcciones automáticas (ya incluidos en el informe)",
    "trace.omitted_title": "Omisiones (NO incluidos en el informe)",
    "trace.hallucination_title": "No dictado (alucinación)",
    "error.empty_generation": "No se pudo generar el informe. Compruebe la configuración del modelo de IA o inténtelo de nuevo.",
    // Navigation
    "nav.dashboard": "Panel principal",
    "nav.admin": "Panel de administración",
    "nav.toggle_theme": "Cambiar tema",
    "nav.hide_panel": "Ocultar panel de herramientas",
    "nav.show_panel": "Mostrar panel de herramientas",
    "nav.sign_out": "Cerrar sesión",
    "nav.hospital": "Hospital",
    "nav.support": "Soporte",
    "nav.full_guide": "Guía completa",
    "nav.layout_columns": "Vista en columnas (dictado e informe lado a lado)",
    "nav.layout_vertical": "Vista vertical",
    "nav.layout_label": "Vista",
    "nav.signature_label": "Firma",
    "nav.language_label": "Idioma",
    "nav.rail_reports": "Informes",
    "nav.rail_templates": "Plantillas",
    "nav.rail_calculators": "Calculadoras",
    "nav.rail_game": "Juego",
    "nav.rail_recommendations": "Guías",
    "nav.rail_account": "Cuenta",
    "nav.recent": "Recientes",
    "recent.title": "Informes recientes",
    "recent.empty": "Aún no hay informes en esta sesión",
    "recent.hint": "Solo en este dispositivo · se borran al cerrar sesión",
    "recent.untitled": "Informe sin título",
    "nav.drag_resize": "Arrastrar para redimensionar",
    "nav.tools": "Herramientas",
    "nav.help": "Ayuda",
    "toast.copied": "Copiado al portapapeles",
    "toast.report_saved": "Informe guardado",
    "toast.report_autosaved": "Guardado automáticamente ✓",
    "toast.report_error_sent": "Error reportado",
    "toast.generation_error": "Error al generar el informe",
    "toast.new_report": "Nuevo informe",
    "toast.generation_stopped": "Generación detenida",
    "toast.report_restored": "Informe anterior restaurado",
    "onboarding.welcome": "Bienvenido a Radiogen.AI",
    "onboarding.next": "Siguiente",
    "onboarding.prev": "Anterior",
    "onboarding.start": "Empezar",
    "onboarding.full_guide": "Ver guía completa",
    // Top navigation tabs
    "nav.reports": "Informes",
    "nav.templates": "Plantillas",
    "nav.calculators": "Calculadoras",
    "nav.game": "Juego",
    "nav.config": "Configuración",
    // Sidebar tabs (legacy keys kept for compat)
    "tab.templates": "Plantillas", "tab.guidelines": "Guías clínicas",
    "tab.config": "Config. IA", "tab.appearance": "Apariencia",
    // Calculators tab
    // Adrenal washout
    // Thyroid volume
    // Prostate volume
    // TI-RADS
    // PI-RADS
    // Bosniak
    // ASPECTS
    // Fleischner
    // Liver incidental
    // Adrenal incidental
    // Pancreatic cyst
    // LI-RADS
    // O-RADS
    // On-track / Off-track
    // Lung-RADS
    // BI-RADS
    // BTS
    // Ovarian incidental
    // Gallbladder polyps
    // Aortic aneurysm
    // Spine nomenclature
    // Foraminal stenosis
    // Canal stenosis
    // MRI Anatomy – Shoulder
    // MRI Anatomy – Knee
    // MRI Anatomy – Ankle
    // Thigh & leg MRI
    // Neck anatomy
    // Rotator cuff
    // Bone tumors
    // Vertebral fractures
    // Nodule doubling time calculator
    // Resistive index cheat sheet
    // Transplant US cheat sheet
    // CT perfusion cheat sheet
    // BI-RADS v2025
    // Complex infarct syndromes
    // Demyelinating diseases
    // Degenerative diseases
    // Interstitial lung diseases
    // Pediatric hip US
    // Manual recommendations panel
    "nav.recommendations": "Recomendaciones",
    "nav.account": "Mi cuenta",
    "bot.welcome_title": "Pregúntame sobre radiología",
    "bot.welcome_desc": "Puedo responder preguntas basándome en las calculadoras y recomendaciones disponibles.",
    "bot.placeholder": "Escribe tu pregunta...",
    "bot.thinking": "Pensando...",
    "bot.error": "Error al procesar la consulta. Inténtalo de nuevo.",
    "bot.disclaimer": "Solo responde con información de calculadoras y recomendaciones",
    "tplbot.title": "Asistente de plantillas",
    "tplbot.welcome_title": "¿Qué plantilla necesitas?",
    "tplbot.welcome_desc": "Puedo crear, modificar o consultar plantillas de informes radiológicos.",
    "tplbot.placeholder": "Describe la plantilla que necesitas...",
    "tplbot.thinking": "Pensando...",
    "tplbot.error": "Error al procesar la consulta. Inténtalo de nuevo.",
    "tplbot.disclaimer": "Solo crea y modifica plantillas de informes radiológicos",
    "tplbot.save_template": "Guardar plantilla",
    "tplbot.saved": "Plantilla guardada",
    // Resident verification
    // Account
    "limit.unlimited_label": "informes y dictado ilimitados",
    "trial.cancelled_banner": "Te quedan {0} días de prueba y la renovación está cancelada. Reactívala para no perder tu suscripción.",
    "trial.cancelled_banner_one": "Te queda 1 día de prueba y la renovación está cancelada. Reactívala para no perder tu suscripción.",
    "trial.reactivate": "Reactivar suscripción",
    "region.admin_preview": "Vista de administrador:",
    "region.view_open": "LATAM (completo)",
    "region.view_eu": "Europa",
    "region.view_us": "EE. UU.",
    "region.view_reset": "Volver a mi región",
    "trial.reactivated": "Suscripción reactivada — seguirás teniendo acceso sin interrupciones.",
    // Signed documents
    // Danger zone
    // Templates tab
    // Guidelines / recommendations tab
    // Model config tab
    // Appearance tab
    // Settings sections
    "settings.visual": "Interfaz visual",
    "settings.functional": "Configuración del informe",
    // Calculator copy text (report-style)
    // Signatures
    // Admin Organizations
    // Support
    // Admin – Support
    // Admin – Residents
    // Admin – Waitlist
    // Admin – Main page
    // Admin – Overview
    // Admin – Users
    // Admin – AI Config
    // Admin – Combo pipeline
    // Admin – Fine-tuning
    // Admin – Dictation config
    // Admin – Plans
    // Admin – Audit
    // Admin – Costs
    // Admin – Training data
    // Common
    "common.back": "Volver",
    "common.edit": "Editar",
    "common.delete": "Eliminar",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.close": "Cerrar",
    // Org management
    "cookie.message": "Usamos cookies esenciales para el funcionamiento de la plataforma y cookies analíticas para mejorar la experiencia. Consulte nuestra",
    "cookie.privacy_link": "política de privacidad",
    "cookie.accept": "Aceptar todo",
    "cookie.reject": "Solo esenciales",
  },
  en: {
    save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit",
    duplicate: "Duplicate", search: "Search", loading: "Loading...", close: "Close",
    view: "View", reset: "Reset", confirm: "Confirm", copy: "Copy", copied: "Copied",
    approve: "Approve", reject: "Reject", "approve_all": "Approve all",
    upload: "Upload", new: "New", custom: "Custom", global: "Global",
    word: "word", words: "words", other: "Other",
    "confirm_delete": "Are you sure you want to delete?",
    "no_match_search": "No results match your search",
    "gen_error": "Error",
    "gen.phase_findings": "Structuring findings…",
    "gen.phase_conclusion": "Drafting conclusion…",
    "gen_error_findings": "Error generating findings",
    "gen_error_conclusion": "Error generating conclusion",
    "clinical_check.button": "Review report",
    "clinical_check.recheck": "Review again",
    "clinical_check.running": "Analyzing...",
    "conclusion.diag_warning": "Review: the conclusion may contain interpretive or diagnostic language. The tool only describes findings; the diagnosis is your responsibility. Detected terms:",
    "conclusion.diag_dismiss": "Dismiss",
    "clinical_check.title": "Clinical suggestions",
    "clinical_check.beta": "Beta",
    "clinical_check.hint": "Data that could improve the report",
    "clinical_check.no_suggestions": "No relevant missing data found.",
    "clinical_check.add": "Add",
    "clinical_check.skip": "Skip",
    "clinical_check.dismiss": "Close",
    "clinical_check.added": "Data added to report",
    "clinical_check.section_not_found": "Section not found, data added to additional findings",
    "gen_error_unknown": "Unknown error",
    job: "Job", status: "Status", model: "Model", use: "Use",
    "stats.title": "Statistics", "stats.all_time": "All time",
    "stats.total_reports": "Total reports", "stats.this_month": "This month",
    "stats.plan": "Current plan", "stats.remaining": "Remaining",
    "stats.no_reports": "No reports in this period",
    "stats.dictation_used": "Dictation (Beta)",
    "stats.today": "Today", "stats.week": "Week", "stats.month": "Month",
    "limit.title": "Report limit reached",
    "limit.title_dictation": "Dictation limit reached",
    "limit.desc": "You've used {used} of {limit} reports on your {plan} plan this month.",
    "limit.desc_dictation": "You've used {used} of {limit} dictation minutes on your {plan} plan this month.",
    "limit.upgrade": "Upgrade plan",
    "limit.buy_extra": "Buy 100 extra reports",
    "limit.buy_extra_price": "for ${price}",
    "confirm_delete_template": "Delete this template?",
    "confirm_delete_recommendation": "Delete this recommendation?",
    "rd.button": "Dictate from your phone",
    "rd.scan": "Scan this code with your phone's camera",
    "rd.scan_hint": "A dictation page opens on your phone. The text appears here, in the dictation box.",
    "rd.waiting": "Waiting for your phone…",
    "rd.connected": "Phone linked",
    "rd.connected_hint": "You can now dictate from your phone. The text will appear in the dictation box.",
    "rd.phone_recording": "Dictating from phone…",
    "rd.disconnect": "Unlink phone",
    "rd.link_info": "The link lasts up to 8 hours or until you unlink it.",
    "rd.error": "Could not generate the code. Please try again.",
    "verify.banner": "Confirm your email to keep access — {0} days left. We sent you a link when you signed up (check spam too).",
    "verify.resend": "Resend email",
    "verify.sending": "Sending…",
    "verify.sent": "Sent ✓ Check your inbox",
    "trace.title": "Traceability",
    "trace.all_verified": "All verified",
    "trace.omissions": "omissions",
    "trace.hallucinations": "hallucinations",
    "trace.auto_repaired": "{0} omitted finding(s) were auto-integrated",
    "trace.auto_repaired_count": "auto-corrected",
    "trace.repaired_title": "Auto-corrections (already in report)",
    "trace.omitted_title": "Omissions (NOT in report)",
    "trace.hallucination_title": "Not dictated (hallucination)",
    "error.empty_generation": "Could not generate the report. Check the AI model configuration or try again.",
    "nav.dashboard": "Dashboard",
    "nav.admin": "Admin panel",
    "nav.toggle_theme": "Toggle theme",
    "nav.hide_panel": "Hide tools panel",
    "nav.show_panel": "Show tools panel",
    "nav.sign_out": "Sign out",
    "nav.hospital": "Hospital",
    "nav.support": "Support",
    "nav.full_guide": "Full guide",
    "nav.layout_columns": "Columns view (dictation and report side by side)",
    "nav.layout_vertical": "Vertical view",
    "nav.layout_label": "View",
    "nav.signature_label": "Signature",
    "nav.language_label": "Language",
    "nav.rail_reports": "Reports",
    "nav.rail_templates": "Templates",
    "nav.rail_calculators": "Calculators",
    "nav.rail_game": "Game",
    "nav.rail_recommendations": "Guidelines",
    "nav.rail_account": "Account",
    "nav.recent": "Recent",
    "recent.title": "Recent reports",
    "recent.empty": "No reports in this session yet",
    "recent.hint": "This device only · cleared on sign-out",
    "recent.untitled": "Untitled report",
    "nav.drag_resize": "Drag to resize",
    "nav.tools": "Tools",
    "nav.help": "Help",
    "toast.copied": "Copied to clipboard",
    "toast.report_saved": "Report saved",
    "toast.report_autosaved": "Saved automatically ✓",
    "toast.report_error_sent": "Error reported",
    "toast.generation_error": "Error generating report",
    "toast.new_report": "New report",
    "toast.generation_stopped": "Generation stopped",
    "toast.report_restored": "Previous report restored",
    "onboarding.welcome": "Welcome to Radiogen.AI",
    "onboarding.next": "Next",
    "onboarding.prev": "Back",
    "onboarding.start": "Get started",
    "onboarding.full_guide": "See full guide",
    // Top navigation tabs
    "nav.reports": "Reports",
    "nav.templates": "Templates",
    "nav.calculators": "Calculators",
    "nav.game": "Game",
    "nav.config": "Settings",
    // Sidebar tabs (legacy keys kept for compat)
    "tab.templates": "Templates", "tab.guidelines": "Guidelines",
    "tab.config": "AI Config", "tab.appearance": "Appearance",
    // Calculators tab
    // MRI Anatomy – Shoulder
    // MRI Anatomy – Knee
    // MRI Anatomy – Ankle
    // BI-RADS v2025
    // Complex infarct syndromes
    // Demyelinating diseases
    // Degenerative diseases
    // Interstitial lung diseases
    // Pediatric hip US
    "nav.recommendations": "Recommendations",
    "nav.account": "My account",
    "bot.welcome_title": "Ask me about radiology",
    "bot.welcome_desc": "I can answer questions based on available calculators and recommendations.",
    "bot.placeholder": "Type your question...",
    "bot.thinking": "Thinking...",
    "bot.error": "Error processing your query. Please try again.",
    "bot.disclaimer": "Only answers from calculators and recommendations data",
    "tplbot.title": "Template assistant",
    "tplbot.welcome_title": "What template do you need?",
    "tplbot.welcome_desc": "I can create, modify, or consult radiology report templates.",
    "tplbot.placeholder": "Describe the template you need...",
    "tplbot.thinking": "Thinking...",
    "tplbot.error": "Error processing your query. Please try again.",
    "tplbot.disclaimer": "Only creates and modifies radiology report templates",
    "tplbot.save_template": "Save template",
    "tplbot.saved": "Template saved",
    // Resident verification
    "limit.unlimited_label": "unlimited reports and dictation",
    "trial.cancelled_banner": "You have {0} trial days left and renewal is cancelled. Reactivate it so you don't lose your subscription.",
    "trial.cancelled_banner_one": "You have 1 trial day left and renewal is cancelled. Reactivate it so you don't lose your subscription.",
    "trial.reactivate": "Reactivate subscription",
    "region.admin_preview": "Admin preview:",
    "region.view_open": "LATAM (full)",
    "region.view_eu": "Europe",
    "region.view_us": "USA",
    "region.view_reset": "Back to my region",
    "trial.reactivated": "Subscription reactivated — your access continues uninterrupted.",
    // Signed documents
    // Danger zone
    // Settings sections
    "settings.visual": "Visual interface",
    "settings.functional": "Report configuration",
    // Calculator copy text (report-style)
    // Signatures
    // Admin Organizations
    // Support
    // Admin – Support
    // Admin – Residents
    // Admin – Waitlist
    // Admin – Main page
    // Admin – Overview
    // Admin – Users
    // Admin – AI Config
    // Admin – Combo pipeline
    // Admin – Fine-tuning
    // Admin – Dictation config
    // Admin – Plans
    // Admin – Audit
    // Admin – Costs
    // Admin – Training data
    // Common
    "common.back": "Back",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.close": "Close",
    // Org management
    "cookie.message": "We use essential cookies for platform functionality and analytics cookies to improve the experience. See our",
    "cookie.privacy_link": "privacy policy",
    "cookie.accept": "Accept all",
    "cookie.reject": "Essential only",
  },
  pt: {
    // Common
    save: "Salvar", cancel: "Cancelar", delete: "Excluir", edit: "Editar",
    duplicate: "Duplicar", search: "Buscar", loading: "Carregando...", close: "Fechar",
    view: "Ver", reset: "Redefinir", confirm: "Confirmar", copy: "Copiar", copied: "Copiado",
    approve: "Aprovar", reject: "Rejeitar", "approve_all": "Aprovar todas",
    upload: "Enviar", new: "Novo", custom: "Personalizada", global: "Global",
    word: "palavra", words: "palavras", other: "Outros",
    "confirm_delete": "Tem certeza de que deseja excluir?",
    "no_match_search": "Nenhum resultado para a busca",
    "gen_error": "Erro",
    "gen.phase_findings": "Estruturando achados…",
    "gen.phase_conclusion": "Redigindo conclusão…",
    "gen_error_findings": "Erro ao gerar achados",
    "gen_error_conclusion": "Erro ao gerar conclusão",
    "clinical_check.button": "Revisar laudo",
    "clinical_check.recheck": "Revisar novamente",
    "clinical_check.running": "Analisando...",
    "conclusion.diag_warning": "Revise: a conclusão pode conter linguagem interpretativa ou diagnóstica. A ferramenta apenas descreve achados; o diagnóstico é sua responsabilidade. Termos detectados:",
    "conclusion.diag_dismiss": "Dispensar",
    "clinical_check.title": "Sugestões clínicas",
    "clinical_check.beta": "Beta",
    "clinical_check.hint": "Dados que poderiam melhorar o laudo",
    "clinical_check.no_suggestions": "Nenhum dado faltante relevante encontrado.",
    "clinical_check.add": "Adicionar",
    "clinical_check.skip": "Pular",
    "clinical_check.dismiss": "Fechar",
    "clinical_check.added": "Dado adicionado ao laudo",
    "clinical_check.section_not_found": "Seção não encontrada, dado adicionado a outros achados",
    "gen_error_unknown": "Erro desconhecido",
    job: "Trabalho", status: "Status", model: "Modelo", use: "Usar",
    "stats.title": "Estatísticas", "stats.all_time": "Total histórico",
    "stats.total_reports": "Laudos totais", "stats.this_month": "Este mês",
    "stats.plan": "Plano atual", "stats.remaining": "Restantes",
    "stats.no_reports": "Sem laudos neste período",
    "stats.dictation_used": "Ditado (Beta)",
    "stats.today": "Hoje", "stats.week": "Semana", "stats.month": "Mês",
    "limit.title": "Limite de laudos atingido",
    "limit.title_dictation": "Limite de ditado atingido",
    "limit.desc": "Você usou {used} de {limit} laudos do seu plano {plan} este mês.",
    "limit.desc_dictation": "Você usou {used} de {limit} minutos de ditado do seu plano {plan} este mês.",
    "limit.upgrade": "Fazer upgrade do plano",
    "limit.buy_extra": "Comprar 100 laudos extras",
    "limit.buy_extra_price": "por ${price}",
    "confirm_delete_template": "Excluir este template?",
    "confirm_delete_recommendation": "Excluir esta recomendação?",
    // Dashboard
    "rd.button": "Ditar do celular",
    "rd.scan": "Escaneie este código com a câmera do celular",
    "rd.scan_hint": "Uma página de ditado abre no seu celular. O texto aparece aqui, na caixa de ditado.",
    "rd.waiting": "Aguardando o celular…",
    "rd.connected": "Celular vinculado",
    "rd.connected_hint": "Você já pode ditar do celular. O texto aparecerá na caixa de ditado.",
    "rd.phone_recording": "Ditando do celular…",
    "rd.disconnect": "Desvincular celular",
    "rd.link_info": "O vínculo dura até 8 horas ou até você desvinculá-lo.",
    "rd.error": "Não foi possível gerar o código. Tente novamente.",
    "verify.banner": "Confirme seu e-mail para manter o acesso — restam {0} dias. Enviamos um link no cadastro (verifique também o spam).",
    "verify.resend": "Reenviar e-mail",
    "verify.sending": "Enviando…",
    "verify.sent": "Enviado ✓ Verifique sua caixa",
    "trace.title": "Rastreabilidade",
    "trace.all_verified": "Tudo verificado",
    "trace.omissions": "omissões",
    "trace.hallucinations": "alucinações",
    "trace.auto_repaired": "{0} achado(s) omitido(s) foram integrados automaticamente",
    "trace.auto_repaired_count": "corrigido(s) automaticamente",
    "trace.repaired_title": "Correções automáticas (já incluídos no laudo)",
    "trace.omitted_title": "Omissões (NÃO incluídos no laudo)",
    "trace.hallucination_title": "Não ditado (alucinação)",
    "error.empty_generation": "Não foi possível gerar o laudo. Verifique a configuração do modelo de IA ou tente novamente.",
    // Navigation
    "nav.dashboard": "Painel principal",
    "nav.admin": "Painel de administração",
    "nav.toggle_theme": "Alternar tema",
    "nav.hide_panel": "Ocultar painel de ferramentas",
    "nav.show_panel": "Mostrar painel de ferramentas",
    "nav.sign_out": "Sair",
    "nav.hospital": "Hospital",
    "nav.support": "Suporte",
    "nav.full_guide": "Guia completo",
    "nav.layout_columns": "Vista em colunas (ditado e laudo lado a lado)",
    "nav.layout_vertical": "Vista vertical",
    "nav.layout_label": "Vista",
    "nav.signature_label": "Assinatura",
    "nav.language_label": "Idioma",
    "nav.rail_reports": "Laudos",
    "nav.rail_templates": "Modelos",
    "nav.rail_calculators": "Calculadoras",
    "nav.rail_game": "Jogo",
    "nav.rail_recommendations": "Diretrizes",
    "nav.rail_account": "Conta",
    "nav.recent": "Recentes",
    "recent.title": "Laudos recentes",
    "recent.empty": "Ainda não há laudos nesta sessão",
    "recent.hint": "Somente neste dispositivo · apagados ao sair",
    "recent.untitled": "Laudo sem título",
    "nav.drag_resize": "Arrastar para redimensionar",
    "nav.tools": "Ferramentas",
    "nav.help": "Ajuda",
    "toast.copied": "Copiado para a área de transferência",
    "toast.report_saved": "Laudo salvo",
    "toast.report_autosaved": "Salvo automaticamente ✓",
    "toast.report_error_sent": "Erro reportado",
    "toast.generation_error": "Erro ao gerar o laudo",
    "toast.new_report": "Novo laudo",
    "toast.generation_stopped": "Geração interrompida",
    "toast.report_restored": "Laudo anterior restaurado",
    "onboarding.welcome": "Bem-vindo ao Radiogen.AI",
    "onboarding.next": "Próximo",
    "onboarding.prev": "Anterior",
    "onboarding.start": "Começar",
    "onboarding.full_guide": "Ver guia completo",
    // Top navigation tabs
    "nav.reports": "Laudos",
    "nav.templates": "Templates",
    "nav.calculators": "Calculadoras",
    "nav.game": "Jogo",
    "nav.config": "Configurações",
    // Sidebar tabs (legacy keys kept for compat)
    "tab.templates": "Templates", "tab.guidelines": "Diretrizes clínicas",
    "tab.config": "Config. IA", "tab.appearance": "Aparência",
    // Calculators tab
    // MRI Anatomy – Shoulder
    // MRI Anatomy – Knee
    // MRI Anatomy – Ankle
    // BI-RADS v2025
    // Complex infarct syndromes
    // Demyelinating diseases
    // Degenerative diseases
    // Interstitial lung diseases
    // Pediatric hip US
    "nav.recommendations": "Recomendações",
    "nav.account": "Minha conta",
    "bot.welcome_title": "Pergunte-me sobre radiologia",
    "bot.welcome_desc": "Posso responder perguntas com base nas calculadoras e recomendações disponíveis.",
    "bot.placeholder": "Escreva sua pergunta...",
    "bot.thinking": "Pensando...",
    "bot.error": "Erro ao processar a consulta. Tente novamente.",
    "bot.disclaimer": "Responde apenas com dados de calculadoras e recomendações",
    "tplbot.title": "Assistente de templates",
    "tplbot.welcome_title": "Qual template você precisa?",
    "tplbot.welcome_desc": "Posso criar, modificar ou consultar templates de laudos radiológicos.",
    "tplbot.placeholder": "Descreva o template que você precisa...",
    "tplbot.thinking": "Pensando...",
    "tplbot.error": "Erro ao processar a consulta. Tente novamente.",
    "tplbot.disclaimer": "Apenas cria e modifica templates de laudos radiológicos",
    "tplbot.save_template": "Salvar template",
    "tplbot.saved": "Template salvo",
    // Resident verification
    "limit.unlimited_label": "laudos e ditado ilimitados",
    "trial.cancelled_banner": "Restam {0} dias de teste e a renovação está cancelada. Reative-a para não perder sua assinatura.",
    "trial.cancelled_banner_one": "Resta 1 dia de teste e a renovação está cancelada. Reative-a para não perder sua assinatura.",
    "trial.reactivate": "Reativar assinatura",
    "region.admin_preview": "Vista de administrador:",
    "region.view_open": "LATAM (completo)",
    "region.view_eu": "Europa",
    "region.view_us": "EUA",
    "region.view_reset": "Voltar à minha região",
    "trial.reactivated": "Assinatura reativada — seu acesso continua sem interrupções.",
    // Signed documents
    // Danger zone
    // Templates tab
    // Guidelines / recommendations tab
    // Model config tab
    // Appearance tab
    // Settings sections
    "settings.visual": "Interface visual",
    "settings.functional": "Configuração do relatório",
    // Calculator copy text (report-style)
    // Signatures
    // Admin Organizations
    // Support
    // Admin – Support
    // Admin – Residents
    // Admin – Waitlist
    // Admin – Main page
    // Admin – Overview
    // Admin – Users
    // Admin – AI Config
    // Admin – Combo pipeline
    // Admin – Fine-tuning
    // Admin – Dictation config
    // Admin – Plans
    // Admin – Audit
    // Admin – Costs
    // Admin – Training data
    // Common
    "common.back": "Voltar",
    "common.edit": "Editar",
    "common.delete": "Excluir",
    "common.save": "Salvar",
    "common.cancel": "Cancelar",
    "common.close": "Fechar",
    // Org management
    "cookie.message": "Usamos cookies essenciais para o funcionamento da plataforma e cookies analíticos para melhorar a experiência. Consulte nossa",
    "cookie.privacy_link": "política de privacidade",
    "cookie.accept": "Aceitar tudo",
    "cookie.reject": "Apenas essenciais",
  },
};

// Anatomical section name translations (for display in normality editor & templates)
/**
 * The raw core table.
 *
 * Deliberately NOT a way to translate anything: it holds only the strings
 * that never moved into a feature dictionary, so a lookup against it alone
 * silently returns the key for everything that did. Use `translate` below,
 * or `useT`. Kept exported for tests that inspect the table itself.
 */
export const _uiDictionary = ui;

/**
 * Strings that travel with the feature that uses them.
 *
 * The whole dictionary — three languages of every string in the product —
 * used to sit in this module, which every page imports. A radiologist writing
 * a report downloaded and parsed all of it, 44% being calculator tables and
 * another 16% the admin dashboard, neither of which that page can even open.
 *
 * A feature's strings now live in their own module (i18n-calc, i18n-admin)
 * which registers them here and is imported by that feature alone, so the
 * bundler puts them in its chunk. Registration happens when the module is
 * evaluated, which a static import guarantees is before the component that
 * imports it first renders.
 */
const extra: Record<UILanguage, Record<string, string>> = { es: {}, en: {}, pt: {} };

export function registerMessages(block: Partial<Record<UILanguage, Record<string, string>>>) {
  for (const lang of ["es", "en", "pt"] as UILanguage[]) {
    if (block[lang]) Object.assign(extra[lang], block[lang]);
  }
}

/** The dictionaries in the order a key is looked for. */
function lookup(lang: UILanguage, key: string): string {
  return ui[lang]?.[key] ?? extra[lang]?.[key] ?? ui.en[key] ?? extra.en[key] ?? key;
}

/**
 * Translate one key outside a React render.
 *
 * For the few places that know their language from something other than the
 * user's preferences — the phone-dictation page reads it off the pairing
 * token — and so cannot use `useT`. It consults the registry as well as the
 * core table, which is the whole point: reading the core table directly is
 * how a page quietly starts printing raw keys the moment a namespace moves
 * into a feature dictionary.
 */
export function translate(lang: UILanguage, key: string): string {
  return lookup(lang, key);
}

export function useT() {
  const { prefs } = useUIPrefs();
  const lang = (prefs.uiLanguage || "es") as UILanguage;
  return useCallback((key: string) => lookup(lang, key), [lang]);
}
