import { useI18n } from "@/modules/i18n";
import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut, Radar } from "react-chartjs-2";
import { animate, stagger } from "animejs";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import type { GitHubProfile } from "./homeDashboardData";
import {
  AgentCard,
  EmptyStrip,
  type HomeDashboardAgentStatus,
  ViewHeader,
} from "./HomeDashboardShared";

type Props = {
  readinessScore: number;
  agentRows: HomeDashboardAgentStatus[];
  alerts: string[];
  chartData: ChartData<"doughnut">;
  chartOptions: ChartOptions<"doughnut">;
  githubProfile?: GitHubProfile | null;
};

export function HomeDashboardAgentsView({
  readinessScore,
  agentRows,
  alerts,
  chartData,
  chartOptions,
  githubProfile,
}: Props) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const radarChartRef = useRef<HTMLDivElement>(null);

  const radarSignals = useMemo(
    () => [
      {
        label: t("home.agents.axis.workspace"),
        value: agentRows[0]?.active ? 100 : 24,
      },
      {
        label: t("home.agents.axis.assistant"),
        value: agentRows[1]?.active ? 92 : 28,
      },
      {
        label: t("home.agents.axis.models"),
        value: agentRows[2]?.active ? 100 : 18,
      },
      {
        label: t("home.agents.axis.github"),
        value: githubProfile ? 88 : 20,
      },
      {
        label: t("home.agents.axis.queue"),
        value: Math.max(18, 100 - Math.min(alerts.length, 4) * 18),
      },
    ],
    [agentRows, alerts.length, githubProfile, t],
  );

  const radarChartData = useMemo<ChartData<"radar">>(
    () => ({
      labels: radarSignals.map((signal) => signal.label),
      datasets: [
        {
          label: t("home.agents.performanceSeries"),
          data: radarSignals.map((signal) => signal.value),
          backgroundColor: "rgba(34, 211, 238, 0.18)",
          borderColor: "rgba(34, 211, 238, 0.92)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(249, 115, 22, 0.92)",
          pointBorderColor: "rgba(15, 23, 42, 0.55)",
          pointRadius: 3,
        },
      ],
    }),
    [radarSignals, t],
  );

  const radarChartOptions = useMemo<ChartOptions<"radar">>(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
          pointLabels: {
            color: "rgba(245, 245, 245, 0.68)",
            font: { size: 10, family: "monospace" },
          },
        },
      },
    }),
    [],
  );

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const targets = containerRef.current.querySelectorAll(".agent-entry");
    if (targets.length === 0) return;

    animate(targets, {
      opacity: [0, 1],
      scale: [0.95, 1],
      delay: stagger(120),
      duration: 900,
      ease: "out(3)",
    });
  }, [agentRows, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !progressRef.current) return;

    gsap.fromTo(
      progressRef.current,
      { width: "0%" },
      {
        width: `${readinessScore}%`,
        duration: 1.8,
        ease: "power2.out",
        delay: 0.2,
      },
    );
  }, [readinessScore, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !chartContainerRef.current) return;

    gsap.from(chartContainerRef.current, {
      opacity: 0,
      scale: 0.9,
      duration: 1.4,
      ease: "back.out(1.2)",
      delay: 0.4,
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !radarChartRef.current) return;

    gsap.from(radarChartRef.current, {
      opacity: 0,
      rotate: -10,
      duration: 1.2,
      ease: "power3.out",
      delay: 0.6,
    });
  }, [reducedMotion]);

  return (
    <div ref={containerRef} data-dashboard-view="active" className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewHeader title={t("home.agents.header")} />
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

      <div className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5">
        <div className="mb-3 flex items-end justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--dash-muted)]">
            {t("home.agents.health")}
          </span>
          <span className="font-mono text-[14px] text-[var(--dash-primary)]">
            {readinessScore}%
          </span>
        </div>
        <div className="h-2 overflow-hidden bg-[var(--dash-bg)]">
          <div
            ref={progressRef}
            className="h-full bg-[var(--dash-primary)]"
            style={{ width: `${readinessScore}%` }}
          />
        </div>
      </div>

      <div className="grid flex-1 gap-6">
        <div className="grid gap-4 xl:grid-cols-3">
          {agentRows.map((agent) => (
            <AgentCard
              key={agent.title}
              className="agent-entry"
              title={agent.title}
              status={agent.status}
              body={agent.body}
              active={agent.active}
            />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div
            ref={radarChartRef}
            className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5"
          >
            <div className="mb-4">
              <div className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.agents.performanceMatrix")}
              </div>
              <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                {t("home.agents.performanceDescription")}
              </div>
            </div>
            <div className="flex h-[280px] items-center justify-center sm:h-[320px]">
              <div className="h-full w-full max-w-[320px]">
                <Radar data={radarChartData} options={radarChartOptions} />
              </div>
            </div>
          </div>

          <div className="grid content-start gap-6">
            <div
              ref={chartContainerRef}
              className="flex flex-col items-center justify-center border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5"
            >
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                {t("home.agents.readiness")}
              </div>
              <div className="relative h-56 w-56">
                <Doughnut data={chartData} options={chartOptions} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-project-title text-[46px] leading-none text-[var(--dash-text)]">
                    {readinessScore}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                    {t("home.agents.sync")}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-5">
              <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.agents.priorityQueue")}
              </div>
              {alerts.length > 0 ? (
                <div className="grid max-h-[220px] gap-3 overflow-y-auto">
                  {alerts.map((alert) => (
                    <div
                      key={alert}
                      className="border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] px-4 py-3 font-mono text-[10px] text-[var(--dash-text)]"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyStrip>{t("home.agents.noAlerts")}</EmptyStrip>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
