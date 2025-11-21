import { readdir } from 'node:fs/promises';
import { getCachedDocument } from '../lib/cache-manager.js';
import { fileExists } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { detectOutputMode } from '../utils/env.js';
import { DOCS_DIR, getDocPath } from '../utils/path-resolver.js';

const formatter = new OutputFormatter(detectOutputMode());

/**
 * Get command - retrieve documentation section
 * Optimized to avoid loading resource config on every call
 */

/**
 * Find document filename by slug
 * Directly checks filesystem instead of loading resource config
 *
 * @param slug - Document slug
 * @returns Filename if found, null otherwise
 */
async function findDocumentFile(slug: string): Promise<string | null> {
  // Try exact match with .md extension
  if (await fileExists(getDocPath(`${slug}.md`))) {
    return `${slug}.md`;
  }

  // Try as-is if it already has .md
  if (slug.endsWith('.md') && (await fileExists(getDocPath(slug)))) {
    return slug;
  }

  // List all available docs to find a match
  try {
    const files = await readdir(DOCS_DIR);
    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const fileSlug = file.replace('.md', '');
      if (fileSlug === slug) {
        return file;
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return null;
}

/**
 * Extract section from document by anchor
 *
 * @param content - Full document content
 * @param anchor - Section anchor (heading text)
 * @returns Section content or null if not found
 */
function extractSection(content: string, anchor: string): string | null {
  const lines = content.split('\n');
  const sectionStart: number[] = [];

  // Find all heading positions
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line?.match(/^#{1,6}\s/)) {
      sectionStart.push(i);
    }
  }

  // Find the target heading
  const targetIndex = lines.findIndex((line) => {
    if (!line || !line.match(/^#{1,6}\s/)) return false;

    // Extract heading text (remove # and trim)
    const headingText = line.replace(/^#+\s*/, '').trim();

    // Convert to slug for comparison
    const headingSlug = headingText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return headingSlug === anchor.toLowerCase();
  });

  if (targetIndex === -1) {
    return null;
  }

  // Find the next heading to determine section end
  const nextHeadingIndex = sectionStart.find((pos) => pos > targetIndex);

  // Extract section content
  const sectionEnd = nextHeadingIndex || lines.length;
  const sectionLines = lines.slice(targetIndex, sectionEnd);

  return sectionLines.join('\n').trim();
}

/**
 * Get documentation section
 *
 * @param slugWithAnchor - Document slug or filename, optionally with #anchor
 *
 * @example
 * ```
 * claude-docs get plugins
 * claude-docs get plugins#creating-plugins
 * claude-docs get plugins.md
 * ```
 */
export async function getCommand(slugWithAnchor: string): Promise<void> {
  try {
    // T108: Show 24-hour update reminder
    const { checkUpdateReminder } = await import('./update-command.js');
    await checkUpdateReminder();

    // Parse slug and anchor
    const [slug, anchor] = slugWithAnchor.split('#');

    // Find document file directly (no need to load resource config)
    const filename = await findDocumentFile(slug || '');

    if (!filename) {
      console.error(formatter.error(`Document not found: ${slug}`));
      console.error(formatter.info('Use `claude-docs list` to see all available documents'));
      process.exit(1);
    }

    // Get cached document content
    // Use a placeholder URL since we don't need it for caching
    const content = await getCachedDocument(filename, `https://code.claude.com/docs/en/${slug}`);

    // Extract section if anchor provided
    let output = content;
    if (anchor) {
      const section = extractSection(content, anchor);
      if (!section) {
        console.error(formatter.error(`Section not found: #${anchor}`));
        console.error(formatter.info(`Available sections in ${filename}:`));

        // List available sections
        const lines = content.split('\n');
        const sections: string[] = [];
        for (const line of lines) {
          if (line.match(/^#{1,6}\s/)) {
            const headingText = line.replace(/^#+\s*/, '').trim();
            const headingSlug = headingText
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '');
            sections.push(`${headingText} (#${headingSlug})`);
          }
        }
        console.error(formatter.list(sections));

        process.exit(1);
      }
      output = section;
    }

    // Output content (this will be piped or displayed)
    console.log(output);
  } catch (error) {
    console.error(
      formatter.error(`Error: ${error instanceof Error ? error.message : String(error)}`),
    );
    process.exit(1);
  }
}
