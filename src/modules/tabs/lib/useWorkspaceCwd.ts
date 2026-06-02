import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Tab } from "./useTabs";

type Result = {
  explorerRoot: string | null;
  inheritedCwdForNewTab: () => string | undefined;
};

export function useWorkspaceCwd(
  activeTab: Tab | undefined,
  tabs: Tab[],
  home: string | null,
  preferredRoot?: string | null,
): Result {
  const lastTerminalCwd = useRef<string | null>(null);

  useEffect(() => {
    if (activeTab?.kind === "terminal" && activeTab.cwd) {
      lastTerminalCwd.current = activeTab.cwd;
    }
  }, [activeTab]);

  const explorerRoot = useMemo<string | null>(() => {
    if (preferredRoot) return preferredRoot;
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    if (lastTerminalCwd.current) return lastTerminalCwd.current;
    const anyTerm = tabs.find((t) => t.kind === "terminal" && t.cwd);
    if (anyTerm?.kind === "terminal" && anyTerm.cwd) return anyTerm.cwd;
    return home;
  }, [activeTab, tabs, home, preferredRoot]);

  const inheritedCwdForNewTab = useCallback((): string | undefined => {
    if (preferredRoot) return preferredRoot;
    if (activeTab?.kind === "terminal" && activeTab.cwd) return activeTab.cwd;
    return lastTerminalCwd.current ?? home ?? undefined;
  }, [activeTab, home, preferredRoot]);

  return { explorerRoot, inheritedCwdForNewTab };
}
