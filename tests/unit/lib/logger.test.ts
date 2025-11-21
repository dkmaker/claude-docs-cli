import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '../../../src/lib/logger.js';
import { OutputFormatter } from '../../../src/lib/output-formatter.js';
import type { LogLevel } from '../../../src/types/config.js';

describe('Logger', () => {
  let tempLogPath: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempLogPath = join(tmpdir(), `test-log-${Date.now()}.log`);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    consoleLogSpy.mockRestore();
    try {
      await unlink(tempLogPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  describe('constructor', () => {
    it('should create logger with log level', () => {
      const logger = new Logger('info');
      expect(logger).toBeDefined();
    });

    it('should create logger with log file', () => {
      const logger = new Logger('info', tempLogPath);
      expect(logger).toBeDefined();
    });

    it('should create logger with output formatter', () => {
      const formatter = new OutputFormatter('user');
      const logger = new Logger('info', undefined, formatter);
      expect(logger).toBeDefined();
    });
  });

  describe('log level filtering', () => {
    it('should log error when level is error', async () => {
      const logger = new Logger('error');
      await logger.error('Error message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    });

    it('should not log info when level is error', async () => {
      const logger = new Logger('error');
      await logger.info('Info message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log warn and error when level is warn', async () => {
      const logger = new Logger('warn');

      await logger.error('Error message');
      await logger.warn('Warn message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
    });

    it('should log all levels when level is debug', async () => {
      const logger = new Logger('debug');

      await logger.error('Error message');
      await logger.warn('Warn message');
      await logger.info('Info message');
      await logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe('console output', () => {
    it('should output to console synchronously', async () => {
      const logger = new Logger('info');
      await logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });

    it('should use formatter for console output if provided', async () => {
      const formatter = new OutputFormatter('ai');
      const logger = new Logger('error', undefined, formatter);

      await logger.error('Error message');

      // AI mode uses ✗ for errors
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✗'));
    });
  });

  describe('file output', () => {
    it('should write logs to file asynchronously', async () => {
      const logger = new Logger('info', tempLogPath);
      await logger.info('Test message');

      // Wait a bit for async write
      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await readFile(tempLogPath, 'utf-8');
      expect(logContent).toContain('Test message');
      expect(logContent).toContain('[info]');
    });

    it('should include timestamp in file logs', async () => {
      const logger = new Logger('info', tempLogPath);
      await logger.info('Test message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await readFile(tempLogPath, 'utf-8');
      // Should contain ISO timestamp format
      expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should append multiple log entries', async () => {
      const logger = new Logger('info', tempLogPath);

      await logger.info('First message');
      await logger.info('Second message');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await readFile(tempLogPath, 'utf-8');
      expect(logContent).toContain('First message');
      expect(logContent).toContain('Second message');
    });
  });

  describe('context support', () => {
    it('should include context in log messages', async () => {
      const logger = new Logger('info', tempLogPath);

      await logger.info('Operation completed', {
        userId: '123',
        duration: 150,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logContent = await readFile(tempLogPath, 'utf-8');
      expect(logContent).toContain('userId');
      expect(logContent).toContain('123');
      expect(logContent).toContain('duration');
      expect(logContent).toContain('150');
    });
  });

  describe('convenience methods', () => {
    it('should provide error() method', async () => {
      const logger = new Logger('error');
      await logger.error('Error message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    });

    it('should provide warn() method', async () => {
      const logger = new Logger('warn');
      await logger.warn('Warning message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });

    it('should provide info() method', async () => {
      const logger = new Logger('info');
      await logger.info('Info message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Info message'));
    });

    it('should provide debug() method', async () => {
      const logger = new Logger('debug');
      await logger.debug('Debug message');

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug message'));
    });
  });

  describe('error handling', () => {
    it('should not throw when file write fails', async () => {
      const invalidPath = '/invalid/path/that/does/not/exist/log.txt';
      const logger = new Logger('info', invalidPath);

      // Should not throw, just log error to console
      await expect(logger.info('Test message')).resolves.not.toThrow();
    });
  });
});
