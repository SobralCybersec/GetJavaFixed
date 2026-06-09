import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/modules/i18n";
import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import { useChatStore, type AgentMeta } from "../store/chatStore";

type Props = {
  onClick: () => void;
};

export function AgentStatusPill({ onClick }: Props) {
  const { t } = useI18n();
  const meta = useChatStore((s) => s.agentMeta);

  if (meta.status === "awaiting-approval") return null;
  if (meta.status === "idle" && !meta.error) return null;

  const { tone, icon, label } = describe(meta, t("agentStatus.thinking"));

  return (
    <AnimatePresence mode="wait">
      <motion.button
        key={`${meta.status}:${label}`}
        type="button"
        onClick={onClick}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.12, ease: "easeOut" }}
        className={cn(
          "flex h-6 items-center gap-1.5 rounded-md border px-1.5 text-[11px] transition-colors",
          tone,
        )}
        title={t("agentStatus.openLog")}
      >
        {icon}
        <span className="max-w-[180px] truncate">{label}</span>
      </motion.button>
    </AnimatePresence>
  );
}

function describe(
  meta: AgentMeta,
  thinkingLabel: string,
): {
  tone: string;
  icon: React.ReactNode;
  label: string;
} {
  if (meta.status === "error") {
    return {
      tone:
        "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
      icon: (
        <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={1.75} />
      ),
      label: meta.error ?? "Error",
    };
  }

  return {
    tone:
      "border-border/60 bg-card text-muted-foreground hover:text-foreground",
    icon: <Spinner className="size-3" />,
    label: meta.step ?? thinkingLabel,
  };
}
