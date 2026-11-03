"use client";

/**
 * The support page's strings, loaded with the support page.
 *
 * Split out of the shared dictionary for the same reason as the calculator
 * and admin strings: every page used to download all three languages of
 * every string in the product, most of them for screens it cannot reach.
 */

import { registerMessages } from "./i18n";

registerMessages({
  es: {
    "support.title": "Soporte",
    "support.my_tickets": "Mis tickets",
    "support.new_ticket": "Nuevo ticket",
    "support.subject": "Asunto",
    "support.subject_placeholder": "Resumen breve del problema",
    "support.category": "Categoría",
    "support.description": "Descripción",
    "support.description_placeholder": "Describe el problema con el máximo detalle posible...",
    "support.send": "Enviar",
    "support.empty_title": "No tienes tickets de soporte",
    "support.empty_subtitle": "Crea uno si tienes alguna duda, queja o error",
    "support.team_reply": "Respuesta del equipo:",
    "support.status_open": "Abierto",
    "support.status_in_progress": "En curso",
    "support.status_resolved": "Resuelto",
    "support.status_closed": "Cerrado",
    "support.cat_error": "Error",
    "support.cat_error_bug": "Error / Bug",
    "support.cat_question": "Pregunta",
    "support.cat_complaint": "Queja",
    "support.cat_general": "General",
  },
  en: {
    "support.title": "Support",
    "support.my_tickets": "My tickets",
    "support.new_ticket": "New ticket",
    "support.subject": "Subject",
    "support.subject_placeholder": "Brief summary of the issue",
    "support.category": "Category",
    "support.description": "Description",
    "support.description_placeholder": "Describe the issue in as much detail as possible...",
    "support.send": "Send",
    "support.empty_title": "You have no support tickets",
    "support.empty_subtitle": "Create one if you have a question, complaint, or error",
    "support.team_reply": "Team reply:",
    "support.status_open": "Open",
    "support.status_in_progress": "In progress",
    "support.status_resolved": "Resolved",
    "support.status_closed": "Closed",
    "support.cat_error": "Error",
    "support.cat_error_bug": "Error / Bug",
    "support.cat_question": "Question",
    "support.cat_complaint": "Complaint",
    "support.cat_general": "General",
  },
  pt: {
    "support.title": "Suporte",
    "support.my_tickets": "Meus tickets",
    "support.new_ticket": "Novo ticket",
    "support.subject": "Assunto",
    "support.subject_placeholder": "Resumo breve do problema",
    "support.category": "Categoria",
    "support.description": "Descrição",
    "support.description_placeholder": "Descreva o problema com o máximo de detalhes possível...",
    "support.send": "Enviar",
    "support.empty_title": "Você não tem tickets de suporte",
    "support.empty_subtitle": "Crie um se tiver alguma dúvida, reclamação ou erro",
    "support.team_reply": "Resposta da equipe:",
    "support.status_open": "Aberto",
    "support.status_in_progress": "Em andamento",
    "support.status_resolved": "Resolvido",
    "support.status_closed": "Fechado",
    "support.cat_error": "Erro",
    "support.cat_error_bug": "Erro / Bug",
    "support.cat_question": "Pergunta",
    "support.cat_complaint": "Reclamação",
    "support.cat_general": "Geral",
  },
});
