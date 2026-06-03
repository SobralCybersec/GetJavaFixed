import { describe, expect, it, vi } from "vitest";

describe("safeWindowFetch", () => {
  it("keeps browser fetch bound to window/global object", async () => {
    const originalFetch = globalThis.fetch;
    const browserLikeFetch = vi.fn(function (this: unknown) {
      if (this !== globalThis) {
        throw new TypeError(
          "Failed to execute 'fetch' on 'Window': Illegal invocation",
        );
      }
      return Promise.resolve(
        new Response("ok", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
      );
    }) as typeof fetch;

    globalThis.fetch = browserLikeFetch;
    try {
      const { safeWindowFetch } = await import("./proxyFetch");
      const response = await safeWindowFetch("https://example.com");
      expect(response.status).toBe(200);
      expect(browserLikeFetch).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
      vi.resetModules();
    }
  });
});
