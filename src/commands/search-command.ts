import { fileExists } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { createRenderer } from '../lib/renderer.js';
import { searchDocuments } from '../lib/search-engine.js';
import type { CommandResult, SearchResult } from '../types/command-results.js';
import { detectOutputMode } from '../utils/env.js';
import { CHANGELOG_FILE } from '../utils/path-resolver.js';

/**
 * Calculate data age in hours
 */
async function calculateDataAge(): Promise<number> {
  try {
    const { stat } = await import('node:fs/promises');

    if (await fileExists(CHANGELOG_FILE)) {
      const stats = await stat(CHANGELOG_FILE);
      const ageMs = Date.now() - stats.mtimeMs;
      return Math.floor(ageMs / (1000 * 60 * 60)); // Convert to hours
    }
  } catch {
    // Ignore errors
  }

  return 0; // Unknown
}

/**
 * Get last update timestamp
 */
async function getLastUpdateTime(): Promise<string | undefined> {
  try {
    const { stat } = await import('node:fs/promises');

    if (await fileExists(CHANGELOG_FILE)) {
      const stats = await stat(CHANGELOG_FILE);
      return new Date(stats.mtimeMs).toISOString();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

/**
 * Search command - search across all documentation
 * Returns structured JSON data, rendered based on output mode
 */
export async function searchCommand(query: string): Promise<void> {
  const mode = detectOutputMode();
  const formatter = new OutputFormatter(mode === 'ai' || mode === 'json' ? 'ai' : 'user');
  const renderer = createRenderer(
    mode === 'json' ? 'json' : mode === 'ai' ? 'ai' : 'user',
    formatter,
  );

  try {
    // T108: Show 24-hour update reminder
    const { checkUpdateReminder } = await import('./update-command.js');
    await checkUpdateReminder();

    if (!query || query.trim().length === 0) {
      const errorResult: CommandResult<never> = {
        success: false,
        error: {
          code: 'EMPTY_QUERY',
          message: 'Search query cannot be empty',
          suggestion: 'Usage: claude-docs search <query>',
        },
      };
      console.error(renderer.renderError(errorResult));
      process.exit(1);
    }

    const startTime = Date.now();
    const searchResults = await searchDocuments(query, {
      contextLines: 5,
      maxResults: 50,
      caseInsensitive: true,
    });
    const searchTime = Date.now() - startTime;

    // Get metadata
    const dataAge = await calculateDataAge();
    const lastUpdate = await getLastUpdateTime();

    // Build result
    const result: CommandResult<SearchResult> = {
      success: true,
      data: {
        query,
        results: searchResults.map((r) => ({
          slug: r.filename.replace('.md', ''),
          title: r.section,
          lineNumber: r.lineNumber,
          matchedText: r.matchedLine.trim(),
          context: r.context.join(' ').trim(),
        })),
        totalResults: searchResults.length,
        searchTime,
      },
      metadata: {
        dataAge,
        lastUpdate,
        timestamp: new Date().toISOString(),
      },
    };

    // Render and output
    const output = renderer.renderSearch(result);
    console.log(output);
  } catch (error) {
    const errorResult: CommandResult<never> = {
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
    console.error(renderer.renderError(errorResult));
    process.exit(1);
  }
}
