# UW Product Management Website

Welcome to the official website repository for the University of Waterloo Product Management Club ([uwaterloopm.com](https://uwaterloopm.com)).

---

## 🚀 Getting Started

Follow these steps to set up your local development environment:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/UW-Product-Management/website.git
   cd website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🛠️ Tech Stack & Libraries

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | React 18 | Single Page Application UI |
| **Routing** | React Router v6 | Page routing & URL management |
| **UI Components** | React-Bootstrap & Material UI (`@mui/material`) | Base layout and UI elements |
| **Animations** | GSAP 3 (`ScrollTrigger`) & Swiper | Scroll-triggered animations and carousels |
| **Backend & Database** | Supabase (Postgres 17 + GoTrue Auth) | Hacker Portal database, RLS policies, and authentication |
| **Testing** | Jest, React Testing Library & pgTAP | Unit, component, and database tests |
| **Code Quality** | ESLint & Prettier | Code linting and style formatting |

---

## 💻 Core Commands

| Command | Description |
| :--- | :--- |
| `npm start` | Starts the local development server at `localhost:3000` |
| `npm run build` | Builds the optimized production bundle in `build/` |
| `npm test` | Launches the test runner in interactive watch mode |
| `npm test -- --watchAll=false` | Runs the test suite once (CI mode) |
| `npm run lint` | Runs ESLint and Prettier checks on `src/` |
| `npm run format-code` | Auto-formats code with Prettier |
| `npm run fix-code` | Automatically fixes autofixable ESLint issues |
| `npm run db:start` | Starts the local Supabase stack in Docker (Postgres, Auth, Studio, Mailpit) |
| `npm run db:stop` | Stops the local Supabase Docker containers |
| `npm run db:reset` | Resets the local database, re-applies migrations, and loads `seed.sql` |
| `npm run db:test` | Runs pgTAP database security & constraint tests |
| `npm run db:env` | Outputs local Supabase environment variables for `.env.local` |
| `npm run test:integration` | Runs end-to-end integration tests against the local Supabase stack |

---

## 🗄️ Local Database Workflow (Hacker Portal)

The Hacker Portal uses Supabase (Postgres 17, GoTrue Auth, and PostgREST) running locally in Docker for development and testing.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running.
- Node.js 22+.

### 1. Start the Database
Start all local Supabase containers:
```bash
npm run db:start
```
> Note: The first run downloads the required Docker images (~1-2 minutes).

Once running, the following local services are available:
- **API URL (REST + Auth):** `http://127.0.0.1:54321`
- **Postgres Database:** `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Supabase Studio:** `http://127.0.0.1:54323` (web dashboard to inspect tables and run SQL)
- **Mailpit:** `http://127.0.0.1:54324` (inbox capturing all local auth confirmation and password reset emails)

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` (or run `npm run db:env` to print local keys):
```bash
cp .env.example .env.local
```
Update `.env.local` with the values printed by `npm run db:env`:
```bash
REACT_APP_SUPABASE_URL=http://127.0.0.1:54321
REACT_APP_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
REACT_APP_PORTAL_EVENT_SLUG=prodcon-local
```

### 3. Reset and Run Tests
To reset the database, re-run all migrations, and populate `seed.sql`:
```bash
npm run db:reset
```

To run the pgTAP database security and constraint test suite:
```bash
npm run db:test
```

### 4. Stop the Database
When finished, stop the local containers:
```bash
npm run db:stop
```

---

## 📋 GitHub & Development Workflow

### 1. Creating Issues
When planning tasks, features, or bugs, create an issue using the [Issue Template](.github/issue-template.md):
- **Summary:** Clear overview of what needs to be built or fixed.
- **Story Point Estimate:** Fibonacci sizing for sprint planning:
  - `1 pt`: Minor style/text tweak
  - `2 pts`: Small component adjustment or bug fix
  - `3 pts`: Standard feature or new component
  - `5 pts`: Complex feature or full section
  - `8 pts`: Multi-component or architectural change
- **Acceptance Criteria:** Concrete, testable checklist for completion.
- **Development Notes:** Implementation details, Figma links, or affected components.
- **Testing Notes:** Verification scenarios, test data, and responsive viewport checks.

### 2. Ticket IDs
Every issue is automatically titled `WEB-<number>: <title>`, where `<number>` is its GitHub issue number (e.g. issue #20 is `WEB-20`). Use that ticket ID in your branch, commits, and PR title so work can be traced back to its ticket.

| What | Format | Example |
| :--- | :--- | :--- |
| **Branch** | `WEB-<n>/<short-kebab-description>` | `WEB-20/footer-text-size` |
| **Commit** | `type(WEB-<n>): imperative subject` | `style(WEB-20): increase footer text weight and size` |
| **PR title** | `WEB-<n>: Imperative summary` | `WEB-20: Increase footer text weight and size` |

### 3. Branching & Commits
- Branch from `main` (or the active development branch) using the ticket ID: `WEB-<n>/<short-kebab-description>`.
- Follow the **Conventional Commits** format with the ticket ID as the scope (`type(WEB-<n>): imperative subject`):
  - `feat(WEB-21): restore interactive hero bloom effect`
  - `fix(WEB-15): correct duplicated polaroid captions in what we do`
  - `style(WEB-20): increase footer text weight and size`
- Allowed types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`, `perf`.
- Subject: lowercase first letter, imperative mood, no trailing period, max 100 characters for the whole line.
- Rare changes with no ticket (e.g. small repo maintenance) drop the scope: `chore: update github actions versions`. When in doubt, create a ticket first.

### 4. Pull Requests
- Title the PR `WEB-<n>: Imperative summary`, usually the ticket title (e.g. `WEB-20: Increase footer text weight and size`).
- Open a PR using the [Pull Request Template](.github/pull-request-template.md).
- Link the corresponding ticket (`WEB-<n>` → `#<n>`).
- When squash-merging, edit the squash commit message to the `type(WEB-<n>): subject` format, since GitHub defaults it to the PR title.
- Provide verification steps and visual proof (screenshots or screen recordings) across responsive viewports:
  - **Desktop:** `> 1024px`
  - **Tablet:** `768px – 1024px`
  - **Mobile:** `< 768px`
- Complete the self-review checklist before requesting review.

For more details on team processes, check our [GitHub Process Guide](https://www.notion.so/uwpm/GitHub-Process-e9d8c21b4d7d463f851803cce46dfff4).

---

## 💬 Community & Support

Have questions or need assistance? Reach out in the Discord!

<img src="https://media.tenor.com/e-LsbnNHQ5cAAAAd/catjam-cat-dancing.gif" alt="Dancing Cat" width="180">
