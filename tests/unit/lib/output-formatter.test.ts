import { describe, expect, it } from 'vitest';
import { OutputFormatter } from '../../../src/lib/output-formatter.js';

describe('OutputFormatter - AI Mode', () => {
  const formatter = new OutputFormatter('ai');

  describe('heading', () => {
    it('should format headings as markdown h2', () => {
      expect(formatter.heading('Test Heading')).toBe('## Test Heading\n');
    });
  });

  describe('success', () => {
    it('should format success with checkmark', () => {
      expect(formatter.success('Operation completed')).toBe('✓ Operation completed');
    });
  });

  describe('error', () => {
    it('should format error with X mark', () => {
      expect(formatter.error('File not found')).toBe('✗ File not found');
    });
  });

  describe('warning', () => {
    it('should format warning with warning symbol', () => {
      expect(formatter.warning('Cache outdated')).toBe('⚠ Cache outdated');
    });
  });

  describe('info', () => {
    it('should format info as plain text', () => {
      expect(formatter.info('Processing...')).toBe('Processing...');
    });
  });

  describe('command', () => {
    it('should format command with backticks and description', () => {
      expect(formatter.command('search <query>', 'Search documentation')).toBe(
        '`search <query>` - Search documentation\n',
      );
    });
  });

  describe('list', () => {
    it('should format single item as markdown list', () => {
      expect(formatter.list(['Item 1'])).toBe('- Item 1\n');
    });

    it('should format multiple items as markdown list', () => {
      const result = formatter.list(['Item 1', 'Item 2', 'Item 3']);
      expect(result).toBe('- Item 1\n- Item 2\n- Item 3\n');
    });

    it('should handle empty list', () => {
      expect(formatter.list([])).toBe('');
    });
  });
});

describe('OutputFormatter - User Mode', () => {
  const formatter = new OutputFormatter('user');

  describe('heading', () => {
    it('should format headings with ANSI bold blue', () => {
      const result = formatter.heading('Test Heading');
      expect(result).toContain('\x1b[1;34m');
      expect(result).toContain('Test Heading');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('success', () => {
    it('should format success with ANSI green', () => {
      const result = formatter.success('Operation completed');
      expect(result).toContain('\x1b[32m');
      expect(result).toContain('✓ Operation completed');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('error', () => {
    it('should format error with ANSI red', () => {
      const result = formatter.error('File not found');
      expect(result).toContain('\x1b[31m');
      expect(result).toContain('✗ File not found');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('warning', () => {
    it('should format warning with ANSI yellow', () => {
      const result = formatter.warning('Cache outdated');
      expect(result).toContain('\x1b[33m');
      expect(result).toContain('⚠ Cache outdated');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('info', () => {
    it('should format info with ANSI blue', () => {
      const result = formatter.info('Processing...');
      expect(result).toContain('\x1b[34m');
      expect(result).toContain('Processing...');
      expect(result).toContain('\x1b[0m');
    });
  });

  describe('command', () => {
    it('should format command with colors and alignment', () => {
      const result = formatter.command('search <query>', 'Search documentation');
      expect(result).toContain('search <query>');
      expect(result).toContain('Search documentation');
      // Should use ANSI codes for formatting
      expect(result).toContain('\x1b[');
    });
  });

  describe('list', () => {
    it('should format list with bullets and indentation', () => {
      const result = formatter.list(['Item 1', 'Item 2']);
      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
      // Should have proper formatting
      expect(result.length).toBeGreaterThan('Item 1Item 2'.length);
    });

    it('should handle empty list', () => {
      expect(formatter.list([])).toBe('');
    });
  });
});

describe('OutputFormatter - Mode Property', () => {
  it('should expose mode property for AI mode', () => {
    const formatter = new OutputFormatter('ai');
    expect(formatter.mode).toBe('ai');
  });

  it('should expose mode property for user mode', () => {
    const formatter = new OutputFormatter('user');
    expect(formatter.mode).toBe('user');
  });
});

describe('OutputFormatter - Table Formatting', () => {
  describe('AI Mode', () => {
    const formatter = new OutputFormatter('ai');

    it('should format table as markdown', () => {
      const data = [
        { name: 'foo', value: '123' },
        { name: 'bar', value: '456' },
      ];

      const result = formatter.table(data);

      // Should be markdown table
      expect(result).toContain('| name | value |');
      expect(result).toContain('|---|---|');
      expect(result).toContain('| foo | 123 |');
      expect(result).toContain('| bar | 456 |');
    });

    it('should handle empty table', () => {
      expect(formatter.table([])).toBe('');
    });
  });

  describe('User Mode', () => {
    const formatter = new OutputFormatter('user');

    it('should format table with alignment', () => {
      const data = [
        { name: 'foo', value: '123' },
        { name: 'bar', value: '456' },
      ];

      const result = formatter.table(data);

      // Should contain headers and data
      expect(result).toContain('name');
      expect(result).toContain('value');
      expect(result).toContain('foo');
      expect(result).toContain('123');
      expect(result).toContain('bar');
      expect(result).toContain('456');
    });

    it('should handle empty table', () => {
      expect(formatter.table([])).toBe('');
    });
  });
});

describe('OutputFormatter - TTY Detection', () => {
  it('should accept custom TTY value', () => {
    const formatter = new OutputFormatter('user', false);
    expect(formatter).toBeDefined();
  });

  it('should use default TTY when not specified', () => {
    const formatter = new OutputFormatter('user');
    expect(formatter).toBeDefined();
  });
});
