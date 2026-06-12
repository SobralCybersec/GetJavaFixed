import type { UIMessage } from "@ai-sdk/react";
import { describe, expect, it } from "vitest";
import { shouldAutoContinueAgentTurn } from "./chatStore";

function assistantMessage(parts: UIMessage["parts"]): UIMessage {
  return {
    id: "assistant-1",
    role: "assistant",
    parts,
  } as UIMessage;
}

describe("shouldAutoContinueAgentTurn", () => {
  it("continues after server tool output is available", () => {
    const message = assistantMessage([
      { type: "step-start" },
      {
        type: "tool-web_search_exa",
        toolCallId: "call-1",
        state: "output-available",
        input: { query: "Matheus Sobral da Silva" },
        output: { results: [] },
      },
    ] as unknown as UIMessage["parts"]);

    expect(shouldAutoContinueAgentTurn({ messages: [message] })).toBe(true);
  });

  it("continues after an approval response is recorded", () => {
    const message = assistantMessage([
      { type: "step-start" },
      {
        type: "tool-write_file",
        toolCallId: "call-1",
        state: "approval-responded",
        approval: { id: "approval-1", approved: true },
        input: { path: "README.md", content: "ok" },
      },
    ] as unknown as UIMessage["parts"]);

    expect(shouldAutoContinueAgentTurn({ messages: [message] })).toBe(true);
  });

  it("does not continue after a text-only assistant answer", () => {
    const message = assistantMessage([
      { type: "text", text: "Done." },
    ] as unknown as UIMessage["parts"]);

    expect(shouldAutoContinueAgentTurn({ messages: [message] })).toBe(false);
  });
});
