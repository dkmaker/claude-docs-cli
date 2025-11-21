---
allowed-tools: Bash(git:*)
description: Commit pending changeset files
---

# Commit Changesets

You are helping the user commit their pending changeset files.

## Context

**Git status:**
!`git status --short`

**Pending changesets:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md`

**Current branch:**
!`git branch --show-current`

## Your Task

### 1. Check for Changeset Files

- Look for uncommitted changeset files in `.changeset/` directory
- If no changeset files found, inform user and suggest running `/change:changeset` first

### 2. Verify Changesets are Uncommitted

- Check git status for new/modified `.changeset/*.md` files
- If changesets are already committed, inform user they're done

### 3. Commit the Changesets

If changeset files exist and are uncommitted:

```bash
git add .changeset/
git commit -m "chore: add changeset for <describe-changes>"
```

- Auto-generate commit message by reading the changeset file(s)
- Use format: `"chore: add changeset for <brief-description>"`
- Example: `"chore: add changeset for command namespace reorganization"`

### 4. Confirm and Show Next Steps

Tell the user:
- ✅ Changeset committed
- Next: Run `/change:version` to preview the release
- Or: Continue making changes and add more changesets

## Important Notes

- Only commit `.changeset/*.md` files (not other changes)
- Don't push automatically - user might want to add more changesets
- If multiple changesets exist, mention them all in commit message
- Keep commit message concise

## Example Output

```
✅ Changeset committed!

Committed files:
- .changeset/reorganize-change-commands.md

Commit message:
"chore: add changeset for command namespace reorganization"

Next steps:
- Add more changes? Run /change:changeset
- Preview version? Run /change:version
- Ready to release? Run /change:release
```
