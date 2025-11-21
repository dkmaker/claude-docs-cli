import { formatSearchResults, searchDocuments } from '../lib/search-engine.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { detectOutputMode } from '../utils/env.js';

const formatter = new OutputFormatter(detectOutputMode());

/**
 * Search command - search across all documentation
 */

/**
 * Search documentation
 *
 * @param query - Search query
 *
 * @example
 * ```
 * claude-docs search plugin
 * claude-docs search "create.*plugin"
 * ```
 */
export async function searchCommand(query: string): Promise<void> {
  try {
    // T108: Show 24-hour update reminder
    const { checkUpdateReminder } = await import('./update-command.js');
    await checkUpdateReminder();

    if (!query || query.trim().length === 0) {
      console.error(formatter.error('Search query cannot be empty'));
      console.error(formatter.info('Usage: claude-docs search <query>'));
      process.exit(1);
    }

    console.log(formatter.info(`Searching for: "${query}"\n`));

    const startTime = Date.now();
    const results = await searchDocuments(query, {
      contextLines: 5,
      maxResults: 10,
      caseInsensitive: true,
    });
    const endTime = Date.now();

    const formatted = formatSearchResults(results, 10);
    console.log(formatted);

    console.log(formatter.info(`\nSearch completed in ${endTime - startTime}ms`));

    if (results.length > 0) {
      console.log(formatter.info('\nUse `claude-docs get <section>` to retrieve full documentation'));
    }
  } catch (error) {
    console.error(formatter.error(`\nError: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
