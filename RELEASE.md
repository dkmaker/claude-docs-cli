# Release Process

Quick guide for creating releases with Changesets + AI assistance.

## Quick Commands

```bash
# Create a changeset (AI-assisted in Claude Code)
/changeset

# Preview what's cooking
/version

# Create release PR
/release
```

## Manual Testing (Local)

```bash
# See pending changesets
ls .changeset/*.md

# Preview version bump
pnpm changeset status

# Test version bump locally (doesn't commit)
pnpm changeset version

# Reset if you want to undo
git restore package.json CHANGELOG.md .changeset/
```

## Release Flow

### 1. After Making Changes

```bash
# Option A: AI-assisted (in Claude Code)
/changeset "Your change description"

# Option B: Manual
pnpm changeset
# Select: minor/patch/major
# Write: Summary of changes
```

Result: Creates `.changeset/some-name-123.md`

### 2. Check What's Pending

```bash
# Option A: AI preview (in Claude Code)
/version

# Option B: Manual
pnpm changeset status
# Shows: Current version → Next version
```

### 3. Create Release

```bash
# Option A: AI-assisted (in Claude Code)
/release
# Creates release branch + PR automatically

# Option B: Manual
pnpm changeset version    # Bump version
git add .
git commit -m "chore: release v1.2.3"
git push origin main
```

### 4. Merge PR

When the PR is merged to `main`, GitHub Actions automatically:
1. ✅ Runs quality gates
2. ✅ Creates GitHub Release
3. ✅ Uploads tarball
4. ✅ Updates LATEST_RELEASE.txt

## View Releases

- **GitHub**: https://github.com/OWNER/REPO/releases
- **Latest URL**: `cat LATEST_RELEASE.txt`
- **CLI**: `gh release list`

## Testing the Workflow

### Test 1: Create a Changeset

```bash
# Make a small change
echo "# Test" >> test.md

# Create changeset
/changeset "test changeset creation"

# Verify
cat .changeset/*.md  # Should show your changeset
```

### Test 2: Preview Version

```bash
/version
# Should show: 1.0.0 → 1.0.1 (or similar)
```

### Test 3: Full Release (Dry Run)

```bash
# Create test changeset
pnpm changeset
# Select: patch
# Summary: "test release workflow"

# Preview changes
pnpm changeset version  # This WILL modify files

# Check what changed
git diff package.json CHANGELOG.md

# Reset (don't actually release)
git restore package.json CHANGELOG.md .changeset/
```

### Test 4: Actual Release (When Ready)

```bash
/release
# Or manually:
# 1. pnpm changeset version
# 2. git add . && git commit -m "chore: release"
# 3. git push origin main
```

## Troubleshooting

**No changesets pending?**
```bash
ls .changeset/*.md  # Check if any exist (besides README.md)
```

**Want to see what version will be?**
```bash
/version  # AI preview
# or
pnpm changeset status  # Manual check
```

**Need to reset a version bump?**
```bash
git restore package.json CHANGELOG.md .changeset/
```

**Release workflow failed?**
- Check GitHub Actions tab
- Verify quality gates passed (lint, test, build)
- Check `gh` CLI is authenticated

## Version Bump Guide

- **patch** (1.0.0 → 1.0.1): Bug fixes
- **minor** (1.0.0 → 1.1.0): New features
- **major** (1.0.0 → 2.0.0): Breaking changes

## Tips

- ✅ Create changesets as you work (don't batch them)
- ✅ Write summaries for users, not developers
- ✅ Use `/version` to preview before releasing
- ✅ Multiple changesets = grouped into one release
- ✅ Changesets are consumed after version bump (deleted)

---

**Need help?** Run `/changeset`, `/version`, or `/release` in Claude Code for AI assistance.
