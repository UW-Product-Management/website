-- Decisions are recorded privately and only reach applicants (dashboard and
-- email) when an organizer releases results. applications.status keeps
-- reading "submitted" for applicants until then.
create table public.application_decisions (
  application_id uuid primary key references public.applications (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  decision text not null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz not null default now(),
  email_sent_at timestamptz,
  emailed_decision text,
  constraint application_decisions_decision_check
    check (decision in ('accepted', 'waitlisted', 'rejected')),
  constraint application_decisions_emailed_decision_check
    check (emailed_decision in ('accepted', 'waitlisted', 'rejected')),
  constraint application_decisions_email_stamp_matches_decision
    check ((email_sent_at is null) = (emailed_decision is null))
);

create index application_decisions_event_id_idx
  on public.application_decisions (event_id);
create index application_decisions_decided_by_idx
  on public.application_decisions (decided_by);

alter table public.application_decisions enable row level security;

create policy "Organizers can read decisions"
  on public.application_decisions for select to authenticated
  using (public.is_organizer());

revoke all on public.application_decisions from anon, authenticated;
grant select on public.application_decisions to authenticated;

create table public.decision_email_runs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('test', 'release')),
  mode text not null check (mode in ('local', 'sandbox', 'live')),
  started_by uuid references auth.users (id) on delete set null,
  counts jsonb not null default '{}'::jsonb,
  include_changed boolean not null default false,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index decision_email_runs_event_id_idx
  on public.decision_email_runs (event_id);
create index decision_email_runs_started_by_idx
  on public.decision_email_runs (started_by);

alter table public.decision_email_runs enable row level security;

create policy "Organizers can read decision email runs"
  on public.decision_email_runs for select to authenticated
  using (public.is_organizer());

revoke all on public.decision_email_runs from anon, authenticated;
grant select on public.decision_email_runs to authenticated;

-- Applicants have already seen these decisions, so the rows stay "not emailed"
-- and will be included in the first release.
insert into public.application_decisions (
  application_id, event_id, decision, decided_by, decided_at
)
select id, event_id, status, reviewed_by, coalesce(reviewed_at, now())
from public.applications
where status in ('accepted', 'waitlisted', 'rejected');

drop function public.review_application(uuid, text, text);

create function public.review_application(
  target_application_id uuid,
  decision text,
  note text default null
)
returns public.application_decisions
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.applications;
  current_decision public.application_decisions;
  recorded public.application_decisions;
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

  select * into current_decision
  from public.application_decisions
  where application_id = target_application_id;

  if current_decision.decision = review_application.decision then
    raise exception 'decision_unchanged';
  end if;

  prior_status := coalesce(current_decision.decision, 'submitted');

  insert into public.application_decisions (
    application_id, event_id, decision, decided_by, decided_at
  )
  values (
    application.id, application.event_id, review_application.decision,
    (select auth.uid()), now()
  )
  on conflict (application_id) do update
    set decision = excluded.decision,
        decided_by = excluded.decided_by,
        decided_at = excluded.decided_at
  returning * into recorded;

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
    prior_status, review_application.decision, trimmed_note
  );

  return recorded;
end;
$$;

revoke execute on function public.review_application(uuid, text, text) from public, anon;
grant execute on function public.review_application(uuid, text, text) to authenticated;

-- Called only by the send-application-decisions Edge Function (service role).
-- Claiming stamps the decision as emailed and makes it visible to the
-- applicant in one transaction; a failed send hands the previous state back.
create function public.claim_decision_email(
  target_application_id uuid,
  include_changed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.application_decisions;
  previous_status text;
begin
  select * into claimed
  from public.application_decisions
  where application_id = target_application_id
  for update;

  if not found then
    return null;
  end if;

  if claimed.email_sent_at is not null
    and not (include_changed and claimed.emailed_decision <> claimed.decision)
  then
    return null;
  end if;

  select status into previous_status
  from public.applications
  where id = target_application_id
  for update;

  update public.application_decisions
  set email_sent_at = now(),
      emailed_decision = claimed.decision
  where application_id = target_application_id;

  update public.applications
  set status = claimed.decision,
      reviewed_at = claimed.decided_at,
      reviewed_by = claimed.decided_by
  where id = target_application_id;

  return jsonb_build_object(
    'decision', claimed.decision,
    'previous_status', previous_status,
    'previous_email_sent_at', claimed.email_sent_at,
    'previous_emailed_decision', claimed.emailed_decision
  );
end;
$$;

create function public.release_decision_email_claim(
  target_application_id uuid,
  previous_status text,
  previous_email_sent_at timestamptz,
  previous_emailed_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.application_decisions
  set email_sent_at = previous_email_sent_at,
      emailed_decision = previous_emailed_decision
  where application_id = target_application_id;

  update public.applications
  set status = previous_status
  where id = target_application_id;
end;
$$;

revoke execute on function public.claim_decision_email(uuid, boolean) from public, anon, authenticated;
grant execute on function public.claim_decision_email(uuid, boolean) to service_role;
revoke execute on function public.release_decision_email_claim(uuid, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.release_decision_email_claim(uuid, text, timestamptz, text) to service_role;
