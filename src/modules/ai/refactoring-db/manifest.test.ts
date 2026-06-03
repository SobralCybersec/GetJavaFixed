import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(here, "manifest.json");

describe("refactor manifest", () => {
  it("keeps runtime-editable rule metadata", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      rules: Array<{ id: string; file: string; triggerPrefixes: string[] }>;
      gaps: Array<{ id: string; notes: string }>;
    };

    expect(manifest.rules.length).toBeGreaterThan(5);
    expect(
      manifest.rules.some(
        (rule) => rule.id === "replace-system-out-println-with-logger",
      ),
    ).toBe(true);
    expect(
      manifest.rules.every(
        (rule) => !!rule.file && Array.isArray(rule.triggerPrefixes),
      ),
    ).toBe(true);
    expect(manifest.gaps.length).toBeGreaterThan(0);
  });
});
