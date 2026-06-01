# Phase 1: Java Repo Intake & Findings Shell - Research

**Researched:** 2026-06-01
**Domain:** Java repository intake, desktop workflow narrowing, findings-first UI shell [VERIFIED: codebase grep]
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REPO-01 | User can open a plain Java repository that uses Maven or Gradle. | Use an OS-native directory picker plus Rust-side selected-root validation that only accepts `pom.xml`, `build.gradle`, or `build.gradle.kts`. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html] [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html] |
| REPO-02 | User can see whether the repository was recognized as Maven, Gradle, or unsupported. | Return a typed readiness DTO from Rust with `supported`, `projectType`, `repoName`, and `reason` fields and render only those states in the Java repo home. [VERIFIED: codebase grep] [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html] [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html] |
| REPO-03 | User can trigger repository indexing and analysis from the app. | Keep the trigger in the dashboard and run a watch-only background analysis job through Rust commands instead of terminal-first UI. [VERIFIED: codebase grep] |
| ANLY-04 | User can see findings explained in terms of principles like DRY, KISS, SOLID, Clean Code, or YAGNI. | Phase 1 needs a first-class findings DTO with `principles[]`, `rationale`, `priority`, and `affectedFiles[]` fields even if the initial scanner is lightweight. [VERIFIED: codebase grep] |
| PLAN-01 | User can view a prioritized list of refactor findings across the repository. | The dashboard should own one ranked findings queue with deterministic ordering and auto-selection of the top item when analysis completes. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 1 should be planned as a shell-specialization phase, not as a Java engine phase. The current codebase already has the hard parts needed for safe intake: Rust-side workspace authorization, filesystem reads, watched-path updates, and a thin React-to-Rust IPC pattern. The missing work is the product-specific entry flow, strict selected-root build detection, a dedicated watch-only analysis job boundary, and a findings-first UI that bypasses the default terminal-first shell. [VERIFIED: codebase grep]

The root-detection rule is intentionally strict and should stay that way in planning. Maven treats `pom.xml` as the project model file in the current directory, and Gradle build scripts are `build.gradle` or `build.gradle.kts`; the user already locked support to those files at the selected root. That means Phase 1 should validate only the chosen folder, not hunt downward for nested manifests or try to infer support from Java files alone. [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html] [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html] [CITED: https://docs.gradle.org/current/userguide/kotlin_dsl.html]

The strongest planning move is to keep full Java intelligence selection out of Phase 1 and define a stable findings contract now. Phase 1 only needs enough analysis plumbing to show progress, emit prioritized findings, and explain them with principle-aware rationale. That keeps this phase aligned with the roadmap and with the current project state, which explicitly defers the OpenRewrite versus parser mix to Phase 2 planning. [VERIFIED: codebase grep]

**Primary recommendation:** Use the existing Tauri + React + Rust stack, add the official Tauri dialog plugin for folder picking, perform strict selected-root Maven/Gradle detection in Rust, and build Phase 1 around a typed findings DTO plus a dedicated intake/dashboard state machine. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: codebase grep]

## Project Constraints (from AGENTS.md)

- Reuse the current Tauri + React + Rust architecture and do not rebuild the product foundation. [VERIFIED: codebase grep]
- Keep the UI minimal and lightweight and do not drift into an IDE replacement. [VERIFIED: codebase grep]
- Support plain Java Maven and Gradle repositories first. [VERIFIED: codebase grep]
- Review-before-apply remains the trust model, so Phase 1 must stay watch-only. [VERIFIED: codebase grep]
- Respect the existing native boundary and approval model for filesystem, shell, and network access. [VERIFIED: codebase grep]
- Start file-changing work through a GSD workflow, but this research artifact is explicitly requested planning output. [VERIFIED: codebase grep]
- Read `TERAX.md` before changing code and preserve its quality bar: correctness, performance, security, polished UX, and thin-shell architecture. [VERIFIED: codebase grep]
- Use `@/...` imports on the frontend and avoid new heavy dependencies without justification. [VERIFIED: codebase grep]
- `pnpm` is the project package manager; on this machine the practical fallback is `corepack pnpm`. [VERIFIED: codebase grep]
- Changes touching workspace auth, fs, IPC, shell, git, or AI tool surfaces require tests. [VERIFIED: codebase grep]
- Do not use emojis or em-dashes in code, comments, commits, or docs. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Folder picking and unsupported-state UX | Browser / Client | API / Backend | The user interaction and state transitions live in React, but the chosen path must still be validated natively before the UI trusts it. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: codebase grep] |
| Selected-root authorization and Maven/Gradle detection | API / Backend | Browser / Client | Path canonicalization and workspace-root trust already belong to Rust in this codebase and should remain there. [VERIFIED: codebase grep] [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html] [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html] |
| Readiness state machine | Browser / Client | API / Backend | The readiness card is a UI concern, but its inputs should come from one typed native response. [VERIFIED: codebase grep] |
| Watch-only analysis orchestration and progress events | API / Backend | Browser / Client | The existing repo already centralizes filesystem watching and command surfaces in Rust, which is the correct place to own long-running analysis jobs. [VERIFIED: codebase grep] |
| Ranked findings queue, detail panel, and affected files view | Browser / Client | Database / Storage | Findings presentation is a React concern; persisted last-opened repo or recent findings can remain optional store-backed polish. [VERIFIED: codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri` + `@tauri-apps/api` | 2.x in repo | Desktop shell, IPC, native boundary | Already wired throughout the app and aligned with the project constraint to evolve the existing shell. [VERIFIED: codebase grep] |
| `tauri-plugin-dialog` + `@tauri-apps/plugin-dialog` | 2.7.1 | Native directory picker for repo intake | Official Tauri plugin for open/save dialogs, including directory selection, and the documented install path adds both Rust and JS halves cleanly. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: npm registry] [VERIFIED: crates.io] |
| React | 19.1.x repo pin | Intake state machine, findings dashboard, detail panel | The app already runs on React 19.1 and the phase is primarily a workflow reshaping exercise, not a framework change. [VERIFIED: codebase grep] |
| Rust workspace/fs/watch modules | existing | Selected-root trust, detection, analysis orchestration | `WorkspaceRegistry`, `workspace_authorize`, and `fs_watch_*` already match the security and watch-only needs of this phase. [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zustand` | 5.0.12 repo pin | Small focused intake and findings view state | Use for view state that must outlive a single component but should not be folded into the generic tab shell. [VERIFIED: codebase grep] |
| `zod` | 4.3.6 repo pin | Typed readiness and findings payload validation | Use at the JS boundary for DTO validation so UI code can reject malformed native payloads early. [VERIFIED: codebase grep] |
| Existing shadcn primitives | existing | `card`, `badge`, `empty`, `progress`, `scroll-area`, `sheet`, `skeleton`, `tooltip` | Use the components that already exist in `src/components/ui/` instead of adding another UI dependency. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official dialog plugin | Custom in-app folder browser from `list_subdirs` and `fs_read_dir` | Possible, but it adds Phase 1 UI scope and loses the OS-native folder picker that the Tauri plugin already standardizes. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: codebase grep] |
| Phase-owned findings DTO | Reuse the generic tab and agent data shapes | Faster short-term wiring, but it keeps the old terminal-first product model coupled to a specialized Java findings workflow. [VERIFIED: codebase grep] |
| Lightweight findings contract now | Full Java engine choice now | Prematurely choosing the Phase 2 Java engine would expand scope and cut across the current project decision to defer that mix. [VERIFIED: codebase grep] |

**Installation:**
```bash
corepack pnpm tauri add dialog
```

**Version verification:** Before implementation, verify package versions against their registries again because this plugin is moving quickly. [VERIFIED: npm registry] [VERIFIED: crates.io]
```bash
npm view @tauri-apps/plugin-dialog version
cargo search tauri-plugin-dialog
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `@tauri-apps/plugin-dialog` | npm | 3 years | 449,133/week | github.com/tauri-apps/plugins-workspace | OK | Approved. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: npm registry] |
| `tauri-plugin-dialog` | crates.io | 3 years | 3.6M recent | github.com/tauri-apps/plugins-workspace | n/a | Approved. [CITED: https://v2.tauri.app/ko/plugin/dialog/] [VERIFIED: crates.io] |

**Packages removed due to slopcheck `SLOP` verdict:** none
**Packages flagged as suspicious `SUS`:** none

*Audit note:* `python -m slopcheck install @tauri-apps/plugin-dialog` returned an `[OK]` verdict before failing on the install step because raw `npm` is not on PATH in this environment, while `rtk npm` and `corepack pnpm` are available. The legitimacy verdict is still usable. [VERIFIED: codebase grep]

## Architecture Patterns

### System Architecture Diagram

```text
User
  |
  v
Java Repo Home (React)
  |
  +--> Open folder dialog -> chosen path
                           |
                           v
                 Rust intake command
                 - authorize selected root
                 - inspect only selected root
                 - detect pom.xml / build.gradle / build.gradle.kts
                 - return readiness DTO
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
 Unsupported state                    Findings dashboard shell
 choose another folder                - top bar
                                      - empty queue
                                      - Start full analysis
                                                |
                                                v
                                     Rust analysis job boundary
                                     - watch-only progress
                                     - bounded file watching
                                     - typed findings stream/result
                                                |
                                                v
                                  Ranked findings queue + detail panel
                                  - priority-first list
                                  - principle-aware rationale
                                  - affected files
```

### Recommended Project Structure

```text
src/
├── modules/java-intake/      # repo home, unsupported state, readiness DTO adapter
├── modules/findings/         # queue, detail panel, progress strip, findings state
└── app/                      # thin coordinator that routes between intake and dashboard

src-tauri/src/modules/
├── java_repo.rs              # selected-root detection and readiness command
├── analysis/                 # watch-only Phase 1 job orchestration
└── workspace.rs              # reused authorization boundary
```

### Pattern 1: Native Intake Command plus Typed DTO
**What:** One Rust command should accept a selected path, authorize it, inspect only that root, and return a DTO like `{ supported, projectType, repoName, reason }`. [VERIFIED: codebase grep]
**When to use:** Always for the first repo selection and for every `Choose another folder` retry. [VERIFIED: codebase grep]
**Example:**
```typescript
// Source: https://v2.tauri.app/ko/plugin/dialog/
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const selected = await open({
  directory: true,
  multiple: false,
  title: "Choose Java repository",
});

if (typeof selected === "string") {
  const readiness = await invoke("java_repo_readiness", { path: selected });
}
```

### Pattern 2: Findings Contract before Real Engine Depth
**What:** Define the Phase 1 findings shape first, then let the initial scanner fill it with lightweight rules and progress events. [VERIFIED: codebase grep]
**When to use:** For all three plans in this phase, because the UI contract depends on stable fields more than on deep engine sophistication. [VERIFIED: codebase grep]
**Example:**
```typescript
// Source: existing codebase IPC pattern in src/modules/ai/lib/native.ts [VERIFIED: codebase grep]
type FindingPrinciple = "DRY" | "KISS" | "SOLID" | "CleanCode" | "YAGNI";

type RepoFinding = {
  id: string;
  title: string;
  category: "safety" | "performance" | "modernization" | "maintainability";
  priority: number;
  rationale: string;
  principles: FindingPrinciple[];
  affectedFiles: string[];
};
```

### Anti-Patterns to Avoid

- **Terminal-first fallback path:** Do not satisfy `Start full analysis` by opening a shell tab or asking the user to run commands manually. The dashboard is the product surface in this phase. [VERIFIED: codebase grep]
- **Recursive root guessing:** Do not search downward for nested build files when the selected root fails support; the locked rule is selected-root strictness. [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html] [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html]
- **AI-only prioritization:** Do not let ranking depend on nondeterministic model output in Phase 1; use a deterministic score so the dashboard stays stable and testable. [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Folder selection | A custom cross-platform folder picker | Official Tauri dialog plugin | It already handles native directory selection and integrates with the Tauri plugin model. [CITED: https://v2.tauri.app/ko/plugin/dialog/] |
| Workspace trust | Frontend-only path trust or ad hoc canonicalization | Existing `WorkspaceRegistry` and `workspace_authorize` | This codebase already centralizes root authorization and path canonicalization in Rust. [VERIFIED: codebase grep] |
| File watching for live progress | Custom polling loop | Existing `notify`-backed `fs_watch_*` commands | The repo already debounces filesystem events and skips large generated directories. [VERIFIED: codebase grep] |
| Generic dashboard layout primitives | Another UI kit | Existing shadcn primitives in `src/components/ui/` | The required Phase 1 building blocks already exist locally. [VERIFIED: codebase grep] |

**Key insight:** Phase 1 complexity is mostly workflow and boundary design, not missing infrastructure. Reusing the existing native trust and watch layers is safer than replacing them. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Detecting support from nested manifests or Java files
**What goes wrong:** A folder with Java files or nested Gradle modules gets treated as supported even when the selected root is not the build root. [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html]
**Why it happens:** Gradle multi-project builds often contain multiple subproject build files, and Maven users may open a parent folder that is not the intended module root. [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html] [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html]
**How to avoid:** Validate only the selected root against the locked file rule and render the unsupported state immediately when it fails. [VERIFIED: codebase grep]
**Warning signs:** The UI claims support before showing which build tool was detected, or unsupported repos can still reach the dashboard. [VERIFIED: codebase grep]

### Pitfall 2: Coupling Phase 1 to a globally installed Gradle binary
**What goes wrong:** Analysis works for Maven repos on the developer machine but silently excludes Gradle repos because `gradle` is not installed globally. [VERIFIED: codebase grep]
**Why it happens:** This environment has Java and Maven but no global `gradle`; Gradle's own docs recommend the project wrapper as the standard execution path. [VERIFIED: codebase grep] [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html]
**How to avoid:** Keep Phase 1 detection independent of build execution, and if any later task needs Gradle or Maven execution prefer `gradlew`/`gradlew.bat` or `mvnw`/`mvnw.cmd` when present. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html] [CITED: https://maven.apache.org/wrapper/index.html]
**Warning signs:** Plans include `gradle` or `mvn` as the first execution path, or they mark missing global Gradle as a Phase 1 blocker. [VERIFIED: codebase grep]

### Pitfall 3: Leaving the generic shell alive as the first-run surface
**What goes wrong:** The product still feels like a terminal app because the default shell tab remains the initial visual center. [VERIFIED: codebase grep]
**Why it happens:** `useTabs()` currently seeds a terminal tab and `App.tsx` coordinates many legacy surfaces by default. [VERIFIED: codebase grep]
**How to avoid:** Introduce an intake-first route or app mode that renders before generic tabs, explorer, source control, and AI surfaces become primary. [VERIFIED: codebase grep]
**Warning signs:** The first screen shows tab chrome, shell labels, source-control rails, or status-bar workspace switching before repo readiness is resolved. [VERIFIED: codebase grep]

### Pitfall 4: Watching too much of the repository
**What goes wrong:** Analysis progress becomes noisy or expensive on large repos because generated trees flood the watcher. [VERIFIED: codebase grep]
**Why it happens:** Java repos often contain `.gradle`, `target`, and build output trees that should not drive user-facing progress. [VERIFIED: codebase grep]
**How to avoid:** Reuse the existing Rust watcher skip-list and register only the bounded set of paths needed for Phase 1 progress. [VERIFIED: codebase grep]
**Warning signs:** Repeated change events from `.gradle`, `target`, `build`, or `.git` dominate progress updates. [VERIFIED: codebase grep]

## Code Examples

Verified patterns from official sources:

### Open a native directory picker
```typescript
// Source: https://v2.tauri.app/ko/plugin/dialog/
import { open } from "@tauri-apps/plugin-dialog";

const folder = await open({
  directory: true,
  multiple: false,
  title: "Choose Java repository",
});
```

### Initialize the dialog plugin in Tauri
```rust
// Source: https://v2.tauri.app/ko/plugin/dialog/
tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic terminal-first desktop shell | Specialized task-first intake and findings shell | Current project direction | Phase 1 should hide or demote generic tabs, terminal-first flows, and broad navigation. [VERIFIED: codebase grep] |
| Global Gradle execution | Wrapper-first Gradle execution | Current Gradle docs | Plans should not assume `gradle` exists on the user machine. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html] |
| Implicit Maven installation requirement | Wrapper-capable Maven execution | Current Maven Wrapper docs | Future execution paths can avoid a hard Maven install dependency when repos include `mvnw`. [CITED: https://maven.apache.org/wrapper/index.html] |

**Deprecated/outdated:**

- Global-tool-first assumptions for Java build execution are outdated when wrapper scripts are present. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html] [CITED: https://maven.apache.org/wrapper/index.html]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Deterministic local scoring is sufficient for Phase 1 findings prioritization without model-ranked ordering. [ASSUMED] | Common Pitfalls / Anti-Patterns | Medium. The planner may need a refinement task if product review demands richer ranking semantics immediately. |

## Open Questions

1. **Should Phase 1 analysis return fixture-backed findings first or a very small real heuristic scanner?**
   - What we know: The phase only requires prioritized findings plus principle-aware rationale, and full Java engine selection is deferred to Phase 2. [VERIFIED: codebase grep]
   - What's unclear: Whether the product owner expects every finding in Phase 1 to come from real repository inspection versus a thin starter ruleset. [ASSUMED]
   - Recommendation: Plan for a real but narrow scanner that inspects manifest presence and a small set of file-level heuristics so the UI and job boundary stay honest without dragging Phase 2 work forward. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build and tests | yes | 24.11.1 | - |
| `pnpm` | Frontend scripts | no | - | `corepack pnpm` 11.5.0 is available. [VERIFIED: codebase grep] |
| Cargo | Tauri backend build and tests | yes | 1.95.0 | - |
| Rust | Tauri backend build | yes | 1.95.0 | - |
| Java | Java repo fixture work and future analysis evolution | yes | 21.0.9 | - |
| Maven | Maven fixture validation and future build-aware work | yes | 3.9.11 | Maven wrapper is also supported when present. [CITED: https://maven.apache.org/wrapper/index.html] |
| Gradle | Future build-aware Gradle work | no | - | Prefer repo-local `gradlew`/`gradlew.bat`; Phase 1 should not require global Gradle. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html] |

**Missing dependencies with no fallback:**

- none for Phase 1 if the analysis trigger stays build-tool independent. [VERIFIED: codebase grep]

**Missing dependencies with fallback:**

- Direct `pnpm` is missing, but `corepack pnpm` works and should be used for planning commands on this machine. [VERIFIED: codebase grep]
- Global Gradle is missing, but the Gradle wrapper is the documented standard path when a repo provides it. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 plus Rust `cargo test --locked` harness. [VERIFIED: codebase grep] |
| Config file | none detected for Vitest; package script uses default runner behavior. [VERIFIED: codebase grep] |
| Quick run command | `corepack pnpm test` and targeted `cargo test --locked --test <name>`. [VERIFIED: codebase grep] |
| Full suite command | `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked`. [VERIFIED: codebase grep] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REPO-01 | Accept selected-root Maven or Gradle repos and reject others | Rust integration | `cargo test --locked --test java_repo_intake` | no - Wave 0 |
| REPO-02 | Surface `maven`, `gradle`, or `unsupported` correctly | Rust unit/integration | `cargo test --locked --test java_repo_intake detect_project_type` | no - Wave 0 |
| REPO-03 | `Start full analysis` triggers analysis from the dashboard | frontend component | `corepack pnpm test -- src/modules/java-intake/*.test.ts` | no - Wave 0 |
| ANLY-04 | Findings show principle-aware rationale | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | no - Wave 0 |
| PLAN-01 | Findings render as one ranked queue and auto-select top result | frontend component | `corepack pnpm test -- src/modules/findings/*.test.ts` | no - Wave 0 |

### Sampling Rate

- **Per task commit:** `corepack pnpm test` for frontend touches and targeted `cargo test --locked --test java_repo_intake` for native intake work. [VERIFIED: codebase grep]
- **Per wave merge:** `corepack pnpm exec tsc --noEmit && corepack pnpm test && cargo clippy && cargo test --locked`. [VERIFIED: codebase grep]
- **Phase gate:** Full suite green before `$gsd-verify-work`. [VERIFIED: codebase grep]

### Wave 0 Gaps

- [ ] `src-tauri/tests/java_repo_intake.rs` - selected-root detection, unsupported cases, and wrapper-path edge cases. [VERIFIED: codebase grep]
- [ ] `src/modules/java-intake/*.test.ts` - intake state machine and unsupported-state transitions. [VERIFIED: codebase grep]
- [ ] `src/modules/findings/*.test.ts` - ranked queue ordering, top-item auto-select, and rationale rendering. [VERIFIED: codebase grep]
- [ ] Fixture repos for root-level `pom.xml`, `build.gradle`, `build.gradle.kts`, and unsupported Java-like folders. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No user-auth surface is introduced in this phase. [VERIFIED: codebase grep] |
| V3 Session Management | no | No credential session model is added in this phase. [VERIFIED: codebase grep] |
| V4 Access Control | yes | Keep selected-root and follow-on file access behind `WorkspaceRegistry` and Rust IPC commands. [VERIFIED: codebase grep] |
| V5 Input Validation | yes | Validate chosen paths, normalize separators, and validate DTOs at the JS boundary. [VERIFIED: codebase grep] |
| V6 Cryptography | no | No new crypto requirement exists in this phase. [VERIFIED: codebase grep] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized path escape from a chosen repo root | Tampering | Reuse `workspace_authorize`, canonicalization, and root-prefix authorization in Rust. [VERIFIED: codebase grep] |
| Shell or command injection through analysis launch | Elevation of Privilege | Keep Phase 1 analysis behind fixed native commands or tightly bounded argv, not free-form shell text from the UI. [VERIFIED: codebase grep] |
| Watcher-driven denial of service from generated trees | Denial of Service | Reuse watcher skip directories and keep watch registration bounded. [VERIFIED: codebase grep] |
| Misleading trust state in the UI | Spoofing | Render repo support only from native detection results, never from frontend guesses. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)

- Official Tauri dialog plugin docs: https://v2.tauri.app/ko/plugin/dialog/ - install path, plugin initialization, platform support, JS usage. [CITED: https://v2.tauri.app/ko/plugin/dialog/]
- Official Tauri dialog JS reference: https://v2.tauri.app/reference/javascript/dialog/ - `directory` option and dialog API details. [CITED: https://v2.tauri.app/reference/javascript/dialog/]
- Official Maven POM guide: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html - `pom.xml` meaning and current-directory lookup model. [CITED: https://maven.apache.org/guides/introduction/introduction-to-the-pom.html]
- Official Gradle build file guide: https://docs.gradle.org/current/userguide/build_file_basics.html - `build.gradle` and `build.gradle.kts` as accepted build-script files. [CITED: https://docs.gradle.org/current/userguide/build_file_basics.html]
- Official Gradle Kotlin DSL guide: https://docs.gradle.org/current/userguide/kotlin_dsl.html - `.gradle.kts` naming and settings-file extension details. [CITED: https://docs.gradle.org/current/userguide/kotlin_dsl.html]
- Official Gradle Wrapper guide: https://docs.gradle.org/current/userguide/gradle_wrapper.html - wrapper-first execution guidance. [CITED: https://docs.gradle.org/current/userguide/gradle_wrapper.html]
- Official Maven Wrapper docs: https://maven.apache.org/wrapper/index.html - wrapper-first Maven execution path. [CITED: https://maven.apache.org/wrapper/index.html]
- Local codebase files reviewed: `src/app/App.tsx`, `src-tauri/src/modules/workspace.rs`, `src-tauri/src/modules/fs/watch.rs`, `src/modules/ai/lib/native.ts`, `src/modules/workspace/env.ts`, `src/components/ui/*.tsx`, `package.json`, `src-tauri/Cargo.toml`, `TERAX.md`, `CONTRIBUTING.md`. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)

- none

### Tertiary (LOW confidence)

- none

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - the recommendation mostly reuses existing code plus one official Tauri plugin verified in official docs and registries.
- Architecture: HIGH - the codebase already shows the correct Rust-versus-React split for intake, watching, and IPC.
- Pitfalls: MEDIUM - the repo-shell pitfalls are well supported, but the exact Phase 1 findings ranking behavior still has one deliberate assumption.

**Research date:** 2026-06-01
**Valid until:** 2026-07-01
