# Codebase Structure

**Analysis Date:** 2026-06-01

## Directory Layout

```text
terax-ai/
├── .planning/            # GSD planning artifacts and now codebase map docs
├── docs/                 # Product screenshots and supporting documentation assets
├── public/               # Static web assets
├── src/                  # Frontend application, settings UI, shared components
│   ├── app/              # Main App coordinator
│   ├── components/       # Shared UI primitives and AI element wrappers
│   ├── modules/          # Feature modules such as terminal, editor, AI, git, theme
│   ├── settings/         # Settings-window React app
│   └── styles/           # Global styles and theme tokens
├── src-tauri/            # Native Tauri/Rust backend, packaging, tests, capabilities
│   ├── src/              # Rust modules and command implementations
│   ├── tests/            # Native integration-style tests
│   ├── capabilities/     # Tauri permission allowlists
│   └── icons/            # Bundle icons per platform
├── AGENTS.md             # Stubbed workspace instruction file
├── TERAX.md              # Living architecture and workflow guidance
├── package.json          # Frontend scripts and dependencies
└── src-tauri/Cargo.toml  # Native package manifest
```

## Directory Purposes

**src/**
- Purpose: User-facing React application code
- Contains: `*.tsx`, `*.ts`, CSS, utility modules, and collocated Vitest files
- Key files: `src/main.tsx`, `src/app/App.tsx`, `src/lib/utils.ts`
- Subdirectories: `modules/` for product features, `components/` for shared primitives, `settings/` for the separate settings webview

**src/modules/**
- Purpose: Vertical feature ownership
- Contains: terminal, editor, explorer, preview, source control, git history, AI, agents, theme, settings, status bar, shortcuts, sidebar, workspace
- Key files: `src/modules/tabs/lib/useTabs.ts`, `src/modules/ai/lib/agent.ts`, `src/modules/terminal/lib/useTerminalSession.ts`
- Subdirectories: most modules expose `index.ts` barrels plus internal `lib/`, `components/`, or `store/` folders

**src-tauri/src/**
- Purpose: Native OS-facing implementation
- Contains: Rust command modules for PTY, FS, git, shell, secrets, network, workspace, and agent hooks
- Key files: `src-tauri/src/lib.rs`, `src-tauri/src/modules/workspace.rs`, `src-tauri/src/modules/net.rs`
- Subdirectories: `modules/pty/`, `modules/fs/`, `modules/git/`, `modules/shell/`

**src-tauri/tests/**
- Purpose: Native verification for shell, git, and search behavior
- Contains: `git_operations.rs`, `fs_search.rs`, `shell_background.rs`, and shared helpers in `common/mod.rs`
- Key files: `src-tauri/tests/git_operations.rs`
- Subdirectories: `common/` fixture helpers

**src/components/ui/**
- Purpose: shared UI primitives generated from shadcn/radix-luma setup
- Contains: reusable UI building blocks such as buttons, dialogs, selects, tooltips, sheets
- Key files: `src/components/ui/button.tsx`, `src/components/ui/dialog.tsx`
- Subdirectories: flat component list

## Key File Locations

**Entry Points:**
- `src/main.tsx` - main webview bootstrap
- `src/settings/main.tsx` - settings-window bootstrap
- `src-tauri/src/main.rs` - native binary entry
- `src-tauri/src/lib.rs` - Tauri builder and command registration

**Configuration:**
- `package.json` - frontend scripts/dependencies
- `vite.config.ts` - Vite config and aliases
- `tsconfig.json` and `tsconfig.node.json` - TypeScript config
- `src-tauri/tauri.conf.json` - bundle, updater, and window config
- `src-tauri/capabilities/default.json` - frontend permission allowlist
- `components.json` - shadcn/AI Elements registry config

**Core Logic:**
- `src/app/App.tsx` - app-level orchestration
- `src/modules/ai/` - AI providers, tools, composer, stores
- `src/modules/terminal/` - terminal panes, renderer pool, PTY bridge
- `src-tauri/src/modules/` - native feature implementations

**Testing:**
- `src/**/*.test.ts` - collocated frontend/unit tests
- `src-tauri/tests/*.rs` - native integration-style tests
- `src-tauri/src/modules/**/*.rs` - some Rust unit tests live next to implementation

**Documentation:**
- `TERAX.md` - architecture and coding guidance
- `README.md` - product overview and setup
- `CONTRIBUTING.md` and `SECURITY.md` - contributor and security policy docs
- `.planning/codebase/*.md` - generated onboarding and planning docs

## Naming Conventions

**Files:**
- PascalCase for many React components such as `TerminalPane.tsx`, `StatusBar.tsx`, `NotificationBell.tsx`
- camel/kebab hybrid for utilities such as `useWorkspaceCwd.ts`, `pty-bridge.ts`, `osc-handlers.ts`
- `*.test.ts` for frontend tests and `*.rs` test modules under `src-tauri/tests/`

**Directories:**
- Lowercase feature folders under `src/modules/`
- Flat native module directories under `src-tauri/src/modules/`

**Special Patterns:**
- `index.ts` barrels are common at module boundaries
- `lib/` holds feature-local non-visual logic
- `store/` holds persistent or shared state logic

## Where to Add New Code

**New frontend feature:**
- Primary code: `src/modules/<feature>/`
- Shared UI if truly reusable: `src/components/` or `src/components/ui/`
- Tests: collocate as `*.test.ts` near the logic being exercised

**New native capability:**
- Implementation: `src-tauri/src/modules/<area>/`
- Command registration: `src-tauri/src/lib.rs`
- Capability update if plugin-facing: `src-tauri/capabilities/default.json`
- Tests: `src-tauri/tests/` or local Rust unit tests in the module

**New settings surface:**
- Main window entry point if it affects workflow: `src/modules/settings/`
- Settings webview content: `src/settings/sections/` plus `src/settings/components/`

## Special Directories

**src-tauri/target/**
- Purpose: Cargo build artifacts and generated files
- Source: local Rust builds
- Committed: appears present in the workspace snapshot, but should be treated as generated output rather than source of truth

**src-tauri/gen/**
- Purpose: generated Tauri schemas
- Source: Tauri code generation
- Committed: yes in this snapshot

**.planning/**
- Purpose: planning documents for GSD workflows
- Source: workflow-generated docs and human edits
- Committed: intended to be tracked because `.planning/config.json` already exists

---
*Structure analysis: 2026-06-01*
*Update when directory structure changes*
