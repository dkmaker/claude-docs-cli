# Research: GitHub Tarball Deployment

**Date**: 2025-11-21
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Research Topics

This document consolidates research findings for technical decisions in the GitHub Tarball Deployment feature.

---

## 1. Version Bumping Strategy

### Decision
Use **semantic-release** with plugins for fully automated semantic versioning.

### Rationale
- **Maximum automation**: Analyzes conventional commit messages, automatically determines version bump type (major/minor/patch), updates package.json, creates Git tags, and generates changelog without human intervention
- **Zero maintenance burden**: Set and forget - no manual version number management required
- **Built-in conventional commits support**: Follows Angular commit message convention by default (feat: → minor, fix: → patch, BREAKING CHANGE: → major)
- **Proven reliability**: Industry-standard tool with 20k+ GitHub stars, used by major projects
- **Plugin ecosystem**: Extensible with @semantic-release/commit-analyzer, @semantic-release/release-notes-generator, @semantic-release/npm, @semantic-release/git, @semantic-release/github
- **CI/CD friendly**: Designed specifically for GitHub Actions and other CI environments
- **Supply chain security**: Supports npm package provenance with signed attestations on GitHub Actions

### Alternatives Considered
1. **Manual npm version** - Rejected: High error potential, requires manual intervention for every release, not suitable for automated CI/CD workflows
2. **GitHub Actions like git-auto-semver** - Rejected: Less mature ecosystem, more setup complexity, limited plugin support compared to semantic-release
3. **conventional-changelog alone** - Rejected: Only handles changelog generation, doesn't handle version bumping or Git tag creation

### Sources
- https://github.com/semantic-release/semantic-release
- https://dev.to/arpanaditya/automating-releases-with-semantic-versioning-and-github-actions-2a06
- https://aws.amazon.com/blogs/devops/using-semantic-versioning-to-simplify-release-management/
- https://blog.droxic.com/automate-releases-with-semantic-release-and-github-actions/

### Research Method
- perplexity_search: Found documentation and tutorials for all version bumping approaches
- perplexity_reason: Compared alternatives and justified decision based on automation requirements

### Confidence Level
**High** - Multiple production references, official documentation, proven track record in CI/CD environments

---

## 2. Tarball Asset Upload to GitHub Releases

### Decision
Use **softprops/action-gh-release** for creating releases and uploading tarball assets.

### Rationale
- **Most popular and actively maintained**: 4,589 GitHub stars, regularly updated, well-documented
- **Simplifies workflow**: Single action handles both release creation and asset upload with glob pattern support
- **Handles edge cases**: Automatically updates existing releases if tag already exists, prevents duplicate releases
- **Native glob support**: Can specify file patterns like `*.tgz` or list multiple files, making it flexible for various packaging scenarios
- **Reliable asset management**: Properly handles asset uploads with retries and error handling
- **GITHUB_TOKEN compatible**: Works with built-in GITHUB_TOKEN, no need for PAT
- **Cross-platform**: Works on Linux, Windows, macOS GitHub Actions runners
- **Release notes support**: Can read from file (`body_path`) or inline markdown for automatic changelog integration

### Alternatives Considered
1. **actions/create-release** - Rejected: Officially deprecated by GitHub, recommends using softprops/action-gh-release instead
2. **ncipollo/release-action** - Considered: Similar functionality (1,559 stars), but less popular and fewer community examples than softprops
3. **gh CLI directly** - Rejected: Requires more manual scripting, error handling, and workflow setup compared to purpose-built action
4. **GitHub API calls** - Rejected: Too low-level, requires handling authentication, pagination, asset upload protocols manually

### Implementation Pattern
```yaml
- name: Release
  uses: softprops/action-gh-release@v2
  with:
    files: |
      *.tgz
    body_path: CHANGELOG.md
    tag_name: v${{ steps.version.outputs.version }}
    draft: false
    prerelease: false
```

### Sources
- https://github.com/softprops/action-gh-release
- https://github.com/marketplace/actions/gh-release
- https://notes.kodekloud.com/docs/GitHub-Actions-Certification/Custom-Actions/Create-GitHub-release-using-GitHub-Actions
- https://trstringer.com/github-actions-create-release-upload-artifacts/

### Research Method
- perplexity_search: Compared GitHub release creation actions in marketplace
- Manual review: Examined deprecation notices for actions/create-release

### Confidence Level
**High** - Official recommendation from GitHub, widely adopted in production workflows, active maintenance

---

## 3. Reference File Commit Strategy

### Decision
Use **GITHUB_TOKEN with elevated permissions** to commit reference file back to repository. Specifically:
1. Set `permissions: contents: write` in workflow
2. Configure git with github-actions bot identity
3. Use standard git commands to commit and push
4. Add `[skip ci]` to commit message to prevent workflow loops

### Rationale
- **No additional secrets required**: GITHUB_TOKEN is automatically provided by GitHub Actions
- **Scoped permissions**: Token is limited to single repository and expires after job completes
- **Simple setup**: No need to create and manage Personal Access Tokens (PATs) or GitHub Apps
- **Built-in bot identity**: Uses `github-actions[bot]` as committer, clearly indicates automated commits
- **Protected branch compatible**: Works with branch protection rules when workflow permissions are configured correctly
- **Prevents workflow loops**: `[skip ci]` in commit message prevents triggering another workflow run
- **Audit trail**: All commits are attributed to github-actions[bot], making it easy to track automated changes

### Alternatives Considered
1. **Personal Access Token (PAT)** - Rejected: Long-lived credentials, tied to user account, security risk if user leaves organization, requires secret management
2. **GitHub App installation token** - Rejected: Overkill for single-repo use case, requires creating and managing GitHub App, more complex setup
3. **Deploy keys** - Rejected: Repository-specific SSH keys, more complex setup than GITHUB_TOKEN, harder to rotate

### Implementation Pattern
```yaml
permissions:
  contents: write

steps:
  - name: Update reference file
    run: |
      echo "${{ steps.create_release.outputs.upload_url }}" > LATEST_RELEASE.txt
      git config user.name "github-actions[bot]"
      git config user.email "github-actions[bot]@users.noreply.github.com"
      git add LATEST_RELEASE.txt
      git commit -m "chore: update latest release URL [skip ci]"
      git push
```

### Important Considerations
- Must use `actions/checkout@v4` with `token: ${{ secrets.GITHUB_TOKEN }}` to ensure authenticated push
- Workflow permissions must be set to `contents: write` at workflow or job level
- Repository settings → Actions → General → Workflow permissions should allow "Read and write permissions"
- Branch protection rules: If main branch requires PR, consider using separate release branch or configure rules to allow github-actions[bot]

### Sources
- https://github.com/orgs/community/discussions/26694
- https://github.blog/changelog/2021-04-20-github-actions-control-permissions-for-github_token/
- https://michaelheap.com/ultimate-guide-github-actions-authentication/
- https://dev.to/github/the-githubtoken-in-github-actions-how-it-works-change-permissions-customizations-3cgp

### Research Method
- perplexity_search: Found best practices for committing from workflows
- Community discussion review: Analyzed common pitfalls and solutions

### Confidence Level
**High** - Standard pattern used across thousands of GitHub repositories, officially documented by GitHub

---

## 4. Concurrent Release Protection

### Decision
Use GitHub Actions **concurrency groups** with `cancel-in-progress: false` to serialize release workflows.

### Rationale
- **Built-in feature**: No external dependencies or custom locking mechanisms needed
- **Simple configuration**: Single `concurrency` key in workflow YAML with group identifier
- **Queue-based**: Subsequent workflow runs wait in queue rather than failing, ensuring all valid pushes eventually get released
- **Prevents race conditions**: Only one workflow instance can run at a time, preventing:
  - Duplicate version tags
  - Conflicting package.json updates
  - Overlapping Git pushes
  - Simultaneous release creation
- **Automatic cleanup**: No manual intervention needed if workflows are cancelled or fail
- **Branch-specific**: Can scope concurrency to specific branches (e.g., only main branch)

### Alternatives Considered
1. **Manual locking with files** - Rejected: Requires custom logic to create/check/remove lock files, prone to stale locks if workflow crashes
2. **Debouncing with timestamps** - Rejected: Complex logic to determine which push "wins", risks skipping valid releases
3. **No protection (YOLO)** - Rejected: High risk of duplicate tags, version conflicts, corrupted releases

### Implementation Pattern
```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false  # Queue subsequent runs instead of cancelling
```

### Behavior
- **First push**: Workflow starts immediately
- **Second push (during first run)**: Queued, waits for first to complete
- **Third+ pushes**: Queued behind previous runs
- **All queued runs execute**: Ensures every valid commit eventually gets released (no lost releases)

### Important Considerations
- Set `cancel-in-progress: false` to ensure all pushes are released (default is true, which would cancel queued runs)
- Concurrency group should be unique per branch (e.g., `release-main`) to allow parallel releases on different branches if needed
- Does not prevent concurrent workflows from different repos (isolation is per-repo by design)
- Queue depth is limited by GitHub Actions runner availability and free tier limits (2000 minutes/month)

### Sources
- https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#concurrency
- https://github.com/marketplace/actions/git-automatic-semantic-versioning (example showing concurrency configuration)

### Research Method
- perplexity_search: Found GitHub Actions concurrency documentation
- Pattern analysis: Reviewed examples from popular repositories using semantic-release

### Confidence Level
**High** - Official GitHub Actions feature, documented best practice, widely used in production

---

## 5. Quality Gate Integration

### Decision
Use **pnpm run validate** command that executes all existing test/lint/build scripts sequentially in workflow.

### Rationale
- **Reuses existing infrastructure**: Project already has `pnpm test`, `pnpm run lint`, `pnpm run build`, `pnpm type-check` configured
- **Consistent with local development**: Developers run same commands locally before pushing
- **Fail-fast behavior**: Workflow exits immediately on first failure (test, lint, type-check, or build error)
- **Clear error reporting**: Each command outputs detailed errors, making failures easy to diagnose
- **No new dependencies**: Uses existing project tooling (Vitest, Biome, TypeScript)
- **Aligns with constitution**: Follows existing project standards (TDD, 100% test pass rate, type safety)

### Implementation Pattern
```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Run quality checks
  run: pnpm run validate  # Runs: lint, type-check, test, build

- name: Build release artifact
  if: success()  # Only if quality checks pass
  run: pnpm run build
```

### Quality Gates Enforced
1. **Linting**: Biome linter checks for code style violations
2. **Type checking**: TypeScript compiler ensures type safety
3. **Tests**: Vitest runs all unit and integration tests (must be 100% pass rate)
4. **Build**: Ensures dist/ artifacts can be created successfully

### Important Considerations
- Quality checks must pass before any version bumping or release creation
- Workflow should NOT create releases if tests fail (enforced by semantic-release only running after successful checks)
- `pnpm install --frozen-lockfile` ensures deterministic builds (no surprise dependency updates)
- Use `if: success()` conditionals to prevent releasing broken code

### Sources
- Project's existing package.json scripts
- CLAUDE.md constitution (TDD and quality requirements)
- https://github.com/semantic-release/semantic-release (integrates with CI test commands)

### Research Method
- Local project inspection: Reviewed existing package.json and constitution
- Pattern matching: Aligned with standard Node.js CI/CD practices

### Confidence Level
**High** - Established pattern in Node.js ecosystem, already working in project

---

## Summary

All technical decisions are resolved with high confidence:

1. ✅ **Version Bumping**: semantic-release with plugins
2. ✅ **Asset Upload**: softprops/action-gh-release action
3. ✅ **Reference File Commit**: GITHUB_TOKEN with elevated permissions
4. ✅ **Concurrency**: GitHub Actions concurrency groups
5. ✅ **Quality Gates**: Existing pnpm validate command

These choices optimize for:
- **Automation**: Minimal manual intervention
- **Reliability**: Industry-proven tools and patterns
- **Security**: Scoped tokens, no long-lived credentials
- **Maintainability**: Simple setup, clear error reporting
- **GitHub Free Tier**: All solutions work within 2000 minutes/month limit

Ready to proceed to Phase 1 (Design & Contracts).
