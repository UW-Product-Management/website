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

// Resend in hosted environments; Mailpit's send API in the local stack, where
// no provider key exists.
async function deliver(message: Message) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM') ?? 'UWPM <portal@uwproduct.com>';

  if (resendKey) {
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

  const mailpitUrl = Deno.env.get('MAILPIT_URL');
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
    ['Year', application.year_of_study ?? ''],
  ];

  const text = [
    `Hi ${name},`,
    '',
    `Thanks for applying to ${eventName}! We've received your application and we're excited to have you join us.`,
    '',
    'Application summary',
    ...rows.map(([label, value]) => `${label}: ${value}`),
    '',
    "We'll be in touch with next steps.",
    '',
    'UWPM',
  ].join('\n');

  const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#1a1a1a;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:22px">Your application has been received!</h1>
<p>Hi ${escapeHtml(name)},</p>
<p>Thanks for applying to ${escapeHtml(eventName)}! We've received your application and we're excited to have you join us.</p>
<h2 style="font-size:16px">Application summary</h2>
<table role="presentation" cellpadding="4">
${rows
  .map(
    ([label, value]) =>
      `<tr><td><strong>${label}</strong></td><td>${escapeHtml(value)}</td></tr>`,
  )
  .join('\n')}
</table>
<p>We'll be in touch with next steps.</p>
<p>UWPM</p>
</body></html>`;

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
    .select('id, program, year_of_study, events(name)')
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
