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
| Shell background | `bg-[#03050a]`, layered radial gradients, subtle grid overlay |
| Hero panels | `bg-card/84`, `bg-card/88`, `border border-border/70`, `rounded-none` |
| Support cards | `bg-card/82`, `border border-border/70`, `rounded-none` |
| Section switcher | `border border-border/70 bg-black/18 p-2`, active `border-cyan-300/30 bg-cyan-300/10 text-cyan-100` |
| Text - primary | `font-project-title`, `text-white`, `tracking-tight` |
| Text - secondary | `text-white/68`, `text-white/58`, `text-white/44` |
| Spacing | `px-4 py-4`, `sm:px-5`, `lg:px-7 lg:py-5`, compact `gap-3`, repeated `px-3 py-3`, `px-4 py-4` |
| Motion | GSAP entrance on hero/cards, anime.js HUD pulses, raw Three.js `Timer` hero scene, Chart.js metrics card |
| Accent usage | cyan/orange only in chips, meters, hover borders, hero glow, and compact status pills |

**Pattern notes:**
Put strongest anime identity on first-screen dashboard, empty states, and assistant entry points. Keep rest of app calmer. Hero can carry 3D scene and HUD mood, but supporting cards stay flat, square, and information-first. Card headers now stay text-only to reduce chrome, and section bodies should stack into uneven groups instead of stretching three equal empty slabs.

**Behavior notes:**
This surface now replaces startup blank-shell state, even with no mounted workspace. Lower dashboard content should stay inside viewport via section switching instead of one long scroller. Each tab should prioritize sectional grouping over equal-height grids: content-heavy assistant/status panels can be tall, while sparse empty-state cards stay compact. Readiness metrics should fall back to KPI tiles when chart data is too thin, and dashboard shell must prefer scroll over clipping when space gets tight.

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
