import { getCachedDocument, readCache, writeCache } from '../lib/cache-manager.js';
import { fileExists } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { createRenderer } from '../lib/renderer.js';
import { loadResourceConfig } from '../lib/resource-loader.js';
import type {
  CategoryGroup,
  CommandResult,
  ListItem,
  ListResult,
} from '../types/command-results.js';
import { detectOutputMode } from '../utils/env.js';
import { getDocPath } from '../utils/path-resolver.js';

/**
 * Generate cache key for list output
 * __index__ for full list, {slug}__toc__ for document TOC
 */
function getListCacheKey(docSlug?: string): string {
  return docSlug ? `${docSlug}__toc__` : '__index__';
}

/**
 * List command - list available documentation
 * Returns structured JSON data, rendered based on output mode
 */
export async function listCommand(docSlug?: string): Promise<void> {
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

    // Try cache first (store as JSON)
    const cacheKey = getListCacheKey(docSlug);
    const cached = await readCache(cacheKey);

    let result: CommandResult<ListResult>;

    if (cached) {
      // Cache hit - parse JSON
      result = JSON.parse(cached);
    } else {
      // Cache miss - generate data
      const config = await loadResourceConfig();

      if (docSlug) {
        result = await generateDocumentSectionsData(docSlug, config);
      } else {
        result = await generateFullDocumentationData(config);
      }

      // Cache the JSON
      await writeCache(cacheKey, JSON.stringify(result), 'list-command');
    }

    // Render and output
    const output = renderer.renderList(result);
    console.log(output);
  } catch (error) {
    const errorResult: CommandResult<never> = {
      success: false,
      error: {
        code: 'LIST_ERROR',
        message: error instanceof Error ? error.message : String(error),
        suggestion: "Run 'claude-docs list' to see all available documents",
      },
    };

    const output = renderer.renderError(errorResult);
    console.error(output);
    process.exit(1);
  }
}

/**
 * Generate full documentation list data (JSON)
 */
async function generateFullDocumentationData(
  config: Awaited<ReturnType<typeof loadResourceConfig>>,
): Promise<CommandResult<ListResult>> {
  const { stat } = await import('node:fs/promises');
  const items: ListItem[] = [];
  const categories: CategoryGroup[] = [];

  for (const category of config.categories) {
    const categoryDocs: ListItem[] = [];

    for (const doc of category.docs) {
      const slug = doc.filename.replace('.md', '');
      const filePath = getDocPath(doc.filename);

      // Get section count by reading file
      let sectionCount = 0;
      try {
        if (await fileExists(filePath)) {
          const content = await getCachedDocument(doc.filename, doc.url);
          sectionCount = (content.match(/^#{1,6}\s/gm) || []).length;
        }
      } catch {
        // Keep default
      }

      const item: ListItem = {
        slug,
        title: doc.title,
        sectionCount,
        category: category.name,
        description: doc.description,
      };

      items.push(item);
      categoryDocs.push(item);
    }

    categories.push({
      name: category.name,
      docs: categoryDocs,
    });
  }

  // Get data age
  const dataAge = await calculateDataAge();
  const lastUpdate = await getLastUpdateTime();

  return {
    success: true,
    data: {
      type: 'list_all',
      items,
      totalCount: items.length,
      categories,
    },
    metadata: {
      dataAge,
      lastUpdate,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Generate document sections list data (TOC as JSON)
 */
async function generateDocumentSectionsData(
  slugOrFilename: string,
  config: Awaited<ReturnType<typeof loadResourceConfig>>,
): Promise<CommandResult<ListResult>> {
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
    return {
      success: false,
      error: {
        code: 'DOC_NOT_FOUND',
        message: `Document not found: ${slugOrFilename}`,
        suggestion: "Run 'claude-docs list' to see all available documents",
      },
    };
  }

  // Get document content
  const content = await getCachedDocument(doc.filename, doc.url);
  const contentLines = content.split('\n');

  // Extract sections
  const items: ListItem[] = [];
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

      // Generate anchor slug for this heading
      const anchorSlug = heading
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      items.push({
        slug: doc.filename.replace('.md', ''),
        title: heading,
        level,
        anchor: anchorSlug,
      });
    }
  }

  const dataAge = await calculateDataAge();
  const lastUpdate = await getLastUpdateTime();

  return {
    success: true,
    data: {
      type: 'list_sections',
      items,
      totalCount: items.length,
    },
    metadata: {
      dataAge,
      lastUpdate,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Calculate data age in hours since last update
 */
async function calculateDataAge(): Promise<number> {
  try {
    const { CHANGELOG_FILE } = await import('../utils/path-resolver.js');
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
    const { CHANGELOG_FILE } = await import('../utils/path-resolver.js');
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
