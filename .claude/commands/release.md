---
allowed-tools: Bash(git:*), Bash(pnpm:*), Bash(gh:*), Read
description: Prepare and create a release (runs version bump and creates PR)
---

# Prepare Release

You are helping the user prepare a release using Changesets. This command guides the release process.

## Context

**Pending changesets:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md | wc -l` changesets ready

**Changeset files:**
!`ls -1 .changeset/*.md 2>/dev/null | grep -v README.md`

**Current version:**
!`node -p "require('./package.json').version"`

**Current branch:**
!`git branch --show-current`

**Git status:**
!`git status --short`

## Your Task

Follow this workflow to prepare a release:

### 1. Check Prerequisites

- Verify there are pending changeset files (in `.changeset/` directory)
- Verify we're on a clean working directory or acceptable branch
- If no changesets exist, inform user and suggest creating one with `/changeset` first

### 2. Preview Version Bump

Run `pnpm changeset version` in dry-run mode (if available) or explain what will happen:
- Read the changeset files to show what changes will be included
- Determine the new version number based on bump types

### 3. Apply Version Bump

If user confirms:
- Run `pnpm changeset version` to:
  - Update package.json with new version
  - Update CHANGELOG.md
  - Delete consumed changeset files
- Show the user what version will be released

### 4. Create Release Branch and PR

- Create a new branch: `release-v<new-version>`
- Commit the version bump changes
- Push the branch
- Create a PR using `gh pr create` with:
  - Title: "chore: release v<new-version>"
  - Body: Include the changelog entries
  - Labels: "release"

### 5. Explain Next Steps

Tell the user:
- The PR has been created
- When they merge this PR to main, the GitHub Actions workflow will:
  - Run quality gates
  - Create a GitHub Release
  - Upload tarball
  - Update LATEST_RELEASE.txt
- Provide the PR URL

## Important Notes

- If already on main branch, warn user and suggest working from a feature branch
- If there are uncommitted changes, ask user what to do
- Always preview changes before applying
- Create meaningful PR descriptions with changelog content
- Ensure GITHUB_TOKEN has correct permissions (mention if PR creation fails)

## Error Handling

- If no changesets exist: Suggest running `/changeset` first
- If gh CLI not authenticated: Suggest running `gh auth login`
- If working directory not clean: Suggest committing or stashing changes
