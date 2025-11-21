import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Ensure a directory exists, creating it recursively if needed
 *
 * @param dirPath - Directory path to create
 * @throws Error if directory creation fails
 *
 * @example
 * ```typescript
 * await ensureDir('~/.claude-docs/cache');
 * await ensureDir('/path/to/nested/directory');
 * ```
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Safely read a file with descriptive error handling
 *
 * @param filePath - Path to file to read
 * @returns File content as string
 * @throws Error with descriptive message if read fails
 *
 * @example
 * ```typescript
 * try {
 *   const content = await safeReadFile('config.json');
 *   console.log(content);
 * } catch (error) {
 *   console.error('Failed to read file:', error.message);
 * }
 * ```
 */
export async function safeReadFile(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
      throw new Error(`Permission denied reading file: ${filePath}`);
    }
    throw new Error(
      `Failed to read file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Safely write a file, ensuring parent directory exists
 *
 * @param filePath - Path to file to write
 * @param content - Content to write
 * @throws Error with descriptive message if write fails
 *
 * @example
 * ```typescript
 * await safeWriteFile('~/.claude-docs/config.json', JSON.stringify(config));
 * ```
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
  try {
    // Ensure parent directory exists
    const dir = dirname(filePath);
    await ensureDir(dir);

    // Write file
    await writeFile(filePath, content, 'utf-8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'EACCES') {
      throw new Error(`Permission denied writing file: ${filePath}`);
    }
    if (error instanceof Error && 'code' in error && error.code === 'ENOSPC') {
      throw new Error(`No space left on device writing file: ${filePath}`);
    }
    throw new Error(
      `Failed to write file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check if a file or directory exists
 *
 * @param path - Path to check
 * @returns true if file/directory exists, false otherwise
 *
 * @example
 * ```typescript
 * if (await fileExists('config.json')) {
 *   console.log('Config file exists');
 * }
 * ```
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 *
 * @param filePath - Path to file
 * @returns File size in bytes
 * @throws Error if file doesn't exist or stat fails
 *
 * @example
 * ```typescript
 * const size = await getFileSize('large-file.txt');
 * console.log(`File is ${size} bytes`);
 * ```
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(
      `Failed to get file size for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Verify file integrity (placeholder for future checksum verification)
 *
 * Currently just checks if file exists and is readable
 * Future: Can add MD5/SHA256 checksum verification
 *
 * @param filePath - Path to file to verify
 * @returns true if file exists and is readable, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await verifyFileIntegrity('important-file.txt');
 * if (!isValid) {
 *   console.error('File integrity check failed');
 * }
 * ```
 */
export async function verifyFileIntegrity(filePath: string): Promise<boolean> {
  try {
    // Basic check: file exists and is readable
    await access(filePath);
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
