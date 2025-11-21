import { createTwoFilesPatch } from 'diff';

/**
 * Diff generation wrapper using the 'diff' package
 * Provides unified diff format for documentation updates
 */

/**
 * Diff result
 */
export interface DiffResult {
  filename: string;
  hasChanges: boolean;
  diff: string;
  linesAdded: number;
  linesRemoved: number;
}

/**
 * Generate unified diff between two versions of a document
 *
 * @param filename - Document filename
 * @param oldContent - Current/old content
 * @param newContent - Updated/new content
 * @param context - Number of context lines (default: 3)
 * @returns Diff result
 *
 * @example
 * ```typescript
 * const diff = generateDiff('plugins.md', currentContent, newContent);
 * if (diff.hasChanges) {
 *   console.log(`Changes: +${diff.linesAdded} -${diff.linesRemoved}`);
 *   console.log(diff.diff);
 * }
 * ```
 */
export function generateDiff(
  filename: string,
  oldContent: string,
  newContent: string,
  context = 3,
): DiffResult {
  // Generate unified diff
  const diff = createTwoFilesPatch(
    filename,
    filename,
    oldContent,
    newContent,
    'Current version',
    'New version',
    { context },
  );

  // Check if there are actual changes (not just header)
  const hasChanges = diff.includes('@@');

  // Count lines added and removed
  const lines = diff.split('\n');
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      linesAdded++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      linesRemoved++;
    }
  }

  return {
    filename,
    hasChanges,
    diff,
    linesAdded,
    linesRemoved,
  };
}

/**
 * Compare two documents and determine if they're different
 *
 * @param oldContent - Current content
 * @param newContent - New content
 * @returns true if documents differ, false if identical
 *
 * @example
 * ```typescript
 * if (compareDocuments(current, updated)) {
 *   console.log('Document has changed');
 * }
 * ```
 */
export function compareDocuments(oldContent: string, newContent: string): boolean {
  // Normalize line endings before comparison
  const normalizeLineEndings = (str: string) => str.replace(/\r\n/g, '\n');
  return normalizeLineEndings(oldContent.trim()) !== normalizeLineEndings(newContent.trim());
}

/**
 * Extract diff summary (lines changed) without full diff content
 *
 * @param oldContent - Current content
 * @param newContent - New content
 * @returns Summary of changes
 *
 * @example
 * ```typescript
 * const summary = getDiffSummary(current, updated);
 * console.log(`+${summary.added} -${summary.removed}`);
 * ```
 */
export function getDiffSummary(
  oldContent: string,
  newContent: string,
): { added: number; removed: number; changed: boolean } {
  const diff = generateDiff('temp', oldContent, newContent);
  return {
    added: diff.linesAdded,
    removed: diff.linesRemoved,
    changed: diff.hasChanges,
  };
}
