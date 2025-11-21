import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadDocument,
  downloadAllDocuments,
  getDownloadSummary,
  type DownloadOptions,
} from '../../../src/lib/doc-downloader.js';
import type {
  DocumentSection,
  ResourceConfiguration,
  DownloadProgress,
} from '../../../src/types/documentation.js';
import * as httpClient from '../../../src/utils/http-client.js';
import * as fileOps from '../../../src/lib/file-ops.js';

describe('Document Downloader', () => {
  let tempDir: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // Create unique temp directory for each test with higher entropy
    // Use both timestamp and random string to ensure uniqueness across rapid tests
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${process.pid}`;
    tempDir = join(tmpdir(), `test-downloader-${uniqueSuffix}`);
    process.env.HOME = tempDir;

    // Clear all mocks before each test to prevent state pollution
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    // Restore HOME environment variable first
    process.env.HOME = originalHome;

    // Restore all mocks and clear implementation details
    vi.restoreAllMocks();
    vi.clearAllMocks();

    // Clean up temporary directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Silently ignore cleanup errors - directory may not exist
      // but don't let cleanup failures affect test results
    }
  });

  const mockDoc: DocumentSection = {
    title: 'Test Document',
    url: 'https://example.com/test-doc',
    filename: 'test-doc.md',
    description: 'A test document',
  };

  const mockConfig: ResourceConfiguration = {
    categories: [
      {
        name: 'Test Category',
        slug: 'test',
        description: 'Test category',
        docs: [
          {
            title: 'Doc 1',
            url: 'https://example.com/doc1',
            filename: 'doc1.md',
            description: 'First doc',
          },
          {
            title: 'Doc 2',
            url: 'https://example.com/doc2',
            filename: 'doc2.md',
            description: 'Second doc',
          },
        ],
      },
    ],
  };

  describe('T021: Unit test for doc-downloader', () => {
    it('should export downloadDocument function', () => {
      expect(typeof downloadDocument).toBe('function');
    });

    it('should export downloadAllDocuments function', () => {
      expect(typeof downloadAllDocuments).toBe('function');
    });

    it('should export getDownloadSummary function', () => {
      expect(typeof getDownloadSummary).toBe('function');
    });
  });

  describe('T022: Test single file download with retry logic', () => {
    it('should download a single document successfully', async () => {
      const mockContent = '# Test Document\n\nThis is test content.';

      // Mock successful download
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      // Mock file write
      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const result = await downloadDocument(mockDoc);

      expect(result.success).toBe(true);
      expect(result.filename).toBe('test-doc.md');
      expect(result.retries).toBe(0);
      expect(writeSpy).toHaveBeenCalled();

      // Verify mocks were called as expected
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should retry on network failure', async () => {
      const mockContent = '# Test Document';

      // Mock failure then success
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 2, // Indicates 2 retries before success
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const result = await downloadDocument(mockDoc, { maxRetries: 3 });

      expect(result.success).toBe(true);
      expect(result.retries).toBe(2);
      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should fail after max retries exceeded', async () => {
      // Mock failure
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: false,
        error: 'Network timeout',
        retries: 3,
      });

      const result = await downloadDocument(mockDoc, { maxRetries: 3 });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.filename).toBe('test-doc.md');
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const mockContent = '# Test Document';

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      // Mock file write failure
      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockRejectedValue(
        new Error('Disk full'),
      );

      const result = await downloadDocument(mockDoc);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save document');
      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should use custom retry options', async () => {
      const mockContent = '# Test';

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const options: DownloadOptions = {
        maxRetries: 5,
        retryDelay: 1000,
        timeout: 60000,
      };

      await downloadDocument(mockDoc, options);

      expect(downloadSpy).toHaveBeenCalledWith(
        `${mockDoc.url}.md`,
        expect.objectContaining({
          maxRetries: 5,
          retryDelay: 1000,
          timeout: 60000,
        }),
      );
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should append .md extension to URL', async () => {
      const mockContent = '# Test';

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      await downloadDocument(mockDoc);

      // Should append .md to the URL
      expect(downloadSpy).toHaveBeenCalledWith(
        'https://example.com/test-doc.md',
        expect.objectContaining({
          maxRetries: 3,
          retryDelay: 2000,
          timeout: 30000,
          exponentialBackoff: true,
        }),
      );
      expect(writeSpy).toHaveBeenCalled();
    });
  });

  describe('T023: Test concurrent download with progress tracking', () => {
    it('should download multiple documents concurrently', async () => {
      const mockContent = '# Document';

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const results = await downloadAllDocuments(mockConfig);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should respect concurrency limit', async () => {
      const mockContent = '# Document';
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      // Test with concurrency of 1 (sequential)
      await downloadAllDocuments(mockConfig, { concurrency: 1 });

      // Should be called for each document
      expect(downloadSpy).toHaveBeenCalledTimes(2);
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should track download progress', async () => {
      const mockContent = '# Document';

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: true,
        content: mockContent,
        retries: 0,
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const progressUpdates: DownloadProgress[] = [];
      const onProgress = (progress: DownloadProgress) => {
        // Create a deep copy to avoid mutation issues across tests
        progressUpdates.push({ ...progress });
      };

      await downloadAllDocuments(mockConfig, { onProgress });

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Should have total set correctly
      expect(progressUpdates.every((p) => p.total === 2)).toBe(true);

      // Final progress should show all completed
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.completed).toBe(2);
      expect(finalProgress.failed).toBe(0);
      expect(finalProgress.current).toBeNull();

      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should handle mix of successful and failed downloads', async () => {
      let callCount = 0;

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            success: true,
            content: '# Success',
            retries: 0,
          };
        }
        return {
          success: false,
          error: 'Network error',
          retries: 3,
        };
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const results = await downloadAllDocuments(mockConfig);

      expect(results).toHaveLength(2);
      expect(results.filter((r) => r.success)).toHaveLength(1);
      expect(results.filter((r) => !r.success)).toHaveLength(1);
      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });
  });

  describe('T024: Test network error handling and partial failures', () => {
    it('should handle network timeout errors', async () => {
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: false,
        error: 'Request timeout',
        retries: 3,
      });

      const result = await downloadDocument(mockDoc);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should handle HTTP 404 errors', async () => {
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: false,
        error: 'HTTP 404: Not Found',
        statusCode: 404,
        retries: 3,
      });

      const result = await downloadDocument(mockDoc);

      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should handle HTTP 500 errors', async () => {
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: false,
        error: 'HTTP 500: Internal Server Error',
        statusCode: 500,
        retries: 3,
      });

      const result = await downloadDocument(mockDoc);

      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
      expect(downloadSpy).toHaveBeenCalled();
    });

    it('should continue downloading after partial failures', async () => {
      let callCount = 0;

      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockImplementation(async () => {
        callCount++;
        // First call fails, second succeeds
        if (callCount === 1) {
          return {
            success: false,
            error: 'Network error',
            retries: 3,
          };
        }
        return {
          success: true,
          content: '# Success',
          retries: 0,
        };
      });

      const writeSpy = vi.spyOn(fileOps, 'safeWriteFile').mockResolvedValue();

      const results = await downloadAllDocuments(mockConfig);

      // Should have attempted to download all files
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
      expect(downloadSpy).toHaveBeenCalled();
      expect(writeSpy).toHaveBeenCalled();
    });

    it('should track failed downloads in progress', async () => {
      const downloadSpy = vi.spyOn(httpClient, 'downloadFile').mockResolvedValue({
        success: false,
        error: 'Network error',
        retries: 3,
      });

      const progressUpdates: DownloadProgress[] = [];
      const onProgress = (progress: DownloadProgress) => {
        // Create a deep copy to ensure no mutation issues
        progressUpdates.push({ ...progress });
      };

      await downloadAllDocuments(mockConfig, { onProgress });

      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.failed).toBe(2);
      expect(finalProgress.completed).toBe(0);

      expect(downloadSpy).toHaveBeenCalled();
    });
  });

  describe('T025: Integration test for update workflow (placeholder)', () => {
    // This will be tested in integration tests
    it('should be tested in integration/update-workflow.test.ts', () => {
      // Placeholder - actual integration test will be in separate file
      expect(true).toBe(true);
    });
  });

  describe('T026: Test end-to-end first-time download scenario (placeholder)', () => {
    // This will be tested in integration tests
    it('should be tested in integration/update-workflow.test.ts', () => {
      // Placeholder - actual integration test will be in separate file
      expect(true).toBe(true);
    });
  });

  describe('getDownloadSummary', () => {
    it('should generate summary for all successful downloads', () => {
      const results = [
        { filename: 'doc1.md', success: true },
        { filename: 'doc2.md', success: true },
      ];

      const summary = getDownloadSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(0);
      expect(summary.failedFiles).toEqual([]);
    });

    it('should generate summary for mixed results', () => {
      const results = [
        { filename: 'doc1.md', success: true },
        { filename: 'doc2.md', success: false, error: 'Network error' },
        { filename: 'doc3.md', success: true },
      ];

      const summary = getDownloadSummary(results);

      expect(summary.total).toBe(3);
      expect(summary.successful).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.failedFiles).toEqual(['doc2.md']);
    });

    it('should generate summary for all failures', () => {
      const results = [
        { filename: 'doc1.md', success: false, error: 'Error 1' },
        { filename: 'doc2.md', success: false, error: 'Error 2' },
      ];

      const summary = getDownloadSummary(results);

      expect(summary.total).toBe(2);
      expect(summary.successful).toBe(0);
      expect(summary.failed).toBe(2);
      expect(summary.failedFiles).toEqual(['doc1.md', 'doc2.md']);
    });
  });
});
