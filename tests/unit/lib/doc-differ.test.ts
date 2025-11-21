import { describe, expect, it } from 'vitest';
import {
  generateDiff,
  compareDocuments,
  getDiffSummary,
  type DiffResult,
} from '../../../src/lib/doc-differ.js';

describe('Document Differ', () => {
  describe('T057: Unit test for diff generation', () => {
    it('should export generateDiff function', () => {
      expect(typeof generateDiff).toBe('function');
    });

    it('should export compareDocuments function', () => {
      expect(typeof compareDocuments).toBe('function');
    });

    it('should export getDiffSummary function', () => {
      expect(typeof getDiffSummary).toBe('function');
    });
  });

  describe('T058: Test unified diff format output', () => {
    it('should generate unified diff in standard format', () => {
      const oldContent = `# Test Document

This is the first line.
This is the second line.
This is the third line.`;

      const newContent = `# Test Document

This is the first line.
This line has been modified.
This is the third line.`;

      const result = generateDiff('test.md', oldContent, newContent);

      // Should have changes
      expect(result.hasChanges).toBe(true);

      // Should contain unified diff markers
      expect(result.diff).toContain('---');
      expect(result.diff).toContain('+++');
      expect(result.diff).toContain('@@');

      // Should show the change
      expect(result.diff).toContain('-This is the second line.');
      expect(result.diff).toContain('+This line has been modified.');
    });

    it('should include filename in diff header', () => {
      const oldContent = 'Old content';
      const newContent = 'New content';

      const result = generateDiff('plugins.md', oldContent, newContent);

      expect(result.diff).toContain('plugins.md');
      expect(result.filename).toBe('plugins.md');
    });

    it('should include version labels in diff', () => {
      const oldContent = 'Old content';
      const newContent = 'New content';

      const result = generateDiff('test.md', oldContent, newContent);

      expect(result.diff).toContain('Current version');
      expect(result.diff).toContain('New version');
    });

    it('should use specified context lines', () => {
      const oldContent = `Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7`;

      const newContent = `Line 1
Line 2
Line 3
Modified Line 4
Line 5
Line 6
Line 7`;

      // With 1 line of context
      const result1 = generateDiff('test.md', oldContent, newContent, 1);
      expect(result1.diff).toContain('Line 3');
      expect(result1.diff).toContain('Line 5');

      // With 2 lines of context
      const result2 = generateDiff('test.md', oldContent, newContent, 2);
      expect(result2.diff).toContain('Line 2');
      expect(result2.diff).toContain('Line 6');
    });

    it('should count lines added and removed', () => {
      const oldContent = `Line 1
Line 2
Line 3`;

      const newContent = `Line 1
New Line 2
New Line 3
Line 3`;

      const result = generateDiff('test.md', oldContent, newContent);

      expect(result.linesAdded).toBe(2); // Two lines added
      expect(result.linesRemoved).toBe(1); // One line removed
    });

    it('should handle no changes', () => {
      const content = `# Document

Same content here.`;

      const result = generateDiff('test.md', content, content);

      expect(result.hasChanges).toBe(false);
      expect(result.linesAdded).toBe(0);
      expect(result.linesRemoved).toBe(0);
    });
  });

  describe('T059: Test change detection (new, modified, unchanged files)', () => {
    it('should detect identical documents', () => {
      const content = `# Document

This is the content.`;

      const result = compareDocuments(content, content);

      expect(result).toBe(false); // No changes
    });

    it('should detect modified documents', () => {
      const oldContent = '# Original Document';
      const newContent = '# Modified Document';

      const result = compareDocuments(oldContent, newContent);

      expect(result).toBe(true); // Has changes
    });

    it('should normalize line endings before comparison', () => {
      const unixContent = 'Line 1\nLine 2\nLine 3';
      const windowsContent = 'Line 1\r\nLine 2\r\nLine 3';

      const result = compareDocuments(unixContent, windowsContent);

      expect(result).toBe(false); // Should be considered identical
    });

    it('should trim outer whitespace before comparison', () => {
      const content1 = '# Document\n\nContent';
      const content2 = '  # Document\n\nContent  ';

      const result = compareDocuments(content1, content2);

      // The implementation trims the entire content before comparison
      // So leading/trailing whitespace on the whole string should be ignored
      expect(result).toBe(false); // Should be identical after trim
    });

    it('should detect addition of content', () => {
      const oldContent = '# Document';
      const newContent = '# Document\n\nNew paragraph added.';

      const result = compareDocuments(oldContent, newContent);

      expect(result).toBe(true);
    });

    it('should detect removal of content', () => {
      const oldContent = '# Document\n\nParagraph to remove.';
      const newContent = '# Document';

      const result = compareDocuments(oldContent, newContent);

      expect(result).toBe(true);
    });

    it('should detect subtle changes', () => {
      const oldContent = 'The quick brown fox';
      const newContent = 'The quick red fox';

      const result = compareDocuments(oldContent, newContent);

      expect(result).toBe(true);
    });
  });

  describe('getDiffSummary', () => {
    it('should return summary without generating full diff', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1\nModified Line 2\nLine 3\nLine 4';

      const summary = getDiffSummary(oldContent, newContent);

      expect(summary.changed).toBe(true);
      expect(summary.added).toBeGreaterThan(0);
      expect(summary.removed).toBeGreaterThan(0);
    });

    it('should return zero counts for identical content', () => {
      const content = 'Same content';

      const summary = getDiffSummary(content, content);

      expect(summary.changed).toBe(false);
      expect(summary.added).toBe(0);
      expect(summary.removed).toBe(0);
    });

    it('should count only additions', () => {
      const oldContent = 'Line 1';
      const newContent = 'Line 1\nLine 2\nLine 3';

      const summary = getDiffSummary(oldContent, newContent);

      expect(summary.changed).toBe(true);
      expect(summary.added).toBeGreaterThan(0);
      // Note: diff might count context lines, so we just check added > 0
    });

    it('should count only removals', () => {
      const oldContent = 'Line 1\nLine 2\nLine 3';
      const newContent = 'Line 1';

      const summary = getDiffSummary(oldContent, newContent);

      expect(summary.changed).toBe(true);
      expect(summary.removed).toBeGreaterThan(0);
      // Note: diff might include context in counts
    });
  });

  describe('Edge cases', () => {
    it('should handle empty documents', () => {
      const result = generateDiff('test.md', '', '');

      expect(result.hasChanges).toBe(false);
      expect(result.linesAdded).toBe(0);
      expect(result.linesRemoved).toBe(0);
    });

    it('should handle adding content to empty document', () => {
      const result = generateDiff('test.md', '', '# New Content');

      expect(result.hasChanges).toBe(true);
      expect(result.linesAdded).toBeGreaterThan(0);
      expect(result.linesRemoved).toBe(0);
    });

    it('should handle removing all content', () => {
      const result = generateDiff('test.md', '# Content', '');

      expect(result.hasChanges).toBe(true);
      expect(result.linesAdded).toBe(0);
      expect(result.linesRemoved).toBeGreaterThan(0);
    });

    it('should handle very long documents', () => {
      const longContent = Array.from({ length: 1000 }, (_, i) => `Line ${i + 1}`).join('\n');
      const modifiedContent = longContent.replace('Line 500', 'Modified Line 500');

      const result = generateDiff('test.md', longContent, modifiedContent);

      expect(result.hasChanges).toBe(true);
      expect(result.diff).toContain('Modified Line 500');
    });

    it('should handle documents with special characters', () => {
      const oldContent = '# Title\n\n`Code` and **bold** text.';
      const newContent = '# Title\n\n`Modified` and **bold** text.';

      const result = generateDiff('test.md', oldContent, newContent);

      expect(result.hasChanges).toBe(true);
      expect(result.diff).toContain('`Modified`');
    });
  });
});
