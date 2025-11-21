import { getCachedDocument, readCache, writeCache } from '../lib/cache-manager.js';
import { fileExists } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { loadResourceConfig } from '../lib/resource-loader.js';
import { detectOutputMode } from '../utils/env.js';
import { getDocPath } from '../utils/path-resolver.js';

/**
 * List command - list available documentation
 * Implements caching for fast repeated access
 */

/**
 * Generate cache key for list output
 * __index__ for full list, {slug}__toc__ for document TOC
 */
function getListCacheKey(docSlug?: string): string {
  return docSlug ? `${docSlug}__toc__` : '__index__';
}

/**
 * List all available documentation
 * Uses cache to avoid regenerating on every call
 */
export async function listCommand(docSlug?: string): Promise<void> {
  // Initialize formatter for error messages
  const formatter = new OutputFormatter(detectOutputMode());

  try {
    // T108: Show 24-hour update reminder
    const { checkUpdateReminder } = await import('./update-command.js');
    await checkUpdateReminder();

    // Try cache first
    const cacheKey = getListCacheKey(docSlug);
    const cached = await readCache(cacheKey);

    if (cached) {
      console.log(cached);
      return;
    }

    // Cache miss - generate output
    const config = await loadResourceConfig();
    let output: string;

    if (docSlug) {
      output = await generateDocumentSectionsList(docSlug, config);
    } else {
      output = await generateFullDocumentationList(config);
    }

    // Cache the output
    await writeCache(cacheKey, output, 'list-command');

    // Display output
    console.log(output);
  } catch (error) {
    console.error(
      `\n${formatter.error(`Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Generate full documentation list in table format
 * Matches the bash script output format
 */
async function generateFullDocumentationList(
  config: Awaited<ReturnType<typeof loadResourceConfig>>,
): Promise<string> {
  const lines: string[] = [];
  const { stat } = await import('node:fs/promises');

  lines.push('# Documentation List');
  lines.push('');
  lines.push('Below is a list of all available documentation');
  lines.push('');
  lines.push('**To see the structure of a specific document, run:** `claude-docs list <slug>`');
  lines.push('');
  lines.push('**To read a document with replaced links, run:** `claude-docs get <slug>`');
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const category of config.categories) {
    lines.push(`## ${category.name}`);
    lines.push('');
    lines.push('| Slug | Title | Description | Last updated |');
    lines.push('|------|-------|-------------|--------------|');

    for (const doc of category.docs) {
      const slug = doc.filename.replace('.md', '');
      const filePath = getDocPath(doc.filename);

      // Get file stats for last updated time
      let lastUpdated = 'Not downloaded';
      try {
        if (await fileExists(filePath)) {
          const stats = await stat(filePath);
          const date = new Date(stats.mtimeMs);
          lastUpdated = date
            .toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
            .replace(',', '');
        }
      } catch {
        // Keep default
      }

      lines.push(`| ${slug} | ${doc.title} | ${doc.description} | ${lastUpdated} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate document sections list (TOC)
 * Matches bash script format: bullet list with inline commands
 */
async function generateDocumentSectionsList(
  slugOrFilename: string,
  config: Awaited<ReturnType<typeof loadResourceConfig>>,
): Promise<string> {
  const lines: string[] = [];

  // Find document
  let doc = null;

  for (const category of config.categories) {
    for (const d of category.docs) {
      if (
        d.filename === slugOrFilename ||
        d.filename === `${slugOrFilename}.md` ||
        d.url.endsWith(`/${slugOrFilename}`)
      ) {
        doc = d;
        break;
      }
    }
    if (doc) break;
  }

  if (!doc) {
    throw new Error(
      `Document not found: ${slugOrFilename}\n💡 Use \`claude-docs list\` to see all available documents`,
    );
  }

  // Get document content
  const content = await getCachedDocument(doc.filename, doc.url);
  const contentLines = content.split('\n');

  // Get first heading for title
  const firstHeading = contentLines.find((line) => line.match(/^# /));
  const title = firstHeading ? firstHeading.replace(/^# /, '') : doc.title;

  const slug = doc.filename.replace('.md', '');

  lines.push(`# Index of ${title} (${slug})`);
  lines.push('');

  let isFirstHeading = true;

  for (const line of contentLines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match?.[1] && match[2]) {
      const level = match[1].length;
      const heading = match[2].trim();

      // Skip the first heading (document title)
      if (isFirstHeading && level === 1) {
        isFirstHeading = false;
        continue;
      }

      // Generate slug for anchor
      const anchorSlug = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Calculate indentation (2 spaces per level, starting from level 2 as base)
      const indentCount = (level - 2) * 2;
      const indent = indentCount > 0 ? ' '.repeat(indentCount) : '';

      // Output TOC line with CLI command syntax (bash format)
      lines.push(`${indent}- ${heading} - Read with \`claude-docs get ${slug}#${anchorSlug}\``);
    }
  }

  return lines.join('\n');
}
