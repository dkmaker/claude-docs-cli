import { existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { OutputFormatter } from '../lib/output-formatter.js';
import { createRenderer } from '../lib/renderer.js';
import type { CommandResult, DoctorResult, HealthCheck } from '../types/command-results.js';
import { detectOutputMode } from '../utils/env.js';

/**
 * Doctor command - Run health checks and verify installation
 */
export async function doctorCommand(): Promise<void> {
  const mode = detectOutputMode();
  const formatter = new OutputFormatter(mode === 'ai' || mode === 'json' ? 'ai' : 'user');
  const renderer = createRenderer(
    mode === 'json' ? 'json' : mode === 'ai' ? 'ai' : 'user',
    formatter,
  );

  const checks: HealthCheck[] = [];

  // Check 1: Data directory exists
  const dataDir = join(homedir(), '.claude-docs');
  try {
    await access(dataDir);
    checks.push({
      name: 'Data Directory',
      status: 'pass',
      message: `${dataDir} exists`,
    });
  } catch {
    checks.push({
      name: 'Data Directory',
      status: 'warn',
      message: `${dataDir} not found (will be created on first update)`,
    });
  }

  // Check 2: Cache directory
  const cacheDir = join(dataDir, 'cache');
  if (existsSync(dataDir)) {
    try {
      await access(cacheDir);
      checks.push({
        name: 'Cache Directory',
        status: 'pass',
        message: `${cacheDir} exists`,
      });
    } catch {
      checks.push({
        name: 'Cache Directory',
        status: 'warn',
        message: `${cacheDir} not found (will be created when needed)`,
      });
    }
  }

  // Check 3: Downloaded docs directory
  const docsDir = join(dataDir, 'docs');
  if (existsSync(dataDir)) {
    try {
      await access(docsDir);
      checks.push({
        name: 'Documentation Files',
        status: 'pass',
        message: `${docsDir} exists`,
      });
    } catch {
      checks.push({
        name: 'Documentation Files',
        status: 'warn',
        message: 'No documentation downloaded yet (run `claude-docs update`)',
      });
    }
  }

  // Check 4: Resource configuration
  const resourceFile = join(process.cwd(), 'dist', 'claude-docs-resources.json');
  try {
    await access(resourceFile);
    checks.push({
      name: 'Resource Configuration',
      status: 'pass',
      message: 'claude-docs-resources.json found',
    });
  } catch {
    checks.push({
      name: 'Resource Configuration',
      status: 'fail',
      message: 'claude-docs-resources.json missing (build error)',
    });
  }

  // Check 5: Node.js version
  const nodeVersion = process.version;
  const requiredMajor = 22;
  const currentMajor = Number.parseInt(nodeVersion.slice(1).split('.')[0] ?? '0', 10);

  if (currentMajor >= requiredMajor) {
    checks.push({
      name: 'Node.js Version',
      status: 'pass',
      message: `${nodeVersion} (>= v${requiredMajor} required)`,
    });
  } else {
    checks.push({
      name: 'Node.js Version',
      status: 'fail',
      message: `${nodeVersion} (v${requiredMajor}+ required)`,
    });
  }

  // Check 6: Write permissions to data directory
  if (existsSync(dataDir)) {
    try {
      await access(dataDir, 2); // W_OK = 2
      checks.push({
        name: 'Write Permissions',
        status: 'pass',
        message: 'Can write to data directory',
      });
    } catch {
      checks.push({
        name: 'Write Permissions',
        status: 'fail',
        message: 'Cannot write to data directory',
      });
    }
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'warnings' | 'failed' = 'healthy';
  if (checks.some((c) => c.status === 'fail')) {
    overallStatus = 'failed';
  } else if (checks.some((c) => c.status === 'warn')) {
    overallStatus = 'warnings';
  }

  // Build result
  const result: CommandResult<DoctorResult> = {
    success: overallStatus !== 'failed',
    data: {
      overallStatus,
      checks,
    },
  };

  // Render and output
  const output = renderer.renderDoctor(result);
  console.log(output);

  // Exit with error code if failed
  if (overallStatus === 'failed') {
    process.exit(1);
  }
}
