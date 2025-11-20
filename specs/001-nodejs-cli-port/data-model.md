# Data Model: Node.js CLI Port - Project Foundation

**Date**: 2025-11-20
**Phase**: Phase 1 - Design
**Status**: Complete

## Overview

This phase focuses on establishing project infrastructure, not business logic. Therefore, the data model is minimal, consisting primarily of configuration structures and command metadata.

---

## Entities

### 1. CLIProgram

**Description**: The root Command object that represents the entire CLI application.

**Attributes**:
- `name`: string - CLI binary name (e.g., "claude-docs")
- `version`: string - Semantic version from package.json
- `description`: string - One-line program description
- `commands`: Command[] - Registered subcommands

**Validation Rules**:
- version MUST follow semver format
- name MUST match package.json "name" field
- commands MUST have unique names

**State Transitions**: None (immutable after initialization)

**Relationships**:
- Has many `Command` (subcommands)

---

### 2. Command

**Description**: A discrete CLI command (e.g., `update`, `cache`, `--version`, `--help`)

**Attributes**:
- `name`: string - Command name (e.g., "update", "version")
- `description`: string - Help text description
- `options`: Option[] - Command-specific options/flags
- `arguments`: Argument[] - Positional arguments
- `handler`: Function - Async function executed when command is invoked
- `aliases`: string[] - Alternative names for the command

**Validation Rules**:
- name MUST be lowercase, hyphen-separated
- handler MUST be an async function
- options MUST have unique flags within the command
- arguments are processed in declared order

**State Transitions**: None (commands are stateless, state lives in handler execution)

**Relationships**:
- Belongs to `CLIProgram`
- Has many `Option`
- Has many `Argument`

---

### 3. Option

**Description**: A command-line flag or option (e.g., `--version`, `--no-cache`, `-p <port>`)

**Attributes**:
- `flags`: string - Option syntax (e.g., "-v, --version", "--no-cache", "-p, --port <number>")
- `description`: string - Help text for this option
- `defaultValue`: any | undefined - Default if option not provided
- `required`: boolean - Whether option is mandatory
- `variadic`: boolean - Whether option accepts multiple values

**Validation Rules**:
- flags MUST start with `-` or `--`
- Long flags (--xyz) are preferred for CLI readability
- Short flags (-x) are optional aliases

**Relationships**:
- Belongs to `Command`

---

### 4. Argument

**Description**: A positional command-line argument (e.g., `<slug>` in `get <slug>`)

**Attributes**:
- `name`: string - Argument name for help text
- `description`: string - Help text description
- `required`: boolean - Whether argument is mandatory
- `variadic`: boolean - Whether argument accepts multiple values (e.g., `[files...]`)
- `defaultValue`: any | undefined - Default if not provided

**Validation Rules**:
- required arguments MUST come before optional arguments
- variadic arguments MUST be the last argument

**Relationships**:
- Belongs to `Command`

---

### 5. LogMessage

**Description**: A structured log output with severity level and color coding

**Attributes**:
- `level`: LogLevel - Enum: "INFO" | "SUCCESS" | "WARN" | "ERROR"
- `message`: string - The log message content
- `timestamp`: Date - When the log was created

**Validation Rules**:
- level determines output color (INFO=blue, SUCCESS=green, WARN=yellow, ERROR=red)
- ERROR logs exit with code 1
- SUCCESS logs exit with code 0

**State Transitions**: None (immutable value object)

---

### 6. Configuration (Future Phase)

**Description**: Application configuration loaded from `claude-docs-urls.json` and user preferences.

**Note**: This entity is NOT part of the foundation phase. It will be defined in Phase 2 when implementing documentation management.

**Future Attributes** (for reference):
- `docsDir`: string - Path to documentation directory (~/.claude/docs)
- `cacheDir`: string - Path to cache directory
- `jsonFile`: string - Path to claude-docs-urls.json
- `cacheVersion`: string - Cache invalidation version

---

## Type Definitions

These TypeScript types will be defined in `src/types/index.ts`:

```typescript
// Core CLI types
export interface CLIProgram {
  name: string;
  version: string;
  description: string;
  commands: Command[];
}

export interface Command {
  name: string;
  description: string;
  options: Option[];
  arguments: Argument[];
  handler: CommandHandler;
  aliases?: string[];
}

export type CommandHandler = (...args: any[]) => Promise<void>;

export interface Option {
  flags: string;
  description: string;
  defaultValue?: any;
  required?: boolean;
  variadic?: boolean;
}

export interface Argument {
  name: string;
  description: string;
  required: boolean;
  variadic?: boolean;
  defaultValue?: any;
}

// Logging types
export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';

export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: Date;
}

// Configuration types (placeholder for future phases)
export interface AppConfig {
  docsDir: string;
  cacheDir: string;
  jsonFile: string;
  cacheVersion: string;
}
```

---

## Validation Summary

| Entity | Key Validations |
|--------|-----------------|
| CLIProgram | Semver version, unique command names |
| Command | Lowercase hyphenated names, async handlers, unique options |
| Option | Valid flag syntax (starts with `-` or `--`) |
| Argument | Required before optional, variadic must be last |
| LogMessage | Valid LogLevel enum value |

---

## Notes

**Foundation Phase Scope**:
- This data model covers ONLY the infrastructure entities
- Business logic entities (DocumentSection, CacheEntry, etc.) will be defined in later phases
- The model focuses on CLI structure, not documentation management

**Future Expansion**:
- Phase 2 will add: DocumentSection, Category, CacheEntry
- Phase 3 will add: MarkdownTransformer, Pipeline, Transform
- Phase 4 will add: CacheMetadata, CacheStatistics

**Design Principles**:
- Keep entities simple and focused
- Leverage Commander.js types where possible
- Avoid premature abstraction
- All entities are immutable value objects (no state mutations)
