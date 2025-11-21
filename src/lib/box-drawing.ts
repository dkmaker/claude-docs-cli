/**
 * Box drawing utilities using Unicode characters
 * Zero dependencies - uses built-in Unicode box-drawing characters
 */

/**
 * Unicode box-drawing character sets
 */
export const BOX_CHARS = {
  light: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
  },
  heavy: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
    cross: '╋',
    leftT: '┣',
    rightT: '┫',
    topT: '┳',
    bottomT: '┻',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
    cross: '╬',
    leftT: '╠',
    rightT: '╣',
    topT: '╦',
    bottomT: '╩',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    leftT: '├',
    rightT: '┤',
    topT: '┬',
    bottomT: '┴',
  },
};

/**
 * Create a header box with title (double-line style)
 * Text is centered within the box
 */
export function createHeaderBox(text: string, width = 62): string {
  const chars = BOX_CHARS.double;

  // Calculate padding for centering
  const textLength = stripAnsi(text).length;
  const innerWidth = width - 4; // Account for borders and padding
  const padding = Math.max(0, innerWidth - textLength);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;

  const paddedText = ' '.repeat(leftPad) + text + ' '.repeat(rightPad);

  let output = '';
  output += `${chars.topLeft + chars.horizontal.repeat(width) + chars.topRight}\n`;
  output += `${chars.vertical}  ${paddedText}  ${chars.vertical}\n`;
  output += `${chars.bottomLeft + chars.horizontal.repeat(width) + chars.bottomRight}\n`;

  return output;
}

/**
 * Create a table with Unicode borders
 */
export function createTable(
  headers: string[],
  rows: string[][],
  style: 'light' | 'heavy' | 'double' | 'rounded' = 'light',
): string {
  const chars = BOX_CHARS[style];

  // Calculate column widths (account for ANSI codes and wide characters like emojis)
  // Use a max cap of 60 chars per column to prevent overly wide tables
  const widths = headers.map((h, i) => {
    const headerWidth = getVisualWidth(h);
    const maxRowWidth = Math.max(...rows.map((r) => getVisualWidth(r[i] ?? '')));
    const calculatedWidth = Math.max(headerWidth, maxRowWidth);
    // Cap at 60 characters per column
    return Math.min(calculatedWidth, 60);
  });

  let output = '';

  // Top border
  output += chars.topLeft;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat((widths[i] ?? 0) + 2);
    if (i < headers.length - 1) output += chars.topT;
  }
  output += `${chars.topRight}\n`;

  // Header row
  output += chars.vertical;
  for (let i = 0; i < headers.length; i++) {
    const paddedHeader = padWithAnsi(headers[i] ?? '', widths[i] ?? 0);
    output += ` ${paddedHeader} ${chars.vertical}`;
  }
  output += '\n';

  // Separator
  output += chars.leftT;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat((widths[i] ?? 0) + 2);
    if (i < headers.length - 1) output += chars.cross;
  }
  output += `${chars.rightT}\n`;

  // Data rows
  for (const row of rows) {
    output += chars.vertical;
    for (let i = 0; i < headers.length; i++) {
      const paddedCell = padWithAnsi(row[i] ?? '', widths[i] ?? 0);
      output += ` ${paddedCell} ${chars.vertical}`;
    }
    output += '\n';
  }

  // Bottom border
  output += chars.bottomLeft;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat((widths[i] ?? 0) + 2);
    if (i < headers.length - 1) output += chars.bottomT;
  }
  output += `${chars.bottomRight}\n`;

  return output;
}

/**
 * Create an info box with rounded corners
 * Automatically calculates width based on longest line
 */
export function createInfoBox(lines: string[], minWidth = 60): string {
  const chars = BOX_CHARS.rounded;

  // Calculate actual width needed (longest line + padding)
  const maxLineLength = Math.max(...lines.map((line) => stripAnsi(line).length));
  const width = Math.max(minWidth, maxLineLength + 4); // Add padding

  let output = '';

  // Top border
  output += `${chars.topLeft + chars.horizontal.repeat(width) + chars.topRight}\n`;

  // Content lines
  for (const line of lines) {
    const textLength = stripAnsi(line).length;
    const padding = Math.max(0, width - textLength - 2);
    output += `${chars.vertical} ${line}${' '.repeat(padding)} ${chars.vertical}\n`;
  }

  // Bottom border
  output += `${chars.bottomLeft + chars.horizontal.repeat(width) + chars.bottomRight}\n`;

  return output;
}

/**
 * Create a section divider with text
 */
export function createDivider(text: string, width = 60): string {
  const textWithSpaces = ` ${text} `;
  const textLength = stripAnsi(textWithSpaces).length;
  const lineLength = Math.max(0, (width - textLength) / 2);

  return '━'.repeat(Math.floor(lineLength)) + textWithSpaces + '━'.repeat(Math.ceil(lineLength));
}

/**
 * Strip ANSI escape codes from string to get visual length
 * Note: Emojis and wide characters count as 2 for display width
 */
function stripAnsi(text: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape codes are control characters by design
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Get visual width of string (accounting for wide characters like emojis)
 * Emojis and many Unicode symbols take 2 terminal cells
 */
function getVisualWidth(text: string): number {
  const stripped = stripAnsi(text);
  let width = 0;

  for (const char of stripped) {
    const code = char.codePointAt(0) ?? 0;
    // Emoji and wide characters (rough heuristic)
    // Most emojis are in ranges: 0x1F300-0x1F9FF, 0x2600-0x26FF, etc.
    if (
      (code >= 0x1f300 && code <= 0x1f9ff) || // Emoji
      (code >= 0x2600 && code <= 0x26ff) || // Misc symbols
      (code >= 0x2700 && code <= 0x27bf) || // Dingbats
      (code >= 0xfe00 && code <= 0xfe0f) || // Variation selectors
      (code >= 0x1f000 && code <= 0x1f02f) // Mahjong, etc.
    ) {
      width += 2; // Wide character
    } else {
      width += 1; // Normal character
    }
  }

  return width;
}

/**
 * Pad string accounting for ANSI codes
 */
function padWithAnsi(
  text: string,
  width: number,
  align: 'left' | 'right' | 'center' = 'left',
): string {
  const visibleLength = stripAnsi(text).length;
  const padding = Math.max(0, width - visibleLength);

  if (align === 'right') {
    return ' '.repeat(padding) + text;
  }
  if (align === 'center') {
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  // left align (default)
  return text + ' '.repeat(padding);
}

/**
 * Right-align a value in a cell (for numbers)
 */
export function rightAlign(text: string, width: number): string {
  return padWithAnsi(text, width, 'right');
}

/**
 * Center text in a cell
 */
export function centerText(text: string, width: number): string {
  return padWithAnsi(text, width, 'center');
}
