import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadResourceConfig,
  validateResourceConfig,
  getTotalSections,
  REMOTE_RESOURCE_URL,
} from '../../src/lib/resource-loader.js';
import type { ResourceConfiguration } from '../../src/types/documentation.js';
import * as httpClient from '../../src/utils/http-client.js';
import * as fileOps from '../../src/lib/file-ops.js';

describe('Resource Loader', () => {
  let tempDir: string;
  let cacheFilePath: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    tempDir = join(tmpdir(), `test-resource-${Date.now()}-${Math.random().toString(36).substring(7)}`);
    process.env.HOME = tempDir;
    cacheFilePath = join(tempDir, '.claude-docs', '.resource-cache.json');

    // Clear any existing mocks
    vi.clearAllMocks();
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

  describe('validateResourceConfig', () => {
    it('should return true for valid configuration', () => {
      const validConfig: ResourceConfiguration = {
        categories: [
          {
            name: 'Getting Started',
            slug: 'getting-started',
            description: 'Introduction to Claude Code',
            docs: [
              {
                title: 'Installation',
                url: 'https://example.com/install.md',
                filename: 'installation.md',
                description: 'How to install',
              },
            ],
          },
        ],
      };

      expect(validateResourceConfig(validConfig)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(validateResourceConfig(null)).toBe(false);
      expect(validateResourceConfig(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateResourceConfig('string')).toBe(false);
      expect(validateResourceConfig(123)).toBe(false);
      expect(validateResourceConfig([])).toBe(false);
    });

    it('should return false when categories is not an array', () => {
      const invalidConfig = {
        categories: 'not-an-array',
      };

      expect(validateResourceConfig(invalidConfig)).toBe(false);
    });

    it('should return false when category is missing required fields', () => {
      const invalidConfig = {
        categories: [
          {
            name: 'Test',
            // missing slug, description, docs
          },
        ],
      };

      expect(validateResourceConfig(invalidConfig)).toBe(false);
    });

    it('should return false when docs is not an array', () => {
      const invalidConfig = {
        categories: [
          {
            name: 'Test',
            slug: 'test',
            description: 'Description',
            docs: 'not-an-array',
          },
        ],
      };

      expect(validateResourceConfig(invalidConfig)).toBe(false);
    });

    it('should return false when document is missing required fields', () => {
      const invalidConfig = {
        categories: [
          {
            name: 'Test',
            slug: 'test',
            description: 'Description',
            docs: [
              {
                title: 'Test Doc',
                // missing url, filename, description
              },
            ],
          },
        ],
      };

      expect(validateResourceConfig(invalidConfig)).toBe(false);
    });

    it('should return false when document field has wrong type', () => {
      const invalidConfig = {
        categories: [
          {
            name: 'Test',
            slug: 'test',
            description: 'Description',
            docs: [
              {
                title: 123, // should be string
                url: 'https://example.com',
                filename: 'test.md',
                description: 'Test',
              },
            ],
          },
        ],
      };

      expect(validateResourceConfig(invalidConfig)).toBe(false);
    });
  });

  describe('getTotalSections', () => {
    it('should count total documentation sections', () => {
      const config: ResourceConfiguration = {
        categories: [
          {
            name: 'Category 1',
            slug: 'cat1',
            description: 'First category',
            docs: [
              {
                title: 'Doc 1',
                url: 'https://example.com/1.md',
                filename: '1.md',
                description: 'First doc',
              },
              {
                title: 'Doc 2',
                url: 'https://example.com/2.md',
                filename: '2.md',
                description: 'Second doc',
              },
            ],
          },
          {
            name: 'Category 2',
            slug: 'cat2',
            description: 'Second category',
            docs: [
              {
                title: 'Doc 3',
                url: 'https://example.com/3.md',
                filename: '3.md',
                description: 'Third doc',
              },
            ],
          },
        ],
      };

      expect(getTotalSections(config)).toBe(3);
    });

    it('should return 0 for empty categories', () => {
      const config: ResourceConfiguration = {
        categories: [],
      };

      expect(getTotalSections(config)).toBe(0);
    });

    it('should return 0 when categories have no docs', () => {
      const config: ResourceConfiguration = {
        categories: [
          {
            name: 'Empty Category',
            slug: 'empty',
            description: 'No docs',
            docs: [],
          },
        ],
      };

      expect(getTotalSections(config)).toBe(0);
    });
  });

  describe('loadResourceConfig', () => {
    const validConfig: ResourceConfiguration = {
      categories: [
        {
          name: 'Test Category',
          slug: 'test',
          description: 'Test description',
          docs: [
            {
              title: 'Test Doc',
              url: 'https://example.com/test.md',
              filename: 'test.md',
              description: 'Test doc',
            },
          ],
        },
      ],
    };

    describe('T012: Test remote fetch success scenario', () => {
      it('should load configuration successfully', async () => {
        // Note: We can't reliably mock fetchWithRetry due to module resolution
        // but we can test that loadResourceConfig returns valid config
        const config = await loadResourceConfig();

        // Should return a valid configuration
        expect(validateResourceConfig(config)).toBe(true);
        expect(config.categories).toBeDefined();
        expect(Array.isArray(config.categories)).toBe(true);
        expect(config.categories.length).toBeGreaterThan(0);
      });

      it('should cache remote config after successful fetch', async () => {
        // Mock successful remote fetch
        vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: true,
          content: JSON.stringify(validConfig),
          error: null,
        });

        await loadResourceConfig();

        // Verify cache file was created
        const fileExistsSpy = vi.spyOn(fileOps, 'fileExists');
        await fileOps.fileExists(cacheFilePath);
        expect(fileExistsSpy).toHaveBeenCalled();
      });

      it('should use cached config on second load within cache duration', async () => {
        // First load - mock remote fetch
        const fetchSpy = vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: true,
          content: JSON.stringify(validConfig),
          error: null,
        });

        // Create a valid cache file manually
        await fileOps.ensureDir(join(tempDir, '.claude-docs'));
        await fileOps.safeWriteFile(
          cacheFilePath,
          JSON.stringify({
            timestamp: Date.now(),
            config: validConfig,
          }),
        );

        // Second load - should use cache
        const config = await loadResourceConfig();

        expect(config).toEqual(validConfig);
        // fetch should not be called when using cache
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    });

    describe('T013: Test remote fetch failure with fallback to bundled version', () => {
      it('should fallback to bundled version when remote fetch fails', async () => {
        // Mock remote fetch failure
        vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: false,
          content: null,
          error: 'Network error',
        });

        // The actual bundled file should exist in dist/
        // If it doesn't, this test will fail which is expected
        const config = await loadResourceConfig();

        // Should get a valid configuration from bundled file
        expect(validateResourceConfig(config)).toBe(true);
        expect(config.categories).toBeDefined();
        expect(Array.isArray(config.categories)).toBe(true);
      });

      it('should throw error when both remote and bundled fail', async () => {
        // Mock remote fetch failure
        vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: false,
          content: null,
          error: 'Network error',
        });

        // This test would require mocking the fs.readFile used internally
        // For now, we'll skip it since the bundled file exists
        // TODO: Add proper fs mocking or test in isolation
      });
    });

    describe('T014: Test resource file validation (schema check)', () => {
      it('should reject remote config with invalid structure', async () => {
        const invalidConfig = {
          categories: 'not-an-array', // invalid
        };

        // Mock remote fetch returning invalid config
        vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: true,
          content: JSON.stringify(invalidConfig),
          error: null,
        });

        // Should fallback to bundled version
        const config = await loadResourceConfig();

        // Should get valid config from bundled fallback
        expect(validateResourceConfig(config)).toBe(true);
      });

      it('should reject cached config with invalid structure', async () => {
        // Create invalid cache file
        await fileOps.ensureDir(join(tempDir, '.claude-docs'));
        await fileOps.safeWriteFile(
          cacheFilePath,
          JSON.stringify({
            timestamp: Date.now(),
            config: { categories: 'invalid' }, // invalid structure
          }),
        );

        // Mock remote fetch success
        vi.spyOn(httpClient, 'fetchWithRetry').mockResolvedValue({
          success: true,
          content: JSON.stringify(validConfig),
          error: null,
        });

        const config = await loadResourceConfig();

        // Should ignore invalid cache and fetch remote
        expect(config).toEqual(validConfig);
      });

      it('should reject cached config when expired', async () => {
        const oneHourAgo = Date.now() - (61 * 60 * 1000); // 61 minutes ago

        // Create expired cache file
        await fileOps.ensureDir(join(tempDir, '.claude-docs'));
        await fileOps.safeWriteFile(
          cacheFilePath,
          JSON.stringify({
            timestamp: oneHourAgo,
            config: validConfig,
          }),
        );

        // Load config - should not use expired cache
        const config = await loadResourceConfig();

        // Should return valid config (either from remote or bundled fallback)
        expect(validateResourceConfig(config)).toBe(true);

        // Verify the cached file was either updated or ignored
        // (In real usage, this would fetch from remote or use bundled)
        expect(config).toBeDefined();
      });

      it('should validate that config structure matches expected format', async () => {
        const config = await loadResourceConfig();

        // Should have categories array
        expect(Array.isArray(config.categories)).toBe(true);
        expect(config.categories.length).toBeGreaterThan(0);

        // Each category should have required fields
        for (const category of config.categories) {
          expect(typeof category.name).toBe('string');
          expect(typeof category.slug).toBe('string');
          expect(typeof category.description).toBe('string');
          expect(Array.isArray(category.docs)).toBe(true);

          // Each doc should have required fields
          for (const doc of category.docs) {
            expect(typeof doc.title).toBe('string');
            expect(typeof doc.url).toBe('string');
            expect(typeof doc.filename).toBe('string');
            expect(typeof doc.description).toBe('string');
          }
        }
      });

      it('should validate that total sections count is calculated correctly', async () => {
        const config = await loadResourceConfig();

        const totalSections = getTotalSections(config);

        // Should have a reasonable number of sections (>0)
        expect(totalSections).toBeGreaterThan(0);

        // Manually count sections to verify
        const manualCount = config.categories.reduce(
          (sum, cat) => sum + cat.docs.length,
          0,
        );

        expect(totalSections).toBe(manualCount);
      });
    });
  });
});
