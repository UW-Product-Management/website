import { execSync } from 'node:child_process';
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

import { assertLocalSupabase } from './local-only.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
assertLocalSupabase(SUPABASE_URL);
const PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

function resolveSecretKey() {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  try {
    const raw = execSync('npx supabase status -o json', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return JSON.parse(raw).SECRET_KEY ?? '';
  } catch {
    return '';
  }
}

const SECRET_KEY = resolveSecretKey();
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};
const newClient = () =>
  createClient(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
const adminClient = () => createClient(SUPABASE_URL, SECRET_KEY, clientOptions);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createConfirmedUser(fullName) {
  const email = `${fullName
    .split(' ')[0]
    .toLowerCase()}-${Date.now()}-${Math.floor(
    Math.random() * 1e6,
  )}@test.local`;
  const password = 'correct-horse-battery';
  const created = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  assert.equal(created.error, null);
  const supabase = newClient();
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null);
  return { supabase, email, userId: created.data.user.id };
}

async function messagesTo(email) {
  const res = await fetch(
    `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );
  return (await res.json()).messages;
}

async function waitForMessage(email, subjectPattern) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const match = (await messagesTo(email)).find((m) =>
      subjectPattern.test(m.Subject),
    );
    if (match) {
      const full = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      return full.json();
    }
    await sleep(250);
  }
  throw new Error(`No email to ${email} matching ${subjectPattern}`);
}

async function submittedApplication(applicant, eventId) {
  const draft = await applicant.supabase
    .from('applications')
    .insert({
      event_id: eventId,
      program: 'Business',
      year_of_study: '2nd year',
      product_idea: 'Idea',
      great_team: 'Trust',
    })
    .select()
    .single();
  assert.equal(draft.error, null);
  const submitted = await applicant.supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(submitted.error, null);
  return draft.data.id;
}

const invoke = (user, body) =>
  user.supabase.functions.invoke('send-application-decisions', { body });

before(() => {
  assert.ok(SECRET_KEY, 'SUPABASE_SECRET_KEY is required');
});

test('results are only released after test, confirmation and approval', async () => {
  const admin = adminClient();
  const slug = `release-${Date.now()}`;
  const { data: event } = await admin
    .from('events')
    .insert({
      slug,
      name: 'Release Test',
      applications_open_at: new Date(Date.now() - 86400000).toISOString(),
      applications_close_at: new Date(Date.now() + 86400000).toISOString(),
    })
    .select()
    .single();

  const organizer = await createConfirmedUser('Olive Organizer');
  await admin.from('organizers').insert({ user_id: organizer.userId });
  const applicant = await createConfirmedUser('Avery Applicant');
  const rejected = await createConfirmedUser('Riley Rejected');
  const applicationId = await submittedApplication(applicant, event.id);
  const rejectedId = await submittedApplication(rejected, event.id);

  const outsider = await invoke(applicant, {
    action: 'preview',
    eventId: event.id,
  });
  assert.ok(outsider.error, 'applicants cannot use the release function');

  await organizer.supabase.rpc('review_application', {
    target_application_id: applicationId,
    decision: 'accepted',
  });
  await organizer.supabase.rpc('review_application', {
    target_application_id: rejectedId,
    decision: 'rejected',
  });

  const preview = await invoke(organizer, {
    action: 'preview',
    eventId: event.id,
  });
  assert.equal(preview.error, null);
  assert.equal(preview.data.mode, 'local');
  assert.deepEqual(preview.data.pending, {
    accepted: 1,
    waitlisted: 0,
    rejected: 1,
  });
  assert.equal(preview.data.undecided, 0);

  const counts = preview.data.pending;
  const noTest = await invoke(organizer, {
    action: 'approve',
    eventId: event.id,
    counts,
    confirmation: 'SEND 2',
  });
  assert.ok(noTest.error, 'a test email is required before approving');

  const test = await invoke(organizer, {
    action: 'test',
    eventId: event.id,
    decision: 'accepted',
  });
  assert.equal(test.error, null);
  await waitForMessage(organizer.email, /\[TEST\].*in for Release Test/i);

  const wrongPhrase = await invoke(organizer, {
    action: 'approve',
    eventId: event.id,
    counts,
    confirmation: 'send',
  });
  assert.ok(wrongPhrase.error, 'the typed confirmation must match');

  const staleCounts = await invoke(organizer, {
    action: 'approve',
    eventId: event.id,
    counts: { accepted: 5, waitlisted: 0, rejected: 1 },
    confirmation: 'SEND 6',
  });
  assert.ok(staleCounts.error, 'stale counts are refused');

  assert.equal((await messagesTo(applicant.email)).length, 0);
  const hidden = await applicant.supabase
    .from('applications')
    .select('status')
    .eq('id', applicationId)
    .single();
  assert.equal(hidden.data.status, 'submitted');

  const approval = await invoke(organizer, {
    action: 'approve',
    eventId: event.id,
    counts,
    confirmation: 'SEND 2',
  });
  assert.equal(approval.error, null);

  const batch = await invoke(organizer, {
    action: 'send',
    eventId: event.id,
    runId: approval.data.runId,
  });
  assert.equal(batch.error, null);
  assert.equal(batch.data.sent, 2);
  assert.equal(batch.data.remaining, 0);

  const accepted = await waitForMessage(
    applicant.email,
    /in for Release Test/i,
  );
  assert.match(accepted.Text, /Hi Avery Applicant/);
  await waitForMessage(rejected.email, /Release Test application/i);

  const visible = await applicant.supabase
    .from('applications')
    .select('status')
    .eq('id', applicationId)
    .single();
  assert.equal(visible.data.status, 'accepted');

  const again = await invoke(organizer, {
    action: 'send',
    eventId: event.id,
    runId: approval.data.runId,
  });
  assert.ok(again.error, 'a finished run cannot send again');
  await sleep(500);
  assert.equal(
    (await messagesTo(applicant.email)).filter((m) =>
      /in for Release Test/i.test(m.Subject),
    ).length,
    1,
  );

  await organizer.supabase.rpc('review_application', {
    target_application_id: applicationId,
    decision: 'waitlisted',
  });
  const changed = await invoke(organizer, {
    action: 'preview',
    eventId: event.id,
  });
  assert.equal(changed.data.changed.waitlisted, 1);
  assert.equal(changed.data.pending.waitlisted, 0);
});
