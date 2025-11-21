# AI-Friendly Output Refactor Plan

**Goal**: Refactor all commands to use structured JSON internally, then render appropriately based on output mode (AI/User/JSON).

## Phase 1: Audit Current Commands & Design JSON Schemas

### Commands to Audit (11 total)

#### Core Commands (AI-visible)
1. `list [doc]` - List all docs or sections within a doc
2. `get <slug>` - Get documentation section
3. `search <query>` - Search documentation

#### Update Commands (Conditionally visible to AI)
4. `update check` - Check for updates
5. `update commit <message>` - Apply pending updates
6. `update discard` - Discard pending updates
7. `update status` - Show update status and history

#### Cache Commands (Not AI-visible)
8. `cache clear` - Clear cache
9. `cache info` - Show cache stats
10. `cache warm` - Pre-generate cache

#### Utility Commands (User-only)
11. `doctor` - Health checks

---

## Command Output Analysis

### 1. `list [doc]` Command

**Current Output (User Mode):**
```
📚 Available Documentation (44 sections)

cli-reference
quickstart
plugins
...
```

**Proposed JSON Schema:**
```typescript
interface ListResult {
  type: 'list_all' | 'list_sections';
  items: Array<{
    slug: string;
    title: string;
    sectionCount?: number;  // for list_all
    level?: number;         // for list_sections
  }>;
  metadata: {
    totalCount: number;
    dataAge: number;  // hours since last update
    lastUpdate: string;  // ISO timestamp
  };
}
```

**AI-Rendered Output (Markdown Table):**
```markdown
# Available Documentation

| Slug | Title | Sections |
|------|-------|----------|
| cli-reference | CLI Reference | 15 |
| quickstart | Quick Start Guide | 8 |
| plugins | Plugin Development | 12 |

Total: 44 documents

---
📊 Dataset age: 2 hours (fresh)
```

**Stale Data Warning (>24h):**
```markdown
⚠️ **Documentation may be outdated** (last update: 36 hours ago)

To refresh: `claude-docs update`
```

---

### 2. `get <slug>` Command

**Current Output:**
```
# CLI Reference

## Installation
[content]

## Usage
[content]
```

**Proposed JSON Schema:**
```typescript
interface GetResult {
  slug: string;
  title: string;
  content: string;  // markdown content
  anchor?: string;  // if #anchor was used
  metadata: {
    source: string;  // original file name
    lastUpdate: string;
    dataAge: number;
    sectionCount: number;
  };
}
```

**AI-Rendered Output:**
```markdown
# CLI Reference

[actual content here - unchanged]

---
📊 Source: cli-reference
📅 Last updated: 2 hours ago
```

---

### 3. `search <query>` Command

**Current Output:**
```
Found 5 results for "hooks"

📄 hooks (line 12)
   Configure hooks for tool events
   Context: ...

📄 settings (line 45)
   Hook configuration in settings
   Context: ...
```

**Proposed JSON Schema:**
```typescript
interface SearchResult {
  query: string;
  results: Array<{
    slug: string;
    title: string;
    lineNumber: number;
    matchedText: string;
    context: string;
    relevanceScore?: number;
  }>;
  metadata: {
    totalResults: number;
    searchTime: number;  // ms
    dataAge: number;
  };
}
```

**AI-Rendered Output:**
```markdown
# Search Results: "hooks"

| Document | Line | Match | Context |
|----------|------|-------|---------|
| hooks | 12 | Configure hooks... | Configure hooks for tool events |
| settings | 45 | Hook configuration... | Hook configuration in settings |

Found: 5 results
Search time: 23ms

---
📊 Dataset age: 2 hours
```

---

### 4. `update check` Command

**Current Output:**
```
🔄 Checking for updates...
✅ Updates available (3 sections)
```

**Proposed JSON Schema:**
```typescript
interface UpdateCheckResult {
  updateAvailable: boolean;
  changes?: {
    added: string[];
    modified: string[];
    deleted: string[];
  };
  stats: {
    totalChanges: number;
    currentVersion: string;
    remoteVersion: string;
  };
  metadata: {
    lastCheck: string;
    lastUpdate: string;
  };
}
```

**AI-Rendered Output:**
```markdown
# Update Check

Status: Updates available

Changes:
- Added: 2 sections
- Modified: 1 section
- Deleted: 0 sections

Current version: 2024-11-20
Remote version: 2024-11-21

To apply updates: `claude-docs update commit "update message"`
```

---

### 5. `update commit <message>` Command

**Current Output:**
```
✅ Download complete!
📊 Summary:
   Total sections: 44
   Downloaded: 3
   Skipped: 41
```

**Proposed JSON Schema:**
```typescript
interface UpdateCommitResult {
  success: boolean;
  summary: {
    total: number;
    downloaded: number;
    skipped: number;
    failed: number;
    failedFiles?: string[];
  };
  changelogEntry: {
    message: string;
    timestamp: string;
  };
  metadata: {
    duration: number;  // ms
    newVersion: string;
  };
}
```

**AI-Rendered Output:**
```markdown
# Update Applied

Summary:
- Downloaded: 3 sections
- Skipped: 41 sections (unchanged)
- Failed: 0 sections

Changelog entry created:
"update message" (2024-11-21T12:30:00Z)

Dataset version: 2024-11-21
Duration: 1.2s
```

---

### 6. `update discard` Command

**Proposed JSON Schema:**
```typescript
interface UpdateDiscardResult {
  success: boolean;
  discarded: {
    pendingFiles: number;
    fileList: string[];
  };
}
```

---

### 7. `update status` Command

**Proposed JSON Schema:**
```typescript
interface UpdateStatusResult {
  installed: boolean;
  dataAge: number;  // hours
  lastUpdate?: string;
  pendingUpdates: boolean;
  changelogEntries: Array<{
    timestamp: string;
    message: string;
  }>;
  stats: {
    totalDocs: number;
    cacheSize: string;  // e.g., "2.3 MB"
  };
}
```

---

### 8-10. Cache Commands

**Proposed JSON Schema:**
```typescript
interface CacheInfoResult {
  exists: boolean;
  stats: {
    totalFiles: number;
    totalSize: string;
    oldestFile: string;
    newestFile: string;
  };
}

interface CacheClearResult {
  success: boolean;
  filesDeleted: number;
  spaceFreed: string;
}

interface CacheWarmResult {
  success: boolean;
  filesGenerated: number;
  duration: number;
}
```

---

### 11. `doctor` Command

**Proposed JSON Schema:**
```typescript
interface DoctorResult {
  overallStatus: 'healthy' | 'warnings' | 'failed';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    suggestion?: string;
  }>;
}
```

---

## Phase 2: Implementation Plan

### Step 1: Create Type Definitions
**File**: `src/types/command-results.ts`
- Define all `CommandResult<T>` interfaces
- Export all result types

### Step 2: Create Renderer System
**File**: `src/lib/renderer.ts`
```typescript
interface Renderer {
  render(result: CommandResult<unknown>): string;
}

class AIRenderer implements Renderer {
  // Structured markdown tables
  // Contextual warnings
  // Filtered command visibility
}

class UserRenderer implements Renderer {
  // Current colorful output
  // All commands visible
}

class JSONRenderer implements Renderer {
  // JSON.stringify with formatting
}

export function createRenderer(mode: 'ai' | 'user' | 'json'): Renderer {
  // Factory pattern
}
```

### Step 3: Refactor Commands (One at a Time)
**Priority order:**
1. `list` - Simplest, good test case
2. `get` - Core functionality
3. `search` - Complex but well-defined
4. `update status` - Metadata command
5. `update check/commit/discard` - State-changing
6. `cache` commands - Low priority
7. `doctor` - Just implemented

### Step 4: Command Visibility System
**File**: `src/utils/command-visibility.ts`
```typescript
interface CommandMeta {
  name: string;
  visibleInAI: boolean;
  showCondition?: (metadata: { dataAge: number }) => boolean;
}

const COMMAND_REGISTRY: CommandMeta[] = [
  { name: 'list', visibleInAI: true },
  { name: 'get', visibleInAI: true },
  { name: 'search', visibleInAI: true },
  {
    name: 'update',
    visibleInAI: false,
    showCondition: (meta) => meta.dataAge > 24
  },
  { name: 'cache', visibleInAI: false },
  { name: 'doctor', visibleInAI: false },
];
```

### Step 5: Update CLI Entry Point
Modify `src/cli.ts` to:
- Filter commands based on mode
- Pass renderer to commands
- Handle --output flag globally

---

## Review Checkpoint: JSON Output Examples

Before we implement, let's review what each command should return as JSON:

**`list` example:**
```json
{
  "success": true,
  "data": {
    "type": "list_all",
    "items": [
      { "slug": "cli-reference", "title": "CLI Reference", "sectionCount": 15 },
      { "slug": "quickstart", "title": "Quick Start", "sectionCount": 8 }
    ],
    "metadata": {
      "totalCount": 44,
      "dataAge": 2,
      "lastUpdate": "2024-11-21T10:30:00Z"
    }
  }
}
```

**`get cli-reference` example:**
```json
{
  "success": true,
  "data": {
    "slug": "cli-reference",
    "title": "CLI Reference",
    "content": "# CLI Reference\n\n## Installation\n...",
    "metadata": {
      "source": "cli-reference.md",
      "lastUpdate": "2024-11-21T10:30:00Z",
      "dataAge": 2,
      "sectionCount": 15
    }
  }
}
```

**`search "hooks"` example:**
```json
{
  "success": true,
  "data": {
    "query": "hooks",
    "results": [
      {
        "slug": "hooks",
        "title": "Hooks",
        "lineNumber": 12,
        "matchedText": "Configure hooks for tool events",
        "context": "You can configure hooks...",
        "relevanceScore": 0.95
      }
    ],
    "metadata": {
      "totalResults": 5,
      "searchTime": 23,
      "dataAge": 2
    }
  }
}
```

**Questions for Review:**

1. **Is this JSON structure sufficient?** Missing any critical data?
2. **Metadata placement**: Should `dataAge` be in every response or top-level?
3. **Error format**: Should errors follow same structure?
   ```json
   {
     "success": false,
     "error": {
       "code": "DOC_NOT_FOUND",
       "message": "Documentation 'invalid-slug' not found",
       "suggestion": "Run 'claude-docs list' to see available docs"
     }
   }
   ```

Should I proceed with creating the type definitions and a small proof-of-concept with the `list` command?