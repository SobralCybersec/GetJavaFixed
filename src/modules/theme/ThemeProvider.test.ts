import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const providerSrc = readFileSync(path.join(here, "ThemeProvider.tsx"), "utf8");

describe("ThemeProvider shell behavior", () => {
  it("resolves system theme from the OS media query", () => {
    expect(providerSrc).toContain('window.matchMedia("(prefers-color-scheme: dark)")');
    expect(providerSrc).toContain('mode === "system" ? systemResolvedMode : mode');
  });

  it("keeps the root color scheme in sync with the resolved mode", () => {
    expect(providerSrc).toContain("root.style.colorScheme = resolvedMode");
    expect(providerSrc).toContain('resolvedMode === "dark" ? "#0a0a0a" : "#ffffff"');
  });
});
