/**
 * Unified command result types for structured output
 * All commands return JSON-serializable data that can be rendered for AI/User/JSON modes
 */

/**
 * Base result wrapper for all commands
 */
export interface CommandResult<T> {
  success: boolean;
  data?: T;
  error?: CommandError;
  metadata?: CommandMetadata;
}

/**
 * Error information for failed commands
 */
export interface CommandError {
  code: string;
  message: string;
  suggestion?: string;
}

/**
 * Common metadata attached to command results
 */
export interface CommandMetadata {
  dataAge?: number; // Hours since last update
  lastUpdate?: string; // ISO timestamp
  timestamp?: string; // ISO timestamp of command execution
  duration?: number; // Milliseconds
}

// ============================================================================
// LIST COMMAND
// ============================================================================

export interface ListResult {
  type: 'list_all' | 'list_sections';
  items: ListItem[];
  totalCount: number;
  categories?: CategoryGroup[]; // For list_all - groups docs by category
}

export interface CategoryGroup {
  name: string;
  docs: ListItem[];
}

export interface ListItem {
  slug: string;
  title: string;
  sectionCount?: number; // For list_all
  level?: number; // For list_sections (heading depth)
  category?: string; // Category name
  anchor?: string; // For list_sections - the anchor slug to use with get
  description?: string; // Brief description from llms.txt
}

// ============================================================================
// GET COMMAND
// ============================================================================

export interface GetResult {
  slug: string;
  title: string;
  content: string; // Markdown content
  anchor?: string; // If #anchor was specified
  source: string; // Original file name
  sectionCount: number;
}

// ============================================================================
// SEARCH COMMAND
// ============================================================================

export interface SearchResult {
  query: string;
  results: SearchMatch[];
  totalResults: number;
  searchTime: number; // Milliseconds
}

export interface SearchMatch {
  slug: string;
  title: string;
  lineNumber: number;
  matchedText: string;
  context: string;
  relevanceScore?: number;
}

// ============================================================================
// UPDATE COMMANDS
// ============================================================================

export interface UpdateCheckResult {
  updateAvailable: boolean;
  changes?: UpdateChanges;
  stats: UpdateStats;
}

export interface UpdateChanges {
  added: string[];
  modified: string[];
  deleted: string[];
  totalChanges: number;
}

export interface UpdateStats {
  currentVersion: string;
  remoteVersion: string;
  lastCheck: string;
}

export interface UpdateCommitResult {
  summary: UpdateSummary;
  changelogEntry: ChangelogEntry;
  newVersion: string;
}

export interface UpdateSummary {
  total: number;
  downloaded: number;
  skipped: number;
  failed: number;
  failedFiles?: string[];
}

export interface ChangelogEntry {
  message: string;
  timestamp: string;
}

export interface UpdateDiscardResult {
  discarded: {
    pendingFiles: number;
    fileList: string[];
  };
}

export interface UpdateStatusResult {
  installed: boolean;
  dataAge: number; // Hours
  lastUpdate?: string;
  pendingUpdates: boolean;
  changelogEntries: ChangelogEntry[];
  stats: {
    totalDocs: number;
    cacheSize: string; // e.g., "2.3 MB"
  };
}

// ============================================================================
// CACHE COMMANDS
// ============================================================================

export interface CacheInfoResult {
  exists: boolean;
  stats: CacheStats;
}

export interface CacheStats {
  totalFiles: number;
  totalSize: string;
  oldestFile?: string;
  newestFile?: string;
}

export interface CacheClearResult {
  filesDeleted: number;
  spaceFreed: string;
}

export interface CacheWarmResult {
  filesGenerated: number;
  duration: number;
}

// ============================================================================
// DOCTOR COMMAND
// ============================================================================

export interface DoctorResult {
  overallStatus: 'healthy' | 'warnings' | 'failed';
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
}
