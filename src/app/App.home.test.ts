import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");

describe("App home dashboard shell", () => {
  it("boots into home dashboard when no workspace is active", () => {
    expect(appSrc).toContain("HomeDashboard");
    expect(appSrc).toContain("!hasWorkspace ? (");
    expect(appSrc).toContain("defaultSize={hasWorkspace ?");
  });
});
