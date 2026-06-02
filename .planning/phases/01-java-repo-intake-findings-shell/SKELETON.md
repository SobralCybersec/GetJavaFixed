# Walking Skeleton — Terax Java Refactor AI Assistant

**Phase:** 1
**Generated:** 2026-06-01

## Capability Proven End-to-End

A user can choose a Java Maven or Gradle repository, pass strict selected-root readiness, enter a findings-first dashboard, and start a watch-only analysis from the desktop app.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Tauri 2 + React 19 + Rust modules | Reuses the existing desktop shell and native boundary exactly as the project constraints require. |
| Data layer | No new database; Phase 1 uses in-memory/dashboard state plus existing Tauri store only where already present | The walking skeleton is a UI and native-workflow slice, not a persistence project. |
| Auth | None in Phase 1 | The app is local-first and Phase 1 introduces no user-auth surface. |
| Deployment target | Local Tauri desktop runtime | Phase 1 proves the specialized desktop workflow in the current app environment. |
| Directory layout | Feature folders under `src/modules/*` with native support under `src-tauri/src/modules/*` | Matches existing module boundaries and keeps intake/findings work isolated from generic shell code. |

## Stack Touched in Phase 1

- [x] Project scaffold (framework, build, lint, test runner)
- [x] Routing — at least one real route
- [ ] Database — at least one real read AND one real write
- [x] UI — at least one interactive element wired to the API
- [x] Deployment — running on dev environment OR documented local full-stack run command

## Out of Scope (Deferred to Later Slices)

- Full Java engine selection between OpenRewrite and deeper parser mixes
- Diff review, apply, backup, rollback, or git-aware safety controls
- MCP-backed documentation/tool hub workflows
- Generic terminal-first onboarding and full IDE-style navigation

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: trustworthy analysis, diff review, backup, and rollback
- Phase 3: structured refactor apply flows, MCP tool hub, and CI generation
- Phase 4: explicit opt-in grouped and autonomous execution with hardened trust controls
