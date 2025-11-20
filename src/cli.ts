#!/usr/bin/env node

import { Command } from 'commander';
import { testCommand } from './commands/test-command.js';
import { OutputFormatter } from './lib/output-formatter.js';
import { CLI_DESCRIPTION, CLI_NAME, CLI_VERSION } from './utils/config.js';
import { detectOutputMode } from './utils/env.js';

export function main() {
  // Initialize dual-mode output system
  const mode = detectOutputMode();
  const formatter = new OutputFormatter(mode);

  const program = new Command();

  program
    .name(CLI_NAME)
    .version(CLI_VERSION, '-v, --version', 'Display version information')
    .description(CLI_DESCRIPTION)
    .helpOption('-h, --help', 'Display help information');

  // Register commands
  program
    .command('test <value>')
    .description('Test command to demonstrate command registration pattern')
    .action((value: string) => {
      testCommand(value);
    });

  // Add search command placeholder (essential - shown in both modes)
  program
    .command('search <query>')
    .description('Search documentation')
    .action(() => {
      console.log(formatter.warning('Search command not yet implemented'));
    });

  // Add get command placeholder (essential - shown in both modes)
  program
    .command('get <slug>')
    .description('Get documentation section')
    .action(() => {
      console.log(formatter.warning('Get command not yet implemented'));
    });

  // Advanced commands (only in user mode)
  if (mode === 'user') {
    program
      .command('status')
      .description('Show cache and documentation status')
      .action(() => {
        console.log(formatter.warning('Status command not yet implemented'));
      });

    program
      .command('reset-cache')
      .description('Clear documentation cache')
      .action(() => {
        console.log(formatter.warning('Reset cache command not yet implemented'));
      });
  }

  // Show help by default when no arguments provided
  if (process.argv.length === 2) {
    program.outputHelp();
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

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
