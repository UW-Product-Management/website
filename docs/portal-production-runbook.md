# Hacker Portal — Production Runbook (Phases 4–7)

Everything in the repo that production needs is already committed: migrations,
the `send-application-received` Edge Function, organizer review (`/portal/admin`),
and branded auth email templates in `supabase/templates/`. The steps below create and configure the hosted
Supabase project. They need credentials and decisions the repo does not have,
so they are run by a person, in order.

## Blockers to settle first (plan §12)

| # | Decision | Why it blocks |
| :--- | :--- | :--- |
| 3 | Final `PROGRAMS` list | Hard-coded in the `applications.program` CHECK constraint; changing it after launch needs a new migration. |
| 9 | Where uwproduct.com is hosted | Needed for build-time env vars and the auth redirect URLs. |
| 10 | Supabase plan (free pauses when idle) | A paused project fails every applicant request. |
| — | SMTP / email provider and sender domain | Built-in Supabase email only reaches org members. Phase 5 assumes Resend. |

## 1. Create and link the project

1. Create a project in the UWPM Supabase org (Canadian region if available).
2. Then:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run   # expect 3 migrations
npx supabase db push
```

Do not pass `--include-seed`; `seed.sql` is local-only.

## 2. Create the real event

Studio → SQL editor:

```sql
insert into public.events (slug, name, applications_open_at, applications_close_at)
values ('prodcon-2026', 'ProdCon 2027', '2026-11-01 00:00-05', '2027-01-15 23:59-05');
```

## 3. Auth configuration (dashboard)

Set these in the dashboard under Authentication → URL Configuration and Email.
Do **not** run `supabase config push` from this repo: `config.toml` carries
local values (`site_url = http://localhost:3000`) that would break production.

- Site URL: `https://uwproduct.com`
- Redirect URLs: `https://uwproduct.com/portal/**`, `https://www.uwproduct.com/portal/**`
- Confirm email: on
- Minimum password length: 8
- Email templates: paste `supabase/templates/confirmation.html` into "Confirm signup" and `recovery.html` into "Reset password", using the subjects from `config.toml`.

## 4. Resend: domain, SMTP (Auth emails) and API key

Supabase Auth emails (confirm signup, reset password) go out over SMTP; the
"application received" email goes through Resend's HTTP API. One Resend account
serves both.

1. Resend → Domains → add `uwproduct.com` (or a subdomain such as
   `mail.uwproduct.com`). Add the SPF, DKIM and (recommended) DMARC DNS records
   Resend shows, and wait until the domain reads **Verified**. Unverified
   domains can only send to your own address.
2. Resend → API Keys → create one key with "Sending access" restricted to that
   domain. This single key is used for both purposes below.
3. Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP:
   - Host `smtp.resend.com`, port `465` (or `587`)
   - Username `resend`, password = the API key
   - Sender email `portal@uwproduct.com`, sender name `UWPM`
4. Raise "emails per hour" (Authentication → Rate Limits). The default of 2 per
   hour applies once custom SMTP is on and will block signups.
5. Send yourself a signup confirmation and a password reset to check
   deliverability (inbox, not spam) before launch.

## 5. Deploy the "application received" function

```bash
npx supabase secrets set RESEND_API_KEY=<key> EMAIL_FROM="UWPM <portal@uwproduct.com>"
npx supabase functions deploy send-application-received
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform.
The function requires a signed-in user's JWT; it emails only that user, only
once their application is `submitted`, and stamps
`applications.confirmation_email_sent_at` so repeat calls send nothing.
Without `RESEND_API_KEY` it falls back to Mailpit, which exists only locally;
`EMAIL_FROM` must use the domain verified in step 4. Check the function's logs
(Edge Functions → `send-application-received` → Logs) if an applicant reports
no email; a `send_failed` response also clears the sent stamp so a later call
retries.

## 6. Organizers (review access)

Organizers are people with a row in `public.organizers`. They must sign up
through the portal first so an `auth.users` row exists. Then, in the SQL editor:

```sql
insert into public.organizers (user_id)
select id from auth.users where email in ('organizer1@uwaterloo.ca', 'organizer2@uwaterloo.ca');
```

They review at `https://uwproduct.com/portal/admin`: filter by status, open an
applicant's answers, choose Accepted / Waitlisted / Not selected, or export a
CSV. Applicants see the result on their dashboard. To revoke access, delete the
row from `public.organizers`. Applicants are **not** emailed when a decision is
recorded (plan §12 #12).

## 7. Frontend environment variables

Set in the hosting provider's build settings (CRA inlines them at build time):

```bash
REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
REACT_APP_PORTAL_EVENT_SLUG=prodcon-2026
```

Never put the secret / `service_role` key in the frontend or in git.

## 8. Acceptance check

On the production URL with a real inbox:

- [ ] Sign up → confirmation email arrives with UWPM branding → link lands on Register signed in
- [ ] Complete and submit the application → "application received" email arrives once
- [ ] Forgot password → reset email → `/portal/update-password` works
- [ ] An organizer opens `/portal/admin`, sees the application, records a decision; the applicant's dashboard shows it; a non-organizer visiting `/portal/admin` is sent to their dashboard
- [ ] Studio shows one `applications` row with `status = submitted` and `confirmation_email_sent_at` set
