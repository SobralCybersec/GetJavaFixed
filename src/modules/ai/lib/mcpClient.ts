import { createMCPClient } from "@ai-sdk/mcp";
import {
  getManagedMcpSafeToolNames,
  type HttpMcpProviderRuntimeConfig,
} from "./mcpRegistry";
import { createProxyFetch, proxyFetch } from "./proxyFetch";

export type McpConfig = {
  providers: HttpMcpProviderRuntimeConfig[];
};

type McpToolSet = Awaited<
  ReturnType<Awaited<ReturnType<typeof createMCPClient>>["tools"]>
>;

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

type LoadableClient = Awaited<ReturnType<typeof createMCPClient>>;

type McpProviderResult = Awaited<ReturnType<typeof loadMcpProvider>>;

const mcpBundleCache = new Map<string, McpCacheEntry>();
const MAX_CACHED_MCP_BUNDLES = 1;
const MCP_PROVIDER_TIMEOUT_MS = 3_500;
const loopbackMcpFetch = createProxyFetch({ allowPrivateNetwork: true });
const EMPTY_CACHED_MCP_BUNDLE: CachedMcpBundle = {
  tools: {} as McpToolSet,
  toolNames: [],
  close: async () => {},
};

export function createHttpMcpClient(
  provider: HttpMcpProviderRuntimeConfig,
): Promise<LoadableClient> {
  const apiHeaders: Record<string, string> = {};
  if (provider.apiKey) {
    if (provider.auth === "x-api-key") {
      apiHeaders["x-api-key"] = provider.apiKey;
    } else if (provider.auth === "bearer") {
      apiHeaders.Authorization = `Bearer ${provider.apiKey}`;
    }
  }

  return createMCPClient({
    transport: {
      type: "http",
      url: provider.url,
      headers: {
        ...provider.headers,
        ...apiHeaders,
      },
      fetch: selectMcpFetch(provider.url),
    },
  });
}

function selectMcpFetch(url: string): typeof fetch {
  return isLoopbackHttpUrl(url) ? loopbackMcpFetch : proxyFetch;
}

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

export async function probeMcpProvider(
  provider: HttpMcpProviderRuntimeConfig,
): Promise<{
  ok: boolean;
  toolNames: string[];
  errorMessage?: string;
}> {
  const result = await loadMcpProvider(provider, () => createHttpMcpClient(provider));
  if (!result.ok) {
    return {
      ok: false,
      toolNames: [],
      errorMessage:
        result.error instanceof Error ? result.error.message : String(result.error),
    };
  }
  await result.client.close().catch(() => undefined);
  return {
    ok: true,
    toolNames: Object.keys(result.tools),
  };
}

function normalizeMcpConfig(config: McpConfig): McpConfig {
  const providers = (config.providers ?? [])
    .filter(
      (provider): provider is HttpMcpProviderRuntimeConfig =>
        !!provider &&
        provider.enabled !== false &&
        typeof provider.id === "string" &&
        typeof provider.url === "string" &&
        provider.url.trim().length > 0,
    )
    .map((provider) => ({
      ...provider,
      url: provider.url.trim(),
      apiKey: provider.apiKey?.trim() || undefined,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return { providers };
}

function mcpConfigCacheKey(config: McpConfig): string {
  return JSON.stringify(normalizeMcpConfig(config));
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

function createCacheEntry(cacheKey: string, config: McpConfig): McpCacheEntry {
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
  onLateResolve?: (value: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      reject(new Error(message));
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) {
          onLateResolve?.(value);
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function loadMcpProvider(
  provider: HttpMcpProviderRuntimeConfig,
  loadClient: () => Promise<LoadableClient>,
): Promise<
  | {
      ok: true;
      client: LoadableClient;
      tools: Record<string, unknown>;
    }
  | {
      ok: false;
      error: unknown;
    }
> {
  let client: LoadableClient | null = null;
  try {
    client = await withTimeout(
      loadClient(),
      MCP_PROVIDER_TIMEOUT_MS,
      `${provider.label} MCP client bootstrap timed out`,
      (lateClient) => {
        void lateClient.close().catch(() => undefined);
      },
    );
    const tools = await withTimeout(
      client.tools(),
      MCP_PROVIDER_TIMEOUT_MS,
      `${provider.label} MCP tool discovery timed out`,
    );
    const filteredTools = filterProviderTools(
      provider.id,
      tools as Record<string, unknown>,
    );
    return { ok: true, client, tools: filteredTools };
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

function filterProviderTools(
  providerId: string,
  tools: Record<string, unknown>,
): Record<string, unknown> {
  const allowlist = getManagedMcpSafeToolNames(providerId);
  if (!allowlist) return tools;
  return Object.fromEntries(
    Object.entries(tools).filter(([name]) => allowlist.has(name)),
  );
}

export async function createRefactorMcpTools(
  config: McpConfig,
): Promise<RefactorMcpTools> {
  const normalized = normalizeMcpConfig(config);
  const providers = normalized.providers.map((provider) =>
    loadMcpProvider(provider, () => createHttpMcpClient(provider)),
  );
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
      await Promise.allSettled(successes.map((result) => result.client.close()));
    },
  };
}

export async function getCachedMcpToolBundle(
  config: McpConfig,
): Promise<CachedMcpBundle> {
  const normalized = normalizeMcpConfig(config);
  if (normalized.providers.length === 0) {
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
