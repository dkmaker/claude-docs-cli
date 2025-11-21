# Changelog

## 1.2.4

### Patch Changes

- f17c4f2: Complete CLI fixes and quality improvements. Fix TypeScript errors in test files (35 errors across 4 files), remove continue-on-error from type-checking in PR workflow to properly enforce quality gates, and refactor release workflow to use GitHub API for latest release discovery instead of committing LATEST_RELEASE.txt (resolves branch protection conflicts). Quality gates now fully block PRs with type errors, linting issues, test failures, or build errors.

## 1.2.3

### Patch Changes

- 06cbb39: Fix CLI not executing when installed globally via npm. Remove conditional import.meta.url check that prevented the main function from running when the CLI was invoked through the npm bin symlink. The CLI now executes properly when installed with `npm install -g` and run as `claude-docs` command.

## 1.2.2

### Patch Changes

- 8b46ca4: Fix CLI not executing when installed globally via npm. Remove conditional import.meta.url check that prevented the main function from running when the CLI was invoked through the npm bin symlink. The CLI now executes properly when installed with `npm install -g` and run as `claude-docs` command.

## 1.2.1

### Patch Changes

- 42e54e3: Optimize package distribution and fix installation errors. Move zod from devDependencies to dependencies to resolve ERR_MODULE_NOT_FOUND errors when installing from tarball. Add files field to package.json to exclude unnecessary files (source maps, TypeScript declarations, specs, tests), reducing package size from 298 KB to 45 KB (85% reduction). The optimized package now includes only runtime JavaScript files, the resources configuration, and documentation.

## 1.2.0

### Minor Changes

- 776198f: Implement beautiful CLI output with zero-dependency Unicode rendering and multi-mode support. User mode now features gradient ASCII art welcome screen, Unicode box-drawing for tables and headers (╔═══╗ ┌─┐ ╭─╮), perfectly aligned columns, and visual hierarchy with colored text. AI mode provides clean markdown tables optimized for LLM parsing with command examples and stale data warnings. Adds `--output json` flag for programmatic consumption. All rendering uses a 3-layer architecture (Data → Renderer → Output) with structured JSON internally, enabling consistent output across all modes. Commands `list`, `get`, `search`, and `doctor` now return beautifully formatted results with auto-sizing boxes, category organization, and contextual tips. Zero new dependencies - all visual enhancements use native Unicode characters and ANSI escape codes.

## 1.1.1

### Patch Changes

- ebf4092: Reorganize release management commands into `/change:` namespace for better discoverability and organization. All release-related commands (`changeset`, `version`, `release`) are now grouped under the `change/` directory and accessible via `/change:commandname`. Adds new `/change:help` command that intelligently analyzes repository state and guides users through the release workflow. Commands still work with shortcut syntax (`/changeset`, `/version`, `/release`) when no conflicts exist. Updated RELEASE.md documentation to reflect the new namespace structure.

## 1.1.0

### Minor Changes

- a4ae91f: Implement Changesets-based release workflow with AI-assisted management. Replaces semantic-release with Changesets for better developer control over version bumps and changelog quality. Adds three custom slash commands (`/changeset`, `/version`, `/release`) that use AI to analyze changes, determine version bumps, and create release PRs automatically. The GitHub Actions workflow now uses official `gh` CLI instead of third-party actions, minimizing external dependencies. Users can now preview releases, group multiple changes, and maintain human-readable changelogs while still benefiting from full automation.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-20

### Added

- **Project Foundation**: Complete Node.js CLI infrastructure

  - TypeScript 5.4+ with strict mode and ESM support
  - Commander.js v14 for CLI argument parsing
  - Biome v1.9 for unified linting and formatting
  - Vitest v4 for testing with TDD workflow
  - pnpm v10+ package management with strict configuration

- **Development Tools**:

  - Automated code quality checks (lint, format, type-check)
  - Comprehensive test suite with 100% coverage
  - Performance benchmarking (--version and --help <50ms)
  - Development scripts for TDD workflow

- **CLI Features**:

  - `--version` / `-v`: Display version information
  - `--help` / `-h`: Display help information
  - Command registration system with argument parsing
  - Auto-generated help text for all commands
  - Error handling for unknown commands
  - Default help display when no arguments provided

- **Code Quality**:

  - Zero warnings or errors in all checks
  - 100% test pass rate
  - ESM-only modules
  - Cross-platform support (Linux, macOS, Windows)

- **Documentation**:
  - Comprehensive README with setup and usage instructions
  - Code quality workflow documentation
  - Command registration pattern guide
  - Development workflow guide

### Technical Details

- Node.js 22.x LTS (Jod) minimum runtime
- Commander.js as only production dependency
- All development tools configured and working
- TDD workflow with RED-GREEN-REFACTOR cycle
- Performance optimized (<50ms for basic commands)

### Notes

This is the **foundation release** providing the infrastructure for the CLI.
Business logic porting from the bash script will be added in subsequent releases.

[1.0.0]: https://github.com/user/claude-docs-cli/releases/tag/v1.0.0
