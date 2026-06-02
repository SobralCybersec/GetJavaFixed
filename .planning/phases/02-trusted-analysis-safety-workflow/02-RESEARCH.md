# Phase 2: Trusted Analysis & Safety Workflow - Research

**Researched:** 2026-06-01
**Domain:** trusted Java analysis, review-first diff inspection, and git-aware safety inside the existing Tauri desktop shell [VERIFIED: codebase grep]
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Analysis Depth
- **D-01:** Phase 2 should use stronger local heuristics first rather than centering a structured refactor engine yet.
- **D-02:** Structured engine-led transformation work should be deferred to a later phase after trusted review and safety flows are in place.

### Review Surface
- **D-03:** Opening a finding in Phase 2 should show finding detail, affected files, and diff preview.
- **D-04:** Phase 2 should not introduce a full refactor-plan workspace yet; review should stay focused and minimal.

### Safety Policy
- **D-05:** When the opened repository is under git, safety should be git-first.
- **D-06:** When git-aware safety is unavailable, the app should fall back to backup-copy protection.
- **D-07:** Phase 2 safety should emphasize trust and clarity over redundant mechanisms everywhere.

### Apply Boundary
- **D-08:** Phase 2 should remain review-only with no apply path yet.
- **D-09:** This phase should prove analysis credibility, diff review, and rollback readiness before opening write behavior.

### the agent's Discretion
Planner and researcher may choose the exact local Java analysis techniques, diff presentation implementation details, and safety-state UI treatment as long as they preserve the decisions above.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ANLY-01 | User can run a repo-wide scan for safe refactor opportunities. | Extend the current Rust analysis module from Phase 1 into a broader deterministic scan that classifies safety issues from real Java files and project structure rather than relying on UI-only starter findings. [VERIFIED: codebase grep] |
| ANLY-02 | User can run a repo-wide scan for performance-focused refactor opportunities. | Add explicit performance-oriented heuristics such as collection choice, redundant work, and oversized hot-path classes while keeping scoring deterministic. [ASSUMED] |
| ANLY-03 | User can run a repo-wide scan for modernization-focused refactor opportunities. | Keep modernization signals local and structural for now, such as legacy collections, wildcard imports, wrapper-script absence, or outdated Java idioms. [VERIFIED: codebase grep] [ASSUMED] |
| PLAN-02 | User can open a finding and see affected files, rationale, and proposed changes. | Use the existing finding detail sheet path and add diff-preview data so the right-side detail surface becomes a trustworthy review panel. [VERIFIED: codebase grep] |
| PLAN-03 | User can group selected findings into a refactor plan for review. | Phase 2 should stop short of a full plan workspace, but it can introduce lightweight review grouping metadata or queue selection preparation without widening scope into apply. [INFERRED from locked decisions] |
| APLY-01 | User can review diffs before any refactor is applied. | Diff review should come from existing git diff primitives when a repo exists and from file-to-backup comparison primitives otherwise, without exposing apply yet. [VERIFIED: codebase grep] |
| SAFE-01 | User gets backup copies created before file changes are applied. | Phase 2 should define and surface backup-copy fallback behavior now even if write-path execution is deferred, so the safety contract exists before Phase 3 apply. [INFERRED from locked decisions] |
| SAFE-02 | User can use git-aware safety when the repository is under git. | The current git status, diff, log, show-commit, and discard infrastructure already supports a git-first trust path. [VERIFIED: codebase grep] |
| SAFE-03 | User can roll back applied changes using the app's safety workflow. | Phase 2 should shape rollback readiness and UX using current git primitives plus backup metadata, even if actual apply remains deferred. [INFERRED from locked decisions] |
</phase_requirements>

## Summary

Phase 2 should be planned as a trust-building phase, not an apply phase. The repository already has the right primitives to support this: Rust-side analysis state, git diff/status/log operations, authorized file reads and writes, and a findings-first React shell. The work is to deepen the analysis contract so findings feel credible, extend the review surface so a user can inspect proposed change context without leaving the findings path, and make safety state explicit using git-first semantics with a non-git fallback. [VERIFIED: codebase grep]

The best planning move is to keep the analysis engine deterministic and local. The current `phase1_analysis_*` contract already models status, progress, message, repo identity, and findings. That makes it a stable base for richer Phase 2 scans without prematurely locking in OpenRewrite or another structured transformation engine. Planning should therefore split analysis from execution: analyze more deeply now, defer structured write-path machinery until later. [VERIFIED: codebase grep]

For review, the strongest analog is the existing source-control surface plus the Phase 1 detail sheet. The codebase already knows how to render file-oriented lists, fetch diffs, and show compact review actions. Reusing those patterns lets Phase 2 add diff preview and affected-file review without turning the product into a multi-pane IDE or inventing a parallel navigation model. [VERIFIED: codebase grep]

For safety, git should remain the first-class trust path whenever the selected repo is under version control. The existing git operations cover repo detection, status, diff, log, show-commit, discard, and commit primitives. Planning should wrap those into a user-facing safety state and rollback-readiness contract. When git is absent, the fallback should be explicit backup-copy metadata and reversible file snapshots handled in Rust under the same authorization model. [VERIFIED: codebase grep]

**Primary recommendation:** Plan Phase 2 in three slices: 1) deeper deterministic analysis with richer findings classification, 2) detail-panel diff review with lightweight review grouping preparation, and 3) git-first safety state plus backup fallback and rollback-readiness scaffolding. [INFERRED from roadmap + context]

## Project Constraints (from AGENTS.md)

- Reuse the current Tauri + React + Rust architecture and keep security-sensitive logic native. [VERIFIED: codebase grep]
- Keep the UI minimal and lightweight; do not drift into an IDE replacement. [VERIFIED: codebase grep]
- Maintain review-before-apply as the trust model. [VERIFIED: codebase grep]
- Respect existing workspace authorization, file, git, and network safety controls. [VERIFIED: codebase grep]
- Use `@/...` imports and fit new work into existing module boundaries. [VERIFIED: codebase grep]
- Changes touching git, filesystem, or IPC boundaries require tests. [VERIFIED: codebase grep]
- `corepack pnpm` is the practical frontend command path on this machine. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Repo-wide trusted Java scan | API / Backend | Browser / Client | The native analysis module already owns progress and findings state, so richer scanning should stay Rust-side and only expose typed DTOs. [VERIFIED: codebase grep] |
| Finding detail and diff preview | Browser / Client | API / Backend | The specialized review surface is a React concern, but diff data and safety facts should come from native commands. [VERIFIED: codebase grep] |
| Git-first safety state | API / Backend | Browser / Client | Repo detection, status, log, diff, and rollback primitives already live in Rust and should remain the source of truth. [VERIFIED: codebase grep] |
| Backup-copy fallback | API / Backend | Browser / Client | Backup creation and metadata should remain inside the authorized native boundary. [INFERRED from architecture] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri` + `@tauri-apps/api` | 2.x in repo | Native analysis, diff, and safety commands | Already wired across the shell and consistent with the native-boundary constraint. [VERIFIED: codebase grep] |
| Existing git module | repo-local | Status, diff, log, discard, show-commit, repo detection | Phase 2 safety and review should reuse this instead of introducing another git abstraction. [VERIFIED: codebase grep] |
| Existing findings module | repo-local | Ranked queue, detail sheet, progress state | Gives Phase 2 a stable review-first UI foundation. [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 repo pin | Validate richer findings, diff, and safety DTOs at the JS boundary | Use for any expanded native payloads. [VERIFIED: codebase grep] |
| Existing shadcn primitives | existing | Cards, badges, sheets, progress, alerts | Use existing primitives for trust and review surfaces. [VERIFIED: codebase grep] |

## Architecture Patterns

### Recommended Project Structure

```text
src/
├── modules/findings/         # dashboard, detail review, diff preview, lightweight grouping
├── modules/review/           # optional diff helpers if findings module gets too large
└── modules/source-control/   # reusable git-oriented review idioms

src-tauri/src/modules/
├── analysis/                 # richer deterministic scan and findings contract
├── git/                      # existing git-first safety primitives
├── fs/                       # backup-copy fallback helpers
└── workspace.rs              # authorization boundary
```

### Pattern 1: Deeper Deterministic Findings Contract
**What:** Expand the current findings DTO to include finding type, category, severity, rationale, principles, affected files, and review-preview hints while keeping ordering deterministic. [VERIFIED: codebase grep]
**When to use:** For all repo-wide safe, performance, and modernization findings in Phase 2. [INFERRED]

### Pattern 2: Detail-Sheet Review Path with Native Diff Source
**What:** Keep the user in the findings dashboard, but let the selected finding open affected files plus a diff preview generated from native git/file comparison commands. [VERIFIED: codebase grep]
**When to use:** Whenever a finding has a proposed change preview or user requests inspection. [INFERRED]

### Pattern 3: Safety-State Contract Before Apply
**What:** Introduce a typed safety snapshot that reports whether the repo is git-backed, what rollback path exists, and whether backup fallback is required. [INFERRED]
**When to use:** Before any future write path, and already in Phase 2 review UI so trust is legible before apply exists. [INFERRED]

### Anti-Patterns to Avoid

- **Engine lock-in too early:** Do not make OpenRewrite or another transformation engine the backbone of Phase 2. That widens scope and conflicts with the locked heuristics-first decision. [VERIFIED: context]
- **Parallel generic review surface:** Do not open a separate terminal/source-control-first workflow that steals focus from findings. Diff review should stay inside the specialized path. [VERIFIED: Phase 1 decisions]
- **Always-on double safety:** Do not require both git rollback and backup copies for every case; the locked trust model is git-first with fallback, not redundant safety everywhere. [VERIFIED: context]
- **Hidden safety state:** Do not bury whether review is git-protected or backup-protected. Trust must be explicit. [INFERRED]

## Common Pitfalls

### Pitfall 1: Expanding findings without improving credibility
**What goes wrong:** The UI shows more categories, but the scan still feels like Phase 1 starter heuristics with no meaningful repo-wide trust gain. [INFERRED]
**How to avoid:** Plan real repo-wide rule coverage with deterministic scoring across safe, performance, and modernization classes. [INFERRED]

### Pitfall 2: Building diff review as a separate source-control mode
**What goes wrong:** Users leave the specialized findings workflow and fall back into generic source-control surfaces, weakening product focus. [VERIFIED: codebase grep]
**How to avoid:** Reuse source-control patterns, but render review in the findings path. [VERIFIED: codebase grep]

### Pitfall 3: Treating git absence as an error instead of a fallback branch
**What goes wrong:** Non-git repos lose trust messaging or become second-class citizens. [INFERRED]
**How to avoid:** Model safety as two explicit branches: git-first and backup-fallback. [VERIFIED: context]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | frontend build and tests | yes | 24.11.1 | - |
| `pnpm` | frontend scripts | no | - | `corepack pnpm` 11.5.0 is available. [VERIFIED: codebase grep] |
| Cargo | Tauri backend build and tests | yes | 1.95.0 | - |
| Rust | Tauri backend build | yes | 1.95.0 | - |
| Java | repo scanning fixtures and future validation | yes | 21.0.9 | - |
| Maven | fixture repos and wrapper-aware validation | yes | 3.9.11 | wrapper also available when present. [VERIFIED: environment note] |

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 plus Rust `cargo test --locked` harness. [VERIFIED: codebase grep] |
| Quick run command | `corepack pnpm test` and targeted `cargo test --locked --test <name>`. [VERIFIED: codebase grep] |
| Full suite command | `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked`. [VERIFIED: codebase grep] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ANLY-01 / 02 / 03 | richer repo-wide scan returns safe, performance, and modernization findings | Rust integration | `cargo test --locked --test java_analysis_review` | no - Wave 0 |
| PLAN-02 | selected finding shows affected files, rationale, and diff preview | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | partial |
| PLAN-03 | lightweight grouping/review metadata stays inside findings flow | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | partial |
| APLY-01 | diff review available before any future apply | Rust + frontend | `cargo test --locked --test java_analysis_review` and `corepack pnpm test -- src/modules/findings/*.test.ts` | no - Wave 0 |
| SAFE-01 / 02 / 03 | safety snapshot reflects git-first or backup-fallback and exposes rollback readiness | Rust integration | `cargo test --locked --test java_safety_flow` | no - Wave 0 |

## Sources

### Primary (HIGH confidence)

- Local codebase files reviewed: `src-tauri/src/modules/analysis/mod.rs`, `src/modules/findings/FindingsDashboard.tsx`, `src/modules/findings/lib/useFindings.ts`, `src/modules/source-control/SourceControlPanel.tsx`, `src-tauri/src/modules/git/commands.rs`, `src-tauri/src/modules/git/operations.rs`, `src-tauri/src/modules/fs/file.rs`, `TERAX.md`, `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/phases/02-trusted-analysis-safety-workflow/02-CONTEXT.md`. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- none

### Tertiary (LOW confidence)

- none

## Metadata

**Confidence breakdown:**

- Trusted-analysis slice: HIGH
- Review-surface reuse path: HIGH
- Backup-fallback details: MEDIUM, because exact metadata shape is still a planning decision

**Research date:** 2026-06-01
**Valid until:** 2026-07-01
