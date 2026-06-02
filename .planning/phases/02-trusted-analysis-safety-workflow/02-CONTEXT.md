# Phase 2: Trusted Analysis & Safety Workflow - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

## Phase Boundary

Phase 2 delivers trustworthy repository analysis plus safe review and rollback workflows before any wider write path is introduced. It should deepen repo-wide Java analysis beyond Phase 1 heuristics, let users inspect finding details with affected files and diff preview, and establish a credible safety story using git-aware rollback where available and backup-copy fallback otherwise.

## Implementation Decisions

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

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` — product direction, constraints, review-first trust model, and current state
- `.planning/REQUIREMENTS.md` — locked Phase 2 requirements: `ANLY-01`, `ANLY-02`, `ANLY-03`, `PLAN-02`, `PLAN-03`, `APLY-01`, `SAFE-01`, `SAFE-02`, `SAFE-03`
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and plan slots
- `.planning/STATE.md` — current project position, carry-forward concerns, and Phase 1 completion context

### Prior Phase Decisions
- `.planning/phases/01-java-repo-intake-findings-shell/01-CONTEXT.md` — Phase 1 intake, dashboard, findings-first, and watch-only decisions that must carry forward
- `.planning/phases/01-java-repo-intake-findings-shell/01-VERIFICATION.md` — Phase 1 verified capabilities and remaining manual checks

### Existing Codebase Context
- `.planning/codebase/STACK.md` — Tauri/React/Rust stack and current dependencies
- `.planning/codebase/ARCHITECTURE.md` — current app shell, native boundary, and feature layering
- `.planning/codebase/CONVENTIONS.md` — naming, module, and testing expectations
- `TERAX.md` — living workspace guidance and quality bar

## Existing Code Insights

### Reusable Assets
- `src-tauri/src/modules/analysis/mod.rs`: existing Phase 1 native analysis skeleton that can be deepened into more credible repo-wide Java scanning
- `src/modules/findings/FindingsDashboard.tsx`: findings-first dashboard shell already owns ranked list, selection, and detail entry path
- `src/modules/findings/FindingDetailSheet.tsx`: existing right-side detail surface can expand to include diff preview and richer rationale
- `src/modules/source-control/SourceControlPanel.tsx`: existing compact git-oriented review patterns can inform diff inspection and safety-state presentation
- `src-tauri/src/modules/git/commands.rs` and `src-tauri/src/modules/git/operations.rs`: existing git snapshot, diff, commit, and discard primitives can support git-first safety and rollback flows
- `src-tauri/src/modules/fs/file.rs` and related mutate modules: existing authorized file read/write primitives can support backup-copy fallback paths when git is unavailable

### Established Patterns
- Rust owns filesystem, git, and other safety-sensitive operations; frontend should not infer safety state on its own
- Feature work should stay in focused modules under `src/modules/` and `src-tauri/src/modules/`
- Phase 1 established a watch-only, findings-first experience; Phase 2 should deepen trust without re-centering generic terminal workflows
- Minimal specialized UI remains preferred over full IDE-like orchestration

### Integration Points
- New analysis depth should extend the current `phase1_analysis_*` contract or evolve it into a broader trusted-analysis module without breaking the intake-first flow
- Diff preview should connect the findings module to existing git/file diff infrastructure while staying within the specialized dashboard path
- Safety state should connect current repo context, git detection, and fallback backup-copy logic into one review-first story before any later apply phase

## Specific Ideas

- Keep the product feeling lightweight even as analysis gets more credible.
- Make trust legible: users should understand when a repo is git-protected versus backup-protected.
- Use Phase 2 to strengthen confidence in findings and review, not to broaden write automation.

## Deferred Ideas

None — discussion stayed within phase scope.

---
*Phase: 2-Trusted Analysis & Safety Workflow*
*Context gathered: 2026-06-01*
