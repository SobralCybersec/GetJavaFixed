import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { buildConversationSummary } from "./conversationSummary";

describe("conversationSummary", () => {
  it("extracts resources, changes, issues, and tool counts from chat messages", () => {
    const messages = [
      {
        id: "user-1",
        role: "user",
        parts: [
          {
            type: "text",
            text: "Check https://example.com/docs and keep note of it.",
          },
        ],
      },
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "High: null handling still broken.\nIssue: missing test coverage for parser.",
          },
          {
            type: "dynamic-tool",
            toolName: "write_file",
            state: "output-available",
            input: {
              path: "src/App.tsx",
              content: "line one\nline two",
            },
          },
          {
            type: "tool-web_fetch_exa",
            state: "output-available",
            input: {
              urls: ["https://openai.com/research"],
            },
          },
          {
            type: "tool-open_preview",
            state: "approval-requested",
            input: {
              url: "http://localhost:3000",
            },
          },
        ],
      },
    ] as UIMessage[];

    const summary = buildConversationSummary({
      messages,
      aiDiffTabs: [
        {
          approvalId: "approval-1",
          path: "src/App.tsx",
          status: "pending",
          title: "App.tsx (AI diff)",
        },
      ],
    });

    expect(summary.stats.messages).toBe(2);
    expect(summary.stats.toolCalls).toBe(3);
    expect(summary.stats.pendingApprovals).toBe(1);
    expect(summary.resources.map((resource) => resource.url)).toEqual(
      expect.arrayContaining([
        "https://example.com/docs",
        "https://openai.com/research",
        "http://localhost:3000",
      ]),
    );
    expect(summary.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "write_file",
          path: "src/App.tsx",
        }),
        expect.objectContaining({
          kind: "ai-diff",
          path: "src/App.tsx",
          status: "pending",
        }),
      ]),
    );
    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: "high" }),
        expect.objectContaining({ summary: "Issue: missing test coverage for parser." }),
      ]),
    );
    expect(summary.latestAssistantNote).toContain("null handling still broken");
  });
});
