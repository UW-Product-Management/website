# Pull Request Guidelines & Review Standards

This rule governs pull request quality, description standards, visual proof requirements, and review etiquette for the UWPM Website.

---

## 1. High Standard for Pull Requests

Every pull request submitted to this repository represents the UWPM brand and engineering bar. PRs must be self-contained, well-documented, and thoroughly verified before requesting review.

---

## 2. PR Title Convention

Title every PR with its ticket ID: `WEB-<n>: <Imperative summary>`, usually matching the ticket title.

*Example:* `WEB-20: Increase footer text weight and size`

- The PR's branch is `WEB-<n>/<short-kebab-description>` and its commits are `type(WEB-<n>): imperative subject` (see `commit-policy.md`).
- Link the ticket in the PR description (`WEB-<n>` is issue `#<n>`).
- When squash-merging, edit the squash commit message to the `type(WEB-<n>): subject` format, since GitHub defaults it to the PR title.
- Only PRs with no ticket (rare repo maintenance) use a plain Conventional Commits title such as `chore: update github actions versions`.

---

## 3. Required PR Structure

Every PR description must follow the project template (`.github/pull-request-template.md`) and include:

### 1. Summary & Motivation
Briefly explain the goal of the change and the user/visitor problem it solves.

### 2. Detailed Changes
Bullet list of specific files, components, or styles modified, added, or removed.

### 3. Visual Proof (MANDATORY for UI changes)
For **any** visual, layout, or CSS modification, you **MUST** attach visual proof:
- **Desktop screenshot/recording** (viewport >= 1200px)
- **Mobile screenshot/recording** (viewport <= 480px, e.g. iPhone 14 / Pixel)
- Demonstrations of interactive states (hover effects, modal open/close, carousel scrolling)

### 4. Verification Evidence
Detail the manual verification steps performed and confirm automated checks passed:
- [x] `npm run lint` passes with 0 errors
- [x] `npm test -- --watchAll=false` passes
- [x] `npm run build` succeeds without bundle errors

---

## 4. Pre-PR Checklist

Before opening or requesting review on a PR:
- [ ] Responsive behavior tested on mobile, tablet, and desktop viewports
- [ ] No console errors or uncaught warnings in developer tools
- [ ] No dead code, debug logs (`console.log`), or commented-out code blocks
- [ ] CSS class names are scoped/clean and do not clash globally
- [ ] Assets are compressed and placed in `src/images/` or `public/`
- [ ] Code formatted with `npm run format-code`
