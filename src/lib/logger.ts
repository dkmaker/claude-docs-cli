import { appendFile } from 'node:fs/promises';
import type { LogLevel } from '../types/config.js';
import type { OutputFormatter } from './output-formatter.js';

/**
 * Log level hierarchy (for filtering)
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Enhanced Logger with async file writes and output formatter integration
 *
 * Features:
 * - Log level filtering (error < warn < info < debug)
 * - Sync console output with optional OutputFormatter
 * - Async file writes (non-blocking)
 * - Structured context support
 * - Timestamp formatting
 *
 * @example
 * ```typescript
 * import { Logger } from './lib/logger.js';
 * import { OutputFormatter } from './lib/output-formatter.js';
 *
 * const formatter = new OutputFormatter('user');
 * const logger = new Logger('info', '~/.claude-docs/logs/app.log', formatter);
 *
 * await logger.info('Application started');
 * await logger.error('Failed to load config', { path: 'config.json' });
 * ```
 */
export class Logger {
  /**
   * Creates a new Logger instance
   *
   * @param level - Minimum log level to output
   * @param logFile - Optional path to log file for async writes
   * @param formatter - Optional OutputFormatter for console output
   */
  constructor(
    private readonly level: LogLevel,
    private readonly logFile?: string,
    private readonly formatter?: OutputFormatter,
  ) {}

  /**
   * Check if a message should be logged based on configured level
   *
   * @param messageLevel - Level of the message to check
   * @returns true if message should be logged
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVELS[messageLevel] <= LOG_LEVELS[this.level];
  }

  /**
   * Format a log entry for file output
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional structured context
   * @returns Formatted log entry string
   */
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `${timestamp} [${level}] ${message}${contextStr}\n`;
  }

  /**
   * Format a message for console output
   *
   * @param level - Log level
   * @param message - Log message
   * @returns Formatted message for console
   */
  private formatConsoleMessage(level: LogLevel, message: string): string {
    if (this.formatter) {
      // Use formatter for mode-aware output
      switch (level) {
        case 'error':
          return this.formatter.error(message);
        case 'warn':
          return this.formatter.warning(message);
        case 'info':
          return this.formatter.info(message);
        case 'debug':
          return this.formatter.info(`[DEBUG] ${message}`);
      }
    }

    // Fallback: plain text with level prefix
    return `[${level.toUpperCase()}] ${message}`;
  }

  /**
   * Log a message at the specified level
   *
   * @param level - Log level
   * @param message - Log message
   * @param context - Optional structured context
   */
  async log(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    // Console output (synchronous)
    const consoleMessage = this.formatConsoleMessage(level, message);
    console.log(consoleMessage);

    // File output (asynchronous, non-blocking)
    if (this.logFile) {
      const logEntry = this.formatLogEntry(level, message, context);
      try {
        await appendFile(this.logFile, logEntry, 'utf-8');
      } catch (error) {
        // Silent failure on log write errors to avoid cascading failures
        console.error(
          `Failed to write log to file: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Log an error message
   *
   * @param message - Error message
   * @param context - Optional structured context
   */
  async error(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('error', message, context);
  }

  /**
   * Log a warning message
   *
   * @param message - Warning message
   * @param context - Optional structured context
   */
  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('warn', message, context);
  }

  /**
   * Log an informational message
   *
   * @param message - Info message
   * @param context - Optional structured context
   */
  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('info', message, context);
  }

  /**
   * Log a debug message
   *
   * @param message - Debug message
   * @param context - Optional structured context
   */
  async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log('debug', message, context);
  }
}

// Legacy functions for backward compatibility (deprecated - use Logger class)

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/** @deprecated Use Logger class instead */
export function logInfo(message: string): void {
  console.log(`${colors.blue}INFO${colors.reset} ${message}`);
}

/** @deprecated Use Logger class instead */
export function logSuccess(message: string): void {
  console.log(`${colors.green}SUCCESS${colors.reset} ${message}`);
}

/** @deprecated Use Logger class instead */
export function logWarn(message: string): void {
  console.warn(`${colors.yellow}WARN${colors.reset} ${message}`);
}

/** @deprecated Use Logger class instead */
export function logError(message: string): void {
  console.error(`${colors.red}ERROR${colors.reset} ${message}`);
  process.exit(1);
}
