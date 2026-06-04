import { generateText, stepCountIs } from "ai";
import { DEFAULT_MODEL_ID, type ModelId } from "../config";
import {
  buildConfiguredLanguageModel,
  buildLocalRuntimeToolGuidanceBlock,
  buildTurnToolAvailabilityBlock,
} from "../lib/agent";
import type { ProviderKeys } from "../lib/keyring";
import type { LocalProviderConfig } from "../lib/modelResolution";
import type { ToolContext } from "../tools/context";
import { buildFsTools } from "../tools/fs";
import { buildSearchTools } from "../tools/search";
import { SUBAGENTS, type SubagentType } from "./registry";

const SUBAGENT_MAX_STEPS = 12;
const READ_ONLY_MCP_TOOLS = new Set([
  "web_search_exa",
  "web_search_advanced_exa",
  "web_fetch_exa",
  "resolve-library-id",
  "get-library-docs",
]);

type Args = {
  type: SubagentType;
  prompt: string;
  keys: ProviderKeys;
  modelId: ModelId;
  toolContext: ToolContext;
  mcpTools?: Record<string, unknown>;
  mcpToolNames?: string[];
  runtimeNotices?: string[];
  localConfig?: LocalProviderConfig;
  onStep?: (label: string) => void;
};

type RunResult = {
  summary: string;
  stepCount: number;
  durationMs: number;
};

export async function runSubagent({
  type,
  prompt,
  keys,
  modelId,
  toolContext,
  mcpTools,
  mcpToolNames,
  runtimeNotices,
  localConfig,
  onStep,
}: Args): Promise<RunResult> {
  const def = SUBAGENTS[type];
  if (!def) throw new Error(`unknown subagent type: ${type}`);

  const availableTools: Record<string, unknown> = {
    ...buildFsTools(toolContext),
    ...buildSearchTools(toolContext),
    ...(mcpTools ?? {}),
  };
  const tools: Record<string, unknown> = {};
  const allowedTools = new Set(def.tools);
  for (const toolName of mcpToolNames ?? []) {
    if (READ_ONLY_MCP_TOOLS.has(toolName)) {
      allowedTools.add(toolName);
    }
  }
  for (const toolName of allowedTools) {
    if (toolName in availableTools) tools[toolName] = availableTools[toolName];
  }

  const model = await buildConfiguredLanguageModel(modelId, keys, localConfig);
  const activeToolNames = Object.keys(tools);
  const runtimeNoticeBlock =
    runtimeNotices && runtimeNotices.length > 0
      ? `\n\n## SUBAGENT RUNTIME NOTICES\n${runtimeNotices
          .map((notice) => `- ${notice}`)
          .join("\n")}`
      : "";
  const system = `${def.systemPrompt}${buildTurnToolAvailabilityBlock(
    activeToolNames,
  )}${runtimeNoticeBlock}\n\n## SUBAGENT TOOL CONTRACT
${buildLocalRuntimeToolGuidanceBlock(activeToolNames)}
- Stay inside assigned scope. Use minimum tool calls needed to answer prompt.
- If web/docs tools are available and prompt explicitly needs live research, you may use them.`;

  const start = Date.now();
  const result = await generateText({
    model,
    system,
    prompt,
    tools: tools as Parameters<typeof generateText>[0]["tools"],
    stopWhen: stepCountIs(SUBAGENT_MAX_STEPS),
    onStepFinish: (step) => {
      if (!onStep) return;
      const last = step.toolCalls?.[step.toolCalls.length - 1];
      if (last) onStep(`${type}: ${last.toolName}`);
    },
  });

  return {
    summary: result.text || "(no output)",
    stepCount: result.steps?.length ?? 0,
    durationMs: Date.now() - start,
  };
}

export const DEFAULT_SUBAGENT_MODEL: ModelId = DEFAULT_MODEL_ID;
