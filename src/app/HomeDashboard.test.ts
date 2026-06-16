import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeDashboardSrc = readFileSync(path.join(here, "HomeDashboard.tsx"), "utf8");
const sharedSrc = readFileSync(path.join(here, "HomeDashboardShared.tsx"), "utf8");
const workflowViewSrc = readFileSync(path.join(here, "HomeDashboardWorkflowView.tsx"), "utf8");
const agentsViewSrc = readFileSync(path.join(here, "HomeDashboardAgentsView.tsx"), "utf8");
const githubViewSrc = readFileSync(path.join(here, "HomeDashboardGithubView.tsx"), "utf8");

describe("HomeDashboard source", () => {
  it("stacks motion libraries by surface role across extracted dashboard views", () => {
    expect(homeDashboardSrc).toContain('import { useGSAP } from "@gsap/react"');
    expect(homeDashboardSrc).toContain(
      'import { animate, createScope, stagger } from "animejs"',
    );
    expect(sharedSrc).toContain('import * as THREE from "three"');
    expect(sharedSrc).toContain("new THREE.Timer()");
    expect(workflowViewSrc).toContain('import { Bar, Doughnut, Line } from "react-chartjs-2"');
    expect(agentsViewSrc).toContain('import { Doughnut, Radar } from "react-chartjs-2"');
  });

  it("keeps github profile, news rail, and integrated-browser hooks while splitting 02/03/04 into dedicated files", () => {
    expect(homeDashboardSrc).toContain("fetchGithubDashboardData");
    expect(homeDashboardSrc).toContain("githubClientId");
    expect(homeDashboardSrc).toContain('t("home.news.header")');
    expect(homeDashboardSrc).toContain('useState<DashboardSectionId>("launch")');
    expect(homeDashboardSrc).toContain('t("home.tabs.launch")');
    expect(homeDashboardSrc).toContain('t("home.tabs.workflow")');
    expect(homeDashboardSrc).toContain('t("home.tabs.agents")');
    expect(homeDashboardSrc).toContain('t("home.tabs.github")');
    expect(homeDashboardSrc).toContain("useDeferredValue");
    expect(homeDashboardSrc).toContain("requestGithubDeviceChallenge");
    expect(homeDashboardSrc).toContain("fetchDashboardNews");
    expect(homeDashboardSrc).toContain("onOpenBrowser");
    expect(homeDashboardSrc).toContain("openInDashboardBrowser");
    expect(homeDashboardSrc).toContain('t("home.media.header")');
    expect(homeDashboardSrc).toContain('t("home.media.labelFallback")');
    expect(homeDashboardSrc).toContain("matchesNewsQuery");
    expect(homeDashboardSrc).toContain("pickJavaRepoDirectory");
    expect(homeDashboardSrc).toContain("shellBgSpawn");
    expect(homeDashboardSrc).toContain("typedGreeting");
    expect(homeDashboardSrc).toContain("recentProjectPaths");
    expect(homeDashboardSrc).toContain("recentFilePaths");
    expect(homeDashboardSrc).toContain("onSearchRepository");
    expect(homeDashboardSrc).toContain("onOpenAssistant");
    expect(homeDashboardSrc).toContain("repoStatus");
    expect(homeDashboardSrc).toContain("HomeDashboardWorkflowView");
    expect(homeDashboardSrc).toContain("HomeDashboardAgentsView");
    expect(homeDashboardSrc).toContain("HomeDashboardGithubView");
    expect(homeDashboardSrc).toContain("githubProfile={githubProfile}");
    expect(homeDashboardSrc).toContain("githubDashboard={githubDashboard}");
    expect(homeDashboardSrc).toContain("githubDashboardState={githubDashboardState}");
    expect(homeDashboardSrc).toContain("onGithubClientIdChange={setGithubClientId}");
    expect(workflowViewSrc).toContain('t("home.workflow.header")');
    expect(workflowViewSrc).toContain("languageChartData");
    expect(workflowViewSrc).toContain("trendData");
    expect(workflowViewSrc).toContain("h-8 w-8 rounded-full");
    expect(agentsViewSrc).toContain('t("home.agents.header")');
    expect(agentsViewSrc).toContain("radarSignals");
    expect(agentsViewSrc).toContain("h-8 w-8 rounded-full");
    expect(githubViewSrc).toContain('t("home.github.header")');
    expect(githubViewSrc).toContain("languageChartData");
    expect(githubViewSrc).toContain('t("home.github.clientIdLabel")');
  });

  it("guards empty-state animation targets and removes the old tactical relay copy", () => {
    expect(homeDashboardSrc).toContain("querySelectorAll<HTMLElement>(targetSelector)");
    expect(homeDashboardSrc).toContain("if (targets.length === 0) return;");
    expect(homeDashboardSrc).toContain("overflow-x-hidden overflow-y-auto");
    expect(homeDashboardSrc).toContain(
      "lg:grid-cols-[minmax(280px,0.45fr)_minmax(320px,0.37fr)_minmax(200px,0.18fr)]",
    );
    expect(homeDashboardSrc).toContain("style={heroMaskStyle}");
    expect(homeDashboardSrc).not.toContain("Stored token relay for GitHub OAuth device flow.");
    expect(homeDashboardSrc).not.toMatch(/>\s*Tactical\s*</);
    expect(homeDashboardSrc).not.toMatch(/>\s*Command\s*</);
    expect(homeDashboardSrc).not.toContain("Load primary development environment");
    expect(githubViewSrc).not.toContain("GITHUB_SCOPE");
    expect(githubViewSrc).not.toContain("Clone Repo");
    expect(homeDashboardSrc).toContain("rounded-full");
    expect(homeDashboardSrc).not.toContain("rounded-[34px]");
    expect(workflowViewSrc).toContain("gap-6");
    expect(workflowViewSrc).toContain("h-[320px]");
    expect(agentsViewSrc).toContain("gap-6");
    expect(agentsViewSrc).toContain("h-56 w-56");
    expect(githubViewSrc).toContain("gap-5");
    expect(githubViewSrc).toContain("h-20 w-20");
  });
});
