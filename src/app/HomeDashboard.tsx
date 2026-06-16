import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/modules/ai";
import {
  DASHBOARD_CHART_COLORS,
  chartAnimation,
  getDashboardChartTheme,
} from "@/modules/dashboard/chartSetup";
import { useI18n } from "@/modules/i18n";
import { useGSAP } from "@gsap/react";
import {
  Clock01Icon,
  FolderOpenIcon,
  GitCompareIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { animate, createScope, stagger } from "animejs";
import type { ChartData, ChartOptions } from "chart.js";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Bar } from "react-chartjs-2";

gsap.registerPlugin(useGSAP);

type RepoStatus = {
  path: string | null;
  branch: string | null;
  upstream: string | null;
  changedCount: number;
  ahead: number;
  behind: number;
  previewOnly: boolean;
  isDetached: boolean;
};

type Props = {
  onOpenJavaRefactor: () => void;
  hasModelAccess: boolean;
  hasWorkspace?: boolean;
  onOpenWorkspace?: () => void;
  onBrowseProject?: () => void;
  onSearchRepository?: () => void;
  onOpenAssistant: (prefill?: string) => void;
  onOpenRecentFile?: (path: string) => void;
  recentProjectPaths?: string[];
  recentFilePaths?: string[];
  repoStatus?: RepoStatus | null;
};

type AlertTone = "ready" | "warn";
type DashboardSectionId = "launch" | "workflow" | "readiness";

function basename(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : path;
}

function compactPath(path: string, maxSegments: number = 3): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= maxSegments) return normalized;
  return `.../${parts.slice(-maxSegments).join("/")}`;
}

function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomeDashboard({
  onOpenJavaRefactor,
  hasModelAccess,
  hasWorkspace = false,
  onOpenWorkspace,
  onBrowseProject,
  onSearchRepository,
  onOpenAssistant,
  onOpenRecentFile,
  recentProjectPaths = [],
  recentFilePaths = [],
  repoStatus,
}: Props) {
  const { t } = useI18n();
  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const panelOpen = useChatStore((s) => s.panelOpen);
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [commandDraft, setCommandDraft] = useState("");
  const [activeSection, setActiveSection] = useState<DashboardSectionId>("launch");

  const activeProjectPath = repoStatus?.path ?? null;
  const sessionRows = sessions.slice(0, 3);
  const assistantStatus = panelOpen
    ? t("home.commandCenter.status.open")
    : sessionRows.length > 0
      ? t("home.commandCenter.status.ready")
      : t("home.commandCenter.status.noSession");
  const modelsStatus = hasModelAccess
    ? t("home.commandCenter.status.ready")
    : t("home.commandCenter.status.needsModel");
  const remoteTotal = (repoStatus?.ahead ?? 0) + (repoStatus?.behind ?? 0);
  const remoteLabel = repoStatus?.upstream
    ? remoteTotal === 0
      ? t("home.commandCenter.status.clean")
      : `+${repoStatus?.ahead ?? 0} / -${repoStatus?.behind ?? 0}`
    : t("home.commandCenter.status.clean");
  const telemetryItems = useMemo(
    () => [
      {
        label: t("home.commandCenter.metric.files"),
        value: recentFilePaths.length,
        color: DASHBOARD_CHART_COLORS[0],
      },
      {
        label: t("home.commandCenter.metric.changes"),
        value: repoStatus?.changedCount ?? 0,
        color: DASHBOARD_CHART_COLORS[1],
      },
      {
        label: t("home.commandCenter.metric.sessions"),
        value: sessions.length,
        color: DASHBOARD_CHART_COLORS[5],
      },
      {
        label: t("home.commandCenter.metric.sync"),
        value: remoteTotal,
        color: DASHBOARD_CHART_COLORS[2],
      },
    ],
    [recentFilePaths.length, remoteTotal, repoStatus?.changedCount, sessions.length, t],
  );
  const telemetryHasChartSignal =
    telemetryItems.filter((item) => item.value > 0).length > 1 ||
    telemetryItems.some((item) => item.value > 2);

  const statusRows = useMemo(
    () => [
      {
        label: t("home.commandCenter.status.workspace"),
        value:
          activeProjectPath !== null
            ? basename(activeProjectPath)
            : t("home.commandCenter.status.offline"),
        percent: activeProjectPath ? 100 : 14,
      },
      {
        label: t("home.commandCenter.status.branch"),
        value: repoStatus?.previewOnly
          ? t("home.commandCenter.status.preview")
          : repoStatus?.branch ??
            (repoStatus?.isDetached
              ? t("home.commandCenter.status.preview")
              : "--"),
        percent: repoStatus?.branch ? 82 : repoStatus?.previewOnly ? 70 : 18,
      },
      {
        label: t("home.commandCenter.status.changes"),
        value:
          (repoStatus?.changedCount ?? 0) > 0
            ? String(repoStatus?.changedCount ?? 0)
            : t("home.commandCenter.status.clean"),
        percent: Math.min(100, Math.max(12, (repoStatus?.changedCount ?? 0) * 14)),
      },
      {
        label: t("home.commandCenter.status.remote"),
        value: remoteLabel,
        percent: Math.min(100, Math.max(12, remoteTotal * 20)),
      },
      {
        label: t("home.commandCenter.status.assistant"),
        value: assistantStatus,
        percent: panelOpen ? 100 : Math.min(84, Math.max(18, sessionRows.length * 22)),
      },
      {
        label: t("home.commandCenter.status.models"),
        value: modelsStatus,
        percent: hasModelAccess ? 100 : 20,
      },
    ],
    [
      activeProjectPath,
      assistantStatus,
      hasModelAccess,
      modelsStatus,
      panelOpen,
      remoteLabel,
      remoteTotal,
      repoStatus?.branch,
      repoStatus?.changedCount,
      repoStatus?.isDetached,
      repoStatus?.previewOnly,
      sessionRows.length,
      t,
    ],
  );

  const telemetryData = useMemo<ChartData<"bar">>(
    () => ({
      labels: telemetryItems.map((item) => item.label),
      datasets: [
        {
          label: t("home.commandCenter.metrics"),
          data: telemetryItems.map((item) => item.value),
          backgroundColor: telemetryItems.map((item) => item.color),
          borderColor: "rgba(255, 255, 255, 0.16)",
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    }),
    [telemetryItems, t],
  );

  const telemetryOptions = useMemo<ChartOptions<"bar">>(() => {
    const theme = getDashboardChartTheme();
    return {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: chartAnimation(reducedMotion),
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
          grid: { color: theme.grid },
          ticks: { color: theme.text, precision: 0 },
        },
        y: {
          grid: { display: false },
          ticks: { color: theme.text },
        },
      },
    };
  }, [reducedMotion]);

  const alerts = useMemo<{ tone: AlertTone; body: string }[]>(() => {
    const next: { tone: AlertTone; body: string }[] = [];
    if (!hasWorkspace) {
      next.push({ tone: "warn", body: t("home.commandCenter.alert.noWorkspace") });
    }
    if (!hasModelAccess) {
      next.push({ tone: "warn", body: t("home.commandCenter.alert.noModel") });
    }
    if (repoStatus?.previewOnly) {
      next.push({ tone: "warn", body: t("home.commandCenter.alert.preview") });
    }
    if ((repoStatus?.behind ?? 0) > 0) {
      next.push({
        tone: "warn",
        body: t("home.commandCenter.alert.behind", {
          count: String(repoStatus?.behind ?? 0),
        }),
      });
    }
    if ((repoStatus?.changedCount ?? 0) > 0) {
      next.push({
        tone: "warn",
        body: t("home.commandCenter.alert.changes", {
          count: String(repoStatus?.changedCount ?? 0),
        }),
      });
    }
    if (next.length === 0) {
      next.push({ tone: "ready", body: t("home.commandCenter.alert.clear") });
    }
    return next;
  }, [
    hasModelAccess,
    hasWorkspace,
    repoStatus?.behind,
    repoStatus?.changedCount,
    repoStatus?.previewOnly,
    t,
  ]);

  const promptDeck = useMemo(
    () => [
      {
        label: t("home.commandCenter.prompt.inspect"),
        prompt: t("home.commandCenter.prompt.inspectBody"),
      },
      {
        label: t("home.commandCenter.prompt.branch"),
        prompt: t("home.commandCenter.prompt.branchBody"),
      },
      {
        label: t("home.commandCenter.prompt.next"),
        prompt: t("home.commandCenter.prompt.nextBody"),
      },
    ],
    [t],
  );

  const sectionTabs = useMemo(
    () => [
      { id: "launch" as const, label: t("home.tabs.launch") },
      { id: "workflow" as const, label: t("home.tabs.workflow") },
      { id: "readiness" as const, label: t("home.tabs.readiness") },
    ],
    [t],
  );

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from(".dashboard-hero-panel", {
        duration: 0.88,
        opacity: 0,
        y: 24,
        stagger: 0.1,
        ease: "power3.out",
      });
      gsap.from(".dashboard-card", {
        duration: 0.74,
        opacity: 0,
        y: 16,
        stagger: 0.06,
        delay: 0.14,
        ease: "power2.out",
      });
    },
    { scope: rootRef, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    const scope = createScope({ root: rootRef.current }).add(() => {
      animate(".hud-pulse-dot", {
        scale: [0.82, 1.18],
        opacity: [0.42, 1],
        duration: 920,
        delay: stagger(130),
        ease: "inOut(3)",
        loop: true,
        alternate: true,
      });
      animate(".hud-meter-fill", {
        scaleX: [0.72, 1],
        opacity: [0.56, 1],
        duration: 1280,
        delay: stagger(90),
        ease: "inOut(2)",
        loop: true,
        alternate: true,
      });
      animate(".hero-scan-line", {
        translateY: ["-110%", "120%"],
        opacity: [{ from: 0, to: 0.2 }, { to: 0.68 }, { to: 0 }],
        duration: 2600,
        ease: "linear",
        loop: true,
      });
      animate(".hero-orbit-line", {
        rotate: "1turn",
        duration: 12000,
        ease: "linear",
        loop: true,
      });
    });
    return () => scope.revert();
  }, [reducedMotion, statusRows.length]);

  return (
    <div
      ref={rootRef}
      className="javarf-ops-dashboard relative flex h-full min-h-0 flex-col overflow-y-auto bg-[#03050a] text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.12),transparent_24%),linear-gradient(180deg,#04060b,#020304)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:34px_34px]"
      />

      <div className="relative mx-auto flex w-full max-w-[1700px] flex-1 min-h-0 flex-col gap-3 overflow-visible px-4 py-4 sm:px-5 lg:px-7 lg:py-5">
        <section className="order-2 grid items-start shrink-0 gap-3 lg:order-1 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
          <Card className="dashboard-hero-panel dashboard-card overflow-hidden rounded-none border border-border/70 bg-card/84">
            <CardContent className="grid min-h-[220px] gap-0 p-0 sm:min-h-[240px] xl:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative min-h-[180px] overflow-hidden border-b border-border/60 sm:min-h-[200px] xl:border-r xl:border-b-0">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_44%),linear-gradient(180deg,rgba(8,12,19,0.15),rgba(4,6,9,0.92))]"
                />
                <div
                  aria-hidden
                  className="hero-orbit-line pointer-events-none absolute inset-6 z-10 rounded-full border border-cyan-300/18"
                />
                <div
                  aria-hidden
                  className="hero-scan-line pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-linear-to-b from-cyan-300/0 via-cyan-300/20 to-cyan-300/0"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
                >
                  <div className="relative flex size-28 items-center justify-center rounded-full border border-cyan-300/14 bg-black/18 shadow-[0_0_48px_rgba(34,211,238,0.08)] sm:size-32">
                    <div className="absolute inset-3 rounded-full border border-white/8" />
                    <div className="absolute h-px w-14 bg-cyan-200/30 sm:w-16" />
                    <div className="absolute h-14 w-px bg-cyan-200/30 sm:h-16" />
                  </div>
                </div>
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/58">
                  <span className="border border-border/70 bg-black/32 px-2 py-1 text-cyan-200">
                    {t("home.commandCenter.visualLabel")}
                  </span>
                  <span className="border border-border/70 bg-black/20 px-2 py-1">
                    {t("home.commandCenter.visualValue")}
                  </span>
                </div>
                <div className="absolute inset-0">
                  <CommandCenterScene />
                </div>
                <div className="absolute inset-x-4 bottom-4 z-10 grid gap-2 sm:grid-cols-3">
                  <SceneChip
                    label={t("home.commandCenter.systemLabel")}
                    value={t("home.commandCenter.systemValue")}
                  />
                  <SceneChip
                    label={t("home.commandCenter.status.workspace")}
                    value={
                      activeProjectPath
                        ? basename(activeProjectPath)
                        : t("home.commandCenter.status.offline")
                    }
                  />
                  <SceneChip
                    label={t("home.commandCenter.status.models")}
                    value={modelsStatus}
                  />
                </div>
              </div>

              <div className="relative flex flex-col justify-between gap-3 bg-black/14 p-3.5 sm:p-4">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/54">
                    <span className="hud-pulse-dot size-2 rounded-full bg-cyan-300" />
                    <span>{t("home.commandCenter.status")}</span>
                  </div>
                  <p className="text-sm leading-6 text-white/68">
                    {t("home.commandCenter.description")}
                  </p>
                </div>

                <div className="space-y-3">
                  {statusRows.slice(0, 4).map((row) => (
                    <MeterRow
                      key={row.label}
                      label={row.label}
                      value={row.value}
                      percent={row.percent}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-hero-panel dashboard-card rounded-none border border-border/70 bg-card/88">
            <CardHeader className="gap-3 border-b border-border/60 pb-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/54">
                <span className="border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-cyan-100">
                  {t("home.commandCenter.eyebrow")}
                </span>
                <span className="border border-border/70 bg-background/45 px-2 py-1">
                  {t("home.commandCenter.badge")}
                </span>
              </div>
              <div className="space-y-2">
                <CardTitle className="font-project-title text-2xl leading-[0.96] tracking-tight text-white sm:text-3xl">
                  {t("home.commandCenter.title")}
                </CardTitle>
                <CardDescription className="max-w-2xl text-sm leading-6 text-white/62">
                  {t("home.commandCenter.description")}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickActionButton
                  icon={FolderOpenIcon}
                  label={t("header.openWorkspace")}
                  onClick={onOpenWorkspace}
                />
                <QuickActionButton
                  icon={Clock01Icon}
                  label={t("home.commandCenter.continueSession")}
                  onClick={() => onOpenAssistant()}
                />
                <QuickActionButton
                  icon={GitCompareIcon}
                  label={t("home.javaRefactor")}
                  onClick={onOpenJavaRefactor}
                  disabled={!hasModelAccess}
                />
                <QuickActionButton
                  icon={Search01Icon}
                  label={t("home.commandCenter.searchRepo")}
                  onClick={hasWorkspace ? onSearchRepository : onOpenWorkspace}
                  disabled={!hasWorkspace && !onOpenWorkspace}
                />
              </div>

              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const nextPrompt =
                    commandDraft.trim() ||
                    t("home.commandCenter.commandFallback");
                  onOpenAssistant(nextPrompt);
                  setCommandDraft("");
                }}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/54">
                  {t("home.commandCenter.commandLabel")}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={commandDraft}
                    onChange={(event) => setCommandDraft(event.target.value)}
                    placeholder={t("home.commandCenter.commandPlaceholder")}
                    className="h-11 rounded-none border-border/70 bg-background/75 text-sm text-white placeholder:text-white/34"
                  />
                  <Button
                    type="submit"
                    className="h-11 min-w-32 rounded-none px-4 text-xs font-semibold uppercase tracking-[0.18em]"
                  >
                    {t("home.commandCenter.commandSend")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="dashboard-card order-1 shrink-0 rounded-none border border-border/70 bg-black/18 p-2 lg:order-2">
          <div className="flex flex-wrap gap-2">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  "border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  activeSection === tab.id
                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                    : "border-border/60 bg-background/45 text-white/54 hover:border-white/14 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        <div className="order-3 flex-none min-h-0 overflow-visible lg:flex-1">
          {activeSection === "launch" ? (
            <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <div className="grid gap-3">
                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.projects")}
                  contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
                >
                  <div className="space-y-3">
                    {recentProjectPaths.length === 0 ? (
                      <EmptyLine>{t("home.commandCenter.noProjects")}</EmptyLine>
                    ) : (
                      recentProjectPaths.map((path) => {
                        const isCurrent = activeProjectPath === path;
                        return (
                          <div
                            key={path}
                            className="border border-border/60 bg-background/60 px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-white/88">
                                  {basename(path)}
                                </div>
                                <div className="truncate text-xs leading-5 text-white/44">
                                  {compactPath(path, 4)}
                                </div>
                              </div>
                              <span
                                className={cn(
                                  "shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                  isCurrent
                                    ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                                    : "border-border/70 bg-black/20 text-white/52",
                                )}
                              >
                                {isCurrent
                                  ? t("home.commandCenter.project.current")
                                  : t("home.commandCenter.project.known")}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PanelCard>
                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.alerts")}
                  contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
                >
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.body}
                        className={cn(
                          "border px-3 py-3 text-sm leading-6",
                          alert.tone === "ready"
                            ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100/88"
                            : "border-amber-300/18 bg-amber-300/8 text-amber-100/88",
                        )}
                      >
                        {alert.body}
                      </div>
                    ))}
                  </div>
                </PanelCard>
              </div>
              <PanelCard
                className="dashboard-card min-h-0"
                title={t("home.commandCenter.openAssistant")}
                contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
              >
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <InfoTile
                      label={t("home.commandCenter.status.assistant")}
                      value={assistantStatus}
                    />
                    <InfoTile
                      label={t("home.commandCenter.status.models")}
                      value={modelsStatus}
                    />
                  </div>
                  <p className="text-sm leading-6 text-white/58">
                    {t("home.commandCenter.systemValue")}
                  </p>
                  <div className="grid gap-2">
                    {promptDeck.map((item) => (
                      <button
                        key={item.prompt}
                        type="button"
                        className="border border-border/60 bg-background/55 px-3 py-3 text-left transition-colors hover:border-cyan-300/30 hover:bg-background/75"
                        onClick={() => onOpenAssistant(item.prompt)}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100/88">
                          {item.label}
                        </div>
                        <p className="mt-2 text-sm leading-5 text-white/58">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </PanelCard>
            </section>
          ) : activeSection === "workflow" ? (
            <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.sessions")}
                  contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
                >
                  <div className="space-y-3">
                    {sessionRows.length === 0 ? (
                      <EmptyLine>{t("home.commandCenter.noSessions")}</EmptyLine>
                    ) : (
                      sessionRows.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          className={cn(
                            "w-full border px-3 py-3 text-left transition-colors",
                            session.id === activeSessionId
                              ? "border-cyan-300/30 bg-cyan-300/10"
                              : "border-border/60 bg-background/60 hover:border-white/14 hover:bg-background/78",
                          )}
                          onClick={() => onOpenAssistant()}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 truncate text-sm font-medium text-white/86">
                              {session.title || t("home.commandCenter.status.noSession")}
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/42">
                              {formatTime(session.updatedAt)}
                            </span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </PanelCard>
                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.recentFiles")}
                  contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
                >
                  <div className="space-y-2">
                    {recentFilePaths.length === 0 ? (
                      <EmptyLine>{t("home.commandCenter.noRecentFiles")}</EmptyLine>
                    ) : (
                      recentFilePaths.map((path) => (
                        <button
                          key={path}
                          type="button"
                          className="flex w-full items-center justify-between gap-3 border border-border/60 bg-background/60 px-3 py-3 text-left transition-colors hover:border-white/14 hover:bg-background/78"
                          onClick={() => onOpenRecentFile?.(path)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-white/86">
                              {basename(path)}
                            </span>
                            <span className="block truncate text-xs leading-5 text-white/42">
                              {compactPath(path, 4)}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </PanelCard>
              </div>
              <PanelCard
                className="dashboard-card min-h-0"
                title={t("home.commandCenter.openAssistant")}
                contentClassName="min-h-0 flex-1 pr-1 lg:overflow-auto"
              >
                <div className="space-y-3">
                  <div className="border border-border/60 bg-background/60 px-3 py-3 text-sm leading-6 text-white/58">
                    {t("home.commandCenter.systemValue")}
                  </div>
                  <div className="grid gap-2">
                    {promptDeck.map((item) => (
                      <button
                        key={item.prompt}
                        type="button"
                        className="border border-border/60 bg-black/18 px-3 py-3 text-left text-sm leading-5 text-white/68 transition-colors hover:border-cyan-300/30 hover:bg-black/28"
                        onClick={() => onOpenAssistant(item.prompt)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </PanelCard>
            </section>
          ) : (
            <section className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
              <PanelCard
                className="dashboard-card min-h-0"
                title={t("home.commandCenter.status")}
                contentClassName="min-h-0 flex-1"
              >
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <div className="grid min-h-0 gap-3 pr-1 md:grid-cols-2 xl:overflow-auto">
                    {statusRows.map((row) => (
                      <MeterRow
                        key={row.label}
                        label={row.label}
                        value={row.value}
                        percent={row.percent}
                      />
                    ))}
                  </div>

                  <div className="shrink-0 border border-border/60 bg-background/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">
                          {t("home.commandCenter.metrics")}
                        </div>
                        <p className="text-xs leading-5 text-white/48">
                          {t("home.commandCenter.metricsDescription")}
                        </p>
                      </div>
                      <span className="border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100">
                        Chart.js
                      </span>
                    </div>
                    {telemetryHasChartSignal ? (
                      <div className="relative h-40">
                        <Bar data={telemetryData} options={telemetryOptions} />
                      </div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {telemetryItems.map((item) => (
                          <InfoTile key={item.label} label={item.label} value={String(item.value)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PanelCard>

              <div className="grid gap-3">
                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.branchDeck")}
                  contentClassName="min-h-0 flex-1 pr-1 xl:overflow-auto"
                >
                  <div className="space-y-4">
                    <div className="border border-border/60 bg-background/60 px-4 py-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        {t("home.commandCenter.status.branch")}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-white">
                        {repoStatus?.branch ?? t("home.commandCenter.status.offline")}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/54">
                        {repoStatus?.upstream
                          ? `${repoStatus.upstream} | ${remoteLabel}`
                          : t("home.commandCenter.status.clean")}
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        className="border border-border/60 bg-background/60 px-3 py-3 text-left transition-colors hover:border-cyan-300/30 hover:bg-background/78"
                        onClick={hasWorkspace ? onBrowseProject : onOpenWorkspace}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/52">
                          {t("home.commandCenter.browseProject")}
                        </div>
                        <p className="mt-2 text-sm leading-5 text-white/64">
                          {hasWorkspace
                            ? t("home.commandCenter.browseDescription")
                            : t("home.commandCenter.browseDescriptionOffline")}
                        </p>
                      </button>
                      <button
                        type="button"
                        className="border border-border/60 bg-background/60 px-3 py-3 text-left transition-colors hover:border-cyan-300/30 hover:bg-background/78"
                        onClick={onOpenJavaRefactor}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/52">
                          {t("home.javaRefactor")}
                        </div>
                        <p className="mt-2 text-sm leading-5 text-white/64">
                          {t("home.commandCenter.refactorDescription")}
                        </p>
                      </button>
                    </div>
                  </div>
                </PanelCard>

                <PanelCard
                  className="dashboard-card min-h-0"
                  title={t("home.commandCenter.alerts")}
                  contentClassName="min-h-0 flex-1 pr-1 xl:overflow-auto"
                >
                  <div className="space-y-2">
                    {alerts.map((alert) => (
                      <div
                        key={alert.body}
                        className={cn(
                          "border px-3 py-3 text-sm leading-6",
                          alert.tone === "ready"
                            ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-100/88"
                            : "border-amber-300/18 bg-amber-300/8 text-amber-100/88",
                        )}
                      >
                        {alert.body}
                      </div>
                    ))}
                  </div>
                </PanelCard>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CommandCenterScene() {
  const reducedMotion = useReducedMotion();
  const sceneId = useId().replace(/:/g, "");
  const gridId = `command-center-grid-${sceneId}`;
  const glowId = `command-center-glow-${sceneId}`;
  const sweepId = `command-center-sweep-${sceneId}`;
  const ringId = `command-center-ring-${sceneId}`;

  return (
    <div className="h-full w-full">
      <svg
        viewBox="0 0 320 220"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          <radialGradient id={glowId} cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.34" />
            <stop offset="56%" stopColor="#22d3ee" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={sweepId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0" />
            <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ringId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.68" />
          </linearGradient>
          <pattern id={gridId} width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="rgba(148,163,184,0.16)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        <rect width="320" height="220" fill={`url(#${glowId})`} />
        <rect width="320" height="220" fill={`url(#${gridId})`} opacity="0.22" />

        <g opacity="0.74">
          <path
            d="M40 160 C84 120 110 176 154 136 S232 70 280 98"
            fill="none"
            stroke="#22d3ee"
            strokeOpacity="0.28"
            strokeWidth="2"
            strokeDasharray="7 8"
          >
            {!reducedMotion ? (
              <animate
                attributeName="stroke-dashoffset"
                values="0;-30"
                dur="2.8s"
                repeatCount="indefinite"
              />
            ) : null}
          </path>
          <path
            d="M34 72 H112 L126 58 H196"
            fill="none"
            stroke="#fb923c"
            strokeOpacity="0.38"
            strokeWidth="2"
          />
          <path
            d="M192 156 H236 L258 136 H292"
            fill="none"
            stroke="#67e8f9"
            strokeOpacity="0.34"
            strokeWidth="2"
          />
        </g>

        <g>
          <circle
            cx="160"
            cy="110"
            r="70"
            fill="none"
            stroke="rgba(103,232,249,0.16)"
            strokeWidth="1.5"
            strokeDasharray="3 10"
          />
          <circle
            cx="160"
            cy="110"
            r="56"
            fill="none"
            stroke={`url(#${ringId})`}
            strokeWidth="2.5"
            strokeDasharray="92 40"
            strokeLinecap="round"
          >
            {!reducedMotion ? (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 160 110"
                to="360 160 110"
                dur="14s"
                repeatCount="indefinite"
              />
            ) : null}
          </circle>
          <circle
            cx="160"
            cy="110"
            r="36"
            fill="rgba(8,145,178,0.08)"
            stroke="rgba(191,219,254,0.3)"
            strokeWidth="1.5"
          />
          <path
            d="M160 74 L188 92 L188 128 L160 146 L132 128 L132 92 Z"
            fill="rgba(10,18,28,0.55)"
            stroke="#dbeafe"
            strokeOpacity="0.52"
            strokeWidth="1.6"
          >
            {!reducedMotion ? (
              <animate
                attributeName="fill-opacity"
                values="0.42;0.7;0.42"
                dur="3.2s"
                repeatCount="indefinite"
              />
            ) : null}
          </path>
          <path
            d="M160 87 L176 110 L160 133 L144 110 Z"
            fill="#fb923c"
            fillOpacity="0.78"
            stroke="#fdba74"
            strokeOpacity="0.7"
            strokeWidth="1.2"
          >
            {!reducedMotion ? (
              <animate
                attributeName="fill-opacity"
                values="0.52;0.86;0.52"
                dur="2.4s"
                repeatCount="indefinite"
              />
            ) : null}
          </path>
          <path d="M118 110 H202 M160 68 V152" stroke="#dbeafe" strokeOpacity="0.28" strokeWidth="1" />
        </g>

        <g opacity="0.95">
          <g>
            <circle cx="230" cy="110" r="5" fill="#67e8f9" />
            <path d="M160 40 L168 48 L160 56 L152 48 Z" fill="#67e8f9" fillOpacity="0.78" />
            {!reducedMotion ? (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 160 110"
                to="360 160 110"
                dur="10s"
                repeatCount="indefinite"
              />
            ) : null}
          </g>
          <g>
            <path d="M92 110 L84 118 L76 110 L84 102 Z" fill="#fb923c" fillOpacity="0.82" />
            <circle cx="160" cy="178" r="4.5" fill="#fb923c" />
            {!reducedMotion ? (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360 160 110"
                to="0 160 110"
                dur="7.4s"
                repeatCount="indefinite"
              />
            ) : null}
          </g>
        </g>

        <g opacity="0.72">
          {[0, 1, 2, 3].map((index) => {
            const leftY = 62 + index * 16;
            const rightY = 140 + index * 12;
            const leftWidth = 30 + index * 10;
            const rightWidth = 20 + index * 12;
            return (
              <g key={index}>
                <rect
                  x="36"
                  y={leftY}
                  width={leftWidth}
                  height="3"
                  rx="1.5"
                  fill="#22d3ee"
                  fillOpacity={0.28 + index * 0.08}
                >
                  {!reducedMotion ? (
                    <animate
                      attributeName="width"
                      values={`${leftWidth};${leftWidth + 16};${leftWidth}`}
                      dur={`${2 + index * 0.25}s`}
                      repeatCount="indefinite"
                    />
                  ) : null}
                </rect>
                <rect
                  x={262 - rightWidth}
                  y={rightY}
                  width={rightWidth}
                  height="3"
                  rx="1.5"
                  fill="#fb923c"
                  fillOpacity={0.24 + index * 0.1}
                >
                  {!reducedMotion ? (
                    <animate
                      attributeName="width"
                      values={`${rightWidth};${rightWidth + 14};${rightWidth}`}
                      dur={`${1.8 + index * 0.22}s`}
                      repeatCount="indefinite"
                    />
                  ) : null}
                </rect>
              </g>
            );
          })}
        </g>

        <g opacity="0.9">
          <rect x="18" y="18" width="118" height="48" fill="rgba(2,6,23,0.42)" stroke="rgba(103,232,249,0.18)" />
          <text x="30" y="38" fill="#dbeafe" fontSize="10" letterSpacing="2.8" fontFamily="JetBrains Mono, monospace">
            LIVE COMMAND MAP
          </text>
          <text x="30" y="56" fill="#67e8f9" fontSize="16" fontWeight="700" fontFamily="Bebas Neue, sans-serif">
            03 ACTIVE LOOPS
          </text>
          <text x="206" y="48" fill="#fdba74" fontSize="10" letterSpacing="2.6" fontFamily="JetBrains Mono, monospace">
            VECTOR LOCK
          </text>
          <text x="206" y="66" fill="#f8fafc" fontSize="22" fontWeight="700" fontFamily="Bebas Neue, sans-serif">
            ONLINE
          </text>
        </g>

        <rect x="0" y="-48" width="320" height="68" fill={`url(#${sweepId})`} opacity="0.28">
          {!reducedMotion ? (
            <animate
              attributeName="y"
              values="-48;220"
              dur="4.2s"
              repeatCount="indefinite"
            />
          ) : null}
        </rect>
      </svg>
    </div>
  );
}

function PanelCard({
  title,
  className,
  contentClassName,
  children,
}: {
  title: string;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "flex min-h-0 flex-col rounded-none border border-border/70 bg-card/82",
        className,
      )}
    >
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="text-base text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className={cn("min-h-0 flex-1 pt-3.5", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

function QuickActionButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className="h-auto justify-start gap-3 rounded-none border-border/70 bg-background/65 px-4 py-2.5 text-left hover:border-cyan-300/30 hover:bg-background/82"
    >
      <HugeiconsIcon icon={icon} size={16} strokeWidth={1.75} className="shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>
    </Button>
  );
}

function MeterRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
        <span>{label}</span>
        <span className="truncate text-right text-white/70">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden bg-white/[0.06]">
        <span
          className="hud-meter-fill block h-full origin-left bg-linear-to-r from-cyan-400 via-sky-400 to-orange-300"
          style={{ width: `${Math.max(8, percent)}%` }}
        />
      </div>
    </div>
  );
}

function SceneChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/70 bg-background/78 px-3 py-2 text-xs text-white/46">
      {label}
      <div className="mt-1 truncate text-sm text-white/88">{value}</div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border/60 bg-background/60 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-medium text-white/88">{value}</div>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-border/60 bg-background/40 px-3 py-4 text-sm leading-6 text-white/42">
      {children}
    </div>
  );
}
