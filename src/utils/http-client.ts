/**
 * HTTP client with retry logic using native fetch()
 * Zero external dependencies - uses Node.js 22 native fetch API
 */

/**
 * HTTP client options
 */
export interface FetchOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial retry delay in milliseconds (default: 2000) */
  retryDelay?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Additional headers to include */
  headers?: Record<string, string>;
  /** Use exponential backoff for retries (default: true) */
  exponentialBackoff?: boolean;
}

/**
 * Result of an HTTP fetch operation
 */
export interface FetchResult {
  success: boolean;
  content?: string;
  error?: string;
  statusCode?: number;
  retries: number;
}

/**
 * Default options for HTTP requests
 */
const DEFAULT_OPTIONS: Required<FetchOptions> = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 30000,
  headers: {
    'User-Agent': 'claude-docs-cli/1.0',
  },
  exponentialBackoff: true,
};

/**
 * Fetch content from a URL with retry logic
 *
 * Uses native Node.js fetch() API with automatic retry on failure.
 * Implements exponential backoff by default.
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Fetch result with content or error
 *
 * @example
 * ```typescript
 * const result = await fetchWithRetry('https://example.com/doc.md');
 * if (result.success) {
 *   console.log('Content:', result.content);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const headers = { ...DEFAULT_OPTIONS.headers, ...options.headers };

  let lastError: Error | null = null;
  let statusCode: number | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

      try {
        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        statusCode = response.status;

        // Check for HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get content as text
        const content = await response.text();

        return {
          success: true,
          content,
          statusCode,
          retries: attempt,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on final attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = opts.exponentialBackoff ? opts.retryDelay * 2 ** attempt : opts.retryDelay;

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    statusCode,
    retries: opts.maxRetries,
  };
}

/**
 * Download content from a URL with progress callback
 *
 * @param url - URL to download from
 * @param options - Fetch options
 * @param onProgress - Optional progress callback (receives bytes downloaded)
 * @returns Fetch result
 *
 * @example
 * ```typescript
 * const result = await downloadFile(
 *   'https://example.com/large-file.md',
 *   {},
 *   (bytes) => console.log(`Downloaded ${bytes} bytes`)
 * );
 * ```
 */
export async function downloadFile(
  url: string,
  options: FetchOptions = {},
  onProgress?: (bytes: number) => void,
): Promise<FetchResult> {
  // For now, use fetchWithRetry (progress tracking would require streaming)
  // This can be enhanced later if needed
  const result = await fetchWithRetry(url, options);

  if (result.success && result.content && onProgress) {
    onProgress(result.content.length);
  }

  return result;
}

/**
 * Validate URL format
 *
 * @param url - URL to validate
 * @returns true if URL is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after the delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
