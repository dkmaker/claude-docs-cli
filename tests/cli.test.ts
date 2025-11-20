import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../src/cli.ts');

// Helper function to execute CLI (test against built version)
function execCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const builtCliPath = join(__dirname, '../dist/cli.js');
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
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
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
    const result = await execCLI(['help', 'test']);
    expect(result.stdout).toContain('test');
    expect(result.exitCode).toBe(0);
  });
});
