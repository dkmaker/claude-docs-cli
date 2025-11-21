# Update Check Mockup

**Command**: `claude-docs update` or `claude-docs update check`

```
╔══════════════════════════════════════════════════════════════╗
║  🔄 Checking for Updates                                     ║
╚══════════════════════════════════════════════════════════════╝

Comparing local vs remote documentation...

┌─────────────────┬───────┐
│ Status          │ Count │
├─────────────────┼───────┤
│ ● New files     │   2   │
│ ● Modified      │   3   │
│ ● Deleted       │   0   │
│ ○ Unchanged     │  39   │
├─────────────────┼───────┤
│ Total changes   │   5   │
└─────────────────┴───────┘

Changes detected:

  ● hooks.md          (modified)
  ● mcp.md            (modified)
  ● plugins.md        (modified)
  ● new-feature.md    (added)
  ● quickstart-v2.md  (added)

╭─ Next Steps ───────────────────────────────────────────────────╮
│                                                                 │
│  ✓ To apply these updates:                                     │
│    claude-docs update commit "update to latest docs"           │
│                                                                 │
│  ✗ To discard these updates:                                   │
│    claude-docs update discard                                  │
│                                                                 │
│  ℹ To see detailed diffs:                                      │
│    cat ~/.claude-docs/.pending/diffs/*.diff                    │
│                                                                 │
╰─────────────────────────────────────────────────────────────────╯
```

**No Updates Available:**

```
╔══════════════════════════════════════════════════════════════╗
║  🔄 Checking for Updates                                     ║
╚══════════════════════════════════════════════════════════════╝

Comparing local vs remote documentation...

✓ Your documentation is up to date!

  Current version: 2024-11-21
  Remote version:  2024-11-21
  Last check:      2 minutes ago

💡 Tip: Documentation is checked automatically every 24 hours
```

**Colors:**
- Header: Gradient cyan → blue
- Status bullets: Green (●) for changes, Gray (○) for unchanged
- Numbers: Bold white, right-aligned
- File names: Cyan
- Status tags: (modified) - yellow, (added) - green, (deleted) - red
- Action boxes: Green border (apply), Red border (discard), Blue (info)
- Icons: Colored (✓ green, ✗ red, ℹ blue)
