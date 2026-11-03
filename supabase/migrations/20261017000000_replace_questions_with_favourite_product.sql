-- The three earlier answer columns stay in place so existing drafts and
-- submissions keep their data; the app no longer reads or writes them.
alter table public.applications
  add column favourite_product text check (char_length(favourite_product) <= 200);

grant insert (favourite_product) on public.applications to authenticated;
grant update (favourite_product) on public.applications to authenticated;

create or replace function public.submit_application(target_application_id uuid)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.applications;
begin
  select * into application
  from public.applications
  where id = target_application_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'application_not_found';
  end if;

  if application.status <> 'draft' then
    raise exception 'application_already_submitted';
  end if;

  if not public.is_event_open(application.event_id) then
    raise exception 'applications_closed';
  end if;

  if application.program is null
    or application.year_of_study is null
    or coalesce(btrim(application.favourite_product), '') = ''
    or not exists (
      select 1 from public.profiles
      where id = application.user_id and btrim(full_name) <> ''
    )
  then
    raise exception 'application_incomplete';
  end if;

  update public.applications
  set status = 'submitted', submitted_at = now()
  where id = application.id
  returning * into application;

  return application;
end;
$$;
