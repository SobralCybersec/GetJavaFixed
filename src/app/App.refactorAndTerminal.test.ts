import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");
const refactorPaneSrc = readFileSync(
  path.join(here, "../modules/findings/RefactorPreviewPanel.tsx"),
  "utf8",
);

describe("App refactor preview shell", () => {
  it("keeps file selection idle until the user explicitly generates a refactor", () => {
    expect(appSrc).not.toContain("void generateForFile(filePath, repoPath);");
    expect(appSrc).toContain("onGenerate={() => void generateForFile(filePath, repo.path)}");
    expect(refactorPaneSrc).toContain("Generate refactor");
  });
});

describe("App terminal injection fallback", () => {
  it("routes terminal insertions through the safe fallback helper", () => {
    expect(appSrc).toContain("resolveTerminalInjectionTarget");
    expect(appSrc).toContain("const tabId = newTab(target.cwd ?? undefined);");
    expect(appSrc).toContain("await whenSessionReady(tab.activeLeafId);");
  });
});
