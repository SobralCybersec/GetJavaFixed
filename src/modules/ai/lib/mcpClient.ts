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
      url: "https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,web_fetch_exa",
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
  close: () => Promise<void>;
};

type McpCacheEntry = {
  promise: Promise<CachedMcpBundle>;
  bundle: CachedMcpBundle | null;
  disposed: boolean;
};

const mcpBundleCache = new Map<string, McpCacheEntry>();
const MAX_CACHED_MCP_BUNDLES = 1;
const MCP_PROVIDER_TIMEOUT_MS = 3_500;
const EMPTY_CACHED_MCP_BUNDLE: CachedMcpBundle = {
  tools: {} as McpToolSet,
  toolNames: [],
  close: async () => {},
};

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

async function disposeCacheEntry(entry: McpCacheEntry | undefined): Promise<void> {
  if (!entry || entry.disposed) return;
  entry.disposed = true;
  if (!entry.bundle) return;
  try {
    await entry.bundle.close();
  } catch {
    // best-effort cleanup
  }
}

function createCacheEntry(
  cacheKey: string,
  config: McpConfig,
): McpCacheEntry {
  const entry: McpCacheEntry = {
    promise: Promise.resolve(EMPTY_CACHED_MCP_BUNDLE),
    bundle: null,
    disposed: false,
  };

  entry.promise = createRefactorMcpTools(config)
    .then((bundle) => {
      const cached: CachedMcpBundle = {
        tools: bundle.tools,
        toolNames: Object.keys(bundle.tools),
        close: bundle.close,
      };
      entry.bundle = cached;
      if (entry.disposed) {
        void cached.close();
      }
      return cached;
    })
    .catch((error) => {
      if (mcpBundleCache.get(cacheKey) === entry) {
        mcpBundleCache.delete(cacheKey);
      }
      throw error;
    });

  return entry;
}

async function pruneCachedBundles(activeKey: string): Promise<void> {
  if (mcpBundleCache.size <= MAX_CACHED_MCP_BUNDLES) return;
  for (const [key, entry] of Array.from(mcpBundleCache.entries())) {
    if (key === activeKey) continue;
    mcpBundleCache.delete(key);
    await disposeCacheEntry(entry);
    if (mcpBundleCache.size <= MAX_CACHED_MCP_BUNDLES) break;
  }
}

export async function invalidateCachedMcpToolBundle(
  config: McpConfig,
): Promise<void> {
  const cacheKey = mcpConfigCacheKey(config);
  const entry = mcpBundleCache.get(cacheKey);
  if (!entry) return;
  mcpBundleCache.delete(cacheKey);
  await disposeCacheEntry(entry);
}

export async function closeAllCachedMcpToolBundles(): Promise<void> {
  const entries = Array.from(mcpBundleCache.values());
  mcpBundleCache.clear();
  await Promise.allSettled(entries.map((entry) => disposeCacheEntry(entry)));
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

async function loadMcpProvider(
  providerName: string,
  loadClient: () => Promise<Awaited<ReturnType<typeof createMCPClient>>>,
): Promise<
  | {
      ok: true;
      client: Awaited<ReturnType<typeof createMCPClient>>;
      tools: Record<string, unknown>;
    }
  | {
      ok: false;
      error: unknown;
    }
> {
  let client: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  try {
    client = await withTimeout(
      loadClient(),
      MCP_PROVIDER_TIMEOUT_MS,
      `${providerName} MCP client bootstrap timed out`,
    );
    const tools = await withTimeout(
      client.tools(),
      MCP_PROVIDER_TIMEOUT_MS,
      `${providerName} MCP tool discovery timed out`,
    );
    return { ok: true, client, tools: tools as Record<string, unknown> };
  } catch (error) {
    if (client) {
      try {
        await client.close();
      } catch {
        // best-effort cleanup
      }
    }
    return { ok: false, error };
  }
}

type McpProviderResult = Awaited<ReturnType<typeof loadMcpProvider>>;

export async function createRefactorMcpTools(
  config: McpConfig,
): Promise<RefactorMcpTools> {
  const providers: Array<Promise<McpProviderResult>> = [];

  if (config.exaEnabled && config.exaApiKey) {
    providers.push(
      loadMcpProvider("Exa", () => createExaClient(config.exaApiKey!)),
    );
  }

  if (config.context7Enabled !== false) {
    providers.push(
      loadMcpProvider("Context7", () =>
        createContext7Client(config.context7Url, config.context7ApiKey),
      ),
    );
  }

  const results = await Promise.all(providers);
  const successes = results.filter(
    (result): result is Extract<McpProviderResult, { ok: true }> => result.ok,
  );
  const failures = results.filter(
    (result): result is Extract<McpProviderResult, { ok: false }> => !result.ok,
  );

  if (successes.length === 0 && failures.length > 0) {
    const message = failures
      .map((result) =>
        result.error instanceof Error ? result.error.message : String(result.error),
      )
      .join("; ");
    throw new Error(message || "Failed to initialize MCP providers");
  }

  return {
    tools: Object.assign(
      {},
      ...successes.map((result) => result.tools),
    ) as RefactorMcpTools["tools"],
    close: async () => {
      await Promise.allSettled(
        successes.map((result) => result.client.close()),
      );
    },
  };
}

export async function getCachedMcpToolBundle(
  config: McpConfig,
): Promise<CachedMcpBundle> {
  const normalized = normalizeMcpConfig(config);
  if (!normalized.exaEnabled && normalized.context7Enabled === false) {
    if (mcpBundleCache.size > 0) {
      await closeAllCachedMcpToolBundles();
    }
    return EMPTY_CACHED_MCP_BUNDLE;
  }

  const cacheKey = mcpConfigCacheKey(normalized);
  let entry = mcpBundleCache.get(cacheKey);
  if (!entry) {
    entry = createCacheEntry(cacheKey, normalized);
    mcpBundleCache.set(cacheKey, entry);
    await pruneCachedBundles(cacheKey);
  }
  return entry.promise;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    void closeAllCachedMcpToolBundles();
  });
}
