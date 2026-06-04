import type { UIMessage } from "@ai-sdk/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_PROVIDER_KEYS } from "./keyring";

const runAgentStreamMock = vi.fn();
const planAgentTurnCapabilitiesMock = vi.fn();
const getCachedMcpToolBundleMock = vi.fn();
const invalidateCachedMcpToolBundleMock = vi.fn();
const getRefactorToolKeyMock = vi.fn();

vi.mock("./agent", () => ({
  runAgentStream: runAgentStreamMock,
  planAgentTurnCapabilities: planAgentTurnCapabilitiesMock,
}));

vi.mock("./mcpClient", () => ({
  getCachedMcpToolBundle: getCachedMcpToolBundleMock,
  invalidateCachedMcpToolBundle: invalidateCachedMcpToolBundleMock,
}));

vi.mock("./toolKeyring", () => ({
  getRefactorToolKey: getRefactorToolKeyMock,
}));

const { createContextAwareTransport } = await import("./transport");

function userMessage(text: string): UIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

function makeDeps() {
  return {
    getKeys: () => ({ ...EMPTY_PROVIDER_KEYS }),
    toolContext: {
      getCwd: () => null,
      getWorkspaceRoot: () => null,
      getTerminalContext: () => null,
      isActiveTerminalPrivate: () => false,
      injectIntoActivePty: () => false,
      openPreview: () => false,
      spawnAgent: () => null,
      readAgentOutput: () => null,
      readCache: new Map(),
      getSessionId: () => "session-1",
    },
    getModelId: () => "gpt-5.4-mini" as const,
    getCustomInstructions: () => "",
    getAgentPersona: () => null,
    getLive: () => ({
      cwd: null,
      terminalPrivate: false,
      workspaceRoot: null,
      activeFile: null,
    }),
    getMcpConfig: () => ({
      exaEnabled: true,
      context7Enabled: true,
      context7Url: "https://mcp.context7.com/mcp",
    }),
  };
}

describe("context-aware transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    planAgentTurnCapabilitiesMock.mockReturnValue({
      shouldLoadMcp: false,
    });
    runAgentStreamMock.mockResolvedValue({
      toUIMessageStream: vi.fn(() => "stream"),
    });
  });

  it("skips MCP bootstrap for plain chat turns", async () => {
    const transport = createContextAwareTransport(makeDeps());

    await transport.sendMessages({
      messages: [userMessage("Hello there")],
    });

    expect(planAgentTurnCapabilitiesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: "gpt-5.4-mini",
      }),
    );
    expect(getCachedMcpToolBundleMock).not.toHaveBeenCalled();
    expect(getRefactorToolKeyMock).not.toHaveBeenCalled();
    expect(runAgentStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpTools: undefined,
        mcpToolNames: undefined,
      }),
    );
  });

  it("loads MCP tools only for research turns", async () => {
    planAgentTurnCapabilitiesMock.mockReturnValue({
      shouldLoadMcp: true,
    });
    getRefactorToolKeyMock
      .mockResolvedValueOnce("exa-key")
      .mockResolvedValueOnce("context7-key");
    getCachedMcpToolBundleMock.mockResolvedValue({
      tools: { web_search_exa: { description: "search" } },
      toolNames: ["web_search_exa"],
    });
    const transport = createContextAwareTransport(makeDeps());

    await transport.sendMessages({
      messages: [userMessage("Search the web for the latest docs")],
    });

    expect(getCachedMcpToolBundleMock).toHaveBeenCalledWith({
      exaEnabled: true,
      exaApiKey: "exa-key",
      context7Enabled: true,
      context7ApiKey: "context7-key",
      context7Url: "https://mcp.context7.com/mcp",
    });
    expect(runAgentStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpTools: { web_search_exa: { description: "search" } },
        mcpToolNames: ["web_search_exa"],
        runtimeNotices: [],
      }),
    );
  });

  it("invalidates timed-out MCP bootstrap attempts before retrying without MCP tools", async () => {
    vi.useFakeTimers();
    planAgentTurnCapabilitiesMock.mockReturnValue({
      shouldLoadMcp: true,
    });
    getRefactorToolKeyMock
      .mockResolvedValueOnce("exa-key")
      .mockResolvedValueOnce("context7-key");
    getCachedMcpToolBundleMock.mockReturnValue(new Promise(() => {}));
    const transport = createContextAwareTransport(makeDeps());

    const pending = transport.sendMessages({
      messages: [userMessage("Search the web for the latest docs")],
    });
    await vi.advanceTimersByTimeAsync(4_000);
    await pending;

    expect(invalidateCachedMcpToolBundleMock).toHaveBeenCalledWith({
      exaEnabled: true,
      exaApiKey: "exa-key",
      context7Enabled: true,
      context7ApiKey: "context7-key",
      context7Url: "https://mcp.context7.com/mcp",
    });
    expect(runAgentStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpTools: undefined,
        mcpToolNames: undefined,
        runtimeNotices: expect.arrayContaining([
          expect.stringContaining("MCP research tools were unavailable"),
        ]),
      }),
    );
  });

  it("warns the agent when research was requested but MCP resolves with no tools", async () => {
    planAgentTurnCapabilitiesMock.mockReturnValue({
      shouldLoadMcp: true,
    });
    getRefactorToolKeyMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    getCachedMcpToolBundleMock.mockResolvedValue({
      tools: {},
      toolNames: [],
    });
    const transport = createContextAwareTransport(makeDeps());

    await transport.sendMessages({
      messages: [userMessage("Use exa websearch and check the latest docs")],
    });

    expect(runAgentStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtimeNotices: expect.arrayContaining([
          expect.stringContaining("Do not claim you searched the web"),
        ]),
      }),
    );
  });
});
