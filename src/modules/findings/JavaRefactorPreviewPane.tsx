import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefactorPreviewPanel } from "./RefactorPreviewPanel";
import type { UseRefactorGenerationResult } from "./lib/useRefactorGeneration";

type Props = {
  repoPath: string;
  filePath?: string | null;
  title?: string;
  description?: string;
  refactor: UseRefactorGenerationResult;
  onGenerate: () => void;
  onRetry: () => void;
  onClose: () => void;
};

export function JavaRefactorPreviewPane({
  repoPath,
  filePath,
  title,
  description,
  refactor,
  onGenerate,
  onRetry,
  onClose,
}: Props) {
  const label = filePath?.replace(/\\/g, "/").split("/").pop() ?? "Java file";

  return (
    <section className="java-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              JavaRf Preview
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {title ?? label}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {description ?? "Safe Java refactor preview with KISS, YAGNI, DRY, and Clean Code guidance."}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose} className="h-8 px-3 text-xs">
            Close
          </Button>
        </div>
        <p className="mt-2 truncate text-[11px] text-muted-foreground">
          {repoPath.replace(/\\/g, "/")}
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {refactor.status === "error" ? (
          <div className="space-y-3">
            <RefactorPreviewPanel
              status={refactor.status}
              result={refactor.result}
              error={refactor.error}
              onGenerate={onGenerate}
              onReset={refactor.reset}
            />
            <Button size="sm" onClick={onRetry} className="h-9 px-4 text-xs">
              Retry
            </Button>
          </div>
        ) : (
          <RefactorPreviewPanel
            status={refactor.status}
            result={refactor.result}
            error={refactor.error}
            onGenerate={onGenerate}
            onReset={refactor.reset}
            className={cn("h-full")}
          />
        )}
      </div>
    </section>
  );
}
