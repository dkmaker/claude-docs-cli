---
"claude-docs": patch
---

Optimize package distribution and fix installation errors. Move zod from devDependencies to dependencies to resolve ERR_MODULE_NOT_FOUND errors when installing from tarball. Add files field to package.json to exclude unnecessary files (source maps, TypeScript declarations, specs, tests), reducing package size from 298 KB to 45 KB (85% reduction). The optimized package now includes only runtime JavaScript files, the resources configuration, and documentation.
