import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/modules/i18n";
import {
  DASHBOARD_CHART_COLORS,
  chartAnimation,
  getDashboardChartTheme,
} from "@/modules/dashboard/chartSetup";
import { GridViewIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ChartData, ChartOptions } from "chart.js";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";
import { Bar, Line, Radar } from "react-chartjs-2";
import {
  ease,
  fadeUp,
  hoverGlow,
  scaleIn,
  staggerContainer,
  tabFade,
} from "@/modules/dashboard/animations";

type Props = {
  onOpenWorkspace: () => void;
  onOpenJavaRefactor: () => void;
  hasModelAccess: boolean;
};

export function HomeDashboard({
  onOpenWorkspace,
  onOpenJavaRefactor,
  hasModelAccess,
}: Props) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("launch");
  const reduced = useReducedMotion();

  const launchFlowData = useMemo<ChartData<"line">>(
    () => ({
      labels: ["Mount", "Index", "Scan", "Preview", "Apply"],
      datasets: [
        {
          label: "Operational confidence",
          data: hasModelAccess ? [18, 46, 71, 88, 94] : [18, 38, 52, 48, 36],
          borderColor: DASHBOARD_CHART_COLORS[0],
          backgroundColor: "rgba(34, 211, 238, 0.16)",
          borderWidth: 2,
          fill: true,
          pointBackgroundColor: DASHBOARD_CHART_COLORS[1],
          pointBorderColor: "#0f172a",
          pointHoverRadius: 6,
          pointRadius: 3,
          tension: 0.42,
        },
      ],
    }),
    [hasModelAccess],
  );

  const readinessData = useMemo<ChartData<"bar">>(
    () => ({
      labels: ["Workspace", "Model", "MCP", "Rules", "Preview"],
      datasets: [
        {
          label: "Ready",
          data: hasModelAccess ? [64, 92, 76, 88, 84] : [64, 28, 54, 88, 34],
          backgroundColor: [
            DASHBOARD_CHART_COLORS[0],
            hasModelAccess ? DASHBOARD_CHART_COLORS[2] : DASHBOARD_CHART_COLORS[1],
            DASHBOARD_CHART_COLORS[6],
            DASHBOARD_CHART_COLORS[3],
            DASHBOARD_CHART_COLORS[5],
          ],
          borderColor: "rgba(255, 255, 255, 0.22)",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    }),
    [hasModelAccess],
  );

  const workflowData = useMemo<ChartData<"radar">>(
    () => ({
      labels: ["Scan", "Context", "Review", "Diff", "Apply", "Safety"],
      datasets: [
        {
          label: "Refactor loop",
          data: hasModelAccess ? [82, 78, 88, 76, 68, 94] : [72, 54, 82, 42, 34, 90],
          backgroundColor: "rgba(251, 146, 60, 0.16)",
          borderColor: DASHBOARD_CHART_COLORS[1],
          borderWidth: 2,
          pointBackgroundColor: DASHBOARD_CHART_COLORS[3],
          pointBorderColor: "#0f172a",
          pointHoverRadius: 5,
          pointRadius: 3,
        },
      ],
    }),
    [hasModelAccess],
  );

  const lineOptions = useMemo<ChartOptions<"line">>(() => {
    const theme = getDashboardChartTheme();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(reduced),
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.surface,
          bodyColor: theme.text,
          borderColor: theme.border,
          borderWidth: 1,
          displayColors: false,
          titleColor: theme.text,
        },
      },
      scales: {
        x: {
          grid: { color: theme.grid },
          ticks: { color: theme.text },
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: theme.grid },
          ticks: { color: theme.text, precision: 0 },
        },
      },
    };
  }, [reduced]);

  const barOptions = useMemo<ChartOptions<"bar">>(() => {
    const theme = getDashboardChartTheme();
    return {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(reduced),
      interaction: { axis: "y", intersect: false, mode: "nearest" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.surface,
          bodyColor: theme.text,
          borderColor: theme.border,
          borderWidth: 1,
          displayColors: false,
          titleColor: theme.text,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: theme.grid },
          ticks: { color: theme.text, precision: 0 },
        },
        y: {
          grid: { display: false },
          ticks: { color: theme.text },
        },
      },
    };
  }, [reduced]);

  const radarOptions = useMemo<ChartOptions<"radar">>(() => {
    const theme = getDashboardChartTheme();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(reduced),
      interaction: { intersect: false, mode: "nearest" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.surface,
          bodyColor: theme.text,
          borderColor: theme.border,
          borderWidth: 1,
          displayColors: false,
          titleColor: theme.text,
        },
      },
      scales: {
        r: {
          angleLines: { color: theme.grid },
          grid: { color: theme.grid },
          pointLabels: { color: theme.text, font: { size: 10 } },
          suggestedMax: 100,
          suggestedMin: 0,
          ticks: { backdropColor: "transparent", display: false, stepSize: 25 },
        },
      },
    };
  }, [reduced]);

  const kpiCards = useMemo(
    () => [
      {
        label: t("home.kpi.explorer.label"),
        value: t("home.kpi.explorer.value"),
        hint: t("home.kpi.explorer.hint"),
      },
      {
        label: t("home.kpi.models.label"),
        value: t("home.kpi.models.value"),
        hint: t("home.kpi.models.hint"),
      },
      {
        label: t("home.kpi.rules.label"),
        value: t("home.kpi.rules.value"),
        hint: t("home.kpi.rules.hint"),
      },
    ],
    [t],
  );

  const tabVariants = reduced
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } }, exit: { opacity: 0 } }
    : tabFade;

  return (
    <div className="javarf-ops-dashboard relative flex h-full min-h-0 flex-col overflow-auto bg-background text-foreground">
      <div aria-hidden className="dashboard-hero-gradient pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-1 flex-col gap-5 px-4 py-5 sm:px-5 md:gap-6 lg:px-7 lg:py-7">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <motion.div
            variants={reduced ? undefined : fadeUp}
            initial="hidden"
            animate="visible"
          >
            <TabsList className="javarf-terminal-tabs h-auto w-full justify-start overflow-x-auto border border-border/80 bg-card/95 p-1">
              <TabsTrigger className="javarf-terminal-tab" value="launch">
                {t("home.tabs.launch")}
              </TabsTrigger>
              <TabsTrigger className="javarf-terminal-tab" value="readiness">
                {t("home.tabs.readiness")}
              </TabsTrigger>
              <TabsTrigger className="javarf-terminal-tab" value="workflow">
                {t("home.tabs.workflow")}
              </TabsTrigger>
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === "launch" && (
              <motion.div
                key="launch"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-0 flex-1 space-y-4"
              >
                <DashboardWidget title={t("home.tabs.launch")}>
                  <section className="javarf-terminal-frame ops-card ops-hero border border-border/70 p-5 sm:p-6 lg:p-7">
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,430px)] xl:items-stretch">
                      <div className="flex min-w-0 flex-col justify-between gap-5">
                        <motion.div
                          className="min-w-0 max-w-3xl space-y-4"
                          variants={reduced ? undefined : staggerContainer}
                          initial="hidden"
                          animate="visible"
                        >
                          <motion.div variants={reduced ? undefined : fadeUp}>
                            <DashboardEyebrow
                              label="Refactoring Java"
                              value={t("home.hero.badge")}
                            />
                          </motion.div>
                          <motion.div variants={reduced ? undefined : fadeUp} className="space-y-3">
                            <h1 className="font-heading text-balance text-4xl font-semibold uppercase leading-[0.88] tracking-[0.08em] text-foreground sm:text-5xl xl:text-6xl">
                              {t("home.hero.title")}
                            </h1>
                            <p className="max-w-2xl text-pretty text-sm leading-6 text-muted-foreground sm:text-base">
                              {t("home.hero.description")}
                            </p>
                          </motion.div>
                        </motion.div>

                        <motion.div
                          className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap"
                          variants={reduced ? undefined : { hidden: { opacity: 0, x: 16 }, visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease, delay: 0.2 } } }}
                          initial="hidden"
                          animate="visible"
                        >
                          <Button
                            size="lg"
                            className="min-w-[170px] border border-primary/40 bg-primary/10 px-6 font-mono uppercase tracking-[0.16em] transition-all duration-200 hover:bg-primary/20 hover:shadow-[0_0_16px_color-mix(in_oklab,var(--primary)_25%,transparent)]"
                            onClick={onOpenWorkspace}
                          >
                            {t("home.openWorkspace")}
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="min-w-[170px] border border-border/80 bg-background/70 px-6 font-mono uppercase tracking-[0.16em] transition-all duration-200 hover:border-primary/40"
                            onClick={onOpenJavaRefactor}
                            disabled={!hasModelAccess}
                            title={!hasModelAccess ? t("home.javaRefactorDisabled") : undefined}
                          >
                            {t("home.javaRefactor")}
                          </Button>
                        </motion.div>
                      </div>

                      <motion.div
                        variants={reduced ? undefined : scaleIn}
                        initial="hidden"
                        animate="visible"
                      >
                        <DashboardChartSurface
                          title={t("home.chart.ops.title")}
                          description={t("home.chart.ops.description")}
                        >
                          <Line data={launchFlowData} options={lineOptions} />
                        </DashboardChartSurface>
                      </motion.div>
                    </div>
                  </section>
                </DashboardWidget>
              </motion.div>
            )}

            {activeTab === "readiness" && (
              <motion.div
                key="readiness"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-0 flex-1"
              >
                <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
                  <motion.div
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    variants={reduced ? undefined : staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {kpiCards.map((card) => (
                      <motion.div
                        key={card.label}
                        variants={reduced ? undefined : scaleIn}
                        {...(reduced ? {} : hoverGlow)}
                      >
                        <DashboardWidget title={card.label}>
                          <Card
                            size="sm"
                            className="javarf-terminal-frame java-panel ops-card border-border/70"
                          >
                            <CardContent className="min-h-[132px] space-y-2 p-5">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
                                {card.label}
                              </div>
                              <div className="text-balance font-heading text-3xl font-semibold uppercase leading-tight tracking-[0.06em]">
                                {card.value}
                              </div>
                              <p className="text-pretty text-sm leading-5 text-muted-foreground">
                                {card.hint}
                              </p>
                            </CardContent>
                          </Card>
                        </DashboardWidget>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div variants={reduced ? undefined : fadeUp} initial="hidden" animate="visible">
                    <DashboardWidget title={t("home.readiness.title")}>
                      <Card
                        size="sm"
                        className="javarf-terminal-frame java-panel ops-card h-full border-border/70"
                      >
                        <CardHeader className="gap-2 border-b border-border/60 bg-background/55">
                          <CardTitle>{t("home.readiness.nextAction")}</CardTitle>
                          <CardDescription>
                            {hasModelAccess
                              ? t("home.readiness.ready")
                              : t("home.readiness.notReady")}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="ops-inset-panel border border-border/60 bg-background/65 p-4 text-sm leading-6 text-muted-foreground">
                            {t("home.readiness.summary")}
                          </div>
                          <DashboardChartSurface
                            title={t("home.chart.readiness.title")}
                            description={t("home.chart.readiness.description")}
                            chartClassName="h-[220px]"
                          >
                            <Bar data={readinessData} options={barOptions} />
                          </DashboardChartSurface>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="ops-inset-panel border border-border/60 bg-card/70 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {t("home.motion.title")}
                              </div>
                              <p className="mt-2 text-pretty text-sm leading-5 text-foreground/90">
                                {t("home.motion.description")}
                              </p>
                            </div>
                            <div className="ops-inset-panel border border-border/60 bg-card/70 p-4">
                              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {t("home.ruleBase.title")}
                              </div>
                              <p className="mt-2 text-pretty text-sm leading-5 text-foreground/90">
                                {t("home.ruleBase.description")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </DashboardWidget>
                  </motion.div>
                </section>
              </motion.div>
            )}

            {activeTab === "workflow" && (
              <motion.div
                key="workflow"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-0 flex-1"
              >
                <DashboardWidget title={t("home.workflow.title")}>
                  <Card
                    size="sm"
                    className="javarf-terminal-frame java-panel ops-card border-border/70"
                  >
                      <CardHeader className="border-b border-border/60 bg-background/55">
                        <CardTitle>{t("home.workflow.title")}</CardTitle>
                        <CardDescription>{t("home.workflow.description")}</CardDescription>
                      </CardHeader>
                    <CardContent className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-1">
                        {(["intake", "analysis", "refactor"] as const).map((step, i) => (
                          <motion.div
                            key={step}
                            className="javarf-terminal-panel ops-inset-panel border border-border/70 bg-background/70 p-4"
                            variants={reduced ? undefined : fadeUp}
                            initial="hidden"
                            animate="visible"
                            transition={{ delay: i * 0.08 }}
                          >
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                              {t(`home.workflow.${step}.title`)}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                              {t(`home.workflow.${step}.description`)}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                      <DashboardChartSurface
                        title={t("home.chart.workflow.title")}
                        description={t("home.chart.workflow.description")}
                        chartClassName="h-[300px]"
                      >
                        <Radar data={workflowData} options={radarOptions} />
                      </DashboardChartSurface>
                    </CardContent>
                  </Card>
                </DashboardWidget>
              </motion.div>
            )}
          </AnimatePresence>
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
      <span className="border border-border/70 bg-background/65 px-2 py-1 text-primary">
        {label}
      </span>
      <span className="border border-border/70 bg-background/45 px-2 py-1">
        {value}
      </span>
    </div>
  );
}

function DashboardChartSurface({
  title,
  description,
  chartClassName = "h-[240px]",
  children,
}: {
  title: string;
  description: string;
  chartClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className="javarf-terminal-panel ops-chart-surface ops-inset-panel border border-border/70 bg-background/60 p-4 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <p className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </div>
        <span className="shrink-0 border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
          Chart.js
        </span>
      </div>
      <div className={`mt-4 min-h-0 ${chartClassName}`}>{children}</div>
    </div>
  );
}
