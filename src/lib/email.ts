import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY
);

export async function sendBookingEmail({
  to,
  subject,
  title,
  message,
  ctaLabel,
  ctaUrl,
}: {
  to: string;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM missing");
  }

  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br />");
  const safeCtaLabel = ctaLabel ? escapeHtml(ctaLabel) : "";
  const safeCtaUrl = ctaUrl ? escapeAttribute(ctaUrl) : "";

  return resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html: `
      <div style="margin:0; background:#F6F3EE; padding:36px 16px; font-family:Arial, Helvetica, sans-serif; color:#111111;">
        <div style="max-width:680px; margin:0 auto; overflow:hidden; border-radius:28px; background:#ffffff; border:1px solid #e8e1d8;">
          <div style="background:#050505; color:#ffffff; padding:34px 34px 30px;">
            <div style="font-size:11px; letter-spacing:4px; text-transform:uppercase; color:rgba(255,255,255,0.55);">
              EncuentraTuClinica
            </div>
            <h1 style="margin:18px 0 0; font-size:34px; line-height:1.08; letter-spacing:-0.03em;">
              ${safeTitle}
            </h1>
          </div>

          <div style="padding:34px;">
            <p style="margin:0; font-size:17px; line-height:1.75; color:#555555;">
              ${safeMessage}
            </p>

          ${
            ctaLabel && ctaUrl
              ? `<a href="${safeCtaUrl}" style="display:inline-block; margin-top:28px; background:#050505; color:#ffffff; padding:16px 24px; border-radius:999px; text-decoration:none; font-size:15px; font-weight:600;">${safeCtaLabel}</a>`
              : ""
          }

            <div style="margin-top:34px; padding-top:22px; border-top:1px solid #eee8df;">
              <p style="margin:0; font-size:13px; line-height:1.7; color:#8a8177;">
                Este mensaje forma parte de la experiencia de reservas de EncuentraTuClinica.
                Si no reconoces esta solicitud, puedes ignorar este correo.
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}
