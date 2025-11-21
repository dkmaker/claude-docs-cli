# Implementation Plan: GitHub Tarball Deployment

**Branch**: `004-github-tarball-deploy` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-github-tarball-deploy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement automated GitHub Actions workflow that tests, builds, versions, and publishes the application as a tarball to GitHub Releases. Each push to the main branch triggers quality gates (tests, linting, type-checking, build), increments the version number, creates a Git tag, packages the application as a tarball, publishes it as a GitHub Release asset, and updates a reference file in the repository root pointing to the latest release URL. This enables npm installation directly from GitHub without requiring npm registry publishing.

## Technical Context

**Language/Version**: TypeScript 5.4+, Node.js 22.x LTS (existing project stack)
**Primary Dependencies**: GitHub Actions (workflow engine), npm (packaging), GITHUB_TOKEN (authentication)
**Storage**: GitHub Releases (tarball storage), Git tags (version tracking), repository root file (latest URL reference)
**Testing**: Vitest (existing test framework), npm scripts (integration with existing tests)
**Target Platform**: GitHub Actions runners (Ubuntu latest), compatible with Linux/macOS/Windows for npm installation
**Project Type**: Single project (CLI tool with GitHub Actions workflow)
**Performance Goals**: Release creation within 5 minutes of push, reference file update within 1 minute
**Constraints**: Must work within GitHub free tier (2000 minutes/month), workflow must not exceed 6 hours, tarball must be publicly accessible
**Scale/Scope**: Single monorepo, automated releases on main branch only, 1 workflow file, 1 reference file

**Research Topics Identified:**

1. **Version Bumping Strategy**: NEEDS CLARIFICATION - How to automatically increment semantic versions (conventional commits, npm version, manual in package.json, or third-party action)?
2. **Tarball Asset Upload**: NEEDS CLARIFICATION - Best practices for GitHub Release creation with asset uploads in Actions (actions/create-release deprecated, gh CLI, or softprops/action-gh-release)?
3. **Reference File Commit Strategy**: NEEDS CLARIFICATION - How to safely commit reference file back to repo from workflow (direct push to main, use PAT, or github-actions bot)?
4. **Concurrent Release Protection**: NEEDS CLARIFICATION - How to prevent race conditions when multiple pushes trigger overlapping workflows (concurrency groups, manual locking)?
5. **Quality Gate Integration**: How to run existing test/lint/build scripts in workflow and fail fast on errors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ Node.js 22+ LTS targeted (existing project)
✅ Zero-dependency CLI (Commander.js only) - no new production dependencies required
✅ TypeScript with strict mode (existing)
✅ pnpm package manager configured (existing)
✅ Biome for linting/formatting (existing)
✅ ESM-only (no CommonJS) (existing)
✅ Startup performance measured (<100ms target) - N/A for GitHub Actions workflow (runs in CI, not user-facing CLI)
✅ TDD workflow followed (tests written first) - workflow will be tested via GitHub Actions test runs
✅ Vitest configured for testing (existing)
✅ 100% test pass rate achieved - workflow includes quality gates that enforce test pass rate
✅ Data directory standard (~/.claude-docs/) followed - N/A for GitHub Actions (no local data storage)
✅ Dual-mode output (OutputFormatter) used - N/A for GitHub Actions (workflow output is for CI logs)

**Violations**: None

**Notes**:
- Startup performance, data directory standard, and dual-mode output principles do not apply to GitHub Actions workflows (infrastructure/CI, not user-facing CLI code)
- The workflow enforces existing project standards (tests must pass, build must succeed)
- No new production dependencies required (uses GitHub Actions, npm, and Git built-ins)

## Project Structure

### Documentation (this feature)

```text
specs/004-github-tarball-deploy/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── release.yml           # Main release workflow (tests, build, version, package, publish)

LATEST_RELEASE.txt            # Reference file with URL to latest tarball (committed by workflow)

# Existing structure (no changes)
src/
├── commands/
├── lib/
├── types/
└── utils/

tests/
├── unit/
└── integration/

package.json                  # Version source of truth (auto-incremented by workflow)
```

**Structure Decision**: Single project structure with GitHub Actions workflow added. The workflow file lives in `.github/workflows/` (GitHub standard). The reference file `LATEST_RELEASE.txt` is added to repository root for easy discovery. No changes to existing source code structure required - this is purely infrastructure/CI enhancement.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - table not applicable.
