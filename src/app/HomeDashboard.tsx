import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isTauriRuntime } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/modules/ai";
import { native } from "@/modules/ai/lib/native";
import { chartAnimation, getDashboardChartTheme } from "@/modules/dashboard/chartSetup";
import { useI18n } from "@/modules/i18n";
import { pickJavaRepoDirectory } from "@/modules/java-intake";
import { useGSAP } from "@gsap/react";
import {
  Clock01Icon,
  FolderOpenIcon,
  GitCompareIcon,
  Search01Icon,
  Github01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { animate, createScope, stagger } from "animejs";
import type { ChartData, ChartOptions } from "chart.js";
import gsap from "gsap";
import { useReducedMotion } from "motion/react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { BongoTerminal } from "./BongoCode/BongoTerminal";
import { HomeDashboardAgentsView } from "./HomeDashboardAgentsView";
import { HomeDashboardGithubView } from "./HomeDashboardGithubView";
import {
  ActionCard,
  EmptyStrip,
  NewsBadge,
  type HomeDashboardAgentStatus,
  UtilityButton,
  ViewHeader,
} from "./HomeDashboardShared";
import { HomeDashboardAnimeView } from "./HomeDashboardAnimeView";
import { HomeDashboardWorkflowView } from "./HomeDashboardWorkflowView";
import {
  PREVIEW_NEWS_ITEMS,
  disconnectGithubSession,
  fetchDashboardNews,
  fetchGithubDashboardData,
  finishGithubDeviceFlow,
  readStoredGithubClientId,
  requestGithubDeviceChallenge,
  restoreGithubSession,
  storeGithubClientId,
  type DashboardNewsItem,
  type GitHubDashboardData,
  type GitHubDeviceChallenge,
  type GitHubProfile,
} from "./homeDashboardData";

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
  onSearchRepository?: (query?: string) => void;
  onOpenAssistant: (prefill?: string) => void;
  onOpenRecentFile?: (path: string) => void;
  onOpenBrowser?: (url: string) => void;
  recentProjectPaths?: string[];
  recentFilePaths?: string[];
  repoStatus?: RepoStatus | null;
};

type DashboardSectionId = "launch" | "workflow" | "agents" | "github" | "anime";
type GitHubFlowState =
  | "idle"
  | "restoring"
  | "requesting"
  | "polling"
  | "connected"
  | "error";
type NewsState = "loading" | "ready" | "fallback";
type CloneState = "idle" | "running" | "done" | "error";
type ResolvedThemeColors = {
  background: string;
  card: string;
  border: string;
  grid: string;
  foreground: string;
  muted: string;
  primary: string;
  accent: string;
};

const RESOLVED_THEME_FALLBACK: ResolvedThemeColors = {
  background: "#050505",
  card: "#111111",
  border: "rgba(148, 163, 184, 0.24)",
  grid: "rgba(148, 163, 184, 0.16)",
  foreground: "#f5f5f5",
  muted: "rgba(245, 245, 245, 0.68)",
  primary: "#f97316",
  accent: "#22d3ee",
};

const dashboardThemeStyle: CSSProperties = {
  ["--dash-bg" as string]: "color-mix(in srgb, var(--background) 96%, var(--card))",
  ["--dash-panel" as string]: "color-mix(in srgb, var(--card) 92%, var(--background))",
  ["--dash-panel-strong" as string]: "color-mix(in srgb, var(--card) 80%, var(--background))",
  ["--dash-border" as string]: "var(--border)",
  ["--dash-border-soft" as string]: "color-mix(in srgb, var(--border) 78%, transparent)",
  ["--dash-primary" as string]: "var(--primary)",
  ["--dash-primary-soft" as string]: "color-mix(in srgb, var(--primary) 18%, var(--background))",
  ["--dash-accent" as string]: "var(--accent)",
  ["--dash-accent-soft" as string]: "color-mix(in srgb, var(--accent) 18%, var(--background))",
  ["--dash-text" as string]: "var(--foreground)",
  ["--dash-text-soft" as string]: "color-mix(in srgb, var(--foreground) 82%, var(--background))",
  ["--dash-muted" as string]: "var(--muted-foreground)",
};

function readResolvedThemeColors(): ResolvedThemeColors {
  if (typeof window === "undefined") return RESOLVED_THEME_FALLBACK;
  const chartTheme = getDashboardChartTheme();
  const styles = window.getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;

  return {
    background: read("--background", chartTheme.surface),
    card: read("--card", chartTheme.surface),
    border: read("--border", chartTheme.border),
    grid: chartTheme.grid,
    foreground: read("--foreground", chartTheme.text),
    muted: read("--muted-foreground", chartTheme.text),
    primary: read("--primary", RESOLVED_THEME_FALLBACK.primary),
    accent: read("--accent", RESOLVED_THEME_FALLBACK.accent),
  };
}

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

function formatTime(value: number, liveFallback: string): string {
  if (!Number.isFinite(value) || value <= 0) return liveFallback;
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
  onOpenBrowser,
  recentProjectPaths = [],
  recentFilePaths = [],
  repoStatus,
}: Props) {
  const { locale, t } = useI18n();
  const sessions = useChatStore((state) => state.sessions);
  const panelOpen = useChatStore((state) => state.panelOpen);
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const heroParallaxRef = useRef<HTMLDivElement | null>(null);
  const githubAbortRef = useRef<AbortController | null>(null);
  const cloneLogOffsetRef = useRef(0);
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const [navIndicatorStyle, setNavIndicatorStyle] = useState({ left: 0, width: 0 });

  const [activeSection, setActiveSection] = useState<DashboardSectionId>("launch");
  const [commandDraft, setCommandDraft] = useState("");
  const [reviewCue, setReviewCue] = useState("");
  const [githubRepoQuery, setGithubRepoQuery] = useState("");
  const [githubClientId, setGithubClientId] = useState(() => readStoredGithubClientId());
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [githubChallenge, setGithubChallenge] = useState<GitHubDeviceChallenge | null>(null);
  const [githubState, setGithubState] = useState<GitHubFlowState>("restoring");
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubDashboard, setGithubDashboard] = useState<GitHubDashboardData | null>(null);
  const [githubDashboardState, setGithubDashboardState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [githubDashboardError, setGithubDashboardError] = useState<string | null>(null);
  const [typedGreeting, setTypedGreeting] = useState("");
  const [newsItems, setNewsItems] = useState<DashboardNewsItem[]>(PREVIEW_NEWS_ITEMS);
  const [newsState, setNewsState] = useState<NewsState>("loading");
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsQuery, setNewsQuery] = useState("");
  const [newsIndex, setNewsIndex] = useState(0);
  const [cloneState, setCloneState] = useState<CloneState>("idle");
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [cloneHandle, setCloneHandle] = useState<number | null>(null);
  const [cloneLogs, setCloneLogs] = useState("");
  const [cloneTargetDir, setCloneTargetDir] = useState<string | null>(null);
  const [resolvedThemeColors, setResolvedThemeColors] = useState<ResolvedThemeColors>(() =>
    readResolvedThemeColors(),
  );
  const deferredNewsQuery = useDeferredValue(newsQuery.trim());

  const activeProjectPath = repoStatus?.path ?? null;
  const sessionRows = sessions.slice(0, 3);
  const workspaceLabel = activeProjectPath
    ? basename(activeProjectPath)
    : t("home.commandCenter.status.offline");
  const branchLabel = repoStatus?.previewOnly
    ? t("home.commandCenter.status.preview")
    : repoStatus?.branch ?? t("home.commandCenter.status.offline");
  const remoteTotal = (repoStatus?.ahead ?? 0) + (repoStatus?.behind ?? 0);
  const remoteLabel = repoStatus?.upstream
    ? remoteTotal === 0
      ? t("home.commandCenter.status.clean")
      : `+${repoStatus?.ahead ?? 0} / -${repoStatus?.behind ?? 0}`
    : t("home.commandCenter.status.clean");
  const assistantStatus = panelOpen
    ? t("home.commandCenter.status.open")
    : sessionRows.length > 0
      ? t("home.commandCenter.status.ready")
      : t("home.commandCenter.status.noSession");
  const preferredNewsLanguage: DashboardNewsItem["language"] = locale.startsWith("pt")
    ? "pt"
    : "en";

  const alerts = useMemo(() => {
    const next: string[] = [];
    if (!hasWorkspace) next.push(t("home.commandCenter.alert.noWorkspace"));
    if (!hasModelAccess) next.push(t("home.commandCenter.alert.noModel"));
    if (repoStatus?.previewOnly) next.push(t("home.commandCenter.alert.preview"));
    if ((repoStatus?.behind ?? 0) > 0) {
      next.push(
        t("home.commandCenter.alert.behind", {
          count: String(repoStatus?.behind ?? 0),
        }),
      );
    }
    if ((repoStatus?.changedCount ?? 0) > 0) {
      next.push(
        t("home.commandCenter.alert.changes", {
          count: String(repoStatus?.changedCount ?? 0),
        }),
      );
    }
    return next.length > 0 ? next : [t("home.commandCenter.alert.clear")];
  }, [
    hasModelAccess,
    hasWorkspace,
    repoStatus?.behind,
    repoStatus?.changedCount,
    repoStatus?.previewOnly,
    t,
  ]);

  const recentProjects = useMemo(
    () =>
      recentProjectPaths.slice(0, 3).map((path, index) => ({
        path,
        title: basename(path),
        subtitle:
          index === 0 && repoStatus?.branch
            ? `${t("home.commandCenter.status.branch")}: ${repoStatus.branch}`
            : compactPath(path, 4),
        stamp:
          activeProjectPath === path
            ? t("home.commandCenter.project.current")
            : t("home.commandCenter.project.known"),
      })),
    [activeProjectPath, recentProjectPaths, repoStatus?.branch, t],
  );

  const workflowEntries = useMemo(() => {
    if (recentProjects.length > 0) return recentProjects;
    return recentFilePaths.slice(0, 3).map((path) => ({
      path,
      title: basename(path),
      subtitle: compactPath(path, 4),
      stamp: t("home.commandCenter.recentFiles"),
    }));
  }, [recentFilePaths, recentProjects, t]);

  const telemetryItems = useMemo(
    () => [
      {
        label: t("home.commandCenter.metric.files"),
        value: recentFilePaths.length,
        color: resolvedThemeColors.accent,
      },
      {
        label: t("home.commandCenter.metric.changes"),
        value: repoStatus?.changedCount ?? 0,
        color: resolvedThemeColors.primary,
      },
      {
        label: t("home.commandCenter.metric.sessions"),
        value: sessions.length,
        color: resolvedThemeColors.foreground,
      },
      {
        label: t("home.commandCenter.metric.sync"),
        value: remoteTotal,
        color: resolvedThemeColors.muted,
      },
    ],
    [
      recentFilePaths.length,
      remoteTotal,
      repoStatus?.changedCount,
      resolvedThemeColors.accent,
      resolvedThemeColors.foreground,
      resolvedThemeColors.muted,
      resolvedThemeColors.primary,
      sessions.length,
      t,
    ],
  );

  const workflowChartData = useMemo<ChartData<"bar">>(
    () => ({
      labels: telemetryItems.map((item) => item.label),
      datasets: [
        {
          label: "Workflow Trace",
          data: telemetryItems.map((item) => item.value),
          backgroundColor: telemetryItems.map((item) => item.color),
          borderColor: resolvedThemeColors.border,
          borderWidth: 1,
        },
      ],
    }),
    [resolvedThemeColors.border, telemetryItems],
  );

  const workflowChartOptions = useMemo<ChartOptions<"bar">>(
    () => ({
      indexAxis: "y",
      maintainAspectRatio: false,
      responsive: true,
      animation: chartAnimation(reducedMotion),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: resolvedThemeColors.background,
          borderColor: resolvedThemeColors.primary,
          borderWidth: 1,
          bodyColor: resolvedThemeColors.foreground,
          displayColors: false,
          titleColor: resolvedThemeColors.foreground,
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: resolvedThemeColors.grid },
          ticks: { color: resolvedThemeColors.muted, precision: 0 },
        },
        y: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: resolvedThemeColors.foreground },
        },
      },
    }),
    [reducedMotion, resolvedThemeColors],
  );

  const workflowTrendData = useMemo<ChartData<"line">>(
    () => ({
      labels: telemetryItems.map((item) => item.label),
      datasets: [
        {
          label: t("home.workflow.signal.series"),
          data: telemetryItems.map((item) => item.value),
          borderColor: resolvedThemeColors.primary,
          backgroundColor: `${resolvedThemeColors.primary}22`,
          fill: true,
          tension: 0.34,
          pointBackgroundColor: resolvedThemeColors.accent,
          pointBorderColor: resolvedThemeColors.background,
          pointBorderWidth: 1,
          pointRadius: 3,
        },
      ],
    }),
    [
      resolvedThemeColors.accent,
      resolvedThemeColors.background,
      resolvedThemeColors.primary,
      telemetryItems,
      t,
    ],
  );

  const workflowTrendOptions = useMemo<ChartOptions<"line">>(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      animation: chartAnimation(reducedMotion),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: resolvedThemeColors.background,
          borderColor: resolvedThemeColors.primary,
          borderWidth: 1,
          bodyColor: resolvedThemeColors.foreground,
          displayColors: false,
          titleColor: resolvedThemeColors.foreground,
        },
      },
      scales: {
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { color: resolvedThemeColors.muted },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          grid: { color: resolvedThemeColors.grid },
          ticks: { color: resolvedThemeColors.muted, precision: 0 },
        },
      },
    }),
    [reducedMotion, resolvedThemeColors],
  );

  const workflowLanguageSummary = useMemo(
    () => buildWorkflowLanguageSummary(recentFilePaths, githubDashboard).slice(0, 6),
    [githubDashboard, recentFilePaths],
  );

  const workflowLanguageChartData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels:
        workflowLanguageSummary.length > 0
          ? workflowLanguageSummary.map((item) => item.label)
          : [t("home.workflow.files.empty")],
      datasets: [
        {
          data:
            workflowLanguageSummary.length > 0
              ? workflowLanguageSummary.map((item) => item.value)
              : [1],
          backgroundColor:
            workflowLanguageSummary.length > 0
              ? workflowLanguageSummary.map((item) => item.color)
              : [resolvedThemeColors.border],
          borderColor: resolvedThemeColors.background,
          borderWidth: 1,
        },
      ],
    }),
    [
      resolvedThemeColors.background,
      resolvedThemeColors.border,
      t,
      workflowLanguageSummary,
    ],
  );

  const workflowLanguageChartOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      cutout: "66%",
      animation: chartAnimation(reducedMotion),
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) =>
              t("home.workflow.files.count", {
                count: String(context.raw ?? 0),
              }),
          },
        },
      },
    }),
    [reducedMotion, t],
  );

  const readinessScore = useMemo(() => {
    let total = 0;
    total += hasWorkspace ? 24 : 8;
    total += hasModelAccess ? 24 : 6;
    total += sessionRows.length > 0 ? 18 : 8;
    total += repoStatus?.branch ? 10 : 4;
    total += (repoStatus?.behind ?? 0) === 0 ? 12 : 4;
    total += (repoStatus?.changedCount ?? 0) === 0 ? 12 : 6;
    return Math.max(12, Math.min(96, total));
  }, [
    hasModelAccess,
    hasWorkspace,
    repoStatus?.behind,
    repoStatus?.branch,
    repoStatus?.changedCount,
    sessionRows.length,
  ]);

  const agentChartData = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: ["Ready", "Attention"],
      datasets: [
        {
          data: [readinessScore, 100 - readinessScore],
          backgroundColor: [resolvedThemeColors.primary, resolvedThemeColors.card],
          borderColor: [resolvedThemeColors.primary, resolvedThemeColors.border],
          borderWidth: 1,
          hoverOffset: 4,
        },
      ],
    }),
    [readinessScore, resolvedThemeColors.border, resolvedThemeColors.card, resolvedThemeColors.primary],
  );

  const agentChartOptions = useMemo<ChartOptions<"doughnut">>(
    () => ({
      maintainAspectRatio: false,
      responsive: true,
      cutout: "72%",
      animation: chartAnimation(reducedMotion),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: resolvedThemeColors.background,
          borderColor: resolvedThemeColors.primary,
          borderWidth: 1,
          bodyColor: resolvedThemeColors.foreground,
          displayColors: false,
          titleColor: resolvedThemeColors.foreground,
        },
      },
    }),
    [reducedMotion, resolvedThemeColors],
  );

  const navTabs = useMemo(
    () => [
      { id: "launch" as const, label: t("home.tabs.launch").toUpperCase() },
      { id: "workflow" as const, label: t("home.tabs.workflow").toUpperCase() },
      { id: "agents" as const, label: t("home.tabs.agents").toUpperCase() },
      { id: "github" as const, label: t("home.tabs.github").toUpperCase() },
      { id: "anime" as const, label: t("home.tabs.anime").toUpperCase() },
    ],
    [t],
  );

  const githubUserLabel = githubProfile?.login ?? t("home.github.userFallback");
  const githubStatusLabel = githubProfile
    ? t("home.github.status.connected")
    : githubState === "polling"
      ? t("home.github.status.verifyDevice")
      : githubState === "requesting"
        ? t("home.github.status.requesting")
        : githubState === "restoring"
          ? t("home.github.status.restoring")
          : githubError
            ? t("home.github.status.error")
      : t("home.github.status.idle");
  const githubIdentity =
    githubProfile?.name || githubProfile?.login || t("home.github.identityFallback");
  const greetingTarget = t("home.github.greeting", { user: githubUserLabel });
  const githubHeroSummary = githubProfile?.bio
    ? githubProfile.bio
    : githubChallenge
      ? t("home.github.challengePrompt", { code: githubChallenge.userCode })
      : "";
  const githubScopeSummary = githubHeroSummary || t("home.github.summary");
  const githubHeroBadges = githubProfile
    ? [
        `${githubDashboard?.totals.repoCount ?? githubProfile.publicRepos} ${t("home.github.badgeRepos")}`,
        `${githubProfile.followers} ${t("home.github.badgeFollowers")}`,
        `${githubProfile.following} ${t("home.github.badgeFollowing")}`,
      ]
    : [];
  const githubIntegrationRows = useMemo(
    () => [
      {
        label: t("home.github.integration.oauth"),
        value: githubProfile
          ? t("home.github.integration.connected")
          : githubState === "polling"
            ? t("home.github.integration.pending")
            : t("home.github.integration.idle"),
      },
      {
        label: t("home.github.integration.repoSearch"),
        value: hasWorkspace
          ? t("home.github.integration.workspace")
          : t("home.github.integration.web"),
      },
      {
        label: t("home.github.integration.desktopClone"),
        value: isTauriRuntime
          ? t("home.github.integration.ready")
          : t("home.github.integration.browser"),
      },
      {
        label: t("home.github.integration.cicd"),
        value:
          (repoStatus?.behind ?? 0) === 0
            ? t("home.github.integration.green")
            : t("home.github.integration.check"),
      },
    ],
    [githubProfile, githubState, hasWorkspace, repoStatus?.behind, t],
  );
  const repoCheckerRows = useMemo(
    () => [
      { label: t("home.github.repo.head"), value: branchLabel },
      {
        label: t("home.github.repo.remote"),
        value: repoStatus?.upstream ?? t("home.github.repo.noUpstream"),
      },
      { label: t("home.github.repo.sync"), value: remoteLabel },
      {
        label: t("home.github.repo.mode"),
        value: repoStatus?.isDetached
          ? t("home.github.repo.detached")
          : repoStatus?.previewOnly
            ? t("home.commandCenter.status.preview")
            : t("home.github.repo.tracked"),
      },
    ],
    [branchLabel, remoteLabel, repoStatus?.isDetached, repoStatus?.previewOnly, repoStatus?.upstream, t],
  );
  const agentRows = useMemo<HomeDashboardAgentStatus[]>(
    () => [
      {
        title: t("home.agents.agentAlpha"),
        status: hasWorkspace
          ? t("home.agents.status.tracking")
          : t("home.agents.status.offline"),
        body: `${t("home.commandCenter.status.workspace")}: ${workspaceLabel}`,
        active: hasWorkspace,
      },
      {
        title: t("home.agents.agentBeta"),
        status:
          sessionRows.length > 0
            ? t("home.agents.status.active")
            : t("home.agents.status.idle"),
        body: `${t("home.commandCenter.status.assistant")}: ${assistantStatus}`,
        active: sessionRows.length > 0,
      },
      {
        title: t("home.agents.agentGamma"),
        status:
          hasModelAccess
            ? t("home.agents.status.ready")
            : t("home.agents.status.locked"),
        body: `${t("home.javaRefactor")}: ${
          hasModelAccess
            ? t("home.commandCenter.refactorDescription")
            : t("home.commandCenter.alert.noModel")
        }`,
        active: hasModelAccess,
      },
    ],
    [assistantStatus, hasModelAccess, hasWorkspace, sessionRows.length, t, workspaceLabel],
  );
  const recentScopeEntries = workflowEntries.slice(0, 4);
  const openScopeEntry = (path: string) => {
    if (recentProjects.length > 0) {
      if (hasWorkspace) {
        onBrowseProject?.();
        return;
      }
      onOpenWorkspace?.();
      return;
    }
    onOpenRecentFile?.(path);
  };
  const githubPrimaryActionLabel = githubProfile
    ? t("home.github.action.refreshProfile")
    : t("home.github.action.connect");
  const githubSecondaryActionLabel = githubProfile
    ? t("home.github.action.disconnect")
    : t("home.github.action.openDevice");
  const cloneStateLabel =
    cloneState === "running"
      ? t("home.github.cloneState.running")
      : cloneState === "done"
        ? t("home.github.cloneState.done")
        : cloneState === "error"
          ? t("home.github.cloneState.error")
          : t("home.github.cloneState.idle");

  const mediaCue = reviewCue.trim();
  const mediaLabel = mediaCue
    ? mediaCue.toUpperCase().slice(0, 32)
    : t("home.media.labelFallback");
  const mediaProgress = Math.max(22, Math.min(96, 24 + mediaCue.length * 4));
  const streamEntries = workflowEntries.slice(0, 2);

  const filteredNews = useMemo(
    () =>
      newsItems.filter(
        (item) =>
          item.language === preferredNewsLanguage &&
          matchesNewsQuery(item, deferredNewsQuery),
      ),
    [deferredNewsQuery, newsItems, preferredNewsLanguage],
  );
  const activeNews =
    filteredNews.length > 0 ? filteredNews[newsIndex % filteredNews.length] : null;
  const newsStatusLabel =
    newsState === "loading"
      ? t("home.news.status.sync")
      : newsState === "fallback"
        ? t("home.news.status.fallback")
        : t("home.news.status.live", { count: String(filteredNews.length) });

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from("[data-dash-stagger='header']", {
        y: 20,
        opacity: 0,
        duration: 0.72,
        ease: "power3.out",
      });
      gsap.from("[data-dash-stagger='panel']", {
        y: 24,
        opacity: 0,
        duration: 0.78,
        stagger: 0.08,
        ease: "power3.out",
        delay: 0.08,
      });
    },
    { scope: rootRef, dependencies: [reducedMotion], revertOnUpdate: true },
  );

  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.from("[data-dashboard-view='active']", {
        x: 14,
        opacity: 0,
        duration: 0.28,
        ease: "power2.out",
      });
    },
    { scope: rootRef, dependencies: [activeSection, reducedMotion], revertOnUpdate: true },
  );

  useEffect(() => {
    if (reducedMotion || !rootRef.current) return;
    const scope = createScope({ root: rootRef.current }).add(() => {
      const targetSelector =
        activeSection === "workflow"
          ? ".workflow-entry"
          : activeSection === "agents"
            ? ".agent-entry"
            : ".launch-entry";
      const targets = rootRef.current?.querySelectorAll<HTMLElement>(targetSelector) ?? [];
      if (targets.length === 0) return;

      animate(targets, {
        opacity: [0, 1],
        translateY: [18, 0],
        delay: stagger(70),
        duration: 720,
        ease: "out(3)",
      });
    });

    return () => scope.revert();
  }, [activeSection, reducedMotion]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setResolvedThemeColors(readResolvedThemeColors());
    update();

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await restoreGithubSession();
        if (cancelled) return;
        setGithubProfile(profile);
        setGithubState(profile ? "connected" : "idle");
        setGithubError(null);
      } catch (error) {
        if (cancelled) return;
        setGithubError(getErrorMessage(error));
        setGithubState("error");
      }
    })();

    return () => {
      cancelled = true;
      githubAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    storeGithubClientId(githubClientId);
  }, [githubClientId]);

  useEffect(() => {
    let cancelled = false;

    if (!githubProfile) {
      setGithubDashboard(null);
      setGithubDashboardError(null);
      setGithubDashboardState("idle");
      return () => {
        cancelled = true;
      };
    }

    setGithubDashboardState("loading");
    setGithubDashboardError(null);
    void (async () => {
      try {
        const next = await fetchGithubDashboardData();
        if (cancelled) return;
        setGithubDashboard(next);
        setGithubDashboardState(next ? "ready" : "idle");
      } catch (error) {
        if (cancelled) return;
        setGithubDashboard(null);
        setGithubDashboardError(getErrorMessage(error));
        setGithubDashboardState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [githubProfile]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const items = await fetchDashboardNews();
        if (cancelled) return;
        setNewsItems(items);
        setNewsState(items.some((item) => item.id.startsWith("preview:")) ? "fallback" : "ready");
        setNewsError(null);
      } catch (error) {
        if (cancelled) return;
        setNewsItems(PREVIEW_NEWS_ITEMS);
        setNewsState("fallback");
        setNewsError(getErrorMessage(error));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let index = 0;
    setTypedGreeting("");

    const tick = () => {
      index += 1;
      setTypedGreeting(greetingTarget.slice(0, index));
      if (index < greetingTarget.length) {
        frame = window.setTimeout(tick, 42);
      }
    };

    frame = window.setTimeout(tick, 90);
    return () => {
      window.clearTimeout(frame);
    };
  }, [greetingTarget]);

  useEffect(() => {
    if (cloneHandle === null) return;

    let cancelled = false;
    let timer = 0;

    const pollLogs = async () => {
      try {
        const next = await native.shellBgLogs(cloneHandle, cloneLogOffsetRef.current);
        if (cancelled) return;

        cloneLogOffsetRef.current = next.next_offset;
        if (next.bytes) {
          setCloneLogs((current) => `${current}${next.bytes}`.slice(-5000));
        }

        if (next.exited) {
          setCloneState(next.exit_code === 0 ? "done" : "error");
          if (next.exit_code !== 0) {
            setCloneError(
              t("home.github.cloneFailed", {
                code: String(next.exit_code ?? t("home.github.cloneUnknownCode")),
              }),
            );
          }
          setCloneHandle(null);
          return;
        }

        timer = window.setTimeout(pollLogs, 700);
      } catch (error) {
        if (cancelled) return;
        setCloneError(getErrorMessage(error));
        setCloneState("error");
        setCloneHandle(null);
      }
    };

    void pollLogs();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cloneHandle, t]);

  useEffect(() => {
    if (!navContainerRef.current) return;
    const updateIndicator = () => {
      const container = navContainerRef.current;
      if (!container) return;
      const buttons = container.querySelectorAll('button');
      const activeIndex = navTabs.findIndex(t => t.id === activeSection);
      const activeButton = buttons[activeIndex];
      if (activeButton) {
        const containerRect = container.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        setNavIndicatorStyle({
          left: buttonRect.left - containerRect.left,
          width: buttonRect.width,
        });
      }
    };
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [activeSection, navTabs]);

  useEffect(() => {
    setNewsIndex(0);
  }, [deferredNewsQuery]);

  useEffect(() => {
    if (filteredNews.length === 0) {
      setNewsIndex(0);
      return;
    }
    if (newsIndex >= filteredNews.length) {
      setNewsIndex(0);
    }
  }, [filteredNews.length, newsIndex]);

  const handleHeroMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !heroParallaxRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    gsap.to(heroParallaxRef.current, {
      x: x * 18,
      y: y * 18,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const handleHeroLeave = () => {
    if (reducedMotion || !heroParallaxRef.current) return;
    gsap.to(heroParallaxRef.current, {
      x: 0,
      y: 0,
      duration: 0.4,
      ease: "power2.out",
    });
  };

  const openInDashboardBrowser = (url?: string | null) => {
    if (!url) return;
    if (onOpenBrowser) {
      onOpenBrowser(url);
      return;
    }
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleGithubConnect = async () => {
    const trimmedClientId = githubClientId.trim();
    if (!trimmedClientId) {
      setGithubError(t("home.github.clientIdMissing"));
      setGithubState("error");
      return;
    }

    storeGithubClientId(trimmedClientId);
    githubAbortRef.current?.abort();
    githubAbortRef.current = null;
    setGithubError(null);
    setGithubChallenge(null);
    setGithubState("requesting");

    let controller: AbortController | null = null;
    try {
      const challenge = await requestGithubDeviceChallenge(trimmedClientId);
      setGithubChallenge(challenge);
      openInDashboardBrowser(challenge.verificationUri);

      controller = new AbortController();
      githubAbortRef.current = controller;
      setGithubState("polling");

      const profile = await finishGithubDeviceFlow(
        trimmedClientId,
        challenge,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setGithubProfile(profile);
      setGithubChallenge(null);
      setGithubError(null);
      setGithubState("connected");
    } catch (error) {
      if (isAbortError(error)) {
        setGithubState(githubProfile ? "connected" : "idle");
        return;
      }
      setGithubError(getErrorMessage(error));
      setGithubState("error");
    } finally {
      if (controller && githubAbortRef.current === controller) {
        githubAbortRef.current = null;
      }
    }
  };

  const handleGithubRefresh = async () => {
    setGithubError(null);
    setGithubState("restoring");
    try {
      const profile = await restoreGithubSession();
      setGithubProfile(profile);
      setGithubState(profile ? "connected" : "idle");
      if (!profile) {
        setGithubError(t("home.github.noStoredSession"));
      }
    } catch (error) {
      setGithubError(getErrorMessage(error));
      setGithubState("error");
    }
  };

  const handleGithubCancel = () => {
    githubAbortRef.current?.abort();
    githubAbortRef.current = null;
    setGithubChallenge(null);
    setGithubState(githubProfile ? "connected" : "idle");
  };

  const handleGithubDisconnect = async () => {
    githubAbortRef.current?.abort();
    githubAbortRef.current = null;
    await disconnectGithubSession();
    setGithubChallenge(null);
    setGithubProfile(null);
    setGithubError(null);
    setGithubState("idle");
  };

  const handleGithubRelayAction = () => {
    if (githubProfile) {
      void handleGithubRefresh();
      return;
    }
    void handleGithubConnect();
  };

  const handleMediaSearch = () => {
    if (hasWorkspace) {
      onSearchRepository?.(mediaCue || undefined);
      return;
    }
    onOpenWorkspace?.();
  };

  const handleMediaReview = () => {
    onOpenAssistant(mediaCue || t("home.commandCenter.prompt.inspectBody"));
  };

  const handleNewsRefresh = async () => {
    setNewsState("loading");
    setNewsError(null);
    try {
      const items = await fetchDashboardNews();
      setNewsItems(items);
      setNewsState(items.some((item) => item.id.startsWith("preview:")) ? "fallback" : "ready");
    } catch (error) {
      setNewsItems(PREVIEW_NEWS_ITEMS);
      setNewsState("fallback");
      setNewsError(getErrorMessage(error));
    }
  };

  const handleRotateNews = () => {
    if (filteredNews.length <= 1) return;
    setNewsIndex((current) => (current + 1) % filteredNews.length);
  };

  const handleGitHubSearch = () => {
    if (!githubRepoQuery.trim()) return;
    if (hasWorkspace) {
      onSearchRepository?.(githubRepoQuery.trim());
      return;
    }
    onOpenBrowser?.(`https://github.com/search?q=${encodeURIComponent(githubRepoQuery.trim())}`);
  };

  const handleCloneRepository = async () => {
    const repoUrl = parseGithubCloneUrl(githubRepoQuery);
    if (!repoUrl) {
      setCloneError(t("home.github.cloneInvalidRepo"));
      setCloneState("error");
      return;
    }
    if (!isTauriRuntime) {
      setCloneError(t("home.github.cloneDesktopOnly"));
      setCloneState("error");
      return;
    }

    const targetDir = await pickJavaRepoDirectory(t("home.github.cloneTargetPicker"));
    if (!targetDir) return;

    setCloneState("running");
    setCloneError(null);
    setCloneLogs("");
    setCloneTargetDir(targetDir);
    cloneLogOffsetRef.current = 0;

    try {
      const handle = await native.shellBgSpawn(`git clone "${repoUrl}"`, targetDir);
      setCloneHandle(handle);
    } catch (error) {
      setCloneError(getErrorMessage(error));
      setCloneState("error");
    }
  };

  return (
    <div
      ref={rootRef}
      style={dashboardThemeStyle}
      className="relative flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-[var(--dash-bg)] px-4 py-4 text-[var(--dash-text)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(color-mix(in_srgb,var(--dash-text)_10%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--dash-text)_10%,transparent)_1px,transparent_1px)] [background-size:32px_32px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--dash-accent)_12%,transparent),transparent_22%),radial-gradient(circle_at_bottom_left,color-mix(in_srgb,var(--dash-primary)_14%,transparent),transparent_24%)]"
      />

      <header
        data-dash-stagger="header"
        className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-[var(--dash-border)] pb-3"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
          <div className="font-project-title text-[24px] uppercase leading-none tracking-[-0.05em] text-[var(--dash-primary)] [text-shadow:0_0_10px_color-mix(in_srgb,var(--dash-primary)_28%,transparent)]">
            Anime<span className="text-[var(--dash-text)]">Assistant</span>
          </div>
          <nav ref={navContainerRef} className="relative flex flex-1 items-center justify-between gap-0 pb-1">
            <div 
              className="absolute bottom-0 h-0.5 bg-[var(--dash-primary)] shadow-[0_0_8px_var(--dash-primary)] transition-all duration-[400ms] ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]"
              style={{
                left: `${navIndicatorStyle.left}px`,
                width: `${navIndicatorStyle.width}px`,
              }}
            />
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={cn(
                  "relative flex-1 px-4 py-1 text-[12px] font-semibold tracking-[0.18em] transition-all",
                  activeSection === tab.id
                    ? "text-[var(--dash-primary)] font-bold"
                    : "text-[var(--dash-muted)] hover:text-[var(--dash-primary)]",
                )}
              >
                <span className="relative z-10">{tab.label}</span>
                {activeSection === tab.id && (
                  <div className="absolute inset-0 opacity-100 transition-opacity duration-300">
                    <div className="absolute left-0 top-0 h-1 w-1 border-l border-t border-[var(--dash-primary)]" />
                    <div className="absolute right-0 top-0 h-1 w-1 border-r border-t border-[var(--dash-primary)]" />
                    <div className="absolute bottom-0 left-0 h-1 w-1 border-b border-l border-[var(--dash-primary)]" />
                    <div className="absolute bottom-0 right-0 h-1 w-1 border-b border-r border-[var(--dash-primary)]" />
                  </div>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeSection === "launch" ? (
        <div className="relative z-10 mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,0.45fr)_minmax(320px,0.37fr)_minmax(200px,0.18fr)] lg:overflow-hidden">
        <div className="flex min-h-0 flex-col gap-4" data-dash-stagger="panel">
          <section
            className="relative flex min-h-[420px] flex-[3] overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel)]"
            onPointerMove={handleHeroMove}
            onPointerLeave={handleHeroLeave}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dash-bg)] to-transparent opacity-90" />
            <div
              className="absolute inset-4 overflow-hidden border border-[var(--dash-border-soft)] bg-[color-mix(in_srgb,var(--dash-bg)_46%,transparent)]"
              style={heroMaskStyle}
            >
              <div
                ref={heroParallaxRef}
                className="absolute inset-0"
              />
              {githubProfile?.avatarUrl ? (
                <img
                  src={githubProfile.avatarUrl}
                  alt={githubProfile.login}
                  className="absolute inset-0 h-full w-full scale-[1.45] object-cover opacity-60 blur-[2px]"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,var(--dash-primary-soft),transparent_30%),radial-gradient(circle_at_70%_68%,var(--dash-accent-soft),transparent_34%),linear-gradient(135deg,color-mix(in_srgb,var(--dash-primary)_14%,transparent),transparent_58%)]" />
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,color-mix(in_srgb,var(--dash-bg)_52%,transparent)_100%)]" />
              <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(color-mix(in_srgb,var(--dash-text)_22%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--dash-text)_22%,transparent)_1px,transparent_1px)] [background-size:28px_28px]" />
            </div>

            <div className="absolute left-4 top-4 z-10">
              <button
                type="button"
                onClick={handleGithubRelayAction}
                className="inline-flex items-center justify-center border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] p-2.5 transition-colors hover:border-[var(--dash-accent)]"
              >
                <HugeiconsIcon icon={Github01Icon} className="h-5 w-5 text-[var(--dash-primary)] transition-colors hover:text-[var(--dash-accent)]" />
              </button>
            </div>

            <div className="absolute right-4 top-4 z-10 flex w-full max-w-[360px] flex-col gap-2">
              {githubChallenge ? (
                <div className="border border-[var(--dash-accent-soft)] bg-[var(--dash-accent-soft)] px-3 py-2 font-mono text-[10px] leading-5 text-[var(--dash-text)]">
                  CODE: {githubChallenge.userCode}
                  <button
                    type="button"
                    onClick={handleGithubCancel}
                    className="ml-3 border border-[var(--dash-border)] px-2 py-1 uppercase tracking-[0.16em] text-[var(--dash-text)] transition-colors hover:border-[var(--dash-accent)] hover:text-[var(--dash-accent)]"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              {githubError ? (
                <div className="border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] px-3 py-2 font-mono text-[10px] leading-5 text-[var(--dash-text)]">
                  {githubError}
                </div>
              ) : null}
            </div>

            <div className="absolute bottom-4 left-4 z-10 max-w-[420px] space-y-4">
              <div className="font-project-title text-[42px] uppercase leading-none tracking-[-0.05em] text-[var(--dash-text)]">
                {typedGreeting}
              </div>
              {githubHeroSummary ? (
                <div className="max-w-[320px] font-mono text-[11px] leading-6 text-[var(--dash-text-soft)]">
                  {githubHeroSummary}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <NewsBadge text={githubStatusLabel} tone="primary" />
                {githubHeroBadges.map((badge) => (
                  <NewsBadge
                    key={badge}
                    text={badge}
                    tone="muted"
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="flex min-h-[220px] flex-[2] flex-col border border-[var(--dash-border)] bg-[var(--dash-panel)] p-4"
            data-dash-stagger="panel"
          >
            <div className="flex items-center justify-between border-b border-[var(--dash-border)] pb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--dash-muted)]">
                {t("home.media.header")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
                {branchLabel}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-4 border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-3">
              <button
                type="button"
                onClick={handleMediaSearch}
                className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--dash-primary-soft)] bg-[var(--dash-bg)]"
              >
                <div className="absolute inset-0 rounded-full border-2 border-[var(--dash-primary)] border-t-transparent animate-spin [animation-duration:3s]" />
                <span className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--dash-primary)] transition-transform group-hover:scale-110">
                  GO
                </span>
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-[12px] font-bold text-[var(--dash-text)]">
                  {mediaLabel}
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--dash-muted)]">
                  {hasWorkspace
                    ? t("home.media.workspaceReady", { remote: remoteLabel })
                    : t("home.media.workspaceMissing")}
                </div>
                <div className="mt-3 h-1 w-full bg-[var(--dash-bg)]">
                  <div
                    className="h-full bg-[linear-gradient(90deg,var(--dash-primary)_0%,var(--dash-accent)_55%,var(--dash-primary)_100%)]"
                    style={{ width: `${mediaProgress}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Input
                value={reviewCue}
                onChange={(event) => setReviewCue(event.target.value)}
                placeholder={t("home.media.searchPlaceholder")}
                className="h-10 rounded-none border-[var(--dash-border)] bg-[var(--dash-panel-strong)] font-mono text-[11px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <UtilityButton onClick={handleMediaSearch}>
                {hasWorkspace ? t("home.media.searchAction") : t("header.openWorkspace")}
              </UtilityButton>
              <UtilityButton onClick={handleMediaReview}>
                {t("home.media.reviewAction")}
              </UtilityButton>
            </div>

            <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
              {streamEntries.length > 0 ? (
                streamEntries.map((project) => (
                  <button
                    key={project.path}
                    type="button"
                    className="launch-entry flex items-center justify-between gap-3 border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] px-3 py-3 text-left transition-colors hover:border-[var(--dash-accent)]"
                    onClick={() =>
                      recentProjects.length > 0
                        ? hasWorkspace
                          ? onBrowseProject?.()
                          : onOpenWorkspace?.()
                        : onOpenRecentFile?.(project.path)
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12px] font-bold text-[var(--dash-text)]">
                        {project.title}
                      </span>
                      <span className="block truncate font-mono text-[10px] text-[var(--dash-muted)]">
                        {project.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 border border-[var(--dash-primary-soft)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-primary)]">
                      {project.stamp}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyStrip>{t("home.commandCenter.noProjects")}</EmptyStrip>
              )}
            </div>
          </section>
        </div>

        <section
          className="relative flex min-h-0 flex-col overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel)] backdrop-blur-sm"
          data-dash-stagger="panel"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--dash-primary-soft)] to-transparent" />
          <div className="relative z-10 flex-1 overflow-y-auto p-4">
            {activeSection === "launch" ? (
              <div data-dashboard-view="active" className="flex h-full flex-col gap-4">
                <ViewHeader title={t("home.launch.header")} />
                <div className="grid gap-3">
                  <ActionCard
                    className="launch-entry"
                    icon={FolderOpenIcon}
                    title={t("header.openWorkspace")}
                    description={t("home.launch.openWorkspaceDescription")}
                    onClick={onOpenWorkspace}
                  />
                  <ActionCard
                    className="launch-entry"
                    icon={Clock01Icon}
                    title={t("home.commandCenter.continueSession")}
                    description={
                      sessionRows[0]
                        ? `${t("home.commandCenter.status.assistant")}: ${
                            sessionRows[0].title || assistantStatus
                          }`
                        : t("home.commandCenter.status.noSession")
                    }
                    onClick={() => onOpenAssistant()}
                  />
                  <ActionCard
                    className="launch-entry"
                    icon={GitCompareIcon}
                    title={t("home.javaRefactor")}
                    description={t("home.launch.refactorDescription")}
                    onClick={onOpenJavaRefactor}
                    disabled={!hasModelAccess}
                  />
                  <ActionCard
                    className="launch-entry"
                    icon={Search01Icon}
                    title={t("home.commandCenter.searchRepo")}
                    description={t("home.launch.searchDescription")}
                    onClick={hasWorkspace ? () => onSearchRepository?.() : onOpenWorkspace}
                    disabled={!hasWorkspace && !onOpenWorkspace}
                  />
                </div>

                <form
                  className="mt-auto space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onOpenAssistant(
                      commandDraft.trim() || t("home.commandCenter.commandFallback"),
                    );
                    setCommandDraft("");
                  }}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                    {t("home.commandCenter.commandLabel")}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={commandDraft}
                      onChange={(event) => setCommandDraft(event.target.value)}
                      placeholder={t("home.commandCenter.commandPlaceholder")}
                      className="h-12 rounded-none border-[var(--dash-border)] bg-[var(--dash-panel-strong)] font-mono text-[12px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
                    />
                    <Button
                      type="submit"
                      className="h-12 min-w-32 rounded-none bg-[var(--dash-primary)] px-4 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--dash-bg)] hover:bg-[var(--dash-accent)]"
                    >
                      {t("home.commandCenter.commandSend")}
                    </Button>
                  </div>
                </form>
              </div>
            ) : activeSection === "workflow" ? (
              <HomeDashboardWorkflowView
                accentColor={resolvedThemeColors.accent}
                backgroundColor={resolvedThemeColors.background}
                chartData={workflowChartData}
                chartOptions={workflowChartOptions}
                entries={workflowEntries}
                emptyLabel={t("home.commandCenter.noRecentFiles")}
                hasRecentProjects={recentProjects.length > 0}
                hasWorkspace={hasWorkspace}
                languageChartData={workflowLanguageChartData}
                languageChartOptions={workflowLanguageChartOptions}
                languageSummary={workflowLanguageSummary}
                onBrowseProject={onBrowseProject}
                onOpenRecentFile={onOpenRecentFile}
                onOpenWorkspace={onOpenWorkspace}
                primaryColor={resolvedThemeColors.primary}
                githubProfile={githubProfile}
                trendData={workflowTrendData}
                trendOptions={workflowTrendOptions}
              />
            ) : activeSection === "agents" ? (
              <HomeDashboardAgentsView
                agentRows={agentRows}
                alerts={alerts}
                chartData={agentChartData}
                chartOptions={agentChartOptions}
                readinessScore={readinessScore}
                githubProfile={githubProfile}
              />
            ) : (
              <HomeDashboardGithubView
                alerts={alerts}
                branchLabel={branchLabel}
                ciCdHealthy={(repoStatus?.behind ?? 0) === 0}
                cloneError={cloneError}
                cloneLabelTone={cloneState === "done" ? "cyan" : "primary"}
                cloneLogs={cloneLogs}
                cloneStateLabel={cloneStateLabel}
                cloneTargetDir={cloneTargetDir}
                githubClientId={githubClientId}
                githubDashboard={githubDashboard}
                githubDashboardError={githubError ?? githubDashboardError}
                githubDashboardState={githubDashboardState}
                githubIdentity={githubIdentity}
                githubProfile={githubProfile}
                githubRepoQuery={githubRepoQuery}
                githubStatusLabel={githubStatusLabel}
                githubSummary={githubScopeSummary}
                integrationRows={githubIntegrationRows}
                onAuthPrimary={
                  githubProfile
                    ? () => void handleGithubRefresh()
                    : () => void handleGithubConnect()
                }
                onAuthSecondary={
                  githubProfile
                    ? () => void handleGithubDisconnect()
                    : () =>
                        openInDashboardBrowser(
                          githubChallenge?.verificationUri ??
                            "https://github.com/login/device",
                        )
                }
                onCloneRepository={() => void handleCloneRepository()}
                onGithubClientIdChange={setGithubClientId}
                onOpenScopeEntry={openScopeEntry}
                onRepoQueryChange={setGithubRepoQuery}
                onSearchRepository={handleGitHubSearch}
                primaryAuthLabel={githubPrimaryActionLabel}
                recentScope={recentScopeEntries}
                remoteLabel={remoteLabel}
                repoCheckerRows={repoCheckerRows}
                secondaryAuthLabel={githubSecondaryActionLabel}
                workspaceLinked={hasWorkspace}
              />
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4" data-dash-stagger="panel">
          <section className="flex flex-1 flex-col overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel)] px-3 py-4">
            <div className="flex items-center justify-between border-b border-[var(--dash-border)] pb-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--dash-primary)]">
                    {t("home.news.header")}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                    {t("home.news.subheader", {
                      language: preferredNewsLanguage.toUpperCase(),
                    })}
                  </div>
                </div>
              <button
                type="button"
                onClick={() => void handleNewsRefresh()}
                className="border border-[var(--dash-border)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--dash-accent)] transition-colors hover:border-[var(--dash-accent)]"
              >
                {newsStatusLabel}
              </button>
            </div>

            <div className="mt-3">
              <Input
                value={newsQuery}
                onChange={(event) => setNewsQuery(event.target.value)}
                placeholder={t("home.news.searchPlaceholder")}
                className="h-9 rounded-none border-[var(--dash-border)] bg-[var(--dash-panel-strong)] font-mono text-[10px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
              />
            </div>

            <div className="mt-3 flex flex-1 flex-col overflow-hidden">
              {activeNews ? (
                <div className="flex h-full flex-col gap-3 overflow-y-auto">
                  <div className="overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel-strong)]">
                    {activeNews.imageUrl ? (
                      <img
                        src={activeNews.imageUrl}
                        alt={activeNews.title}
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <NewsImageFallback item={activeNews} />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <NewsBadge text={activeNews.sourceName} tone="primary" />
                    <NewsBadge text={activeNews.language.toUpperCase()} tone="cyan" />
                    <NewsBadge text={activeNews.kind.toUpperCase()} tone="muted" />
                  </div>

                  <div className="font-mono text-[11px] font-bold leading-5 text-[var(--dash-text)]">
                    {activeNews.title}
                  </div>
                  <div className="font-mono text-[10px] leading-5 text-[var(--dash-muted)]">
                    {activeNews.summary}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                    {formatTime(activeNews.publishedAt, t("home.news.live"))} · {activeNews.sourceName}
                  </div>

                  {newsError ? (
                    <div className="border border-[var(--dash-primary-soft)] bg-[var(--dash-primary-soft)] px-2 py-2 font-mono text-[9px] leading-5 text-[var(--dash-text)]">
                      {newsError}
                    </div>
                  ) : null}

                  <div className="mt-auto grid gap-2">
                    <UtilityButton onClick={handleRotateNews}>{t("home.news.rotate")}</UtilityButton>
                    <UtilityButton onClick={() => openInDashboardBrowser(activeNews.link)}>
                      {t("home.news.openBrief")}
                    </UtilityButton>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col gap-3">
                  <EmptyStrip>{t("home.news.noMatch")}</EmptyStrip>
                  <UtilityButton onClick={() => setNewsQuery("")}>
                    {t("home.news.clearFilter")}
                  </UtilityButton>
                </div>
              )}
            </div>
          </section>

          <section className="relative h-36 overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-primary-soft)]">
            <BongoTerminal className="opacity-90" />
          </section>
        </aside>
      </div>
      ) : (
        <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-hidden">
          <div className="h-full w-full overflow-hidden border border-[var(--dash-border)] bg-[var(--dash-panel)] backdrop-blur-sm" data-dash-stagger="panel">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--dash-primary-soft)] to-transparent" />
            <div className="relative z-10 h-full overflow-y-auto p-6">
              {activeSection === "workflow" ? (
                <HomeDashboardWorkflowView
                  accentColor={resolvedThemeColors.accent}
                  backgroundColor={resolvedThemeColors.background}
                  chartData={workflowChartData}
                  chartOptions={workflowChartOptions}
                  entries={workflowEntries}
                  emptyLabel={t("home.commandCenter.noRecentFiles")}
                  hasRecentProjects={recentProjects.length > 0}
                  hasWorkspace={hasWorkspace}
                  languageChartData={workflowLanguageChartData}
                  languageChartOptions={workflowLanguageChartOptions}
                  languageSummary={workflowLanguageSummary}
                  onBrowseProject={onBrowseProject}
                  onOpenRecentFile={onOpenRecentFile}
                  onOpenWorkspace={onOpenWorkspace}
                  primaryColor={resolvedThemeColors.primary}
                  githubProfile={githubProfile}
                  trendData={workflowTrendData}
                  trendOptions={workflowTrendOptions}
                />
              ) : activeSection === "agents" ? (
                <HomeDashboardAgentsView
                  agentRows={agentRows}
                  alerts={alerts}
                  chartData={agentChartData}
                  chartOptions={agentChartOptions}
                  readinessScore={readinessScore}
                  githubProfile={githubProfile}
                />
              ) : activeSection === "anime" ? (
                <HomeDashboardAnimeView githubProfile={githubProfile} />
              ) : (
                <HomeDashboardGithubView
                  alerts={alerts}
                  branchLabel={branchLabel}
                  ciCdHealthy={(repoStatus?.behind ?? 0) === 0}
                  cloneError={cloneError}
                  cloneLabelTone={cloneState === "done" ? "cyan" : "primary"}
                  cloneLogs={cloneLogs}
                  cloneStateLabel={cloneStateLabel}
                  cloneTargetDir={cloneTargetDir}
                  githubClientId={githubClientId}
                  githubDashboard={githubDashboard}
                  githubDashboardError={githubError ?? githubDashboardError}
                  githubDashboardState={githubDashboardState}
                  githubIdentity={githubIdentity}
                  githubProfile={githubProfile}
                  githubRepoQuery={githubRepoQuery}
                  githubStatusLabel={githubStatusLabel}
                  githubSummary={githubScopeSummary}
                  integrationRows={githubIntegrationRows}
                  onAuthPrimary={
                    githubProfile
                      ? () => void handleGithubRefresh()
                      : () => void handleGithubConnect()
                  }
                  onAuthSecondary={
                    githubProfile
                      ? () => void handleGithubDisconnect()
                      : () =>
                          openInDashboardBrowser(
                            githubChallenge?.verificationUri ??
                              "https://github.com/login/device",
                          )
                  }
                  onCloneRepository={() => void handleCloneRepository()}
                  onGithubClientIdChange={setGithubClientId}
                  onOpenScopeEntry={openScopeEntry}
                  onRepoQueryChange={setGithubRepoQuery}
                  onSearchRepository={handleGitHubSearch}
                  primaryAuthLabel={githubPrimaryActionLabel}
                  recentScope={recentScopeEntries}
                  remoteLabel={remoteLabel}
                  repoCheckerRows={repoCheckerRows}
                  secondaryAuthLabel={githubSecondaryActionLabel}
                  workspaceLinked={hasWorkspace}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function matchesNewsQuery(item: DashboardNewsItem, rawQuery: string): boolean {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const haystack = normalizeSearchText([
    item.title,
    item.summary,
    item.sourceName,
    item.sourceUrl,
    item.language,
    item.kind,
  ].join(" "));

  return query.split(/\s+/).every((token) => {
    if (token === "pt" || token === "portuguese" || token === "portugues") {
      return item.language === "pt";
    }
    if (token === "en" || token === "english" || token === "ingles") {
      return item.language === "en";
    }
    if (
      token === "cyber" ||
      token === "security" ||
      token === "appsec" ||
      token === "sec" ||
      token === "ciber" ||
      token === "seguranca"
    ) {
      return item.kind === "cyber" || hasWholeTokenMatch(haystack, token);
    }
    if (
      token === "dev" ||
      token === "developer" ||
      token === "code" ||
      token === "codigo" ||
      token === "desenvolvimento"
    ) {
      return item.kind === "dev" || hasWholeTokenMatch(haystack, token);
    }
    return haystack.includes(token);
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function hasWholeTokenMatch(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(haystack);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseGithubCloneUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(trimmed)) {
    return trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  }

  if (/^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(trimmed)) {
    return trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  }

  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) {
    return `https://github.com/${trimmed}.git`;
  }

  return null;
}

function buildWorkflowLanguageSummary(
  recentFilePaths: string[],
  githubDashboard: GitHubDashboardData | null,
): Array<{ label: string; value: number; color: string }> {
  if (githubDashboard?.languages.length) {
    return githubDashboard.languages.map((language) => ({
      label: language.name,
      value: Math.max(1, Math.round(language.percent)),
      color: language.color,
    }));
  }

  const buckets = new Map<string, number>();
  for (const path of recentFilePaths) {
    const label = classifyPathLanguage(path);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([label, value], index) => ({
      label,
      value,
      color: workflowBucketColor(label, index),
    }))
    .sort((left, right) => right.value - left.value);
}

function classifyPathLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "ts":
    case "tsx":
      return "TypeScript";
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "JavaScript";
    case "java":
      return "Java";
    case "kt":
    case "kts":
      return "Kotlin";
    case "py":
      return "Python";
    case "go":
      return "Go";
    case "rs":
      return "Rust";
    case "css":
    case "scss":
    case "sass":
    case "less":
      return "CSS";
    case "html":
    case "htm":
      return "HTML";
    case "json":
    case "yaml":
    case "yml":
    case "toml":
    case "xml":
    case "properties":
      return "Config";
    case "md":
    case "mdx":
      return "Markdown";
    case "sh":
    case "ps1":
    case "bat":
      return "Shell";
    default:
      return ext ? ext.toUpperCase() : "Other";
  }
}

function workflowBucketColor(label: string, index: number): string {
  const palette = [
    "#22d3ee",
    "#f97316",
    "#8b5cf6",
    "#84cc16",
    "#38bdf8",
    "#ec4899",
  ];
  const hash = label
    .split("")
    .reduce((acc, char) => ((acc * 31 + char.charCodeAt(0)) >>> 0), 0);
  return palette[index % palette.length] ?? `hsl(${hash % 360} 70% 56%)`;
}

function NewsImageFallback({ item }: { item: DashboardNewsItem }) {
  const initials = item.sourceName
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div
      className="relative flex h-28 flex-col justify-between overflow-hidden px-3 py-3"
      style={{
        background: `linear-gradient(135deg, ${item.accent}38 0%, transparent 62%), radial-gradient(circle at top right, ${item.accent}28 0%, transparent 44%), var(--dash-panel-strong)`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(color-mix(in_srgb,var(--dash-text)_18%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--dash-text)_18%,transparent)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--dash-text)]">
          {item.sourceName}
        </div>
        <div className="font-project-title text-[20px] leading-none text-[var(--dash-text)]">
          {initials}
        </div>
      </div>
      <div className="relative space-y-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
          {item.language.toUpperCase()} · {item.kind.toUpperCase()}
        </div>
        <div className="line-clamp-2 font-mono text-[10px] font-bold leading-4 text-[var(--dash-text)]">
          {item.title}
        </div>
      </div>
    </div>
  );
}

const heroMaskStyle: CSSProperties = {
  clipPath: "polygon(20% 0%, 100% 0, 100% 80%, 80% 100%, 0 100%, 0 20%)",
};
