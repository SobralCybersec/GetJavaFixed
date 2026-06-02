# Architecture

**Analysis Date:** 2026-06-01

## Pattern Overview

**Overall:** Native desktop monolith with a strict two-process boundary

**Key Characteristics:**
- Rust owns OS access, process management, networking, and security-sensitive operations
- React webview owns presentation, editor/terminal composition, and AI interaction UX
- Features are organized by vertical module under `src/modules/`, with `App.tsx` acting as coordinator rather than business-logic home
- Long-lived stateful services exist on both sides: PTY sessions and workspace registry in Rust, Zustand/store-backed session state in the frontend

## Layers

**Desktop shell layer:**
- Purpose: Boot the app, register plugins, expose commands, and configure windows
- Contains: `src-tauri/src/lib.rs`, `src-tauri/src/main.rs`, Tauri config files
- Depends on: Tauri builder, plugin initialization, module registration
- Used by: Entire app startup path

**Native service layer:**
- Purpose: Encapsulate OS-backed capabilities behind Tauri commands
- Contains: `src-tauri/src/modules/pty/`, `fs/`, `git/`, `shell/`, `workspace.rs`, `net.rs`, `secrets.rs`, `agent.rs`
- Depends on: Rust crates such as `portable-pty`, `reqwest`, `ignore`, `grep-*`, `keyring`
- Used by: Frontend `invoke()` calls and IPC channels

**Frontend composition layer:**
- Purpose: Coordinate tabs, panes, workspace routing, AI bridges, and window-level behaviors
- Contains: `src/app/App.tsx`, `src/main.tsx`, `src/settings/SettingsApp.tsx`
- Depends on: module-level hooks and Tauri APIs
- Used by: All user-visible flows

**Feature module layer:**
- Purpose: Own feature-specific UI, local logic, and state
- Contains: `src/modules/terminal/`, `editor/`, `explorer/`, `source-control/`, `git-history/`, `preview/`, `theme/`, `ai/`, `agents/`, `workspace/`
- Depends on: shared UI primitives in `src/components/ui/`, utility helpers in `src/lib/`, and selected Tauri commands
- Used by: App composition layer

## Data Flow

**Terminal session flow:**
1. `src/app/App.tsx` requests a new terminal tab and mounts `TerminalStack`
2. `src/modules/terminal/lib/pty-bridge.ts` opens a PTY via Tauri `invoke("pty_open")`
3. Rust session management in `src-tauri/src/modules/pty/session.rs` spawns a shell and streams bytes through Tauri channels
4. OSC handlers in `src/modules/terminal/lib/osc-handlers.ts` parse cwd and prompt markers
5. App-level callbacks update tab cwd, authorize workspace roots, and wire agent notifications

**AI tool flow:**
1. User interacts with `AiInputBar` or `AiMiniWindow` from `src/modules/ai/components/`
2. `src/modules/ai/lib/agent.ts` builds an AI SDK agent with tools from `src/modules/ai/tools/tools.ts`
3. Read-only tools resolve paths and perform checks client-side, then call native commands through `src/modules/ai/lib/native.ts`
4. Networked model calls travel through `src/modules/ai/lib/proxyFetch.ts` to Rust commands in `src-tauri/src/modules/net.rs`
5. Approval-required mutations surface in the UI before write/exec operations continue

**Git and workspace flow:**
1. Active cwd is derived from terminal/editor context in `src/modules/tabs/lib/useWorkspaceCwd.ts` and `src/app/App.tsx`
2. Frontend panels call git commands such as `git_status` and `git_diff`
3. Rust modules under `src-tauri/src/modules/git/` resolve the repo, validate authorization, and execute git subprocesses
4. Results are rendered in `src/modules/source-control/` and `src/modules/git-history/`

**State Management:**
- Native state uses Tauri-managed structs such as `PtyState`, `ShellState`, `WorkspaceRegistry`, and `SecretsState`
- Frontend state is a mix of React state, refs, and persisted stores using Zustand/Tauri store for AI, settings, agents, and tabs-related derived state

## Key Abstractions

**Workspace authorization registry:**
- Purpose: Gate file, shell, and git access to approved roots
- Examples: `WorkspaceRegistry`, `authorize_spawn_cwd`, `workspace_authorize` in `src-tauri/src/modules/workspace.rs`
- Pattern: centralized native policy object

**Tab and pane model:**
- Purpose: Keep terminal, editor, preview, markdown, and diff surfaces alive without remount churn
- Examples: `useTabs` in `src/modules/tabs/lib/useTabs.ts`, `TerminalStack`, `EditorStack`, `PreviewStack`
- Pattern: discriminated union plus hidden-but-mounted panes

**AI tool boundary:**
- Purpose: Separate safe reads, approval-gated mutations, and provider transport
- Examples: `buildTools` in `src/modules/ai/tools/tools.ts`, `security.ts`, `native.ts`
- Pattern: capability registry with policy checks before IPC

## Entry Points

**Main app webview:**
- Location: `src/main.tsx`
- Triggers: Tauri main window launch
- Responsibilities: preload fonts/styles, reap orphaned PTYs, seed launch dir, mount `App`

**Main app coordinator:**
- Location: `src/app/App.tsx`
- Triggers: React render lifecycle
- Responsibilities: compose feature modules, own workspace/live-context bridges, route shortcuts, and manage tab-level behaviors

**Rust desktop bootstrap:**
- Location: `src-tauri/src/lib.rs`
- Triggers: native application startup
- Responsibilities: initialize plugins, manage native state, register all commands

**Settings window:**
- Locations: `src/settings/main.tsx` and `src/settings/SettingsApp.tsx`
- Triggers: `open_settings_window` command from the main app
- Responsibilities: isolated preferences UI and key management

## Error Handling

**Strategy:** Validate at the boundary, return `Result<_, String>` from Tauri commands, and surface UI-friendly failures in feature modules

**Patterns:**
- Rust commands generally canonicalize, authorize, and then perform the operation, returning descriptive error strings
- Frontend often treats native bootstrapping failures as non-fatal where safe, using `.catch(() => {})` for best-effort flows like PTY cleanup and key reload listeners
- Security-critical paths prefer explicit rejection over implicit fallback, especially in `src/modules/ai/lib/security.ts` and `src-tauri/src/modules/net.rs`

## Cross-Cutting Concerns

**Validation:**
- Path and command validation for AI tools in `src/modules/ai/lib/security.ts`
- SSRF, DNS rebinding, and header sanitization in `src-tauri/src/modules/net.rs`
- Workspace path authorization in `src-tauri/src/modules/workspace.rs`

**Persistence:**
- Tauri store for preferences and AI sessions
- Native keyring for API keys

**Cross-platform support:**
- Shell bootstrap scripts per platform in `src-tauri/src/modules/pty/scripts/`
- WSL bridging and Windows path conversion in `src-tauri/src/modules/workspace.rs`
- Platform-specific window decoration behavior in Tauri config and `open_settings_window`

---
*Architecture analysis: 2026-06-01*
*Update when major patterns change*
