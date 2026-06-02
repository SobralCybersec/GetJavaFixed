import { createMCPClient } from "@ai-sdk/mcp";

export type McpConfig = {
  exaEnabled?: boolean;
  exaApiKey?: string;
  context7Enabled?: boolean;
  context7Url?: string;
  context7ApiKey?: string;
};

export function createExaClient(apiKey: string) {
  return createMCPClient({
    transport: {
      type: "http",
      url: "https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa",
      headers: { "x-api-key": apiKey },
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
    },
  });
}

type RefactorMcpTools = {
  tools: Awaited<ReturnType<Awaited<ReturnType<typeof createMCPClient>>["tools"]>>;
  close: () => Promise<void>;
};

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
