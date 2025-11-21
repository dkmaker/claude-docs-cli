# Workflow Contract: GitHub Actions Release Workflow

**Date**: 2025-11-21
**Spec**: [../spec.md](../spec.md)
**Plan**: [../plan.md](../plan.md)

## Overview

This document defines the contract for the GitHub Actions release workflow. It specifies inputs, outputs, behavior guarantees, and failure modes.

---

## Workflow Interface

### Trigger Event

```yaml
on:
  push:
    branches:
      - main  # Only trigger on pushes to main branch
```

**Input Requirements**:
- **Trigger**: Push event to `main` branch
- **Commit format**: Conventional Commits specification (feat:, fix:, BREAKING CHANGE:)
- **Repository state**: Clean working directory (no uncommitted changes)
- **Branch protection**: Workflow must have `contents: write` permission

**Preconditions**:
- Tests must exist and be runnable via `pnpm test`
- Build must be defined in `package.json` as `pnpm run build`
- Linting must be configured with Biome (`pnpm run lint`)
- Type checking must be available (`pnpm type-check`)
- package.json must have valid `name`, `version`, and `files` fields

---

## Quality Gates

The workflow MUST run these checks sequentially before any release operations:

### 1. Dependency Installation

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**Guarantees**:
- Deterministic builds (exact dependency versions from pnpm-lock.yaml)
- No surprise dependency updates during release

**Failure Mode**: Workflow stops if pnpm-lock.yaml is out of sync with package.json

---

### 2. Linting

```yaml
- name: Run linting
  run: pnpm run lint
```

**Guarantees**:
- Code follows Biome style rules
- No linting violations exist

**Failure Mode**: Workflow stops with linting error details if violations found

---

### 3. Type Checking

```yaml
- name: Run type checking
  run: pnpm type-check
```

**Guarantees**:
- All TypeScript types are valid
- No type errors exist

**Failure Mode**: Workflow stops with type error details if violations found

---

### 4. Testing

```yaml
- name: Run tests
  run: pnpm test
```

**Guarantees**:
- All unit and integration tests pass (100% pass rate)
- No skipped tests (`.skip()` or `.todo()`)

**Failure Mode**: Workflow stops with test failure details if any test fails

---

### 5. Build

```yaml
- name: Build project
  run: pnpm run build
```

**Guarantees**:
- TypeScript compiles successfully to dist/
- All output artifacts are generated

**Failure Mode**: Workflow stops with build error details if compilation fails

---

## Release Operations

After quality gates pass, the workflow performs release operations:

### 1. Semantic Versioning

```yaml
- name: Semantic Release
  run: npx semantic-release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Input**:
- Commit messages since last Git tag
- Current version from package.json

**Processing**:
- Analyzes commits using conventional commit patterns
- Determines version bump type (major/minor/patch/none)
- Updates package.json with new version
- Creates Git tag (v<version>)
- Generates changelog from commit messages

**Output**:
- Updated package.json with new version
- New Git tag pushed to remote
- Environment variable: `NEW_VERSION` (e.g., "1.2.3")

**Guarantees**:
- Version follows semantic versioning (MAJOR.MINOR.PATCH)
- Version increments by exactly 1 in one component
- Git tag matches package.json version (with `v` prefix)
- No duplicate tags created

**Failure Modes**:
- **No release needed**: If no releasable commits found (only `chore:`, `docs:`, etc.), workflow exits successfully without creating release
- **Duplicate tag**: If tag already exists, workflow fails with error

---

### 2. Tarball Creation

```yaml
- name: Create tarball
  run: npm pack
```

**Input**:
- Built project in dist/
- package.json with new version

**Processing**:
- Packages files listed in package.json `files` field
- Creates gzip-compressed tarball

**Output**:
- File: `<package-name>-<version>.tgz` (e.g., `claude-docs-cli-1.2.3.tgz`)
- Size: Typically 50-500KB

**Guarantees**:
- Tarball contains all production dependencies (if bundled)
- Tarball excludes devDependencies
- Tarball is installable via `npm install <path-to-tarball>`

**Failure Mode**: Workflow stops if npm pack fails (rare, usually indicates package.json misconfiguration)

---

### 3. GitHub Release Creation

```yaml
- name: Create GitHub Release
  uses: softprops/action-gh-release@v2
  with:
    files: '*.tgz'
    tag_name: v${{ env.NEW_VERSION }}
    name: v${{ env.NEW_VERSION }}
    body: ${{ env.CHANGELOG }}
    draft: false
    prerelease: false
```

**Input**:
- Tarball file (*.tgz)
- Version number (NEW_VERSION)
- Changelog markdown (CHANGELOG)
- Git tag (must already exist)

**Processing**:
- Creates GitHub Release via GitHub API
- Uploads tarball as release asset
- Sets release name and body

**Output**:
- GitHub Release URL: `https://github.com/<owner>/<repo>/releases/tag/v<version>`
- Tarball asset URL: `https://github.com/<owner>/<repo>/releases/download/v<version>/<package-name>-<version>.tgz`

**Guarantees**:
- Release is publicly accessible immediately
- Tarball is downloadable via HTTPS
- Release notes contain changelog from commits

**Failure Modes**:
- **Release already exists**: Updates existing release if tag matches
- **Asset upload failure**: Retries upload up to 3 times before failing
- **Permission denied**: Fails if GITHUB_TOKEN lacks `contents: write`

---

### 4. Reference File Update

```yaml
- name: Update LATEST_RELEASE.txt
  run: |
    TARBALL_URL="${{ steps.release.outputs.assets[0].browser_download_url }}"
    echo "$TARBALL_URL" > LATEST_RELEASE.txt
    git config user.name "github-actions[bot]"
    git config user.email "github-actions[bot]@users.noreply.github.com"
    git add LATEST_RELEASE.txt
    git commit -m "chore: update latest release URL [skip ci]"
    git push
```

**Input**:
- Tarball asset URL from GitHub Release

**Processing**:
- Writes URL to LATEST_RELEASE.txt
- Commits file to repository
- Pushes to main branch

**Output**:
- Updated LATEST_RELEASE.txt in repository root
- New commit on main branch (committed by github-actions[bot])

**Guarantees**:
- File always contains most recent release URL
- Commit message includes `[skip ci]` to prevent workflow loop
- File is checked into repository (not gitignored)

**Failure Modes**:
- **Push conflict**: Fails if another commit was pushed during workflow (rare with concurrency groups)
- **Permission denied**: Fails if GITHUB_TOKEN lacks `contents: write` or branch protection blocks bot
- **Retry**: Can rerun workflow to retry commit push

---

## Concurrency Control

```yaml
concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false
```

**Guarantees**:
- Only one release workflow runs at a time per branch
- Subsequent pushes are queued (not cancelled)
- All queued workflows execute eventually

**Behavior**:
- **First push**: Starts immediately
- **Second push (during first run)**: Queued, waits for first to complete
- **Third+ pushes**: Queued behind previous runs
- **No lost releases**: Every valid push eventually gets released

---

## Workflow Outputs

### Success Outputs

**Git Repository State**:
- New Git tag (v<version>) pointing to release commit
- package.json updated with new version
- LATEST_RELEASE.txt updated with tarball URL
- New commit on main branch (from reference file update)

**GitHub Release**:
- Published release at `https://github.com/<owner>/<repo>/releases/tag/v<version>`
- Tarball asset downloadable at release URL
- Release notes generated from conventional commits

**Installable Package**:
- Users can install via: `npm install <tarball-url>`
- Users can find latest URL by reading LATEST_RELEASE.txt

---

### Failure Outputs

**Quality Gate Failure**:
- Workflow status: ❌ Failed
- No version bump
- No Git tag created
- No GitHub Release created
- Clear error message indicating which gate failed (lint/type-check/test/build)

**Release Operation Failure**:
- Workflow status: ❌ Failed
- Partial state possible (e.g., tag created but release failed)
- Error message with failure details
- May require manual cleanup depending on failure point

---

## Permissions Required

```yaml
permissions:
  contents: write  # Required for:
                   # - Creating Git tags
                   # - Pushing commits
                   # - Creating GitHub Releases
                   # - Uploading release assets
```

**Repository Settings**:
- Settings → Actions → General → Workflow permissions: "Read and write permissions"
- Branch protection rules (if any): Allow github-actions[bot] to push to main

---

## Success Criteria (Maps to Spec)

| Success Criterion (from spec.md) | Contract Guarantee |
|----------------------------------|-------------------|
| **SC-001**: Users can install from tarball URL without errors | Tarball is npm-compatible, includes all dependencies |
| **SC-002**: Release created within 5 minutes of push | Quality gates + release operations complete in <5 min |
| **SC-003**: Reference file updated within 1 minute | Reference file commit happens immediately after release |
| **SC-004**: Zero releases when quality gates fail | Workflow stops before semantic-release if any gate fails |
| **SC-005**: 100% unique, incrementing version numbers | semantic-release prevents duplicates, enforces SemVer |
| **SC-006**: Latest URL readable from single file | LATEST_RELEASE.txt always contains current release URL |
| **SC-007**: Tarball installs in clean Node.js environment | npm pack includes all required files/dependencies |

---

## Error Handling

### Retryable Errors
- Asset upload failures (automatic retry in softprops/action-gh-release)
- Network timeouts (GitHub Actions runner retries)

### Non-Retryable Errors
- Failing tests (developer must fix tests and push new commit)
- Linting violations (developer must fix code and push new commit)
- Type errors (developer must fix types and push new commit)
- Build failures (developer must fix build errors and push new commit)
- Duplicate Git tags (indicates workflow was rerun incorrectly)

### Manual Recovery
- **Failed reference file commit**: Rerun workflow or manually commit LATEST_RELEASE.txt
- **Partial release (tag exists but no GitHub Release)**: Manually create release via GitHub UI or rerun workflow
- **Corrupted version state**: Manually delete tag, reset package.json version, rerun workflow

---

## Idempotency

**Idempotent Operations**:
- Quality gates (can run multiple times safely)
- npm pack (overwrites previous tarball)
- Reference file update (overwrites previous content)

**Non-Idempotent Operations**:
- Git tag creation (fails if tag exists)
- GitHub Release creation (updates existing release if tag matches)
- Package.json version update (semantic-release handles deduplication)

**Safe to Rerun**: Workflow can be rerun if it failed after quality gates, but may require manual cleanup of Git tags.

---

## Security

**Secrets Used**:
- `GITHUB_TOKEN`: Automatically provided, scoped to repository, expires after job
- No manual secrets required (no PAT, no GitHub App)

**Permissions Model**:
- Token is limited to single repository
- Token has `contents: write` permission only
- Bot identity (`github-actions[bot]`) clearly indicates automated commits

**Supply Chain Security**:
- Workflow uses pinned action versions (e.g., `@v2`, `@v4`)
- Dependency installation uses frozen lockfile (no surprise updates)
- All operations logged in GitHub Actions workflow run

---

## Monitoring

**Workflow Status**:
- Visible in GitHub Actions tab
- Email/Slack notifications on failure (if configured)
- Badge in README (if added): ![Release Status](https://github.com/<owner>/<repo>/workflows/Release/badge.svg)

**Release History**:
- All releases visible at `https://github.com/<owner>/<repo>/releases`
- All Git tags visible at `https://github.com/<owner>/<repo>/tags`
- Commit history shows version bumps and reference file updates

---

## Testing Strategy

**Local Testing**:
- Cannot fully test workflow locally (GitHub Actions runner required)
- Can test individual commands: `pnpm run lint`, `pnpm test`, `pnpm run build`, `npm pack`
- Can test semantic-release in dry-run mode: `npx semantic-release --dry-run`

**CI Testing**:
- Push test commit to feature branch (workflow only runs on main)
- Create test tag manually to verify softprops/action-gh-release behavior
- Use workflow dispatch trigger (if added) to manually test workflow

**Integration Testing**:
- Perform full release to verify end-to-end workflow
- Test installation from generated tarball URL: `npm install <url>`
- Verify LATEST_RELEASE.txt contains correct URL

---

## Maintenance

**Version Updates**:
- Regularly update GitHub Actions versions (e.g., `actions/checkout@v4` → `@v5`)
- Update semantic-release and plugins when new versions released
- Pin versions to avoid breaking changes

**Monitoring Deprecations**:
- Watch for GitHub Actions deprecation notices
- Subscribe to semantic-release changelog
- Monitor softprops/action-gh-release for updates

**Troubleshooting**:
- Check workflow logs for detailed error messages
- Verify GITHUB_TOKEN permissions if push/release creation fails
- Ensure semantic-release config is correct if versioning fails
- Check branch protection rules if commits are rejected

---

## Example Workflow Run

### Successful Release Flow

```
1. Push commit: "feat: add new search feature"
   ↓
2. Workflow triggers (main branch push)
   ↓
3. Install dependencies (10s)
   ↓
4. Run linting ✅ (5s)
   ↓
5. Run type checking ✅ (8s)
   ↓
6. Run tests ✅ (20s)
   ↓
7. Run build ✅ (12s)
   ↓
8. semantic-release (30s)
   - Analyzes commits: "feat:" detected → minor bump
   - Current version: 1.2.3
   - New version: 1.3.0
   - Updates package.json
   - Creates tag v1.3.0
   - Pushes tag to remote
   ↓
9. Create tarball (3s)
   - Output: claude-docs-cli-1.3.0.tgz (234 KB)
   ↓
10. Create GitHub Release (8s)
    - Upload tarball as asset
    - Generate release notes
    - Publish release
    ↓
11. Update LATEST_RELEASE.txt (2s)
    - Write tarball URL to file
    - Commit and push
    ↓
12. Workflow complete ✅ (Total: ~98 seconds)

Result: Version 1.3.0 released, installable via LATEST_RELEASE.txt URL
```

### Failed Release Flow (Test Failure)

```
1. Push commit: "feat: add broken feature"
   ↓
2. Workflow triggers (main branch push)
   ↓
3. Install dependencies ✅ (10s)
   ↓
4. Run linting ✅ (5s)
   ↓
5. Run type checking ✅ (8s)
   ↓
6. Run tests ❌ (15s)
   - Error: Test "search returns results" failed
   - Expected: 5 results
   - Received: 0 results
   ↓
7. Workflow stops ❌ (Total: ~38 seconds)

Result: No release created, developer must fix tests and push again
```

---

## Notes

- This contract serves as the "API documentation" for the release workflow
- All behavior is deterministic and reproducible
- Workflow is designed to be safe to rerun with concurrency protection
- No manual intervention required for normal releases (fully automated)
