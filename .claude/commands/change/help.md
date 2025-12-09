---
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(git:*), Bash(node:*), Read, Grep
description: Analyze release status and guide you through the next steps
---

# Release Status & Guidance

You are helping the user understand their current release status and what to do next.

## Context

**Current version:**
!`node -p "require('./package.json').version"`

**Current branch:**
!`git branch --show-current`

**Git status:**
!`git status --short`

**Pending changesets:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md | wc -l` changesets

**Changeset files:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md || echo "No changesets"`

**Recent commits:**
!`git log --oneline -5`

**Latest release:**
!`gh release list --limit 1 2>/dev/null || echo "No releases yet"`

## Your Task

Analyze the current state and provide clear, actionable guidance.

### 1. Analyze Current State

Check:
- **Are there uncommitted changes?** (from git status)
- **Are there pending changesets?** (count from ls output)
- **What branch are we on?** (main, feature branch, release branch?)
- **What's the current version?** (from package.json)
- **What was the last release?** (from gh release list)

### 2. Provide Status Summary

Display a clear status overview:

```
╔══════════════════════════════════════════════════════════╗
║           Release Status                                 ║
╚══════════════════════════════════════════════════════════╝

📦 Current Version: 1.1.0
🌿 Current Branch:  main
📝 Pending Changes: 3 changesets
🚀 Latest Release:  v1.1.0 (2 hours ago)

Status: Ready for new release
```

### 3. Determine Next Action

**IMPORTANT**: This repo has branch protection on `main`. You MUST use PRs.

Based on the state, tell the user what to do:

**Scenario A: On feature branch with changes, no changeset**
- Detected: Not on main, modified files, 0 changesets
- Action: "Create a changeset, commit it, then create PR to main"
- Steps:
  1. `/change:changeset` - Create changeset
  2. `git add .changeset/ && git commit -m "chore: add changeset"`
  3. `git push origin <branch-name>`
  4. `gh pr create` - Create PR to main
  5. Merge PR when CI passes
  6. Changesets action will auto-create Version PR on main
  7. Merge Version PR to publish release

**Scenario B: On feature branch with changeset committed**
- Detected: Not on main, changeset exists, clean working tree
- Action: "Push branch and create PR to main"
- Steps:
  1. `git push origin <branch-name>`
  2. `gh pr create` - Create PR to main
  3. Merge PR when CI passes

**Scenario C: On main with pending changesets**
- Detected: On main, changesets exist
- Action: "Wait for or check Version Packages PR"
- Note: GitHub Action should auto-create Version PR
- Check: `gh pr list` to see if it exists
- Merge the Version PR to publish release

**Scenario D: Version Packages PR exists**
- Detected: PR title contains "version packages"
- Action: "Merge the Version PR to publish release"
- Note: This will trigger automatic release creation

**Scenario E: On main, no changesets, clean**
- Detected: On main, no changesets, no changes
- Action: "Create a feature branch for new work"
- Command: `git checkout -b feature/your-feature`

**Scenario F: Uncommitted changeset files**
- Detected: Changeset files in git status
- Action: "Commit your changeset"
- Command: `/change:commit`

### 4. Show Available Commands

List all release management commands:

```
Full Release Workflow (with Branch Protection):
------------------------------------------------
Step 1: /change:changeset  - Create changeset for your changes
Step 2: /change:commit     - Commit changeset files
Step 3: git push + PR      - Push feature branch, create PR to main
Step 4: Merge PR           - Merge when CI passes
Step 5: Auto Version PR    - GitHub Action creates "Version Packages" PR
Step 6: /change:merge      - Merge Version PR to publish release

NOTE: Steps 3-5 involve GitHub PRs due to branch protection.
      You CANNOT push directly to main.

Available Commands:
-------------------
/change:help      - Show this status and guidance
/change:changeset - Create changeset (AI analyzes git diff)
/change:commit    - Commit changeset files
/change:version   - Preview what version bump will occur
/change:merge     - Merge Version Packages PR (final step)
```

### 5. Read Pending Changesets (If Any)

If changesets exist:
- Read each changeset file (use Read tool)
- Show what changes are pending:
  ```
  Pending Changesets:
  ------------------
  1. minor: Add new search feature (changeset-abc-123.md)
  2. patch: Fix documentation bug (fix-docs-456.md)

  Next version will be: 1.2.0
  ```

### 6. Check Recent Release Activity

If LATEST_RELEASE.txt exists:
- Read the file
- Show the download URL
- Verify it matches the latest release from `gh release list`

## Visual Workflow

Show this diagram to explain the process:

```
┌─────────────────────────────────────────────────────────────┐
│  Release Workflow (Branch Protection Enabled)               │
└─────────────────────────────────────────────────────────────┘

Feature Branch:
  1. Make changes
  2. /change:changeset        ← Create changeset
  3. /change:commit           ← Commit changeset
  4. git push origin branch   ← Push to GitHub
  5. gh pr create             ← Create PR to main
     └─→ CI runs (lint, test, build)
  6. Merge PR                 ← Merge when green ✓

Main Branch (automatic):
  7. GitHub Action detects changeset
  8. Action creates "Version Packages" PR
     └─→ Bumps version, updates CHANGELOG
  9. /change:merge            ← Merge Version PR
     └─→ Creates GitHub Release automatically

Published! 🎉
```

## Important Notes

- Be conversational and helpful
- **Always mention branch protection** when on feature branch
- Explain that `/change:release` is NOT needed (GitHub Action handles it)
- Show actual file names and versions (not placeholders)
- If confused, show the status and let user decide
- Link related commands together

## Example Output Format

```
╔══════════════════════════════════════════════════════════╗
║  Release Status & Next Steps                            ║
╚══════════════════════════════════════════════════════════╝

📊 Current State:
  • Version: 1.1.0
  • Branch: feature/new-search
  • Changesets: 2 pending
  • Uncommitted: 5 files

📝 Pending Changesets:
  1. minor: Add search pagination
  2. patch: Fix cache invalidation

🎯 Next Action:

  You have uncommitted changes. Commit them first:

  git add .changeset/
  git commit -m "Add changesets for search improvements"
  git push

  Then run: /change:version to preview the release

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Quick Reference (Full Workflow):
   /change:changeset - Create changeset
   /change:commit    - Commit changeset
   /change:version   - Preview version
   /change:release   - Create release PR
   /change:merge     - Merge and complete
```
