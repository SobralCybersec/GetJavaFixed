import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = readFileSync(path.join(here, "App.tsx"), "utf8");

describe("App dashboard routing", () => {
  it("keeps dashboard behind an explicit tab instead of booting into it", () => {
    expect(appSrc).toContain('useState<"hidden" | "intake" | "dashboard">(');
    expect(appSrc).toContain('"hidden"');
    expect(appSrc).toContain("isDashboardTab ? (");
  });
});
