import type { OutputMode } from '../types/output.js';

/**
 * OutputFormatter provides dual-mode output formatting for CLI applications
 *
 * - AI mode: Minimal markdown output optimized for AI agents (CLAUDECODE=1)
 * - User mode: Rich ANSI-colored output for human users (default)
 *
 * @example
 * ```typescript
 * import { OutputFormatter } from './lib/output-formatter.js';
 * import { detectOutputMode } from './utils/env.js';
 *
 * const formatter = new OutputFormatter(detectOutputMode());
 *
 * console.log(formatter.heading('Search Results'));
 * console.log(formatter.success('Found 3 documents'));
 * console.log(formatter.error('File not found'));
 * ```
 */
export class OutputFormatter {
  /** Current output mode */
  public readonly mode: OutputMode;

  /** Whether terminal supports TTY (affects color output) */
  private readonly isTTY: boolean;

  /**
   * Creates a new OutputFormatter
   *
   * @param mode - Output mode ('ai' or 'user')
   * @param isTTY - Whether terminal supports TTY (default: process.stdout.isTTY)
   */
  constructor(mode: OutputMode, isTTY?: boolean) {
    this.mode = mode;
    this.isTTY = isTTY ?? process.stdout.isTTY ?? false;
  }

  /**
   * Format a heading
   *
   * @param text - Heading text
   * @returns Formatted heading
   *
   * @example
   * ```typescript
   * // AI mode:  "## Search Results\n"
   * // User mode: "\x1b[1;34mSearch Results\x1b[0m\n"
   * formatter.heading('Search Results')
   * ```
   */
  heading(text: string): string {
    if (this.mode === 'ai') {
      return `## ${text}\n`;
    }
    return `\x1b[1;34m${text}\x1b[0m\n`;
  }

  /**
   * Format a success message
   *
   * @param text - Success message
   * @returns Formatted success message
   *
   * @example
   * ```typescript
   * // AI mode:  "✓ Operation completed"
   * // User mode: "\x1b[32m✓ Operation completed\x1b[0m"
   * formatter.success('Operation completed')
   * ```
   */
  success(text: string): string {
    if (this.mode === 'ai') {
      return `✓ ${text}`;
    }
    return `\x1b[32m✓ ${text}\x1b[0m`;
  }

  /**
   * Format an error message
   *
   * @param text - Error message
   * @returns Formatted error message
   *
   * @example
   * ```typescript
   * // AI mode:  "✗ File not found"
   * // User mode: "\x1b[31m✗ File not found\x1b[0m"
   * formatter.error('File not found')
   * ```
   */
  error(text: string): string {
    if (this.mode === 'ai') {
      return `✗ ${text}`;
    }
    return `\x1b[31m✗ ${text}\x1b[0m`;
  }

  /**
   * Format a warning message
   *
   * @param text - Warning message
   * @returns Formatted warning message
   *
   * @example
   * ```typescript
   * // AI mode:  "⚠ Cache outdated"
   * // User mode: "\x1b[33m⚠ Cache outdated\x1b[0m"
   * formatter.warning('Cache outdated')
   * ```
   */
  warning(text: string): string {
    if (this.mode === 'ai') {
      return `⚠ ${text}`;
    }
    return `\x1b[33m⚠ ${text}\x1b[0m`;
  }

  /**
   * Format an informational message
   *
   * @param text - Info message
   * @returns Formatted info message
   *
   * @example
   * ```typescript
   * // AI mode:  "Processing..."
   * // User mode: "\x1b[34mProcessing...\x1b[0m"
   * formatter.info('Processing...')
   * ```
   */
  info(text: string): string {
    if (this.mode === 'ai') {
      return text;
    }
    return `\x1b[34m${text}\x1b[0m`;
  }

  /**
   * Format a command with description
   *
   * @param cmd - Command name
   * @param desc - Command description
   * @returns Formatted command help
   *
   * @example
   * ```typescript
   * // AI mode:  "`search <query>` - Search documentation\n"
   * // User mode: "  \x1b[36msearch <query>\x1b[0m  Search documentation\n"
   * formatter.command('search <query>', 'Search documentation')
   * ```
   */
  command(cmd: string, desc: string): string {
    if (this.mode === 'ai') {
      return `\`${cmd}\` - ${desc}\n`;
    }
    // User mode: color-coded with alignment
    return `  \x1b[36m${cmd}\x1b[0m  ${desc}\n`;
  }

  /**
   * Format a list of items
   *
   * @param items - Array of items to format
   * @returns Formatted list
   *
   * @example
   * ```typescript
   * // AI mode:  "- Item 1\n- Item 2\n"
   * // User mode: "  • Item 1\n  • Item 2\n"
   * formatter.list(['Item 1', 'Item 2'])
   * ```
   */
  list(items: string[]): string {
    if (items.length === 0) {
      return '';
    }

    if (this.mode === 'ai') {
      return items.map((item) => `- ${item}\n`).join('');
    }

    // User mode: bulleted with indentation
    return items.map((item) => `  • ${item}\n`).join('');
  }

  /**
   * Format tabular data (will be extended in User Story 2)
   *
   * @param data - Array of row objects
   * @returns Formatted table
   */
  table(data: Record<string, string>[]): string {
    if (data.length === 0) {
      return '';
    }

    // Get first row to extract headers
    const firstRow = data[0];
    if (!firstRow) {
      return '';
    }

    if (this.mode === 'ai') {
      // Simple markdown table
      const headers = Object.keys(firstRow);
      const headerRow = `| ${headers.join(' | ')} |\n`;
      const separator = `|${headers.map(() => '---').join('|')}|\n`;
      const rows = data
        .map((row) => `| ${headers.map((h) => row[h] || '').join(' | ')} |\n`)
        .join('');

      return `${headerRow}${separator}${rows}`;
    }

    // User mode: aligned table (basic implementation, will enhance in US2)
    const headers = Object.keys(firstRow);
    const headerRow = headers.join('  ');
    const rows = data.map((row) => headers.map((h) => row[h] || '').join('  ')).join('\n');

    return `${headerRow}\n${rows}\n`;
  }

  /**
   * Bold text
   */
  bold(text: string): string {
    if (this.mode === 'ai') {
      return `**${text}**`;
    }
    return this.isTTY ? `\x1b[1m${text}\x1b[0m` : text;
  }

  /**
   * Cyan/blue colored text
   */
  cyan(text: string): string {
    if (this.mode === 'ai') {
      return `\`${text}\``;
    }
    return this.isTTY ? `\x1b[36m${text}\x1b[0m` : text;
  }

  /**
   * Dimmed/gray text
   */
  dim(text: string): string {
    if (this.mode === 'ai') {
      return text; // No dimming in AI mode
    }
    return this.isTTY ? `\x1b[2m${text}\x1b[0m` : text;
  }
}
