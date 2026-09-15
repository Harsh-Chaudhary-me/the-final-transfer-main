// Shared HTML email template for The Final Transfer.
// Every email in the system renders through renderEmail() so they all
// share the same header, colors, typography, and footer.
console.log("[emailTemplate] module loaded at", new Date().toISOString());
const COLORS = {
  headerFrom: "#FF9E2C",
  headerTo: "#F47B20",
  cream: "#FDF9F1",
  creamCard: "#FBF3E4",
  cardBorder: "#F1E2C4",
  text: "#3F3A34",
  textMuted: "#7A7068",
  buttonPrimaryBg: "#E8571F",
  buttonPrimaryText: "#FFFFFF",
  buttonSecondaryBg: "#F2E4C9",
  buttonSecondaryText: "#7A5638",
  divider: "#E9DCC3",
  privacyBg: "#FFFFFF",
};

export interface RenderEmailOptions {
  title: string;                 // big header title, e.g. "You've been invited as a Trusted Person"
  preheader?: string;            // hidden preview text
  greeting?: string;             // optional "Hello X," line
  body: string;                  // HTML string, one or more <p>
  callout?: string;              // optional cream card body (plain text or HTML)
  primaryCta?: { label: string; url: string };
  secondaryCta?: { label: string; url: string };
  footnote?: string;             // small italic line under buttons (expiry etc.)
  privacyNote?: string;          // bottom privacy paragraph
}

export function renderEmail(opts: RenderEmailOptions): string {
  const {
    title,
    preheader = "",
    greeting,
    body,
    callout,
    primaryCta,
    secondaryCta,
    footnote,
    privacyNote = "Privacy & security: this link is personal to you — please don't forward it. The Final Transfer will never ask you for a password or payment by e-mail.",
  } = opts;

  const calloutBlock = callout
    ? `
      <div style="background:${COLORS.creamCard};border:1px solid ${COLORS.cardBorder};border-radius:12px;padding:18px 20px;margin:20px 0;color:${COLORS.text};font-size:15px;line-height:1.6;">
        ${callout}
      </div>`
    : "";

  const ctaBlock =
    primaryCta || secondaryCta
      ? `
        <div style="margin:26px 0 22px 0;">
          ${
            primaryCta
              ? `<a href="${primaryCta.url}" style="display:inline-block;background:${COLORS.buttonPrimaryBg};color:${COLORS.buttonPrimaryText};text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:10px;margin-right:12px;mso-padding-alt:0;">${primaryCta.label}</a>`
              : ""
          }
          ${
            secondaryCta
              ? `<a href="${secondaryCta.url}" style="display:inline-block;background:${COLORS.buttonSecondaryBg};color:${COLORS.buttonSecondaryText};text-decoration:none;font-weight:700;font-size:15px;padding:14px 26px;border-radius:10px;">${secondaryCta.label}</a>`
              : ""
          }
        </div>`
      : "";

  const footnoteBlock = footnote
    ? `
      <p style="color:${COLORS.textMuted};font-size:13px;line-height:1.5;margin:14px 0 8px 0;">${footnote}</p>`
    : "";

  const greetingBlock = greeting
    ? `<p style="color:${COLORS.text};font-size:15px;line-height:1.6;margin:0 0 12px 0;">${greeting}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ""}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.cream};padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(90deg,${COLORS.headerFrom} 0%,${COLORS.headerTo} 100%);padding:28px 32px;">
              <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;font-weight:700;text-transform:uppercase;margin:0 0 10px 0;opacity:0.95;">
                The Final Transfer
              </p>
              <h1 style="color:#FFFFFF;font-size:26px;line-height:1.25;font-weight:800;margin:0;">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;background:#FFFFFF;color:${COLORS.text};font-size:15px;line-height:1.65;">
              ${greetingBlock}
              ${body}
              ${calloutBlock}
              ${ctaBlock}
              ${footnoteBlock}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:${COLORS.divider};"></div>
            </td>
          </tr>

          <!-- Privacy footer -->
          <tr>
            <td style="padding:20px 32px 28px 32px;background:#FFFFFF;">
              <p style="color:${COLORS.textMuted};font-size:12.5px;line-height:1.6;margin:0;">
                <strong style="color:${COLORS.text};">Privacy &amp; security:</strong>
                ${escapeHtml(privacyNote.replace(/^Privacy & security:\s*/i, ""))}
              </p>
            </td>
          </tr>

        </table>

        <p style="color:#B7AA98;font-size:11px;margin:18px 0 0 0;text-align:center;">
          © ${new Date().getFullYear()} The Final Transfer — Secure Digital Legacy Management
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}