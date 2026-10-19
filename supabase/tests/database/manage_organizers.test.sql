begin;
select plan(10);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'organizer@test.local', '{"full_name":"Olive Organizer"}');

insert into public.organizers (user_id) values ('33333333-3333-3333-3333-333333333333');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ select public.add_organizer('alex@test.local') $$,
  'P0001', 'not_organizer',
  'applicants cannot add organizers'
);

select throws_ok(
  $$ select * from public.list_organizers() $$,
  'P0001', 'not_organizer',
  'applicants cannot list organizers'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$ select public.add_organizer('not-an-email') $$,
  'P0001', 'invalid_email',
  'malformed emails are rejected'
);

select throws_ok(
  $$ select public.add_organizer('nobody@test.local') $$,
  'P0001', 'user_not_found',
  'emails without an account are rejected'
);

select lives_ok(
  $$ select public.add_organizer('  Alex@Test.local ') $$,
  'organizers can add an existing user by email, ignoring case and spaces'
);

select throws_ok(
  $$ select public.add_organizer('alex@test.local') $$,
  'P0001', 'already_organizer',
  'adding an existing organizer is rejected'
);

select is(
  (
    select count(*)::int from public.list_organizers()
    where email in ('alex@test.local', 'organizer@test.local')
  ),
  2,
  'organizers can list every organizer'
);

select throws_ok(
  $$ select public.remove_organizer('33333333-3333-3333-3333-333333333333') $$,
  'P0001', 'cannot_remove_self',
  'organizers cannot remove themselves'
);

select lives_ok(
  $$ select public.remove_organizer('11111111-1111-1111-1111-111111111111') $$,
  'organizers can remove another organizer'
);

select throws_ok(
  $$ select public.remove_organizer('11111111-1111-1111-1111-111111111111') $$,
  'P0001', 'organizer_not_found',
  'removing a non-organizer is rejected'
);

select * from finish();
rollback;
