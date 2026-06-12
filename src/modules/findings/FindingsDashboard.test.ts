import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const dashboardSrc = readFileSync(path.join(here, "FindingsDashboard.tsx"), "utf8");
const hookSrc = readFileSync(path.join(here, "lib/useFindings.ts"), "utf8");
const detailSrc = readFileSync(path.join(here, "FindingDetailSheet.tsx"), "utf8");

describe("FindingsDashboard shell", () => {
  it("keeps the primary analysis trigger and watch-only progress copy", () => {
    expect(dashboardSrc).toContain('t("findings.startFull")');
    expect(dashboardSrc).toContain('t("findings.watchOnly")');
    expect(dashboardSrc).toContain('t("findings.progress")');
  });

  it("renders the minimal persistent repo header", () => {
    expect(dashboardSrc).toContain("h-8");
    expect(dashboardSrc).toContain("repo.readiness.repoName");
    expect(dashboardSrc).toContain("repo.readiness.projectType");
    expect(dashboardSrc).toContain("DashboardWidget");
    expect(dashboardSrc).toContain("controls.start");
  });

  it("uses one ranked queue with visible category badges", () => {
    expect(dashboardSrc).toContain('role="list"');
    expect(dashboardSrc).toContain("finding.category");
  });

  it("adds analytics summary surfaces and built-in charts", () => {
    expect(dashboardSrc).toContain('t("findings.widget.refactorIntelligence")');
    expect(dashboardSrc).toContain('t("findings.issueMix")');
    expect(dashboardSrc).toContain('t("findings.performanceOutlook")');
    expect(dashboardSrc).toContain("issue-mix-chart");
    expect(dashboardSrc).toContain("impact-strip");
    expect(dashboardSrc).toContain('t("findings.hotspotMap")');
  });

  it("keeps the dashboard responsive with a lower breakpoint split", () => {
    expect(dashboardSrc).toContain("lg:grid");
    expect(dashboardSrc).toContain("lg:block");
    expect(dashboardSrc).toContain("xl:sticky");
  });

  it("auto-selects the top finding when analysis completes", () => {
    expect(hookSrc).toContain("sorted[0]?.id ?? null");
    expect(hookSrc).toContain("rankFindings");
  });

  it("keeps the right-side detail surface focused on rationale and affected files", () => {
    expect(detailSrc).toContain("Affected files");
    expect(detailSrc).toContain("SheetContent");
    expect(detailSrc).toContain("finding.rationale");
  });
});

describe("FindingsDashboard Phase 2 review surface", () => {
  it("wraps the findings list in a ScrollArea for scrollable overflow", () => {
    expect(dashboardSrc).toContain("ScrollArea");
  });

  it("exposes safety state from the hook", () => {
    expect(hookSrc).toContain("safety");
    expect(hookSrc).toContain("safetySnapshotSchema");
    expect(hookSrc).toContain("java_safety_snapshot");
  });

  it("renders safety state in the detail panel", () => {
    expect(dashboardSrc).toContain("safety-state");
    expect(dashboardSrc).toContain("gitFirst");
    expect(dashboardSrc).toContain("backupFallback");
  });

  it("detail sheet shows safety state and diff preview section", () => {
    expect(detailSrc).toContain("safety-state");
    expect(detailSrc).toContain("diff-preview");
    expect(detailSrc).toContain("Diff preview");
  });

  it("detail sheet does not expose apply actions — review-only boundary", () => {
    expect(detailSrc).not.toContain("Apply");
    expect(detailSrc).not.toContain("applyFinding");
    expect(detailSrc).not.toContain("onApply");
  });

  it("hook exposes JavaSafetySnapshot type", () => {
    expect(hookSrc).toContain("JavaSafetySnapshot");
    expect(hookSrc).toContain("gitFirst");
    expect(hookSrc).toContain("backupFallback");
    expect(hookSrc).toContain("rollbackReady");
  });

  it("safety snapshot is loaded eagerly when repo changes", () => {
    expect(hookSrc).toContain("java_safety_snapshot");
    expect(hookSrc).toContain("setSafety");
  });

  it("keeps analytics derivations out of the hook snapshot contract", () => {
    expect(hookSrc).not.toContain("impactScore");
    expect(hookSrc).not.toContain("topCategory");
  });
});
