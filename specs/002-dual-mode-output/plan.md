# Implementation Plan: Dual-Mode Output System

**Branch**: `002-dual-mode-output` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/cp/code/dkmaker/claude-docs-cli/specs/002-dual-mode-output/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Phase 2 builds the core utility infrastructure for the claude-docs CLI, implementing a dual-mode output system that adapts behavior based on the user type (AI agent vs human developer). The system will provide markdown-formatted, minimal output for AI agents (CLAUDECODE=1) with only relevant commands, while offering rich, colorized, feature-complete output for human users. Core utilities include an enhanced logging system with configurable levels and async operation, file system operations with caching and integrity verification, and configuration loading with validation and defaults.

## Technical Context

**Language/Version**: TypeScript 5.4+ targeting Node.js 22.x LTS (Jod) with native type stripping
**Primary Dependencies**: Commander.js 14.0.2 (CLI framework, zero-dependency)
**Storage**: File system (configuration files, log files, cache directory)
**Testing**: Vitest 4.0.12 (modern test runner with native ESM/TypeScript support)
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows) via Node.js 22+
**Project Type**: Single project (CLI application)
**Performance Goals**:
- CLI startup time <100ms (cold start)
- Configuration loading <50ms
- File operations <100ms each
- Logging overhead <5ms per operation
- Handle 1000 file operations/second
**Constraints**:
- Zero-dependency CLI core (only Commander.js in production)
- Must work offline (no network dependencies for core functions)
- File system only (no external database)
- Async logging to avoid blocking
**Scale/Scope**:
- Single CLI application
- ~10-15 core utility functions
- 2 output modes (AI vs User)
- 4-5 configuration options
- Support for concurrent CLI invocations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **I. Modern Node.js LTS Foundation**: Node.js 22.x LTS targeted with native TypeScript support
✅ **II. Zero-Dependency CLI Core**: Commander.js only (zero sub-dependencies)
✅ **III. TypeScript-First Development**: TypeScript 5.4+ with strict mode, noEmit, verbatimModuleSyntax
✅ **IV. Package Manager Excellence**: pnpm v10+ configured with exact versions
✅ **V. Unified Tooling**: Biome v1.9+ for linting and formatting
✅ **VI. Native ES Modules**: ESM-only with explicit .js extensions in imports
✅ **VII. Performance & Startup Speed**: <100ms cold start target, lazy-loading for heavy operations
✅ **VIII. Test-Driven Development**: Vitest configured, TDD workflow to be followed, 100% pass rate required

**Violations**: None

**Status**: ✅ ALL GATES PASSED - Ready for Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
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
├── cli.ts                    # Main CLI entry point (existing)
├── commands/                 # Command implementations
│   └── test-command.ts       # Existing test command
├── lib/                      # Core library code
│   ├── logger.ts             # Existing basic logger (to be enhanced)
│   ├── output-formatter.ts   # NEW: Dual-mode output formatter
│   └── file-ops.ts           # NEW: File system operations
├── utils/                    # Helper functions
│   ├── config.ts             # Existing config (to be enhanced)
│   └── env.ts                # NEW: Environment variable detection
└── types/                    # TypeScript definitions
    ├── index.ts              # Existing type definitions
    ├── config.ts             # NEW: Configuration types
    └── output.ts             # NEW: Output mode types

tests/
├── unit/                     # Unit tests for utilities
│   ├── logger.test.ts        # NEW: Logger tests
│   ├── output-formatter.test.ts  # NEW: Output formatter tests
│   ├── file-ops.test.ts      # NEW: File operations tests
│   └── config.test.ts        # NEW: Configuration tests
├── integration/              # Integration tests
│   └── cli-modes.test.ts     # NEW: AI vs User mode integration tests
└── fixtures/                 # Test data
    └── configs/              # NEW: Sample configuration files
```

**Structure Decision**: Single project layout (Option 1) is appropriate for a CLI application. The project follows standard Node.js CLI conventions with clear separation between CLI interface (`src/cli.ts`, `src/commands/`), core logic (`src/lib/`), utilities (`src/utils/`), and type definitions (`src/types/`). Tests mirror the source structure with unit tests for individual modules and integration tests for end-to-end scenarios.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All constitution principles are followed in this implementation.
