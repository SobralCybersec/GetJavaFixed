import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { AiDiffPane } from "@/modules/editor/AiDiffPane";
import { newQueuedEditId, usePlanStore } from "@/modules/ai/store/planStore";
import { useEffect, useState } from "react";
import type { RefactorResult, RefactorStatus } from "./lib/useRefactorGeneration";

type Props = {
  status: RefactorStatus;
  result: RefactorResult | null;
  error: string | null;
  onReset: () => void;
  className?: string;
};

const LARGE_DIFF_PREVIEW_THRESHOLD = 160_000;

export function RefactorPreviewPanel({ status, result, error, onReset, className }: Props) {
  const enqueue = usePlanStore((s) => s.enqueue);
  const [showLargeDiff, setShowLargeDiff] = useState(false);

  useEffect(() => {
    setShowLargeDiff(false);
  }, [result?.filePath, status]);

  const handleAccept = () => {
    if (!result) return;
    enqueue({
      id: newQueuedEditId(),
      kind: "write_file",
      path: result.filePath,
      originalContent: result.originalContent,
      proposedContent: result.proposedContent,
      isNewFile: false,
      description: "AI refactor - accepted from findings review",
    });
    onReset();
  };

  if (status === "idle") return null;

  if (status === "generating") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border border-border/60 bg-background/70 px-4 py-6 text-sm text-muted-foreground",
          className,
        )}
      >
        <Spinner className="size-4 shrink-0" />
        Generating refactor preview...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "space-y-3 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-4",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button size="sm" variant="ghost" onClick={onReset} className="h-7 text-xs">
          Dismiss
        </Button>
      </div>
    );
  }

  if (status === "ready" && result) {
    const relPath = result.filePath.replace(/\\/g, "/").split("/").pop() ?? result.filePath;
    const isLargeDiff =
      result.originalContent.length >= LARGE_DIFF_PREVIEW_THRESHOLD ||
      result.proposedContent.length >= LARGE_DIFF_PREVIEW_THRESHOLD;

    if (isLargeDiff && !showLargeDiff) {
      return (
        <div
          className={cn(
            "flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/50 p-4",
            className,
          )}
        >
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{relPath}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This refactor preview is large, so JavaRf is waiting to mount the full diff until you
              ask for it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowLargeDiff(true)}
              className="h-8 px-3 text-xs"
            >
              Show full diff
            </Button>
            <Button size="sm" variant="ghost" onClick={onReset} className="h-8 px-3 text-xs">
              Dismiss
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Accepting still queues the edit for review only. No files are written until you apply
            the plan.
          </p>
        </div>
      );
    }

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="min-h-0 flex-1">
          <AiDiffPane
            path={relPath}
            originalContent={result.originalContent}
            proposedContent={result.proposedContent}
            status="pending"
            isNewFile={false}
            onAccept={handleAccept}
            onReject={onReset}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Accept queues the change for review in the plan panel. No files are written until you
          apply the plan.
        </p>
      </div>
    );
  }

  return null;
}
