import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../../src/cli.ts');

// Helper function to execute CLI (test against built version)
function execCLI(
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number; duration: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const builtCliPath = join(__dirname, '../../../dist/cli.js');
    const child = spawn('node', [builtCliPath, ...args]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      const duration = Date.now() - start;
      resolve({ stdout, stderr, exitCode: exitCode ?? 0, duration });
    });
  });
}

describe.skip('--version command', () => {
  it('should display version number', async () => {
    const result = await execCLI(['--version']);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.exitCode).toBe(0);
  });

  it('should work with -v shorthand', async () => {
    const result = await execCLI(['-v']);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.exitCode).toBe(0);
  });
});
