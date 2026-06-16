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
import type { LayoutMode } from "@/modules/settings/store";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useI18n } from "@/modules/i18n";
import { BUILTIN_AGENTS, selectAgentForContext } from "@/modules/ai/lib/agents";
import { useAgentsStore } from "@/modules/ai/store/agentsStore";
import { useTheme } from "@/modules/theme";
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
  FolderOpenIcon,
  GitBranchIcon,
  GitCompareIcon,
  GridViewIcon,
  Hamburger01Icon,
  HelpCircleIcon,
  LayoutTwoColumnIcon,
  LayoutTwoRowIcon,
  RobotIcon,
  Settings01Icon,
  SidebarLeftIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
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
  onNewDashboard: () => void;
  onNewAgentDashboard: () => void;
  onOpenJavaRefactor: () => void;
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
  onOpenWorkspace: () => void;
  onOpenTutorial: () => void;
  onOpenAniCli: () => void;
  onOpenSettings: () => void;
  searchTarget: SearchTarget;
  searchRef: RefObject<SearchInlineHandle | null>;
  layoutMode: LayoutMode;
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
  onNewDashboard,
  onNewAgentDashboard,
  onOpenJavaRefactor,
  onNewEditor,
  onNewGitGraph,
  onClose,
  onPin,
  onToggleSidebar,
  onSplit,
  canSplit,
  onActivateAgent,
  onActivateLocalAgent,
  onOpenWorkspace,
  onOpenTutorial,
  onOpenAniCli,
  onOpenSettings,
  searchTarget,
  searchRef,
  layoutMode,
  zenMode,
  hiddenInZen = false,
  onToggleZenMode,
  onHoverChange,
}: Props) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const compactOps = layoutMode === "compact-ops";
  const userShortcuts = usePreferencesStore((s) => s.shortcuts);
  const familyMode = usePreferencesStore((s) => s.agentFamilyMode);
  const activeAgentId = useAgentsStore((s) => s.activeId);
  const customAgents = useAgentsStore((s) => s.customAgents);
  const { themeId } = useTheme();
  const agentList = useMemo(
    () => [...BUILTIN_AGENTS, ...customAgents],
    [customAgents],
  );
  const activeAgent = useMemo(
    () => selectAgentForContext(agentList, activeAgentId, themeId, familyMode),
    [activeAgentId, agentList, familyMode, themeId],
  );

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
      const nextCompact = w < COMPACT_WIDTH;
      setCompact((current) => (current === nextCompact ? current : nextCompact));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const sidebarButton = (
    <Button
      onClick={onToggleSidebar}
      title={t("header.toggleSidebar")}
      variant="ghost"
      size="icon-sm"
      className="shrink-0 bg-black/30 text-white/46 hover:bg-primary/10 hover:text-white"
    >
      <HugeiconsIcon icon={SidebarLeftIcon} size={18} strokeWidth={1.75} />
    </Button>
  );
  const compactMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 bg-black/30 text-white/46 hover:bg-primary/10 hover:text-white"
          title={t("header.compactMenu")}
        >
          <HugeiconsIcon icon={Hamburger01Icon} size={16} strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        side={placement === "bottom" ? "top" : "bottom"}
        className="min-w-56"
      >
        <DropdownMenuItem onSelect={onNew}>
          <HugeiconsIcon icon={FileTerminalIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.newTerminal")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewPrivate}>
          <HugeiconsIcon icon={FileTerminalIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.newPrivateTerminal")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewEditor}>
          <HugeiconsIcon icon={FileAddIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.newEditor")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewDashboard}>
          <HugeiconsIcon icon={GridViewIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.newDashboard")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenJavaRefactor}>
          <HugeiconsIcon icon={GitCompareIcon} size={14} strokeWidth={1.75} />
          <span>{t("home.javaRefactor")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewAgentDashboard}>
          <HugeiconsIcon icon={RobotIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.newAgentDashboard")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewPreview}>
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.75} />
          <span>{t("header.newPreview")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onNewGitGraph}>
          <HugeiconsIcon icon={GitBranchIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.gitGraph")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenWorkspace}>
          <HugeiconsIcon icon={FolderOpenIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.openWorkspace")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onOpenTutorial}>
          <HugeiconsIcon icon={HelpCircleIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.openTutorial")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleSidebar}>
          <HugeiconsIcon icon={SidebarLeftIcon} size={14} strokeWidth={1.75} />
          <span>{t("header.toggleSidebar")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleZenMode}>
          <HugeiconsIcon icon={GridViewIcon} size={14} strokeWidth={1.75} />
          <span>{zenMode ? t("header.disableZen") : t("header.enableZen")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSplit("row")} disabled={!canSplit}>
          <HugeiconsIcon icon={LayoutTwoColumnIcon} size={14} strokeWidth={1.75} />
          <span className="flex-1">{t("header.splitRight")}</span>
          {splitRightTokens && (
            <span className="text-xs text-muted-foreground">{splitRightTokens}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSplit("col")} disabled={!canSplit}>
          <HugeiconsIcon icon={LayoutTwoRowIcon} size={14} strokeWidth={1.75} />
          <span className="flex-1">{t("header.splitDown")}</span>
          {splitDownTokens && (
            <span className="text-xs text-muted-foreground">{splitDownTokens}</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenAniCli}>
          <HugeiconsIcon icon={FileTerminalIcon} size={14} strokeWidth={1.75} />
          <span>{t("anime.title")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onOpenSettings}>
          <HugeiconsIcon icon={Settings01Icon} size={14} strokeWidth={1.75} />
          <span>{t("header.settings")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        "javarf-terminal-shell flex h-11 min-w-0 shrink-0 items-center gap-1.5 overflow-hidden border-[color:var(--border)] bg-[#040506]/92 select-none transition-[transform,opacity,background-color] duration-150",
        placement === "bottom" ? "border-t" : "border-b",
        zenMode && "opacity-30 hover:opacity-100 hover:bg-[#08090b]/98",
        hiddenInZenClass,
        IS_MAC ? "pr-2 pl-20" : "pr-0 pl-2",
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        {!compact && !compactOps ? (
          <div className="hidden h-8 shrink-0 items-center gap-2 border border-[color:var(--border)] bg-black/28 px-3 sm:flex">
            <span className="size-2 shrink-0 rounded-full bg-primary/72" />
            <span className="truncate text-[12px] font-medium text-white/76">
              {activeAgent.name}
            </span>
          </div>
        ) : null}
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
          onNewDashboard={onNewDashboard}
          onNewAgentDashboard={onNewAgentDashboard}
          onOpenJavaRefactor={onOpenJavaRefactor}
          onNewEditor={onNewEditor}
          onNewGitGraph={onNewGitGraph}
          onClose={onClose}
          onPin={onPin}
          compact={compact}
        />
        <div data-tauri-drag-region className="h-full min-w-2 flex-1" />
      </div>

      <SearchInline ref={searchRef} target={searchTarget} compact={compact} />

      <div className="flex shrink-0 items-center gap-1">
        {!compactOps ? sidebarButton : null}
        {compactMenu}
        <NotificationBell
          onActivate={onActivateAgent}
          onActivateLocal={onActivateLocalAgent}
        />
      </div>

      {USE_CUSTOM_WINDOW_CONTROLS && (
        <>
          <span className="ml-1 h-5 w-px shrink-0 bg-white/8" />
          <WindowControls />
        </>
      )}
    </div>
  );
}
