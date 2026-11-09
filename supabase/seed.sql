insert into public.events (
  slug, name, applications_open_at, applications_close_at, confirm_by
)
values (
  'prodcon-local',
  'ProdCon (local)',
  now() - interval '1 day',
  now() + interval '1 year',
  now() + interval '1 year'
);
