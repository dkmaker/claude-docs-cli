#!/usr/bin/env node

import { Command } from 'commander';
import { testCommand } from './commands/test-command.js';
import { CLI_DESCRIPTION, CLI_NAME, CLI_VERSION } from './utils/config.js';

export function main() {
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

  // Show help by default when no arguments provided
  if (process.argv.length === 2) {
    program.outputHelp();
    process.exit(0);
  }

  // Error handling for unknown commands
  program.on('command:*', () => {
    console.error(`error: unknown command '${program.args.join(' ')}'`);
    console.error(`\nRun '${CLI_NAME} --help' for available commands`);
    process.exit(1);
  });

  program.parse(process.argv);
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
