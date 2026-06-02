import type { Phase1Finding } from "./useFindings";

export type FindingsAnalyticsBucket = {
  key: string;
  label: string;
  count: number;
  weight: number;
};

export type FindingsAnalytics = {
  totalFindings: number;
  affectedFiles: number;
  topCategory: FindingsAnalyticsBucket | null;
  categories: FindingsAnalyticsBucket[];
  principles: FindingsAnalyticsBucket[];
  hotspots: FindingsAnalyticsBucket[];
  impactScore: number;
  impactLabel: "Low" | "Moderate" | "High";
  performanceSummary: {
    hotspots: number;
    gainLabel: "Minor" | "Moderate" | "Strong";
    triggeredBy: string[];
  };
  solutionMessages: Array<{
    category: string;
    label: string;
    message: string;
  }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  performance: "Performance",
  maintainability: "Maintainability",
  safe: "Safety",
  modernization: "Modernization",
};

const CATEGORY_MULTIPLIERS: Record<string, number> = {
  performance: 1.15,
  maintainability: 1.05,
  safe: 1.08,
  modernization: 0.92,
};

const CATEGORY_MESSAGES: Record<string, string> = {
  performance: "Fewer repeated computations, lower allocation churn, and tighter hot-path code.",
  maintainability: "Smaller methods, clearer control flow, and less duplicated logic to review.",
  safe: "Fewer hidden failures, fewer null-driven bugs, and more reliable debugging paths.",
  modernization: "Cleaner Java syntax, stronger type safety, and less legacy boilerplate.",
};

const PERFORMANCE_FINDING_MESSAGES: Record<string, string> = {
  "string-concat-loop:": "String concat loops are likely creating unnecessary intermediate allocations.",
  "repeated-call-cache:": "Repeated method lookups suggest cheap local caching opportunities.",
  "size-in-loop:": "Repeated loop condition calls can usually be hoisted once per loop.",
};

function toBuckets(counts: Map<string, number>, labels?: Record<string, string>) {
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labels?.[key] ?? key,
      count,
      weight: count,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function toImpactLabel(score: number): "Low" | "Moderate" | "High" {
  if (score >= 70) return "High";
  if (score >= 32) return "Moderate";
  return "Low";
}

function toPerformanceGainLabel(hotspots: number): "Minor" | "Moderate" | "Strong" {
  if (hotspots >= 4) return "Strong";
  if (hotspots >= 2) return "Moderate";
  return "Minor";
}

export function buildFindingsAnalytics(findings: Phase1Finding[]): FindingsAnalytics {
  const categoryCounts = new Map<string, number>();
  const principleCounts = new Map<string, number>();
  const hotspotCounts = new Map<string, number>();
  const uniqueFiles = new Set<string>();
  let impactScore = 0;

  const triggeredPerformanceMessages = new Set<string>();
  let performanceHotspots = 0;

  for (const finding of findings) {
    categoryCounts.set(
      finding.category,
      (categoryCounts.get(finding.category) ?? 0) + 1,
    );

    for (const principle of finding.principles) {
      principleCounts.set(principle, (principleCounts.get(principle) ?? 0) + 1);
    }

    for (const file of finding.affectedFiles) {
      uniqueFiles.add(file);
      hotspotCounts.set(file, (hotspotCounts.get(file) ?? 0) + 1);
    }

    const multiplier = CATEGORY_MULTIPLIERS[finding.category] ?? 1;
    impactScore += Math.round(finding.priority * multiplier);

    for (const [prefix, message] of Object.entries(PERFORMANCE_FINDING_MESSAGES)) {
      if (finding.id.startsWith(prefix)) {
        performanceHotspots += 1;
        triggeredPerformanceMessages.add(message);
      }
    }
  }

  const categories = toBuckets(categoryCounts, CATEGORY_LABELS);
  const principles = toBuckets(principleCounts).slice(0, 5);
  const hotspots = toBuckets(hotspotCounts).slice(0, 5);
  const normalizedImpactScore = findings.length === 0
    ? 0
    : Math.round(impactScore / findings.length);

  const solutionMessages = categories.slice(0, 4).map((bucket) => ({
    category: bucket.key,
    label: bucket.label,
    message: CATEGORY_MESSAGES[bucket.key] ?? "Clearer code and safer follow-up refactors.",
  }));

  return {
    totalFindings: findings.length,
    affectedFiles: uniqueFiles.size,
    topCategory: categories[0] ?? null,
    categories,
    principles,
    hotspots,
    impactScore: normalizedImpactScore,
    impactLabel: toImpactLabel(normalizedImpactScore),
    performanceSummary: {
      hotspots: performanceHotspots,
      gainLabel: toPerformanceGainLabel(performanceHotspots),
      triggeredBy: Array.from(triggeredPerformanceMessages),
    },
    solutionMessages,
  };
}

export function formatImpactSummary(analytics: FindingsAnalytics): string {
  if (analytics.totalFindings === 0) {
    return "No refactor hotspots yet. Run analysis to estimate likely gains.";
  }

  const categoryLabel = analytics.topCategory?.label ?? "Mixed";
  return `${analytics.impactLabel} heuristic impact from ${analytics.totalFindings} findings, led by ${categoryLabel.toLowerCase()} work.`;
}
