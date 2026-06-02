# Technology Stack

**Analysis Date:** 2026-06-01

## Languages

**Primary:**
- TypeScript 5.8.x - Frontend application code under `src/`, settings window code under `src/settings/`, and test files such as `src/modules/ai/lib/security.test.ts`
- Rust 2021 edition - Tauri backend, OS integration, PTY, file system, git, networking, and native tests under `src-tauri/src/` and `src-tauri/tests/`

**Secondary:**
- CSS - Global styling and theme tokens in `src/styles/globals.css`, `src/styles/fonts.css`, and `src/styles/code-highlight.css`
- PowerShell, Bash, Zsh, Fish - Terminal bootstrap scripts in `src-tauri/src/modules/pty/scripts/`
- NSIS script fragments - Windows installer hook in `src-tauri/installer-hooks.nsh`

## Runtime

**Environment:**
- Node.js-compatible frontend toolchain via Vite and pnpm; no explicit `engines` field is pinned in `package.json`
- Tauri 2 desktop runtime hosting a React webview and Rust native process
- Browser runtime inside the Tauri webview for UI rendering, xterm.js, CodeMirror, and AI chat surfaces

**Package Manager:**
- pnpm - required by project docs in `TERAX.md`
- Lockfiles: `pnpm-lock.yaml` and `src-tauri/Cargo.lock` are present

## Frameworks

**Core:**
- Tauri 2 - desktop shell and IPC boundary, configured in `src-tauri/tauri.conf.json`
- React 19.1 - main UI framework, entry points in `src/main.tsx` and `src/app/App.tsx`
- Vite 7 - frontend dev server and bundler, configured in `vite.config.ts`

**UI and editor stack:**
- Tailwind CSS v4 - styling foundation referenced from `src/styles/globals.css`
- xterm.js 6 with addons - terminal rendering in `src/modules/terminal/`
- CodeMirror 6 - editor and diff surfaces in `src/modules/editor/`

**AI stack:**
- Vercel AI SDK 6 (`ai`, `@ai-sdk/*`, `@ai-sdk/react`) - provider abstraction, chat transport, and agent orchestration in `src/modules/ai/`

**Testing:**
- Vitest 2.1 - frontend and utility tests run by `pnpm test`
- Rust test harness + `cargo test --locked` - native unit and integration tests in `src-tauri/tests/`

## Key Dependencies

**Critical:**
- `@tauri-apps/api` and Tauri plugins - frontend bridge to native capabilities such as store, updater, opener, notification, and OS APIs
- `portable-pty` - cross-platform PTY implementation backing terminal tabs in `src-tauri/src/modules/pty/`
- `@xterm/xterm` plus addons - interactive terminal rendering in `src/modules/terminal/`
- `@uiw/react-codemirror` and CodeMirror packages - editor, diff, and autocomplete surfaces in `src/modules/editor/`
- `ai` and provider packages such as `@ai-sdk/openai`, `@ai-sdk/anthropic`, and `@ai-sdk/openai-compatible` - BYOK AI integration in `src/modules/ai/lib/agent.ts`

**Infrastructure:**
- `reqwest` with `rustls-tls` - Rust-side AI HTTP proxy in `src-tauri/src/modules/net.rs`
- `ignore`, `grep-*`, and `globset` crates - file search and grep features in `src-tauri/src/modules/fs/search.rs` and `src-tauri/src/modules/fs/grep.rs`
- `keyring` crate - OS-backed secret storage in `src-tauri/src/modules/secrets.rs`

## Configuration

**Environment:**
- Provider API keys are not stored in files; they flow through keyring-backed commands from `src/modules/ai/lib/keyring.ts` to `src-tauri/src/modules/secrets.rs`
- Frontend preferences and persisted sessions use Tauri store files via `LazyStore` in `src/modules/settings/store.ts`, `src/modules/ai/lib/sessions.ts`, and related modules

**Build:**
- `package.json` - frontend scripts and dependencies
- `tsconfig.json` and `tsconfig.node.json` - TypeScript compiler settings
- `vite.config.ts` - path alias and frontend build wiring
- `src-tauri/Cargo.toml` - Rust dependencies and release profile
- `src-tauri/tauri.conf.json`, `src-tauri/tauri.windows.conf.json`, `src-tauri/tauri.linux.conf.json` - desktop packaging and platform overrides
- `src-tauri/capabilities/default.json` - webview permission allowlist

## Platform Requirements

**Development:**
- Cross-platform target: Windows, macOS, Linux
- Requires pnpm for frontend workflows and Cargo/Rust toolchain for native builds
- Local Tauri development expects `pnpm dev` plus `cargo` toolchain and platform-specific WebView prerequisites

**Production:**
- Distributed as a Tauri desktop application with `bundle.targets = "all"` in `src-tauri/tauri.conf.json`
- Windows installer uses NSIS in current-user mode and downloads the WebView2 bootstrapper
- Linux bundles depend on `libwebkit2gtk-4.1-0` and `libgtk-3-0`
- Auto-update artifacts are published to GitHub Releases via the updater endpoint configured in `src-tauri/tauri.conf.json`

---
*Stack analysis: 2026-06-01*
*Update after major dependency changes*
