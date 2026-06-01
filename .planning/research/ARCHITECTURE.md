# Architecture Research

**Domain:** Java refactoring desktop assistant
**Researched:** 2026-06-01
**Confidence:** HIGH

## Recommended Architecture

### Pattern Overview

Use a lightweight desktop orchestrator architecture:
- Tauri/Rust shell for file, git, process, and safety-sensitive operations
- Minimal React UI for findings, diffs, and apply/rollback workflows
- A dedicated Java analysis/refactor pipeline that separates:
  - repository ingestion
  - local code intelligence
  - automated transformation engine
  - AI/MCP reasoning layer

This keeps semantic code changes grounded in structured tooling while still letting AI and MCP integrations add prioritization, explanation, and contextual research.

## Major Components

**Workspace Intake Layer:**
- Purpose: Open Maven/Gradle repositories, detect modules, source roots, build files, and git presence
- Likely implementation: adapt current workspace, file-tree, and git primitives in `src-tauri/src/modules/workspace.rs`, `src-tauri/src/modules/fs/`, and `src-tauri/src/modules/git/`
- Build order: first, because every downstream feature needs a trusted repo model

**Local Code Intelligence Layer:**
- Purpose: Build an internal understanding of classes, packages, methods, smells, hotspots, and candidate refactor targets
- Suggested tools: OpenRewrite metadata where possible, plus JavaParser/JDT/Spoon where heuristic or custom analysis is needed
- Build order: second, because prioritized findings depend on it

**Refactor Engine Layer:**
- Purpose: Execute safe Java changes through structured recipes or transformations
- Suggested tools: OpenRewrite as the primary engine for modernization and safe bulk refactors
- Build order: third, after repository and analysis layers are stable

**MCP Tool Hub Layer:**
- Purpose: Query live docs, code examples, and future tools without weakening local-first repo analysis
- Suggested tools: Exa MCP for code/web context, Context7 MCP for version-specific docs
- Build order: can start in parallel with the analysis experience, but should plug into findings and review rather than exist as standalone chat-only tooling

**Safety and Apply Layer:**
- Purpose: Create backups, integrate git-aware safety, gate mutations behind review, and enable rollback
- Likely implementation: extend current diff/apply and git primitives in the workspace
- Build order: required before any real repo writes ship

**Minimal Review UI Layer:**
- Purpose: Display findings, rationale, diffs, backup status, and apply controls in a specialized lightweight workflow
- Likely implementation: repurpose existing editor, diff, AI, and settings surfaces rather than keeping the current generic terminal-first UX
- Build order: develops alongside the other layers, but should stay thin and specialized

## Data Flow

**Primary refactor flow:**

1. User opens a Java Maven/Gradle repository
2. Workspace intake detects build layout, modules, and git state
3. Local code intelligence indexes the repository and identifies candidate issues
4. MCP tools optionally enrich findings with docs, examples, and implementation guidance
5. The app builds a prioritized refactor plan
6. User reviews findings and diffs
7. The app creates backup copies and records git safety info
8. Structured refactor engine applies approved changes
9. User verifies results and can roll back if needed

## Suggested Build Order

1. Workspace intake and Java repo detection
2. Findings model and minimal refactor dashboard
3. Local code intelligence for smell and hotspot detection
4. Diff review and backup/git safety flow
5. Structured refactor execution through OpenRewrite
6. MCP tool hub integration into findings/research
7. Optional autonomous batch mode

## Architecture Notes

- Keep AI reasoning advisory around a deterministic refactor pipeline wherever possible
- Avoid making MCP tools the source of truth for local repository facts
- Let the Rust side continue owning all file/process/network safety boundaries
- Keep the UI intentionally thinner than a full IDE, with diffs and findings at the center

## Sources

- OpenRewrite official docs
- Context7 MCP docs
- Exa Code docs
- MCP Java SDK docs
- Existing workspace architecture in `.planning/codebase/ARCHITECTURE.md`

---
*Architecture research for: Java refactoring desktop assistant*
*Researched: 2026-06-01*
