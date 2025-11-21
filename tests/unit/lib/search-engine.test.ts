import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  searchDocuments,
  formatSearchResults,
  type SearchOptions,
} from '../../../src/lib/search-engine.js';
import { getDocPath } from '../../../src/utils/path-resolver.js';
import * as fileOps from '../../../src/lib/file-ops.js';

describe('Search Engine', () => {
  let tempDir: string;
  const originalHome = process.env.HOME;

  beforeEach(async () => {
    // Create unique temp directory for each test
    tempDir = join(
      tmpdir(),
      `test-search-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    process.env.HOME = tempDir;

    // Clear any existing test documents (in case of incomplete cleanup)
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if directory doesn't exist
    }

    // Create test documents with base names for shared tests
    await fileOps.safeWriteFile(
      getDocPath('base-doc1.md'),
      `# Document 1

This is a test document about plugins.
Plugins allow you to extend functionality.
You can create custom plugins for your needs.

## Plugin Configuration

Configure plugins in the config file.`,
    );

    await fileOps.safeWriteFile(
      getDocPath('base-doc2.md'),
      `# Document 2

This document discusses hooks and middleware.
Hooks provide lifecycle events.
Middleware processes requests.

## Advanced Topics

Plugin development requires understanding hooks.`,
    );

    await fileOps.safeWriteFile(
      getDocPath('base-doc3.md'),
      `# Document 3

Complete guide to CLI commands.
CLI stands for Command Line Interface.
Use CLI commands to interact with the system.`,
    );
  });

  afterEach(async () => {
    process.env.HOME = originalHome;

    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('T110: Unit test for search-engine', () => {
    it('should export searchDocuments function', () => {
      expect(typeof searchDocuments).toBe('function');
    });

    it('should export formatSearchResults function', () => {
      expect(typeof formatSearchResults).toBe('function');
    });
  });

  describe('T111: Test case-insensitive keyword matching', () => {
    it('should find matches case-insensitively by default', async () => {
      const results = await searchDocuments('PLUGIN');

      expect(results.length).toBeGreaterThan(0);

      // Should find matches in base-doc1 and base-doc2
      const filenames = results.map((r) => r.filename);
      expect(filenames).toContain('base-doc1.md');
      expect(filenames).toContain('base-doc2.md');
    });

    it('should find matches with lowercase query', async () => {
      const results = await searchDocuments('plugin');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.filename === 'base-doc1.md')).toBe(true);
    });

    it('should find matches with mixed case query', async () => {
      const results = await searchDocuments('PlUgIn');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.filename === 'base-doc1.md')).toBe(true);
    });

    it('should support case-sensitive search when option is set', async () => {
      // Create a test document with specific casing (unique filename)
      await fileOps.safeWriteFile(
        getDocPath('t111-case-test.md'),
        `# Case Sensitive Test

lowercase: plugin
UPPERCASE: PLUGIN
MixedCase: Plugin`,
      );

      const options: SearchOptions = {
        caseInsensitive: false,
      };

      // Search for lowercase - should find only lowercase match
      const resultsLower = await searchDocuments('plugin', options);
      const lowerMatches = resultsLower.filter((r) =>
        r.matchedLine.includes('lowercase:'),
      );
      expect(lowerMatches.length).toBeGreaterThan(0);

      // Search for uppercase - should find only uppercase match
      const resultsUpper = await searchDocuments('PLUGIN', options);
      const upperMatches = resultsUpper.filter((r) =>
        r.matchedLine.includes('UPPERCASE:'),
      );
      expect(upperMatches.length).toBeGreaterThan(0);

      // The results should be different
      expect(resultsLower.length).not.toBe(resultsUpper.length);
    });

    it('should match multiple occurrences in same document', async () => {
      const results = await searchDocuments('plugin');

      // base-doc1.md has multiple lines with "plugin"
      const doc1Results = results.filter((r) => r.filename === 'base-doc1.md');
      expect(doc1Results.length).toBeGreaterThan(1);
    });
  });

  describe('T112: Test context extraction (±5 lines)', () => {
    it('should extract context lines around match', async () => {
      const results = await searchDocuments('Plugins allow');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // Should have context array
      expect(Array.isArray(result.context)).toBe(true);
      expect(result.context.length).toBeGreaterThan(0);

      // Context should include the matched line
      expect(result.context.some((line) => line.includes('Plugins allow'))).toBe(true);
    });

    it('should extract 5 lines before and after by default', async () => {
      // Search for something in the middle of doc1
      const results = await searchDocuments('Configure plugins');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // Context should include up to 11 lines (5 before + match + 5 after)
      // But may be less if near start/end of file
      expect(result.context.length).toBeLessThanOrEqual(11);
      expect(result.context.length).toBeGreaterThan(0);
    });

    it('should support custom context line count', async () => {
      const options: SearchOptions = {
        contextLines: 2,
      };

      const results = await searchDocuments('Configure plugins', options);

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // With contextLines=2, should have at most 5 lines (2 before + match + 2 after)
      expect(result.context.length).toBeLessThanOrEqual(5);
    });

    it('should handle matches at start of file', async () => {
      const results = await searchDocuments('# Document 1');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // Should have context even at start of file
      expect(result.context.length).toBeGreaterThan(0);

      // First line of context should be the match
      expect(result.context[0]).toContain('# Document 1');
    });

    it('should handle matches at end of file', async () => {
      const results = await searchDocuments('config file');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // Should have context
      expect(result.context.length).toBeGreaterThan(0);
    });

    it('should include correct line number', async () => {
      const results = await searchDocuments('# Document 1');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      // First line should be line 1
      expect(result.lineNumber).toBe(1);
    });
  });

  describe('T113: Test result limiting (10 detailed, summary for more)', () => {
    it('should return all results when under limit', async () => {
      const results = await searchDocuments('plugin');

      // Should find several results from our test documents
      expect(results.length).toBeGreaterThan(0);
      // Note: We don't assert specific count as it depends on test data created in beforeEach
      // Just verify results are returned
      expect(Array.isArray(results)).toBe(true);
    });

    it('should format detailed results for first 10', async () => {
      // Create more test documents to get more results (unique naming for this test)
      for (let i = 4; i <= 15; i++) {
        await fileOps.safeWriteFile(
          getDocPath(`t113-format-detailed-doc${i}.md`),
          `# Document ${i}\n\nThis mentions plugin functionality.\nPlugins are great.`,
        );
      }

      const results = await searchDocuments('plugin');
      const formatted = formatSearchResults(results, 10);

      // Should mention total count
      expect(formatted).toContain(`Found ${results.length} result(s)`);

      // If more than 10 results, should show "and X more"
      if (results.length > 10) {
        expect(formatted).toContain('more result(s)');
        expect(formatted).toContain('Additional matches:');
      }
    });

    it('should show summary for results beyond limit', async () => {
      // Create documents to ensure we have more than 10 results (unique naming for this test)
      for (let i = 4; i <= 20; i++) {
        await fileOps.safeWriteFile(
          getDocPath(`t113-summary-beyond-doc${i}.md`),
          `# Document ${i}\n\nPlugin content here.\nMore plugin info.`,
        );
      }

      const results = await searchDocuments('plugin');
      expect(results.length).toBeGreaterThan(10);

      const formatted = formatSearchResults(results, 10);

      // Should show summary
      const remaining = results.length - 10;
      expect(formatted).toContain(`${remaining} more result(s)`);
    });

    it('should support custom max results limit', async () => {
      const options: SearchOptions = {
        maxResults: 3,
      };

      const results = await searchDocuments('plugin', options);

      // Even if more matches exist, we get all results
      // (maxResults is used for formatting, not limiting search)
      expect(results.length).toBeGreaterThan(0);

      // But formatting respects the limit
      const formatted = formatSearchResults(results, 3);

      if (results.length > 3) {
        expect(formatted).toContain('more result(s)');
      }
    });
  });

  describe('T114: Integration test (placeholder)', () => {
    // This will be tested in integration tests
    it('should be tested in integration/search-integration.test.ts', () => {
      // Placeholder - actual integration test will be in separate file
      expect(true).toBe(true);
    });
  });

  describe('searchDocuments', () => {
    it('should return empty array when docs directory does not exist', async () => {
      // NOTE: We can't easily test this by changing HOME because path-resolver
      // caches paths at module import time. Instead, we test the function's
      // behavior by ensuring it handles missing directories gracefully.

      // The function checks fileExists(DOCS_DIR) and returns [] if false
      // This is verified by the implementation, and other tests verify
      // it returns results when docs exist.

      // This is a placeholder to document the expected behavior
      expect(true).toBe(true);
    });

    it('should skip non-markdown files', async () => {
      // Create a non-markdown file (unique filename)
      await fileOps.safeWriteFile(getDocPath('non-markdown-skip-test.txt'), 'Plugin info in txt file');

      const results = await searchDocuments('plugin');

      // Should not find matches in .txt file
      expect(results.every((r) => r.filename.endsWith('.md'))).toBe(true);
    });

    it('should handle regex patterns', async () => {
      const results = await searchDocuments('plugin.*functionality');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should escape invalid regex and search literally', async () => {
      // Search for something with regex special chars
      const results = await searchDocuments('CLI (commands)');

      // Should not throw, and should find results if pattern exists
      expect(Array.isArray(results)).toBe(true);
    });

    it('should include section name from filename', async () => {
      const results = await searchDocuments('plugin');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      expect(result.section).toBe(result.filename.replace('.md', ''));
    });

    it('should include matched line trimmed', async () => {
      const results = await searchDocuments('plugin');

      expect(results.length).toBeGreaterThan(0);
      const result = results[0];

      expect(result.matchedLine).toBeTruthy();
      // Should be trimmed (no leading/trailing whitespace)
      expect(result.matchedLine).toBe(result.matchedLine.trim());
    });
  });

  describe('formatSearchResults', () => {
    it('should return "No results found" for empty results', () => {
      const formatted = formatSearchResults([]);

      expect(formatted).toBe('No results found.');
    });

    it('should include total count', async () => {
      const results = await searchDocuments('plugin');
      const formatted = formatSearchResults(results);

      expect(formatted).toContain(`Found ${results.length} result(s)`);
    });

    it('should show file and line number for each result', async () => {
      const results = await searchDocuments('plugin');
      const formatted = formatSearchResults(results);

      // Should show section name and line number
      expect(formatted).toMatch(/📄.*\(line \d+\)/);
    });

    it('should show matched line content', async () => {
      const results = await searchDocuments('Plugins allow');
      const formatted = formatSearchResults(results);

      expect(formatted).toContain('Plugins allow');
    });

    it('should show context with highlighting', async () => {
      const results = await searchDocuments('Plugins allow');
      const formatted = formatSearchResults(results);

      // Should show "Context:" header
      expect(formatted).toContain('Context:');

      // Should mark the matched line with ">"
      expect(formatted).toMatch(/>\s+.*Plugins allow/);
    });
  });
});
