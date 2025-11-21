/**
 * ASCII art and colorization utilities
 * Zero dependencies - uses ANSI escape codes
 */

/**
 * Claude Docs logo (Option 1 - Clean & Modern)
 */
export const CLAUDE_DOCS_LOGO = `   ______ __                  __         ____
  / ____// /____ _ __  __ ____/ /___     / __ \\ ____   _____ _____
 / /    / // __ \`// / / // __  // _ \\   / / / // __ \\ / ___// ___/
/ /___ / // /_/ // /_/ // /_/ //  __/  / /_/ // /_/ // /__ (__  )
\\____//_/ \\__,_/ \\__,_/ \\__,_/ \\___/  /_____/ \\____/ \\___//____/`;

export const SUBTITLE = '         Documentation Manager for Claude Code';

/**
 * ANSI 256-color codes for gradient
 */
const GRADIENT_COLORS = [
  '\x1b[38;5;51m', // Bright cyan
  '\x1b[38;5;45m', // Cyan
  '\x1b[38;5;39m', // Light blue
  '\x1b[38;5;33m', // Blue
  '\x1b[38;5;27m', // Dark blue
];

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

/**
 * Apply gradient color to ASCII art
 * Gradient flows from cyan → blue → magenta across lines
 */
export function colorizeASCII(text: string): string {
  const lines = text.split('\n');
  const coloredLines = lines.map((line, index) => {
    // Distribute colors across lines
    const colorIndex = Math.floor((index / lines.length) * GRADIENT_COLORS.length);
    const color = GRADIENT_COLORS[Math.min(colorIndex, GRADIENT_COLORS.length - 1)];
    return color + line + RESET;
  });

  return coloredLines.join('\n');
}

/**
 * Get the complete welcome banner with colors
 */
export function getWelcomeBanner(): string {
  const coloredLogo = colorizeASCII(CLAUDE_DOCS_LOGO);
  const coloredSubtitle = DIM + SUBTITLE + RESET;

  return `${coloredLogo}\n${coloredSubtitle}\n`;
}
