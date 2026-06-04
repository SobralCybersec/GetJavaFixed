export type TerminalInjectionCandidate = {
  id: number;
  kind: "terminal";
  activeLeafId: number;
  private?: boolean;
};

export type TerminalInjectionTarget =
  | { kind: "existing"; tabId: number; leafId: number }
  | { kind: "new"; cwd: string | null };

export function resolveTerminalInjectionTarget(
  tabs: readonly TerminalInjectionCandidate[],
  activeId: number,
  fallbackCwd: string | null,
): TerminalInjectionTarget | null {
  const active = tabs.find((tab) => tab.id === activeId);
  if (active && !active.private) {
    return {
      kind: "existing",
      tabId: active.id,
      leafId: active.activeLeafId,
    };
  }

  for (let i = tabs.length - 1; i >= 0; i -= 1) {
    const tab = tabs[i];
    if (tab.private) continue;
    return {
      kind: "existing",
      tabId: tab.id,
      leafId: tab.activeLeafId,
    };
  }

  return { kind: "new", cwd: fallbackCwd };
}
