/**
 * Renderer system for command output
 * Transforms JSON data into appropriate format based on output mode
 */

import type {
  CacheInfoResult,
  CommandResult,
  DoctorResult,
  GetResult,
  ListResult,
  SearchResult,
  UpdateStatusResult,
} from '../types/command-results.js';
import * as boxDrawing from './box-drawing.js';
import { OutputFormatter } from './output-formatter.js';

export type OutputMode = 'ai' | 'user' | 'json';

/**
 * Base renderer interface
 */
export interface Renderer {
  renderList(result: CommandResult<ListResult>): string;
  renderGet(result: CommandResult<GetResult>): string;
  renderSearch(result: CommandResult<SearchResult>): string;
  renderUpdateStatus(result: CommandResult<UpdateStatusResult>): string;
  renderCacheInfo(result: CommandResult<CacheInfoResult>): string;
  renderDoctor(result: CommandResult<DoctorResult>): string;
  renderError(result: CommandResult<unknown>): string;
}

/**
 * JSON Renderer - outputs raw JSON
 */
export class JSONRenderer implements Renderer {
  render(result: CommandResult<unknown>): string {
    return JSON.stringify(result, null, 2);
  }

  renderList(result: CommandResult<ListResult>): string {
    return this.render(result);
  }

  renderGet(result: CommandResult<GetResult>): string {
    return this.render(result);
  }

  renderSearch(result: CommandResult<SearchResult>): string {
    return this.render(result);
  }

  renderUpdateStatus(result: CommandResult<UpdateStatusResult>): string {
    return this.render(result);
  }

  renderCacheInfo(result: CommandResult<CacheInfoResult>): string {
    return this.render(result);
  }

  renderDoctor(result: CommandResult<DoctorResult>): string {
    return this.render(result);
  }

  renderError(result: CommandResult<unknown>): string {
    return this.render(result);
  }
}

/**
 * AI Renderer - structured markdown optimized for LLM parsing
 */
export class AIRenderer implements Renderer {
  renderList(result: CommandResult<ListResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data, metadata } = result;
    let output = '';

    // Title
    if (data.type === 'list_all') {
      output += '# Available Documentation\n\n';
    } else {
      output += '# Document Sections\n\n';
    }

    // Build table with calculated column widths
    if (data.type === 'list_all') {
      // Calculate column widths
      const slugWidth = Math.max(4, ...data.items.map((i) => i.slug.length));
      const titleWidth = Math.max(5, ...data.items.map((i) => i.title.length));
      const categoryWidth = Math.max(8, ...data.items.map((i) => i.category?.length ?? 0));
      const sectionsWidth = 8;

      // Calculate command column width
      const commandWidth = Math.max(7, ...data.items.map((i) => i.slug.length + 16)); // "claude-docs get " = 16

      // Show by category if available
      if (data.categories && data.categories.length > 0) {
        for (const category of data.categories) {
          output += `## ${category.name}\n\n`;

          // Header
          output += `| ${'Slug'.padEnd(slugWidth)} | ${'Title'.padEnd(titleWidth)} | ${'Sections'.padEnd(sectionsWidth)} | ${'Command'.padEnd(commandWidth)} |\n`;
          output += `|${'-'.repeat(slugWidth + 2)}|${'-'.repeat(titleWidth + 2)}|${'-'.repeat(sectionsWidth + 2)}|${'-'.repeat(commandWidth + 2)}|\n`;

          // Rows for this category
          for (const item of category.docs) {
            const sections = String(item.sectionCount ?? 'N/A');
            const command = `\`claude-docs get ${item.slug}\``;
            output += `| ${item.slug.padEnd(slugWidth)} | ${item.title.padEnd(titleWidth)} | ${sections.padEnd(sectionsWidth)} | ${command.padEnd(commandWidth + 2)} |\n`;
          }

          output += '\n';
        }
      } else {
        // Fallback: single table (if no categories)
        output += `| ${'Slug'.padEnd(slugWidth)} | ${'Title'.padEnd(titleWidth)} | ${'Sections'.padEnd(sectionsWidth)} | ${'Command'.padEnd(commandWidth)} |\n`;
        output += `|${'-'.repeat(slugWidth + 2)}|${'-'.repeat(titleWidth + 2)}|${'-'.repeat(sectionsWidth + 2)}|${'-'.repeat(commandWidth + 2)}|\n`;

        for (const item of data.items) {
          const sections = String(item.sectionCount ?? 'N/A');
          const command = `\`claude-docs get ${item.slug}\``;
          output += `| ${item.slug.padEnd(slugWidth)} | ${item.title.padEnd(titleWidth)} | ${sections.padEnd(sectionsWidth)} | ${command.padEnd(commandWidth + 2)} |\n`;
        }
      }
    } else {
      // Calculate column widths for sections
      const levelWidth = 5; // "Level" header
      const titleWidth = Math.max(
        13,
        ...data.items.map((i) => i.title.length + ((i.level ?? 1) - 1) * 2),
      );
      const commandWidth = Math.max(
        7,
        ...data.items.map((i) => `${i.slug}#${i.anchor}`.length + 18), // "claude-docs get " = 16 chars
      );

      output += `| ${'Level'.padEnd(levelWidth)} | ${'Section Title'.padEnd(titleWidth)} | ${'Command'.padEnd(commandWidth)} |\n`;
      output += `|${'-'.repeat(levelWidth + 2)}|${'-'.repeat(titleWidth + 2)}|${'-'.repeat(commandWidth + 2)}|\n`;

      for (const item of data.items) {
        const indent = '  '.repeat((item.level ?? 1) - 1);
        const level = '#'.repeat(item.level ?? 1);
        const title = indent + item.title;
        const command = `\`claude-docs get ${item.slug}#${item.anchor}\``;
        output += `| ${level.padEnd(levelWidth)} | ${title.padEnd(titleWidth)} | ${command.padEnd(commandWidth + 2)} |\n`;
      }
    }

    output += `Total: ${data.totalCount} ${data.type === 'list_all' ? 'documents' : 'sections'}\n`;

    // Add usage examples for list_all
    if (data.type === 'list_all') {
      output += '\n## Usage Examples\n\n';
      output += '```bash\n';
      output += '# Get a specific document\n';
      output += 'claude-docs get overview\n\n';
      output += '# Get a document with specific section\n';
      output += 'claude-docs get settings#hooks\n\n';
      output += '# List sections within a document\n';
      output += 'claude-docs list quickstart\n';
      output += '```\n';

      output += '\n## Note on Related Topics\n\n';
      output += 'Some topics have multiple related documents:\n';
      output += '- **Plugins**: See both `plugins` and `plugins-reference`\n';
      output += '- **Plugins**: Also check `plugin-marketplaces`\n';
      output += '- **Hooks**: See both `hooks` and `hooks-guide`\n';
      output += '- **Settings**: Related to `model-config`, `terminal-config`, `statusline`\n';
    }

    // Only show metadata footer if data is stale (>24h)
    if (metadata?.dataAge && metadata.dataAge > 24) {
      output += '\n---\n';
      output += '⚠️ **Documentation may be outdated**\n\n';
      output += `Last update: ${metadata.dataAge} hours ago\n\n`;
      output += 'To refresh: `claude-docs update`\n';
    }

    return output;
  }

  renderGet(result: CommandResult<GetResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data, metadata } = result;
    let output = '';

    // Content
    output += data.content;

    // Only show metadata if data is stale (>24h)
    if (metadata?.dataAge && metadata.dataAge > 24) {
      output += '\n\n---\n';
      output += '⚠️ **Documentation may be outdated**\n\n';
      output += `Last update: ${metadata.dataAge} hours ago\n\n`;
      output += 'To refresh: `claude-docs update`\n';
    }

    return output;
  }

  renderSearch(result: CommandResult<SearchResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data, metadata } = result;
    let output = '';

    output += `# Search Results: "${data.query}"\n\n`;

    if (data.totalResults === 0) {
      output += 'No results found.\n\n';
      output += 'Try:\n';
      output += '- Using different keywords\n';
      output += '- Checking spelling\n';
      output += '- Using `claude-docs list` to browse available topics\n';
      return output;
    }

    // Limit to first 50 results
    const displayResults = data.results.slice(0, 50);

    // Calculate column widths
    const docWidth = Math.max(8, ...displayResults.map((r) => r.slug.length));
    const matchWidth = Math.max(5, ...displayResults.map((r) => Math.min(60, r.matchedText.length)));
    const commandWidth = Math.max(7, ...displayResults.map((r) => r.slug.length + 16));

    // Results table
    output += `| ${'Document'.padEnd(docWidth)} | ${'Match'.padEnd(matchWidth)} | ${'Command'.padEnd(commandWidth)} |\n`;
    output += `|${'-'.repeat(docWidth + 2)}|${'-'.repeat(matchWidth + 2)}|${'-'.repeat(commandWidth + 2)}|\n`;

    for (const match of displayResults) {
      const shortMatch = match.matchedText.substring(0, 60).trim();
      const command = `\`claude-docs get ${match.slug}\``;
      output += `| ${match.slug.padEnd(docWidth)} | ${shortMatch.padEnd(matchWidth)} | ${command.padEnd(commandWidth + 2)} |\n`;
    }

    output += `\nFound: ${data.totalResults} results`;
    if (data.totalResults >= 50) {
      output += ' (showing first 50)';
    }
    output += '\n';

    // Only show metadata if data is stale (>24h)
    if (metadata?.dataAge && metadata.dataAge > 24) {
      output += '\n---\n';
      output += '⚠️ **Documentation may be outdated**\n\n';
      output += `Last update: ${metadata.dataAge} hours ago\n\n`;
      output += 'To refresh: `claude-docs update`\n';
    }

    return output;
  }

  renderUpdateStatus(result: CommandResult<UpdateStatusResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += '# Documentation Status\n\n';

    if (!data.installed) {
      output += '⚠️ **Not installed**\n\n';
      output += 'Run `claude-docs update` to download documentation.\n';
      return output;
    }

    output += '| Property | Value |\n';
    output += '|----------|-------|\n';
    output += `| Installed | Yes |\n`;
    output += `| Data Age | ${data.dataAge} hours |\n`;
    output += `| Last Update | ${data.lastUpdate ?? 'Unknown'} |\n`;
    output += `| Pending Updates | ${data.pendingUpdates ? 'Yes' : 'No'} |\n`;
    output += `| Total Docs | ${data.stats.totalDocs} |\n`;
    output += `| Cache Size | ${data.stats.cacheSize} |\n`;

    if (data.changelogEntries.length > 0) {
      output += '\n## Recent Updates\n\n';
      for (const entry of data.changelogEntries.slice(0, 5)) {
        output += `- ${entry.timestamp}: ${entry.message}\n`;
      }
    }

    return output;
  }

  renderCacheInfo(result: CommandResult<CacheInfoResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += '# Cache Information\n\n';

    if (!data.exists) {
      output += '⚠️ **Cache not initialized**\n\n';
      output += 'Cache will be created when needed.\n';
      return output;
    }

    output += '| Property | Value |\n';
    output += '|----------|-------|\n';
    output += `| Total Files | ${data.stats.totalFiles} |\n`;
    output += `| Total Size | ${data.stats.totalSize} |\n`;
    if (data.stats.oldestFile) {
      output += `| Oldest File | ${data.stats.oldestFile} |\n`;
    }
    if (data.stats.newestFile) {
      output += `| Newest File | ${data.stats.newestFile} |\n`;
    }

    return output;
  }

  renderDoctor(result: CommandResult<DoctorResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += '# Health Check Results\n\n';

    output += '| Check | Status | Details |\n';
    output += '|-------|--------|----------|\n';

    for (const check of data.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      output += `| ${check.name} | ${icon} ${check.status} | ${check.message} |\n`;
    }

    output += `\n**Overall Status**: ${data.overallStatus}\n`;

    // Show suggestions for failures
    const failures = data.checks.filter((c) => c.status === 'fail' && c.suggestion);
    if (failures.length > 0) {
      output += '\n## Suggested Fixes\n\n';
      for (const check of failures) {
        output += `- **${check.name}**: ${check.suggestion}\n`;
      }
    }

    return output;
  }

  renderError(result: CommandResult<unknown>): string {
    if (!result.error) {
      return '# Error\n\nUnknown error occurred\n';
    }

    let output = '';
    output += `# Error: ${result.error.code}\n\n`;
    output += `${result.error.message}\n`;

    if (result.error.suggestion) {
      output += `\n**Suggestion**: ${result.error.suggestion}\n`;
    }

    return output;
  }

}

/**
 * User Renderer - beautiful Unicode tables and boxes for humans
 */
export class UserRenderer implements Renderer {
  private formatter: OutputFormatter;

  constructor(formatter: OutputFormatter) {
    this.formatter = formatter;
  }

  renderList(result: CommandResult<ListResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    if (data.type === 'list_all') {
      // Header
      output += boxDrawing.createHeaderBox('📚 Available Documentation');
      output += '\n';

      // Show by category
      if (data.categories && data.categories.length > 0) {
        // Pre-calculate max widths across ALL categories for consistent table size
        const maxSlugWidth = Math.max(4, ...data.items.map((i) => i.slug.length));
        const maxTitleWidth = Math.max(5, ...data.items.map((i) => i.title.length));
        const sectionsWidth = 8;

        // Calculate total table width: columns + separators + borders
        // Each column has: width + 2 spaces padding
        // Separators: 3 vertical bars (│)
        // Total: (col1 + 2) + 1 + (col2 + 2) + 1 + (col3 + 2) = sum(cols) + 6 + 2
        const tableWidth = maxSlugWidth + maxTitleWidth + sectionsWidth + 8;

        for (const category of data.categories) {
          // Category divider (match table width exactly)
          output += this.formatter.info(boxDrawing.createDivider(category.name, tableWidth));
          output += '\n\n';

          // Build table data with fixed widths
          const headers = [
            this.formatter.bold('Slug'.padEnd(maxSlugWidth)),
            this.formatter.bold('Title'.padEnd(maxTitleWidth)),
            this.formatter.bold('Sections')
          ];
          const rows = category.docs.map((item) => [
            this.formatter.cyan(item.slug.padEnd(maxSlugWidth)),
            item.title.padEnd(maxTitleWidth),
            this.formatter.dim(boxDrawing.rightAlign(String(item.sectionCount ?? 'N/A'), 8)),
          ]);

          output += boxDrawing.createTable(headers, rows, 'light');
          output += '\n';
        }
      }

      output += this.formatter.bold(`Total: ${data.totalCount} documents`) + '\n\n';

      // Info box with tips
      const tips = [
        '',
        this.formatter.success('  ▸') + ' Get a document:       ' + this.formatter.cyan('claude-docs get overview'),
        this.formatter.success('  ▸') + ' Get specific section: ' + this.formatter.cyan('claude-docs get settings#hooks'),
        this.formatter.success('  ▸') + ' List sections:        ' + this.formatter.cyan('claude-docs list quickstart'),
        '',
        this.formatter.warning('  💡') + ' Related topics have multiple docs:',
        '      • plugins → plugins-reference, plugin-marketplaces',
        '      • hooks → hooks, hooks-guide',
        '      • settings → model-config, terminal-config, statusline',
        '',
      ];

      output += boxDrawing.createInfoBox(tips);

    } else {
      // Section list
      const docName = data.items[0]?.slug ?? 'Document';
      output += boxDrawing.createHeaderBox(`📖 ${docName} - Table of Contents`);
      output += '\n';

      const headers = [this.formatter.bold('Level'), this.formatter.bold('Section')];
      const rows = data.items.map((item) => {
        const indent = '  '.repeat((item.level ?? 1) - 1);
        const level = this.formatter.dim('#'.repeat(item.level ?? 1));
        return [level, indent + item.title];
      });

      output += boxDrawing.createTable(headers, rows, 'light');
      output += '\n';

      output += this.formatter.bold(`Total: ${data.totalCount} sections`) + '\n\n';

      // Info box
      const tips = [
        '',
        '  To read any section, use:',
        '',
        this.formatter.success('  ▸') + ' ' + this.formatter.cyan(`claude-docs get ${docName}#section-name`),
        '',
        this.formatter.warning('  💡') + ' Tip: Anchor slugs are lowercase with hyphens',
        '',
      ];

      output += boxDrawing.createInfoBox(tips, 60);
    }

    return output;
  }

  renderGet(result: CommandResult<GetResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data, metadata } = result;
    // boxDrawing already imported at top
    let output = '';

    // Header
    output += boxDrawing.createHeaderBox(`📖 ${data.title}`);
    output += '\n';

    // Content
    output += data.content + '\n\n';

    // Info footer (only if fresh data)
    if (!metadata?.dataAge || metadata.dataAge <= 24) {
      const info = [
        this.formatter.dim(`Source: ${data.source} • Sections: ${data.sectionCount}`)
      ];
      output += boxDrawing.createInfoBox(info, 60);
    } else {
      // Stale warning
      const warning = [
        '',
        this.formatter.warning('⚠️  Documentation may be outdated'),
        '',
        this.formatter.dim(`Last update: ${metadata.dataAge} hours ago`),
        '',
        'To refresh: ' + this.formatter.cyan('claude-docs update'),
        '',
      ];
      output += boxDrawing.createInfoBox(warning, 60);
    }

    return output;
  }

  renderSearch(result: CommandResult<SearchResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    // boxDrawing already imported at top
    let output = '';

    // Header
    output += boxDrawing.createHeaderBox('🔍 Search Results');
    output += '\n';

    output += this.formatter.info(`Query: "${data.query}"`) + '\n\n';

    if (data.totalResults === 0) {
      output += 'No results found.\n\n';
      const tips = [
        '',
        '  Try:',
        '    • Using different keywords',
        '    • Checking spelling',
        '    • Browsing: ' + this.formatter.cyan('claude-docs list'),
        '',
      ];
      output += boxDrawing.createInfoBox(tips, 60);
      return output;
    }

    // Build table (limit to 50)
    const displayResults = data.results.slice(0, 50);

    // Fixed max width for match column to prevent overflow
    const MAX_MATCH_WIDTH = 47; // Leave room for "..."

    const headers = [this.formatter.bold('Document'), this.formatter.bold('Line'), this.formatter.bold('Match')];
    const rows = displayResults.map((match) => {
      // Strip emojis and wide characters from match text for consistent display
      let matchText = match.matchedText
        // Remove emojis and special symbols
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Emoji
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
        .replace(/[✓✔✅✗✘❌⚠⚡]/g, '')           // Common status symbols
        .trim();

      // Truncate to max width
      if (matchText.length > MAX_MATCH_WIDTH) {
        matchText = matchText.substring(0, MAX_MATCH_WIDTH) + '...';
      }
      // Pad to exact width for consistent table
      matchText = matchText.padEnd(MAX_MATCH_WIDTH + 3);

      return [
        this.formatter.cyan(match.slug),
        this.formatter.dim(String(match.lineNumber)),
        matchText,
      ];
    });

    output += boxDrawing.createTable(headers, rows, 'light');
    output += '\n';

    output += this.formatter.bold(`Found: ${data.totalResults} results`);
    if (data.totalResults > 50) {
      output += this.formatter.dim(' (showing first 50)');
    }
    output += '\n\n';

    // Next steps box
    const uniqueDocs = [...new Set(displayResults.map((r) => r.slug))].slice(0, 3);
    const tips = [
      '',
      '  To read any result:',
      '',
      ...uniqueDocs.map((slug) => this.formatter.success('  ▸') + ' ' + this.formatter.cyan(`claude-docs get ${slug}`)),
      '',
      this.formatter.warning('  💡') + ' Add #section to jump to specific content',
      '',
    ];

    output += boxDrawing.createInfoBox(tips, 60);

    return output;
  }

  renderUpdateStatus(result: CommandResult<UpdateStatusResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += this.formatter.info('📊 Documentation Status\n\n');

    if (!data.installed) {
      output += this.formatter.warning('⚠️  Documentation not yet downloaded\n');
      output += this.formatter.info('💡 Run `claude-docs update` to download documentation\n');
      return output;
    }

    output += this.formatter.success('✅ Documentation installed\n');
    output += this.formatter.info(`📅 Last update: ${data.lastUpdate}\n`);
    output += this.formatter.info(`📦 Total docs: ${data.stats.totalDocs}\n`);
    output += this.formatter.info(`💾 Cache size: ${data.stats.cacheSize}\n`);

    if (data.pendingUpdates) {
      output += this.formatter.warning('\n⚠️  Pending updates available\n');
    }

    return output;
  }

  renderCacheInfo(result: CommandResult<CacheInfoResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += this.formatter.info('💾 Cache Information\n\n');

    if (!data.exists) {
      output += this.formatter.warning('⚠️  Cache not yet created\n');
      return output;
    }

    output += this.formatter.info(`📁 Files: ${data.stats.totalFiles}\n`);
    output += this.formatter.info(`💽 Size: ${data.stats.totalSize}\n`);

    return output;
  }

  renderDoctor(result: CommandResult<DoctorResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    // boxDrawing already imported at top
    let output = '';

    // Header
    output += boxDrawing.createHeaderBox('🏥 Health Check');
    output += '\n';

    output += this.formatter.info('Running diagnostics...') + '\n\n';

    // Build table
    const headers = [this.formatter.bold('Check'), this.formatter.bold('Status'), this.formatter.bold('Details')];
    const rows = data.checks.map((check) => {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      const statusColor = check.status === 'pass'
        ? this.formatter.success(icon)
        : check.status === 'warn'
          ? this.formatter.warning(icon)
          : this.formatter.error(icon);

      return [check.name, statusColor, this.formatter.dim(check.message)];
    });

    output += boxDrawing.createTable(headers, rows, 'light');
    output += '\n';

    // Status box
    const statusLines = [
      '',
      data.overallStatus === 'healthy'
        ? this.formatter.success('  ✅ All health checks passed!')
        : data.overallStatus === 'warnings'
          ? this.formatter.warning('  ⚠️  Health check passed with warnings')
          : this.formatter.error('  ❌ Health check failed'),
      '',
      data.overallStatus === 'healthy'
        ? '  Your installation is healthy and ready to use.'
        : data.overallStatus === 'warnings'
          ? '  Warnings are normal for fresh installations.'
          : '  Fix the issues above and run `claude-docs doctor` again',
      '',
    ];

    output += boxDrawing.createInfoBox(statusLines, 60);

    return output;
  }

  renderError(result: CommandResult<unknown>): string {
    if (!result.error) {
      return this.formatter.error('❌ Unknown error\n');
    }

    // boxDrawing already imported at top
    let output = '';

    // Error header
    output += boxDrawing.createHeaderBox('❌ Error');
    output += '\n';

    output += this.formatter.error(result.error.message) + '\n\n';

    // Suggestion box
    if (result.error.suggestion) {
      const suggestions = [
        '',
        this.formatter.info('  💡 ' + result.error.suggestion),
        '',
      ];
      output += boxDrawing.createInfoBox(suggestions, 60);
    }

    return output;
  }
}

/**
 * Factory function to create appropriate renderer
 */
export function createRenderer(mode: OutputMode, formatter?: OutputFormatter): Renderer {
  switch (mode) {
    case 'json':
      return new JSONRenderer();
    case 'ai':
      return new AIRenderer();
    case 'user':
      return new UserRenderer(formatter ?? new OutputFormatter('user'));
  }
}
