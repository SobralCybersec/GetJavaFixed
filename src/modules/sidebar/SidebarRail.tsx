import { cn } from "@/lib/utils";
import { Coffee02Icon, GitBranchIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { SidebarViewId } from "./types";

export const SIDEBAR_RAIL_HEIGHT = 36;

type RailItem = {
  id: SidebarViewId;
  label: string;
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  badge?: number;
};

type Props = {
  activeView: SidebarViewId;
  onSelectView: (view: SidebarViewId) => void;
  changedCount: number;
};

export function SidebarRail({ activeView, onSelectView, changedCount }: Props) {
  const items: RailItem[] = [
    { id: "explorer", label: "Sources", icon: Coffee02Icon },
    {
      id: "source-control",
      label: "Branches",
      icon: GitBranchIcon,
      badge: changedCount,
    },
  ];

  return (
    <div
      style={{ height: SIDEBAR_RAIL_HEIGHT }}
      className="flex shrink-0 items-stretch gap-1 border-t border-white/8 bg-[#101319] px-1.5 py-1.5"
    >
      {items.map((item) => {
        const isActive = item.id === activeView;
        const showBadge = !!item.badge && item.badge > 0;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={isActive}
            onClick={() => onSelectView(item.id)}
            className={cn(
              "group relative flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-[10px] font-medium uppercase tracking-[0.16em] outline-none transition-[background-color,border-color,color] duration-100",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              isActive
                ? "border-primary/35 bg-white/[0.05] text-white"
                : "border-white/6 text-white/42 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/78",
            )}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={isActive ? 2 : 1.75}
              className="shrink-0 transition-[stroke-width] duration-100"
            />
            <span>{item.label}</span>
            {showBadge ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-white/10 bg-black/30 px-1 font-mono text-[9px] font-semibold leading-none tabular-nums text-white/66">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
