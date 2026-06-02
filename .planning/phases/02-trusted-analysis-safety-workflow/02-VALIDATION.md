---
phase: 2
slug: trusted-analysis-safety-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for trusted analysis, diff review, and safety-state work.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 plus Rust `cargo test --locked` harness |
| **Quick run command** | `corepack pnpm test` and targeted `cargo test --locked --test <name>` |
| **Full suite command** | `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked` |
| **Estimated runtime** | ~120 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted frontend or Rust tests for touched surface
- **After every plan wave:** Run `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | ANLY-01, ANLY-02, ANLY-03 | T-02-01 | Repo-wide scan yields deterministic safe, performance, and modernization findings | Rust integration | `cargo test --locked --test java_analysis_review` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | PLAN-02, PLAN-03, APLY-01 | T-02-02 | Selected finding shows rationale, affected files, diff preview, and review grouping stays review-only | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | ⚠ partial | ⬜ pending |
| 02-03-01 | 03 | 3 | SAFE-01, SAFE-02, SAFE-03 | T-02-03 | Safety state clearly reports git-first or backup-fallback rollback readiness | Rust integration | `cargo test --locked --test java_safety_flow` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠ partial*

---

## Wave 0 Requirements

- [ ] `src-tauri/tests/java_analysis_review.rs` — deterministic safe/performance/modernization findings coverage
- [ ] `src-tauri/tests/java_safety_flow.rs` — git-first safety and backup-fallback contract coverage
- [ ] `src/modules/findings/*.test.ts` — diff preview, safety-state display, review-only grouping behavior
- [ ] Fixture repos with git-backed and non-git Java project variants

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Trust legibility between git-first and backup-fallback states | SAFE-01, SAFE-02, SAFE-03 | Requires UX judgment and state-copy clarity review | Open a git-backed repo and a non-git repo, run analysis, inspect a finding, and confirm the safety state is obvious in both cases |
| Review-first diff experience stays lightweight | PLAN-02, APLY-01 | Requires visual and workflow judgment across dashboard/detail hierarchy | Open a finding with diff preview and confirm review stays in the findings workflow without shifting into generic source-control-first UX |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers new native and frontend review surfaces
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
