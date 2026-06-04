import { useChatStore } from "@/modules/ai";
import { AgentStatusPill } from "@/modules/ai/components/AgentStatusPill";
import {
  AiOpenButton,
  AiStatusBarControls,
} from "@/modules/ai/components/AiStatusBarControls";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IncognitoIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { CwdBreadcrumb } from "./CwdBreadcrumb";
import { WorkspaceEnvSelector } from "./WorkspaceEnvSelector";
import type { WorkspaceEnv } from "@/modules/workspace";
import { cn } from "@/lib/utils";

type Props = {
  cwd: string | null;
  filePath?: string | null;
  home: string | null;
  onCd: (path: string) => void;
  onWorkspaceChange: (env: WorkspaceEnv) => void;
  onOpenMini: () => void;
  /** Only rendered when the AI panel is open and a key is loaded. */
  hasComposer: boolean;
  privateActive: boolean;
  zenMode?: boolean;
  collapsePathBarInZen?: boolean;
  onHoverChange?: (hovered: boolean) => void;
};

export function StatusBar({
  cwd,
  filePath,
  home,
  onCd,
  onWorkspaceChange,
  onOpenMini,
  hasComposer,
  privateActive,
  zenMode,
  collapsePathBarInZen = false,
  onHoverChange,
}: Props) {
  const panelOpen = useChatStore((s) => s.panelOpen);
  const openPanel = useChatStore((s) => s.openPanel);

  return (
    <footer
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      onFocusCapture={() => onHoverChange?.(true)}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
          return;
        }
        onHoverChange?.(false);
      }}
      className={cn(
        "javarf-terminal-shell flex h-10 shrink-0 items-center justify-between gap-3 border-t border-[color:var(--border)] bg-[#050506]/96 px-3 text-[11px] backdrop-blur-sm",
        zenMode && "opacity-30 hover:opacity-100 hover:bg-[#08090b]/98",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <WorkspaceEnvSelector onSelect={onWorkspaceChange} />
        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden transition-[max-width,opacity,transform] duration-150 ease-out",
            collapsePathBarInZen
              ? "max-w-0 -translate-y-0.5 opacity-0 pointer-events-none"
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
                <span>Private channel</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64 text-[11px] leading-relaxed">
              AI can't see this terminal's output. Use it for secrets, SSH, or
              anything you don't want sent to the model.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex items-center gap-2 border-l border-[color:var(--border)] pl-3"
        >
          <div className="javarf-cat">
            <span className="javarf-cat__ear javarf-cat__ear--left" />
            <span className="javarf-cat__ear javarf-cat__ear--right" />
            <span className="javarf-cat__face">
              <span className="javarf-cat__eye javarf-cat__eye--left">
                <span className="javarf-cat__pupil" />
              </span>
              <span className="javarf-cat__eye javarf-cat__eye--right">
                <span className="javarf-cat__pupil" />
              </span>
              <span className="javarf-cat__muzzle" />
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/48">
            stray daemon
          </span>
        </div>
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
