## 💾 Implementation Notes and Changes

- [WEB-<n>](https://github.com/UW-Product-Management/website/issues/<n>) <!-- PR title: "WEB-<n>: Imperative summary" -->
- Closes #<n>

_Outline what is contained within the PR and how it relates to the ticket/issue._

- A high level list of changes the reviewer should keep in mind as they read through the PR.
- If this work is behind a feature flag, route toggle, or config, please let us know here
- If this PR is dependent on a different ticket or PR (i.e., some other task/PR, design asset, or upstream dependency), please let the reviewer know in this section.

#### 📖 Documentation (optional)

- Place links to supporting documentation (e.g., Figma design, Notion spec, or external library docs) to help inform the reviewer of any design specifications, dependency additions, or breaking changes
- (Remove if not needed)

### 🔎 Verify

- The shortest list of steps the reviewer can follow to confirm the change works on their local machine.

#### 🎥 Screenshots/Videos (optional)

- Place any helpful screenshots and videos of working acceptance criteria or steps for reviewers to verify across responsive viewports (Desktop >= 1024px, Tablet 768–1024px, Mobile < 768px)
- (Remove if not needed)

## Checklist

- Added Unit Tests where applicable
- Added accessible attributes (aria-labels, semantic roles) or testIDs to interactable elements (if applicable)
- Reviewed any bot comments (e.g., GitHub Actions, automated reviewers) for any resolvable issues
- Tested across responsive viewports (Mobile < 768px, Tablet 768–1024px, Desktop > 1024px) and modern browsers
- Tested all variations with feature flags, routes, or view states (if applicable)
- Verified build and lint checks pass cleanly (`npm run lint`, `npm test`, `npm run build`) with zero console errors
- Added Testing Notes to ticket/PR and any helpful test data or preview links to help reviewers with verification
- Ensured with Product/Design Team that the acceptance criteria got updated with any changes/updates
- Tested every acceptance criteria listed on the ticket

- [ ] By checking this box, you are confirming that you have done the above [checklist](##Checklist) and are ready for review!
