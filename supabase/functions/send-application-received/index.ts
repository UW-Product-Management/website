import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// The local stack always injects MAILPIT_URL, so a developer's Resend key can
// never send real email from a local run unless ALLOW_REAL_EMAIL=true is set
// deliberately. Hosted projects have no Mailpit and use Resend.
async function deliver(message: Message) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const mailpitUrl = Deno.env.get('MAILPIT_URL');
  const allowRealEmail = Deno.env.get('ALLOW_REAL_EMAIL') === 'true';
  const from = Deno.env.get('EMAIL_FROM') ?? 'UWPM <portal@uwproduct.com>';

  if (resendKey && (!mailpitUrl || allowRealEmail)) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, ...message, to: [message.to] }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    return;
  }

  if (!mailpitUrl) throw new Error('no_email_transport_configured');

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
}

const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://uwaterloopm.com').replace(
  /\/+$/,
  '',
);
const LOGO_URL = `${SITE_URL}/email/uwpm-logo.png`;
const STICKER_URL = `${SITE_URL}/email/hex-sticker.png`;

function formatSubmittedAt(value: string | null): string {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildMessage(
  to: string,
  fullName: string,
  eventName: string,
  application: Record<string, string | null>,
): Message {
  const name = fullName || 'there';
  const rows: [string, string][] = [
    ['Name', fullName],
    ['Email', to],
    ['Program', application.program ?? ''],
    ['Year of Study', application.year_of_study ?? ''],
    ['Submitted on', formatSubmittedAt(application.submitted_at)],
  ];

  const text = [
    `Hi ${name},`,
    '',
    `Thanks for applying to ${eventName}! We've received your application and you're all set.`,
    '',
    'Application summary',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    "We're excited to have you join us!",
    '',
    '— The ProdCon Team',
  ].join('\n');

  const html = `<!doctype html>
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
                <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:#262523">Your application has been received!</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#535361">
                  Hi ${escapeHtml(name)},<br /><br />
                  Thanks for applying to ${escapeHtml(eventName)}! We've received your application and you're all set.
                </p>
                <h2 style="margin:0 0 12px;font-size:18px;color:#262523">Application Summary</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:16px;line-height:1.8">
${rows
  .map(
    ([label, value]) =>
      `                  <tr><td style="padding:2px 16px 2px 0;color:#535361;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:2px 0;color:#262523">${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
                </table>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#535361">We're excited to have you join us!</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px">
                  <tr>
                    <td align="center" style="background-color:#f05c5b;border-radius:12px">
                      <a href="${SITE_URL}/portal/dashboard" style="display:block;padding:14px 24px;font-size:16px;font-weight:600;color:#fefefe;text-decoration:none">View my application</a>
                    </td>
                  </tr>
                </table>
                <hr style="border:none;border-top:1px solid #ece9e6;margin:0 0 20px" />
                <p style="margin:0;font-size:14px;color:#535361">
                  Contact us at <a href="mailto:uwpm@uwaterloo.ca" style="color:#f05c5b;text-decoration:underline">uwpm@uwaterloo.ca</a>
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

  return {
    to,
    subject: `We received your ${eventName} application`,
    html,
    text,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) return json({ error: 'unauthorized' }, 401);

  // Claiming the stamp before sending makes concurrent calls send at most once.
  const { data: claimed, error: claimError } = await admin
    .from('applications')
    .update({ confirmation_email_sent_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .neq('status', 'draft')
    .is('confirmation_email_sent_at', null)
    .select('id, program, year_of_study, submitted_at, events(name)')
    .maybeSingle();

  if (claimError) return json({ error: 'claim_failed' }, 500);
  if (!claimed) return json({ sent: false, reason: 'nothing_to_send' });

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const event = claimed.events as unknown as { name: string } | null;

  try {
    await deliver(
      buildMessage(
        user.email,
        profile?.full_name ?? '',
        event?.name ?? 'ProdCon',
        claimed,
      ),
    );
  } catch (error) {
    await admin
      .from('applications')
      .update({ confirmation_email_sent_at: null })
      .eq('id', claimed.id);
    console.error('send-application-received failed', error);
    return json({ error: 'send_failed' }, 502);
  }

  return json({ sent: true });
});
