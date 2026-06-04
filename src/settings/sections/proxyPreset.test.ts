import { describe, expect, it } from "vitest";
import {
  buildProxyStatusArgs,
  getEffectiveProxyPath,
  isUsingAutoDetectedProxyPath,
} from "./proxyPreset";

describe("proxy preset helpers", () => {
  it("prefers a manually selected path over detected defaults", () => {
    expect(
      getEffectiveProxyPath(
        "C:/manual/deepsproxy",
        { path: "C:/repo/needhavesupport/deepsproxy" } as never,
        null,
      ),
    ).toBe("C:/manual/deepsproxy");
  });

  it("falls back to a detected repo-local path when no manual path exists", () => {
    expect(
      getEffectiveProxyPath(
        "",
        { path: "C:/repo/needhavesupport/kimiproxy" } as never,
        null,
      ),
    ).toBe("C:/repo/needhavesupport/kimiproxy");
  });

  it("treats blank paths as null in proxy status args", () => {
    expect(buildProxyStatusArgs("deepsproxy", "", "http://localhost:11434/v1")).toEqual([
      "deepsproxy",
      null,
      "http://localhost:11434/v1",
      null,
    ]);
  });

  it("flags when the UI is using an auto-detected path", () => {
    expect(
      isUsingAutoDetectedProxyPath(
        "",
        "C:/repo/needhavesupport/deepsproxy",
      ),
    ).toBe(true);
    expect(
      isUsingAutoDetectedProxyPath(
        "C:/manual/deepsproxy",
        "C:/manual/deepsproxy",
      ),
    ).toBe(false);
  });
});
