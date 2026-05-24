import { Resend } from "resend";

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

function emailShell(content: string, unsubscribeNote: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;">
          <img src="${APP_URL}/logo.png" alt="Radiogen.AI" width="160" height="40" style="display:inline-block;" />
        </td></tr>
        ${content}
        <tr><td style="padding:16px 32px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
            <tr><td>
              <p style="color:#6b7280;font-size:11px;text-align:center;margin:0 0 8px;line-height:1.5;">
                Radiogen.AI &mdash; Asistente de informes radiol&oacute;gicos con IA.<br>
                Los textos generados son borradores que deben ser validados antes de su uso cl&iacute;nico.
              </p>
              <p style="color:#4b5563;font-size:10px;text-align:center;margin:0;line-height:1.4;">
                ${unsubscribeNote}
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
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
    .replace(/&mdash;/g, "—")
    .replace(/&#x2713;/g, "✓")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendApprovalEmail(to: string, name: string | null) {
  const greeting = name ? name.split(" ")[0] : "";
  const loginUrl = `${APP_URL}/auth/login`;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:24px;">&#x2713;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            ${greeting ? `&iexcl;Bienvenido/a, ${greeting}!` : "&iexcl;Bienvenido/a!"}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Tu cuenta ha sido aprobada. Ya puedes acceder a Radiogen.AI con tu plan Starter gratuito durante 30 d&iacute;as.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <p style="color:#d1d5db;font-size:13px;margin:0;">150 informes/mes incluidos</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <p style="color:#d1d5db;font-size:13px;margin:0;">120 minutos de dictado por voz</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <p style="color:#d1d5db;font-size:13px;margin:0;">Sin tarjeta de cr&eacute;dito requerida</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Iniciar sesi&oacute;n
          </a>
        </td></tr>`,
    `Recibes este correo porque tu cuenta en Radiogen.AI ha sido aprobada. <a href="${APP_URL}/support" style="color:#4b5563;text-decoration:underline;">Soporte</a>`);

  const text = `¡Bienvenido/a${greeting ? `, ${greeting}` : ""}!\n\nTu cuenta en Radiogen.AI ha sido aprobada.\n\nPlan Starter gratuito (30 días):\n- 150 informes/mes\n- 120 minutos de dictado\n- Sin tarjeta requerida\n\nIniciar sesión: ${loginUrl}\n\n---\nRadiogen.AI — Asistente de informes radiológicos con IA.`;

  await sendWithRetry({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: "Tu cuenta en Radiogen.AI ha sido aprobada ✓",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/support>`,
      "X-Entity-Ref-ID": `approval-${Date.now()}`,
    },
  });
}

export async function sendWaitlistConfirmation(to: string, name: string) {
  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(96,165,250,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:22px;">&#9993;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            &iexcl;Hola, ${name}!
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 16px;">
            Te hemos registrado en la lista de espera de Radiogen.AI.
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Te notificaremos por correo cuando tu acceso est&eacute; listo. Estamos incorporando radi&oacute;logos gradualmente para garantizar la mejor experiencia.
          </p>
          <p style="color:#6b7280;font-size:12px;line-height:1.5;text-align:center;margin:0 0 24px;padding:12px 16px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:10px;">
            &iquest;Tienes un c&oacute;digo de invitaci&oacute;n? Accede m&aacute;s r&aacute;pido us&aacute;ndolo en<br>
            <a href="${APP_URL}/invite" style="color:#60a5fa;text-decoration:underline;">${APP_URL}/invite/TU-CODIGO</a>
          </p>
        </td></tr>`,
    `Recibes este correo porque te registraste en la lista de espera. <a href="${APP_URL}/support" style="color:#4b5563;text-decoration:underline;">Contactar soporte</a>`);

  const text = `¡Hola, ${name}!\n\nTe hemos registrado en la lista de espera de Radiogen.AI.\n\nTe notificaremos por correo cuando tu acceso esté listo.\n\n¿Tienes un código de invitación? Úsalo en: ${APP_URL}/invite/TU-CODIGO\n\n---\nRadiogen.AI — Asistente de informes radiológicos con IA.`;

  await sendWithRetry({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: "Estás en la lista de espera de Radiogen.AI",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/support>`,
      "X-Entity-Ref-ID": `waitlist-${Date.now()}`,
    },
  });
}

export async function sendPaymentFailedEmail(to: string, name: string | null) {
  const portalUrl = `${APP_URL}/dashboard`;
  const greeting = name ? name.split(" ")[0] : "";

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:22px;">&#9888;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            ${greeting ? `${greeting}, hubo un problema con tu pago` : "Problema con tu pago"}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 8px;">
            No pudimos procesar el cobro de tu suscripci&oacute;n.
          </p>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Actualiza tu m&eacute;todo de pago en los pr&oacute;ximos d&iacute;as para evitar la interrupci&oacute;n del servicio.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${portalUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Actualizar m&eacute;todo de pago
          </a>
        </td></tr>`,
    `Recibes este correo porque tienes una suscripci&oacute;n activa en Radiogen.AI. <a href="${APP_URL}/support" style="color:#4b5563;text-decoration:underline;">Soporte</a>`);

  const text = `${greeting ? `${greeting}, h` : "H"}ubo un problema con tu pago.\n\nNo pudimos procesar el cobro de tu suscripción en Radiogen.AI.\n\nActualiza tu método de pago para evitar la interrupción del servicio:\n${portalUrl}\n\n---\nRadiogen.AI — Asistente de informes radiológicos con IA.`;

  await sendWithRetry({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: "⚠ Problema con tu pago en Radiogen.AI",
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/support>`,
      "X-Entity-Ref-ID": `payment-failed-${Date.now()}`,
    },
  });
}

export async function sendPlanChangeEmail(to: string, name: string | null, newPlan: string) {
  const greeting = name ? name.split(" ")[0] : "";
  const planNames: Record<string, string> = {
    free: "Free", starter: "Starter", resident: "Residente",
    professional: "Professional", enterprise: "Enterprise",
  };
  const planLabel = planNames[newPlan] || newPlan;

  const html = emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(45,212,191,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:22px;">&#x2191;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            ${greeting ? `${greeting}, tu plan ha sido actualizado` : "Plan actualizado"}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 16px;">
            Tu suscripci&oacute;n ahora es <strong style="color:#2dd4bf;">${planLabel}</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Los cambios se reflejan de inmediato en tu cuenta.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${APP_URL}/dashboard" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Ir al dashboard
          </a>
        </td></tr>`,
    `Recibes este correo porque cambiaste tu plan en Radiogen.AI. <a href="${APP_URL}/support" style="color:#4b5563;text-decoration:underline;">Soporte</a>`);

  const text = `${greeting ? `${greeting}, t` : "T"}u plan en Radiogen.AI ha sido actualizado.\n\nTu suscripción ahora es: ${planLabel}\n\nLos cambios se reflejan de inmediato.\n\nIr al dashboard: ${APP_URL}/dashboard\n\n---\nRadiogen.AI — Asistente de informes radiológicos con IA.`;

  await sendWithRetry({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: `Tu plan en Radiogen.AI: ${planLabel}`,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${APP_URL}/support>`,
      "X-Entity-Ref-ID": `plan-change-${Date.now()}`,
    },
  });
}
