// Simple colored console logger using ANSI codes
// No external dependencies (chalk avoided per constitution)

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

export function logInfo(message: string): void {
  console.log(`${colors.blue}INFO${colors.reset} ${message}`);
}

export function logSuccess(message: string): void {
  console.log(`${colors.green}SUCCESS${colors.reset} ${message}`);
}

export function logWarn(message: string): void {
  console.warn(`${colors.yellow}WARN${colors.reset} ${message}`);
}

export function logError(message: string): void {
  console.error(`${colors.red}ERROR${colors.reset} ${message}`);
  process.exit(1);
}
