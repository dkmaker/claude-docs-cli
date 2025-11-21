import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ResourceConfiguration } from '../types/documentation.js';
import { fetchWithRetry } from '../utils/http-client.js';
import { fileExists, safeWriteFile } from './file-ops.js';

/**
 * Resource loader - loads documentation URLs from remote GitHub with bundled fallback
 */

/**
 * GitHub URL for remote resource configuration
 */
export const REMOTE_RESOURCE_URL =
  'https://raw.githubusercontent.com/dkmaker/claude-docs-cli/refs/heads/main/claude-docs-resources.json';

/**
 * Cache file for remote resource configuration
 */
const RESOURCE_CACHE_FILE = join(
  process.env.HOME || process.env.USERPROFILE || '~',
  '.claude-docs',
  '.resource-cache.json',
);

/**
 * Cache duration in milliseconds (1 hour)
 */
const CACHE_DURATION = 60 * 60 * 1000;

/**
 * Get path to bundled resource file
 */
function getBundledResourcePath(): string {
  // In development: use the file from repository root
  // In production (dist/): use the file copied during build
  // The file is at dist/claude-docs-resources.json
  // This file is in dist/lib/resource-loader.js, so we need to go up one level
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const distDir = dirname(currentDir); // Go up from dist/lib to dist
  return join(distDir, 'claude-docs-resources.json');
}

/**
 * Load bundled resource configuration
 *
 * @returns Resource configuration from bundled file
 * @throws Error if bundled file cannot be loaded
 */
async function loadBundledConfig(): Promise<ResourceConfiguration> {
  const bundledPath = getBundledResourcePath();

  try {
    const content = await readFile(bundledPath, 'utf-8');
    const config = JSON.parse(content) as ResourceConfiguration;

    if (!validateResourceConfig(config)) {
      throw new Error('Bundled resource file has invalid structure');
    }

    return config;
  } catch (error) {
    throw new Error(
      `Failed to load bundled resource configuration: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Load cached remote configuration if valid
 *
 * @returns Cached configuration or null if invalid/expired
 */
async function loadCachedConfig(): Promise<ResourceConfiguration | null> {
  if (!(await fileExists(RESOURCE_CACHE_FILE))) {
    return null;
  }

  try {
    const content = await readFile(RESOURCE_CACHE_FILE, 'utf-8');
    const cached = JSON.parse(content) as {
      timestamp: number;
      config: ResourceConfiguration;
    };

    // Check if cache is still valid
    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      return null;
    }

    if (!validateResourceConfig(cached.config)) {
      return null;
    }

    return cached.config;
  } catch {
    return null;
  }
}

/**
 * Cache remote configuration
 *
 * @param config - Configuration to cache
 */
async function cacheConfig(config: ResourceConfiguration): Promise<void> {
  const cached = {
    timestamp: Date.now(),
    config,
  };

  try {
    await safeWriteFile(RESOURCE_CACHE_FILE, JSON.stringify(cached, null, 2));
  } catch {
    // Caching is not critical, so we don't throw
  }
}

/**
 * Fetch remote resource configuration
 *
 * @returns Resource configuration from GitHub
 * @throws Error if fetch fails
 */
async function fetchRemoteConfig(): Promise<ResourceConfiguration> {
  const result = await fetchWithRetry(REMOTE_RESOURCE_URL, {
    timeout: 5000,
    maxRetries: 2,
  });

  if (!result.success || !result.content) {
    throw new Error(result.error || 'Failed to fetch remote resource configuration');
  }

  const config = JSON.parse(result.content) as ResourceConfiguration;

  if (!validateResourceConfig(config)) {
    throw new Error('Remote resource file has invalid structure');
  }

  // Cache successful fetch
  await cacheConfig(config);

  return config;
}

/**
 * Load resource configuration
 * Tries to fetch from remote GitHub URL, falls back to bundled version
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
  // Try cached remote config first
  const cached = await loadCachedConfig();
  if (cached) {
    return cached;
  }

  // Try fetching from remote
  try {
    return await fetchRemoteConfig();
  } catch (remoteError) {
    // Remote fetch failed, fall back to bundled version
    try {
      return await loadBundledConfig();
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
