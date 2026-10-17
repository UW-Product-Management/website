begin;
select plan(16);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'organizer@test.local', '{"full_name":"Olive Organizer"}'),
  ('44444444-4444-4444-4444-444444444444', 'second@test.local', '{"full_name":"Sam Second"}');

insert into public.organizers (user_id) values
  ('33333333-3333-3333-3333-333333333333'),
  ('44444444-4444-4444-4444-444444444444');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day');

insert into public.applications (id, user_id, event_id, program, year_of_study, product_idea, great_team, status, submitted_at) values
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year', 'Idea', 'Trust', 'submitted', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$ select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'accepted', repeat('x', 2001)) $$,
  'P0001', 'note_too_long',
  'notes over 2000 characters are rejected'
);

select is(
  (public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'waitlisted', '  Strong idea, limited seats  ')).status,
  'waitlisted',
  'a decision with a note is recorded'
);

select throws_ok(
  $$ select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'waitlisted') $$,
  'P0001', 'decision_unchanged',
  'repeating the current decision is rejected'
);

select is(
  (select count(*)::int from public.application_reviews),
  1,
  'the decision is written to the review log'
);

select is(
  (select reviewer_id from public.application_reviews),
  '33333333-3333-3333-3333-333333333333'::uuid,
  'the log credits the reviewing organizer'
);

select is(
  (select reviewer_name || ' <' || reviewer_email || '>' from public.application_reviews),
  'Olive Organizer <organizer@test.local>',
  'the log snapshots the reviewer name and email'
);

select is(
  (select previous_status || '>' || new_status from public.application_reviews),
  'submitted>waitlisted',
  'the log records the status transition'
);

select is(
  (select note from public.application_reviews),
  'Strong idea, limited seats',
  'the log stores the trimmed note'
);

set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select public.review_application('bbbbbbbb-0000-0000-0000-000000000001', 'accepted');

select is(
  (select count(*)::int from public.application_reviews where application_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  2,
  'a changed decision appends to the log instead of overwriting it'
);

select is(
  (select previous_status from public.application_reviews where reviewer_id = '44444444-4444-4444-4444-444444444444'),
  'waitlisted',
  'the second decision records the prior status'
);

select is(
  (select note from public.application_reviews where reviewer_id = '44444444-4444-4444-4444-444444444444'),
  null,
  'a decision without a note stores null'
);

select throws_ok(
  $$ insert into public.application_reviews (application_id, event_id, new_status)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'accepted') $$,
  '42501', null,
  'organizers cannot insert log rows directly'
);

select throws_ok(
  $$ update public.application_reviews set note = 'edited' $$,
  '42501', null,
  'organizers cannot edit log rows'
);

select throws_ok(
  $$ delete from public.application_reviews $$,
  '42501', null,
  'organizers cannot delete log rows'
);

set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is_empty(
  $$ select id from public.application_reviews $$,
  'applicants cannot read the review log or its notes'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select id from public.application_reviews $$,
  '42501', null,
  'anonymous visitors cannot read the review log'
);

select * from finish();
rollback;
