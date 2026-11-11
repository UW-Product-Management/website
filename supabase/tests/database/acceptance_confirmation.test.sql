begin;
select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('22222222-2222-2222-2222-222222222222', 'blake@test.local', '{"full_name":"Blake Ray"}');

insert into public.events (
  id, slug, name, applications_open_at, applications_close_at, confirm_by
) values (
  'aaaaaaaa-0000-0000-0000-000000000001', 'confirm', 'Confirm',
  now() - interval '2 days', now() - interval '1 day', now() + interval '1 day'
);

insert into public.applications (
  id, user_id, event_id, program, year_of_study, favourite_product,
  status, submitted_at
) values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Business', '2nd year', 'Notion', 'accepted', now()),
  ('bbbbbbbb-0000-0000-0000-000000000002',
   '22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-0000-0000-0000-000000000001',
   'Engineering', '3rd year', 'Figma', 'submitted', now());

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select confirmation from public.applications
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'pending',
  'an accepted application starts out unconfirmed'
);

select throws_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'confirmed') $$,
  'P0001', 'logistics_not_acknowledged',
  'confirming without acknowledging the logistics is refused'
);

select lives_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'confirmed', true) $$,
  'an accepted applicant can confirm once they acknowledge'
);

select is(
  (select confirmation from public.applications
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'confirmed',
  'confirming records the confirmation'
);

select is(
  (select status from public.applications
    where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  'accepted',
  'confirming leaves the decision status alone'
);

select throws_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'confirmed', true) $$,
  'P0001', 'confirmation_unchanged',
  'confirming twice is refused'
);

select lives_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'withdrawn') $$,
  'a confirmed applicant can withdraw without acknowledging again'
);

select lives_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'confirmed', true) $$,
  'a withdrawn applicant can confirm again'
);

select throws_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000002', 'confirmed', true) $$,
  'P0001', 'application_not_found',
  'another applicant''s row cannot be confirmed'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select throws_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000002', 'confirmed', true) $$,
  'P0001', 'not_accepted',
  'an application that was never accepted cannot be confirmed'
);

reset role;
update public.events
set confirm_by = now() - interval '1 hour'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ select public.set_application_confirmation(
       'bbbbbbbb-0000-0000-0000-000000000001', 'withdrawn') $$,
  'P0001', 'confirmation_closed',
  'nothing can change after the confirmation deadline'
);

select * from finish();
rollback;
