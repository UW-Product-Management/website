# Commit Policy & End-of-Task Requirements

This rule strictly governs commit and git behaviors when working on the UWPM Website repository.

---

## 1. Absolute Prohibition on Autonomous Commits

- **DO NOT commit anything unless explicitly instructed by the user.**
- Under NO circumstances should you execute `git commit`, create commits, push to remotes, or open PRs unless the user provides an explicit directive such as:
  - *"commit this"*
  - *"make the commit"*
  - *"go ahead and commit"*
- Even if a prompt implies completion or a test passes, **PAUSE** and do not execute any commit command. Leave git staging and working tree state intact for user inspection.

---

## 2. Mandatory End-of-Task Commit Message

At the completion of **ANY** coding, styling, refactoring, or configuration task, you **MUST** provide a recommended commit message formatted specifically for this repository:

### Ticket IDs
Every issue is titled `WEB-<n>: <title>`, where `<n>` is its GitHub issue number (issue #20 is `WEB-20`). Branches, commits, and PR titles all carry the ticket ID:

| What | Format | Example |
| :--- | :--- | :--- |
| **Branch** | `WEB-<n>/<short-kebab-description>` | `WEB-20/footer-text-size` |
| **Commit** | `type(WEB-<n>): imperative subject` | `style(WEB-20): increase footer text weight and size` |
| **PR title** | `WEB-<n>: Imperative summary` | `WEB-20: Increase footer text weight and size` |

- Take the ticket ID from the current branch name or the user's request. If neither makes it clear, ask for it rather than guessing.
- Only changes with no ticket (rare repo maintenance) drop the scope and use `type: subject` for both the commit and the PR title.

### Conventional Commits Format
Follow Conventional Commits standard strictly, with the ticket ID as the scope:
- **Format:** `type(WEB-<n>): imperative subject`
  - Example: `feat(WEB-21): restore interactive hero bloom effect`
  - Example: `fix(WEB-15): correct duplicated polaroid captions in what we do`
  - Example: `refactor(WEB-16): consolidate club values content into shared data`
  - Example: `style(WEB-20): increase footer text weight and size`
  - Example: `chore(WEB-14): remove unused npm dependencies`
- **Allowed types (lowercase):** `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`, `perf`
- **Header rules:**
  - Lowercase first letter of the subject
  - No trailing period
  - Imperative mood (`add`, `fix`, `remove` — not `added`, `fixes`, `removing`)
  - Maximum 100 characters total for the line
  - No emojis
  - Provide a proposed PR title in the `WEB-<n>: Imperative summary` format, usually the ticket title

### No AI Attribution
- **Never add Claude, Copilot, or AI co-author lines** to Git commits, squash messages, or pull request descriptions (`Co-authored-by: Claude...`). Keep all authorship clean and attributed to the user.

---

## 3. Output Format to the User at Task Completion

Present the commit proposal in a clear summary block at the end of your response:

```text
Recommended Commit:
  Branch:  WEB-<n>/<short-kebab-description>
  Message: <type>(WEB-<n>): <subject>
  PR Title: WEB-<n>: <Summary>
```

Ask the user if they would like you to execute the commit or if they prefer to review and commit it themselves.
