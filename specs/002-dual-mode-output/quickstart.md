# Quickstart: Dual-Mode Output System

**Feature**: 002-dual-mode-output
**Date**: 2025-11-20

## Overview

This quickstart guide demonstrates how to use the Dual-Mode Output System for building CLI applications that adapt their output for both AI agents and human users.

## Basic Usage

### 1. Detect Output Mode

```typescript
import { detectOutputMode } from './utils/env.js';

// Detects from CLAUDECODE environment variable
const mode = detectOutputMode();
console.log(mode); // 'ai' | 'user'
```

**Environment-based detection**:
```bash
# AI mode
CLAUDECODE=1 claude-docs search "hooks"

# User mode (default)
claude-docs search "hooks"
```

---

### 2. Format Output

```typescript
import { OutputFormatter } from './lib/output-formatter.js';
import { detectOutputMode } from './utils/env.js';

const formatter = new OutputFormatter(detectOutputMode());

// Headings
console.log(formatter.heading('Search Results'));
// AI mode:  ## Search Results
// User mode: \x1b[1;34mSearch Results\x1b[0m (bold blue)

// Success messages
console.log(formatter.success('Operation completed'));
// AI mode:  ✓ Operation completed
// User mode: \x1b[32m✓ Operation completed\x1b[0m (green)

// Error messages
console.log(formatter.error('File not found'));
// AI mode:  ✗ File not found
// User mode: \x1b[31m✗ File not found\x1b[0m (red)

// Warnings
console.log(formatter.warning('Documentation may be outdated'));
// AI mode:  ⚠ Documentation may be outdated
// User mode: \x1b[33m⚠ Documentation may be outdated\x1b[0m (yellow)
```

---

### 3. Conditional Command Display

```typescript
import { OutputFormatter } from './lib/output-formatter.js';

const formatter = new OutputFormatter(detectOutputMode());

// AI mode: show only essential commands
// User mode: show all commands including advanced features

function displayHelp() {
  console.log(formatter.heading('Available Commands'));

  // Essential commands (shown in both modes)
  console.log(formatter.command('search <query>', 'Search documentation'));
  console.log(formatter.command('get <slug>', 'Get documentation section'));

  // Advanced commands (only in user mode)
  if (formatter.mode === 'user') {
    console.log('\n' + formatter.heading('Advanced Commands'));
    console.log(formatter.command('status', 'Show cache status'));
    console.log(formatter.command('reset-cache', 'Clear cache'));
  }
}
```

---

### 4. Enhanced Logging

```typescript
import { Logger } from './lib/logger.js';
import { loadConfig } from './utils/config.js';

// Load configuration
const config = await loadConfig();

// Initialize logger
const logger = new Logger(
  config.logLevel,
  config.logFile,
  new OutputFormatter(detectOutputMode())
);

// Log messages at different levels
await logger.info('Starting documentation search');
await logger.warn('Cache is outdated');
await logger.error('Failed to download documentation');
await logger.debug('Search query: hooks');

// With structured context
await logger.info('Search completed', {
  query: 'hooks',
  results: 42,
  duration: 150
});
```

---

### 5. File Operations

```typescript
import { readConfig, writeConfig, ensureDir } from './lib/file-ops.js';

// Ensure directory exists
await ensureDir('~/.claude/cache');

// Read configuration
try {
  const config = await readConfig('~/.claude/config.json');
  console.log('Config loaded:', config);
} catch (error) {
  console.error('Failed to load config:', error.message);
}

// Write configuration
await writeConfig('~/.claude/config.json', {
  logLevel: 'info',
  cacheDir: '~/.claude/cache'
});

// Check file integrity
const isValid = await verifyFileIntegrity('~/.claude/docs/hooks.md');
```

---

### 6. Complete Example: Search Command

```typescript
import { Command } from 'commander';
import { OutputFormatter } from './lib/output-formatter.js';
import { Logger } from './lib/logger.js';
import { loadConfig } from './utils/config.js';
import { detectOutputMode } from './utils/env.js';

// Setup
const config = await loadConfig();
const mode = detectOutputMode();
const formatter = new OutputFormatter(mode);
const logger = new Logger(config.logLevel, config.logFile, formatter);

// Define command
const program = new Command();

program
  .command('search <query>')
  .description('Search documentation')
  .action(async (query: string) => {
    await logger.info(`Searching for: ${query}`);

    try {
      // Perform search (placeholder)
      const results = await performSearch(query);

      // Display results
      console.log(formatter.heading('Search Results'));

      if (results.length === 0) {
        console.log(formatter.warning('No results found'));
        return;
      }

      for (const result of results) {
        console.log(formatter.success(`Found: ${result.title}`));

        // In user mode, show additional context
        if (mode === 'user') {
          console.log(`  Path: ${result.path}`);
          console.log(`  Score: ${result.score}`);
        }
      }

      // Next action (important for AI mode)
      if (mode === 'ai') {
        console.log('\nNext: Use `get <slug>` to retrieve a section');
      }

      await logger.info('Search completed', {
        query,
        results: results.length
      });
    } catch (error) {
      console.error(formatter.error(`Search failed: ${error.message}`));
      await logger.error('Search failed', { query, error: error.message });
      process.exit(1);
    }
  });

program.parse();
```

---

## Configuration File Example

**Location**: `~/.claude/config.json`

```json
{
  "logLevel": "info",
  "logFile": "~/.claude/logs/claude-docs.log",
  "cacheDir": "~/.claude/cache",
  "docsPath": "~/.claude/docs",
  "maxLogSize": 10485760,
  "maxLogFiles": 5
}
```

**Validation**: Configuration is validated using Zod schema at load time.

---

## Output Examples

### AI Mode (CLAUDECODE=1)

```markdown
## Search Results

✓ Found: Hooks Documentation
✓ Found: Hook API Reference
✓ Found: Custom Hooks Guide

Next: Use `get <slug>` to retrieve a section
```

### User Mode (Default)

```
[Bold Blue] Search Results [Reset]
[Green] ✓ Found: Hooks Documentation [Reset]
  Path: ~/.claude/docs/hooks.md
  Score: 0.95
[Green] ✓ Found: Hook API Reference [Reset]
  Path: ~/.claude/docs/hooks-api.md
  Score: 0.87
[Green] ✓ Found: Custom Hooks Guide [Reset]
  Path: ~/.claude/docs/custom-hooks.md
  Score: 0.82
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { OutputFormatter } from './lib/output-formatter.js';

describe('OutputFormatter', () => {
  it('should format headings in AI mode', () => {
    const formatter = new OutputFormatter('ai');
    expect(formatter.heading('Test')).toBe('## Test\n');
  });

  it('should format headings in user mode', () => {
    const formatter = new OutputFormatter('user');
    expect(formatter.heading('Test')).toContain('\x1b[1;34m');
  });

  it('should format success messages', () => {
    const formatter = new OutputFormatter('ai');
    expect(formatter.success('Done')).toBe('✓ Done');
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('CLI Modes', () => {
  it('should detect AI mode from environment', () => {
    const output = execSync('CLAUDECODE=1 node dist/cli.js --help', {
      encoding: 'utf-8'
    });
    // AI mode should show minimal commands
    expect(output).not.toContain('status');
    expect(output).not.toContain('reset-cache');
  });

  it('should use user mode by default', () => {
    const output = execSync('node dist/cli.js --help', {
      encoding: 'utf-8'
    });
    // User mode should show all commands
    expect(output).toContain('status');
    expect(output).toContain('reset-cache');
  });
});
```

---

## Best Practices

1. **Always detect mode early**: Call `detectOutputMode()` at application startup
2. **Create formatter once**: Instantiate `OutputFormatter` once and reuse throughout the app
3. **Use formatter consistently**: Always use formatter methods rather than raw console.log
4. **Provide next actions in AI mode**: Always tell the AI what command to run next
5. **Show minimal info in AI mode**: Avoid "nice to know" information that clutters AI output
6. **Async logging**: Use `await logger.log()` to ensure logs are written before process exits
7. **Catch file operation errors**: Always wrap file ops in try/catch with clear error messages
8. **Validate configuration**: Use Zod schema to catch config errors early

---

## Troubleshooting

### Issue: Colors not showing in user mode

**Cause**: Terminal may not support ANSI colors

**Solution**: Check `process.stdout.isTTY` before using colors

```typescript
const formatter = new OutputFormatter(
  detectOutputMode(),
  process.stdout.isTTY // Only use colors in TTY
);
```

### Issue: Logs not being written

**Cause**: Async log writes not awaited

**Solution**: Always await logger calls or ensure process doesn't exit prematurely

```typescript
await logger.info('Message');
// OR
await logger.flush(); // Before process.exit()
```

### Issue: Configuration validation fails

**Cause**: Invalid config file format

**Solution**: Check error message for specific field issues

```typescript
try {
  const config = await loadConfig();
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Config validation failed:');
    for (const issue of error.issues) {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    }
  }
}
```

---

## Next Steps

After implementing the Dual-Mode Output System:
1. Integrate with existing commands (update, get, search)
2. Add status command for user mode
3. Implement cache management commands
4. Build comprehensive test suite
5. Add performance benchmarks
