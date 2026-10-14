create table public.application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewer_name text not null default '',
  reviewer_email text not null default '',
  previous_status text,
  new_status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint application_reviews_new_status_check
    check (new_status in ('accepted', 'waitlisted', 'rejected')),
  constraint application_reviews_previous_status_check
    check (previous_status is null or previous_status in (
      'submitted', 'accepted', 'waitlisted', 'rejected'
    )),
  constraint application_reviews_note_length check (char_length(note) <= 2000)
);

create index application_reviews_application_id_created_at_idx
  on public.application_reviews (application_id, created_at desc);
create index application_reviews_event_id_idx
  on public.application_reviews (event_id);
create index application_reviews_reviewer_id_idx
  on public.application_reviews (reviewer_id);

alter table public.application_reviews enable row level security;

create policy "Organizers can read the review log"
  on public.application_reviews for select to authenticated
  using (public.is_organizer());

revoke all on public.application_reviews from anon, authenticated;
grant select on public.application_reviews to authenticated;

insert into public.application_reviews (
  application_id, event_id, reviewer_id, reviewer_name, reviewer_email,
  previous_status, new_status, created_at
)
select
  applications.id,
  applications.event_id,
  reviewers.id,
  coalesce(reviewers.full_name, ''),
  coalesce(reviewers.email, ''),
  null,
  applications.status,
  applications.reviewed_at
from public.applications
left join public.profiles as reviewers on reviewers.id = applications.reviewed_by
where applications.reviewed_at is not null
  and applications.status in ('accepted', 'waitlisted', 'rejected');

drop function public.review_application(uuid, text);

create function public.review_application(
  target_application_id uuid,
  decision text,
  note text default null
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.applications;
  reviewer public.profiles;
  prior_status text;
  trimmed_note text := nullif(btrim(note), '');
begin
  if not public.is_organizer() then
    raise exception 'not_organizer';
  end if;

  if decision not in ('accepted', 'waitlisted', 'rejected') then
    raise exception 'invalid_decision';
  end if;

  if char_length(trimmed_note) > 2000 then
    raise exception 'note_too_long';
  end if;

  select * into application
  from public.applications
  where id = target_application_id
    and status <> 'draft'
  for update;

  if not found then
    raise exception 'application_not_reviewable';
  end if;

  if application.status = decision then
    raise exception 'decision_unchanged';
  end if;

  prior_status := application.status;

  update public.applications
  set status = decision,
      reviewed_at = now(),
      reviewed_by = (select auth.uid())
  where id = target_application_id
  returning * into application;

  select * into reviewer
  from public.profiles
  where id = (select auth.uid());

  insert into public.application_reviews (
    application_id, event_id, reviewer_id, reviewer_name, reviewer_email,
    previous_status, new_status, note
  )
  values (
    application.id, application.event_id, reviewer.id,
    coalesce(reviewer.full_name, ''), coalesce(reviewer.email, ''),
    prior_status, decision, trimmed_note
  );

  return application;
end;
$$;

revoke execute on function public.review_application(uuid, text, text) from public, anon;
grant execute on function public.review_application(uuid, text, text) to authenticated;
