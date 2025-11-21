import { access, readFile, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ensureDir,
  fileExists,
  getFileSize,
  safeReadFile,
  safeWriteFile,
  verifyFileIntegrity,
} from '../../../src/lib/file-ops.js';

describe('File Operations', () => {
  let tempDir: string;
  let tempFilePath: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-dir-${Date.now()}`);
    tempFilePath = join(tempDir, 'test-file.txt');
  });

  afterEach(async () => {
    try {
      await unlink(tempFilePath);
    } catch {
      // Ignore
    }
    try {
      await rmdir(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  describe('ensureDir', () => {
    it('should create directory if it does not exist', async () => {
      await ensureDir(tempDir);

      // Verify directory exists
      await expect(access(tempDir)).resolves.not.toThrow();
    });

    it('should not throw if directory already exists', async () => {
      await ensureDir(tempDir);
      await expect(ensureDir(tempDir)).resolves.not.toThrow();
    });

    it('should create nested directories recursively', async () => {
      const nestedDir = join(tempDir, 'level1', 'level2', 'level3');
      await ensureDir(nestedDir);

      await expect(access(nestedDir)).resolves.not.toThrow();
    });
  });

  describe('safeReadFile', () => {
    it('should read file content successfully', async () => {
      await ensureDir(tempDir);
      const content = 'Hello, World!';
      await writeFile(tempFilePath, content, 'utf-8');

      const result = await safeReadFile(tempFilePath);
      expect(result).toBe(content);
    });

    it('should throw descriptive error when file does not exist', async () => {
      const nonExistentFile = join(tempDir, 'non-existent.txt');

      await expect(safeReadFile(nonExistentFile)).rejects.toThrow();
    });

    it('should handle UTF-8 content correctly', async () => {
      await ensureDir(tempDir);
      const content = 'UTF-8 test: 你好世界 🌍';
      await writeFile(tempFilePath, content, 'utf-8');

      const result = await safeReadFile(tempFilePath);
      expect(result).toBe(content);
    });
  });

  describe('safeWriteFile', () => {
    it('should write file content successfully', async () => {
      const content = 'Test content';

      await safeWriteFile(tempFilePath, content);

      const result = await readFile(tempFilePath, 'utf-8');
      expect(result).toBe(content);
    });

    it('should create parent directory if it does not exist', async () => {
      const nestedFile = join(tempDir, 'nested', 'file.txt');
      const content = 'Nested content';

      await safeWriteFile(nestedFile, content);

      const result = await readFile(nestedFile, 'utf-8');
      expect(result).toBe(content);
    });

    it('should overwrite existing file', async () => {
      await ensureDir(tempDir);
      await writeFile(tempFilePath, 'Old content', 'utf-8');

      const newContent = 'New content';
      await safeWriteFile(tempFilePath, newContent);

      const result = await readFile(tempFilePath, 'utf-8');
      expect(result).toBe(newContent);
    });

    it('should throw descriptive error on write failure', async () => {
      const invalidPath = '/invalid/path/that/cannot/be/created/file.txt';

      await expect(safeWriteFile(invalidPath, 'content')).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      await ensureDir(tempDir);
      await writeFile(tempFilePath, 'content', 'utf-8');

      const exists = await fileExists(tempFilePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const nonExistentFile = join(tempDir, 'non-existent.txt');

      const exists = await fileExists(nonExistentFile);
      expect(exists).toBe(false);
    });

    it('should return true for existing directory', async () => {
      await ensureDir(tempDir);

      const exists = await fileExists(tempDir);
      expect(exists).toBe(true);
    });
  });

  describe('getFileSize', () => {
    it('should return file size in bytes', async () => {
      await ensureDir(tempDir);
      const content = 'Hello';
      await writeFile(tempFilePath, content, 'utf-8');

      const size = await getFileSize(tempFilePath);
      expect(size).toBe(Buffer.byteLength(content, 'utf-8'));
    });

    it('should throw error for non-existent file', async () => {
      const nonExistentFile = join(tempDir, 'non-existent.txt');

      await expect(getFileSize(nonExistentFile)).rejects.toThrow();
    });

    it('should return 0 for empty file', async () => {
      await ensureDir(tempDir);
      await writeFile(tempFilePath, '', 'utf-8');

      const size = await getFileSize(tempFilePath);
      expect(size).toBe(0);
    });
  });

  describe('verifyFileIntegrity', () => {
    it('should return true for existing readable file', async () => {
      await ensureDir(tempDir);
      await writeFile(tempFilePath, 'content', 'utf-8');

      const isValid = await verifyFileIntegrity(tempFilePath);
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent file', async () => {
      const nonExistentFile = join(tempDir, 'non-existent.txt');

      const isValid = await verifyFileIntegrity(nonExistentFile);
      expect(isValid).toBe(false);
    });

    it('should return true for empty file', async () => {
      await ensureDir(tempDir);
      await writeFile(tempFilePath, '', 'utf-8');

      const isValid = await verifyFileIntegrity(tempFilePath);
      expect(isValid).toBe(true);
    });
  });
});
