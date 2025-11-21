import { readFile, readdir, stat } from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { CacheMetadata, CacheStatistics } from '../types/documentation.js';
import { CACHE_DIR, getCachePath, getDocPath } from '../utils/path-resolver.js';
import { ensureDir, fileExists, safeWriteFile } from './file-ops.js';
import { transformMarkdown } from './markdown-transformer.js';

/**
 * Cache manager - handles caching of processed documentation
 * Provides fast retrieval without re-processing markdown transformations
 */

/**
 * Cache version - increment when cache format changes
 */
const CACHE_VERSION = '1.0.0';

/**
 * Generate cache metadata
 *
 * @param filename - Document filename
 * @param sourceUrl - Source URL of the document
 * @returns Cache metadata object
 */
function generateCacheMetadata(filename: string, sourceUrl: string): CacheMetadata {
  return {
    version: CACHE_VERSION,
    timestamp: Date.now(),
    sourceFile: getDocPath(filename),
    sourceUrl,
    cachePath: getCachePath(filename),
  };
}

/**
 * Serialize cache with metadata header
 *
 * @param content - Processed content
 * @param metadata - Cache metadata
 * @returns Serialized cache content
 */
function serializeCache(content: string, metadata: CacheMetadata): string {
  const header = ['<!--- CACHE METADATA', JSON.stringify(metadata, null, 2), '-->', ''].join('\n');

  return header + content;
}

/**
 * Parse cache and extract metadata
 *
 * @param cacheContent - Raw cache file content
 * @returns Parsed metadata and content, or null if invalid
 */
function parseCache(cacheContent: string): {
  metadata: CacheMetadata;
  content: string;
} | null {
  // Check for metadata header
  const headerStart = cacheContent.indexOf('<!--- CACHE METADATA');
  const headerEnd = cacheContent.indexOf('-->');

  if (headerStart !== 0 || headerEnd === -1) {
    return null;
  }

  try {
    // Extract metadata JSON
    const metadataJson = cacheContent.substring(
      headerStart + '<!--- CACHE METADATA\n'.length,
      headerEnd,
    );
    const metadata = JSON.parse(metadataJson.trim()) as CacheMetadata;

    // Extract content (everything after header)
    const content = cacheContent.substring(headerEnd + '-->\n'.length);

    return { metadata, content };
  } catch {
    return null;
  }
}

/**
 * Validate cache entry
 *
 * Checks:
 * - Version matches current cache version
 * - Source file exists and is older than cache
 * - Cache structure is valid
 *
 * @param metadata - Cache metadata
 * @returns true if valid, false otherwise
 */
async function validateCache(metadata: CacheMetadata): Promise<boolean> {
  // Check version
  if (metadata.version !== CACHE_VERSION) {
    return false;
  }

  // Special cache keys (list outputs, search indexes) don't have real source files
  // These are identified by sourceUrl being a command name or special marker
  const isGeneratedCache =
    metadata.sourceUrl === 'list-command' ||
    metadata.sourceUrl === 'search-command' ||
    metadata.sourceFile.includes('__index__') ||
    metadata.sourceFile.includes('__toc__');

  if (isGeneratedCache) {
    // For generated caches, just check version
    // They remain valid until explicitly invalidated
    return true;
  }

  // For document caches, check if source file exists and is fresh
  if (!(await fileExists(metadata.sourceFile))) {
    return false;
  }

  try {
    // Check if source file is newer than cache
    const sourceStat = await stat(metadata.sourceFile);
    const sourceModTime = sourceStat.mtimeMs;

    // If source is newer than cache, cache is stale
    if (sourceModTime > metadata.timestamp) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Write content to cache
 *
 * @param filename - Document filename
 * @param content - Processed content to cache
 * @param sourceUrl - Source URL of the document
 *
 * @example
 * ```typescript
 * await writeCached('overview.md', processedContent, 'https://...');
 * ```
 */
export async function writeCache(
  filename: string,
  content: string,
  sourceUrl: string,
): Promise<void> {
  const metadata = generateCacheMetadata(filename, sourceUrl);
  const serialized = serializeCache(content, metadata);

  await ensureDir(CACHE_DIR);
  await safeWriteFile(getCachePath(filename), serialized);
}

/**
 * Read content from cache if valid
 *
 * @param filename - Document filename
 * @returns Cached content or null if invalid/missing
 *
 * @example
 * ```typescript
 * const cached = await readCache('overview.md');
 * if (cached) {
 *   console.log('Using cached version');
 * }
 * ```
 */
export async function readCache(filename: string): Promise<string | null> {
  const cachePath = getCachePath(filename);

  if (!(await fileExists(cachePath))) {
    return null;
  }

  try {
    const cacheContent = await readFile(cachePath, 'utf-8');
    const parsed = parseCache(cacheContent);

    if (!parsed) {
      return null;
    }

    // Validate cache
    const isValid = await validateCache(parsed.metadata);
    if (!isValid) {
      return null;
    }

    return parsed.content;
  } catch {
    return null;
  }
}

/**
 * Get cached document or generate from source
 *
 * @param filename - Document filename
 * @param sourceUrl - Source URL (for cache metadata)
 * @returns Processed document content
 *
 * @example
 * ```typescript
 * const content = await getCachedDocument('overview.md', 'https://...');
 * ```
 */
export async function getCachedDocument(filename: string, sourceUrl: string): Promise<string> {
  // Try cache first
  const cached = await readCache(filename);
  if (cached) {
    return cached;
  }

  // Cache miss - read source and process
  const sourcePath = getDocPath(filename);

  if (!(await fileExists(sourcePath))) {
    throw new Error(`Document not found: ${filename}`);
  }

  const sourceContent = await readFile(sourcePath, 'utf-8');

  // Source is already transformed during download,
  // but we might want to re-transform for consistency
  // For now, just use the source as-is
  const processedContent = sourceContent;

  // Write to cache
  await writeCache(filename, processedContent, sourceUrl);

  return processedContent;
}

/**
 * Clear all cached files
 *
 * @example
 * ```typescript
 * await clearCache();
 * console.log('Cache cleared');
 * ```
 */
export async function clearCache(): Promise<void> {
  if (!(await fileExists(CACHE_DIR))) {
    return;
  }

  try {
    const files = await readdir(CACHE_DIR);

    for (const file of files) {
      const filePath = join(CACHE_DIR, file);
      await rm(filePath, { force: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to clear cache: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Get cache statistics
 *
 * @returns Cache statistics
 *
 * @example
 * ```typescript
 * const stats = await getCacheStats();
 * console.log(`Cache size: ${stats.totalSize} bytes`);
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */
export async function getCacheStats(): Promise<CacheStatistics> {
  if (!(await fileExists(CACHE_DIR))) {
    return {
      totalFiles: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastUpdate: null,
    };
  }

  try {
    const files = await readdir(CACHE_DIR);
    let totalSize = 0;

    for (const file of files) {
      const filePath = join(CACHE_DIR, file);
      const stats = await stat(filePath);
      totalSize += stats.size;
    }

    // Note: Hit/miss tracking would require persistent storage
    // For now, we just return file count and size
    return {
      totalFiles: files.length,
      totalSize,
      hits: 0, // TODO: Track hits/misses
      misses: 0,
      hitRate: 0,
      lastUpdate: null, // TODO: Get from .last-update
    };
  } catch {
    return {
      totalFiles: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      lastUpdate: null,
    };
  }
}

/**
 * Warm cache - pre-generate cache for all documents
 *
 * @param filenames - List of filenames to cache
 * @param sourceUrls - Map of filename to source URL
 *
 * @example
 * ```typescript
 * await warmCache(['overview.md', 'quickstart.md'], {
 *   'overview.md': 'https://...',
 *   'quickstart.md': 'https://...'
 * });
 * ```
 */
export async function warmCache(
  filenames: string[],
  sourceUrls: Record<string, string>,
): Promise<void> {
  for (const filename of filenames) {
    const sourceUrl = sourceUrls[filename] || '';
    try {
      await getCachedDocument(filename, sourceUrl);
    } catch {
      // Skip files that fail to cache
    }
  }
}
