---
"claude-docs": minor
---

Implement beautiful CLI output with zero-dependency Unicode rendering and multi-mode support. User mode now features gradient ASCII art welcome screen, Unicode box-drawing for tables and headers (╔═══╗ ┌─┐ ╭─╮), perfectly aligned columns, and visual hierarchy with colored text. AI mode provides clean markdown tables optimized for LLM parsing with command examples and stale data warnings. Adds `--output json` flag for programmatic consumption. All rendering uses a 3-layer architecture (Data → Renderer → Output) with structured JSON internally, enabling consistent output across all modes. Commands `list`, `get`, `search`, and `doctor` now return beautifully formatted results with auto-sizing boxes, category organization, and contextual tips. Zero new dependencies - all visual enhancements use native Unicode characters and ANSI escape codes.
