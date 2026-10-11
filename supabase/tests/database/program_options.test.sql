begin;
select plan(2);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ insert into public.applications (event_id, program)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Environment') $$,
  'newly added programs are accepted'
);

select throws_ok(
  $$ update public.applications set program = 'Underwater Basket Weaving' $$,
  '23514', null,
  'unknown programs are still rejected'
);

select * from finish();
rollback;
