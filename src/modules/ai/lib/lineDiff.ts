export type LineDiffStats = {
  added: number;
  removed: number;
};

export type LineDiffRow = {
  kind: "add" | "del";
  text: string;
};

function countMap(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    counts.set(line, (counts.get(line) ?? 0) + 1);
  }
  return counts;
}

export function computeLineDiffStats(
  original: string,
  proposed: string,
): LineDiffStats {
  const originalLines = original.split("\n");
  const proposedLines = proposed.split("\n");
  const originalCounts = countMap(originalLines);
  const proposedCounts = countMap(proposedLines);

  let added = 0;
  let removed = 0;
  const seen = new Set<string>([...originalCounts.keys(), ...proposedCounts.keys()]);
  for (const line of seen) {
    const a = originalCounts.get(line) ?? 0;
    const b = proposedCounts.get(line) ?? 0;
    if (b > a) added += b - a;
    if (a > b) removed += a - b;
  }

  return { added, removed };
}

export function buildLineDiffRows(
  original: string,
  proposed: string,
): LineDiffRow[] {
  const originalLines = original.split("\n");
  const proposedLines = proposed.split("\n");
  const originalCounts = countMap(originalLines);
  const proposedCounts = countMap(proposedLines);
  const rows: LineDiffRow[] = [];

  for (const line of originalLines) {
    const current = originalCounts.get(line) ?? 0;
    const target = proposedCounts.get(line) ?? 0;
    if (current > target) {
      rows.push({ kind: "del", text: line });
      originalCounts.set(line, current - 1);
      proposedCounts.set(line, target);
    }
  }

  for (const line of proposedLines) {
    const current = proposedCounts.get(line) ?? 0;
    const target = originalCounts.get(line) ?? 0;
    if (current > target) {
      rows.push({ kind: "add", text: line });
      proposedCounts.set(line, current - 1);
      originalCounts.set(line, target);
    }
  }

  return rows;
}
