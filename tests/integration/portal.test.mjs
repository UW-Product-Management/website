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
const SITE_URL = 'http://localhost:3000';

const newClient = () =>
  createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function waitForEmail(to, subjectPattern) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const { messages } = await res.json();
    const match = messages.find((m) => subjectPattern.test(m.Subject));
    if (match) {
      const full = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      return full.json();
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} matching ${subjectPattern}`);
}

const firstLink = (message) =>
  message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\S+/)[0].replace(
    /&amp;/g,
    '&',
  );

before(() =>
  assert.ok(PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY is required'),
);

test('applicant can sign up, confirm, apply, and submit', async () => {
  const email = `applicant-${Date.now()}@test.local`;
  const password = 'correct-horse-battery';
  const supabase = newClient();

  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Alex Chen' },
      emailRedirectTo: `${SITE_URL}/portal/apply/register`,
    },
  });
  assert.equal(signUp.error, null);
  assert.equal(signUp.data.session, null);

  const unconfirmed = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  assert.equal(unconfirmed.error?.code, 'email_not_confirmed');

  const confirmEmail = await waitForEmail(email, /confirm/i);
  const verify = await fetch(firstLink(confirmEmail), { redirect: 'manual' });
  assert.equal(verify.status, 303);
  assert.match(
    verify.headers.get('location'),
    /^http:\/\/localhost:3000\/portal\/apply\/register#access_token=/,
  );

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .single();
  assert.equal(profile.full_name, 'Alex Chen');

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', 'prodcon-local')
    .single();

  const draft = await supabase
    .from('applications')
    .insert({
      event_id: event.id,
      program: 'Business',
      year_of_study: '2nd year',
    })
    .select()
    .single();
  assert.equal(draft.error, null);
  assert.equal(draft.data.status, 'draft');

  const answers = await supabase
    .from('applications')
    .update({ product_idea: 'Idea', great_team: 'Trust' })
    .eq('id', draft.data.id)
    .select()
    .single();
  assert.equal(answers.error, null);

  const forged = await supabase
    .from('applications')
    .update({ status: 'submitted' })
    .eq('id', draft.data.id);
  assert.equal(forged.error?.code, '42501');

  const submitted = await supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(submitted.error, null);
  assert.equal(submitted.data.status, 'submitted');
  assert.ok(submitted.data.submitted_at);

  const resubmit = await supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(resubmit.error?.message, 'application_already_submitted');

  const editAfterSubmit = await supabase
    .from('applications')
    .update({ program: 'Engineering' })
    .eq('id', draft.data.id)
    .select();
  assert.equal(editAfterSubmit.data?.length ?? 0, 0);
});

test('password reset email links back to the update-password page', async () => {
  const email = `reset-${Date.now()}@test.local`;
  const supabase = newClient();
  await supabase.auth.signUp({ email, password: 'correct-horse-battery' });

  const reset = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/portal/update-password`,
  });
  assert.equal(reset.error, null);

  const resetEmail = await waitForEmail(email, /reset/i);
  const verify = await fetch(firstLink(resetEmail), { redirect: 'manual' });
  assert.match(
    verify.headers.get('location'),
    /^http:\/\/localhost:3000\/portal\/update-password#access_token=.*type=recovery/,
  );
});

test('anonymous visitors can read events but not applications', async () => {
  const supabase = newClient();
  const events = await supabase.from('events').select('slug');
  assert.equal(events.error, null);
  assert.ok(events.data.some((e) => e.slug === 'prodcon-local'));

  const applications = await supabase.from('applications').select('id');
  assert.equal(applications.error?.code, '42501');
});
