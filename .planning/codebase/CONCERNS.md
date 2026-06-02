# Codebase Concerns

**Analysis Date:** 2026-06-01

## Tech Debt

**Large application coordinator in `src/app/App.tsx`:**
- Issue: The main app shell centralizes a large amount of wiring for tabs, workspace switching, AI bridges, notifications, shortcuts, and terminal/editor coordination
- Why: The app needs one place to connect many long-lived surfaces and callbacks
- Impact: Small changes can have wide blast radius, and onboarding into UI flow control is slower than in the smaller feature modules
- Fix approach: Continue extracting stable seams into `src/modules/*/lib/` and reduce direct state orchestration in `App.tsx`

**Generated and build output living in the workspace snapshot:**
- Issue: `src-tauri/target/` and generated Tauri artifacts are present locally
- Why: Local development builds have been run in-place
- Impact: Repo scans are noisy, code search can be polluted, and accidental edits to generated output are easier
- Fix approach: Keep mapping/planning and future edits focused on source directories, and avoid treating `src-tauri/target/` as source of truth

## Known Bugs

**React Strict Mode double-mount terminal spawn in development:**
- Symptoms: First terminal session may open and close immediately in dev logs
- Trigger: React 19 strict-mode double mount during development startup
- Workaround: Existing logic tolerates it with cleanup and spawn locking
- Root cause: Dev-only React lifecycle behavior interacting with PTY startup
- Files: `TERAX.md`, `src-tauri/src/modules/pty/session.rs`, `src/main.tsx`

**Windows/Linux window first-paint flash is actively worked around:**
- Symptoms: Transparent or shadow-only frame can appear before React paints
- Trigger: Window shown before webview is ready
- Workaround: `src/main.tsx` hides then forces `.show()` after startup
- Root cause: Native window timing vs webview paint
- Files: `src/main.tsx`, `src-tauri/tauri.conf.json`

## Security Considerations

**AI tool surface needs continuous boundary discipline:**
- Risk: Read/write/exec tools can become an exfiltration or destructive action path if guardrails drift
- Current mitigation: deny-list path checks in `src/modules/ai/lib/security.ts`, approval gating in `src/modules/ai/tools/tools.ts`, canonicalization helpers, and extensive safety tests
- Recommendations: Keep adding regression tests for new path forms and command patterns whenever tools expand

**Network proxy is security-critical native code:**
- Risk: SSRF, metadata access, or DNS rebinding could expose local/private resources
- Current mitigation: host blocklist, IP classification, redirect restrictions, and resolver pinning in `src-tauri/src/modules/net.rs`
- Recommendations: Treat any change in `net.rs` as high-risk and require targeted tests before shipping

## Performance Bottlenecks

**App-wide reactivity anchored in one large coordinator:**
- Problem: `src/app/App.tsx` owns many refs, effects, and callbacks that can make performance regressions hard to localize
- Measurement: No checked-in benchmarks found
- Cause: The app intentionally keeps many heavy panes mounted to preserve terminal/editor state
- Improvement path: Profile before major UI additions and keep new hot-path logic inside focused hooks

**Renderer-heavy terminal/editor model:**
- Problem: Multiple mounted xterm and CodeMirror instances can add memory and rendering pressure
- Measurement: No checked-in numbers found
- Cause: Hidden-but-mounted tab design preserves live PTY/editor state by choice
- Improvement path: Continue using pools such as `src/modules/terminal/lib/rendererPool.ts` and avoid unnecessary remounts or duplicate streams

## Fragile Areas

**PTY lifecycle on Windows in `src-tauri/src/modules/pty/session.rs` and `src-tauri/src/modules/pty/job.rs`:**
- Why fragile: ConPTY startup ordering and process-tree cleanup are platform-specific and already guarded by locks and Job Objects
- Common failures: stalled output pipes, orphaned child processes, broken cwd/prompt tracking
- Safe modification: change only with targeted Windows verification and preserve the locking/cleanup model unless a replacement is proven
- Test coverage: some native tests exist, but the full PTY lifecycle is still riskier than pure utility code

**Workspace authorization in `src-tauri/src/modules/workspace.rs`:**
- Why fragile: Many file, git, and shell operations depend on canonicalization and authorization semantics staying correct
- Common failures: path traversal, symlink escape, unauthorized cwd usage, WSL path translation errors
- Safe modification: extend tests first, then adjust helpers
- Test coverage: strong unit coverage for path and WSL rules, but still high impact

**AI session/tool approval flow in `src/modules/ai/`:**
- Why fragile: It spans provider config, persistent sessions, tool approval UI, and native command bridges
- Common failures: stale live context, approval state mismatch, accidental unsafe defaults
- Safe modification: keep reads/writes/search/exec boundaries explicit and verify approval-driven flows end to end
- Test coverage: strong unit coverage for security helpers, lighter coverage for the full UX flow

## Dependencies at Risk

**Fast-moving AI provider stack:**
- Risk: `ai` and `@ai-sdk/*` packages evolve quickly and can shift API semantics
- Impact: Provider transport, tool calling, or chat state assumptions in `src/modules/ai/lib/agent.ts` and `src/modules/ai/lib/transport.ts` may break on upgrade
- Migration plan: upgrade carefully with focused validation across chat, tools, and approval workflows

**Tauri/plugin ecosystem churn:**
- Risk: plugin APIs and platform behavior can change across Tauri 2 updates
- Impact: updater, autostart, notification, process, and window-state integrations could regress
- Migration plan: validate plugin changes against `src-tauri/src/lib.rs`, capability files, and the settings/updater flows

## Test Coverage Gaps

**Main app workflow coverage:**
- What's not tested: integrated behavior across `src/app/App.tsx` for tabs, sidebars, live context, and modal flows
- Risk: UI coordination regressions could slip through while unit tests still pass
- Priority: High
- Difficulty to test: requires higher-level component or desktop integration harnesses

**Cross-platform PTY and window behavior:**
- What's not tested: full desktop behavior across Windows, Linux, and macOS for shell bootstrap and window presentation quirks
- Risk: platform regressions can ship unnoticed when working from one OS
- Priority: High
- Difficulty to test: requires platform-specific automation or manual verification matrices

---
*Concerns audit: 2026-06-01*
*Update as issues are fixed or new ones discovered*
