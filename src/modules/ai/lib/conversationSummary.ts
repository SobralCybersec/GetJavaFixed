import type { UIMessage } from "ai";
import {
  extractLinkPreviewSeeds,
  type LinkPreviewSeed,
} from "./linkPreview";

type AiDiffLike = {
  approvalId: string;
  path: string;
  status: "pending" | "approved" | "rejected";
  title: string;
};

export type ConversationResource = LinkPreviewSeed & {
  source: string;
};

export type ConversationChange = {
  key: string;
  kind: "write_file" | "edit" | "multi_edit" | "create_directory" | "ai-diff";
  path: string;
  title: string;
  detail: string;
  status?: "pending" | "approved" | "rejected";
};

export type ConversationIssue = {
  key: string;
  severity: "high" | "medium" | "low" | null;
  summary: string;
};

export type ConversationToolCall = {
  key: string;
  toolName: string;
  state: string;
  detail: string;
  needsApproval: boolean;
};

export type ConversationSummary = {
  stats: {
    messages: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    pendingApprovals: number;
    resources: number;
    changes: number;
    issues: number;
  };
  resources: ConversationResource[];
  changes: ConversationChange[];
  issues: ConversationIssue[];
  toolCalls: ConversationToolCall[];
  latestAssistantNote: string | null;
};

export function buildConversationSummary({
  messages,
  aiDiffTabs = [],
}: {
  messages: ReadonlyArray<UIMessage>;
  aiDiffTabs?: ReadonlyArray<AiDiffLike>;
}): ConversationSummary {
  const resources = new Map<string, ConversationResource>();
  const changes = new Map<string, ConversationChange>();
  const issues = new Map<string, ConversationIssue>();
  const toolCalls: ConversationToolCall[] = [];
  let toolCallCount = 0;
  let pendingApprovals = 0;
  let userMessages = 0;
  let assistantMessages = 0;
  let latestAssistantNote: string | null = null;

  for (const message of messages) {
    if (message.role === "user") userMessages += 1;
    if (message.role === "assistant") assistantMessages += 1;

    for (const rawPart of message.parts ?? []) {
      if (!isRecord(rawPart)) continue;
      const part: Record<string, unknown> = rawPart;

      if (part.type === "text" && typeof part.text === "string") {
        const text = part.text.trim();
        if (!text) continue;
        addResources(resources, extractLinkPreviewSeeds(text), "message");
        if (message.role === "assistant") {
          latestAssistantNote = text;
          for (const issue of extractIssues(text)) {
            issues.set(issue.key, issue);
          }
        }
        continue;
      }

      const toolName = getToolName(part);
      if (!toolName) continue;

      const state = typeof part.state === "string" ? part.state : "output-available";
      const input = isRecord(part.input) ? part.input : {};

      toolCallCount += 1;
      if (state === "approval-requested") pendingApprovals += 1;

      toolCalls.push({
        key: `${message.id}:${toolName}:${toolCalls.length}`,
        toolName,
        state,
        detail: summarizeToolInput(toolName, input),
        needsApproval: state === "approval-requested",
      });

      addResources(resources, extractToolResources(toolName, input), toolName);

      const change = extractChange(toolName, input);
      if (change) changes.set(change.key, change);
    }
  }

  for (const tab of aiDiffTabs) {
    changes.set(`ai-diff:${tab.approvalId}`, {
      key: `ai-diff:${tab.approvalId}`,
      kind: "ai-diff",
      path: tab.path,
      title: basename(tab.path),
      detail: `AI diff ${tab.status}`,
      status: tab.status,
    });
  }

  return {
    stats: {
      messages: messages.length,
      userMessages,
      assistantMessages,
      toolCalls: toolCallCount,
      pendingApprovals,
      resources: resources.size,
      changes: changes.size,
      issues: issues.size,
    },
    resources: [...resources.values()],
    changes: [...changes.values()].reverse(),
    issues: [...issues.values()],
    toolCalls: toolCalls.slice(-12).reverse(),
    latestAssistantNote,
  };
}

function extractToolResources(
  toolName: string,
  input: Record<string, unknown>,
): LinkPreviewSeed[] {
  if (toolName === "open_preview" && typeof input.url === "string") {
    return extractLinkPreviewSeeds(input.url);
  }
  if (toolName === "web_fetch_exa" && Array.isArray(input.urls)) {
    return input.urls.flatMap((url) =>
      typeof url === "string" ? extractLinkPreviewSeeds(url) : [],
    );
  }
  return [];
}

function extractChange(
  toolName: string,
  input: Record<string, unknown>,
): ConversationChange | null {
  if (toolName === "write_file" && typeof input.path === "string") {
    const content = typeof input.content === "string" ? input.content : "";
    return {
      key: `write_file:${input.path}`,
      kind: "write_file",
      path: input.path,
      title: basename(input.path),
      detail: `${countLines(content)} line${countLines(content) === 1 ? "" : "s"} written`,
    };
  }
  if (toolName === "edit" && typeof input.path === "string") {
    const removed = countLines(typeof input.old_string === "string" ? input.old_string : "");
    const added = countLines(typeof input.new_string === "string" ? input.new_string : "");
    return {
      key: `edit:${input.path}`,
      kind: "edit",
      path: input.path,
      title: basename(input.path),
      detail: `-${removed} / +${added} lines`,
    };
  }
  if (toolName === "multi_edit" && typeof input.path === "string") {
    const edits = Array.isArray(input.edits) ? input.edits.length : 0;
    return {
      key: `multi_edit:${input.path}`,
      kind: "multi_edit",
      path: input.path,
      title: basename(input.path),
      detail: `${edits} batched edit${edits === 1 ? "" : "s"}`,
    };
  }
  if (toolName === "create_directory" && typeof input.path === "string") {
    return {
      key: `create_directory:${input.path}`,
      kind: "create_directory",
      path: input.path,
      title: basename(input.path),
      detail: "Directory created",
    };
  }
  return null;
}

function extractIssues(text: string): ConversationIssue[] {
  const results: ConversationIssue[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const severityToken = matchSeverity(line);
    const issueLike =
      severityToken !== null ||
      /\b(issue|bug|risk|warning|regression|finding|missing test)\b/i.test(line);
    if (!issueLike) continue;
    results.push({
      key: `issue:${line}`,
      severity: severityToken,
      summary: truncate(line),
    });
  }
  return results;
}

function matchSeverity(
  line: string,
): ConversationIssue["severity"] {
  if (/\b(critical|high|must)\b/i.test(line)) return "high";
  if (/\b(medium|should|warning|risk)\b/i.test(line)) return "medium";
  if (/\b(low|nit|minor)\b/i.test(line)) return "low";
  return null;
}

function summarizeToolInput(
  toolName: string,
  input: Record<string, unknown>,
): string {
  if (
    (toolName === "bash_run" || toolName === "bash_background") &&
    typeof input.command === "string"
  ) {
    return truncate(input.command);
  }
  if (
    typeof input.path === "string" &&
    (toolName === "read_file" ||
      toolName === "write_file" ||
      toolName === "edit" ||
      toolName === "multi_edit" ||
      toolName === "create_directory")
  ) {
    return input.path;
  }
  if (toolName === "grep") {
    const pattern =
      typeof input.pattern === "string" ? truncate(input.pattern, 80) : "pattern";
    const path = typeof input.path === "string" ? input.path : "";
    return path ? `${pattern} @ ${path}` : pattern;
  }
  if (toolName === "web_search_exa" && typeof input.query === "string") {
    return truncate(input.query);
  }
  if (toolName === "web_fetch_exa" && Array.isArray(input.urls)) {
    return `${input.urls.length} fetched URL${input.urls.length === 1 ? "" : "s"}`;
  }
  if (toolName === "open_preview" && typeof input.url === "string") {
    return input.url;
  }
  return toolName;
}

function addResources(
  store: Map<string, ConversationResource>,
  seeds: ReadonlyArray<LinkPreviewSeed>,
  source: string,
): void {
  for (const seed of seeds) {
    if (store.has(seed.url)) continue;
    store.set(seed.url, { ...seed, source });
  }
}

function getToolName(part: Record<string, unknown>): string | null {
  if (part.type === "dynamic-tool" && typeof part.toolName === "string") {
    return part.toolName;
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.replace(/^tool-/, "");
  }
  return null;
}

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function countLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function truncate(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}
