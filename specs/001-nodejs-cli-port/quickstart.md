# Quickstart Guide: Node.js CLI Development

**Target Audience**: Developers setting up the claude-docs CLI for the first time
**Est. Time**: 10 minutes
**Prerequisites**: Node.js 22+, pnpm 10+ (auto-installed via Corepack)

---

## 1. Initial Setup (2 minutes)

### Clone and Navigate
```bash
# Clone the repository
git clone https://github.com/[org]/claude-docs-cli.git
cd claude-docs-cli

# Switch to feature branch (if working on a specific feature)
git checkout 001-nodejs-cli-port
```

### Install Dependencies
```bash
# Enable Corepack (ships with Node.js 22)
corepack enable pnpm

# Install dependencies (pnpm auto-installs correct Node.js version)
pnpm install
```

**Expected Output**:
```
Lockfile is up to date, resolution step is skipped
Progress: resolved 8, reused 8, downloaded 0, added 8, done
Done in 2.1s
```

---

## 2. Development Environment (3 minutes)

### Run Type Checking
```bash
# Check TypeScript types (should pass with zero errors)
pnpm type-check
```

**Expected Output**:
```
No errors found.
```

### Run Linting and Formatting
```bash
# Check code style (Biome)
pnpm check
```

**Expected Output**:
```
✔ All checks passed
```

### Run Tests
```bash
# Run tests in watch mode (TDD workflow)
pnpm test
```

**Expected Output**:
```
✓ tests/cli.test.ts (X tests)
✓ tests/commands/version.test.ts (X tests)

Test Files  X passed (X)
     Tests  X passed (X)
  Start at  XX:XX:XX
  Duration  XXXms
```

**Press `q` to quit watch mode when done.**

---

## 3. Build and Run (2 minutes)

### Build the CLI
```bash
# Compile TypeScript to JavaScript
pnpm build
```

**Expected Output**:
```
src/cli.ts → dist/cli.js
src/commands/version.ts → dist/commands/version.js
...
Build completed in XXXms
```

### Run the Compiled CLI
```bash
# Test version command
node dist/cli.js --version
```

**Expected Output**:
```
1.0.0
```

```bash
# Test help command
node dist/cli.js --help
```

**Expected Output**:
```
Usage: claude-docs [options] [command]

Claude Code Documentation Manager - Node.js CLI

Options:
  -v, --version      Display version information
  -h, --help         Display help information
...
```

---

## 4. Development Workflow (3 minutes)

### Recommended TDD Workflow

**Terminal 1: Test Watch Mode** (Red-Green-Refactor)
```bash
pnpm test
```
This runs Vitest in watch mode - tests automatically re-run when you save files.

**Terminal 2: Type Checking** (Continuous validation)
```bash
pnpm type-check:watch
```
This runs TypeScript type checker in watch mode - catches type errors instantly.

**Terminal 3: Development Execution** (Optional)
```bash
pnpm dev
```
This runs the CLI in development mode with native TypeScript execution (no build step).

### TDD Cycle Example

1. **RED**: Write a failing test
   ```bash
   # Edit tests/commands/version.test.ts
   # Add new test case
   # Save → Terminal 1 shows red (failing test)
   ```

2. **GREEN**: Write minimal code to pass
   ```bash
   # Edit src/commands/version.ts
   # Implement feature
   # Save → Terminal 1 shows green (passing test)
   ```

3. **REFACTOR**: Clean up code
   ```bash
   # Improve code quality
   # Save → Terminal 1 verifies tests still pass
   ```

### Pre-Commit Validation
```bash
# Run full validation suite (type-check + lint + format + tests)
pnpm validate
```

**Expected Output**:
```
✔ Biome checks passed
✔ Type checking passed
✔ All tests passed (XXX tests)
```

---

## 5. Common Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `pnpm install` | Install dependencies | After clone, after package.json changes |
| `pnpm test` | Run tests (watch mode) | During development (TDD) |
| `pnpm test:run` | Run tests once | In CI, pre-commit |
| `pnpm test:coverage` | Run tests with coverage report | Before PR, checking coverage |
| `pnpm type-check` | Check TypeScript types | Before commit |
| `pnpm check` | Lint + format code | Before commit |
| `pnpm build` | Compile to JavaScript | Before running CLI, before deploy |
| `pnpm validate` | Run all checks | Before pushing |
| `pnpm dev` | Run CLI in dev mode | Testing CLI commands during development |

---

## 6. Project Structure Quick Reference

```
claude-docs-cli/
├── src/                    # TypeScript source code
│   ├── cli.ts             # CLI entry point
│   ├── commands/          # Command implementations
│   ├── lib/               # Shared libraries
│   ├── utils/             # Utility functions
│   └── types/             # Type definitions
├── tests/                 # Test files (mirrors src/)
│   ├── cli.test.ts
│   └── commands/
├── dist/                  # Compiled JavaScript (gitignored)
├── specs/                 # Feature specifications
├── package.json           # Project metadata, scripts, dependencies
├── tsconfig.json          # TypeScript configuration
├── biome.json             # Linter/formatter configuration
├── vitest.config.ts       # Test runner configuration
└── .npmrc                 # pnpm configuration
```

---

## 7. Troubleshooting

### Issue: `pnpm: command not found`

**Solution**:
```bash
# Enable Corepack (included with Node.js 22)
corepack enable pnpm

# Verify installation
pnpm --version
```

### Issue: Type errors after `pnpm install`

**Solution**:
```bash
# Rebuild TypeScript cache
pnpm type-check

# If errors persist, check Node.js version
node --version  # Should be 22.x or higher
```

### Issue: Tests failing

**Solution**:
```bash
# Clear cache and re-run
pnpm test:run

# If specific test fails, run with debugging
pnpm test -- --reporter=verbose
```

### Issue: Build fails with module errors

**Solution**:
```bash
# Check for missing .js extensions in imports
# TypeScript requires explicit extensions for ESM
# ❌ import { foo } from './bar'
# ✅ import { foo } from './bar.js'

# Run type-check to find errors
pnpm type-check
```

---

## 8. Next Steps

### After Setup is Working

1. **Read the Specification**
   - Review `specs/001-nodejs-cli-port/spec.md` for requirements
   - Check `specs/001-nodejs-cli-port/plan.md` for implementation plan

2. **Explore the Codebase**
   - Start with `src/cli.ts` (entry point)
   - Review test structure in `tests/`
   - Check configuration files (tsconfig.json, biome.json, vitest.config.ts)

3. **Make Your First Change** (TDD)
   - Write a failing test in `tests/`
   - Implement the feature in `src/`
   - Refactor and commit
   - Run `pnpm validate` before pushing

4. **Review Development Workflow**
   - Read the constitution: `.specify/memory/constitution.md`
   - Understand TDD principles
   - Follow code style guidelines (enforced by Biome)

---

## 9. Getting Help

### Resources
- **Specification**: `specs/001-nodejs-cli-port/spec.md`
- **Implementation Plan**: `specs/001-nodejs-cli-port/plan.md`
- **Research**: `specs/001-nodejs-cli-port/research.md`
- **Constitution**: `.specify/memory/constitution.md`

### Common Questions

**Q: How do I add a new command?**
A: This is covered in future phases. Foundation phase only implements `--version` and `--help`.

**Q: Why are tests failing after I modified code?**
A: Follow TDD: Write test first, then implement. Tests should fail initially (RED), then pass (GREEN).

**Q: Can I use npm instead of pnpm?**
A: No, the constitution mandates pnpm v10+ for disk efficiency and strict dependency resolution.

**Q: Do I need to build before running tests?**
A: No, Vitest runs TypeScript directly via Vite's transformation pipeline.

---

## 10. Performance Benchmarks

After setup, verify performance meets targets:

```bash
# Benchmark version command (target: <50ms)
time node dist/cli.js --version

# Benchmark help command (target: <50ms)
time node dist/cli.js --help

# Benchmark test suite (target: <10s)
time pnpm test:run

# Benchmark type checking (target: <5s)
time pnpm type-check
```

**Expected Results**:
- Version command: ~20-40ms
- Help command: ~30-50ms
- Test suite: ~2-5s (8 tests)
- Type checking: ~1-3s (small codebase)

---

## Quick Reference Card

```bash
# Setup
corepack enable pnpm && pnpm install

# Development (run in 3 terminals)
pnpm test                   # Terminal 1: TDD watch mode
pnpm type-check:watch       # Terminal 2: Type checking
pnpm dev                    # Terminal 3: Dev execution

# Pre-commit
pnpm validate               # Run all checks

# Build & Run
pnpm build                  # Compile TypeScript
node dist/cli.js --version  # Test CLI
```

---

**You're ready to start developing!** 🚀

Follow the TDD workflow (write tests first), run `pnpm validate` before committing, and refer to the spec/plan documents for guidance.
