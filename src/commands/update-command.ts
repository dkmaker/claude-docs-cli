import { readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { warmCache } from '../lib/cache-manager.js';
import { compareDocuments, generateDiff } from '../lib/doc-differ.js';
import {
  downloadAllDocuments,
  downloadDocument,
  getDownloadSummary,
} from '../lib/doc-downloader.js';
import { ensureDir, fileExists, safeReadFile, safeWriteFile } from '../lib/file-ops.js';
import { OutputFormatter } from '../lib/output-formatter.js';
import { loadResourceConfig } from '../lib/resource-loader.js';
import type {
  DocumentSection,
  DownloadResult,
  ResourceConfiguration,
} from '../types/documentation.js';
import type { DownloadProgress } from '../types/documentation.js';
import { detectOutputMode } from '../utils/env.js';
import {
  CHANGELOG_FILE,
  DOCS_DIR,
  LAST_UPDATE_FILE,
  MISSING_DOCS_FILE,
  PENDING_DIFFS_DIR,
  PENDING_DIR,
  PENDING_DOWNLOADS_DIR,
  getDocPath,
  getPendingDiffPath,
  getPendingDownloadPath,
} from '../utils/path-resolver.js';

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
 * On subsequent runs: Checks for updates and stages them in .pending/
 */
export async function updateCheckCommand(): Promise<void> {
  try {
    const isFirstTime = await isFirstTimeDownload();

    if (isFirstTime) {
      await performFirstTimeDownload();
    } else {
      await performUpdateCheck();
    }
  } catch (error) {
    console.error(
      `\n${formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Perform first-time documentation download
 */
async function performFirstTimeDownload(): Promise<void> {
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
          formatter.info(
            `   Progress: ${progress.completed}/${progress.total} (${progress.failed} failed)`,
          ),
        );
        lastProgress = progress.completed;
      }
    },
  });

  const summary = getDownloadSummary(results);

  console.log(`\n${formatter.success('✅ Download complete!\n')}`);
  console.log(formatter.info('📊 Summary:'));
  console.log(formatter.info(`   Total sections: ${summary.total}`));
  console.log(formatter.info(`   Downloaded: ${summary.successful}`));
  console.log(formatter.info(`   Failed: ${summary.failed}`));

  if (summary.failed > 0) {
    console.log(`\n${formatter.warning('⚠️  Failed downloads:')}`);
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
  console.log(`\n${formatter.info('🔥 Warming cache for fast access...')}`);
  await warmCacheAfterUpdate(config);

  console.log(
    `\n${formatter.info('💡 You can now use `claude-docs get <section>` to retrieve documentation')}`,
  );
  console.log(formatter.info('💡 Use `claude-docs search <query>` to search documentation'));
}

/**
 * Perform update check - download to staging and show diffs
 * Implements T064-T071
 */
async function performUpdateCheck(): Promise<void> {
  console.log(formatter.info('🔍 Checking for documentation updates...\n'));

  // Check if pending update already exists
  if (await fileExists(PENDING_DIR)) {
    console.log(formatter.warning('⚠️  Pending update already exists'));

    try {
      const timestamp = await safeReadFile(join(PENDING_DIR, 'timestamp'));
      const date = new Date(timestamp);
      console.log(formatter.info(`   From: ${date.toLocaleString()}`));
    } catch {
      console.log(formatter.info('   From: Unknown time'));
    }

    console.log(`\n${formatter.info('Overwriting with new update check...\n')}`);
    await rm(PENDING_DIR, { recursive: true, force: true });
  }

  // T065: Create pending directory structure
  await ensureDir(PENDING_DOWNLOADS_DIR);
  await ensureDir(PENDING_DIFFS_DIR);
  await safeWriteFile(join(PENDING_DIR, 'timestamp'), new Date().toISOString());

  // Load configuration
  console.log(formatter.info('📋 Loading documentation configuration...'));
  const config = await loadResourceConfig();

  const allDocs: DocumentSection[] = [];
  for (const category of config.categories) {
    allDocs.push(...category.docs);
  }

  const total = allDocs.length;
  console.log(formatter.info(`📦 Checking ${total} documentation sections\n`));

  // T066: Download remote docs to .pending/downloads/
  const newFiles: string[] = [];
  const changedFiles: string[] = [];
  const unchangedFiles: string[] = [];
  const failedFiles: string[] = [];
  let processed = 0;

  for (const doc of allDocs) {
    const currentPath = getDocPath(doc.filename);
    const pendingPath = getPendingDownloadPath(doc.filename);

    processed++;
    if (processed % 5 === 0 || processed === total) {
      console.log(formatter.info(`   Progress: ${processed}/${total}`));
    }

    // Download new version directly to pending location
    // We'll use http-client directly instead of downloadDocument to control destination
    try {
      const { downloadFile } = await import('../utils/http-client.js');
      const { transformMarkdown } = await import('../lib/markdown-transformer.js');

      const mdUrl = `${doc.url}.md`;
      const downloadResult = await downloadFile(mdUrl, { maxRetries: 3, timeout: 30000 });

      if (!downloadResult.success || !downloadResult.content) {
        failedFiles.push(doc.filename);
        continue;
      }

      // Transform and save to pending
      const transformed = transformMarkdown(downloadResult.content);
      await safeWriteFile(pendingPath, transformed);

      // Compare with existing file (if it exists)
      const currentExists = await fileExists(currentPath);

      if (currentExists) {
        const existingContent = await safeReadFile(currentPath);

        if (compareDocuments(existingContent, transformed)) {
          // T067: Generate diff for changed file
          const diff = generateDiff(doc.filename, existingContent, transformed);
          const diffPath = getPendingDiffPath(doc.filename.replace('.md', ''));
          await safeWriteFile(diffPath, diff.diff);
          changedFiles.push(doc.filename);
        } else {
          // No changes
          unchangedFiles.push(doc.filename);
          // Remove from pending since no changes
          await rm(pendingPath, { force: true });
        }
      } else {
        // New file
        newFiles.push(doc.filename);
        const diffPath = getPendingDiffPath(doc.filename.replace('.md', ''));
        await safeWriteFile(diffPath, 'NEW FILE');
      }
    } catch (error) {
      failedFiles.push(doc.filename);
      console.error(formatter.error(`   Failed to process ${doc.filename}: ${error}`));
    }
  }

  // T068: Create summary lists
  if (newFiles.length > 0) {
    await safeWriteFile(join(PENDING_DIR, 'new.list'), newFiles.join('\n'));
  }
  if (changedFiles.length > 0) {
    await safeWriteFile(join(PENDING_DIR, 'changed.list'), changedFiles.join('\n'));
  }
  if (unchangedFiles.length > 0) {
    await safeWriteFile(join(PENDING_DIR, 'unchanged.list'), unchangedFiles.join('\n'));
  }
  if (failedFiles.length > 0) {
    await safeWriteFile(join(PENDING_DIR, 'failed.list'), failedFiles.join('\n'));
  }

  // T069: Generate update summary
  const summaryText = generateUpdateSummary(newFiles, changedFiles, unchangedFiles, failedFiles);
  await safeWriteFile(join(PENDING_DIR, 'summary.txt'), summaryText);

  // Update missing docs file
  if (failedFiles.length > 0) {
    await recordMissingDocs(failedFiles);
  }

  // T070 & T071: Display results
  console.log(`\n${formatter.info('='.repeat(60))}`);
  console.log(summaryText);
  console.log(formatter.info('='.repeat(60)));

  // Check if any changes detected
  const totalChanges = newFiles.length + changedFiles.length;

  if (totalChanges === 0) {
    console.log(`\n${formatter.success('✅ All documentation is up to date!')}`);
    await rm(PENDING_DIR, { recursive: true, force: true });
    await recordUpdateTimestamp();
    return;
  }

  // Show diffs for changed files
  console.log(`\n${formatter.info('=== CHANGES DETECTED ===\n')}`);

  if (changedFiles.length > 0) {
    for (const filename of changedFiles.slice(0, 3)) {
      const slug = filename.replace('.md', '');
      const diffPath = getPendingDiffPath(slug);

      try {
        const diffContent = await safeReadFile(diffPath);
        console.log(formatter.info(`--- Changes in: ${slug} ---`));
        console.log(diffContent);
        console.log('');
      } catch {
        // Skip if diff file missing
      }
    }

    if (changedFiles.length > 3) {
      console.log(formatter.info(`... and ${changedFiles.length - 3} more changed file(s)\n`));
    }
  }

  if (newFiles.length > 0) {
    console.log(formatter.info('=== NEW FILES ===\n'));
    for (const filename of newFiles) {
      console.log(formatter.info(`  + ${filename.replace('.md', '')}`));
    }
    console.log('');
  }

  // T071: Instructions for commit/discard
  console.log(formatter.info('=== NEXT STEPS ===\n'));
  console.log(formatter.info('Review the changes above and decide:\n'));
  console.log(formatter.success('TO APPLY these changes:'));
  console.log(formatter.info('  claude-docs update commit "<descriptive changelog message>"\n'));
  console.log(
    formatter.info(
      '  Example: claude-docs update commit "Updated MCP server list with new integrations"\n',
    ),
  );
  console.log(formatter.info('The changelog message should:'));
  console.log(formatter.info('  - Describe what changed and why (10-1000 characters)'));
  console.log(formatter.info('  - Be specific and descriptive\n'));
  console.log(formatter.error('TO DISCARD these changes:'));
  console.log(formatter.info('  claude-docs update discard\n'));
  console.log(formatter.warning(`⚠️  Changes are staged in ${PENDING_DIR} but NOT applied yet`));
}

/**
 * Generate update summary text
 */
function generateUpdateSummary(
  newFiles: string[],
  changedFiles: string[],
  unchangedFiles: string[],
  failedFiles: string[],
): string {
  const lines: string[] = [];

  lines.push('=== UPDATE SUMMARY ===');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push('');

  if (changedFiles.length > 0) {
    lines.push(`CHANGED: ${changedFiles.length} section(s)`);
    for (const file of changedFiles) {
      lines.push(`  ~ ${file.replace('.md', '')}`);
    }
    lines.push('');
  }

  if (newFiles.length > 0) {
    lines.push(`NEW: ${newFiles.length} section(s)`);
    for (const file of newFiles) {
      lines.push(`  + ${file.replace('.md', '')}`);
    }
    lines.push('');
  }

  if (failedFiles.length > 0) {
    lines.push(`FAILED: ${failedFiles.length} section(s)`);
    for (const file of failedFiles) {
      lines.push(`  ✗ ${file.replace('.md', '')} (download failed)`);
    }
    lines.push('');
  }

  lines.push(`UNCHANGED: ${unchangedFiles.length} section(s)`);

  return lines.join('\n');
}

/**
 * Update commit command - apply pending updates
 * Implements T081-T090
 */
export async function updateCommitCommand(message: string): Promise<void> {
  try {
    // T082: Validate pending directory exists
    if (!(await fileExists(PENDING_DIR))) {
      console.error(formatter.error('❌ No pending update found'));
      console.log(formatter.info('\n💡 Run `claude-docs update` first to check for changes'));
      process.exit(1);
    }

    // T083: Validate changelog message
    const { validateChangelogMessage, addChangelogEntry } = await import(
      '../lib/changelog-manager.js'
    );

    try {
      validateChangelogMessage(message);
    } catch (error) {
      console.error(
        formatter.error(
          `❌ Invalid changelog message: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      console.log(formatter.info('\n💡 The message should be descriptive (10-1000 chars)'));
      process.exit(1);
    }

    // Load summary to show what will be applied
    const summaryPath = join(PENDING_DIR, 'summary.txt');
    if (await fileExists(summaryPath)) {
      const summary = await safeReadFile(summaryPath);
      console.log(`\n${formatter.info('=== APPLYING CHANGES ===\n')}`);
      console.log(summary);
      console.log('');
    }

    console.log(formatter.info('📝 Applying updates...\n'));

    // T084: Copy files from .pending/downloads/ to docs/
    let appliedCount = 0;

    if (await fileExists(PENDING_DOWNLOADS_DIR)) {
      const pendingFiles = await readdir(PENDING_DOWNLOADS_DIR);

      for (const filename of pendingFiles) {
        if (!filename.endsWith('.md')) continue;

        const pendingFile = join(PENDING_DOWNLOADS_DIR, filename);
        const targetFile = getDocPath(filename);

        try {
          const content = await safeReadFile(pendingFile);
          await safeWriteFile(targetFile, content);
          console.log(formatter.success(`   ✓ Applied: ${filename.replace('.md', '')}`));
          appliedCount++;
        } catch (error) {
          console.error(formatter.error(`   ✗ Failed: ${filename} - ${error}`));
        }
      }
    }

    // Collect updated file list for changelog
    const updatedFiles: string[] = [];
    for (const listFile of ['new.list', 'changed.list']) {
      const listPath = join(PENDING_DIR, listFile);
      if (await fileExists(listPath)) {
        const content = await safeReadFile(listPath);
        const files = content.split('\n').filter((f) => f.trim());
        updatedFiles.push(...files);
      }
    }

    // T085: Generate and append changelog entry
    console.log(`\n${formatter.info('📋 Updating changelog...')}`);
    try {
      await addChangelogEntry(message, updatedFiles);
      console.log(formatter.success(`   ✓ Changelog updated: ${CHANGELOG_FILE}`));
    } catch (error) {
      console.error(formatter.warning(`   ⚠️  Failed to update changelog: ${error}`));
    }

    // T086: Clear cache directory
    console.log(`\n${formatter.info('🗑️  Clearing cache (files changed)...')}`);
    const { clearCache } = await import('../lib/cache-manager.js');
    try {
      await clearCache();
      console.log(formatter.success('   ✓ Cache cleared'));
    } catch (error) {
      console.error(formatter.warning(`   ⚠️  Failed to clear cache: ${error}`));
    }

    // T087: Remove .pending directory
    console.log(formatter.info('🧹 Removing staging directory...'));
    await rm(PENDING_DIR, { recursive: true, force: true });
    console.log(formatter.success('   ✓ Staging area cleaned'));

    // T088: Update .last-update timestamp
    await recordUpdateTimestamp();

    // T089: Display success message
    console.log(`\n${formatter.success(`✅ Update applied: ${appliedCount} section(s)`)}`);
    console.log(formatter.info(`📋 Changelog: ${CHANGELOG_FILE}`));

    // T090: Trigger cache warm
    console.log(`\n${formatter.info('🔥 Warming cache...')}`);
    const config = await loadResourceConfig();
    await warmCacheAfterUpdate(config);

    console.log(`\n${formatter.success('✅ All done!')}`);
  } catch (error) {
    console.error(
      `\n${formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Update discard command - discard pending updates
 * Implements T094-T098
 */
export async function updateDiscardCommand(): Promise<void> {
  try {
    // T095: Check if .pending directory exists
    if (!(await fileExists(PENDING_DIR))) {
      console.log(formatter.info('ℹ️  No pending update to discard'));
      return;
    }

    // T096: Display summary of pending changes before discard
    const summaryPath = join(PENDING_DIR, 'summary.txt');

    if (await fileExists(summaryPath)) {
      console.log(`\n${formatter.info('=== PENDING CHANGES (TO BE DISCARDED) ===\n')}`);
      const summary = await safeReadFile(summaryPath);
      console.log(summary);
      console.log('');
    } else {
      try {
        const timestamp = await safeReadFile(join(PENDING_DIR, 'timestamp'));
        console.log(formatter.info(`\nPending update from: ${timestamp}\n`));
      } catch {
        console.log(formatter.info('\nPending update found\n'));
      }
    }

    // T097: Remove .pending directory
    console.log(formatter.info('🗑️  Discarding pending changes...'));
    await rm(PENDING_DIR, { recursive: true, force: true });

    // T098: Display confirmation message
    console.log(formatter.success('✅ Pending update discarded'));
    console.log(formatter.info('\n💡 Your local documentation remains unchanged'));
  } catch (error) {
    console.error(
      `\n${formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Update status command - show update status and history
 * Implements T102-T109
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

    console.log(formatter.success('✅ Documentation installed\n'));

    // T103 & T104 & T106: Read .last-update and calculate time elapsed
    if (await fileExists(LAST_UPDATE_FILE)) {
      const timestamp = await readFile(LAST_UPDATE_FILE, 'utf-8');
      const lastUpdate = new Date(Number.parseInt(timestamp, 10));
      const now = new Date();

      const secondsAgo = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      const hoursAgo = Math.floor(secondsAgo / 3600);
      const daysAgo = Math.floor(hoursAgo / 24);

      console.log(formatter.info('📅 Last Update:'));
      console.log(formatter.info(`   Time: ${lastUpdate.toLocaleString()}`));

      if (daysAgo > 0) {
        console.log(formatter.info(`   Age: ${daysAgo} day(s) ago (${hoursAgo} hours)`));
      } else {
        console.log(formatter.info(`   Age: ${hoursAgo} hour(s) ago`));
      }

      // T107: 24-hour reminder check
      if (hoursAgo > 24) {
        console.log(`\n${formatter.warning(`⚠️  Documentation not updated in ${daysAgo} days`)}`);
        console.log(
          formatter.info('💡 Consider running `claude-docs update` to check for updates'),
        );
      }
    } else {
      console.log(formatter.info('📅 Last Update: Never'));
    }

    // T105: Display pending update summary if exists
    if (await fileExists(PENDING_DIR)) {
      const summaryPath = join(PENDING_DIR, 'summary.txt');

      console.log(`\n${formatter.warning('⚠️  PENDING UPDATE AVAILABLE\n')}`);

      if (await fileExists(summaryPath)) {
        const summary = await safeReadFile(summaryPath);
        console.log(summary);
      } else {
        try {
          const timestamp = await safeReadFile(join(PENDING_DIR, 'timestamp'));
          console.log(formatter.info(`Staged at: ${timestamp}`));
        } catch {
          console.log(formatter.info('Pending update available'));
        }
      }

      console.log(`\n${formatter.info('💡 Apply with: claude-docs update commit "<message>"')}`);
      console.log(formatter.info('💡 Discard with: claude-docs update discard'));
    } else {
      console.log(`\n${formatter.info('📦 No pending updates')}`);
    }

    // Show missing docs if any
    if (await fileExists(MISSING_DOCS_FILE)) {
      const missing = await readFile(MISSING_DOCS_FILE, 'utf-8');
      const missingFiles = missing.split('\n').filter((f) => f.trim());

      if (missingFiles.length > 0) {
        console.log(
          `\n${formatter.warning(`⚠️  ${missingFiles.length} sections failed to download:`)}`,
        );
        for (const file of missingFiles.slice(0, 5)) {
          console.log(formatter.info(`   - ${file}`));
        }
        if (missingFiles.length > 5) {
          console.log(formatter.info(`   ... and ${missingFiles.length - 5} more`));
        }
        console.log(`\n${formatter.info('💡 Run `claude-docs update` to retry downloads')}`);
      }
    }

    // T109: Show recent changelog entries
    if (await fileExists(CHANGELOG_FILE)) {
      console.log(`\n${formatter.info('📋 Recent Changes:\n')}`);

      try {
        const changelog = await safeReadFile(CHANGELOG_FILE);
        const entries = extractRecentChangelogEntries(changelog, 3);

        if (entries.length > 0) {
          console.log(entries);
          console.log(`\n${formatter.info(`💡 Full changelog: ${CHANGELOG_FILE}`)}`);
        } else {
          console.log(formatter.info('   No changelog entries yet'));
        }
      } catch (error) {
        console.log(formatter.info('   Unable to read changelog'));
      }
    }
  } catch (error) {
    console.error(
      `\n${formatter.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)}`,
    );
    process.exit(1);
  }
}

/**
 * Extract recent changelog entries
 *
 * @param changelog - Full changelog content
 * @param count - Number of recent entries to extract
 * @returns Recent entries as string
 */
function extractRecentChangelogEntries(changelog: string, count: number): string {
  const lines = changelog.split('\n');
  const entries: string[] = [];
  let currentEntry: string[] = [];
  let entryCount = 0;
  let inContent = false;

  for (const line of lines) {
    // Skip header
    if (line.startsWith('#') && !inContent) {
      if (line.match(/^## \d{4}-\d{2}-\d{2}/)) {
        inContent = true;
      }
    }

    if (!inContent) continue;

    // New entry starts with ## and a date
    if (line.match(/^## \d{4}-\d{2}-\d{2}/)) {
      if (currentEntry.length > 0) {
        entries.push(currentEntry.join('\n'));
        entryCount++;
        if (entryCount >= count) break;
        currentEntry = [];
      }
    }

    currentEntry.push(line);
  }

  // Add last entry if not already added
  if (currentEntry.length > 0 && entryCount < count) {
    entries.push(currentEntry.join('\n'));
  }

  return entries.join('\n');
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

/**
 * Check if documentation update is needed (24-hour reminder)
 * T108: Middleware to show gentle reminder
 *
 * @returns true if reminder was shown, false otherwise
 */
export async function checkUpdateReminder(): Promise<boolean> {
  try {
    // Don't show on first run
    if (!(await fileExists(LAST_UPDATE_FILE))) {
      return false;
    }

    const timestamp = await readFile(LAST_UPDATE_FILE, 'utf-8');
    const lastUpdate = new Date(Number.parseInt(timestamp, 10));
    const hoursAgo = Math.floor((Date.now() - lastUpdate.getTime()) / 1000 / 3600);

    // Show reminder if older than 24 hours
    if (hoursAgo > 24) {
      const daysAgo = Math.floor(hoursAgo / 24);
      console.error(formatter.warning(`\n⚠️  Documentation not updated in ${daysAgo} day(s)`));
      console.error(formatter.info('💡 Run `claude-docs update` to check for updates\n'));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
