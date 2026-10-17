export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const SITE_URL = (
  Deno.env.get('SITE_URL') ?? 'https://uwaterloopm.com'
).replace(/\/+$/, '');
export const LOGO_URL = `${SITE_URL}/email/uwpm-logo.png`;
export const STICKER_URL = `${SITE_URL}/email/hex-sticker.png`;

export type EmailMode = 'local' | 'sandbox' | 'live';

// local: the Docker stack injects MAILPIT_URL, so nothing leaves the machine
//   unless ALLOW_REAL_EMAIL=true is set deliberately.
// live: only a hosted project that sets EMAIL_ENV=production emails real
//   inboxes.
// sandbox: any other hosted project (staging) sends everything to
//   EMAIL_SANDBOX_REDIRECT so test applicants are never contacted.
export function resolveEmailMode(): EmailMode {
  const hasResendKey = Boolean(Deno.env.get('RESEND_API_KEY'));
  const mailpitUrl = Deno.env.get('MAILPIT_URL');
  const allowRealEmail = Deno.env.get('ALLOW_REAL_EMAIL') === 'true';

  if (mailpitUrl) return hasResendKey && allowRealEmail ? 'live' : 'local';
  if (!hasResendKey) throw new Error('no_email_transport_configured');
  if (Deno.env.get('EMAIL_ENV') === 'production') return 'live';
  if (Deno.env.get('EMAIL_SANDBOX_REDIRECT')) return 'sandbox';
  throw new Error('email_environment_not_configured');
}

function redirectToSandbox(message: Message): Message {
  const redirect = Deno.env.get('EMAIL_SANDBOX_REDIRECT')!;
  const notice = `Sandbox: this email was intended for ${message.to}.`;
  return {
    to: redirect,
    subject: `[STAGING] ${message.subject}`,
    text: `${notice}\n\n${message.text}`,
    html: message.html.replace(
      /(<body[^>]*>)/,
      `$1<p style="margin:0;padding:8px 16px;background:#fff3cd;font-family:Arial,sans-serif;font-size:13px">${escapeHtml(
        notice,
      )}</p>`,
    ),
  };
}

export async function deliver(message: Message, mode = resolveEmailMode()) {
  const from = Deno.env.get('EMAIL_FROM') ?? 'UWPM <portal@uwproduct.com>';

  if (mode === 'local') {
    const mailpitUrl = Deno.env.get('MAILPIT_URL')!;
    const address = /<(.+)>/.exec(from)?.[1] ?? from;
    const res = await fetch(`${mailpitUrl}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: { Email: address, Name: 'UWPM' },
        To: [{ Email: message.to }],
        Subject: message.subject,
        HTML: message.html,
        Text: message.text,
      }),
    });
    if (!res.ok) throw new Error(`mailpit ${res.status}: ${await res.text()}`);
    return;
  }

  const outgoing = mode === 'sandbox' ? redirectToSandbox(message) : message;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, ...outgoing, to: [outgoing.to] }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

export function renderEmailFrame(heading: string, contentHtml: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f9f6f4;font-family:'Helvetica Neue',Arial,sans-serif;color:#262523">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f4;background-image:radial-gradient(ellipse 85% 60% at 88% -5%,#f6c2c0 0%,#f9d8c9 30%,#f9f6f4 65%)">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
            <tr>
              <td style="padding:0 8px 20px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle">
                      <img src="${LOGO_URL}" width="110" alt="UWPM" style="display:block;border:0" />
                    </td>
                    <td align="right" valign="middle">
                      <img src="${STICKER_URL}" width="64" alt="" style="display:block;border:0" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#fefefe;border-radius:20px;padding:32px">
                <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:#262523">${escapeHtml(
                  heading,
                )}</h1>
${contentHtml}
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
                  <tr>
                    <td align="center" style="background-color:#f05c5b;border-radius:12px">
                      <a href="${SITE_URL}/portal/dashboard" style="display:block;padding:14px 24px;font-size:16px;font-weight:600;color:#fefefe;text-decoration:none">View my application</a>
                    </td>
                  </tr>
                </table>
                <hr style="border:none;border-top:1px solid #ece9e6;margin:0 0 20px" />
                <p style="margin:0;font-size:14px;color:#535361">
                  Contact us at <a href="mailto:uwpmwaterloo@gmail.com" style="color:#f05c5b;text-decoration:underline">uwpmwaterloo@gmail.com</a>
                </p>
                <p style="margin:16px 0 0;font-size:14px;color:#262523">— <span style="color:#f05c5b;font-weight:600">The ProdCon Team</span></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
