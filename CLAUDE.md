# claude-docs-cli Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-21

## Active Technologies
- TypeScript 5.4+ targeting Node.js 22.x LTS (Jod) with native type stripping
- Commander.js 14.0.2 (CLI framework, zero-dependency)
- diff 8.0.2 (unified diff generation, zero transitive dependencies)
- Vitest 4.0.12 (testing framework)
- Node.js native fetch() for HTTP (zero dependencies)
- Custom markdown transformations (zero dependencies)

## Project Structure

```text
src/
  commands/       # CLI command implementations
  lib/            # Core libraries (cache, download, search, etc.)
  types/          # TypeScript type definitions
  utils/          # Utilities (config, env, paths, http-client)
tests/
  unit/           # Unit tests for all modules
  integration/    # Integration tests (placeholder)
dist/             # Build output
specs/            # Feature specifications and design docs
```

## Key Modules

- `src/lib/resource-loader.ts` - Documentation URL configuration management
- `src/lib/doc-downloader.ts` - Documentation download with retry logic
- `src/lib/cache-manager.ts` - Intelligent caching system
- `src/lib/search-engine.ts` - Full-text search across documentation
- `src/lib/doc-differ.ts` - Diff generation for updates
- `src/lib/changelog-manager.ts` - Changelog tracking
- `src/lib/markdown-transformer.ts` - MDX to markdown conversion
- `src/commands/update-command.ts` - Complete update workflow
- `src/commands/get-command.ts` - Document retrieval
- `src/commands/list-command.ts` - Documentation listing
- `src/commands/search-command.ts` - Search functionality
- `src/commands/cache-command.ts` - Cache management

## Commands

```bash
npm test              # Run all tests
npm run test:coverage # Run tests with coverage
npm run lint          # Run linter
npm run build         # Build for production
npm run validate      # Run all checks (lint + type-check + test)
```

## Code Style

TypeScript 5.4+ with strict mode enabled. Follow standard conventions.

## Recent Changes
- 003-doc-download-update: Implemented complete documentation download and update management system with caching, search, and changelog tracking

- 002-dual-mode-output: Added dual-mode output system with logging and file operations

- 001-nodejs-cli-port: Added Node.js CLI foundation infrastructure

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
