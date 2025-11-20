import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');

// Read version from package.json
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

export const CLI_NAME = 'claude-docs';
export const CLI_VERSION = packageJson.version as string;
export const CLI_DESCRIPTION = 'Claude Code Documentation Manager - Node.js CLI';
