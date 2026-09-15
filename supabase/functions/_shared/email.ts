export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("EMAIL_FROM") ??
    "The Final Transfer <no-reply@thefinaltransfer.tech>";
  const override = Deno.env.get("EMAIL_OVERRIDE"); // test override

  if (!apiKey) {
    console.error("[email] RESEND_API_KEY not set");
    return { success: false, error: "API key missing" };
  }

  const finalTo = override || to;
  if (override && override !== to) {
    console.log(`[email] OVERRIDE — original: ${to}, sending to: ${override}`);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [finalTo],
        subject: `${subject}${override && override !== to ? ` [for ${to}]` : ""}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] send failed:", err);
      return { success: false, error: err };
    }
    return { success: true, data: await res.json() };
  } catch (err) {
    console.error("[email] exception:", err);
    return { success: false, error: String(err) };
  }
}

export async function sendTemplatedEmail(
  to: string,
  subject: string,
  opts: import("./emailTemplate.ts").RenderEmailOptions
) {
  const { renderEmail } = await import("./emailTemplate.ts");
  return sendEmail(to, subject, renderEmail(opts));
}