import { createMCPClient } from "@ai-sdk/mcp";
import { safeWindowFetch } from "./proxyFetch";

export type McpConfig = {
  exaEnabled?: boolean;
  exaApiKey?: string;
  context7Enabled?: boolean;
  context7Url?: string;
  context7ApiKey?: string;
};

type McpToolSet = Awaited<
  ReturnType<Awaited<ReturnType<typeof createMCPClient>>["tools"]>
>;

export function createExaClient(apiKey: string) {
  return createMCPClient({
    transport: {
      type: "http",
      url: "https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa",
      headers: { "x-api-key": apiKey },
      fetch: safeWindowFetch,
    },
  });
}

export function createContext7Client(
  baseUrl = "https://mcp.context7.com/mcp",
  apiKey?: string,
) {
  return createMCPClient({
    transport: {
      type: "http",
      url: baseUrl,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      fetch: safeWindowFetch,
    },
  });
}

type RefactorMcpTools = {
  tools: McpToolSet;
  close: () => Promise<void>;
};

type CachedMcpBundle = {
  tools: McpToolSet;
  toolNames: string[];
};

const mcpBundleCache = new Map<string, Promise<CachedMcpBundle>>();

function normalizeMcpConfig(config: McpConfig): McpConfig {
  return {
    exaEnabled: !!config.exaEnabled && !!config.exaApiKey?.trim(),
    exaApiKey: config.exaApiKey?.trim() || undefined,
    context7Enabled: config.context7Enabled !== false,
    context7Url: config.context7Url?.trim() || undefined,
    context7ApiKey: config.context7ApiKey?.trim() || undefined,
  };
}

function mcpConfigCacheKey(config: McpConfig): string {
  const normalized = normalizeMcpConfig(config);
  return JSON.stringify(normalized);
}

export async function createRefactorMcpTools(
  config: McpConfig,
): Promise<RefactorMcpTools> {
  const clients: Awaited<ReturnType<typeof createMCPClient>>[] = [];
  const toolSets: Array<Record<string, unknown>> = [];

  if (config.exaEnabled && config.exaApiKey) {
    const exa = await createExaClient(config.exaApiKey);
    clients.push(exa);
    toolSets.push(await exa.tools());
  }

  if (config.context7Enabled !== false) {
    const context7 = await createContext7Client(
      config.context7Url,
      config.context7ApiKey,
    );
    clients.push(context7);
    toolSets.push(await context7.tools());
  }

  return {
    tools: Object.assign({}, ...toolSets) as RefactorMcpTools["tools"],
    close: async () => {
      await Promise.allSettled(clients.map((client) => client.close()));
    },
  };
}

export async function getCachedMcpToolBundle(
  config: McpConfig,
): Promise<CachedMcpBundle> {
  const normalized = normalizeMcpConfig(config);
  if (!normalized.exaEnabled && normalized.context7Enabled === false) {
    return { tools: {} as McpToolSet, toolNames: [] };
  }

  const cacheKey = mcpConfigCacheKey(normalized);
  let pending = mcpBundleCache.get(cacheKey);
  if (!pending) {
    pending = (async () => {
      const bundle = await createRefactorMcpTools(normalized);
      return {
        tools: bundle.tools,
        toolNames: Object.keys(bundle.tools),
      };
    })();
    pending.catch(() => {
      if (mcpBundleCache.get(cacheKey) === pending) {
        mcpBundleCache.delete(cacheKey);
      }
    });
    mcpBundleCache.set(cacheKey, pending);
  }
  return pending;
}
