import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  writeCache,
  readCache,
  getCachedDocument,
  clearCache,
  getCacheStats,
  warmCache,
} from '../../src/lib/cache-manager.js';
import { CACHE_DIR, getDocPath, getCachePath } from '../../src/utils/path-resolver.js';
import * as fileOps from '../../src/lib/file-ops.js';

describe('Cache Manager', () => {
  let tempDir: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(
      tmpdir(),
      `test-cache-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    process.env.HOME = tempDir;
    vi.clearAllMocks();

    // Ensure clean state - remove any existing cache
    try {
      await rm(join(tempDir, '.claude-docs', 'cache'), { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    vi.restoreAllMocks();

    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  const testFilename = 'test-doc.md';
  const testSourceUrl = 'https://example.com/test-doc.md';
  const testContent = '# Test Document\n\nThis is test content.';

  describe('T038: Unit test for cache-manager', () => {
    it('should export writeCache function', () => {
      expect(typeof writeCache).toBe('function');
    });

    it('should export readCache function', () => {
      expect(typeof readCache).toBe('function');
    });

    it('should export getCachedDocument function', () => {
      expect(typeof getCachedDocument).toBe('function');
    });

    it('should export clearCache function', () => {
      expect(typeof clearCache).toBe('function');
    });

    it('should export getCacheStats function', () => {
      expect(typeof getCacheStats).toBe('function');
    });

    it('should export warmCache function', () => {
      expect(typeof warmCache).toBe('function');
    });
  });

  describe('T039: Test cache write with metadata', () => {
    it('should write cache with metadata header', async () => {
      await writeCache(testFilename, testContent, testSourceUrl);

      const cachePath = getCachePath(testFilename);
      const cached = await fileOps.safeReadFile(cachePath);

      // Should contain metadata header
      expect(cached).toContain('<!--- CACHE METADATA');
      expect(cached).toContain('-->');

      // Should contain version
      expect(cached).toContain('"version": "1.0.0"');

      // Should contain timestamp
      expect(cached).toContain('"timestamp"');

      // Should contain source file path
      expect(cached).toContain('"sourceFile"');

      // Should contain source URL
      expect(cached).toContain(testSourceUrl);

      // Should contain cache path
      expect(cached).toContain('"cachePath"');

      // Should contain actual content after header
      expect(cached).toContain(testContent);
    });

    it('should include current timestamp in metadata', async () => {
      const beforeWrite = Date.now();
      await writeCache(testFilename, testContent, testSourceUrl);
      const afterWrite = Date.now();

      const cachePath = getCachePath(testFilename);
      const cached = await fileOps.safeReadFile(cachePath);

      // Extract timestamp from metadata
      const timestampMatch = cached.match(/"timestamp":\s*(\d+)/);
      expect(timestampMatch).not.toBeNull();

      const timestamp = Number.parseInt(timestampMatch![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(beforeWrite);
      expect(timestamp).toBeLessThanOrEqual(afterWrite);
    });

    it('should include correct source file path', async () => {
      await writeCache(testFilename, testContent, testSourceUrl);

      const cachePath = getCachePath(testFilename);
      const cached = await fileOps.safeReadFile(cachePath);

      const expectedSourcePath = getDocPath(testFilename);
      expect(cached).toContain(expectedSourcePath);
    });

    it('should include correct cache path', async () => {
      await writeCache(testFilename, testContent, testSourceUrl);

      const cachePath = getCachePath(testFilename);
      const cached = await fileOps.safeReadFile(cachePath);

      expect(cached).toContain(cachePath);
    });
  });

  describe('T040: Test cache read and validation', () => {
    it('should read valid cached content', async () => {
      // Write cache first
      await writeCache(testFilename, testContent, testSourceUrl);

      // Create source file (required for validation)
      const sourcePath = getDocPath(testFilename);
      await fileOps.safeWriteFile(sourcePath, testContent);

      // Read cache
      const cached = await readCache(testFilename);

      expect(cached).not.toBeNull();
      expect(cached).toBe(testContent);
    });

    it('should return null for non-existent cache', async () => {
      const cached = await readCache('non-existent.md');

      expect(cached).toBeNull();
    });

    it('should return null for corrupted cache', async () => {
      const cachePath = getCachePath(testFilename);

      // Write invalid cache content
      await fileOps.safeWriteFile(cachePath, 'Invalid cache content without header');

      const cached = await readCache(testFilename);

      expect(cached).toBeNull();
    });

    it('should return null for cache with wrong version', async () => {
      const cachePath = getCachePath(testFilename);

      // Write cache with wrong version
      const invalidMetadata = {
        version: '0.0.0', // Wrong version
        timestamp: Date.now(),
        sourceFile: getDocPath(testFilename),
        sourceUrl: testSourceUrl,
        cachePath,
      };

      const invalidCache = [
        '<!--- CACHE METADATA',
        JSON.stringify(invalidMetadata, null, 2),
        '-->',
        testContent,
      ].join('\n');

      await fileOps.safeWriteFile(cachePath, invalidCache);

      const cached = await readCache(testFilename);

      expect(cached).toBeNull();
    });
  });

  describe('T041: Test cache invalidation when source doc newer', () => {
    it('should invalidate cache when source file is newer', async () => {
      // Create source file with old timestamp
      const sourcePath = getDocPath(testFilename);
      await fileOps.safeWriteFile(sourcePath, testContent);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Write cache (will have newer timestamp than source initially)
      await writeCache(testFilename, testContent, testSourceUrl);

      // Verify cache is valid
      let cached = await readCache(testFilename);
      expect(cached).not.toBeNull();

      // Update source file to make it newer
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fileOps.safeWriteFile(sourcePath, '# Updated content');

      // Cache should now be invalid
      cached = await readCache(testFilename);
      expect(cached).toBeNull();
    });

    it('should keep cache valid when source file is older', async () => {
      // Create source file
      const sourcePath = getDocPath(testFilename);
      await fileOps.safeWriteFile(sourcePath, testContent);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Write cache (newer than source)
      await writeCache(testFilename, testContent, testSourceUrl);

      // Cache should be valid
      const cached = await readCache(testFilename);
      expect(cached).not.toBeNull();
      expect(cached).toBe(testContent);
    });

    it('should invalidate cache when source file is missing', async () => {
      // Use a unique filename to ensure no source file exists from previous tests
      const uniqueFilename = `no-source-${Date.now()}.md`;

      // Write cache without source file
      await writeCache(uniqueFilename, testContent, testSourceUrl);

      // Verify source file doesn't exist
      const sourcePath = getDocPath(uniqueFilename);
      expect(await fileOps.fileExists(sourcePath)).toBe(false);

      // Verify cache file exists
      const cachePath = getCachePath(uniqueFilename);
      expect(await fileOps.fileExists(cachePath)).toBe(true);

      // Now try to read it - should be null because source file is missing
      const cached = await readCache(uniqueFilename);

      // For normal document caches (not generated caches like list-command or search-command),
      // cache should be invalid without source file
      expect(cached).toBeNull();
    });
  });

  describe('T042: Test cache corruption detection and regeneration', () => {
    it('should detect corrupted metadata', async () => {
      const cachePath = getCachePath(testFilename);

      // Write corrupted JSON in metadata
      const corruptedCache = [
        '<!--- CACHE METADATA',
        '{ invalid json',
        '-->',
        testContent,
      ].join('\n');

      await fileOps.safeWriteFile(cachePath, corruptedCache);

      const cached = await readCache(testFilename);
      expect(cached).toBeNull();
    });

    it('should detect missing metadata header', async () => {
      const cachePath = getCachePath(testFilename);

      // Write content without metadata header
      await fileOps.safeWriteFile(cachePath, testContent);

      const cached = await readCache(testFilename);
      expect(cached).toBeNull();
    });

    it('should regenerate cache when corrupted', async () => {
      const sourcePath = getDocPath(testFilename);
      await fileOps.safeWriteFile(sourcePath, testContent);

      // Write corrupted cache
      const cachePath = getCachePath(testFilename);
      await fileOps.safeWriteFile(cachePath, 'Corrupted content');

      // getCachedDocument should regenerate
      const content = await getCachedDocument(testFilename, testSourceUrl);
      expect(content).toBe(testContent);

      // Cache should now be valid
      const cached = await readCache(testFilename);
      expect(cached).not.toBeNull();
      expect(cached).toBe(testContent);
    });
  });

  describe('T043: Integration test - cache lifecycle (placeholder)', () => {
    // This will be tested in integration tests
    it('should be tested in integration/cache-lifecycle.test.ts', () => {
      // Placeholder - actual integration test will be in separate file
      expect(true).toBe(true);
    });
  });

  describe('T044: Test full cache lifecycle', () => {
    it('should handle write → read → invalidate → regenerate cycle', async () => {
      const sourcePath = getDocPath(testFilename);

      // 1. Write initial source
      await fileOps.safeWriteFile(sourcePath, testContent);

      // 2. Generate cache (first getCachedDocument call)
      const content1 = await getCachedDocument(testFilename, testSourceUrl);
      expect(content1).toBe(testContent);

      // 3. Read from cache (should hit cache)
      const cached1 = await readCache(testFilename);
      expect(cached1).toBe(testContent);

      // 4. Invalidate by updating source
      const newContent = '# Updated Document';
      await new Promise((resolve) => setTimeout(resolve, 10));
      await fileOps.safeWriteFile(sourcePath, newContent);

      // 5. Cache should be invalid
      const cached2 = await readCache(testFilename);
      expect(cached2).toBeNull();

      // 6. Regenerate cache
      const content2 = await getCachedDocument(testFilename, testSourceUrl);
      expect(content2).toBe(newContent);

      // 7. New cache should be valid
      const cached3 = await readCache(testFilename);
      expect(cached3).toBe(newContent);
    });
  });

  describe('getCachedDocument', () => {
    it('should return cached content on cache hit', async () => {
      // Use a different filename to avoid pollution from lifecycle test
      const uniqueFilename = `unique-${Date.now()}.md`;
      const sourcePath = getDocPath(uniqueFilename);
      await fileOps.safeWriteFile(sourcePath, testContent);

      // First call - cache miss
      const content1 = await getCachedDocument(uniqueFilename, testSourceUrl);
      expect(content1).toBe(testContent);

      // Second call - cache hit
      const content2 = await getCachedDocument(uniqueFilename, testSourceUrl);
      expect(content2).toBe(testContent);
    });

    it('should throw error when source document not found', async () => {
      await expect(getCachedDocument('non-existent.md', testSourceUrl)).rejects.toThrow(
        /Document not found/,
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all cached files', async () => {
      // Clear first to ensure clean state
      await clearCache();

      // Create multiple cache entries
      await writeCache('doc1.md', 'Content 1', 'url1');
      await writeCache('doc2.md', 'Content 2', 'url2');
      await writeCache('doc3.md', 'Content 3', 'url3');

      // Verify caches exist
      expect(await fileOps.fileExists(getCachePath('doc1.md'))).toBe(true);
      expect(await fileOps.fileExists(getCachePath('doc2.md'))).toBe(true);
      expect(await fileOps.fileExists(getCachePath('doc3.md'))).toBe(true);

      // Clear cache
      await clearCache();

      // Verify caches are gone
      expect(await fileOps.fileExists(getCachePath('doc1.md'))).toBe(false);
      expect(await fileOps.fileExists(getCachePath('doc2.md'))).toBe(false);
      expect(await fileOps.fileExists(getCachePath('doc3.md'))).toBe(false);
    });

    it('should not throw when cache directory does not exist', async () => {
      // Clear to ensure directory doesn't exist
      await clearCache();

      // Clear again - should not throw
      await expect(clearCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return stats for populated cache', async () => {
      // Clear any existing cache first
      await clearCache();

      // Create cache entries
      await writeCache('doc1.md', 'Content 1', 'url1');
      await writeCache('doc2.md', 'Content 2', 'url2');

      const stats = await getCacheStats();

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should return zero stats for empty cache', async () => {
      // Clear cache to ensure it's empty
      await clearCache();

      const stats = await getCacheStats();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('warmCache', () => {
    it('should pre-generate cache for all documents', async () => {
      // Create source files
      await fileOps.safeWriteFile(getDocPath('doc1.md'), 'Content 1');
      await fileOps.safeWriteFile(getDocPath('doc2.md'), 'Content 2');
      await fileOps.safeWriteFile(getDocPath('doc3.md'), 'Content 3');

      const filenames = ['doc1.md', 'doc2.md', 'doc3.md'];
      const sourceUrls = {
        'doc1.md': 'url1',
        'doc2.md': 'url2',
        'doc3.md': 'url3',
      };

      await warmCache(filenames, sourceUrls);

      // Verify all caches exist
      for (const filename of filenames) {
        const cached = await readCache(filename);
        expect(cached).not.toBeNull();
      }
    });

    it('should skip files that fail to cache', async () => {
      // Create only one source file
      await fileOps.safeWriteFile(getDocPath('doc1.md'), 'Content 1');

      const filenames = ['doc1.md', 'non-existent.md'];
      const sourceUrls = {
        'doc1.md': 'url1',
        'non-existent.md': 'url2',
      };

      // Should not throw even though one file is missing
      await expect(warmCache(filenames, sourceUrls)).resolves.not.toThrow();

      // First file should be cached
      const cached1 = await readCache('doc1.md');
      expect(cached1).not.toBeNull();
    });
  });
});
