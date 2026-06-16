import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const tabBarSrc = readFileSync(path.join(here, "TabBar.tsx"), "utf8");
const headerSrc = readFileSync(path.join(here, "../header/Header.tsx"), "utf8");
const appSrc = readFileSync(path.join(here, "../../app/App.tsx"), "utf8");

describe("TabBar quick access", () => {
  it("routes code refactor quick access from App through Header into the plus menu", () => {
    expect(appSrc).toContain("onOpenJavaRefactor={handleOpenJavaRefactor}");
    expect(headerSrc).toContain("onOpenJavaRefactor: () => void;");
    expect(headerSrc).toContain('onSelect={onOpenJavaRefactor}');
    expect(headerSrc).toContain('t("home.javaRefactor")');
    expect(tabBarSrc).toContain("onOpenJavaRefactor: () => void;");
    expect(tabBarSrc).toContain("onSelect={() => onOpenJavaRefactor()}");
    expect(tabBarSrc).toContain('translate("home.javaRefactor")');
  });

  it("trims persistent header chrome down to sidebar toggle, menu, and notifications", () => {
    expect(headerSrc).toContain("{!compactOps ? sidebarButton : null}");
    expect(headerSrc).toContain("{compactMenu}");
    expect(headerSrc).not.toContain("const workspaceButton = (");
    expect(headerSrc).not.toContain("const tutorialButton = (");
    expect(headerSrc).not.toContain("const splitMenu = (");
  });

  it("drops decorative file icons from regular editor and shell tabs", () => {
    expect(tabBarSrc).toContain(
      'if (tab.kind === "editor" || tab.kind === "markdown") return null;',
    );
    expect(tabBarSrc).toContain('if (tab.kind === "terminal") {');
    expect(tabBarSrc).toContain("return null;");
  });
});
