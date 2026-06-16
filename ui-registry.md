### Java Repo Intake Shell

File: `src/modules/java-intake/JavaRepoHome.tsx`
Last updated: 2026-06-15

| Property | Class |
| --- | --- |
| Background | `bg-card/92`, `bg-background/70`, `bg-background/78`, `bg-primary/6` |
| Border | `border border-border/70`, `border border-border/60`, `border border-primary/20` |
| Border radius | `rounded-none` |
| Text - primary | `text-foreground`, `text-primary`, `font-project-title` |
| Text - secondary | `text-muted-foreground` |
| Spacing | `px-6 py-6`, `gap-5`, `gap-6`, `px-4 py-4`, `px-3 py-3` |
| Hover state | `Button` outline/ghost variants, no custom shell hover beyond panel glow |
| Shadow | `shadow-[0_28px_90px_color-mix(in_oklab,var(--background)_78%,transparent)]` |
| Accent usage | `bg-primary/10`, `bg-primary/6`, `text-primary`, radial primary glow overlays |

**Pattern notes:**
Terminal-HUD direction. Panels stay square, token-driven, no soft radius. Accent comes from thin primary glows and translucent background layers, not heavy fills. Hero surface can carry richer motion and WebGL, but supporting cards stay flat, bordered, and mono-tech.

### TabBar Quick Add

File: `src/modules/tabs/TabBar.tsx`
Last updated: 2026-06-15

| Property | Class |
| --- | --- |
| Background | `bg-transparent`, active `data-[state=active]:bg-[#0d1118]` |
| Border | `border border-transparent`, active `data-[state=active]:border-[color:var(--border)]` |
| Border radius | shared `Button` icon radius, no local override |
| Text - primary | `text-[12px] font-medium text-white/46`, active `text-white` |
| Text - secondary | `text-muted-foreground` |
| Spacing | `size-8`, `gap-0.5`, menu width `min(16rem, calc(100vw - 0.75rem))` |
| Hover state | `hover:border-[color:var(--border)] hover:bg-white/[0.04] hover:text-white` |
| Shadow | none |
| Accent usage | active tab bg + unsaved dot only; regular editor/shell tabs omit decorative icons |

**Pattern notes:**
Tabs should read quieter than toolbars: sentence-case labels, almost no idle chrome, strong active fill, and icon use only for special surfaces like preview/dashboard/diff. `+` trigger stays minimal and should not compete with active tab emphasis.

### Header Compact Menu

File: `src/modules/header/Header.tsx`
Last updated: 2026-06-15

| Property | Class |
| --- | --- |
| Background | `bg-black/30` |
| Border | none |
| Border radius | shared `Button` icon-sm radius, no local override |
| Text - primary | `text-white/46` |
| Text - secondary | `text-muted-foreground` |
| Spacing | `gap-1`, `min-w-56` |
| Hover state | `hover:bg-primary/10 hover:text-white` |
| Shadow | none |
| Accent usage | `primary` hover fill only |

**Pattern notes:**
Header utility controls stay lighter than tab controls: no visible border, same dark shell, muted idle icon/text, primary wash on hover. Compact-menu actions should match existing icon sizing and plain label treatment instead of introducing badges or heavy accent fills.

### Header Minimal Chrome

File: `src/modules/header/Header.tsx`
Last updated: 2026-06-15

| Property | Class |
| --- | --- |
| Shell | `h-11`, `gap-1.5`, `bg-[#040506]/92` |
| Agent label | `h-8`, `border border-[color:var(--border)]`, `bg-black/28`, `text-[12px] font-medium text-white/76` |
| Persistent actions | `sidebarButton`, `compactMenu`, `NotificationBell` |
| Removed chrome | standalone workspace/tutorial/zen/split/settings buttons |

**Pattern notes:**
Keep top bar focused on navigation, not utilities. Frequent actions stay visible only if they help orient workspace; everything else moves into menu. Branding/agent area should read like a small status chip, not hero art.

### Home Command Dashboard

File: `src/app/HomeDashboard.tsx`
Last updated: 2026-06-16

| Property | Class |
| --- | --- |
| Background | `bg-[var(--dash-bg)]`, `bg-[var(--dash-panel)]`, `bg-[var(--dash-panel-strong)]`, layered `var(--dash-primary)` / `var(--dash-accent)` radial gradients, theme-tinted grid overlay |
| Border | `border border-[var(--dash-border)]`, softer callouts `border-[var(--dash-border-soft)]`, status fills `border-[var(--dash-primary-soft)]` / `border-[var(--dash-accent-soft)]` |
| Border radius | angular shell with masked hero plane, square support cards, circular media trigger only via `rounded-full` |
| Text - primary | `font-project-title`, `font-mono`, `text-[var(--dash-text)]`, `text-[var(--dash-primary)]`, `text-[var(--dash-accent)]` |
| Text - secondary | `text-[var(--dash-text-soft)]`, `text-[var(--dash-muted)]` |
| Spacing | shell `px-4 py-4`, panel `p-4` to `p-6`, repeated `gap-4`, dense chips `px-3 py-1.5` |
| Hover state | cards/buttons pivot between `var(--dash-border)` and accent borders, with filled surfaces staying on the same theme family instead of dropping to raw black |
| Shadow | glow is implicit through theme gradients and accent fills; avoid standalone drop shadows unless matching the active theme token set |
| Accent usage | primary token drives command, auth, and readiness states; accent token drives news/live telemetry; both stay scoped to pills, charts, grids, and verification rails |

**Pattern notes:**
Surface is now a theme-native tactical shell instead of a fixed dark red/cyan deck. The hero stays masked and image-led, with the GitHub avatar becoming the background when a profile is present, but the old `Tactical / Command` title stack and relay-copy filler are removed. Navigation stays terse, and the 02/03/04 views are split into dedicated files: `HomeDashboardWorkflowView.tsx`, `HomeDashboardAgentsView.tsx`, and `HomeDashboardGithubView.tsx`.

**Behavior notes:**
This surface still replaces the startup blank-shell state even with no mounted workspace. Keep the three major decks responsive, keep the hero on a single GitHub entry button plus client-id strip, preserve the typewriter greeting, and filter news to the active UI language only. When a feed item has no usable image, the rail should render a source-aware fallback preview card instead of a dead placeholder. GitHub scope should keep profile, integrations, repo intake, clone logs, branch/file checker, and recent project surfaces aligned with the current theme tokens rather than fixed literal colors.

### Explorer Quiet Header

Files: `src/modules/explorer/FileExplorer.tsx`, `src/modules/explorer/TreeRow.tsx`, `src/modules/sidebar/SidebarRail.tsx`
Last updated: 2026-06-15

| Property | Class |
| --- | --- |
| Sidebar shell | `bg-[#06080b]/92` |
| Explorer header | `h-10`, `bg-[#07090d]/96`, `text-[12px] font-medium text-white/68` |
| Header actions | search + refresh only |
| Row idle state | `text-white/68`, `hover:bg-white/[0.04]` |
| Row selected state | `border-l-2 border-l-primary`, `bg-primary/10`, `text-white` |
| Row markers | minimal dot/circle markers instead of per-file decorative icons |
| Rail active state | `bg-[#0d1118] text-white` |

**Pattern notes:**
Sidebar should feel lighter than editor. Prefer text hierarchy and selected-state contrast over icon density. Keep file management affordances in context menus and reduce always-visible controls in explorer headers.
