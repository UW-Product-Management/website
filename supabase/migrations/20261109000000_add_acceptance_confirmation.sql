-- Accepted applicants confirm or withdraw from their spot. Confirmation is
-- tracked apart from applications.status so a withdrawal never overwrites the
-- decision the release emails key off, and organizers can still tell an
-- applicant who has not replied from one who dropped out.
alter table public.events
  add column confirm_by timestamptz;

alter table public.applications
  add column confirmation text not null default 'pending'
    check (confirmation in ('pending', 'confirmed', 'withdrawn')),
  add column confirmation_updated_at timestamptz,
  add column logistics_acknowledged_at timestamptz;

create index applications_event_confirmation_idx
  on public.applications (event_id, confirmation);

create function public.is_confirmation_open(target_event_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.events
    where id = target_event_id
      and confirm_by is not null
      and now() < confirm_by
  );
$$;

create function public.set_application_confirmation(
  target_application_id uuid,
  confirmation text,
  acknowledged boolean default false
)
returns public.applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.applications;
begin
  if set_application_confirmation.confirmation
    not in ('confirmed', 'withdrawn')
  then
    raise exception 'invalid_confirmation';
  end if;

  select * into application
  from public.applications
  where id = target_application_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'application_not_found';
  end if;

  -- status only reaches 'accepted' when claim_decision_email releases the
  -- decision, so an unreleased acceptance cannot be confirmed early.
  if application.status <> 'accepted' then
    raise exception 'not_accepted';
  end if;

  if not public.is_confirmation_open(application.event_id) then
    raise exception 'confirmation_closed';
  end if;

  if set_application_confirmation.confirmation = 'confirmed'
    and not acknowledged
  then
    raise exception 'logistics_not_acknowledged';
  end if;

  if application.confirmation = set_application_confirmation.confirmation then
    raise exception 'confirmation_unchanged';
  end if;

  update public.applications
  set confirmation = set_application_confirmation.confirmation,
      confirmation_updated_at = now(),
      logistics_acknowledged_at = case
        when set_application_confirmation.confirmation = 'confirmed'
          then coalesce(application.logistics_acknowledged_at, now())
        else application.logistics_acknowledged_at
      end
  where id = application.id
  returning * into application;

  return application;
end;
$$;

-- The browser never writes these columns directly; no grant covers them.
revoke execute on function
  public.set_application_confirmation(uuid, text, boolean)
  from public, anon;
grant execute on function
  public.set_application_confirmation(uuid, text, boolean)
  to authenticated;
