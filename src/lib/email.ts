import { Resend } from "resend";

type EmailLang = "es" | "en" | "pt";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>";
const REPLY_TO = process.env.EMAIL_REPLY_TO || "soporte@radiogen.ai";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://radiogen.ai";

async function sendWithRetry(params: Parameters<Resend["emails"]["send"]>[0], maxRetries = 2): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await getResend().emails.send(params);
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt === maxRetries) {
        console.error(`[email] FAILED after ${maxRetries + 1} attempts: to=${(params as { to: string }).to}, subject=${(params as { subject: string }).subject}, error=${msg}`);
        return;
      }
      console.warn(`[email] Attempt ${attempt + 1} failed, retrying: ${msg}`);
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

const LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="7" fill="url(#eg)"/>
  <path d="M10 8h7a5 5 0 0 1 0 10h-3l5 6" stroke="white" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <line x1="10" y1="13" x2="17" y2="13" stroke="rgba(255,255,255,0.5)" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="24" cy="24" r="2.2" fill="#c4b5fd"/>
  <defs><linearGradient id="eg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
    <stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#7c3aed"/>
  </linearGradient></defs>
</svg>`;

const LOGO_DATA_URI = `data:image/svg+xml;base64,${typeof Buffer !== "undefined" ? Buffer.from(LOGO_SVG).toString("base64") : ""}`;

function logoBlock() {
  return `
    <tr><td style="padding:32px 32px 24px;text-align:center;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;">
            <img src="${LOGO_DATA_URI}" alt="" width="32" height="32" style="display:block;border-radius:7px;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;">
              <span style="color:#ffffff;">Radiogen</span><span style="color:#a78bfa;">.AI</span>
            </span>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

const footerText: Record<EmailLang, { tagline: string; disclaimer: string; support: string }> = {
  es: {
    tagline: "Radiogen.AI &mdash; Asistente de informes radiol&oacute;gicos con IA.",
    disclaimer: "Los textos generados son borradores que deben ser validados antes de su uso cl&iacute;nico.",
    support: "Soporte",
  },
  en: {
    tagline: "Radiogen.AI &mdash; AI-powered radiology report assistant.",
    disclaimer: "Generated texts are drafts that must be validated before clinical use.",
    support: "Support",
  },
  pt: {
    tagline: "Radiogen.AI &mdash; Assistente de laudos radiol&oacute;gicos com IA.",
    disclaimer: "Os textos gerados s&atilde;o rascunhos que devem ser validados antes do uso cl&iacute;nico.",
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
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header gradient bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7c3aed,#3b82f6,#7c3aed);"></td></tr>
        ${logoBlock()}
        ${content}
        <!-- Footer -->
        <tr><td style="padding:20px 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
            <tr><td style="text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin-bottom:12px;">
                <tr>
                  <td style="vertical-align:middle;padding-right:6px;">
                    <img src="${LOGO_DATA_URI}" alt="" width="16" height="16" style="display:block;border-radius:4px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:12px;font-weight:600;color:#6b7280;">Radiogen<span style="color:#7c3aed;">.AI</span></span>
                  </td>
                </tr>
              </table>
              <p style="color:#6b7280;font-size:11px;text-align:center;margin:0 0 6px;line-height:1.5;">
                ${ft.tagline}
              </p>
              <p style="color:#4b5563;font-size:10px;text-align:center;margin:0 0 10px;line-height:1.4;">
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
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
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
  return `<tr><td style="padding:0 32px 32px;text-align:center;">
  <a href="${href}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed 0%,#3b82f6 100%);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 4px 14px rgba(124,58,237,0.3);">
    ${label}
  </a>
</td></tr>`;
}

function featureRow(text: string) {
  return `<tr><td style="padding:8px 16px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.12);border-radius:10px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:24px;vertical-align:middle;"><span style="color:#a78bfa;font-size:14px;">&#10003;</span></td>
      <td style="color:#d1d5db;font-size:13px;vertical-align:middle;">${text}</td>
    </tr>
  </table>
</td></tr>
<tr><td style="height:6px;"></td></tr>`;
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
  greetWith: string; greetWithout: string; desc: string;
  feat1: string; feat2: string; feat3: string;
  btn: string; subject: string; unsub: string;
  textTpl: (g: string, url: string) => string;
}> = {
  es: {
    greetWith: "&iexcl;Bienvenido/a, ", greetWithout: "&iexcl;Bienvenido/a a Radiogen.AI!",
    desc: "Tu cuenta est&aacute; lista. Ya puedes empezar a crear informes radiol&oacute;gicos profesionales con asistencia de IA.",
    feat1: "30 informes/mes en el plan gratuito",
    feat2: "Dictado por voz integrado",
    feat3: "Plantillas profesionales incluidas",
    btn: "Ir al dashboard",
    subject: "¡Bienvenido/a a Radiogen.AI! Tu cuenta está lista",
    unsub: "Recibes este correo porque creaste una cuenta en Radiogen.AI.",
    textTpl: (g, url) => `¡Bienvenido/a${g ? `, ${g}` : ""}!\n\nTu cuenta en Radiogen.AI está lista.\n\n✓ 30 informes/mes en el plan gratuito\n✓ Dictado por voz integrado\n✓ Plantillas profesionales incluidas\n\nIr al dashboard: ${url}`,
  },
  en: {
    greetWith: "Welcome, ", greetWithout: "Welcome to Radiogen.AI!",
    desc: "Your account is ready. Start creating professional radiology reports with AI assistance.",
    feat1: "30 reports/month on the free plan",
    feat2: "Built-in voice dictation",
    feat3: "Professional templates included",
    btn: "Go to dashboard",
    subject: "Welcome to Radiogen.AI! Your account is ready",
    unsub: "You received this email because you created a Radiogen.AI account.",
    textTpl: (g, url) => `Welcome${g ? `, ${g}` : ""}!\n\nYour Radiogen.AI account is ready.\n\n✓ 30 reports/month on the free plan\n✓ Built-in voice dictation\n✓ Professional templates included\n\nGo to dashboard: ${url}`,
  },
  pt: {
    greetWith: "Bem-vindo/a, ", greetWithout: "Bem-vindo/a ao Radiogen.AI!",
    desc: "Sua conta est&aacute; pronta. Comece a criar laudos radiol&oacute;gicos profissionais com assist&ecirc;ncia de IA.",
    feat1: "30 laudos/m&ecirc;s no plano gratuito",
    feat2: "Ditado por voz integrado",
    feat3: "Modelos profissionais inclu&iacute;dos",
    btn: "Ir ao dashboard",
    subject: "Bem-vindo/a ao Radiogen.AI! Sua conta está pronta",
    unsub: "Recebeu este email porque criou uma conta no Radiogen.AI.",
    textTpl: (g, url) => `Bem-vindo/a${g ? `, ${g}` : ""}!\n\nSua conta no Radiogen.AI está pronta.\n\n✓ 30 laudos/mês no plano gratuito\n✓ Ditado por voz integrado\n✓ Modelos profissionais incluídos\n\nIr ao dashboard: ${url}`,
  },
};

export async function sendWelcomeEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = welcomeI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const dashUrl = `${APP_URL}/dashboard`;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#127881;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${greeting ? `${t.greetWith}${greeting}!` : t.greetWithout}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
            ${t.desc}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow(t.feat1)}
            ${featureRow(t.feat2)}
            ${featureRow(t.feat3)}
          </table>
        </td></tr>
        ${cta(dashUrl, t.btn)}`, t.unsub, lang);

  const text = t.textTpl(greeting, dashUrl);

  await sendWithRetry({
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `welcome-${Date.now()}` },
  });
}

// ---------------------------------------------------------------------------
// 2) Pending approval email — non-LATAM users
// ---------------------------------------------------------------------------

const pendingI18n: Record<EmailLang, {
  greetWith: string; greetWithout: string; desc: string; detail: string;
  subject: string; unsub: string;
  textTpl: (g: string) => string;
}> = {
  es: {
    greetWith: "&iexcl;Hola, ", greetWithout: "&iexcl;Solicitud recibida!",
    desc: "Hemos recibido tu solicitud de registro en Radiogen.AI.",
    detail: "Nuestro equipo revisar&aacute; tu cuenta en las pr&oacute;ximas horas. Te enviaremos un correo cuando est&eacute; aprobada y puedas acceder a la plataforma.",
    subject: "Solicitud recibida — Radiogen.AI",
    unsub: "Recibes este correo porque solicitaste una cuenta en Radiogen.AI.",
    textTpl: (g) => `¡Hola${g ? `, ${g}` : ""}!\n\nHemos recibido tu solicitud de registro en Radiogen.AI.\n\nNuestro equipo revisará tu cuenta en las próximas horas. Te enviaremos un correo cuando esté aprobada.`,
  },
  en: {
    greetWith: "Hello, ", greetWithout: "Request received!",
    desc: "We have received your Radiogen.AI registration request.",
    detail: "Our team will review your account within the next few hours. We&rsquo;ll send you an email once it&rsquo;s approved and you can access the platform.",
    subject: "Request received — Radiogen.AI",
    unsub: "You received this email because you requested a Radiogen.AI account.",
    textTpl: (g) => `Hello${g ? `, ${g}` : ""}!\n\nWe have received your Radiogen.AI registration request.\n\nOur team will review your account within the next few hours. We'll send you an email once it's approved.`,
  },
  pt: {
    greetWith: "Ol&aacute;, ", greetWithout: "Solicita&ccedil;&atilde;o recebida!",
    desc: "Recebemos sua solicita&ccedil;&atilde;o de registro no Radiogen.AI.",
    detail: "Nossa equipe revisar&aacute; sua conta nas pr&oacute;ximas horas. Enviaremos um email quando for aprovada e voc&ecirc; poder acessar a plataforma.",
    subject: "Solicitação recebida — Radiogen.AI",
    unsub: "Recebeu este email porque solicitou uma conta no Radiogen.AI.",
    textTpl: (g) => `Olá${g ? `, ${g}` : ""}!\n\nRecebemos sua solicitação de registro no Radiogen.AI.\n\nNossa equipe revisará sua conta nas próximas horas. Enviaremos um email quando for aprovada.`,
  },
};

export async function sendPendingApprovalEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = pendingI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9203;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${greeting ? `${t.greetWith}${greeting}!` : t.greetWithout}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 12px;">
            ${t.desc}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 32px;">
            ${t.detail}
          </p>
        </td></tr>`, t.unsub, lang);

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
  welcomePrefix: string; welcome: string; desc: string; feat1: string; feat2: string; feat3: string;
  btn: string; subject: string; unsub: string; textTpl: (g: string, url: string) => string;
}> = {
  es: {
    welcomePrefix: "&iexcl;Bienvenido/a, ", welcome: "&iexcl;Tu cuenta ha sido aprobada!",
    desc: "Ya puedes acceder a Radiogen.AI con tu plan Starter gratuito durante 30 d&iacute;as.",
    feat1: "150 informes/mes incluidos", feat2: "120 minutos de dictado por voz", feat3: "Sin tarjeta de cr&eacute;dito requerida",
    btn: "Iniciar sesi&oacute;n", subject: "Tu cuenta en Radiogen.AI ha sido aprobada ✓",
    unsub: "Recibes este correo porque tu cuenta en Radiogen.AI ha sido aprobada.",
    textTpl: (g, url) => `¡Bienvenido/a${g ? `, ${g}` : ""}!\n\nTu cuenta en Radiogen.AI ha sido aprobada.\n\nPlan Starter gratuito (30 días):\n✓ 150 informes/mes\n✓ 120 minutos de dictado\n✓ Sin tarjeta requerida\n\nIniciar sesión: ${url}`,
  },
  en: {
    welcomePrefix: "Welcome, ", welcome: "Your account has been approved!",
    desc: "You can now access Radiogen.AI with your free Starter plan for 30 days.",
    feat1: "150 reports/month included", feat2: "120 minutes of voice dictation", feat3: "No credit card required",
    btn: "Sign in", subject: "Your Radiogen.AI account has been approved ✓",
    unsub: "You received this email because your Radiogen.AI account was approved.",
    textTpl: (g, url) => `Welcome${g ? `, ${g}` : ""}!\n\nYour Radiogen.AI account has been approved.\n\nFree Starter plan (30 days):\n✓ 150 reports/month\n✓ 120 minutes of dictation\n✓ No credit card required\n\nSign in: ${url}`,
  },
  pt: {
    welcomePrefix: "Bem-vindo/a, ", welcome: "A sua conta foi aprovada!",
    desc: "Pode aceder ao Radiogen.AI com o plano Starter gratuito durante 30 dias.",
    feat1: "150 laudos/m&ecirc;s inclu&iacute;dos", feat2: "120 minutos de ditado por voz", feat3: "Sem cart&atilde;o de cr&eacute;dito",
    btn: "Iniciar sess&atilde;o", subject: "A sua conta no Radiogen.AI foi aprovada ✓",
    unsub: "Recebeu este email porque a sua conta no Radiogen.AI foi aprovada.",
    textTpl: (g, url) => `Bem-vindo/a${g ? `, ${g}` : ""}!\n\nA sua conta no Radiogen.AI foi aprovada.\n\nPlano Starter gratuito (30 dias):\n✓ 150 laudos/mês\n✓ 120 minutos de ditado\n✓ Sem cartão de crédito\n\nIniciar sessão: ${url}`,
  },
};

export async function sendApprovalEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = approvalI18n[lang];
  const greeting = name ? name.split(" ")[0] : "";
  const loginUrl = `${APP_URL}/auth/login`;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#x2713;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${greeting ? `${t.welcomePrefix}${greeting}!` : t.welcome}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
            ${t.desc}
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${featureRow(t.feat1)}
            ${featureRow(t.feat2)}
            ${featureRow(t.feat3)}
          </table>
        </td></tr>
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
  greeting: string; registered: string; notify: string; inviteHint: string;
  subject: string; unsub: string; textTpl: (name: string) => string;
}> = {
  es: {
    greeting: "&iexcl;Hola, ", registered: "Te hemos registrado en la lista de espera de Radiogen.AI.",
    notify: "Te notificaremos por correo cuando tu acceso est&eacute; listo.",
    inviteHint: "&iquest;Tienes un c&oacute;digo de invitaci&oacute;n? Accede m&aacute;s r&aacute;pido us&aacute;ndolo en",
    subject: "Estás en la lista de espera de Radiogen.AI",
    unsub: "Recibes este correo porque te registraste en la lista de espera.",
    textTpl: (name) => `¡Hola, ${name}!\n\nTe hemos registrado en la lista de espera de Radiogen.AI.\n\nTe notificaremos por correo cuando tu acceso esté listo.\n\n¿Tienes un código de invitación? Úsalo en: ${APP_URL}/invite`,
  },
  en: {
    greeting: "Hello, ", registered: "You have been added to the Radiogen.AI waitlist.",
    notify: "We will notify you by email when your access is ready.",
    inviteHint: "Have an invitation code? Get faster access by using it at",
    subject: "You're on the Radiogen.AI waitlist",
    unsub: "You received this email because you signed up for the waitlist.",
    textTpl: (name) => `Hello, ${name}!\n\nYou have been added to the Radiogen.AI waitlist.\n\nWe will notify you when your access is ready.\n\nHave an invitation code? Use it at: ${APP_URL}/invite`,
  },
  pt: {
    greeting: "Ol&aacute;, ", registered: "Registr&aacute;mos voc&ecirc; na lista de espera do Radiogen.AI.",
    notify: "Notificaremos por email quando o seu acesso estiver pronto.",
    inviteHint: "Tem um c&oacute;digo de convite? Acesse mais r&aacute;pido usando-o em",
    subject: "Você está na lista de espera do Radiogen.AI",
    unsub: "Recebeu este email porque se registrou na lista de espera.",
    textTpl: (name) => `Olá, ${name}!\n\nRegistrámos você na lista de espera do Radiogen.AI.\n\nNotificaremos quando o seu acesso estiver pronto.\n\nTem um código de convite? Use-o em: ${APP_URL}/invite`,
  },
};

export async function sendWaitlistConfirmation(to: string, name: string, lang: EmailLang = "es") {
  const t = waitlistI18n[lang];

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(96,165,250,0.1);border:1px solid rgba(96,165,250,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9993;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${t.greeting}${name}!
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 12px;">
            ${t.registered}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
            ${t.notify}
          </p>
          <p style="color:#6b7280;font-size:12px;line-height:1.5;text-align:center;margin:0 0 24px;padding:12px 16px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.12);border-radius:10px;">
            ${t.inviteHint}<br>
            <a href="${APP_URL}/invite" style="color:#a78bfa;text-decoration:underline;">${APP_URL}/invite</a>
          </p>
        </td></tr>`,
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
  titleWith: string; titleWithout: string; desc: string; action: string; btn: string;
  subject: string; unsub: string; textTpl: (g: string, url: string) => string;
}> = {
  es: {
    titleWith: ", hubo un problema con tu pago", titleWithout: "Problema con tu pago",
    desc: "No pudimos procesar el cobro de tu suscripci&oacute;n.",
    action: "Actualiza tu m&eacute;todo de pago en los pr&oacute;ximos d&iacute;as para evitar la interrupci&oacute;n del servicio.",
    btn: "Actualizar m&eacute;todo de pago", subject: "⚠ Problema con tu pago en Radiogen.AI",
    unsub: "Recibes este correo porque tienes una suscripci&oacute;n activa en Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, h` : "H"}ubo un problema con tu pago.\n\nNo pudimos procesar el cobro de tu suscripción.\n\nActualiza tu método de pago: ${url}`,
  },
  en: {
    titleWith: ", there was a problem with your payment", titleWithout: "Payment issue",
    desc: "We were unable to process your subscription payment.",
    action: "Please update your payment method in the next few days to avoid service interruption.",
    btn: "Update payment method", subject: "⚠ Payment issue on Radiogen.AI",
    unsub: "You received this email because you have an active subscription on Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, t` : "T"}here was a problem with your payment.\n\nWe could not process your subscription payment.\n\nUpdate your payment method: ${url}`,
  },
  pt: {
    titleWith: ", houve um problema com o seu pagamento", titleWithout: "Problema com o pagamento",
    desc: "N&atilde;o foi poss&iacute;vel processar a cobran&ccedil;a da sua assinatura.",
    action: "Atualize o seu m&eacute;todo de pagamento nos pr&oacute;ximos dias para evitar interrup&ccedil;&atilde;o do servi&ccedil;o.",
    btn: "Atualizar m&eacute;todo de pagamento", subject: "⚠ Problema com o pagamento no Radiogen.AI",
    unsub: "Recebeu este email porque tem uma assinatura ativa no Radiogen.AI.",
    textTpl: (g, url) => `${g ? `${g}, h` : "H"}ouve um problema com o seu pagamento.\n\nNão foi possível processar a cobrança da sua assinatura.\n\nAtualize o método de pagamento: ${url}`,
  },
};

export async function sendPaymentFailedEmail(to: string, name: string | null, lang: EmailLang = "es") {
  const t = paymentI18n[lang];
  const portalUrl = `${APP_URL}/dashboard`;
  const greeting = name ? name.split(" ")[0] : "";

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#9888;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}${t.titleWith}` : t.titleWithout}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 8px;">
            ${t.desc}
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
            ${t.action}
          </p>
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

const planChangeI18n: Record<EmailLang, {
  titleWith: string; titleWithout: string; desc: string; immediate: string; btn: string;
  subjectPrefix: string; unsub: string; textTpl: (g: string, plan: string, url: string) => string;
}> = {
  es: {
    titleWith: ", tu plan ha sido actualizado", titleWithout: "Plan actualizado",
    desc: "Tu suscripci&oacute;n ahora es", immediate: "Los cambios se reflejan de inmediato en tu cuenta.",
    btn: "Ir al dashboard", subjectPrefix: "Tu plan en Radiogen.AI:",
    unsub: "Recibes este correo porque cambiaste tu plan en Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, t` : "T"}u plan en Radiogen.AI ha sido actualizado.\n\nTu suscripción ahora es: ${plan}\n\nIr al dashboard: ${url}`,
  },
  en: {
    titleWith: ", your plan has been updated", titleWithout: "Plan updated",
    desc: "Your subscription is now", immediate: "Changes are reflected immediately in your account.",
    btn: "Go to dashboard", subjectPrefix: "Your Radiogen.AI plan:",
    unsub: "You received this email because you changed your plan on Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, y` : "Y"}our Radiogen.AI plan has been updated.\n\nYour subscription is now: ${plan}\n\nGo to dashboard: ${url}`,
  },
  pt: {
    titleWith: ", o seu plano foi atualizado", titleWithout: "Plano atualizado",
    desc: "A sua assinatura agora &eacute;", immediate: "As altera&ccedil;&otilde;es s&atilde;o refletidas imediatamente na sua conta.",
    btn: "Ir ao dashboard", subjectPrefix: "O seu plano no Radiogen.AI:",
    unsub: "Recebeu este email porque alterou o seu plano no Radiogen.AI.",
    textTpl: (g, plan, url) => `${g ? `${g}, o` : "O"} seu plano no Radiogen.AI foi atualizado.\n\nA sua assinatura agora é: ${plan}\n\nIr ao dashboard: ${url}`,
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

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:56px;height:56px;border-radius:16px;background:rgba(45,212,191,0.1);border:1px solid rgba(45,212,191,0.2);margin:0 auto 16px;text-align:center;line-height:56px;">
            <span style="font-size:28px;">&#x2191;</span>
          </div>
          <h1 style="color:#fff;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.3px;">
            ${greeting ? `${greeting}${t.titleWith}` : t.titleWithout}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.7;text-align:center;margin:0 0 12px;">
            ${t.desc} <strong style="color:#2dd4bf;font-size:16px;">${planLabel}</strong>
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;margin:0 0 24px;">
            ${t.immediate}
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
