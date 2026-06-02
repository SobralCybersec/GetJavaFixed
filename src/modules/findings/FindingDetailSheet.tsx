import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { RefactorPreviewPanel } from "@/modules/findings/RefactorPreviewPanel";
import type { JavaSafetySnapshot, Phase1Finding } from "@/modules/findings/lib/useFindings";
import type { UseRefactorGenerationResult } from "@/modules/findings/lib/useRefactorGeneration";

type Props = {
  finding: Phase1Finding | null;
  safety: JavaSafetySnapshot | null;
  repoPath: string | null;
  refactor: UseRefactorGenerationResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FindingDetailSheet({
  finding,
  safety,
  repoPath,
  refactor,
  open,
  onOpenChange,
}: Props) {
  const canGenerate =
    finding !== null &&
    repoPath !== null &&
    finding.affectedFiles.length > 0 &&
    refactor.status === "idle";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-border/60 bg-card sm:max-w-[40rem]"
      >
        {finding ? (
          <>
            <SheetHeader className="gap-3 border-b border-border/50 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{finding.category}</Badge>
                <Badge variant="outline">Priority {finding.priority}</Badge>
              </div>
              <SheetTitle>{finding.title}</SheetTitle>
              <SheetDescription>{finding.rationale}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
              {/* Safety state */}
              {safety ? (
                <div
                  data-testid="safety-state"
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs",
                    safety.kind === "gitFirst"
                      ? "border-green-500/30 bg-green-500/8 text-green-700 dark:text-green-400"
                      : "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400",
                  )}
                >
                  <span className="font-semibold">
                    {safety.kind === "gitFirst" ? "Git-first safety" : "Backup-copy safety"}
                  </span>
                  {" — "}
                  {safety.message}
                </div>
              ) : null}

              {/* Principles */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Principles
                </h3>
                <div className="flex flex-wrap gap-2">
                  {finding.principles.map((p) => (
                    <Badge key={p} variant="outline">
                      {p}
                    </Badge>
                  ))}
                </div>
              </section>

              {/* Affected files */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Affected files
                </h3>
                {finding.affectedFiles.length > 0 ? (
                  <div className="space-y-1.5">
                    {finding.affectedFiles.map((path) => (
                      <div
                        key={path}
                        className="rounded-2xl border border-border/60 bg-background/70 px-3 py-2 font-mono text-xs text-foreground"
                      >
                        {path}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No individual files were highlighted for this finding.
                  </p>
                )}
              </section>

              {/* AI Refactor preview */}
              <section className="space-y-3" data-testid="diff-preview">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    AI Refactor preview
                  </h3>
                  {refactor.status === "idle" || refactor.status === "error" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!canGenerate}
                      onClick={() => {
                        if (finding && repoPath) {
                          void refactor.generate(finding, repoPath);
                        }
                      }}
                    >
                      Generate refactor
                    </Button>
                  ) : refactor.status === "ready" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={refactor.reset}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>

                {refactor.status === "idle" ? (
                  <p className="text-sm text-muted-foreground">
                    Click "Generate refactor" to get an AI-powered before/after preview.
                    Review-only — no files are changed until you accept and apply.
                  </p>
                ) : (
                  <>
                    <span className="sr-only">Diff preview</span>
                    <RefactorPreviewPanel
                      status={refactor.status}
                      result={refactor.result}
                      error={refactor.error}
                      onReset={refactor.reset}
                    />
                  </>
                )}
              </section>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
