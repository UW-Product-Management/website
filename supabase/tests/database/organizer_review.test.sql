begin;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'organizer@test.local', '{"full_name":"Olive Organizer"}');

insert into public.organizers (user_id) values ('33333333-3333-3333-3333-333333333333');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day');

insert into public.applications (id, user_id, event_id, program, year_of_study, product_idea, great_team, status, submitted_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year', 'Idea', 'Trust', 'submitted', now());

select is(
  (select email from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'alex@test.local',
  'signup copies the email onto the profile'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(public.is_organizer(), false, 'applicants are not organizers');

select throws_ok(
  $$ select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'accepted') $$,
  'P0001', 'not_organizer',
  'applicants cannot review applications'
);

select is_empty(
  $$ select user_id from public.organizers $$,
  'applicants cannot see the organizers list'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(public.is_organizer(), true, 'organizers are recognised');

select is(
  (select count(*)::int from public.applications),
  1,
  'organizers can read all applications'
);

select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'organizers can read applicant profiles'
);

select throws_ok(
  $$ update public.applications set status = 'accepted' $$,
  '42501', null,
  'organizers cannot write status directly'
);

select throws_ok(
  $$ select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'maybe') $$,
  'P0001', 'invalid_decision',
  'unknown decisions are rejected'
);

select is(
  (public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'accepted')).reviewed_by,
  '33333333-3333-3333-3333-333333333333'::uuid,
  'organizers can record a decision and are credited for it'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select status from public.applications),
  'accepted',
  'applicants see the decision on their application'
);

select is_empty(
  $$ update public.applications set program = 'Engineering' returning id $$,
  'decided applications are read-only for applicants'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'rejected') $$,
  '42501', null,
  'anonymous visitors cannot review applications'
);

select * from finish();
rollback;
