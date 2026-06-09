import type { UIMessage } from "@ai-sdk/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_PROVIDER_KEYS } from "./keyring";
import {
  DEFAULT_CONTEXT7_MCP_URL,
  EXA_MCP_URL,
} from "./mcpRegistry";

const runAgentStreamMock = vi.fn();
const planAgentTurnCapabilitiesMock = vi.fn();
const getCachedMcpToolBundleMock = vi.fn();
const invalidateCachedMcpToolBundleMock = vi.fn();
const getRefactorToolKeyMock = vi.fn();

vi.mock("./agent", () => ({
  LIVE_RESEARCH_UNAVAILABLE_NOTICE:
    "Live web/docs research was explicitly requested, but MCP research tools were unavailable this turn. Do not answer that research request from memory or local workspace files as a substitute. State clearly that live web research could not be performed, and only add clearly-labeled local workspace context as an optional fallback.",
  messageLikelyNeedsResearchMcpTools: vi.fn(() => true),
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

function buildMcpConfig() {
  return {
    providers: [
      {
        id: "exa",
        label: "Exa",
        enabled: true,
        url: EXA_MCP_URL,
        auth: "x-api-key" as const,
      },
      {
        id: "context7",
        label: "Context7",
        enabled: true,
        url: DEFAULT_CONTEXT7_MCP_URL,
        auth: "bearer" as const,
      },
    ],
  };
}

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
    getMcpConfig: () => buildMcpConfig(),
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
        selectedAgentRequiresManagedMcp: null,
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

  it("passes the selected agent MCP requirement into turn planning", async () => {
    const transport = createContextAwareTransport({
      ...makeDeps(),
      getAgentPersona: () => ({
        name: "Juuzou Suzuya",
        instructions: "Debugger-first reverse-engineering specialist.",
        requiresManagedMcp: "x64dbg",
      }),
    });

    await transport.sendMessages({
      messages: [userMessage("What's wrong here?")],
    });

    expect(planAgentTurnCapabilitiesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedAgentRequiresManagedMcp: "x64dbg",
      }),
    );
    expect(runAgentStreamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentPersona: expect.objectContaining({
          name: "Juuzou Suzuya",
          requiresManagedMcp: "x64dbg",
        }),
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
      providers: [
        {
          id: "exa",
          label: "Exa",
          enabled: true,
          url: EXA_MCP_URL,
          auth: "x-api-key",
          apiKey: "exa-key",
        },
        {
          id: "context7",
          label: "Context7",
          enabled: true,
          url: DEFAULT_CONTEXT7_MCP_URL,
          auth: "bearer",
          apiKey: "context7-key",
        },
      ],
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
      providers: [
        {
          id: "exa",
          label: "Exa",
          enabled: true,
          url: EXA_MCP_URL,
          auth: "x-api-key",
          apiKey: "exa-key",
        },
        {
          id: "context7",
          label: "Context7",
          enabled: true,
          url: DEFAULT_CONTEXT7_MCP_URL,
          auth: "bearer",
          apiKey: "context7-key",
        },
      ],
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
          expect.stringContaining("Do not answer that research request from memory"),
          expect.stringContaining("live web research could not be performed"),
        ]),
      }),
    );
  });
});
