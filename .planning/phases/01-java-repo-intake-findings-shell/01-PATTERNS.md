# Phase 1: Java Repo Intake & Findings Shell - Pattern Map

**Mapped:** 2026-06-01
**Files analyzed:** 18
**Analogs found:** 18 / 18

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/App.tsx` | component | request-response | `src/app/App.tsx` | exact |
| `src/modules/java-intake/index.ts` | utility | request-response | `src/modules/preview/index.ts` | exact |
| `src/modules/java-intake/JavaRepoHome.tsx` | component | request-response | `src/modules/updater/UpdaterDialog.tsx` | role-match |
| `src/modules/java-intake/lib/native.ts` | service | request-response | `src/modules/ai/lib/native.ts` | exact |
| `src/modules/findings/index.ts` | utility | request-response | `src/modules/source-control/index.ts` | exact |
| `src/modules/findings/FindingsDashboard.tsx` | component | request-response | `src/modules/source-control/SourceControlPanel.tsx` | role-match |
| `src/modules/findings/FindingDetailSheet.tsx` | component | request-response | `src/components/ui/sheet.tsx` | partial |
| `src/modules/findings/lib/useFindings.ts` | hook | request-response | `src/modules/source-control/useSourceControlPanel.ts` | role-match |
| `src/modules/java-intake/JavaRepoHome.test.ts` | test | request-response | `src/modules/preview/PreviewPane.test.ts` | role-match |
| `src/modules/findings/FindingsDashboard.test.ts` | test | request-response | `src/modules/preview/PreviewPane.test.ts` | role-match |
| `src-tauri/src/modules/mod.rs` | config | request-response | `src-tauri/src/modules/mod.rs` | exact |
| `src-tauri/src/modules/java_repo.rs` | service | CRUD | `src-tauri/src/modules/workspace.rs` | role-match |
| `src-tauri/src/modules/analysis/mod.rs` | service | event-driven | `src-tauri/src/modules/fs/watch.rs` | dataflow-match |
| `src-tauri/src/lib.rs` | config | request-response | `src-tauri/src/lib.rs` | exact |
| `src-tauri/tests/java_repo_intake.rs` | test | CRUD | `src-tauri/tests/fs_search.rs` | role-match |
| `package.json` | config | request-response | `package.json` | exact |
| `src-tauri/Cargo.toml` | config | request-response | `src-tauri/Cargo.toml` | exact |
| `src-tauri/capabilities/default.json` | config | request-response | `src-tauri/capabilities/default.json` | exact |

## Pattern Assignments

### `src/app/App.tsx`

**Analog:** `src/app/App.tsx`

**Imports + coordinator shape** ([src/app/App.tsx](/g:/refactoringjdk/terax-ai/src/app/App.tsx:1))
```tsx
import { FileExplorer, type FileExplorerHandle } from "@/modules/explorer";
import { SourceControlPanel, useSourceControl } from "@/modules/source-control";
import { MAX_PANES_PER_TAB, useTabs, useWorkspaceCwd } from "@/modules/tabs";
```

**Current workspace-shell entry point to replace with intake-first mode** ([src/app/App.tsx](/g:/refactoringjdk/terax-ai/src/app/App.tsx:179))
```tsx
export default function App() {
  const {
    tabs,
    activeId,
    ...
    resetWorkspace,
  } = useTabs(getLaunchDir() ? { cwd: getLaunchDir() } : undefined);
```

**Main layout split with secondary rail** ([src/app/App.tsx](/g:/refactoringjdk/terax-ai/src/app/App.tsx:1461))
```tsx
<ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
  <ResizablePanel id="sidebar" ...>
    ...
    <SidebarRail activeView={sidebarView} ... />
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel id="workspace" defaultSize="78%" minSize="30%">
```

Copy the coordinator pattern, but replace the default terminal-first `workspaceSurface` path with an intake/dashboard mode switch before generic tabs become primary.

---

### `src/modules/java-intake/index.ts`

**Analog:** `src/modules/preview/index.ts`

**Thin barrel export** ([src/modules/preview/index.ts](/g:/refactoringjdk/terax-ai/src/modules/preview/index.ts:1))
```ts
export { PreviewStack } from "./PreviewStack";
export { type PreviewPaneHandle } from "./PreviewPane";
```

Use the same minimal barrel style: export the main component plus any DTO/types intentionally exposed to `App.tsx`.

---

### `src/modules/java-intake/JavaRepoHome.tsx`

**Analog:** `src/modules/updater/UpdaterDialog.tsx`

**Compact import block + local helpers** ([src/modules/updater/UpdaterDialog.tsx](/g:/refactoringjdk/terax-ai/src/modules/updater/UpdaterDialog.tsx:1))
```tsx
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
```

**Render-gate on state, then return a single compact surface** ([src/modules/updater/UpdaterDialog.tsx](/g:/refactoringjdk/terax-ai/src/modules/updater/UpdaterDialog.tsx:48))
```tsx
const open = status.kind === "available" || ...;
if (!open) return null;
```

**Progress strip pattern for readiness/analysis status** ([src/modules/updater/UpdaterDialog.tsx](/g:/refactoringjdk/terax-ai/src/modules/updater/UpdaterDialog.tsx:111))
```tsx
{downloading && progress !== null && (
  <Progress value={progress} className="mt-2" />
)}
```

For the intake home, copy the small-surface discipline: one primary action, terse text, and a single progress/readiness band instead of a complex page coordinator.

---

### `src/modules/java-intake/lib/native.ts`

**Analog:** `src/modules/ai/lib/native.ts`

**Typed DTOs at the module boundary** ([src/modules/ai/lib/native.ts](/g:/refactoringjdk/terax-ai/src/modules/ai/lib/native.ts:4))
```ts
export type ReadResult = ...;
export type DirEntry = ...;
```

**Centralized `invoke()` wrapper object** ([src/modules/ai/lib/native.ts](/g:/refactoringjdk/terax-ai/src/modules/ai/lib/native.ts:126))
```ts
export const native = {
  workspaceCurrentDir: () => invoke<string>("workspace_current_dir"),
  workspaceAuthorize: (path: string) =>
    invoke<string>("workspace_authorize", {
      path,
      workspace: currentWorkspaceEnv(),
    }),
```

Use this exact wrapper pattern for `java_repo_readiness`, `analysis_start`, and any analysis-progress reads. Keep DTO definitions local and typed.

---

### `src/modules/findings/index.ts`

**Analog:** `src/modules/source-control/index.ts`

**Barrel with component + hook exports** ([src/modules/source-control/index.ts](/g:/refactoringjdk/terax-ai/src/modules/source-control/index.ts:1))
```ts
export { SourceControlPanel } from "./SourceControlPanelLazy";
export {
  getSourceControlRemoteIndicator,
  useSourceControl,
  type SourceControlSummary,
} from "./useSourceControl";
```

Mirror this structure for a `FindingsDashboard` export plus `useFindings` and DTO types.

---

### `src/modules/findings/FindingsDashboard.tsx`

**Analog:** `src/modules/source-control/SourceControlPanel.tsx`

**Flat row model for a ranked queue** ([src/modules/source-control/SourceControlPanel.tsx](/g:/refactoringjdk/terax-ai/src/modules/source-control/SourceControlPanel.tsx:79))
```tsx
type RowDescriptor =
  | { kind: "banner-diverged"; key: string }
  | { kind: "list-header"; key: string; count: number }
  | { kind: "entry"; key: string; entry: SourceControlFileEntry };
```

**Stateful panel shell with keyboard and selection support** ([src/modules/source-control/SourceControlPanel.tsx](/g:/refactoringjdk/terax-ai/src/modules/source-control/SourceControlPanel.tsx:129))
```tsx
export const SourceControlPanel = memo(function SourceControlPanel(...) {
  const scm = useSourceControlPanel(open, sourceControl, onOpenDiff);
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null);
```

**Primary list rendering pattern** ([src/modules/source-control/SourceControlPanel.tsx](/g:/refactoringjdk/terax-ai/src/modules/source-control/SourceControlPanel.tsx:693))
```tsx
<div role="listbox" aria-label="Changed files" ...>
  <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
    ...
    <RowRenderer row={row} focused={focusedRowKey === row.key} ... />
```

**Compact item row styling** ([src/modules/source-control/SourceControlPanel.tsx](/g:/refactoringjdk/terax-ai/src/modules/source-control/SourceControlPanel.tsx:924))
```tsx
<div
  data-focused={focused || undefined}
  data-selected={isSelected || undefined}
  role="option"
  aria-selected={isSelected}
  className={cn(
    "group relative flex h-[30px] items-center gap-2 rounded-md ...",
```

Use this file as the strongest frontend analog for the findings queue: one ranked flat list, compact rows, selected item tracking, and a secondary detail surface.

---

### `src/modules/findings/FindingDetailSheet.tsx`

**Analog:** `src/components/ui/sheet.tsx`

**Right-side detail panel primitive** ([src/components/ui/sheet.tsx](/g:/refactoringjdk/terax-ai/src/components/ui/sheet.tsx:47))
```tsx
function SheetContent({
  side = "right",
  showCloseButton = true,
  ...
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content data-side={side} ...>
```

**Standard header/footer/title slots** ([src/components/ui/sheet.tsx](/g:/refactoringjdk/terax-ai/src/components/ui/sheet.tsx:87))
```tsx
function SheetHeader(...) { ... }
function SheetFooter(...) { ... }
function SheetTitle(...) { ... }
function SheetDescription(...) { ... }
```

Build the findings detail panel as a thin composition over these primitives, not a custom overlay system.

---

### `src/modules/findings/lib/useFindings.ts`

**Analog:** `src/modules/source-control/useSourceControlPanel.ts`

**Explicit UI state union + derived entry types** ([src/modules/source-control/useSourceControlPanel.ts](/g:/refactoringjdk/terax-ai/src/modules/source-control/useSourceControlPanel.ts:19))
```ts
type PanelState = "closed" | "loading" | "no-repo" | "ready" | "error";
```

**Hook-owned state with clear inputs/outputs** ([src/modules/source-control/useSourceControlPanel.ts](/g:/refactoringjdk/terax-ai/src/modules/source-control/useSourceControlPanel.ts:356))
```ts
export function useSourceControlPanel(
  isOpen: boolean,
  summary: SourceControlSummary,
  onOpenDiff: ...,
): SourceControlPanelState {
```

**Boundary error normalization** ([src/modules/source-control/useSourceControlPanel.ts](/g:/refactoringjdk/terax-ai/src/modules/source-control/useSourceControlPanel.ts:113))
```ts
function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  ...
  return "Unknown source control error";
}
```

**Selection reconciliation after source data changes** ([src/modules/source-control/useSourceControlPanel.ts](/g:/refactoringjdk/terax-ai/src/modules/source-control/useSourceControlPanel.ts:567))
```ts
useEffect(() => {
  if (!isOpen) { ... }
  if (!summary.hasRepo) { ... }
  ...
  setPanelState("ready");
```

Copy this hook pattern for intake/dashboard state: explicit `loading/unsupported/ready/analyzing/error` states, derived selected finding, and normalized user-facing error strings.

---

### `src/modules/java-intake/JavaRepoHome.test.ts`

**Analog:** `src/modules/preview/PreviewPane.test.ts`

**Source-level regression pattern** ([src/modules/preview/PreviewPane.test.ts](/g:/refactoringjdk/terax-ai/src/modules/preview/PreviewPane.test.ts:14))
```ts
const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, "PreviewPane.tsx"), "utf8");
```

**Small, focused `vitest` assertions** ([src/modules/preview/PreviewPane.test.ts](/g:/refactoringjdk/terax-ai/src/modules/preview/PreviewPane.test.ts:25))
```ts
describe("PreviewPane iframe sandbox", () => {
  it("declares an iframe in the source", () => {
    expect(iframeJsx).not.toBe("");
  });
```

Use the same lightweight style if the new component is mostly static shell markup. For behavioral logic, add hook tests around `useFindings` or intake DTO adapters.

---

### `src/modules/findings/FindingsDashboard.test.ts`

**Analog:** `src/modules/preview/PreviewPane.test.ts`

Use the same `describe`/`it` structure and keep assertions narrow: ranked ordering, top-item auto-select, presence of category badge, and right-panel open state markers.

---

### `src-tauri/src/modules/mod.rs`

**Analog:** `src-tauri/src/modules/mod.rs`

**Flat module registration pattern** ([src-tauri/src/modules/mod.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/mod.rs:1))
```rust
pub mod agent;
pub mod fs;
pub mod git;
...
pub mod workspace;
```

Add `pub mod java_repo;` and either `pub mod analysis;` or `pub mod analysis { ... }` consistently with the rest of the module tree.

---

### `src-tauri/src/modules/java_repo.rs`

**Analog:** `src-tauri/src/modules/workspace.rs`

**Native command boundary style** ([src-tauri/src/modules/workspace.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/workspace.rs:124))
```rust
#[tauri::command]
pub async fn workspace_authorize(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<String, String> {
```

**Boundary validation and descriptive errors** ([src-tauri/src/modules/workspace.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/workspace.rs:129))
```rust
let workspace = WorkspaceEnv::from_option(workspace);
let resolved = resolve_path(&path, &workspace);
let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
```

**Small helper-first style** ([src-tauri/src/modules/workspace.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/workspace.rs:74))
```rust
pub fn authorize_spawn_cwd(...) -> Result<Option<PathBuf>, String> {
    let Some(cwd) = cwd.map(str::trim).filter(|s| !s.is_empty()) else {
        return Ok(None);
    };
```

Use this file as the primary analog for `java_repo_readiness`: resolve path through `WorkspaceEnv`, canonicalize once, reject unsupported roots with explicit `Err(String)` or typed DTO `reason`, and keep helpers pure.

---

### `src-tauri/src/modules/analysis/mod.rs`

**Analog:** `src-tauri/src/modules/fs/watch.rs`

**Owned native state + background loop pattern** ([src-tauri/src/modules/fs/watch.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/fs/watch.rs:92))
```rust
#[derive(Default)]
pub struct FsWatchState {
    inner: Mutex<Option<WatchInner>>,
}
```

**Debounced event loop** ([src-tauri/src/modules/fs/watch.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/fs/watch.rs:137))
```rust
fn drain_loop(rx: mpsc::Receiver<notify::Result<Event>>, app: AppHandle) {
    loop {
        let first = match rx.recv() { ... };
        ...
        let _ = app.emit("fs:changed", ChangedPayload { ... });
```

**Authorization before adding work** ([src-tauri/src/modules/fs/watch.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/fs/watch.rs:210))
```rust
fn prepare_add(
    registry: &WorkspaceRegistry,
    workspace: &WorkspaceEnv,
    paths: Vec<String>,
) -> Vec<PathBuf> {
```

Use this as the event-driven analog for watch-only analysis progress: owned `State`, background worker, bounded emit loop, and authorization checks before watch registration or file traversal.

---

### `src-tauri/src/lib.rs`

**Analog:** `src-tauri/src/lib.rs`

**Module imports and state management** ([src-tauri/src/lib.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/lib.rs:3))
```rust
use modules::{agent, fs, git, net, pty, secrets, shell, workspace};
```

**Plugin registration pattern** ([src-tauri/src/lib.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/lib.rs:91))
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
```

**Managed state insertion** ([src-tauri/src/lib.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/lib.rs:112))
```rust
.manage(pty::PtyState::default())
.manage(shell::ShellState::default())
.manage(fs::watch::FsWatchState::default())
```

**Command wiring** ([src-tauri/src/lib.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/lib.rs:125))
```rust
.invoke_handler(tauri::generate_handler![
    ...
    fs::watch::fs_watch_add,
    fs::watch::fs_watch_remove,
    workspace::workspace_authorize,
    workspace::workspace_current_dir,
```

Follow this exactly for dialog plugin init, any new analysis state `.manage(...)`, and new commands like `java_repo_readiness` / `analysis_start`.

---

### `src-tauri/tests/java_repo_intake.rs`

**Analog:** `src-tauri/tests/fs_search.rs`

**Fixture-based native integration tests** ([src-tauri/tests/fs_search.rs](/g:/refactoringjdk/terax-ai/src-tauri/tests/fs_search.rs:1))
```rust
mod common;

use common::FsFixture;
use javarf_lib::modules::fs::...;
```

**Short, behavior-named tests** ([src-tauri/tests/fs_search.rs](/g:/refactoringjdk/terax-ai/src-tauri/tests/fs_search.rs:8))
```rust
#[test]
fn grep_finds_matches_and_returns_relative_paths() {
```

**Reusable temp fixture helpers** ([src-tauri/tests/common/mod.rs](/g:/refactoringjdk/terax-ai/src-tauri/tests/common/mod.rs:77))
```rust
pub struct FsFixture {
    pub root: PathBuf,
    _tmp: TempDir,
}
```

Use `FsFixture` to create root-level `pom.xml`, `build.gradle`, `build.gradle.kts`, unsupported Java-like folders, and watch-skip cases like `.gradle/` and `target/`.

---

### `package.json`

**Analog:** `package.json`

**Dependency block pattern** ([package.json](/g:/refactoringjdk/terax-ai/package.json:15))
```json
"dependencies": {
  "@tauri-apps/api": "^2",
  "@tauri-apps/plugin-opener": "^2",
  "@tauri-apps/plugin-os": "~2.3.2",
```

Add `@tauri-apps/plugin-dialog` alongside the other Tauri plugins in the same dependency section.

---

### `src-tauri/Cargo.toml`

**Analog:** `src-tauri/Cargo.toml`

**Main dependency layout** ([src-tauri/Cargo.toml](/g:/refactoringjdk/terax-ai/src-tauri/Cargo.toml:21))
```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-opener = "2"
...
notify = "8.2.0"
```

**Desktop-only plugin section** ([src-tauri/Cargo.toml](/g:/refactoringjdk/terax-ai/src-tauri/Cargo.toml:72))
```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-autostart = "2"
tauri-plugin-updater = "2"
tauri-plugin-window-state = "2"
```

Place `tauri-plugin-dialog = "2"` with the other desktop plugins unless implementation requirements force it into the main dependency block.

---

### `src-tauri/capabilities/default.json`

**Analog:** `src-tauri/capabilities/default.json`

**Permission list style** ([src-tauri/capabilities/default.json](/g:/refactoringjdk/terax-ai/src-tauri/capabilities/default.json:9))
```json
"permissions": [
  "core:default",
  ...
  "opener:default",
  "log:default",
  "os:default",
```

Add the dialog capability in the same flat list format as the other plugin permissions.

## Shared Patterns

### Workspace Authorization
**Source:** [src-tauri/src/modules/workspace.rs](/g:/refactoringjdk/terax-ai/src-tauri/src/modules/workspace.rs:124)
**Apply to:** `src-tauri/src/modules/java_repo.rs`, `src-tauri/src/modules/analysis/mod.rs`
```rust
let workspace = WorkspaceEnv::from_option(workspace);
let resolved = resolve_path(&path, &workspace);
let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
```

### Frontend Native Wrapper Pattern
**Source:** [src/modules/ai/lib/native.ts](/g:/refactoringjdk/terax-ai/src/modules/ai/lib/native.ts:126)
**Apply to:** `src/modules/java-intake/lib/native.ts`, any findings IPC wrapper
```ts
invoke<SomeDto>("command_name", {
  ...args,
  workspace: currentWorkspaceEnv(),
})
```

### Watch Registration
**Source:** [src/modules/explorer/lib/watch.ts](/g:/refactoringjdk/terax-ai/src/modules/explorer/lib/watch.ts:9)
**Apply to:** findings progress listeners, analysis lifecycle cleanup
```ts
void invoke("fs_watch_add", {
  paths,
  workspace: currentWorkspaceEnv(),
}).catch(() => {});
```

### Compact Card and Badge Styling
**Source:** [src/components/ui/card.tsx](/g:/refactoringjdk/terax-ai/src/components/ui/card.tsx:5), [src/components/ui/badge.tsx](/g:/refactoringjdk/terax-ai/src/components/ui/badge.tsx:7)
**Apply to:** readiness card, finding cards, build-tool and category badges
```tsx
<Card size="sm">...</Card>
<Badge variant="secondary">...</Badge>
```

### Right-Side Detail Panel
**Source:** [src/components/ui/sheet.tsx](/g:/refactoringjdk/terax-ai/src/components/ui/sheet.tsx:58)
**Apply to:** finding detail panel
```tsx
<SheetPortal>
  <SheetOverlay />
  <SheetPrimitive.Content data-side="right" ...>
```

### Rust Test Fixture Pattern
**Source:** [src-tauri/tests/common/mod.rs](/g:/refactoringjdk/terax-ai/src-tauri/tests/common/mod.rs:77)
**Apply to:** `src-tauri/tests/java_repo_intake.rs`
```rust
let fx = FsFixture::new();
fx.write("pom.xml", "<project/>");
```

## No Analog Found

None. Every planned file has at least a strong role-match or dataflow-match analog in the current codebase.

## Metadata

**Analog search scope:** `src/`, `src-tauri/src/`, `src-tauri/tests/`, root config files
**Files scanned:** 22
**Pattern extraction date:** 2026-06-01
