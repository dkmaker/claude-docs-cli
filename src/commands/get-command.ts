import { readdir } from 'node:fs/promises';
import { getCachedDocument } from '../lib/cache-manager.js';
import { fileExists } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { createRenderer } from '../lib/renderer.js';
import type { CommandResult, GetResult } from '../types/command-results.js';
import { detectOutputMode } from '../utils/env.js';
import { CHANGELOG_FILE, DOCS_DIR, getDocPath } from '../utils/path-resolver.js';

/**
 * Find document filename by slug
 * Directly checks filesystem instead of loading resource config
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

    const headingText = line.replace(/^#+\s*/, '').trim();
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
  const sectionEnd = nextHeadingIndex || lines.length;
  const sectionLines = lines.slice(targetIndex, sectionEnd);

  return sectionLines.join('\n').trim();
}

/**
 * Calculate data age in hours
 */
async function calculateDataAge(): Promise<number> {
  try {
    const { stat } = await import('node:fs/promises');

    if (await fileExists(CHANGELOG_FILE)) {
      const stats = await stat(CHANGELOG_FILE);
      const ageMs = Date.now() - stats.mtimeMs;
      return Math.floor(ageMs / (1000 * 60 * 60)); // Convert to hours
    }
  } catch {
    // Ignore errors
  }

  return 0; // Unknown
}

/**
 * Get last update timestamp
 */
async function getLastUpdateTime(): Promise<string | undefined> {
  try {
    const { stat } = await import('node:fs/promises');

    if (await fileExists(CHANGELOG_FILE)) {
      const stats = await stat(CHANGELOG_FILE);
      return new Date(stats.mtimeMs).toISOString();
    }
  } catch {
    // Ignore errors
  }

  return undefined;
}

/**
 * Get documentation section
 * Returns structured JSON data, rendered based on output mode
 */
export async function getCommand(slugWithAnchor: string): Promise<void> {
  const mode = detectOutputMode();
  const formatter = new OutputFormatter(mode === 'ai' || mode === 'json' ? 'ai' : 'user');
  const renderer = createRenderer(
    mode === 'json' ? 'json' : mode === 'ai' ? 'ai' : 'user',
    formatter,
  );

  try {
    // T108: Show 24-hour update reminder
    const { checkUpdateReminder } = await import('./update-command.js');
    await checkUpdateReminder();

    // Parse slug and anchor
    const [slug, anchor] = slugWithAnchor.split('#');

    // Find document file
    const filename = await findDocumentFile(slug || '');

    if (!filename) {
      const errorResult: CommandResult<never> = {
        success: false,
        error: {
          code: 'DOC_NOT_FOUND',
          message: `Document not found: ${slug}`,
          suggestion: 'Use `claude-docs list` to see all available documents',
        },
      };
      console.error(renderer.renderError(errorResult));
      process.exit(1);
    }

    // Get cached document content
    const content = await getCachedDocument(filename, `https://code.claude.com/docs/en/${slug}`);

    // Extract section if anchor provided
    let finalContent = content;
    if (anchor) {
      const section = extractSection(content, anchor);
      if (!section) {
        const errorResult: CommandResult<never> = {
          success: false,
          error: {
            code: 'SECTION_NOT_FOUND',
            message: `Section not found: #${anchor}`,
            suggestion: `Use 'claude-docs list ${slug}' to see available sections`,
          },
        };
        console.error(renderer.renderError(errorResult));
        process.exit(1);
      }
      finalContent = section;
    }

    // Count sections in content
    const sectionCount = (finalContent.match(/^#{1,6}\s/gm) || []).length;

    // Get metadata
    const dataAge = await calculateDataAge();
    const lastUpdate = await getLastUpdateTime();

    // Build result
    const result: CommandResult<GetResult> = {
      success: true,
      data: {
        slug: slug || '',
        title: filename.replace('.md', ''),
        content: finalContent,
        anchor,
        source: filename,
        sectionCount,
      },
      metadata: {
        dataAge,
        lastUpdate,
        timestamp: new Date().toISOString(),
      },
    };

    // Render and output
    const output = renderer.renderGet(result);
    console.log(output);
  } catch (error) {
    const errorResult: CommandResult<never> = {
      success: false,
      error: {
        code: 'GET_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
    console.error(renderer.renderError(errorResult));
    process.exit(1);
  }
}
