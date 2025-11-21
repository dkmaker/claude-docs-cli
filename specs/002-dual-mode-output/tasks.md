# Tasks: Dual-Mode Output System

**Input**: Design documents from `/home/cp/code/dkmaker/claude-docs-cli/specs/002-dual-mode-output/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Following TDD workflow - tests written FIRST for each component

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

**CRITICAL PATH CHANGE**: All default paths use `~/.claude-docs/` instead of `~/.claude/`:
- Configuration: `~/.claude-docs/config.json`
- Logs: `~/.claude-docs/logs/`
- Cache: `~/.claude-docs/cache/`
- Documentation: `~/.claude-docs/docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Phase 2

- [X] T001 Create new directories per implementation plan: `src/lib/`, `src/utils/`, `src/types/`, `tests/unit/`, `tests/integration/`, `tests/fixtures/configs/`
- [X] T002 [P] Install Zod as dev dependency: `pnpm add -D zod` (for configuration validation)
- [X] T003 [P] Update `.gitignore` to include `~/.claude-docs/` directory and log files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and environment detection that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create `src/types/output.ts` with OutputMode type definitions ('ai' | 'user', source tracking)
- [X] T005 [P] Create `src/types/config.ts` with Configuration interface and Zod schema with defaults: `~/.claude-docs/config.json`, `~/.claude-docs/cache/`, `~/.claude-docs/docs/`, `~/.claude-docs/logs/`
- [X] T006 Create `src/utils/env.ts` with `detectOutputMode()` function (reads CLAUDECODE environment variable)
- [X] T007 Create test fixture: `tests/fixtures/configs/valid-config.json` with sample configuration using `~/.claude-docs/` paths
- [X] T008 [P] Create test fixture: `tests/fixtures/configs/invalid-config.json` with malformed configuration for testing validation

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - AI Agent Uses CLI Tool (Priority: P1) 🎯 MVP

**Goal**: Enable AI agents to use the CLI with minimal, markdown-formatted output and only relevant commands

**Independent Test**: Set `CLAUDECODE=1` and run any command - output should be markdown with only essential commands, no advanced features

### Tests for User Story 1 (TDD: Write FIRST, ensure they FAIL)

- [X] T009 [P] [US1] Write unit test for `detectOutputMode()` in `tests/unit/env.test.ts` - test env var detection, default to 'user'
- [X] T010 [P] [US1] Write unit test for OutputFormatter AI mode in `tests/unit/output-formatter.test.ts` - test markdown formatting for all methods (heading, success, error, warning, info, command, list)
- [X] T011 [US1] Write integration test for AI mode in `tests/integration/cli-modes.test.ts` - test CLI help output with CLAUDECODE=1 (should exclude 'status', 'reset-cache')

### Implementation for User Story 1

- [X] T012 [US1] Implement `detectOutputMode()` in `src/utils/env.ts` - check process.env.CLAUDECODE, return 'ai' if '1', else 'user'
- [X] T013 [US1] Create `src/lib/output-formatter.ts` with OutputFormatter class constructor taking mode: 'ai' | 'user'
- [X] T014 [P] [US1] Implement `heading()` method in OutputFormatter - AI mode: `## ${text}\n`, User mode: ANSI bold blue
- [X] T015 [P] [US1] Implement `success()` method in OutputFormatter - AI mode: `✓ ${text}`, User mode: ANSI green
- [X] T016 [P] [US1] Implement `error()` method in OutputFormatter - AI mode: `✗ ${text}`, User mode: ANSI red
- [X] T017 [P] [US1] Implement `warning()` method in OutputFormatter - AI mode: `⚠ ${text}`, User mode: ANSI yellow
- [X] T018 [P] [US1] Implement `info()` method in OutputFormatter - AI mode: plain text, User mode: ANSI blue
- [X] T019 [P] [US1] Implement `command()` method in OutputFormatter - AI mode: `` `${cmd}` - ${desc}\n ``, User mode: aligned with colors
- [X] T020 [P] [US1] Implement `list()` method in OutputFormatter - AI mode: `- ${item}\n`, User mode: bulleted with indent
- [X] T021 [US1] Run tests for User Story 1 and verify 100% pass rate: `pnpm test tests/unit/env.test.ts tests/unit/output-formatter.test.ts tests/integration/cli-modes.test.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional - AI mode outputs markdown, user mode outputs ANSI colors

---

## Phase 4: User Story 2 - Human User Uses CLI Tool (Priority: P2)

**Goal**: Provide rich, colorized output with all commands visible for human users

**Independent Test**: Run commands without CLAUDECODE=1 - output should show colors, all commands including status and reset-cache

### Tests for User Story 2 (TDD: Write FIRST, ensure they FAIL)

- [X] T022 [P] [US2] Write unit test for OutputFormatter user mode in `tests/unit/output-formatter.test.ts` - test ANSI color codes for all methods
- [X] T023 [P] [US2] Write unit test for `table()` method in `tests/unit/output-formatter.test.ts` - test tabular data formatting in both modes
- [X] T024 [US2] Write integration test for user mode in `tests/integration/cli-modes.test.ts` - test CLI help output without CLAUDECODE (should include 'status', 'reset-cache')

### Implementation for User Story 2

- [X] T025 [US2] Implement `table()` method in OutputFormatter - AI mode: markdown table, User mode: aligned table with colors
- [X] T026 [US2] Add TTY detection to OutputFormatter constructor - check `process.stdout.isTTY` to disable colors if not TTY
- [X] T027 [US2] Update `src/cli.ts` to conditionally show advanced commands based on output mode (status, reset-cache only in user mode)
- [X] T028 [US2] Run tests for User Story 2 and verify 100% pass rate: `pnpm test tests/unit/output-formatter.test.ts tests/integration/cli-modes.test.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - AI mode minimal, user mode comprehensive

---

## Phase 5: User Story 3 - Logging and File System Operations (Priority: P3)

**Goal**: Reliable async logging and file operations supporting both modes with configuration loading

**Independent Test**: Trigger operations and verify logs written correctly, files read/written, config loaded with defaults `~/.claude-docs/`

### Tests for User Story 3 (TDD: Write FIRST, ensure they FAIL)

- [X] T029 [P] [US3] Write unit test for config loading in `tests/unit/config.test.ts` - test Zod validation, defaults with `~/.claude-docs/` paths, invalid config handling
- [X] T030 [P] [US3] Write unit test for Logger in `tests/unit/logger.test.ts` - test log levels, console output, async file writes, context support
- [X] T031 [P] [US3] Write unit test for file operations in `tests/unit/file-ops.test.ts` - test ensureDir, readFile, writeFile, error handling
- [X] T032 [US3] Write integration test for logging in `tests/integration/logging.test.ts` - test end-to-end logging with file creation in `~/.claude-docs/logs/`

### Implementation for User Story 3

#### Configuration Management

- [X] T033 [US3] Implement `loadConfig()` in `src/utils/config.ts` - read config from `~/.claude-docs/config.json`, validate with Zod, merge with defaults
- [X] T034 [US3] Implement `getDefaultConfig()` in `src/utils/config.ts` - return defaults: logLevel='info', cacheDir='~/.claude-docs/cache/', docsPath='~/.claude-docs/docs/', maxLogSize=10MB, maxLogFiles=5
- [X] T035 [US3] Implement path expansion in `src/utils/config.ts` - expand `~` to home directory for all paths

#### Logging System

- [X] T036 [US3] Enhance `src/lib/logger.ts` with constructor taking logLevel, logFile path, OutputFormatter
- [X] T037 [P] [US3] Implement `shouldLog()` private method in Logger - compare log level against configured level (error < warn < info < debug)
- [X] T038 [P] [US3] Implement `formatLogEntry()` private method in Logger - format with timestamp, level, message, optional context
- [X] T039 [US3] Implement `log()` method in Logger - sync console output with formatter, async file append (non-blocking)
- [X] T040 [P] [US3] Implement `info()`, `warn()`, `error()`, `debug()` convenience methods in Logger - delegate to log() with appropriate level
- [X] T041 [US3] Implement `checkRotation()` private method in Logger - check file size before write, rotate if > maxLogSize
- [X] T042 [US3] Implement `rotateLogFiles()` private method in Logger - shift log.N files (log.4 → delete, log.3 → log.4, ..., log.0 → log.1), create new log.0

#### File Operations

- [X] T043 [US3] Create `src/lib/file-ops.ts` with `ensureDir()` function - create directory recursively if doesn't exist using `fs.promises.mkdir`
- [X] T044 [P] [US3] Implement `safeReadFile()` in file-ops.ts - async read with error handling, return content or throw descriptive error
- [X] T045 [P] [US3] Implement `safeWriteFile()` in file-ops.ts - ensure parent dir exists, async write with error handling
- [X] T046 [P] [US3] Implement `fileExists()` in file-ops.ts - check file exists using `fs.promises.access`
- [X] T047 [P] [US3] Implement `getFileSize()` in file-ops.ts - get file size using `fs.promises.stat`
- [X] T048 [US3] Implement `verifyFileIntegrity()` in file-ops.ts - placeholder for future checksum verification, currently just checks file exists and readable

#### Integration

- [X] T049 [US3] Update existing Logger in `src/lib/logger.ts` to use new async methods (maintain backward compatibility)
- [X] T050 [US3] Update `src/cli.ts` to initialize config, formatter, and logger at startup before command execution
- [X] T051 [US3] Run all tests for User Story 3 and verify 100% pass rate: `pnpm test tests/unit/config.test.ts tests/unit/logger.test.ts tests/unit/file-ops.test.ts tests/integration/logging.test.ts`

**Checkpoint**: All user stories should now be independently functional - config loads, logging works, files operations succeed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T052 [P] Add JSDoc comments to all public methods in OutputFormatter, Logger, config utils, file-ops
- [X] T053 [P] Update existing `src/cli.ts` to use new OutputFormatter for all output (replace console.log with formatter methods)
- [X] T054 [P] Update existing `src/commands/test-command.ts` to use OutputFormatter and Logger
- [X] T055 Update `README.md` (if exists) with new configuration path `~/.claude-docs/config.json` and environment variable CLAUDECODE
- [X] T056 Run full test suite and verify 100% pass rate: `pnpm test`
- [X] T057 Run type checking: `pnpm type-check`
- [X] T058 Run linting and formatting: `pnpm check`
- [X] T059 Run build and verify compilation: `pnpm build`
- [X] T060 Manual validation: Test CLI with `CLAUDECODE=1 node dist/cli.js --help` (AI mode) and `node dist/cli.js --help` (user mode)
- [X] T061 Performance benchmark: Verify startup time <100ms with `time node dist/cli.js --version`
- [X] T062 Create example configuration file: `examples/config.json` with all options documented using `~/.claude-docs/` paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Extends US1 OutputFormatter but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Uses OutputFormatter from US1 but independently testable

### Within Each User Story

1. **TDD Workflow (CRITICAL)**:
   - Write tests FIRST (T009-T011, T022-T024, T029-T032)
   - Run tests and verify they FAIL
   - Implement feature (T012-T021, T025-T028, T033-T051)
   - Run tests and verify they PASS
   - Refactor if needed while keeping tests green

2. **Task Order**:
   - Tests before implementation
   - Type definitions before usage
   - Base classes before extensions
   - Core methods before convenience methods
   - Individual components before integration

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks can run in parallel
- **Phase 2 (Foundational)**: T004, T005, T007, T008 can run in parallel (T006 depends on T004)
- **User Story 1 Tests**: T009, T010 can run in parallel (T011 depends on OutputFormatter types)
- **User Story 1 Implementation**: T014-T020 can run in parallel after T013
- **User Story 2 Tests**: T022, T023 can run in parallel
- **User Story 3 Tests**: T029, T030, T031 can run in parallel
- **User Story 3 Config**: T033-T035 sequential
- **User Story 3 Logger**: T037, T038 can run in parallel, T040 can run in parallel
- **User Story 3 File Ops**: T044-T048 can run in parallel after T043
- **Phase 6 Polish**: T052, T053, T054 can run in parallel
- **Once Foundational completes**: All 3 user stories (US1, US2, US3) can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Write all tests for User Story 1 in parallel:
pnpm vitest tests/unit/env.test.ts & # T009
pnpm vitest tests/unit/output-formatter.test.ts & # T010
wait # Ensure tests fail before implementation

# After T012 and T013, implement all formatting methods in parallel:
# T014: heading() method
# T015: success() method
# T016: error() method
# T017: warning() method
# T018: info() method
# T019: command() method
# T020: list() method
# (All work on different methods in same file, use feature branches or careful coordination)
```

---

## Parallel Example: User Story 3 File Operations

```bash
# After T043 (ensureDir), implement all file operations in parallel:
# T044: safeReadFile() in file-ops.ts
# T045: safeWriteFile() in file-ops.ts
# T046: fileExists() in file-ops.ts
# T047: getFileSize() in file-ops.ts
# T048: verifyFileIntegrity() in file-ops.ts
# (All different functions in same file)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T021)
4. **STOP and VALIDATE**:
   - Run `CLAUDECODE=1 node dist/cli.js --help`
   - Verify markdown output with only essential commands
   - Run `pnpm test` and confirm 100% pass rate for US1 tests
5. Demo/deploy MVP - AI mode ready for use

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → Type system and env detection ready
2. **MVP** (+ User Story 1) → AI mode functional, test independently
3. **Full Features** (+ User Story 2) → Human mode functional, test independently
4. **Complete** (+ User Story 3) → Logging and file ops functional, test independently
5. **Polish** → Production ready

### Parallel Team Strategy

With 3 developers after Foundational phase (T008) completes:

- **Developer A**: User Story 1 (T009-T021) - AI mode output
- **Developer B**: User Story 2 (T022-T028) - Human mode output
- **Developer C**: User Story 3 (T029-T051) - Logging and file ops

All stories integrate at T050 (CLI initialization), test independently throughout

---

## TDD Checklist (100% Pass Rate Required)

**Before marking ANY user story complete**:

1. ✅ All tests written BEFORE implementation
2. ✅ Verified tests FAIL before writing code
3. ✅ Implemented features to make tests PASS
4. ✅ Run `pnpm test` shows 100% pass rate (ZERO failures)
5. ✅ No `.skip()` or `.todo()` tests in final implementation
6. ✅ Existing tests for other features still pass (no regressions)
7. ✅ Run `pnpm type-check` passes
8. ✅ Run `pnpm check` passes (linting + formatting)

**Constitution Compliance**:
- ✅ Zero runtime dependencies (only Zod as dev dependency)
- ✅ Native TypeScript with type stripping
- ✅ ESM-only with .js extensions in imports
- ✅ Async file operations (non-blocking)
- ✅ Startup time <100ms verified
- ✅ TDD workflow followed

---

## Notes

- [P] tasks = different files or independent functions, can run in parallel
- [Story] label maps task to specific user story (US1, US2, US3) for traceability
- Each user story should be independently completable and testable
- **TDD is MANDATORY**: Write tests first, verify they fail, implement, verify they pass
- **100% pass rate is NON-NEGOTIABLE**: Feature not complete until all tests pass
- **Path changes**: All defaults must use `~/.claude-docs/` instead of `~/.claude/`
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Use `pnpm test:watch` during development for instant TDD feedback
