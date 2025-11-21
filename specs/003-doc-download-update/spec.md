# Feature Specification: Documentation Download and Update Management

**Feature Branch**: `003-doc-download-update`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "we need to make ## Phase 3: Documentation download and update management so we need to research how the existing @claude-docs.sh works - and downloads it uses a config file the config file should be implemented directly into the source as a loadable resource from the root of the repository - we should rename it to claude-docs-resources.json or someting like that - it's important that its in the reposiotry and does not follow as a config element - i suggest its downloaded from https://raw.githubusercontent.com/dkmaker/claude-docs-cli/refs/heads/main/<filename>.json and if that fails it uses a cached version so the actual build will copy it from the root into the src when it builds the application - the download logic and update management can me changed as long as it provides the same features as it have already - its CRITICAL that you read the whole exiting script and understand all the elements of how its actually working to implement the next phase that is to port Documentation downloading and update management based on the existing implementation in the current project where we are porting to node.js"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-time Documentation Download (Priority: P1)

A new user installs the CLI tool and runs it for the first time. The system needs to automatically download all Claude Code documentation files from the official source and make them available for use.

**Why this priority**: This is the foundation - without documentation downloaded, no other features can function. It represents the absolute minimum viable product.

**Independent Test**: Can be fully tested by running the update command on a fresh installation and verifying that all 44 documentation files are successfully downloaded and stored locally.

**Acceptance Scenarios**:

1. **Given** no local documentation exists, **When** user runs the update command, **Then** system downloads all documentation sections from remote source and stores them in the cache directory
2. **Given** download is in progress, **When** user views progress, **Then** system displays current status (e.g., "Downloading 23/44 sections...")
3. **Given** download completes successfully, **When** system finishes, **Then** user receives confirmation message indicating number of sections downloaded
4. **Given** network connectivity issues, **When** download fails for specific sections, **Then** system tracks failed downloads, displays clear error messages, and continues with remaining sections

---

### User Story 2 - Documentation Update Check (Priority: P2)

A user with existing documentation wants to check if there are any updates available from the official source without immediately applying them.

**Why this priority**: Users need to review what's changed before updating to avoid surprises. This enables safe, controlled updates.

**Independent Test**: Can be tested independently by modifying a local doc file, running update check, and verifying the system detects changes and shows differences without applying them.

**Acceptance Scenarios**:

1. **Given** local documentation exists, **When** user runs update check, **Then** system compares local files with remote versions and displays summary of changes (new sections, modified sections, unchanged sections)
2. **Given** updates are detected, **When** user views details, **Then** system shows line-by-line differences for each changed section
3. **Given** no updates exist, **When** user runs update check, **Then** system reports "All documentation is up to date" and records timestamp
4. **Given** some sections fail to download, **When** update check completes, **Then** system displays warning about unavailable sections with specific URLs that failed

---

### User Story 3 - Apply Pending Updates (Priority: P2)

After reviewing detected changes, a user decides to apply the updates to their local documentation cache.

**Why this priority**: Completes the update workflow initiated by P2 story. Users must be able to control when updates are applied after reviewing changes.

**Independent Test**: Can be tested by staging updates from P2 story, applying them, and verifying local files are updated and cache is refreshed.

**Acceptance Scenarios**:

1. **Given** pending updates exist from previous check, **When** user applies updates with a descriptive message, **Then** system copies new versions to local cache, updates changelog, and clears old cache entries
2. **Given** user provides insufficient changelog message, **When** attempting to apply updates, **Then** system rejects the update and requests a more descriptive message (10-1000 characters)
3. **Given** updates are applied successfully, **When** process completes, **Then** system displays count of applied changes and automatically rebuilds cache for fast access
4. **Given** user decides not to apply updates, **When** user discards pending changes, **Then** system removes staged updates and leaves local documentation unchanged

---

### User Story 4 - Discard Pending Updates (Priority: P3)

A user who has checked for updates decides not to apply them and wants to discard the pending changes.

**Why this priority**: Provides users control to abandon updates they've reviewed but don't want to apply. Less critical than applying updates.

**Independent Test**: Can be tested by running update check to stage changes, then discarding them and verifying pending updates are removed.

**Acceptance Scenarios**:

1. **Given** pending updates exist, **When** user discards updates, **Then** system removes all staged changes and displays confirmation
2. **Given** no pending updates exist, **When** user tries to discard, **Then** system informs user there are no pending updates to discard

---

### User Story 5 - View Update Status and History (Priority: P3)

A user wants to understand when documentation was last updated and view the changelog of all past updates.

**Why this priority**: Helps users track documentation history and understand what has changed over time. Nice-to-have for transparency but not critical for core functionality.

**Independent Test**: Can be tested by performing several updates and then viewing status to verify timestamp tracking and changelog generation work correctly.

**Acceptance Scenarios**:

1. **Given** updates have been applied previously, **When** user views update status, **Then** system displays last update timestamp and indicates time elapsed (hours/days)
2. **Given** user requests changelog, **When** viewing history, **Then** system displays chronological list of all updates with descriptions and affected sections
3. **Given** system hasn't been updated in over 24 hours, **When** user runs any command, **Then** system displays gentle reminder to check for updates

---

### User Story 6 - Resource Configuration Management (Priority: P1)

The system needs to maintain an up-to-date list of all documentation URLs and metadata without requiring manual configuration by users.

**Why this priority**: Critical infrastructure - the system must know what to download. Self-updating resource file ensures users always have access to latest documentation sources.

**Independent Test**: Can be tested by modifying the remote resource file, triggering an update, and verifying the system downloads and uses the latest resource configuration.

**Acceptance Scenarios**:

1. **Given** application starts, **When** performing documentation operations, **Then** system attempts to fetch latest resource file from GitHub repository main branch
2. **Given** remote resource file is accessible, **When** download succeeds, **Then** system updates local cached copy for future use
3. **Given** remote resource file is inaccessible, **When** download fails, **Then** system falls back to bundled resource file from build time
4. **Given** resource file is loaded, **When** system processes it, **Then** all 44 documentation sections across 8 categories are available with correct URLs and metadata

---

### User Story 7 - Fast Content Retrieval with Caching (Priority: P2)

Users need quick access to documentation content without reprocessing markdown transformations on every request.

**Why this priority**: Performance optimization that significantly improves user experience. Important but system can function without it (just slower).

**Independent Test**: Can be tested by retrieving the same document multiple times and measuring response time difference between cache hit and cache miss.

**Acceptance Scenarios**:

1. **Given** a document is requested for the first time, **When** content is retrieved, **Then** system processes markdown transformations and stores result in cache
2. **Given** a cached document exists and source hasn't changed, **When** same document is requested, **Then** system returns cached version without reprocessing
3. **Given** source document has been updated, **When** cached document is requested, **Then** system detects source is newer, regenerates cache, and returns fresh content
4. **Given** cache becomes stale or corrupted, **When** user clears cache, **Then** system removes all cached content and rebuilds on next access
5. **Given** cache statistics tracking is enabled, **When** user views cache info, **Then** system displays hit rate, cache size, and largest cached files

---

### User Story 8 - Document Search Capability (Priority: P3)

Users want to search across all documentation to find specific information quickly without knowing which section to look in.

**Why this priority**: Valuable convenience feature but users can manually browse sections if search isn't available. Enhancement rather than core requirement.

**Independent Test**: Can be tested by searching for known keywords and verifying results show relevant sections with context.

**Acceptance Scenarios**:

1. **Given** documentation is cached, **When** user searches for a keyword, **Then** system searches all cached documents and returns matching sections with line numbers
2. **Given** search returns matches, **When** results are displayed, **Then** system shows surrounding context (±5 lines) for each match
3. **Given** search returns more than 10 matches, **When** displaying results, **Then** system shows summary by section instead of detailed context to avoid overwhelming output
4. **Given** search finds no matches, **When** results are empty, **Then** system clearly indicates no matches found for the query

---

### Edge Cases

- What happens when documentation resource file format changes incompatibly? System should validate schema version and fall back to bundled version if mismatch detected.
- How does system handle partial download failures (e.g., 40/44 sections succeed)? System should track failed URLs separately, warn user, and mark those sections as unavailable until URLs are fixed.
- What happens when user provides vague update descriptions like "update" or "fix"? System should reject and require more descriptive message (enforced minimum 10 characters, avoiding single-word messages).
- How does system handle cache corruption? Each cache file includes metadata line with version stamp; system validates structure on read and regenerates if corrupted.
- What happens when network is completely unavailable during first run? System should provide clear error message explaining documentation cannot be downloaded and user should retry when network is available.
- What happens when changelog grows extremely large? System displays most recent entries first in chronological order, allowing users to review recent changes without loading entire history.
- How does system handle concurrent update operations? System should use file-based locking on pending directory to prevent multiple simultaneous updates from corrupting state.
- What happens when cache directory has insufficient disk space? System should detect disk space issues during cache write and display clear error message with space requirements.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST download documentation files from official Claude Code documentation URLs defined in resource configuration file
- **FR-002**: System MUST fetch resource configuration from remote GitHub repository (https://raw.githubusercontent.com/dkmaker/claude-docs-cli/refs/heads/main/claude-docs-resources.json) and fall back to bundled version if remote is unavailable
- **FR-003**: System MUST bundle a copy of the resource configuration file at build time by copying from repository root to source directory
- **FR-004**: System MUST store downloaded documentation in a local cache directory (~/.claude-docs/docs)
- **FR-005**: System MUST track which documentation sections failed to download and maintain a missing documents file (.missing-docs) with failed URLs
- **FR-006**: System MUST compare local documentation with remote versions to detect changes (new sections, modified sections, removed sections)
- **FR-007**: System MUST generate line-by-line differences for changed documentation sections using standard diff format
- **FR-008**: System MUST stage pending updates in a separate directory (.pending) without immediately applying them to allow user review
- **FR-009**: System MUST require user-provided changelog description (10-1000 characters) when applying updates
- **FR-010**: System MUST validate changelog messages and reject vague descriptions (e.g., single words like "update", "fix", "change")
- **FR-011**: System MUST generate changelog entries automatically with timestamp, user description, and list of affected files
- **FR-012**: System MUST maintain a changelog file (CHANGELOG.md) with all update history in reverse chronological order
- **FR-013**: System MUST allow users to discard pending updates without applying them
- **FR-014**: System MUST display update status including last update timestamp and time elapsed
- **FR-015**: System MUST warn users when documentation hasn't been updated in over 24 hours (gentle reminder, not blocking)
- **FR-016**: System MUST cache processed documentation content to avoid reprocessing markdown transformations on every request
- **FR-017**: System MUST invalidate cache entries when source documentation is updated
- **FR-018**: System MUST store cache metadata (version, timestamp, source file) with each cached document for validation
- **FR-019**: System MUST detect cache corruption by validating cache file structure and regenerate corrupted entries
- **FR-020**: System MUST provide cache management commands (clear, info, warm/pre-generate)
- **FR-021**: System MUST track cache statistics including hit rate, total size, and number of cached items
- **FR-022**: System MUST support search across all cached documentation with case-insensitive matching
- **FR-023**: System MUST display search results with contextual lines (±5 lines around match)
- **FR-024**: System MUST limit detailed search results to 10 matches and show summary for more extensive results to avoid overwhelming output
- **FR-025**: System MUST retry failed downloads up to 3 times with exponential backoff (2 second delay between retries)
- **FR-026**: System MUST display progress indicators during multi-file download operations
- **FR-027**: System MUST handle all 44 documentation sections across 8 categories defined in resource configuration
- **FR-028**: System MUST preserve all markdown transformation capabilities from the original bash implementation (MDX callouts, cards, tabs, steps, code blocks, internal links)

### Key Entities

- **Documentation Resource File**: JSON configuration containing all documentation URLs, organized by categories and sections, with metadata (title, filename, description). Fetched from remote repository or loaded from bundled fallback.

- **Documentation Section**: Individual markdown document representing one topic (e.g., "plugins.md", "mcp.md"). Contains title, URL source, filename, and description. 44 total sections exist.

- **Category**: Grouping of related documentation sections (e.g., "Getting Started", "Build with Claude Code"). 8 categories organize all 44 sections.

- **Cache Entry**: Processed documentation content stored for fast retrieval. Includes metadata (cache version, source file, timestamp) and transformed markdown content.

- **Pending Update**: Staged changes detected during update check, stored in temporary directory. Contains downloaded new versions, diff files showing changes, and summary lists (new, changed, unchanged, failed).

- **Changelog Entry**: Historical record of a documentation update. Contains timestamp, user-provided description, and list of affected files.

- **Missing Document Record**: Tracking information for documentation sections that failed to download. Stores section slug and attempted URL for troubleshooting.

- **Cache Statistics**: Metadata tracking cache performance including hit count, miss count, total cached items, and total cache size.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time documentation download completes successfully with all 44 sections retrieved in under 5 minutes on typical network connection
- **SC-002**: Users can detect, review, and apply documentation updates in under 2 minutes (excluding network download time)
- **SC-003**: Cache hit rate exceeds 80% for typical usage patterns (reading same sections multiple times)
- **SC-004**: Cached document retrieval completes in under 100 milliseconds (vs multi-second processing without cache)
- **SC-005**: Search queries return relevant results with context within 1 second for entire documentation corpus
- **SC-006**: System successfully falls back to bundled resource configuration when remote fetch fails 100% of the time
- **SC-007**: All markdown transformation features from original bash implementation are preserved with identical output
- **SC-008**: Users receive clear actionable error messages for all failure scenarios (network issues, disk space, invalid input, etc.)
- **SC-009**: Update workflow prevents accidental overwrites by requiring explicit user approval before applying changes
- **SC-010**: System handles partial download failures gracefully, tracking failed sections and allowing successful sections to be used immediately

### Assumptions

- Users have Node.js 22.x LTS environment as per project requirements
- Network connectivity is available for initial download (system gracefully handles offline use after first download)
- Disk space is sufficient for documentation cache (approximately 5-10 MB for all sections plus cache overhead)
- Documentation source URLs follow consistent markdown format from official Claude Code docs
- Resource configuration JSON schema remains backward compatible (system validates version and falls back if incompatible)
- Build process has write access to copy resource file from root to src directory during compilation
- Users understand that updates require explicit approval (staged changes are not auto-applied)
- Default data directory (~/.claude-docs/) is writable by the application, following constitution Principle IX
