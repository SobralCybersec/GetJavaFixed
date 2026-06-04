import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");

describe("App shell routing", () => {
  it("keeps dashboard dismissal tied to normal workspace tab kinds", () => {
    expect(appSrc).toContain("function tabShouldHidePhase1");
    expect(appSrc).toContain('tab.kind === "terminal"');
    expect(appSrc).toContain('tab.kind === "markdown"');
    expect(appSrc).toContain("tabShouldHidePhase1(nextTab, activeJavaRepoPath)");
  });

  it("passes zen breadcrumb collapse through the live status bar", () => {
    expect(appSrc).toContain("collapsePathBarInZen={zenMode && !statusBarHover}");
  });
});
