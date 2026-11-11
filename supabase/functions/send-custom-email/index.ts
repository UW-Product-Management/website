import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  deliver,
  json,
  resolveEmailMode,
  type EmailMode,
} from '../_shared/email.ts';
import { buildCustomMessage } from './messages.ts';

const BATCH_SIZE = 20;
// Resend allows 10 requests per second per team; stay well under it.
const SEND_INTERVAL_MS = 250;
const RUN_VALID_MS = 2 * 60 * 60 * 1000;
const MAX_RECIPIENTS = 2000;
// Keeps each `in (...)` filter well under PostgREST's URL length limit.
const LOOKUP_CHUNK = 200;
const MAX_SUBJECT = 200;
const MAX_BODY = 10000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RequestBody {
  action?: 'mode' | 'test' | 'create' | 'send' | 'resumable' | 'abandon';
  eventId?: string;
  subject?: string;
  body?: string;
  recipientIds?: unknown;
  confirmation?: string;
  campaignId?: string;
}

interface Recipient {
  id: string;
  email: string;
  full_name: string;
}

interface Totals {
  pending: number;
  sent: number;
  failed: number;
  dropped: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const hasExpired = (createdAt: string) =>
  Date.now() - new Date(createdAt).getTime() > RUN_VALID_MS;

function validateContent(body: RequestBody) {
  const subject = body.subject?.trim() ?? '';
  const text = body.body?.trim() ?? '';
  if (!subject || !text) return { error: 'content_required' };
  if (subject.length > MAX_SUBJECT || text.length > MAX_BODY) {
    return { error: 'content_too_long' };
  }
  return { subject, text };
}

async function loadRecipients(ids: string[]): Promise<Recipient[]> {
  const rows: Recipient[] = [];
  for (let start = 0; start < ids.length; start += LOOKUP_CHUNK) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ids.slice(start, start + LOOKUP_CHUNK));
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as Recipient[]));
  }
  return rows.filter((row) => row.email);
}

async function findUnfinished(eventId: string) {
  const { data, error } = await admin
    .from('custom_email_campaigns')
    .select('id, subject, mode, recipient_count, created_at')
    .eq('event_id', eventId)
    .is('finished_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// An unfinished campaign is reported to every organizer, not just whoever
// started it, so a send stranded by a closed laptop can still be finished.
async function describeResumable(eventId: string, mode: EmailMode) {
  const campaign = await findUnfinished(eventId);
  if (!campaign) return json({ campaign: null });

  const totals = await campaignTotals(campaign.id);
  const blocked = hasExpired(campaign.created_at)
    ? 'run_expired'
    : campaign.mode !== mode
      ? 'mode_changed'
      : null;

  return json({
    campaign: {
      id: campaign.id,
      subject: campaign.subject,
      mode: campaign.mode,
      total: campaign.recipient_count,
      createdAt: campaign.created_at,
      resumable: blocked === null,
      blockedReason: blocked,
      ...totals,
    },
  });
}

async function abandonCampaign(campaignId: string) {
  const { data, error } = await admin
    .from('custom_email_campaigns')
    .update({ finished_at: new Date().toISOString() })
    .eq('id', campaignId)
    .is('finished_at', null)
    .select('id');
  if (error) return json({ error: 'run_failed' }, 500);
  if (!data?.length) return json({ error: 'run_not_found' }, 404);
  return json({ abandoned: true });
}

async function sendTest(
  user: { id: string; email: string },
  body: RequestBody,
  mode: EmailMode,
) {
  const content = validateContent(body);
  if ('error' in content) return json({ error: content.error }, 400);

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const message = buildCustomMessage(
    user.email,
    profile?.full_name ?? '',
    content.subject,
    content.text,
  );
  await deliver({ ...message, subject: `[TEST] ${message.subject}` }, mode);
  return json({ sent: true, to: user.email, mode });
}

async function createCampaign(
  user: { id: string },
  body: RequestBody,
  eventId: string,
  mode: EmailMode,
) {
  const content = validateContent(body);
  if ('error' in content) return json({ error: content.error }, 400);

  if (
    !Array.isArray(body.recipientIds) ||
    !body.recipientIds.every((id) => typeof id === 'string' && UUID.test(id))
  ) {
    return json({ error: 'invalid_recipients' }, 400);
  }
  const ids = [...new Set(body.recipientIds as string[])];
  if (ids.length === 0) return json({ error: 'no_recipients' }, 400);
  if (ids.length > MAX_RECIPIENTS) {
    return json({ error: 'too_many_recipients' }, 400);
  }

  const { data: event } = await admin
    .from('events')
    .select('id')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return json({ error: 'event_not_found' }, 404);

  // Starting a second campaign while one is still resumable is how a partially
  // sent group gets emailed twice: the stranded one must be finished or
  // abandoned first.
  const unfinished = await findUnfinished(eventId);
  if (unfinished && !hasExpired(unfinished.created_at)) {
    return json({ error: 'unfinished_campaign' }, 409);
  }

  const recipients = await loadRecipients(ids);
  if (recipients.length !== ids.length) {
    return json({ error: 'recipients_changed', count: recipients.length }, 409);
  }
  if (body.confirmation !== `SEND ${ids.length}`) {
    return json({ error: 'confirmation_mismatch' }, 409);
  }

  const { data: campaign, error } = await admin
    .from('custom_email_campaigns')
    .insert({
      event_id: eventId,
      subject: content.subject,
      body: content.text,
      mode,
      created_by: user.id,
      recipient_count: recipients.length,
    })
    .select('id')
    .single();
  if (error) return json({ error: 'run_failed' }, 500);

  const { error: recipientError } = await admin
    .from('custom_email_recipients')
    .insert(
      recipients.map((row) => ({
        campaign_id: campaign.id,
        user_id: row.id,
        email: row.email,
        full_name: row.full_name,
      })),
    );
  if (recipientError) {
    await admin.from('custom_email_campaigns').delete().eq('id', campaign.id);
    return json({ error: 'run_failed' }, 500);
  }

  return json({ campaignId: campaign.id, total: recipients.length, mode });
}

async function countRecipients(
  campaignId: string,
  state: keyof Totals,
): Promise<number> {
  let query = admin
    .from('custom_email_recipients')
    .select('user_id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);

  if (state === 'pending') query = query.is('claimed_at', null);
  else if (state === 'sent') query = query.not('sent_at', 'is', null);
  else if (state === 'failed') query = query.not('failed_at', 'is', null);
  else {
    query = query
      .not('claimed_at', 'is', null)
      .is('sent_at', null)
      .is('failed_at', null);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function campaignTotals(campaignId: string): Promise<Totals> {
  const [pending, sent, failed, dropped] = await Promise.all([
    countRecipients(campaignId, 'pending'),
    countRecipients(campaignId, 'sent'),
    countRecipients(campaignId, 'failed'),
    countRecipients(campaignId, 'dropped'),
  ]);
  return { pending, sent, failed, dropped };
}

// Counted from the recipient rows rather than added to a campaign row read
// earlier, so concurrent batches cannot overwrite each other's totals.
async function storeTotals(campaignId: string, totals: Totals) {
  await admin
    .from('custom_email_campaigns')
    .update({
      sent_count: totals.sent,
      failed_count: totals.failed,
      dropped_count: totals.dropped,
    })
    .eq('id', campaignId);

  if (totals.pending === 0) {
    await admin
      .from('custom_email_campaigns')
      .update({ finished_at: new Date().toISOString() })
      .eq('id', campaignId)
      .is('finished_at', null);
  }
}

async function sendBatch(campaignId: string, mode: EmailMode) {
  const { data: campaign } = await admin
    .from('custom_email_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();

  if (!campaign) return json({ error: 'run_not_found' }, 404);
  if (campaign.finished_at) return json({ error: 'run_finished' }, 409);
  if (hasExpired(campaign.created_at)) {
    return json({ error: 'run_expired' }, 409);
  }
  if (campaign.mode !== mode) return json({ error: 'mode_changed' }, 409);

  const { data: batch, error } = await admin
    .from('custom_email_recipients')
    .select('user_id, email, full_name')
    .eq('campaign_id', campaignId)
    .is('claimed_at', null)
    .order('user_id')
    .limit(BATCH_SIZE);
  if (error) throw new Error(error.message);

  let sent = 0;
  let failed = 0;
  for (const row of batch ?? []) {
    // Claiming before delivery means a concurrent batch skips this row instead
    // of sending a duplicate. claimed_at is kept separate from sent_at so that
    // a function death mid-delivery leaves the row provably unresolved rather
    // than counted as delivered.
    const { data: claimed } = await admin
      .from('custom_email_recipients')
      .update({ claimed_at: new Date().toISOString() })
      .eq('campaign_id', campaignId)
      .eq('user_id', row.user_id)
      .is('claimed_at', null)
      .select('user_id');
    if (!claimed?.length) continue;

    try {
      await deliver(
        buildCustomMessage(
          row.email,
          row.full_name,
          campaign.subject,
          campaign.body,
        ),
        mode,
      );
      await admin
        .from('custom_email_recipients')
        .update({ sent_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('user_id', row.user_id);
      sent += 1;
    } catch (deliveryError) {
      failed += 1;
      console.error('send-custom-email failed', row.user_id, deliveryError);
      // Not retried automatically: a timeout after Resend accepted the email
      // would otherwise send it twice, and a rejected address would be picked
      // first in every later batch.
      await admin
        .from('custom_email_recipients')
        .update({ failed_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('user_id', row.user_id);
    }
    await sleep(SEND_INTERVAL_MS);
  }

  const totals = await campaignTotals(campaignId);
  await storeTotals(campaignId, totals);

  return json({
    sent,
    failed,
    remaining: totals.pending,
    dropped: totals.dropped,
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user?.email) return json({ error: 'unauthorized' }, 401);

  const { data: organizer } = await admin
    .from('organizers')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!organizer) return json({ error: 'not_organizer' }, 403);

  const body: RequestBody = await req.json().catch(() => ({}));

  let mode: EmailMode;
  try {
    mode = resolveEmailMode();
  } catch (error) {
    console.error('send-custom-email misconfigured', error);
    return json({ error: (error as Error).message }, 500);
  }

  const caller = { id: user.id, email: user.email };
  try {
    switch (body.action) {
      case 'mode':
        return json({ mode });
      case 'test':
        return await sendTest(caller, body, mode);
      case 'create':
        if (!body.eventId) return json({ error: 'event_required' }, 400);
        return await createCampaign(caller, body, body.eventId, mode);
      case 'send':
        if (!body.campaignId) return json({ error: 'run_required' }, 400);
        return await sendBatch(body.campaignId, mode);
      case 'resumable':
        if (!body.eventId) return json({ error: 'event_required' }, 400);
        return await describeResumable(body.eventId, mode);
      case 'abandon':
        if (!body.campaignId) return json({ error: 'run_required' }, 400);
        return await abandonCampaign(body.campaignId);
      default:
        return json({ error: 'invalid_action' }, 400);
    }
  } catch (error) {
    console.error('send-custom-email failed', error);
    return json({ error: 'send_failed' }, 502);
  }
});
