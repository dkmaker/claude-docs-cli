import { clearCache, getCacheStats, warmCache } from '../lib/cache-manager.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { loadResourceConfig } from '../lib/resource-loader.js';
import { detectOutputMode } from '../utils/env.js';

const formatter = new OutputFormatter(detectOutputMode());

/**
 * Cache command - manage documentation cache
 * Subcommands: clear, info, warm
 */

/**
 * Clear cache command
 */
export async function cacheClearCommand(): Promise<void> {
  try {
    console.log(formatter.info('Clearing documentation cache...'));

    await clearCache();

    console.log(formatter.success('Cache cleared successfully'));
    console.log(formatter.info('Cache will be rebuilt on next document access'));
  } catch (error) {
    console.error(
      `\n${formatter.error(`Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Cache info command
 */
export async function cacheInfoCommand(): Promise<void> {
  try {
    console.log(formatter.heading('Cache Statistics'));

    const stats = await getCacheStats();

    console.log(formatter.info(`Total cached files: ${stats.totalFiles}`));
    console.log(formatter.info(`Total cache size: ${formatBytes(stats.totalSize)}`));

    if (stats.totalFiles === 0) {
      console.log(
        `\n${formatter.info('No cached files. Run `claude-docs cache warm` to pre-generate cache.')}`,
      );
    }
  } catch (error) {
    console.error(
      `\n${formatter.error(`Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Cache warm command
 */
export async function cacheWarmCommand(): Promise<void> {
  try {
    console.log(formatter.info('Warming cache...'));
    console.log(formatter.info('This will pre-generate cache for all documentation files\n'));

    // Load resource configuration
    const config = await loadResourceConfig();

    // Build list of all filenames and URLs
    const filenames: string[] = [];
    const sourceUrls: Record<string, string> = {};

    for (const category of config.categories) {
      for (const doc of category.docs) {
        filenames.push(doc.filename);
        sourceUrls[doc.filename] = doc.url;
      }
    }

    console.log(formatter.info(`Processing ${filenames.length} files...\n`));

    let processed = 0;
    for (const filename of filenames) {
      try {
        // This will cache each file
        await warmCache([filename], sourceUrls);
        processed++;
        if (processed % 10 === 0) {
          console.log(formatter.info(`   Processed: ${processed}/${filenames.length}`));
        }
      } catch {
        // Skip failures
      }
    }

    console.log(`\n${formatter.success('Cache warmed successfully')}`);
    console.log(formatter.info(`   Processed: ${processed}/${filenames.length} files`));

    if (processed < filenames.length) {
      console.log(
        formatter.info(
          `   ${filenames.length - processed} files failed (source files may be missing)`,
        ),
      );
    }
  } catch (error) {
    console.error(
      `\n${formatter.error(`Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}
