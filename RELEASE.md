# Release Process

Quick guide for creating releases with Changesets + AI assistance.

## Complete AI-Assisted Release (5 Commands)

The entire release process is handled by AI:

```bash
# 1. Create changeset (AI analyzes your changes)
/change:changeset "description"

# 2. Commit changeset (AI commits it)
/change:commit

# 3. Preview version (AI shows what's pending)
/change:version

# 4. Create release PR (AI bumps version, creates PR)
/change:release

# 5. Merge and complete (AI checks tests, merges, cleans up)
/change:merge

# Or get smart guidance anytime
/change:help
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

## Release Flow (AI-Assisted)

### 1. Create Changeset
```bash
/change:changeset "Your change description"
```
→ AI analyzes git diff, determines version bump, creates changeset file

### 2. Commit Changeset
```bash
/change:commit
```
→ AI commits the changeset file with appropriate message

### 3. Preview Version
```bash
/change:version
```
→ AI reads changesets, calculates next version, shows preview

### 4. Create Release PR
```bash
/change:release
```
→ AI runs version bump, creates release branch, creates PR

### 5. Merge and Complete
```bash
/change:merge
```
→ AI checks PR status, merges, deletes branch, returns to main, monitors release

**Result**: Release v1.x.x published on GitHub with tarball and updated LATEST_RELEASE.txt

## Manual Alternative

If you prefer manual control:

```bash
# 1. Create changeset
pnpm changeset

# 2. Commit it
git add .changeset/ && git commit -m "Add changeset"

# 3. Create release
pnpm changeset version
git add . && git commit -m "chore: release"
git push origin main

# GitHub Actions handles the rest
```

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

| Command | Description | What It Does |
|---------|-------------|--------------|
| `/change:help` | Smart status analyzer | Analyzes repo state, guides next action |
| `/change:changeset` | Create changeset | AI analyzes changes, creates changeset file |
| `/change:commit` | Commit changesets | Commits changeset files with smart message |
| `/change:version` | Preview version bump | Shows next version and pending changes |
| `/change:release` | Create release PR | Bumps version, creates branch and PR |
| `/change:merge` | Merge and complete | Checks tests, merges PR, cleans up, monitors |

**Shortcuts**: If no conflicts, you can omit `/change:` prefix:
- `/help`, `/changeset`, `/commit`, `/version`, `/release`, `/merge`

---

**Need help?** Run `/change:help` in Claude Code for smart guidance based on your current state.
