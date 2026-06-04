import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createMCPClientMock = vi.fn();

vi.mock("@ai-sdk/mcp", () => ({
  createMCPClient: createMCPClientMock,
}));

vi.mock("./proxyFetch", () => ({
  safeWindowFetch: vi.fn(),
}));

const {
  closeAllCachedMcpToolBundles,
  getCachedMcpToolBundle,
  invalidateCachedMcpToolBundle,
} = await import("./mcpClient");

function makeClient(toolName: string) {
  return {
    tools: vi.fn().mockResolvedValue({
      [toolName]: { description: toolName },
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

const baseConfig = {
  exaEnabled: true,
  exaApiKey: "exa-key",
  context7Enabled: false,
};

describe("mcp client cache", () => {
  beforeEach(async () => {
    await closeAllCachedMcpToolBundles();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await closeAllCachedMcpToolBundles();
  });

  it("reuses the same cached bundle for identical configs", async () => {
    const client = makeClient("web_search_exa");
    createMCPClientMock.mockResolvedValue(client);

    const first = await getCachedMcpToolBundle(baseConfig);
    const second = await getCachedMcpToolBundle(baseConfig);

    expect(first).toBe(second);
    expect(first.toolNames).toEqual(["web_search_exa"]);
    expect(createMCPClientMock).toHaveBeenCalledTimes(1);
    expect(client.tools).toHaveBeenCalledTimes(1);
    expect(client.close).not.toHaveBeenCalled();
    expect(createMCPClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({
          url: expect.stringContaining("web_search_advanced_exa"),
        }),
      }),
    );
  });

  it("closes the previous cached bundle when the config changes", async () => {
    const firstClient = makeClient("web_search_exa");
    const secondClient = makeClient("web_fetch_exa");
    createMCPClientMock
      .mockResolvedValueOnce(firstClient)
      .mockResolvedValueOnce(secondClient);

    await getCachedMcpToolBundle({
      ...baseConfig,
      exaApiKey: "exa-key-a",
    });
    const next = await getCachedMcpToolBundle({
      ...baseConfig,
      exaApiKey: "exa-key-b",
    });

    expect(firstClient.close).toHaveBeenCalledTimes(1);
    expect(secondClient.close).not.toHaveBeenCalled();
    expect(next.toolNames).toEqual(["web_fetch_exa"]);
  });

  it("can invalidate a cached bundle and rebuild it on the next request", async () => {
    const firstClient = makeClient("web_search_exa");
    const secondClient = makeClient("web_search_exa");
    createMCPClientMock
      .mockResolvedValueOnce(firstClient)
      .mockResolvedValueOnce(secondClient);

    await getCachedMcpToolBundle(baseConfig);
    await invalidateCachedMcpToolBundle(baseConfig);
    const rebuilt = await getCachedMcpToolBundle(baseConfig);

    expect(firstClient.close).toHaveBeenCalledTimes(1);
    expect(createMCPClientMock).toHaveBeenCalledTimes(2);
    expect(rebuilt.toolNames).toEqual(["web_search_exa"]);
  });

  it("keeps Exa tools available when Context7 fails to initialize", async () => {
    const exaClient = makeClient("web_search_exa");
    createMCPClientMock
      .mockResolvedValueOnce(exaClient)
      .mockRejectedValueOnce(new Error("context7 down"));

    const bundle = await getCachedMcpToolBundle({
      ...baseConfig,
      context7Enabled: true,
      context7Url: "https://mcp.context7.com/mcp",
    });

    expect(bundle.toolNames).toEqual(["web_search_exa"]);
    expect(exaClient.close).not.toHaveBeenCalled();
  });
});
