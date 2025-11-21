# Implementation Tasks: GitHub Tarball Deployment

**Feature Branch**: `004-github-tarball-deploy`
**Created**: 2025-11-21
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

This document provides a complete task breakdown for implementing automated GitHub tarball deployment. Tasks are organized by user story to enable independent implementation and testing.

**Total Tasks**: 13
**Estimated Time**: 3-4 hours
**MVP Scope**: User Story 1 + User Story 3 + User Story 4 (core release automation)

---

## Task Summary

| Phase | User Story | Task Count | Can Parallelize |
|-------|-----------|------------|-----------------|
| Setup | N/A | 3 | 2 tasks |
| Foundational | N/A | 0 | N/A |
| US1+US3+US4 | Automated Release (P1) | 5 | 2 tasks |
| US2 | Reference File (P2) | 3 | 1 task |
| Polish | Cross-cutting | 2 | 1 task |

---

## Implementation Strategy

### MVP-First Approach

**MVP = User Story 1 + User Story 3 + User Story 4**

Implement these stories first to deliver core value:
1. **US1**: Automated release on push (workflow infrastructure)
2. **US3**: Semantic version management (version automation)
3. **US4**: Pre-release quality gates (safety validation)

After MVP is validated, add:
4. **US2**: Latest release reference file (convenience enhancement)

### Independent Testing

Each user story phase is independently testable:
- **US1+US3+US4**: Push commit → verify release created → verify tarball installs
- **US2**: Check LATEST_RELEASE.txt → verify URL → test npm install from URL

---

## Phase 1: Setup

**Goal**: Install dependencies and configure semantic-release for automated versioning.

**Independent Test**: Run `npx semantic-release --dry-run` successfully.

### Tasks

- [ ] T001 [P] Install semantic-release dependencies in package.json
- [ ] T002 [P] Configure semantic-release in package.json with plugins
- [ ] T003 Verify semantic-release configuration with dry-run

**Details**:

**T001**: Install semantic-release dependencies
```bash
pnpm add -D semantic-release @semantic-release/commit-analyzer @semantic-release/release-notes-generator @semantic-release/npm @semantic-release/git @semantic-release/github
```
- Add as devDependencies in package.json
- Run `pnpm install` to update pnpm-lock.yaml

**T002**: Configure semantic-release
- Add `release` configuration to package.json:
```json
{
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      ["@semantic-release/npm", { "npmPublish": false }],
      "@semantic-release/github",
      ["@semantic-release/git", {
        "assets": ["package.json", "LATEST_RELEASE.txt"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }]
    ]
  }
}
```
- Set `npmPublish: false` (we're not publishing to npm registry)
- Configure @semantic-release/git to commit package.json and LATEST_RELEASE.txt

**T003**: Verify configuration
```bash
npx semantic-release --dry-run
```
- Should analyze commits without creating actual release
- Verify no errors in output
- Check that version calculation logic works

---

## Phase 2: User Story 1 + 3 + 4 - Automated Release with Quality Gates (P1)

**User Story 1 Goal**: Automate release creation on push to main branch
**User Story 3 Goal**: Automatically manage semantic versions
**User Story 4 Goal**: Run quality gates before releasing

**Why Combined**: These three stories form the MVP core - they're tightly integrated in the workflow and cannot function independently. US3 (versioning) and US4 (quality gates) are prerequisites for US1 (automated release).

**Independent Test**:
1. Push a `feat:` commit to main branch
2. Verify workflow runs and passes quality gates
3. Verify new release is created on GitHub with incremented version
4. Download tarball from release
5. Run `npm install <tarball-url>` in clean directory
6. Verify package installs successfully

**Acceptance Scenarios**:
- ✅ All tests pass → release created
- ✅ Test failure → workflow stops, no release
- ✅ Version increments correctly (feat: → minor, fix: → patch)
- ✅ Git tag matches release version
- ✅ Tarball is installable via npm

### Tasks

- [ ] T004 [US1][US4] Create GitHub Actions workflow directory structure .github/workflows/
- [ ] T005 [US1][US3][US4] Create release workflow file .github/workflows/release.yml with complete workflow
- [ ] T006 [US1][US3][US4] Configure workflow permissions and concurrency settings in release.yml
- [ ] T007 [P] [US4] Add quality gate steps to workflow (lint, type-check, test, build)
- [ ] T008 [P] [US1][US3] Add semantic-release step to workflow
- [ ] T009 [US1] Add tarball creation and GitHub Release steps to workflow
- [ ] T010 [US1] Test workflow by pushing test commit to main branch

**Details**:

**T004**: Create workflow directory
```bash
mkdir -p .github/workflows
```

**T005**: Create release.yml with base structure
```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile
```

**T006**: Add permissions and concurrency
- Set `permissions: contents: write` (for pushing commits and creating releases)
- Set `concurrency: group: release-${{ github.ref }}` with `cancel-in-progress: false`
- This prevents race conditions and ensures all pushes get released

**T007**: Add quality gate steps
```yaml
      - name: Run linting
        run: pnpm run lint

      - name: Run type checking
        run: pnpm type-check

      - name: Run tests
        run: pnpm test

      - name: Run build
        run: pnpm run build
```
- Each step runs existing project commands
- Workflow stops immediately on first failure

**T008**: Add semantic-release step
```yaml
      - name: Semantic Release
        id: semantic_release
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Get new version
        id: get_version
        if: steps.semantic_release.outputs.new_release_published == 'true'
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT
```
- semantic-release analyzes commits, updates package.json, creates Git tag
- Capture new version for use in later steps

**T009**: Add tarball creation and GitHub Release steps
```yaml
      - name: Create tarball
        if: steps.semantic_release.outputs.new_release_published == 'true'
        run: npm pack

      - name: Create GitHub Release
        if: steps.semantic_release.outputs.new_release_published == 'true'
        uses: softprops/action-gh-release@v2
        with:
          files: '*.tgz'
          tag_name: v${{ steps.get_version.outputs.version }}
          name: v${{ steps.get_version.outputs.version }}
          body: ${{ steps.semantic_release.outputs.new_release_notes }}
          draft: false
          prerelease: false
```
- `npm pack` creates tarball from built dist/
- softprops/action-gh-release uploads tarball to GitHub Release

**T010**: Test workflow
- Create test commit with conventional message: `git commit -m "feat: add automated release workflow"`
- Push to main: `git push origin main`
- Go to repository Actions tab and verify workflow runs
- Check that release is created on GitHub
- Download tarball and test installation: `npm install <tarball-url>`

---

## Phase 3: User Story 2 - Latest Release Reference File (P2)

**Goal**: Automatically update LATEST_RELEASE.txt file with latest tarball URL for easy installation.

**Independent Test**:
1. Create a new release (push feat/fix commit)
2. Wait for workflow to complete
3. Read LATEST_RELEASE.txt from repository root
4. Verify URL points to latest release
5. Run `npm install <url-from-file>` and verify successful installation

**Acceptance Scenarios**:
- ✅ File contains valid HTTPS URL to tarball
- ✅ URL points to most recent release (not older version)
- ✅ npm install works with URL from file

### Tasks

- [ ] T011 [P] [US2] Add reference file update step to workflow in release.yml
- [ ] T012 [US2] Add git commit and push step for reference file in workflow
- [ ] T013 [US2] Test reference file update by creating new release

**Details**:

**T011**: Add reference file update step
```yaml
      - name: Update LATEST_RELEASE.txt
        if: steps.semantic_release.outputs.new_release_published == 'true'
        run: |
          TARBALL_FILE=$(ls *.tgz)
          TARBALL_URL="https://github.com/${{ github.repository }}/releases/download/v${{ steps.get_version.outputs.version }}/$TARBALL_FILE"
          echo "$TARBALL_URL" > LATEST_RELEASE.txt
```
- Extract tarball filename from `npm pack` output
- Construct GitHub Release download URL
- Write URL to LATEST_RELEASE.txt

**T012**: Add git commit and push
```yaml
      - name: Commit reference file
        if: steps.semantic_release.outputs.new_release_published == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add LATEST_RELEASE.txt
          git commit -m "chore: update latest release URL [skip ci]"
          git push
```
- Configure git with bot identity
- Commit LATEST_RELEASE.txt
- Use `[skip ci]` to prevent workflow loop

**T013**: Test reference file
- Push new commit (e.g., `fix: test reference file update`)
- Wait for workflow to complete
- Check that LATEST_RELEASE.txt is updated in repository
- Read file content: `curl https://raw.githubusercontent.com/owner/repo/main/LATEST_RELEASE.txt`
- Test installation: `npm install $(curl -s <url-to-LATEST_RELEASE.txt>)`

---

## Phase 4: Polish & Cross-Cutting Concerns

**Goal**: Configure repository settings, validate workflow, and update documentation.

### Tasks

- [ ] T014 [P] Configure repository settings for workflow permissions
- [ ] T015 Update project documentation with installation instructions

**Details**:

**T014**: Configure repository settings
- Go to repository **Settings** → **Actions** → **General**
- Under **Workflow permissions**, select **"Read and write permissions"**
- Check **"Allow GitHub Actions to create and approve pull requests"** (if needed)
- Click **Save**
- Verify GITHUB_TOKEN has correct permissions in next workflow run

**T015**: Update documentation
- Add installation instructions to README.md:
  ```markdown
  ## Installation

  Install the latest version:
  ```bash
  npm install $(curl -s https://raw.githubusercontent.com/owner/repo/main/LATEST_RELEASE.txt)
  ```

  Or install a specific version:
  ```bash
  npm install https://github.com/owner/repo/releases/download/v1.2.3/claude-docs-cli-1.2.3.tgz
  ```
  ```
- Document conventional commit format for contributors
- Add release badge: `![Release](https://github.com/owner/repo/workflows/Release/badge.svg)`

---

## Dependency Graph

### User Story Dependencies

```
Setup (Phase 1)
  ↓
US1 + US3 + US4 (Phase 2) ← MVP Core (must complete together)
  ↓
US2 (Phase 3) ← Optional enhancement (can be added later)
  ↓
Polish (Phase 4)
```

**Key Dependencies**:
- **US1, US3, US4 are tightly coupled**: Cannot implement one without the others
  - US3 (versioning) provides version numbers for US1 (release creation)
  - US4 (quality gates) prevents US1 from releasing broken code
  - All three are part of single workflow file
- **US2 depends on US1**: Reference file needs release URL from US1
- **US2 is independent**: Can be implemented and tested without affecting US1/US3/US4

### Task Dependencies Within Phases

**Setup Phase**:
```
T001 (install deps) --parallel--> T002 (configure)
  ↓
T003 (verify)
```

**US1+US3+US4 Phase**:
```
T004 (create dir)
  ↓
T005 (create workflow file)
  ↓
T006 (configure permissions/concurrency)
  ↓
T007 (quality gates) --parallel--> T008 (semantic-release)
  ↓
T009 (tarball + release)
  ↓
T010 (test)
```

**US2 Phase**:
```
T011 (add reference file step) --parallel with--> none (sequential)
  ↓
T012 (commit and push)
  ↓
T013 (test)
```

**Polish Phase**:
```
T014 (repo settings) --parallel--> T015 (docs)
```

---

## Parallel Execution Opportunities

### Within Setup Phase
- ✅ T001 (install) + T002 (configure) can run in parallel (independent file changes)

### Within US1+US3+US4 Phase
- ✅ T007 (quality gates) + T008 (semantic-release) can be drafted in parallel, but must be sequenced in workflow

### Within Polish Phase
- ✅ T014 (repo settings) + T015 (docs) can run in parallel (independent operations)

**Total Parallel Opportunities**: 3 task pairs (6 tasks parallelizable out of 13)

---

## Testing Strategy

### Per User Story Testing

**US1 + US3 + US4 (Combined MVP)**:
```bash
# Test successful release
git commit -m "feat: add new feature"
git push origin main
# Verify: Workflow passes, release created, version incremented

# Test failed quality gate
# (Intentionally break a test)
git commit -m "feat: broken feature"
git push origin main
# Verify: Workflow fails, no release created

# Test version bump types
git commit -m "fix: patch bug" && git push
# Verify: Patch version incremented (e.g., 1.0.0 → 1.0.1)

git commit -m "feat: add feature" && git push
# Verify: Minor version incremented (e.g., 1.0.1 → 1.1.0)

git commit -m "feat!: breaking change" && git push
# Verify: Major version incremented (e.g., 1.1.0 → 2.0.0)
```

**US2 (Reference File)**:
```bash
# Test reference file update
git commit -m "feat: test reference file"
git push origin main
# Wait for workflow
cat LATEST_RELEASE.txt
# Verify: Contains URL to latest release

# Test installation from reference file
npm install $(cat LATEST_RELEASE.txt)
# Verify: Package installs successfully
```

### Integration Testing

```bash
# End-to-end test
git commit -m "feat: full integration test"
git push origin main

# Verify complete flow:
# 1. Workflow runs
# 2. Quality gates pass
# 3. Version increments
# 4. Git tag created
# 5. Release published on GitHub
# 6. Tarball uploaded
# 7. LATEST_RELEASE.txt updated
# 8. Can install from URL

npm install $(curl -s https://raw.githubusercontent.com/owner/repo/main/LATEST_RELEASE.txt)
claude-docs --version  # Should show new version
```

---

## Success Criteria Validation

Each task maps to success criteria from spec.md:

| Success Criterion | Validated By |
|-------------------|-------------|
| **SC-001**: Install from tarball URL | T010 (test workflow) |
| **SC-002**: Release created within 5 minutes | T010 (workflow timing) |
| **SC-003**: Reference file updated within 1 minute | T013 (test reference file) |
| **SC-004**: Zero releases on failure | T010 (test failed quality gate) |
| **SC-005**: Unique, incrementing versions | T008 (semantic-release) |
| **SC-006**: Latest URL in single file | T013 (LATEST_RELEASE.txt) |
| **SC-007**: Tarball installs in clean environment | T010, T013 (npm install tests) |

---

## Rollback Plan

If implementation fails:

1. **Setup Phase Failure** (T001-T003):
   - Remove semantic-release config from package.json
   - Uninstall semantic-release dependencies
   - No impact on existing functionality

2. **Workflow Failure** (T004-T010):
   - Delete .github/workflows/release.yml
   - Remove semantic-release config
   - Revert to manual releases

3. **Reference File Failure** (T011-T013):
   - Remove reference file update steps from workflow
   - US1/US3/US4 still functional (core workflow intact)

---

## Notes

- **No code changes to src/**: This is purely infrastructure/CI enhancement
- **No new production dependencies**: All dependencies are devDependencies
- **Workflow runs on main branch only**: Development branches unaffected
- **Quality gates enforce existing standards**: No new test/lint requirements
- **semantic-release handles versioning**: No manual version updates needed
- **Workflow is idempotent**: Safe to rerun (semantic-release prevents duplicates)

---

## Quick Reference

### Conventional Commit Format

```
<type>: <description>

[optional body]

[optional footer]
```

**Types**:
- `feat:` → Minor version bump (new feature)
- `fix:` → Patch version bump (bug fix)
- `feat!:` or `BREAKING CHANGE:` → Major version bump
- `docs:`, `chore:`, `test:` → No version bump

### Workflow Commands

```bash
# View workflow status
gh workflow list
gh run list --workflow=release.yml

# View releases
gh release list
gh release view v1.2.3

# Install from latest
npm install $(curl -s https://raw.githubusercontent.com/owner/repo/main/LATEST_RELEASE.txt)

# Dry-run semantic-release locally
npx semantic-release --dry-run
```

---

**Ready to implement!** Start with Setup Phase (T001-T003), then MVP (T004-T010), then enhancements (T011-T015).
