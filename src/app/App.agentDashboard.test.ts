import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");
const agentDashboardSrc = readFileSync(
  path.join(here, "..", "modules", "ai", "components", "AgentConversationDashboard.tsx"),
  "utf8",
);
const tabBarSrc = readFileSync(
  path.join(here, "..", "modules", "tabs", "TabBar.tsx"),
  "utf8",
);

describe("App agent dashboard routing", () => {
  it("routes explicit agent dashboard tabs through dedicated surface", () => {
    expect(appSrc).toContain('const isAgentDashboardTab = activeTab?.kind === "agent-dashboard"');
    expect(appSrc).toContain("onNewAgentDashboard={openAgentDashboardTab}");
    expect(appSrc).toContain("agentDashboardSurface");
  });

  it("keeps agent dashboard content behind explicit sections", () => {
    expect(agentDashboardSrc).toContain(
      'type DashboardSection = "overview" | "work" | "resources" | "sessions"',
    );
    expect(agentDashboardSrc).toContain('useState<DashboardSection>("overview")');
    expect(agentDashboardSrc).toContain('t("agentDashboard.section.overview")');
    expect(agentDashboardSrc).toContain('activeSection === "resources"');
    expect(agentDashboardSrc).toContain("lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]");
    expect(agentDashboardSrc).toContain("h-[min(56vh,520px)]");
  });

  it("keeps plus menu readable on narrow headers", () => {
    expect(tabBarSrc).toContain('align="end"');
    expect(tabBarSrc).toContain(
      'style={{ width: "min(16rem, calc(100vw - 0.75rem))" }}',
    );
    expect(tabBarSrc).toContain('className="min-w-0 whitespace-normal"');
  });
});
