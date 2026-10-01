begin;
select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('22222222-2222-2222-2222-222222222222', 'blair@test.local', '{"full_name":"Blair Ng"}');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'closed', 'Closed', now() - interval '2 days', now() - interval '1 day');

select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alex Chen',
  'signup creates a profile from user metadata'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ insert into public.applications (event_id) values ('aaaaaaaa-0000-0000-0000-000000000002') $$,
  '42501', null,
  'cannot start an application for a closed event'
);

select throws_ok(
  $$ insert into public.applications (event_id, user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null,
  'cannot set user_id to someone else'
);

select throws_ok(
  $$ insert into public.applications (event_id, status)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'submitted') $$,
  '42501', null,
  'cannot set status directly'
);

select lives_ok(
  $$ insert into public.applications (event_id, program, year_of_study)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year') $$,
  'owner can start a draft for an open event'
);

do $$ begin perform set_config('test.application_id', (select id::text from public.applications), true); end $$;

select is(
  (select user_id from public.applications where id = current_setting('test.application_id')::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the signed-in user'
);

select throws_ok(
  $$ insert into public.applications (event_id) values ('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23505', null,
  'only one application per user per event'
);

select throws_ok(
  $$ update public.applications set product_idea = repeat('x', 201) $$,
  '23514', null,
  'answers over 200 characters are rejected'
);

select throws_ok(
  $$ update public.applications set program = 'Underwater Basket Weaving' $$,
  '23514', null,
  'unknown programs are rejected'
);

select throws_ok(
  $$ update public.applications set submitted_at = now() $$,
  '42501', null,
  'cannot set submitted_at directly'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_incomplete',
  'cannot submit with unanswered questions'
);

update public.applications
set product_idea = 'A campus food-waste tracker', great_team = 'Trust and curiosity'
where id = current_setting('test.application_id')::uuid;

select is(
  (public.submit_application(current_setting('test.application_id')::uuid)).status,
  'submitted',
  'complete draft can be submitted'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_already_submitted',
  'cannot submit twice'
);

select is_empty(
  $$ update public.applications set program = 'Engineering' returning id $$,
  'submitted applications are read-only'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is_empty(
  $$ select id from public.applications $$,
  'users cannot see other users'' applications'
);

select is_empty(
  $$ select id from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'users cannot see other users'' profiles'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_not_found',
  'users cannot submit other users'' applications'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select id from public.applications $$,
  '42501', null,
  'anonymous visitors cannot read applications'
);

select * from finish();
rollback;
