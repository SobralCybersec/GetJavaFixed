import {
  LMSTUDIO_DEFAULT_BASE_URL,
  MLX_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_BASE_URL,
  getModel,
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
        runtimeModelId: model.id,
        lmstudioBaseURL: local.lmstudioBaseURL,
        mlxBaseURL: local.mlxBaseURL,
        ollamaBaseURL: local.ollamaBaseURL,
        openaiCompatibleBaseURL: local.openaiCompatibleBaseURL,
      };
  }
}
