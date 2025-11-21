# Release Process

Quick guide for creating releases with Changesets + AI assistance.

## Quick Commands

```bash
# Get status and guidance (smart helper)
/change:help

# Create a changeset (AI-assisted)
/change:changeset "your change description"

# Preview what's cooking
/change:version

# Create release PR
/change:release
```

**Note**: Commands are namespaced under `/change:` but also work without prefix if no conflicts exist.

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
/change:changeset "Your change description"

# Option B: Manual
pnpm changeset
# Select: minor/patch/major
# Write: Summary of changes
```

Result: Creates `.changeset/some-name-123.md`

### 2. Check What's Pending

```bash
# Option A: Smart helper (in Claude Code)
/change:help
# Analyzes your status and tells you what to do

# Option B: Preview version (in Claude Code)
/change:version

# Option C: Manual
pnpm changeset status
# Shows: Current version → Next version
```

### 3. Create Release

```bash
# Option A: AI-assisted (in Claude Code)
/change:release
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

### Test 1: Get Help & Status

```bash
# Smart helper analyzes your current state
/change:help
# Shows: status, pending changesets, and what to do next
```

### Test 2: Create a Changeset

```bash
# Make a small change
echo "# Test" >> test.md

# Create changeset
/change:changeset "test changeset creation"

# Verify
cat .changeset/*.md  # Should show your changeset
```

### Test 3: Preview Version

```bash
/change:version
# Should show: 1.0.0 → 1.0.1 (or similar)
```

### Test 4: Full Release (Dry Run)

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

### Test 5: Actual Release (When Ready)

```bash
/change:release
# Or manually:
# 1. pnpm changeset version
# 2. git add . && git commit -m "chore: release"
# 3. git push origin main
```

## Troubleshooting

**Not sure what to do next?**
```bash
/change:help  # AI analyzes your state and guides you
```

**No changesets pending?**
```bash
ls .changeset/*.md  # Check if any exist (besides README.md)
```

**Want to see what version will be?**
```bash
/change:version  # AI preview
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

## Command Reference

All commands are under the `/change:` namespace:

| Command | Description | When to Use |
|---------|-------------|-------------|
| `/change:help` | Analyze status and guide next steps | When you're not sure what to do |
| `/change:changeset` | Create a changeset with AI | After making code changes |
| `/change:version` | Preview version bump | Before creating release |
| `/change:release` | Create release PR | When ready to release |

**Shortcuts**: If no conflicts, you can omit `/change:` prefix:
- `/help` → `/change:help`
- `/changeset` → `/change:changeset`
- `/version` → `/change:version`
- `/release` → `/change:release`

---

**Need help?** Run `/change:help` in Claude Code for smart guidance based on your current state.
