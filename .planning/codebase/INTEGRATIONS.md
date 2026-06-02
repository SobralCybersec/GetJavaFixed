# External Integrations

**Analysis Date:** 2026-06-01

## APIs & External Services

**AI Providers:**
- OpenAI, Anthropic, Google, xAI, Cerebras, Groq, and OpenAI-compatible providers - cloud LLM access for chat and subagents
  - SDK/Client: `ai` plus `@ai-sdk/*` packages wired from `src/modules/ai/config.ts` and `src/modules/ai/lib/agent.ts`
  - Auth: Provider-specific API keys stored through `src/modules/ai/lib/keyring.ts`
  - Endpoints used: model/chat calls proxied through Rust networking commands in `src-tauri/src/modules/net.rs`

**Local model runtimes:**
- LM Studio, MLX, and Ollama - optional local/offline model backends
  - Integration method: HTTP requests routed through `ai_http_request`, `ai_http_stream`, and `lm_ping`
  - Auth: Typically keyless; model id and base URL come from `src/modules/settings/preferences.ts`
  - Network rules: Private-network access is explicit and filtered by DNS/IP checks in `src-tauri/src/modules/net.rs`

**External browser links:**
- Arbitrary documentation, remote git hosts, and preview URLs can be opened via `@tauri-apps/plugin-opener`
  - Frontend callers include `src/modules/git-history/GitHistoryPane.tsx`, `src/modules/preview/PreviewAddressBar.tsx`, and `src/settings/sections/AboutSection.tsx`

## Data Storage

**Databases:**
- None detected. The app is desktop-local and does not ship with an application database layer.

**File Storage:**
- User workspace files are accessed through Rust FS commands such as `fs_read_file`, `fs_write_file`, `fs_search`, and `fs_grep`
  - Backend implementation: `src-tauri/src/modules/fs/`
  - Authorization gate: `src-tauri/src/modules/workspace.rs`

**Local persisted app state:**
- Tauri store plugin - preferences, snippets, todos, agents state, and AI sessions
  - Frontend clients: `src/modules/settings/store.ts`, `src/modules/ai/lib/sessions.ts`, `src/modules/ai/lib/snippets.ts`, `src/modules/ai/lib/todos.ts`
  - Auth: local desktop app storage, no remote credential exchange

## Authentication & Identity

**Secrets storage:**
- OS keychain via Rust `keyring` crate - provider keys and other local secrets
  - Implementation: `src-tauri/src/modules/secrets.rs`
  - Frontend bridge: `src/modules/ai/lib/keyring.ts`
  - Linux fallback: file-based encrypted-ish local store behavior is handled in the Rust module when native keyring is unavailable

**Agent identity hooks:**
- Claude Code terminal hooks can be installed into the user's Claude configuration
  - Backend command: `agent_enable_claude_hooks` in `src-tauri/src/modules/agent.rs`
  - Trigger surface: `src/modules/agents/components/NotificationBell.tsx` and `src/app/App.tsx`

## Monitoring & Observability

**Logs:**
- Tauri log plugin - native logging configured in `src-tauri/src/lib.rs`
- Console logging - lightweight UI-side diagnostics, for example `window.show failed` handling in `src/main.tsx`

**Notifications:**
- Native desktop notifications via `@tauri-apps/plugin-notification`
  - Routing logic: `src/modules/agents/lib/notify.ts` and `src/modules/agents/lib/route.ts`

## CI/CD & Deployment

**Hosting/Distribution:**
- GitHub Releases - updater endpoint configured as `https://github.com/crynta/terax-ai/releases/latest/download/latest.json`
  - Consumer: Tauri updater plugin in `src-tauri/tauri.conf.json`
  - Frontend updater UX: `src/modules/updater/useUpdater.ts` and `src/modules/updater/UpdaterDialog.tsx`

**CI Pipeline:**
- No `.github/workflows/` or other checked-in CI pipeline definitions were found in this snapshot
- Quality expectations are documented in `TERAX.md`, `README.md`, and `CONTRIBUTING.md`

## Environment Configuration

**Development:**
- Required local tools: pnpm, Rust/Cargo, and platform-specific Tauri prerequisites
- AI provider secrets live in the OS keychain rather than `.env` files
- Workspace roots are authorized at runtime through `workspace_authorize`

**Production:**
- Updater public key and release endpoint are configured in `src-tauri/tauri.conf.json`
- Package metadata and bundle settings are embedded in Tauri config, not pulled from an external deployment platform

## Webhooks & Callbacks

**Incoming:**
- PTY output and shell background logs are streamed into the frontend using Tauri IPC channels from `src-tauri/src/modules/pty/mod.rs` and `src-tauri/src/modules/shell/background.rs`
- AI HTTP streaming callbacks are delivered through `Channel<AiStreamEvent>` in `src-tauri/src/modules/net.rs`

**Outgoing:**
- AI HTTP proxy calls from the Rust backend to cloud or local model servers
- Git remote URL opening through external browser integration in `src/modules/git-history/lib/remoteWebUrl.ts` and `src/modules/git-history/GitHistoryPane.tsx`

---
*Integration audit: 2026-06-01*
*Update when adding/removing external services*
