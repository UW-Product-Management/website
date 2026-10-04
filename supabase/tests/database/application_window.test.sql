begin;
select plan(3);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'window', 'Window', now() - interval '1 day', now() + interval '1 day');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.applications (
  event_id, program, year_of_study, product_idea, great_team
) values (
  'aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year',
  'A campus food-waste tracker', 'Trust and curiosity'
);

do $$ begin perform set_config('test.application_id', (select id::text from public.applications), true); end $$;

reset role;
update public.events
set applications_open_at = now() - interval '3 days',
    applications_close_at = now() - interval '1 day'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ update public.applications set program = 'Engineering' $$,
  '42501', null,
  'cannot edit a draft after the event closes'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'applications_closed',
  'cannot submit after the event closes'
);

select is(
  (select program from public.applications where id = current_setting('test.application_id')::uuid),
  'Business',
  'the draft is unchanged after the event closes'
);

select * from finish();
rollback;
