# Terax Java Refactor AI Assistant

## What This Is

This project repurposes the existing Terax Tauri desktop workspace into a lightweight Java Refactor AI Assistant for general and enterprise developers. It should let a user open a plain Java Maven or Gradle repository, analyze it with local code intelligence plus MCP-connected tools, review prioritized refactor plans with diffs, and safely apply changes with backup and rollback paths.

The current codebase already provides a strong desktop shell, editor, terminal, AI tool surface, settings, and native safety boundaries. The new product direction is to specialize that foundation around Java refactoring, documentation-backed reasoning, and safer code transformation workflows instead of a general AI-native terminal experience.

## Core Value

A Java developer can safely refactor a real repository faster with AI, while keeping full review, backup, and rollback control.

## Requirements

### Validated

- ✓ Cross-platform Tauri desktop shell exists with React frontend and Rust native backend — existing
- ✓ Native file-system, shell, workspace authorization, git, and search primitives exist in `src-tauri/src/modules/` — existing
- ✓ AI chat/tooling foundation exists with approval-gated file and command actions in `src/modules/ai/` — existing
- ✓ Multi-pane editor, terminal, preview, and settings infrastructure already exists and can be repurposed instead of rebuilt — existing
- ✓ Local secret storage, updater support, and desktop notification plumbing are already in place — existing
- ✓ User can open a plain Java Maven or Gradle repository as the primary workspace — validated in Phase 1
- ✓ User can trigger repo-wide analysis from the app entry flow without terminal-first fallback — validated in Phase 1
- ✓ User can get principle-aware prioritized findings in a dedicated Java-first shell — validated in Phase 1

### Active

- [ ] User can trigger repo-wide analysis for performance, modernization, and safe refactor opportunities
- [ ] User can use local code intelligence to understand repository structure, issues, and candidate refactor targets
- [ ] User can enrich analysis with MCP-connected tools such as Exa web search, Context7, and other approved integrations
- [ ] User can review a prioritized refactor plan in a minimal custom UI before any changes are applied
- [ ] User can inspect diffs for suggested refactors before applying them
- [ ] User gets backup-copy safety before file changes are written
- [ ] User gets git-based safety and rollback help when the opened workspace is a git repository
- [ ] User can apply approved refactors to the repository from the app
- [ ] User can optionally run a more autonomous refactor pass after explicit opt-in
- [ ] User can integrate GitHub Actions-based quality and security checks for Java repositories as part of the workflow

### Out of Scope

- Generic polyglot assistant positioning — the product is being narrowed to Java refactor workflows first
- Heavy IDE replacement features beyond what is needed for analysis, diff review, and safe apply — the goal is a lightweight specialized desktop app
- Broad framework-specific support beyond plain Java Maven/Gradle repos in v1 — Spring-aware or other ecosystem-deep behaviors can follow after the core Java path is solid
- Fully unattended refactoring by default — review-first safety remains the primary behavior even if autonomous mode is offered as an explicit option

## Context

This is a brownfield transformation, not a greenfield build. The existing Terax codebase already has strong primitives that are directly useful for the new product direction: native workspace authorization, git operations, file read/write/search, terminal and shell execution, AI tool approvals, persisted settings, and a lightweight Tauri desktop shell.

The product direction is to stop behaving like a general AI-native terminal emulator and instead behave like a specialized Java refactor assistant with a minimal UI. The app should keep using the current workspace and architecture as its implementation base, but evolve its behavior, flows, and surface area toward Java repository analysis, doc-backed reasoning, safe code changes, and enterprise-friendly safety controls.

The desired user flow for v1 is:
open repo -> index project -> detect issues -> fetch docs/context -> show prioritized refactor plan -> review diffs -> create backup -> apply -> allow rollback

External context is important, not optional. The future tool hub should support MCP-oriented integrations such as Exa web search, Context7, and related tools that improve reasoning quality and documentation lookup for Java refactors.

Repository automation is also part of the product direction. The app should help teams wire Java-appropriate GitHub Actions quality and security checks into repositories so refactors can be validated by CI, analogous to how web projects often rely on ESLint and related checks.

## Constraints

- **Tech stack**: Reuse the current Tauri + React + Rust architecture — the project should evolve the existing workspace instead of rebuilding from scratch
- **UI scope**: Keep the UI minimal and lightweight — avoid turning the product into a full IDE replacement
- **Primary domain**: Plain Java Maven/Gradle repositories first — v1 should not overextend into every Java ecosystem variant
- **Safety**: Review before apply is the default — automatic changes must preserve backup and rollback paths
- **Version control**: Git-based safety should be used where available — repository-aware rollback is part of the value proposition
- **Performance**: The product should stay lightweight — new behavior should not undermine the existing thin desktop-shell advantage
- **Security**: MCP and tool integrations must respect the current native boundary and approval model — no bypassing existing workspace, file, or network safety controls

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Reuse the Terax codebase as the base product | Existing native shell, AI tooling, git, file, and safety primitives significantly reduce build time | — Pending |
| Narrow the product to a Java Refactor AI Assistant | Specialization creates clearer value than a generic AI terminal | — Pending |
| Target plain Java Maven/Gradle repos first | Keeps v1 broad enough to be useful but constrained enough to execute | — Pending |
| Make review-before-apply the default workflow | Safety and trust matter more than raw autonomy for repo-wide refactors | — Pending |
| Support autonomous refactor mode only as an explicit option | Preserves future power-user value without making risky behavior the default | — Pending |
| Use minimal custom Tauri UI instead of a full IDE-like experience | Matches the lightweight product goal and existing user direction | — Pending |
| Include MCP tool-hub capability with local code intelligence | External docs and search context are part of the intended differentiation | — Pending |

## Evolution

## Current State

Phase 1 is complete. App now opens into a dedicated Java intake flow, validates Maven or Gradle roots through native readiness checks, and routes supported repositories into a findings-first dashboard with watch-only analysis progress and right-side detail review.

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check -> still the right priority?
3. Audit Out of Scope -> reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-01 after Phase 1 completion*
