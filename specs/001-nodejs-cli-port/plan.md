# Implementation Plan: Node.js CLI Port - Project Foundation

**Branch**: `001-nodejs-cli-port` | **Date**: 2025-11-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-nodejs-cli-port/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This phase establishes the foundational infrastructure for porting the claude-docs.sh bash script to Node.js. The focus is exclusively on project initialization: setting up TypeScript compilation, development tooling (linting, formatting, testing), basic CLI framework with command parsing, and ensuring the project can be built and executed successfully. No business logic from the bash script will be ported in this phase - only the skeleton infrastructure that enables future development.

**Primary Requirement**: Developers must be able to install dependencies, build the project, and execute a basic CLI that responds to `--version` and `--help` commands, all while maintaining zero linting/type errors.

**Technical Approach**: Follow the constitution's mandates for Node.js 22 LTS with native TypeScript support, Commander.js for CLI parsing, Biome for unified linting/formatting, Vitest for TDD, and pnpm for package management. The project will use ESM exclusively and optimize for fast startup times (<100ms).

## Technical Context

**Language/Version**: TypeScript 5.4+ targeting Node.js 22.x LTS (Jod) with native type stripping
**Primary Dependencies**: Commander.js (zero-dependency CLI framework)
**Storage**: File system only (reads claude-docs-urls.json, manages ~/.claude/docs/)
**Testing**: Vitest 2.0+ with TDD workflow (tests written first, 100% pass rate required)
**Target Platform**: Cross-platform CLI (Linux, macOS, Windows) - desktop development environments
**Project Type**: Single CLI project (not web/mobile)
**Performance Goals**: CLI startup <100ms (--help command <50ms), compilation <10 seconds
**Constraints**: Zero runtime dependencies beyond Commander.js, ESM-only, TypeScript strict mode
**Scale/Scope**: Single developer tool, ~44 documentation sections, local file operations, no network in this phase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research)

✅ **Node.js 22+ LTS targeted** - Using Node.js 22.x (Jod) LTS as minimum runtime
✅ **Zero-dependency CLI (Commander.js only)** - Commander.js is the only production dependency
✅ **TypeScript with strict mode** - TypeScript 5.4+ with strict: true configuration
✅ **pnpm package manager configured** - pnpm v10+ with .npmrc (save-exact, use-node-version)
✅ **Biome for linting/formatting** - Biome v1.9+ replaces ESLint + Prettier
✅ **ESM-only (no CommonJS)** - package.json has "type": "module", .js extensions in imports
✅ **Startup performance measured** - Target <100ms, benchmarking with `time` command
✅ **TDD workflow followed** - Tests written before implementation (Red-Green-Refactor)
✅ **Vitest configured for testing** - Vitest 2.0+ with native ESM/TypeScript support
⏳ **100% test pass rate achieved** - Not applicable yet (no tests exist in this phase)

**Violations**: None

**Notes**:
- Test pass rate will be verified after initial test suite is created
- Performance benchmarking will occur after basic CLI is executable
- TDD workflow begins with Phase 1 feature implementation (this phase sets up the testing infrastructure)

### Post-Design Check (After Phase 1)

✅ **Node.js 22+ LTS targeted** - Confirmed in research.md, tsconfig.json designed for Node 22
✅ **Zero-dependency CLI (Commander.js only)** - Confirmed v14.x, zero sub-dependencies
✅ **TypeScript with strict mode** - tsconfig.json with strict: true, all recommended strict flags
✅ **pnpm package manager configured** - .npmrc configured with save-exact, use-node-version
✅ **Biome for linting/formatting** - biome.json configuration designed, v1.9+
✅ **ESM-only (no CommonJS)** - package.json "type": "module", .js imports in research
✅ **Startup performance measured** - Performance benchmarks defined in quickstart.md (<50ms targets)
✅ **TDD workflow followed** - Test structure designed, tests/ mirrors src/, TDD cycle documented
✅ **Vitest configured for testing** - vitest.config.ts designed with coverage thresholds
⏳ **100% test pass rate achieved** - Will be verified during implementation

**Violations**: None

**Additional Notes Post-Design**:
- All configuration files have been specified (tsconfig.json, biome.json, vitest.config.ts)
- CLI interface contract defined with performance requirements
- Quickstart guide documents TDD workflow
- Data model is minimal (infrastructure only, no business logic)
- All technologies researched with high confidence, sources documented

## Project Structure

### Documentation (this feature)

```text
specs/001-nodejs-cli-port/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - Technical decisions and sources
├── data-model.md        # Phase 1 output - Entity definitions (minimal for this phase)
├── quickstart.md        # Phase 1 output - Developer onboarding guide
├── contracts/           # Phase 1 output - CLI command contracts
│   └── cli-interface.md # Command signatures and help text
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── cli.ts                # Main entry point - CLI definition and command registration
├── commands/             # Command implementations (--version, --help in this phase)
│   ├── version.ts        # Version command handler
│   └── help.ts           # Help command handler (may be built into Commander)
├── lib/                  # Core library code (minimal in this phase)
│   └── logger.ts         # Colored console logging (INFO, SUCCESS, WARN, ERROR)
├── utils/                # Helper functions
│   └── config.ts         # Configuration constants (paths, version)
└── types/                # TypeScript type definitions
    └── index.ts          # Shared type definitions

tests/
├── cli.test.ts           # CLI entry point tests
├── commands/             # Command-specific tests
│   ├── version.test.ts   # Version command tests
│   └── help.test.ts      # Help command tests
└── lib/                  # Library tests
    └── logger.test.ts    # Logger functionality tests

dist/                     # Compiled JavaScript output (gitignored)
├── cli.js                # Compiled entry point with shebang
├── cli.js.map            # Source map
└── [mirror of src/]      # Compiled versions of all source files

# Configuration files (root)
package.json              # Project metadata, scripts, dependencies
pnpm-lock.yaml           # Locked dependency versions
tsconfig.json            # TypeScript compiler configuration
biome.json               # Biome linting/formatting rules
vitest.config.ts         # Vitest test runner configuration
.npmrc                   # pnpm configuration
.gitignore               # Git ignore patterns
README.md                # Installation and usage documentation
```

**Structure Decision**: Using standard single CLI project layout as defined in the constitution. The `src/` directory contains all TypeScript source code organized by function (cli, commands, lib, utils, types). The `tests/` directory mirrors the `src/` structure for easy test discovery. Build output goes to `dist/` which is gitignored. This structure supports the zero-dependency CLI mandate and enables clear separation of concerns for future expansion.

**Rationale for directories**:
- `src/cli.ts`: Single entry point makes startup time optimization easier
- `src/commands/`: Enables future expansion with additional commands (update, get, list, etc.)
- `src/lib/`: Shared utilities used across commands (logger is first, file ops come later)
- `src/utils/`: Configuration and helper functions
- `src/types/`: Centralized type definitions for type safety
- `tests/`: Parallel structure to `src/` follows Vitest best practices

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

**Analysis**: This foundation phase has zero constitution violations. All principles are followed:
- Node.js 22 LTS with native TypeScript execution
- Commander.js is zero-dependency
- Biome replaces ESLint + Prettier ecosystem
- pnpm with exact version pinning
- ESM-only modules
- TDD workflow with Vitest
- Performance optimizations planned from the start

No complexity justification required.
