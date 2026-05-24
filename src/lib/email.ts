import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>";

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
        <tr><td style="padding:32px 32px 24px;text-align:center;">
          <img src="https://radiogen.ai/logo.png" alt="Radiogen.AI" width="160" style="display:inline-block;" />
        </td></tr>
        ${content}
        <tr><td style="padding:0 32px 24px;">
          <p style="color:#6b7280;font-size:11px;text-align:center;margin:0;line-height:1.5;">
            Radiogen.AI es un asistente de redacción de informes. Los textos generados son borradores indicativos que deben ser revisados y validados antes de su uso clínico.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendApprovalEmail(to: string, name: string | null) {
  const greeting = name ? name.split(" ")[0] : "";
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`
    : "https://radiogen.ai/auth/login";

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Tu cuenta en Radiogen.AI ha sido aprobada",
    html: emailShell(`
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
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#d1d5db;font-size:13px;">150 informes/mes incluidos</td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#d1d5db;font-size:13px;">120 minutos de dictado</td>
              </tr></table>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="color:#d1d5db;font-size:13px;">Sin tarjeta requerida</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(to right,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Iniciar sesi&oacute;n
          </a>
        </td></tr>`),
  });
}

export async function sendWaitlistConfirmation(to: string, name: string) {
  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Estás en la lista de espera de Radiogen.AI",
    html: emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(96,165,250,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:24px;">&#128276;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            &iexcl;Hola, ${name}!
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Te hemos registrado en la lista de espera. Te notificaremos por correo cuando tu acceso est&eacute; listo.
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Estamos incorporando radi&oacute;logos gradualmente para garantizar la mejor experiencia posible.
          </p>
        </td></tr>`),
  });
}

export async function sendPaymentFailedEmail(to: string, name: string | null) {
  const portalUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    : "https://radiogen.ai/dashboard";

  const greeting = name ? name.split(" ")[0] : "";

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Problema con tu pago en Radiogen.AI",
    html: emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(239,68,68,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:24px;">&#9888;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            ${greeting ? `${greeting}, hubo un problema con tu pago` : "Problema con tu pago"}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
            No pudimos procesar el cobro de tu suscripci&oacute;n. Actualiza tu m&eacute;todo de pago para evitar la interrupci&oacute;n del servicio.
          </p>
        </td></tr>
        <tr><td style="padding:0 32px 32px;text-align:center;">
          <a href="${portalUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(to right,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
            Actualizar pago
          </a>
        </td></tr>`),
  });
}

export async function sendPlanChangeEmail(to: string, name: string | null, newPlan: string) {
  const greeting = name ? name.split(" ")[0] : "";
  const planNames: Record<string, string> = {
    free: "Free", starter: "Starter", resident: "Residente",
    professional: "Professional", enterprise: "Enterprise",
  };
  const planLabel = planNames[newPlan] || newPlan;

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Tu plan en Radiogen.AI ha cambiado a ${planLabel}`,
    html: emailShell(`
        <tr><td style="padding:0 32px;">
          <div style="width:48px;height:48px;border-radius:50%;background:rgba(45,212,191,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
            <span style="font-size:24px;">&#x2191;</span>
          </div>
          <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
            ${greeting ? `${greeting}, tu plan ha sido actualizado` : "Plan actualizado"}
          </h1>
          <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 16px;">
            Tu suscripci&oacute;n ahora es <strong style="color:#2dd4bf;">${planLabel}</strong>.
          </p>
          <p style="color:#6b7280;font-size:13px;line-height:1.6;text-align:center;margin:0 0 24px;">
            Los cambios se reflejan de inmediato en tu cuenta. Si tienes preguntas, cont&aacute;ctanos en soporte.
          </p>
        </td></tr>`),
  });
}
