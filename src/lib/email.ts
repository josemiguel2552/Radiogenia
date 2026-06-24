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
    from: FROM, replyTo: REPLY_TO, to, subject: t.subject, html, text,
    headers: { "List-Unsubscribe": `<${APP_URL}/support>`, "X-Entity-Ref-ID": `welcome-${Date.now()}` },
  });
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
