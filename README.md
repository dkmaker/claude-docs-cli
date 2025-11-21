# claude-docs CLI

Claude Code Documentation Manager - Node.js CLI

## Installation

### For End Users

Install the latest version directly from GitHub Releases:

```bash
# Install latest version
npm install $(curl -s https://raw.githubusercontent.com/OWNER/REPO/main/LATEST_RELEASE.txt)
```

Or install a specific version:

```bash
# Install specific version (e.g., v1.2.3)
npm install https://github.com/OWNER/REPO/releases/download/v1.2.3/claude-docs-1.2.3.tgz
```

Verify installation:

```bash
claude-docs --version
claude-docs --help
```

### For Contributors

#### Prerequisites

- Node.js 22.x or higher
- pnpm 10.x or higher (auto-installed via Corepack)

#### Setup

```bash
# Clone the repository
git clone <repository-url>
cd claude-docs-cli

# Enable pnpm
corepack enable pnpm

# Install dependencies
pnpm install
```

## Development

### Build

```bash
# Build the CLI
pnpm build

# Clean build output
pnpm clean
```

### Testing

```bash
# Run tests in watch mode (TDD)
pnpm test

# Run tests once
pnpm test:run

# Run tests with coverage
pnpm test:coverage
```

### Code Quality

The project uses **Biome** for linting/formatting and **TypeScript** for type checking.

#### Quick Commands

```bash
# Run all checks (recommended before committing)
pnpm validate

# Individual checks
pnpm type-check        # TypeScript type checking
pnpm lint              # Biome linting only
pnpm format            # Biome formatting only (auto-fix)
pnpm check             # Biome lint + format with auto-fix
```

#### Code Quality Workflow

**Before committing:**
```bash
pnpm validate
```
This runs: linting → formatting → type checking → tests

**Detecting violations:**
```bash
# Check for linting issues
pnpm lint
# Example output: "src/example.ts:10:5 - Unexpected console.log"

# Check for type errors
pnpm type-check
# Example output: "src/example.ts:15:10 - Type 'string' is not assignable to type 'number'"
```

**Auto-fixing issues:**
```bash
# Auto-fix linting and formatting issues
pnpm check
# Biome will automatically fix most style violations

# Manual fixes required for:
# - Type errors (fix in source code)
# - Logic errors (fix in source code)
```

**Interpreting errors:**
- Errors include file path, line number, and column: `file.ts:10:5`
- Biome errors include rule names and suggestions
- TypeScript errors include expected vs actual types

### Running the CLI

```bash
# Development mode (with hot reload)
pnpm dev

# Production mode (after build)
pnpm start

# Or directly
node dist/cli.js --version
node dist/cli.js --help
```

## Project Structure

```
src/
├── cli.ts           # Main CLI entry point
├── commands/        # Command implementations
├── lib/             # Shared libraries
├── utils/           # Utility functions
└── types/           # TypeScript type definitions

tests/               # Test files (mirrors src/)
dist/                # Compiled output (gitignored)
```

## Available Commands

**Core Commands:**
- `update` - Manage documentation downloads and updates
  - `update check` - Check for documentation updates (default)
  - `update commit <message>` - Apply pending updates with changelog message
  - `update discard` - Discard pending updates
  - `update status` - Show update status and history
- `get <slug>` - Get documentation section (supports `slug#anchor` format)
- `list [doc]` - List all documentation or sections within a document
- `search <query>` - Search across all documentation
- `cache` - Manage documentation cache
  - `cache info` - Display cache statistics (default)
  - `cache clear` - Clear all cached files
  - `cache warm` - Pre-generate cache for all documentation

**Advanced Commands (User Mode):**
- `doctor` - Run health checks and verify installation

**Global Options:**
- `--version, -v` - Display version information
- `--help, -h` - Display help information

## Adding New Commands

The CLI uses Commander.js for command registration. Follow this pattern:

### 1. Create Command File

Create `src/commands/your-command.ts`:

```typescript
export function yourCommand(arg: string) {
  console.log(`Your command executed with: ${arg}`);
}
```

### 2. Register in CLI

Edit `src/cli.ts`:

```typescript
import { yourCommand } from './commands/your-command.js';

// Inside main() function, add:
program
  .command('your-command <arg>')
  .description('Description of your command')
  .action((arg: string) => {
    yourCommand(arg);
  });
```

### 3. Write Tests

Create `tests/commands/your-command.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
// ... test implementation
```

### 4. Test and Build

```bash
pnpm test           # Run tests
pnpm validate       # Full validation
pnpm build          # Build CLI
node dist/cli.js your-command test-value
```

### Command Features

Commander.js provides:
- **Required arguments**: `<arg>` (must be provided)
- **Optional arguments**: `[arg]` (can be omitted)
- **Options/flags**: `.option('-f, --flag', 'description')`
- **Auto-generated help**: `command --help`
- **Argument validation**: Automatic error for missing required args

## Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management and automated GitHub Releases.

### Release Workflow (Fully AI-Assisted)

The complete release process is handled by AI through 5 simple commands:

```bash
# 1. Create changeset
/change:changeset "description of your changes"

# 2. Commit it
/change:commit

# 3. Preview version
/change:version

# 4. Create release PR
/change:release

# 5. Merge and complete
/change:merge
```

Each command is intelligent:
- **Analyzes** your current state
- **Validates** prerequisites
- **Executes** the appropriate actions
- **Guides** you to the next step

**Need help?** Run `/change:help` anytime to see what to do next.

### Manual Workflow (Without AI)

If you prefer to manage changesets manually:

```bash
# 1. Create a changeset
pnpm changeset
# Follow prompts: select bump type and write summary

# 2. Commit the changeset
git add .changeset/
git commit -m "Add changeset for new feature"

# 3. When ready to release, run version bump
pnpm changeset version
# This updates package.json, CHANGELOG.md, and removes consumed changesets

# 4. Commit and push
git add .
git commit -m "chore: version packages"
git push origin main

# 5. GitHub Actions handles the rest automatically
```

### Semantic Versioning

- **Major (1.0.0 → 2.0.0)**: Breaking changes
- **Minor (1.0.0 → 1.1.0)**: New features (backwards-compatible)
- **Patch (1.0.0 → 1.0.1)**: Bug fixes (backwards-compatible)

### What Happens on Merge to Main

When a version bump PR is merged:

1. ✅ Quality gates run (lint, type-check, tests, build)
2. ✅ Changesets publishes the new version
3. ✅ GitHub Release created via **gh CLI** (official tool, no third-party actions)
4. ✅ Tarball uploaded to release
5. ✅ LATEST_RELEASE.txt updated

View releases at: `https://github.com/OWNER/REPO/releases`

## License

MIT
