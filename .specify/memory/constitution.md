<!--
  SYNC IMPACT REPORT
  ==================
  Version Change: 1.2.0 → 1.3.0
  Last Amended: 2025-11-21

  Changes in v1.3.0:
  - Added Principle X: Dual-Mode Output (AI and Human Friendly)
  - ALL commands MUST use OutputFormatter for status/feedback messages
  - Supports CLAUDECODE=1 for AI-optimized output vs rich user output
  - Centralizes mode detection and formatting logic
  - Document content remains unformatted for piping/processing
  - Updated Compliance Review checklist to include OutputFormatter verification

  Principles:
  - I. Modern Node.js LTS Foundation (unchanged)
  - II. Zero-Dependency CLI Core (unchanged)
  - III. TypeScript-First Development (unchanged)
  - IV. Package Manager Excellence (pnpm) (unchanged)
  - V. Unified Tooling (Biome) (unchanged)
  - VI. Native ES Modules (unchanged)
  - VII. Performance & Startup Speed (unchanged)
  - VIII. Test-Driven Development (unchanged)
  - IX. Standard Data Directory (unchanged)
  - X. Dual-Mode Output (NEW in v1.3.0)

  Additional Sections:
  - Technology Stack Standards (unchanged)
  - Development Workflow (unchanged)
  - Project Structure (unchanged)

  Template Updates Required:
  ✅ plan-template.md - Should mention OutputFormatter in implementation patterns
  ✅ spec-template.md - Requirements structure compatible
  ✅ tasks-template.md - Should include OutputFormatter integration tasks

  Follow-up Actions:
  - Verify all existing commands use OutputFormatter (update-command, get-command, list-command, search-command, cache-command completed)
  - Update plan-template.md to reference OutputFormatter in output handling sections
  - Update tasks-template.md to include OutputFormatter integration in polish phase
-->

# Modern Node.js CLI Constitution

## Core Principles

### I. Modern Node.js LTS Foundation

**MUST use Node.js 22.x LTS ("Jod") or newer as the minimum supported runtime.**

- Active LTS versions ONLY (22.x minimum, 24.x recommended for new projects)
- Native TypeScript support via type stripping (`--experimental-strip-types`)
- 30-month support window guarantees stability for production deployments
- Built-in fetch, test runner, and modern JavaScript features

**Rationale**: Node.js 22 LTS provides native TypeScript execution, eliminating build
step complexity during development while maintaining production-ready stability. LTS
ensures predictable security patches and avoids version churn that disrupts CLI tools.

### II. Zero-Dependency CLI Core

**CLI argument parsing MUST use lightweight, zero-dependency frameworks.**

- Commander.js is the RECOMMENDED choice (zero sub-dependencies, 27k+ stars)
- Alternative: Minimal parsers (arg, minimist) for ultra-simple CLIs
- FORBIDDEN: Heavy frameworks (oclif) unless enterprise plugin systems required
- FORBIDDEN: Deprecated libraries (yargs has declining maintainance, optimist is dead)

**Rationale**: CLI tools are infrastructure. Every dependency increases attack surface,
startup time, and maintenance burden. Commander.js provides full functionality (help
generation, subcommands, validation) with zero transitive dependencies. Fast startup
is critical for CLI user experience.

### III. TypeScript-First Development

**ALL source code MUST be written in TypeScript 5.4+ with strict mode enabled.**

TypeScript configuration MUST include:
- `strict: true` - Full type safety enforcement
- `noEmit: true` - Type checking only, Node.js handles execution
- `verbatimModuleSyntax: true` - Preserve import/export statements exactly
- `allowImportingTsExtensions: true` - Enable `.ts` imports for native execution
- `module: "ES2022"` and `target: "ES2022"` - Modern JavaScript features
- `types: ["node"]` - Node.js type definitions only

Development execution: `node --experimental-strip-types src/index.ts`

Production execution: Either (a) compiled JavaScript via `tsc`, or (b) native
execution when Node.js type stripping becomes stable (post-experimental).

**Rationale**: TypeScript prevents runtime errors, improves maintainability, and
provides excellent IDE support. Native execution eliminates build tooling complexity
during development. The configuration ensures compatibility with Node.js 22's native
TypeScript support while maintaining type safety.

### IV. Package Manager Excellence (pnpm)

**MUST use pnpm v10+ as the package manager.**

Required `.npmrc` configuration:
```ini
save-exact=true              # Pin exact versions (no ^ or ~)
strict-peer-dependencies=false  # Reduce peer dependency noise
use-node-version=22.18.0     # Auto-install correct Node.js
```

- Installation: `corepack enable pnpm` (uses Node.js built-in Corepack)
- Disk efficiency: Content-addressable global store with hard links
- Speed: 3x faster than npm for installations
- Security: Strict dependency resolution prevents phantom dependencies

**Rationale**: pnpm provides superior disk efficiency (50-70% space savings), faster
installations, and prevents accidental access to undeclared dependencies. The
content-addressable store and hard-linking approach is ideal for CLI tools where
users may have multiple Node.js projects. Built-in Node.js version management
simplifies developer onboarding.

### V. Unified Tooling (Biome)

**MUST use Biome v1.9+ for linting and formatting (replaces ESLint + Prettier).**

Required `biome.json` configuration:
```json
{
  "organizeImports": {"enabled": true},
  "linter": {"enabled": true, "rules": {"recommended": true}},
  "formatter": {"enabled": true, "indentWidth": 2, "lineWidth": 100},
  "javascript": {
    "formatter": {"quoteStyle": "single", "semicolons": "always"}
  },
  "vcs": {"enabled": true, "clientKind": "git", "useIgnoreFile": true}
}
```

- Replaces: ESLint, Prettier, eslint-config-prettier, import sorting plugins
- Speed: 35x faster than Prettier (written in Rust)
- Compatibility: 95% Prettier-compatible for easy migration
- Single tool: Eliminates configuration conflicts between linter/formatter

Migration: `pnpm biome migrate eslint --write && pnpm biome migrate prettier --write`

**Rationale**: Biome eliminates the 6+ package ecosystem (ESLint, TypeScript-ESLint,
Prettier, integration plugins) with a single Rust-based tool. Dramatically faster
linting/formatting improves developer experience. Zero configuration conflicts.
Built-in import organization removes need for additional plugins.

### VI. Native ES Modules

**MUST use ES Modules (ESM) exclusively - CommonJS is FORBIDDEN.**

Required package.json: `"type": "module"`

- All imports MUST use explicit file extensions: `import { foo } from './bar.js'`
- Use `.js` extension in imports even for `.ts` source files (TypeScript convention)
- Dynamic imports: `await import()` for code splitting
- Top-level await supported
- No `require()` - use `import()` or `createRequire()` for rare CJS interop

**Rationale**: ESM is the future of JavaScript. Node.js 22 has stable ESM support.
Using ESM ensures compatibility with modern tooling, enables tree-shaking, and
provides better static analysis. Explicit extensions are required by Node.js ESM
loader and eliminate ambiguity. CommonJS is legacy technology.

### VII. Performance & Startup Speed

**CLI tools MUST optimize for fast startup time (<100ms cold start target).**

Performance requirements:
- Minimize dependencies (each dependency adds ~5-10ms)
- Lazy-load heavy operations (networking, file I/O)
- Avoid synchronous blocking operations on startup
- Use streaming for large data processing
- Cache expensive computations when appropriate

Benchmarking MUST be performed:
```bash
time node src/cli.js --help    # Target: <50ms
time node src/cli.js <command> # Target: <100ms total
```

**Rationale**: CLI tools are invoked frequently, often in scripts or CI/CD pipelines.
Slow startup degrades user experience and wastes computational resources. Users expect
instant feedback. Every 100ms feels sluggish. Fast startup is a quality signal.

### VIII. Test-Driven Development (TDD)

**ALL features MUST be developed following strict Test-Driven Development (TDD).**

TDD workflow (Red-Green-Refactor cycle):
1. **RED**: Write a failing test that defines desired behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Clean up code while keeping tests green

Test requirements:
- Tests MUST be written BEFORE implementation code
- Each test MUST fail initially (verify the test actually tests something)
- Implementation begins ONLY after test is written and failing
- Every feature, bug fix, and change requires a test first
- No code commits without corresponding tests

**100% Test Pass Rate (NON-NEGOTIABLE):**
- ALL tests MUST pass before marking work as complete
- A feature is NOT complete until `pnpm test` shows 100% pass rate
- NO partial implementations ("tests pass except for X")
- NO skipped tests (`.skip`, `.todo`) in completed work
- Focus on RELEVANT tests only - tests for the feature being implemented
- Existing tests for other features MUST continue passing (no regressions)

Test framework: **Vitest** (modern, fast, Vite-powered test runner)
- Native ESM support (no configuration needed)
- TypeScript support out of the box
- Compatible with Jest API (easy migration)
- Fast watch mode with intelligent re-running
- Built-in code coverage via c8

Test structure:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('CommandParser', () => {
  it('should parse basic command arguments', () => {
    // Arrange
    const input = ['node', 'cli.js', 'command', '--flag'];

    // Act
    const result = parseCommand(input);

    // Assert
    expect(result.command).toBe('command');
    expect(result.flags).toContain('flag');
  });
});
```

**Rationale**: TDD prevents regressions, ensures code is testable by design, provides
living documentation, and catches bugs before they reach production. Writing tests first
forces clear thinking about interfaces and edge cases. The 100% pass rate requirement
ensures no feature is declared complete prematurely - all promised functionality MUST
work as tested. Focusing on relevant tests prevents scope creep while maintaining quality.
Vitest provides the fastest test execution while maintaining Jest compatibility, making
it ideal for rapid TDD cycles. Native ESM and TypeScript support eliminate configuration
overhead.

### IX. Standard Data Directory

**ALL application data MUST be stored in ~/.claude-docs/ directory.**

Standard directory structure:
```
~/.claude-docs/
├── config.json       # Application configuration
├── cache/            # Cached data (documentation, downloads)
├── logs/             # Application logs
└── docs/             # Local documentation storage
```

Path conventions:
- Configuration file: `~/.claude-docs/config.json`
- Log files: `~/.claude-docs/logs/` (with rotation)
- Cache directory: `~/.claude-docs/cache/`
- Documentation: `~/.claude-docs/docs/`
- ALL paths MUST be relative to `~/.claude-docs/` base directory
- Path expansion: `~` MUST be expanded to user's home directory at runtime

Default configuration values MUST use these paths:
```typescript
{
  logFile: '~/.claude-docs/logs/app.log',
  cacheDir: '~/.claude-docs/cache',
  docsPath: '~/.claude-docs/docs',
  configPath: '~/.claude-docs/config.json'
}
```

**Rationale**: Standardizing on a single data directory provides predictable behavior
across all installations, simplifies backup and cleanup operations, and follows
Unix conventions for application data storage. Using `~/.claude-docs/` instead of
`~/.claude/` prevents conflicts with other tools and provides clear namespace
ownership. Consistent path conventions make troubleshooting easier and improve
user experience. All configuration, logs, and cached data live in one predictable
location that users can easily find, back up, or remove.

### X. Dual-Mode Output (AI and Human Friendly)

**ALL command output MUST use the OutputFormatter for dual-mode support.**

Output modes based on `CLAUDECODE` environment variable:
- **AI mode** (`CLAUDECODE=1`): Minimal markdown output optimized for AI agents
- **User mode** (default): Rich ANSI-colored output for human users

Implementation requirements:
- ALL commands MUST initialize OutputFormatter: `new OutputFormatter(detectOutputMode())`
- Status/feedback messages MUST use formatter methods:
  - `formatter.info()` - Informational messages
  - `formatter.success()` - Success messages (green in user mode)
  - `formatter.error()` - Error messages (red in user mode)
  - `formatter.warning()` - Warning messages (yellow in user mode)
  - `formatter.heading()` - Section headings
  - `formatter.list()` - Bullet lists
- Document content MUST remain unformatted (raw markdown output)
- Help text MAY differ between modes (AI mode: essential commands only)

**FORBIDDEN**:
- Direct `console.log()` for status/error messages (use formatter methods)
- ANSI color codes embedded in strings (use formatter)
- Mode-specific conditional branches scattered throughout code (centralize in formatter)

**Rationale**: CLI tools serve both AI agents and human users. AI agents require clean,
parseable markdown without ANSI codes. Humans expect rich, colored terminal output.
Using OutputFormatter centralizes mode detection and formatting logic, ensuring consistent
behavior and preventing mode-specific bugs. This design allows the same command code to
serve both audiences without duplication. Document content remains unformatted to enable
piping and processing by both AI and shell tools.

## Technology Stack Standards

### Required Dependencies

**Production Dependencies (keep minimal):**
- `commander` (CLI framework) - REQUIRED
- Domain-specific libraries only (e.g., markdown parser for doc tools)

**Development Dependencies:**
- `typescript` (^5.4.2) - REQUIRED
- `@types/node` (^22.0.0) - REQUIRED
- `@biomejs/biome` (^1.9.0) - REQUIRED
- `vitest` (^2.0.0) - REQUIRED for testing

### Forbidden Dependencies

- ❌ ESLint + plugins ecosystem (use Biome)
- ❌ Prettier (use Biome)
- ❌ ts-node, tsx (use native Node.js type stripping)
- ❌ nodemon (use `node --watch`)
- ❌ Babel (TypeScript handles transpilation)
- ❌ Webpack/Rollup for CLI tools (use `tsc` or native execution)

### Project Structure

**Standard CLI Project Layout:**
```
src/
├── cli.ts          # Entry point with CLI definition
├── commands/       # Command implementations
├── lib/            # Core library code
├── utils/          # Helper functions
└── types/          # Typescript definitions
dist/               # Compiled output (gitignored)
tests/              # Test files
package.json
tsconfig.json
biome.json
.npmrc
```

**Data Directory Conventions:**
- Application data: `~/.claude-docs/`
- MUST be added to `.gitignore`
- MUST be created on first run if missing
- MUST support `~` expansion in configuration

**package.json bin field:**
```json
{
  "bin": {
    "claude-docs": "./dist/cli.js"
  }
}
```

### Testing Standards

**TDD Workflow (MANDATORY):**
1. Write failing test first (RED phase)
2. Run test and verify it fails: `pnpm test`
3. Write minimal implementation (GREEN phase)
4. Run test and verify it passes: `pnpm test`
5. Refactor code (REFACTOR phase)
6. Ensure tests still pass: `pnpm test`
7. **VERIFICATION**: Confirm 100% pass rate before declaring feature complete

**Completion Criteria:**
- Feature is ONLY complete when `pnpm test` shows: ✓ All tests passed
- NO skipped tests (`.skip()`, `.todo()`) in the final implementation
- Focus tests on the feature being implemented (relevant tests only)
- Existing tests MUST still pass (regression check)

**MUST include tests for:**
- CLI argument parsing edge cases
- Command execution with various inputs
- Error handling and validation
- Output formatting
- Integration tests for command workflows
- Unit tests for utility functions
- File operations in `~/.claude-docs/` directory
- Configuration loading from `~/.claude-docs/config.json`
- Path expansion for `~/.claude-docs/` paths

**Test framework**: Vitest (modern, fast, Vite-powered)

Configuration in `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['dist/', 'tests/', '**/*.test.ts']
    }
  }
});
```

Test commands:
```bash
pnpm test           # Run all tests once
pnpm test:watch     # Run tests in watch mode (for TDD)
pnpm test:coverage  # Run tests with coverage report
```

Test file naming: `*.test.ts` or `*.spec.ts` in `tests/` directory

**Rationale**: Vitest provides blazing-fast test execution with native ESM and TypeScript
support. Hot Module Replacement (HMR) during watch mode enables instant feedback for TDD
cycles. Jest-compatible API reduces learning curve. Built-in coverage via v8 eliminates
additional dependencies. Zero configuration for modern TypeScript/ESM projects.

## Development Workflow

### Local Development

**TDD Development Mode** (recommended workflow):
```bash
# Terminal 1: Watch tests (instant feedback for TDD)
pnpm test:watch

# Terminal 2: Type checking in watch mode
pnpm type-check:watch

# Terminal 3: Development server (if applicable)
pnpm dev
```

**Development Mode** (with native type stripping):
```bash
pnpm dev    # node --experimental-strip-types src/cli.ts
```

**Testing** (TDD workflow):
```bash
pnpm test           # Run all tests once
pnpm test:watch     # Watch mode for TDD (recommended)
pnpm test:coverage  # Coverage report
pnpm test:ui        # Vitest UI mode (visual test runner)
```

**Type Checking** (run in parallel with dev):
```bash
pnpm type-check         # tsc --noEmit
pnpm type-check:watch   # tsc --noEmit --watch
```

**Linting & Formatting**:
```bash
pnpm check   # biome check --write .
pnpm lint    # biome lint .
pnpm format  # biome format --write .
```

### Production Build

**Build Process**:
```bash
pnpm build   # tsc (compiles src/ → dist/)
```

**Pre-publish Checklist**:
1. **100% test pass rate**: `pnpm test` shows all tests passing (NO failures, NO skips)
2. All relevant tests written for new features (TDD compliance)
3. No regressions: Existing tests for other features still pass
4. `pnpm test:coverage` shows adequate coverage (>80% recommended)
5. `pnpm build` succeeds without errors
6. `pnpm check` passes (lint + format)
7. `pnpm type-check` passes
8. Manual testing: `node dist/cli.js <commands>`
9. Version bump follows semver
10. CHANGELOG.md updated

**CRITICAL**: Item #1 is NON-NEGOTIABLE. Publishing with failing tests is FORBIDDEN.

### Version Management

**Semantic Versioning (MAJOR.MINOR.PATCH):**
- MAJOR: Breaking CLI interface changes (removed commands, changed argument names)
- MINOR: New commands or options added (backward compatible)
- PATCH: Bug fixes, documentation, internal refactoring

### CI/CD Requirements

**Continuous Integration MUST verify:**
- Node.js version matrix: 22.x (LTS), 24.x (Current)
- `pnpm install --frozen-lockfile`
- **`pnpm test` passes with 100% pass rate** (all tests via Vitest, ZERO failures)
- `pnpm test:coverage` generates coverage report
- `pnpm type-check` passes
- `pnpm check` passes (linting + formatting)
- `pnpm build` succeeds

**Test Pass Rate Requirements (NON-NEGOTIABLE):**
- CI MUST fail if ANY test fails
- CI MUST fail if there are skipped tests (`.skip()`, `.todo()`) in main branch
- Only relevant tests need to exist, but ALL existing tests MUST pass
- Test failures block merging to main branch

**Coverage Requirements:**
- Minimum 80% code coverage (configurable in vitest.config.ts)
- CI fails if coverage drops below threshold
- Coverage reports uploaded to coverage service (e.g., Codecov)

**Cache Configuration** (GitHub Actions):
```yaml
- uses: pnpm/action-setup@v2
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'pnpm'
```

## Governance

### Constitution Authority

This constitution supersedes all ad-hoc practices and coding conventions. All feature
specifications, implementation plans, and code reviews MUST verify compliance with
these principles.

### Amendment Process

**Amendments require:**
1. Documented rationale explaining why change needed
2. Impact analysis on existing features and codebase
3. Migration plan for any breaking changes
4. Version bump following semantic versioning:
   - MAJOR: Principle removal or incompatible governance change
   - MINOR: New principle added or existing principle expanded
   - PATCH: Clarifications, typo fixes, non-semantic refinements

### Complexity Justification

Violations of principles MUST be explicitly justified in implementation plans using
the "Complexity Tracking" section. Justifications MUST explain:
- Why the simpler approach is insufficient
- What specific problem necessitates the violation
- What was tried and why it failed

**Example violations requiring justification:**
- Adding heavy dependencies (>10 transitive dependencies)
- Using CommonJS instead of ESM
- Skipping TypeScript for performance-critical code
- Using non-LTS Node.js versions
- Committing code with failing tests (ABSOLUTELY FORBIDDEN)
- Using `.skip()` or `.todo()` in production code (FORBIDDEN)
- Storing data outside `~/.claude-docs/` directory
- Using direct console.log/error for command feedback instead of OutputFormatter

### Compliance Review

**Every implementation plan MUST include "Constitution Check" section:**
```markdown
## Constitution Check

✅ Node.js 22+ LTS targeted
✅ Zero-dependency CLI (Commander.js only)
✅ TypeScript with strict mode
✅ pnpm package manager configured
✅ Biome for linting/formatting
✅ ESM-only (no CommonJS)
✅ Startup performance measured (<100ms target)
✅ TDD workflow followed (tests written first)
✅ Vitest configured for testing
✅ 100% test pass rate achieved (ALL tests passing, ZERO failures)
✅ Data directory standard (~/.claude-docs/) followed
✅ Dual-mode output (OutputFormatter) used for all command feedback

Violations: None
```

**Feature Completion Criteria:**
A feature implementation is ONLY complete when:
1. All relevant tests are written (TDD compliance)
2. `pnpm test` shows 100% pass rate (no failures, no skips)
3. No regressions (existing tests still pass)
4. All data stored in `~/.claude-docs/` directory
5. All command output uses OutputFormatter for dual-mode support
6. All other constitution checks pass

**Version**: 1.3.0 | **Ratified**: 2025-01-20 | **Last Amended**: 2025-11-21
