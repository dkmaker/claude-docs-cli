import { readdir } from 'node:fs/promises';
import type { SearchResult } from '../types/documentation.js';
import { DOCS_DIR, getDocPath } from '../utils/path-resolver.js';
import { fileExists, safeReadFile } from './file-ops.js';

/**
 * Search engine - searches across all documentation
 * Provides context-aware search results
 */

/**
 * Search options
 */
export interface SearchOptions {
  /** Number of context lines before and after match (default: 5) */
  contextLines?: number;
  /** Maximum number of detailed results to show (default: 10) */
  maxResults?: number;
  /** Case-insensitive search (default: true) */
  caseInsensitive?: boolean;
}

/**
 * Search across all documentation files
 *
 * @param query - Search query (can be keyword or regex)
 * @param options - Search options
 * @returns Array of search results
 *
 * @example
 * ```typescript
 * const results = await searchDocuments('plugin');
 * for (const result of results) {
 *   console.log(`${result.filename}:${result.lineNumber}`);
 *   console.log(result.matchedLine);
 * }
 * ```
 */
export async function searchDocuments(
  query: string,
  options: SearchOptions = {},
): Promise<SearchResult[]> {
  const { contextLines = 5, maxResults = 10, caseInsensitive = true } = options;

  // Get all documentation files
  if (!(await fileExists(DOCS_DIR))) {
    return [];
  }

  const files = await readdir(DOCS_DIR);
  const results: SearchResult[] = [];

  // Create search regex
  const flags = caseInsensitive ? 'gi' : 'g';
  let searchRegex: RegExp;

  try {
    // Try to use query as regex
    searchRegex = new RegExp(query, flags);
  } catch {
    // If invalid regex, escape and use as literal string
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchRegex = new RegExp(escaped, flags);
  }

  // Search each file
  for (const filename of files) {
    if (!filename.endsWith('.md')) continue;

    const filePath = getDocPath(filename);
    const content = await safeReadFile(filePath);
    const lines = content.split('\n');

    // Search each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      if (searchRegex.test(line)) {
        // Extract context lines
        const startLine = Math.max(0, i - contextLines);
        const endLine = Math.min(lines.length - 1, i + contextLines);

        const context = lines.slice(startLine, endLine + 1);

        results.push({
          section: filename.replace('.md', ''),
          filename,
          lineNumber: i + 1,
          context,
          matchedLine: line.trim(),
        });

        // Reset regex lastIndex for next search
        searchRegex.lastIndex = 0;
      }
    }
  }

  return results;
}

/**
 * Format search results for display
 *
 * @param results - Search results
 * @param maxDetailed - Maximum number of detailed results to show
 * @returns Formatted string
 */
export function formatSearchResults(results: SearchResult[], maxDetailed = 10): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  const output: string[] = [];
  output.push(`Found ${results.length} result(s)\n`);

  // Show detailed results for first N
  const detailed = results.slice(0, maxDetailed);

  for (const result of detailed) {
    output.push(`📄 ${result.section} (line ${result.lineNumber})`);
    output.push(`   ${result.matchedLine}`);

    // Show context
    output.push('   Context:');
    for (let i = 0; i < result.context.length; i++) {
      const contextLine = result.context[i] || '';
      const isMatch = contextLine.trim() === result.matchedLine.trim();
      const prefix = isMatch ? '   >' : '    ';
      output.push(`${prefix} ${contextLine}`);
    }

    output.push('');
  }

  // If more results, show summary
  if (results.length > maxDetailed) {
    output.push(`\n... and ${results.length - maxDetailed} more result(s)`);
    output.push('\nAdditional matches:');

    const summary = results.slice(maxDetailed);
    const fileGroups = new Map<string, number>();

    for (const result of summary) {
      fileGroups.set(result.filename, (fileGroups.get(result.filename) || 0) + 1);
    }

    for (const [filename, count] of fileGroups) {
      output.push(`   ${filename.replace('.md', '')}: ${count} match(es)`);
    }
  }

  return output.join('\n');
}
