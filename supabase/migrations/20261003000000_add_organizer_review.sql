alter table public.profiles
  add column email text not null default '';

update public.profiles
set email = coalesce(users.email, '')
from auth.users as users
where users.id = profiles.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

alter table public.applications
  add constraint applications_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

alter table public.applications drop constraint applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (status in ('draft', 'submitted', 'accepted', 'waitlisted', 'rejected'));

alter table public.applications
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references auth.users (id) on delete set null;

create table public.organizers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.organizers enable row level security;

create function public.is_organizer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizers where user_id = (select auth.uid())
  );
$$;

create function public.review_application(
  target_application_id uuid,
  decision text
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.applications;
begin
  if not public.is_organizer() then
    raise exception 'not_organizer';
  end if;

  if decision not in ('accepted', 'waitlisted', 'rejected') then
    raise exception 'invalid_decision';
  end if;

  update public.applications
  set status = decision,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_application_id
    and status <> 'draft'
  returning * into application;

  if not found then
    raise exception 'application_not_reviewable';
  end if;

  return application;
end;
$$;

create policy "Organizers can read their own organizer row"
  on public.organizers for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Organizers can read all applications"
  on public.applications for select to authenticated
  using (public.is_organizer());

create policy "Organizers can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_organizer());

revoke all on public.organizers from anon, authenticated;
grant select on public.organizers to authenticated;

revoke execute on function public.is_organizer() from public, anon;
grant execute on function public.is_organizer() to authenticated;
revoke execute on function public.review_application(uuid, text) from public, anon;
grant execute on function public.review_application(uuid, text) to authenticated;
