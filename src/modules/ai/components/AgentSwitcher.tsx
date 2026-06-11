import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useI18n } from "@/modules/i18n";
import { openSettingsWindow } from "@/modules/settings/openSettingsWindow";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { setAgentFamilyMode } from "@/modules/settings/store";
import {
  AbsoluteIcon,
  ArrowDown01Icon,
  BookOpen02Icon,
  Bug02Icon,
  CargoShipIcon,
  CodeIcon,
  CrownIcon,
  FireIcon,
  FlashIcon,
  GlassesIcon,
  PaintBrush04Icon,
  PencilEdit02Icon,
  Settings01Icon,
  ShieldUserIcon,
  SparklesIcon,
  Tick02Icon,
  GlobalSearchIcon,
  MoonIcon,
  Search01Icon,
  StrategyIcon,
  Sword03Icon,
  Target02Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "@/modules/theme";
import { getAgentDisplay } from "../lib/agentPresentation";
import {
  resolveAgentsForContext,
  selectAgentForContext,
  type Agent,
  type AgentIconId,
} from "../lib/agents";
import { useManagedMcpStore } from "../lib/managedMcp";
import { useAgentsStore } from "../store/agentsStore";
import { useEffect, useMemo, type CSSProperties } from "react";

const ICONS: Record<AgentIconId, typeof CodeIcon> = {
  coder: CodeIcon,
  architect: AbsoluteIcon,
  reviewer: PencilEdit02Icon,
  security: ShieldUserIcon,
  designer: PaintBrush04Icon,
  debugger: Bug02Icon,
  spark: SparklesIcon,
  osint: GlobalSearchIcon,
  brain: SparklesIcon,
  book: BookOpen02Icon,
  crown: CrownIcon,
  fire: FireIcon,
  flash: FlashIcon,
  glasses: GlassesIcon,
  moon: MoonIcon,
  search: Search01Icon,
  ship: CargoShipIcon,
  strategy: StrategyIcon,
  sword: Sword03Icon,
  target: Target02Icon,
  user: UserIcon,
};

export function AgentSwitcher({ isMiniWindow }: { isMiniWindow?: boolean }) {
  const { t } = useI18n();
  const customAgents = useAgentsStore((s) => s.customAgents);
  const activeId = useAgentsStore((s) => s.activeId);
  const setActiveId = useAgentsStore((s) => s.setActiveId);
  const statuses = useManagedMcpStore((s) => s.statuses);
  const familyMode = usePreferencesStore((s) => s.agentFamilyMode);
  const { themeId } = useTheme();

  const list = useMemo(
    () => [...useAgentsStore.getState().all()],
    [customAgents],
  );

  const familyList = useMemo(
    () => resolveAgentsForContext(list, themeId, familyMode),
    [familyMode, list, themeId],
  );
  const selected =
    selectAgentForContext(list, activeId, themeId, familyMode) ??
    familyList[0] ??
    list[0];
  const builtIn = familyList.filter((agent) => agent.builtIn);
  const custom = familyList.filter((agent) => !agent.builtIn);
  const activeDisplay = getAgentDisplay(selected, t);
  const ActiveIcon = ICONS[selected.icon] ?? SparklesIcon;

  useEffect(() => {
    if (!selected || selected.id === activeId) return;
    setActiveId(selected.id);
  }, [activeId, selected, setActiveId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="xs"
          variant="outline"
          className={cn(
            !isMiniWindow
              ? "flex h-6 items-center gap-1 rounded-md border border-border/60 bg-card px-1.5 text-[10.5px] text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground"
              : "mr-1 text-xs",
          )}
          title={`Agent: ${activeDisplay.name}`}
        >
          <HugeiconsIcon icon={ActiveIcon} size={11} strokeWidth={1.75} />
          <span className="max-w-[7rem] truncate">{activeDisplay.name}</span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={10}
            strokeWidth={2}
            className="opacity-70"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-64">
        <div className="grid grid-cols-2 gap-1 px-2 py-1.5">
          {(["general", "cybersecurity"] as const).map((family) => (
            <button
              key={family}
              type="button"
              onClick={() => void setAgentFamilyMode(family)}
              className={cn(
                "rounded-md px-2 py-1 text-[10.5px] font-medium uppercase tracking-[0.12em] transition-colors",
                familyMode === family
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/45 hover:text-foreground",
              )}
            >
              {t(`agentSwitcher.family.${family}`)}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <div className="px-2 pt-1.5 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {t("agentSwitcher.builtIn")}
        </div>
        {builtIn.map((agent) => {
          const Icon = ICONS[agent.icon] ?? SparklesIcon;
          const available = isAgentSelectable(agent, statuses);
          const display = getAgentDisplay(agent, t);
          return (
            <DropdownMenuItem
              key={agent.id}
              disabled={!available}
              onSelect={() => {
                if (available) setActiveId(agent.id);
              }}
              className={cn(
                "flex items-start gap-2 pr-2 text-[12px] hover:bg-[color-mix(in_oklab,var(--agent-hover)_16%,transparent)]",
                agent.id === selected.id && "bg-accent/40",
                !available && "opacity-70",
              )}
              style={{ "--agent-hover": agent.hoverColor ?? "var(--accent)" } as CSSProperties}
            >
              <HugeiconsIcon
                icon={Icon}
                size={13}
                strokeWidth={1.75}
                  className={cn(
                    "mt-0.5",
                    agent.id === selected.id
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                  style={agent.id === selected.id ? { color: agent.hoverColor } : undefined}
                />
              <span className="flex min-w-0 flex-1 flex-col">
                <span>{display.name}</span>
                <span className="line-clamp-1 text-[10.5px] text-muted-foreground">
                  {available ? display.description : t("agents.unavailableDebugger")}
                </span>
              </span>
              {agent.id === selected.id ? (
                <HugeiconsIcon
                  icon={Tick02Icon}
                  size={12}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-foreground"
                />
              ) : null}
            </DropdownMenuItem>
          );
        })}
        {custom.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 pt-1 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
              {t("agentSwitcher.custom")}
            </div>
            {custom.map((agent) => {
              const Icon = ICONS[agent.icon] ?? SparklesIcon;
              const display = getAgentDisplay(agent, t);
              return (
                <DropdownMenuItem
                  key={agent.id}
                  onSelect={() => setActiveId(agent.id)}
                  className={cn(
                    "flex items-start gap-2 text-[12px] hover:bg-[color-mix(in_oklab,var(--agent-hover)_16%,transparent)]",
                    agent.id === selected.id && "bg-accent/40",
                  )}
                  style={{ "--agent-hover": agent.hoverColor ?? "var(--accent)" } as CSSProperties}
                >
                  <HugeiconsIcon
                    icon={Icon}
                    size={13}
                    strokeWidth={1.75}
                    className="mt-0.5 text-muted-foreground"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{display.name}</span>
                    {display.description ? (
                      <span className="line-clamp-1 text-[10.5px] text-muted-foreground">
                        {display.description}
                      </span>
                    ) : null}
                  </span>
                  {agent.id === selected.id ? (
                    <HugeiconsIcon
                      icon={Tick02Icon}
                      size={12}
                      strokeWidth={2}
                      className="mt-0.5 shrink-0 text-foreground"
                    />
                  ) : null}
                </DropdownMenuItem>
              );
            })}
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => void openSettingsWindow("agents")}
          className="gap-2 text-[12px] text-muted-foreground"
        >
          <HugeiconsIcon icon={Settings01Icon} size={12} strokeWidth={1.75} />
          {t("agentSwitcher.manage")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function isAgentSelectable(
  agent: Pick<Agent, "requiresManagedMcp">,
  statuses: ReturnType<typeof useManagedMcpStore.getState>["statuses"],
): boolean {
  if (!agent.requiresManagedMcp) return true;
  return statuses[agent.requiresManagedMcp]?.healthy === true;
}

export { ICONS as AGENT_ICONS };
