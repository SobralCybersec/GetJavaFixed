# Phase 1: Java Repo Intake & Findings Shell - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

## Phase Boundary

Phase 1 delivers the specialized Java-refactor entry experience: a dedicated Java repository home, strict Maven/Gradle repo validation at the selected root, lightweight readiness detection, and a findings-first dashboard shell that makes the product feel like a Java refactor assistant instead of a generic terminal workspace.

## Implementation Decisions

### Entry Flow
- **D-01:** The app should open into a dedicated Java repo home instead of the old generic workspace shell.
- **D-02:** The Java repo home should use a single primary action.
- **D-03:** After a valid repo passes readiness, the user should go straight to the findings dashboard.
- **D-04:** Before full analysis, the app should run only a lightweight readiness check.
- **D-05:** The readiness step should show repo validity and a clear `Start full analysis` action.

### Main Screen Shape
- **D-06:** The main Phase 1 surface should be a findings-first dashboard.
- **D-07:** Other navigation should remain clearly secondary to findings.
- **D-08:** The most important secondary surface should be affected files.
- **D-09:** Finding cards in the dashboard should stay compact and scannable.
- **D-10:** Deeper finding details should open in a right-side detail panel.
- **D-11:** Findings should be shown as one priority-first ranked list.
- **D-12:** Each finding should keep a small category badge even though the list is not grouped by category.

### Unsupported Repo Handling
- **D-13:** Phase 1 should hard block unsupported repositories.
- **D-14:** A repository counts as supported only if the selected root contains `pom.xml`, `build.gradle`, or `build.gradle.kts`.
- **D-15:** The rejection screen should emphasize why the repo was rejected.
- **D-16:** The only recovery action from the rejection screen should be picking another folder.
- **D-17:** If Java files are present but the repo still fails the support rule, the message should explicitly say it is not supported in Phase 1.

### Analysis Trigger Behavior
- **D-18:** The primary action should say `Start full analysis`.
- **D-19:** After the user clicks that action, the app should stay on the dashboard and show live progress there.
- **D-20:** Phase 1 scanning should be watch-only while analysis runs.
- **D-21:** When the full scan finishes, the dashboard should auto-focus the top findings.

### Readiness Details
- **D-22:** The readiness check should stay strict minimum: supported or unsupported, detected build tool, and the clear next action only.
- **D-23:** Git status should not appear in the Phase 1 readiness check.

### Loaded Repo Header
- **D-24:** Once inside the dashboard, the repo identity should be shown as a minimal header with repo name and build tool only.
- **D-25:** That header should remain visible as a small persistent top bar.

### the agent's Discretion
No explicit "you decide" areas were left open in the discussion. The planner may choose technical implementation details as long as they preserve the decisions above.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Scope
- `.planning/PROJECT.md` — product direction, constraints, and Phase 1 positioning
- `.planning/REQUIREMENTS.md` — locked Phase 1 requirements: `REPO-01`, `REPO-02`, `REPO-03`, `ANLY-04`, `PLAN-01`
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and plan slots

### Existing Codebase Context
- `.planning/codebase/STACK.md` — current Tauri/React/Rust foundation available for reuse
- `.planning/codebase/ARCHITECTURE.md` — current app shell, native boundary, and reusable module structure
- `.planning/codebase/CONVENTIONS.md` — naming, layering, and repo style expectations
- `TERAX.md` — living architecture guidance for the existing workspace and quality bar

## Existing Code Insights

### Reusable Assets
- `src/app/App.tsx`: current app coordinator and workspace shell that can be narrowed into the Java-refactor product flow
- `src/modules/tabs/`, `src/modules/editor/`, `src/modules/explorer/`: reusable workspace surfaces that can be specialized rather than rebuilt
- `src/modules/source-control/` and `src/modules/git-history/`: existing git-aware UI surfaces that may later support safety and rollback workflows
- `src-tauri/src/modules/workspace.rs`: workspace authorization and root handling, likely central to repo selection and validation
- `src-tauri/src/modules/fs/` and `src-tauri/src/modules/git/`: native file and git primitives that can power readiness and later analysis flows

### Established Patterns
- Rust owns OS access and validation, while the React layer stays focused on user-facing workflow composition
- Feature work should live in focused modules under `src/modules/`, not directly inside `App.tsx`
- Current UI surfaces favor hidden-but-mounted tab/pane patterns, but Phase 1 should not preserve generic terminal-first UX just because it exists

### Integration Points
- Repo selection and validation should plug into the current workspace/root model rather than bypass it
- The new Java repo home will likely become the first visible entry state before existing multi-surface workspace flows
- Findings-first dashboard work should likely connect to current editor/diff/future AI surfaces without exposing them as top-level generic tools

## Specific Ideas

- The product should feel intentionally specialized from the first screen onward.
- The findings dashboard should emphasize the highest-impact queue first, not counts or repo structure.
- Unsupported repositories should be rejected clearly and firmly in Phase 1, not handled through partial fallback modes.

## Deferred Ideas

None - discussion stayed within phase scope.

---
*Phase: 1-Java Repo Intake & Findings Shell*
*Context gathered: 2026-06-01*
