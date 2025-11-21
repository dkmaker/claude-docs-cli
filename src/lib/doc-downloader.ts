import type {
  DocumentSection,
  DownloadProgress,
  DownloadResult,
  ResourceConfiguration,
} from '../types/documentation.js';
import { downloadFile } from '../utils/http-client.js';
import { getDocPath } from '../utils/path-resolver.js';
import { safeWriteFile } from './file-ops.js';
import { transformMarkdown } from './markdown-transformer.js';

/**
 * Documentation downloader
 * Downloads documentation from official sources with retry logic and transformation
 */

/**
 * Download options
 */
export interface DownloadOptions {
  /** Maximum number of retry attempts per file (default: 3) */
  maxRetries?: number;
  /** Retry delay in milliseconds (default: 2000) */
  retryDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Progress callback (receives current progress) */
  onProgress?: (progress: DownloadProgress) => void;
  /** Concurrent downloads (default: 5) */
  concurrency?: number;
}

/**
 * Download a single documentation file
 *
 * @param doc - Document section to download
 * @param options - Download options
 * @returns Download result
 *
 * @example
 * ```typescript
 * const result = await downloadDocument(docSection, { maxRetries: 3 });
 * if (result.success) {
 *   console.log(`Downloaded ${result.filename}`);
 * }
 * ```
 */
export async function downloadDocument(
  doc: DocumentSection,
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  const { maxRetries = 3, retryDelay = 2000, timeout = 30000 } = options;

  // Append .md to URL (the URLs in the JSON don't include the extension)
  const mdUrl = `${doc.url}.md`;

  // Download from URL
  const result = await downloadFile(mdUrl, {
    maxRetries,
    retryDelay,
    timeout,
    exponentialBackoff: true,
  });

  if (!result.success || !result.content) {
    return {
      filename: doc.filename,
      success: false,
      error: result.error || 'Download failed',
      retries: result.retries,
    };
  }

  try {
    // Transform MDX to standard markdown
    const transformed = transformMarkdown(result.content);

    // Write to docs directory
    const docPath = getDocPath(doc.filename);
    await safeWriteFile(docPath, transformed);

    return {
      filename: doc.filename,
      success: true,
      retries: result.retries,
    };
  } catch (error) {
    return {
      filename: doc.filename,
      success: false,
      error: `Failed to save document: ${error instanceof Error ? error.message : String(error)}`,
      retries: result.retries,
    };
  }
}

/**
 * Download all documentation files with concurrency control
 *
 * @param config - Resource configuration
 * @param options - Download options
 * @returns Array of download results
 *
 * @example
 * ```typescript
 * const results = await downloadAllDocuments(config, {
 *   concurrency: 5,
 *   onProgress: (progress) => {
 *     console.log(`Progress: ${progress.completed}/${progress.total}`);
 *   }
 * });
 * ```
 */
export async function downloadAllDocuments(
  config: ResourceConfiguration,
  options: DownloadOptions = {},
): Promise<DownloadResult[]> {
  const { concurrency = 5, onProgress } = options;

  // Flatten all documents from all categories
  const allDocs: DocumentSection[] = [];
  for (const category of config.categories) {
    allDocs.push(...category.docs);
  }

  const total = allDocs.length;
  let completed = 0;
  let failed = 0;
  const results: DownloadResult[] = [];

  // Process in batches for concurrency control
  for (let i = 0; i < allDocs.length; i += concurrency) {
    const batch = allDocs.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map(async (doc) => {
        const current = doc.filename;

        // Report progress
        if (onProgress) {
          onProgress({ total, completed, failed, current });
        }

        const result = await downloadDocument(doc, options);

        if (result.success) {
          completed++;
        } else {
          failed++;
        }

        // Report progress after completion
        if (onProgress) {
          onProgress({ total, completed, failed, current: null });
        }

        return result;
      }),
    );

    results.push(...batchResults);
  }

  return results;
}

/**
 * Get download summary from results
 *
 * @param results - Download results
 * @returns Summary object
 */
export function getDownloadSummary(results: DownloadResult[]): {
  total: number;
  successful: number;
  failed: number;
  failedFiles: string[];
} {
  const failed = results.filter((r) => !r.success);

  return {
    total: results.length,
    successful: results.filter((r) => r.success).length,
    failed: failed.length,
    failedFiles: failed.map((r) => r.filename),
  };
}
