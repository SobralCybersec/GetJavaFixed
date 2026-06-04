import type { ToolSet, UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT_LITE, selectSystemPrompt } from "../config";
import {
  buildLocalRuntimeToolGuidanceBlock,
  buildTurnContextBlock,
  buildTurnToolAvailabilityBlock,
  isDegradedLocalToolTurn,
  messageLikelyNeedsMcpTools,
  normalizeAgentRunError,
  planAgentTurnCapabilities,
  selectActiveTools,
  tryRepairToolInput,
} from "./agent";

function userMessage(text: string): UIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

function makeAvailableTools(): ToolSet {
  return {
    read_file: { description: "read" },
    list_directory: { description: "ls" },
    grep: { description: "grep" },
    glob: { description: "glob" },
    edit: { description: "edit" },
    multi_edit: { description: "multi-edit" },
    write_file: { description: "write" },
    create_directory: { description: "mkdir" },
    bash_run: { description: "bash" },
    get_terminal_output: { description: "terminal" },
    todo_write: { description: "todo" },
    run_subagent: { description: "subagent" },
    web_search_exa: { description: "search" },
    web_fetch_exa: { description: "fetch" },
    "get-library-docs": { description: "docs" },
    "resolve-library-id": { description: "resolve" },
  } as unknown as ToolSet;
}

describe("agent tool selection", () => {
  it("does not expose tools for ordinary chat turns", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [userMessage("Hello there, how are you?")],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toBeUndefined();
    expect(plan.selectedTools).toBeUndefined();
    expect(plan.shouldRequireFirstToolCall).toBe(false);
  });

  it("narrows runtime tools to the exact active set for read/search turns", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [userMessage("Read src/main.ts and find related files")],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toEqual([
      "read_file",
      "list_directory",
      "grep",
      "glob",
    ]);
    expect(Object.keys(plan.selectedTools ?? {})).toEqual([
      "read_file",
      "list_directory",
      "grep",
      "glob",
    ]);
    expect(plan.shouldRequireFirstToolCall).toBe(true);
  });

  it("treats selected active file as real context for vague code questions", () => {
    expect(
      selectActiveTools(
        [
          userMessage(
            "<env>\nactive_file: C:/repo/AwakeningGojo.java\n</env>\n\nWhat's wrong here?",
          ),
        ],
        "openai-compatible",
      ),
    ).toEqual(expect.arrayContaining(["read_file", "list_directory"]));
  });

  it("keeps edit tools available for active-file change requests", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/GenericArmorLayerJJK.java\n</env>\n\nAdd a simple logger here in the file with a simple print saying hello.",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "edit",
        "multi_edit",
      ]),
    );
    expect(Object.keys(plan.selectedTools ?? {})).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "edit",
        "multi_edit",
      ]),
    );
    expect(plan.shouldRequireFirstToolCall).toBe(true);
  });

  it("ignores quoted env blocks inside pasted transcripts", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/RealActiveFile.java\n</env>\n\nHere our conversation with the agent:\n<env>\nactive_file: C:/repo/WrongTranscriptFile.java\n</env>\n\nThe quoted transcript above is old. Add a simple logger here in the file.",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.env.activeFile).toBe("C:/repo/RealActiveFile.java");
    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "edit",
        "multi_edit",
      ]),
    );
  });

  it("does not invent active file context from a pasted transcript alone", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "Here our conversation with the agent:\n<env>\nactive_file: C:/repo/WrongTranscriptFile.java\n</env>\n\nPlease diagnose why it got confused.",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.env.activeFile).toBeNull();
  });

  it("flags research turns for MCP bootstrap and MCP tools", () => {
    const messages = [
      userMessage("Search the web for the latest React 2026 docs and summarize them"),
    ];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
    expect(
      selectActiveTools(messages, "openai-compatible", [
        "web_search_exa",
        "web_fetch_exa",
        "get-library-docs",
      ]),
    ).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_fetch_exa",
        "get-library-docs",
      ]),
    );

    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages,
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_fetch_exa",
        "get-library-docs",
      ],
    });

    expect(plan.shouldLoadMcp).toBe(true);
    expect(plan.shouldRequireFirstToolCall).toBe(true);
    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_fetch_exa",
        "get-library-docs",
      ]),
    );
  });

  it("treats plural mcps as MCP intent", () => {
    const messages = [userMessage("Check what things you can do to improve that, use your mcps.")];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
  });

  it("treats a bare research request as research intent", () => {
    const messages = [userMessage("Research")];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
    expect(
      selectActiveTools(messages, "openai-compatible", [
        "web_search_exa",
        "web_fetch_exa",
      ]),
    ).toEqual(expect.arrayContaining(["web_search_exa", "web_fetch_exa"]));
  });

  it("tells the model the exact tools available this turn", () => {
    expect(
      buildTurnToolAvailabilityBlock(["read_file", "grep", "glob"]),
    ).toContain("The only tools available this turn are");
    expect(
      buildTurnToolAvailabilityBlock(["read_file", "grep", "glob"]),
    ).not.toContain("bash_run");
    expect(buildTurnToolAvailabilityBlock()).toContain(
      "No tools are available this turn.",
    );
  });

  it("keeps local-runtime guidance scoped to the active tool set", () => {
    const guidance = buildLocalRuntimeToolGuidanceBlock([
      "read_file",
      "list_directory",
      "grep",
      "glob",
    ]);

    expect(guidance).toContain("`read_file`");
    expect(guidance).toContain("`grep`, `glob`");
    expect(guidance).not.toContain("`bash_run`");
    expect(guidance).not.toContain("`edit`");
  });

  it("uses the lite prompt for local placeholder model ids", () => {
    expect(selectSystemPrompt("openai-compatible-custom")).toBe(
      SYSTEM_PROMPT_LITE,
    );
    expect(selectSystemPrompt("lmstudio-local")).toBe(SYSTEM_PROMPT_LITE);
  });

  it("repairs empty-string tool arguments into an empty object", () => {
    expect(tryRepairToolInput("")).toEqual({});
    expect(tryRepairToolInput("   ")).toEqual({});
  });

  it("normalizes unavailable-tool errors when no tools were exposed", () => {
    const message = normalizeAgentRunError(
      new Error(
        "Model tried to call unavailable tool 'multi_edit'. No tools are available.",
      ),
    );

    expect(message).toContain("`multi_edit`");
    expect(message).toContain("this turn exposed no tools");
    expect(message).not.toContain("Model tried to call unavailable tool");
  });

  it("normalizes unavailable-tool errors with the active tool list", () => {
    const message = normalizeAgentRunError(
      new Error(
        "Model tried to call unavailable tool 'bash_run'. Available tools: read_file, list_directory, grep, glob.",
      ),
    );

    expect(message).toContain("`bash_run`");
    expect(message).toContain("`read_file`");
    expect(message).toContain("`glob`");
    expect(message).not.toContain("Model tried to call unavailable tool");
  });

  it("normalizes malformed tool-input failures", () => {
    const error = new Error("JSON parsing failed while decoding tool arguments");
    error.name = "AI_InvalidToolInputError";

    const message = normalizeAgentRunError(error);

    expect(message).toContain("malformed arguments");
    expect(message).not.toContain("JSON parsing failed");
  });

  it("fails fast when runtime tools drift away from the active tool plan", () => {
    expect(() =>
      planAgentTurnCapabilities({
        modelId: "openai-compatible-custom",
        messages: [userMessage("Read src/main.ts and explain what it does")],
        availableTools: {
          read_file: { description: "read" },
        } as unknown as ToolSet,
      }),
    ).toThrow(/turn tool selection drifted/i);
  });

  it("treats simple local read turns as strict tool turns", () => {
    expect(
      isDegradedLocalToolTurn({
        provider: "openai-compatible",
        messages: [
          userMessage(
            "<env>\nactive_file: C:/repo/EarthWallAbility.java\n</env>\n\nWhich suggestions you have for this code?",
          ),
        ],
        activeTools: ["read_file", "list_directory"],
      }),
    ).toBe(true);
  });

  it("tells the model to use active_file when one is selected", () => {
    expect(
      buildTurnContextBlock({
        workspaceRoot: "C:/repo",
        cwd: "C:/repo",
        activeFile: "C:/repo/AwakeningGojo.java",
        terminalPrivate: false,
      }),
    ).toContain("AwakeningGojo.java");
    expect(
      buildTurnContextBlock({
        workspaceRoot: "C:/repo",
        cwd: "C:/repo",
        activeFile: "C:/repo/AwakeningGojo.java",
        terminalPrivate: false,
      }),
    ).toContain("Do not claim that no file context was provided");
  });
});
