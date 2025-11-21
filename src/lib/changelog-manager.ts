import { CHANGELOG_FILE } from '../utils/path-resolver.js';
import { fileExists, safeReadFile, safeWriteFile } from './file-ops.js';

/**
 * Changelog manager - handles changelog entry generation and validation
 * Tracks documentation update history
 */

/**
 * Changelog entry data
 */
export interface ChangelogData {
  message: string;
  files: string[];
  timestamp: Date;
}

/**
 * Validate changelog message
 * T077-T078: Validation logic
 *
 * @param message - Changelog message to validate
 * @throws Error if message is invalid
 *
 * @example
 * ```typescript
 * validateChangelogMessage('Updated MCP server list'); // OK
 * validateChangelogMessage('update'); // Throws
 * validateChangelogMessage(''); // Throws
 * ```
 */
export function validateChangelogMessage(message: string): void {
  // Empty check
  if (!message || message.trim().length === 0) {
    throw new Error('Changelog message cannot be empty');
  }

  const trimmed = message.trim();

  // Length check (T078)
  if (trimmed.length < 10) {
    throw new Error(`Changelog too short (min 10 chars, got ${trimmed.length})`);
  }

  if (trimmed.length > 1000) {
    throw new Error(`Changelog too long (max 1000 chars, got ${trimmed.length})`);
  }

  // Reject vague messages (T078)
  const vague = ['update', 'fix', 'change', 'modified', 'updated'];
  const lowerMessage = trimmed.toLowerCase();

  for (const word of vague) {
    if (lowerMessage === word) {
      throw new Error(
        `Changelog too vague: "${trimmed}". Please be more specific about what changed.`,
      );
    }
  }
}

/**
 * Generate changelog entry
 * T079: Entry generation with timestamp
 *
 * @param data - Changelog data
 * @returns Formatted changelog entry
 *
 * @example
 * ```typescript
 * const entry = generateChangelogEntry({
 *   message: 'Updated MCP servers',
 *   files: ['mcp.md', 'plugins.md'],
 *   timestamp: new Date()
 * });
 * ```
 */
export function generateChangelogEntry(data: ChangelogData): string {
  const lines: string[] = [];

  // Format timestamp
  const dateStr = data.timestamp.toISOString().replace('T', ' ').split('.')[0];

  lines.push(`## ${dateStr}`);
  lines.push('');
  lines.push(data.message);

  if (data.files.length > 0) {
    lines.push('');
    lines.push('**Files updated:**');
    for (const file of data.files) {
      lines.push(`- \`${file}\``);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  return lines.join('\n');
}

/**
 * Update changelog file
 * T080: Prepend new entry to existing changelog
 *
 * @param data - Changelog data
 *
 * @example
 * ```typescript
 * await updateChangelog({
 *   message: 'Updated documentation',
 *   files: ['overview.md'],
 *   timestamp: new Date()
 * });
 * ```
 */
export async function updateChangelog(data: ChangelogData): Promise<void> {
  // Validate message
  validateChangelogMessage(data.message);

  // Generate new entry
  const newEntry = generateChangelogEntry(data);

  // Read existing changelog or create header
  let existingContent = '';

  if (await fileExists(CHANGELOG_FILE)) {
    existingContent = await safeReadFile(CHANGELOG_FILE);
  } else {
    // Create initial changelog with header
    existingContent = `# Claude Code Documentation Changelog

This file tracks all changes to the Claude Code documentation over time.

---

`;
  }

  // Find where to insert new entry (after the header/separator)
  const separatorIndex = existingContent.indexOf('---\n');

  let newContent: string;

  if (separatorIndex !== -1) {
    // Insert after the separator
    const beforeSeparator = existingContent.substring(0, separatorIndex + 4);
    const afterSeparator = existingContent.substring(separatorIndex + 4);

    // Prepend new entry
    newContent = `${beforeSeparator}\n${newEntry}${afterSeparator}`;
  } else {
    // No separator found, just prepend
    newContent = `${existingContent}\n${newEntry}`;
  }

  // Write updated changelog
  await safeWriteFile(CHANGELOG_FILE, newContent);
}

/**
 * Add changelog entry (convenience function)
 *
 * @param message - Changelog message
 * @param files - List of files changed
 */
export async function addChangelogEntry(message: string, files: string[]): Promise<void> {
  await updateChangelog({
    message,
    files,
    timestamp: new Date(),
  });
}
