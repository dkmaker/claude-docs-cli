---
"claude-docs": patch
---

Complete CLI fixes and quality improvements. Fix TypeScript errors in test files (35 errors across 4 files), remove continue-on-error from type-checking in PR workflow to properly enforce quality gates, and refactor release workflow to use GitHub API for latest release discovery instead of committing LATEST_RELEASE.txt (resolves branch protection conflicts). Quality gates now fully block PRs with type errors, linting issues, test failures, or build errors.
