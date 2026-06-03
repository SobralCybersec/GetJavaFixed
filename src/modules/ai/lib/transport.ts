import type { UIMessage } from "@ai-sdk/react";
import { type ModelId } from "../config";
import {
  messageLikelyNeedsMcpTools,
  runAgentStream,
  type AgentUsageDelta,
} from "./agent";
import type { ProviderKeys } from "./keyring";
import { getCachedMcpToolBundle, type McpConfig } from "./mcpClient";
import { native } from "./native";
import type { ToolContext } from "../tools/tools";
import { getRefactorToolKey } from "./toolKeyring";

const JAVARF_MD_MAX_BYTES = 32 * 1024;
const MCP_BOOTSTRAP_TIMEOUT_MS = 4_000;
type MemoryCacheEntry = { content: string | null; mtime: number };
const projectMemoryCache = new Map<string, MemoryCacheEntry>();

async function readRefactorMd(workspaceRoot: string | null): Promise<string | null> {
  if (!workspaceRoot) return null;
  const path = `${workspaceRoot.replace(/\/$/, "")}/REFACTOR.md`;
  const cached = projectMemoryCache.get(workspaceRoot);
  if (cached && Date.now() - cached.mtime < 30_000) return cached.content;
  try {
    const r = await native.readFile(path);
    if (r.kind !== "text") {
      projectMemoryCache.set(workspaceRoot, { content: null, mtime: Date.now() });
      return null;
    }
    const content =
      r.content.length > JAVARF_MD_MAX_BYTES
        ? r.content.slice(0, JAVARF_MD_MAX_BYTES)
        : r.content;
    projectMemoryCache.set(workspaceRoot, { content, mtime: Date.now() });
    return content;
  } catch {
    projectMemoryCache.set(workspaceRoot, { content: null, mtime: Date.now() });
    return null;
  }
}

type LiveSnapshot = {
  cwd: string | null;
  terminalPrivate: boolean;
  workspaceRoot: string | null;
  activeFile: string | null;
};

type Deps = {
  getKeys: () => ProviderKeys;
  toolContext: ToolContext;
  getModelId: () => ModelId;
  getCustomInstructions: () => string;
  getAgentPersona: () => { name: string; instructions: string } | null;
  getLive: () => LiveSnapshot;
  getLmstudioBaseURL?: () => string | undefined;
  getLmstudioModelId?: () => string | undefined;
  getMlxBaseURL?: () => string | undefined;
  getMlxModelId?: () => string | undefined;
  getOllamaBaseURL?: () => string | undefined;
  getOllamaModelId?: () => string | undefined;
  getOpenaiCompatibleBaseURL?: () => string | undefined;
  getOpenaiCompatibleModelId?: () => string | undefined;
  getOpenaiCompatibleContextLimit?: () => number | undefined;
  getOpenrouterModelId?: () => string | undefined;
  onStep?: (step: string | null) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onCompact?: (info: { droppedCount: number }) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  getPlanMode?: () => boolean;
  getMcpConfig?: () => McpConfig;
};

type SendOptions = {
  messages: UIMessage[];
  abortSignal?: AbortSignal;
  [k: string]: unknown;
};

export function createContextAwareTransport(deps: Deps) {
  const run = async (options: SendOptions) => {
    const live = deps.getLive();
    const projectMemory = await readRefactorMd(live.workspaceRoot);
    const envBlock = formatEnvBlock(live);
    const messagesForRun = envBlock
      ? injectEnvIntoLastUser(options.messages, envBlock)
      : options.messages;
    const mcpConfig = deps.getMcpConfig?.();
    const shouldLoadMcp = !!mcpConfig && messageLikelyNeedsMcpTools(messagesForRun);
    const runWithBundle = async (
      mcpBundle:
        | Awaited<ReturnType<typeof getCachedMcpToolBundle>>
        | null,
    ) =>
      runAgentStream({
      keys: deps.getKeys(),
      modelId: deps.getModelId(),
      customInstructions: deps.getCustomInstructions(),
      agentPersona: deps.getAgentPersona(),
      toolContext: deps.toolContext,
      onStep: deps.onStep,
      onUsage: deps.onUsage,
      onCompact: deps.onCompact,
      onFinishMeta: deps.onFinishMeta,
      lmstudioBaseURL: deps.getLmstudioBaseURL?.(),
      lmstudioModelId: deps.getLmstudioModelId?.(),
      mlxBaseURL: deps.getMlxBaseURL?.(),
      mlxModelId: deps.getMlxModelId?.(),
      ollamaBaseURL: deps.getOllamaBaseURL?.(),
      ollamaModelId: deps.getOllamaModelId?.(),
      openaiCompatibleBaseURL: deps.getOpenaiCompatibleBaseURL?.(),
      openaiCompatibleModelId: deps.getOpenaiCompatibleModelId?.(),
      openaiCompatibleContextLimit: deps.getOpenaiCompatibleContextLimit?.(),
      openrouterModelId: deps.getOpenrouterModelId?.(),
      planMode: deps.getPlanMode?.(),
      projectMemory,
      mcpTools: mcpBundle?.tools,
      mcpToolNames: mcpBundle?.toolNames,
      uiMessages: messagesForRun,
      abortSignal: options.abortSignal,
    });
    let mcpBundle: Awaited<ReturnType<typeof getCachedMcpToolBundle>> | null = null;
    if (shouldLoadMcp) {
      try {
        const [exaApiKey, context7ApiKey] = await Promise.all([
          mcpConfig.exaApiKey !== undefined
            ? Promise.resolve(mcpConfig.exaApiKey)
            : getRefactorToolKey("exa"),
          mcpConfig.context7ApiKey !== undefined
            ? Promise.resolve(mcpConfig.context7ApiKey)
            : getRefactorToolKey("context7"),
        ]);
        mcpBundle = await withTimeout(
          getCachedMcpToolBundle({
          ...mcpConfig,
            exaApiKey: exaApiKey ?? undefined,
            context7ApiKey: context7ApiKey ?? undefined,
          }),
          MCP_BOOTSTRAP_TIMEOUT_MS,
          "MCP bootstrap timed out",
        );
      } catch (error) {
        console.warn("[javarf][agent] MCP bootstrap failed; continuing without MCP tools", error);
      }
    }
    const result = await runWithBundle(mcpBundle);
    return result.toUIMessageStream({
      originalMessages: options.messages,
    });
  };

  return {
    sendMessages: run,
    async reconnectToStream(): Promise<null> {
      return null;
    },
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function injectEnvIntoLastUser(
  messages: UIMessage[],
  envBlock: string,
): UIMessage[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const parts = m.parts as ReadonlyArray<{ type: string; text?: string }>;
    let textIdx = -1;
    for (let j = 0; j < parts.length; j++) {
      if (parts[j].type === "text") {
        textIdx = j;
        break;
      }
    }
    const nextParts =
      textIdx === -1
        ? [{ type: "text", text: envBlock }, ...parts]
        : parts.map((p, idx) =>
            idx === textIdx
              ? { ...p, text: `${envBlock}\n\n${p.text ?? ""}` }
              : p,
          );
    const out = messages.slice();
    out[i] = { ...m, parts: nextParts } as UIMessage;
    return out;
  }
  return messages;
}

function formatEnvBlock(live: LiveSnapshot): string | null {
  const lines: string[] = [];
  if (live.workspaceRoot) lines.push(`workspace_root: ${live.workspaceRoot}`);
  if (live.cwd) lines.push(`active_terminal_cwd: ${live.cwd}`);
  if (live.activeFile) lines.push(`active_file: ${live.activeFile}`);
  if (live.terminalPrivate) lines.push("active_terminal_mode: private");
  if (lines.length === 0) return null;
  return `<env>\n${lines.join("\n")}\n</env>`;
}

export const CONTEXT_BLOCK_RE =
  /^<terminal-context[^>]*>[\s\S]*?<\/terminal-context>\n*/;

export function stripContextBlock(text: string): string {
  return text.replace(CONTEXT_BLOCK_RE, "");
}
