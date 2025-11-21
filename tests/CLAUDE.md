# Testing Guidelines for claude-docs-cli

**Last Updated**: 2025-11-21

## Critical Rules

### ✅ REQUIREMENTS (Non-Negotiable)

1. **100% Test Pass Rate Required** - No exceptions
   - All tests MUST pass before pushing to GitHub
   - Run `npm test` before every commit
   - Fix failing tests immediately - don't commit broken tests

2. **Test Isolation is Mandatory**
   - Tests MUST NOT share state between test cases
   - Tests MUST work when run alone or with full suite
   - Tests MUST NOT depend on execution order
   - Tests MUST NOT pollute global state

3. **Zero Flaky Tests**
   - If a test fails intermittently, it's broken
   - Fix or remove flaky tests - don't ignore them
   - No "works on my machine" - tests must be deterministic

## Test Directory Structure

```text
tests/
  ├── unit/              # Unit tests (isolated, fast)
  │   ├── lib/           # Tests for src/lib/* modules
  │   ├── utils/         # Tests for src/utils/* modules
  │   └── commands/      # Tests for src/commands/* modules
  │
  ├── integration/       # Integration tests (multiple components)
  │   └── workflows/     # End-to-end workflow tests
  │
  ├── e2e/              # End-to-end tests (full CLI)
  │   └── cli.test.ts   # CLI entry point tests
  │
  └── CLAUDE.md         # This file - testing guidelines
```

## Test Categories

### Unit Tests (`tests/unit/`)

**Purpose**: Test individual functions/modules in isolation

**Characteristics**:
- Fast (< 100ms per test)
- No external dependencies (network, filesystem outside temp)
- Mock external dependencies
- Test one thing at a time

**File Naming**: `{module-name}.test.ts`

**Location Mapping**:
- `src/lib/*.ts` → `tests/unit/lib/{name}.test.ts`
- `src/utils/*.ts` → `tests/unit/utils/{name}.test.ts`
- `src/commands/*.ts` → `tests/unit/commands/{name}.test.ts`
- `src/types/*.ts` → Usually no tests (just type definitions)

**Examples**:
- `src/lib/cache-manager.ts` → `tests/unit/lib/cache-manager.test.ts`
- `src/utils/http-client.ts` → `tests/unit/utils/http-client.test.ts`
- `src/commands/update-command.ts` → `tests/unit/commands/update-command.test.ts`

### Integration Tests (`tests/integration/`)

**Purpose**: Test multiple components working together

**Characteristics**:
- Slower (< 5 seconds per test)
- Test component interactions
- May use real filesystem (in temp directories)
- Minimal mocking - test real integration

**File Naming**: `{feature}-workflow.test.ts`

**Examples**:
- `cache-lifecycle.test.ts` - Cache write → read → invalidate → regenerate
- `update-workflow.test.ts` - Full update check → commit → verify cycle
- `download-workflow.test.ts` - Download → transform → cache → retrieve

### E2E Tests (`tests/e2e/`)

**Purpose**: Test complete CLI commands as a user would

**Characteristics**:
- Slowest (< 30 seconds per test)
- Spawn actual CLI process
- Test full command execution
- Real filesystem, real network (or fixtures)

**File Naming**: `{command}.test.ts` or `cli.test.ts`

**Examples**:
- `cli.test.ts` - CLI entry point, help, version
- `update.e2e.test.ts` - Full update command workflows
- `search.e2e.test.ts` - Full search command scenarios

## Test Isolation Patterns

### ✅ Required Pattern for ALL Tests

```typescript
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('MyModule', () => {
  let tempDir: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // 1. Create UNIQUE temp directory (timestamp + random + PID)
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${process.pid}`;
    tempDir = join(tmpdir(), `test-mymodule-${uniqueId}`);

    // 2. Set environment variables
    process.env.HOME = tempDir;

    // 3. Clear ALL mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // 1. Restore environment FIRST
    process.env.HOME = originalHome;

    // 2. Clear mocks
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // 3. Cleanup filesystem LAST
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should test something', async () => {
    // Use UNIQUE filenames within each test
    const uniqueFile = `test-${Date.now()}.md`;

    // Test logic here
    expect(true).toBe(true);
  });
});
```

### ❌ Anti-Patterns to AVOID

```typescript
// ❌ DON'T: Shared constants across tests
const SHARED_FILE = 'test.md'; // Multiple tests will conflict!

// ❌ DON'T: Reuse temp directories
tempDir = '/tmp/my-tests'; // Tests will interfere with each other!

// ❌ DON'T: Forget to restore mocks
afterEach(() => {
  // Missing vi.restoreAllMocks() - leaks into next test!
});

// ❌ DON'T: Rely on test execution order
it('test 1 creates file', () => { /* ... */ });
it('test 2 reads file from test 1', () => { /* ... */ }); // BROKEN!

// ❌ DON'T: Use simple Date.now() alone
tempDir = join(tmpdir(), `test-${Date.now()}`); // Can collide in parallel!

// ❌ DON'T: Skip cleanup
afterEach(() => {
  // No cleanup = files accumulate in /tmp!
});
```

## Testing Checklist

Before committing tests, verify:

- [ ] All tests pass individually: `npm run test:run -- path/to/test.test.ts`
- [ ] All tests pass together: `npm run test:run`
- [ ] Each test uses unique temp directories
- [ ] Each test uses unique filenames (timestamp + random)
- [ ] beforeEach/afterEach properly clean up
- [ ] Tests don't depend on execution order
- [ ] No shared mutable state between tests
- [ ] Mocks are cleared and restored in hooks
- [ ] No hardcoded paths outside temp directories

## Running Tests

```bash
# Run all tests
npm test
npm run test:run

# Run specific test file
npm run test:run -- tests/unit/lib/cache-manager.test.ts

# Run tests in watch mode
npm test

# Run with coverage
npm run test:coverage

# Verify everything before commit
npm run validate  # Runs lint + type-check + test
```

## Test File Template

Create new test files using this template:

```typescript
/**
 * Tests for {ModuleName}
 *
 * Location: tests/{category}/{subcategory}/{module-name}.test.ts
 * Source: src/{path}/{module-name}.ts
 */

import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { functionToTest } from '../../src/path/to/module.js';

describe('ModuleName', () => {
  let tempDir: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // Unique temp directory
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${process.pid}`;
    tempDir = join(tmpdir(), `test-module-${uniqueId}`);
    process.env.HOME = tempDir;

    // Clear mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Restore environment
    process.env.HOME = originalHome;

    // Clear mocks
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Cleanup filesystem
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Feature Set 1', () => {
    it('should do something specific', async () => {
      // Use unique filename
      const testFile = `file-${Date.now()}.md`;

      // Test implementation
      const result = await functionToTest(testFile);

      // Assertions
      expect(result).toBeDefined();
    });
  });
});
```

## Common Pitfalls and Solutions

### Problem: Tests pass alone but fail together

**Cause**: Shared state pollution (files, mocks, environment variables)

**Solution**:
- Use unique temp directories with timestamp + random + PID
- Clear mocks in both beforeEach and afterEach
- Use unique filenames within each test
- Restore environment variables in afterEach

### Problem: Flaky tests (sometimes pass, sometimes fail)

**Cause**: Race conditions, timing issues, shared resources

**Solution**:
- Add proper await for all async operations
- Don't rely on filesystem timing
- Use proper mock lifecycle management
- Add retries for E2E tests that spawn processes

### Problem: Mock assertions don't work

**Cause**: Module resolution, cached imports, mock timing

**Solution**:
- Test actual behavior instead of mock calls
- Use vi.spyOn with explicit mock implementations
- Store mocks in variables for verification
- Clear and restore mocks in hooks

### Problem: Tests leak temp files

**Cause**: Incomplete cleanup in afterEach

**Solution**:
```typescript
afterEach(async () => {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Always use force: true and wrap in try-catch
  }
});
```

## Performance Targets

- **Unit tests**: < 100ms per test
- **Integration tests**: < 5 seconds per test
- **E2E tests**: < 30 seconds per test
- **Full suite**: < 10 seconds total

## Test Coverage Goals

- **Line coverage**: > 80%
- **Branch coverage**: > 75%
- **Function coverage**: > 85%
- **Pass rate**: 100% (required)

## Git Pre-Commit Requirements

Before every commit:

```bash
# REQUIRED: All must pass
npm run lint          # No linting errors
npm run type-check    # No TypeScript errors
npm run test:run      # 100% tests pass

# Or run all at once:
npm run validate
```

## When Tests Fail

1. **Don't commit failing tests** - Fix them first
2. **Don't disable tests** - Fix the root cause
3. **Don't skip flaky tests** - Make them deterministic
4. **Don't ignore warnings** - They become errors later

## Migration Plan (Current Reorganization)

Moving from current structure to new structure:

```text
Current (messy):                    New (organized):
tests/cli.test.ts                → tests/e2e/cli.test.ts
tests/commands/*.test.ts         → tests/unit/commands/*.test.ts
tests/lib/logger.test.ts         → DELETE (duplicate)
tests/unit/logger.test.ts        → tests/unit/lib/logger.test.ts
tests/unit/{name}.test.ts        → tests/unit/{category}/{name}.test.ts
tests/integration/*.test.ts      → tests/integration/workflows/*.test.ts
```

## Summary

- **Organize by test type** (unit/integration/e2e), not by source location
- **Mirror source structure** within each test type
- **Ensure 100% test isolation** using unique temp dirs and filenames
- **Maintain 100% pass rate** - it's a requirement, not a goal
- **Follow the patterns** - consistency makes maintenance easier
