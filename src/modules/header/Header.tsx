import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WindowControls } from "@/components/WindowControls";
import { IS_MAC, KEY_SEP, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  getBindingTokens,
  SHORTCUTS,
  type ShortcutId,
} from "@/modules/shortcuts/shortcuts";
import type { Tab } from "@/modules/tabs";
import { TabBar } from "@/modules/tabs";
import { NotificationBell } from "@/modules/agents";
import {
  Add01Icon,
  FileAddIcon,
  FileTerminalIcon,
  GitBranchIcon,
  GridViewIcon,
  Hamburger01Icon,
  LayoutTwoColumnIcon,
  LayoutTwoRowIcon,
  Settings01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SearchInline,
  type SearchInlineHandle,
  type SearchTarget,
} from "./SearchInline";

type Props = {
  placement?: "top" | "bottom";
  tabs: Tab[];
  activeId: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onNewPrivate: () => void;
  onNewPreview: () => void;
  onNewEditor: () => void;
  onNewGitGraph: () => void;
  onClose: (id: number) => void;
  /** Promote a preview (transient) tab to persistent. */
  onPin: (id: number) => void;
  onToggleSidebar: () => void;
  onSplit: (dir: "row" | "col") => void;
  /** Active tab is a terminal and below the per-tab pane cap. */
  canSplit: boolean;
  onActivateAgent: (tabId: number, leafId: number) => void;
  onActivateLocalAgent: () => void;
  onOpenSettings: () => void;
  searchTarget: SearchTarget;
  searchRef: RefObject<SearchInlineHandle | null>;
  zenMode: boolean;
  hiddenInZen?: boolean;
  onToggleZenMode: () => void;
  onHoverChange?: (hovered: boolean) => void;
};

const COMPACT_WIDTH = 720;

export function Header({
  placement = "top",
  tabs,
  activeId,
  onSelect,
  onNew,
  onNewPrivate,
  onNewPreview,
  onNewEditor,
  onNewGitGraph,
  onClose,
  onPin,
  onToggleSidebar,
  onSplit,
  canSplit,
  onActivateAgent,
  onActivateLocalAgent,
  onOpenSettings,
  searchTarget,
  searchRef,
  zenMode,
  hiddenInZen = false,
  onToggleZenMode,
  onHoverChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const userShortcuts = usePreferencesStore((s) => s.shortcuts);

  const tokensFor = (id: ShortcutId): string => {
    const s = SHORTCUTS.find((s) => s.id === id);
    if (!s) return "";
    const bindings = userShortcuts[id] || s.defaultBindings;
    if (!bindings || bindings.length === 0) return "";
    return getBindingTokens(bindings[0]).join(KEY_SEP);
  };

  const splitRightTokens = tokensFor("pane.splitRight");
  const splitDownTokens = tokensFor("pane.splitDown");

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setCompact(w < COMPACT_WIDTH);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const settingsButton = (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 rounded-md border border-white/8 bg-black/20 text-white/46 hover:border-primary/30 hover:bg-primary/10 hover:text-white"
      onClick={onOpenSettings}
      title="Settings"
    >
      <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={1.75} />
    </Button>
  );
  const hiddenInZenClass = hiddenInZen
    ? placement === "bottom"
      ? "translate-y-full opacity-0 pointer-events-none"
      : "-translate-y-full opacity-0 pointer-events-none"
    : null;

  return (
    <div
      ref={rootRef}
      data-tauri-drag-region
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={cn(
        "javarf-terminal-shell flex h-12 shrink-0 items-center gap-2 border-[color:var(--border)] bg-[#050506]/96 select-none backdrop-blur-sm transition-[transform,opacity,background-color] duration-150",
        placement === "bottom" ? "border-t" : "border-b",
        zenMode && "opacity-30 hover:opacity-100 hover:bg-[#08090b]/98",
        hiddenInZenClass,
        IS_MAC ? "pr-2 pl-20" : "pr-0 pl-2",
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        {!compact ? (
          <div className="hidden h-9 shrink-0 items-center gap-3 border border-[color:var(--border)] bg-black/45 px-3 sm:flex">
            <span className="inline-flex h-6 w-14 shrink-0 items-center justify-center border-2 border-primary/80 font-heading text-[20px] leading-none tracking-[0.08em] text-white/14">
              CCG
            </span>
            <div className="flex min-w-0 flex-col leading-none">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-white/88">
                Anime Terminal
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary/72">
                v1.0
              </span>
            </div>
          </div>
        ) : null}
        <Button
          onClick={onToggleSidebar}
          title="Toggle sidebar"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 border border-[color:var(--border)] bg-black/30 text-white/46 hover:border-primary/50 hover:bg-primary/10 hover:text-white"
        >
          <HugeiconsIcon icon={SidebarLeftIcon} size={18} strokeWidth={1.75} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 border border-[color:var(--border)] bg-black/30 text-white/46 hover:border-primary/50 hover:bg-primary/10 hover:text-white"
              title="Compact menu"
            >
              <HugeiconsIcon icon={Hamburger01Icon} size={16} strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side={placement === "bottom" ? "top" : "bottom"} className="min-w-56">
            <DropdownMenuItem onSelect={onNew}>
              <HugeiconsIcon icon={FileTerminalIcon} size={14} strokeWidth={1.75} />
              <span>New terminal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewPrivate}>
              <HugeiconsIcon icon={FileTerminalIcon} size={14} strokeWidth={1.75} />
              <span>New private terminal</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewEditor}>
              <HugeiconsIcon icon={FileAddIcon} size={14} strokeWidth={1.75} />
              <span>New editor</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewPreview}>
              <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.75} />
              <span>New preview</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onNewGitGraph}>
              <HugeiconsIcon icon={GitBranchIcon} size={14} strokeWidth={1.75} />
              <span>Git graph</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggleSidebar}>
              <HugeiconsIcon icon={SidebarLeftIcon} size={14} strokeWidth={1.75} />
              <span>Toggle sidebar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSplit("row")} disabled={!canSplit}>
              <HugeiconsIcon icon={LayoutTwoColumnIcon} size={14} strokeWidth={1.75} />
              <span className="flex-1">Split right</span>
              {splitRightTokens && <span className="text-xs text-muted-foreground">{splitRightTokens}</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSplit("col")} disabled={!canSplit}>
              <HugeiconsIcon icon={LayoutTwoRowIcon} size={14} strokeWidth={1.75} />
              <span className="flex-1">Split down</span>
              {splitDownTokens && <span className="text-xs text-muted-foreground">{splitDownTokens}</span>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenSettings}>
              <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={1.75} />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={onToggleZenMode}
          title={zenMode ? "Disable Zen mode" : "Enable Zen mode"}
          variant="ghost"
          size="icon-sm"
          className={cn(
            "shrink-0 border border-[color:var(--border)] text-white/48 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-white",
            "bg-black/30 text-white/46",
            zenMode && "border-primary/35 text-primary",
          )}
        >
          <YinYangGlyph />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 border border-[color:var(--border)] bg-black/30 text-white/46 hover:border-primary/50 hover:bg-primary/10 hover:text-white disabled:opacity-50"
              title="Split terminal"
              disabled={!canSplit}
            >
              <HugeiconsIcon icon={GridViewIcon} size={16} strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-44">
            <DropdownMenuItem onSelect={() => onSplit("row")}>
              <HugeiconsIcon
                icon={LayoutTwoColumnIcon}
                size={14}
                strokeWidth={1.75}
              />
              <span className="flex-1">Split right</span>
              {splitRightTokens && (
                <span className="text-xs text-muted-foreground">
                  {splitRightTokens}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSplit("col")}>
              <HugeiconsIcon
                icon={LayoutTwoRowIcon}
                size={14}
                strokeWidth={1.75}
              />
              <span className="flex-1">Split down</span>
              {splitDownTokens && (
                <span className="text-xs text-muted-foreground">
                  {splitDownTokens}
                </span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!IS_MAC && <NotificationBell
            onActivate={onActivateAgent}
            onActivateLocal={onActivateLocalAgent}
          />}
      </div>

      {!IS_MAC && <span className="mx-1 h-5 w-px shrink-0 bg-[color:var(--border)]" />}

      {IS_MAC && <span className="mr-1 h-full w-px shrink-0 bg-[color:var(--border)]" />}

      <div
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 transition-opacity duration-200",
          zenMode && "opacity-72 hover:opacity-100",
        )}
        data-tauri-drag-region
      >
        <TabBar
          tabs={tabs}
          activeId={activeId}
          onSelect={onSelect}
          onNew={onNew}
          onNewPrivate={onNewPrivate}
          onNewPreview={onNewPreview}
          onNewEditor={onNewEditor}
          onNewGitGraph={onNewGitGraph}
          onClose={onClose}
          onPin={onPin}
          compact={compact}
        />
        <div data-tauri-drag-region className="h-full min-w-2 flex-1" />
      </div>

      <SearchInline ref={searchRef} target={searchTarget} compact={compact} />

      {IS_MAC && (
        <>
          <NotificationBell
            onActivate={onActivateAgent}
            onActivateLocal={onActivateLocalAgent}
          />
          {settingsButton}
        </>
      )}

      {!IS_MAC && settingsButton}

      {USE_CUSTOM_WINDOW_CONTROLS && (
        <>
          <span className="ml-1 h-5 w-px shrink-0 bg-white/8" />
          <WindowControls />
        </>
      )}
    </div>
  );
}

function YinYangGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true" fill="none">
      <path
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 0 1 0 16 4 4 0 0 1 0-8 4 4 0 1 0 0-8Zm0 3.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm0 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"
        fill="currentColor"
      />
    </svg>
  );
}
