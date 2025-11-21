# CLI Design System - User Mode

**Visual Language**: Modern, clean, Unicode box-drawing with gradient accents

## Design Principles

1. **Consistent Headers** - All commands start with boxed title
2. **Unicode Tables** - Beautiful borders for structured data
3. **Color Hierarchy** - Gradient title → white content → dimmed metadata
4. **Spacing** - Breathing room between sections
5. **Icons** - Unicode symbols for visual cues
6. **Status Colors** - Green (success), Yellow (warning), Red (error), Blue (info)

## Color Palette

```
Title Gradient:  Cyan → Blue → Magenta
Success:         Green (#00FF00)
Warning:         Yellow (#FFFF00)
Error:           Red (#FF0000)
Info:            Blue (#00AAFF)
Dimmed:          Gray (#888888)
Highlight:       Bright White
```

## Box Styles

**Headers** - Double-line box (╔═╗)
```
╔══════════════════════════════════════════════════════════════╗
║  📚 Title Text                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Tables** - Light-line box (┌─┐)
```
┌────────────┬──────────────┬──────────┐
│ Column 1   │ Column 2     │ Column 3 │
├────────────┼──────────────┼──────────┤
│ Data       │ More data    │    123   │
└────────────┴──────────────┴──────────┘
```

**Info Boxes** - Rounded corners (╭─╮)
```
╭─ Info ──────────────────────────────────────────────╮
│ Metadata and contextual information                 │
╰──────────────────────────────────────────────────────╯
```

## Icon Reference

**Status:**
- ✓ ✔ ✅ Success/Done
- ✗ ✘ ❌ Error/Failed
- ⚠ ⚡ Warning
- ℹ 💡 Info/Tip
- ⏳ ⌛ Loading/Progress

**Content:**
- 📚 Documentation/Library
- 📖 Document/Book
- 📄 File/Page
- 🔍 Search
- 💾 Cache
- 🏥 Health/Doctor
- 🎯 Target/Focus
- ▶ ▸ Next/Continue
- ● ◆ Bullet point

## Spacing Rules

- **After header box**: 1 blank line
- **Between sections**: 1 blank line
- **Before footer**: 2 blank lines
- **Table padding**: 1 space inside cells
- **After table**: 1 blank line

## Typography

- **Titles**: BOLD + Gradient color
- **Headers**: BOLD
- **Body text**: Normal weight
- **Commands**: Cyan color, monospace
- **Metadata**: Dimmed (gray)
- **Highlights**: Bright white or yellow background

## Grid Width

- **Maximum line width**: 80 characters (for narrow terminals)
- **Minimum line width**: 60 characters
- **Tables**: Auto-size to content, max 80 chars
