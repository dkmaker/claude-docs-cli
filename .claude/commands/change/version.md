---
allowed-tools: Bash(ls:*), Bash(cat:*), Bash(node:*), Read
description: Preview what version bump will happen from pending changesets
---

# Preview Version Bump

You are helping the user preview what version bump will occur based on pending changesets.

## Context

**Current version:**
!`node -p "require('./package.json').version"`

**Pending changesets:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md`

## Your Task

1. **Check for pending changesets**:
   - If no changesets exist, inform user
   - Suggest creating one with `/changeset` if needed

2. **Analyze each changeset file**:
   - Read each changeset file (use Read tool on each file from the list above)
   - Extract the bump type (major/minor/patch) from the frontmatter
   - Extract the summary/description

3. **Calculate new version**:
   - Determine highest bump type across all changesets:
     - If any `major`: next major version (e.g., 1.2.3 → 2.0.0)
     - Else if any `minor`: next minor version (e.g., 1.2.3 → 1.3.0)
     - Else: next patch version (e.g., 1.2.3 → 1.2.4)

4. **Display preview**:
   Show the user:
   - Current version → New version
   - List of all changes grouped by bump type:
     ```
     Version Bump Preview
     ====================
     Current: 1.2.3
     Next:    1.3.0

     Changes (2 changesets):

     Minor Changes:
     - Add new search filter option

     Patch Changes:
     - Fix documentation rendering bug
     ```

5. **Explain impact**:
   - What the version change means
   - What will be included in the changelog
   - That running `/release` will apply this version bump

## Important Notes

- Parse the YAML frontmatter correctly from changeset files
- Handle case where changesets directory is empty
- Explain semantic versioning if user seems confused
- Don't actually modify any files - this is preview only

## Example Changeset File Format

```markdown
---
"claude-docs": minor
---

Add new search filter option that allows filtering by date range.
```
