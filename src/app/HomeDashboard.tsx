import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GridViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type ReactNode } from "react";

type Props = {
  onOpenWorkspace: () => void;
  onOpenJavaRefactor: () => void;
  hasModelAccess: boolean;
};

const KPI_CARDS = [
  { label: "Explorer", value: "Workspace gated", hint: "File tree stays locked until a repository is mounted." },
  { label: "Models", value: "OpenAI-compatible", hint: "Provider presets and local endpoints share one execution path." },
  { label: "Rules", value: "Editable markdown", hint: "Refactor rules remain readable, versioned, and directly tunable." },
];

export function HomeDashboard({
  onOpenWorkspace,
  onOpenJavaRefactor,
  hasModelAccess,
}: Props) {
  const [activeTab, setActiveTab] = useState("launch");

  return (
    <div className="javarf-ops-dashboard relative flex h-full min-h-0 flex-col overflow-auto bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_28%),radial-gradient(circle_at_86%_8%,color-mix(in_oklab,var(--chart-2)_10%,transparent),transparent_24%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_80%,transparent),transparent_72%)]"
      />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-5 px-4 py-5 sm:px-5 md:gap-6 lg:px-7 lg:py-7">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList className="javarf-terminal-tabs h-auto w-full justify-start overflow-x-auto border border-border/80 bg-card/95 p-1">
            <TabsTrigger className="javarf-terminal-tab" value="launch">Launch desk</TabsTrigger>
            <TabsTrigger className="javarf-terminal-tab" value="readiness">Readiness</TabsTrigger>
            <TabsTrigger className="javarf-terminal-tab" value="workflow">Workflow</TabsTrigger>
          </TabsList>

          <TabsContent value="launch" className="mt-0 flex-1 space-y-4">
            <DashboardWidget title="Launch desk">
              <section className="javarf-terminal-frame ops-card ops-hero border border-border/70 p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 max-w-3xl space-y-4">
              <DashboardEyebrow label="Refactoring Java" value="CCG DASHBOARD" />
              <div className="space-y-3">
                <h1 className="font-heading text-balance text-4xl font-semibold uppercase leading-[0.88] tracking-[0.08em] text-foreground sm:text-5xl xl:text-6xl">
                  Terminal-ready refactor control surface.
                </h1>
                <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                  Mount the repository, verify model access, and move into analysis through a denser
                  terminal-like workflow instead of generic landing cards.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
              <Button size="lg" className="min-w-[170px] border border-primary/40 bg-primary/10 px-6 font-mono uppercase tracking-[0.16em]" onClick={onOpenWorkspace}>
                Open workspace
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-[170px] border border-border/80 bg-background/70 px-6 font-mono uppercase tracking-[0.16em]"
                onClick={onOpenJavaRefactor}
                disabled={!hasModelAccess}
                title={!hasModelAccess ? "Connect a model in Settings to unlock Java refactor" : undefined}
              >
                Java refactor
              </Button>
            </div>
          </div>
              </section>
            </DashboardWidget>
          </TabsContent>

          <TabsContent value="readiness" className="mt-0 flex-1">
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {KPI_CARDS.map((card) => (
                  <DashboardWidget key={card.label} title={card.label}>
                    <Card size="sm" className="javarf-terminal-frame java-panel ops-card border-border/70">
                  <CardContent className="min-h-[132px] space-y-2 p-5">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                      {card.label}
                    </div>
                    <div className="text-balance font-heading text-3xl font-semibold uppercase leading-tight tracking-[0.06em]">{card.value}</div>
                    <p className="text-pretty text-sm leading-5 text-muted-foreground">{card.hint}</p>
                  </CardContent>
                </Card>
                  </DashboardWidget>
                ))}
              </div>

              <DashboardWidget title="Ready state">
                <Card size="sm" className="javarf-terminal-frame java-panel ops-card h-full border-border/70">
                  <CardHeader className="gap-2 border-b border-border/60 bg-background/55">
                    <CardTitle>Next action</CardTitle>
                    <CardDescription>
                      {hasModelAccess
                        ? "Models are ready. Open a workspace and start the first analysis."
                        : "Connect a model in Settings, then open a workspace for refactor previews."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="ops-inset-panel border border-border/60 bg-background/65 p-4 text-sm leading-6 text-muted-foreground">
                      This home screen stays intentionally lean: workspace entry, model readiness, and
                      the shortest path into analysis.
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="ops-inset-panel border border-border/60 bg-card/70 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Motion
                        </div>
                        <p className="mt-2 text-pretty text-sm leading-5 text-foreground/90">
                          Short transitions only where they explain state changes. Reduced motion stays respected.
                        </p>
                      </div>
                      <div className="ops-inset-panel border border-border/60 bg-card/70 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          Rule base
                        </div>
                        <p className="mt-2 text-pretty text-sm leading-5 text-foreground/90">
                          Markdown rules stay editable, inspectable, and tied to refactor discovery.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DashboardWidget>
            </section>
          </TabsContent>

          <TabsContent value="workflow" className="mt-0 flex-1">
            <DashboardWidget title="Workflow">
              <Card size="sm" className="javarf-terminal-frame java-panel ops-card border-border/70">
                <CardHeader className="border-b border-border/60 bg-background/55">
                  <CardTitle>Product workflow</CardTitle>
                  <CardDescription>
                    Organize the app by phases instead of stacking every state in one surface.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 lg:grid-cols-3">
                  <div className="javarf-terminal-panel ops-inset-panel border border-border/70 bg-background/70 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">01 Intake</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Open workspace, confirm repo context, keep empty states useful.</p>
                  </div>
                  <div className="javarf-terminal-panel ops-inset-panel border border-border/70 bg-background/70 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">02 Analysis</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Run scan, inspect hotspots, and keep details on a full-width surface.</p>
                  </div>
                  <div className="javarf-terminal-panel ops-inset-panel border border-border/70 bg-background/70 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">03 Refactor</div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Review diffs, queue edits, and apply only after explicit confirmation.</p>
                  </div>
                </CardContent>
              </Card>
            </DashboardWidget>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DashboardWidget({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="ops-widget min-w-0">
      <div className="ops-widget-handle mb-2 flex h-8 max-w-full items-center gap-1.5 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <HugeiconsIcon icon={GridViewIcon} size={13} strokeWidth={1.8} />
        <span className="truncate">{title}</span>
      </div>
      {children}
    </section>
  );
}

function DashboardEyebrow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
      <span className="border border-border/70 bg-background/65 px-2 py-1 text-primary">{label}</span>
      <span className="border border-border/70 bg-background/45 px-2 py-1">{value}</span>
    </div>
  );
}
