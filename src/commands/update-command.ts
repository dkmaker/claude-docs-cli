import { readFile } from 'node:fs/promises';
import { warmCache } from '../lib/cache-manager.js';
import { downloadAllDocuments, getDownloadSummary } from '../lib/doc-downloader.js';
import { ensureDir, fileExists, safeWriteFile } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import type { ResourceConfiguration } from '../types/documentation.js';
import { loadResourceConfig } from '../lib/resource-loader.js';
import type { DownloadProgress } from '../types/documentation.js';
import { DOCS_DIR, LAST_UPDATE_FILE, MISSING_DOCS_FILE } from '../utils/path-resolver.js';
import { detectOutputMode } from '../utils/env.js';

// Initialize output formatter
const formatter = new OutputFormatter(detectOutputMode());

/**
 * Update command - manages documentation downloads and updates
 * Subcommands: check (default), commit, discard, status
 */

/**
 * Initialize documentation directories
 */
async function initializeDirectories(): Promise<void> {
  const { CACHE_DIR, LOGS_DIR } = await import('../utils/path-resolver.js');
  await ensureDir(DOCS_DIR);
  await ensureDir(CACHE_DIR);
  await ensureDir(LOGS_DIR);
}

/**
 * Record last update timestamp
 */
async function recordUpdateTimestamp(): Promise<void> {
  await safeWriteFile(LAST_UPDATE_FILE, Date.now().toString());
}

/**
 * Record missing documents
 *
 * @param failedFiles - List of filenames that failed to download
 */
async function recordMissingDocs(failedFiles: string[]): Promise<void> {
  if (failedFiles.length > 0) {
    await safeWriteFile(MISSING_DOCS_FILE, failedFiles.join('\n'));
  }
}

/**
 * Check if this is a first-time download (no docs directory or empty)
 */
async function isFirstTimeDownload(): Promise<boolean> {
  // Check if docs directory exists and has files
  if (!(await fileExists(DOCS_DIR))) {
    return true;
  }

  // Directory exists, but might be empty
  // For simplicity, check if .last-update file exists
  return !(await fileExists(LAST_UPDATE_FILE));
}

/**
 * Update check command (default) - downloads or checks for updates
 *
 * On first run: Downloads all documentation
 * On subsequent runs: Checks for updates (to be implemented in Phase 6)
 */
export async function updateCheckCommand(): Promise<void> {
  try {
    const isFirstTime = await isFirstTimeDownload();

    if (isFirstTime) {
      console.log(formatter.info('📥 First-time setup detected'));
      console.log(formatter.info('📦 Initializing documentation directories...\n'));

      // Initialize directories
      await initializeDirectories();

      console.log(formatter.info('🔄 Loading documentation configuration...'));
      const config = await loadResourceConfig();

      const totalSections = config.categories.reduce((sum, cat) => sum + cat.docs.length, 0);
      console.log(formatter.info(`📋 Found ${totalSections} documentation sections\n`));

      console.log(formatter.info('⬇️  Downloading documentation files...'));
      console.log(formatter.info('This may take a few minutes...\n'));

      let lastProgress = 0;

      const results = await downloadAllDocuments(config, {
        concurrency: 5,
        maxRetries: 3,
        onProgress: (progress: DownloadProgress) => {
          if (progress.current) {
            console.log(formatter.info(`   Downloading: ${progress.current}`));
          } else if (progress.completed > lastProgress) {
            console.log(
              formatter.info(`   Progress: ${progress.completed}/${progress.total} (${progress.failed} failed)`),
            );
            lastProgress = progress.completed;
          }
        },
      });

      const summary = getDownloadSummary(results);

      console.log('\n' + formatter.success('✅ Download complete!\n'));
      console.log(formatter.info('📊 Summary:'));
      console.log(formatter.info(`   Total sections: ${summary.total}`));
      console.log(formatter.info(`   Downloaded: ${summary.successful}`));
      console.log(formatter.info(`   Failed: ${summary.failed}`));

      if (summary.failed > 0) {
        console.log('\n' + formatter.warning('⚠️  Failed downloads:'));
        for (const file of summary.failedFiles) {
          console.log(formatter.info(`   - ${file}`));
        }
      }

      // Record results
      await recordUpdateTimestamp();
      if (summary.failedFiles.length > 0) {
        await recordMissingDocs(summary.failedFiles);
      }

      // Warm cache for fast access
      console.log('\n' + formatter.info('🔥 Warming cache for fast access...'));
      await warmCacheAfterUpdate(config);

      console.log('\n' + formatter.info('💡 You can now use `claude-docs get <section>` to retrieve documentation'));
      console.log(formatter.info('💡 Use `claude-docs search <query>` to search documentation'));
    } else {
      console.log(formatter.info('🔍 Checking for documentation updates...'));
      console.log('\n' + formatter.warning('⚠️  Update check not yet implemented (coming in Phase 6)'));
      console.log(formatter.info('💡 For now, use `update check` to re-download all documentation'));
    }
  } catch (error) {
    console.error('\n' + formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * Update commit command - apply pending updates (to be implemented in Phase 7)
 */
export async function updateCommitCommand(message: string): Promise<void> {
  console.log(formatter.warning('⚠️  Update commit not yet implemented (coming in Phase 7)'));
  console.log(formatter.info(`Message provided: ${message}`));
  process.exit(0);
}

/**
 * Update discard command - discard pending updates (to be implemented in Phase 8)
 */
export async function updateDiscardCommand(): Promise<void> {
  console.log(formatter.warning('⚠️  Update discard not yet implemented (coming in Phase 8)'));
  process.exit(0);
}

/**
 * Update status command - show update status and history (to be implemented in Phase 9)
 */
export async function updateStatusCommand(): Promise<void> {
  try {
    console.log(formatter.info('📊 Documentation Status\n'));

    // Check if docs are installed
    const isInstalled = !(await isFirstTimeDownload());

    if (!isInstalled) {
      console.log(formatter.warning('⚠️  Documentation not yet downloaded'));
      console.log(formatter.info('💡 Run `claude-docs update` to download documentation'));
      return;
    }

    // Show last update time
    if (await fileExists(LAST_UPDATE_FILE)) {
      const timestamp = await readFile(LAST_UPDATE_FILE, 'utf-8');
      const lastUpdate = new Date(Number.parseInt(timestamp, 10));
      const timeAgo = getTimeAgo(lastUpdate);

      console.log(formatter.success('✅ Documentation installed'));
      console.log(formatter.info(`📅 Last updated: ${lastUpdate.toLocaleString()} (${timeAgo})`));
    }

    // Show missing docs if any
    if (await fileExists(MISSING_DOCS_FILE)) {
      const missing = await readFile(MISSING_DOCS_FILE, 'utf-8');
      const missingFiles = missing.split('\n').filter((f) => f.trim());

      if (missingFiles.length > 0) {
        console.log('\n' + formatter.warning(`⚠️  ${missingFiles.length} sections failed to download:`));
        for (const file of missingFiles.slice(0, 5)) {
          console.log(formatter.info(`   - ${file}`));
        }
        if (missingFiles.length > 5) {
          console.log(formatter.info(`   ... and ${missingFiles.length - 5} more`));
        }
        console.log('\n' + formatter.info('💡 Run `claude-docs update` to retry downloads'));
      }
    }

    console.log('\n' + formatter.info('💡 Full status display coming in Phase 9'));
  } catch (error) {
    console.error('\n' + formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

/**
 * Warm cache after successful update
 * Pre-generates cache for all downloaded documents AND list/TOC outputs
 */
async function warmCacheAfterUpdate(config: ResourceConfiguration): Promise<void> {
  // Build list of all filenames and URLs
  const filenames: string[] = [];
  const sourceUrls: Record<string, string> = {};

  for (const category of config.categories) {
    for (const doc of category.docs) {
      filenames.push(doc.filename);
      sourceUrls[doc.filename] = doc.url;
    }
  }

  let processed = 0;
  for (const filename of filenames) {
    try {
      await warmCache([filename], sourceUrls);
      processed++;
      if (processed % 10 === 0) {
        console.log(formatter.info(`   Cached: ${processed}/${filenames.length} documents`));
      }
    } catch {
      // Skip files that fail to cache
    }
  }

  console.log(formatter.success(`✅ Documents cached: ${processed}/${filenames.length}`));

  // Also pre-generate list cache
  console.log(formatter.info('   Pre-generating list and index caches...'));
  try {
    // Import list command generator
    const listModule = await import('./list-command.js');

    // Temporarily suppress console output
    const originalLog = console.log;
    const originalError = console.error;
    console.log = () => {};
    console.error = () => {};

    try {
      // Generate and cache the main index
      await listModule.listCommand();
    } finally {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
    }
  } catch {
    // Non-critical if list caching fails
  }

  console.log(formatter.success('✅ All caches ready'));
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 604800)} weeks ago`;
}
