# Phase 2: Trusted Analysis & Safety Workflow - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 16
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src-tauri/src/modules/analysis/mod.rs` | service | event-driven | `src-tauri/src/modules/analysis/mod.rs` | exact |
| `src-tauri/tests/java_analysis_review.rs` | test | request-response | `src-tauri/tests/java_repo_intake.rs` | role-match |
| `src-tauri/tests/java_safety_flow.rs` | test | request-response | `src-tauri/tests/git_operations.rs` | role-match |
| `src/modules/findings/lib/useFindings.ts` | hook | request-response | `src/modules/findings/lib/useFindings.ts` | exact |
| `src/modules/findings/FindingsDashboard.tsx` | component | request-response | `src/modules/findings/FindingsDashboard.tsx` | exact |
| `src/modules/findings/FindingDetailSheet.tsx` | component | request-response | `src/modules/findings/FindingDetailSheet.tsx` | exact |
| `src/modules/findings/FindingsDashboard.test.ts` | test | request-response | `src/modules/findings/FindingsDashboard.test.ts` | exact |
| `src/modules/source-control/SourceControlPanel.tsx` | component | request-response | `src/modules/source-control/SourceControlPanel.tsx` | exact |
| `src/modules/source-control/useSourceControlPanel.ts` | hook | request-response | `src/modules/source-control/useSourceControlPanel.ts` | exact |
| `src-tauri/src/modules/git/commands.rs` | service | request-response | `src-tauri/src/modules/git/commands.rs` | exact |
| `src-tauri/src/modules/git/operations.rs` | service | request-response | `src-tauri/src/modules/git/operations.rs` | exact |
| `src-tauri/src/modules/fs/file.rs` | service | request-response | `src-tauri/src/modules/fs/file.rs` | exact |
| `src-tauri/src/modules/fs/mutate.rs` | service | request-response | `src-tauri/src/modules/fs/mutate.rs` | exact |
| `src-tauri/src/modules/workspace.rs` | service | request-response | `src-tauri/src/modules/workspace.rs` | exact |
| `src-tauri/src/lib.rs` | config | request-response | `src-tauri/src/lib.rs` | exact |
| `src-tauri/src/modules/mod.rs` | config | request-response | `src-tauri/src/modules/mod.rs` | exact |

## Shared Patterns

### Native Analysis State Expansion
**Source:** `src-tauri/src/modules/analysis/mod.rs`
**Apply to:** richer Phase 2 findings types, repo-wide scan stages, safety snapshot attachment
```rust
#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Phase1AnalysisSnapshot { ... }
```
Keep progress/state ownership in Rust and evolve the DTO instead of inventing a second analysis state channel.

### Frontend Findings State Machine
**Source:** `src/modules/findings/lib/useFindings.ts`
**Apply to:** diff preview state, grouping metadata, richer error handling, safety badges
```ts
export type FindingsPanelState = "empty" | "analyzing" | "ready" | "error";
```
Extend the existing hook contract instead of splitting review state into a separate generic module too early.

### Detail Panel as Review Surface
**Source:** `src/modules/findings/FindingsDashboard.tsx`, `src/modules/findings/FindingDetailSheet.tsx`
**Apply to:** rationale, affected files, diff preview, safety explanation
Use the current right-side review path and keep dashboard context stable while details deepen.

### Git-first Native Safety Contract
**Source:** `src-tauri/src/modules/git/commands.rs`, `src-tauri/src/modules/git/operations.rs`
**Apply to:** repo detection, diff preview, rollback readiness, safety-state reporting
```rust
pub async fn git_panel_snapshot(...)
pub async fn git_diff(...)
pub async fn git_show_commit(...)
```
Use existing repo-aware primitives rather than introducing shell-driven git calls.

### Backup-copy Fallback in Native FS Layer
**Source:** `src-tauri/src/modules/fs/file.rs`, `src-tauri/src/modules/fs/mutate.rs`
**Apply to:** backup snapshot creation and restore metadata for non-git repos
Keep backup operations inside the authorized Rust boundary alongside current atomic write behavior.

### Test Fixture Pattern
**Source:** `src-tauri/tests/common/mod.rs`, `src-tauri/tests/java_repo_intake.rs`, `src-tauri/tests/git_operations.rs`
**Apply to:** trusted-analysis and safety integration tests
Build temp repo fixtures and assert module-boundary behavior rather than UI-driven filesystem mutation.

## Integration Guidance

- Extend `src-tauri/src/modules/analysis/mod.rs` first; do not create a parallel analysis module unless responsibility clearly splits.
- Keep review-first UI inside `src/modules/findings/`; use source-control components as stylistic and interaction analogs, not as a replacement navigation path.
- Introduce any new safety snapshot DTOs in native modules and validate them with `zod` on the JS boundary.
- Keep apply actions absent or disabled in Phase 2 UI to preserve the locked review-only boundary.

## No Analog Found

None. All planned Phase 2 surfaces have strong analogs in the existing codebase.

## Metadata

**Analog search scope:** `src/`, `src-tauri/src/`, `src-tauri/tests/`
**Files scanned:** 16
**Pattern extraction date:** 2026-06-01
