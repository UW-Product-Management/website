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

function resolveSecretKey() {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY)
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.SERVICE_ROLE_KEY) return process.env.SERVICE_ROLE_KEY;
  try {
    const raw = execSync('npx supabase status -o json', {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    const status = JSON.parse(raw);
    return status.SECRET_KEY ?? status.SERVICE_ROLE_KEY ?? '';
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

async function createConfirmedUser(fullName) {
  const admin = adminClient();
  const email = `${fullName
    .split(' ')[0]
    .toLowerCase()}-${Date.now()}@test.local`;
  const password = 'correct-horse-battery';
  const created = await admin.auth.admin.createUser({
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

before(() => {
  assert.ok(PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY is required');
  assert.ok(SECRET_KEY, 'SUPABASE_SECRET_KEY is required');
});

test('organizers review applications and applicants see the decision', async () => {
  const applicant = await createConfirmedUser('Avery Applicant');
  const organizer = await createConfirmedUser('Olive Organizer');
  await adminClient().from('organizers').insert({ user_id: organizer.userId });

  const { data: event } = await applicant.supabase
    .from('events')
    .select('id')
    .eq('slug', 'prodcon-local')
    .single();

  const draft = await applicant.supabase
    .from('applications')
    .insert({
      event_id: event.id,
      program: 'Business',
      year_of_study: '2nd year',
      product_idea: 'Idea',
      great_team: 'Trust',
    })
    .select()
    .single();
  assert.equal(draft.error, null);

  const forgedReview = await applicant.supabase.rpc('review_application', {
    target_application_id: draft.data.id,
    decision: 'accepted',
  });
  assert.equal(forgedReview.error?.message, 'not_organizer');

  const early = await organizer.supabase.rpc('review_application', {
    target_application_id: draft.data.id,
    decision: 'accepted',
  });
  assert.equal(early.error?.message, 'application_not_reviewable');

  const submitted = await applicant.supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(submitted.error, null);

  const isOrganizer = await organizer.supabase.rpc('is_organizer');
  assert.equal(isOrganizer.data, true);
  const applicantIsOrganizer = await applicant.supabase.rpc('is_organizer');
  assert.equal(applicantIsOrganizer.data, false);

  const listed = await organizer.supabase
    .from('applications')
    .select('id, status, profiles(full_name, email)')
    .eq('event_id', event.id)
    .neq('status', 'draft');
  assert.equal(listed.error, null);
  const row = listed.data.find((a) => a.id === draft.data.id);
  assert.equal(row.profiles.full_name, 'Avery Applicant');
  assert.equal(row.profiles.email, applicant.email);

  const decided = await organizer.supabase.rpc('review_application', {
    target_application_id: draft.data.id,
    decision: 'waitlisted',
  });
  assert.equal(decided.error, null);
  assert.equal(decided.data.status, 'waitlisted');
  assert.ok(decided.data.reviewed_at);

  const seen = await applicant.supabase
    .from('applications')
    .select('status')
    .eq('id', draft.data.id)
    .single();
  assert.equal(seen.data.status, 'waitlisted');

  const applicantsView = await applicant.supabase
    .from('applications')
    .select('id');
  assert.equal(applicantsView.data.length, 1);
});

test('organizers still resolve their own profile and application when scoped to their user id', async () => {
  const organizer = await createConfirmedUser('Orla Organizer');
  const other = await createConfirmedUser('Pat Applicant');
  await adminClient().from('organizers').insert({ user_id: organizer.userId });

  const { data: event } = await organizer.supabase
    .from('events')
    .select('id')
    .eq('slug', 'prodcon-local')
    .single();

  for (const person of [organizer, other]) {
    const created = await person.supabase
      .from('applications')
      .insert({ event_id: event.id, program: 'Business' })
      .select()
      .single();
    assert.equal(created.error, null);
  }

  const unscopedProfile = await organizer.supabase
    .from('profiles')
    .select('id')
    .maybeSingle();
  assert.ok(
    unscopedProfile.error,
    'organizers see every profile, so an unscoped single-row query must fail',
  );

  const ownProfile = await organizer.supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', organizer.userId)
    .maybeSingle();
  assert.equal(ownProfile.error, null);
  assert.equal(ownProfile.data.full_name, 'Orla Organizer');

  const ownApplication = await organizer.supabase
    .from('applications')
    .select('user_id')
    .eq('user_id', organizer.userId)
    .eq('event_id', event.id)
    .maybeSingle();
  assert.equal(ownApplication.error, null);
  assert.equal(ownApplication.data.user_id, organizer.userId);
});
