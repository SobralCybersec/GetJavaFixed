import { describe, expect, it } from "vitest";
import { buildFindingsAnalytics, formatImpactSummary } from "./analytics";
import type { Phase1Finding } from "./useFindings";

function finding(overrides: Partial<Phase1Finding>): Phase1Finding {
  return {
    id: "println:App.java",
    title: "Example finding",
    category: "safe",
    priority: 60,
    rationale: "Example rationale",
    principles: ["CleanCode"],
    affectedFiles: ["src/App.java"],
    ...overrides,
  };
}

describe("buildFindingsAnalytics", () => {
  it("handles empty findings", () => {
    const analytics = buildFindingsAnalytics([]);
    expect(analytics.totalFindings).toBe(0);
    expect(analytics.affectedFiles).toBe(0);
    expect(analytics.topCategory).toBeNull();
    expect(formatImpactSummary(analytics)).toContain("No refactor hotspots yet");
  });

  it("aggregates mixed category and principle counts", () => {
    const analytics = buildFindingsAnalytics([
      finding({
        id: "deep-nesting:One.java",
        category: "maintainability",
        priority: 86,
        principles: ["KISS", "CleanCode"],
        affectedFiles: ["src/One.java"],
      }),
      finding({
        id: "potential-null:Two.java",
        category: "safe",
        priority: 90,
        principles: ["SOLID", "CleanCode"],
        affectedFiles: ["src/Two.java"],
      }),
      finding({
        id: "duplicate-code:One.java",
        category: "maintainability",
        priority: 83,
        principles: ["DRY", "CleanCode"],
        affectedFiles: ["src/One.java"],
      }),
    ]);

    expect(analytics.totalFindings).toBe(3);
    expect(analytics.affectedFiles).toBe(2);
    expect(analytics.topCategory?.key).toBe("maintainability");
    expect(analytics.principles[0]?.key).toBe("CleanCode");
    expect(analytics.hotspots[0]?.key).toBe("src/One.java");
  });

  it("detects performance-heavy repos and performance trigger messages", () => {
    const analytics = buildFindingsAnalytics([
      finding({
        id: "string-concat-loop:Loop.java",
        category: "performance",
        priority: 84,
      }),
      finding({
        id: "repeated-call-cache:Loop.java",
        category: "performance",
        priority: 76,
      }),
      finding({
        id: "size-in-loop:Loop.java",
        category: "performance",
        priority: 72,
      }),
    ]);

    expect(analytics.performanceSummary.hotspots).toBe(3);
    expect(analytics.performanceSummary.gainLabel).toBe("Moderate");
    expect(analytics.performanceSummary.triggeredBy.length).toBeGreaterThan(0);
    expect(analytics.impactLabel).not.toBe("Low");
  });
});
