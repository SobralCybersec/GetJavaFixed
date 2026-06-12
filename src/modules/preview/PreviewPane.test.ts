import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Source-level regression test for the preview iframe's security attributes.
 * Rendering this component for real requires jsdom + a working
 * useImperativeHandle stub; for a focused security check we just verify the
 * static JSX still carries the sandbox/referrerPolicy attributes — if a
 * future change silently removes them, this test fails.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, "PreviewPane.tsx"), "utf8");
const stackSrc = readFileSync(path.join(here, "PreviewStack.tsx"), "utf8");
const nativeSrc = readFileSync(
  path.join(here, "NativeWebviewSurface.tsx"),
  "utf8",
);
const iframeMatch = src.match(/<iframe[\s\S]*?\/>/);
const iframeJsx = (iframeMatch?.[0] ?? "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/[^\n]*/g, "");

describe("PreviewPane iframe sandbox", () => {
  it("declares an iframe in the source", () => {
    expect(iframeJsx).not.toBe("");
  });

  it("includes a sandbox attribute", () => {
    expect(iframeJsx).toMatch(/sandbox="[^"]*"/);
  });

  it("grants allow-scripts and allow-same-origin", () => {
    expect(iframeJsx).toMatch(/sandbox="[^"]*allow-scripts/);
    expect(iframeJsx).toMatch(/sandbox="[^"]*allow-same-origin/);
  });

  it("does NOT include allow-top-navigation* tokens", () => {
    expect(iframeJsx).not.toMatch(/allow-top-navigation/);
  });

  it("does NOT include allow-popups-without-allow-popups-to-escape-sandbox combo", () => {
    if (/allow-popups\b/.test(iframeJsx)) {
      expect(iframeJsx).toMatch(/allow-popups-to-escape-sandbox/);
    }
  });

  it("sets referrerPolicy to no-referrer", () => {
    expect(iframeJsx).toMatch(/referrerPolicy="no-referrer"/);
  });

  it("keeps preview containers clamped to their pane", () => {
    expect(src).toContain("min-h-0 w-full min-w-0");
    expect(src).toContain("min-w-0 flex-1 overflow-hidden");
    expect(stackSrc).toContain("min-h-0 w-full min-w-0 overflow-hidden");
    expect(stackSrc).toContain("absolute inset-0 min-h-0 min-w-0 overflow-hidden");
  });

  it("resyncs native webview bounds when layout moves", () => {
    expect(nativeSrc).toContain("requestSyncBounds");
    expect(nativeSrc).toContain('window.addEventListener("scroll", onScroll, true)');
    expect(nativeSrc).toContain("min-h-0 w-full min-w-0 overflow-hidden");
  });
});
