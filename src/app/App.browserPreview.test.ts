import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");
const firstRunSrc = readFileSync(
  path.join(here, "..", "modules", "java-intake", "JavaFirstRunSetup.tsx"),
  "utf8",
);
const aniCliSrc = readFileSync(
  path.join(here, "..", "modules", "anime", "AniCliPanel.tsx"),
  "utf8",
);
const previewAddressBarSrc = readFileSync(
  path.join(here, "..", "modules", "preview", "PreviewAddressBar.tsx"),
  "utf8",
);
const terminalSessionSrc = readFileSync(
  path.join(here, "..", "modules", "terminal", "lib", "useTerminalSession.ts"),
  "utf8",
);

describe("App browser preview onboarding", () => {
  it("lets browser preview users finish first-run setup without model access", () => {
    expect(appSrc).toContain('import { isBrowserPreview } from "@/lib/runtime";');
    expect(appSrc).toContain(
      'import {\n  hasBrowserWorkspaceHandle,\n  restoreBrowserWorkspaceHandle,\n} from "@/lib/browserWorkspace";',
    );
    expect(appSrc).toContain(
      "const canContinueFirstRunSetup =\n    javaRepoHomeState.kind === \"supported\" && (hasComposer || isBrowserPreview);",
    );
    expect(appSrc).toContain(
      "showFirstRunSetup ||\n      isBrowserPreview",
    );
    expect(appSrc).toContain('setPhase1Mode("dashboard");');
    expect(appSrc).toContain('if (isBrowserPreview) {\n        setPhase1Mode("dashboard");\n      }');
    expect(appSrc).toContain(
      '!(await restoreBrowserWorkspaceHandle(normalizedPath))',
    );
    expect(appSrc).toContain(
      'message:\n            "Browser preview needs repository access again after reload. Choose the repository to continue.",',
    );
    expect(appSrc).toContain('setPhase1Mode("intake");');
    expect(appSrc).toContain("setJavaWorkspaceRoot(normalizedPath);");
    expect(appSrc).toContain("setLaunchCwd(normalizedPath);");
    expect(appSrc).toContain(
      "if (!isBrowserPreview) {\n          try {\n            await native.workspaceAuthorize(normalizedPath);",
    );
    expect(appSrc).toContain("canContinue={canContinueFirstRunSetup}");
    expect(firstRunSrc).toContain("canContinue: boolean;");
    expect(firstRunSrc).toContain("disabled={!canContinue || !repoReady}");
    expect(aniCliSrc).toContain("const browserPreviewLimited = isBrowserPreview;");
    expect(aniCliSrc).toContain("if (browserPreviewLimited) {\n      setCheck({ aniCli: false, mpv: false });");
    expect(previewAddressBarSrc).toContain("if (isBrowserPreview) {\n        setBrowsers([]);\n        return;\n      }");
    expect(terminalSessionSrc).toContain('status: isBrowserPreview ? "ready" : "loading"');
    expect(terminalSessionSrc).toContain("if (isBrowserPreview) {\n      return;\n    }");
  });

  it("lets explicit dashboard tabs bypass onboarding overlays in browser preview", () => {
    expect(appSrc).toContain(
      'const openDashboardTab = useCallback(() => {\n    if (isBrowserPreview) {\n      setShowFirstRunSetup(false);\n      setPhase1Mode("hidden");\n    }\n    newDashboardTab();\n  }, [newDashboardTab]);',
    );
    expect(appSrc).toContain(
      'const openAgentDashboardTab = useCallback(() => {\n    if (isBrowserPreview) {\n      setShowFirstRunSetup(false);\n      setPhase1Mode("hidden");\n    }\n    newAgentDashboardTab();\n  }, [newAgentDashboardTab]);',
    );
  });
});
