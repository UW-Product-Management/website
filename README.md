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
| **Testing** | Jest & React Testing Library | Unit and component testing |
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

### 2. Branching & Commits
- Branch from `main` (or active development branch) with a descriptive name:
  - `feat/<feature-name>`
  - `fix/<bug-description>`
  - `<your-name>/<task-name>`
- Follow the **Conventional Commits** format (`type: imperative subject`):
  - `feat: add interactive team profile cards`
  - `fix: correct mobile navbar hamburger alignment`
  - `style: update button hover transition`

### 3. Pull Requests
- Open a PR using the [Pull Request Template](.github/pull-request-template.md).
- Link the corresponding issue/ticket.
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
