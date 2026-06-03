import {
  convertToModelMessages,
  pruneMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ModelMessage,
  type UIMessage,
} from "ai";
import type { ToolSet } from "ai";
import {
  DEFAULT_MODEL_ID,
  getModel,
  getModelContextLimit,
  LMSTUDIO_DEFAULT_BASE_URL,
  MAX_AGENT_STEPS,
  MLX_DEFAULT_BASE_URL,
  modelKeepsReasoning,
  OLLAMA_DEFAULT_BASE_URL,
  providerNeedsKey,
  selectSystemPrompt,
  type ModelId,
  type ProviderId,
} from "../config";
import {
  resolveConfiguredModel,
  type LocalProviderConfig,
} from "./modelResolution";
import { buildTools, type ToolContext } from "../tools/tools";
import { compactModelMessagesDetailed } from "./compact";
import type { ProviderKeys } from "./keyring";
import { createProxyFetch, safeWindowFetch } from "./proxyFetch";

const localProxyFetch = createProxyFetch({ allowPrivateNetwork: true });

const TOOL_LABELS: Record<string, (input: Record<string, unknown>) => string> =
  {
    read_file: (i) => `Reading ${shortPath(i.path)}`,
    list_directory: (i) => `Listing ${shortPath(i.path)}`,
    grep: (i) => `Grepping ${ellipsize(String(i.pattern ?? ""), 40)}`,
    glob: (i) => `Globbing ${ellipsize(String(i.pattern ?? ""), 40)}`,
    edit: (i) => `Editing ${shortPath(i.path)}`,
    multi_edit: (i) => `Editing ${shortPath(i.path)}`,
    write_file: (i) => `Writing ${shortPath(i.path)}`,
    create_directory: (i) => `Creating ${shortPath(i.path)}`,
    bash_run: (i) => `Running ${ellipsize(String(i.command ?? ""), 60)}`,
    bash_background: (i) =>
      `Spawning ${ellipsize(String(i.command ?? ""), 60)}`,
    bash_logs: () => `Reading logs`,
    bash_list: () => `Listing background processes`,
    bash_kill: () => `Stopping background process`,
    suggest_command: (i) =>
      `Suggesting ${ellipsize(String(i.command ?? ""), 60)}`,
    todo_write: (i) =>
      `Updating plan (${Array.isArray(i.todos) ? i.todos.length : 0} items)`,
    run_subagent: (i) => `Spawning ${String(i.type ?? "subagent")} subagent`,
  };

const LOCAL_TOOLCALL_PROVIDERS = new Set<ProviderId>([
  "openai-compatible",
  "lmstudio",
  "mlx",
  "ollama",
]);

const ALWAYS_ACTIVE_TOOLS = ["read_file", "list_directory"] as const;
const SEARCH_TOOLS = ["grep", "glob"] as const;
const EDIT_TOOLS = ["edit", "multi_edit", "write_file", "create_directory"] as const;
const SHELL_TOOLS = [
  "bash_run",
  "bash_background",
  "bash_logs",
  "bash_list",
  "bash_kill",
] as const;
const DELEGATION_TOOLS = [
  "run_subagent",
  "spawn_coding_agent",
  "send_to_agent",
  "read_agent_output",
  "todo_write",
] as const;

type ActiveToolName =
  | (typeof ALWAYS_ACTIVE_TOOLS)[number]
  | (typeof SEARCH_TOOLS)[number]
  | (typeof EDIT_TOOLS)[number]
  | (typeof SHELL_TOOLS)[number]
  | (typeof DELEGATION_TOOLS)[number]
  | "get_terminal_output"
  | "suggest_command"
  | "open_preview"
  | string;

function shortPath(p: unknown): string {
  if (typeof p !== "string") return "";
  const i = p.lastIndexOf("/");
  return i === -1 ? p : p.slice(i + 1);
}

function ellipsize(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export type BuildModelOptions = {
  modelIdOverride?: string;
  lmstudioBaseURL?: string;
  mlxBaseURL?: string;
  ollamaBaseURL?: string;
  openaiCompatibleBaseURL?: string;
};

function getLastUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";
  return lastUser.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function addTools(target: Set<string>, names: readonly string[]) {
  for (const name of names) target.add(name);
}

type ToolIntent = {
  wantsRead: boolean;
  wantsSearch: boolean;
  wantsEdit: boolean;
  wantsShell: boolean;
  wantsTerminalRead: boolean;
  wantsPreview: boolean;
  wantsDelegation: boolean;
  wantsResearch: boolean;
};

type EnvContext = {
  workspaceRoot: string | null;
  cwd: string | null;
  activeFile: string | null;
  terminalPrivate: boolean;
};

function parseEnvContext(messages: UIMessage[]): EnvContext {
  const text = getLastUserText(messages);
  const match = text.match(/<env>\s*([\s\S]*?)<\/env>/i);
  if (!match) {
    return {
      workspaceRoot: null,
      cwd: null,
      activeFile: null,
      terminalPrivate: false,
    };
  }

  const env: EnvContext = {
    workspaceRoot: null,
    cwd: null,
    activeFile: null,
    terminalPrivate: false,
  };
  for (const rawLine of match[1].split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key === "workspace_root") env.workspaceRoot = value || null;
    if (key === "active_terminal_cwd") env.cwd = value || null;
    if (key === "active_file") env.activeFile = value || null;
    if (key === "active_terminal_mode" && value === "private") {
      env.terminalPrivate = true;
    }
  }
  return env;
}

function analyzeToolIntent(messages: UIMessage[]): ToolIntent {
  const text = getLastUserText(messages).toLowerCase();
  const env = parseEnvContext(messages);
  const refersToCurrentContext =
    /\b(this|here|current|selected|opened|open)\b/.test(text);
  const activeFileImplicitRead =
    !!env.activeFile &&
    (refersToCurrentContext ||
      /\b(explain|analy[sz]e|review|inspect|debug|trace|understand|what's wrong|what is wrong)\b/.test(
        text,
      ));
  return {
    wantsRead:
      activeFileImplicitRead ||
      /\b(read|open|show|inspect|check|review|look at|look into|explain this file)\b/.test(
        text,
      ),
    wantsSearch:
      /\b(find|search|grep|glob|where|which file|scan|look for|pattern|regex)\b/.test(
        text,
      ),
    wantsEdit:
      /\b(edit|change|fix|refactor|rename|update|modify|write|patch|replace)\b/.test(
        text,
      ),
    wantsShell:
      /\b(run|test|build|lint|compile|npm|pnpm|yarn|cargo|gradle|mvn|command|terminal|server|logs?)\b/.test(
        text,
      ),
    wantsTerminalRead:
      /\b(last command|terminal output|this error|that error|traceback|stack trace|log output)\b/.test(
        text,
      ),
    wantsPreview:
      /\b(open|preview|browser|localhost|127\.0\.0\.1|url|page)\b/.test(text),
    wantsDelegation:
      /\b(subagent|delegate|parallel|plan|todo|agent)\b/.test(text),
    wantsResearch:
      /\b(mcps?|exa|context7|web ?search|search the web|latest|official docs|documentation|api docs|current docs|up-to-date|research)\b/.test(
        text,
      ),
  };
}

export function messageLikelyNeedsMcpTools(messages: UIMessage[]): boolean {
  return analyzeToolIntent(messages).wantsResearch;
}

export function selectActiveTools(
  messages: UIMessage[],
  provider: ProviderId,
  availableToolNames: string[] = [],
): ActiveToolName[] | undefined {
  const text = getLastUserText(messages);
  if (!text) return undefined;

  const {
    wantsRead,
    wantsSearch,
    wantsEdit,
    wantsShell,
    wantsTerminalRead,
    wantsPreview,
    wantsDelegation,
    wantsResearch,
  } = analyzeToolIntent(messages);
  if (
    !wantsRead &&
    !wantsSearch &&
    !wantsEdit &&
    !wantsShell &&
    !wantsTerminalRead &&
    !wantsPreview &&
    !wantsDelegation &&
    !wantsResearch
  ) {
    return undefined;
  }

  const selected = new Set<ActiveToolName>();

  const mcpResearchTools = availableToolNames.filter((name) =>
    [
      "web_search_exa",
      "web_fetch_exa",
      "resolve-library-id",
      "get-library-docs",
    ].includes(name),
  );

  if (wantsRead || wantsSearch || wantsEdit) addTools(selected, ALWAYS_ACTIVE_TOOLS);
  if (wantsSearch) addTools(selected, SEARCH_TOOLS);
  if (wantsEdit) addTools(selected, EDIT_TOOLS);
  if (wantsShell) addTools(selected, SHELL_TOOLS);
  if (wantsTerminalRead || wantsShell) selected.add("get_terminal_output");
  if (wantsPreview) addTools(selected, ["open_preview", "suggest_command"] as const);
  if (wantsDelegation) addTools(selected, DELEGATION_TOOLS);
  if (wantsResearch) {
    for (const toolName of mcpResearchTools) {
      selected.add(toolName as ActiveToolName);
    }
  }

  if (LOCAL_TOOLCALL_PROVIDERS.has(provider)) {
    const narrowed = new Set<ActiveToolName>();
    if (wantsRead || wantsSearch || wantsEdit) {
      addTools(narrowed, ALWAYS_ACTIVE_TOOLS);
    }
    if (wantsSearch) addTools(narrowed, SEARCH_TOOLS);
    if (wantsEdit) {
      addTools(narrowed, EDIT_TOOLS);
    }
    if (wantsShell) addTools(narrowed, SHELL_TOOLS);
    if (wantsTerminalRead || wantsShell) narrowed.add("get_terminal_output");
    if (wantsPreview) addTools(narrowed, ["open_preview", "suggest_command"] as const);
    if (wantsDelegation) addTools(narrowed, ["todo_write", "run_subagent"] as const);
    if (wantsResearch) {
      for (const toolName of mcpResearchTools) {
        narrowed.add(toolName as ActiveToolName);
      }
    }
    return Array.from(narrowed) as ActiveToolName[];
  }

  return Array.from(selected) as ActiveToolName[];
}

const modelCache = new Map<string, LanguageModel>();

function isLikelySimpleRequest(messages: UIMessage[]): boolean {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return false;
  const text = lastUser.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
  if (!text) return false;
  if (text.length > 600) return false;
  if (/[`]{3}[\s\S]*?[`]{3}/.test(text)) return false;
  if (/\b(class|interface|package|import|public\s+class|fn\s+\w+|def\s+\w+)\b/i.test(text)) {
    return false;
  }
  if (text.split(/\s+/).length > 120) return false;
  return true;
}

function chooseRoutedModelId(modelId: ModelId, simple: boolean): ModelId {
  if (!simple) return modelId;
  switch (modelId) {
    case "gpt-5.5":
    case "gpt-5.3-codex":
      return "gpt-5.4-mini";
    case "claude-opus-4-7":
    case "claude-opus-4-6":
      return "claude-sonnet-4-6";
    case "claude-sonnet-4-6":
      return "claude-haiku-4-5";
    case "gemini-3.1-pro-preview":
    case "gemini-2.5-pro":
      return "gemini-2.5-flash";
    case "grok-4.20-reasoning":
      return "grok-4.20-non-reasoning";
    case "deepseek-v4-pro":
    case "deepseek-reasoner":
      return "deepseek-v4-flash";
    default:
      return modelId;
  }
}

export function chooseRefactorPreviewModelId(modelId: ModelId): ModelId {
  switch (modelId) {
    case "gpt-5.5":
    case "gpt-5.3-codex":
      return "gpt-5.4-mini";
    case "claude-opus-4-7":
    case "claude-opus-4-6":
      return "claude-sonnet-4-6";
    case "gemini-3.1-pro-preview":
    case "gemini-2.5-pro":
      return "gemini-2.5-flash";
    case "deepseek-v4-pro":
    case "deepseek-reasoner":
      return "deepseek-v4-flash";
    default:
      return modelId;
  }
}

export async function buildLanguageModel(
  provider: ProviderId,
  keys: ProviderKeys,
  resolvedModelId: string,
  options: BuildModelOptions = {},
): Promise<LanguageModel> {
  if (providerNeedsKey(provider) && !keys[provider]) {
    throw new Error(
      `No API key configured for ${provider}. Open Settings → AI to add one.`,
    );
  }
  const key = keys[provider] ?? "";
  const lmstudioURL = options.lmstudioBaseURL ?? LMSTUDIO_DEFAULT_BASE_URL;
  const mlxURL = options.mlxBaseURL ?? MLX_DEFAULT_BASE_URL;
  const ollamaURL = options.ollamaBaseURL ?? OLLAMA_DEFAULT_BASE_URL;
  const compatURL = options.openaiCompatibleBaseURL ?? "";
  const cacheKey = `${provider} ${key} ${resolvedModelId} ${lmstudioURL} ${mlxURL} ${ollamaURL} ${compatURL}`;
  const hit = modelCache.get(cacheKey);
  if (hit) return hit;

  let built: LanguageModel;
  switch (provider) {
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      built = createOpenAI({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      built = createAnthropic({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      built = createGoogleGenerativeAI({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "xai": {
      const { createXai } = await import("@ai-sdk/xai");
      built = createXai({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "cerebras": {
      const { createCerebras } = await import("@ai-sdk/cerebras");
      built = createCerebras({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "deepseek": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "deepseek",
        baseURL: "https://api.deepseek.com",
        apiKey: key,
        fetch: safeWindowFetch,
      })(resolvedModelId);
      break;
    }
    case "mistral": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "mistral",
        baseURL: "https://api.mistral.ai/v1",
        apiKey: key,
        fetch: safeWindowFetch,
      })(resolvedModelId);
      break;
    }
    case "groq": {
      const { createGroq } = await import("@ai-sdk/groq");
      built = createGroq({ apiKey: key, fetch: safeWindowFetch })(resolvedModelId);
      break;
    }
    case "openrouter": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: key,
        headers: {
          "HTTP-Referer": "https://github.com/SobralCybersec/GetJavaFixed",
          "X-Title": "JavaRf",
        },
        fetch: safeWindowFetch,
      })(resolvedModelId);
      break;
    }
    case "openai-compatible": {
      if (!compatURL) {
        throw new Error(
          "OpenAI-compatible provider has no base URL. Set it in Settings → Models.",
        );
      }
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "openai-compatible",
        baseURL: compatURL,
        apiKey: key || undefined,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "lmstudio": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "lmstudio",
        baseURL: lmstudioURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "mlx": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "mlx",
        baseURL: mlxURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    case "ollama": {
      const { createOpenAICompatible } =
        await import("@ai-sdk/openai-compatible");
      built = createOpenAICompatible({
        name: "ollama",
        baseURL: ollamaURL,
        fetch: localProxyFetch,
      })(resolvedModelId);
      break;
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unsupported provider: ${_exhaustive as ProviderId}`);
    }
  }
  modelCache.set(cacheKey, built);
  return built;
}

export function buildConfiguredLanguageModel(
  modelId: ModelId,
  keys: ProviderKeys,
  local: LocalProviderConfig = {},
): Promise<LanguageModel> {
  const resolved = resolveConfiguredModel(modelId, local);
  return buildLanguageModel(resolved.provider, keys, resolved.runtimeModelId, {
    lmstudioBaseURL: resolved.lmstudioBaseURL,
    mlxBaseURL: resolved.mlxBaseURL,
    ollamaBaseURL: resolved.ollamaBaseURL,
    openaiCompatibleBaseURL: resolved.openaiCompatibleBaseURL,
  });
}

const PLAN_MODE_PROMPT = `## PLAN MODE — ACTIVE
Mutating tools (write_file, edit, multi_edit, create_directory) will queue their changes for the user to review as a single diff. Do NOT execute bash_run or bash_background while plan mode is active — restrict yourself to reads (read_file, grep, glob, list_directory) and the queued mutations. After queueing the full set of edits, stop and return a brief summary; do not continue acting until the user has accepted/rejected.`;

function buildStableSystem(
  modelId: ModelId,
  persona: { name: string; instructions: string } | null,
  customInstructions: string | undefined,
  projectMemory: string | null,
): string {
  const base = selectSystemPrompt(getModel(modelId).id);
  const personaBlock = persona?.instructions.trim()
    ? `\n\n## ACTIVE AGENT — ${persona.name}\n${persona.instructions.trim()}`
    : "";
  const customBlock = customInstructions?.trim()
    ? `\n\n## USER CUSTOM INSTRUCTIONS — follow unless they conflict with safety rules above\n${customInstructions.trim()}`
    : "";
  const memoryBlock =
    projectMemory && projectMemory.trim().length > 0
      ? `\n\n## PROJECT — JAVARF WORKSPACE\n${projectMemory.trim()}`
      : "";
  return `${base}${memoryBlock}${personaBlock}${customBlock}`;
}

function applyCacheBreakpoints(
  messages: ModelMessage[],
  provider: ProviderId,
): ModelMessage[] {
  if (provider !== "anthropic" || messages.length === 0) return messages;
  const marker = {
    anthropic: { cacheControl: { type: "ephemeral" as const } },
  };
  const withMarker = (m: ModelMessage): ModelMessage => ({
    ...m,
    providerOptions: { ...(m.providerOptions ?? {}), ...marker },
  });
  const out = messages.slice();
  out[0] = withMarker(out[0]);
  const lastIdx = out.length - 1;
  if (lastIdx > 0) out[lastIdx] = withMarker(out[lastIdx]);
  return out;
}

const PSEUDO_TOOL_PATTERNS = [
  /<tool_call\b[\s\S]*?<\/tool_call>/gi,
  /<tool_call\b[^>]*\/?>/gi,
  /^Reasoned\s*$/gim,
  /^Search\s*$/gim,
  /`?<tool_call[^`\n]*`?/gi,
];

function sanitizeAssistantTextContent(text: string): string {
  let next = text;
  for (const pattern of PSEUDO_TOOL_PATTERNS) {
    next = next.replace(pattern, "");
  }
  next = next.replace(/\n{3,}/g, "\n\n").trim();
  return next;
}

function sanitizeMalformedToolMarkup(messages: ModelMessage[]): ModelMessage[] {
  let changed = false;
  const sanitized = messages.map((message) => {
    if (message.role !== "assistant") return message;
    if (typeof message.content === "string") {
      const next = sanitizeAssistantTextContent(message.content);
      if (next === message.content) return message;
      changed = true;
      return { ...message, content: next };
    }
    if (!Array.isArray(message.content)) return message;
    let localChanged = false;
    const nextParts = message.content
      .map((part) => {
        if (
          part.type !== "text" ||
          typeof (part as { text?: unknown }).text !== "string"
        ) {
          return part;
        }
        const original = (part as { text: string }).text;
        const text = sanitizeAssistantTextContent(original);
        if (text === original) return part;
        localChanged = true;
        return text
          ? { ...part, text }
          : null;
      })
      .filter(Boolean);
    if (!localChanged) return message;
    changed = true;
    return { ...message, content: nextParts } as ModelMessage;
  });
  return changed ? sanitized : messages;
}

export function messageLikelyNeedsToolUse(messages: UIMessage[]): boolean {
  const intent = analyzeToolIntent(messages);
  return (
    intent.wantsRead ||
    intent.wantsSearch ||
    intent.wantsEdit ||
    intent.wantsShell ||
    intent.wantsTerminalRead ||
    intent.wantsPreview ||
    intent.wantsDelegation ||
    intent.wantsResearch
  );
}

export function isDegradedLocalToolTurn(args: {
  provider: ProviderId;
  messages: UIMessage[];
  activeTools?: ActiveToolName[];
}): boolean {
  if (!LOCAL_TOOLCALL_PROVIDERS.has(args.provider)) return false;
  if (!messageLikelyNeedsToolUse(args.messages)) return false;
  return (args.activeTools?.length ?? 0) > ALWAYS_ACTIVE_TOOLS.length;
}

export function buildTurnToolAvailabilityBlock(
  activeToolNames?: readonly string[],
): string {
  if (!activeToolNames || activeToolNames.length === 0) {
    return `\n\n## TOOL AVAILABILITY THIS TURN
Ignore any generic tool lists above. No tools are available this turn.
- Reply in plain text only.
- Never call any tool name in this turn.`;
  }

  return `\n\n## TOOL AVAILABILITY THIS TURN
Ignore any generic tool lists above. The only tools available this turn are:
${activeToolNames.map((toolName) => `- ${toolName}`).join("\n")}
- Never call any other tool name.
- If you want an unavailable tool, use the closest available tool or explain the limitation briefly instead of inventing a tool call.`;
}

export function buildTurnContextBlock(env: EnvContext): string {
  if (!env.activeFile) return "";
  return `\n\n## TURN FILE CONTEXT
An active file is selected for this turn:
- active_file: ${env.activeFile}
- Treat active_file as concrete user context.
- If the user says "this file", "this class", "here", asks what's wrong, asks for a fix, or otherwise gives an underspecified code request, use active_file as the target.
- Do not claim that no file context was provided when active_file is present.
- If read_file is available and you need context, start by calling read_file on active_file.`;
}

function buildRuntimeAwareSystem(
  modelId: ModelId,
  provider: ProviderId,
  persona: { name: string; instructions: string } | null,
  customInstructions: string | undefined,
  projectMemory: string | null,
  mcpToolNames: string[] = [],
  activeToolNames?: readonly string[],
  env?: EnvContext,
): string {
  const base = buildStableSystem(
    modelId,
    persona,
    customInstructions,
    projectMemory,
  );
  const toolAvailabilityBlock = buildTurnToolAvailabilityBlock(activeToolNames);
  const turnContextBlock = env ? buildTurnContextBlock(env) : "";
  const mcpBlock =
    mcpToolNames.length > 0
      ? `\n\n## MCP TOOLS AVAILABLE THIS TURN\n${mcpToolNames
          .map((toolName) => `- ${toolName}`)
          .join("\n")}`
      : "";
  const baseWithTurnTools = `${base}${mcpBlock}${turnContextBlock}${toolAvailabilityBlock}`;
  if (!LOCAL_TOOLCALL_PROVIDERS.has(provider)) return baseWithTurnTools;
  const localRuntimeBlock = `${baseWithTurnTools}

## LOCAL TOOL-CALLING RUNTIME
You are connected to a local or OpenAI-compatible runtime with less reliable tool parsing.
- If you need tools, emit native tool calls only. Never print XML, JSON, markdown, shell snippets, or pseudo tags such as <tool_call> or [TOOL_REQUEST].
- Use at most one tool call per step unless the user explicitly asks for parallel searches.
- Prefer the smallest sufficient tool set and avoid unnecessary tools.
- If a tool is unavailable or not needed, answer normally instead of inventing tool syntax.
- If the user asks to inspect a file, search the codebase, edit a file, or run a command, your next assistant action should be a native tool call, not explanatory prose.
- Correct examples:
  - To inspect a file, call \`read_file\` with a path argument.
  - To search code, call \`grep\` or \`glob\`.
  - To patch an existing file, call \`edit\` or \`multi_edit\`.
  - To run a shell command, call \`bash_run\` with the command as tool input.
- Never output examples such as:
  - \`<tool_call>...</tool_call>\`
  - a bare filesystem path by itself
  - a raw shell command such as \`findstr /n ...\` in assistant text
  - narrated headers like \`Search\`, \`Reasoned\`, or \`Edit\`.
`;
  return localRuntimeBlock;
}

function normalizeToolName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function extractToolMarkupJson(text: string): string | null {
  const match = text.match(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i);
  return match?.[1]?.trim() ?? null;
}

function tryRepairToolInput(input: unknown): unknown {
  if (input && typeof input === "object") return input;
  if (typeof input !== "string") return input;

  const direct = input.trim();
  const candidates = [direct, extractToolMarkupJson(direct), extractJsonObject(direct)].filter(
    (value): value is string => !!value,
  );

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // keep trying
    }
  }
  return input;
}

function toToolCallInputString(input: unknown): string {
  if (typeof input === "string") return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

async function repairToolCall({
  toolCall,
  tools,
}: {
  toolCall: { toolName: string; input: unknown; toolCallId: string };
  tools: Record<string, unknown>;
}): Promise<
  | {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      input: string;
    }
  | null
> {
  const available = Object.keys(tools);
  const byNormalized = new Map(
    available.map((name) => [normalizeToolName(name), name] as const),
  );
  const repairedName =
    available.includes(toolCall.toolName)
      ? toolCall.toolName
      : byNormalized.get(normalizeToolName(toolCall.toolName)) ?? null;
  if (!repairedName) return null;

  return {
    type: "tool-call",
    toolCallId: toolCall.toolCallId,
    toolName: repairedName,
    input: toToolCallInputString(tryRepairToolInput(toolCall.input)),
  };
}

export type AgentUsage = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

export type AgentUsageDelta = AgentUsage & {
  lastInputTokens: number;
  lastCachedTokens: number;
};

const EMPTY_USAGE: AgentUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
};

export type RunAgentOptions = {
  keys: ProviderKeys;
  modelId?: ModelId;
  customInstructions?: string;
  agentPersona?: { name: string; instructions: string } | null;
  toolContext: ToolContext;
  onStep?: (step: string | null) => void;
  onUsage?: (delta: AgentUsageDelta) => void;
  onCompact?: (info: { droppedCount: number }) => void;
  onFinishMeta?: (info: { hitStepCap: boolean; finishReason: string }) => void;
  lmstudioBaseURL?: string;
  lmstudioModelId?: string;
  mlxBaseURL?: string;
  mlxModelId?: string;
  ollamaBaseURL?: string;
  ollamaModelId?: string;
  openaiCompatibleBaseURL?: string;
  openaiCompatibleModelId?: string;
  openaiCompatibleContextLimit?: number;
  openrouterModelId?: string;
  planMode?: boolean;
  projectMemory?: string | null;
  mcpTools?: Record<string, unknown>;
  mcpToolNames?: string[];
  uiMessages: UIMessage[];
  abortSignal?: AbortSignal;
};

export async function runAgentStream(opts: RunAgentOptions) {
  const modelId = opts.modelId ?? DEFAULT_MODEL_ID;
  const isSimple = isLikelySimpleRequest(opts.uiMessages);
  const routedModelId = chooseRoutedModelId(modelId, isSimple);
  const model = await buildConfiguredLanguageModel(routedModelId, opts.keys, {
    lmstudioBaseURL: opts.lmstudioBaseURL,
    lmstudioModelId: opts.lmstudioModelId,
    mlxBaseURL: opts.mlxBaseURL,
    mlxModelId: opts.mlxModelId,
    ollamaBaseURL: opts.ollamaBaseURL,
    ollamaModelId: opts.ollamaModelId,
    openaiCompatibleBaseURL: opts.openaiCompatibleBaseURL,
    openaiCompatibleModelId: opts.openaiCompatibleModelId,
    openrouterModelId: opts.openrouterModelId,
  });
  const provider = getModel(routedModelId).provider;
  const activeTools = selectActiveTools(
    opts.uiMessages,
    provider,
    Object.keys(opts.mcpTools ?? {}),
  );
  const env = parseEnvContext(opts.uiMessages);

  const stableSystem = buildRuntimeAwareSystem(
    modelId,
    provider,
    opts.agentPersona ?? null,
    opts.customInstructions,
    opts.projectMemory ?? null,
    opts.mcpToolNames ?? [],
    activeTools,
    env,
  );

  const history = await convertToModelMessages(opts.uiMessages);
  const prunedHistory = pruneMessages({
    messages: sanitizeMalformedToolMarkup(history),
    reasoning: modelKeepsReasoning(modelId) ? "none" : "before-last-message",
    emptyMessages: "remove",
  });
  const compact = compactModelMessagesDetailed(
    prunedHistory,
    getModelContextLimit(
      getModel(modelId).id,
      opts.openaiCompatibleContextLimit,
    ),
  );
  const compactedHistory = compact.messages;
  if (compact.compacted) {
    opts.onCompact?.({ droppedCount: compact.droppedCount });
  }

  const messages: ModelMessage[] = [{ role: "system", content: stableSystem }];
  if (opts.planMode) {
    messages.push({ role: "system", content: PLAN_MODE_PROMPT });
  }
  messages.push(...compactedHistory);

  const finalMessages = applyCacheBreakpoints(messages, provider);
  const baseTools = buildTools(opts.toolContext);
  const mergedTools = {
    ...baseTools,
    ...(opts.mcpTools ?? {}),
  } as ToolSet;
  const selectedTools =
    activeTools && activeTools.length > 0
      ? (Object.fromEntries(
          Object.entries(mergedTools).filter(([name]) =>
            activeTools.includes(name as ActiveToolName),
          ),
        ) as ToolSet)
      : undefined;
  const promptCacheKey =
    provider === "openai"
      ? `${routedModelId}:${isSimple ? "simple" : "direct"}:${opts.agentPersona?.name ?? "default"}`
      : undefined;

  let stepsSeen = 0;
  const needsStrictLocalToolPrompt = isDegradedLocalToolTurn({
    provider,
    messages: opts.uiMessages,
    activeTools,
  });
  const runtimeMessages = needsStrictLocalToolPrompt
    ? [
        ...finalMessages,
        {
          role: "system" as const,
          content:
            "This turn requires real tool use. Do not answer with success text unless you have emitted at least one native tool call first.",
        },
      ]
    : finalMessages;
  return streamText({
    model,
    messages: runtimeMessages,
    tools: selectedTools,
    activeTools: activeTools && activeTools.length > 0 ? activeTools : undefined,
    toolChoice: "auto",
    experimental_repairToolCall: async ({ toolCall, tools }) =>
      repairToolCall({
        toolCall: {
          toolName: toolCall.toolName,
          input: toolCall.input,
          toolCallId: toolCall.toolCallId,
        },
        tools: tools as Record<string, unknown>,
      }),
    stopWhen: stepCountIs(MAX_AGENT_STEPS),
    maxOutputTokens: isSimple ? 1024 : undefined,
    abortSignal: opts.abortSignal,
    ...(promptCacheKey
      ? {
          providerOptions: {
            openai: {
              promptCacheKey,
              reasoningEffort: isSimple ? "low" : "medium",
              store: false,
            },
          },
        }
      : {}),
    onStepFinish: (step) => {
      stepsSeen++;
      if (opts.onStep) {
        const last = step.toolCalls?.[step.toolCalls.length - 1];
        if (last) {
          const label = TOOL_LABELS[last.toolName];
          opts.onStep(
            label
              ? label((last.input ?? {}) as Record<string, unknown>)
              : `Calling ${last.toolName}`,
          );
        } else if (step.text) {
          opts.onStep("Writing");
        }
      }
      if (opts.onUsage && step.usage) {
        const u = step.usage;
        const stepInput = u.inputTokens ?? 0;
        const stepCached = u.inputTokenDetails?.cacheReadTokens ?? 0;
        opts.onUsage({
          inputTokens: stepInput,
          outputTokens: u.outputTokens ?? 0,
          cachedInputTokens: stepCached,
          lastInputTokens: stepInput,
          lastCachedTokens: stepCached,
        });
      }
    },
    onFinish: (result) => {
      opts.onStep?.(null);
      const finishReason =
        (result as { finishReason?: string } | undefined)?.finishReason ?? "";
      opts.onFinishMeta?.({
        hitStepCap: stepsSeen >= MAX_AGENT_STEPS,
        finishReason,
      });
    },
  });
}

export { EMPTY_USAGE };
