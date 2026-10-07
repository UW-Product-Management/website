# WEB-19: Vite Migration Investigation

Spike/investigation for migrating build tooling from `react-scripts` (Create
React App, deprecated/unmaintained) to Vite. This document is the
deliverable for WEB-19; it does not change any build tooling itself.

## TL;DR Recommendation

**Defer the migration.** Tackle it only after WEB-6 through WEB-13 land, and
only if a maintainer has a free multi-day block to own it end-to-end. In the
meantime, reduce `npm audit` noise with targeted `package.json` `overrides`
rather than a full rewrite.

Reasoning: the codebase is small enough (81 JS files, 18 test files, 15 CSS
files) that a migration is technically low-to-moderate effort, but almost all
of the 106 reported vulnerabilities live in `react-scripts`' internal
dev/build tooling (webpack, jest-environment-jsdom, workbox-webpack-plugin,
`@pmmmwh/react-refresh-webpack-plugin`, etc.) — none of that code ships to
the production bundle or runs in a browser. The real-world risk reduction
from migrating is small relative to the regression risk of touching every
page's test setup, CI, and the Vercel deploy config, especially for a
volunteer club with high year-over-year turnover and no dedicated infra
owner.

## Current State Audit

| Area               | Current setup                                                                                                                                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build tool         | `react-scripts` 5.0.1 (unejected, no CRACO/webpack overrides)                                                                                                                                                                                                              |
| React              | 18.2, `react-router-dom` 6.x                                                                                                                                                                                                                                               |
| JS / JSX handling  | All 81 source files use `.js` extension with JSX syntax; CRA's Babel parser compiles JSX in `.js` automatically                                                                                                                                                            |
| Test runner        | Jest via `react-scripts test` (CRA's bundled config; no custom `jest` config beyond `resetMocks: false`)                                                                                                                                                                   |
| Lint               | ESLint via `eslint-config-react-app` (fixed to actually run in WEB-11)                                                                                                                                                                                                     |
| Env vars           | `REACT_APP_*` prefix, read via `process.env.REACT_APP_X` (3 vars: `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_PUBLISHABLE_KEY`, `REACT_APP_PORTAL_EVENT_SLUG`), used in `src/context/PortalContext.js` and `src/lib/supabaseClient.js`                                   |
| HTML entry         | `public/index.html` uses CRA's `%PUBLIC_URL%` templating (in Vite, this must move to the project root `./index.html`)                                                                                                                                                      |
| Static assets      | `public/manifest.json`, `pmlogo.ico`, `logo192.png`, etc., referenced via `%PUBLIC_URL%`                                                                                                                                                                                   |
| SVG handling       | All `.svg` imports are plain URL imports (`import x from './x.svg'`); **no** `import { ReactComponent } from './x.svg'` (CRA's SVGR feature) usage anywhere — this is good, it means no extra Vite plugin is required for SVGs                                             |
| CSS                | Plain `.css` files imported directly into components, no CSS Modules, no Sass/Less                                                                                                                                                                                         |
| Deployment         | Vercel, `vercel.json` hardcodes `"framework": "create-react-app"` and `"outputDirectory": "build"`                                                                                                                                                                         |
| CI                 | GitHub Actions `Node.js CI` workflow runs `npm ci && npm run lint && npm test -- --watchAll=false && npm run build` on Node 22.x, plus a separate `database` job for Supabase integration tests                                                                            |
| Known CRA papercut | `src/setupTests.js` has to manually `jest.mock('gsap', ...)` and `jest.mock('gsap/ScrollTrigger', ...)` because CRA's Jest transform chokes on those packages' ESM output — Vitest (Vite-native) handles ESM natively and would likely remove the need for this workaround |

### `npm audit` breakdown

106 total vulnerabilities (4 critical, 81 high, 14 moderate, 7 low) across
1,584 resolved dependencies. Spot-checking the flagged packages shows the
large majority are `react-scripts`' own transitive dev-tooling
(`webpack-dev-server`, `workbox-webpack-plugin`, `terser-webpack-plugin`,
`@pmmmwh/react-refresh-webpack-plugin`, the `jest-environment-jsdom` chain,
`eslint-config-react-app`'s own `@typescript-eslint/*` pins, etc.) — these
never run in a deployed browser, only during local `npm start`/`npm run
build`/`npm test`. A handful of unrelated packages also show up
(`tailwindcss`, `express`/`body-parser`/`qs` likely via the Supabase CLI,
`lodash`, `underscore`) that a Vite migration would **not** fix at all.

## Migration Scope (if/when undertaken)

1. **Routing** — No change needed. `react-router-dom` v6 with `BrowserRouter`
   works identically under Vite; this is framework-agnostic.
2. **Env vars** — Rename all 3 `REACT_APP_*` vars to `VITE_*`, and change the
   2 read-sites from `process.env.REACT_APP_X` to `import.meta.env.VITE_X`.
   Also update: `.env.example`, Vercel project env var dashboard, GitHub
   Actions secrets/env (if any reference these names), and the
   `db:env` npm script that currently does
   `supabase status -o env --override-name api.url=REACT_APP_SUPABASE_URL ...`.
3. **CSS/asset imports** — No change needed for plain CSS or image imports;
   Vite supports both natively with the same import syntax CRA uses. No SVGR
   usage to replace.
4. **JSX in `.js` files** — CRA's Babel setup compiles JSX inside `.js` files
   by default. Vite's default esbuild parser only parses JSX inside `.jsx` or
   `.tsx` files and throws a syntax error on `.js` files containing JSX.
   Because all 81 component/page files currently use `.js`, the team must
   either:
   - Mass-rename all JSX-containing `.js` files to `.jsx`, or
   - Configure `esbuild: { loader: { '.js': 'jsx' } }` in `vite.config.js` to
     allow JSX in `.js` without renaming every file.
5. **`index.html` entry point** — Move `public/index.html` to the project root
   (`./index.html`), as Vite treats the root HTML file as the entry module
   rather than a static asset in `public/`. Strip all `%PUBLIC_URL%/` prefixes
   (Vite serves `public/` at the site root directly, no templating). Add the
   module entry point script (`<script type="module" src="/src/index.js"></script>`)
   before `</body>` instead of CRA's runtime script injection.
6. **Test runner** — Two options:
   - **Vitest** (recommended if migrating): Vite-native, faster, handles ESM
     packages (gsap, swiper) without the manual mocks currently needed.
     Requires swapping `@testing-library/jest-dom` setup imports, and
     verifying all 18 test files' `jest.fn()`/`jest.mock()` calls translate
     to `vi.fn()`/`vi.mock()` (mostly a mechanical rename, `vitest` ships a
     `jest`-compatible globals mode to ease this).
   - **Keep Jest**: possible via `vite-jest` or by running Jest directly
     with `babel-jest`, decoupled from `react-scripts`. Avoids touching test
     files, but keeps the ESM-mocking papercut and doesn't reduce the
     Jest-related slice of the audit vulnerability count.
7. **Build/CI scripts** — `npm run build`/`npm start`/`npm test` script
   _names_ stay the same in `package.json` (just repoint to `vite build`,
   `vite`, `vitest run` under the hood), so the GitHub Actions workflow
   (`build.yml`) needs no structural changes, just confirmation the new
   commands exit with the same semantics.
8. **Vercel config** — Update `vercel.json`: `"framework": "vite"`,
   `"outputDirectory": "dist"` (Vite's default, vs. CRA's `build`).
9. **ESLint** — `eslint-config-react-app` (just wired up correctly in
   WEB-11) is CRA-specific. A Vite project would typically move to
   `eslint-plugin-react`/`eslint-plugin-react-hooks` directly, or
   `@vitejs/plugin-react`'s recommended lint setup. This is a second full
   ESLint reconfiguration on top of WEB-11's fix — worth sequencing
   carefully so the work isn't duplicated/thrown away.

## Risk/Benefit

**Benefits:**

- Meaningfully faster local dev server start and HMR (Vite's native ESM dev
  server vs. webpack-dev-server bundling).
- Removes the two manual ESM mocks in `setupTests.js` if moving to Vitest.
- Shrinks `npm audit`'s dev-tooling-only vulnerability count, which reduces
  noise in Dependabot/security scanning (but does **not** reduce actual
  production runtime risk, since none of those packages ship to users).

**Risks/Costs:**

- Requires resolving JSX syntax handling in all 81 `.js` files (bulk file
  renaming or esbuild config workaround).
- Touches every test file's mocking syntax if moving to Vitest (18 files).
- Touches CI, Vercel config, env var names across local/CI/Vercel dashboards
  simultaneously — a misconfigured env var rename could silently break the
  Supabase-backed portal in production (auth, applications) with no local
  CRA fallback to compare against.
- A second ESLint reconfiguration, right after WEB-11 already fixed the
  first one — risks lint-rule churn/regressions if not sequenced carefully.
- No current team member owns build infra full-time; a partial migration
  left mid-way is worse than the status quo.
- Low urgency: none of the 106 audit findings are known-exploitable in this
  app's actual production attack surface (all dev/build-time-only tooling).

## Recommendation Detail

Given the above, this is **not worth doing as a dedicated migration right
now**. Two lighter-weight alternatives address the stated motivation
(audit noise) with far less risk:

1. Add targeted `overrides` in `package.json` to bump specific vulnerable
   transitive packages (e.g. `nth-check`, `postcss`) to patched versions
   where semver allows, without touching `react-scripts` itself.
2. Periodically re-run `npm audit` after each dependency bump; most CRA
   vulnerability counts fluctuate as `react-scripts`' own pinned versions
   age, independent of anything this team controls.

If the team later decides to proceed anyway (e.g. after WEB-6–WEB-13 land
and someone has a dedicated multi-day window), break it into the following
follow-up issues rather than one large PR:

- **Sub-issue A**: Scaffold Vite config (including JSX-in-`.js` handling or
  `.jsx` file renames) + move `index.html` to the project root + asset path
  fixes, keeping CRA installed in parallel until parity is confirmed first.
- **Sub-issue B**: Migrate test suite to Vitest (or wire up `vite-jest`),
  file by file.
- **Sub-issue C**: Rename env vars (`REACT_APP_*` → `VITE_*`) across code,
  `.env.example`, Vercel dashboard, and `db:env` script, with a
  staging-environment smoke test before touching production env vars.
- **Sub-issue D**: Re-point ESLint config off `eslint-config-react-app` to a
  Vite-appropriate React lint setup, re-triaging any newly surfaced warnings.
- **Sub-issue E**: Update `vercel.json` + CI workflow, verify a full
  preview-deploy end-to-end before merging to `main`.
