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

const newClient = () =>
  createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function signedInApplicant() {
  const email = `received-${Date.now()}@test.local`;
  const password = 'correct-horse-battery';
  const supabase = newClient();

  await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: 'Alex Chen' } },
  });
  const confirmation = await waitForMessage(email, /confirm/i);
  const link = confirmation.Text.match(
    /https?:\/\/\S+\/auth\/v1\/verify\S+/,
  )[0].replace(/&amp;/g, '&');
  await fetch(link, { redirect: 'manual' });

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null);
  return { supabase, email };
}

async function draftApplication(supabase) {
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', 'prodcon-local')
    .single();
  const { data: draft, error } = await supabase
    .from('applications')
    .insert({
      event_id: event.id,
      program: 'Business',
      year_of_study: '2nd year',
      product_idea: 'A campus food-waste tracker',
      great_team: 'Trust and curiosity',
    })
    .select()
    .single();
  assert.equal(error, null);
  return draft;
}

before(() =>
  assert.ok(PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY is required'),
);

test('submitting an application sends exactly one received email', async () => {
  const { supabase, email } = await signedInApplicant();
  const draft = await draftApplication(supabase);

  const early = await supabase.functions.invoke('send-application-received');
  assert.equal(early.error, null);
  assert.equal(early.data.sent, false);

  const submitted = await supabase.rpc('submit_application', {
    target_application_id: draft.id,
  });
  assert.equal(submitted.error, null);

  const first = await supabase.functions.invoke('send-application-received');
  assert.equal(first.error, null);
  assert.equal(first.data.sent, true);

  const received = await waitForMessage(email, /received your/i);
  assert.match(received.Text, /Hi Alex Chen/);
  assert.match(received.Text, /Program: Business/);

  const second = await supabase.functions.invoke('send-application-received');
  assert.equal(second.error, null);
  assert.equal(second.data.sent, false);

  await sleep(500);
  const receivedCount = (await messagesTo(email)).filter((m) =>
    /received your/i.test(m.Subject),
  ).length;
  assert.equal(receivedCount, 1);

  const stamp = await supabase
    .from('applications')
    .select('confirmation_email_sent_at')
    .eq('id', draft.id)
    .single();
  assert.ok(stamp.data.confirmation_email_sent_at);
});

test('received email function rejects requests without a user session', async () => {
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/send-application-received`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${PUBLISHABLE_KEY}` },
    },
  );
  assert.ok([401, 403].includes(res.status));
});
