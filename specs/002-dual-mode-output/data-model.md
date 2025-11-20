# Data Model: Dual-Mode Output System

**Feature**: 002-dual-mode-output
**Date**: 2025-11-20

## Overview

This document describes the data entities, their relationships, and state transitions for the Dual-Mode Output System. The model focuses on configuration, logging, output formatting, and file operations.

## Core Entities

### 1. OutputMode

**Purpose**: Represents the current output mode determining formatting strategy and verbosity.

**Fields**:
- `mode`: `'ai' | 'user'` - The active output mode
- `source`: `'env' | 'flag' | 'default'` - How the mode was determined

**Relationships**:
- Used by `OutputFormatter` to determine formatting strategy
- Detected by `EnvironmentDetector` at application startup

**State Transitions**:
```
Initial → Detected (via env var or CLI flag)
Detected → Active (applied to formatter)
Active → (immutable for session duration)
```

**Validation Rules**:
- Mode must be exactly 'ai' or 'user'
- Once set for a command execution, cannot be changed
- Source determines precedence: flag > env > default

**Business Rules**:
- AI mode (`CLAUDECODE=1`): minimal output, markdown format, only essential commands
- User mode (default): rich formatting, ANSI colors, all commands visible

---

### 2. Configuration

**Purpose**: Application-wide configuration loaded from file, environment, and defaults.

**Fields**:
- `logLevel`: `'error' | 'warn' | 'info' | 'debug'` - Minimum log level to output
- `logFile`: `string | undefined` - Path to log file (optional)
- `cacheDir`: `string` - Directory for cache storage
- `docsPath`: `string` - Path to documentation directory
- `maxLogSize`: `number` - Maximum log file size in bytes before rotation
- `maxLogFiles`: `number` - Maximum number of log files to retain

**Relationships**:
- Used by `Logger` for log level filtering and file path
- Used by file operation utilities for base paths
- Loaded by `ConfigLoader` at startup

**State Transitions**:
```
Unloaded → Loading (reading config file)
Loading → Validated (Zod schema validation)
Validated → Merged (with defaults and overrides)
Merged → Active (available to application)
Active → (immutable for session duration)
```

**Validation Rules**:
- `logLevel` must be one of the four allowed values
- `logFile` must be a valid file path if provided
- `cacheDir` and `docsPath` must be valid directory paths
- `maxLogSize` must be positive number (bytes)
- `maxLogFiles` must be positive integer

**Default Values**:
```typescript
{
  logLevel: 'info',
  logFile: undefined,
  cacheDir: '~/.claude/cache',
  docsPath: '~/.claude/docs',
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5
}
```

---

### 3. LogEntry

**Purpose**: Represents a single log entry with metadata.

**Fields**:
- `timestamp`: `Date` - When the log was created
- `level`: `'error' | 'warn' | 'info' | 'debug'` - Severity level
- `message`: `string` - Log message content
- `context`: `Record<string, unknown> | undefined` - Optional structured data

**Relationships**:
- Created by `Logger` when logging occurs
- Written to log file by `Logger`
- Formatted by `OutputFormatter` for console output

**State Transitions**:
```
Created → Formatted (for console/file)
Formatted → Written (to console synchronously)
Formatted → Queued (for async file write)
Queued → Persisted (written to log file)
```

**Validation Rules**:
- Timestamp must be valid Date
- Level must match configuration's `logLevel` to be written
- Message cannot be empty
- Context must be JSON-serializable if provided

**Format**:
- Console: `[LEVEL] message` (with colors in user mode)
- File: `2025-11-20T10:30:00.000Z [LEVEL] message {context}`

---

### 4. FileOperation

**Purpose**: Represents a file system operation (read, write, delete, mkdir).

**Fields**:
- `type`: `'read' | 'write' | 'delete' | 'mkdir'` - Operation type
- `path`: `string` - Target file or directory path
- `content`: `string | Buffer | undefined` - Content for write operations
- `options`: `FileOperationOptions | undefined` - Additional options
- `status`: `'pending' | 'in_progress' | 'completed' | 'failed'` - Operation status
- `error`: `Error | undefined` - Error if operation failed

**Relationships**:
- Executed by file operation utilities in `src/lib/file-ops.ts`
- May trigger directory creation (mkdir) before write operations
- Results logged by `Logger`

**State Transitions**:
```
Pending → InProgress (async operation started)
InProgress → Completed (operation succeeded)
InProgress → Failed (operation threw error)
Failed → Retried (optional retry logic)
Retried → Completed | Failed
```

**Validation Rules**:
- Path must be absolute or properly resolved
- Content required for write operations
- Parent directory must exist or be created for write operations
- File must exist for read/delete operations
- Permissions must allow the operation

**Error Handling**:
- `ENOENT`: File/directory not found
- `EACCES`: Permission denied
- `ENOSPC`: No space left on device
- Each error type has specific user-friendly message

---

### 5. OutputFormatter

**Purpose**: Formats output based on current mode (AI vs User).

**Fields**:
- `mode`: `OutputMode` - Current output mode
- `colorSupport`: `boolean` - Whether terminal supports colors

**Methods** (stateless formatting):
- `heading(text: string): string` - Format section heading
- `success(text: string): string` - Format success message
- `error(text: string): string` - Format error message
- `warning(text: string): string` - Format warning message
- `info(text: string): string` - Format info message
- `command(cmd: string, desc: string): string` - Format command help
- `list(items: string[]): string` - Format list of items
- `table(data: Record<string, string>[]): string` - Format tabular data

**Relationships**:
- Used by `Logger` to format console output
- Used by CLI commands to format their output
- References `OutputMode` to determine formatting strategy

**Formatting Rules**:

**AI Mode** (markdown):
- Headings: `## Text\n`
- Success: `✓ Text`
- Error: `✗ Text`
- Warning: `⚠ Text`
- Lists: `- Item\n`
- Commands: `\`cmd\` - Description\n`

**User Mode** (ANSI colors):
- Headings: `\x1b[1;34mText\x1b[0m` (bold blue)
- Success: `\x1b[32m✓ Text\x1b[0m` (green)
- Error: `\x1b[31m✗ Text\x1b[0m` (red)
- Warning: `\x1b[33m⚠ Text\x1b[0m` (yellow)
- Lists: Bulleted with proper indentation
- Commands: Color-coded with alignment

---

## Relationships Diagram

```
┌─────────────────┐
│ Configuration   │
└────────┬────────┘
         │ provides paths/levels
         ▼
┌─────────────────┐      ┌──────────────┐
│ Logger          │◄─────┤ OutputMode   │
└────────┬────────┘      └──────┬───────┘
         │ creates              │ determines format
         ▼                      ▼
┌─────────────────┐      ┌──────────────────┐
│ LogEntry        │      │ OutputFormatter  │
└─────────────────┘      └──────────────────┘
         │ written via
         ▼
┌─────────────────┐
│ FileOperation   │
└─────────────────┘
```

## State Machine: Log File Rotation

```
┌─────────────────┐
│ Normal Logging  │
└────────┬────────┘
         │ size check before each write
         ▼
┌─────────────────┐
│ Size > Threshold│
└────────┬────────┘
         │ yes
         ▼
┌─────────────────┐
│ Rotate Files    │ (log.4 → delete, log.3 → log.4, ..., log.0 → log.1)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create New Log  │ (log.0)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Normal Logging  │
└─────────────────┘
```

## Data Flow

### 1. Application Startup

```
1. Detect OutputMode (env var CLAUDECODE or CLI flag)
2. Load Configuration (file → validate → merge with defaults)
3. Initialize Logger (with config.logLevel and config.logFile)
4. Initialize OutputFormatter (with detected OutputMode)
5. Ready for command execution
```

### 2. Command Execution with Logging

```
1. Command generates log message
2. Logger checks level filter
3. If level sufficient:
   a. Format message with OutputFormatter
   b. Write to console (sync)
   c. Create LogEntry
   d. Append to log file (async)
4. Log file write completes in background
```

### 3. File Operation

```
1. Command requests file operation
2. Validate path and permissions
3. If write operation and directory doesn't exist:
   a. Create directory (recursive)
4. Execute operation (async)
5. Log result (success or error)
6. Return result to caller
```

## Constraints and Invariants

1. **OutputMode immutability**: Once detected at startup, mode cannot change during command execution
2. **Log level ordering**: error < warn < info < debug (only log at or above configured level)
3. **File operation atomicity**: Each file operation completes or fails as a unit
4. **Configuration validity**: Configuration must pass Zod validation before use
5. **Path resolution**: All file paths resolved to absolute paths before operations
6. **Async logging non-blocking**: Log writes never block command execution
7. **Rotation safety**: Log rotation preserves current log entries, never truncates active file
