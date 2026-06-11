import type { RefactorToolKeyId } from "./toolKeyring";

export type RemoteMcpProviderId = "exa" | "context7";
export type ManagedMcpPresetId = "x64dbg";

export type McpProviderConfig = {
  id: RemoteMcpProviderId;
  enabled: boolean;
  url?: string;
};

export type ManagedMcpPresetConfig = {
  id: ManagedMcpPresetId;
  enabled: boolean;
  pythonPath: string;
  port: number;
  upstreamUrl: string;
};

export type HttpMcpProviderAuth = "none" | "x-api-key" | "bearer";

export type HttpMcpProviderRuntimeConfig = {
  id: string;
  label: string;
  enabled: boolean;
  url: string;
  auth: HttpMcpProviderAuth;
  apiKey?: string;
  headers?: Record<string, string>;
};

export type ManagedMcpHealthSnapshot = {
  healthy: boolean;
};

export const X64DBG_SAFE_TOOL_NAMES = [
  "IsDebugActive",
  "IsDebugging",
  "RegisterGet",
  "MemoryRead",
  "MemoryIsValidPtr",
  "MemoryGetProtect",
  "StackPeek",
  "FlagGet",
  "PatternFindMem",
  "MiscParseExpression",
  "MiscRemoteGetProcAddress",
  "DisasmGetInstructionRange",
  "GetModuleList",
  "QuerySymbols",
  "GetThreadList",
  "GetTebAddress",
  "MemoryBase",
  "StringGetAt",
  "XrefGet",
  "XrefCount",
  "GetMemoryMap",
  "GetBranchDestination",
  "GetCallStack",
  "GetBreakpointList",
  "LabelGet",
  "LabelList",
  "CommentGet",
  "GetRegisterDump",
  "EnumTcpConnections",
  "GetPatchList",
  "GetPatchAt",
  "EnumHandles",
] as const;

const MANAGED_MCP_SAFE_TOOL_SET: Record<ManagedMcpPresetId, ReadonlySet<string>> = {
  x64dbg: new Set(X64DBG_SAFE_TOOL_NAMES),
};

export const EXA_MCP_URL =
  "https://mcp.exa.ai/mcp?tools=web_search_exa,web_search_advanced_exa,web_fetch_exa";
export const DEFAULT_CONTEXT7_MCP_URL = "https://mcp.context7.com/mcp";
export const DEFAULT_X64DBG_UPSTREAM_URL = "http://127.0.0.1:8888/";
export const DEFAULT_X64DBG_MCP_PORT = 8877;

export const REMOTE_MCP_PROVIDER_META: Record<
  RemoteMcpProviderId,
  {
    id: RemoteMcpProviderId;
    label: string;
    description: string;
    docsUrl: string;
    auth: HttpMcpProviderAuth;
    defaultUrl: string;
    toolKeyId?: RefactorToolKeyId;
  }
> = {
  exa: {
    id: "exa",
    label: "Exa",
    description: "Live web search and page fetch for current research.",
    docsUrl: "https://docs.exa.ai/reference/mcp-server",
    auth: "x-api-key",
    defaultUrl: EXA_MCP_URL,
    toolKeyId: "exa",
  },
  context7: {
    id: "context7",
    label: "Context7",
    description: "Version-aware library and framework documentation.",
    docsUrl: "https://context7.com",
    auth: "bearer",
    defaultUrl: DEFAULT_CONTEXT7_MCP_URL,
    toolKeyId: "context7",
  },
};

export const MANAGED_MCP_PRESET_META: Record<
  ManagedMcpPresetId,
  {
    id: ManagedMcpPresetId;
    label: string;
    description: string;
    docsUrl: string;
    sourceUrl: string;
    launcherScript: string;
    commandMarker: string;
    requiredAgentIds: string[];
    prerequisites: string[];
  }
> = {
  x64dbg: {
    id: "x64dbg",
    label: "x64dbg MCP",
    description:
      "Local debugger bridge for registers, memory, breakpoints, disassembly, and reverse-engineering workflows.",
    docsUrl: "https://github.com/wasdubya/x64dbgmcp",
    sourceUrl: "https://github.com/wasdubya/x64dbgmcp",
    launcherScript: "mcps/x64dbgmcp/serve_http.py",
    commandMarker: "mcps/x64dbgmcp/serve_http.py",
    requiredAgentIds: ["builtin:debugger"],
    prerequisites: [
      "Python available to create the local app-data x64dbg virtualenv",
      "Use Install deps to provision `mcps/x64dbgmcp/requirements.txt` into that local environment",
      "x64dbg running with the HTTP plugin enabled",
      "x64dbg HTTP endpoint reachable at the configured upstream URL",
    ],
  },
};

export function isManagedMcpPresetId(value: string): value is ManagedMcpPresetId {
  return value === "x64dbg";
}

export function getManagedMcpSafeToolNames(
  id: string,
): ReadonlySet<string> | null {
  if (!isManagedMcpPresetId(id)) return null;
  return MANAGED_MCP_SAFE_TOOL_SET[id];
}

export const DEFAULT_MCP_PROVIDERS: readonly McpProviderConfig[] = [
  { id: "exa", enabled: false, url: EXA_MCP_URL },
  { id: "context7", enabled: false, url: DEFAULT_CONTEXT7_MCP_URL },
] as const;

export const DEFAULT_MANAGED_MCP_PRESETS: readonly ManagedMcpPresetConfig[] = [
  {
    id: "x64dbg",
    enabled: false,
    pythonPath: "python",
    port: DEFAULT_X64DBG_MCP_PORT,
    upstreamUrl: DEFAULT_X64DBG_UPSTREAM_URL,
  },
] as const;

export function normalizeMcpProviders(
  value: readonly McpProviderConfig[] | null | undefined,
  legacy?: { enabled?: boolean; context7Url?: string },
): McpProviderConfig[] {
  const fallback = DEFAULT_MCP_PROVIDERS.map((entry) => ({ ...entry }));
  if (!Array.isArray(value) || value.length === 0) {
    if (legacy) {
      return fallback.map((entry) =>
        entry.id === "context7"
          ? {
              ...entry,
              enabled: legacy.enabled ?? entry.enabled,
              url: legacy.context7Url?.trim() || entry.url,
            }
          : {
              ...entry,
              enabled: legacy.enabled ?? entry.enabled,
            },
      );
    }
    return fallback;
  }

  const byId = new Map(
    value
      .filter((entry): entry is McpProviderConfig => !!entry && typeof entry.id === "string")
      .map((entry) => [
        entry.id,
        {
          id: entry.id,
          enabled: Boolean(entry.enabled),
          url: entry.url?.trim() || undefined,
        },
      ]),
  );

  return fallback.map((entry) => {
    const stored = byId.get(entry.id);
    if (!stored) return { ...entry };
    if (entry.id === "exa") {
      return { id: "exa", enabled: stored.enabled, url: EXA_MCP_URL };
    }
    return {
      id: "context7",
      enabled: stored.enabled,
      url: stored.url || DEFAULT_CONTEXT7_MCP_URL,
    };
  });
}

export function normalizeManagedMcpPresets(
  value: readonly ManagedMcpPresetConfig[] | null | undefined,
): ManagedMcpPresetConfig[] {
  const fallback = DEFAULT_MANAGED_MCP_PRESETS.map((entry) => ({ ...entry }));
  if (!Array.isArray(value) || value.length === 0) {
    return fallback;
  }

  const byId = new Map(
    value
      .filter(
        (entry): entry is ManagedMcpPresetConfig =>
          !!entry && typeof entry.id === "string",
      )
      .map((entry) => [
        entry.id,
        {
          id: entry.id,
          enabled: Boolean(entry.enabled),
          pythonPath: entry.pythonPath?.trim() || "python",
          port: normalizeManagedPort(entry.port),
          upstreamUrl: normalizeUpstreamUrl(entry.upstreamUrl),
        },
      ]),
  );

  return fallback.map((entry) => {
    const stored = byId.get(entry.id);
    if (!stored) return { ...entry };
    return {
      id: "x64dbg",
      enabled: stored.enabled,
      pythonPath: stored.pythonPath,
      port: stored.port,
      upstreamUrl: stored.upstreamUrl,
    };
  });
}

export function getRemoteMcpProviderConfig(
  providers: readonly McpProviderConfig[] | null | undefined,
  id: RemoteMcpProviderId,
): McpProviderConfig {
  return (
    normalizeMcpProviders(providers).find((entry) => entry.id === id) ?? {
      ...DEFAULT_MCP_PROVIDERS.find((entry) => entry.id === id)!,
    }
  );
}

export function getManagedMcpPresetConfig(
  presets: readonly ManagedMcpPresetConfig[] | null | undefined,
  id: ManagedMcpPresetId,
): ManagedMcpPresetConfig {
  return (
    normalizeManagedMcpPresets(presets).find((entry) => entry.id === id) ?? {
      ...DEFAULT_MANAGED_MCP_PRESETS.find((entry) => entry.id === id)!,
    }
  );
}

export function getManagedMcpEndpoint(
  config: Pick<ManagedMcpPresetConfig, "port">,
): string {
  return `http://127.0.0.1:${normalizeManagedPort(config.port)}/mcp`;
}

export function buildRuntimeMcpConfig(args: {
  providers: readonly McpProviderConfig[] | null | undefined;
  managedPresets: readonly ManagedMcpPresetConfig[] | null | undefined;
  toolKeys?: Partial<Record<RefactorToolKeyId, string | null | undefined>>;
  managedHealth?: Partial<Record<ManagedMcpPresetId, ManagedMcpHealthSnapshot>>;
  allowMissingToolKeys?: boolean;
}): {
  providers: HttpMcpProviderRuntimeConfig[];
} {
  const normalizedProviders = normalizeMcpProviders(args.providers);
  const normalizedManaged = normalizeManagedMcpPresets(args.managedPresets);
  const runtimeProviders: HttpMcpProviderRuntimeConfig[] = [];

  for (const provider of normalizedProviders) {
    const meta = REMOTE_MCP_PROVIDER_META[provider.id];
    const apiKey = meta.toolKeyId ? args.toolKeys?.[meta.toolKeyId]?.trim() : undefined;
    if (!provider.enabled) continue;
    if (meta.toolKeyId && !apiKey && !args.allowMissingToolKeys) continue;
    runtimeProviders.push({
      id: provider.id,
      label: meta.label,
      enabled: true,
      url: provider.id === "exa" ? EXA_MCP_URL : provider.url?.trim() || meta.defaultUrl,
      auth: meta.auth,
      apiKey: apiKey || undefined,
    });
  }

  for (const preset of normalizedManaged) {
    const meta = MANAGED_MCP_PRESET_META[preset.id];
    const health = args.managedHealth?.[preset.id];
    if (!preset.enabled || !health?.healthy) continue;
    runtimeProviders.push({
      id: preset.id,
      label: meta.label,
      enabled: true,
      url: getManagedMcpEndpoint(preset),
      auth: "none",
    });
  }

  return {
    providers: runtimeProviders.sort((left, right) =>
      left.id.localeCompare(right.id),
    ),
  };
}

function normalizeManagedPort(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_X64DBG_MCP_PORT;
  return Math.min(65535, Math.max(1024, Math.round(value)));
}

function normalizeUpstreamUrl(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_X64DBG_UPSTREAM_URL;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}
