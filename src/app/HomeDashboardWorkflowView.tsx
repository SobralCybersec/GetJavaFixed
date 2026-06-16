import { cn } from "@/lib/utils";
import { useI18n } from "@/modules/i18n";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { animate, stagger } from "animejs";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import type { GitHubProfile } from "./homeDashboardData";
import {
  EmptyStrip,
  type HomeDashboardEntry,
  ViewHeader,
  WorkflowWireframeScene,
} from "./HomeDashboardShared";

type LanguageSummary = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  backgroundColor: string;
  primaryColor: string;
  accentColor: string;
  chartData: ChartData<"bar">;
  chartOptions: ChartOptions<"bar">;
  entries: HomeDashboardEntry[];
  hasRecentProjects: boolean;
  hasWorkspace: boolean;
  emptyLabel: string;
  languageChartData: ChartData<"doughnut">;
  languageChartOptions: ChartOptions<"doughnut">;
  languageSummary: LanguageSummary[];
  onBrowseProject?: () => void;
  onOpenWorkspace?: () => void;
  onOpenRecentFile?: (path: string) => void;
  githubProfile?: GitHubProfile | null;
  trendData: ChartData<"line">;
  trendOptions: ChartOptions<"line">;
};

export function HomeDashboardWorkflowView({
  backgroundColor,
  primaryColor,
  accentColor,
  chartData,
  chartOptions,
  entries,
  hasRecentProjects,
  hasWorkspace,
  emptyLabel,
  languageChartData,
  languageChartOptions,
  languageSummary,
  onBrowseProject,
  onOpenWorkspace,
  onOpenRecentFile,
  githubProfile,
  trendData,
  trendOptions,
}: Props) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const activityChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const targets = containerRef.current.querySelectorAll(".workflow-entry");
    if (targets.length === 0) return;

    animate(targets, {
      opacity: [0, 1],
      translateX: [-30, 0],
      delay: stagger(90),
      duration: 800,
      ease: "out(4)",
    });
  }, [entries, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !chartRef.current) return;

    gsap.from(chartRef.current, {
      opacity: 0,
      y: 20,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.3,
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !sceneRef.current) return;

    gsap.from(sceneRef.current, {
      opacity: 0,
      scale: 0.95,
      duration: 1.4,
      ease: "back.out(1.2)",
      delay: 0.2,
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !activityChartRef.current) return;

    gsap.from(activityChartRef.current, {
      opacity: 0,
      x: -20,
      duration: 1,
      ease: "power2.out",
      delay: 0.4,
    });
  }, [reducedMotion]);

  return (
    <div ref={containerRef} data-dashboard-view="active" className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewHeader title={t("home.workflow.header")} />
        {githubProfile ? (
          <div className="flex items-center gap-3">
            <img
              src={githubProfile.avatarUrl}
              alt={githubProfile.login}
              className="h-8 w-8 rounded-full border-2 border-[var(--dash-accent)] object-cover"
            />
          </div>
        ) : null}
      </div>

      <div className="grid flex-1 gap-6">
        <div
          ref={sceneRef}
          className="overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel-strong)]"
        >
          <div className="h-[280px] sm:h-[320px]">
            <WorkflowWireframeScene
              primaryColor={primaryColor}
              accentColor={accentColor}
              backgroundColor={backgroundColor}
            />
          </div>
        </div>

        <div className="grid flex-1 gap-6 xl:grid-cols-3">
          <div
            ref={activityChartRef}
            className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5"
          >
            <div className="mb-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.workflow.signal.title")}
              </div>
              <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                {t("home.workflow.signal.description")}
              </div>
            </div>
            <div className="h-[200px] sm:h-[220px]">
              <Line data={trendData} options={trendOptions} />
            </div>
          </div>

          <div className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5">
            <div className="mb-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.workflow.files.title")}
              </div>
              <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                {t("home.workflow.files.description")}
              </div>
            </div>
            {languageSummary.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                <div className="flex items-center justify-center">
                  <div className="h-[180px] w-[180px]">
                    <Doughnut data={languageChartData} options={languageChartOptions} />
                  </div>
                </div>
                <div className="grid content-start gap-2">
                  {languageSummary.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 border border-[var(--dash-border)] bg-[var(--dash-panel)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-mono text-[11px] font-bold text-[var(--dash-text)]">
                          {item.label}
                        </div>
                        <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                          {item.value}
                        </div>
                      </div>
                      <div
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyStrip>{t("home.workflow.files.empty")}</EmptyStrip>
            )}
          </div>

          <div
            ref={chartRef}
            className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5"
          >
            <div className="mb-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.workflow.trace.title")}
              </div>
              <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                {t("home.workflow.trace.description")}
              </div>
            </div>
            <div className="h-[200px] sm:h-[220px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5">
          <div className="mb-4 border-b border-[var(--dash-border)] pb-3">
            <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
              {t("home.commandCenter.projects")}
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-3">
            {entries.length > 0 ? (
              entries.map((entry, index) => (
                <button
                  key={entry.path}
                  type="button"
                  className="workflow-entry border border-[var(--dash-border)] bg-[var(--dash-panel)] p-4 text-left transition-colors hover:border-[var(--dash-primary)]"
                  onClick={() =>
                    hasRecentProjects
                      ? hasWorkspace
                        ? onBrowseProject?.()
                        : onOpenWorkspace?.()
                      : onOpenRecentFile?.(entry.path)
                  }
                >
                  <div className="truncate font-mono text-[12px] font-bold text-[var(--dash-text)]">
                    {entry.title}
                  </div>
                  <div className="mt-2 truncate font-mono text-[10px] text-[var(--dash-muted)]">
                    {entry.subtitle}
                  </div>
                  <div
                    className={cn(
                      "mt-3 inline-block border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]",
                      index === 0
                        ? "border-[var(--dash-primary-soft)] text-[var(--dash-primary)]"
                        : "border-[var(--dash-border)] text-[var(--dash-muted)]",
                    )}
                  >
                    {entry.stamp}
                  </div>
                </button>
              ))
            ) : (
              <EmptyStrip>{emptyLabel}</EmptyStrip>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
