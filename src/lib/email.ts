import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}
const FROM = process.env.EMAIL_FROM || "Radiogen.AI <noreply@radiogen.ai>";

export async function sendApprovalEmail(to: string, name: string | null) {
  const greeting = name ? name.split(" ")[0] : "";
  const loginUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`
    : "https://radiogen.ai/auth/login";

  await getResend().emails.send({
    from: FROM,
    to,
    subject: "Tu cuenta en Radiogen.AI ha sido aprobada",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.1);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;">
              <img src="https://radiogen.ai/logo.png" alt="Radiogen.AI" width="160" style="display:inline-block;" />
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.1);margin:0 auto 16px;text-align:center;line-height:48px;">
                <span style="font-size:24px;">✓</span>
              </div>
              <h1 style="color:#fff;font-size:20px;font-weight:700;text-align:center;margin:0 0 12px;">
                ${greeting ? `¡Bienvenido/a, ${greeting}!` : "¡Bienvenido/a!"}
              </h1>
              <p style="color:#9ca3af;font-size:14px;line-height:1.6;text-align:center;margin:0 0 24px;">
                Tu cuenta ha sido aprobada. Ya puedes acceder a Radiogen.AI con tu plan Starter gratuito durante 30 días.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#2dd4bf;font-size:14px;padding-right:12px;">📋</td>
                        <td style="color:#d1d5db;font-size:13px;">150 informes/mes incluidos</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#60a5fa;font-size:14px;padding-right:12px;">🎙️</td>
                        <td style="color:#d1d5db;font-size:13px;">120 minutos de dictado</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:8px;"></td></tr>
                <tr>
                  <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#a78bfa;font-size:14px;padding-right:12px;">💳</td>
                        <td style="color:#d1d5db;font-size:13px;">Sin tarjeta requerida</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;text-align:center;">
              <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(to right,#0f766e,#1e3a5f);color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
                Iniciar sesión
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="color:#6b7280;font-size:11px;text-align:center;margin:0;line-height:1.5;">
                Radiogen.AI es un asistente de redacción de informes. Los textos generados son borradores indicativos que deben ser revisados y validados antes de su uso clínico.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
