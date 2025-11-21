import type { OutputMode, OutputModeInfo } from '../types/output.js';

/**
 * Detects the output mode from the CLAUDECODE environment variable
 *
 * @returns 'ai' if CLAUDECODE=1, otherwise 'user' (default)
 *
 * @example
 * ```typescript
 * // CLAUDECODE=1 (AI mode)
 * const mode = detectOutputMode(); // 'ai'
 *
 * // No CLAUDECODE or CLAUDECODE=0 (User mode)
 * const mode = detectOutputMode(); // 'user'
 * ```
 */
export function detectOutputMode(): OutputMode {
  return process.env.CLAUDECODE === '1' ? 'ai' : 'user';
}

/**
 * Detects output mode with source tracking for debugging
 *
 * @returns OutputModeInfo with mode and source
 *
 * @example
 * ```typescript
 * const info = detectOutputModeWithSource();
 * console.log(info); // { mode: 'ai', source: 'env' }
 * ```
 */
export function detectOutputModeWithSource(): OutputModeInfo {
  if (process.env.CLAUDECODE === '1') {
    return { mode: 'ai', source: 'env' };
  }
  return { mode: 'user', source: 'default' };
}
