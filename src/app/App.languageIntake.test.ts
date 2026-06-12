import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");

describe("App polyglot intake gating", () => {
  it("uses shared source-file detection instead of a java-only check", () => {
    expect(appSrc).toContain("function isPhase1CodePath");
    expect(appSrc).toContain('"asm"');
    expect(appSrc).toContain("isPhase1CodePath(normalizedPath)");
    expect(appSrc).not.toContain('normalizedPath.endsWith(".java")');
  });
});
