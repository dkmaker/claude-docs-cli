# Implementation Plan: Documentation Download and Update Management

**Branch**: `003-doc-download-update` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-doc-download-update/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Port the documentation download and update management system from the existing bash script (`claude-docs.sh`) to Node.js/TypeScript. The system downloads 44 Claude Code documentation sections from official sources, manages updates with user review/approval workflow, implements intelligent caching for fast retrieval, and provides search capabilities. Key innovation: self-updating resource configuration fetched from GitHub with bundled fallback, ensuring users always have access to latest documentation URLs without manual configuration.

## Technical Context

**Language/Version**: TypeScript 5.4+ with Node.js 22.x LTS (Jod) - native type stripping for development
**Primary Dependencies**:
- Commander.js 14.0.2 (CLI framework, zero dependencies)
- NEEDS CLARIFICATION: HTTP client for downloading docs (node-fetch vs native fetch vs undici)
- NEEDS CLARIFICATION: Markdown processing library for MDX transformations (remark/unified ecosystem vs markdown-it vs custom parser)
- NEEDS CLARIFICATION: Diff generation library (diff npm package vs jsdiff vs native implementation)

**Storage**:
- File-based storage in `~/.claude-docs/` directory (constitution Principle IX)
- Subdirectories: `docs/` (downloaded markdown), `cache/` (processed content), `logs/` (operation logs)
- JSON for resource configuration and metadata
- Plain text for changelog

**Testing**: Vitest 2.0+ (TDD workflow with 100% pass rate requirement)

**Target Platform**: Cross-platform CLI (Linux, macOS, Windows) - Node.js 22+ LTS

**Project Type**: Single CLI application (no web/mobile components)

**Performance Goals**:
- Cold start <100ms for help command (constitution requirement)
- First documentation download <5 minutes for all 44 sections (success criteria SC-001)
- Cached document retrieval <100ms (success criteria SC-004)
- Search across all docs <1 second (success criteria SC-005)
- Cache hit rate >80% for typical usage (success criteria SC-003)

**Constraints**:
- Zero external dependencies beyond Commander.js (constitution Principle II)
- NEEDS CLARIFICATION: Acceptable dependencies for HTTP, markdown, diff (vs implementing from scratch)
- Must preserve exact markdown transformation output from bash implementation (success criteria SC-007)
- Data must be stored exclusively in `~/.claude-docs/` directory (constitution Principle IX)

**Scale/Scope**:
- 44 documentation sections across 8 categories
- ~5-10 MB total documentation size
- Support for concurrent downloads with progress tracking
- Retry logic (3 attempts, exponential backoff)
- Cache versioning system for invalidation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Node.js 22+ LTS targeted** - Using Node.js 22.x LTS (Jod) with native type stripping
✅ **Zero-dependency CLI (Commander.js only)** - Commander.js 14.0.2 as only production dependency
⚠️  **Additional dependencies need justification** - HTTP client, markdown processor, diff library (to be researched in Phase 0)
✅ **TypeScript with strict mode** - TypeScript 5.4+ with strict mode enabled
✅ **pnpm package manager configured** - Using pnpm v10+ per constitution
✅ **Biome for linting/formatting** - Already configured in project
✅ **ESM-only (no CommonJS)** - All code uses ES modules
✅ **Startup performance measured (<100ms target)** - Help command must be <100ms
✅ **TDD workflow followed (tests written first)** - Vitest with test-first approach
✅ **Vitest configured for testing** - Vitest 2.0+ already in project
✅ **100% test pass rate achieved** - All tests must pass before completion
✅ **Data directory standard (~/.claude-docs/) followed** - All data in `~/.claude-docs/` per Principle IX

**Violations Requiring Justification**:
- Additional production dependencies (HTTP client, markdown processor, diff library) - **NEEDS RESEARCH** to determine if zero-dependency alternatives exist or if these are justified exceptions

## Project Structure

### Documentation (this feature)

```text
specs/003-doc-download-update/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── commands/
│   ├── update-command.ts      # Update check, commit, discard, status subcommands
│   ├── get-command.ts          # Retrieve documentation with transformations
│   ├── list-command.ts         # List all docs or specific doc structure
│   ├── search-command.ts       # Search across documentation
│   └── cache-command.ts        # Cache management (clear, info, warm)
├── lib/
│   │── doc-downloader.ts       # Download documentation from URLs with retry
│   ├── doc-differ.ts           # Generate diffs between versions
│   ├── markdown-transformer.ts # MDX transformations (callouts, cards, tabs, etc.)
│   ├── resource-loader.ts      # Load resource config (remote with fallback)
│   ├── cache-manager.ts        # Cache validation, read/write, statistics
│   ├── changelog-manager.ts    # Generate and maintain changelog
│   └── search-engine.ts        # Search implementation
├── utils/
│   ├── file-ops.ts             # File operations (existing)
│   ├── logger.ts               # Logging (existing)
│   ├── http-client.ts          # HTTP download with retry logic
│   └── path-resolver.ts        # Resolve ~/.claude-docs/ paths
├── types/
│   ├── index.ts                # Existing types
│   ├── config.ts               # Existing config types
│   ├── output.ts               # Existing output types
│   └── documentation.ts        # New: Resource config, section, cache metadata types
└── cli.ts                      # Main CLI entry point (existing)

tests/
├── unit/
│   ├── doc-downloader.test.ts
│   ├── markdown-transformer.test.ts
│   ├── resource-loader.test.ts
│   ├── cache-manager.test.ts
│   └── search-engine.test.ts
├── integration/
│   ├── update-workflow.test.ts    # Full update check → commit workflow
│   ├── cache-lifecycle.test.ts    # Cache creation, validation, invalidation
│   └── search-integration.test.ts # End-to-end search
└── fixtures/
    ├── sample-docs/               # Sample markdown files for testing
    ├── sample-resource.json       # Test resource configuration
    └── transformed-output/        # Expected markdown transformation results

claude-docs-resources.json         # Resource configuration (root of repo, copied to src/ during build)
```

**Structure Decision**: Single CLI application structure (Option 1). This is a command-line tool with no web/mobile components. All source in `src/`, tests in `tests/`, following existing project structure. New `lib/` modules for documentation management, new command files for CLI subcommands, new types for documentation data structures.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional dependencies (HTTP, markdown, diff) | **PENDING RESEARCH** - Need to evaluate if zero-dependency implementations are feasible | Native fetch may be sufficient for HTTP; markdown/diff complexity needs evaluation |

**Research Required (Phase 0)**:
1. Can we use native Node.js `fetch` API instead of external HTTP client?
2. Is implementing markdown MDX transformations from scratch feasible, or do we need remark/unified?
3. Can we implement diff generation in ~100 lines, or should we use a library?
4. What are the performance/maintenance tradeoffs for each approach?

If research shows that production dependencies are needed beyond Commander.js, we must justify each one against constitution Principle II (Zero-Dependency CLI Core).
