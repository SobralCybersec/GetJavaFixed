TERAX.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Terax Java Refactor AI Assistant**

This project repurposes the existing Terax Tauri desktop workspace into a lightweight Java Refactor AI Assistant for general and enterprise developers. It should let a user open a plain Java Maven or Gradle repository, analyze it with local code intelligence plus MCP-connected tools, review prioritized refactor plans with diffs, and safely apply changes with backup and rollback paths.

The current codebase already provides a strong desktop shell, editor, terminal, AI tool surface, settings, and native safety boundaries. The new product direction is to specialize that foundation around Java refactoring, documentation-backed reasoning, and safer code transformation workflows instead of a general AI-native terminal experience.

**Core Value:** A Java developer can safely refactor a real repository faster with AI, while keeping full review, backup, and rollback control.

### Constraints

- **Tech stack**: Reuse the current Tauri + React + Rust architecture — the project should evolve the existing workspace instead of rebuilding from scratch
- **UI scope**: Keep the UI minimal and lightweight — avoid turning the product into a full IDE replacement
- **Primary domain**: Plain Java Maven/Gradle repositories first — v1 should not overextend into every Java ecosystem variant
- **Safety**: Review before apply is the default — automatic changes must preserve backup and rollback paths
- **Version control**: Git-based safety should be used where available — repository-aware rollback is part of the value proposition
- **Performance**: The product should stay lightweight — new behavior should not undermine the existing thin desktop-shell advantage
- **Security**: MCP and tool integrations must respect the current native boundary and approval model — no bypassing existing workspace, file, or network safety controls
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.x - Frontend application code under `src/`, settings window code under `src/settings/`, and test files such as `src/modules/ai/lib/security.test.ts`
- Rust 2021 edition - Tauri backend, OS integration, PTY, file system, git, networking, and native tests under `src-tauri/src/` and `src-tauri/tests/`
- CSS - Global styling and theme tokens in `src/styles/globals.css`, `src/styles/fonts.css`, and `src/styles/code-highlight.css`
- PowerShell, Bash, Zsh, Fish - Terminal bootstrap scripts in `src-tauri/src/modules/pty/scripts/`
- NSIS script fragments - Windows installer hook in `src-tauri/installer-hooks.nsh`
## Runtime
- Node.js-compatible frontend toolchain via Vite and pnpm; no explicit `engines` field is pinned in `package.json`
- Tauri 2 desktop runtime hosting a React webview and Rust native process
- Browser runtime inside the Tauri webview for UI rendering, xterm.js, CodeMirror, and AI chat surfaces
- pnpm - required by project docs in `TERAX.md`
- Lockfiles: `pnpm-lock.yaml` and `src-tauri/Cargo.lock` are present
## Frameworks
- Tauri 2 - desktop shell and IPC boundary, configured in `src-tauri/tauri.conf.json`
- React 19.1 - main UI framework, entry points in `src/main.tsx` and `src/app/App.tsx`
- Vite 7 - frontend dev server and bundler, configured in `vite.config.ts`
- Tailwind CSS v4 - styling foundation referenced from `src/styles/globals.css`
- xterm.js 6 with addons - terminal rendering in `src/modules/terminal/`
- CodeMirror 6 - editor and diff surfaces in `src/modules/editor/`
- Vercel AI SDK 6 (`ai`, `@ai-sdk/*`, `@ai-sdk/react`) - provider abstraction, chat transport, and agent orchestration in `src/modules/ai/`
- Vitest 2.1 - frontend and utility tests run by `pnpm test`
- Rust test harness + `cargo test --locked` - native unit and integration tests in `src-tauri/tests/`
## Key Dependencies
- `@tauri-apps/api` and Tauri plugins - frontend bridge to native capabilities such as store, updater, opener, notification, and OS APIs
- `portable-pty` - cross-platform PTY implementation backing terminal tabs in `src-tauri/src/modules/pty/`
- `@xterm/xterm` plus addons - interactive terminal rendering in `src/modules/terminal/`
- `@uiw/react-codemirror` and CodeMirror packages - editor, diff, and autocomplete surfaces in `src/modules/editor/`
- `ai` and provider packages such as `@ai-sdk/openai`, `@ai-sdk/anthropic`, and `@ai-sdk/openai-compatible` - BYOK AI integration in `src/modules/ai/lib/agent.ts`
- `reqwest` with `rustls-tls` - Rust-side AI HTTP proxy in `src-tauri/src/modules/net.rs`
- `ignore`, `grep-*`, and `globset` crates - file search and grep features in `src-tauri/src/modules/fs/search.rs` and `src-tauri/src/modules/fs/grep.rs`
- `keyring` crate - OS-backed secret storage in `src-tauri/src/modules/secrets.rs`
## Configuration
- Provider API keys are not stored in files; they flow through keyring-backed commands from `src/modules/ai/lib/keyring.ts` to `src-tauri/src/modules/secrets.rs`
- Frontend preferences and persisted sessions use Tauri store files via `LazyStore` in `src/modules/settings/store.ts`, `src/modules/ai/lib/sessions.ts`, and related modules
- `package.json` - frontend scripts and dependencies
- `tsconfig.json` and `tsconfig.node.json` - TypeScript compiler settings
- `vite.config.ts` - path alias and frontend build wiring
- `src-tauri/Cargo.toml` - Rust dependencies and release profile
- `src-tauri/tauri.conf.json`, `src-tauri/tauri.windows.conf.json`, `src-tauri/tauri.linux.conf.json` - desktop packaging and platform overrides
- `src-tauri/capabilities/default.json` - webview permission allowlist
## Platform Requirements
- Cross-platform target: Windows, macOS, Linux
- Requires pnpm for frontend workflows and Cargo/Rust toolchain for native builds
- Local Tauri development expects `pnpm dev` plus `cargo` toolchain and platform-specific WebView prerequisites
- Distributed as a Tauri desktop application with `bundle.targets = "all"` in `src-tauri/tauri.conf.json`
- Windows installer uses NSIS in current-user mode and downloads the WebView2 bootstrapper
- Linux bundles depend on `libwebkit2gtk-4.1-0` and `libgtk-3-0`
- Auto-update artifacts are published to GitHub Releases via the updater endpoint configured in `src-tauri/tauri.conf.json`
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components usually use PascalCase filenames such as `App.tsx`, `TerminalPane.tsx`, `PreviewPane.tsx`, and `ProviderKeyCard.tsx`
- Feature utilities and hooks use descriptive camel or kebab forms such as `useTerminalSession.ts`, `pty-bridge.ts`, `osc-handlers.ts`, and `pathUtils.ts`
- Test files are collocated as `*.test.ts` for frontend logic and either module-local `#[cfg(test)]` blocks or `src-tauri/tests/*.rs` for Rust
- camelCase in TypeScript and snake_case in Rust command names that mirror Tauri IPC surfaces, for example `workspaceAuthorize` on the frontend boundary and `workspace_authorize` in Rust
- Event handlers in React use `handle*`, `on*`, or verb-first names such as `handlePreviewUrl`, `toggleSidebar`, `switchWorkspace`
- Async functions do not use a special prefix; `async` is conveyed by signature
- camelCase for most locals and state values
- UPPER_SNAKE_CASE for fixed constants such as `SIDEBAR_MIN_WIDTH`, `HEADER_BLOCKLIST`, and `WRITE_DENY_PREFIXES`
- Types and aliases use PascalCase, for example `WorkspaceEnv`, `AiStreamEvent`, and `TerminalPaneHandle`
## Code Style
- TypeScript uses semicolons, double quotes are uncommon, and import blocks are grouped with blank lines between logical groups
- Rust favors small helper functions, `Result<_, String>` command boundaries, and explicit early returns
- Comments are sparse and usually explain why, especially around platform-specific or security-sensitive code
- No explicit ESLint config was found in the repo snapshot
- Documented checks are `pnpm exec tsc --noEmit`, `pnpm test`, `cargo clippy`, and `cargo test --locked` from `TERAX.md`
- `CONTRIBUTING.md` expects typecheck, clippy, and tests to stay clean
## Import Organization
- Internal aliases are strongly preferred over long relative imports; `TERAX.md` explicitly says to use `@/...`
- Type-only imports are used when practical, for example `import type { SearchAddon }`
- `pub mod` declarations live in `src-tauri/src/modules/mod.rs`
- Command registration is centralized in `src-tauri/src/lib.rs`
## Error Handling
- Validate at boundaries, then return a descriptive `Err(String)` from native commands
- Frontend bootstrapping and listener setup often use best-effort `.catch(() => {})` when failure should not crash the app
- Security-sensitive paths reject aggressively, especially in `src/modules/ai/lib/security.ts`, `src-tauri/src/modules/workspace.rs`, and `src-tauri/src/modules/net.rs`
- Rust business logic tends to convert lower-level failures into user-facing strings
- Tests assert specific failure categories where behavior matters, for example invalid git commit messages and unauthorized workspace paths
## Logging
- Native logging uses `tauri-plugin-log`, initialized in `src-tauri/src/lib.rs`
- Frontend logging is light and usually `console.error` or `console.warn` around recoverable failures
- Log or surface at subsystem boundaries rather than deep inside every helper
- Comments often substitute for verbose logging in fragile sections
## Comments
- Explain platform quirks, race conditions, or security reasoning
- Avoid obvious narration; many files intentionally have no comments except around tricky edges
- Product-level instructions in `TERAX.md` explicitly discourage filler comments and generic AI phrasing
- There is little evidence of active `TODO`/`FIXME` markers in source; the codebase relies more on tests and docs than inline backlog comments
## Function Design
- Pure helpers are commonly extracted under `lib/` folders
- Components remain large in some coordinator files like `src/app/App.tsx`, but module boundaries keep feature logic separated
- Early returns and guard clauses are common
- Command handlers are thin facades over helper functions and modules
- Shared policy logic is centralized in reusable functions such as `checkReadable`, `authorize_spawn_cwd`, and `classify_and_collect_safe_ips`
## Module Design
- `index.ts` barrels define public module surfaces across `src/modules/*`
- Default exports are used mainly for React components like `App`
- Rust feature areas are grouped under `src-tauri/src/modules/<area>/`
- New frontend code should normally live inside the matching feature module and only expose a thin barrel
- Cross-module imports should use public module surfaces where possible to avoid accidental deep coupling
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Rust owns OS access, process management, networking, and security-sensitive operations
- React webview owns presentation, editor/terminal composition, and AI interaction UX
- Features are organized by vertical module under `src/modules/`, with `App.tsx` acting as coordinator rather than business-logic home
- Long-lived stateful services exist on both sides: PTY sessions and workspace registry in Rust, Zustand/store-backed session state in the frontend
## Layers
- Purpose: Boot the app, register plugins, expose commands, and configure windows
- Contains: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, Tauri config files
- Depends on: Tauri builder, plugin initialization, module registration
- Used by: Entire app startup path
- Purpose: Encapsulate OS-backed capabilities behind Tauri commands
- Contains: `src-tauri/src/modules/pty/`, `fs/`, `git/`, `shell/`, `workspace.rs`, `net.rs`, `secrets.rs`, `agent.rs`
- Depends on: Rust crates such as `portable-pty`, `reqwest`, `ignore`, `grep-*`, `keyring`
- Used by: Frontend `invoke()` calls and IPC channels
- Purpose: Coordinate tabs, panes, workspace routing, AI bridges, and window-level behaviors
- Contains: `src/app/App.tsx`, `src/main.tsx`, `src/settings/SettingsApp.tsx`
- Depends on: module-level hooks and Tauri APIs
- Used by: All user-visible flows
- Purpose: Own feature-specific UI, local logic, and state
- Contains: `src/modules/terminal/`, `editor/`, `explorer/`, `source-control/`, `git-history/`, `preview/`, `theme/`, `ai/`, `agents/`, `workspace/`
- Depends on: shared UI primitives in `src/components/ui/`, utility helpers in `src/lib/`, and selected Tauri commands
- Used by: App composition layer
## Data Flow
- Native state uses Tauri-managed structs such as `PtyState`, `ShellState`, `WorkspaceRegistry`, and `SecretsState`
- Frontend state is a mix of React state, refs, and persisted stores using Zustand/Tauri store for AI, settings, agents, and tabs-related derived state
## Key Abstractions
- Purpose: Gate file, shell, and git access to approved roots
- Examples: `WorkspaceRegistry`, `authorize_spawn_cwd`, `workspace_authorize` in `src-tauri/src/modules/workspace.rs`
- Pattern: centralized native policy object
- Purpose: Keep terminal, editor, preview, markdown, and diff surfaces alive without remount churn
- Examples: `useTabs` in `src/modules/tabs/lib/useTabs.ts`, `TerminalStack`, `EditorStack`, `PreviewStack`
- Pattern: discriminated union plus hidden-but-mounted panes
- Purpose: Separate safe reads, approval-gated mutations, and provider transport
- Examples: `buildTools` in `src/modules/ai/tools/tools.ts`, `security.ts`, `native.ts`
- Pattern: capability registry with policy checks before IPC
## Entry Points
- Location: `src/main.tsx`
- Triggers: Tauri main window launch
- Responsibilities: preload fonts/styles, reap orphaned PTYs, seed launch dir, mount `App`
- Location: `src/app/App.tsx`
- Triggers: React render lifecycle
- Responsibilities: compose feature modules, own workspace/live-context bridges, route shortcuts, and manage tab-level behaviors
- Location: `src-tauri/src/lib.rs`
- Triggers: native application startup
- Responsibilities: initialize plugins, manage native state, register all commands
- Locations: `src/settings/main.tsx` and `src/settings/SettingsApp.tsx`
- Triggers: `open_settings_window` command from the main app
- Responsibilities: isolated preferences UI and key management
## Error Handling
- Rust commands generally canonicalize, authorize, and then perform the operation, returning descriptive error strings
- Frontend often treats native bootstrapping failures as non-fatal where safe, using `.catch(() => {})` for best-effort flows like PTY cleanup and key reload listeners
- Security-critical paths prefer explicit rejection over implicit fallback, especially in `src/modules/ai/lib/security.ts` and `src-tauri/src/modules/net.rs`
## Cross-Cutting Concerns
- Path and command validation for AI tools in `src/modules/ai/lib/security.ts`
- SSRF, DNS rebinding, and header sanitization in `src-tauri/src/modules/net.rs`
- Workspace path authorization in `src-tauri/src/modules/workspace.rs`
- Tauri store for preferences and AI sessions
- Native keyring for API keys
- Shell bootstrap scripts per platform in `src-tauri/src/modules/pty/scripts/`
- WSL bridging and Windows path conversion in `src-tauri/src/modules/workspace.rs`
- Platform-specific window decoration behavior in Tauri config and `open_settings_window`
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
