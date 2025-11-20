---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs: 
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Phase 1: Update agent context by running the agent script
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   For each unknown in Technical Context, use Perplexity MCP tools to conduct research:

   **Research Tool Selection:**
   - Use `mcp__plugin_perplexity_perplexity__perplexity_search` for finding specific documentation, libraries, examples, or quick factual lookups (DEFAULT - use this for most research)
   - Use `mcp__plugin_perplexity_perplexity__perplexity_reason` for comparing alternatives and making technical decisions
   - Use `mcp__plugin_perplexity_perplexity__perplexity_research` ONLY for highly complex architectural decisions requiring deep analysis (use sparingly - very time-intensive)

   **Research Tasks:**
   ```text
   For each unknown in Technical Context:
     1. Use perplexity_search to find relevant documentation, tutorials, or examples
     2. If comparing 3+ alternatives: Use perplexity_reason to evaluate options
     3. ONLY if architecturally complex: Use perplexity_research for deep analysis

   For each technology choice:
     1. Use perplexity_search to find "{tech} best practices in {domain}"
     2. Use perplexity_reason to compare options and justify the chosen approach
   ```

   **Research Output Requirements:**
   - Include citations from Perplexity responses in research.md
   - Document alternatives considered with sources
   - Capture reasoning chain for technical decisions

3. **Consolidate findings** in `research.md` using format:

   For each research topic, include:
   - **Decision**: [what was chosen]
   - **Rationale**: [why chosen with reasoning from perplexity_reason]
   - **Alternatives considered**: [what else evaluated]
   - **Sources**: [citations from Perplexity - URLs or references]
   - **Research Method**: [which Perplexity tool(s) used: search/reason/research]
   - **Confidence Level**: [High/Medium/Low based on source quality and consensus]

   **Example Entry:**
   ```markdown
   ## Database Technology Choice

   - **Decision**: PostgreSQL 15
   - **Rationale**: Best support for JSONB queries needed for dynamic schemas, proven at scale for analytics workloads, strong TypeScript ORM support
   - **Alternatives considered**:
     - MongoDB: Rejected due to weaker transactional guarantees
     - MySQL: Rejected due to limited JSON query capabilities
   - **Sources**:
     - https://www.postgresql.org/docs/15/datatype-json.html
     - Stack Overflow Developer Survey 2024 - Database preferences
   - **Research Method**: perplexity_search for benchmarks, perplexity_reason for comparison
   - **Confidence Level**: High (multiple production references, official docs)
   ```

**Output**: research.md with all NEEDS CLARIFICATION resolved, including citations and sources

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Agent context update**:
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
   - These scripts detect which AI agent is in use
   - Update the appropriate agent-specific context file
   - Add only new technology from current plan
   - Preserve manual additions between markers

**Output**: data-model.md, /contracts/*, quickstart.md, agent-specific file

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications
