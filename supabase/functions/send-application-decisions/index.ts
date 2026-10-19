import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  corsHeaders,
  deliver,
  json,
  resolveEmailMode,
  type EmailMode,
} from '../_shared/email.ts';
import { DECISIONS, buildDecisionMessage, type Decision } from './messages.ts';

// PostgREST caps a response at max_rows (1000), so larger tables are paged.
const PAGE_SIZE = 1000;
const BATCH_SIZE = 20;
// Resend allows 10 requests per second per team; stay well under it.
const SEND_INTERVAL_MS = 250;
const TEST_VALID_MS = 24 * 60 * 60 * 1000;
const RUN_VALID_MS = 2 * 60 * 60 * 1000;

type Counts = Record<Decision, number>;

interface DecisionRow {
  application_id: string;
  decision: Decision;
  email_sent_at: string | null;
  emailed_decision: Decision | null;
  applications: {
    profiles: { full_name: string; email: string } | null;
  } | null;
}

interface RequestBody {
  action?: 'preview' | 'test' | 'approve' | 'send';
  eventId?: string;
  decision?: Decision;
  counts?: Counts;
  confirmation?: string;
  includeChanged?: boolean;
  acknowledgeUndecided?: boolean;
  runId?: string;
}

const emptyCounts = (): Counts => ({ accepted: 0, waitlisted: 0, rejected: 0 });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const total = (counts: Counts) =>
  counts.accepted + counts.waitlisted + counts.rejected;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function fetchAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}

async function loadDecisions(eventId: string): Promise<DecisionRow[]> {
  const rows = await fetchAll((from, to) =>
    admin
      .from('application_decisions')
      .select(
        'application_id, decision, email_sent_at, emailed_decision, applications(profiles(full_name, email))',
      )
      .eq('event_id', eventId)
      .order('application_id')
      .range(from, to),
  );
  return rows as unknown as DecisionRow[];
}

const isPending = (row: DecisionRow) => row.email_sent_at === null;
const isChanged = (row: DecisionRow) =>
  row.email_sent_at !== null && row.emailed_decision !== row.decision;

function targets(rows: DecisionRow[], includeChanged: boolean) {
  return rows.filter(
    (row) => isPending(row) || (includeChanged && isChanged(row)),
  );
}

function countByDecision(rows: DecisionRow[]): Counts {
  const counts = emptyCounts();
  rows.forEach((row) => {
    counts[row.decision] += 1;
  });
  return counts;
}

async function summarize(eventId: string, mode: EmailMode) {
  const { data: event } = await admin
    .from('events')
    .select('name')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return null;

  const rows = await loadDecisions(eventId);
  const decidedIds = new Set(rows.map((row) => row.application_id));
  const submitted = await fetchAll((from, to) =>
    admin
      .from('applications')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'submitted')
      .order('id')
      .range(from, to),
  );

  return {
    eventName: event.name as string,
    mode,
    pending: countByDecision(rows.filter(isPending)),
    changed: countByDecision(rows.filter(isChanged)),
    sent: rows.filter((row) => row.email_sent_at && !isChanged(row)).length,
    undecided: submitted.filter((app) => !decidedIds.has(app.id)).length,
  };
}

const sameCounts = (a: Counts, b: Counts | undefined) =>
  Boolean(b) && DECISIONS.every((decision) => a[decision] === b![decision]);

async function sendTest(
  user: { id: string; email: string },
  eventId: string,
  decision: Decision,
  mode: EmailMode,
) {
  const { data: event } = await admin
    .from('events')
    .select('name')
    .eq('id', eventId)
    .maybeSingle();
  if (!event) return json({ error: 'event_not_found' }, 404);

  const message = buildDecisionMessage(
    decision,
    user.email,
    'Sample Applicant',
    event.name,
  );
  await deliver({ ...message, subject: `[TEST] ${message.subject}` }, mode);

  await admin.from('decision_email_runs').insert({
    event_id: eventId,
    kind: 'test',
    mode,
    started_by: user.id,
    sent_count: 1,
    finished_at: new Date().toISOString(),
  });
  return json({ sent: true, to: user.email, mode });
}

async function approve(
  user: { id: string },
  body: RequestBody,
  eventId: string,
  mode: EmailMode,
) {
  const includeChanged = body.includeChanged === true;
  const summary = await summarize(eventId, mode);
  if (!summary) return json({ error: 'event_not_found' }, 404);

  const counts = countByDecision(
    targets(await loadDecisions(eventId), includeChanged),
  );
  const count = total(counts);

  if (count === 0) return json({ error: 'nothing_to_send' }, 409);
  if (!sameCounts(counts, body.counts)) {
    return json({ error: 'counts_changed', counts }, 409);
  }
  if (summary.undecided > 0 && body.acknowledgeUndecided !== true) {
    return json({ error: 'undecided_applications' }, 409);
  }
  if (body.confirmation !== `SEND ${count}`) {
    return json({ error: 'confirmation_mismatch' }, 409);
  }

  const since = new Date(Date.now() - TEST_VALID_MS).toISOString();
  const { data: tests } = await admin
    .from('decision_email_runs')
    .select('id')
    .eq('event_id', eventId)
    .eq('kind', 'test')
    .eq('started_by', user.id)
    .gte('created_at', since)
    .limit(1);
  if (!tests?.length) return json({ error: 'test_email_required' }, 409);

  const { data: run, error } = await admin
    .from('decision_email_runs')
    .insert({
      event_id: eventId,
      kind: 'release',
      mode,
      started_by: user.id,
      counts,
      include_changed: includeChanged,
    })
    .select('id')
    .single();
  if (error) return json({ error: 'run_failed' }, 500);

  return json({ runId: run.id, total: count, mode });
}

async function sendBatch(
  user: { id: string },
  eventId: string,
  runId: string,
  mode: EmailMode,
) {
  const { data: run } = await admin
    .from('decision_email_runs')
    .select('*')
    .eq('id', runId)
    .eq('event_id', eventId)
    .eq('kind', 'release')
    .maybeSingle();

  if (!run || run.started_by !== user.id) {
    return json({ error: 'run_not_found' }, 404);
  }
  if (run.finished_at) return json({ error: 'run_finished' }, 409);
  if (Date.now() - new Date(run.created_at).getTime() > RUN_VALID_MS) {
    return json({ error: 'run_expired' }, 409);
  }
  if (run.mode !== mode) return json({ error: 'mode_changed' }, 409);

  const { data: event } = await admin
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single();

  const batch = targets(
    await loadDecisions(eventId),
    run.include_changed,
  ).slice(0, BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  for (const row of batch) {
    const profile = row.applications?.profiles;
    const { data: claim } = await admin.rpc('claim_decision_email', {
      target_application_id: row.application_id,
      include_changed: run.include_changed,
    });
    if (!claim) continue;

    try {
      if (!profile?.email) throw new Error('missing_recipient');
      await deliver(
        buildDecisionMessage(
          claim.decision,
          profile.email,
          profile.full_name,
          event!.name,
        ),
        mode,
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(
        'send-application-decisions failed',
        row.application_id,
        error,
      );
      await admin.rpc('release_decision_email_claim', {
        target_application_id: row.application_id,
        previous_status: claim.previous_status,
        previous_email_sent_at: claim.previous_email_sent_at,
        previous_emailed_decision: claim.previous_emailed_decision,
      });
    }
    await sleep(SEND_INTERVAL_MS);
  }

  const remaining = targets(
    await loadDecisions(eventId),
    run.include_changed,
  ).length;

  await admin
    .from('decision_email_runs')
    .update({
      sent_count: run.sent_count + sent,
      failed_count: run.failed_count + failed,
      finished_at: remaining === 0 ? new Date().toISOString() : null,
    })
    .eq('id', runId);

  return json({ sent, failed, remaining });
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
  if (!body.eventId) return json({ error: 'event_required' }, 400);

  let mode: EmailMode;
  try {
    mode = resolveEmailMode();
  } catch (error) {
    console.error('send-application-decisions misconfigured', error);
    return json({ error: (error as Error).message }, 500);
  }

  const caller = { id: user.id, email: user.email };
  try {
    switch (body.action) {
      case 'preview': {
        const summary = await summarize(body.eventId, mode);
        return summary
          ? json(summary)
          : json({ error: 'event_not_found' }, 404);
      }
      case 'test':
        if (!body.decision || !DECISIONS.includes(body.decision)) {
          return json({ error: 'invalid_decision' }, 400);
        }
        return await sendTest(caller, body.eventId, body.decision, mode);
      case 'approve':
        return await approve(caller, body, body.eventId, mode);
      case 'send':
        if (!body.runId) return json({ error: 'run_required' }, 400);
        return await sendBatch(caller, body.eventId, body.runId, mode);
      default:
        return json({ error: 'invalid_action' }, 400);
    }
  } catch (error) {
    console.error('send-application-decisions failed', error);
    return json({ error: 'send_failed' }, 502);
  }
});
