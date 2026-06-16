import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const nativeSrc = readFileSync(path.join(here, "native.ts"), "utf8");

describe("java-intake native bridge", () => {
  it("accepts assembly as a supported project type", () => {
    expect(nativeSrc).toContain('"assembly"');
  });

  it("uses browser directory picker before falling back to prompt", () => {
    expect(nativeSrc).toContain('typeof browserWindow.showDirectoryPicker === "function"');
    expect(nativeSrc).toContain('id: "javarf-browser-preview-repo"');
    expect(nativeSrc).toContain("showDirectoryPicker failed, falling back to prompt");
    expect(nativeSrc).toContain("Enter absolute path to workspace folder.");
  });
});
