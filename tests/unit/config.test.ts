import { readFile, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConfigSchema } from '../../src/types/config.js';
import { expandPath, getDefaultConfig, loadConfig } from '../../src/utils/config.js';

describe('Configuration Management', () => {
  let tempConfigPath: string;

  beforeEach(() => {
    tempConfigPath = join(tmpdir(), `test-config-${Date.now()}.json`);
  });

  afterEach(async () => {
    try {
      await unlink(tempConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration with ~/.claude-docs/ paths', () => {
      const config = getDefaultConfig();

      expect(config.logLevel).toBe('info');
      expect(config.cacheDir).toBe('~/.claude-docs/cache');
      expect(config.docsPath).toBe('~/.claude-docs/docs');
      expect(config.maxLogSize).toBe(10 * 1024 * 1024); // 10MB
      expect(config.maxLogFiles).toBe(5);
      expect(config.logFile).toBeUndefined();
    });
  });

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      const expanded = expandPath('~/test/path');
      expect(expanded).not.toContain('~');
      expect(expanded).toContain('test/path');
    });

    it('should leave absolute paths unchanged', () => {
      const absolutePath = '/absolute/path';
      expect(expandPath(absolutePath)).toBe(absolutePath);
    });

    it('should leave relative paths unchanged', () => {
      const relativePath = './relative/path';
      expect(expandPath(relativePath)).toBe(relativePath);
    });
  });

  describe('ConfigSchema validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        logLevel: 'info' as const,
        cacheDir: '~/.claude-docs/cache',
        docsPath: '~/.claude-docs/docs',
        maxLogSize: 10485760,
        maxLogFiles: 5,
      };

      const result = ConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply defaults for missing fields', () => {
      const minimalConfig = {};

      const result = ConfigSchema.parse(minimalConfig);

      expect(result.logLevel).toBe('info');
      expect(result.cacheDir).toBe('~/.claude-docs/cache');
      expect(result.docsPath).toBe('~/.claude-docs/docs');
    });

    it('should reject invalid log level', () => {
      const invalidConfig = {
        logLevel: 'invalid-level',
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject negative maxLogSize', () => {
      const invalidConfig = {
        maxLogSize: -100,
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });

    it('should reject non-integer maxLogFiles', () => {
      const invalidConfig = {
        maxLogFiles: 3.5,
      };

      expect(() => ConfigSchema.parse(invalidConfig)).toThrow();
    });
  });

  describe('loadConfig', () => {
    it('should load valid configuration from file', async () => {
      const validConfig = {
        logLevel: 'debug',
        logFile: '~/.claude-docs/logs/test.log',
        cacheDir: '~/.claude-docs/cache',
        docsPath: '~/.claude-docs/docs',
      };

      await writeFile(tempConfigPath, JSON.stringify(validConfig), 'utf-8');

      const config = await loadConfig(tempConfigPath);

      expect(config.logLevel).toBe('debug');
      expect(config.logFile).toBe('~/.claude-docs/logs/test.log');
    });

    it('should return defaults when file does not exist', async () => {
      const nonExistentPath = join(tmpdir(), 'non-existent-config.json');

      const config = await loadConfig(nonExistentPath);

      // Should return defaults without throwing
      expect(config.logLevel).toBe('info');
      expect(config.cacheDir).toBe('~/.claude-docs/cache');
    });

    it('should throw error for invalid JSON', async () => {
      await writeFile(tempConfigPath, 'invalid json{]', 'utf-8');

      await expect(loadConfig(tempConfigPath)).rejects.toThrow();
    });

    it('should throw ZodError for invalid configuration', async () => {
      const invalidConfig = {
        logLevel: 'invalid-level',
        maxLogSize: -100,
      };

      await writeFile(tempConfigPath, JSON.stringify(invalidConfig), 'utf-8');

      await expect(loadConfig(tempConfigPath)).rejects.toThrow();
    });

    it('should merge partial config with defaults', async () => {
      const partialConfig = {
        logLevel: 'warn',
      };

      await writeFile(tempConfigPath, JSON.stringify(partialConfig), 'utf-8');

      const config = await loadConfig(tempConfigPath);

      expect(config.logLevel).toBe('warn');
      expect(config.cacheDir).toBe('~/.claude-docs/cache'); // From defaults
      expect(config.maxLogSize).toBe(10 * 1024 * 1024); // From defaults
    });
  });
});
