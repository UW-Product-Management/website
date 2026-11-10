begin;
select plan(6);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('33333333-3333-3333-3333-333333333333', 'organizer@test.local', '{"full_name":"Olive Organizer"}');

insert into public.organizers (user_id) values ('33333333-3333-3333-3333-333333333333');

insert into public.events (id, slug, name, applications_open_at, applications_close_at)
values (
  '44444444-4444-4444-4444-444444444444', 'custom-email-test', 'ProdCon Test',
  now() - interval '1 day', now() + interval '1 day'
);

insert into public.custom_email_campaigns (
  id, event_id, subject, body, mode, created_by, recipient_count
) values (
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  'Reminder', 'Hi {{name}}', 'local',
  '33333333-3333-3333-3333-333333333333', 1
);

insert into public.custom_email_recipients (campaign_id, user_id, email, full_name)
values (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  'alex@test.local', 'Alex Chen'
);

select has_column(
  'public', 'custom_email_recipients', 'failed_at',
  'recipients record a failed delivery separately from a sent one'
);

select throws_ok(
  $$ update public.custom_email_recipients
     set sent_at = now(), failed_at = now() $$,
  '23514', null,
  'a recipient cannot be both sent and failed'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*)::int from public.custom_email_recipients),
  0,
  'applicants cannot see who was emailed'
);

select throws_ok(
  $$ insert into public.custom_email_campaigns (event_id, subject, body, mode, recipient_count)
     values ('44444444-4444-4444-4444-444444444444', 'x', 'y', 'live', 1) $$,
  '42501', null,
  'applicants cannot create campaigns'
);

set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select is(
  (select count(*)::int from public.custom_email_recipients),
  1,
  'organizers can see who was emailed'
);

select throws_ok(
  $$ update public.custom_email_recipients set sent_at = now() $$,
  '42501', null,
  'organizers cannot stamp recipients outside the send function'
);

select * from finish();
rollback;
