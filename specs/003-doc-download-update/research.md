# Research: Documentation Download and Update Management

**Feature**: 003-doc-download-update
**Date**: 2025-11-20
**Status**: Complete

## Research Questions

This document resolves all NEEDS CLARIFICATION items from the Technical Context section of plan.md.

---

## 1. HTTP Client for Documentation Downloads

### Decision

**Use Node.js 22 Native `fetch()` API** - Zero additional dependencies

### Rationale

Node.js 22 LTS includes native `fetch()` powered by Undici, which is:
- **Built-in**: No npm installation required (zero dependencies)
- **Spec-compliant**: Implements WHATWG Fetch Standard with server-appropriate modifications
- **High-performance**: Undici is written in JavaScript with C++ bindings, optimized for Node.js
- **Well-maintained**: Part of Node.js core, maintained by Node.js team
- **Full-featured**: Supports streaming, AbortController, custom headers, retry logic can be implemented on top

The native fetch provides all capabilities needed for this project:
- HTTP GET requests with headers
- Response body as text
- Progress tracking via streaming
- Error handling
- Can implement retry logic with exponential backoff in userland code

### Alternatives Considered

- **node-fetch**: Rejected - requires npm dependency when native fetch is available
- **undici (standalone)**: Rejected - already bundled in Node.js 22, installing separately adds unnecessary dependency
- **axios/got**: Rejected - heavy dependencies (both have 10+ transitive dependencies), overkill for simple HTTP downloads

### Sources

- https://nodejs.org/en/learn/getting-started/fetch (Official Node.js fetch documentation)
- https://github.com/nodejs/undici (Undici repository - powers Node.js fetch)
- https://blog.logrocket.com/fetch-api-node-js/ (Fetch API stabilization in Node.js)
- Node.js 22.x documentation confirms stable fetch support

### Research Method

perplexity_search - "Node.js 22 LTS native fetch API capabilities vs undici vs node-fetch"

### Confidence Level

**High** - Official Node.js documentation, stable API since v18, LTS guarantee in v22

### Implementation Notes

```typescript
// Native fetch example - zero dependencies
const response = await fetch(url, {
  headers: { 'User-Agent': 'claude-docs-cli' }
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}

const content = await response.text();

// Retry logic implemented in userland (no library needed)
async function fetchWithRetry(url: string, maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw new Error('Unreachable');
}
```

**Aligns with Constitution**: Zero external dependencies for HTTP client ✓

---

## 2. Markdown Processing for MDX Transformations

### Decision

**Implement custom lightweight transformations** for the specific MDX patterns needed, without adding markdown library dependencies

### Rationale

After analyzing the bash implementation (`claude-docs.sh`), the markdown transformations required are:
1. **MDX Callouts** (`<Note>`, `<Tip>`, `<Warning>`) → Blockquotes
2. **MDX Cards** (`<CardGroup>`, `<Card>`) → Bullet lists
3. **MDX Tabs** (`<Tabs>`, `<Tab>`) → Sections
4. **MDX Steps** (`<Steps>`, `<Step>`) → Numbered lists
5. **Code block attributes** removal (`theme={null}`)
6. **Internal links** transformation (`/en/slug` → CLI commands)

These are simple regex/string transformations (200-300 lines total in bash using `awk`/`sed`). Implementing in TypeScript:
- **No AST parsing needed**: Simple pattern matching and replacement
- **Predictable input**: Documentation comes from official Claude Code docs with consistent format
- **Zero dependencies**: String manipulation using native JavaScript
- **Performance**: Faster than parsing full AST (no overhead)
- **Maintainability**: Easy to understand, test, and modify

### Alternatives Considered

#### Remark/Unified Ecosystem

- **Pros**:
  - Industry standard for markdown processing
  - Rich plugin ecosystem
  - First-class AST support
  - Used by major SSGs (Next.js, Astro, etc.)

- **Cons**:
  - Requires **4+ dependencies**: `unified`, `remark-parse`, `remark-rehype`, `rehype-stringify`
  - Each with their own dependencies (10-15 transitive deps total)
  - Overkill for simple pattern replacement
  - Learning curve for AST manipulation
  - Slower performance for our use case

#### markdown-it

- **Pros**:
  - Fast parser
  - Plugin system
  - CommonMark compliant

- **Cons**:
  - Requires npm dependency
  - Focuses on HTML output (not our use case - we transform MD→MD)
  - Plugin ecosystem not as rich as remark for MDX
  - Still overkill for simple string transformations

#### Decision Matrix

| Aspect | Custom Implementation | Remark/Unified | markdown-it |
|--------|----------------------|----------------|-------------|
| Dependencies | 0 | 4+ core + plugins | 1+ |
| LOC to implement | ~300 | ~50 (with plugins) | ~100 |
| Performance | Fastest (no parsing) | Slower (full AST) | Medium |
| Maintainability | High (simple code) | Medium (AST knowledge) | Medium |
| Constitution compliance | ✅ Zero deps | ❌ Multiple deps | ❌ External dep |

### Sources

- https://github.com/remarkjs/remark (remark ecosystem)
- https://www.npmjs.com/package/markdown-it (markdown-it documentation)
- https://github.com/benrbray/noteworthy/discussions/16 (remark vs markdown-it comparison)
- Existing bash implementation in `claude-docs.sh` lines 276-612 (markdown transformation pipeline)

### Research Method

perplexity_search - "markdown-it vs remark unified MDX component transformation"

### Confidence Level

**High** - Based on analysis of existing bash implementation (proven to work) and constitution requirements (zero dependencies)

### Implementation Notes

```typescript
// Example transformation (simplified)
function transformMdxCallouts(content: string): string {
  return content
    .replace(/<Note>\s*/g, '\n> **📝 Note:**  \n')
    .replace(/<\/Note>/g, '\n')
    .replace(/<Tip>\s*/g, '\n> **💡 Tip:**  \n')
    .replace(/<\/Tip>/g, '\n')
    .replace(/<Warning>\s*/g, '\n> **⚠️ Warning:**  \n')
    .replace(/<\/Warning>/g, '\n');
}

// Each transformation is a pure function: string → string
// Can be tested independently, composed in a pipeline
const transformations = [
  transformMdxCallouts,
  transformMdxCards,
  transformMdxTabs,
  transformMdxSteps,
  transformCodeBlocks,
  transformInternalLinks
];

function applyMarkdownPipeline(content: string): string {
  return transformations.reduce((acc, fn) => fn(acc), content);
}
```

**Aligns with Constitution**: Zero external dependencies for markdown processing ✓

**Preserves Compatibility**: Success criteria SC-007 requires "identical output to bash implementation" - custom implementation ensures exact match

---

## 3. Diff Generation

### Decision

**Use `diff` npm package (also known as `jsdiff`)** - Justified exception to zero-dependency rule

### Rationale

Diff generation is complex algorithmic work (Myers diff algorithm) that should not be reimplemented:

**Complexity Assessment**:
- Myers diff algorithm: 500-1000 lines of well-optimized code
- Edge cases: whitespace handling, newlines, context lines, unified format serialization
- Bug-free implementation requires deep algorithmic expertise
- Maintenance burden: subtle bugs hard to diagnose

**`diff` Package Characteristics**:
- **Zero transitive dependencies**: Single package, no sub-dependencies
- **Battle-tested**: 29M downloads/week, used by major tools (GitHub, VS Code, Jest)
- **Small footprint**: ~50KB minified
- **Rich API**: Supports unified diff format, line/char/word diffs, patch application
- **Well-maintained**: Active development since 2011, responsive maintainers

**Risk vs Benefit**:
- **Risk of reimplementing**: High (bugs, edge cases, performance issues)
- **Benefit of dependency**: High (proven algorithm, full feature set, ongoing maintenance)
- **Cost**: Minimal (single zero-dep package, ~50KB)

### Alternatives Considered

#### Custom Implementation

- **Pros**:
  - Zero dependencies (aligns with constitution)
  - Full control

- **Cons**:
  - 500-1000 LOC to implement Myers algorithm
  - High risk of bugs in edge cases
  - Maintenance burden
  - Unlikely to match performance of optimized implementation
  - Violates "don't reinvent the wheel" principle for complex algorithms

#### Other Libraries

- **fast-diff**: Faster but different algorithm, doesn't produce unified format
- **node-diff3**: Three-way merge focus, overkill
- **unidiff**: Wrapper around jsdiff, adds no value

### Sources

- https://www.npmjs.com/package/diff (Official jsdiff documentation)
- https://github.com/kpdecker/jsdiff (Repository with algorithm details)
- https://news.ycombinator.com/item?id=29130661 (Performance comparisons of diff libraries)
- Myers diff algorithm paper: "An O(ND) Difference Algorithm and Its Variations" (1986)

### Research Method

perplexity_search - "Node.js diff library jsdiff vs diff npm unified diff format"

### Confidence Level

**High** - Industry standard library, zero transitive dependencies, proven track record

### Implementation Notes

```typescript
import { createTwoFilesPatch } from 'diff';

function generateDiff(
  filename: string,
  oldContent: string,
  newContent: string
): string {
  return createTwoFilesPatch(
    filename,
    filename,
    oldContent,
    newContent,
    'Current version',
    'New version',
    { context: 3 } // 3 lines of context (standard)
  );
}

// Output: standard unified diff format
/*
--- plugins.md	Current version
+++ plugins.md	New version
@@ -10,7 +10,7 @@
 context line
-old line
+new line
 context line
*/
```

**Justification against Constitution Principle II (Zero-Dependency CLI)**:
- Diff generation is complex algorithmic work beyond project scope
- `diff` package has zero transitive dependencies (single package)
- 29M weekly downloads prove it's industry standard
- Reimplementing would add 500+ LOC of algorithmic code with high bug risk
- Minimal cost (~50KB) for significant benefit (proven, maintained algorithm)

**Approved exception**: This dependency is justified and necessary

---

## Summary of Decisions

| Component | Decision | Dependencies Added | Justification |
|-----------|----------|-------------------|---------------|
| HTTP Client | Native Node.js fetch() | 0 | Built into Node.js 22 LTS |
| Markdown Processing | Custom lightweight transformations | 0 | Simple regex replacements, <300 LOC |
| Diff Generation | `diff` npm package | 1 (zero transitive) | Complex algorithm, battle-tested, industry standard |

**Total Production Dependencies**: 2
1. `commander` (CLI framework) - already approved by constitution
2. `diff` (diff generation) - justified exception

**Constitution Compliance**:
- ✅ Minimal dependencies (2 total, both zero-transitive-deps)
- ✅ Zero dependencies for HTTP and markdown (native solutions)
- ✅ Single justified exception for complex algorithmic work (diff)
- ✅ Maintains zero-dependency principle spirit while pragmatic about complexity

**Next Steps**: Proceed to Phase 1 (Design & Contracts) with these technology choices locked in.
