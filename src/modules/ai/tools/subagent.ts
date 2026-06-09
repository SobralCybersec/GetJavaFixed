import { tool, type UIMessage } from "ai";
import { z } from "zod";
import { runSubagent } from "../agents/runSubagent";
import { SUBAGENTS, type SubagentType } from "../agents/registry";
import {
  LIVE_RESEARCH_UNAVAILABLE_NOTICE,
  messageLikelyNeedsMcpTools,
  messageLikelyNeedsResearchMcpTools,
} from "../lib/agent";
import {
  getCachedMcpToolBundle,
  invalidateCachedMcpToolBundle,
  type McpConfig,
} from "../lib/mcpClient";
import { getRefactorToolKey } from "../lib/toolKeyring";
import { useChatStore } from "../store/chatStore";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { buildRuntimeMcpConfig } from "../lib/mcpRegistry";
import { getManagedMcpHealthSnapshots } from "../lib/managedMcp";
import type { ToolContext } from "./context";

const TYPE_KEYS = Object.keys(SUBAGENTS) as [SubagentType, ...SubagentType[]];
const SUBAGENT_MCP_BOOTSTRAP_TIMEOUT_MS = 4_000;

function subagentPromptNeedsMcp(prompt: string): boolean {
  const messages = [
    {
      id: "subagent-prompt",
      role: "user",
      parts: [{ type: "text", text: prompt }],
    },
  ] as UIMessage[];
  return messageLikelyNeedsMcpTools(messages);
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

async function maybeLoadSubagentMcpBundle(prompt: string) {
  if (!subagentPromptNeedsMcp(prompt)) return null;

  const prefs = usePreferencesStore.getState();
  const baseConfig: McpConfig = buildRuntimeMcpConfig({
    providers: prefs.mcpProviders,
    managedPresets: prefs.managedMcpPresets,
    managedHealth: getManagedMcpHealthSnapshots(),
    allowMissingToolKeys: true,
  });

  if (baseConfig.providers.length === 0) {
    return null;
  }

  let resolvedConfig: McpConfig | null = null;
  try {
    resolvedConfig = {
      providers: await Promise.all(
        baseConfig.providers.map(async (provider) => ({
          ...provider,
          apiKey:
            provider.apiKey ??
            (provider.id === "exa"
              ? ((await getRefactorToolKey("exa")) ?? undefined)
              : provider.id === "context7"
                ? ((await getRefactorToolKey("context7")) ?? undefined)
                : undefined),
        })),
      ),
    };
    return await withTimeout(
      getCachedMcpToolBundle(resolvedConfig),
      SUBAGENT_MCP_BOOTSTRAP_TIMEOUT_MS,
      "Subagent MCP bootstrap timed out",
    );
  } catch (error) {
    if (resolvedConfig) {
      await invalidateCachedMcpToolBundle(resolvedConfig);
    }
    console.warn(
      "[javarf][subagent] MCP bootstrap failed; continuing without MCP tools",
      error,
    );
    return null;
  }
}

export function buildSubagentTools(ctx: ToolContext) {
  return {
    run_subagent: tool({
      description: `Spawn an isolated subagent with its own restricted toolset and a fresh message history. Use when you need to delegate a self-contained read-only investigation (large search, code review, security audit) without polluting your own context. The subagent returns a single text summary; pick a 'type' that matches its job.

Types:
${TYPE_KEYS.map((k) => `- ${k}: ${SUBAGENTS[k].description}`).join("\n")}

If MCP web/docs tools are enabled and your prompt explicitly needs live research, the subagent may use them too.

Auto-executes (no approval) — subagents are read-only by design.`,
      inputSchema: z.object({
        type: z.enum(TYPE_KEYS),
        prompt: z
          .string()
          .describe(
            "Self-contained instruction. The subagent has no memory of prior conversation — include all relevant context.",
          ),
        description: z
          .string()
          .optional()
          .describe("Short label shown in the chat UI for the spawn card."),
      }),
      execute: async ({ type, prompt, description }) => {
        const { apiKeys, selectedModelId, patchAgentMeta } =
          useChatStore.getState();
        try {
          const prefs = usePreferencesStore.getState();
          const mcpBundle = await maybeLoadSubagentMcpBundle(prompt);
          const runtimeNotices =
            messageLikelyNeedsResearchMcpTools([
              {
                id: "subagent-prompt",
                role: "user",
                parts: [{ type: "text", text: prompt }],
              },
            ] as UIMessage[]) &&
            (mcpBundle?.toolNames.length ?? 0) === 0
              ? [LIVE_RESEARCH_UNAVAILABLE_NOTICE]
              : [];
          const r = await runSubagent({
            type,
            prompt,
            keys: apiKeys,
            modelId: selectedModelId,
            toolContext: ctx,
            mcpTools: mcpBundle?.tools,
            mcpToolNames: mcpBundle?.toolNames,
            runtimeNotices,
            localConfig: {
              lmstudioBaseURL: prefs.lmstudioBaseURL,
              lmstudioModelId: prefs.lmstudioModelId,
              mlxBaseURL: prefs.mlxBaseURL,
              mlxModelId: prefs.mlxModelId,
              ollamaBaseURL: prefs.ollamaBaseURL,
              ollamaModelId: prefs.ollamaModelId,
              openaiCompatibleBaseURL: prefs.openaiCompatibleBaseURL,
              openaiCompatibleModelId: prefs.openaiCompatibleModelId,
              openrouterModelId: prefs.openrouterModelId,
            },
            onStep: (label) => patchAgentMeta({ step: label }),
          });
          return {
            type,
            description,
            agentLabel: r.agentLabel,
            agentName: r.agentName,
            summary: r.summary,
            stepCount: r.stepCount,
            durationMs: r.durationMs,
          };
        } catch (e) {
          return { error: String(e), type };
        }
      },
    }),
  } as const;
}
