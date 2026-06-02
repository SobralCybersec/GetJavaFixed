# Coding Conventions

**Analysis Date:** 2026-06-01

## Naming Patterns

**Files:**
- React components usually use PascalCase filenames such as `App.tsx`, `TerminalPane.tsx`, `PreviewPane.tsx`, and `ProviderKeyCard.tsx`
- Feature utilities and hooks use descriptive camel or kebab forms such as `useTerminalSession.ts`, `pty-bridge.ts`, `osc-handlers.ts`, and `pathUtils.ts`
- Test files are collocated as `*.test.ts` for frontend logic and either module-local `#[cfg(test)]` blocks or `src-tauri/tests/*.rs` for Rust

**Functions:**
- camelCase in TypeScript and snake_case in Rust command names that mirror Tauri IPC surfaces, for example `workspaceAuthorize` on the frontend boundary and `workspace_authorize` in Rust
- Event handlers in React use `handle*`, `on*`, or verb-first names such as `handlePreviewUrl`, `toggleSidebar`, `switchWorkspace`
- Async functions do not use a special prefix; `async` is conveyed by signature

**Variables and constants:**
- camelCase for most locals and state values
- UPPER_SNAKE_CASE for fixed constants such as `SIDEBAR_MIN_WIDTH`, `HEADER_BLOCKLIST`, and `WRITE_DENY_PREFIXES`
- Types and aliases use PascalCase, for example `WorkspaceEnv`, `AiStreamEvent`, and `TerminalPaneHandle`

## Code Style

**Formatting:**
- TypeScript uses semicolons, double quotes are uncommon, and import blocks are grouped with blank lines between logical groups
- Rust favors small helper functions, `Result<_, String>` command boundaries, and explicit early returns
- Comments are sparse and usually explain why, especially around platform-specific or security-sensitive code

**Linting and checks:**
- No explicit ESLint config was found in the repo snapshot
- Documented checks are `pnpm exec tsc --noEmit`, `pnpm test`, `cargo clippy`, and `cargo test --locked` from `TERAX.md`
- `CONTRIBUTING.md` expects typecheck, clippy, and tests to stay clean

## Import Organization

**TypeScript order:**
1. Shared UI or utility imports from `@/`
2. Feature module imports from `@/modules/...`
3. Tauri or third-party package imports
4. React and type imports as needed

**Grouping:**
- Internal aliases are strongly preferred over long relative imports; `TERAX.md` explicitly says to use `@/...`
- Type-only imports are used when practical, for example `import type { SearchAddon }`

**Rust modules:**
- `pub mod` declarations live in `src-tauri/src/modules/mod.rs`
- Command registration is centralized in `src-tauri/src/lib.rs`

## Error Handling

**Patterns:**
- Validate at boundaries, then return a descriptive `Err(String)` from native commands
- Frontend bootstrapping and listener setup often use best-effort `.catch(() => {})` when failure should not crash the app
- Security-sensitive paths reject aggressively, especially in `src/modules/ai/lib/security.ts`, `src-tauri/src/modules/workspace.rs`, and `src-tauri/src/modules/net.rs`

**Error types:**
- Rust business logic tends to convert lower-level failures into user-facing strings
- Tests assert specific failure categories where behavior matters, for example invalid git commit messages and unauthorized workspace paths

## Logging

**Framework:**
- Native logging uses `tauri-plugin-log`, initialized in `src-tauri/src/lib.rs`
- Frontend logging is light and usually `console.error` or `console.warn` around recoverable failures

**Patterns:**
- Log or surface at subsystem boundaries rather than deep inside every helper
- Comments often substitute for verbose logging in fragile sections

## Comments

**When to comment:**
- Explain platform quirks, race conditions, or security reasoning
- Avoid obvious narration; many files intentionally have no comments except around tricky edges
- Product-level instructions in `TERAX.md` explicitly discourage filler comments and generic AI phrasing

**TODO comments:**
- There is little evidence of active `TODO`/`FIXME` markers in source; the codebase relies more on tests and docs than inline backlog comments

## Function Design

**Frontend:**
- Pure helpers are commonly extracted under `lib/` folders
- Components remain large in some coordinator files like `src/app/App.tsx`, but module boundaries keep feature logic separated
- Early returns and guard clauses are common

**Rust:**
- Command handlers are thin facades over helper functions and modules
- Shared policy logic is centralized in reusable functions such as `checkReadable`, `authorize_spawn_cwd`, and `classify_and_collect_safe_ips`

## Module Design

**Exports:**
- `index.ts` barrels define public module surfaces across `src/modules/*`
- Default exports are used mainly for React components like `App`
- Rust feature areas are grouped under `src-tauri/src/modules/<area>/`

**Barrels and boundaries:**
- New frontend code should normally live inside the matching feature module and only expose a thin barrel
- Cross-module imports should use public module surfaces where possible to avoid accidental deep coupling

---
*Convention analysis: 2026-06-01*
*Update when patterns change*
