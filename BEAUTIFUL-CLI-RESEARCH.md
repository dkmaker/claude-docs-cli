# Beautiful CLI Output Research (2025)

## Modern CLI Design Trends

**Key findings from 2024-2025:**
- **picocolors** - Zero dependencies, fast (but we already have no-deps requirement)
- **Unicode box-drawing** - Native support, no libraries needed
- **Minimalist tables** - Clean, aligned, modern
- **Boxes and borders** - Using Unicode characters
- **Gradient text** - Possible with ANSI escape codes
- **Icons** - Unicode symbols (✓ ✗ ⚠ ℹ ▶ ◆ ●)

## Zero-Dependency Solutions

Since we have zero-dependency requirement, we can use:

### 1. Unicode Box-Drawing Characters (Built-in)

```
┌─────────────┐
│   Title     │
├─────────────┤
│   Content   │
└─────────────┘

╔═════════════╗
║   Title     ║
╠═════════════╣
║   Content   ║
╚═════════════╝

┏━━━━━━━━━━━━━┓
┃   Title     ┃
┣━━━━━━━━━━━━━┫
┃   Content   ┃
┗━━━━━━━━━━━━━┛
```

**Character Sets:**
- Light: `┌ ┐ └ ┘ ─ │ ├ ┤ ┬ ┴ ┼`
- Heavy: `┏ ┓ ┗ ┛ ━ ┃ ┣ ┫ ┳ ┻ ╋`
- Double: `╔ ╗ ╚ ╝ ═ ║ ╠ ╣ ╦ ╩ ╬`

### 2. ANSI Colors (Built-in via escape codes)

We already support this via OutputFormatter. Can enhance:

```typescript
// Gradient-like effect (no library needed)
const colors = [
  '\x1b[38;5;33m',  // Blue
  '\x1b[38;5;39m',  // Lighter blue
  '\x1b[38;5;45m',  // Cyan
  '\x1b[38;5;51m',  // Bright cyan
];
```

### 3. Unicode Symbols (Built-in)

**Status indicators:**
- ✓ ✔ ✅ Success
- ✗ ✘ ❌ Error
- ⚠ ⚡ Warning
- ℹ 💡 Info
- ▶ ▸ Arrow/pointer
- ● ◆ ◉ Bullets
- 📦 📚 📄 🔍 Icons (emoji)

### 4. Progress Indicators (No deps needed)

```
⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏  (Braille spinner)
◐ ◓ ◑ ◒                (Circle spinner)
▁▂▃▄▅▆▇█              (Progress bar)
```

## Proposed User Mode Enhancements

### Enhanced Table Design

**Current:**
```
📚 Available Documentation (44 sections)

overview
quickstart
...
```

**Proposed:**
```
╔══════════════════════════════════════════════════════════════╗
║  📚 Available Documentation                                  ║
╚══════════════════════════════════════════════════════════════╝

┌────────────────────┬──────────────────────┬──────────┐
│ Slug               │ Title                │ Sections │
├────────────────────┼──────────────────────┼──────────┤
│ overview           │ Overview             │    10    │
│ quickstart         │ Quickstart           │    18    │
│ common-workflows   │ Common Workflows     │    31    │
└────────────────────┴──────────────────────┴──────────┘

Total: 44 documents
```

### Enhanced Search Results

**Current:**
```
Found 5 results for "hooks"

📄 hooks (line 12)
   Configure hooks...
```

**Proposed:**
```
╔══════════════════════════════════════════════════════════════╗
║  🔍 Search Results: "hooks"                                  ║
╚══════════════════════════════════════════════════════════════╝

┌──────────────┬──────┬─────────────────────────────────────┐
│ Document     │ Line │ Match                               │
├──────────────┼──────┼─────────────────────────────────────┤
│ hooks        │  12  │ Configure hooks for tool events     │
│ settings     │  45  │ Hook configuration in settings      │
└──────────────┴──────┴─────────────────────────────────────┘

Found: 5 results • Search time: 23ms
```

### Enhanced Get Output

**Current:**
```
# Overview

[content]
```

**Proposed:**
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  📖 Overview                                                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

[content]

┌─ Info ──────────────────────────────────────────────────────┐
│ Source: overview.md • Sections: 10                          │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Strategy (Zero Dependencies)

### Create Box Drawing Utility

```typescript
// src/lib/box-drawing.ts
export const BOX_CHARS = {
  light: {
    topLeft: '┌', topRight: '┐',
    bottomLeft: '└', bottomRight: '┘',
    horizontal: '─', vertical: '│',
    cross: '┼', leftT: '├', rightT: '┤',
    topT: '┬', bottomT: '┴',
  },
  heavy: {
    topLeft: '┏', topRight: '┓',
    bottomLeft: '┗', bottomRight: '┛',
    horizontal: '━', vertical: '┃',
    cross: '╋', leftT: '┣', rightT: '┫',
    topT: '┳', bottomT: '┻',
  },
  double: {
    topLeft: '╔', topRight: '╗',
    bottomLeft: '╚', bottomRight: '╝',
    horizontal: '═', vertical: '║',
    cross: '╬', leftT: '╠', rightT: '╣',
    topT: '╦', bottomT: '╩',
  },
};

export function createBox(text: string, style: 'light' | 'heavy' | 'double' = 'double'): string {
  const chars = BOX_CHARS[style];
  const width = text.length + 4; // Padding

  let output = '';
  output += chars.topLeft + chars.horizontal.repeat(width) + chars.topRight + '\n';
  output += chars.vertical + '  ' + text + '  ' + chars.vertical + '\n';
  output += chars.bottomLeft + chars.horizontal.repeat(width) + chars.bottomRight + '\n';

  return output;
}

export function createTable(
  headers: string[],
  rows: string[][],
  style: 'light' | 'heavy' | 'double' = 'light'
): string {
  const chars = BOX_CHARS[style];

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => r[i]?.length ?? 0));
    return Math.max(h.length, maxRowWidth);
  });

  let output = '';

  // Top border
  output += chars.topLeft;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat(widths[i] + 2);
    if (i < headers.length - 1) output += chars.topT;
  }
  output += chars.topRight + '\n';

  // Header row
  output += chars.vertical;
  for (let i = 0; i < headers.length; i++) {
    output += ' ' + headers[i].padEnd(widths[i]) + ' ' + chars.vertical;
  }
  output += '\n';

  // Separator
  output += chars.leftT;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat(widths[i] + 2);
    if (i < headers.length - 1) output += chars.cross;
  }
  output += chars.rightT + '\n';

  // Data rows
  for (const row of rows) {
    output += chars.vertical;
    for (let i = 0; i < headers.length; i++) {
      output += ' ' + (row[i] ?? '').padEnd(widths[i]) + ' ' + chars.vertical;
    }
    output += '\n';
  }

  // Bottom border
  output += chars.bottomLeft;
  for (let i = 0; i < headers.length; i++) {
    output += chars.horizontal.repeat(widths[i] + 2);
    if (i < headers.length - 1) output += chars.bottomT;
  }
  output += chars.bottomRight + '\n';

  return output;
}
```

## Recommendation

**For User Mode:**
- Use Unicode box-drawing characters for tables and boxes
- Keep colorful output (already have via OutputFormatter)
- Add header boxes for visual separation
- Use Unicode icons for status
- All zero dependencies!

**Should we implement this?**
- Create `src/lib/box-drawing.ts` with utilities
- Update UserRenderer to use beautiful tables
- Keep AI mode as-is (clean markdown)
- Keep JSON mode as-is (raw JSON)
