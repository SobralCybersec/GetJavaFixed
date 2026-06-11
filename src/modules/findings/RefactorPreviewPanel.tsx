import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { native } from "@/modules/ai/lib/native";
import { AiDiffPane } from "@/modules/editor/AiDiffPane";
import { newQueuedEditId, usePlanStore } from "@/modules/ai/store/planStore";
import { useEffect, useRef, useState } from "react";
import type { RefactorResult, RefactorStatus } from "./lib/useRefactorGeneration";

type Props = {
  status: RefactorStatus;
  result: RefactorResult | null;
  error: string | null;
  onGenerate: () => void;
  onReset: () => void;
  className?: string;
};

const LARGE_DIFF_PREVIEW_THRESHOLD = 160_000;
const AUTO_APPLY_KEY = "javarf.refactor.autoApply";
const AUTO_COMMIT_KEY = "javarf.refactor.autoCommit";
const AUTO_PUSH_KEY = "javarf.refactor.autoPush";

export function RefactorPreviewPanel({
  status,
  result,
  error,
  onGenerate,
  onReset,
  className,
}: Props) {
  const enqueue = usePlanStore((s) => s.enqueue);
  const [showLargeDiff, setShowLargeDiff] = useState(false);
  const [autoApply, setAutoApply] = usePersistentBoolean(AUTO_APPLY_KEY, false);
  const [autoCommit, setAutoCommitRaw] = usePersistentBoolean(AUTO_COMMIT_KEY, false);
  const [autoPush, setAutoPushRaw] = usePersistentBoolean(AUTO_PUSH_KEY, false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const autoHandledRef = useRef<string | null>(null);

  const setAutoCommit = (next: boolean) => {
    setAutoCommitRaw(next);
    if (!next) setAutoPushRaw(false);
  };
  const setAutoPush = (next: boolean) => {
    if (next) setAutoCommitRaw(true);
    setAutoPushRaw(next);
  };

  useEffect(() => {
    setShowLargeDiff(false);
    setAutoStatus(null);
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
      description: "AI refactor - accepted from preview",
    });
    onReset();
  };

  useEffect(() => {
    if (!autoApply || status !== "ready" || !result) return;
    const resultKey = `${result.filePath}:${result.proposedContent.length}:${result.proposedContent.slice(0, 64)}`;
    if (autoHandledRef.current === resultKey) return;
    autoHandledRef.current = resultKey;

    const run = async () => {
      setAutoStatus("Auto-applying preview...");
      await native.writeFile(result.filePath, result.proposedContent);

      if (autoCommit) {
        setAutoStatus(autoPush ? "Auto-committing and pushing..." : "Auto-committing...");
        const repo = await native.gitResolveRepo(result.filePath);
        if (!repo) {
          setAutoStatus("Auto-apply complete. No git repository found for commit.");
          onReset();
          return;
        }
        await native.gitStage(repo.repoRoot, [result.filePath]);
        await native.gitCommit(repo.repoRoot, "refactor: apply AI preview");
        if (autoPush) await native.gitPush(repo.repoRoot);
      }

      setAutoStatus(
        autoCommit
          ? autoPush
            ? "Auto-apply, commit, and push complete."
            : "Auto-apply and commit complete."
          : "Auto-apply complete.",
      );
      onReset();
    };

    void run().catch((cause) => {
      setAutoStatus(cause instanceof Error ? cause.message : String(cause));
    });
  }, [autoApply, autoCommit, autoPush, onReset, result, status]);

  if (status === "idle") {
    return (
      <div
        className={cn(
          "flex h-full flex-col justify-center gap-4 rounded-2xl border border-border/60 bg-card/40 p-5",
          className,
        )}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Refactor preview is ready to generate</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The agent will wait until you start it, then build a safe diff for review.
          </p>
        </div>
        <AutomationToggles
          autoApply={autoApply}
          autoCommit={autoCommit}
          autoPush={autoPush}
          onAutoApply={setAutoApply}
          onAutoCommit={setAutoCommit}
          onAutoPush={setAutoPush}
          status={autoStatus}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onGenerate} className="h-8 px-3 text-xs">
            Generate refactor
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset} className="h-8 px-3 text-xs">
            Clear
          </Button>
        </div>
      </div>
    );
  }

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
          <AutomationToggles
            autoApply={autoApply}
            autoCommit={autoCommit}
            autoPush={autoPush}
            onAutoApply={setAutoApply}
            onAutoCommit={setAutoCommit}
            onAutoPush={setAutoPush}
            status={autoStatus}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{relPath}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This refactor preview is large, so the app is waiting to mount the full diff until you
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
        <AutomationToggles
          autoApply={autoApply}
          autoCommit={autoCommit}
          autoPush={autoPush}
          onAutoApply={setAutoApply}
          onAutoCommit={setAutoCommit}
          onAutoPush={setAutoPush}
          status={autoStatus}
        />
        <RefactorReport report={result.reportMarkdown} />
        <p className="text-[11px] text-muted-foreground">
          Accept queues the change for review in the plan panel. No files are written until you
          apply the plan.
        </p>
      </div>
    );
  }

  return null;
}

function usePersistentBoolean(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? fallback : stored === "true";
    } catch {
      return fallback;
    }
  });

  const setPersistedValue = (next: boolean) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      
    }
  };

  return [value, setPersistedValue] as const;
}

function AutomationToggles({
  autoApply,
  autoCommit,
  autoPush,
  onAutoApply,
  onAutoCommit,
  onAutoPush,
  status,
}: {
  autoApply: boolean;
  autoCommit: boolean;
  autoPush: boolean;
  onAutoApply: (next: boolean) => void;
  onAutoCommit: (next: boolean) => void;
  onAutoPush: (next: boolean) => void;
  status: string | null;
}) {
  return (
    <div className="border border-border/60 bg-background/65 p-3">
      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <ToggleRow label="Auto-apply" checked={autoApply} onCheckedChange={onAutoApply} />
        <ToggleRow
          label="Auto-commit"
          checked={autoCommit}
          disabled={!autoApply}
          onCheckedChange={onAutoCommit}
        />
        <ToggleRow
          label="Auto-push"
          checked={autoPush}
          disabled={!autoApply || !autoCommit}
          onCheckedChange={onAutoPush}
        />
      </div>
      {status ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">{status}</p>
      ) : null}
    </div>
  );
}

function ToggleRow({
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
    <label className="flex items-center justify-between gap-3 border border-border/50 bg-card/40 px-2 py-2 font-mono uppercase tracking-[0.12em] text-muted-foreground">
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

function RefactorReport({ report }: { report: string }) {
  return (
    <details className="border border-border/60 bg-background/65 p-3 text-xs text-muted-foreground">
      <summary className="cursor-pointer font-mono uppercase tracking-[0.14em] text-foreground">
        Refactor report
      </summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
        {report}
      </pre>
    </details>
  );
}
