import { describe, expect, it } from "vitest";
import { buildLineDiffRows, computeLineDiffStats } from "./lineDiff";

describe("lineDiff", () => {
  it("counts repeated lines by multiplicity instead of set membership", () => {
    const original = ["alpha", "beta", "beta", "gamma"].join("\n");
    const proposed = ["alpha", "beta", "gamma", "gamma"].join("\n");

    expect(computeLineDiffStats(original, proposed)).toEqual({
      added: 1,
      removed: 1,
    });
  });

  it("lists excess add/remove rows for the preview surface", () => {
    const original = ["keep", "drop", "drop"].join("\n");
    const proposed = ["keep", "drop", "add"].join("\n");

    expect(buildLineDiffRows(original, proposed)).toEqual([
      { kind: "del", text: "drop" },
      { kind: "add", text: "add" },
    ]);
  });
});
