import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_PROVIDER_KEYS } from "../lib/keyring";

const generateTextMock = vi.fn();
const stepCountIsMock = vi.fn();
const buildConfiguredLanguageModelMock = vi.fn();
const buildLocalRuntimeToolGuidanceBlockMock = vi.fn(
  (names: string[]) => `guidance:${names.join(",")}`,
);
const buildTurnToolAvailabilityBlockMock = vi.fn(
  (names: string[]) => `availability:${names.join(",")}`,
);
const buildFsToolsMock = vi.fn();
const buildSearchToolsMock = vi.fn();

vi.mock("ai", () => ({
  generateText: generateTextMock,
  stepCountIs: stepCountIsMock,
}));

vi.mock("../lib/agent", () => ({
  buildConfiguredLanguageModel: buildConfiguredLanguageModelMock,
  buildLocalRuntimeToolGuidanceBlock: buildLocalRuntimeToolGuidanceBlockMock,
  buildTurnToolAvailabilityBlock: buildTurnToolAvailabilityBlockMock,
}));

vi.mock("../tools/fs", () => ({
  buildFsTools: buildFsToolsMock,
}));

vi.mock("../tools/search", () => ({
  buildSearchTools: buildSearchToolsMock,
}));

const { runSubagent } = await import("./runSubagent");

describe("runSubagent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stepCountIsMock.mockReturnValue("stop");
    buildConfiguredLanguageModelMock.mockResolvedValue("model");
    buildFsToolsMock.mockReturnValue({
      read_file: { description: "read" },
      list_directory: { description: "list" },
    });
    buildSearchToolsMock.mockReturnValue({
      grep: { description: "grep" },
      glob: { description: "glob" },
    });
    generateTextMock.mockResolvedValue({
      text: "done",
      steps: [{}, {}],
    });
  });

  it("passes allowed MCP research tools into the subagent runtime", async () => {
    await runSubagent({
      type: "general",
      prompt: "Search the web for docs",
      keys: { ...EMPTY_PROVIDER_KEYS },
      modelId: "gpt-5.4-mini",
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
      mcpTools: {
        web_search_exa: { description: "search" },
        web_search_advanced_exa: { description: "advanced-search" },
        web_fetch_exa: { description: "fetch" },
        "get-library-docs": { description: "docs" },
      },
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
        "get-library-docs",
      ],
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({
          read_file: expect.anything(),
          list_directory: expect.anything(),
          grep: expect.anything(),
          glob: expect.anything(),
          web_search_exa: expect.anything(),
          web_search_advanced_exa: expect.anything(),
          web_fetch_exa: expect.anything(),
          "get-library-docs": expect.anything(),
        }),
        system: expect.stringContaining("web_search_advanced_exa"),
      }),
    );
  });

  it("gives subagents their own named identity in the prompt", async () => {
    await runSubagent({
      type: "security",
      prompt: "Audit this code",
      keys: { ...EMPTY_PROVIDER_KEYS },
      modelId: "gpt-5.4-mini",
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
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("You are Koutarou Amon"),
      }),
    );
  });

  it("passes safe managed MCP tools into subagents", async () => {
    await runSubagent({
      type: "general",
      prompt: "Inspect the current registers in x64dbg",
      keys: { ...EMPTY_PROVIDER_KEYS },
      modelId: "gpt-5.4-mini",
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
      mcpTools: {
        GetRegisterDump: { description: "register dump" },
      },
      mcpToolNames: ["GetRegisterDump"],
    });

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.objectContaining({
          GetRegisterDump: expect.anything(),
        }),
      }),
    );
  });

  it("only exposes MCP tools explicitly approved by the parent runtime", async () => {
    await runSubagent({
      type: "explore",
      prompt: "Inspect repo",
      keys: { ...EMPTY_PROVIDER_KEYS },
      modelId: "gpt-5.4-mini",
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
      mcpTools: {
        web_search_exa: { description: "search" },
        made_up_tool: { description: "nope" },
      },
      mcpToolNames: ["web_search_exa"],
    });

    const call = generateTextMock.mock.calls[0]?.[0];
    expect(call.tools).toHaveProperty("web_search_exa");
    expect(call.tools).not.toHaveProperty("made_up_tool");
  });
});
