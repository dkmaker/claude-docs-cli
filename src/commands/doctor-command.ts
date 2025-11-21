import { existsSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { OutputFormatter } from '../lib/output-formatter.js';
import { detectOutputMode } from '../utils/env.js';

const formatter = new OutputFormatter(detectOutputMode());

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

/**
 * Doctor command - Run health checks and verify installation
 */
export async function doctorCommand(): Promise<void> {
  console.log(formatter.info('🏥 Running Health Checks...\n'));

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

  // Display results
  let hasFailures = false;
  let hasWarnings = false;

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warn' ? '⚠️' : '❌';
    const color =
      check.status === 'pass'
        ? formatter.success.bind(formatter)
        : check.status === 'warn'
          ? formatter.warning.bind(formatter)
          : formatter.error.bind(formatter);

    console.log(color(`${icon} ${check.name}`));
    console.log(`   ${check.message}\n`);

    if (check.status === 'fail') hasFailures = true;
    if (check.status === 'warn') hasWarnings = true;
  }

  // Summary
  console.log(formatter.info('━'.repeat(60)));
  if (hasFailures) {
    console.log(formatter.error('\n❌ Health check failed'));
    console.log(formatter.info('Fix the issues above and run `claude-docs doctor` again\n'));
    process.exit(1);
  }
  if (hasWarnings) {
    console.log(formatter.warning('\n⚠️  Health check passed with warnings'));
    console.log(formatter.info('Warnings are normal for fresh installations\n'));
  } else {
    console.log(formatter.success('\n✅ All health checks passed!'));
    console.log(formatter.info('Your installation is healthy and ready to use\n'));
  }
}
