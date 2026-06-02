import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

import { PlanDiffReview } from "@/modules/ai/components/PlanDiffReview";
import {
  clearRefactorToolKey,
  getRefactorToolKey,
  setRefactorToolKey,
} from "@/modules/ai/lib/toolKeyring";
import { FindingDetailSheet } from "@/modules/findings/FindingDetailSheet";
import { useFindings, type FindingsRepo } from "@/modules/findings/lib/useFindings";
import { useRefactorGeneration } from "@/modules/findings/lib/useRefactorGeneration";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";

type Props = {
  repo: FindingsRepo;
  initialFilePath?: string | null;
  onClose?: () => void;
};

export function FindingsDashboard({ repo, initialFilePath = null, onClose }: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [exaApiKey, setExaApiKey] = useState<string | null>(null);
  const [context7ApiKey, setContext7ApiKey] = useState<string | null>(null);
  const [toolKeysLoaded, setToolKeysLoaded] = useState(false);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(initialFilePath);

  const {
    panelState,
    progress,
    message,
    findings,
    selectedFinding,
    error,
    safety,
    startAnalysis,
    selectFinding,
  } = useFindings(repo);

  // Model config from existing settings infrastructure
  const selectedModelId = useChatStore((s) => s.selectedModelId);
  const apiKeys = useChatStore((s) => s.apiKeys);
  const prefs = usePreferencesStore();

  useEffect(() => {
    let alive = true;
    void Promise.all([getRefactorToolKey("exa"), getRefactorToolKey("context7")]).then(
      ([exa, context7]) => {
        if (!alive) return;
        setExaApiKey(exa);
        setContext7ApiKey(context7);
        setToolKeysLoaded(true);
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  const refactor = useRefactorGeneration(
    {
      modelId: selectedModelId,
      keys: apiKeys as Record<string, string>,
      lmstudioBaseURL: prefs.lmstudioBaseURL,
      lmstudioModelId: prefs.lmstudioModelId,
      mlxBaseURL: prefs.mlxBaseURL,
      mlxModelId: prefs.mlxModelId,
      ollamaBaseURL: prefs.ollamaBaseURL,
      ollamaModelId: prefs.ollamaModelId,
      openaiCompatibleBaseURL: prefs.openaiCompatibleBaseURL,
      openaiCompatibleModelId: prefs.openaiCompatibleModelId,
      openrouterModelId: prefs.openrouterModelId,
    },
    {
      exaEnabled: prefs.refactorMcpEnabled,
      exaApiKey: exaApiKey ?? undefined,
      context7Enabled: prefs.refactorMcpEnabled,
      context7Url: prefs.context7Url,
      context7ApiKey: context7ApiKey ?? undefined,
    },
  );
  const { generateForFile, reset: resetRefactor } = refactor;

  // Reset refactor state when a different finding is selected
  const handleSelectFinding = (id: string) => {
    if (selectedFinding?.id !== id) resetRefactor();
    setActiveFilePath(null);
    selectFinding(id);
  };

  useEffect(() => {
    if (!initialFilePath) return;
    setActiveFilePath(initialFilePath);
    resetRefactor();
    void generateForFile(initialFilePath, repo.path);
  }, [generateForFile, initialFilePath, repo.path, resetRefactor]);

  const canGenerateSelectedFinding =
    selectedFinding !== null &&
    selectedFinding.affectedFiles.length > 0 &&
    (refactor.status === "idle" || refactor.status === "error");

  const canGenerateActiveFile =
    activeFilePath !== null &&
    (refactor.status === "idle" || refactor.status === "error");

  return (
    <div className="java-grid flex h-full min-h-0 flex-col overflow-auto bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/90 px-6 py-3 backdrop-blur">
        <div className="flex h-8 items-center gap-3">
          <img src="/java-assistant-mark.svg" alt="" className="size-7 rounded-xl" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Java Refactor Dashboard</div>
            <div className="truncate text-xs text-muted-foreground">{repo.readiness.repoName}</div>
          </div>
          <Badge variant="secondary" className="ml-auto bg-primary/10 text-primary">
            {repo.readiness.projectType}
          </Badge>
          {onClose ? (
            <Button size="sm" variant="ghost" onClick={onClose}>
              Open workspace
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 py-8 lg:flex-row lg:items-start">
        {/* Left: findings queue */}
        <div className="min-w-0 flex-1 space-y-4">
          <McpResearchCard
            exaApiKey={exaApiKey}
            context7ApiKey={context7ApiKey}
            toolKeysLoaded={toolKeysLoaded}
            context7Url={prefs.context7Url}
            mcpEnabled={prefs.refactorMcpEnabled}
            onExaKeySaved={setExaApiKey}
            onContext7KeySaved={setContext7ApiKey}
          />
          <Card size="sm" className="java-panel border border-border/60">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Refactor findings queue</CardTitle>
                  <CardDescription>
                    Ranked hotspots first, plus direct file previews before any write path.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => void startAnalysis()}
                  disabled={panelState === "analyzing"}
                >
                  Start full analysis
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(panelState === "analyzing" || panelState === "ready") && (
                <div className="rounded-3xl border border-primary/20 bg-primary/6 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{message}</p>
                    <span className="text-xs text-muted-foreground">watch-only</span>
                  </div>
                  <Progress value={progress} className="mt-3" />
                </div>
              )}

              {panelState === "error" && error ? (
                <div className="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-muted-foreground">
                  {error}
                </div>
              ) : null}

              {panelState === "empty" ? (
                <div className="rounded-3xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                  Start full analysis to build the ranked refactor findings queue.
                </div>
              ) : null}

              {findings.length > 0 ? (
                <ScrollArea className="h-[420px] pr-1">
                  <div role="list" className="space-y-2">
                    {findings.map((finding) => {
                      const active = selectedFinding?.id === finding.id;
                      return (
                        <button
                          key={finding.id}
                          type="button"
                          role="listitem"
                          onClick={() => {
                            handleSelectFinding(finding.id);
                            setDetailOpen(window.innerWidth < 1024);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-sm border px-4 py-3 text-left transition-colors",
                            active
                              ? "border-primary/40 bg-primary/8 shadow-[0_12px_30px_color-mix(in_oklab,var(--primary)_15%,transparent)]"
                              : "border-border/60 bg-card/80 hover:bg-muted/30",
                          )}
                        >
                          <div className="mt-0.5 h-10 w-1.5 bg-primary/80" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">{finding.title}</p>
                              <Badge variant="secondary">{finding.category}</Badge>
                            </div>
                            <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {finding.rationale}
                            </p>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {finding.affectedFiles.length} affected
                              {finding.affectedFiles.length === 1 ? " file" : " files"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Right: detail panel (desktop) */}
        <div className="hidden w-full max-w-[36rem] lg:block">
          <Card size="sm" className="java-panel border border-border/60">
            <CardHeader>
              <CardTitle>
                {activeFilePath
                  ? activeFilePath.replace(/\\/g, "/").split("/").pop()
                  : (selectedFinding?.title ?? "Finding details")}
              </CardTitle>
              <CardDescription>
                {activeFilePath
                  ? "Automatic Java file preview. Review the suggested refactor before queuing it for apply."
                  : (selectedFinding?.rationale ??
                    "The top finding opens automatically here after analysis completes.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Safety badge */}
              {safety ? (
                <div
                  data-testid="safety-state"
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs",
                    safety.kind === "gitFirst"
                      ? "border-green-500/30 bg-green-500/8 text-green-700 dark:text-green-400"
                      : safety.kind === "backupFallback"
                        ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-400"
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

              {activeFilePath ? (
                <>
                  <div className="rounded-sm border border-border/60 bg-background px-3 py-2 font-mono text-xs">
                    {activeFilePath}
                  </div>
                  <div className="space-y-3" data-testid="diff-preview">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        AI Refactor preview
                      </span>
                      {canGenerateActiveFile ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => void refactor.generateForFile(activeFilePath, repo.path)}
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
                        Clicking a Java file opens a preview here automatically. No files are changed until you accept and apply.
                      </p>
                    ) : (
                      <div className="h-[360px] min-h-0">
                        <RefactorPreviewInline
                          status={refactor.status}
                          result={refactor.result}
                          error={refactor.error}
                          onReset={refactor.reset}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : selectedFinding ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {selectedFinding.principles.map((p) => (
                      <Badge key={p} variant="outline">
                        {p}
                      </Badge>
                    ))}
                  </div>

                  {/* Affected files */}
                  <div className="space-y-1.5">
                    {selectedFinding.affectedFiles.length > 0 ? (
                      selectedFinding.affectedFiles.map((path) => (
                        <div
                          key={path}
                          className="rounded-2xl border border-border/60 bg-background/80 px-3 py-2 font-mono text-xs"
                        >
                          {path}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No individual files were highlighted for this finding.
                      </p>
                    )}
                  </div>

                  {/* Generate refactor button + preview */}
                  <div className="space-y-3" data-testid="diff-preview">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        AI Refactor preview
                      </span>
                      {canGenerateSelectedFinding && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={selectedFinding.affectedFiles.length === 0}
                          onClick={() => void refactor.generate(selectedFinding, repo.path)}
                        >
                          Generate refactor
                        </Button>
                      )}
                      {refactor.status === "ready" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={refactor.reset}
                        >
                          Clear
                        </Button>
                      )}
                    </div>

                    {refactor.status === "idle" ? (
                      <p className="text-sm text-muted-foreground">
                        Click "Generate refactor" to get an AI-powered before/after preview.
                        No files are changed until you accept and apply.
                      </p>
                    ) : (
                      <div className="h-[360px] min-h-0">
                        {/* Lazy import to avoid loading CodeMirror until needed */}
                        <RefactorPreviewInline
                          status={refactor.status}
                          result={refactor.result}
                          error={refactor.error}
                          onReset={refactor.reset}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run analysis or click a Java file to populate the right-side detail surface.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile sheet */}
      <FindingDetailSheet
        finding={selectedFinding}
        safety={safety}
        repoPath={repo.path}
        refactor={refactor}
        open={detailOpen && selectedFinding !== null}
        onOpenChange={(open) => setDetailOpen(open)}
      />
      <PlanDiffReview />
    </div>
  );
}

// Inline wrapper to avoid circular import with RefactorPreviewPanel
import { RefactorPreviewPanel } from "@/modules/findings/RefactorPreviewPanel";
import type { RefactorResult, RefactorStatus } from "@/modules/findings/lib/useRefactorGeneration";

function RefactorPreviewInline({
  status,
  result,
  error,
  onReset,
}: {
  status: RefactorStatus;
  result: RefactorResult | null;
  error: string | null;
  onReset: () => void;
}) {
  return (
    <RefactorPreviewPanel
      status={status}
      result={result}
      error={error}
      onReset={onReset}
      className="h-full"
    />
  );
}

function maskKey(value: string): string {
  if (value.length <= 8) return "Saved";
  return `${value.slice(0, 4)}${"•".repeat(8)}${value.slice(-4)}`;
}

function McpResearchCard({
  exaApiKey,
  context7ApiKey,
  toolKeysLoaded,
  context7Url,
  mcpEnabled,
  onExaKeySaved,
  onContext7KeySaved,
}: {
  exaApiKey: string | null;
  context7ApiKey: string | null;
  toolKeysLoaded: boolean;
  context7Url: string;
  mcpEnabled: boolean;
  onExaKeySaved: (value: string | null) => void;
  onContext7KeySaved: (value: string | null) => void;
}) {
  const [exaDraft, setExaDraft] = useState("");
  const [context7Draft, setContext7Draft] = useState("");

  return (
    <Card size="sm" className="java-panel border border-border/60">
      <CardHeader className="gap-2">
        <CardTitle>Research MCPs</CardTitle>
        <CardDescription>
          Refactor preview can enrich reasoning with Exa web search and Context7 docs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {mcpEnabled
            ? "MCP enrichment enabled for refactor previews."
            : "MCP enrichment disabled in Settings > Models."}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Exa</p>
              <p className="text-xs text-muted-foreground">Optional web/code search for live refactor examples.</p>
            </div>
            {toolKeysLoaded && exaApiKey ? <Badge variant="secondary">{maskKey(exaApiKey)}</Badge> : null}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={exaDraft}
              onChange={(event) => setExaDraft(event.target.value)}
              placeholder="Paste Exa API key"
              className="h-9 flex-1 rounded-2xl border border-border/60 bg-background px-3 text-sm outline-none"
            />
            <Button
              size="sm"
              disabled={!exaDraft.trim()}
              onClick={async () => {
                const value = exaDraft.trim();
                await setRefactorToolKey("exa", value);
                onExaKeySaved(value);
                setExaDraft("");
              }}
            >
              Save
            </Button>
            {exaApiKey ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await clearRefactorToolKey("exa");
                  onExaKeySaved(null);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Context7</p>
              <p className="text-xs text-muted-foreground">Version-aware docs endpoint: {context7Url}</p>
            </div>
            {toolKeysLoaded && context7ApiKey ? (
              <Badge variant="secondary">{maskKey(context7ApiKey)}</Badge>
            ) : (
              <Badge variant="outline">Optional key</Badge>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={context7Draft}
              onChange={(event) => setContext7Draft(event.target.value)}
              placeholder="Paste Context7 API key"
              className="h-9 flex-1 rounded-2xl border border-border/60 bg-background px-3 text-sm outline-none"
            />
            <Button
              size="sm"
              disabled={!context7Draft.trim()}
              onClick={async () => {
                const value = context7Draft.trim();
                await setRefactorToolKey("context7", value);
                onContext7KeySaved(value);
                setContext7Draft("");
              }}
            >
              Save
            </Button>
            {context7ApiKey ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await clearRefactorToolKey("context7");
                  onContext7KeySaved(null);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
