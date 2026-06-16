import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  hasBrowserWorkspaceHandle,
  restoreBrowserWorkspaceHandle,
} from "@/lib/browserWorkspace";
import { AgentNotificationsBridge } from "@/modules/agents";
import { firePendingReviewForSession } from "@/modules/agents/lib/review";
import { useManagedAgentsStore } from "@/modules/agents/store/managedAgentsStore";
import { Toaster } from "@/components/ui/sonner";
import { AniCliPanel } from "@/modules/anime/AniCliPanel";
import {
  AgentRunBridge,
  AiInputBar,
  AiInputBarConnect,
  AiMiniWindow,
  getAllKeys,
  hasAnyKey,
  LocalAgentNotificationsBridge,
  SelectionAskAi,
  useChatStore,
} from "@/modules/ai";
import { AiComposerProvider } from "@/modules/ai/lib/composer";
import { redactSensitive } from "@/modules/ai/lib/redact";
import { native } from "@/modules/ai/lib/native";
import { useAgentsStore } from "@/modules/ai/store/agentsStore";
import { useSnippetsStore } from "@/modules/ai/store/snippetsStore";
import {
  AiDiffStack,
  EditorStack,
  GitDiffStack,
  NewEditorDialog,
  type EditorPaneHandle,
} from "@/modules/editor";
import {
  GitHistoryStack,
  type GitHistorySearchHandle,
} from "@/modules/git-history";
import { useRefactorGeneration } from "@/modules/findings";
import { getManagedMcpHealthSnapshots } from "@/modules/ai/lib/managedMcp";
import { buildRuntimeMcpConfig } from "@/modules/ai/lib/mcpRegistry";
import {
  JavaFirstRunSetup,
  getJavaRepoReadiness,
  JavaRepoHome,
  pickJavaRepoDirectory,
  type JavaRepoHomeState,
  type SupportedJavaRepoReadiness,
} from "@/modules/java-intake";
import { getLaunchDir } from "@/lib/launchDir";
import { isBrowserPreview } from "@/lib/runtime";
import { quoteShellArg } from "@/lib/shellQuote";
import { useZoom } from "@/lib/useZoom";
import { FileExplorer, type FileExplorerHandle } from "@/modules/explorer";
import {
  listenFsChanged,
  parentDir,
  watchAdd,
  watchRemove,
} from "@/modules/explorer/lib/watch";
import {
  Header,
  type SearchInlineHandle,
  type SearchTarget,
} from "@/modules/header";
import { MarkdownStack } from "@/modules/markdown";
import { PreviewStack, type PreviewPaneHandle } from "@/modules/preview";
import { openSettingsWindow } from "@/modules/settings/openSettingsWindow";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  onKeysChanged,
  setFirstRunRepoPath,
  setFirstRunSetupDone,
  setFirstRunTutorialDone,
  setLayoutMode,
  setThemeId as persistThemeId,
  type LayoutMode,
} from "@/modules/settings/store";
import { useI18n } from "@/modules/i18n";
import {
  ShortcutsDialog,
  useGlobalShortcuts,
  type ShortcutHandlers,
  type ShortcutId,
} from "@/modules/shortcuts";
import { SidebarRail, type SidebarViewId } from "@/modules/sidebar";
import {
  SourceControlPanel,
  useSourceControl,
} from "@/modules/source-control";
import { StatusBar } from "@/modules/statusbar";
import { MAX_PANES_PER_TAB, useTabs, useWorkspaceCwd, type Tab } from "@/modules/tabs";
import {
  clearFocusedTerminal,
  disposeSession,
  findLeafCwd,
  hasLeaf,
  leafIds,
  respawnSession,
  TerminalStack,
  whenSessionReady,
  writeToSession,
  type TerminalPaneHandle,
} from "@/modules/terminal";
import { listCustomThemes, saveCustomTheme } from "@/modules/theme/customThemes";
import { resolveTerminalInjectionTarget } from "@/modules/terminal/lib/injection";
import {
  isThemeFilePath,
  onThemeEdit,
  parseThemeFile,
  starterTheme,
  themeFilePath,
  writeThemeFile,
} from "@/modules/theme/themeFiles";
import { UpdaterDialog } from "@/modules/updater";
import {
  currentWorkspaceEnv,
  getWslHome,
  LOCAL_WORKSPACE,
  useWorkspaceEnvStore,
  type WorkspaceEnv,
} from "@/modules/workspace";
import { isTauriRuntime } from "@/lib/runtime";
import { invoke } from "@tauri-apps/api/core";
import { homeDir } from "@tauri-apps/api/path";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { SearchAddon } from "@xterm/addon-search";
import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { AppProviders } from "./AppProviders";
import { getRefactorToolKey } from "@/modules/ai/lib/toolKeyring";

type TuiWaitResult = "ready" | "gone" | "timeout";

const TUTORIAL_SLIDES = [
  "workspace",
  "browser",
  "terminal",
  "findings",
  "sourceControl",
  "agents",
  "models",
  "settings",
  "layout",
] as const;

type TutorialSlide = (typeof TUTORIAL_SLIDES)[number];

const TUTORIAL_IMAGES: Record<TutorialSlide, string> = {
  workspace: "/wallpapers/dragon-ball-sunset.png",
  browser: "/wallpapers/gintama-neon-city.png",
  terminal: "/wallpapers/naruto-leaf-storm.png",
  findings: "/wallpapers/bungou-noir-ink.png",
  sourceControl: "/wallpapers/one-piece-grand-line.png",
  agents: "/wallpapers/tokyo-ghoul-red-black.png",
  models: "/wallpapers/solo-leveling-shadow.png",
  settings: "/wallpapers/gintama-neon-city.png",
  layout: "/wallpapers/one-piece-grand-line.png",
};

const TUTORIAL_ACTION_SLIDES = [
  "workspace",
  "browser",
  "terminal",
  "findings",
  "sourceControl",
  "agents",
  "models",
  "settings",
] as const;

type TutorialActionSlide = (typeof TUTORIAL_ACTION_SLIDES)[number];

const TUTORIAL_ACTION_SLIDE_SET = new Set<TutorialSlide>(
  TUTORIAL_ACTION_SLIDES,
);

function hasTutorialAction(slide: TutorialSlide): slide is TutorialActionSlide {
  return TUTORIAL_ACTION_SLIDE_SET.has(slide);
}

function tutorialActionLabel(slide: TutorialActionSlide) {
  return `tutorial.${slide}.action` as const;
}

function TutorialDialog({
  open,
  layoutMode,
  onSlideAction,
  onOpenChange,
}: {
  open: boolean;
  layoutMode: LayoutMode;
  onSlideAction: (slide: TutorialActionSlide) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const slide = TUTORIAL_SLIDES[index] ?? "workspace";
  const image = TUTORIAL_IMAGES[slide];
  const last = index === TUTORIAL_SLIDES.length - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const go = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex(Math.min(TUTORIAL_SLIDES.length - 1, Math.max(0, next)));
  };

  const finish = async () => {
    await setFirstRunTutorialDone(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl overflow-y-auto border border-border/80 bg-popover/98 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("tutorial.title")}</DialogTitle>
          <DialogDescription>{t("tutorial.description")}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.section
              key={slide}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 36 : -36 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -36 : 36 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-3 sm:space-y-4"
            >
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  {index + 1} / {TUTORIAL_SLIDES.length}
                </div>
                <h2 className="mt-2 text-lg font-semibold sm:text-xl">
                  {t(`tutorial.${slide}.title`)}
                </h2>
                <p className="mt-2 text-[13px] leading-6 text-muted-foreground sm:text-sm">
                  {t(`tutorial.${slide}.body`)}
                </p>
                {hasTutorialAction(slide) ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => onSlideAction(slide)}
                  >
                    {t(tutorialActionLabel(slide))}
                  </Button>
                ) : null}
              </div>

              <div className="relative h-32 overflow-hidden rounded-lg border border-border/70 bg-background/70 sm:h-44 md:h-52">
                <img
                  src={image}
                  alt={t(`tutorial.${slide}.imageAlt`)}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-background/55 via-transparent to-transparent" />
              </div>

              {slide === "layout" ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["classic", "terminal-focus", "compact-ops"] as const).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => void setLayoutMode(mode)}
                        className={cn(
                          "min-h-20 rounded-md border p-3 text-left transition-colors sm:min-h-24",
                          layoutMode === mode
                            ? "border-primary/70 bg-primary/10 text-foreground"
                            : "border-border/70 bg-background/65 text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        <span className="block text-[12px] font-medium text-foreground">
                          {t(`tutorial.layout.${mode}.title`)}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5">
                          {t(`tutorial.layout.${mode}.body`)}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              ) : null}
            </motion.section>
          </AnimatePresence>
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-full flex-wrap justify-center gap-1 sm:justify-start">
            {TUTORIAL_SLIDES.map((item, i) => (
              <span
                key={item}
                className={cn(
                  "h-1.5 w-4 rounded-full sm:w-6",
                  i === index ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
              onClick={() => go(index - 1)}
              disabled={index === 0}
            >
              {t("tutorial.back")}
            </Button>
            {last ? (
              <Button
                type="button"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => void finish()}
              >
                {t("tutorial.done")}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => go(index + 1)}
              >
                {t("tutorial.next")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AniCliDialog({
  open,
  onOpenChange,
  onRunInTerminal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRunInTerminal?: (command: string) => void;
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("anime.title")}</DialogTitle>
          <DialogDescription>{t("anime.description")}</DialogDescription>
        </DialogHeader>
        <AniCliPanel onRunInTerminal={onRunInTerminal} />
      </DialogContent>
    </Dialog>
  );
}

const HomeDashboardLazy = lazy(() =>
  import("./HomeDashboard").then((m) => ({ default: m.HomeDashboard })),
);
const FindingsDashboardLazy = lazy(() =>
  import("@/modules/findings/FindingsDashboard").then((m) => ({
    default: m.FindingsDashboard,
  })),
);
const AgentConversationDashboardLazy = lazy(() =>
  import("@/modules/ai/components/AgentConversationDashboard").then((m) => ({
    default: m.AgentConversationDashboard,
  })),
);
const JavaRefactorPreviewPaneLazy = lazy(() =>
  import("@/modules/findings/JavaRefactorPreviewPane").then((m) => ({
    default: m.JavaRefactorPreviewPane,
  })),
);

async function waitForClaudeTuiReady(
  readBuf: () => string | null,
  timeoutMs = 8000,
): Promise<TuiWaitResult> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const buf = readBuf();
    if (buf === null) return "gone";
    if (buf.includes("shortcuts") || buf.includes("? for")) return "ready";
    await new Promise((r) => setTimeout(r, 120));
  }
  return "timeout";
}

function dirname(path: string | null): string | null {
  if (!path) return null;
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return normalized;
  return normalized.slice(0, idx);
}

function normalizeRepoPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.replace(/\\/g, "/").replace(/\/+$/, "");
}

const PHASE1_CODE_EXTENSIONS = new Set([
  "java",
  "kt",
  "kts",
  "scala",
  "groovy",
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "rs",
  "go",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hpp",
  "cs",
  "fs",
  "php",
  "rb",
  "swift",
  "m",
  "mm",
  "lua",
  "dart",
  "ex",
  "exs",
  "erl",
  "hrl",
  "clj",
  "cljs",
  "sql",
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "html",
  "css",
  "scss",
  "vue",
  "svelte",
  "asm",
  "s",
  "nasm",
  "inc",
]);

function isPhase1CodePath(path: string): boolean {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return PHASE1_CODE_EXTENSIONS.has(ext);
}

function tabShouldHidePhase1(tab: Tab | undefined, repoPath: string | null): boolean {
  if (!tab) return false;
  if (
    tab.kind === "terminal" ||
    tab.kind === "dashboard" ||
    tab.kind === "agent-dashboard" ||
    tab.kind === "preview" ||
    tab.kind === "markdown" ||
    tab.kind === "ai-diff" ||
    tab.kind === "git-diff" ||
    tab.kind === "git-commit-file" ||
    tab.kind === "git-history"
  ) {
    return true;
  }
  if (tab.kind !== "editor") return false;
  const normalizedPath = tab.path.replace(/\\/g, "/");
  if (!repoPath) return true;
  if (!isPhase1CodePath(normalizedPath)) return true;
  return !(
    normalizedPath === repoPath ||
    normalizedPath.startsWith(`${repoPath}/`)
  );
}

const SIDEBAR_DEFAULT_WIDTH = 260;
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 480;
const SIDEBAR_WIDTH_STORAGE_KEY = "javarf.sidebar.width";
const SIDEBAR_VIEW_STORAGE_KEY = "javarf.sidebar.view";

function clampSidebarWidth(width: number): number {
  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)),
  );
}

function readSidebarWidth(): number {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number.parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed)
      ? clampSidebarWidth(parsed)
      : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

function sidebarWidthForLayout(mode: LayoutMode, current: number): number {
  if (mode === "compact-ops") return Math.min(current, 240);
  if (mode === "terminal-focus") return Math.max(current, 320);
  return current;
}

function readSidebarView(): SidebarViewId {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_VIEW_STORAGE_KEY);
    if (stored === "explorer" || stored === "source-control") return stored;
  } catch {

  }
  return "explorer";
}

type Phase1DashboardRepo = {
  path: string;
  readiness: SupportedJavaRepoReadiness;
  previewOnly?: boolean;
};

export default function App() {
  return (
    <AiComposerProvider>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </AiComposerProvider>
  );
}

function AppContent() {
  const { t } = useI18n();
  const {
    tabs,
    activeId,
    setActiveId,
    newTab,
    newAgentTab,
    newPrivateTab,
    openFileTab,
    pinTab,
    newPreviewTab,
    newDashboardTab,
    newAgentDashboardTab,
    newMarkdownTab,
    openAiDiffTab,
    setAiDiffStatus,
    openGitDiffTab,
    openCommitHistoryTab,
    openCommitFileDiffTab,
    closeTab,
    updateTab,
    selectByIndex,
    setLeafCwd,
    focusPane,
    focusNextPaneInTab,
    splitActivePane,
    closeActivePane,
    closePaneByLeaf,
    resetWorkspace,
  } = useTabs(getLaunchDir() ? { cwd: getLaunchDir() } : undefined);


  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const activeTerminalTab = useMemo(() => {
    const t = tabs.find((x) => x.id === activeId);
    return t && t.kind === "terminal" ? t : null;
  }, [tabs, activeId]);
  const activeLeafId = activeTerminalTab?.activeLeafId ?? null;

  const searchAddons = useRef<Map<number, SearchAddon>>(new Map());
  const [activeSearchAddon, setActiveSearchAddon] =
    useState<SearchAddon | null>(null);
  const searchInlineRef = useRef<SearchInlineHandle | null>(null);
  const terminalRefs = useRef<Map<number, TerminalPaneHandle>>(new Map());
  const editorRefs = useRef<Map<number, EditorPaneHandle>>(new Map());
  const previewRefs = useRef<Map<number, PreviewPaneHandle>>(new Map());
  const [activeEditorHandle, setActiveEditorHandle] =
    useState<EditorPaneHandle | null>(null);
  const [gitHistoryHandle, setGitHistoryHandle] =
    useState<GitHistorySearchHandle | null>(null);
  const { zoomIn, zoomOut, zoomReset } = useZoom();
  const explorerRef = useRef<FileExplorerHandle>(null);
  const explorerReturnFocusRef = useRef<HTMLElement | null>(null);
  const hasWorkspaceRef = useRef(false);

  const sidebarRef = useRef<PanelImperativeHandle | null>(null);
  const sidebarWidthRef = useRef(readSidebarWidth());
  const sidebarWidthWriteTimerRef = useRef(0);
  const [sidebarView, setSidebarViewState] = useState<SidebarViewId>(readSidebarView);
  const [statusBarHover, setStatusBarHover] = useState(false);
  const [headerHover, setHeaderHover] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const hoverCloseTimerRef = useRef(0);
  const zenSidebarPinnedRef = useRef(false);
  const zenSidebarHoverRef = useRef(false);
  const persistSidebarView = useCallback((view: SidebarViewId) => {
    setSidebarViewState(view);
    try {
      window.localStorage.setItem(SIDEBAR_VIEW_STORAGE_KEY, view);
    } catch {
      
    }
  }, []);
  const toggleSidebar = useCallback(() => {
    const p = sidebarRef.current;
    if (!p) return;
    if (p.getSize().asPercentage <= 0) p.expand();
    else p.collapse();
  }, []);
  const cycleSidebarView = useCallback(
    (view: SidebarViewId) => {
      const panel = sidebarRef.current;
      const collapsed = panel ? panel.getSize().asPercentage <= 0 : false;
      if (collapsed) {
        if (panel) panel.resize(`${sidebarWidthRef.current}px`);
        if (view !== sidebarView) persistSidebarView(view);
        return;
      }
      if (view === sidebarView) {
        panel?.collapse();
        return;
      }
      persistSidebarView(view);
    },
    [persistSidebarView, sidebarView],
  );
  const persistSidebarWidth = useCallback((next: number) => {
    sidebarWidthRef.current = next;
    if (sidebarWidthWriteTimerRef.current) {
      window.clearTimeout(sidebarWidthWriteTimerRef.current);
    }
    sidebarWidthWriteTimerRef.current = window.setTimeout(() => {
      sidebarWidthWriteTimerRef.current = 0;
      try {
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(next));
      } catch {
        
      }
    }, 200);
  }, []);
  useEffect(() => {
    return () => {
      if (sidebarWidthWriteTimerRef.current) {
        window.clearTimeout(sidebarWidthWriteTimerRef.current);
      }
    };
  }, []);

  const toggleExplorerFocus = useCallback(() => {
    if (!hasWorkspaceRef.current) return;
    const explorer = explorerRef.current;
    const panel = sidebarRef.current;
    const collapsed = panel ? panel.getSize().asPercentage <= 0 : false;
    if (sidebarView !== "explorer" || collapsed) {
      if (panel && collapsed) panel.resize(`${sidebarWidthRef.current}px`);
      if (sidebarView !== "explorer") persistSidebarView("explorer");
      const active = document.activeElement;
      explorerReturnFocusRef.current =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      requestAnimationFrame(() => explorerRef.current?.focus());
      return;
    }
    if (!explorer) return;
    if (explorer.isFocused()) {
      const target = explorerReturnFocusRef.current;
      explorerReturnFocusRef.current = null;
      if (target && document.body.contains(target)) {
        target.focus();
      } else {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }
      return;
    }
    const active = document.activeElement;
    explorerReturnFocusRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
    explorer.focus();
  }, [persistSidebarView, sidebarView]);
  const openExplorerSearch = useCallback((initialQuery?: string) => {
    if (!hasWorkspaceRef.current) return;
    const panel = sidebarRef.current;
    const collapsed = panel ? panel.getSize().asPercentage <= 0 : false;
    if (collapsed && panel) {
      panel.resize(`${sidebarWidthRef.current}px`);
    }
    if (sidebarView !== "explorer") {
      persistSidebarView("explorer");
    }
    requestAnimationFrame(() => explorerRef.current?.openSearch(initialQuery));
  }, [persistSidebarView, sidebarView]);

  const zenHoverActive = statusBarHover || headerHover;
  const hideHeaderInZen = zenMode && !headerHover;

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel || !hasWorkspaceRef.current) return;
    if (!zenMode) return;
    if (zenHoverActive) {
      if (panel.getSize().asPercentage <= 0) {
        panel.resize(`${sidebarWidthRef.current}px`);
      }
      if (sidebarView !== "explorer") persistSidebarView("explorer");
      return;
    }
    if (panel.getSize().asPercentage > 0 && !zenSidebarPinnedRef.current) {
      panel.collapse();
    }
  }, [persistSidebarView, sidebarView, zenHoverActive, zenMode]);

  useEffect(() => {
    return () => {
      if (hoverCloseTimerRef.current) window.clearTimeout(hoverCloseTimerRef.current);
    };
  }, []);

  const handleStatusBarHoverChange = useCallback((next: boolean) => {
    if (hoverCloseTimerRef.current) {
      window.clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = 0;
    }
    if (next) {
      setStatusBarHover(true);
      return;
    }
    hoverCloseTimerRef.current = window.setTimeout(() => {
      hoverCloseTimerRef.current = 0;
      if (zenSidebarHoverRef.current) return;
      setStatusBarHover(false);
    }, 260);
  }, []);
  const handleZenModeToggle = useCallback(() => {
    setZenMode((current) => {
      const next = !current;
      if (!next) {
        zenSidebarPinnedRef.current = false;
        setStatusBarHover(false);
        setHeaderHover(false);
      }
      return next;
    });
  }, []);
  const [home, setHome] = useState<string | null>(null);
  const [pendingCloseTab, setPendingCloseTab] = useState<number | null>(null);
  const workspaceEnv = useWorkspaceEnvStore((s) => s.env);
  const setWorkspaceEnv = useWorkspaceEnvStore((s) => s.setEnv);
  const [launchCwd, setLaunchCwd] = useState<string | null>(null);
  const [launchCwdResolved, setLaunchCwdResolved] = useState(false);
  const [pendingDeleteTabs, setPendingDeleteTabs] = useState<number[] | null>(
    null,
  );
  useEffect(() => {
    homeDir()
      .then(async (p) => {
        const normalized = p.replace(/\\/g, "/");
        setHome(normalized);
        try {
          await native.workspaceAuthorize(normalized);
        } catch {
          
        }
      })
      .catch(() => setHome(null));
  }, []);

  const switchWorkspace = useCallback(
    async (env: WorkspaceEnv) => {
      if (
        env.kind === workspaceEnv.kind &&
        (env.kind === "local" ||
          (workspaceEnv.kind === "wsl" && env.distro === workspaceEnv.distro))
      ) {
        return;
      }
      const dirty = tabsRef.current.some((t) => t.kind === "editor" && t.dirty);
      if (dirty) {
        window.alert("Save or close unsaved editor tabs before switching workspace.");
        return;
      }

      let nextHome: string | null = null;
      try {
        if (env.kind === "wsl") {
          nextHome = await getWslHome(env.distro);
        } else {
          nextHome = (await homeDir()).replace(/\\/g, "/");
        }
      } catch (e) {
        window.alert(String(e));
        return;
      }

      for (const id of liveLeavesRef.current) disposeSession(id);
      searchAddons.current.clear();
      terminalRefs.current.clear();
      editorRefs.current.clear();
      previewRefs.current.clear();
      setActiveSearchAddon(null);
      setActiveEditorHandle(null);
      setWorkspaceEnv(env.kind === "local" ? LOCAL_WORKSPACE : env);
      setHome(nextHome);
      setLaunchCwd(nextHome);
      if (nextHome) {
        try {
          await native.workspaceAuthorize(nextHome);
        } catch {
          
        }
      }
      resetWorkspace(nextHome ?? undefined);
    },
    [workspaceEnv, setWorkspaceEnv, resetWorkspace],
  );
  useEffect(() => {
    native
      .workspaceCurrentDir()
      .then(setLaunchCwd)
      .catch(() => setLaunchCwd(null))
      .finally(() => setLaunchCwdResolved(true));
  }, []);

  const [phase1Mode, setPhase1Mode] = useState<"hidden" | "intake" | "dashboard">(
    "hidden",
  );
  const [phase1Repo, setPhase1Repo] = useState<Phase1DashboardRepo | null>(
    null,
  );
  const [javaWorkspaceRoot, setJavaWorkspaceRoot] = useState<string | null>(null);
  const [javaPreviewFilePath, setJavaPreviewFilePath] = useState<string | null>(null);
  const [javaPreviewOpen, setJavaPreviewOpen] = useState(false);
  const [javaAnalysisFolderPath, setJavaAnalysisFolderPath] = useState<string | null>(null);
  const [javaAutoScanPath, setJavaAutoScanPath] = useState<string | null>(null);
  const [showFirstRunSetup, setShowFirstRunSetup] = useState(false);
  const [javaRepoHomeState, setJavaRepoHomeState] =
    useState<JavaRepoHomeState>({ kind: "idle" });

  const handleChooseJavaRepo = useCallback(async () => {
    setJavaRepoHomeState({ kind: "loading" });
    try {
      const selected = await pickJavaRepoDirectory(t("setup.chooseRepo"));
      if (!selected) {
        setJavaRepoHomeState({ kind: "idle" });
        return;
      }
      const readiness = await getJavaRepoReadiness(selected);
      if (readiness.supported && readiness.projectType) {
        const supportedReadiness = readiness as SupportedJavaRepoReadiness;
        const normalizedPath = selected.replace(/\\/g, "/");
        if (!isBrowserPreview) {
          try {
            await native.workspaceAuthorize(normalizedPath);
          } catch {

          }
        }
        setJavaRepoHomeState({
          kind: "supported",
          path: selected,
          readiness: supportedReadiness,
        });
        setJavaAnalysisFolderPath(null);
        setJavaAutoScanPath(null);
        setJavaWorkspaceRoot(normalizedPath);
        setLaunchCwd(normalizedPath);
        setPhase1Repo({
          path: selected,
          readiness: supportedReadiness,
        });
        return;
      }
      setJavaRepoHomeState({
        kind: "unsupported",
        path: selected,
        readiness,
      });
    } catch (error) {
      setJavaRepoHomeState({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const handleStartFullAnalysis = useCallback(() => {
    if (javaRepoHomeState.kind !== "supported") return;
    void (async () => {
      const normalizedPath = javaRepoHomeState.path.replace(/\\/g, "/");
      if (!isBrowserPreview) {
        try {
          await native.workspaceAuthorize(normalizedPath);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : String(error));
          return;
        }
      }
      setPhase1Repo({
        path: javaRepoHomeState.path,
        readiness: javaRepoHomeState.readiness,
      });
      setJavaAnalysisFolderPath(null);
      setJavaAutoScanPath(null);
      setJavaWorkspaceRoot(normalizedPath);
      setLaunchCwd(normalizedPath);
      setPhase1Mode("dashboard");
    })();
  }, [javaRepoHomeState]);

  const handlePreviewJavaRefactor = useCallback(() => {
    setJavaAnalysisFolderPath(null);
    setJavaAutoScanPath(null);
    setJavaPreviewOpen(false);
    setPhase1Repo({
      path: "__preview__/polyglot-refactor-dashboard",
      previewOnly: true,
      readiness: {
        supported: true,
        projectType: "generic",
        repoName: t("repoIntake.previewRepoName"),
        reason: null,
      },
    });
    setPhase1Mode("dashboard");
  }, [t]);

  const handleOpenJavaRefactor = useCallback(() => {
    if (phase1Repo) {
      setPhase1Mode("dashboard");
      return;
    }
    handlePreviewJavaRefactor();
  }, [handlePreviewJavaRefactor, phase1Repo]);

  const handleClosePhase1 = useCallback(() => {
    setPhase1Mode("hidden");
    setJavaAutoScanPath(null);
  }, []);

  const handleAnalyzeFolder = useCallback(
    (path: string) => {
      const activeJavaRepo =
        phase1Repo ??
        (javaRepoHomeState.kind === "supported"
          ? {
              path: javaRepoHomeState.path,
              readiness: javaRepoHomeState.readiness,
            }
          : null);
      if (!activeJavaRepo) return;
      const normalizedRepoPath = activeJavaRepo.path.replace(/\\/g, "/").replace(/\/+$/, "");
      const normalizedPath = path.replace(/\\/g, "/");
      if (
        normalizedPath !== normalizedRepoPath &&
        !normalizedPath.startsWith(`${normalizedRepoPath}/`)
      ) {
        return;
      }
      setPhase1Repo(activeJavaRepo);
      setJavaAnalysisFolderPath(path);
      setJavaAutoScanPath(path);
      setJavaPreviewOpen(false);
      setPhase1Mode("dashboard");
    },
    [phase1Repo, javaRepoHomeState],
  );

  const handleSelectAnalysisFolder = useCallback(
    (path: string) => {
      const activeJavaRepo =
        phase1Repo ??
        (javaRepoHomeState.kind === "supported"
          ? {
              path: javaRepoHomeState.path,
              readiness: javaRepoHomeState.readiness,
            }
          : null);
      if (!activeJavaRepo) return;
      const normalizedRepoPath = activeJavaRepo.path.replace(/\\/g, "/").replace(/\/+$/, "");
      const normalizedPath = path.replace(/\\/g, "/");
      if (
        normalizedPath === normalizedRepoPath ||
        normalizedPath.startsWith(`${normalizedRepoPath}/`)
      ) {
        setJavaAnalysisFolderPath(path);
      }
    },
    [phase1Repo, javaRepoHomeState],
  );

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [newEditorOpen, setNewEditorOpen] = useState(false);
  const miniOpen = useChatStore((s) => s.mini.open);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const openMini = useChatStore((s) => s.openMini);
  const focusInput = useChatStore((s) => s.focusInput);
  const openPanel = useChatStore((s) => s.openPanel);
  const panelOpen = useChatStore((s) => s.panelOpen);
  const apiKeys = useChatStore((s) => s.apiKeys);
  const setApiKeys = useChatStore((s) => s.setApiKeys);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);
  const setLive = useChatStore((s) => s.setLive);
  const respondToApproval = useChatStore((s) => s.respondToApproval);

  useEffect(() => {
    if (activeSessionId) firePendingReviewForSession(activeSessionId);
  }, [activeSessionId]);
  const lmstudioModelId = usePreferencesStore((s) => s.lmstudioModelId);
  const lmstudioBaseURL = usePreferencesStore((s) => s.lmstudioBaseURL);
  const mlxModelId = usePreferencesStore((s) => s.mlxModelId);
  const mlxBaseURL = usePreferencesStore((s) => s.mlxBaseURL);
  const ollamaModelId = usePreferencesStore((s) => s.ollamaModelId);
  const ollamaBaseURL = usePreferencesStore((s) => s.ollamaBaseURL);
  const openaiCompatibleModelId = usePreferencesStore(
    (s) => s.openaiCompatibleModelId,
  );
  const openaiCompatibleBaseURL = usePreferencesStore(
    (s) => s.openaiCompatibleBaseURL,
  );
  const hasLocalModel =
    (lmstudioBaseURL.trim().length > 0 && lmstudioModelId.trim().length > 0) ||
    (mlxBaseURL.trim().length > 0 && mlxModelId.trim().length > 0) ||
    (ollamaBaseURL.trim().length > 0 && ollamaModelId.trim().length > 0) ||
    (openaiCompatibleBaseURL.trim().length > 0 &&
      openaiCompatibleModelId.trim().length > 0);
  const hasComposer = hasAnyKey(apiKeys) || hasLocalModel;
  const canContinueFirstRunSetup =
    javaRepoHomeState.kind === "supported" && (hasComposer || isBrowserPreview);

  const handleCompleteFirstRunSetup = useCallback(() => {
    if (!canContinueFirstRunSetup) return;
    void (async () => {
      const normalizedPath = javaRepoHomeState.path.replace(/\\/g, "/");
      await setFirstRunRepoPath(normalizedPath);
      await setFirstRunSetupDone(true);
      setShowFirstRunSetup(false);
      setJavaWorkspaceRoot(normalizedPath);
      setLaunchCwd(normalizedPath);
      setPhase1Repo({
        path: javaRepoHomeState.path,
        readiness: javaRepoHomeState.readiness,
      });
      setPhase1Mode("dashboard");
    })().catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  }, [canContinueFirstRunSetup, javaRepoHomeState]);

  const [keysLoaded, setKeysLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const reload = () => {
      void getAllKeys().then((keys) => {
        if (!alive) return;
        setApiKeys(keys);
        setKeysLoaded(true);
      });
    };
    reload();
    const unlistenP = onKeysChanged(reload);
    return () => {
      alive = false;
      void unlistenP.then((fn) => fn());
    };
  }, [setApiKeys]);

  const initPrefs = usePreferencesStore((s) => s.init);
  const prefDefaultModel = usePreferencesStore((s) => s.defaultModelId);
  const prefsHydrated = usePreferencesStore((s) => s.hydrated);
  const firstRunSetupDone = usePreferencesStore((s) => s.firstRunSetupDone);
  const firstRunTutorialDone = usePreferencesStore((s) => s.firstRunTutorialDone);
  const firstRunRepoPath = usePreferencesStore((s) => s.firstRunRepoPath);
  const layoutMode = usePreferencesStore((s) => s.layoutMode);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [aniCliOpen, setAniCliOpen] = useState(false);
  const tutorialAutoShownRef = useRef(false);
  useEffect(() => {
    void initPrefs();
  }, [initPrefs]);
  useEffect(() => {
    if (!prefsHydrated) return;
    setSelectedModelId(prefDefaultModel);
  }, [prefsHydrated, prefDefaultModel, setSelectedModelId]);

  useEffect(() => {
    if (!prefsHydrated || !keysLoaded) return;
    setShowFirstRunSetup(!firstRunSetupDone);
  }, [prefsHydrated, keysLoaded, firstRunSetupDone]);

  useEffect(() => {
    if (
      !prefsHydrated ||
      firstRunTutorialDone ||
      tutorialAutoShownRef.current ||
      showFirstRunSetup ||
      isBrowserPreview
    ) {
      return;
    }
    tutorialAutoShownRef.current = true;
    setTutorialOpen(true);
  }, [firstRunTutorialDone, prefsHydrated, showFirstRunSetup]);

  useEffect(() => {
    if (!prefsHydrated || !firstRunRepoPath) return;
    let cancelled = false;
    void (async () => {
      const normalizedPath = firstRunRepoPath.replace(/\\/g, "/");
      if (
        isBrowserPreview &&
        !hasBrowserWorkspaceHandle(normalizedPath) &&
        !(await restoreBrowserWorkspaceHandle(normalizedPath))
      ) {
        if (cancelled) return;
        setPhase1Repo(null);
        setJavaWorkspaceRoot(null);
        setLaunchCwd(null);
        setJavaAnalysisFolderPath(null);
        setJavaAutoScanPath(null);
        setJavaRepoHomeState({
          kind: "error",
          message:
            "Browser preview needs repository access again after reload. Choose the repository to continue.",
        });
        setPhase1Mode("intake");
        return;
      }

      const readiness = await getJavaRepoReadiness(firstRunRepoPath);
      if (cancelled) return;
      if (!(readiness.supported && readiness.projectType)) return;
      const supportedReadiness = readiness as SupportedJavaRepoReadiness;
      setJavaRepoHomeState({
        kind: "supported",
        path: firstRunRepoPath,
        readiness: supportedReadiness,
      });
      setPhase1Repo({
        path: firstRunRepoPath,
        readiness: supportedReadiness,
      });
      if (isBrowserPreview) {
        setPhase1Mode("dashboard");
      }
      setJavaWorkspaceRoot(normalizedPath);
      setLaunchCwd(normalizedPath);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [prefsHydrated, firstRunRepoPath, firstRunSetupDone]);

  const hydrateSessions = useChatStore((s) => s.hydrateSessions);
  useEffect(() => {
    void hydrateSessions();
    void useAgentsStore.getState().hydrate();
    void useSnippetsStore.getState().hydrate();
  }, [hydrateSessions]);

  const activeTab = tabs.find((t) => t.id === activeId);
  const isDashboardTab = activeTab?.kind === "dashboard";
  const isAgentDashboardTab = activeTab?.kind === "agent-dashboard";
  const isTerminalTab = activeTab?.kind === "terminal";
  const isEditorTab = activeTab?.kind === "editor";
  const isPreviewTab = activeTab?.kind === "preview";
  const isMarkdownTab = activeTab?.kind === "markdown";
  const isAiDiffTab = activeTab?.kind === "ai-diff";
  const isGitDiffTab =
    activeTab?.kind === "git-diff" || activeTab?.kind === "git-commit-file";
  const isGitHistoryTab = activeTab?.kind === "git-history";
  const aiDiffTabs = useMemo(
    () =>
      tabs.filter(
        (tab): tab is Extract<Tab, { kind: "ai-diff" }> => tab.kind === "ai-diff",
      ),
    [tabs],
  );

  const appliedDiffsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const t of tabs) {
      if (t.kind !== "ai-diff") continue;
      if (t.status !== "approved") continue;
      if (appliedDiffsRef.current.has(t.approvalId)) continue;
      appliedDiffsRef.current.add(t.approvalId);
      for (const e of tabs) {
        if (e.kind !== "editor") continue;
        if (e.path !== t.path) continue;
        editorRefs.current.get(e.id)?.reload();
      }
    }
  }, [tabs]);

  useEffect(() => {
    if (!isTauriRuntime) return;
    type FileWrittenPayload = { path: string; source?: string };
    const unlistenPromise = getCurrentWebviewWindow().listen<FileWrittenPayload>(
      "fs:file-written",
      (event) => {
        if (event.payload.source === "editor") return;
        const normalizedPath = event.payload.path.replace(/\\/g, "/");
        const currentTabs = tabsRef.current;
        for (const t of currentTabs) {
          if (t.kind !== "editor") continue;
          if (t.path.replace(/\\/g, "/") === normalizedPath) {
            editorRefs.current.get(t.id)?.reload();
          }
        }
      },
    );
    return () => {
      void unlistenPromise.then((un) => un());
    };
  }, []);

  const editorWatchRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const want = new Set<string>();
    for (const t of tabs) if (t.kind === "editor") want.add(parentDir(t.path));
    const prev = editorWatchRef.current;
    const toAdd = [...want].filter((d) => !prev.has(d));
    const toRemove = [...prev].filter((d) => !want.has(d));
    watchAdd(toAdd);
    watchRemove(toRemove);
    editorWatchRef.current = want;
  }, [tabs]);

  useEffect(() => {
    let alive = true;
    let unlisten: (() => void) | undefined;
    void listenFsChanged((paths) => {
      const changed = new Set(paths.map((p) => p.replace(/\\/g, "/")));
      for (const t of tabsRef.current) {
        if (t.kind !== "editor") continue;
        if (changed.has(t.path.replace(/\\/g, "/"))) {
          editorRefs.current.get(t.id)?.reload();
        }
      }
    }).then((un) => {
      if (alive) unlisten = un;
      else un();
    });
    return () => {
      alive = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!isTauriRuntime) return;
    type FileWrittenPayload = { path: string; source?: string };
    const unlistenPromise = getCurrentWebviewWindow().listen<FileWrittenPayload>(
      "fs:file-written",
      (event) => {
        if (event.payload.source !== "editor") return;
        if (!isThemeFilePath(event.payload.path)) return;
        void (async () => {
          try {
            const res = await invoke<{ kind: string; content?: string }>(
              "fs_read_file",
              { path: event.payload.path, workspace: currentWorkspaceEnv() },
            );
            if (res.kind !== "text" || typeof res.content !== "string") return;
            const parsed = parseThemeFile(res.content);
            if (!parsed.ok) {
              console.warn("[javarf] theme not applied:", parsed.error);
              return;
            }
            await saveCustomTheme(parsed.theme);
          } catch (e) {
            console.warn("[javarf] theme ingest failed:", e);
          }
        })();
      },
    );
    return () => {
      void unlistenPromise.then((un) => un());
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let unsub: (() => void) | undefined;
    void onThemeEdit(async (req) => {
      const theme =
        req.action === "create"
          ? starterTheme()
          : (await listCustomThemes()).find((t) => t.id === req.id);
      if (!theme) return;
      if (req.action === "create") await saveCustomTheme(theme);
      const path = await themeFilePath(theme.id);
      const open = tabsRef.current.some(
        (t) => t.kind === "editor" && t.path === path,
      );
      if (!open) await writeThemeFile(theme);
      void persistThemeId(theme.id);
      openFileTab(path);
      if (isTauriRuntime) {
        void getCurrentWebviewWindow().setFocus();
      }
    }).then((fn) => {
      if (alive) unsub = fn;
      else fn();
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [openFileTab]);

  const { explorerRoot, inheritedCwdForNewTab } = useWorkspaceCwd(
    activeTab,
    tabs,
    launchCwd ?? home,
    javaWorkspaceRoot,
  );
  const hasWorkspace = !!explorerRoot;
  hasWorkspaceRef.current = hasWorkspace;

  const activeJavaRepoPath = normalizeRepoPath(phase1Repo?.path);
  const prevActiveIdRef = useRef(activeId);
  useEffect(() => {
    const activeChanged = prevActiveIdRef.current !== activeId;
    prevActiveIdRef.current = activeId;
    if (!activeChanged) return;
    if (phase1Mode === "hidden" || !hasWorkspace || showFirstRunSetup) return;
    if (!tabShouldHidePhase1(activeTab, activeJavaRepoPath)) return;
    setPhase1Mode("hidden");
  }, [
    activeId,
    activeJavaRepoPath,
    activeTab,
    hasWorkspace,
    phase1Mode,
    showFirstRunSetup,
  ]);

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel) return;
    const collapsed = panel.getSize().asPercentage <= 0;
    if (!hasWorkspace && !collapsed) {
      panel.collapse();
      return;
    }
    if (hasWorkspace && collapsed) {
      panel.resize(`${sidebarWidthForLayout(layoutMode, sidebarWidthRef.current)}px`);
    }
  }, [hasWorkspace, layoutMode]);

  useEffect(() => {
    const panel = sidebarRef.current;
    if (!panel || !hasWorkspace) return;
    if (panel.getSize().asPercentage <= 0) return;
    panel.resize(`${sidebarWidthForLayout(layoutMode, sidebarWidthRef.current)}px`);
  }, [hasWorkspace, layoutMode]);

  useEffect(() => {
    setActiveSearchAddon(
      activeLeafId !== null ? (searchAddons.current.get(activeLeafId) ?? null) : null,
    );
    setActiveEditorHandle(editorRefs.current.get(activeId) ?? null);
  }, [activeId, activeLeafId]);

  const handleSearchReady = useCallback(
    (leafId: number, addon: SearchAddon) => {
      searchAddons.current.set(leafId, addon);
      if (leafId === activeLeafId) setActiveSearchAddon(addon);
    },
    [activeLeafId],
  );

  const disposeTab = useCallback(
    (id: number) => {
      editorRefs.current.delete(id);
      previewRefs.current.delete(id);
      closeTab(id);
    },
    [closeTab],
  );

  const liveLeavesRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const live = new Set<number>();
    for (const t of tabs) {
      if (t.kind === "terminal") {
        for (const id of leafIds(t.paneTree)) live.add(id);
      }
    }
    for (const id of liveLeavesRef.current) {
      if (!live.has(id)) disposeSession(id);
    }
    liveLeavesRef.current = live;
    for (const k of [...terminalRefs.current.keys()])
      if (!live.has(k)) terminalRefs.current.delete(k);
    for (const k of [...searchAddons.current.keys()])
      if (!live.has(k)) searchAddons.current.delete(k);
  }, [tabs]);

  const handleClose = useCallback(
    (id: number) => {
      const t = tabs.find((x) => x.id === id);
      if (t?.kind === "editor" && t.dirty) {
        setPendingCloseTab(id);
        return;
      }
      disposeTab(id);
    },
    [tabs, disposeTab],
  );

  const confirmClose = useCallback(() => {
    if (pendingCloseTab !== null) {
      disposeTab(pendingCloseTab);
      setPendingCloseTab(null);
    }
  }, [pendingCloseTab, disposeTab]);

  const cancelClose = useCallback(() => {
    setPendingCloseTab(null);
  }, []);

  const cycleTab = useCallback(
    (delta: 1 | -1) => {
      if (tabs.length < 2) return;
      const idx = tabs.findIndex((t) => t.id === activeId);
      const nextIdx = (idx + delta + tabs.length) % tabs.length;
      setActiveId(tabs[nextIdx].id);
    },
    [tabs, activeId, setActiveId],
  );

  const captureActiveSelection = useCallback((): string | null => {
    const t = tabs.find((x) => x.id === activeId);
    if (!t) return null;
    if (t.kind === "terminal") {
      const lid = t.activeLeafId;
      return terminalRefs.current.get(lid)?.getSelection() ?? null;
    }
    if (t.kind === "editor") {
      return editorRefs.current.get(activeId)?.getSelection() ?? null;
    }
    return null;
  }, [tabs, activeId]);

  const togglePanelAndFocus = useCallback(() => {
    if (!hasComposer) {
      void openSettingsWindow("models");
      return;
    }
    if (panelOpen) {
      useChatStore.getState().closePanel();
    } else {
      openPanel();
      focusInput(null);
    }
  }, [hasComposer, panelOpen, openPanel, focusInput]);

  const attachSelection = useChatStore((s) => s.attachSelection);

  const handleAttachFileToAgent = useCallback(
    (path: string) => {
      if (!hasComposer) {
        void openSettingsWindow("models");
        return;
      }
      window.dispatchEvent(
        new CustomEvent<string>("javarf:ai-attach-file", { detail: path }),
      );
      openPanel();
      focusInput(null);
    },
    [hasComposer, openPanel, focusInput],
  );

  const askFromSelection = useCallback(() => {
    if (!hasComposer) {
      void openSettingsWindow("models");
      return;
    }
    const selection = captureActiveSelection();
    if (!selection || !selection.trim()) {
      focusInput(null);
      return;
    }
    const source: "terminal" | "editor" =
      activeTab?.kind === "editor" ? "editor" : "terminal";
    attachSelection(selection, source);
  }, [
    hasComposer,
    captureActiveSelection,
    focusInput,
    attachSelection,
    activeTab,
  ]);

  const [askPopup, setAskPopup] = useState<{ x: number; y: number } | null>(
    null,
  );

  useEffect(() => {
    const isInsideAi = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      return !!(
        el.closest("[data-selection-ask-ai]") ||
        el.closest("[data-ai-input-bar]") ||
        el.closest("[data-ai-mini-window]")
      );
    };

    const onDown = (e: MouseEvent) => {
      if (isInsideAi(e.target)) return;
      setAskPopup(null);
    };
    const onUp = (e: MouseEvent) => {
      if (isInsideAi(e.target)) return;
      const el = e.target as HTMLElement | null;
      const inContentArea = el?.closest?.(".xterm, .cm-editor");
      if (!inContentArea) return;

      setTimeout(() => {
        const text = captureActiveSelection();
        if (text && text.trim().length > 0) {
          setAskPopup({ x: e.clientX, y: e.clientY });
        } else {
          setAskPopup(null);
        }
      }, 0);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
    };
  }, [captureActiveSelection]);

  const onAskFromSelection = useCallback(() => {
    askFromSelection();
    setAskPopup(null);
  }, [askFromSelection]);

  const openNewTab = useCallback(() => {
    setPhase1Mode("hidden");
    newTab(inheritedCwdForNewTab());
  }, [newTab, inheritedCwdForNewTab]);

  const openNewPrivateTab = useCallback(() => {
    setPhase1Mode("hidden");
    newPrivateTab(inheritedCwdForNewTab());
  }, [newPrivateTab, inheritedCwdForNewTab]);

  const sendCd = useCallback(
    (path: string) => {
      if (activeLeafId === null) return;
      const term = terminalRefs.current.get(activeLeafId);
      if (!term) return;
      term.write(`cd ${quoteShellArg(path)}\r`);
      term.focus();
    },
    [activeLeafId],
  );

  const cdInNewTab = useCallback(
    (path: string) => {
      setPhase1Mode("hidden");
      const tabId = newTab(path);
      setTimeout(() => {
        const tab = tabsRef.current.find((x) => x.id === tabId);
        if (!tab || tab.kind !== "terminal") return;
        const t = terminalRefs.current.get(tab.activeLeafId);
        if (!t) return;
        t.write(`cd ${quoteShellArg(path)}\r`);
        t.focus();
      }, 80);
    },
    [newTab],
  );

  const handleOpenFile = useCallback(
    (path: string, pin?: boolean) => {
      openFileTab(path, pin ?? false);
      const normalizedPath = path.replace(/\\/g, "/");
      const activeJavaRepo =
        phase1Repo ??
        (javaRepoHomeState.kind === "supported"
          ? {
              path: javaRepoHomeState.path,
              readiness: javaRepoHomeState.readiness,
            }
          : null);
      const normalizedRepoPath = normalizeRepoPath(activeJavaRepo?.path);
      if (
        normalizedRepoPath &&
        isPhase1CodePath(normalizedPath) &&
        (normalizedPath === normalizedRepoPath ||
          normalizedPath.startsWith(`${normalizedRepoPath}/`))
      ) {
        setPhase1Repo(activeJavaRepo);
        setJavaPreviewFilePath(path);
        setJavaPreviewOpen(true);
        setPhase1Mode("hidden");
      } else {
        setJavaPreviewOpen(false);
        setPhase1Mode("hidden");
      }
      setJavaAutoScanPath(null);
    },
    [openFileTab, phase1Repo, javaRepoHomeState],
  );

  const handlePathRenamed = useCallback(
    (from: string, to: string) => {
      for (const t of tabs) {
        if (t.kind !== "editor") continue;
        if (t.path === from) {
          const i = to.lastIndexOf("/");
          updateTab(t.id, { path: to, title: i === -1 ? to : to.slice(i + 1) });
        } else if (t.path.startsWith(`${from}/`)) {
          const suffix = t.path.slice(from.length);
          const newPath = `${to}${suffix}`;
          const i = newPath.lastIndexOf("/");
          updateTab(t.id, {
            path: newPath,
            title: i === -1 ? newPath : newPath.slice(i + 1),
          });
        }
      }
    },
    [tabs, updateTab],
  );

  const confirmDeleteClose = useCallback(() => {
    if (pendingDeleteTabs !== null) {
      for (const id of pendingDeleteTabs) disposeTab(id);
      setPendingDeleteTabs(null);
    }
  }, [pendingDeleteTabs, disposeTab]);

  const cancelDeleteClose = useCallback(() => {
    setPendingDeleteTabs(null);
  }, []);

  const handlePathDeleted = useCallback(
    (path: string) => {
      const dirty: number[] = [];
      for (const t of tabs) {
        if (t.kind !== "editor") continue;
        if (t.path !== path && !t.path.startsWith(`${path}/`)) continue;
        if (t.dirty) {
          dirty.push(t.id);
        } else {
          disposeTab(t.id);
        }
      }
      if (dirty.length > 0) setPendingDeleteTabs(dirty);
    },
    [tabs, disposeTab],
  );

  const activeTerminalLeafCwd =
    activeTab?.kind === "terminal"
      ? (findLeafCwd(activeTab.paneTree, activeTab.activeLeafId) ??
        activeTab.cwd ??
        null)
      : null;

  const activeFilePath = (() => {
    if (activeTab?.kind === "editor") return activeTab.path;
    if (activeTab?.kind === "git-diff") {
      if (/^([A-Za-z]:|\/|\\)/.test(activeTab.path)) return activeTab.path;
      const root = activeTab.repoRoot.replace(/[\\/]+$/, "");
      const rel = activeTab.path.replace(/^[\\/]+/, "");
      return `${root}/${rel}`;
    }
    if (activeTab?.kind === "git-commit-file") {
      const root = activeTab.repoRoot.replace(/[\\/]+$/, "");
      const rel = activeTab.path.replace(/^[\\/]+/, "");
      return `${root}/${rel}`;
    }
    return null;
  })();
  const workspaceFallbackPath = launchCwdResolved
    ? (launchCwd ?? home ?? null)
    : null;
  const sourceControlContextPath = (() => {
    if (activeTab?.kind === "terminal") {
      return activeTerminalLeafCwd ?? explorerRoot ?? workspaceFallbackPath;
    }
    if (activeTab?.kind === "editor") return dirname(activeTab.path);
    if (activeTab?.kind === "git-diff") return activeTab.repoRoot;
    if (activeTab?.kind === "git-commit-file") return activeTab.repoRoot;
    if (activeTab?.kind === "git-history") return activeTab.repoRoot;
    return explorerRoot ?? workspaceFallbackPath;
  })();
  const hasOpenGitTab = useMemo(
    () =>
      tabs.some(
        (t) =>
          t.kind === "git-diff" ||
          t.kind === "git-history" ||
          t.kind === "git-commit-file",
      ),
    [tabs],
  );
  const sourceControlActive =
    hasOpenGitTab || sidebarView === "source-control";
  const badgeContextPath = workspaceFallbackPath;
  const sourceControlPath = sourceControlActive
    ? sourceControlContextPath
    : badgeContextPath;
  const sourceControl = useSourceControl(sourceControlPath, true);

  const toggleSourceControl = useCallback(() => {
    cycleSidebarView("source-control");
  }, [cycleSidebarView]);
  const openSourceControlPanel = useCallback(() => {
    const panel = sidebarRef.current;
    if (panel && panel.getSize().asPercentage <= 0) {
      panel.resize(`${sidebarWidthRef.current}px`);
    }
    if (sidebarView !== "source-control") {
      persistSidebarView("source-control");
    }
  }, [persistSidebarView, sidebarView]);
  const dashboardProjectPaths = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (value: string | null | undefined) => {
      if (!value) return;
      const normalized = value.replace(/\\/g, "/");
      if (!normalized || normalized.startsWith("__preview__/")) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      out.push(normalized);
    };
    push(sourceControl.repo?.repoRoot);
    push(phase1Repo?.previewOnly ? null : phase1Repo?.path);
    push(
      javaRepoHomeState.kind === "supported" || javaRepoHomeState.kind === "unsupported"
        ? javaRepoHomeState.path
        : null,
    );
    push(firstRunRepoPath);
    push(javaWorkspaceRoot);
    return out.slice(0, 5);
  }, [firstRunRepoPath, javaRepoHomeState, javaWorkspaceRoot, phase1Repo, sourceControl.repo]);
  const dashboardRecentFiles = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const tab of tabs) {
      if (tab.kind !== "editor" && tab.kind !== "markdown") continue;
      const path = tab.path.replace(/\\/g, "/");
      if (seen.has(path)) continue;
      seen.add(path);
      out.push(path);
    }
    return out.slice(0, 6);
  }, [tabs]);
  const dashboardRepoStatus = useMemo(
    () => ({
      path:
        sourceControl.repo?.repoRoot ??
        (phase1Repo?.previewOnly ? null : phase1Repo?.path ?? null),
      branch: sourceControl.status?.branch ?? sourceControl.repo?.branch ?? null,
      upstream: sourceControl.status?.upstream ?? sourceControl.repo?.upstream ?? null,
      changedCount: sourceControl.changedCount,
      ahead: sourceControl.ahead,
      behind: sourceControl.behind,
      previewOnly: phase1Repo?.previewOnly === true,
      isDetached:
        sourceControl.status?.isDetached === true || sourceControl.repo?.isDetached === true,
    }),
    [phase1Repo, sourceControl],
  );
  const openAssistantFromDashboard = useCallback(
    (prefill?: string) => {
      focusInput(prefill ?? null);
    },
    [focusInput],
  );
  const openDashboardRecentFile = useCallback(
    (path: string) => {
      openFileTab(path, true);
    },
    [openFileTab],
  );

  const openGitGraphFromContext = useCallback(async () => {
    const known = sourceControl.hasRepo ? sourceControl.repo : null;
    if (known) {
      openCommitHistoryTab({
        repoRoot: known.repoRoot,
        branch: sourceControl.status?.branch ?? null,
      });
      return;
    }
    if (!sourceControlContextPath) return;
    try {
      const repo = await native.gitResolveRepo(sourceControlContextPath);
      if (!repo) return;
      openCommitHistoryTab({ repoRoot: repo.repoRoot, branch: repo.branch });
    } catch {
      /* noop */
    }
  }, [
    openCommitHistoryTab,
    sourceControl.hasRepo,
    sourceControl.repo,
    sourceControl.status?.branch,
    sourceControlContextPath,
  ]);

  const openPreviewTab = useCallback(
    (url: string) => {
      const id = newPreviewTab(url);
      if (!url) {
        setTimeout(() => previewRefs.current.get(id)?.focusAddressBar(), 0);
      }
      return id;
    },
    [newPreviewTab],
  );
  const openDashboardTab = useCallback(() => {
    if (isBrowserPreview) {
      setShowFirstRunSetup(false);
      setPhase1Mode("hidden");
    }
    newDashboardTab();
  }, [newDashboardTab]);
  const openAgentDashboardTab = useCallback(() => {
    if (isBrowserPreview) {
      setShowFirstRunSetup(false);
      setPhase1Mode("hidden");
    }
    newAgentDashboardTab();
  }, [newAgentDashboardTab]);

  const handleTutorialSlideAction = useCallback(
    (slide: TutorialActionSlide) => {
      switch (slide) {
        case "workspace":
          void handleChooseJavaRepo();
          break;
        case "browser":
          openPreviewTab("");
          break;
        case "terminal":
          openNewTab();
          break;
        case "findings":
          handleOpenJavaRefactor();
          break;
        case "sourceControl":
          openSourceControlPanel();
          break;
        case "agents":
          openAgentDashboardTab();
          break;
        case "models":
          void openSettingsWindow("models");
          break;
        case "settings":
          void openSettingsWindow();
          break;
      }
    },
    [
      handleChooseJavaRepo,
      handleOpenJavaRefactor,
      openAgentDashboardTab,
      openNewTab,
      openPreviewTab,
      openSourceControlPanel,
    ],
  );

  const openMarkdownPreview = useCallback(
    (path: string) => {
      newMarkdownTab(path);
    },
    [newMarkdownTab],
  );

  const splitActivePaneInActiveTab = useCallback(
    (dir: "row" | "col") => {
      const t = tabsRef.current.find((x) => x.id === activeId);
      if (!t || t.kind !== "terminal") return;
      const leafId = splitActivePane(activeId, dir);
      if (leafId === null) return;
      requestAnimationFrame(() => {
        focusPane(activeId, leafId);
        terminalRefs.current.get(leafId)?.focus();
        void whenSessionReady(leafId)
          .then(() => terminalRefs.current.get(leafId)?.focus())
          .catch(() => undefined);
      });
    },
    [activeId, focusPane, splitActivePane],
  );

  const runAniCliCommandInTerminal = useCallback(
    (command: string) => {
      const trimmed = command.trim();
      if (!trimmed) return;

      const writeWhenReady = (tabId: number, leafId: number) => {
        setPhase1Mode("hidden");
        setActiveId(tabId);
        void (async () => {
          try {
            await whenSessionReady(leafId);
          } catch {
            return;
          }
          if (writeToSession(leafId, `${trimmed}\r`)) {
            requestAnimationFrame(() => terminalRefs.current.get(leafId)?.focus());
          }
        })();
      };

      const active = tabsRef.current.find((x) => x.id === activeId);
      if (active?.kind === "terminal") {
        const canSplit = leafIds(active.paneTree).length < MAX_PANES_PER_TAB;
        const leafId = canSplit
          ? splitActivePane(active.id, "row")
          : active.activeLeafId;
        if (leafId !== null) {
          requestAnimationFrame(() => focusPane(active.id, leafId));
          writeWhenReady(active.id, leafId);
          return;
        }
      }

      const existingTerminal = [...tabsRef.current]
        .reverse()
        .find((tab): tab is Extract<Tab, { kind: "terminal" }> => tab.kind === "terminal");
      if (existingTerminal) {
        writeWhenReady(existingTerminal.id, existingTerminal.activeLeafId);
        return;
      }

      const tabId = newTab(inheritedCwdForNewTab());
      window.setTimeout(() => {
        const tab = tabsRef.current.find((candidate) => candidate.id === tabId);
        if (!tab || tab.kind !== "terminal") return;
        writeWhenReady(tab.id, tab.activeLeafId);
      }, 80);
    },
    [activeId, focusPane, inheritedCwdForNewTab, newTab, setActiveId, splitActivePane],
  );

  const handleCloseTabOrPane = useCallback(() => {
    const t = tabsRef.current.find((x) => x.id === activeId);
    if (t?.kind === "terminal" && leafIds(t.paneTree).length > 1) {
      closeActivePane(activeId);
      return;
    }
    handleClose(activeId);
  }, [activeId, closeActivePane, handleClose]);

  const shortcutHandlers = useMemo<ShortcutHandlers>(
    () => ({
      "tab.new": openNewTab,
      "tab.newPrivate": openNewPrivateTab,
      "tab.newPreview": () => openPreviewTab(""),
      "tab.newEditor": () => setNewEditorOpen(true),
      "tab.close": handleCloseTabOrPane,
      "tab.next": () => cycleTab(1),
      "tab.prev": () => cycleTab(-1),
      "tab.selectByIndex": (e) => selectByIndex(parseInt(e.key, 10) - 1),
      "pane.splitRight": () => splitActivePaneInActiveTab("row"),
      "pane.splitDown": () => splitActivePaneInActiveTab("col"),
      "pane.focusNext": () => focusNextPaneInTab(activeId, 1),
      "pane.focusPrev": () => focusNextPaneInTab(activeId, -1),
      "pane.source": toggleSourceControl,
      "terminal.clear": () => {
        clearFocusedTerminal();
      },
      "search.focus": () => searchInlineRef.current?.focus(),
      "ai.toggle": togglePanelAndFocus,
      "ai.askSelection": askFromSelection,
      "shortcuts.open": () => setShortcutsOpen((v) => !v),
      "settings.open": () => void openSettingsWindow(),
      "sidebar.toggle": toggleSidebar,
      "explorer.focus": toggleExplorerFocus,
      "view.zoomIn": zoomIn,
      "view.zoomOut": zoomOut,
      "view.zoomReset": zoomReset,
      "editor.undo": () => editorRefs.current.get(activeId)?.undo(),
      "editor.redo": () => editorRefs.current.get(activeId)?.redo(),
    }),
    [
      activeId,
      cycleTab,
      handleCloseTabOrPane,
      openNewTab,
      openNewPrivateTab,
      openPreviewTab,
      selectByIndex,
      splitActivePaneInActiveTab,
      focusNextPaneInTab,
      toggleSourceControl,
      togglePanelAndFocus,
      askFromSelection,
      toggleSidebar,
      toggleExplorerFocus,
      zoomIn,
      zoomOut,
      zoomReset,
    ],
  );

  const shortcutsDisabled = useCallback(
    (id: ShortcutId, e: KeyboardEvent) => {
      if (id === "editor.undo" || id === "editor.redo") {
        return activeTab?.kind !== "editor";
      }
      if (id === "ai.askSelection") {
        const target =
          (e.target as HTMLElement | null) ?? document.activeElement;
        const inTerminal = !!(target as HTMLElement | null)?.closest?.(
          ".xterm",
        );
        if (!inTerminal) return false;
        const sel = captureActiveSelection();
        return !sel || !sel.trim();
      }
      if (id === "terminal.clear") {
        const target =
          (e.target as HTMLElement | null) ?? document.activeElement;
        return !(target as HTMLElement | null)?.closest?.(".xterm");
      }
      return false;
    },
    [activeTab],
  );

  useGlobalShortcuts(shortcutHandlers, { isDisabled: shortcutsDisabled });

  const registerTerminalHandle = useCallback(
    (leafId: number, h: TerminalPaneHandle | null) => {
      if (h) terminalRefs.current.set(leafId, h);
      else terminalRefs.current.delete(leafId);
    },
    [],
  );

  const registerEditorHandle = useCallback(
    (id: number, h: EditorPaneHandle | null) => {
      if (h) editorRefs.current.set(id, h);
      else editorRefs.current.delete(id);
      if (id === activeId) setActiveEditorHandle(h);
    },
    [activeId],
  );

  const registerPreviewHandle = useCallback(
    (id: number, h: PreviewPaneHandle | null) => {
      if (h) previewRefs.current.set(id, h);
      else previewRefs.current.delete(id);
    },
    [],
  );

  const handlePreviewUrl = useCallback(
    (id: number, url: string) => updateTab(id, { url }),
    [updateTab],
  );

  const authorizedCwds = useRef(new Set<string>());
  const handleTerminalCwd = useCallback(
    (leafId: number, cwd: string) => {
      setLeafCwd(leafId, cwd);
      if (cwd && !authorizedCwds.current.has(cwd)) {
        authorizedCwds.current.add(cwd);
        native.workspaceAuthorize(cwd).catch(() => {
          authorizedCwds.current.delete(cwd);
        });
      }
    },
    [setLeafCwd],
  );

  const handleFocusLeaf = useCallback(
    (tabId: number, leafId: number) => focusPane(tabId, leafId),
    [focusPane],
  );

  const onActivateAgent = useCallback(
    (tabId: number, leafId: number) => {
      setActiveId(tabId);
      focusPane(tabId, leafId);
    },
    [setActiveId, focusPane],
  );

  const onActivateLocalAgent = useCallback(() => {
    openPanel();
    focusInput(null);
  }, [openPanel, focusInput]);

  const handleLeafExit = useCallback(
    (leafId: number, _code: number) => {
      const all = tabsRef.current;
      const tab = all.find(
        (t) => t.kind === "terminal" && hasLeaf(t.paneTree, leafId),
      );
      if (!tab || tab.kind !== "terminal") return;
      const isLast =
        leafIds(tab.paneTree).length === 1 &&
        all.filter((t) => t.kind === "terminal").length === 1;
      if (isLast) {
        void respawnSession(leafId, tab.cwd);
      } else {
        closePaneByLeaf(leafId);
      }
    },
    [closePaneByLeaf],
  );

  const handleEditorDirty = useCallback(
    (id: number, dirty: boolean) => updateTab(id, { dirty }),
    [updateTab],
  );

  const searchTarget = useMemo<SearchTarget>(() => {
    if (isTerminalTab && activeLeafId !== null && activeSearchAddon)
      return {
        kind: "terminal",
        addon: activeSearchAddon,
        focus: () => terminalRefs.current.get(activeLeafId)?.focus(),
      };
    if (isEditorTab && activeEditorHandle)
      return {
        kind: "editor",
        handle: activeEditorHandle,
        focus: () => activeEditorHandle.focus(),
      };
    if (isGitHistoryTab && gitHistoryHandle)
      return {
        kind: "git-history",
        handle: gitHistoryHandle,
        focus: () => {},
      };
    return null;
  }, [
    isTerminalTab,
    isEditorTab,
    isGitHistoryTab,
    activeLeafId,
    activeSearchAddon,
    activeEditorHandle,
    gitHistoryHandle,
  ]);

  const activeCwd = activeTerminalLeafCwd;

  useEffect(() => {
    const findCwd = () => {
      const active = tabs.find((x) => x.id === activeId);
      if (active?.kind === "terminal") {
        return findLeafCwd(active.paneTree, active.activeLeafId) ?? active.cwd ?? null;
      }
      for (let i = tabs.length - 1; i >= 0; i--) {
        const t = tabs[i];
        if (t.kind !== "terminal") continue;
        const cwd = findLeafCwd(t.paneTree, t.activeLeafId) ?? t.cwd;
        if (cwd) return cwd;
      }
      return explorerRoot ?? launchCwd ?? home ?? null;
    };

    const injectIntoLeaf = (leafId: number, text: string) => {
      if (!writeToSession(leafId, text)) return false;
      terminalRefs.current.get(leafId)?.focus();
      return true;
    };

    setLive({
      getCwd: findCwd,
      getTerminalContext: () => {
        const t = tabs.find((x) => x.id === activeId);
        if (t?.kind !== "terminal") return null;
        if (t.private) return null;
        const buf = terminalRefs.current.get(t.activeLeafId)?.getBuffer(300);
        return buf ? redactSensitive(buf) : null;
      },
      isActiveTerminalPrivate: () => {
        const t = tabs.find((x) => x.id === activeId);
        return t?.kind === "terminal" && t.private === true;
      },
      injectIntoActivePty: (text) => {
        const target = resolveTerminalInjectionTarget(
          tabs.filter((tab): tab is Extract<Tab, { kind: "terminal" }> => tab.kind === "terminal"),
          activeId,
          findCwd(),
        );
        if (!target) return false;
        if (target.kind === "existing") {
          setActiveId(target.tabId);
          void whenSessionReady(target.leafId)
            .then(() => {
              injectIntoLeaf(target.leafId, text);
            })
            .catch(() => {});
          return true;
        }
        const tabId = newTab(target.cwd ?? undefined);
        void (async () => {
          await new Promise((resolve) => setTimeout(resolve, 80));
          const tab = tabsRef.current.find((candidate) => candidate.id === tabId);
          if (!tab || tab.kind !== "terminal") return;
          setActiveId(tab.id);
          try {
            await whenSessionReady(tab.activeLeafId);
          } catch {
            return;
          }
          injectIntoLeaf(tab.activeLeafId, text);
        })();
        return true;
      },
      getWorkspaceRoot: () => explorerRoot ?? launchCwd ?? home ?? null,
      getActiveFile: () => {
        const t = tabs.find((x) => x.id === activeId);
        return t?.kind === "editor" ? t.path : null;
      },
      openPreview: (url: string) => {
        openPreviewTab(url);
        return true;
      },
      spawnManagedAgent: (prompt: string, sessionId: string) => {
        const trimmed = prompt.trim();
        if (!trimmed) return null;
        const oneLine = trimmed.replace(/\s*\r?\n\s*/g, " ");
        const cwd = findCwd();
        const short = oneLine.length > 32 ? `${oneLine.slice(0, 32)}…` : oneLine;
        const { tabId, leafId } = newAgentTab(cwd ?? undefined, `claude · ${short}`);
        useManagedAgentsStore
          .getState()
          .register({ leafId, tabId, sessionId, task: oneLine, cwd });
        const hooksReady = invoke("agent_enable_claude_hooks").catch(() => {});
        void (async () => {
          await Promise.all([whenSessionReady(leafId), hooksReady]);
          if (!writeToSession(leafId, "claude\r")) {
            useManagedAgentsStore.getState().remove(leafId);
            return;
          }
          const readBuf = () => {
            const term = terminalRefs.current.get(leafId);
            return term ? term.getBuffer(120) : null;
          };
          const result = await waitForClaudeTuiReady(readBuf);
          if (result !== "ready") {
            if (result === "timeout") {
              console.warn(
                "[javarf] Claude TUI did not appear in time; aborting prompt send",
              );
            }
            useManagedAgentsStore.getState().remove(leafId);
            return;
          }
          if (!writeToSession(leafId, `\x1b[200~${trimmed}\x1b[201~`)) {
            useManagedAgentsStore.getState().remove(leafId);
            return;
          }
          setTimeout(() => writeToSession(leafId, "\r"), 120);
          useManagedAgentsStore.getState().setPhase(leafId, "working");
        })();
        return { tabId, leafId };
      },
      readLeafBuffer: (leafId: number) => {
        const buf = terminalRefs.current.get(leafId)?.getBuffer(300);
        return buf ? redactSensitive(buf) : null;
      },
    });
  }, [
    setLive,
    activeId,
    tabs,
    explorerRoot,
    launchCwd,
    home,
    openPreviewTab,
    newTab,
    newAgentTab,
  ]);

  const workspaceSurface = (
    <div className="relative h-full min-h-0">
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isTerminalTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isTerminalTab}
      >
        <TerminalStack
          tabs={tabs}
          activeId={activeId}
          registerHandle={registerTerminalHandle}
          onSearchReady={handleSearchReady}
          onCwd={handleTerminalCwd}
          onExit={handleLeafExit}
          onFocusLeaf={handleFocusLeaf}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isEditorTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isEditorTab}
      >
        <EditorStack
          tabs={tabs}
          activeId={activeId}
          registerHandle={registerEditorHandle}
          onDirtyChange={handleEditorDirty}
          onCloseTab={disposeTab}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isPreviewTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isPreviewTab}
      >
        <PreviewStack
          tabs={tabs}
          activeId={activeId}
          registerHandle={registerPreviewHandle}
          onUrlChange={handlePreviewUrl}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isMarkdownTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isMarkdownTab}
      >
        <MarkdownStack tabs={tabs} activeId={activeId} />
      </div>
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isAiDiffTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isAiDiffTab}
      >
        <AiDiffStack
          tabs={tabs}
          activeId={activeId}
          onAccept={(id) => respondToApproval(id, true)}
          onReject={(id) => respondToApproval(id, false)}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 px-3 pt-2 pb-2",
          !isGitDiffTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isGitDiffTab}
      >
        <GitDiffStack tabs={tabs} activeId={activeId} />
      </div>
      <div
        className={cn(
          "absolute inset-0",
          !isGitHistoryTab && "invisible pointer-events-none",
        )}
        aria-hidden={!isGitHistoryTab}
      >
        <GitHistoryStack
          tabs={tabs}
          activeId={activeId}
          onOpenCommitFile={openCommitFileDiffTab}
          onSearchHandle={setGitHistoryHandle}
        />
      </div>
    </div>
  );

  const phase1DashboardShell = phase1Repo ? (
    <Suspense fallback={null}>
      <FindingsDashboardLazy
        repo={phase1Repo}
        selectedScanPath={javaAnalysisFolderPath}
        autoStartScanPath={javaAutoScanPath}
        previewOnly={phase1Repo.previewOnly === true}
        onClose={handleClosePhase1}
      />
    </Suspense>
  ) : null;

  const phase1Surface =
    phase1Mode === "hidden" ? null : phase1Mode === "intake" ? (
      <JavaRepoHome
        state={javaRepoHomeState}
        onChooseFolder={handleChooseJavaRepo}
        onPreviewDashboard={handlePreviewJavaRefactor}
        onStartFullAnalysis={handleStartFullAnalysis}
        onClose={handleClosePhase1}
      />
    ) : (
      phase1DashboardShell
    );

  const javaPreviewActive =
    javaPreviewOpen &&
    javaPreviewFilePath !== null &&
    phase1Repo !== null &&
    activeTab?.kind === "editor" &&
    activeTab.path.replace(/\\/g, "/") === javaPreviewFilePath.replace(/\\/g, "/");

  const previewWorkspaceSurface = javaPreviewActive ? (
    <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0 min-w-0 overflow-hidden">
      <ResizablePanel className="min-w-0" defaultSize="58%" minSize="32%">
        {workspaceSurface}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel className="min-w-0" defaultSize="42%" minSize="26%">
        <div className="h-full min-h-0 min-w-0 overflow-hidden px-3 pt-2 pb-2">
          <JavaRefactorPreviewShell
            repo={phase1Repo}
            filePath={javaPreviewFilePath}
            onClose={() => setJavaPreviewOpen(false)}
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    workspaceSurface
  );
  const showHomeDashboardSurface =
    activeTab?.kind === "terminal" &&
    activeTab.id === 1 &&
    activeTab.title === "shell" &&
    tabs.length === 1 &&
    phase1Mode === "hidden" &&
    !javaPreviewActive &&
    !isDashboardTab &&
    !isAgentDashboardTab;

  const dashboardSurface = (
    <Suspense fallback={null}>
      <HomeDashboardLazy
        hasModelAccess={hasComposer}
        hasWorkspace={hasWorkspace}
        onOpenWorkspace={() => {
          void handleChooseJavaRepo();
        }}
        onBrowseProject={hasWorkspace ? toggleExplorerFocus : undefined}
        onSearchRepository={hasWorkspace ? openExplorerSearch : undefined}
        onOpenAssistant={openAssistantFromDashboard}
        onOpenRecentFile={openDashboardRecentFile}
        onOpenBrowser={openPreviewTab}
        recentProjectPaths={dashboardProjectPaths}
        recentFilePaths={dashboardRecentFiles}
        repoStatus={dashboardRepoStatus}
        onOpenJavaRefactor={handleOpenJavaRefactor}
      />
    </Suspense>
  );
  const agentDashboardSurface = (
    <Suspense fallback={null}>
      <AgentConversationDashboardLazy
        aiDiffTabs={aiDiffTabs}
        onOpenBrowser={openPreviewTab}
      />
    </Suspense>
  );

  return (
    <TooltipProvider>
      <div
        data-layout-mode={layoutMode}
        className={cn(
          "relative flex h-screen flex-col overflow-hidden bg-background text-foreground",
          layoutMode === "terminal-focus" && "javarf-layout-terminal-focus",
          layoutMode === "compact-ops" && "javarf-layout-compact-ops",
        )}
      >
          {zenMode ? (
            <div
              className="absolute inset-x-0 top-0 z-40 h-3"
              onMouseEnter={() => setHeaderHover(true)}
              onMouseLeave={() => setHeaderHover(false)}
            />
          ) : null}
          <Header
            tabs={tabs}
            activeId={activeId}
            onSelect={(nextId) => {
              const nextTab = tabsRef.current.find((tab) => tab.id === nextId);
              if (
                phase1Mode !== "hidden" &&
                hasWorkspace &&
                !showFirstRunSetup &&
                tabShouldHidePhase1(nextTab, activeJavaRepoPath)
              ) {
                setPhase1Mode("hidden");
              }
              setActiveId(nextId);
            }}
            onNew={openNewTab}
            onNewPrivate={openNewPrivateTab}
            onNewPreview={() => openPreviewTab("")}
            onNewDashboard={openDashboardTab}
            onNewAgentDashboard={openAgentDashboardTab}
            onOpenJavaRefactor={handleOpenJavaRefactor}
            onNewEditor={() => setNewEditorOpen(true)}
            onNewGitGraph={openGitGraphFromContext}
            onClose={handleClose}
            onPin={pinTab}
            onToggleSidebar={toggleSidebar}
            onSplit={splitActivePaneInActiveTab}
            canSplit={
              activeTerminalTab !== null &&
              leafIds(activeTerminalTab.paneTree).length < MAX_PANES_PER_TAB
            }
            onActivateAgent={onActivateAgent}
            onActivateLocalAgent={onActivateLocalAgent}
            onOpenWorkspace={() => {
              void handleChooseJavaRepo();
            }}
            onOpenTutorial={() => setTutorialOpen(true)}
            onOpenAniCli={() => setAniCliOpen(true)}
            onOpenSettings={() => void openSettingsWindow()}
            searchTarget={searchTarget}
            searchRef={searchInlineRef}
            layoutMode={layoutMode}
            zenMode={zenMode}
            hiddenInZen={hideHeaderInZen}
            onToggleZenMode={handleZenModeToggle}
            onHoverChange={setHeaderHover}
          />

          <main className="zoom-content flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <ResizablePanelGroup
              orientation="horizontal"
              className="min-h-0 min-w-0 flex-1 overflow-hidden"
            >
              <ResizablePanel
                id="sidebar"
                panelRef={sidebarRef}
                defaultSize={hasWorkspace ? `${sidebarWidthForLayout(layoutMode, sidebarWidthRef.current)}px` : 0}
                minSize={`${SIDEBAR_MIN_WIDTH}px`}
                maxSize={`${SIDEBAR_MAX_WIDTH}px`}
                collapsible
                collapsedSize={0}
                onResize={(size) => {
                  if (size.inPixels > 0) persistSidebarWidth(size.inPixels);
                }}
              >
                <div
                  className={cn(
                    "javarf-terminal-shell flex h-full min-h-0 flex-col border-r border-[color:var(--border)] bg-[#06080b]/92 transition-[opacity,border-color,background-color] duration-75 ease-out",
                    zenMode ? "opacity-96" : "opacity-100",
                  )}
                  onMouseEnter={() => {
                    if (!zenMode) return;
                    zenSidebarHoverRef.current = true;
                    zenSidebarPinnedRef.current = true;
                    handleStatusBarHoverChange(true);
                  }}
                  onMouseLeave={() => {
                    if (!zenMode) return;
                    zenSidebarHoverRef.current = false;
                    zenSidebarPinnedRef.current = false;
                    handleStatusBarHoverChange(false);
                  }}
                  onFocusCapture={() => {
                    if (!zenMode) return;
                    zenSidebarHoverRef.current = true;
                    zenSidebarPinnedRef.current = true;
                    handleStatusBarHoverChange(true);
                  }}
                  onBlurCapture={(event) => {
                    if (!zenMode) return;
                    const nextTarget = event.relatedTarget;
                    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
                      return;
                    }
                    zenSidebarHoverRef.current = false;
                    zenSidebarPinnedRef.current = false;
                    handleStatusBarHoverChange(false);
                  }}
                >
                  {hasWorkspace ? (
                    <>
                      {layoutMode !== "compact-ops" ? (
                        <SidebarRail
                          activeView={sidebarView}
                          onSelectView={persistSidebarView}
                          changedCount={sourceControl.changedCount}
                        />
                      ) : null}
                      <div className="min-h-0 flex-1">
                        {sidebarView === "explorer" ? (
                          <FileExplorer
                            ref={explorerRef}
                            rootPath={explorerRoot}
                            onOpenFile={handleOpenFile}
                            onPathRenamed={handlePathRenamed}
                            onPathDeleted={handlePathDeleted}
                            onRevealInTerminal={cdInNewTab}
                            onSelectDirectory={handleSelectAnalysisFolder}
                            onAnalyzeFolder={handleAnalyzeFolder}
                            onAttachToAgent={handleAttachFileToAgent}
                            onOpenMarkdownPreview={openMarkdownPreview}
                          />
                        ) : (
                          <SourceControlPanel
                            open
                            sourceControl={sourceControl}
                            onOpenDiff={openGitDiffTab}
                            onOpenGitGraph={openGitGraphFromContext}
                          />
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel id="workspace" className="min-w-0" defaultSize="78%" minSize="30%">
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#020304]">
                  <div
                    className={cn(
                      "relative min-h-0 min-w-0 flex-1 overflow-hidden transition-opacity duration-150 ease-out",
                      zenMode ? "opacity-[0.985]" : "opacity-100",
                    )}
                  >
                    {showFirstRunSetup &&
                    !showHomeDashboardSurface &&
                    !isDashboardTab &&
                    !isAgentDashboardTab ? (
                      <JavaFirstRunSetup
                        hasModelAccess={hasComposer}
                        canContinue={canContinueFirstRunSetup}
                        repoLabel={
                          javaRepoHomeState.kind === "supported"
                            ? javaRepoHomeState.path
                            : firstRunRepoPath
                        }
                        repoReady={javaRepoHomeState.kind === "supported"}
                        onOpenModels={() => void openSettingsWindow("models")}
                        onChooseRepo={handleChooseJavaRepo}
                        onContinue={handleCompleteFirstRunSetup}
                      />
                    ) : phase1Mode !== "hidden" &&
                      !javaPreviewActive &&
                      !isAgentDashboardTab ? (
                      phase1Surface
                    ) : showHomeDashboardSurface ? (
                      dashboardSurface
                    ) : isAgentDashboardTab ? (
                      agentDashboardSurface
                    ) : isDashboardTab ? (
                      dashboardSurface
                    ) : (
                      previewWorkspaceSurface
                    )}
                  </div>

                  {keysLoaded ? (
                    <motion.div
                      data-ai-input-bar
                      initial={false}
                      animate={{
                        height: panelOpen ? "auto" : 0,
                        opacity: panelOpen ? 1 : 0,
                        y: panelOpen ? 0 : -2,
                      }}
                      transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                      className={cn(
                        "overflow-hidden transition-all duration-150",
                        zenMode && "opacity-40 hover:opacity-100",
                      )}
                      aria-hidden={!panelOpen}
                    >
                      {hasComposer ? (
                        <AiInputBar />
                      ) : (
                        <AiInputBarConnect
                          onAdd={() => void openSettingsWindow("models")}
                        />
                      )}
                    </motion.div>
                  ) : null}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </main>

          <StatusBar
            cwd={activeCwd}
            filePath={activeFilePath}
            home={home}
            onCd={sendCd}
            onWorkspaceChange={switchWorkspace}
            onOpenMini={openMini}
            hasComposer={hasComposer}
            zenMode={zenMode}
            compactSidebarRail={
              hasWorkspace && layoutMode === "compact-ops" ? (
                <SidebarRail
                  compact
                  activeView={sidebarView}
                  onSelectView={persistSidebarView}
                  changedCount={sourceControl.changedCount}
                />
              ) : null
            }
            collapsePathBarInZen={zenMode && !statusBarHover}
            privateActive={
              activeTab?.kind === "terminal" && activeTab.private === true
            }
            onHoverChange={handleStatusBarHoverChange}
          />

          <AgentNotificationsBridge
            tabs={tabs}
            activeId={activeId}
            onActivate={onActivateAgent}
          />
          <Toaster position="bottom-right" />
          <TutorialDialog
            open={tutorialOpen}
            layoutMode={layoutMode}
            onSlideAction={handleTutorialSlideAction}
            onOpenChange={setTutorialOpen}
          />
          <AniCliDialog
            open={aniCliOpen}
            onOpenChange={setAniCliOpen}
            onRunInTerminal={runAniCliCommandInTerminal}
          />

          {hasComposer ? (
            <>
              <AgentRunBridge
                openAiDiffTab={openAiDiffTab}
                setAiDiffStatus={setAiDiffStatus}
              />
              <LocalAgentNotificationsBridge />
            </>
          ) : null}

          <AnimatePresence>
            {miniOpen && hasComposer ? (
              <AiMiniWindow key="ai-mini" onOpenPreview={openPreviewTab} />
            ) : null}
            {askPopup ? (
              <SelectionAskAi
                key="ask-ai-popup"
                x={askPopup.x}
                y={askPopup.y}
                onAsk={onAskFromSelection}
                onDismiss={() => setAskPopup(null)}
              />
            ) : null}
          </AnimatePresence>

          <ShortcutsDialog
            open={shortcutsOpen}
            onOpenChange={setShortcutsOpen}
          />

          <NewEditorDialog
            open={newEditorOpen}
            onOpenChange={setNewEditorOpen}
            rootPath={explorerRoot ?? home}
            onCreated={(path) => openFileTab(path)}
          />

          <UpdaterDialog />

          <UnsavedDialogs
            tabs={tabs}
            pendingCloseTab={pendingCloseTab}
            pendingDeleteTabs={pendingDeleteTabs}
            cancelClose={cancelClose}
            confirmClose={confirmClose}
            cancelDeleteClose={cancelDeleteClose}
            confirmDeleteClose={confirmDeleteClose}
          />
      </div>
    </TooltipProvider>
  );
}

function UnsavedDialogs({
  tabs,
  pendingCloseTab,
  pendingDeleteTabs,
  cancelClose,
  confirmClose,
  cancelDeleteClose,
  confirmDeleteClose,
}: {
  tabs: Tab[];
  pendingCloseTab: number | null;
  pendingDeleteTabs: number[] | null;
  cancelClose: () => void;
  confirmClose: () => void;
  cancelDeleteClose: () => void;
  confirmDeleteClose: () => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <AlertDialog
        open={pendingCloseTab !== null}
        onOpenChange={(open) => !open && cancelClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.unsavedChanges.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tabs.find((tab) => tab.id === pendingCloseTab)?.title
                ? t("dialog.unsavedChanges.singleClose", {
                    title: String(
                      tabs.find((tab) => tab.id === pendingCloseTab)?.title ?? "",
                    ),
                  })
                : t("dialog.unsavedChanges.singleCloseFallback")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelClose}>
              {t("agents.dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmClose}>
              {t("dialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteTabs !== null}
        onOpenChange={(open) => !open && cancelDeleteClose()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dialog.unsavedChanges.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteTabs?.length === 1
                ? (() => {
                    const title = tabs.find(
                      (tab) => tab.id === pendingDeleteTabs[0],
                    )?.title;
                    return title
                      ? t("dialog.unsavedChanges.singleDeletedClose", {
                          title,
                        })
                      : t("dialog.unsavedChanges.singleDeletedCloseFallback");
                  })()
                : t("dialog.unsavedChanges.multiDeletedClose", {
                    count: pendingDeleteTabs?.length ?? 0,
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteClose}>
              {t("agents.dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteClose}>
              {t("dialog.closeAnyway")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


function JavaRefactorPreviewShell({
  repo,
  filePath,
  onClose,
}: {
  repo: Phase1DashboardRepo | null;
  filePath: string | null;
  onClose: () => void;
}) {
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const apiKeys = useChatStore((s) => s.apiKeys);
  const lmstudioBaseURL = usePreferencesStore((s) => s.lmstudioBaseURL);
  const lmstudioModelId = usePreferencesStore((s) => s.lmstudioModelId);
  const mlxBaseURL = usePreferencesStore((s) => s.mlxBaseURL);
  const mlxModelId = usePreferencesStore((s) => s.mlxModelId);
  const ollamaBaseURL = usePreferencesStore((s) => s.ollamaBaseURL);
  const ollamaModelId = usePreferencesStore((s) => s.ollamaModelId);
  const openaiCompatibleBaseURL = usePreferencesStore((s) => s.openaiCompatibleBaseURL);
  const openaiCompatibleModelId = usePreferencesStore((s) => s.openaiCompatibleModelId);
  const openrouterModelId = usePreferencesStore((s) => s.openrouterModelId);
  const refactorCustomInstructions = usePreferencesStore((s) => s.refactorCustomInstructions);
  const mcpProviders = usePreferencesStore((s) => s.mcpProviders);
  const managedMcpPresets = usePreferencesStore((s) => s.managedMcpPresets);
  const [toolKeys, setToolKeys] = useState<{ exa: string | null; context7: string | null }>({
    exa: null,
    context7: null,
  });

  useEffect(() => {
    let alive = true;
    void Promise.all([getRefactorToolKey("exa"), getRefactorToolKey("context7")]).then(
      ([exa, context7]) => {
        if (!alive) return;
        setToolKeys({ exa, context7 });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const refactorModelConfig = useMemo(
    () => ({
      modelId: selectedModelId,
      keys: apiKeys as Record<string, string>,
      lmstudioBaseURL,
      lmstudioModelId,
      mlxBaseURL,
      mlxModelId,
      ollamaBaseURL,
      ollamaModelId,
      openaiCompatibleBaseURL,
      openaiCompatibleModelId,
      openrouterModelId,
      refactorCustomInstructions,
    }),
    [
      apiKeys,
      lmstudioBaseURL,
      lmstudioModelId,
      mlxBaseURL,
      mlxModelId,
      ollamaBaseURL,
      ollamaModelId,
      openaiCompatibleBaseURL,
      openaiCompatibleModelId,
      openrouterModelId,
      refactorCustomInstructions,
      selectedModelId,
    ],
  );

  const refactorMcpConfig = useMemo(
    () =>
      buildRuntimeMcpConfig({
        providers: mcpProviders,
        managedPresets: managedMcpPresets,
        managedHealth: getManagedMcpHealthSnapshots(),
        toolKeys,
      }),
    [managedMcpPresets, mcpProviders, toolKeys],
  );

  const refactor = useRefactorGeneration(refactorModelConfig, refactorMcpConfig);
  const { generateForFile, reset } = refactor;
  const repoPath = repo?.path ?? null;

  useEffect(() => {
    if (!repoPath || !filePath) return;
    reset();
  }, [filePath, repoPath, reset]);

  useEffect(() => () => reset(), [reset]);

  if (!repo || !filePath) return null;

  return (
    <Suspense fallback={null}>
      <JavaRefactorPreviewPaneLazy
        repoPath={repo.path}
        filePath={filePath}
        refactor={refactor}
        onGenerate={() => void generateForFile(filePath, repo.path)}
        onRetry={() => void generateForFile(filePath, repo.path)}
        onClose={onClose}
      />
    </Suspense>
  );
}
