import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeSrc = readFileSync(path.join(here, "JavaRepoHome.tsx"), "utf8");
const appSrc = readFileSync(path.join(here, "../../app/App.tsx"), "utf8");

describe("JavaRepoHome intake shell", () => {
  it("uses the Phase 1 primary analysis CTA", () => {
    expect(homeSrc).toContain('t("repoIntake.startFullAnalysis")');
  });

  it("keeps a recovery action for inspection failures", () => {
    expect(homeSrc).toContain('t("repoIntake.chooseAnother")');
    expect(homeSrc).toContain('t("repoIntake.unsupported")');
  });

  it("keeps the readiness copy minimal and polyglot focused", () => {
    expect(homeSrc).toContain('t("repoIntake.ready")');
    expect(homeSrc).toContain('t("repoIntake.rootManifestValueFull")');
  });

  it("exposes an explicit start callback for dashboard entry", () => {
    expect(homeSrc).toContain("onStartFullAnalysis");
    expect(appSrc).toContain("onStartFullAnalysis={handleStartFullAnalysis}");
  });

  it("exposes preview dashboard entry without requiring a workspace", () => {
    expect(homeSrc).toContain("onPreviewDashboard");
    expect(homeSrc).toContain('t("repoIntake.previewDashboard")');
    expect(appSrc).toContain("onPreviewDashboard={handlePreviewJavaRefactor}");
  });
});
