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
import { useEffect, useMemo, useState } from "react";

import { PlanDiffReview } from "@/modules/ai/components/PlanDiffReview";
import {
  clearRefactorToolKey,
  getRefactorToolKey,
  setRefactorToolKey,
} from "@/modules/ai/lib/toolKeyring";
import { FindingDetailSheet } from "@/modules/findings/FindingDetailSheet";
import {
  buildFindingsAnalytics,
  formatImpactSummary,
  type FindingsAnalytics,
  type FindingsAnalyticsBucket,
} from "@/modules/findings/lib/analytics";
import { useFindings, type FindingsRepo } from "@/modules/findings/lib/useFindings";
import { useRefactorGeneration } from "@/modules/findings/lib/useRefactorGeneration";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";

type Props = {
  repo: FindingsRepo;
  selectedScanPath?: string | null;
  autoStartScanPath?: string | null;
  onClose?: () => void;
};

export function FindingsDashboard({
  repo,
  selectedScanPath,
  autoStartScanPath,
  onClose,
}: Props) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [exaApiKey, setExaApiKey] = useState<string | null>(null);
  const [context7ApiKey, setContext7ApiKey] = useState<string | null>(null);
  const [toolKeysLoaded, setToolKeysLoaded] = useState(false);

  const {
    panelState,
    progress,
    message,
    findings,
    selectedFinding,
    error,
    safety,
    activeScanPath,
    scopeLabel,
    filesScanned,
    entriesVisited,
    partial,
    partialReason,
    startAnalysis,
    selectFinding,
  } = useFindings(repo);

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
      refactorCustomInstructions: prefs.refactorCustomInstructions,
    },
    {
      exaEnabled: prefs.refactorMcpEnabled,
      exaApiKey: exaApiKey ?? undefined,
      context7Enabled: prefs.refactorMcpEnabled,
      context7Url: prefs.context7Url,
      context7ApiKey: context7ApiKey ?? undefined,
    },
  );
  const { reset: resetRefactor } = refactor;

  useEffect(() => {
    if (!autoStartScanPath) return;
    void startAnalysis(autoStartScanPath);
  }, [autoStartScanPath, startAnalysis]);

  const handleSelectFinding = (id: string) => {
    if (selectedFinding?.id !== id) resetRefactor();
    selectFinding(id);
  };

  const analytics = useMemo(() => buildFindingsAnalytics(findings), [findings]);
  const impactSummary = useMemo(() => formatImpactSummary(analytics), [analytics]);

  const canGenerateSelectedFinding =
    selectedFinding !== null &&
    selectedFinding.affectedFiles.length > 0 &&
    (refactor.status === "idle" || refactor.status === "error");

  return (
    <div className="java-grid flex h-full min-h-0 flex-col overflow-auto bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/60 bg-card/90 px-6 py-3 backdrop-blur">
        <div className="flex h-8 items-center gap-3">
          <img src="/java.png" alt="" className="size-7 object-contain" />
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
          <DashboardAnalyticsOverview
            analytics={analytics}
            progress={progress}
            impactSummary={impactSummary}
          />
          <Card size="sm" className="java-panel border border-border/60">
            <CardHeader className="gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Refactor findings queue</CardTitle>
                  <CardDescription>
                    Ranked hotspots first, plus direct file previews before any write path.
                  </CardDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{scopeLabel ?? "Whole repository"}</Badge>
                    {activeScanPath ? <span className="font-mono">{activeScanPath}</span> : null}
                    {filesScanned > 0 ? (
                      <span>{filesScanned} Java files scanned</span>
                    ) : null}
                    {entriesVisited > 0 ? (
                      <span>{entriesVisited} entries visited</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedScanPath && selectedScanPath !== repo.path ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void startAnalysis(selectedScanPath)}
                      disabled={panelState === "analyzing"}
                    >
                      Analyze selected folder
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onClick={() => void startAnalysis()}
                    disabled={panelState === "analyzing"}
                  >
                    Start full analysis
                  </Button>
                </div>
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

              {partial ? (
                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/8 px-4 py-4 text-sm text-amber-700 dark:text-amber-300">
                  {partialReason ?? "This scan hit a safety limit and may be incomplete."}
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
              <CardTitle>{selectedFinding?.title ?? "Finding details"}</CardTitle>
              <CardDescription>
                {selectedFinding?.rationale ??
                  "The top finding opens automatically here after analysis completes."}
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

              {selectedFinding ? (
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

const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

function DashboardAnalyticsOverview({
  analytics,
  progress,
  impactSummary,
}: {
  analytics: FindingsAnalytics;
  progress: number;
  impactSummary: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card size="sm" className="java-panel overflow-hidden border border-border/60">
        <CardHeader className="gap-2 border-b border-border/40 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]">
          <CardTitle>Refactor intelligence</CardTitle>
          <CardDescription>
            Visual breakdown of what the scan found and where the biggest likely wins are.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total findings"
              value={analytics.totalFindings}
              hint="Ranked hotspots ready for review"
            />
            <KpiCard
              label="Affected files"
              value={analytics.affectedFiles}
              hint="Unique files touched by findings"
            />
            <KpiCard
              label="Top issue mix"
              value={analytics.topCategory?.label ?? "None"}
              hint={
                analytics.topCategory
                  ? `${analytics.topCategory.count} findings in the largest category`
                  : "No findings yet"
              }
            />
            <KpiCard
              label="Estimated impact"
              value={`${analytics.impactLabel} · ${analytics.impactScore}`}
              hint="Heuristic estimate, not profiler output"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="rounded-3xl border border-border/60 bg-card/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Issue mix</p>
                  <p className="text-xs text-muted-foreground">
                    Pizza-style category view of the current findings queue.
                  </p>
                </div>
                <Badge variant="outline" data-testid="issue-mix-chart">
                  {analytics.categories.length} categories
                </Badge>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <DonutChart buckets={analytics.categories} />
                <div className="min-w-0 flex-1 space-y-2">
                  {analytics.categories.length > 0 ? (
                    analytics.categories.map((bucket, index) => (
                      <LegendRow
                        key={bucket.key}
                        bucket={bucket}
                        color={CHART_COLORS[index % CHART_COLORS.length]}
                        total={analytics.totalFindings}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Run analysis to populate the issue-mix chart.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border/60 bg-card/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Estimated gains</p>
                    <p className="text-xs text-muted-foreground">{impactSummary}</p>
                  </div>
                  <Badge variant="secondary">Heuristic</Badge>
                </div>
                <ImpactStrip buckets={analytics.categories} total={analytics.totalFindings} />
                <div className="mt-4 space-y-3">
                  {analytics.solutionMessages.map((entry) => (
                    <div
                      key={entry.category}
                      className="rounded-2xl border border-border/50 bg-background/55 px-3 py-2"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {entry.label}
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">{entry.message}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border/60 bg-card/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Performance outlook</p>
                    <p className="text-xs text-muted-foreground">
                      Likely runtime improvements from deterministic heuristics.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {analytics.performanceSummary.gainLabel}
                  </Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KpiCard
                    label="Runtime hotspots"
                    value={analytics.performanceSummary.hotspots}
                    hint="Findings tied to allocation or repeated work"
                    compact
                  />
                  <KpiCard
                    label="Scan progress"
                    value={`${progress}%`}
                    hint="Latest analysis progress snapshot"
                    compact
                  />
                </div>
                <div className="mt-4 space-y-2">
                  {analytics.performanceSummary.triggeredBy.length > 0 ? (
                    analytics.performanceSummary.triggeredBy.map((message) => (
                      <p key={message} className="text-sm text-muted-foreground">
                        {message}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No clear performance-specific hotspots detected yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card size="sm" className="java-panel border border-border/60">
        <CardHeader className="gap-2">
          <CardTitle>Hotspot map</CardTitle>
          <CardDescription>
            Most repeated categories, triggered principles, and affected files.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5" data-testid="hotspot-map">
          <MetricBars
            title="Category pressure"
            buckets={analytics.categories}
            empty="No category mix yet."
          />
          <MetricBars
            title="Principles triggered most"
            buckets={analytics.principles}
            empty="No principle hints yet."
          />
          <MetricBars
            title="Top affected files"
            buckets={analytics.hotspots}
            empty="No file hotspots yet."
            monospaceLabels
          />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  compact = false,
}: {
  label: string;
  value: string | number;
  hint: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-background/70 px-4 py-3",
        compact && "px-3 py-2.5",
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-2 text-2xl font-semibold", compact && "text-xl")}>{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function DonutChart({ buckets }: { buckets: FindingsAnalyticsBucket[] }) {
  const total = Math.max(
    1,
    buckets.reduce((sum, bucket) => sum + bucket.count, 0),
  );
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="relative flex h-44 w-44 items-center justify-center self-center">
      <svg viewBox="0 0 140 140" className="h-40 w-40 -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="color-mix(in oklab, var(--muted) 80%, transparent)"
          strokeWidth="18"
        />
        {buckets.map((bucket, index) => {
          const length = (bucket.count / total) * circumference;
          const segment = (
            <circle
              key={bucket.key}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={CHART_COLORS[index % CHART_COLORS.length]}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return segment;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-semibold">{buckets.reduce((sum, bucket) => sum + bucket.count, 0)}</div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Findings
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  bucket,
  color,
  total,
}: {
  bucket: FindingsAnalyticsBucket;
  color: string;
  total: number;
}) {
  const percent = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>{bucket.label}</span>
          <span className="text-muted-foreground">{bucket.count}</span>
        </div>
        <div className="text-xs text-muted-foreground">{percent}% of current queue</div>
      </div>
    </div>
  );
}

function ImpactStrip({
  buckets,
  total,
}: {
  buckets: FindingsAnalyticsBucket[];
  total: number;
}) {
  return (
    <div
      className="flex h-3 overflow-hidden rounded-full bg-muted/60"
      data-testid="impact-strip"
    >
      {buckets.length > 0 ? (
        buckets.map((bucket, index) => (
          <div
            key={bucket.key}
            style={{
              width: `${total > 0 ? (bucket.count / total) * 100 : 0}%`,
              backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
            }}
          />
        ))
      ) : (
        <div className="w-full bg-muted/50" />
      )}
    </div>
  );
}

function MetricBars({
  title,
  buckets,
  empty,
  monospaceLabels = false,
}: {
  title: string;
  buckets: FindingsAnalyticsBucket[];
  empty: string;
  monospaceLabels?: boolean;
}) {
  const max = buckets[0]?.count ?? 1;
  return (
    <section className="space-y-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      {buckets.length > 0 ? (
        buckets.map((bucket, index) => (
          <div key={`${title}-${bucket.key}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={cn("truncate", monospaceLabels && "font-mono text-[12px]")}>
                {bucket.label}
              </span>
              <span className="text-muted-foreground">{bucket.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted/50">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(bucket.count / max) * 100}%`,
                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}


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
          Refactor preview can enrich reasoning with Exa live search plus Context7 version-aware docs.
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {mcpEnabled
            ? "MCP enrichment enabled for refactor previews. Exa tools: web_search_exa + web_fetch_exa."
            : "MCP enrichment disabled in Settings > Models."}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Exa</p>
              <p className="text-xs text-muted-foreground">Optional live web fetch/search for refactor examples. Session target matches Exa MCP server tools and the npm package line is currently 3.2.1.</p>
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
