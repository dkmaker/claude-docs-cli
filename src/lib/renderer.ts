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
 * User Renderer - colorful, emoji-rich output for humans
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

    // Keep existing user-friendly format
    if (data.type === 'list_all') {
      output += this.formatter.info(`📚 Available Documentation (${data.totalCount} sections)\n\n`);
      for (const item of data.items) {
        output += `${item.slug}\n`;
      }
    } else {
      output += this.formatter.info('📑 Sections:\n\n');
      for (const item of data.items) {
        const indent = '  '.repeat((item.level ?? 1) - 1);
        output += `${indent}${item.title}\n`;
      }
    }

    return output;
  }

  renderGet(result: CommandResult<GetResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    // Just return content for user mode (existing behavior)
    return result.data.content;
  }

  renderSearch(result: CommandResult<SearchResult>): string {
    if (!result.success || !result.data) {
      return this.renderError(result);
    }

    const { data } = result;
    let output = '';

    output += this.formatter.info(`Found ${data.totalResults} results for "${data.query}"\n\n`);

    for (const match of data.results) {
      output += this.formatter.success(`📄 ${match.slug} (line ${match.lineNumber})\n`);
      output += `   ${match.matchedText}\n`;
      output += `   Context: ${match.context}\n\n`;
    }

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
    let output = '';

    output += this.formatter.info('🏥 Running Health Checks...\n\n');

    for (const check of data.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
      const color =
        check.status === 'pass'
          ? this.formatter.success.bind(this.formatter)
          : check.status === 'warn'
            ? this.formatter.warning.bind(this.formatter)
            : this.formatter.error.bind(this.formatter);

      output += color(`${icon} ${check.name}\n`);
      output += `   ${check.message}\n\n`;
    }

    output += this.formatter.info('━'.repeat(60) + '\n');

    if (data.overallStatus === 'failed') {
      output += this.formatter.error('\n❌ Health check failed\n');
    } else if (data.overallStatus === 'warnings') {
      output += this.formatter.warning('\n⚠️  Health check passed with warnings\n');
    } else {
      output += this.formatter.success('\n✅ All health checks passed!\n');
    }

    return output;
  }

  renderError(result: CommandResult<unknown>): string {
    if (!result.error) {
      return this.formatter.error('❌ Unknown error\n');
    }

    let output = '';
    output += this.formatter.error(`❌ Error: ${result.error.message}\n`);

    if (result.error.suggestion) {
      output += this.formatter.info(`\n💡 ${result.error.suggestion}\n`);
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
