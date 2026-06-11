import { pruneMessages, type ModelMessage } from "ai";

const KEEP_TAIL_MESSAGES = 12;
const KEEP_RECENT_TOOL_RESULTS = 3;
const ELISION_TEXT = "[elided to save context — raw tool result was removed from model context]";
const MESSAGE_DROP_TEXT = "[older conversation messages were removed to keep this request inside the model context window]";

/**
 * Token estimates must be conservative. The old compactor used 5 bytes/token,
 * which under-counts dense JSON, URLs, stack traces, minified code, and search
 * payloads. Custom OpenAI-compatible endpoints also frequently report tokens
 * differently from hosted providers, so use a safer character/token ratio and
 * compact to a target well below the advertised context limit.
 *
 * SYSTEM PROMPT RESERVE: The compactor operates only on conversation history.
 * The system prompt (base + persona + memory + turn blocks) is added after
 * compaction and is never seen by compactModelMessages. We subtract a
 * conservative headroom before computing any target so the total sent to the
 * API (system + history) stays inside the context window.
 */
const ASCII_CHARS_PER_TOKEN = 3.25;
const NON_ASCII_CHARS_PER_TOKEN = 1.25;
const SOFT_TRIGGER_RATIO = 0.20;
const TARGET_RATIO = 0.45;
const HARD_TARGET_RATIO = 0.55;
/** Tokens reserved for the system prompt that is added after compaction. */
const SYSTEM_PROMPT_TOKEN_RESERVE = 6_000;

const MAX_OLD_TOOL_RESULT_CHARS = 800;
const MAX_RECENT_TOOL_RESULT_CHARS = 3_000;
const MAX_EXA_TOOL_RESULT_CHARS = 4_000;
const MAX_OLD_TOOL_INPUT_CHARS = 600;
const MAX_RECENT_TOOL_INPUT_CHARS = 2_000;
const MAX_OLD_TEXT_CHARS = 1_500;
const MAX_ANY_TEXT_CHARS = 6_000;

const MUTATING_TOOLS = new Set([
  "edit",
  "multi_edit",
  "write_file",
  "create_directory",
]);

const EXA_FETCH_TOOLS = new Set([
  "web_fetch_exa",
]);

const TOKEN_DENSE_TOOLS = new Set([
  "web_search_exa",
  "web_search_advanced_exa",
  "web_fetch_exa",
  "get-library-docs",
  "resolve-library-id",
  "read_file",
  "grep",
  "glob",
  "bash_run",
  "bash_logs",
]);

type ToolPart = {
  type: string;
  text?: unknown;
  toolName?: string;
  toolCallId?: string;
  input?: unknown;
  output?: unknown;
  [k: string]: unknown;
};

export type CompactResult = {
  messages: ModelMessage[];
  compacted: boolean;
  droppedCount: number;
  /** Conservative estimate before custom compaction. Useful for telemetry. */
  estimatedBeforeTokens?: number;
  /** Conservative estimate after custom compaction. Useful for telemetry. */
  estimatedAfterTokens?: number;
  /** The internal budget this function tried to fit under. */
  targetTokens?: number;
};

function countStringTokens(text: string): number {
  if (!text) return 0;
  let ascii = 0;
  let nonAscii = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 0x7f) ascii++;
    else nonAscii++;
  }
  return Math.ceil(ascii / ASCII_CHARS_PER_TOKEN + nonAscii / NON_ASCII_CHARS_PER_TOKEN);
}

function safeJsonStringify(value: unknown, pretty = false): string {
  if (typeof value === "string") return value;
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, v) => {
        if (typeof v === "bigint") return v.toString();
        if (typeof v === "function") return "[function]";
        if (v && typeof v === "object") {
          if (seen.has(v)) return "[circular]";
          seen.add(v);
        }
        return v;
      },
      pretty ? 2 : 0,
    );
  } catch {
    return String(value);
  }
}

function approxValueTokens(value: unknown): number {
  return countStringTokens(safeJsonStringify(value));
}

function approxMessageTokens(message: ModelMessage): number {
  let total = 8; // role / formatting overhead
  if (typeof message.content === "string") {
    return total + countStringTokens(message.content);
  }
  if (!Array.isArray(message.content)) return total + 16;

  for (const part of message.content as ToolPart[]) {
    total += 8;
    if (part.type === "text" && typeof part.text === "string") {
      total += countStringTokens(part.text);
    } else if (part.type === "tool-result") {
      total += approxValueTokens(part.output ?? "");
    } else if (part.type === "tool-call") {
      total += approxValueTokens(part.input ?? "");
    } else if (part.type === "reasoning" && typeof part.text === "string") {
      total += countStringTokens(part.text);
    } else {
      total += approxValueTokens(part);
    }
  }
  return total;
}

function approxTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const message of messages) total += approxMessageTokens(message);
  return total;
}

function compactTarget(contextLimit: number): number {
  const safeLimit = Math.max(4_096, contextLimit || 4_096);
  const historyBudget = Math.max(2_048, safeLimit - SYSTEM_PROMPT_TOKEN_RESERVE);
  return Math.max(2_048, Math.floor(historyBudget * TARGET_RATIO));
}

function hardTarget(contextLimit: number): number {
  const safeLimit = Math.max(4_096, contextLimit || 4_096);
  const historyBudget = Math.max(3_072, safeLimit - SYSTEM_PROMPT_TOKEN_RESERVE);
  return Math.max(3_072, Math.floor(historyBudget * HARD_TARGET_RATIO));
}

function shouldCompact(messages: ModelMessage[], contextLimit: number): boolean {
  const safeLimit = Math.max(4_096, contextLimit || 4_096);
  const historyBudget = Math.max(2_048, safeLimit - SYSTEM_PROMPT_TOKEN_RESERVE);
  return approxTokens(messages) >= historyBudget * SOFT_TRIGGER_RATIO;
}

function truncateMiddle(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  if (maxChars <= 32) return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
  const head = Math.floor(maxChars * 0.65);
  const tail = Math.max(16, maxChars - head - 80);
  return `${text.slice(0, head)}\n\n[... ${text.length - head - tail} chars elided ...]\n\n${text.slice(-tail)}`;
}

function isCompactedPayload(value: unknown): boolean {
  return !!(
    value &&
    typeof value === "object" &&
    ((value as { __compacted?: unknown }).__compacted ||
      (value as { __elided?: unknown }).__elided)
  );
}

function compactPayload(value: unknown, maxChars: number, label: string): unknown {
  if (isCompactedPayload(value)) return value;
  const raw = safeJsonStringify(value, true);
  if (raw.length <= maxChars) return value;
  return {
    type: "text",
    value: `${label}\nOriginal payload size: ${raw.length} chars.\nPreview:\n${truncateMiddle(raw, maxChars)}`,
    __compacted: true,
    originalChars: raw.length,
  };
}

function elideToolResult(part: ToolPart, label = ELISION_TEXT): { changed: boolean; part: ToolPart } {
  if (part.type !== "tool-result") return { changed: false, part };
  if (isCompactedPayload(part.output)) return { changed: false, part };
  return {
    changed: true,
    part: {
      ...part,
      output: { type: "text", value: label, __elided: true },
    },
  };
}

function pathOfInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const p = (input as { path?: unknown }).path;
  return typeof p === "string" && p.length > 0 ? p : null;
}

function collectMutationPaths(messages: ModelMessage[]): Set<string> {
  const paths = new Set<string>();
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content as ToolPart[]) {
      if (part.type !== "tool-call") continue;
      if (!part.toolName || !MUTATING_TOOLS.has(part.toolName)) continue;
      const p = pathOfInput(part.input);
      if (p) paths.add(p);
    }
  }
  return paths;
}

function collectLastReadIdxPerPath(messages: ModelMessage[]): Map<string, number> {
  const lastIdx = new Map<string, number>();
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content as ToolPart[]) {
      if (part.type !== "tool-call" || part.toolName !== "read_file") continue;
      const p = pathOfInput(part.input);
      if (p) lastIdx.set(p, i);
    }
  }
  return lastIdx;
}

function collectReadCallIdToPath(messages: ModelMessage[]): Map<string, string> {
  const callIdToPath = new Map<string, string>();
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content as ToolPart[]) {
      if (part.type !== "tool-call" || part.toolName !== "read_file") continue;
      const id = part.toolCallId;
      const p = pathOfInput(part.input);
      if (typeof id === "string" && p) callIdToPath.set(id, p);
    }
  }
  return callIdToPath;
}

function dropSupersededReads(messages: ModelMessage[]): { out: ModelMessage[]; changed: number } {
  const mutated = collectMutationPaths(messages);
  const lastReadIdx = collectLastReadIdxPerPath(messages);
  const callIdToPath = collectReadCallIdToPath(messages);
  let changed = 0;

  const out = messages.map((message, messageIndex): ModelMessage => {
    if (!Array.isArray(message.content)) return message;
    let local = false;
    const nextContent = (message.content as ToolPart[]).map((part) => {
      if (part.type !== "tool-result") return part;
      const id = part.toolCallId;
      if (typeof id !== "string") return part;
      const path = callIdToPath.get(id);
      if (!path) return part;
      const laterReadIdx = lastReadIdx.get(path);
      const stale = mutated.has(path) || (typeof laterReadIdx === "number" && laterReadIdx > messageIndex);
      if (!stale) return part;
      const result = elideToolResult(part);
      if (result.changed) {
        changed++;
        local = true;
      }
      return result.part;
    });
    return local ? ({ ...message, content: nextContent } as ModelMessage) : message;
  });

  return { out, changed };
}

function compactToolPayloads(
  messages: ModelMessage[],
  options: {
    compactAllToolResults: boolean;
    compactAllToolInputs: boolean;
  },
): { out: ModelMessage[]; changed: number } {
  let changed = 0;
  let toolResultOrdinalFromEnd = 0;

  const out = messages.map((message, messageIndex): ModelMessage => {
    if (!Array.isArray(message.content)) return message;
    const isRecentMessage = messageIndex >= Math.max(0, messages.length - KEEP_TAIL_MESSAGES);
    let local = false;

    const nextContentReversed = [...(message.content as ToolPart[])].reverse().map((part) => {
      const next = { ...part };

      if (part.type === "tool-result") {
        toolResultOrdinalFromEnd++;
        const keepLargerPreview = toolResultOrdinalFromEnd <= KEEP_RECENT_TOOL_RESULTS && isRecentMessage;
        const maxChars = keepLargerPreview ? MAX_RECENT_TOOL_RESULT_CHARS : MAX_OLD_TOOL_RESULT_CHARS;
        const isExaFetch = EXA_FETCH_TOOLS.has(String(part.toolName ?? ""));
        const effectiveMaxChars = isExaFetch
          ? Math.min(maxChars, MAX_EXA_TOOL_RESULT_CHARS)
          : maxChars;
        if (options.compactAllToolResults || TOKEN_DENSE_TOOLS.has(String(part.toolName ?? "")) || !keepLargerPreview || isExaFetch) {
          const output = compactPayload(
            part.output,
            effectiveMaxChars,
            `[compacted ${part.toolName ?? "tool"} result for context budget]`,
          );
          if (output !== part.output) {
            next.output = output;
            local = true;
            changed++;
          }
        }
      }

      if (part.type === "tool-call") {
        const maxChars = isRecentMessage ? MAX_RECENT_TOOL_INPUT_CHARS : MAX_OLD_TOOL_INPUT_CHARS;
        const denseInput =
          options.compactAllToolInputs ||
          TOKEN_DENSE_TOOLS.has(String(part.toolName ?? "")) ||
          MUTATING_TOOLS.has(String(part.toolName ?? ""));
        if (denseInput) {
          const input = compactPayload(
            part.input,
            maxChars,
            `[compacted ${part.toolName ?? "tool"} input for context budget]`,
          );
          if (input !== part.input) {
            next.input = input;
            local = true;
            changed++;
          }
        }
      }

      return next;
    });

    const nextContent = nextContentReversed.reverse();
    return local ? ({ ...message, content: nextContent } as ModelMessage) : message;
  });

  return { out, changed };
}

function pruneOldToolParts(messages: ModelMessage[]): { out: ModelMessage[]; changed: number } {
  const before = approxTokens(messages);
  const out = pruneMessages({
    messages,
    reasoning: "all",
    toolCalls: "before-last-2-messages",
    emptyMessages: "remove",
  });
  const after = approxTokens(out);
  return { out, changed: after < before ? 1 : 0 };
}

function dropOldMessagesToBudget(
  messages: ModelMessage[],
  targetTokens: number,
): { out: ModelMessage[]; changed: number } {
  const tokenByIndex = messages.map(approxMessageTokens);
  let total = tokenByIndex.reduce((sum, n) => sum + n, 0);
  if (total <= targetTokens) return { out: messages, changed: 0 };

  const keepFrom = Math.max(0, messages.length - KEEP_TAIL_MESSAGES);
  const out: ModelMessage[] = [];
  let dropped = 0;
  let insertedDropNotice = false;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const mustKeep = message.role === "system" || i >= keepFrom;

    if (!mustKeep && total > targetTokens) {
      total -= tokenByIndex[i];
      dropped++;
      if (!insertedDropNotice) {
        out.push({ role: "system", content: MESSAGE_DROP_TEXT } as ModelMessage);
        insertedDropNotice = true;
      }
      continue;
    }

    out.push(message);
  }

  return { out, changed: dropped };
}

function truncateTextContent(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${truncateMiddle(text, maxChars)}\n\n[compacted text part from ${text.length} chars]`;
}

function truncateTextParts(
  messages: ModelMessage[],
  options: {
    maxChars: number;
    includeLatestUser: boolean;
    oldOnly: boolean;
  },
): { out: ModelMessage[]; changed: number } {
  let changed = 0;
  let latestUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      latestUserIndex = i;
      break;
    }
  }

  const oldCutoff = Math.max(0, messages.length - KEEP_TAIL_MESSAGES);
  const out = messages.map((message, index): ModelMessage => {
    if (message.role === "system") return message;
    if (!options.includeLatestUser && index === latestUserIndex) return message;
    if (options.oldOnly && index >= oldCutoff) return message;

    if (typeof message.content === "string") {
      const next = truncateTextContent(message.content, options.maxChars);
      if (next === message.content) return message;
      changed++;
      return { ...message, content: next } as ModelMessage;
    }

    if (!Array.isArray(message.content)) return message;
    let local = false;
    const nextContent = (message.content as ToolPart[]).map((part) => {
      if (part.type !== "text" || typeof part.text !== "string") return part;
      const nextText = truncateTextContent(part.text, options.maxChars);
      if (nextText === part.text) return part;
      local = true;
      changed++;
      return { ...part, text: nextText };
    });

    return local ? ({ ...message, content: nextContent } as ModelMessage) : message;
  });

  return { out, changed };
}

function runPhase(
  current: ModelMessage[],
  changedTotal: number,
  phase: () => { out: ModelMessage[]; changed: number },
): { working: ModelMessage[]; changedTotal: number } {
  void current;
  const result = phase();
  return {
    working: result.out,
    changedTotal: changedTotal + result.changed,
  };
}

export function compactModelMessages(
  messages: ModelMessage[],
  contextLimit: number,
): ModelMessage[] {
  return compactModelMessagesDetailed(messages, contextLimit).messages;
}

export function compactModelMessagesDetailed(
  messages: ModelMessage[],
  contextLimit: number,
): CompactResult {
  const before = approxTokens(messages);
  const target = compactTarget(contextLimit);
  const hard = hardTarget(contextLimit);

  if (!shouldCompact(messages, contextLimit)) {
    return {
      messages,
      compacted: false,
      droppedCount: 0,
      estimatedBeforeTokens: before,
      estimatedAfterTokens: before,
      targetTokens: target,
    };
  }

  let working = messages;
  let changedTotal = 0;

  ({ working, changedTotal } = runPhase(working, changedTotal, () => dropSupersededReads(working)));

  if (approxTokens(working) > target) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      compactToolPayloads(working, {
        compactAllToolResults: false,
        compactAllToolInputs: false,
      }),
    ));
  }

  if (approxTokens(working) > target) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () => pruneOldToolParts(working)));
  }

  if (approxTokens(working) > target) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      compactToolPayloads(working, {
        compactAllToolResults: true,
        compactAllToolInputs: true,
      }),
    ));
  }

  if (approxTokens(working) > hard) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      truncateTextParts(working, {
        maxChars: MAX_OLD_TEXT_CHARS,
        includeLatestUser: false,
        oldOnly: true,
      }),
    ));
  }

  if (approxTokens(working) > target) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      dropOldMessagesToBudget(working, target),
    ));
  }

  if (approxTokens(working) > hard) {
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      truncateTextParts(working, {
        maxChars: MAX_ANY_TEXT_CHARS,
        includeLatestUser: false,
        oldOnly: false,
      }),
    ));
  }

  // Last-resort guard. Prevents a single giant latest user paste or tool
  // payload from pushing the API above 100% after the system prompt is added.
  if (approxTokens(working) > hard) {
    const historyBudget = Math.max(2_048, contextLimit - SYSTEM_PROMPT_TOKEN_RESERVE);
    ({ working, changedTotal } = runPhase(working, changedTotal, () =>
      truncateTextParts(working, {
        maxChars: Math.max(1_000, Math.floor((historyBudget * HARD_TARGET_RATIO * ASCII_CHARS_PER_TOKEN) / Math.max(1, working.length))),
        includeLatestUser: true,
        oldOnly: false,
      }),
    ));
  }

  const after = approxTokens(working);
  return {
    messages: working,
    compacted: changedTotal > 0 || after < before,
    droppedCount: changedTotal,
    estimatedBeforeTokens: before,
    estimatedAfterTokens: after,
    targetTokens: target,
  };
}
