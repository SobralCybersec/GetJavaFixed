---
phase: 1
slug: java-repo-intake-findings-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 plus Rust `cargo test --locked` harness |
| **Config file** | none detected for Vitest; package script uses default runner behavior |
| **Quick run command** | `corepack pnpm test` and targeted `cargo test --locked --test java_repo_intake` |
| **Full suite command** | `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked` |
| **Estimated runtime** | ~90 seconds |

---

## Sampling Rate

- **After every task commit:** Run `corepack pnpm test` for frontend touches and targeted `cargo test --locked --test java_repo_intake` for native intake work
- **After every plan wave:** Run `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | REPO-01, REPO-02 | T-01-01 | Only selected-root Maven/Gradle repositories are accepted; unsupported roots stay blocked | Rust integration | `cargo test --locked --test java_repo_intake` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | REPO-03 | T-01-02 | Dashboard analysis trigger stays in-app and does not fall back to terminal-first workflow | frontend component | `corepack pnpm test -- src/modules/java-intake/*.test.ts` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | ANLY-04, PLAN-01 | T-01-03 | Findings remain deterministic, principle-aware, and priority-ranked | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ flaky*

---

## Wave 0 Requirements

- [ ] `src-tauri/tests/java_repo_intake.rs` — selected-root detection, unsupported cases, and wrapper-path edge cases
- [ ] `src/modules/java-intake/*.test.ts` — intake state machine and unsupported-state transitions
- [ ] `src/modules/findings/*.test.ts` — ranked queue ordering, top-item auto-select, and rationale rendering
- [ ] Java fixture repos for root-level `pom.xml`, `build.gradle`, `build.gradle.kts`, and unsupported Java-like folders

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Native folder-picker feel and unsupported-state clarity | REPO-01, REPO-02 | OS-native dialog behavior and first-run polish are difficult to assert meaningfully in unit tests | Open the app, choose a supported Maven repo, choose a supported Gradle repo, then choose an unsupported folder with Java files and verify the exact blocked-state copy and recovery action |
| Findings-first product feel versus legacy shell chrome | PLAN-01 | Requires visual judgment across layout hierarchy and first-run emphasis | Confirm the app opens into the Java repo home, then into the findings dashboard, without terminal-first surfaces becoming the primary visual focus |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
