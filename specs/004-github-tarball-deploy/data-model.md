# Data Model: GitHub Tarball Deployment

**Date**: 2025-11-21
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

This feature is primarily a CI/CD infrastructure enhancement and does not introduce complex domain entities. The "data" managed by this system consists of:

1. **File artifacts** (tarballs, reference files)
2. **Git metadata** (tags, commit messages)
3. **GitHub resources** (releases, assets)
4. **Configuration** (workflow YAML, semantic-release config)

All entities are managed by GitHub Actions, Git, and npm tooling - no application-level data models are required.

---

## Entities

### 1. Package Tarball (npm artifact)

**Description**: The packaged application in compressed tarball format (.tgz), created by `npm pack`.

**Attributes**:
- **Filename**: `<package-name>-<version>.tgz` (e.g., `claude-docs-cli-1.2.3.tgz`)
- **Format**: gzip-compressed tar archive
- **Contents**:
  - `package/package.json` - Package metadata with version
  - `package/dist/` - Compiled JavaScript (TypeScript output)
  - `package/README.md` - Documentation
  - `package/LICENSE` - License file
  - Other files defined by `package.json` `files` field
- **Size**: Typically 50-500KB for CLI tools (varies by dependency tree)
- **Created by**: `npm pack` command in workflow
- **Storage location**: GitHub Release assets (attached to release)

**Lifecycle**:
1. Created during release workflow after successful build
2. Uploaded to GitHub Release as asset via softprops/action-gh-release
3. Becomes publicly accessible via HTTPS URL (GitHub CDN)
4. Persists indefinitely unless release is deleted

**Validation Rules**:
- Must contain valid package.json with correct version number
- Must be installable via `npm install <tarball-url>`
- Must include all production dependencies (bundled or listed in package.json)
- Must exclude devDependencies

---

### 2. Git Version Tag

**Description**: Git annotated tag marking a specific commit as a release version.

**Attributes**:
- **Name**: `v<version>` (e.g., `v1.2.3`) following semantic versioning
- **Target**: Commit SHA (40-character hex string)
- **Created by**: semantic-release during workflow
- **Message**: Auto-generated release notes from conventional commits
- **Tagger**: github-actions[bot]

**Lifecycle**:
1. Created by semantic-release after determining version bump
2. Pushed to remote repository (`origin`)
3. Triggers GitHub Release creation
4. Immutable (tags should not be moved/deleted in normal workflow)

**Validation Rules**:
- Must follow pattern `vMAJOR.MINOR.PATCH` (e.g., `v1.0.0`, `v2.3.15`)
- Must not already exist (prevents duplicate releases)
- Must be annotated (not lightweight) for proper release metadata
- Must reference a commit on the main branch

---

### 3. GitHub Release

**Description**: GitHub's release object containing version information, changelog, and associated tarball asset.

**Attributes**:
- **Tag name**: `v<version>` (links to Git tag)
- **Release name**: `v<version>` or custom name (e.g., "Release v1.2.3")
- **Body**: Markdown-formatted release notes (auto-generated from commits)
- **Assets**: Array of uploaded files (tarball)
- **Draft**: `false` (published immediately)
- **Prerelease**: `false` (stable release)
- **Created at**: Timestamp (ISO 8601)
- **Published by**: github-actions[bot]
- **URL**: `https://github.com/<owner>/<repo>/releases/tag/v<version>`

**Lifecycle**:
1. Created by softprops/action-gh-release after quality gates pass
2. Tarball asset uploaded to release
3. LATEST_RELEASE.txt file updated with release asset URL
4. Publicly accessible immediately after creation

**Relationships**:
- **Has one**: Git tag (1:1 relationship)
- **Has many**: Assets (1:N, though this feature uploads only one tarball)
- **References**: Commit SHA via tag

---

### 4. Reference File (LATEST_RELEASE.txt)

**Description**: Plain text file in repository root pointing to the most recent release tarball URL.

**Attributes**:
- **Filename**: `LATEST_RELEASE.txt` (repository root)
- **Format**: Plain text (single line)
- **Content**: HTTPS URL to tarball asset on GitHub
- **Example**: `https://github.com/owner/repo/releases/download/v1.2.3/claude-docs-cli-1.2.3.tgz`
- **Updated by**: github-actions[bot] after release creation
- **Committed to**: Main branch (with `[skip ci]` message)

**Lifecycle**:
1. Created/updated by workflow after successful release
2. Committed back to repository
3. Users read this file to determine latest installation URL
4. Overwritten on each release (always points to most recent)

**Validation Rules**:
- Must contain valid HTTPS URL
- URL must return 200 OK when fetched
- URL must point to a valid .tgz file
- File must be checked into repository (not gitignored)

---

### 5. Version Identifier (in package.json)

**Description**: Semantic version number stored in `package.json` serving as source of truth.

**Attributes**:
- **Format**: `MAJOR.MINOR.PATCH` (e.g., `"version": "1.2.3"`)
- **Updated by**: semantic-release during workflow
- **Source of truth**: All version numbers derive from this value

**Lifecycle**:
1. semantic-release reads current version from package.json
2. Analyzes commits since last tag to determine bump type
3. Calculates new version number
4. Updates package.json with new version
5. Commits change back to repository
6. Creates corresponding Git tag

**Validation Rules**:
- Must follow semantic versioning specification (MAJOR.MINOR.PATCH)
- MAJOR ≥ 0 (typically starts at 1.0.0 for production releases)
- MINOR ≥ 0
- PATCH ≥ 0
- Must increment by exactly 1 in one component per release
- Must match Git tag version (after `v` prefix is stripped)

---

### 6. Workflow Configuration (.github/workflows/release.yml)

**Description**: GitHub Actions workflow YAML defining release automation.

**Attributes**:
- **Trigger**: `push` to `main` branch
- **Concurrency group**: `release-main` (prevents overlapping releases)
- **Permissions**: `contents: write` (for pushing commits and creating releases)
- **Jobs**: Single job with sequential steps (install, test, build, version, release, commit)
- **Secrets used**: `GITHUB_TOKEN` (automatic), optionally `NPM_TOKEN` (if publishing to npm)

**Key Steps**:
1. Checkout code
2. Setup Node.js 22.x
3. Install dependencies with pnpm
4. Run quality gates (lint, type-check, test, build)
5. Run semantic-release (determines version, creates tag, generates changelog)
6. Build tarball with npm pack
7. Create GitHub Release with softprops/action-gh-release
8. Update LATEST_RELEASE.txt file
9. Commit reference file back to repository

**Validation Rules**:
- All quality gates must pass before release creation
- Concurrency group must prevent simultaneous runs
- Must have write permissions to repository

---

### 7. semantic-release Configuration (.releaserc.json or package.json)

**Description**: Configuration for semantic-release tool defining plugins and behavior.

**Attributes**:
- **Branches**: `["main"]` (only release from main branch)
- **Plugins**:
  - `@semantic-release/commit-analyzer` - Determines version bump from commits
  - `@semantic-release/release-notes-generator` - Generates changelog
  - `@semantic-release/npm` - Updates package.json (does NOT publish to npm registry)
  - `@semantic-release/github` - Creates GitHub Release
  - `@semantic-release/git` - Commits version bump back to repo
- **Commit message format**: Angular Conventional Commits
- **npmPublish**: `false` (we're not publishing to npm registry)

**Example Configuration** (in package.json):
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

---

## Entity Relationships

```
Git Commit (main branch)
  ↓ (triggers)
GitHub Actions Workflow
  ↓ (analyzes commits)
semantic-release
  ↓ (creates)
Git Tag (v1.2.3)
  ↓ (updates)
package.json (version: "1.2.3")
  ↓ (builds)
Tarball (claude-docs-cli-1.2.3.tgz)
  ↓ (creates with asset)
GitHub Release (v1.2.3)
  ↓ (URL extracted)
LATEST_RELEASE.txt (URL to tarball)
```

---

## Data Flow

### Happy Path (Successful Release)

1. **Developer pushes commit** to main branch with conventional commit message (e.g., `feat: add new feature`)
2. **Workflow triggers** on push event
3. **Quality gates run** (lint, type-check, test, build) → all pass
4. **semantic-release analyzes** commits since last tag
5. **Version determined** (e.g., 1.2.3 → 1.3.0 for `feat:` commit)
6. **package.json updated** with new version
7. **Git tag created** (v1.3.0)
8. **Tarball built** (npm pack → claude-docs-cli-1.3.0.tgz)
9. **GitHub Release created** with tarball asset attached
10. **LATEST_RELEASE.txt updated** with new tarball URL
11. **Changes committed** back to main branch with `[skip ci]` message
12. **Release complete** - users can now install via `npm install <latest-release-url>`

### Error Path (Failed Quality Gates)

1. **Developer pushes commit** with failing tests
2. **Workflow triggers** on push event
3. **Quality gates run** → test failure detected
4. **Workflow fails** immediately (stops before semantic-release)
5. **No release created** (version not bumped, no tag, no GitHub Release)
6. **Developer notified** via workflow failure notification
7. **Developer fixes tests** and pushes again
8. **Repeat from step 1**

---

## State Transitions

### Version Number State Machine

```
Initial State: 0.0.0 (not released)
  ↓
First Release: 1.0.0 (feat commit)
  ↓
Patch Release: 1.0.1 (fix commit)
  ↓
Minor Release: 1.1.0 (feat commit)
  ↓
Major Release: 2.0.0 (BREAKING CHANGE commit)
```

### Release Status State Machine

```
No Release Exists
  ↓ (quality gates pass + semantic-release runs)
Release Created (draft=false, prerelease=false)
  ↓ (manual deletion possible but discouraged)
Release Deleted (not part of normal workflow)
```

---

## Storage Locations

| Entity | Storage Location | Persistence |
|--------|------------------|-------------|
| Package Tarball | GitHub Release Assets (CDN) | Permanent (unless release deleted) |
| Git Tag | Git repository (remote origin) | Permanent (immutable) |
| GitHub Release | GitHub API (releases endpoint) | Permanent (unless manually deleted) |
| Reference File | Repository root (main branch) | Permanent (overwritten each release) |
| Version Number | package.json (main branch) | Permanent (updated each release) |
| Workflow Config | `.github/workflows/release.yml` | Permanent (version controlled) |
| semantic-release Config | package.json or `.releaserc.json` | Permanent (version controlled) |

---

## Notes

- **No database required**: All data is stored in Git, GitHub, and npm artifacts
- **No user-facing UI**: All interactions via GitHub web interface, Git CLI, and npm CLI
- **Immutability**: Tags and releases should not be modified after creation (append-only model)
- **Idempotency**: Running workflow multiple times for same commit should be safe (semantic-release handles duplicate detection)
- **Rollback strategy**: Install previous version via old release URL (no automated rollback in scope)
