# Testing Patterns

**Analysis Date:** 2026-06-01

## Test Framework

**Runner:**
- Vitest 2.1.9 for frontend and utility tests, configured implicitly through Vite tooling in `package.json`
- Rust built-in test harness for native modules and integration-like tests under `src-tauri/tests/`

**Assertion Library:**
- Vitest built-in `expect`
- Rust `assert_eq!`, `assert!`, and pattern matches in native tests

**Run Commands:**
```bash
pnpm test                              # Run frontend tests
pnpm test -- --watch                   # Watch mode
pnpm exec tsc --noEmit                 # Frontend type-check
cd src-tauri && cargo test --locked    # Native tests
cd src-tauri && cargo clippy           # Native linting gate
```

## Test File Organization

**Location:**
- Frontend tests are collocated with source, for example `src/lib/shellQuote.test.ts`, `src/modules/preview/PreviewPane.test.ts`, `src/modules/ai/lib/security.test.ts`
- Native integration-style tests live in `src-tauri/tests/`
- Additional Rust unit tests live inside implementation files such as `src-tauri/src/modules/net.rs` and `src-tauri/src/modules/workspace.rs`

**Naming:**
- `*.test.ts` for TypeScript/Vitest
- `*.rs` in `src-tauri/tests/` for Rust integration-style scenarios

**Structure:**
```text
src/
  lib/
    shellQuote.ts
    shellQuote.test.ts
  modules/
    preview/
      PreviewPane.tsx
      PreviewPane.test.ts
src-tauri/
  tests/
    git_operations.rs
    fs_search.rs
```

## Test Structure

**Suite Organization:**
- Vitest suites use `describe` and `it`, usually grouping by exported function or subsystem
- Rust tests create focused fixtures and assert exact invariants, especially around filesystem auth, git behavior, and shell process lifecycle

**Patterns:**
- Frontend tests are mostly pure-unit or source-structure checks rather than DOM-heavy integration tests
- Rust tests prefer explicit fixture setup helpers, for example `src-tauri/tests/common/mod.rs`
- Security-sensitive logic gets regression-style coverage, especially in `src/modules/ai/lib/security.test.ts`

## Mocking

**Framework:**
- Vitest `vi` is used where needed, such as `src/modules/terminal/lib/osc-handlers.test.ts`

**Patterns:**
- Most frontend tests target pure helpers and avoid heavy mocking
- String/source inspection is used for some UI security tests, for example `src/modules/preview/PreviewPane.test.ts` checks iframe sandbox attributes by reading JSX text
- Rust tests prefer real temp directories and subprocesses over pervasive mocking

## Fixtures and Factories

**Test Data:**
- Rust side uses temp directories and helper fixtures from `src-tauri/tests/common/mod.rs`
- TypeScript tests usually inline inputs directly in the test file because the units are small and deterministic

**Location:**
- Shared Rust helpers: `src-tauri/tests/common/mod.rs`
- No dedicated frontend `fixtures/` tree was found in this snapshot

## Coverage

**Observed focus areas:**
- Frontend utility/security behavior: shell quoting, terminal OSC parsing, preview sandboxing, AI mini-window geometry, AI path safety
- Native behavior: git operations, file search/glob, shell background processes, workspace auth, network SSRF classification

**Gaps:**
- No evidence of broad UI interaction or end-to-end automation in the checked-in repo
- Large coordinator surfaces like `src/app/App.tsx` and many feature panels rely on indirect coverage rather than dedicated component tests

## Test Types

**Unit Tests:**
- Pure frontend helper logic in `src/lib/` and `src/modules/**/lib/`
- Rust unit tests embedded near native helper functions

**Integration Tests:**
- `src-tauri/tests/git_operations.rs` exercises real git repos in temp directories
- `src-tauri/tests/fs_search.rs` exercises file discovery and grep behavior against generated trees
- `src-tauri/tests/shell_background.rs` verifies subprocess lifecycle and log capture

**E2E Tests:**
- None found in the current snapshot

## Common Patterns

**Async testing:**
- Vitest uses `async` tests when needed; Rust tests rely on synchronous fixture execution for most native modules

**Error testing:**
- Frontend uses explicit `expect(...).toMatchObject` and similar matchers for rejected safety decisions
- Rust tests match exact error variants or messages when validation behavior is part of the contract

**Snapshot testing:**
- No snapshot tests were found

---
*Testing analysis: 2026-06-01*
*Update when test patterns change*
