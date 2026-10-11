-- Profiles: one row per auth user, created by trigger on signup.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Events: ProdCon runs annually, so applications are scoped to an event cycle.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  applications_open_at timestamptz not null,
  applications_close_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint events_window_is_valid
    check (applications_close_at > applications_open_at)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete restrict,
  program text check (
    program in ('Computer Science', 'Business', 'Engineering', 'Mathematics')
  ),
  year_of_study text check (
    year_of_study in ('1st year', '2nd year', '3rd year', '4th year', '5th+ year')
  ),
  product_idea text check (char_length(product_idea) <= 200),
  great_team text check (char_length(great_team) <= 200),
  media_consent boolean not null default false,
  dietary_restriction text check (
    dietary_restriction in ('None', 'Vegetarian', 'Vegan', 'Halal', 'Gluten-free')
  ),
  dietary_details text check (char_length(dietary_details) <= 500),
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_one_per_user_per_event unique (user_id, event_id),
  constraint applications_submitted_at_matches_status
    check ((status = 'draft') = (submitted_at is null))
);

create index applications_event_id_idx on public.applications (event_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_event_open(target_event_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.events
    where id = target_event_id
      and now() >= applications_open_at
      and now() < applications_close_at
  );
$$;

create function public.submit_application(target_application_id uuid)
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
    or coalesce(btrim(application.product_idea), '') = ''
    or coalesce(btrim(application.great_team), '') = ''
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

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Anyone can read events"
  on public.events for select to anon, authenticated
  using (true);

create policy "Users can read their own applications"
  on public.applications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can start a draft for an open event"
  on public.applications for insert to authenticated
  with check (
    user_id = (select auth.uid()) and public.is_event_open(event_id)
  );

create policy "Users can edit their draft while the event is open"
  on public.applications for update to authenticated
  using (user_id = (select auth.uid()) and status = 'draft')
  with check (
    user_id = (select auth.uid())
    and status = 'draft'
    and public.is_event_open(event_id)
  );

-- Column grants keep user_id, status, and submitted_at server-controlled even
-- though the Data API exposes these tables to the browser.
revoke all on public.profiles, public.events, public.applications
  from anon, authenticated;

grant select on public.events to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.applications to authenticated;
grant insert (
  event_id, program, year_of_study, product_idea, great_team,
  media_consent, dietary_restriction, dietary_details
) on public.applications to authenticated;
grant update (
  program, year_of_study, product_idea, great_team,
  media_consent, dietary_restriction, dietary_details
) on public.applications to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.submit_application(uuid) from public, anon;
grant execute on function public.submit_application(uuid) to authenticated;
