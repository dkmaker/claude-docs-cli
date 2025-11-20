# claude-docs CLI

Claude Code Documentation Manager - Node.js CLI

## Installation

### Prerequisites

- Node.js 22.x or higher
- pnpm 10.x or higher (auto-installed via Corepack)

### Setup

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

Foundation phase (v1.0.0):
- `--version, -v` - Display version information
- `--help, -h` - Display help information
- `test <value>` - Sample command demonstrating registration pattern

Future phases will add: update, get, list, search, cache

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

## License

MIT
