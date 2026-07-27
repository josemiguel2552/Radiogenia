import { Resend } from "resend";

type EmailLang = "es" | "en" | "pt";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "info@radiogen.ai";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";

async function sendWithRetry(params: Parameters<Resend["emails"]["send"]>[0], maxRetries = 2): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await getResend().emails.send(params);
      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxRetries) {
        console.error(`[email] FAILED after ${maxRetries + 1} attempts: to=${(params as { to: string }).to}, subject=${(params as { subject: string }).subject}, from=${(params as { from: string }).from}, error=${msg}`);
        return;
      }
      console.warn(`[email] Attempt ${attempt + 1} failed, retrying: ${msg}`);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

// Pure-HTML logo — renders reliably in all email clients (no images to block)
function logoBlock() {
  return `
    <tr><td style="padding:32px 32px 8px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
        <tr>
          <td style="vertical-align:middle;padding-right:4px;">
            <div style="width:34px;height:34px;border-radius:8px;background:linear-gradient(135deg,#1e1b4b,#7c3aed);text-align:center;line-height:34px;">
              <span style="color:#fff;font-size:18px;font-weight:800;">R</span>
            </div>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:22px;font-weight:700;letter-spacing:-0.3px;">
              <span style="color:#ffffff;">Radiogen</span><span style="color:#a78bfa;">.AI</span>
            </span>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

const footerText: Record<EmailLang, { tagline: string; disclaimer: string; support: string }> = {
  es: {
    tagline: "Radiogen.AI &mdash; Informes radiol&oacute;gicos potenciados con inteligencia artificial.",
    disclaimer: "Los textos generados son borradores que deben ser revisados y validados por un profesional antes de su uso cl&iacute;nico.",
    support: "Soporte",
  },
  en: {
    tagline: "Radiogen.AI &mdash; Radiology reports powered by artificial intelligence.",
    disclaimer: "Generated texts are drafts that must be reviewed and validated by a professional before clinical use.",
    support: "Support",
  },
  pt: {
    tagline: "Radiogen.AI &mdash; Laudos radiol&oacute;gicos potencializados com intelig&ecirc;ncia artificial.",
    disclaimer: "Os textos gerados s&atilde;o rascunhos que devem ser revisados e validados por um profissional antes do uso cl&iacute;nico.",
    support: "Suporte",
  },
};

function emailShell(content: string, unsubscribeNote: string, lang: EmailLang = "es"): string {
  const ft = footerText[lang];
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header gradient bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7c3aed,#3b82f6,#7c3aed);"></td></tr>
        ${logoBlock()}
        ${content}
        <!-- Footer -->
        <tr><td style="padding:24px 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
            <tr><td style="text-align:center;">
              <p style="color:#6b7280;font-size:12px;text-align:center;margin:0 0 8px;line-height:1.5;">
                ${ft.tagline}
              </p>
              <p style="color:#4b5563;font-size:10px;text-align:center;margin:0 0 10px;line-height:1.5;">
                ${ft.disclaimer}
              </p>
              <p style="color:#4b5563;font-size:10px;text-align:center;margin:0;line-height:1.4;">
                ${unsubscribeNote} &middot; <a href="${APP_URL}/support" style="color:#6b7280;text-decoration:underline;">${ft.support}</a>
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <!-- Outside footer -->
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="text-align:center;padding:16px 20px 0;">
          <p style="color:#374151;font-size:10px;margin:0;">
            &copy; ${new Date().getFullYear()} Radiogen.AI &middot; <a href="${APP_URL}/legal" style="color:#4b5563;text-decoration:underline;">Legal</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cta(href: string, label: string) {
  return `<tr><td style="padding:4px 32px 32px;text-align:center;">
  <a href="${href}" style="display:inline-block;padding:14px 44px;background:linear-gradient(135deg,#7c3aed 0%,#3b82f6 100%);color:#fff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.3);letter-spacing:0.2px;">
    ${label}
  </a>
</td></tr>`;
}

function featureRow(emoji: string, text: string) {
  return `<tr><td style="padding:7px 16px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.1);border-radius:10px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:28px;vertical-align:middle;text-align:center;"><span style="font-size:15px;">${emoji}</span></td>
      <td style="color:#d1d5db;font-size:13px;vertical-align:middle;line-height:1.5;padding-left:4px;">${text}</td>
    </tr>
  </table>
</td></tr>
<tr><td style="height:5px;"></td></tr>`;
}

function tipBox(text: string) {
  return `<tr><td style="padding:0 32px 24px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:14px 18px;background:rgba(59,130,246,0.06);border:1px solid rgba(59,130,246,0.12);border-radius:10px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:24px;vertical-align:top;padding-top:1px;"><span style="font-size:14px;">💡</span></td>
          <td style="color:#94a3b8;font-size:12px;line-height:1.6;padding-left:4px;">${text}</td>
        </tr>
      </table>
    </td></tr>
  </table>
</td></tr>`;
}

function divider() {
  return `<tr><td style="padding:0 32px 20px;"><div style="height:1px;background:rgba(255,255,255,0.06);"></div></td></tr>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&iexcl;/g, "¡")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&eacute;/g, "é")
    .replace(/&uacute;/g, "ú")
    .replace(/&aacute;/g, "á")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&atilde;/g, "ã")
    .replace(/&ccedil;/g, "ç")
    .replace(/&mdash;/g, "—")
    .replace(/&middot;/g, "·")
    .replace(/&#x2713;/g, "✓")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// 1) Welcome email — LATAM auto-approved users
// ---------------------------------------------------------------------------

const welcomeI18n: Record<EmailLang, {
  subject: string; greetWith: string; greetWithout: string;
  intro: string; subtext: string;
  feat1: string; feat2: string; feat3: string; feat4: string;
  tip: string; btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Bienvenido/a a Radiogen.AI — tu asistente de informes radiológicos",
    greetWith: "&iexcl;Bienvenido/a, ",
    greetWithout: "&iexcl;Bienvenido/a a Radiogen.AI!",
    intro: "Tu cuenta est&aacute; activa y lista para usar. A partir de ahora puedes crear informes radiol&oacute;gicos con asistencia de inteligencia artificial, dictado por voz y herramientas de clasificaci&oacute;n integradas.",
    subtext: "Esto es lo que tienes disponible desde hoy:",
    feat1: "20 informes al mes con tu plan gratuito",
    feat2: "Dictado de voz inteligente integrado",
    feat3: "Plantillas profesionales personalizables",
    feat4: "Clasificaci&oacute;n autom&aacute;tica TNM, BI-RADS y TI-RADS",
    tip: "Para empezar, entra al dashboard, selecciona una modalidad y dicta o escribe tus hallazgos. La IA generar&aacute; un borrador de informe que puedes editar y refinar.",
    btn: "Abrir mi dashboard",
    unsub: "Recibes este correo porque creaste una cuenta en Radiogen.AI.",
    textTpl: (g, url) => `¡Bienvenido/a${g ? `, ${g}` : ""}!\n\nTu cuenta en Radiogen.AI está activa y lista para usar.\n\nLo que tienes disponible:\n✓ 20 informes al mes con tu plan gratuito\n✓ Dictado de voz inteligente integrado\n✓ Plantillas profesionales personalizables\n✓ Clasificación automática TNM, BI-RADS y TI-RADS\n\n💡 Consejo: entra al dashboard, selecciona una modalidad y dicta tus hallazgos.\n\nAbrir dashboard: ${url}`,
  },
  en: {
    subject: "Welcome to Radiogen.AI — your radiology report assistant",
    greetWith: "Welcome, ",
    greetWithout: "Welcome to Radiogen.AI!",
    intro: "Your account is active and ready to go. You can now create radiology reports with AI assistance, voice dictation, and integrated classification tools.",
    subtext: "Here&rsquo;s what you have access to starting today:",
    feat1: "20 reports per month on your free plan",
    feat2: "Built-in intelligent voice dictation",
    feat3: "Customizable professional templates",
    feat4: "Automatic TNM, BI-RADS and TI-RADS classification",
    tip: "To get started, open your dashboard, select a modality, and dictate or type your findings. The AI will generate a draft report you can edit and refine.",
    btn: "Open my dashboard",
    unsub: "You received this email because you created a Radiogen.AI account.",
    textTpl: (g, url) => `Welcome${g ? `, ${g}` : ""}!\n\nYour Radiogen.AI account is active and ready to go.\n\nWhat you have access to:\n✓ 20 reports per month on your free plan\n✓ Built-in intelligent voice dictation\n✓ Customizable professional templates\n✓ Automatic TNM, BI-RADS and TI-RADS classification\n\n💡 Tip: open the dashboard, select a modality, and dictate your findings.\n\nOpen dashboard: ${url}`,
  },
  pt: {
    subject: "Bem-vindo/a ao Radiogen.AI — seu assistente de laudos radiológicos",
    greetWith: "Bem-vindo/a, ",
    greetWithout: "Bem-vindo/a ao Radiogen.AI!",
    intro: "Sua conta est&aacute; ativa e pronta para usar. A partir de agora voc&ecirc; pode criar laudos radiol&oacute;gicos com assist&ecirc;ncia de intelig&ecirc;ncia artificial, ditado por voz e ferramentas de classifica&ccedil;&atilde;o integradas.",
    subtext: "Veja o que voc&ecirc; tem dispon&iacute;vel a partir de hoje:",
    feat1: "20 laudos por m&ecirc;s no plano gratuito",
    feat2: "Ditado por voz inteligente integrado",
    feat3: "Modelos profissionais personaliz&aacute;veis",
    feat4: "Classifica&ccedil;&atilde;o autom&aacute;tica TNM, BI-RADS e TI-RADS",
    tip: "Para come&ccedil;ar, entre no dashboard, selecione uma modalidade e dite ou escreva seus achados. A IA gerar&aacute; um rascunho de laudo que voc&ecirc; pode editar e refinar.",
    btn: "Abrir meu dashboard",
    unsub: "Recebeu este email porque criou uma conta no Radiogen.AI.",
    textTpl: (g, url) => `Bem-vindo/a${g ? `, ${g}` : ""}!\n\nSua conta no Radiogen.AI está ativa e pronta para usar.\n\nO que você tem disponível:\n✓ 20 laudos por mês no plano gratuito\n✓ Ditado por voz inteligente integrado\n✓ Modelos profissionais personalizáveis\n✓ Classificação automática TNM, BI-RADS e TI-RADS\n\n💡 Dica: entre no dashboard, selecione uma modalidade e dite seus achados.\n\nAbrir dashboard: ${url}`,
  },
};

const welcomePlanLimits: Record<string, { reports: number; dictation: number }> = {
  free: { reports: 20, dictation: 30 },
  resident: { reports: 150, dictation: 120 },
  starter: { reports: 150, dictation: 120 },
  professional: { reports: 400, dictation: 300 },
};

const welcomePlanNames: Record<string, string> = {
  free: "Free", starter: "Starter", resident: "Residente", professional: "Professional",
};

function welcomeFeat1(plan: string | null | undefined, lang: EmailLang): string {
  const p = plan && welcomePlanLimits[plan] ? plan : "free";
  const limits = welcomePlanLimits[p];
  const label = welcomePlanNames[p] || "Free";
  if (lang === "es") return `${limits.reports} informes al mes con tu plan ${label}`;
  if (lang === "pt") return `${limits.reports} laudos por m&ecirc;s no plano ${label}`;
  return `${limits.reports} reports per month on your ${label} plan`;
}

function welcomeFeat1Text(plan: string | null | undefined): string {
  const p = plan && welcomePlanLimits[plan] ? plan : "free";
  const limits = welcomePlanLimits[p];
  const label = welcomePlanNames[p] || "Free";
  return `${limits.reports} reports — ${label} plan`;
}

export async function sendWelcomeEmail(to: string, name: string | null, lang: EmailLang = "es", confirmUrl?: string | null, plan?: string | null) {
  const t = welcomeI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const dashUrl = confirmUrl || `${APP_URL}/dashboard`;
  const btnLabel = confirmUrl ? (lang === "es" ? "Confirmar mi cuenta" : lang === "pt" ? "Confirmar minha conta" : "Confirm my account") : t.btn;
  // When this email carries the verification link, say so in the subject —
  // "Welcome" subjects get skimmed past; an explicit action does better.
  const subject = confirmUrl
    ? (lang === "es" ? "Confirma tu email — Radiogen.AI" : lang === "pt" ? "Confirme seu e-mail — Radiogen.AI" : "Confirm your email — Radiogen.AI")
    : t.subject;
  const feat1 = welcomeFeat1(plan, lang);

  const html = emailShell(`
        <tr><td style="padding:0 32px 4px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(124,58,237,0.12);border:1px solid rgba(124,58,237,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#127881;</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${t.greetWith}${greeting}!` : t.greetWithout}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 20px;">
            ${t.intro}
          </p>
          <p style="color:#8b949e;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">
            ${t.subtext}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            ${featureRow("📄", feat1)}
            ${featureRow("🎙️", t.feat2)}
            ${featureRow("📋", t.feat3)}
            ${featureRow("🧮", t.feat4)}
          </table>
        </td></tr>
        ${tipBox(t.tip)}
        ${cta(dashUrl, btnLabel)}`, t.unsub, lang);

  const textFeat1 = welcomeFeat1Text(plan);
  const text = t.textTpl(greeting, dashUrl).replace(/✓ \d+ (?:informes|reports|laudos).*(?:gratuito|free plan|plano gratuito)/, `✓ ${textFeat1}`);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `welcome-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 1a2) Verification-reminder email — sent when RE-sending the confirmation
// link (self-serve resend, or admin bulk resend) to someone who signed up but
// never verified. Explicit about the situation, with a direct-access link
// (the magic link both signs them in AND marks the account verified).
// ---------------------------------------------------------------------------

const reminderI18n: Record<EmailLang, {
  subject: string; headline: string; intro: string;
  note: string; btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Aún no has verificado tu cuenta — entra directo",
    headline: "Tu cuenta te está esperando",
    intro: "Vimos que te registraste en Radiogen.AI pero todavía no verificaste tu email. No hace falta que busques aquel primer correo: usa este enlace para entrar directamente a tu cuenta ahora mismo.",
    note: "Al pulsar el botón, tu cuenta queda verificada automáticamente y entras directo al panel — sin pasos adicionales.",
    btn: "Entrar a mi cuenta",
    unsub: "Recibes este correo porque tienes una cuenta sin verificar en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Hola, ${g}. ` : ""}Vimos que te registraste en Radiogen.AI pero no verificaste tu email todavía.\n\nUsa este enlace para entrar directamente a tu cuenta (queda verificada automáticamente):\n${url}`,
  },
  en: {
    subject: "You haven't verified your account yet — get in directly",
    headline: "Your account is waiting for you",
    intro: "We noticed you signed up for Radiogen.AI but never verified your email. No need to hunt down that first email — use this link to get straight into your account right now.",
    note: "Clicking the button verifies your account automatically and takes you straight to the dashboard — no extra steps.",
    btn: "Enter my account",
    unsub: "You received this email because you have an unverified Radiogen.AI account.",
    textTpl: (g, url) => `${g ? `Hi, ${g}. ` : ""}We noticed you signed up for Radiogen.AI but haven't verified your email yet.\n\nUse this link to get straight into your account (it verifies automatically):\n${url}`,
  },
  pt: {
    subject: "Você ainda não verificou sua conta — entre direto",
    headline: "Sua conta está esperando por você",
    intro: "Vimos que você se cadastrou no Radiogen.AI mas ainda não verificou seu e-mail. Não precisa procurar aquele primeiro e-mail: use este link para entrar direto na sua conta agora mesmo.",
    note: "Ao clicar no botão, sua conta é verificada automaticamente e você vai direto para o painel — sem passos extras.",
    btn: "Entrar na minha conta",
    unsub: "Você recebeu este e-mail porque tem uma conta não verificada no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Olá, ${g}. ` : ""}Vimos que você se cadastrou no Radiogen.AI mas ainda não verificou seu e-mail.\n\nUse este link para entrar direto na sua conta (ela é verificada automaticamente):\n${url}`,
  },
};

export function renderVerificationReminderEmail(name: string | null, lang: EmailLang, confirmUrl: string): { subject: string; html: string; text: string } {
  const t = reminderI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";

  const noteMock = `<div style="font-size:12px;color:#374151;line-height:1.6;">✓ ${t.note}</div>`;

  const inner = `${emailHeader("&#128274;", t.headline, t.intro)}
        ${mockCard(t.subject, noteMock)}
        ${lightCta(confirmUrl, t.btn)}`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting, confirmUrl);
  return { subject: t.subject, html, text };
}

export async function sendVerificationReminderEmail(to: string, name: string | null, lang: EmailLang, confirmUrl: string) {
  const { subject, html, text } = renderVerificationReminderEmail(name, lang, confirmUrl);
  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `verify-reminder-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1c) Hospital invite email — sent from info@radiogen.ai to a hospital's
// radiologists so they self-register via the hospital signup link. Includes a
// short legal notice + guide/contact pointer. Sent by the admin from the
// Hospitals tab (single or bulk, with resend).
// ---------------------------------------------------------------------------

const hospitalInviteI18n: Record<EmailLang, {
  subject: (h: string) => string; headline: string; intro: (h: string) => string;
  btn: string; legalTitle: string; legal: string; help: string; unsub: string;
  textTpl: (h: string, url: string) => string;
}> = {
  es: {
    subject: (h) => `Acceso a Radiogen.AI — ${h}`,
    headline: "Te damos acceso a Radiogen.AI",
    intro: (h) => `Formas parte del equipo de <b>${h}</b>. Crea tu cuenta (informes y dictado ilimitados) en un minuto: pulsa el botón, completa tus datos y tendrás acceso inmediato.`,
    btn: "Crear mi cuenta",
    legalTitle: "Aviso importante",
    legal: "Radiogen.AI es una herramienta de apoyo para redactar y organizar el informe radiológico. No sustituye el juicio clínico, no emite diagnósticos ni recomendaciones de forma autónoma. El radiólogo es responsable de revisar y validar el informe final. Al darte de alta aceptas estas condiciones.",
    help: "Dentro de tu perfil tienes acceso a la guía de usuario. Para cualquier duda sobre la aplicación, escríbenos a info@radiogen.ai.",
    unsub: "Recibes este correo porque tu hospital te ha dado acceso a Radiogen.AI.",
    textTpl: (h, url) => `Formas parte del equipo de ${h}. Crea tu cuenta de Radiogen.AI (informes y dictado ilimitados) aquí:\n${url}\n\nAVISO IMPORTANTE: Radiogen.AI es una herramienta de apoyo para redactar y organizar el informe radiológico. No sustituye el juicio clínico, no emite diagnósticos ni recomendaciones de forma autónoma. El radiólogo es responsable de revisar y validar el informe final. Al darte de alta aceptas estas condiciones.\n\nDentro de tu perfil tienes la guía de usuario. Dudas: info@radiogen.ai.`,
  },
  en: {
    subject: (h) => `Access to Radiogen.AI — ${h}`,
    headline: "Your access to Radiogen.AI",
    intro: (h) => `You're part of the <b>${h}</b> team. Create your account (unlimited reports and dictation) in a minute: click the button, fill in your details, and get immediate access.`,
    btn: "Create my account",
    legalTitle: "Important notice",
    legal: "Radiogen.AI is a support tool for drafting and organizing the radiology report. It does not replace clinical judgment and does not issue diagnoses or recommendations autonomously. The radiologist is responsible for reviewing and validating the final report. By signing up you accept these terms.",
    help: "Inside your profile you have access to the user guide. For any question about the app, email us at info@radiogen.ai.",
    unsub: "You received this email because your hospital granted you access to Radiogen.AI.",
    textTpl: (h, url) => `You're part of the ${h} team. Create your Radiogen.AI account (unlimited reports and dictation) here:\n${url}\n\nIMPORTANT NOTICE: Radiogen.AI is a support tool for drafting and organizing the radiology report. It does not replace clinical judgment and does not issue diagnoses or recommendations autonomously. The radiologist is responsible for reviewing and validating the final report. By signing up you accept these terms.\n\nInside your profile you have the user guide. Questions: info@radiogen.ai.`,
  },
  pt: {
    subject: (h) => `Acesso ao Radiogen.AI — ${h}`,
    headline: "Seu acesso ao Radiogen.AI",
    intro: (h) => `Você faz parte da equipe de <b>${h}</b>. Crie sua conta (laudos e ditado ilimitados) em um minuto: clique no botão, preencha seus dados e tenha acesso imediato.`,
    btn: "Criar minha conta",
    legalTitle: "Aviso importante",
    legal: "O Radiogen.AI é uma ferramenta de apoio para redigir e organizar o laudo radiológico. Não substitui o juízo clínico e não emite diagnósticos nem recomendações de forma autônoma. O radiologista é responsável por revisar e validar o laudo final. Ao se cadastrar você aceita estas condições.",
    help: "Dentro do seu perfil você tem acesso ao guia do usuário. Para qualquer dúvida sobre o aplicativo, escreva para info@radiogen.ai.",
    unsub: "Você recebeu este e-mail porque seu hospital concedeu acesso ao Radiogen.AI.",
    textTpl: (h, url) => `Você faz parte da equipe de ${h}. Crie sua conta Radiogen.AI (laudos e ditado ilimitados) aqui:\n${url}\n\nAVISO IMPORTANTE: O Radiogen.AI é uma ferramenta de apoio para redigir e organizar o laudo radiológico. Não substitui o juízo clínico e não emite diagnósticos nem recomendações de forma autônoma. O radiologista é responsável por revisar e validar o laudo final. Ao se cadastrar você aceita estas condições.\n\nDentro do seu perfil você tem o guia do usuário. Dúvidas: info@radiogen.ai.`,
  },
};

export async function sendHospitalInviteEmail(to: string, hospitalName: string, inviteUrl: string, lang: EmailLang = "es") {
  const t = hospitalInviteI18n[lang] || hospitalInviteI18n.es;
  const legalBox = `<tr><td style="padding:0 32px 8px;">
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px 16px;">
      <p style="margin:0 0 6px;color:#111827;font-size:12px;font-weight:700;">${t.legalTitle}</p>
      <p style="margin:0;color:#4b5563;font-size:12px;line-height:1.6;">${t.legal}</p>
    </div>
  </td></tr>
  <tr><td style="padding:12px 32px 24px;">
    <p style="margin:0;color:#6b7280;font-size:12px;line-height:1.6;">${t.help}</p>
  </td></tr>`;

  const inner = `${emailHeader("&#127973;", t.headline, t.intro(hospitalName))}
        ${lightCta(inviteUrl, t.btn)}
        ${legalBox}`;
  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(hospitalName, inviteUrl);

  await sendWithRetry({
    from: "Radiogen.AI <info@radiogen.ai>",
    replyTo: REPLY_TO,
    to,
    subject: t.subject(hospitalName),
    html,
    text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `hospital-invite-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1b) Onboarding "tools" email — sent ~24h after signup
// ---------------------------------------------------------------------------

const onboardingI18n: Record<EmailLang, {
  subject: string; headline: string; intro: string;
  normTag: string; normField: string; normPhrase: string;
  tplLabel: string; tplTitle: string; tplField1: string; tplVal1: string; tplField2: string; tplVal2: string;
  recLabel: string; recCount: string;
  calcLabel: string; calcSize: string; calcStage: string;
  classLabel: string; classFrom: string; classResult: string;
  botLabel: string; botQ: string; botA: string;
  tryNow: string; btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Todo lo que ya puedes hacer en Radiogen.AI",
    headline: "Todo esto ya está en tu cuenta",
    intro: "Un vistazo rápido a tus herramientas, con ejemplos reales:",
    normTag: "Frases de normalidad",
    normField: "Pleura y diafragma:", normPhrase: "Sin derrame pleural ni neumotórax.",
    tplLabel: "📋 Plantillas personalizables",
    tplTitle: "TC tórax · Hallazgos",
    tplField1: "Parénquima pulmonar:", tplVal1: "Masa de 43 mm en LSI",
    tplField2: "Ganglios mediastínicos:", tplVal2: "Adenopatía supraclavicular izq.",
    recLabel: "🔎 Recomendaciones", recCount: "recomendaciones",
    calcLabel: "🧮 Calculadoras", calcSize: "Tamaño tumoral", calcStage: "Estadio",
    classLabel: "🏷️ Clasificación",
    classFrom: "De tu informe, automáticamente:", classResult: "TNM Pulmón · Estadio IVA",
    botLabel: "🤖 Radiogen bot",
    botQ: "¿Seguimiento de un quiste pancreático de 2 cm?",
    botA: "Según Fukuoka 2017: control con RM a los 12 meses; si permanece estable, cada 2 años.",
    tryNow: "Probar ahora",
    btn: "Abrir Radiogen.AI",
    unsub: "Recibes este correo porque creaste una cuenta en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Hola, ${g}. ` : ""}Esto es lo que ya puedes hacer en Radiogen.AI:\n\n📋 Plantillas personalizables — por tipo de estudio, con ayuda de la IA. Incluyen las frases de normalidad (van de la mano).\n🏷️ Clasificación — estadifica tus hallazgos automáticamente.\n🤖 Radiogen bot — respuestas basadas en guías clínicas, sin inventar.\n🔎 Recomendaciones — seguimiento de ACR, Fukuoka, Bosniak… listo para insertar.\n🧮 Calculadoras — 19 sistemas: TNM, BI-RADS, TI-RADS, LI-RADS y más.\n\nAbrir: ${url}`,
  },
  en: {
    subject: "Everything you can already do in Radiogen.AI",
    headline: "This is all already in your account",
    intro: "A quick look at your tools, with real examples:",
    normTag: "Normality phrases",
    normField: "Pleura and diaphragm:", normPhrase: "No pleural effusion or pneumothorax.",
    tplLabel: "📋 Customizable templates",
    tplTitle: "Chest CT · Findings",
    tplField1: "Lung parenchyma:", tplVal1: "43 mm mass in LUL",
    tplField2: "Mediastinal nodes:", tplVal2: "Left supraclavicular adenopathy",
    recLabel: "🔎 Recommendations", recCount: "recommendations",
    calcLabel: "🧮 Calculators", calcSize: "Tumor size", calcStage: "Stage",
    classLabel: "🏷️ Classification",
    classFrom: "From your report, automatically:", classResult: "Lung TNM · Stage IVA",
    botLabel: "🤖 Radiogen bot",
    botQ: "Follow-up for a 2 cm pancreatic cyst?",
    botA: "Per Fukuoka 2017: MRI at 12 months; if it stays stable, every 2 years.",
    tryNow: "Try it now",
    btn: "Open Radiogen.AI",
    unsub: "You received this email because you created a Radiogen.AI account.",
    textTpl: (g, url) => `${g ? `Hi, ${g}. ` : ""}Here's what you can already do in Radiogen.AI:\n\n📋 Customizable templates — per study type, with AI help. They include the normality phrases (they go hand in hand).\n🏷️ Classification — automatically stage your findings.\n🤖 Radiogen bot — answers grounded in clinical guidelines, no making things up.\n🔎 Recommendations — ACR, Fukuoka, Bosniak follow-up, ready to insert.\n🧮 Calculators — 19 systems: TNM, BI-RADS, TI-RADS, LI-RADS and more.\n\nOpen: ${url}`,
  },
  pt: {
    subject: "Tudo o que você já pode fazer no Radiogen.AI",
    headline: "Tudo isto já está na sua conta",
    intro: "Uma olhada rápida nas suas ferramentas, com exemplos reais:",
    normTag: "Frases de normalidade",
    normField: "Pleura e diafragma:", normPhrase: "Sem derrame pleural ou pneumotórax.",
    tplLabel: "📋 Modelos personalizáveis",
    tplTitle: "TC tórax · Achados",
    tplField1: "Parênquima pulmonar:", tplVal1: "Massa de 43 mm no LSE",
    tplField2: "Linfonodos mediastinais:", tplVal2: "Adenopatia supraclavicular esq.",
    recLabel: "🔎 Recomendações", recCount: "recomendações",
    calcLabel: "🧮 Calculadoras", calcSize: "Tamanho tumoral", calcStage: "Estádio",
    classLabel: "🏷️ Classificação",
    classFrom: "Do seu laudo, automaticamente:", classResult: "TNM Pulmão · Estádio IVA",
    botLabel: "🤖 Radiogen bot",
    botQ: "Seguimento de um cisto pancreático de 2 cm?",
    botA: "Segundo Fukuoka 2017: RM aos 12 meses; se permanecer estável, a cada 2 anos.",
    tryNow: "Testar agora",
    btn: "Abrir o Radiogen.AI",
    unsub: "Você recebeu este e-mail porque criou uma conta no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Olá, ${g}. ` : ""}Veja o que já pode fazer no Radiogen.AI:\n\n📋 Modelos personalizáveis — por tipo de exame, com ajuda da IA. Incluem as frases de normalidade (andam juntas).\n🏷️ Classificação — estadie automaticamente seus achados.\n🤖 Radiogen bot — respostas baseadas em diretrizes clínicas, sem inventar.\n🔎 Recomendações — seguimento de ACR, Fukuoka, Bosniak… pronto para inserir.\n🧮 Calculadoras — 19 sistemas: TNM, BI-RADS, TI-RADS, LI-RADS e mais.\n\nAbrir: ${url}`,
  },
};

// LIGHT email cards. This email uses its own light shell (not the shared dark
// emailShell) so it renders light in light mode and doesn't get mangled by
// dark-mode clients the way a dark email with light cards did.
function mockCard(label: string, inner: string, href?: string, tryNow?: string): string {
  const link = href && tryNow
    ? `<div style="text-align:right;margin:7px 2px 0;"><a href="${href}" style="color:#7c3aed;font-size:12px;font-weight:700;text-decoration:none;">${tryNow} &rarr;</a></div>`
    : "";
  return `<tr><td style="padding:0 26px 18px;">
    <div style="color:#6d28d9;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 8px;">${label}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f7f8fa" style="background:#f7f8fa;border:1px solid #ececf1;border-radius:12px;">
      <tr><td style="padding:15px 16px;">${inner}</td></tr>
    </table>
    ${link}
  </td></tr>`;
}

// Shared light-email chrome (used by the onboarding + report-types emails).
function emailHeader(icon: string, headline: string, intro: string): string {
  return `<tr><td style="padding:8px 30px 8px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
        <td width="52" height="52" bgcolor="#f3f0ff" style="border-radius:15px;text-align:center;font-size:26px;">${icon}</td>
      </tr></table>
      <h1 style="color:#111827;font-size:22px;font-weight:700;margin:14px 0 10px;letter-spacing:-0.3px;line-height:1.25;">${headline}</h1>
      <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 4px;">${intro}</p>
    </td></tr>
    <tr><td style="height:14px;"></td></tr>`;
}

function lightCta(url: string, label: string): string {
  return `<tr><td style="padding:6px 32px 30px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td bgcolor="#7c3aed" style="border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:14px 44px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">${label}</a>
      </td>
    </tr></table>
  </td></tr>`;
}

function lightEmailShell(inner: string, unsub: string, lang: EmailLang): string {
  const ft = footerText[lang];
  return `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#eef1f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef1f6" style="background:#eef1f6;padding:36px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        <tr><td height="4" bgcolor="#7c3aed" style="height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        ${lightLogo()}
        ${inner}
        <tr><td style="padding:20px 32px 26px;border-top:1px solid #eef0f3;">
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0 0 8px;line-height:1.5;">${ft.tagline}</p>
          <p style="color:#b0b6bf;font-size:10px;text-align:center;margin:0 0 10px;line-height:1.5;">${ft.disclaimer}</p>
          <p style="color:#b0b6bf;font-size:10px;text-align:center;margin:0;line-height:1.4;">${unsub} &middot; <a href="${APP_URL}/support" style="color:#9ca3af;text-decoration:underline;">${ft.support}</a></p>
        </td></tr>
      </table>
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr><td style="text-align:center;padding:16px 20px 0;">
          <p style="color:#c1c6cd;font-size:10px;margin:0;">&copy; ${new Date().getFullYear()} Radiogen.AI &middot; <a href="${APP_URL}/legal" style="color:#9ca3af;text-decoration:underline;">Legal</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function pill(label: string, selected: boolean): string {
  return selected
    ? `<span style="display:inline-block;background:#2563eb;color:#ffffff;font-size:11px;font-weight:600;padding:5px 11px;border-radius:7px;margin:0 3px 3px 0;">${label}</span>`
    : `<span style="display:inline-block;background:#ffffff;color:#4b5563;font-size:11px;padding:5px 11px;border-radius:7px;border:1px solid #e5e7eb;margin:0 3px 3px 0;">${label}</span>`;
}

function chip(label: string): string {
  return `<span style="display:inline-block;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700;padding:3px 9px;border-radius:6px;margin:0 4px 0 0;">${label}</span>`;
}

function recRow(color: string, name: string, count: string): string {
  return `<tr>
    <td width="38" style="padding:5px 0;vertical-align:middle;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="28" height="28" bgcolor="${color}" style="border-radius:7px;text-align:center;font-size:14px;">📖</td>
      </tr></table>
    </td>
    <td style="padding:5px 0 5px 6px;vertical-align:middle;">
      <div style="color:#111827;font-size:12px;font-weight:700;">${name}</div>
      <div style="color:#6b7280;font-size:11px;">${count}</div>
    </td>
    <td width="16" style="color:#9ca3af;font-size:14px;text-align:right;vertical-align:middle;">›</td>
  </tr>`;
}

// Robust logo: solid-color "R" tile (bgcolor renders where gradients get stripped).
function lightLogo(): string {
  return `<tr><td style="padding:30px 32px 6px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
      <td style="vertical-align:middle;padding-right:8px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="34" height="34" bgcolor="#7c3aed" style="border-radius:8px;text-align:center;color:#ffffff;font-size:18px;font-weight:800;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">R</td>
        </tr></table>
      </td>
      <td style="vertical-align:middle;font-size:22px;font-weight:700;letter-spacing:-0.3px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
        <span style="color:#111827;">Radiogen</span><span style="color:#7c3aed;">.AI</span>
      </td>
    </tr></table>
  </td></tr>`;
}

export function renderOnboardingToolsEmail(name: string | null, lang: EmailLang = "es"): { subject: string; html: string; text: string } {
  const t = onboardingI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const dashUrl = `${APP_URL}/dashboard`;
  const toolUrl = (id: string) => `${dashUrl}?tool=${id}`;

  // 1) Templates (+ normality phrases folded in — they go hand in hand).
  const tplMock = `<div style="color:#6b7280;font-size:11px;font-weight:700;margin:0 0 9px;">&#128196; ${t.tplTitle}</div>
    <div style="font-size:12px;color:#111827;line-height:2;">
      <span style="color:#6b7280;">${t.tplField1}</span> <span style="background:#e0e7ff;color:#3730a3;padding:2px 7px;border-radius:5px;">${t.tplVal1}</span><br>
      <span style="color:#6b7280;">${t.tplField2}</span> <span style="background:#d1fae5;color:#065f46;padding:2px 7px;border-radius:5px;">${t.tplVal2}</span>
    </div>
    <div style="border-top:1px solid #e5e7eb;margin:12px 0 10px;"></div>
    <div style="color:#6d28d9;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin:0 0 6px;">${t.normTag}</div>
    <div style="font-size:12px;color:#111827;line-height:1.6;">
      <span style="color:#6b7280;">${t.normField}</span> <span style="background:#ede9fe;color:#6d28d9;font-weight:600;padding:2px 7px;border-radius:5px;">${t.normPhrase}</span>
    </div>`;

  const recMock = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${recRow("#0d9488", "ACR Incidental Findings 2017", `5 ${t.recCount}`)}
      ${recRow("#d97706", "Bosniak 2019", `5 ${t.recCount}`)}
    </table>`;

  const calcMock = `<div style="color:#6b7280;font-size:11px;margin:0 0 6px;">${t.calcSize}</div>
    <div style="margin:0 0 10px;">${pill("≤1 cm", false)}${pill("2–3 cm", false)}${pill("5–7 cm", true)}${pill(">7 cm", false)}</div>
    <div style="font-size:11px;color:#6b7280;margin:0 0 10px;">T &#8594; <strong style="color:#111827;">T3</strong>&nbsp;&nbsp; N &#8594; <strong style="color:#111827;">N3</strong>&nbsp;&nbsp; M &#8594; <strong style="color:#111827;">M1a</strong></div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fef2f2" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <tr><td style="padding:9px 13px;">
        <div style="color:#b91c1c;font-size:9px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;">${t.calcStage}</div>
        <div style="color:#b91c1c;font-size:15px;font-weight:800;">${t.calcStage} IVA <span style="color:#ef4444;font-size:12px;font-weight:600;">· T3 N3 M1a</span></div>
      </td></tr>
    </table>`;

  const classMock = `<div style="color:#6b7280;font-size:11px;margin:0 0 8px;">${t.classFrom}</div>
    <div style="color:#111827;font-size:13px;font-weight:700;margin:0 0 9px;">${t.classResult}</div>
    <div>${chip("T3")}${chip("N3")}${chip("M1a")}</div>`;

  const botMock = `<div style="text-align:right;margin:0 0 9px;">
      <span style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:12px;line-height:1.5;padding:8px 12px;border-radius:12px 12px 3px 12px;max-width:82%;text-align:left;">${t.botQ}</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px 12px 12px 3px;padding:10px 13px;font-size:12px;color:#111827;line-height:1.55;">${t.botA}</div>`;

  const inner = `${emailHeader("&#9889;", t.headline, t.intro)}
        ${mockCard(t.tplLabel, tplMock, toolUrl("templates"), t.tryNow)}
        ${mockCard(t.classLabel, classMock, toolUrl("classify"), t.tryNow)}
        ${mockCard(t.botLabel, botMock, toolUrl("bot"), t.tryNow)}
        ${mockCard(t.recLabel, recMock, toolUrl("recommendations"), t.tryNow)}
        ${mockCard(t.calcLabel, calcMock, toolUrl("calculators"), t.tryNow)}
        ${lightCta(dashUrl, t.btn)}`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting, dashUrl);
  return { subject: t.subject, html, text };
}

export async function sendOnboardingToolsEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const { subject, html, text } = renderOnboardingToolsEmail(name, lang);
  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `onboarding-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1c) Report-types email — sent ~48h after signup
// ---------------------------------------------------------------------------

type RTSample = {
  secParenq: string; secMed: string; secPleura: string; secOseo: string;
  find1: string; find2: string; normalPleura: string; normalOseo: string;
  restNormal: string; prose: string;
};

const reportTypesI18n: Record<EmailLang, {
  subject: string; headline: string; intro: string;
  n1: string; d1: string; n2: string; d2: string; n3: string; d3: string; n4: string; d4: string;
  sample: RTSample; btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "4 formas de crear tus informes en Radiogen.AI",
    headline: "Elige cómo redactar cada informe",
    intro: "Según lo que dictes, Radiogen.AI genera el informe en 4 formatos. Cámbialo con un clic en el selector de tipo de informe:",
    n1: "📋 Estructurado", d1: "Informe completo con todas las secciones de la plantilla. Las no mencionadas se rellenan con normalidad.",
    n2: "🎯 Solo hallazgos", d2: "Solo las secciones con hallazgos + un párrafo final que resume que el resto es normal.",
    n3: "🎙️ Solo dictado", d3: "Solo lo que has dictado. No añade normalidad ni campos no mencionados.",
    n4: "📝 No estructurado", d4: "Hallazgos en texto narrativo ordenados por importancia clínica, sin encabezados de sección.",
    sample: {
      secParenq: "PARÉNQUIMA", secMed: "MEDIASTINO", secPleura: "PLEURA", secOseo: "ÓSEO",
      find1: "Masa de 43 mm en LSI.", find2: "Adenopatía supraclavicular izq.",
      normalPleura: "Sin derrame pleural.", normalOseo: "Sin lesiones óseas.",
      restNormal: "El resto de estructuras evaluadas sin alteraciones.",
      prose: "Masa pulmonar de 43 mm en lóbulo superior izquierdo, con adenopatía supraclavicular izquierda asociada. No se observa derrame pleural.",
    },
    btn: "Crear un informe",
    unsub: "Recibes este correo porque creaste una cuenta en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Hola, ${g}. ` : ""}Radiogen.AI puede generar tu informe en 4 formatos:\n\n📋 Estructurado — completo, con todas las secciones; las no mencionadas se rellenan con normalidad.\n🎯 Solo hallazgos — solo secciones con hallazgos + un párrafo final resumiendo que el resto es normal.\n🎙️ Solo dictado — solo lo que has dictado, sin añadir normalidad.\n📝 No estructurado — hallazgos en texto narrativo, sin encabezados de sección.\n\nCámbialo en el selector de tipo de informe.\n\nCrear un informe: ${url}`,
  },
  en: {
    subject: "4 ways to write your reports in Radiogen.AI",
    headline: "Choose how to write each report",
    intro: "Depending on what you dictate, Radiogen.AI generates the report in 4 formats. Switch with one click in the report-type selector:",
    n1: "📋 Structured", d1: "Full report with every template section. Unmentioned sections are filled with radiological normality.",
    n2: "🎯 Findings only", d2: "Only the sections with findings + a final paragraph summarizing that the rest is normal.",
    n3: "🎙️ Dictation only", d3: "Only what you dictated. No normality or unmentioned fields are added.",
    n4: "📝 Unstructured", d4: "Narrative findings ordered by clinical importance, without section headings.",
    sample: {
      secParenq: "PARENCHYMA", secMed: "MEDIASTINUM", secPleura: "PLEURA", secOseo: "BONES",
      find1: "43 mm mass in LUL.", find2: "Left supraclavicular adenopathy.",
      normalPleura: "No pleural effusion.", normalOseo: "No bone lesions.",
      restNormal: "The remaining evaluated structures show no abnormalities.",
      prose: "43 mm pulmonary mass in the left upper lobe, with associated left supraclavicular adenopathy. No pleural effusion is seen.",
    },
    btn: "Create a report",
    unsub: "You received this email because you created a Radiogen.AI account.",
    textTpl: (g, url) => `${g ? `Hi, ${g}. ` : ""}Radiogen.AI can generate your report in 4 formats:\n\n📋 Structured — full, with every section; unmentioned ones filled with normality.\n🎯 Findings only — only sections with findings + a final paragraph summarizing the rest is normal.\n🎙️ Dictation only — only what you dictated, no normality added.\n📝 Unstructured — narrative findings, without section headings.\n\nSwitch it in the report-type selector.\n\nCreate a report: ${url}`,
  },
  pt: {
    subject: "4 formas de criar seus laudos no Radiogen.AI",
    headline: "Escolha como redigir cada laudo",
    intro: "Conforme o que você ditar, o Radiogen.AI gera o laudo em 4 formatos. Troque com um clique no seletor de tipo de laudo:",
    n1: "📋 Estruturado", d1: "Laudo completo com todas as seções do modelo. As não mencionadas são preenchidas com normalidade.",
    n2: "🎯 Apenas achados", d2: "Apenas as seções com achados + um parágrafo final resumindo que o restante é normal.",
    n3: "🎙️ Apenas ditado", d3: "Apenas o que você ditou. Não adiciona normalidade nem campos não mencionados.",
    n4: "📝 Não estruturado", d4: "Achados em texto narrativo ordenados por importância clínica, sem cabeçalhos de seção.",
    sample: {
      secParenq: "PARÊNQUIMA", secMed: "MEDIASTINO", secPleura: "PLEURA", secOseo: "ÓSSEO",
      find1: "Massa de 43 mm no LSE.", find2: "Adenopatia supraclavicular esq.",
      normalPleura: "Sem derrame pleural.", normalOseo: "Sem lesões ósseas.",
      restNormal: "As demais estruturas avaliadas sem alterações.",
      prose: "Massa pulmonar de 43 mm no lobo superior esquerdo, com adenopatia supraclavicular esquerda associada. Sem derrame pleural.",
    },
    btn: "Criar um laudo",
    unsub: "Você recebeu este e-mail porque criou uma conta no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Olá, ${g}. ` : ""}O Radiogen.AI pode gerar seu laudo em 4 formatos:\n\n📋 Estruturado — completo, com todas as seções; as não mencionadas preenchidas com normalidade.\n🎯 Apenas achados — apenas seções com achados + um parágrafo final resumindo que o restante é normal.\n🎙️ Apenas ditado — apenas o que você ditou, sem adicionar normalidade.\n📝 Não estruturado — achados em texto narrativo, sem cabeçalhos de seção.\n\nTroque no seletor de tipo de laudo.\n\nCriar um laudo: ${url}`,
  },
};

export function renderReportTypesEmail(name: string | null, lang: EmailLang = "es"): { subject: string; html: string; text: string } {
  const t = reportTypesI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const dashUrl = `${APP_URL}/dashboard`;
  const s = t.sample;
  const sec = (label: string, val: string, muted = false) =>
    `<span style="color:#6b7280;font-weight:700;">${label}:</span> <span style="color:${muted ? "#9ca3af" : "#111827"};">${val}</span>`;
  const desc = (d: string) => `<div style="color:#6b7280;font-size:11px;line-height:1.5;margin:0 0 11px;">${d}</div>`;

  const structuredMock = `${desc(t.d1)}<div style="font-size:12px;line-height:1.95;">
      ${sec(s.secParenq, s.find1)}<br>${sec(s.secMed, s.find2)}<br>${sec(s.secPleura, s.normalPleura, true)}<br>${sec(s.secOseo, s.normalOseo, true)}
    </div>`;
  const compactMock = `${desc(t.d2)}<div style="font-size:12px;line-height:1.95;">
      ${sec(s.secParenq, s.find1)}<br>${sec(s.secMed, s.find2)}<br><span style="color:#9ca3af;font-style:italic;">${s.restNormal}</span>
    </div>`;
  const dictationMock = `${desc(t.d3)}<div style="font-size:12px;line-height:1.9;color:#111827;">${s.find1}<br>${s.find2}</div>`;
  const unstructuredMock = `${desc(t.d4)}<div style="font-size:12px;line-height:1.7;color:#111827;">${s.prose}</div>`;

  const inner = `${emailHeader("&#128196;", t.headline, t.intro)}
        ${mockCard(t.n1, structuredMock)}
        ${mockCard(t.n2, compactMock)}
        ${mockCard(t.n3, dictationMock)}
        ${mockCard(t.n4, unstructuredMock)}
        ${lightCta(dashUrl, t.btn)}`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting, dashUrl);
  return { subject: t.subject, html, text };
}

export async function sendReportTypesEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const { subject, html, text } = renderReportTypesEmail(name, lang);
  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `reporttypes-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1d) Guideline-extraction email — sent ~5 days after signup
// ---------------------------------------------------------------------------

const guidelinesI18n: Record<EmailLang, {
  subject: string; headline: string; intro: string;
  step1: string; gSource: string; gText: string;
  step2: string; r1t: string; r1x: string; r2t: string; r2x: string;
  btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Convierte tus guías clínicas en recomendaciones",
    headline: "Extrae recomendaciones de cualquier guía",
    intro: "Pega el texto de una guía clínica y la IA extrae las recomendaciones, listas para insertar en tus informes.",
    step1: "1 · Pegas el texto de la guía", gSource: "Fleischner 2017",
    gText: "Nódulo sólido de 6-8 mm en paciente de bajo riesgo: TC de control a los 6-12 meses; si permanece estable, considerar seguimiento a los 18-24 meses…",
    step2: "2 · La IA extrae las recomendaciones",
    r1t: "Nódulo sólido 6-8 mm · bajo riesgo", r1x: "TC de control a los 6-12 meses; si estable, considerar 18-24 meses.",
    r2t: "Nódulo sólido > 8 mm", r2x: "Considerar TC a los 3 meses, PET-TC o biopsia según probabilidad.",
    btn: "Probar ahora",
    unsub: "Recibes este correo porque creaste una cuenta en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Hola, ${g}. ` : ""}¿Sabías que puedes convertir tus guías clínicas en recomendaciones?\n\nEn la sección de Recomendaciones, pega el texto de una guía (Fleischner, ACR, Bosniak…) y la IA extrae las recomendaciones concretas, listas para insertar en tus informes con un clic.\n\nProbar ahora: ${url}`,
  },
  en: {
    subject: "Turn your clinical guidelines into recommendations",
    headline: "Extract recommendations from any guideline",
    intro: "Paste a clinical guideline's text and the AI extracts the recommendations, ready to insert in your reports.",
    step1: "1 · You paste the guideline text", gSource: "Fleischner 2017",
    gText: "Solid 6-8 mm nodule in a low-risk patient: follow-up CT at 6-12 months; if stable, consider follow-up at 18-24 months…",
    step2: "2 · The AI extracts the recommendations",
    r1t: "Solid nodule 6-8 mm · low risk", r1x: "Follow-up CT at 6-12 months; if stable, consider 18-24 months.",
    r2t: "Solid nodule > 8 mm", r2x: "Consider CT at 3 months, PET-CT or biopsy depending on probability.",
    btn: "Try it now",
    unsub: "You received this email because you created a Radiogen.AI account.",
    textTpl: (g, url) => `${g ? `Hi, ${g}. ` : ""}Did you know you can turn your clinical guidelines into recommendations?\n\nIn the Recommendations section, paste a guideline's text (Fleischner, ACR, Bosniak…) and the AI extracts the concrete recommendations, ready to insert in your reports with one click.\n\nTry it now: ${url}`,
  },
  pt: {
    subject: "Transforme suas diretrizes clínicas em recomendações",
    headline: "Extraia recomendações de qualquer diretriz",
    intro: "Cole o texto de uma diretriz clínica e a IA extrai as recomendações, prontas para inserir nos seus laudos.",
    step1: "1 · Você cola o texto da diretriz", gSource: "Fleischner 2017",
    gText: "Nódulo sólido de 6-8 mm em paciente de baixo risco: TC de controle em 6-12 meses; se permanecer estável, considerar seguimento em 18-24 meses…",
    step2: "2 · A IA extrai as recomendações",
    r1t: "Nódulo sólido 6-8 mm · baixo risco", r1x: "TC de controle em 6-12 meses; se estável, considerar 18-24 meses.",
    r2t: "Nódulo sólido > 8 mm", r2x: "Considerar TC em 3 meses, PET-TC ou biópsia conforme a probabilidade.",
    btn: "Testar agora",
    unsub: "Você recebeu este e-mail porque criou uma conta no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `Olá, ${g}. ` : ""}Você sabia que pode transformar suas diretrizes clínicas em recomendações?\n\nNa seção de Recomendações, cole o texto de uma diretriz (Fleischner, ACR, Bosniak…) e a IA extrai as recomendações concretas, prontas para inserir nos seus laudos com um clique.\n\nTestar agora: ${url}`,
  },
};

export function renderGuidelinesEmail(name: string | null, lang: EmailLang = "es"): { subject: string; html: string; text: string } {
  const t = guidelinesI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const recUrl = `${APP_URL}/dashboard?tool=recommendations`;

  const pasteMock = `<div style="color:#6b7280;font-size:11px;font-weight:700;margin:0 0 7px;">&#128203; ${t.gSource}</div>
    <div style="font-size:12px;color:#374151;line-height:1.6;font-style:italic;background:#eef1f6;border-radius:8px;padding:10px 12px;">${t.gText}</div>`;

  const recItem = (title: string, text: string, last = false) =>
    `<div style="padding:2px 0 ${last ? "0" : "9px"};${last ? "" : "border-bottom:1px solid #ececf1;margin-bottom:9px;"}">
      <div style="font-size:12px;font-weight:700;color:#111827;">${title}</div>
      <div style="font-size:11px;color:#6b7280;line-height:1.5;margin-top:2px;">${text}</div>
    </div>`;
  const extractMock = `${recItem(t.r1t, t.r1x)}${recItem(t.r2t, t.r2x, true)}`;

  const inner = `${emailHeader("&#128214;", t.headline, t.intro)}
        ${mockCard(t.step1, pasteMock)}
        ${mockCard(t.step2, extractMock)}
        ${lightCta(recUrl, t.btn)}`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting, recUrl);
  return { subject: t.subject, html, text };
}

export async function sendGuidelinesEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const { subject, html, text } = renderGuidelinesEmail(name, lang);
  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `guidelines-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1e) Limit-reached email — sent once per billing cycle when a user runs out
// of monthly reports (the moment they're most ready to upgrade).
// ---------------------------------------------------------------------------

const limitI18n: Record<EmailLang, {
  subject: string; headline: string;
  intro: (limit: string, plan: string, renewal: string) => string;
  usageLabel: string; nextTitle: string;
  nextLine: (reports: string, minutes: string) => string;
  nextNote: string; btnUpgrade: string;
  extraTitle: string; extraLine: string; btnExtra: string;
  unsub: string;
  textTpl: (g: string, limit: string, plan: string, renewal: string, url: string) => string;
}> = {
  es: {
    subject: "Te has quedado sin informes este mes",
    headline: "Has usado todos tus informes del mes",
    intro: (limit, plan, renewal) => `Has generado los ${limit} informes que incluye tu plan ${plan}. Tu cupo se renueva el ${renewal}.`,
    usageLabel: "informes usados",
    nextTitle: "¿No puedes esperar? Sube de plan y sigue ahora mismo",
    nextLine: (reports, minutes) => `${reports} informes al mes + ${minutes} min de dictado`,
    nextNote: "El cambio es inmediato: sigues informando en 1 minuto.",
    btnUpgrade: "Mejorar mi plan",
    extraTitle: "¿Necesitas más este mes?",
    extraLine: "Puedes añadir un paquete de 100 informes extra desde tu cuenta.",
    btnExtra: "Añadir informes extra",
    unsub: "Recibes este correo porque tienes una cuenta en Radiogen.AI.",
    textTpl: (g, limit, plan, renewal, url) => `${g ? `Hola, ${g}. ` : ""}Has usado los ${limit} informes de tu plan ${plan} este mes. Tu cupo se renueva el ${renewal}.\n\nSi no quieres esperar, mejora tu plan y sigue informando ahora mismo (el cambio es inmediato):\n${url}`,
  },
  en: {
    subject: "You've run out of reports this month",
    headline: "You've used all your reports for the month",
    intro: (limit, plan, renewal) => `You've generated the ${limit} reports included in your ${plan} plan. Your quota renews on ${renewal}.`,
    usageLabel: "reports used",
    nextTitle: "Can't wait? Upgrade and keep going right now",
    nextLine: (reports, minutes) => `${reports} reports/month + ${minutes} min of dictation`,
    nextNote: "The change is immediate: you're back to reporting in 1 minute.",
    btnUpgrade: "Upgrade my plan",
    extraTitle: "Need more this month?",
    extraLine: "You can add a 100-report extra pack from your account.",
    btnExtra: "Add extra reports",
    unsub: "You received this email because you have a Radiogen.AI account.",
    textTpl: (g, limit, plan, renewal, url) => `${g ? `Hi, ${g}. ` : ""}You've used the ${limit} reports of your ${plan} plan this month. Your quota renews on ${renewal}.\n\nIf you don't want to wait, upgrade and keep reporting right now (the change is immediate):\n${url}`,
  },
  pt: {
    subject: "Seus laudos deste mês acabaram",
    headline: "Você usou todos os seus laudos do mês",
    intro: (limit, plan, renewal) => `Você gerou os ${limit} laudos incluídos no seu plano ${plan}. Sua cota renova em ${renewal}.`,
    usageLabel: "laudos usados",
    nextTitle: "Não pode esperar? Faça upgrade e continue agora mesmo",
    nextLine: (reports, minutes) => `${reports} laudos/mês + ${minutes} min de ditado`,
    nextNote: "A mudança é imediata: você volta a laudar em 1 minuto.",
    btnUpgrade: "Melhorar meu plano",
    extraTitle: "Precisa de mais este mês?",
    extraLine: "Você pode adicionar um pacote de 100 laudos extras na sua conta.",
    btnExtra: "Adicionar laudos extras",
    unsub: "Você recebeu este e-mail porque tem uma conta no Radiogen.AI.",
    textTpl: (g, limit, plan, renewal, url) => `${g ? `Olá, ${g}. ` : ""}Você usou os ${limit} laudos do seu plano ${plan} este mês. Sua cota renova em ${renewal}.\n\nSe não quiser esperar, melhore seu plano e continue laudando agora mesmo (a mudança é imediata):\n${url}`,
  },
};

export type LimitEmailOpts = {
  planLabel: string;
  used: number;
  limit: number;
  renewalDate: string; // pre-formatted, in the user's language
  nextPlan: { label: string; reports: number; dictationMinutes: number; price: number } | null;
};

export function renderLimitReachedEmail(name: string | null, lang: EmailLang, o: LimitEmailOpts): { subject: string; html: string; text: string } {
  const t = limitI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const accountUrl = `${APP_URL}/dashboard?tool=account`;

  const usageMock = `<div style="font-size:12px;color:#6b7280;margin:0 0 8px;"><strong style="color:#b91c1c;font-size:16px;">${o.used} / ${o.limit}</strong> ${t.usageLabel}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fee2e2" style="background:#fee2e2;border-radius:6px;">
      <tr><td height="8" bgcolor="#ef4444" style="border-radius:6px;font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>`;

  const offerMock = o.nextPlan
    ? `<div style="font-size:13px;font-weight:700;color:#111827;margin:0 0 4px;">${o.nextPlan.label} — $${o.nextPlan.price}/mes</div>
       <div style="font-size:12px;color:#374151;margin:0 0 6px;">${t.nextLine(String(o.nextPlan.reports), String(o.nextPlan.dictationMinutes))}</div>
       <div style="font-size:11px;color:#059669;">✓ ${t.nextNote}</div>`
    : `<div style="font-size:12px;color:#374151;">${t.extraLine}</div>`;

  const inner = `${emailHeader("&#128200;", t.headline, t.intro(String(o.limit), o.planLabel, o.renewalDate))}
        ${mockCard(t.usageLabel, usageMock)}
        ${mockCard(o.nextPlan ? t.nextTitle : t.extraTitle, offerMock)}
        ${lightCta(accountUrl, o.nextPlan ? t.btnUpgrade : t.btnExtra)}`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting, String(o.limit), o.planLabel, o.renewalDate, accountUrl);
  return { subject: t.subject, html, text };
}

export async function sendLimitReachedEmail(to: string, name: string | null, lang: EmailLang, opts: LimitEmailOpts) {
  const { subject, html, text } = renderLimitReachedEmail(name, lang, opts);
  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `limit-${Date.now()}`,
    },
  });
}

// ---------------------------------------------------------------------------
// 1f) Enterprise-inquiry emails — landing page pricing → "Solicitar cotización"
// ---------------------------------------------------------------------------

const ENTERPRISE_LEAD_EMAIL = process.env.ENTERPRISE_LEAD_EMAIL || "info@radiogen.ai";

// Internal alert (silent to the visitor): sent the moment someone submits the
// Enterprise contact form, so a high-value lead gets a fast reply instead of
// waiting to be spotted in the admin panel.
export async function sendEnterpriseInquiryNotification(name: string, email: string, message: string) {
  if (!process.env.RESEND_API_KEY) return;
  await sendWithRetry({
    from: FROM, replyTo: email, to: ENTERPRISE_LEAD_EMAIL,
    subject: `Solicitud Enterprise: ${name} (${email})`,
    html: `
      <h2>Nueva solicitud de plan Enterprise</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Nombre:</td><td>${name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${email}</td></tr>
      </table>
      <p style="font-weight:bold;margin-top:14px;">Mensaje:</p>
      <p style="white-space:pre-wrap;">${message}</p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">También queda registrada en el panel de admin → Lista de espera → Enterprise.</p>
    `,
    text: `Nueva solicitud de plan Enterprise\n\nNombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
  }).catch((err) => console.error("[enterprise-inquiry] notification error:", err instanceof Error ? err.message : err));
}

const enterpriseAckI18n: Record<EmailLang, { subject: string; headline: string; intro: string; note: string; unsub: string; textTpl: (g: string) => string }> = {
  es: {
    subject: "Hemos recibido tu solicitud — Radiogen.AI",
    headline: "Gracias por tu interés",
    intro: "Hemos recibido tu solicitud sobre el plan Enterprise de Radiogen.AI. Nuestro equipo la revisará y se pondrá en contacto contigo a la mayor brevedad para preparar una propuesta a medida.",
    note: "Si mientras tanto tienes alguna pregunta, puedes responder directamente a este correo.",
    unsub: "Recibes este correo porque solicitaste información sobre Radiogen.AI Enterprise.",
    textTpl: (g) => `${g ? `Hola, ${g}. ` : ""}Hemos recibido tu solicitud sobre el plan Enterprise de Radiogen.AI. Nuestro equipo se pondrá en contacto contigo pronto.\n\nSi tienes alguna pregunta mientras tanto, responde directamente a este correo.`,
  },
  en: {
    subject: "We've received your request — Radiogen.AI",
    headline: "Thanks for your interest",
    intro: "We've received your Radiogen.AI Enterprise inquiry. Our team will review it and get back to you shortly to put together a tailored proposal.",
    note: "If you have any questions in the meantime, just reply to this email.",
    unsub: "You received this email because you requested information about Radiogen.AI Enterprise.",
    textTpl: (g) => `${g ? `Hi, ${g}. ` : ""}We've received your Radiogen.AI Enterprise inquiry. Our team will get back to you shortly.\n\nIf you have any questions in the meantime, just reply to this email.`,
  },
  pt: {
    subject: "Recebemos sua solicitação — Radiogen.AI",
    headline: "Obrigado pelo seu interesse",
    intro: "Recebemos sua solicitação sobre o plano Enterprise do Radiogen.AI. Nossa equipe vai analisá-la e entrar em contato em breve para preparar uma proposta sob medida.",
    note: "Se tiver alguma dúvida nesse meio tempo, é só responder este e-mail.",
    unsub: "Você recebeu este e-mail porque solicitou informações sobre o Radiogen.AI Enterprise.",
    textTpl: (g) => `${g ? `Olá, ${g}. ` : ""}Recebemos sua solicitação sobre o plano Enterprise do Radiogen.AI. Nossa equipe entrará em contato em breve.\n\nSe tiver alguma dúvida nesse meio tempo, é só responder este e-mail.`,
  },
};

export async function sendEnterpriseInquiryAck(to: string, name: string | null, lang: EmailLang = "es") {
  const t = enterpriseAckI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";

  const inner = `${emailHeader("&#127970;", t.headline, t.intro)}
        <tr><td style="padding:0 32px 24px;">
          <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0;">${t.note}</p>
        </td></tr>`;

  const html = lightEmailShell(inner, t.unsub, lang);
  const text = t.textTpl(greeting);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: {
      "List-Unsubscribe": `<mailto:${REPLY_TO}?subject=unsubscribe>, <${APP_URL}/support>`,
      "X-Entity-Ref-ID": `enterprise-ack-${Date.now()}`,
    },
  }).catch((err) => console.error("[enterprise-inquiry] ack email error:", err instanceof Error ? err.message : err));
}

// ---------------------------------------------------------------------------
// 2) Pending approval email — non-LATAM users
// ---------------------------------------------------------------------------

const pendingI18n: Record<EmailLang, {
  subject: string; greetWith: string; greetWithout: string;
  intro: string; steps: string; timeline: string; meanwhile: string;
  btn: string; unsub: string;
  textTpl: (g: string) => string;
}> = {
  es: {
    subject: "Solicitud recibida — Radiogen.AI",
    greetWith: "&iexcl;Hola, ",
    greetWithout: "&iexcl;Solicitud recibida!",
    intro: "Hemos recibido tu solicitud de registro y estamos encantados de que quieras unirte a Radiogen.AI.",
    steps: "<strong style=\"color:#e2e8f0;\">Pr&oacute;ximo paso:</strong> nuestro equipo verificar&aacute; tu perfil para garantizar la mejor experiencia posible. Este proceso es r&aacute;pido y normalmente se completa en pocas horas.",
    timeline: "Recibir&aacute;s un correo de confirmaci&oacute;n en cuanto tu cuenta est&eacute; aprobada, con acceso inmediato a la plataforma.",
    meanwhile: "&iquest;Tienes un c&oacute;digo de invitaci&oacute;n? Puedes acceder de forma inmediata:",
    btn: "Usar c&oacute;digo de invitaci&oacute;n",
    unsub: "Recibes este correo porque solicitaste una cuenta en Radiogen.AI.",
    textTpl: (g) => `¡Hola${g ? `, ${g}` : ""}!\n\nHemos recibido tu solicitud de registro en Radiogen.AI.\n\nPróximo paso: nuestro equipo verificará tu perfil. Este proceso normalmente se completa en pocas horas.\n\nRecibirás un correo de confirmación cuando tu cuenta esté aprobada.\n\n¿Tienes un código de invitación? Úsalo en: ${APP_URL}/invite`,
  },
  en: {
    subject: "Request received — Radiogen.AI",
    greetWith: "Hello, ",
    greetWithout: "Request received!",
    intro: "We&rsquo;ve received your registration request and we&rsquo;re glad you want to join Radiogen.AI.",
    steps: "<strong style=\"color:#e2e8f0;\">Next step:</strong> our team will verify your profile to ensure the best possible experience. This process is quick and usually completed within a few hours.",
    timeline: "You&rsquo;ll receive a confirmation email as soon as your account is approved, with immediate access to the platform.",
    meanwhile: "Have an invitation code? You can get instant access:",
    btn: "Use invitation code",
    unsub: "You received this email because you requested a Radiogen.AI account.",
    textTpl: (g) => `Hello${g ? `, ${g}` : ""}!\n\nWe've received your registration request for Radiogen.AI.\n\nNext step: our team will verify your profile. This usually takes a few hours.\n\nYou'll receive a confirmation email once approved.\n\nHave an invitation code? Use it at: ${APP_URL}/invite`,
  },
  pt: {
    subject: "Solicitação recebida — Radiogen.AI",
    greetWith: "Ol&aacute;, ",
    greetWithout: "Solicita&ccedil;&atilde;o recebida!",
    intro: "Recebemos sua solicita&ccedil;&atilde;o de registro e estamos felizes que voc&ecirc; queira se juntar ao Radiogen.AI.",
    steps: "<strong style=\"color:#e2e8f0;\">Pr&oacute;ximo passo:</strong> nossa equipe verificar&aacute; seu perfil para garantir a melhor experi&ecirc;ncia poss&iacute;vel. Este processo &eacute; r&aacute;pido e normalmente se completa em poucas horas.",
    timeline: "Voc&ecirc; receber&aacute; um email de confirma&ccedil;&atilde;o assim que sua conta for aprovada, com acesso imediato &agrave; plataforma.",
    meanwhile: "Tem um c&oacute;digo de convite? Pode acessar de forma imediata:",
    btn: "Usar c&oacute;digo de convite",
    unsub: "Recebeu este email porque solicitou uma conta no Radiogen.AI.",
    textTpl: (g) => `Olá${g ? `, ${g}` : ""}!\n\nRecebemos sua solicitação de registro no Radiogen.AI.\n\nPróximo passo: nossa equipe verificará seu perfil. Normalmente em poucas horas.\n\nVocê receberá um email de confirmação quando aprovado.\n\nTem um código de convite? Use-o em: ${APP_URL}/invite`,
  },
};

export async function sendPendingApprovalEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = pendingI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9203;</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${t.greetWith}${greeting}!` : t.greetWithout}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 16px;">
            ${t.intro}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.75;text-align:center;margin:0 0 12px;">
            ${t.steps}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.timeline}
          </p>
        </td></tr>
        ${divider()}
        <tr><td style="padding:0 32px 6px;">
          <p style="color:#8b949e;font-size:13px;line-height:1.5;text-align:center;margin:0 0 8px;">${t.meanwhile}</p>
        </td></tr>
        ${cta(`${APP_URL}/invite`, t.btn)}`, t.unsub, lang);

  const text = t.textTpl(greeting);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `pending-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 3) Approval email — admin approves a pending user
// ---------------------------------------------------------------------------

const approvalI18n: Record<EmailLang, {
  subject: string; welcomePrefix: string; welcome: string;
  intro: string; planLabel: string;
  feat1: string; feat2: string; feat3: string; feat4: string;
  tip: string; btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Tu cuenta en Radiogen.AI ha sido aprobada",
    welcomePrefix: "&iexcl;Bienvenido/a, ",
    welcome: "&iexcl;Tu cuenta ha sido aprobada!",
    intro: "Ya puedes acceder a Radiogen.AI. Como agradecimiento por unirte, te hemos activado el <strong style=\"color:#a78bfa;\">plan Starter gratuito durante 30 d&iacute;as</strong>, sin necesidad de tarjeta de cr&eacute;dito.",
    planLabel: "Plan Starter &mdash; 30 d&iacute;as gratis",
    feat1: "150 informes al mes incluidos",
    feat2: "120 minutos de dictado de voz",
    feat3: "Clasificaci&oacute;n autom&aacute;tica y recomendaciones cl&iacute;nicas",
    feat4: "Radiogen Bot para consultas de tu base de conocimiento",
    tip: "Tu periodo gratuito comienza ahora. Al finalizar los 30 d&iacute;as, tu cuenta pasar&aacute; autom&aacute;ticamente al plan Free (20 informes/mes). Puedes suscribirte a un plan de pago en cualquier momento desde tu cuenta.",
    btn: "Iniciar sesi&oacute;n ahora",
    unsub: "Recibes este correo porque tu cuenta en Radiogen.AI ha sido aprobada.",
    textTpl: (g, url) => `¡Bienvenido/a${g ? `, ${g}` : ""}!\n\nTu cuenta en Radiogen.AI ha sido aprobada.\n\nPlan Starter gratuito (30 días):\n✓ 150 informes al mes incluidos\n✓ 120 minutos de dictado de voz\n✓ Clasificación automática y recomendaciones clínicas\n✓ Radiogen Bot para consultas\n\n💡 Al finalizar los 30 días, pasarás al plan Free automáticamente. Puedes suscribirte cuando quieras.\n\nIniciar sesión: ${url}`,
  },
  en: {
    subject: "Your Radiogen.AI account has been approved",
    welcomePrefix: "Welcome, ",
    welcome: "Your account has been approved!",
    intro: "You can now access Radiogen.AI. As a thank you for joining, we&rsquo;ve activated your <strong style=\"color:#a78bfa;\">free Starter plan for 30 days</strong>, no credit card required.",
    planLabel: "Starter Plan &mdash; 30 days free",
    feat1: "150 reports per month included",
    feat2: "120 minutes of voice dictation",
    feat3: "Automatic classification and clinical recommendations",
    feat4: "Radiogen Bot for knowledge base queries",
    tip: "Your free period starts now. After 30 days, your account will automatically switch to the Free plan (20 reports/month). You can subscribe to a paid plan anytime from your account.",
    btn: "Sign in now",
    unsub: "You received this email because your Radiogen.AI account was approved.",
    textTpl: (g, url) => `Welcome${g ? `, ${g}` : ""}!\n\nYour Radiogen.AI account has been approved.\n\nFree Starter plan (30 days):\n✓ 150 reports per month included\n✓ 120 minutes of voice dictation\n✓ Automatic classification and clinical recommendations\n✓ Radiogen Bot for queries\n\n💡 After 30 days, you'll switch to the Free plan automatically. Subscribe anytime.\n\nSign in: ${url}`,
  },
  pt: {
    subject: "Sua conta no Radiogen.AI foi aprovada",
    welcomePrefix: "Bem-vindo/a, ",
    welcome: "Sua conta foi aprovada!",
    intro: "Voc&ecirc; j&aacute; pode acessar o Radiogen.AI. Como agradecimento por se juntar, ativamos o <strong style=\"color:#a78bfa;\">plano Starter gratuito por 30 dias</strong>, sem necessidade de cart&atilde;o de cr&eacute;dito.",
    planLabel: "Plano Starter &mdash; 30 dias gr&aacute;tis",
    feat1: "150 laudos por m&ecirc;s inclu&iacute;dos",
    feat2: "120 minutos de ditado por voz",
    feat3: "Classifica&ccedil;&atilde;o autom&aacute;tica e recomenda&ccedil;&otilde;es cl&iacute;nicas",
    feat4: "Radiogen Bot para consultas da sua base de conhecimento",
    tip: "Seu per&iacute;odo gratuito come&ccedil;a agora. Ap&oacute;s 30 dias, sua conta passar&aacute; automaticamente para o plano Free (20 laudos/m&ecirc;s). Voc&ecirc; pode assinar um plano pago a qualquer momento.",
    btn: "Iniciar sess&atilde;o agora",
    unsub: "Recebeu este email porque sua conta no Radiogen.AI foi aprovada.",
    textTpl: (g, url) => `Bem-vindo/a${g ? `, ${g}` : ""}!\n\nSua conta no Radiogen.AI foi aprovada.\n\nPlano Starter gratuito (30 dias):\n✓ 150 laudos por mês incluídos\n✓ 120 minutos de ditado por voz\n✓ Classificação automática e recomendações clínicas\n✓ Radiogen Bot para consultas\n\n💡 Após 30 dias, você passa automaticamente para o plano Free. Assine quando quiser.\n\nIniciar sessão: ${url}`,
  },
};

export async function sendApprovalEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = approvalI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const loginUrl = `${APP_URL}/auth/login`;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#x2713;</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${t.welcomePrefix}${greeting}!` : t.welcome}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.intro}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 4px;">
          <p style="color:#8b949e;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;text-align:center;margin:0 0 10px;">${t.planLabel}</p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            ${featureRow("📄", t.feat1)}
            ${featureRow("🎙️", t.feat2)}
            ${featureRow("🧮", t.feat3)}
            ${featureRow("🤖", t.feat4)}
          </table>
        </td></tr>
        ${tipBox(t.tip)}
        ${cta(loginUrl, t.btn)}`,
    t.unsub, lang);

  const text = t.textTpl(greeting, loginUrl);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `approval-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 4) Waitlist confirmation (legacy — kept for old /api/waitlist route)
// ---------------------------------------------------------------------------

const waitlistI18n: Record<EmailLang, {
  subject: string; greeting: string; intro: string; status: string; timeline: string;
  inviteHint: string; btn: string; unsub: string;
  textTpl: (name: string) => string;
}> = {
  es: {
    subject: "Estás en la lista de espera — Radiogen.AI",
    greeting: "&iexcl;Hola, ",
    intro: "Gracias por tu inter&eacute;s en Radiogen.AI. Te hemos registrado en nuestra lista de espera.",
    status: "<strong style=\"color:#e2e8f0;\">&iquest;Qu&eacute; significa esto?</strong> Estamos ampliando el acceso de forma gradual para ofrecer la mejor experiencia a cada usuario. Tu solicitud est&aacute; en cola y te avisaremos en cuanto haya un lugar disponible.",
    timeline: "Recibir&aacute;s un correo de acceso en cuanto est&eacute; listo. No necesitas hacer nada m&aacute;s.",
    inviteHint: "&iquest;Tienes un c&oacute;digo de invitaci&oacute;n de otro radiólogo? Puedes saltar la cola:",
    btn: "Usar c&oacute;digo de invitaci&oacute;n",
    unsub: "Recibes este correo porque te registraste en la lista de espera de Radiogen.AI.",
    textTpl: (name) => `¡Hola, ${name}!\n\nGracias por tu interés en Radiogen.AI. Te hemos registrado en nuestra lista de espera.\n\nEstamos ampliando el acceso gradualmente. Te avisaremos cuando haya un lugar.\n\n¿Tienes un código de invitación? Úsalo en: ${APP_URL}/invite`,
  },
  en: {
    subject: "You're on the waitlist — Radiogen.AI",
    greeting: "Hello, ",
    intro: "Thank you for your interest in Radiogen.AI. You&rsquo;ve been added to our waitlist.",
    status: "<strong style=\"color:#e2e8f0;\">What does this mean?</strong> We&rsquo;re gradually expanding access to ensure the best experience for every user. Your request is queued and we&rsquo;ll notify you as soon as a spot opens up.",
    timeline: "You&rsquo;ll receive an access email as soon as you&rsquo;re in. No further action needed.",
    inviteHint: "Have an invitation code from another radiologist? Skip the wait:",
    btn: "Use invitation code",
    unsub: "You received this email because you signed up for the Radiogen.AI waitlist.",
    textTpl: (name) => `Hello, ${name}!\n\nThank you for your interest in Radiogen.AI. You've been added to our waitlist.\n\nWe're gradually expanding access. We'll notify you when a spot opens.\n\nHave an invitation code? Use it at: ${APP_URL}/invite`,
  },
  pt: {
    subject: "Você está na lista de espera — Radiogen.AI",
    greeting: "Ol&aacute;, ",
    intro: "Obrigado pelo interesse no Radiogen.AI. Registramos voc&ecirc; na nossa lista de espera.",
    status: "<strong style=\"color:#e2e8f0;\">O que isso significa?</strong> Estamos ampliando o acesso gradualmente para garantir a melhor experi&ecirc;ncia a cada usu&aacute;rio. Sua solicita&ccedil;&atilde;o est&aacute; na fila e avisaremos assim que houver uma vaga.",
    timeline: "Voc&ecirc; receber&aacute; um email de acesso quando estiver pronto. N&atilde;o precisa fazer mais nada.",
    inviteHint: "Tem um c&oacute;digo de convite de outro radiologista? Pule a fila:",
    btn: "Usar c&oacute;digo de convite",
    unsub: "Recebeu este email porque se registrou na lista de espera do Radiogen.AI.",
    textTpl: (name) => `Olá, ${name}!\n\nObrigado pelo interesse no Radiogen.AI. Registramos você na nossa lista de espera.\n\nEstamos ampliando o acesso gradualmente. Avisaremos quando houver uma vaga.\n\nTem um código de convite? Use-o em: ${APP_URL}/invite`,
  },
};

export async function sendWaitlistConfirmation(to: string, name: string, lang: EmailLang = "es") {
  const t = waitlistI18n[lang];

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(96,165,250,0.12);border:1px solid rgba(96,165,250,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#128172;</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${t.greeting}${name}!
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 16px;">
            ${t.intro}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.75;text-align:center;margin:0 0 12px;">
            ${t.status}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.timeline}
          </p>
        </td></tr>
        ${divider()}
        <tr><td style="padding:0 32px 6px;">
          <p style="color:#8b949e;font-size:13px;line-height:1.5;text-align:center;margin:0 0 8px;">${t.inviteHint}</p>
        </td></tr>
        ${cta(`${APP_URL}/invite`, t.btn)}`,
    t.unsub, lang);

  const text = t.textTpl(name);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `waitlist-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 5) Payment failed email
// ---------------------------------------------------------------------------

const paymentI18n: Record<EmailLang, {
  subject: string; titleWith: string; titleWithout: string;
  intro: string; reassure: string; steps: string;
  step1: string; step2: string; step3: string;
  btn: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    subject: "Acción requerida: actualiza tu método de pago — Radiogen.AI",
    titleWith: ", necesitamos actualizar tu m&eacute;todo de pago",
    titleWithout: "Necesitamos actualizar tu m&eacute;todo de pago",
    intro: "Hemos intentado procesar el cobro de tu suscripci&oacute;n pero no ha sido posible. <strong style=\"color:#e2e8f0;\">Tu cuenta sigue activa</strong> mientras actualizas tu informaci&oacute;n de pago.",
    reassure: "No perder&aacute;s ninguno de tus datos, plantillas ni configuraciones. Solo necesitamos que actualices tu m&eacute;todo de pago para continuar con el servicio.",
    steps: "Pasos para resolverlo:",
    step1: "Accede a tu cuenta en Radiogen.AI",
    step2: "Ve a Cuenta &rarr; Gesti&oacute;n de suscripci&oacute;n",
    step3: "Actualiza tu tarjeta o m&eacute;todo de pago",
    btn: "Actualizar m&eacute;todo de pago",
    unsub: "Recibes este correo porque tienes una suscripci&oacute;n activa en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, n` : "N"}ecesitamos actualizar tu método de pago.\n\nHemos intentado procesar el cobro de tu suscripción pero no ha sido posible. Tu cuenta sigue activa mientras actualizas la información.\n\nPasos:\n1. Accede a tu cuenta en Radiogen.AI\n2. Ve a Cuenta → Gestión de suscripción\n3. Actualiza tu tarjeta o método de pago\n\nActualizar: ${url}`,
  },
  en: {
    subject: "Action required: update your payment method — Radiogen.AI",
    titleWith: ", we need to update your payment method",
    titleWithout: "We need to update your payment method",
    intro: "We attempted to process your subscription payment but were unable to. <strong style=\"color:#e2e8f0;\">Your account remains active</strong> while you update your payment information.",
    reassure: "You won&rsquo;t lose any of your data, templates, or settings. We just need you to update your payment method to continue the service.",
    steps: "Steps to resolve this:",
    step1: "Log in to your Radiogen.AI account",
    step2: "Go to Account &rarr; Subscription management",
    step3: "Update your card or payment method",
    btn: "Update payment method",
    unsub: "You received this email because you have an active subscription on Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, w` : "W"}e need to update your payment method.\n\nWe attempted to process your subscription payment but were unable to. Your account remains active.\n\nSteps:\n1. Log in to Radiogen.AI\n2. Go to Account → Subscription management\n3. Update your card or payment method\n\nUpdate: ${url}`,
  },
  pt: {
    subject: "Ação necessária: atualize seu método de pagamento — Radiogen.AI",
    titleWith: ", precisamos atualizar seu m&eacute;todo de pagamento",
    titleWithout: "Precisamos atualizar seu m&eacute;todo de pagamento",
    intro: "Tentamos processar a cobran&ccedil;a da sua assinatura, mas n&atilde;o foi poss&iacute;vel. <strong style=\"color:#e2e8f0;\">Sua conta permanece ativa</strong> enquanto atualiza suas informa&ccedil;&otilde;es de pagamento.",
    reassure: "Voc&ecirc; n&atilde;o perder&aacute; nenhum dado, modelo ou configura&ccedil;&atilde;o. Apenas precisamos que atualize seu m&eacute;todo de pagamento para continuar o servi&ccedil;o.",
    steps: "Passos para resolver:",
    step1: "Acesse sua conta no Radiogen.AI",
    step2: "V&aacute; para Conta &rarr; Gerenciamento de assinatura",
    step3: "Atualize seu cart&atilde;o ou m&eacute;todo de pagamento",
    btn: "Atualizar m&eacute;todo de pagamento",
    unsub: "Recebeu este email porque tem uma assinatura ativa no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, p` : "P"}recisamos atualizar seu método de pagamento.\n\nTentamos processar a cobrança da sua assinatura, mas não foi possível. Sua conta permanece ativa.\n\nPassos:\n1. Acesse sua conta no Radiogen.AI\n2. Vá para Conta → Gerenciamento de assinatura\n3. Atualize seu cartão ou método de pagamento\n\nAtualizar: ${url}`,
  },
};

export async function sendPaymentFailedEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = paymentI18n[lang];
  const portalUrl = `${APP_URL}/dashboard`;
  const greeting = name ? name.split(" ")[0] : "";

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9888;&#65039;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}${t.titleWith}` : t.titleWithout}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 12px;">
            ${t.intro}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.reassure}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;">
            <tr><td>
              <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 10px;">${t.steps}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:24px;vertical-align:top;padding:3px 0;"><span style="color:#a78bfa;font-size:13px;font-weight:700;">1.</span></td>
                  <td style="color:#9ca3af;font-size:13px;line-height:1.6;padding:3px 0;">${t.step1}</td>
                </tr>
                <tr>
                  <td style="width:24px;vertical-align:top;padding:3px 0;"><span style="color:#a78bfa;font-size:13px;font-weight:700;">2.</span></td>
                  <td style="color:#9ca3af;font-size:13px;line-height:1.6;padding:3px 0;">${t.step2}</td>
                </tr>
                <tr>
                  <td style="width:24px;vertical-align:top;padding:3px 0;"><span style="color:#a78bfa;font-size:13px;font-weight:700;">3.</span></td>
                  <td style="color:#9ca3af;font-size:13px;line-height:1.6;padding:3px 0;">${t.step3}</td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        ${cta(portalUrl, t.btn)}`,
    t.unsub, lang);

  const text = t.textTpl(greeting, portalUrl);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `payment-failed-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 6) Plan change email
// ---------------------------------------------------------------------------

const planLimits: Record<string, { reports: number; dictation: number }> = {
  free: { reports: 20, dictation: 30 },
  resident: { reports: 150, dictation: 120 },
  starter: { reports: 150, dictation: 120 },
  professional: { reports: 400, dictation: 300 },
};

const planChangeI18n: Record<EmailLang, {
  subjectPrefix: string; titleWith: string; titleWithout: string;
  intro: string; newPlanLabel: string;
  reportsLabel: string; dictationLabel: string; reportsUnit: string; dictationUnit: string;
  nextSteps: string; btn: string; unsub: string;
  textTpl: (g: string, plan: string, url: string) => string;
}> = {
  es: {
    subjectPrefix: "Tu plan en Radiogen.AI:",
    titleWith: ", tu plan se ha actualizado",
    titleWithout: "Tu plan se ha actualizado",
    intro: "Hemos actualizado tu suscripci&oacute;n. Los cambios ya est&aacute;n reflejados en tu cuenta.",
    newPlanLabel: "Tu nuevo plan",
    reportsLabel: "Informes al mes",
    dictationLabel: "Minutos de dictado",
    reportsUnit: "informes/mes",
    dictationUnit: "min de dictado",
    nextSteps: "Puedes continuar usando Radiogen.AI con normalidad. Todos tus datos, plantillas y configuraciones se mantienen intactos.",
    btn: "Ir a mi dashboard",
    unsub: "Recibes este correo porque cambiaste tu plan en Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, t` : "T"}u plan en Radiogen.AI se ha actualizado.\n\nTu nuevo plan: ${plan}\n\nTodos tus datos y configuraciones se mantienen intactos.\n\nIr al dashboard: ${url}`,
  },
  en: {
    subjectPrefix: "Your Radiogen.AI plan:",
    titleWith: ", your plan has been updated",
    titleWithout: "Your plan has been updated",
    intro: "We&rsquo;ve updated your subscription. The changes are already reflected in your account.",
    newPlanLabel: "Your new plan",
    reportsLabel: "Reports per month",
    dictationLabel: "Dictation minutes",
    reportsUnit: "reports/month",
    dictationUnit: "min dictation",
    nextSteps: "You can continue using Radiogen.AI as usual. All your data, templates, and settings remain intact.",
    btn: "Go to my dashboard",
    unsub: "You received this email because you changed your plan on Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, y` : "Y"}our Radiogen.AI plan has been updated.\n\nYour new plan: ${plan}\n\nAll your data and settings remain intact.\n\nGo to dashboard: ${url}`,
  },
  pt: {
    subjectPrefix: "Seu plano no Radiogen.AI:",
    titleWith: ", seu plano foi atualizado",
    titleWithout: "Seu plano foi atualizado",
    intro: "Atualizamos sua assinatura. As altera&ccedil;&otilde;es j&aacute; est&atilde;o refletidas na sua conta.",
    newPlanLabel: "Seu novo plano",
    reportsLabel: "Laudos por m&ecirc;s",
    dictationLabel: "Minutos de ditado",
    reportsUnit: "laudos/m&ecirc;s",
    dictationUnit: "min de ditado",
    nextSteps: "Pode continuar usando o Radiogen.AI normalmente. Todos os seus dados, modelos e configura&ccedil;&otilde;es permanecem intactos.",
    btn: "Ir ao meu dashboard",
    unsub: "Recebeu este email porque alterou seu plano no Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, s` : "S"}eu plano no Radiogen.AI foi atualizado.\n\nSeu novo plano: ${plan}\n\nTodos os seus dados e configurações permanecem intactos.\n\nIr ao dashboard: ${url}`,
  },
};

export async function sendPlanChangeEmail(to: string, name: string | null, newPlan: string, lang: EmailLang = "es") {
  const t = planChangeI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const planNames: Record<string, string> = {
    free: "Free", starter: "Starter", resident: "Residente",
    professional: "Professional", enterprise: "Enterprise",
  };
  const planLabel = planNames[newPlan] || newPlan;
  const limits = planLimits[newPlan] || planLimits.free;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(45,212,191,0.12);border:1px solid rgba(45,212,191,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:26px;">&#x2713;</span>
          </div>
          <h1 style="color:#fff;font-size:24px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}${t.titleWith}` : t.titleWithout}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.intro}
          </p>
        </td></tr>
        <!-- Plan card -->
        <tr><td style="padding:0 32px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:14px;overflow:hidden;">
            <tr><td style="padding:20px 24px;text-align:center;">
              <p style="color:#8b949e;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 6px;">${t.newPlanLabel}</p>
              <p style="color:#a78bfa;font-size:28px;font-weight:800;margin:0 0 14px;letter-spacing:-0.5px;">${planLabel}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="padding:6px 16px;background:rgba(255,255,255,0.04);border-radius:8px;text-align:center;">
                    <span style="color:#e2e8f0;font-size:18px;font-weight:700;">${limits.reports}</span><br>
                    <span style="color:#6b7280;font-size:10px;">${t.reportsUnit}</span>
                  </td>
                  <td style="width:12px;"></td>
                  <td style="padding:6px 16px;background:rgba(255,255,255,0.04);border-radius:8px;text-align:center;">
                    <span style="color:#e2e8f0;font-size:18px;font-weight:700;">${limits.dictation}</span><br>
                    <span style="color:#6b7280;font-size:10px;">${t.dictationUnit}</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <p style="color:#9ca3af;font-size:13px;line-height:1.65;text-align:center;margin:0;">
            ${t.nextSteps}
          </p>
        </td></tr>
        ${cta(`${APP_URL}/dashboard`, t.btn)}`,
    t.unsub, lang);

  const text = t.textTpl(greeting, planLabel, `${APP_URL}/dashboard`);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: `${t.subjectPrefix} ${planLabel}`, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `plan-change-${Date.now()}` },
  });
}

const residentReviewedI18n: Record<EmailLang, { approvedSubject: string; rejectedSubject: string; approvedTitle: string; approvedBody: string; rejectedTitle: string; rejectedBody: string; approvedBtn: string; unsub: string }> = {
  es: {
    approvedSubject: "Tu residencia ha sido verificada",
    rejectedSubject: "Tu verificación de residente",
    approvedTitle: "Residencia verificada",
    approvedBody: "Hemos verificado tu certificado de residencia. Para activar el plan Residente ($4.99/mes), completa el pago desde el botón. Tendrás acceso completo en cuanto se confirme.",
    rejectedTitle: "No pudimos verificar tu residencia",
    rejectedBody: "No hemos podido validar el certificado enviado. Puedes revisar los datos y volver a enviarlo desde la plataforma, o continuar con el plan gratuito.",
    approvedBtn: "Completar pago y activar",
    unsub: "Recibes este correo por tu solicitud de verificación de residente.",
  },
  en: {
    approvedSubject: "Your residency has been verified",
    rejectedSubject: "Your resident verification",
    approvedTitle: "Residency verified",
    approvedBody: "We've verified your residency certificate. To activate the Resident plan ($4.99/mo), complete the payment using the button. You'll get full access as soon as it's confirmed.",
    rejectedTitle: "We couldn't verify your residency",
    rejectedBody: "We were unable to validate the certificate you sent. You can review the details and resubmit it from the platform, or continue on the free plan.",
    approvedBtn: "Complete payment and activate",
    unsub: "You're receiving this because of your resident verification request.",
  },
  pt: {
    approvedSubject: "Sua residência foi verificada",
    rejectedSubject: "Sua verificação de residente",
    approvedTitle: "Residência verificada",
    approvedBody: "Verificamos seu certificado de residência. Para ativar o plano Residente ($4.99/mês), conclua o pagamento pelo botão. Você terá acesso completo assim que for confirmado.",
    rejectedTitle: "Não conseguimos verificar sua residência",
    rejectedBody: "Não foi possível validar o certificado enviado. Você pode revisar os dados e reenviá-lo pela plataforma, ou continuar no plano gratuito.",
    approvedBtn: "Concluir pagamento e ativar",
    unsub: "Você recebe este e-mail devido à sua solicitação de verificação de residente.",
  },
};

export async function sendResidentReviewedEmail(to: string, name: string | null, status: "approved" | "rejected", lang: EmailLang = "es") {
  const t = residentReviewedI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const approved = status === "approved";
  const title = approved ? t.approvedTitle : t.rejectedTitle;
  const body = approved ? t.approvedBody : t.rejectedBody;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <h1 style="color:#fff;font-size:23px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}, ${title.charAt(0).toLowerCase()}${title.slice(1)}` : title}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">${body}</p>
        </td></tr>
        ${approved ? cta(`${APP_URL}/auth/verify-resident`, t.approvedBtn) : ""}`,
    t.unsub, lang);

  const text = `${greeting ? greeting + ", " : ""}${body}${approved ? `\n\n${APP_URL}/auth/verify-resident` : ""}`;

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to,
    subject: approved ? t.approvedSubject : t.rejectedSubject, html, text,
    headers: { "X-Entity-Ref-ID": `resident-reviewed-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// Trial charge reminder (day 14 of the 15-day trial)
// ---------------------------------------------------------------------------

const trialReminderI18n: Record<EmailLang, {
  subject: string; titleWith: string; titleWithout: string;
  intro: (date: string, price: string) => string;
  keepTitle: string; keep: string; cancelTitle: string;
  cancelHow: (date: string) => string; noRefund: string;
  btn: string; unsub: string;
  textTpl: (g: string, date: string, price: string, url: string) => string;
}> = {
  es: {
    subject: "Tu prueba gratuita termina pronto — primer cargo en camino",
    titleWith: ", tu prueba gratuita termina pronto",
    titleWithout: "Tu prueba gratuita termina pronto",
    intro: (date, price) => `Tu prueba gratuita de 15 d&iacute;as de Radiogen.AI finaliza el <strong style="color:#fff;">${date}</strong>. Ese d&iacute;a se realizar&aacute; el primer cargo de <strong style="color:#fff;">${price}/mes</strong> (plan Starter) en la tarjeta registrada.`,
    keepTitle: "Si quieres continuar",
    keep: "No tienes que hacer nada: tu acceso contin&uacute;a sin interrupciones.",
    cancelTitle: "Si no deseas continuar",
    cancelHow: (date) => `Cancela la suscripci&oacute;n antes del ${date} desde tu cuenta (Cuenta &rarr; Cancelar suscripci&oacute;n) y no se realizar&aacute; ning&uacute;n cargo.`,
    noRefund: "Importante: los pagos no son reembolsables. Si no cancelas antes de esa fecha, el cargo del mes no se devuelve, aunque conservar&aacute;s el acceso durante todo el periodo pagado.",
    btn: "Gestionar mi suscripci&oacute;n",
    unsub: "Recibes este correo porque tu periodo de prueba en Radiogen.AI está por finalizar.",
    textTpl: (g, date, price, url) => `${g ? `${g}, t` : "T"}u prueba gratuita de Radiogen.AI finaliza el ${date}.\n\nEse día se realizará el primer cargo de ${price}/mes (plan Starter) en tu tarjeta.\n\n- Si quieres continuar, no tienes que hacer nada.\n- Si no deseas continuar, cancela antes del ${date} desde tu cuenta (Cuenta → Cancelar suscripción).\n\nImportante: los pagos no son reembolsables.\n\nGestionar mi suscripción: ${url}`,
  },
  en: {
    subject: "Your free trial ends soon — first charge coming up",
    titleWith: ", your free trial ends soon",
    titleWithout: "Your free trial ends soon",
    intro: (date, price) => `Your 15-day free trial of Radiogen.AI ends on <strong style="color:#fff;">${date}</strong>. On that day the first charge of <strong style="color:#fff;">${price}/mo</strong> (Starter plan) will be made to your registered card.`,
    keepTitle: "If you want to continue",
    keep: "You don&rsquo;t need to do anything &mdash; your access continues uninterrupted.",
    cancelTitle: "If you don&rsquo;t want to continue",
    cancelHow: (date) => `Cancel your subscription before ${date} from your account (Account &rarr; Cancel subscription) and no charge will be made.`,
    noRefund: "Important: payments are non-refundable. If you don&rsquo;t cancel before that date, the month&rsquo;s charge is not returned, although you keep access for the entire paid period.",
    btn: "Manage my subscription",
    unsub: "You received this email because your Radiogen.AI trial period is about to end.",
    textTpl: (g, date, price, url) => `${g ? `${g}, y` : "Y"}our Radiogen.AI free trial ends on ${date}.\n\nOn that day the first charge of ${price}/mo (Starter plan) will be made to your card.\n\n- If you want to continue, you don't need to do anything.\n- If you don't want to continue, cancel before ${date} from your account (Account → Cancel subscription).\n\nImportant: payments are non-refundable.\n\nManage my subscription: ${url}`,
  },
  pt: {
    subject: "Seu teste grátis termina em breve — primeira cobrança a caminho",
    titleWith: ", seu teste grátis termina em breve",
    titleWithout: "Seu teste grátis termina em breve",
    intro: (date, price) => `Seu teste gr&aacute;tis de 15 dias do Radiogen.AI termina em <strong style="color:#fff;">${date}</strong>. Nesse dia ser&aacute; feita a primeira cobran&ccedil;a de <strong style="color:#fff;">${price}/m&ecirc;s</strong> (plano Starter) no cart&atilde;o registrado.`,
    keepTitle: "Se quiser continuar",
    keep: "Voc&ecirc; n&atilde;o precisa fazer nada &mdash; seu acesso continua sem interrup&ccedil;&otilde;es.",
    cancelTitle: "Se n&atilde;o quiser continuar",
    cancelHow: (date) => `Cancele a assinatura antes de ${date} na sua conta (Conta &rarr; Cancelar assinatura) e nenhuma cobran&ccedil;a ser&aacute; feita.`,
    noRefund: "Importante: os pagamentos n&atilde;o s&atilde;o reembols&aacute;veis. Se n&atilde;o cancelar antes dessa data, a cobran&ccedil;a do m&ecirc;s n&atilde;o &eacute; devolvida, embora voc&ecirc; mantenha o acesso durante todo o per&iacute;odo pago.",
    btn: "Gerenciar minha assinatura",
    unsub: "Você recebeu este e-mail porque seu período de teste no Radiogen.AI está prestes a terminar.",
    textTpl: (g, date, price, url) => `${g ? `${g}, s` : "S"}eu teste grátis do Radiogen.AI termina em ${date}.\n\nNesse dia será feita a primeira cobrança de ${price}/mês (plano Starter) no seu cartão.\n\n- Se quiser continuar, não precisa fazer nada.\n- Se não quiser continuar, cancele antes de ${date} na sua conta (Conta → Cancelar assinatura).\n\nImportante: os pagamentos não são reembolsáveis.\n\nGerenciar minha assinatura: ${url}`,
  },
};

const TRIAL_LOCALE: Record<EmailLang, string> = { es: "es-ES", en: "en-US", pt: "pt-BR" };

export async function sendTrialReminderEmail(
  to: string,
  name: string | null,
  lang: EmailLang = "es",
  trialEndsAt: string | Date = new Date(),
  monthlyPrice = 7.99,
) {
  const t = trialReminderI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const date = new Date(trialEndsAt).toLocaleDateString(TRIAL_LOCALE[lang], { day: "numeric", month: "long", year: "numeric" });
  const price = `$${monthlyPrice}`;
  const portalUrl = `${APP_URL}/dashboard`;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9200;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 14px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}${t.titleWith}` : t.titleWithout}
          </h1>
          <p style="color:#c9d1d9;font-size:14px;line-height:1.75;text-align:center;margin:0 0 24px;">
            ${t.intro(date, price)}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px 20px;">
            <tr><td>
              <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 6px;">${t.keepTitle}</p>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0 0 14px;">${t.keep}</p>
              <p style="color:#e2e8f0;font-size:13px;font-weight:600;margin:0 0 6px;">${t.cancelTitle}</p>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">${t.cancelHow(date)}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 20px;">
          <p style="color:#fbbf24;font-size:12px;line-height:1.7;text-align:center;margin:0;">
            ${t.noRefund}
          </p>
        </td></tr>
        ${cta(portalUrl, t.btn)}`,
    t.unsub, lang);

  const text = t.textTpl(greeting, date, price, portalUrl);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `trial-reminder-${Date.now()}` },
  });
}
