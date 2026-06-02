import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const homeSrc = readFileSync(path.join(here, "JavaRepoHome.tsx"), "utf8");
const appSrc = readFileSync(path.join(here, "../../app/App.tsx"), "utf8");

describe("JavaRepoHome intake shell", () => {
  it("uses the Phase 1 primary analysis CTA", () => {
    expect(homeSrc).toContain("Start full analysis");
  });

  it("uses the Phase 1 unsupported repo recovery action", () => {
    expect(homeSrc).toContain("Choose another folder");
    expect(homeSrc).toContain("This folder is not supported in Phase 1.");
  });

  it("keeps the readiness copy minimal and Maven/Gradle focused", () => {
    expect(homeSrc).toContain("Repository ready for analysis");
    expect(homeSrc).toContain("pom.xml");
    expect(homeSrc).toContain("build.gradle.kts");
  });

  it("exposes an explicit start callback for dashboard entry", () => {
    expect(homeSrc).toContain("onStartFullAnalysis");
    expect(appSrc).toContain("onStartFullAnalysis={handleStartFullAnalysis}");
  });
});

