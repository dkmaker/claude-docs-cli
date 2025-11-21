---
allowed-tools: Bash(git:*), Bash(gh:*), Bash(sleep:*), Read
description: Merge release PR and complete the release workflow
---

# Merge Release and Complete

You are helping the user merge their release PR and complete the release workflow.

## Context

**Current branch:**
!`git branch --show-current`

**Git status:**
!`git status --short`

**Open PRs:**
!`gh pr list --limit 5`

**Latest release:**
!`gh release list --limit 1`

## Your Task

### 1. Identify Release PR

- Check if we're on a release branch (contains "release-v")
- Or find the open release PR from `gh pr list` output
- Look for PR title containing "chore: release" or "version"

### 2. Verify PR is Ready

Before merging, check:
- PR exists and is open
- PR title indicates it's a release (contains "release" or "version")
- Get PR number

### 3. Check PR Status

```bash
gh pr checks <pr-number>
```

- Verify all checks have passed
- If checks are still running, wait and inform user
- If checks failed, show errors and STOP

### 4. Merge the PR

If all checks pass:

```bash
gh pr merge <pr-number> --squash --delete-branch
```

- Use squash merge to keep history clean
- Delete the release branch automatically
- Confirm merge was successful

### 5. Switch Back to Main and Pull

```bash
git checkout main
git pull origin main
```

- Switch to main branch
- Pull the merged changes
- Show new version

### 6. Monitor Release Workflow

After merge, the release workflow triggers:

```bash
# Wait a moment for workflow to start
sleep 5

# Check workflow status
gh run list --workflow=release.yml --limit 1
```

- Show workflow status (in_progress, queued, completed)
- Inform user that release is being created

### 7. Show Final Status

Display summary:
```
✅ Release PR Merged!

  Version: v1.1.1
  Branch: Deleted (release-v1.1.1)
  Current: main (up-to-date)

🚀 GitHub Actions is now creating the release...

  Status: in_progress
  View: gh run watch <run-id>

When complete, the release will be available at:
https://github.com/<owner>/<repo>/releases/tag/v1.1.1

You can check status anytime with:
gh release list
```

## Error Handling

**No release PR found:**
- Check if user needs to run `/change:release` first
- List open PRs to help user identify

**PR checks failing:**
- Show which checks failed
- Do NOT merge
- Suggest fixing issues and pushing to the PR branch

**Already on main branch:**
- No release branch to merge
- Check if there's an open release PR
- If yes, merge it remotely
- If no, inform user no release is pending

**Merge conflicts:**
- Show conflict details
- Suggest resolving manually
- Do not force merge

## Important Notes

- ALWAYS check PR status before merging
- NEVER merge if checks are failing
- Clean up branches automatically
- Return to main branch after merge
- Wait for workflow to show status

## Safety Checks

Before merging, verify:
1. ✅ PR exists
2. ✅ PR is a release PR (not a feature PR)
3. ✅ All CI checks passed
4. ✅ User confirmed (if needed)
