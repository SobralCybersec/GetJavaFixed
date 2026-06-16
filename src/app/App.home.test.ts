import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");

describe("App dashboard routing", () => {
  it("keeps dashboard behind an explicit tab instead of booting into it", () => {
    expect(appSrc).toContain('useState<"hidden" | "intake" | "dashboard">(');
    expect(appSrc).toContain('"hidden"');
    expect(appSrc).toContain("isDashboardTab ? (");
  });

  it("lets explicit dashboard tabs render even while workspace setup overlays exist", () => {
    expect(appSrc).toContain(
      "{showFirstRunSetup &&",
    );
    expect(appSrc).toContain(
      "!showHomeDashboardSurface &&",
    );
    expect(appSrc).toContain(
      ') : phase1Mode !== "hidden" &&\n                      !javaPreviewActive &&\n                      !isAgentDashboardTab ? (',
    );
  });

  it("supports dashboard preview without a mounted repository", () => {
    expect(appSrc).toContain("const handlePreviewJavaRefactor = useCallback(() => {");
    expect(appSrc).toContain("const handleOpenJavaRefactor = useCallback(() => {");
    expect(appSrc).toContain("if (phase1Repo) {");
    expect(appSrc).toContain("handlePreviewJavaRefactor();");
    expect(appSrc).not.toContain('return phase1Repo ? "dashboard" : "intake";');
    expect(appSrc).toContain("previewOnly: true,");
    expect(appSrc).toContain("previewOnly={phase1Repo.previewOnly === true}");
  });

  it("replaces initial blank shell with command dashboard surface", () => {
    expect(appSrc).toContain("const showHomeDashboardSurface =");
    expect(appSrc).toContain("activeTab.id === 1");
    expect(appSrc).toContain("<HomeDashboardLazy");
    expect(appSrc).toContain("!showHomeDashboardSurface &&");
    expect(appSrc).toContain(
      "onSearchRepository={hasWorkspace ? openExplorerSearch : undefined}",
    );
    expect(appSrc).toContain("onOpenBrowser={openPreviewTab}");
    expect(appSrc).toContain("recentProjectPaths={dashboardProjectPaths}");
  });
});
