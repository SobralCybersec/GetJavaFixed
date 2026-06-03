import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  buildTurnContextBlock,
  buildTurnToolAvailabilityBlock,
  messageLikelyNeedsMcpTools,
  selectActiveTools,
} from "./agent";

function userMessage(text: string): UIMessage {
  return {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text }],
  } as UIMessage;
}

describe("agent tool selection", () => {
  it("omits tools for plain proxy-backed chat turns", () => {
    expect(
      selectActiveTools(
        [userMessage("Hello there, how are you?")],
        "openai-compatible",
      ),
    ).toBeUndefined();
  });

  it("keeps file inspection tools when the user asks to read code", () => {
    expect(
      selectActiveTools(
        [userMessage("Read src/main.ts and explain what it does")],
        "openai-compatible",
      ),
    ).toEqual(expect.arrayContaining(["read_file", "list_directory"]));
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
  });

  it("treats plural mcps as MCP intent", () => {
    const messages = [userMessage("Check what things you can do to improve that, use your mcps.")];

    expect(messageLikelyNeedsMcpTools(messages)).toBe(true);
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
