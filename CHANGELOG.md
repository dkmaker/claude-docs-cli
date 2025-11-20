# Changelog

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
