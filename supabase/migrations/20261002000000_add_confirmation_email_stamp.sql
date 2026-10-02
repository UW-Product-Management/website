alter table public.applications
  add column confirmation_email_sent_at timestamptz;

comment on column public.applications.confirmation_email_sent_at is
  'Set by the send-application-received function (service role); no browser grant covers it.';
