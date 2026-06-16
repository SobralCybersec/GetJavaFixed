import { Input } from "@/components/ui/input";
import { useI18n } from "@/modules/i18n";
import type { ChartData, ChartOptions } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { animate, stagger } from "animejs";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type {
  GitHubDashboardData,
  GitHubProfile,
  GitHubRepoSummary,
} from "./homeDashboardData";
import {
  EmptyStrip,
  InfoBlock,
  NewsBadge,
  type HomeDashboardEntry,
  UtilityButton,
  ViewHeader,
} from "./HomeDashboardShared";

type CloneTone = "primary" | "cyan";

type Props = {
  alerts: string[];
  branchLabel: string;
  ciCdHealthy: boolean;
  cloneError: string | null;
  cloneLabelTone: CloneTone;
  cloneLogs: string;
  cloneStateLabel: string;
  cloneTargetDir: string | null;
  githubClientId: string;
  githubDashboard: GitHubDashboardData | null;
  githubDashboardError: string | null;
  githubDashboardState: "idle" | "loading" | "ready" | "error";
  githubIdentity: string;
  githubProfile: GitHubProfile | null;
  githubRepoQuery: string;
  githubStatusLabel: string;
  githubSummary: string;
  integrationRows: Array<{ label: string; value: string }>;
  recentScope: HomeDashboardEntry[];
  remoteLabel: string;
  repoCheckerRows: Array<{ label: string; value: string }>;
  onAuthPrimary: () => void;
  onAuthSecondary: () => void;
  onCloneRepository: () => void;
  onGithubClientIdChange: (value: string) => void;
  onOpenScopeEntry: (path: string) => void;
  onRepoQueryChange: (value: string) => void;
  onSearchRepository: () => void;
  primaryAuthLabel: string;
  secondaryAuthLabel: string;
  workspaceLinked: boolean;
};

export function HomeDashboardGithubView({
  alerts,
  branchLabel,
  ciCdHealthy,
  cloneError,
  cloneLabelTone,
  cloneLogs,
  cloneStateLabel,
  cloneTargetDir,
  githubClientId,
  githubDashboard,
  githubDashboardError,
  githubDashboardState,
  githubIdentity,
  githubProfile,
  githubRepoQuery,
  githubStatusLabel,
  githubSummary,
  integrationRows,
  recentScope,
  remoteLabel,
  repoCheckerRows,
  onAuthPrimary,
  onAuthSecondary,
  onCloneRepository,
  onGithubClientIdChange,
  onOpenScopeEntry,
  onRepoQueryChange,
  onSearchRepository,
  primaryAuthLabel,
  secondaryAuthLabel,
  workspaceLinked,
}: Props) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);

  const languageChartData = useMemo<ChartData<"bar">>(() => {
    const languages = githubDashboard?.languages ?? [];
    return {
      labels:
        languages.length > 0
          ? languages.map((item) => item.name)
          : [t("home.github.languages.empty")],
      datasets: [
        {
          label: t("home.github.languages.series"),
          data: languages.length > 0 ? languages.map((item) => item.bytes) : [0],
          backgroundColor:
            languages.length > 0
              ? languages.map((item) => item.color)
              : ["rgba(34, 211, 238, 0.4)"],
          borderColor: "rgba(15, 23, 42, 0.45)",
          borderWidth: 1,
          borderRadius: 3,
          maxBarThickness: 18,
        },
      ],
    };
  }, [githubDashboard, t]);

  const languageChartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y",
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const language = githubDashboard?.languages[context.dataIndex];
              if (!language) return t("home.github.languages.empty");
              return `${formatLanguageBytes(language.bytes)} · ${language.percent.toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: "rgba(148, 163, 184, 0.12)" },
          ticks: {
            color: "rgba(226, 232, 240, 0.8)",
            callback: (value) =>
              typeof value === "number" ? compactNumber(value) : String(value),
          },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: "rgba(226, 232, 240, 0.88)" },
        },
      },
    }),
    [githubDashboard, t],
  );

  const repositoryChartData = useMemo<ChartData<"doughnut">>(() => {
    const repositories = githubDashboard?.topRepositories ?? [];
    return {
      labels:
        repositories.length > 0
          ? repositories.map((repo) => repo.name)
          : [t("home.github.repositories.empty")],
      datasets: [
        {
          data:
            repositories.length > 0
              ? repositories.map((repo) => Math.max(1, repositoryHighlightMetric(repo)))
              : [1],
          backgroundColor:
            repositories.length > 0
              ? repositories.map((repo, index) => repoColor(repo, index))
              : ["rgba(249, 115, 22, 0.45)"],
          borderColor: "rgba(15, 23, 42, 0.48)",
          borderWidth: 1,
        },
      ],
    };
  }, [githubDashboard, t]);

  const repositoryChartOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      cutout: "68%",
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const repo = githubDashboard?.topRepositories[context.dataIndex];
              if (!repo) return t("home.github.repositories.empty");
              return repositoryMetricSummary(repo);
            },
          },
        },
      },
    }),
    [githubDashboard, t],
  );

  useEffect(() => {
    if (reducedMotion || !profileCardRef.current) return;

    gsap.from(profileCardRef.current, {
      opacity: 0,
      y: -18,
      duration: 0.9,
      ease: "power3.out",
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !metricsRef.current) return;

    const tiles = metricsRef.current.querySelectorAll(".metric-tile");
    animate(tiles, {
      opacity: [0, 1],
      translateY: [18, 0],
      delay: stagger(70),
      duration: 650,
      ease: "out(3)",
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !chartRef.current) return;

    gsap.from(chartRef.current, {
      opacity: 0,
      x: 24,
      duration: 1,
      ease: "power2.out",
      delay: 0.2,
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !cardsRef.current) return;

    const cards = cardsRef.current.querySelectorAll(".github-card");
    animate(cards, {
      opacity: [0, 1],
      scale: [0.97, 1],
      translateY: [24, 0],
      delay: stagger(90, { start: 180 }),
      duration: 720,
      ease: "out(3)",
    });
  }, [reducedMotion]);

  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> =
      [];
    for (let index = 0; index < 26; index += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2 + 0.8,
      });
    }

    let animationId = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(34, 211, 238, 0.28)";

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationId);
  }, [reducedMotion]);

  useEffect(() => {
    const mount = sceneRef.current;
    if (!mount || reducedMotion || githubProfile?.avatarUrl) return;

    let renderer: THREE.WebGLRenderer | null = null;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 3;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const githubGlyph = new THREE.Group();
    const torusGeo = new THREE.TorusGeometry(0.6, 0.12, 16, 32);
    const torus = new THREE.Mesh(
      torusGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff6b35,
        transparent: true,
        opacity: 0.72,
        wireframe: true,
      }),
    );
    githubGlyph.add(torus);

    const octaGeo = new THREE.OctahedronGeometry(0.5, 0);
    const octa = new THREE.Mesh(
      octaGeo,
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.48,
        wireframe: true,
      }),
    );
    githubGlyph.add(octa);

    scene.add(githubGlyph);

    const timer = new THREE.Timer();
    timer.connect(document);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer?.setSize(width, height, false);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => resize()) : null;
    resizeObserver?.observe(mount);
    window.addEventListener("resize", resize);
    resize();

    let frameId = 0;
    const draw = (timestamp: number) => {
      if (!renderer) return;
      timer.update(timestamp);
      const delta = timer.getDelta();
      const elapsed = timer.getElapsed();

      githubGlyph.rotation.x += delta * 0.28;
      githubGlyph.rotation.y += delta * 0.46;
      torus.rotation.z += delta * 0.42;
      octa.rotation.y -= delta * 0.58;
      githubGlyph.position.y = Math.sin(elapsed * 1.1) * 0.08;

      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      timer.disconnect();
      timer.dispose();
      torusGeo.dispose();
      octaGeo.dispose();
      (torus.material as THREE.Material).dispose();
      (octa.material as THREE.Material).dispose();
      renderer?.dispose();
      if (renderer?.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [githubProfile?.avatarUrl, reducedMotion]);

  const metricTiles = [
    {
      label: t("home.github.metrics.branch"),
      value: branchLabel,
      tone: "primary" as const,
    },
    {
      label: t("home.github.metrics.remote"),
      value: remoteLabel,
      tone: "cyan" as const,
    },
    {
      label: t("home.github.metrics.repos"),
      value: compactNumber(githubDashboard?.totals.repoCount ?? githubProfile?.publicRepos ?? 0),
      tone: "primary" as const,
    },
    {
      label: t("home.github.metrics.cicd"),
      value: ciCdHealthy ? t("home.github.integration.green") : t("home.github.integration.check"),
      tone: ciCdHealthy ? ("cyan" as const) : ("primary" as const),
    },
  ];

  return (
    <div ref={containerRef} data-dashboard-view="active" className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewHeader title={t("home.github.header")} />
        <div className="flex flex-wrap gap-2">
          <NewsBadge text={githubStatusLabel} tone="primary" />
          {githubDashboard?.languages[0] ? (
            <NewsBadge
              text={`${githubDashboard.languages[0].name} ${githubDashboard.languages[0].percent.toFixed(0)}%`}
              tone="cyan"
            />
          ) : null}
          <NewsBadge
            text={workspaceLinked ? t("home.github.linked") : t("home.github.unlinked")}
            tone="muted"
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <section
          ref={profileCardRef}
          className="github-card relative overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-5"
        >
          <canvas
            ref={particlesRef}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
          />
          <div className="relative z-10 flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center self-center overflow-hidden rounded-full border-4 border-[var(--dash-accent)] bg-[var(--dash-bg)] shadow-[0_0_20px_rgba(34,211,238,0.35)] sm:self-auto">
                {githubProfile?.avatarUrl ? (
                  <img
                    src={githubProfile.avatarUrl}
                    alt={githubProfile.login}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div ref={sceneRef} className="h-full w-full" />
                )}
              </div>

              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="font-project-title text-[26px] uppercase leading-none tracking-[-0.04em] text-[var(--dash-text)] sm:text-[32px]">
                  {githubIdentity}
                </div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-accent)] sm:text-[12px]">
                  {githubStatusLabel}
                </div>
                <div className="mt-3 font-mono text-[11px] leading-6 text-[var(--dash-text-soft)]">
                  {githubSummary}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                  {t("home.github.clientIdLabel")}
                </div>
                <Input
                  value={githubClientId}
                  onChange={(event) => onGithubClientIdChange(event.target.value)}
                  placeholder={t("home.github.clientIdPlaceholder")}
                  className="h-11 rounded-none border-[var(--dash-border)] bg-[var(--dash-bg)] font-mono text-[11px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
                />
                <div className="font-mono text-[10px] leading-5 text-[var(--dash-muted)]">
                  {t("home.github.clientIdHelp")}
                </div>
              </div>

              <div className="grid content-start gap-2">
                <div className="flex flex-wrap gap-2">
                  <NewsBadge
                    text={`${compactNumber(githubDashboard?.totals.repoCount ?? githubProfile?.publicRepos ?? 0)} ${t("home.github.badgeRepos")}`}
                    tone="cyan"
                  />
                  <NewsBadge
                    text={`${compactNumber(githubProfile?.followers ?? 0)} ${t("home.github.badgeFollowers")}`}
                    tone="primary"
                  />
                  <NewsBadge
                    text={`${compactNumber(githubProfile?.following ?? 0)} ${t("home.github.badgeFollowing")}`}
                    tone="muted"
                  />
                </div>

                {githubDashboardError ? (
                  <div className="border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] px-3 py-2 font-mono text-[10px] leading-5 text-[var(--dash-text)]">
                    {githubDashboardError}
                  </div>
                ) : null}
                {cloneTargetDir ? (
                  <div className="border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2 font-mono text-[10px] leading-5 text-[var(--dash-muted)]">
                    {t("home.github.cloneTarget")} {cloneTargetDir}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <UtilityButton onClick={onAuthPrimary}>{primaryAuthLabel}</UtilityButton>
              <UtilityButton onClick={onAuthSecondary}>{secondaryAuthLabel}</UtilityButton>
            </div>
          </div>
        </section>

        <section
          ref={chartRef}
          className="github-card flex min-h-0 flex-col border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.github.languages.title")}
              </div>
              <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                {t("home.github.languages.subtitle")}
              </div>
            </div>
            {githubDashboard ? (
              <NewsBadge
                text={`${compactNumber(githubDashboard.languages.length)} ${t("home.github.languages.count")}`}
                tone="primary"
              />
            ) : null}
          </div>

          {githubDashboardState === "loading" ? (
            <EmptyStrip>{t("home.github.loading")}</EmptyStrip>
          ) : githubDashboard && githubDashboard.languages.length > 0 ? (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="min-h-0">
                <div
                  className="overflow-hidden"
                  style={{
                    height: `${Math.max(
                      240,
                      Math.min(520, githubDashboard.languages.length * 26),
                    )}px`,
                  }}
                >
                  <Bar data={languageChartData} options={languageChartOptions} />
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                <div className="grid gap-2">
                  {githubDashboard.languages.map((language) => (
                    <div
                      key={language.name}
                      className="border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-bold text-[var(--dash-text)]">
                            {language.name}
                          </div>
                          <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                            {t("home.github.languages.repoCount", {
                              count: String(language.repoCount),
                            })}
                          </div>
                        </div>
                        <div
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{ backgroundColor: language.color }}
                        />
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-[var(--dash-muted)]">
                        {formatLanguageBytes(language.bytes)} · {language.percent.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyStrip>{t("home.github.languages.empty")}</EmptyStrip>
          )}
        </section>
      </div>

      <div ref={metricsRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricTiles.map((tile) => (
          <InfoBlock
            key={tile.label}
            className="metric-tile"
            label={tile.label}
            value={tile.value}
            tone={tile.tone}
          />
        ))}
      </div>

      <div ref={cardsRef} className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <section className="github-card flex min-h-0 flex-col border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-5">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
            {t("home.github.repoIntake")}
          </div>

          <div className="grid gap-4">
            <Input
              value={githubRepoQuery}
              onChange={(event) => onRepoQueryChange(event.target.value)}
              placeholder={t("home.github.repoPlaceholder")}
              className="h-11 rounded-none border-[var(--dash-border)] bg-[var(--dash-bg)] font-mono text-[11px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <UtilityButton onClick={onSearchRepository}>{t("home.github.search")}</UtilityButton>
              <UtilityButton onClick={onCloneRepository}>{t("home.github.clone")}</UtilityButton>
            </div>

            <div className="flex flex-wrap gap-2">
              <NewsBadge text={cloneStateLabel} tone={cloneLabelTone} />
              <NewsBadge
                text={ciCdHealthy ? t("home.github.integration.green") : t("home.github.integration.check")}
                tone={ciCdHealthy ? "cyan" : "primary"}
              />
            </div>

            {cloneError ? (
              <div className="border-l-4 border-[var(--dash-primary)] bg-[var(--dash-primary-soft)] px-4 py-3 font-mono text-[10px] leading-5 text-[var(--dash-text)]">
                {cloneError}
              </div>
            ) : null}

            {cloneLogs.trim() ? (
              <div className="max-h-36 overflow-y-auto border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 font-mono text-[10px] leading-5 text-[var(--dash-text-soft)]">
                {cloneLogs}
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              {repoCheckerRows.map((row) => (
                <div
                  key={row.label}
                  className="border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                    {row.label}
                  </div>
                  <div className="mt-1 truncate font-mono text-[11px] text-[var(--dash-text)]">
                    {row.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="grid min-h-0 gap-4">
          <section className="github-card flex min-h-0 flex-col border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                  {t("home.github.repositories.title")}
                </div>
                <div className="font-mono text-[10px] text-[var(--dash-muted)]">
                  {t("home.github.repositories.subtitle")}
                </div>
              </div>
              {githubDashboard?.topRepositories[0] ? (
                <NewsBadge
                  text={githubDashboard.topRepositories[0].name}
                  tone="primary"
                />
              ) : null}
            </div>

            {githubDashboard && githubDashboard.topRepositories.length > 0 ? (
              <div className="grid min-h-0 gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                <div className="h-56">
                  <Doughnut data={repositoryChartData} options={repositoryChartOptions} />
                </div>
                <div className="grid min-h-0 gap-2 overflow-y-auto">
                  {githubDashboard.topRepositories.map((repo) => (
                    <a
                      key={repo.id}
                      className="block border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-3 text-left transition-colors hover:border-[var(--dash-accent)]"
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate font-mono text-[11px] font-bold text-[var(--dash-text)]">
                            {repo.fullName}
                          </div>
                          <div className="truncate font-mono text-[10px] text-[var(--dash-muted)]">
                            {repo.description || repo.language || repo.htmlUrl}
                          </div>
                        </div>
                        <div className="font-mono text-[10px] text-[var(--dash-accent)]">
                          {repositoryMetricSummary(repo)}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyStrip>{t("home.github.repositories.empty")}</EmptyStrip>
            )}
          </section>

          <section className="github-card grid min-h-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex min-h-0 flex-col border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
                {t("home.github.integrations")}
              </div>
              <div className="grid gap-2">
                {integrationRows.map((row) => (
                  <div
                    key={row.label}
                    className="border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 py-2"
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                      {row.label}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-[var(--dash-text)]">
                      {row.value}
                    </div>
                  </div>
                ))}
              </div>
              {alerts.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert}
                      className="border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] px-3 py-2 font-mono text-[10px] leading-5 text-[var(--dash-text)]"
                    >
                      {alert}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex min-h-0 flex-col border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {t("home.github.recentScope")}
              </div>
              <div className="grid min-h-0 gap-3 overflow-y-auto">
                {recentScope.length > 0 ? (
                  recentScope.slice(0, 4).map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      className="group flex items-center gap-3 border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-3 text-left transition-all hover:border-[var(--dash-accent)] hover:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
                      onClick={() => onOpenScopeEntry(entry.path)}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--dash-accent-soft)] font-mono text-[10px] font-bold text-[var(--dash-accent)] transition-transform group-hover:scale-110">
                        {entry.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-[11px] font-bold text-[var(--dash-text)]">
                          {entry.title}
                        </div>
                        <div className="truncate font-mono text-[10px] text-[var(--dash-muted)]">
                          {entry.subtitle}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyStrip>{t("home.github.noRecentScope")}</EmptyStrip>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) < 1000) return String(Math.round(value));
  const formatter = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return formatter.format(value);
}

function formatLanguageBytes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 100 || unitIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[unitIndex]}`;
}

function repositoryHighlightMetric(repo: GitHubRepoSummary): number {
  return repo.stargazers > 0
    ? repo.stargazers
    : repo.forks > 0
      ? repo.forks
      : repo.watchers > 0
        ? repo.watchers
        : 1;
}

function repositoryMetricSummary(repo: GitHubRepoSummary): string {
  if (repo.stargazers > 0) return `★ ${compactNumber(repo.stargazers)}`;
  if (repo.forks > 0) return `Forks ${compactNumber(repo.forks)}`;
  if (repo.watchers > 0) return `Watch ${compactNumber(repo.watchers)}`;
  return repo.language ?? repo.name;
}

function repoColor(repo: GitHubRepoSummary, index: number): string {
  const palette = [
    "#22d3ee",
    "#f97316",
    "#8b5cf6",
    "#ec4899",
    "#84cc16",
    "#38bdf8",
  ];
  if (repo.language) {
    const hash = repo.language
      .split("")
      .reduce((acc, char) => ((acc * 33 + char.charCodeAt(0)) >>> 0), 0);
    return `hsl(${hash % 360} 70% 56%)`;
  }
  return palette[index % palette.length];
}
