import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  DocumentCategory,
  DocumentSection,
  ResourceConfiguration,
} from '../types/documentation.js';
import { fetchWithRetry } from '../utils/http-client.js';
import { fileExists, safeWriteFile } from './file-ops.js';

/**
 * Resource loader - loads documentation URLs from remote llms.txt with bundled fallback
 */

/**
 * Official Claude Code llms.txt URL (primary source)
 */
export const REMOTE_LLMS_TXT_URL = 'https://code.claude.com/docs/llms.txt';

/**
 * Bundled llms.txt fallback path
 */
const BUNDLED_LLMS_TXT_PATH = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'artifacts',
  'llms.txt',
);

/**
 * Bundled categories mapping path
 */
const BUNDLED_CATEGORIES_PATH = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  'artifacts',
  'categories.json',
);

/**
 * Cache file for remote llms.txt
 */
const LLMS_TXT_CACHE_FILE = join(
  process.env.HOME || process.env.USERPROFILE || '~',
  '.claude-docs',
  '.llms-txt-cache.txt',
);

/**
 * Cache duration in milliseconds (1 hour)
 */
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Parsed document from llms.txt
 */
interface ParsedDocument {
  title: string;
  url: string;
  filename: string;
  description: string;
}

/**
 * Category mapping from categories.json
 */
interface CategoryMapping {
  version: string;
  categories: CategoryMappingEntry[];
}

interface CategoryMappingEntry {
  name: string;
  slug: string;
  description: string;
  urlPatterns: string[];
}

/**
 * Parse llms.txt markdown format
 * Format: - [Title](URL): Description
 *
 * @param content - Raw llms.txt content
 * @returns Array of parsed documents
 */
function parseLlmsTxt(content: string): ParsedDocument[] {
  const lines = content.split('\n');
  const documents: ParsedDocument[] = [];

  for (const line of lines) {
    // Match: - [Title](URL): Description
    const match = line.match(/^-\s+\[([^\]]+)\]\(([^)]+)\):\s+(.+)$/);

    if (match) {
      const [, title, url, description] = match;

      // Skip if any capture group is undefined
      if (!title || !url || !description) {
        continue;
      }

      // Extract filename from URL
      // URL: https://code.claude.com/docs/en/overview.md
      // Filename: overview.md
      const urlPath = new URL(url.trim()).pathname;
      const filename = urlPath.split('/').pop() || '';

      documents.push({
        title: title.trim(),
        url: url.trim(),
        filename: filename,
        description: description.trim(),
      });
    }
  }

  return documents;
}

/**
 * Apply category mapping to parsed documents
 *
 * @param documents - Parsed documents from llms.txt
 * @param mapping - Category mapping from categories.json
 * @returns Resource configuration with categorized documents
 */
function applyCategoryMapping(
  documents: ParsedDocument[],
  mapping: CategoryMapping,
): ResourceConfiguration {
  // Create URL-to-category lookup
  const urlToCategory = new Map<string, CategoryMappingEntry>();

  for (const category of mapping.categories) {
    if (category.slug === 'uncategorized') continue;

    for (const urlPattern of category.urlPatterns) {
      urlToCategory.set(urlPattern, category);
    }
  }

  // Find uncategorized category
  const uncategorizedCategory = mapping.categories.find((c) => c.slug === 'uncategorized');

  if (!uncategorizedCategory) {
    throw new Error('categories.json missing "uncategorized" category');
  }

  // Build categories with docs
  const categoryMap = new Map<string, DocumentCategory>();
  const uncategorizedDocs: DocumentSection[] = [];

  for (const doc of documents) {
    const mappedCategory = urlToCategory.get(doc.url);

    if (mappedCategory) {
      // Add to mapped category
      if (!categoryMap.has(mappedCategory.slug)) {
        categoryMap.set(mappedCategory.slug, {
          name: mappedCategory.name,
          slug: mappedCategory.slug,
          description: mappedCategory.description,
          docs: [],
        });
      }

      const category = categoryMap.get(mappedCategory.slug);
      if (category) {
        category.docs.push({
          title: doc.title,
          url: doc.url,
          filename: doc.filename,
          description: doc.description,
        });
      }
    } else {
      // Add to uncategorized
      uncategorizedDocs.push({
        title: doc.title,
        url: doc.url,
        filename: doc.filename,
        description: doc.description,
      });
    }
  }

  // Build final categories array (preserve order from mapping)
  const categories: DocumentCategory[] = [];

  for (const mappingEntry of mapping.categories) {
    if (mappingEntry.slug === 'uncategorized') {
      // Add uncategorized at the end if it has docs
      if (uncategorizedDocs.length > 0) {
        categories.push({
          name: uncategorizedCategory.name,
          slug: uncategorizedCategory.slug,
          description: uncategorizedCategory.description,
          docs: uncategorizedDocs,
        });
      }
    } else {
      const category = categoryMap.get(mappingEntry.slug);
      if (category && category.docs.length > 0) {
        categories.push(category);
      }
    }
  }

  return { categories };
}

/**
 * Load bundled llms.txt
 *
 * @returns Bundled llms.txt content
 */
async function loadBundledLlmsTxt(): Promise<string> {
  return readFile(BUNDLED_LLMS_TXT_PATH, 'utf-8');
}

/**
 * Load bundled categories.json
 *
 * @returns Bundled category mapping
 */
async function loadBundledCategories(): Promise<CategoryMapping> {
  const content = await readFile(BUNDLED_CATEGORIES_PATH, 'utf-8');
  return JSON.parse(content) as CategoryMapping;
}

/**
 * Load cached remote configuration if valid
 *
 * @returns Cached configuration or null if invalid/expired
 */
async function loadCachedConfig(): Promise<ResourceConfiguration | null> {
  // Check if cache file exists
  if (!(await fileExists(LLMS_TXT_CACHE_FILE))) {
    return null;
  }

  try {
    // Check cache age
    const stats = await stat(LLMS_TXT_CACHE_FILE);
    const age = Date.now() - stats.mtimeMs;

    if (age > CACHE_DURATION) {
      return null;
    }

    // Load cached llms.txt
    const llmsContent = await readFile(LLMS_TXT_CACHE_FILE, 'utf-8');
    const documents = parseLlmsTxt(llmsContent);

    // Load categories (always from bundle)
    const mapping = await loadBundledCategories();

    // Apply mapping
    const config = applyCategoryMapping(documents, mapping);

    if (!validateResourceConfig(config)) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Cache remote llms.txt content
 *
 * @param llmsContent - Raw llms.txt content to cache
 */
async function cacheConfig(llmsContent: string): Promise<void> {
  try {
    await safeWriteFile(LLMS_TXT_CACHE_FILE, llmsContent);
  } catch {
    // Caching is not critical, so we don't throw
  }
}

/**
 * Load resource configuration
 * Tries to fetch from remote llms.txt, falls back to bundled version
 *
 * @returns Resource configuration
 * @throws Error if both remote and bundled loading fail
 *
 * @example
 * ```typescript
 * const config = await loadResourceConfig();
 * console.log(`Loaded ${config.categories.length} categories`);
 * ```
 */
export async function loadResourceConfig(): Promise<ResourceConfiguration> {
  // Try cached remote first
  const cached = await loadCachedConfig();
  if (cached) {
    return cached;
  }

  // Try remote fetch
  try {
    // Fetch llms.txt from official source
    const llmsResult = await fetchWithRetry(REMOTE_LLMS_TXT_URL, {
      timeout: 5000,
      maxRetries: 2,
    });

    if (!llmsResult.success || !llmsResult.content) {
      throw new Error(llmsResult.error || 'Failed to fetch llms.txt');
    }

    // Parse documents
    const documents = parseLlmsTxt(llmsResult.content);

    // Load categories mapping (always bundled - we control this)
    const mapping = await loadBundledCategories();

    // Apply mapping
    const config = applyCategoryMapping(documents, mapping);

    if (!validateResourceConfig(config)) {
      throw new Error('Generated config has invalid structure');
    }

    // Cache successful result
    await cacheConfig(llmsResult.content);

    return config;
  } catch (remoteError) {
    // Remote fetch failed, fall back to bundled
    try {
      const llmsContent = await loadBundledLlmsTxt();
      const documents = parseLlmsTxt(llmsContent);
      const mapping = await loadBundledCategories();
      const config = applyCategoryMapping(documents, mapping);

      if (!validateResourceConfig(config)) {
        throw new Error('Bundled config has invalid structure');
      }

      return config;
    } catch (bundledError) {
      throw new Error(
        `Failed to load resource configuration. Remote: ${remoteError instanceof Error ? remoteError.message : String(remoteError)}, Bundled: ${bundledError instanceof Error ? bundledError.message : String(bundledError)}`,
      );
    }
  }
}

/**
 * Validate resource configuration structure
 *
 * @param config - Configuration to validate
 * @returns true if valid, false otherwise
 */
export function validateResourceConfig(config: unknown): config is ResourceConfiguration {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const cfg = config as Record<string, unknown>;

  // Check for categories array
  if (!Array.isArray(cfg.categories)) {
    return false;
  }

  // Validate each category
  for (const category of cfg.categories) {
    if (!category || typeof category !== 'object') {
      return false;
    }

    const cat = category as Record<string, unknown>;

    // Check required category fields
    if (
      typeof cat.name !== 'string' ||
      typeof cat.slug !== 'string' ||
      typeof cat.description !== 'string'
    ) {
      return false;
    }

    // Check docs array
    if (!Array.isArray(cat.docs)) {
      return false;
    }

    // Validate each document
    for (const doc of cat.docs) {
      if (!doc || typeof doc !== 'object') {
        return false;
      }

      const d = doc as Record<string, unknown>;

      // Check required doc fields
      if (
        typeof d.title !== 'string' ||
        typeof d.url !== 'string' ||
        typeof d.filename !== 'string' ||
        typeof d.description !== 'string'
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get total number of documentation sections
 *
 * @param config - Resource configuration
 * @returns Total count of documentation sections
 */
export function getTotalSections(config: ResourceConfiguration): number {
  return config.categories.reduce((sum, cat) => sum + cat.docs.length, 0);
}
