#!/usr/bin/env node

import { Command } from 'commander';
import { cacheClearCommand, cacheInfoCommand, cacheWarmCommand } from './commands/cache-command.js';
import { doctorCommand } from './commands/doctor-command.js';
import { getCommand } from './commands/get-command.js';
import { listCommand } from './commands/list-command.js';
import { searchCommand } from './commands/search-command.js';
import {
  updateCheckCommand,
  updateCommitCommand,
  updateDiscardCommand,
  updateStatusCommand,
} from './commands/update-command.js';
import { OutputFormatter } from './lib/output-formatter.js';
import { CLI_DESCRIPTION, CLI_NAME, CLI_VERSION } from './utils/config.js';
import { detectOutputMode } from './utils/env.js';

/**
 * Show AI-friendly help when no arguments provided in AI mode
 */
function showAIHelp(): void {
  console.log(`# ${CLI_NAME} - ${CLI_DESCRIPTION}

## Available Commands

| Command | Arguments | Description |
|---------|-----------|-------------|
| list | [doc] | List all documentation or sections within a document |
| get | <slug> | Retrieve a documentation section (supports slug#anchor) |
| search | <query> | Search across all documentation |

## Usage Examples

\`\`\`bash
# List all available documentation
claude-docs list

# List sections in a specific document
claude-docs list quickstart

# Get a documentation section
claude-docs get cli-reference

# Get a specific section with anchor
claude-docs get settings#hooks

# Search documentation
claude-docs search "MCP servers"
\`\`\`

## Output Modes

This tool detects it's running in AI mode (CLAUDECODE=1) and provides structured markdown output optimized for LLM parsing.

All commands return data in consistent formats with:
- Markdown tables for structured data
- Clear section headers
- Metadata footers with data age warnings
- Actionable suggestions

## Data Freshness

If documentation is older than 24 hours, commands will display a warning with update instructions.

## Version

Current version: ${CLI_VERSION}
`);
}

/**
 * Show beautiful help screen with ASCII art in user mode
 */
async function showUserHelp(): Promise<void> {
  const asciiArt = await import('./lib/ascii-art.js');
  const boxDrawing = await import('./lib/box-drawing.js');
  const formatter = new OutputFormatter('user');

  let output = '';

  // ASCII art banner
  output += asciiArt.getWelcomeBanner();
  output += '\n';

  // Commands header
  output += boxDrawing.createHeaderBox('📚 Available Commands');
  output += '\n';

  // Commands table
  const headers = [formatter.bold('Command'), formatter.bold('Description')];
  const rows = [
    [formatter.cyan('list'), 'List all documentation or sections'],
    [formatter.cyan('get'), 'Retrieve a documentation section'],
    [formatter.cyan('search'), 'Search across all documentation'],
    [formatter.cyan('update'), 'Manage documentation downloads'],
    [formatter.cyan('cache'), 'Manage documentation cache'],
    [formatter.cyan('doctor'), 'Run health checks'],
  ];

  output += boxDrawing.createTable(headers, rows, 'light');
  output += '\n';

  output += `${formatter.dim('Options:')}\n`;
  output += `${formatter.dim('  -v, --version    Display version')}\n`;
  output += `${formatter.dim('  -h, --help       Display help')}\n`;
  output += `${formatter.dim('  --output <fmt>   Output format (json, markdown)')}\n\n`;

  // Quick start box
  const tips = [
    '',
    formatter.bold('  Quick Start:'),
    '',
    `${formatter.success('  ▸')} List all docs:      ${formatter.cyan('claude-docs list')}`,
    `${formatter.success('  ▸')} Get a section:      ${formatter.cyan('claude-docs get quickstart')}`,
    `${formatter.success('  ▸')} Search:             ${formatter.cyan('claude-docs search "MCP servers"')}`,
    `${formatter.success('  ▸')} Check for updates:  ${formatter.cyan('claude-docs update')}`,
    '',
  ];

  output += boxDrawing.createInfoBox(tips, 60);
  output += '\n';

  output += `${
    formatter.warning('💡 Tip:') + formatter.dim(' Run any command with --help for detailed usage')
  }\n\n`;
  output += `${formatter.dim(`Version: ${CLI_VERSION}`)}\n`;

  console.log(output);
}

export async function main() {
  // Pre-parse to extract --output flag
  const outputFlagIndex = process.argv.indexOf('--output');
  if (outputFlagIndex !== -1 && process.argv[outputFlagIndex + 1]) {
    process.env.CLI_OUTPUT_FORMAT = process.argv[outputFlagIndex + 1];
  }

  // Initialize dual-mode output system (now can detect --output flag)
  const mode = detectOutputMode();
  const formatter = new OutputFormatter(mode);

  const program = new Command();

  program
    .name(CLI_NAME)
    .version(CLI_VERSION, '-v, --version', 'Display version information')
    .description(CLI_DESCRIPTION)
    .helpOption('-h, --help', 'Display help information')
    .option('--output <format>', 'Output format: json, markdown (default: auto-detect)');

  // Update command with subcommands
  const updateCmd = program
    .command('update')
    .description('Manage documentation downloads and updates');

  updateCmd
    .command('check')
    .description('Check for documentation updates (default action)')
    .action(() => {
      updateCheckCommand();
    });

  updateCmd
    .command('commit <message>')
    .description('Apply pending updates with changelog message')
    .action((message: string) => {
      updateCommitCommand(message);
    });

  updateCmd
    .command('discard')
    .description('Discard pending updates')
    .action(() => {
      updateDiscardCommand();
    });

  updateCmd
    .command('status')
    .description('Show update status and history')
    .action(() => {
      updateStatusCommand();
    });

  // Default update action (same as 'update check')
  updateCmd.action(() => {
    updateCheckCommand();
  });

  // Cache command with subcommands
  const cacheCmd = program.command('cache').description('Manage documentation cache');

  cacheCmd
    .command('clear')
    .description('Clear all cached files')
    .action(() => {
      cacheClearCommand();
    });

  cacheCmd
    .command('info')
    .description('Display cache statistics')
    .action(() => {
      cacheInfoCommand();
    });

  cacheCmd
    .command('warm')
    .description('Pre-generate cache for all documentation')
    .action(() => {
      cacheWarmCommand();
    });

  // Default cache action shows info
  cacheCmd.action(() => {
    cacheInfoCommand();
  });

  // Search command
  program
    .command('search <query>')
    .description('Search across all documentation')
    .action((query: string) => {
      searchCommand(query);
    });

  // Get command - retrieve documentation
  program
    .command('get <slug>')
    .description('Get documentation section (supports slug#anchor format)')
    .action((slug: string) => {
      getCommand(slug);
    });

  // List command - list all docs or sections within a doc
  program
    .command('list [doc]')
    .description('List all documentation or sections within a specific document')
    .action((doc?: string) => {
      listCommand(doc);
    });

  // Advanced commands (only in user mode)
  if (mode === 'user') {
    program
      .command('doctor')
      .description('Run health checks and verify installation')
      .action(() => {
        doctorCommand();
      });
  }

  // Show help by default when no arguments provided
  if (process.argv.length === 2) {
    if (mode === 'ai' || mode === 'json') {
      showAIHelp();
    } else {
      await showUserHelp();
    }
    process.exit(0);
  }

  // Error handling for unknown commands
  program.on('command:*', () => {
    console.error(formatter.error(`unknown command '${program.args.join(' ')}'`));
    console.error(`\nRun '${CLI_NAME} --help' for available commands`);
    process.exit(1);
  });

  program.parse(process.argv);
}

// Execute main function (this is a bin entry point)
main();
