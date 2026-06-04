import type { ToolSet, UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT_LITE, selectSystemPrompt } from "../config";
import {
  buildLocalRuntimeToolGuidanceBlock,
  buildTurnExecutionGuidanceBlock,
  buildTurnContextBlock,
  buildTurnToolAvailabilityBlock,
  extractLikelyLiveRequestText,
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
    open_preview: { description: "preview" },
    suggest_command: { description: "command" },
    todo_write: { description: "todo" },
    run_subagent: { description: "subagent" },
    spawn_coding_agent: { description: "spawn" },
    send_to_agent: { description: "send" },
    read_agent_output: { description: "agent-output" },
    web_search_exa: { description: "search" },
    web_search_advanced_exa: { description: "advanced-search" },
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

  it("does not force active-file context into plain greetings", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/GenericArmorLayerJJK.java\n</env>\n\nHello there",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toBeUndefined();
    expect(plan.shouldRequireFirstToolCall).toBe(false);
    expect(plan.shouldIncludeTurnContext).toBe(false);
  });

  it("keeps local runtimes on the selected model even for simple chat", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "lmstudio-local",
      messages: [userMessage("Hello there, how are you?")],
      availableTools: makeAvailableTools(),
    });

    expect(plan.routedModelId).toBe("lmstudio-local");
  });

  it("only downgrades hosted models for pure conversational turns", () => {
    const pureChat = planAgentTurnCapabilities({
      modelId: "gpt-5.5",
      messages: [userMessage("Hello there, how are you?")],
      availableTools: makeAvailableTools(),
    });
    const codeAware = planAgentTurnCapabilities({
      modelId: "gpt-5.5",
      messages: [
        userMessage(
          "<env>\nworkspace_root: C:/repo\nactive_terminal_cwd: C:/repo\nactive_file: C:/repo/App.tsx\n</env>\n\nWhat's wrong here?",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(pureChat.routedModelId).toBe("gpt-5.4-mini");
    expect(codeAware.routedModelId).toBe("gpt-5.5");
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
    ).toEqual(expect.arrayContaining(["read_file", "list_directory", "grep", "glob"]));
  });

  it("keeps active-file analysis turns read/search only", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/AwakeningGojo.java\n</env>\n\nWhat's wrong here?",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining(["read_file", "list_directory", "grep", "glob"]),
    );
    expect(plan.activeTools).not.toEqual(expect.arrayContaining(["edit", "multi_edit"]));
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

  it("extracts the trailing live request from a pasted transcript", () => {
    expect(
      extractLikelyLiveRequestText([
        userMessage(
          `Hello who are you?

Reasoned
We need to respond in plain text only.

Hello! I'm JavaRf, your AI pair-programming assistant focused on safe Java refactoring.

Can you websearch in internet?`,
        ),
      ]),
    ).toBe("Can you websearch in internet?");
  });

  it("does not let pasted transcript tool traces suppress a trailing web request", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          `Hello there

Reasoned
I'm currently in a plain-text-only turn.

Read what file I'm on

Reasoned
Read
G:/Projetos Code v2/Minecraft Projects (Java)/JujutsuKaisenUltimateReworked/gradle.properties

Check in Internet/Search websearch and find the best configs setup for this.`,
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
    expect(plan.shouldRequireFirstToolCall).toBe(true);
  });

  it("does not let pasted transcript tool traces force tools for a trailing plain question", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          `Hello there

Reasoned
I'm currently in a plain-text-only turn.

Read what file I'm on

Reasoned
Read
G:/Projetos Code v2/Minecraft Projects (Java)/JujutsuKaisenUltimateReworked/gradle.properties

Hello who are you?`,
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toBeUndefined();
    expect(plan.shouldRequireFirstToolCall).toBe(false);
    expect(plan.isSimple).toBe(true);
  });

  it("treats agent behavior diagnostics as a codebase search turn", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "Check the agents/subagents and understand what is wrong with the behavior. The MCPs are working, but the agent is not smart about what is wrong with the code.",
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining(["read_file", "list_directory", "grep", "glob"]),
    );
    expect(plan.shouldRequireFirstToolCall).toBe(true);
    expect(plan.activeTools).not.toEqual(
      expect.arrayContaining(["todo_write", "run_subagent"]),
    );
  });

  it("flags research turns for MCP bootstrap and MCP tools", () => {
    const messages = [
      userMessage("Search the web for the latest React 2026 docs and summarize them"),
    ];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
    expect(
      selectActiveTools(messages, "openai-compatible", [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
        "get-library-docs",
      ]),
    ).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
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
        "web_search_advanced_exa",
        "web_fetch_exa",
        "get-library-docs",
      ],
    });

    expect(plan.shouldLoadMcp).toBe(true);
    expect(plan.shouldRequireFirstToolCall).toBe(true);
    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
        "get-library-docs",
      ]),
    );
  });

  it("keeps active-file import research grounded in the selected file", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/GenericArmorLayerJJK.java\n</env>\n\nWebSearch and tell me about these imports, check what they are and what they do.",
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "grep",
        "glob",
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
    expect(plan.shouldRequireFirstToolCall).toBe(true);
    expect(plan.shouldIncludeTurnContext).toBe(true);
  });

  it("treats active-file library websearch requests as read plus MCP research turns", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/CombatStyleService.java\n</env>\n\nWebSearch and find what is about it lib.",
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "grep",
        "glob",
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
    expect(plan.shouldRequireFirstToolCall).toBe(true);
  });

  it("does not expose edit tools for refactor research phrased as analysis", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/CombatStyleService.java\n</env>\n\nUse exa websearch and find what we're going to refactor/change about it to best refactoring.",
        ),
      ],
      availableTools: makeAvailableTools(),
      mcpToolNames: [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining([
        "read_file",
        "list_directory",
        "grep",
        "glob",
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
    expect(plan.activeTools).not.toEqual(
      expect.arrayContaining(["edit", "multi_edit", "write_file", "create_directory"]),
    );
  });

  it("treats plural mcps as MCP intent", () => {
    const messages = [userMessage("Check what things you can do to improve that, use your mcps.")];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
  });

  it("does not treat MCP status chatter as MCP research intent", () => {
    const messages = [
      userMessage(
        "The MCPs are working, but the agent is still not smart about diagnosing what is wrong with the code.",
      ),
    ];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(false);
    expect(
      selectActiveTools(messages, "openai-compatible", [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    ).not.toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
  });

  it("treats a bare research request as research intent", () => {
    const messages = [userMessage("Research")];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
    expect(
      selectActiveTools(messages, "openai-compatible", [
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    ).toEqual(
      expect.arrayContaining([
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ]),
    );
  });

  it("does not treat plain mentions of plan or agent as delegation intent", () => {
    const plan = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/Agent.ts\n</env>\n\nMake a plan for this file and explain why the agent gets confused.",
        ),
      ],
      availableTools: makeAvailableTools(),
    });

    expect(plan.activeTools).toEqual(
      expect.arrayContaining(["read_file", "list_directory", "grep", "glob"]),
    );
    expect(plan.activeTools).not.toEqual(
      expect.arrayContaining(["todo_write", "run_subagent"]),
    );
  });

  it("only exposes preview tools for real preview/browser requests", () => {
    const fileTurn = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [
        userMessage(
          "<env>\nactive_file: C:/repo/App.tsx\n</env>\n\nOpen this file and explain it.",
        ),
      ],
      availableTools: makeAvailableTools(),
    });
    const previewTurn = planAgentTurnCapabilities({
      modelId: "openai-compatible-custom",
      messages: [userMessage("Open http://localhost:3000 in browser")],
      availableTools: makeAvailableTools(),
    });

    expect(fileTurn.activeTools).not.toEqual(
      expect.arrayContaining(["open_preview", "suggest_command"]),
    );
    expect(previewTurn.activeTools).toEqual(
      expect.arrayContaining(["open_preview", "suggest_command"]),
    );
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

  it("adds explicit web-research execution guidance for active-file turns", () => {
    const guidance = buildTurnExecutionGuidanceBlock({
      latestDirectRequest:
        "Use exa deep websearch and find the latest 2026 guidance for what we're going to refactor/change about it.",
      activeToolNames: [
        "read_file",
        "web_search_exa",
        "web_search_advanced_exa",
        "web_fetch_exa",
      ],
      env: {
        workspaceRoot: "C:/repo",
        cwd: "C:/repo",
        activeFile: "C:/repo/CombatStyleService.java",
        terminalPrivate: false,
      },
    });

    expect(guidance).toContain("explicitly requests live web/docs research");
    expect(guidance).toContain("read `active_file` first");
    expect(guidance).toContain(
      "`web_search_exa`, `web_search_advanced_exa`, `web_fetch_exa`",
    );
    expect(guidance).toContain("Prefer `web_search_advanced_exa`");
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
