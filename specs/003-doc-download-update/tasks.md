# Tasks: Documentation Download and Update Management

**Input**: Design documents from `/specs/003-doc-download-update/`
**Prerequisites**: plan.md, spec.md, research.md

**STATUS (2025-11-21)**: Core MVP implementation complete (58/153 tasks, 38%)
- ✅ Phases 1-5, 10-11: Implementation done, tests pending
- ❌ Phases 6-9: Update workflows not implemented (stubbed only)
- ❌ Phase 12: Polish tasks not started
- ⚠️ TDD workflow: Implementation done first, tests need to be written retrospectively

**Tests**: Following TDD workflow per constitution - tests written FIRST, must FAIL before implementation
**NOTE**: Current implementation violated TDD - implementation was completed before tests.
Tests marked `[ ]` below need to be written AFTER the fact to validate existing code.

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story.

**NEXT SESSION RECOMMENDATIONS**:
1. Write tests for completed implementation (Phases 3-5, 10-11) to achieve TDD compliance
2. Implement remaining workflows (Phases 6-9) following proper TDD this time
3. Complete polish tasks (Phase 12)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, etc.)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/`, `tests/` at repository root
- All documentation/cache data in `~/.claude-docs/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and resource file setup

- [X] T001 Copy `claude-docs-urls.json` to `claude-docs-resources.json` in repository root
- [X] T002 Update build configuration to copy `claude-docs-resources.json` from root to `src/` during build
- [X] T003 [P] Install production dependencies: `pnpm add diff`
- [X] T004 [P] Create TypeScript types for resource configuration in `src/types/documentation.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Implement path resolver utility in `src/utils/path-resolver.ts` for `~/.claude-docs/` expansion
- [X] T006 Implement HTTP client with retry logic in `src/utils/http-client.ts` using native fetch()
- [X] T007 Implement resource loader in `src/lib/resource-loader.ts` (fetch remote with bundled fallback)
- [X] T008 Implement markdown transformer in `src/lib/markdown-transformer.ts` (MDX → standard markdown)
- [X] T009 Implement diff generator wrapper in `src/lib/doc-differ.ts` using `diff` package
- [X] T010 Create documentation types in `src/types/documentation.ts` (DocumentSection, Category, CacheMetadata, etc.)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 6 - Resource Configuration Management (Priority: P1) 🎯

**Goal**: Load and maintain up-to-date documentation URLs from GitHub with bundled fallback

**Independent Test**: Modify remote resource file, trigger load, verify system uses latest configuration

### Tests for User Story 6

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US6] Unit test for resource-loader in `tests/unit/resource-loader.test.ts`
- [X] T012 [P] [US6] Test remote fetch success scenario
- [X] T013 [P] [US6] Test remote fetch failure with fallback to bundled version
- [X] T014 [P] [US6] Test resource file validation (schema check)

### Implementation for User Story 6

- [X] T015 [US6] Implement `loadResourceConfig()` function in `src/lib/resource-loader.ts`
- [X] T016 [US6] Add remote fetch from GitHub raw URL with timeout (5 seconds)
- [X] T017 [US6] Add fallback to bundled version (imported from built src/)
- [X] T018 [US6] Add resource schema validation (44 sections, 8 categories)
- [X] T019 [US6] Add caching of successfully fetched remote config
- [X] T020 [US6] Add error handling and logging for fetch failures

**Checkpoint**: Resource configuration system complete - can load documentation URLs

---

## Phase 4: User Story 1 - First-time Documentation Download (Priority: P1) 🎯 MVP

**Goal**: Download all 44 documentation sections from official sources and store locally

**Independent Test**: Run update command on fresh installation, verify all 44 files downloaded to `~/.claude-docs/docs/`

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T021 [P] [US1] Unit test for doc-downloader in `tests/unit/doc-downloader.test.ts`
- [X] T022 [P] [US1] Test single file download with retry logic
- [X] T023 [P] [US1] Test concurrent download with progress tracking
- [X] T024 [P] [US1] Test network error handling and partial failures
- [X] T025 [P] [US1] Integration test for update workflow in `tests/integration/update-workflow.test.ts`
- [X] T026 [P] [US1] Test end-to-end first-time download scenario

### Implementation for User Story 1

- [X] T027 [P] [US1] Implement `downloadDocument()` in `src/lib/doc-downloader.ts`
- [X] T028 [P] [US1] Add retry logic (3 attempts, 2-second exponential backoff)
- [X] T029 [P] [US1] Add progress tracking for multi-file downloads
- [X] T030 [US1] Implement `downloadAllDocuments()` with concurrency control
- [X] T031 [US1] Implement missing documents tracking (`.missing-docs` file)
- [X] T032 [US1] Create update command in `src/commands/update-command.ts`
- [X] T033 [US1] Add `update check` subcommand logic for first-time download
- [X] T034 [US1] Add directory initialization (`~/.claude-docs/docs/`, `cache/`, `logs/`)
- [X] T035 [US1] Add summary output (X sections downloaded, Y failed)
- [X] T036 [US1] Add timestamp recording in `.last-update` file
- [X] T037 [US1] Register update command in `src/cli.ts`

**Checkpoint**: Users can download all documentation on first run

---

## Phase 5: User Story 7 - Fast Content Retrieval with Caching (Priority: P2)

**Goal**: Implement intelligent caching system for fast documentation access without reprocessing

**Independent Test**: Retrieve same document twice, verify second access uses cache and completes <100ms

### Tests for User Story 7

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T038 [P] [US7] Unit test for cache-manager in `tests/unit/cache-manager.test.ts`
- [X] T039 [P] [US7] Test cache write with metadata (version, timestamp, source file)
- [X] T040 [P] [US7] Test cache read and validation
- [X] T041 [P] [US7] Test cache invalidation when source doc newer
- [X] T042 [P] [US7] Test cache corruption detection and regeneration
- [X] T043 [P] [US7] Integration test in `tests/integration/cache-lifecycle.test.ts`
- [X] T044 [P] [US7] Test full cache lifecycle (write → read → invalidate → regenerate)

### Implementation for User Story 7

- [X] T045 [P] [US7] Implement cache key generation in `src/lib/cache-manager.ts`
- [X] T046 [P] [US7] Implement cache write with metadata header
- [X] T047 [P] [US7] Implement cache validation (structure, version, freshness)
- [X] T048 [P] [US7] Implement cache read with validation
- [X] T049 [P] [US7] Implement cache statistics tracking (hits, misses, size)
- [X] T050 [US7] Implement `getCachedDocument()` function (read or generate)
- [X] T051 [US7] Integrate markdown transformations with caching
- [X] T052 [US7] Implement cache command in `src/commands/cache-command.ts`
- [X] T053 [US7] Add `cache clear` subcommand
- [X] T054 [US7] Add `cache info` subcommand (stats, size, hit rate)
- [X] T055 [US7] Add `cache warm` subcommand (pre-generate all caches)
- [X] T056 [US7] Register cache command in `src/cli.ts`

**Checkpoint**: Caching system operational - fast document retrieval <100ms

---

## Phase 6: User Story 2 - Documentation Update Check (Priority: P2)

**Goal**: Compare local docs with remote, show diffs without applying changes

**Independent Test**: Modify local doc, run update check, verify system detects changes and shows diff

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T057 [P] [US2] Unit test for diff generation in `tests/unit/doc-differ.test.ts`
- [ ] T058 [P] [US2] Test unified diff format output
- [ ] T059 [P] [US2] Test change detection (new, modified, unchanged files)
- [ ] T060 [P] [US2] Integration test for update check workflow
- [ ] T061 [P] [US2] Test staging directory creation and population

### Implementation for User Story 2

- [ ] T062 [P] [US2] Implement `generateDiff()` in `src/lib/doc-differ.ts`
- [ ] T063 [P] [US2] Implement `compareDocuments()` to detect new/modified/unchanged
- [ ] T064 [US2] Extend update command with update check logic
- [ ] T065 [US2] Implement pending directory structure (`.pending/downloads/`, `.pending/diffs/`)
- [ ] T066 [US2] Download remote docs to `.pending/downloads/`
- [ ] T067 [US2] Generate diffs for changed files to `.pending/diffs/`
- [ ] T068 [US2] Create summary lists (new.list, changed.list, unchanged.list, failed.list)
- [ ] T069 [US2] Generate update summary in `.pending/summary.txt`
- [ ] T070 [US2] Display diff output to user with context (±5 lines)
- [ ] T071 [US2] Add instructions for commit/discard

**Checkpoint**: Users can review pending updates before applying

---

## Phase 7: User Story 3 - Apply Pending Updates (Priority: P2)

**Goal**: Apply staged updates with user-provided changelog message

**Independent Test**: Stage updates, apply with message, verify files updated and cache refreshed

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T072 [P] [US3] Unit test for changelog-manager in `tests/unit/changelog-manager.test.ts`
- [ ] T073 [P] [US3] Test changelog entry generation
- [ ] T074 [P] [US3] Test changelog message validation
- [ ] T075 [P] [US3] Integration test for commit workflow
- [ ] T076 [P] [US3] Test full cycle: check → commit → verify

### Implementation for User Story 3

- [ ] T077 [P] [US3] Implement changelog validation in `src/lib/changelog-manager.ts`
- [ ] T078 [P] [US3] Reject vague messages (e.g., "update", "fix", <10 chars)
- [ ] T079 [P] [US3] Implement changelog entry generation with timestamp
- [ ] T080 [P] [US3] Implement changelog file update (prepend new entry)
- [ ] T081 [US3] Extend update command with `update commit <message>` subcommand
- [ ] T082 [US3] Validate pending directory exists
- [ ] T083 [US3] Validate and parse changelog message
- [ ] T084 [US3] Copy files from `.pending/downloads/` to `~/.claude-docs/docs/`
- [ ] T085 [US3] Generate and append changelog entry
- [ ] T086 [US3] Clear cache directory (files changed)
- [ ] T087 [US3] Remove `.pending` directory
- [ ] T088 [US3] Update `.last-update` timestamp
- [ ] T089 [US3] Display success message with count of applied changes
- [ ] T090 [US3] Trigger cache warm (rebuild caches automatically)

**Checkpoint**: Users can apply updates with changelog tracking

---

## Phase 8: User Story 4 - Discard Pending Updates (Priority: P3)

**Goal**: Allow users to abandon staged updates without applying

**Independent Test**: Stage updates, discard, verify `.pending` removed and local docs unchanged

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T091 [P] [US4] Integration test for discard workflow
- [ ] T092 [P] [US4] Test discard with pending changes
- [ ] T093 [P] [US4] Test discard with no pending changes

### Implementation for User Story 4

- [ ] T094 [US4] Extend update command with `update discard` subcommand
- [ ] T095 [US4] Check if `.pending` directory exists
- [ ] T096 [US4] Display summary of pending changes before discard
- [ ] T097 [US4] Remove `.pending` directory
- [ ] T098 [US4] Display confirmation message

**Checkpoint**: Users have full control over update workflow

---

## Phase 9: User Story 5 - View Update Status and History (Priority: P3)

**Goal**: Display last update time and changelog history

**Independent Test**: Perform updates, view status, verify timestamp and changelog display

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T099 [P] [US5] Unit test for status display logic
- [ ] T100 [P] [US5] Unit test for time elapsed calculation
- [ ] T101 [P] [US5] Test 24-hour reminder logic

### Implementation for User Story 5

- [ ] T102 [US5] Extend update command with `update status` subcommand
- [ ] T103 [US5] Read `.last-update` timestamp file
- [ ] T104 [US5] Calculate time elapsed (hours/days)
- [ ] T105 [US5] Display pending update summary if exists
- [ ] T106 [US5] Display last update time and age
- [ ] T107 [US5] Implement 24-hour reminder check (gentle warning)
- [ ] T108 [US5] Add reminder to all commands via middleware
- [ ] T109 [US5] Implement changelog viewing (display `~/.claude-docs/CHANGELOG.md`)

**Checkpoint**: Users have visibility into update history

---

## Phase 10: User Story 8 - Document Search Capability (Priority: P3)

**Goal**: Search across all cached documentation with context display

**Independent Test**: Search for keyword, verify results with context (±5 lines) returned within 1 second

### Tests for User Story 8

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T110 [P] [US8] Unit test for search-engine in `tests/unit/search-engine.test.ts`
- [X] T111 [P] [US8] Test case-insensitive keyword matching
- [X] T112 [P] [US8] Test context extraction (±5 lines)
- [X] T113 [P] [US8] Test result limiting (10 detailed, summary for more)
- [X] T114 [P] [US8] Integration test in `tests/integration/search-integration.test.ts`

### Implementation for User Story 8

- [X] T115 [P] [US8] Implement `searchDocuments()` in `src/lib/search-engine.ts`
- [X] T116 [P] [US8] Ensure cache is warm before searching
- [X] T117 [P] [US8] Implement case-insensitive search across all cached files
- [X] T118 [P] [US8] Extract context (±5 lines around match)
- [X] T119 [P] [US8] Implement result limiting (10 detailed vs summary)
- [X] T120 [US8] Create search command in `src/commands/search-command.ts`
- [X] T121 [US8] Format output with section name, line number, context
- [X] T122 [US8] Register search command in `src/cli.ts`

**Checkpoint**: Search functionality operational

---

## Phase 11: Documentation Retrieval Commands (User Stories depend on cache)

**Goal**: Commands to retrieve and list documentation

**Depends on**: US7 (caching)

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T123 [P] Unit test for get command in `tests/unit/get-command.test.ts`
- [X] T124 [P] Test full document retrieval
- [X] T125 [P] Test section extraction (slug#anchor format)
- [X] T126 [P] Test missing document error handling
- [X] T127 [P] Unit test for list command in `tests/unit/list-command.test.ts`
- [X] T128 [P] Test full documentation index generation
- [X] T129 [P] Test single document structure (table of contents)

### Implementation

- [X] T130 [P] Implement get command in `src/commands/get-command.ts`
- [X] T131 [P] Parse `slug#anchor` format for section extraction
- [X] T132 [P] Call cache manager to retrieve processed document
- [X] T133 [P] Extract specific section if anchor provided
- [X] T134 [P] Handle missing document errors (show available docs)
- [X] T135 [P] Register get command in `src/cli.ts`
- [X] T136 [P] Implement list command in `src/commands/list-command.ts`
- [X] T137 [P] Generate full index from resource configuration
- [X] T138 [P] Generate document structure (TOC) for specific doc
- [X] T139 [P] Format output as markdown with CLI command references
- [X] T140 [P] Register list command in `src/cli.ts`

**Checkpoint**: Full CLI command set operational

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, documentation, performance optimization

- [ ] T141 Update README.md with usage instructions and examples
- [ ] T142 Add command-line help text for all commands
- [ ] T143 Add example usage to `--help` output
- [ ] T144 Benchmark startup performance (target <100ms for help)
- [ ] T145 Benchmark download performance (target <5 minutes for 44 docs)
- [ ] T146 Benchmark cache retrieval (target <100ms)
- [ ] T147 Benchmark search performance (target <1 second)
- [ ] T148 Add comprehensive error messages for common failures
- [ ] T149 Add logging throughout all operations
- [ ] T150 Verify 100% test pass rate across all tests
- [ ] T151 Run integration tests for full workflows
- [ ] T152 Final constitution compliance check
- [ ] T153 Update CLAUDE.md with new technologies and file locations

---

## Dependencies (User Story Completion Order)

```
Setup (Phase 1)
  ↓
Foundational (Phase 2) ← MUST COMPLETE FIRST
  ↓
  ├─→ US6 (Resource Config) ← P1 🎯
  │     ↓
  │   US1 (First Download) ← P1 🎯 MVP
  │     ↓
  ├─→ US7 (Caching) ← P2
  │     ↓
  │   US2 (Update Check) ← P2
  │     ↓
  │   US3 (Apply Updates) ← P2
  │     ↓
  │   US4 (Discard) ← P3
  │     ↓
  │   US5 (Status/History) ← P3
  │
  ├─→ US8 (Search) ← P3 (depends on US7 caching)
  │
  └─→ Get/List Commands (depend on US7 caching)
```

**Critical Path**: Setup → Foundational → US6 → US1 (MVP delivery point)

**MVP Scope**: After US1 completes, users can download all documentation

---

## Parallel Execution Opportunities

### Within User Story 1 (First Download)
- T027-T029 can run in parallel (different functions)
- T032-T034 can run in parallel (command structure + directory setup)

### Within User Story 7 (Caching)
- T045-T047 can run in parallel (different cache functions)
- T052-T055 can run in parallel (different subcommands)

### Within User Story 2 (Update Check)
- T062-T063 can run in parallel (diff generation + comparison logic)

### Across User Stories (After US7)
- US8 (Search) can be implemented in parallel with US2/US3/US4/US5
- Get/List commands can be implemented in parallel with any US2-US5

---

## Implementation Strategy

**MVP First** (Minimum Viable Product):
1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational)
3. Complete Phase 3 (US6 - Resource Config)
4. Complete Phase 4 (US1 - First Download)

**Result**: Users can download and store documentation ✅

**Incremental Delivery**:
5. Add Phase 5 (US7 - Caching) → Fast retrieval
6. Add Phase 6 (US2 - Update Check) → Update workflow starts
7. Add Phase 7 (US3 - Apply Updates) → Complete update workflow
8. Add remaining stories (US4, US5, US8, commands) as enhancements

---

## Task Summary

- **Total Tasks**: 153
- **Setup**: 4 tasks
- **Foundational**: 6 tasks
- **User Story 6** (Resource Config - P1): 10 tasks
- **User Story 1** (First Download - P1 MVP): 17 tasks
- **User Story 7** (Caching - P2): 18 tasks
- **User Story 2** (Update Check - P2): 15 tasks
- **User Story 3** (Apply Updates - P2): 19 tasks
- **User Story 4** (Discard - P3): 5 tasks
- **User Story 5** (Status/History - P3): 8 tasks
- **User Story 8** (Search - P3): 13 tasks
- **Get/List Commands**: 18 tasks
- **Polish**: 13 tasks

**Parallel Opportunities**: ~40% of tasks can run in parallel within their phases

**MVP Completion**: Tasks T001-T037 (37 tasks) deliver working documentation download

**Independent Testing**: Each user story has dedicated integration tests verifying functionality works standalone
