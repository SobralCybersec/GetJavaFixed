import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CONTEXT7_MCP_URL,
  EXA_MCP_URL,
} from "./mcpRegistry";
import type { McpConfig } from "./mcpClient";

const createMCPClientMock = vi.fn();

vi.mock("@ai-sdk/mcp", () => ({
  createMCPClient: createMCPClientMock,
}));

vi.mock("./proxyFetch", () => ({
  createProxyFetch: vi.fn(() => vi.fn()),
  proxyFetch: vi.fn(),
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

function makeConfig(args: {
  exaApiKey?: string;
  includeContext7?: boolean;
  context7ApiKey?: string;
  context7Url?: string;
} = {}): McpConfig {
  return {
    providers: [
      {
        id: "exa",
        label: "Exa",
        enabled: true,
        url: EXA_MCP_URL,
        auth: "x-api-key",
        apiKey: args.exaApiKey ?? "exa-key",
      },
      ...(args.includeContext7
        ? [
            {
              id: "context7",
              label: "Context7",
              enabled: true,
              url: args.context7Url ?? DEFAULT_CONTEXT7_MCP_URL,
              auth: "bearer" as const,
              apiKey: args.context7ApiKey,
            },
          ]
        : []),
    ],
  };
}

describe("mcp client cache", () => {
  beforeEach(async () => {
    await closeAllCachedMcpToolBundles();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await closeAllCachedMcpToolBundles();
  });

  it("reuses the same cached bundle for identical configs", async () => {
    const client = makeClient("web_search_exa");
    createMCPClientMock.mockResolvedValue(client);

    const first = await getCachedMcpToolBundle(makeConfig());
    const second = await getCachedMcpToolBundle(makeConfig());

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

    await getCachedMcpToolBundle(makeConfig({ exaApiKey: "exa-key-a" }));
    const next = await getCachedMcpToolBundle(makeConfig({ exaApiKey: "exa-key-b" }));

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

    await getCachedMcpToolBundle(makeConfig());
    await invalidateCachedMcpToolBundle(makeConfig());
    const rebuilt = await getCachedMcpToolBundle(makeConfig());

    expect(firstClient.close).toHaveBeenCalledTimes(1);
    expect(createMCPClientMock).toHaveBeenCalledTimes(2);
    expect(rebuilt.toolNames).toEqual(["web_search_exa"]);
  });

  it("keeps Exa tools available when Context7 fails to initialize", async () => {
    const exaClient = makeClient("web_search_exa");
    createMCPClientMock
      .mockResolvedValueOnce(exaClient)
      .mockRejectedValueOnce(new Error("context7 down"));

    const bundle = await getCachedMcpToolBundle(
      makeConfig({
        includeContext7: true,
        context7Url: "https://mcp.context7.com/mcp",
      }),
    );

    expect(bundle.toolNames).toEqual(["web_search_exa"]);
    expect(exaClient.close).not.toHaveBeenCalled();
  });

  it("closes clients that resolve after provider bootstrap timeout", async () => {
    vi.useFakeTimers();
    const lateClient = makeClient("web_search_exa");
    let resolveClient!: (client: ReturnType<typeof makeClient>) => void;
    createMCPClientMock.mockReturnValue(
      new Promise((resolve) => {
        resolveClient = resolve;
      }),
    );

    const pending = getCachedMcpToolBundle(makeConfig());
    const timeoutAssertion = expect(pending).rejects.toThrow(
      /bootstrap timed out/,
    );
    await vi.advanceTimersByTimeAsync(3_500);
    await timeoutAssertion;

    resolveClient(lateClient);
    await Promise.resolve();
    await Promise.resolve();

    expect(lateClient.close).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("filters managed x64dbg tools down to the app-safe allowlist", async () => {
    createMCPClientMock.mockResolvedValue({
      tools: vi.fn().mockResolvedValue({
        GetRegisterDump: { description: "safe" },
        GetCallStack: { description: "safe" },
        MemoryWrite: { description: "unsafe" },
        ExecCommand: { description: "unsafe" },
      }),
      close: vi.fn().mockResolvedValue(undefined),
    });

    const bundle = await getCachedMcpToolBundle({
      providers: [
        {
          id: "x64dbg",
          label: "x64dbg MCP",
          enabled: true,
          url: "http://127.0.0.1:8877/mcp",
          auth: "none",
        },
      ],
    });

    expect(bundle.toolNames).toEqual(["GetRegisterDump", "GetCallStack"]);
  });
});
