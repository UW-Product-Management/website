# Hacker Portal — Production Runbook (Phase 4 & 5)

Everything in the repo that production needs is already committed: migrations,
the `send-application-received` Edge Function, and branded auth email templates
in `supabase/templates/`. The steps below create and configure the hosted
Supabase project. They need credentials and decisions the repo does not have,
so they are run by a person, in order.

## Blockers to settle first (plan §12)

| # | Decision | Why it blocks |
| :--- | :--- | :--- |
| 3 | Final `PROGRAMS` list | Hard-coded in the `applications.program` CHECK constraint; changing it after launch needs a new migration. |
| 9 | Where uwaterloopm.com is hosted | Needed for build-time env vars and the auth redirect URLs. |
| 10 | Supabase plan (free pauses when idle) | A paused project fails every applicant request. |
| — | SMTP / email provider and sender domain | Built-in Supabase email only reaches org members. Phase 5 assumes Resend. |

## 1. Create and link the project

1. Create a project in the UWPM Supabase org (Canadian region if available).
2. Then:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run   # expect 2 migrations
npx supabase db push
```

Do not pass `--include-seed`; `seed.sql` is local-only.

## 2. Create the real event

Studio → SQL editor:

```sql
insert into public.events (slug, name, applications_open_at, applications_close_at)
values ('prodcon-2027', 'ProdCon 2027', '2026-11-01 00:00-05', '2027-01-15 23:59-05');
```

## 3. Auth configuration (dashboard)

Set these in the dashboard under Authentication → URL Configuration and Email.
Do **not** run `supabase config push` from this repo: `config.toml` carries
local values (`site_url = http://localhost:3000`) that would break production.

- Site URL: `https://uwaterloopm.com`
- Redirect URLs: `https://uwaterloopm.com/portal/**`, `https://www.uwaterloopm.com/portal/**`
- Confirm email: on
- Minimum password length: 8
- Email templates: paste `supabase/templates/confirmation.html` into "Confirm signup" and `recovery.html` into "Reset password", using the subjects from `config.toml`.

## 4. Custom SMTP (Auth emails)

Authentication → Emails → SMTP Settings, with a sender on a domain you control
(e.g. `portal@uwaterloopm.com`, SPF and DKIM configured). Then raise the
"emails per hour" rate limit to fit launch-day volume.

## 5. Deploy the "application received" function

```bash
npx supabase secrets set RESEND_API_KEY=<key> EMAIL_FROM="UWPM <portal@uwaterloopm.com>"
npx supabase functions deploy send-application-received
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.
The function requires a signed-in user's JWT; it emails only that user, only
once their application is `submitted`, and stamps
`applications.confirmation_email_sent_at` so repeat calls send nothing.
Without `RESEND_API_KEY` it falls back to Mailpit, which exists only locally.

## 6. Frontend environment variables

Set in the hosting provider's build settings (CRA inlines them at build time):

```bash
REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
REACT_APP_PORTAL_EVENT_SLUG=prodcon-2027
```

Never put the secret / `service_role` key in the frontend or in git.

## 7. Acceptance check

On the production URL with a real inbox:

- [ ] Sign up → confirmation email arrives with UWPM branding → link lands on Register signed in
- [ ] Complete and submit the application → "application received" email arrives once
- [ ] Forgot password → reset email → `/portal/update-password` works
- [ ] Studio shows one `applications` row with `status = submitted` and `confirmation_email_sent_at` set
