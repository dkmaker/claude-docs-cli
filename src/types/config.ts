import { z } from 'zod';

/**
 * Log level for filtering log output
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Zod schema for configuration validation
 * Provides runtime type checking and default values
 */
export const ConfigSchema = z.object({
  /** Minimum log level to output (error < warn < info < debug) */
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  /** Optional path to log file (undefined means console-only logging) */
  logFile: z.string().optional(),

  /** Directory for cache storage (default: ~/.claude-docs/cache/) */
  cacheDir: z.string().default('~/.claude-docs/cache'),

  /** Path to documentation directory (default: ~/.claude-docs/docs/) */
  docsPath: z.string().default('~/.claude-docs/docs'),

  /** Maximum log file size in bytes before rotation (default: 10MB) */
  maxLogSize: z
    .number()
    .positive()
    .default(10 * 1024 * 1024),

  /** Maximum number of log files to retain (default: 5) */
  maxLogFiles: z.number().int().positive().default(5),
});

/**
 * Configuration interface inferred from Zod schema
 * This ensures TypeScript types stay in sync with validation rules
 */
export type Configuration = z.infer<typeof ConfigSchema>;
