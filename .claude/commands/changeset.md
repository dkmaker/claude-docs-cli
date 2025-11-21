---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(pnpm:*), Write
description: Create a changeset for pending changes with AI assistance
argument-hint: [change-description]
---

# Create Changeset with AI Assistance

You are helping the user create a changeset for their pending changes using the Changesets tool.

## Context

**Current git status:**
!`git status --short`

**Recent changes (staged and unstaged):**
!`git diff HEAD --stat`

**Recent commits on current branch:**
!`git log --oneline -5`

**Current branch:**
!`git branch --show-current`

## Your Task

1. **Analyze the changes**: Review the git diff and status to understand what changed
2. **Determine bump type**: Based on the changes, determine if this should be:
   - `major` - Breaking changes (incompatible API changes)
   - `minor` - New features (backwards-compatible functionality)
   - `patch` - Bug fixes (backwards-compatible fixes)

3. **Write meaningful summary**: Create a human-friendly summary (2-4 sentences) that explains:
   - What changed
   - Why it changed
   - Any important details users should know

4. **Create the changeset file**: Use the Write tool to create a changeset file:
   - File path: `.changeset/<unique-id>.md` (use a short descriptive ID like "add-search-feature")
   - Format:
   ```markdown
   ---
   "claude-docs": <bump-type>
   ---

   <your-summary-here>
   ```

5. **Confirm creation**: Let the user know the changeset was created and show them the summary

## Additional Context from User

$ARGUMENTS

## Important Notes

- If no changes are detected, inform the user
- Choose bump types conservatively - when in doubt, use `patch` or `minor`
- Write summaries for end users, not just developers
- Keep summaries concise but informative
- Use present tense ("Add feature X" not "Added feature X")
