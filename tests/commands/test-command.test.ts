import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to execute CLI (test against built version)
function execCLI(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const builtCliPath = join(__dirname, '../../dist/cli.js');
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

describe('test command with arguments', () => {
  it('should execute command with required argument', async () => {
    const result = await execCLI(['test', 'myvalue']);
    expect(result.stdout).toContain('myvalue');
    expect(result.exitCode).toBe(0);
  });

  it('should show error when required argument is missing', async () => {
    const result = await execCLI(['test']);
    expect(result.exitCode).toBe(1);
    expect(result.stderr.toLowerCase()).toContain('argument');
  });

  it('should show command-specific help', async () => {
    const result = await execCLI(['test', '--help']);
    expect(result.stdout).toContain('test');
    expect(result.stdout).toContain('Usage:');
    expect(result.exitCode).toBe(0);
  });
});
