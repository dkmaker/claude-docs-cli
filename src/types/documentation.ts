/**
 * Documentation management types
 * Defines structures for resource configuration, cache metadata, and documentation sections
 */

/**
 * Individual documentation section
 */
export interface DocumentSection {
  title: string;
  url: string;
  filename: string;
  description: string;
}

/**
 * Documentation category grouping
 */
export interface DocumentCategory {
  name: string;
  slug: string;
  description: string;
  docs: DocumentSection[];
}

/**
 * Resource configuration (claude-docs-resources.json)
 * Can be loaded from remote GitHub URL or bundled fallback
 */
export interface ResourceConfiguration {
  categories: DocumentCategory[];
}

/**
 * Cache metadata header
 * Stored at the top of each cached file for validation
 */
export interface CacheMetadata {
  version: string;
  timestamp: number;
  sourceFile: string;
  sourceUrl: string;
  cachePath: string;
}

/**
 * Cache statistics for info display
 */
export interface CacheStatistics {
  totalFiles: number;
  totalSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  lastUpdate: number | null;
}

/**
 * Update status summary
 */
export interface UpdateStatus {
  hasPending: boolean;
  newDocs: string[];
  changedDocs: string[];
  unchangedDocs: string[];
  failedDocs: string[];
  lastUpdateTime: number | null;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  timestamp: number;
  message: string;
  newFiles: number;
  changedFiles: number;
}

/**
 * Search result
 */
export interface SearchResult {
  section: string;
  filename: string;
  lineNumber: number;
  context: string[];
  matchedLine: string;
}

/**
 * Download progress tracking
 */
export interface DownloadProgress {
  total: number;
  completed: number;
  failed: number;
  current: string | null;
}

/**
 * File download result
 */
export interface DownloadResult {
  filename: string;
  success: boolean;
  error?: string;
  retries?: number;
}
