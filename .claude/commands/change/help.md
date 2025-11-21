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

Based on the state, tell the user what to do:

**Scenario A: Working on changes, no changeset yet**
- Detected: Modified files, 0 changesets
- Action: "Create a changeset for your changes"
- Command: `/change:changeset "your change description"`

**Scenario B: Have changesets, ready to release**
- Detected: Pending changesets exist, clean working directory
- Action: "Preview and create release"
- Commands:
  1. `/change:version` (preview)
  2. `/change:release` (create PR)

**Scenario C: Changesets exist, uncommitted changes**
- Detected: Pending changesets + uncommitted changes
- Action: "Commit your changeset files first"
- Commands:
  ```bash
  git add .changeset/
  git commit -m "Add changesets"
  git push
  ```

**Scenario D: No changesets, clean working directory**
- Detected: No changesets, no uncommitted changes
- Action: "Make some changes first, then create a changeset"

**Scenario E: On a release branch**
- Detected: Branch name contains "release"
- Action: "Merge your release PR to complete the release"

### 4. Show Available Commands

List all release management commands:

```
Available Commands:
-------------------
/change:help      - Show this help (analyze status)
/change:changeset - Create a changeset for your changes
/change:version   - Preview version bump
/change:release   - Prepare and create release PR

Or use shortcuts (if no conflicts):
/changeset, /version, /release, /help
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

## Important Notes

- Be conversational and helpful
- Prioritize the most likely next action
- Show actual file names and versions (not placeholders)
- If confused, show the status and let user decide
- Link related commands together (e.g., "after changeset, run version")

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
💡 Quick Reference:
   /change:changeset - Create new changeset
   /change:version   - Preview version bump
   /change:release   - Create release PR
```
