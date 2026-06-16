import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useChatStore } from "@/modules/ai";
import { AgentStatusPill } from "@/modules/ai/components/AgentStatusPill";
import {
  AiOpenButton,
  AiStatusBarControls,
} from "@/modules/ai/components/AiStatusBarControls";
import { useI18n } from "@/modules/i18n";
import { useRefactorAutomationPrefs } from "@/modules/findings/lib/refactorAutomationPrefs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IncognitoIcon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { WorkspaceEnv } from "@/modules/workspace";
import { CwdBreadcrumb } from "./CwdBreadcrumb";
import { WorkspaceEnvSelector } from "./WorkspaceEnvSelector";

type Props = {
  placement?: "top" | "bottom";
  cwd: string | null;
  filePath?: string | null;
  home: string | null;
  onCd: (path: string) => void;
  onWorkspaceChange: (env: WorkspaceEnv) => void;
  onOpenMini: () => void;
  hasComposer: boolean;
  privateActive: boolean;
  compactSidebarRail?: React.ReactNode;
  zenMode?: boolean;
  collapsePathBarInZen?: boolean;
  onHoverChange?: (hovered: boolean) => void;
};

export function StatusBar({
  placement = "bottom",
  cwd,
  filePath,
  home,
  onCd,
  onWorkspaceChange,
  onOpenMini,
  hasComposer,
  privateActive,
  compactSidebarRail,
  zenMode,
  collapsePathBarInZen = false,
  onHoverChange,
}: Props) {
  const { t } = useI18n();
  const panelOpen = useChatStore((s) => s.panelOpen);
  const openPanel = useChatStore((s) => s.openPanel);

  return (
    <footer
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocusCapture={() => onHoverChange?.(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        onHoverChange?.(false);
      }}
      className={cn(
        "javarf-terminal-shell flex h-9 shrink-0 items-center justify-between gap-2 border-[color:var(--border)] bg-[#040506]/92 px-3 text-[11px]",
        placement === "top" ? "border-b" : "border-t",
        zenMode && "opacity-30 hover:opacity-100 hover:bg-[#08090b]/98",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <WorkspaceEnvSelector onSelect={onWorkspaceChange} />
        {compactSidebarRail ? <div className="shrink-0">{compactSidebarRail}</div> : null}
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden transition-[max-width,opacity,transform] duration-150 ease-out",
            collapsePathBarInZen
              ? "pointer-events-none max-w-0 -translate-y-0.5 opacity-0"
              : "max-w-full opacity-100",
          )}
          aria-hidden={collapsePathBarInZen}
        >
          <CwdBreadcrumb cwd={cwd} filePath={filePath} home={home} onCd={onCd} />
        </div>
        {privateActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex shrink-0 cursor-default items-center gap-1 border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300">
                <HugeiconsIcon icon={IncognitoIcon} size={11} strokeWidth={2} />
                <span>{t("status.privateChannel")}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-[11px] leading-relaxed">
              {t("status.privateTooltip")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <RefactorAutomationPopover />
        <AgentStatusPill onClick={onOpenMini} />
        {panelOpen && hasComposer ? (
          <AiStatusBarControls />
        ) : (
          <AiOpenButton onOpen={openPanel} />
        )}
      </div>
    </footer>
  );
}

function RefactorAutomationPopover() {
  const { t } = useI18n();
  const {
    autoApply,
    autoCommit,
    autoPush,
    setAutoApply,
    setAutoCommit,
    setAutoPush,
  } = useRefactorAutomationPrefs();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            (autoApply || autoCommit || autoPush) && "text-primary",
          )}
          title={t("status.refactorAutomation")}
          aria-label={t("status.refactorAutomation")}
        >
          <HugeiconsIcon icon={Settings01Icon} size={13} strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 p-2">
        <div className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {t("status.refactorAutomation")}
        </div>
        <div className="space-y-1.5">
          <AutomationRow
            label={t("status.autoRefactor")}
            checked={autoApply}
            onCheckedChange={setAutoApply}
          />
          <AutomationRow
            label={t("status.autoCommit")}
            checked={autoCommit}
            disabled={!autoApply}
            onCheckedChange={setAutoCommit}
          />
          <AutomationRow
            label={t("status.autoPush")}
            checked={autoPush}
            disabled={!autoApply || !autoCommit}
            onCheckedChange={setAutoPush}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AutomationRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/70 px-2.5 py-2 text-[11px] text-muted-foreground">
      <span>{label}</span>
      <Switch
        size="sm"
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  );
}
