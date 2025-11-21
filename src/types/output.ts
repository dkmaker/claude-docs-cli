/**
 * Output mode for the CLI - determines formatting and verbosity
 * - 'ai': Structured markdown output for AI agents (CLAUDECODE=1)
 * - 'user': Rich ANSI-colored output for human users (default)
 * - 'json': Raw JSON output for programmatic consumption
 */
export type OutputMode = 'ai' | 'user' | 'json';

/**
 * Source that determined the output mode
 * - 'env': From CLAUDECODE environment variable
 * - 'flag': From CLI flag (future extension)
 * - 'default': No detection, defaulted to 'user'
 */
export type OutputModeSource = 'env' | 'flag' | 'default';

/**
 * Complete output mode information with source tracking
 */
export interface OutputModeInfo {
  mode: OutputMode;
  source: OutputModeSource;
}
