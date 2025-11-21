---
"claude-docs": minor
---

Implement Changesets-based release workflow with AI-assisted management. Replaces semantic-release with Changesets for better developer control over version bumps and changelog quality. Adds three custom slash commands (`/changeset`, `/version`, `/release`) that use AI to analyze changes, determine version bumps, and create release PRs automatically. The GitHub Actions workflow now uses official `gh` CLI instead of third-party actions, minimizing external dependencies. Users can now preview releases, group multiple changes, and maintain human-readable changelogs while still benefiting from full automation.
