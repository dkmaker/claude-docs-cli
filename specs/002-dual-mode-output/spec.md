# Feature Specification: Dual-Mode Output System

**Feature Branch**: `002-dual-mode-output`
**Created**: 2025-11-20
**Status**: Draft
**Input**: User description: "Phase 2: Core utility functions with dual-mode output (AI-friendly vs user-friendly) supporting logging, file system operations, and configuration loading"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - AI Agent Uses CLI Tool (Priority: P1)

An AI agent (Claude Code) needs to use the claude-docs CLI to search and retrieve documentation with minimal cognitive overhead and clear next actions.

**Why this priority**: This is the primary use case for the tool. AI agents need streamlined, actionable output to efficiently help users work with Claude Code documentation.

**Independent Test**: Can be fully tested by setting `CLAUDECODE=1` environment variable and running any command. Success means receiving markdown-formatted output with only relevant commands and clear next steps, without any "nice to know" features or advanced options.

**Acceptance Scenarios**:

1. **Given** CLAUDECODE=1 is set, **When** AI runs `claude-docs search "hooks"`, **Then** output shows search results in markdown format with only the essential commands needed for next steps
2. **Given** CLAUDECODE=1 is set and documentation is outdated, **When** AI runs any query, **Then** output shows warning about outdated docs with update instructions (but update command NOT shown in help output)
3. **Given** CLAUDECODE=1 is set and a file is missing, **When** AI runs a command, **Then** output shows clear error message explaining what's missing and what action to take
4. **Given** CLAUDECODE=1 is set, **When** AI runs update command after seeing warning, **Then** output follows diff process and instructs AI to make changelog entries

---

### User Story 2 - Human User Uses CLI Tool (Priority: P2)

A human developer wants to browse and search Claude Code documentation with a rich, feature-complete experience that looks polished and provides comprehensive options.

**Why this priority**: Human users expect a full-featured CLI experience with status information, cache management, and visually appealing output. This is secondary to AI functionality but essential for direct human usage.

**Independent Test**: Can be fully tested by running commands without CLAUDECODE=1 set. Success means receiving rich, formatted output with all available features, status information, and advanced options visible in help text.

**Acceptance Scenarios**:

1. **Given** CLAUDECODE is not set to 1, **When** user runs `claude-docs --help`, **Then** output shows all commands including advanced features, cache management, status, and update options with rich formatting
2. **Given** CLAUDECODE is not set to 1, **When** user runs `claude-docs status`, **Then** output displays comprehensive status information including cache state, documentation version, and last update time
3. **Given** CLAUDECODE is not set to 1, **When** user runs `claude-docs search "MCP"`, **Then** output shows results with rich formatting, colors, and all available navigation options
4. **Given** CLAUDECODE is not set to 1, **When** user runs `claude-docs reset-cache`, **Then** cache is cleared and user receives confirmation with visual feedback

---

### User Story 3 - Logging and File System Operations (Priority: P3)

The system needs reliable logging and file system operations to support both modes, including configuration loading, cache management, and error tracking.

**Why this priority**: This is infrastructure that supports both AI and human modes. While essential for the tool to function, it's less visible to users and can be developed after the core output modes are established.

**Independent Test**: Can be tested independently by triggering various operations (search, update, cache operations) and verifying that logs are written correctly, files are read/written properly, and configuration is loaded without errors.

**Acceptance Scenarios**:

1. **Given** configuration file exists, **When** tool starts up, **Then** configuration is loaded and applied to current session
2. **Given** logging is enabled, **When** any command is executed, **Then** relevant events are logged to appropriate log file with timestamp and severity
3. **Given** cache directory doesn't exist, **When** tool attempts to cache data, **Then** directory is created automatically and operation succeeds
4. **Given** file operation fails, **When** error occurs, **Then** error is logged with context and user receives appropriate error message for their mode (AI vs human)

---

### Edge Cases

- What happens when `CLAUDECODE` is set to a value other than 1 (e.g., "true", "yes", "0")?
- How does system handle switching between modes mid-session?
- What happens when log file or cache directory is not writable?
- How does system handle malformed configuration files?
- What happens when documentation database is corrupted or partially missing?
- How does system behave when network is unavailable during update check?
- What happens when user runs multiple instances of the tool simultaneously?

## Requirements *(mandatory)*

### Functional Requirements

#### Output Mode Detection and Selection

- **FR-001**: System MUST detect the CLAUDECODE environment variable on startup and determine output mode (AI-friendly if CLAUDECODE=1, user-friendly otherwise)
- **FR-002**: System MUST maintain consistent output mode throughout a single command execution
- **FR-003**: System MUST provide markdown-formatted output in AI mode with minimal decoration
- **FR-004**: System MUST provide rich, colorized output in user mode with comprehensive formatting

#### AI-Friendly Mode (CLAUDECODE=1)

- **FR-005**: System MUST show only relevant commands in help output when in AI mode (exclude advanced features, manual cache reset, status checks)
- **FR-006**: System MUST display warnings for missing files and outdated documentation in AI mode
- **FR-007**: System MUST NOT show update command in AI mode help, but MUST show it in warning messages when update is needed
- **FR-008**: System MUST provide clear next action recommendations in AI mode output
- **FR-009**: System MUST include minimal context in AI mode (no "nice to know" information or verbose explanations)
- **FR-010**: System MUST format diff output clearly when AI updates documentation, with instructions to create changelog entries

#### User-Friendly Mode (CLAUDECODE!=1)

- **FR-011**: System MUST display all available commands in help output when in user mode
- **FR-012**: System MUST provide rich visual formatting including colors, boxes, and clear sections in user mode
- **FR-013**: System MUST support `status` command that displays cache state, version info, and last update time in user mode
- **FR-014**: System MUST support `reset-cache` command for manual cache management in user mode
- **FR-015**: System MUST provide detailed information and context in user mode output
- **FR-016**: System MUST show examples and usage tips in user mode help text

#### Logging System

- **FR-017**: System MUST log all significant operations (searches, updates, errors, warnings) to a log file
- **FR-018**: System MUST include timestamp, severity level, and context in each log entry
- **FR-019**: System MUST support configurable log levels (error, warning, info, debug)
- **FR-020**: System MUST rotate log files when they exceed size threshold
- **FR-021**: System MUST write logs asynchronously to avoid blocking main operations

#### File System Operations

- **FR-022**: System MUST read documentation database files from configured location
- **FR-023**: System MUST write cache data to configured cache directory
- **FR-024**: System MUST create directories automatically when they don't exist
- **FR-025**: System MUST handle file permission errors gracefully with appropriate error messages
- **FR-026**: System MUST verify file integrity when reading cached data
- **FR-027**: System MUST clean up temporary files after operations complete

#### Configuration Loading

- **FR-028**: System MUST load configuration from default location on startup
- **FR-029**: System MUST support configuration overrides via command-line flags
- **FR-030**: System MUST validate configuration values and provide clear error messages for invalid configuration
- **FR-031**: System MUST support configuration for: log level, cache directory, documentation path, output mode preferences
- **FR-032**: System MUST fall back to sensible defaults when configuration is missing or invalid

### Key Entities

- **OutputMode**: Represents the current output mode (AI or User), determines formatting strategy, command visibility, and verbosity level
- **Configuration**: Represents tool configuration including paths (log directory, cache directory, documentation path), preferences (log level, default mode), and runtime settings
- **LogEntry**: Represents a single log entry with timestamp, severity level, message, and optional context data
- **FileOperation**: Represents file system operations (read, write, delete, create directory) with source/destination paths, operation type, and success/failure status

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: AI agents can successfully complete documentation lookup tasks with 50% fewer commands shown in help output compared to user mode
- **SC-002**: AI mode output contains only actionable information - 100% of output lines should be relevant to the current task or next steps
- **SC-003**: User mode provides comprehensive information - help output includes 100% of available commands and features
- **SC-004**: All file operations complete successfully within 100ms for local file system operations
- **SC-005**: Configuration loading completes within 50ms on startup
- **SC-006**: Logging operations do not add more than 5ms overhead to any command execution
- **SC-007**: System handles at least 1000 file operations per second without degradation
- **SC-008**: 95% of users (both AI and human) can complete their primary task on first attempt without confusion about available commands or next steps
