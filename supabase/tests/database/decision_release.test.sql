begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'organizer@test.local', '{"full_name":"Olive Organizer"}');

insert into public.organizers (user_id) values ('33333333-3333-3333-3333-333333333333');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day');

insert into public.applications (id, user_id, event_id, program, year_of_study, product_idea, great_team, status, submitted_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year', 'Idea', 'Trust', 'submitted', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'accepted');

select throws_ok(
  $$ select public.claim_decision_email('bbbbbbbb-0000-0000-0000-000000000001') $$,
  '42501', null,
  'organizers cannot claim decision emails from the browser'
);

select throws_ok(
  $$ update public.application_decisions set email_sent_at = now(), emailed_decision = 'accepted' $$,
  '42501', null,
  'organizers cannot stamp decisions as emailed'
);

select throws_ok(
  $$ insert into public.decision_email_runs (event_id, kind, mode)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'release', 'live') $$,
  '42501', null,
  'organizers cannot forge release runs'
);

reset role;
set local role service_role;

select is(
  (public.claim_decision_email('bbbbbbbb-0000-0000-0000-000000000001') ->> 'decision'),
  'accepted',
  'claiming returns the decision to email'
);

select is(
  (select status from public.applications where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'accepted',
  'claiming reveals the decision to the applicant'
);

select is(
  public.claim_decision_email('bbbbbbbb-0000-0000-0000-000000000001'),
  null,
  'a claimed decision cannot be claimed twice'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'waitlisted');

select is(
  (select status from public.applications where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'accepted',
  'changing a decision after the email does not change what the applicant sees'
);

reset role;
set local role service_role;

select is(
  public.claim_decision_email('bbbbbbbb-0000-0000-0000-000000000001'),
  null,
  'a changed decision is not re-sent unless explicitly requested'
);

select is(
  (public.claim_decision_email('bbbbbbbb-0000-0000-0000-000000000001', true) ->> 'previous_emailed_decision'),
  'accepted',
  'an explicit re-send claims the changed decision'
);

select public.release_decision_email_claim(
  'bbbbbbbb-0000-0000-0000-000000000001', 'accepted', now(), 'accepted'
);

select is(
  (select emailed_decision from public.application_decisions where application_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'accepted',
  'releasing a claim restores the previous email stamp'
);

select is(
  (select status from public.applications where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'accepted',
  'releasing a claim restores the previous applicant-visible status'
);

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is_empty(
  $$ select id from public.decision_email_runs $$,
  'applicants cannot read decision email runs'
);

select * from finish();
rollback;
