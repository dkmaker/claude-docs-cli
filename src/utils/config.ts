import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { ConfigSchema, type Configuration } from '../types/config.js';

// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

export const CLI_NAME = 'claude-docs';
export const CLI_VERSION = packageJson.version as string;
export const CLI_DESCRIPTION = 'Claude Code Documentation Manager - Node.js CLI';

/**
 * Get default configuration with ~/.claude-docs/ paths
 *
 * @returns Default configuration object
 *
 * @example
 * ```typescript
 * const defaults = getDefaultConfig();
 * console.log(defaults.cacheDir); // "~/.claude-docs/cache"
 * ```
 */
export function getDefaultConfig(): Configuration {
  return {
    logLevel: 'info',
    logFile: undefined,
    cacheDir: '~/.claude-docs/cache',
    docsPath: '~/.claude-docs/docs',
    maxLogSize: 10 * 1024 * 1024, // 10MB
    maxLogFiles: 5,
  };
}

/**
 * Expand ~ to home directory in paths
 *
 * @param path - Path potentially containing ~
 * @returns Expanded path with ~ replaced by home directory
 *
 * @example
 * ```typescript
 * expandPath('~/docs') // "/home/user/docs"
 * expandPath('/absolute/path') // "/absolute/path"
 * ```
 */
export function expandPath(path: string): string {
  if (path.startsWith('~/')) {
    return path.replace('~', homedir());
  }
  return path;
}

/**
 * Load configuration from file, validate, and merge with defaults
 *
 * @param configPath - Path to configuration file (default: ~/.claude-docs/config.json)
 * @returns Validated configuration object
 * @throws Error if configuration file is invalid JSON or fails Zod validation
 *
 * @example
 * ```typescript
 * // Load from custom path
 * const config = await loadConfig('/path/to/config.json');
 *
 * // Load from default path
 * const config = await loadConfig();
 *
 * // Handle validation errors
 * try {
 *   const config = await loadConfig();
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Config validation failed:', error.issues);
 *   }
 * }
 * ```
 */
export async function loadConfig(configPath?: string): Promise<Configuration> {
  const path = configPath ?? expandPath('~/.claude-docs/config.json');

  try {
    const data = await readFile(path, 'utf-8');
    const json = JSON.parse(data);

    // Validate and merge with defaults using Zod
    return ConfigSchema.parse(json);
  } catch (error) {
    // If it's a ZodError, rethrow with better message
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Invalid configuration: ${issues}`);
    }

    // If it's a JSON parse error, rethrow with better message
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }

    // If file doesn't exist (ENOENT), return defaults
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      // File not found - use defaults
      return ConfigSchema.parse({});
    }

    // Rethrow any other error
    throw error;
  }
}

/**
 * Expand all paths in configuration object
 *
 * @param config - Configuration object
 * @returns Configuration with expanded paths
 *
 * @example
 * ```typescript
 * const config = { cacheDir: '~/cache', docsPath: '~/docs' };
 * const expanded = expandConfigPaths(config);
 * console.log(expanded.cacheDir); // "/home/user/cache"
 * ```
 */
export function expandConfigPaths(config: Configuration): Configuration {
  return {
    ...config,
    cacheDir: expandPath(config.cacheDir),
    docsPath: expandPath(config.docsPath),
    logFile: config.logFile ? expandPath(config.logFile) : undefined,
  };
}
