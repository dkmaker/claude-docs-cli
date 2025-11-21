import type { OutputMode, OutputModeInfo } from '../types/output.js';

/**
 * Detects the output mode from environment and CLI flags
 *
 * @returns 'json' if --output json, 'ai' if CLAUDECODE=1, otherwise 'user'
 *
 * @example
 * ```typescript
 * // --output json
 * const mode = detectOutputMode(); // 'json'
 *
 * // CLAUDECODE=1 (AI mode)
 * const mode = detectOutputMode(); // 'ai'
 *
 * // No flags (User mode)
 * const mode = detectOutputMode(); // 'user'
 * ```
 */
export function detectOutputMode(): OutputMode {
  // Check for explicit --output flag via environment
  const outputFlag = process.env.CLI_OUTPUT_FORMAT;
  if (outputFlag === 'json') return 'json';
  if (outputFlag === 'markdown' || outputFlag === 'md') return 'ai';

  // Auto-detect based on CLAUDECODE
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
