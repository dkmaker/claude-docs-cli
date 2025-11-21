---
"claude-docs": patch
---

Fix CLI not executing when installed globally via npm. Remove conditional import.meta.url check that prevented the main function from running when the CLI was invoked through the npm bin symlink. The CLI now executes properly when installed with `npm install -g` and run as `claude-docs` command.
