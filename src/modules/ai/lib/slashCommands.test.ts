import { beforeEach, describe, expect, it, vi } from "vitest";

const planState = {
  active: false,
  toggle: vi.fn(() => {
    planState.active = !planState.active;
  }),
  disable: vi.fn(() => {
    planState.active = false;
  }),
};

const chatState = {
  selectedModelId: "lmstudio-local",
};

vi.mock("../store/planStore", () => ({
  usePlanStore: {
    getState: () => planState,
  },
}));

vi.mock("../store/chatStore", () => ({
  useChatStore: {
    getState: () => chatState,
  },
}));

vi.mock("../config", () => ({
  getModel: (modelId: string) => ({
    id: modelId,
    provider:
      modelId === "gpt-5.5"
        ? "openai"
        : modelId === "lmstudio-local"
          ? "lmstudio"
          : "openai-compatible",
  }),
}));

const { tryRunSlashCommand } = await import("./slashCommands");

describe("slash commands", () => {
  beforeEach(() => {
    planState.active = false;
    chatState.selectedModelId = "lmstudio-local";
    vi.clearAllMocks();
  });

  it("fails clearly for /claude-code on local runtimes", () => {
    const result = tryRunSlashCommand("/claude-code investigate failing tests");

    expect(result).toEqual({
      kind: "handled",
      toast:
        "Claude Code delegation is unavailable on local/OpenAI-compatible runtimes. Switch to a hosted provider first.",
    });
  });

  it("keeps /claude-code available on hosted runtimes", () => {
    chatState.selectedModelId = "gpt-5.5";

    const result = tryRunSlashCommand("/claude-code investigate failing tests");

    expect(result.kind).toBe("send-prompt");
    if (result.kind !== "send-prompt") return;
    expect(result.commandName).toBe("claude-code");
    expect(result.prompt).toContain("read_agent_output");
    expect(result.prompt).toContain("spawn_coding_agent");
  });
});
