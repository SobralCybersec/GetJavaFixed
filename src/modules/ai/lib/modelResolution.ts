import {
  LMSTUDIO_DEFAULT_BASE_URL,
  MLX_DEFAULT_BASE_URL,
  MODELS,
  OLLAMA_DEFAULT_BASE_URL,
  getModel,
  getModelContextLimit,
  type ModelInfo,
  type ModelId,
  type ProviderId,
} from "../config";

export type LocalProviderConfig = {
  lmstudioBaseURL?: string;
  lmstudioModelId?: string;
  mlxBaseURL?: string;
  mlxModelId?: string;
  ollamaBaseURL?: string;
  ollamaModelId?: string;
  openaiCompatibleBaseURL?: string;
  openaiCompatibleModelId?: string;
  openrouterModelId?: string;
};

export type ResolvedModelConfig = {
  provider: ProviderId;
  runtimeModelId: string;
  lmstudioBaseURL?: string;
  mlxBaseURL?: string;
  ollamaBaseURL?: string;
  openaiCompatibleBaseURL?: string;
};

export function resolveConfiguredModel(
  modelId: ModelId,
  local: LocalProviderConfig = {},
): ResolvedModelConfig {
  const model = getModel(modelId);
  switch (model.id) {
    case "lmstudio-local":
      if (!local.lmstudioModelId?.trim()) {
        throw new Error(
          "LM Studio: no model id set. Open Settings -> Models and enter the model id loaded in LM Studio.",
        );
      }
      return {
        provider: model.provider,
        runtimeModelId: local.lmstudioModelId.trim(),
        lmstudioBaseURL: local.lmstudioBaseURL ?? LMSTUDIO_DEFAULT_BASE_URL,
      };
    case "mlx-local":
      if (!local.mlxModelId?.trim()) {
        throw new Error(
          "MLX: no model id set. Open Settings -> Models and enter the model id served by mlx_lm.server.",
        );
      }
      return {
        provider: model.provider,
        runtimeModelId: local.mlxModelId.trim(),
        mlxBaseURL: local.mlxBaseURL ?? MLX_DEFAULT_BASE_URL,
      };
    case "ollama-local":
      if (!local.ollamaModelId?.trim()) {
        throw new Error(
          "Ollama: no model id set. Open Settings -> Models and enter the model id (e.g. the name from `ollama list`).",
        );
      }
      return {
        provider: model.provider,
        runtimeModelId: local.ollamaModelId.trim(),
        ollamaBaseURL: local.ollamaBaseURL ?? OLLAMA_DEFAULT_BASE_URL,
      };
    case "openai-compatible-custom":
      if (!local.openaiCompatibleModelId?.trim()) {
        throw new Error(
          "OpenAI-compatible: no model id set. Open Settings -> Models.",
        );
      }
      return {
        provider: model.provider,
        runtimeModelId: local.openaiCompatibleModelId.trim(),
        openaiCompatibleBaseURL: local.openaiCompatibleBaseURL ?? "",
      };
    case "openrouter-custom":
      if (!local.openrouterModelId?.trim()) {
        throw new Error(
          "OpenRouter: no model id set. Open Settings -> Models and enter an OpenRouter model id (e.g. anthropic/claude-sonnet-4-6).",
        );
      }
      return {
        provider: model.provider,
        runtimeModelId: local.openrouterModelId.trim(),
      };
    default:
      return {
        provider: model.provider,
        runtimeModelId: model.runtimeModelId ?? model.id,
        lmstudioBaseURL: local.lmstudioBaseURL,
        mlxBaseURL: local.mlxBaseURL,
        ollamaBaseURL: local.ollamaBaseURL,
        openaiCompatibleBaseURL: local.openaiCompatibleBaseURL,
      };
  }
}

export type ModelAliasMatch = {
  input: string;
  modelId: ModelId;
  provider: ProviderId;
  runtimeModelId: string;
  contextLimit: number;
  providerOptions?: ModelInfo["providerOptions"];
  confidence: "exact" | "alias" | "normalized" | "provider-prefix";
};

const PROVIDER_PREFIXES: Partial<Record<ProviderId, readonly string[]>> = {
  deepseek: ["deepseek"],
  qwen: ["qwen", "dashscope", "aliyun", "alibaba"],
  kimi: ["kimi", "moonshot"],
  together: ["together"],
  fireworks: ["fireworks"],
  perplexity: ["perplexity", "pplx"],
  novita: ["novita"],
  openrouter: ["openrouter"],
};

function normalizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/^.*\/models\//, "")
    .replace(/^models\//, "")
    .replace(/[:/_\s.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function withoutProviderPrefix(value: string, provider?: ProviderId | null): string {
  const prefixes = provider ? PROVIDER_PREFIXES[provider] ?? [provider] : [];
  let normalized = normalizeAlias(value);
  for (const prefix of prefixes) {
    const normalizedPrefix = normalizeAlias(prefix);
    if (normalized === normalizedPrefix) return normalized;
    if (normalized.startsWith(`${normalizedPrefix}-`)) {
      normalized = normalized.slice(normalizedPrefix.length + 1);
      break;
    }
  }
  return normalized;
}

function candidateAliases(model: ModelInfo): string[] {
  return [
    model.id,
    model.runtimeModelId ?? model.id,
    ...(model.aliases ?? []),
  ];
}

export function matchDiscoveredModel(
  rawModelId: string,
  providerHint?: ProviderId | null,
): ModelAliasMatch | null {
  const input = rawModelId.trim();
  if (!input) return null;
  const rawNormalized = normalizeAlias(input);
  const stripped = withoutProviderPrefix(input, providerHint);

  for (const model of MODELS as readonly ModelInfo[]) {
    const aliases = candidateAliases(model);
    if (aliases.includes(input)) {
      return {
        input,
        modelId: model.id as ModelId,
        provider: model.provider,
        runtimeModelId: model.runtimeModelId ?? model.id,
        contextLimit: getModelContextLimit(model.id),
        providerOptions: model.providerOptions,
        confidence: "exact",
      };
    }

    const normalizedAliases = aliases.map(normalizeAlias);
    if (normalizedAliases.includes(rawNormalized)) {
      return {
        input,
        modelId: model.id as ModelId,
        provider: model.provider,
        runtimeModelId: model.runtimeModelId ?? model.id,
        contextLimit: getModelContextLimit(model.id),
        providerOptions: model.providerOptions,
        confidence: "alias",
      };
    }

    if (
      providerHint &&
      model.provider === providerHint &&
      normalizedAliases.includes(stripped)
    ) {
      return {
        input,
        modelId: model.id as ModelId,
        provider: model.provider,
        runtimeModelId: model.runtimeModelId ?? model.id,
        contextLimit: getModelContextLimit(model.id),
        providerOptions: model.providerOptions,
        confidence: "provider-prefix",
      };
    }
  }

  return null;
}
