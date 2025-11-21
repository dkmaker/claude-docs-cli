import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../../src/cli.ts');

// Ensure build is fresh before running tests
beforeAll(() => {
  try {
    execSync('npm run build', {
      cwd: join(__dirname, '../..'),
      stdio: 'pipe',
      timeout: 30000,
    });
  } catch (error) {
    console.warn('Build failed or timed out, proceeding with existing build');
  }
});

// Helper function to execute CLI (test against built version) with retry logic
function execCLI(
  args: string[],
  options: { timeout?: number; retries?: number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const { timeout = 5000, retries = 3 } = options;

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const builtCliPath = join(__dirname, '../../dist/cli.js');

    const attempt = () => {
      attempts++;

      const child = spawn('node', [builtCliPath, ...args], {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeout);

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        clearTimeout(timeoutHandle);

        if (timedOut) {
          if (attempts < retries) {
            attempt();
          } else {
            reject(new Error(`CLI execution timed out after ${retries} retries`));
          }
        } else {
          resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutHandle);
        if (attempts < retries) {
          attempt();
        } else {
          reject(error);
        }
      });
    };

    attempt();
  });
}

describe('CLI Entry Point', () => {
  it('should initialize without errors', async () => {
    const result = await execCLI(['--help']);
    expect(result.exitCode).toBe(0);
  });

  it('should handle unknown commands with helpful error', async () => {
    const result = await execCLI(['unknown-command']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toLowerCase()).toContain('unknown');
  });

  it('should display default help when no arguments provided', async () => {
    const result = await execCLI([]);
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('claude-docs');
    expect(result.exitCode).toBe(0);
  });
});

describe('Command Registration', () => {
  it('should list registered commands in help output', async () => {
    const result = await execCLI(['--help']);
    expect(result.stdout).toContain('Commands:');
    expect(result.exitCode).toBe(0);
  });

  it('should support help for specific commands', async () => {
    // Commander.js uses command --help syntax, not help <command>
    const result = await execCLI(['update', '--help'], { timeout: 10000, retries: 3 });

    // Check both stdout and stderr as output might go to either
    const output = result.stdout + result.stderr;

    // More descriptive error message for debugging
    if (!output.includes('update')) {
      console.error('stdout:', result.stdout);
      console.error('stderr:', result.stderr);
      console.error('exitCode:', result.exitCode);
    }

    // Verify help output contains expected command info
    expect(output).toContain('update');
    expect(output).toContain('check');
    expect(result.exitCode).toBe(0);
  });
});
