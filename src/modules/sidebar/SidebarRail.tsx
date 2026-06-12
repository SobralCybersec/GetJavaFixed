import { cn } from "@/lib/utils";
import { useI18n } from "@/modules/i18n";
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
  compact?: boolean;
};

export function SidebarRail({
  activeView,
  onSelectView,
  changedCount,
  compact = false,
}: Props) {
  const { t } = useI18n();
  const items: RailItem[] = [
    { id: "explorer", label: t("explorer.sources"), icon: Coffee02Icon },
    {
      id: "source-control",
      label: t("explorer.branches"),
      icon: GitBranchIcon,
      badge: changedCount,
    },
  ];

  return (
    <div
      style={{ height: SIDEBAR_RAIL_HEIGHT }}
      className={cn(
        "flex shrink-0 items-stretch gap-1",
        compact
          ? "rounded-md border border-[color:var(--border)] bg-black/25 px-1 py-1"
          : "border-t border-[color:var(--border)] bg-[#050506] px-1.5 py-1.5",
      )}
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
              "group relative flex cursor-pointer items-center justify-center gap-1.5 outline-none transition-[background-color,color] duration-75",
              "focus-visible:ring-2 focus-visible:ring-primary/40",
              compact
                ? "min-w-8 rounded-md px-2 text-[10px]"
                : "flex-1 text-[10px] font-medium uppercase tracking-[0.18em]",
              isActive
                ? "bg-primary/10 text-white"
                : "bg-black/20 text-white/42 hover:bg-white/[0.03] hover:text-white/78",
            )}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={14}
              strokeWidth={isActive ? 2 : 1.75}
              className="shrink-0 transition-[stroke-width] duration-100"
            />
            {!compact ? <span>{item.label}</span> : null}
            {showBadge ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center bg-black/50 px-1 font-mono text-[9px] font-semibold leading-none tabular-nums text-white/66">
                {item.badge! > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
