# Hacker Portal — Database & Backend Plan

Status: **Proposed** · Branch: `uwpm-portal` · Last updated: 2026-10-01

This document is the implementation plan for replacing the portal wireframe's
`localStorage` state (`src/context/PortalContext.js`) with a real backend:
Supabase Auth + Postgres, developed and tested entirely against a local Supabase
stack running in Docker, and deployed to a hosted Supabase project in
production.

Everything marked **✅** below was executed against a throwaway local stack
(Supabase CLI `2.119.0`, Postgres 17, `@supabase/supabase-js@2.117.2`,
Node 22.14, Docker Desktop 29.8) while writing this plan. The migration,
pgTAP, and integration files in [Appendix A–C](#appendix-a--migration-verified)
are the exact files that were run: **18/18 pgTAP and 3/3 integration tests
pass**. The Jest harness fixes in §8.0 and a CRA production build with
`supabase-js` imported were also verified.

**Not yet executed** (these are designs, to be verified during implementation):
the React code in §7, the Jest page tests in §8.3, the CI workflow in §9, and
every production step in §10.

---

## Table of contents

1. [Architecture](#1-architecture)
2. [What the portal needs to save](#2-what-the-portal-needs-to-save)
3. [Gaps in the wireframe that block a real backend](#3-gaps-in-the-wireframe-that-block-a-real-backend)
4. [Database schema](#4-database-schema)
5. [Security model](#5-security-model)
6. [Local development setup](#6-local-development-setup)
7. [Frontend integration](#7-frontend-integration)
8. [Testing strategy](#8-testing-strategy)
9. [Continuous integration](#9-continuous-integration)
10. [Production (hosted Supabase)](#10-production-hosted-supabase)
11. [Implementation phases & acceptance criteria](#11-implementation-phases--acceptance-criteria)
12. [Open decisions](#12-open-decisions)
13. [Appendices](#appendix-a--migration-verified)

---

## 1. Architecture

```text
┌──────────────────────────┐        HTTPS (supabase-js)        ┌────────────────────────────────┐
│  CRA React SPA (/portal) │ ────────────────────────────────▶ │  Supabase                       │
│  - PortalContext         │   publishable key + user JWT      │  ├─ Auth (GoTrue)  /auth/v1     │
│  - services/portalApi.js │                                   │  ├─ Data API (PostgREST) /rest/v1│
└──────────────────────────┘                                   │  └─ Postgres 17                 │
                                                               │       ├─ RLS policies           │
                                                               │       ├─ column grants          │
                                                               │       └─ submit_application()   │
                                                               └────────────────────────────────┘
Local:      `supabase start` runs every box on the right as Docker containers (+ Mailpit, Studio).
Production: hosted Supabase project; same migrations applied with `supabase db push`.
```

**Key decisions**

- **No custom server.** The site is a static CRA build, so the browser talks to
  Supabase directly. Authorization lives in Postgres (Row Level Security +
  column-level grants + one `security definer` function), which is the only
  place it can live safely when the client is public.
- **Supabase Auth owns passwords and email verification.** Passwords never
  touch our tables.
- **Server-controlled fields** (`user_id`, `status`, `submitted_at`) cannot be
  written by the browser; submission goes through an RPC that validates
  completeness and stamps the time with `now()`.
- **Same migrations everywhere.** `supabase/migrations/*.sql` is the single
  source of truth for local, CI, and production schemas.

---

## 2. What the portal needs to save

Inventory taken from every page under `src/pages/portal/` and
`src/context/PortalContext.js`.

| Page (route) | Field in UI / context | Stored where | Column / mechanism | Validation |
| :--- | :--- | :--- | :--- | :--- |
| `Signup` (`/portal/signup`) | Full name | `profiles` | `full_name` (via signup metadata → trigger) | ≤ 120 chars |
| `Signup` | Email | Supabase Auth | `auth.users.email` | Auth-validated, must be confirmed |
| `Signup` | Password | Supabase Auth only | hashed by Auth, never in `public` | min length 8 (config) |
| `Login` (`/portal/login`) | Email + password | — | `auth.signInWithPassword` | — |
| `ResetPassword` (`/portal/reset-password`) | Email | — | `auth.resetPasswordForEmail` | — |
| `ApplyRegister` (`/portal/apply/register`) | Full name | `profiles` | `full_name` | required at submit |
| `ApplyRegister` | Email | Supabase Auth | read-only (see §3) | — |
| `ApplyRegister` | Program | `applications` | `program` | one of `PROGRAMS` (CHECK) |
| `ApplyRegister` | Year of study | `applications` | `year_of_study` | one of `YEARS` (CHECK) |
| `ApplyQuestions` (`/portal/apply/questions`) | Q1 "product you wish existed" | `applications` | `product_idea` | ≤ 200 chars (CHECK), required at submit |
| `ApplyQuestions` | Q2 "great product team" | `applications` | `great_team` | ≤ 200 chars (CHECK), required at submit |
| `ApplyConsent` (`/portal/apply/consent`) | Media consent checkbox | `applications` | `media_consent` | boolean, default `false` |
| `ApplyConsent` | Dietary restriction | `applications` | `dietary_restriction` | one of `DIETARY_OPTIONS` or `null` |
| `ApplyConsent` | "Please specify" | `applications` | `dietary_details` | ≤ 500 chars |
| `ApplySubmit` (`/portal/apply/submit`) | "I confirm…" checkbox | — | gate on the client; submission itself is the attestation | required by `<input required>` |
| `ApplySubmit` | Submit | `applications` | `status = 'submitted'`, `submitted_at = now()` via `submit_application()` | server-side completeness check |
| `Confirmation`, `ConfirmationEmail`, `Dashboard`, `DashboardDetails` | Read-only summary | read from `profiles` + `applications` | — | — |
| `DashboardSidebar` | Log out | Supabase Auth | `auth.signOut()` | — |

Notes:

- Every "Next" button saves a **draft** to the database (not just to context), so an
  applicant can log out and resume on another device.
- `''` from an unselected `<select>` is written as `null`. `'None'` is a real
  answer and is stored as `'None'`.
- The allowed values for `program`, `year_of_study`, and `dietary_restriction`
  are duplicated between the JS constants and the SQL CHECK constraints. Move
  the JS constants into one module (`src/portal/applicationOptions.js`) and keep
  the pgTAP test that asserts unknown values are rejected. The four-item
  `PROGRAMS` list is a wireframe placeholder — finalise it before the first
  production migration (§12).

---

## 3. Gaps in the wireframe that block a real backend

These must be resolved as part of the integration; each is small.

1. **No "set new password" page.** `ResetPassword` only fakes sending a link.
   Supabase's reset email redirects to a URL in our app where the user enters
   a new password. Add `/portal/update-password` (`UpdatePassword.js`) that calls
   `supabase.auth.updateUser({ password })`. ✅ Verified the recovery link
   redirects to `http://localhost:3000/portal/update-password#access_token=…&type=recovery`.
2. **Signup cannot navigate straight to Register.** With email confirmation on,
   `signUp()` returns `session: null` until the user clicks the link
   (✅ verified). `Signup` must show a "Check your inbox" state; the confirmation
   link lands the user on `/portal/apply/register` already signed in.
   Signing up again with an already-registered email does **not** return an
   error (✅ verified for an unconfirmed address: `error: null`, `session: null`,
   and the confirmation email is re-sent; Supabase obfuscates this to prevent
   account enumeration), so the UI must show the same "check your inbox"
   message either way. Two errors the UI *must* render: `weak_password`
   ("Password should be at least 8 characters.") and the resend throttle
   ("For security purposes, you can only request this after N seconds.") —
   both ✅ observed.
3. **Login needs an "email not confirmed" state.** `signInWithPassword` returns
   `error.code === 'email_not_confirmed'` (✅ verified). Show a message with a
   "Resend confirmation" button (`supabase.auth.resend({ type: 'signup', email })`).
4. **Register lets the user edit their email.** That would silently diverge
   from the login email. Recommended: render it **read-only** from the session.
   (Changing the auth email needs a double-confirmation flow — out of scope.)
5. **Route guards are based on `submittedAt` in `localStorage`.** They must be
   based on the Supabase session plus the fetched application, with a loading
   state while the session resolves (otherwise every protected page flashes a
   redirect on refresh).
6. **Dashboard shows "Completed on" per step** but the wireframe uses
   `submittedAt` for all four. Phase 1 keeps that behaviour (all steps complete
   at submission). Per-step timestamps are an open decision (§12).
7. **Confirmation email is a mock page**, not a real email. Auth emails
   (confirm signup, reset password) are sent by Supabase Auth. A "your
   application was received" email is a separate transactional email and is
   deferred to Phase 5 (§11).

---

## 4. Database schema

Three tables in `public`. Full SQL in [Appendix A](#appendix-a--migration-verified).

```text
auth.users (Supabase-managed)
   │ 1
   │
   ├──── 1  public.profiles        id (PK, FK → auth.users, cascade)
   │                               full_name, created_at, updated_at
   │
   └──── *  public.applications    id (PK)
                                   user_id (FK → auth.users, cascade, default auth.uid())
                                   event_id (FK → events, restrict)
                                   program, year_of_study
                                   product_idea, great_team
                                   media_consent, dietary_restriction, dietary_details
                                   status ('draft' | 'submitted'), submitted_at
                                   created_at, updated_at
                                   UNIQUE (user_id, event_id)
                         * │
                         1 │
                   public.events       id, slug (unique), name,
                                       applications_open_at, applications_close_at
```

**Why each piece exists**

| Element | Reason |
| :--- | :--- |
| `profiles` + `handle_new_user` trigger | `auth.users` isn't exposed to the Data API. The trigger copies `full_name` from `signUp({ options: { data: { full_name } } })` so the profile exists from the first login. |
| `events` | ProdCon is annual. Scoping applications to an event lets next year reuse the schema with a new row instead of a migration, and gives the database an open/close window to enforce. |
| `UNIQUE (user_id, event_id)` | One application per person per ProdCon. |
| `status` + `submitted_at` with a CHECK tying them together | A row can't be "submitted" without a timestamp or vice-versa. `status` is `text` + CHECK (not a Postgres enum) so organizer states like `accepted` / `waitlisted` can be added later with a one-line constraint change. |
| CHECK constraints on option fields & lengths | The 200-character limit and option lists are enforced by the database, not only by `maxLength` in the browser. |
| `updated_at` trigger | Audit/debugging, and lets organizers sort recently-edited drafts. |
| `submit_application(uuid)` | The only way to submit. Validates required fields, event window, and ownership; sets `submitted_at = now()` server-side. |

**Naming:** snake_case in SQL; the service layer maps to the camelCase shapes
the pages already use (`productIdea`, `yearOfStudy`, …).

---

## 5. Security model

The publishable key ships in the JS bundle, so **assume anyone can call the
Data API directly**. Every guarantee below is enforced in Postgres and covered
by a pgTAP test (✅ all verified, see [Appendix B](#appendix-b--pgtap-tests-verified)).

| Guarantee | Mechanism |
| :--- | :--- |
| RLS on every table | `alter table … enable row level security` |
| Users read/update only their own profile | RLS `id = (select auth.uid())` |
| Users read only their own applications | RLS `user_id = (select auth.uid())` |
| Users can't create an application for someone else | `user_id` is not in the INSERT column grant; RLS also checks `user_id = auth.uid()` |
| Users can't self-submit or backdate | `status` and `submitted_at` are not in any INSERT/UPDATE grant |
| Applications can't be started/edited outside the event window | RLS `with check (public.is_event_open(event_id))` |
| Submitted applications are read-only | UPDATE RLS `using (status = 'draft')` — updates match 0 rows |
| Anonymous visitors can't read applications/profiles | No grants to `anon` except `select` on `events` |
| `submit_application` can't be called by `anon` | `revoke execute … from public, anon` |
| Security-definer functions can't be hijacked via `search_path` | `set search_path = ''` + fully qualified names |

Key handling:

- **Frontend:** only the **publishable** key (`sb_publishable_…`) and the API URL.
- **Never in the frontend or git:** the **secret** key (`sb_secret_…`) /
  legacy `service_role` key, DB password, SMTP credentials.
- Organizers reviewing applications use Supabase Studio (dashboard) for now;
  that runs as `postgres` and bypasses RLS. A proper organizer role is an open
  decision (§12).

Why explicit `grant`s instead of relying on Supabase defaults: Supabase's
default privileges grant `anon`/`authenticated` full table access and rely on
RLS alone (✅ verified: a fresh `public` table gets `SELECT, INSERT, UPDATE,
DELETE, TRUNCATE, REFERENCES, TRIGGER` for both roles). RLS can't restrict *columns*, so we `revoke all` and grant only the
columns the browser may write. This also keeps us correct regardless of how
the project's "expose new tables to the Data API" setting is configured.

---

## 6. Local development setup

Prerequisites: Docker Desktop running, Node 22 (`supabase-js` 2.117 declares
`engines.node >= 22`).

### 6.1 One-time repo setup (done once in the implementation PR)

```bash
npm install --save-dev supabase@2.119.0
npm install @supabase/supabase-js@2.117.2
npx supabase init            # creates supabase/config.toml, supabase/.gitignore
```

Edit `supabase/config.toml` so local auth behaves like production:

```toml
[auth]
site_url = "http://localhost:3000"            # CRA dev server; default is 127.0.0.1
additional_redirect_urls = ["http://localhost:3000/**", "http://127.0.0.1:3000/**"]
minimum_password_length = 8

[auth.email]
enable_confirmations = true                   # default is false locally, true on hosted projects
```

Add npm scripts to `package.json`:

```json
{
  "scripts": {
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db",
    "db:env": "supabase status -o env --override-name api.url=REACT_APP_SUPABASE_URL --override-name auth.publishable_key=REACT_APP_SUPABASE_PUBLISHABLE_KEY",
    "test:integration": "node --test \"tests/integration/*.test.mjs\""
  }
}
```

Commit: `supabase/config.toml`, `supabase/migrations/`, `supabase/seed.sql`,
`supabase/tests/`, `tests/integration/`, `.env.example`. `supabase init`
also generates a `supabase/.gitignore` for its local state — commit that too.

`npm run db:env` output (✅ verified):

```bash
REACT_APP_SUPABASE_PUBLISHABLE_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
REACT_APP_SUPABASE_URL="http://127.0.0.1:54321"
```

The local publishable/secret keys are fixed, public demo values — safe to
share for local dev, useless against production.

### 6.2 Daily workflow

```bash
npm run db:start             # first run pulls images (~several minutes); prints URLs and keys
npm run db:env               # copy the two REACT_APP_* lines into .env.local
npm start                    # http://localhost:3000/portal
```

| Service | URL | Use |
| :--- | :--- | :--- |
| API (REST + Auth) | `http://127.0.0.1:54321` | `REACT_APP_SUPABASE_URL` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | `psql`, GUI clients |
| Studio | `http://127.0.0.1:54323` | browse tables, run SQL |
| Mailpit | `http://127.0.0.1:54324` | every email Auth sends locally lands here |

`.env.local` (gitignored already):

```bash
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # from `npm run db:env`
REACT_APP_PORTAL_EVENT_SLUG=prodcon-local
```

`.env.example` (committed) holds the same keys with placeholder values.

### 6.3 Changing the schema

```bash
npx supabase migration new add_something    # creates supabase/migrations/<timestamp>_add_something.sql
# edit the file
npm run db:reset                             # drops local DB, re-applies all migrations + seed.sql
npm run db:test                              # pgTAP suite must stay green
```

Never edit a migration that has already been pushed to production; add a new one.

### 6.4 Seed data

`supabase/seed.sql` inserts a `prodcon-local` event whose window is always open
relative to whenever you last ran `db reset`:

```sql
insert into public.events (slug, name, applications_open_at, applications_close_at)
values (
  'prodcon-local',
  'ProdCon (local)',
  now() - interval '1 day',
  now() + interval '1 year'
);
```
 Test users are **not** seeded in SQL
(inserting into `auth.users` by hand is brittle across Auth versions); create
them through the app or the integration tests.

---

## 7. Frontend integration

### 7.1 New and changed files

| File | Purpose |
| :--- | :--- |
| `src/lib/supabaseClient.js` | `createClient(REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_PUBLISHABLE_KEY)` — the only place the client is created. |
| `src/services/portalApi.js` | All Supabase calls, plus row ↔ form mapping. Pages and context never import `supabase` directly. |
| `src/portal/applicationOptions.js` | `PROGRAMS`, `YEARS`, `DIETARY_OPTIONS` (moved out of the pages). |
| `src/context/PortalContext.js` | Rewritten: holds `session`, `profile`, `application`, `event`, `status: 'loading' \| 'ready'`; drops `localStorage`. Supabase-js persists the session itself. |
| `src/components/portal/RequireAuth.js` | Route guard: loading → spinner, no session → `/portal/login` (remember `from`). |
| `src/pages/portal/UpdatePassword.js` | New page for the reset link (§3.1). |
| `src/App.js` | Add `/portal/update-password`; wrap `/portal/apply/*` and `/portal/dashboard*` in `RequireAuth`. |

### 7.2 `portalApi` surface

```js
signUp({ fullName, email, password })      // options.data.full_name, emailRedirectTo: origin + '/portal/apply/register'
signIn({ email, password })
signOut()
resendConfirmation(email)
requestPasswordReset(email)                 // redirectTo: origin + '/portal/update-password'
updatePassword(password)
getEvent(slug)                              // from REACT_APP_PORTAL_EVENT_SLUG
getProfile()
updateProfile({ fullName })
getMyApplication(eventId)                   // .maybeSingle()
saveApplicationDraft({ applicationId, eventId, fields })  // insert first time, update after
submitApplication(applicationId)            // rpc('submit_application', { target_application_id })
```

`saveApplicationDraft` does **insert-then-update**, not `upsert`: an upsert
would try to `UPDATE event_id`, which isn't in the update grant.

Error messages from `submit_application` are stable identifiers
(`application_incomplete`, `application_already_submitted`,
`applications_closed`, `application_not_found`) that `portalApi` maps to
user-facing copy.

### 7.3 Page-by-page wiring

| Page | Change |
| :--- | :--- |
| `Signup` | `await signUp(...)` → show "Check your inbox" panel; show Auth errors (weak password, rate limit). |
| `Login` | `await signIn(...)`; on `email_not_confirmed` show resend; on success navigate to `/portal/dashboard` if submitted, else first incomplete step. |
| `ResetPassword` | `await requestPasswordReset(email)` then existing "check your inbox" state. |
| `UpdatePassword` (new) | Form → `updatePassword` → navigate to `/portal/dashboard` or `/portal/apply/register`. |
| `ApplyRegister` | Email read-only from session; Next → `updateProfile` + `saveApplicationDraft`. |
| `ApplyQuestions` / `ApplyConsent` | Next → `saveApplicationDraft`; disable the button while saving; show save errors inline. |
| `ApplySubmit` | Submit → `submitApplication`; on success navigate to confirmation. |
| `Confirmation`, `Dashboard`, `DashboardDetails`, `ConfirmationEmail` | Read from context (already-fetched rows) instead of `localStorage`. |
| `DashboardSidebar` | `logOut` → `signOut()`. |

All apply pages redirect to `/portal/dashboard` once `status === 'submitted'`,
and dashboard pages redirect to `/portal/apply/register` while it's a draft
(same rule the wireframe already uses, just driven by the DB row).

---

## 8. Testing strategy

Four layers. Each runs locally with one command.

| Layer | Tool | Needs Docker stack? | Command | What it proves |
| :--- | :--- | :--- | :--- | :--- |
| 1. Database | pgTAP via Supabase CLI | Yes | `npm run db:test` | Constraints, RLS, grants, `submit_application` rules |
| 2. API integration | `node:test` + `supabase-js` + Mailpit API | Yes | `npm run test:integration` | Real signup → email confirm → draft → submit, password reset redirect, anon access |
| 3. Components | Jest + RTL (existing CRA setup) | No | `npm test -- --watchAll=false` | Pages call the right `portalApi` functions, show loading/error/success states, guards redirect |
| 4. Manual QA | Browser + Mailpit | Yes | checklist below | Full flow at mobile/tablet/desktop widths |

### 8.0 Prerequisite: the existing Jest suite is currently broken ⚠️

On `uwpm-portal` today, `npm test -- --watchAll=false` **fails before any test
runs** (✅ reproduced on a clean checkout). This has nothing to do with the
portal but must be fixed first or layer 3 can't exist:

1. `SyntaxError` on `import { ScrollTrigger } from 'gsap/ScrollTrigger'` — CRA's
   Jest doesn't transform ESM in `node_modules`.
2. After fixing (1): `TypeError: _win.matchMedia is not a function` — jsdom has
   no `matchMedia`, and GSAP calls it at import time.
3. After fixing (2): `Cannot find module 'swiper/modules'` — Swiper 10 is
   ESM-only behind an `exports` map that Jest 27 can't resolve.
4. After fixing (3): `App.test.js` fails its first assertion — the hero heading
   now contains `&nbsp;` and adjacent `<span>`s, so the regex
   `/fostering the creative product management community @ uwaterloo/i` no
   longer matches. The test needs updating to the current markup.

Verified fix for 1–3 (`package.json` + `src/setupTests.js`):

```json
"jest": {
  "transformIgnorePatterns": ["node_modules/(?!(gsap|swiper|ssr-window|dom7)/)"],
  "moduleNameMapper": {
    "^swiper/css$": "identity-obj-proxy",
    "^swiper/modules$": "swiper/modules/index.mjs",
    "^swiper/react$": "swiper/swiper-react.mjs",
    "^swiper$": "swiper/swiper.mjs"
  }
}
```

```js
// src/setupTests.js — jsdom has no matchMedia and GSAP's ScrollTrigger reads it on import
window.matchMedia =
  window.matchMedia ||
  ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
```

### 8.1 Layer 1 — pgTAP (database)

Location: `supabase/tests/database/*.test.sql`. Each file runs in a
transaction and rolls back, so it never leaves data behind. Users are simulated
by inserting into `auth.users` and switching role:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<user uuid>","role":"authenticated"}';
```

Because `id` isn't insertable by `authenticated` (only the columns the browser
sends are granted), tests capture generated ids with
`set_config('test.application_id', …, true)` instead of inserting fixed ids.

Mutation check (✅ done): loosening the UPDATE policy so submitted rows are
editable makes test 14 fail; `npm run db:reset` restores green. Do the same
spot-check when adding policies so tests can't pass vacuously.

Cases (all 18 ✅ passing, full file in [Appendix B](#appendix-b--pgtap-tests-verified)):

- signup trigger creates a profile from metadata
- cannot start an application for a closed event (`42501`)
- cannot set `user_id` to someone else (`42501`)
- cannot set `status` directly (`42501`)
- owner can start a draft for an open event
- `user_id` defaults to the signed-in user
- only one application per user per event (`23505`)
- answers over 200 characters are rejected (`23514`)
- unknown programs are rejected (`23514`)
- cannot set `submitted_at` directly (`42501`)
- cannot submit with unanswered questions (`application_incomplete`)
- complete draft can be submitted
- cannot submit twice (`application_already_submitted`)
- submitted applications are read-only (update matches 0 rows)
- users cannot see other users' applications
- users cannot see other users' profiles
- users cannot submit other users' applications (`application_not_found`)
- anonymous visitors cannot read applications (`42501`)

To add when implemented: editing a draft after the event closes is rejected;
`submit_application` after close raises `applications_closed`.

### 8.2 Layer 2 — API integration (Node, no browser)

Location: `tests/integration/portal.test.mjs` — **outside `src/`**, so CRA's
Jest never picks it up and `npm test` stays fast and offline. Uses Node's
built-in test runner (no new dependency).

```bash
npm run db:start
SUPABASE_PUBLISHABLE_KEY=$(npx supabase status -o json | jq -r .PUBLISHABLE_KEY) npm run test:integration
```

Cases (✅ all passing, full file in [Appendix C](#appendix-c--integration-tests-verified)):

- applicant can sign up, is blocked until confirming, confirms via the link in
  Mailpit, lands on `/portal/apply/register`, sees their profile, saves a draft,
  is refused when forging `status`, submits, and can't resubmit
- password reset email links to `/portal/update-password` with `type=recovery`
- anonymous visitors can read events but not applications

Mailpit's HTTP API (`GET /api/v1/search?query=to:<email>`,
`GET /api/v1/message/<ID>`) is how the tests read the confirmation link.
The Auth verify endpoint answers `303` with the `Location` pointing at our
`redirectTo` URL plus `#access_token=…`, so tests assert on the redirect
without a browser.

The tests use a unique email per run (`applicant-<timestamp>@test.local`),
so they are re-runnable without `db reset`. Locally the `email_sent = 2/hour`
rate limit does **not** apply to Mailpit (✅ 9 emails across 3 consecutive
runs, all delivered); it only applies once custom SMTP is configured.

### 8.3 Layer 3 — Jest + React Testing Library

Rules (from `.claude/rules/testing.md`): `screen` queries by role, `MemoryRouter`,
`userEvent`, no snapshots, no comments in tests.

- **Never hit the network from Jest.** `src/setupTests.js` globally mocks
  `./lib/supabaseClient`. Without it, importing the client with no env vars
  throws `supabaseUrl is required.` and takes down `App.test.js`, because
  `App` renders `PortalProvider` (✅ reproduced).
- **Use plain functions in that global mock, not `jest.fn()`.** CRA enables
  `resetMocks: true`, which wipes `jest.fn().mockResolvedValue(...)`
  implementations before every test. A provider that awaits `getSession()` on
  mount then crashes with `Cannot read properties of undefined (reading 'then')`
  (✅ reproduced). This version works (✅ verified with a provider calling
  `getSession()` in `useEffect`):

  ```js
  jest.mock('./lib/supabaseClient', () => ({
    supabase: {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
    },
  }));
  ```

  For the same reason, per-test `portalApi` mocks must set their return values
  inside each test or `beforeEach`, not once at module scope.
- Page tests `jest.mock('../../services/portalApi')` and assert behaviour:

| Test file | Cases |
| :--- | :--- |
| `Signup.test.js` | submits name/email/password to `signUp`; shows "check your inbox"; shows Auth error text |
| `Login.test.js` | routes submitted applicants to dashboard and drafts to their next step; shows resend on `email_not_confirmed` |
| `ResetPassword.test.js` / `UpdatePassword.test.js` | calls the right API; success and error states |
| `ApplyRegister.test.js` | email is read-only; Next saves profile + draft then navigates |
| `ApplyQuestions.test.js` | 200-char counter; Next saves; Back navigates without saving |
| `ApplySubmit.test.js` | Submit disabled until confirm checked; maps `application_incomplete` to copy |
| `RequireAuth.test.js` | spinner while loading; redirects when signed out; renders children when signed in |
| `portalApi.test.js` | row ↔ form mapping (`''` → `null`, camelCase ↔ snake_case), insert-vs-update choice |

### 8.4 Layer 4 — Manual QA checklist

With `npm run db:start` and `npm start`:

- [ ] Sign up → "check your inbox" → open Mailpit (`:54324`) → click link → land on Register signed in
- [ ] Refresh mid-application → data still there; log out/in → resumes at the right step
- [ ] Try to submit with a blank answer (remove `required` in devtools) → friendly error, nothing submitted
- [ ] Submit → Confirmation → Dashboard → Details show DB values and server timestamp
- [ ] After submit, visiting `/portal/apply/questions` redirects to dashboard
- [ ] Forgot password → Mailpit link → `/portal/update-password` → new password works
- [ ] Studio (`:54323`) shows one `applications` row with `status = submitted`
- [ ] All of the above at < 768px, 768–1023px, ≥ 1024px; no console errors

---

## 9. Continuous integration

`.github/workflows/build.yml` currently tests Node `14.x, 16.x, 18.x` and only
runs build + lint. Changes:

1. **Node matrix → `22.x`** (supabase-js 2.117 requires `>= 22`; 14/16/18 are
   end-of-life).
2. Add `npm test -- --watchAll=false` (Jest, layer 3).
3. Add a `database` job:

```yaml
  database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22.x, cache: npm }
      - run: npm ci
      - run: npx supabase start -x studio,imgproxy,storage-api,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta
      - run: npx supabase test db
      - run: |
          export SUPABASE_PUBLISHABLE_KEY=$(npx supabase status -o json | jq -r .PUBLISHABLE_KEY)
          npm run test:integration
```

(`jq` is preinstalled on GitHub's Ubuntu runners. The `-x` list is the exact
minimal set used to verify this plan: Postgres, Auth, PostgREST, Kong, and
Mailpit are all the portal needs. Locally you can use the same flag if you
don't want Studio.)

---

## 10. Production (hosted Supabase)

### 10.1 Create & link the project

1. Create a project in the UWPM Supabase org. Pick a Canadian region if
   available (applicant data is Canadian students' PII).
2. Locally:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push --dry-run     # review
   npx supabase db push               # apply supabase/migrations/*
   ```
   `seed.sql` is **not** pushed (only with `--include-seed`); don't.
3. Insert the real event in the Studio SQL editor:
   ```sql
   insert into public.events (slug, name, applications_open_at, applications_close_at)
   values ('prodcon-2027', 'ProdCon 2027', '2026-11-01 00:00-05', '2027-01-15 23:59-05');
   ```

### 10.2 Auth configuration

Either set these in the dashboard (Authentication → URL Configuration / Email)
or keep them in `config.toml` and run `npx supabase config diff` →
`npx supabase config push`:

- Site URL: `https://uwaterloopm.com`
- Redirect URLs: `https://uwaterloopm.com/portal/**` (+ `https://www.uwaterloopm.com/portal/**`, + preview-deploy URLs if the host has them)
- Confirm email: **on** (hosted default)
- Minimum password length: 8

### 10.3 Email delivery (required before launch)

Per Supabase's docs (confirm the current terms before launch), the built-in
email sender is for testing only: it is heavily rate-limited and only
delivers to addresses of members of the Supabase org.
Applicants won't receive confirmation or reset emails until **custom SMTP**
is configured (e.g. Resend, Postmark, AWS SES) under
Authentication → Emails → SMTP Settings, using a sender on a domain we
control (e.g. `portal@uwaterloopm.com`, with SPF/DKIM set up). After enabling
SMTP, raise the "emails per hour" rate limit to fit launch-day volume.

Customize the confirm-signup and reset-password templates with UWPM branding.
To preview them locally, put them in `supabase/templates/` and reference them
from `config.toml` (`[auth.email.template.confirmation] content_path = …`);
they will render in Mailpit.

### 10.4 Frontend environment variables

CRA inlines `REACT_APP_*` at **build time**, so set them in the hosting
provider's build settings (not at runtime):

```bash
REACT_APP_SUPABASE_URL=https://<project-ref>.supabase.co
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
REACT_APP_PORTAL_EVENT_SLUG=prodcon-2027
```

The hosting provider isn't recorded in the repo — confirm where
uwaterloopm.com is deployed (§12).

### 10.5 Operational notes

- **Free-plan projects pause after a period of inactivity.** Check the current
  plan terms; a paused project means applicants hit errors. Either use a paid
  plan during the application window or make sure the project gets regular
  traffic, and check status before launch.
- **Backups:** confirm what the plan includes; at minimum export
  `applications` to CSV from Studio after the window closes.
- **Data retention:** decide how long applicant data (incl. dietary info) is
  kept after the event, and delete or anonymize old cycles.
- Optional: a second "staging" Supabase project to rehearse `db push` before
  production.

---

## 11. Implementation phases & acceptance criteria

Each phase is a separate PR and must leave `npm run lint`, `npm test`,
`npm run build` green.

| Phase | Scope | Done when |
| :--- | :--- | :--- |
| **0. Fix test harness** | §8.0 Jest config, `matchMedia` stub, update stale `App.test.js`; CI Node → 22 + run Jest | `npm test -- --watchAll=false` passes on a clean checkout and in CI |
| **1. Local Supabase + schema** | `supabase` devDep, `config.toml` edits, migration (Appendix A), `seed.sql`, pgTAP tests (Appendix B), npm scripts, `.env.example`, README section | `npm run db:reset && npm run db:test` → 18/18 pass on a fresh machine |
| **2. Auth wiring** | `supabaseClient`, `portalApi` auth functions, Signup/Login/Reset/UpdatePassword, `RequireAuth`, PortalContext session handling, Jest tests | Sign-up → Mailpit confirm → login works in the browser; Jest page tests pass |
| **3. Application persistence** | `portalApi` application functions, wizard saves drafts, submit via RPC, dashboard reads DB; remove `localStorage`; integration tests (Appendix C); CI `database` job | Manual QA checklist §8.4 passes; `npm run test:integration` passes locally and in CI |
| **4. Production** | Create project, `db push`, auth URLs, custom SMTP, templates, host env vars, real event row | End-to-end signup + submit on the production URL with a real inbox |
| **5. (Optional) Confirmation email** | Edge Function triggered after submit (or Database Webhook on `applications` update) that sends the "application received" email via the SMTP provider's API | Email arrives locally (Mailpit / provider sandbox) and in prod; covered by an integration test |

---

## 12. Open decisions

| # | Decision | Recommendation |
| :--- | :--- | :--- |
| 1 | Require email confirmation? | **Yes** (prevents fake/typo emails; matches hosted default). Plan assumes yes. |
| 2 | Scope applications per event cycle (`events` table)? | **Yes** — cheap now, avoids a data migration next year. Alternative: drop `events`, one application per user forever. |
| 3 | Final `PROGRAMS` list (currently 4 placeholders) and whether to add "Other" | Needs organizer input before Phase 1 ships to prod. |
| 4 | Email editable on Register? | **Read-only.** |
| 5 | Per-step "Completed on" timestamps on Dashboard? | **Not in Phase 1** (show submission date for all, as today). Add `*_completed_at` columns later if wanted. |
| 6 | How do organizers review/accept applications? | Studio + CSV export for this cycle. Later: `organizers` table + RLS policy + admin page, and add `accepted`/`waitlisted`/`rejected` to `status`. |
| 7 | Can applicants edit after submitting? | **No** (enforced). Change = relax the UPDATE policy until the close date. |
| 8 | "Application received" email | Defer to Phase 5; the Auth confirmation email covers launch. |
| 9 | Where is uwaterloopm.com hosted? | Needed for §10.4 and redirect URLs. |
| 10 | Supabase plan (free vs Pro) during the application window | See §10.5 (pausing, backups). |
| 11 | Data retention period for applicant data | Organizer/exec decision. |

---

## Appendix A — Migration (✅ verified)

`supabase/migrations/20261001000000_create_portal_schema.sql`

```sql
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
```

## Appendix B — pgTAP tests (✅ verified)

`supabase/tests/database/applications.test.sql`

```sql
begin;
select plan(18);

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'alex@test.local', '{"full_name":"Alex Chen"}'),
  ('22222222-2222-2222-2222-222222222222', 'blair@test.local', '{"full_name":"Blair Ng"}');

insert into public.events (id, slug, name, applications_open_at, applications_close_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'open', 'Open', now() - interval '1 day', now() + interval '1 day'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'closed', 'Closed', now() - interval '2 days', now() - interval '1 day');

select is(
  (select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Alex Chen',
  'signup creates a profile from user metadata'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ insert into public.applications (event_id) values ('aaaaaaaa-0000-0000-0000-000000000002') $$,
  '42501', null,
  'cannot start an application for a closed event'
);

select throws_ok(
  $$ insert into public.applications (event_id, user_id)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null,
  'cannot set user_id to someone else'
);

select throws_ok(
  $$ insert into public.applications (event_id, status)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'submitted') $$,
  '42501', null,
  'cannot set status directly'
);

select lives_ok(
  $$ insert into public.applications (event_id, program, year_of_study)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'Business', '2nd year') $$,
  'owner can start a draft for an open event'
);

do $$ begin perform set_config('test.application_id', (select id::text from public.applications), true); end $$;

select is(
  (select user_id from public.applications where id = current_setting('test.application_id')::uuid),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'user_id defaults to the signed-in user'
);

select throws_ok(
  $$ insert into public.applications (event_id) values ('aaaaaaaa-0000-0000-0000-000000000001') $$,
  '23505', null,
  'only one application per user per event'
);

select throws_ok(
  $$ update public.applications set product_idea = repeat('x', 201) $$,
  '23514', null,
  'answers over 200 characters are rejected'
);

select throws_ok(
  $$ update public.applications set program = 'Underwater Basket Weaving' $$,
  '23514', null,
  'unknown programs are rejected'
);

select throws_ok(
  $$ update public.applications set submitted_at = now() $$,
  '42501', null,
  'cannot set submitted_at directly'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_incomplete',
  'cannot submit with unanswered questions'
);

update public.applications
set product_idea = 'A campus food-waste tracker', great_team = 'Trust and curiosity'
where id = current_setting('test.application_id')::uuid;

select is(
  (public.submit_application(current_setting('test.application_id')::uuid)).status,
  'submitted',
  'complete draft can be submitted'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_already_submitted',
  'cannot submit twice'
);

select is_empty(
  $$ update public.applications set program = 'Engineering' returning id $$,
  'submitted applications are read-only'
);

set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is_empty(
  $$ select id from public.applications $$,
  'users cannot see other users'' applications'
);

select is_empty(
  $$ select id from public.profiles where id = '11111111-1111-1111-1111-111111111111' $$,
  'users cannot see other users'' profiles'
);

select throws_ok(
  $$ select public.submit_application(current_setting('test.application_id')::uuid) $$,
  'P0001', 'application_not_found',
  'users cannot submit other users'' applications'
);

set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select id from public.applications $$,
  '42501', null,
  'anonymous visitors cannot read applications'
);

select * from finish();
rollback;
```

## Appendix C — Integration tests (✅ verified)

`tests/integration/portal.test.mjs`

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
const SITE_URL = 'http://localhost:3000';

const newClient = () =>
  createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function waitForEmail(to, subjectPattern) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const res = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`,
    );
    const { messages } = await res.json();
    const match = messages.find((m) => subjectPattern.test(m.Subject));
    if (match) {
      const full = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
      return full.json();
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No email to ${to} matching ${subjectPattern}`);
}

const firstLink = (message) =>
  message.Text.match(/https?:\/\/\S+\/auth\/v1\/verify\S+/)[0].replace(
    /&amp;/g,
    '&',
  );

before(() => assert.ok(PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY is required'));

test('applicant can sign up, confirm, apply, and submit', async () => {
  const email = `applicant-${Date.now()}@test.local`;
  const password = 'correct-horse-battery';
  const supabase = newClient();

  const signUp = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Alex Chen' },
      emailRedirectTo: `${SITE_URL}/portal/apply/register`,
    },
  });
  assert.equal(signUp.error, null);
  assert.equal(signUp.data.session, null);

  const unconfirmed = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(unconfirmed.error?.code, 'email_not_confirmed');

  const confirmEmail = await waitForEmail(email, /confirm/i);
  const verify = await fetch(firstLink(confirmEmail), { redirect: 'manual' });
  assert.equal(verify.status, 303);
  assert.match(
    verify.headers.get('location'),
    /^http:\/\/localhost:3000\/portal\/apply\/register#access_token=/,
  );

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(signIn.error, null);

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .single();
  assert.equal(profile.full_name, 'Alex Chen');

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('slug', 'prodcon-local')
    .single();

  const draft = await supabase
    .from('applications')
    .insert({ event_id: event.id, program: 'Business', year_of_study: '2nd year' })
    .select()
    .single();
  assert.equal(draft.error, null);
  assert.equal(draft.data.status, 'draft');

  const answers = await supabase
    .from('applications')
    .update({ product_idea: 'Idea', great_team: 'Trust' })
    .eq('id', draft.data.id)
    .select()
    .single();
  assert.equal(answers.error, null);

  const forged = await supabase
    .from('applications')
    .update({ status: 'submitted' })
    .eq('id', draft.data.id);
  assert.equal(forged.error?.code, '42501');

  const submitted = await supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(submitted.error, null);
  assert.equal(submitted.data.status, 'submitted');
  assert.ok(submitted.data.submitted_at);

  const resubmit = await supabase.rpc('submit_application', {
    target_application_id: draft.data.id,
  });
  assert.equal(resubmit.error?.message, 'application_already_submitted');
});

test('password reset email links back to the update-password page', async () => {
  const email = `reset-${Date.now()}@test.local`;
  const supabase = newClient();
  await supabase.auth.signUp({ email, password: 'correct-horse-battery' });

  const reset = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/portal/update-password`,
  });
  assert.equal(reset.error, null);

  const resetEmail = await waitForEmail(email, /reset/i);
  const verify = await fetch(firstLink(resetEmail), { redirect: 'manual' });
  assert.match(
    verify.headers.get('location'),
    /^http:\/\/localhost:3000\/portal\/update-password#access_token=.*type=recovery/,
  );
});

test('anonymous visitors can read events but not applications', async () => {
  const supabase = newClient();
  const events = await supabase.from('events').select('slug');
  assert.equal(events.error, null);
  assert.ok(events.data.some((e) => e.slug === 'prodcon-local'));

  const applications = await supabase.from('applications').select('id');
  assert.equal(applications.error?.code, '42501');
});
```

## Appendix D — Verified versions & facts

| Item | Value |
| :--- | :--- |
| Supabase CLI | `2.119.0` (npm `supabase`) |
| `@supabase/supabase-js` | `2.117.2`, `engines.node >= 22` |
| Local Postgres | 17 (`[db] major_version = 17`) |
| Local ports | API 54321 · DB 54322 · Studio 54323 · Mailpit 54324 |
| Local email server config section | `[local_smtp]` (older CLIs called it `[inbucket]`) |
| Local defaults we override | `site_url = http://127.0.0.1:3000`, `enable_confirmations = false`, `minimum_password_length = 6` |
| supabase-js under CRA 5 | `npm run build` succeeds with the client imported |
| Jest on `uwpm-portal` | broken before this work (§8.0) |

## Appendix E — Troubleshooting

| Symptom | Cause / fix |
| :--- | :--- |
| `supabaseUrl is required.` in Jest | Client imported without env; ensure `setupTests.js` mocks `./lib/supabaseClient`. |
| `supabaseUrl is required.` in the browser | `.env.local` missing or dev server not restarted after editing it (CRA reads env at startup). |
| Confirmation link redirects to `127.0.0.1:3000` or "redirect URL not allowed" | `site_url` / `additional_redirect_urls` in `config.toml`; restart with `npm run db:stop && npm run db:start`. |
| `permission denied for table applications` (`42501`) from the app | Writing a column that isn't granted (e.g. `status`, `event_id` on update) — use the RPC / insert path. |
| `new row violates row-level security policy` | Event window closed, or not signed in. Check the `events` row and the session. |
| Update "succeeds" but nothing changed | Application already submitted (UPDATE policy matches 0 rows). |
| `node --test tests/integration/` → `Cannot find module …/tests/integration` | Node 22 treats a bare directory as a module path; pass the glob `"tests/integration/*.test.mjs"` (as in the npm script). |
| pgTAP `permission denied for table applications` when inserting test rows with a fixed `id` | Expected — `id` isn't granted to `authenticated`. Let Postgres generate it and capture it with `set_config`. |
| `supabase start` hangs/fails pulling images | Docker Desktop not running or no registry access; `docker pull supabase/postgres:<tag>` to diagnose. |
| Port already in use | Another Supabase project is running: `npx supabase stop --project-id <other>` or change ports in `config.toml`. |
