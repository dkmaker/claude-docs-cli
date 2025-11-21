# Quickstart: GitHub Tarball Deployment

**Date**: 2025-11-21
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

This quickstart guide provides a step-by-step overview of setting up and using the automated GitHub tarball deployment system.

---

## Prerequisites

- ✅ Node.js 22.x LTS installed
- ✅ pnpm package manager installed
- ✅ GitHub repository with Actions enabled
- ✅ Valid package.json with `name`, `version`, and `files` fields
- ✅ Existing test suite (runnable via `pnpm test`)
- ✅ Existing build process (runnable via `pnpm run build`)

---

## Setup (One-Time Configuration)

### 1. Install semantic-release Dependencies

```bash
pnpm add -D semantic-release @semantic-release/commit-analyzer @semantic-release/release-notes-generator @semantic-release/npm @semantic-release/git @semantic-release/github
```

### 2. Configure semantic-release

Add this configuration to your `package.json`:

```json
{
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      ["@semantic-release/npm", {
        "npmPublish": false
      }],
      "@semantic-release/github",
      ["@semantic-release/git", {
        "assets": ["package.json", "LATEST_RELEASE.txt"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }]
    ]
  }
}
```

**Important**: Set `"npmPublish": false` since we're not publishing to npm registry.

### 3. Create GitHub Actions Workflow

Create `.github/workflows/release.yml`:

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
          fetch-depth: 0  # Fetch all history for semantic-release
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run quality checks
        run: |
          pnpm run lint
          pnpm type-check
          pnpm test
          pnpm run build

      - name: Semantic Release
        id: semantic_release
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Get new version
        id: get_version
        run: echo "version=$(node -p "require('./package.json').version")" >> $GITHUB_OUTPUT

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

      - name: Update LATEST_RELEASE.txt
        if: steps.semantic_release.outputs.new_release_published == 'true'
        run: |
          TARBALL_URL="https://github.com/${{ github.repository }}/releases/download/v${{ steps.get_version.outputs.version }}/$(ls *.tgz)"
          echo "$TARBALL_URL" > LATEST_RELEASE.txt
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add LATEST_RELEASE.txt
          git commit -m "chore: update latest release URL [skip ci]"
          git push
```

### 4. Configure Repository Settings

Go to your repository settings:

1. **Settings** → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **"Read and write permissions"**
4. Check **"Allow GitHub Actions to create and approve pull requests"** (if needed)
5. Click **Save**

### 5. Initial Commit

Commit the workflow and configuration:

```bash
git add .github/workflows/release.yml package.json
git commit -m "feat: add automated release workflow"
git push origin main
```

---

## Usage (Daily Workflow)

### Making Changes

Use conventional commit messages when committing:

**Patch Release** (bug fixes):
```bash
git commit -m "fix: correct documentation search bug"
```

**Minor Release** (new features):
```bash
git commit -m "feat: add new search filter option"
```

**Major Release** (breaking changes):
```bash
git commit -m "feat!: redesign CLI interface

BREAKING CHANGE: The --output flag is now required for all commands."
```

**Non-Release Commits** (no version bump):
```bash
git commit -m "docs: update README examples"
git commit -m "chore: update dependencies"
git commit -m "test: add unit tests for search"
```

### Triggering a Release

Simply push to the main branch:

```bash
git push origin main
```

The workflow will:
1. ✅ Run all quality checks (lint, type-check, test, build)
2. ✅ Analyze commits to determine version bump
3. ✅ Update package.json with new version
4. ✅ Create Git tag (e.g., v1.2.3)
5. ✅ Build tarball (e.g., claude-docs-cli-1.2.3.tgz)
6. ✅ Create GitHub Release with tarball asset
7. ✅ Update LATEST_RELEASE.txt with tarball URL
8. ✅ Commit reference file back to repository

### Monitoring Releases

**View Workflow Status**:
- Go to repository → **Actions** tab
- Click on the latest **Release** workflow run
- Expand steps to see detailed logs

**View Releases**:
- Go to repository → **Releases**
- All published releases are listed with:
  - Version number (e.g., v1.2.3)
  - Release notes (auto-generated from commits)
  - Tarball asset (downloadable)

**Check Latest Release URL**:
```bash
cat LATEST_RELEASE.txt
# Output: https://github.com/owner/repo/releases/download/v1.2.3/claude-docs-cli-1.2.3.tgz
```

---

## Installation (End Users)

### Install Latest Version

```bash
npm install $(curl -s https://raw.githubusercontent.com/owner/repo/main/LATEST_RELEASE.txt)
```

### Install Specific Version

```bash
npm install https://github.com/owner/repo/releases/download/v1.2.3/claude-docs-cli-1.2.3.tgz
```

### Verify Installation

```bash
claude-docs --version
# Output: 1.2.3

claude-docs --help
# Output: CLI help text
```

---

## Troubleshooting

### Workflow Failed at Quality Checks

**Symptom**: Workflow stops before creating release, shows red X in Actions tab.

**Cause**: Tests, linting, type-checking, or build failed.

**Solution**:
1. Click on failed workflow run to see error details
2. Fix the issue locally
3. Run quality checks locally to verify fix:
   ```bash
   pnpm run lint
   pnpm type-check
   pnpm test
   pnpm run build
   ```
4. Commit and push fix
5. Workflow will rerun automatically

---

### No Release Created (But Workflow Succeeded)

**Symptom**: Workflow shows green checkmark, but no new release appears.

**Cause**: No releasable commits since last release (only `chore:`, `docs:`, `test:` commits).

**Solution**: This is expected behavior. semantic-release only creates releases for `feat:`, `fix:`, or `BREAKING CHANGE:` commits. Next time you push a feature or fix, a release will be created.

---

### Permission Denied When Pushing Commits

**Symptom**: Workflow fails at "Update LATEST_RELEASE.txt" step with permission error.

**Cause**: GITHUB_TOKEN lacks write permissions.

**Solution**:
1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select **"Read and write permissions"**
3. Click **Save**
4. Rerun the workflow

---

### Duplicate Tag Error

**Symptom**: semantic-release fails with "tag already exists" error.

**Cause**: Workflow was rerun after successful release, or manual tag was created.

**Solution**:
1. Check existing tags: `git tag`
2. If duplicate tag is incorrect, delete it:
   ```bash
   git tag -d v1.2.3
   git push origin :refs/tags/v1.2.3
   ```
3. Delete corresponding GitHub Release if it exists
4. Rerun workflow

---

### LATEST_RELEASE.txt Not Updated

**Symptom**: LATEST_RELEASE.txt still points to old release.

**Cause**: Reference file commit failed (network issue, branch protection, permissions).

**Solution**:
1. Manually update file:
   ```bash
   echo "https://github.com/owner/repo/releases/download/v1.2.3/pkg-1.2.3.tgz" > LATEST_RELEASE.txt
   git add LATEST_RELEASE.txt
   git commit -m "chore: update latest release URL [skip ci]"
   git push
   ```
2. Or rerun the workflow (if workflow was cancelled before commit step)

---

### Installation Fails with 404 Error

**Symptom**: `npm install <tarball-url>` returns 404 Not Found.

**Cause**: URL in LATEST_RELEASE.txt is incorrect or release was deleted.

**Solution**:
1. Go to repository **Releases** page
2. Find the correct release
3. Right-click tarball asset → Copy link address
4. Update LATEST_RELEASE.txt with correct URL
5. Or install directly from copied URL

---

## Best Practices

### Commit Message Guidelines

✅ **Good commit messages**:
```bash
feat: add search pagination
fix: resolve cache invalidation bug
docs: update installation instructions
chore: upgrade dependencies
test: add integration tests for API
```

❌ **Bad commit messages**:
```bash
Update stuff
Fixed it
WIP
Changes
```

### Release Frequency

- **Patch releases**: As needed for bug fixes (can be multiple per day)
- **Minor releases**: When new features are ready (weekly or bi-weekly)
- **Major releases**: When breaking changes are necessary (monthly or quarterly)

### Testing Before Push

Always run quality checks locally before pushing:

```bash
pnpm run validate  # Runs lint, type-check, test, build
```

### Monitoring Workflow Runs

- Subscribe to workflow notifications: **Repository** → **Watch** → **Custom** → **Actions**
- Add release badge to README:
  ```markdown
  ![Release](https://github.com/owner/repo/workflows/Release/badge.svg)
  ```

---

## Advanced Usage

### Skipping CI

If you need to push without triggering a release (rare):

```bash
git commit -m "docs: update README [skip ci]"
```

### Manual Release Trigger

Add `workflow_dispatch` to trigger manually:

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # Allows manual trigger from Actions tab
```

### Pre-Release Channels

To support beta releases, update semantic-release config:

```json
{
  "release": {
    "branches": [
      "main",
      { "name": "beta", "prerelease": true }
    ],
    "plugins": [ /* ... */ ]
  }
}
```

Then push to `beta` branch for pre-releases (e.g., v1.2.3-beta.1).

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Install semantic-release | `pnpm add -D semantic-release @semantic-release/...` |
| Configure workflow | Create `.github/workflows/release.yml` |
| Trigger release | `git push origin main` |
| View releases | Go to repository **Releases** page |
| Install latest | `npm install $(curl -s .../LATEST_RELEASE.txt)` |
| Install specific version | `npm install https://github.com/.../v1.2.3/pkg-1.2.3.tgz` |
| Test locally | `pnpm run validate` |
| Check workflow status | Repository → **Actions** tab |

---

## Next Steps

After successful setup:

1. ✅ Make your first release by pushing a `feat:` or `fix:` commit
2. ✅ Verify release appears in **Releases** page
3. ✅ Test installation from LATEST_RELEASE.txt URL
4. ✅ Add release badge to README
5. ✅ Document installation instructions for end users
6. ✅ Set up branch protection rules (optional)
7. ✅ Configure Slack/email notifications for workflow failures (optional)

---

## Getting Help

- **Workflow logs**: Repository → Actions → Click on workflow run
- **semantic-release docs**: https://semantic-release.gitbook.io/
- **softprops/action-gh-release docs**: https://github.com/softprops/action-gh-release
- **Conventional Commits**: https://www.conventionalcommits.org/

---

**That's it!** Your automated release workflow is now operational. Every push to main with conventional commits will automatically create versioned releases with downloadable tarballs. 🎉
