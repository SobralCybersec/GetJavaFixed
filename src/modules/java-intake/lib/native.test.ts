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
});
