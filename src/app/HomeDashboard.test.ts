import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeDashboardSrc = readFileSync(path.join(here, "HomeDashboard.tsx"), "utf8");

describe("HomeDashboard source", () => {
  it("stacks motion libraries by surface role", () => {
    expect(homeDashboardSrc).toContain('import { useGSAP } from "@gsap/react"');
    expect(homeDashboardSrc).toContain(
      'import { animate, createScope, stagger } from "animejs"',
    );
    expect(homeDashboardSrc).toContain('import * as THREE from "three"');
    expect(homeDashboardSrc).toContain("new THREE.Timer()");
    expect(homeDashboardSrc).toContain('import { Bar } from "react-chartjs-2"');
  });

  it("keeps repo, assistant, and sectioned status entry points on first screen", () => {
    expect(homeDashboardSrc).toContain('t("home.commandCenter.title")');
    expect(homeDashboardSrc).toContain('useState<DashboardSectionId>("launch")');
    expect(homeDashboardSrc).toContain('t("home.tabs.launch")');
    expect(homeDashboardSrc).toContain('t("home.tabs.workflow")');
    expect(homeDashboardSrc).toContain('t("home.tabs.readiness")');
    expect(homeDashboardSrc).toContain("recentProjectPaths");
    expect(homeDashboardSrc).toContain("recentFilePaths");
    expect(homeDashboardSrc).toContain("onSearchRepository");
    expect(homeDashboardSrc).toContain("onOpenAssistant");
    expect(homeDashboardSrc).toContain("repoStatus");
    expect(homeDashboardSrc).toContain("telemetryHasChartSignal");
    expect(homeDashboardSrc).toContain("grid items-start gap-3 xl:grid-cols");
  });
});
