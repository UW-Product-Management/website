-- Organizer-written emails to a chosen set of portal users. Each recipient row
-- is claimed before its email is handed to the provider, so a retried or
-- resumed batch never emails anyone twice. A delivery that fails is stamped
-- failed_at rather than reset, so a bad address is not retried in every batch
-- ahead of everyone else.
-- Only the send-custom-email function (service role) writes here.
create table public.custom_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  mode text not null check (mode in ('local', 'sandbox', 'live')),
  created_by uuid references auth.users (id) on delete set null,
  recipient_count integer not null check (recipient_count > 0),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  -- Claimed but never resolved: the function died between claiming a row and
  -- recording the provider's answer. Those people were not emailed twice, but
  -- neither can they be reported as delivered.
  dropped_count integer not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index custom_email_campaigns_event_id_idx
  on public.custom_email_campaigns (event_id);
create index custom_email_campaigns_created_by_idx
  on public.custom_email_campaigns (created_by);
create index custom_email_campaigns_unfinished_idx
  on public.custom_email_campaigns (event_id, created_at desc)
  where finished_at is null;

create table public.custom_email_recipients (
  campaign_id uuid not null
    references public.custom_email_campaigns (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  claimed_at timestamptz,
  sent_at timestamptz,
  failed_at timestamptz,
  primary key (campaign_id, user_id),
  constraint custom_email_recipients_sent_or_failed
    check (sent_at is null or failed_at is null),
  constraint custom_email_recipients_resolved_only_once_claimed
    check (claimed_at is not null or (sent_at is null and failed_at is null))
);

create index custom_email_recipients_user_id_idx
  on public.custom_email_recipients (user_id);
create index custom_email_recipients_unclaimed_idx
  on public.custom_email_recipients (campaign_id, user_id)
  where claimed_at is null;

alter table public.custom_email_campaigns enable row level security;
alter table public.custom_email_recipients enable row level security;

create policy "Organizers can read custom email campaigns"
  on public.custom_email_campaigns for select to authenticated
  using (public.is_organizer());

create policy "Organizers can read custom email recipients"
  on public.custom_email_recipients for select to authenticated
  using (public.is_organizer());

revoke all on public.custom_email_campaigns, public.custom_email_recipients
  from anon, authenticated;
grant select on public.custom_email_campaigns, public.custom_email_recipients
  to authenticated;
