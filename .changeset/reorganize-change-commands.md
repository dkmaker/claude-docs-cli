---
"claude-docs": patch
---

Reorganize release management commands into `/change:` namespace for better discoverability and organization. All release-related commands (`changeset`, `version`, `release`) are now grouped under the `change/` directory and accessible via `/change:commandname`. Adds new `/change:help` command that intelligently analyzes repository state and guides users through the release workflow. Commands still work with shortcut syntax (`/changeset`, `/version`, `/release`) when no conflicts exist. Updated RELEASE.md documentation to reflect the new namespace structure.
