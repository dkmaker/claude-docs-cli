import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

/**
 * Base directory for Claude documentation data
 * All documentation files, cache, and logs stored here
 */
export const CLAUDE_DOCS_DIR = join(homedir(), '.claude-docs');

/**
 * Documentation storage directory
 */
export const DOCS_DIR = join(CLAUDE_DOCS_DIR, 'docs');

/**
 * Cache storage directory
 */
export const CACHE_DIR = join(CLAUDE_DOCS_DIR, 'cache');

/**
 * Logs storage directory
 */
export const LOGS_DIR = join(CLAUDE_DOCS_DIR, 'logs');

/**
 * Pending updates directory (for update workflow)
 */
export const PENDING_DIR = join(CLAUDE_DOCS_DIR, '.pending');

/**
 * Pending downloads subdirectory
 */
export const PENDING_DOWNLOADS_DIR = join(PENDING_DIR, 'downloads');

/**
 * Pending diffs subdirectory
 */
export const PENDING_DIFFS_DIR = join(PENDING_DIR, 'diffs');

/**
 * Last update timestamp file
 */
export const LAST_UPDATE_FILE = join(CLAUDE_DOCS_DIR, '.last-update');

/**
 * Missing documents tracking file
 */
export const MISSING_DOCS_FILE = join(CLAUDE_DOCS_DIR, '.missing-docs');

/**
 * Changelog file
 */
export const CHANGELOG_FILE = join(CLAUDE_DOCS_DIR, 'CHANGELOG.md');

/**
 * Resolve a path that may contain ~ (home directory)
 *
 * @param path - Path to resolve
 * @returns Resolved absolute path
 *
 * @example
 * ```typescript
 * resolvePath('~/.claude-docs/docs') // '/home/user/.claude-docs/docs'
 * resolvePath('./relative/path')      // '/current/dir/relative/path'
 * resolvePath('/absolute/path')       // '/absolute/path'
 * ```
 */
export function resolvePath(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  if (path === '~') {
    return homedir();
  }
  return resolve(path);
}

/**
 * Get path to a specific documentation file
 *
 * @param filename - Documentation filename
 * @returns Full path to documentation file
 *
 * @example
 * ```typescript
 * getDocPath('overview.md') // '/home/user/.claude-docs/docs/overview.md'
 * ```
 */
export function getDocPath(filename: string): string {
  return join(DOCS_DIR, filename);
}

/**
 * Get path to a specific cache file
 *
 * @param filename - Cache filename (typically same as doc filename)
 * @returns Full path to cache file
 *
 * @example
 * ```typescript
 * getCachePath('overview.md') // '/home/user/.claude-docs/cache/overview.md'
 * ```
 */
export function getCachePath(filename: string): string {
  return join(CACHE_DIR, filename);
}

/**
 * Get path to a specific log file
 *
 * @param filename - Log filename
 * @returns Full path to log file
 *
 * @example
 * ```typescript
 * getLogPath('download.log') // '/home/user/.claude-docs/logs/download.log'
 * ```
 */
export function getLogPath(filename: string): string {
  return join(LOGS_DIR, filename);
}

/**
 * Get path to a pending download file
 *
 * @param filename - Document filename
 * @returns Full path to pending download file
 */
export function getPendingDownloadPath(filename: string): string {
  return join(PENDING_DOWNLOADS_DIR, filename);
}

/**
 * Get path to a pending diff file
 *
 * @param filename - Document filename
 * @returns Full path to pending diff file
 */
export function getPendingDiffPath(filename: string): string {
  return join(PENDING_DIFFS_DIR, `${filename}.diff`);
}
