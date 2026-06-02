import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  MODELS,
  PROVIDERS,
  getAutocompleteEligibleModels,
  getModel,
  getProvider,
  providerNeedsKey,
  providerSupportsKey,
  type ModelId,
  type ProviderId,
  type ProviderInfo,
} from "@/modules/ai/config";
import { clearKey, getAllKeys, setKey } from "@/modules/ai/lib/keyring";
import {
  native,
  normalizeOpenAiCompatibleBaseUrl,
  normalizeOpenAiCompatibleModelsBaseUrl,
  type ProxyExampleInfo,
  type ProxyExampleModel,
} from "@/modules/ai/lib/native";
import {
  clearRefactorToolKey,
  getRefactorToolKey,
  setRefactorToolKey,
} from "@/modules/ai/lib/toolKeyring";
import { useChatStore } from "@/modules/ai/store/chatStore";
import { revealInFinder } from "@/modules/explorer/lib/contextActions";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  emitKeysChanged,
  setContext7Url,
  setDeepsproxyPath,
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setDefaultModel,
  setKimiproxyPath,
  setLmstudioBaseURL,
  setLmstudioModelId,
  setMlxBaseURL,
  setMlxModelId,
  setOllamaBaseURL,
  setOllamaModelId,
  setOpenaiCompatibleBaseURL,
  setOpenaiCompatibleContextLimit,
  setOpenaiCompatibleModelId,
  setOpenrouterModelId,
  setProxyPresetId,
  setRefactorCustomInstructions,
  setRefactorMcpEnabled,
} from "@/modules/settings/store";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useMemo, useState } from "react";
import { ProviderIcon } from "../components/ProviderIcon";
import { ProviderKeyCard } from "../components/ProviderKeyCard";
import { SectionHeader } from "../components/SectionHeader";

type KeysMap = Record<ProviderId, string | null>;

const isLocalProvider = (id: ProviderId): boolean => !providerNeedsKey(id);

type LocalMeta = {
  urlPlaceholder: string;
  modelPlaceholder: string;
  description: string;
  modelHint: React.ReactNode;
};

const LOCAL_META: Partial<Record<ProviderId, LocalMeta>> = {
  lmstudio: {
    urlPlaceholder: "http://localhost:1234/v1",
    modelPlaceholder: "qwen2.5-coder-7b-instruct",
    description:
      "Run GGUF models via LM Studio's HTTP server (Developer tab → enable).",
    modelHint: (
      <>
        The model id loaded in LM Studio — see the server's{" "}
        <span className="font-mono">/v1/models</span> page.
      </>
    ),
  },
  mlx: {
    urlPlaceholder: "http://127.0.0.1:8080/v1",
    modelPlaceholder: "mlx-community/Qwen2.5-Coder-7B-Instruct-4bit",
    description:
      "Apple-silicon inference via mlx_lm.server (pip install mlx-lm).",
    modelHint: (
      <>The Hugging Face repo path you launched mlx_lm.server with.</>
    ),
  },
  ollama: {
    urlPlaceholder: "http://localhost:11434/v1",
    modelPlaceholder: "qwen2.5-coder:7b",
    description: "Local models via Ollama's built-in OpenAI-compatible API.",
    modelHint: <>The model name from `ollama list` / `ollama pull`.</>,
  },
  "openai-compatible": {
    urlPlaceholder: "https://api.example.com/v1",
    modelPlaceholder: "gpt-4o, qwen3-max, glm-4.6, …",
    description: "Any OpenAI-compatible endpoint — vLLM, Z.AI, Fireworks, etc.",
    modelHint: null,
  },
  openrouter: {
    urlPlaceholder: "",
    modelPlaceholder: "anthropic/claude-sonnet-4-6, openai/gpt-5.5, …",
    description: "Any model on OpenRouter — type its full provider/model id.",
    modelHint: (
      <>
        Browse ids at{" "}
        <span className="font-mono">openrouter.ai/models</span>.
      </>
    ),
  },
};

export function ModelsSection() {
  const [keys, setKeys] = useState<KeysMap | null>(null);
  const [adding, setAdding] = useState<Set<ProviderId>>(new Set());
  const [exaKey, setExaKey] = useState<string | null>(null);
  const [context7Key, setContext7Key] = useState<string | null>(null);

  const defaultModel = usePreferencesStore((s) => s.defaultModelId);
  const lmstudioBaseURL = usePreferencesStore((s) => s.lmstudioBaseURL);
  const lmstudioModelId = usePreferencesStore((s) => s.lmstudioModelId);
  const mlxBaseURL = usePreferencesStore((s) => s.mlxBaseURL);
  const mlxModelId = usePreferencesStore((s) => s.mlxModelId);
  const ollamaBaseURL = usePreferencesStore((s) => s.ollamaBaseURL);
  const ollamaModelId = usePreferencesStore((s) => s.ollamaModelId);
  const compatBaseURL = usePreferencesStore((s) => s.openaiCompatibleBaseURL);
  const compatModelId = usePreferencesStore((s) => s.openaiCompatibleModelId);
  const compatContextLimit = usePreferencesStore(
    (s) => s.openaiCompatibleContextLimit,
  );
  const openrouterModelId = usePreferencesStore((s) => s.openrouterModelId);
  const context7Url = usePreferencesStore((s) => s.context7Url);
  const refactorMcpEnabled = usePreferencesStore((s) => s.refactorMcpEnabled);
  const refactorCustomInstructions = usePreferencesStore(
    (s) => s.refactorCustomInstructions,
  );
  const proxyPresetId = usePreferencesStore((s) => s.proxyPresetId);
  const deepsproxyPath = usePreferencesStore((s) => s.deepsproxyPath);
  const kimiproxyPath = usePreferencesStore((s) => s.kimiproxyPath);
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);

  useEffect(() => {
    void getAllKeys().then(setKeys);
    void Promise.all([getRefactorToolKey("exa"), getRefactorToolKey("context7")]).then(
      ([exa, context7]) => {
        setExaKey(exa);
        setContext7Key(context7);
      },
    );
  }, []);

  const onSaveKey = async (provider: ProviderId, value: string) => {
    await setKey(provider, value);
    setKeys((prev) => (prev ? { ...prev, [provider]: value } : prev));
    await emitKeysChanged();
  };

  const onClearKey = async (provider: ProviderId) => {
    await clearKey(provider);
    setKeys((prev) => (prev ? { ...prev, [provider]: null } : prev));
    await emitKeysChanged();
  };

  const localConfig = (id: ProviderId): LocalConfig | null => {
    switch (id) {
      case "lmstudio":
        return {
          baseURL: lmstudioBaseURL,
          modelId: lmstudioModelId,
          setBaseURL: setLmstudioBaseURL,
          setModelId: setLmstudioModelId,
        };
      case "mlx":
        return {
          baseURL: mlxBaseURL,
          modelId: mlxModelId,
          setBaseURL: setMlxBaseURL,
          setModelId: setMlxModelId,
        };
      case "ollama":
        return {
          baseURL: ollamaBaseURL,
          modelId: ollamaModelId,
          setBaseURL: setOllamaBaseURL,
          setModelId: setOllamaModelId,
        };
      case "openai-compatible":
        return {
          baseURL: compatBaseURL,
          modelId: compatModelId,
          setBaseURL: setOpenaiCompatibleBaseURL,
          setModelId: setOpenaiCompatibleModelId,
          contextLimit: compatContextLimit,
          setContextLimit: setOpenaiCompatibleContextLimit,
        };
      case "openrouter":
        return {
          baseURL: "",
          modelId: openrouterModelId,
          setBaseURL: async () => {},
          setModelId: setOpenrouterModelId,
          noBaseURL: true,
        };
      default:
        return null;
    }
  };

  const isConfigured = (id: ProviderId): boolean => {
    if (id === "openrouter")
      return !!keys?.[id] && !!openrouterModelId.trim();
    if (!isLocalProvider(id)) return !!keys?.[id];
    const cfg = localConfig(id);
    if (!cfg) return false;
    if (id === "openai-compatible")
      return !!cfg.baseURL.trim() && !!cfg.modelId.trim();
    return !!cfg.modelId.trim();
  };

  if (!keys) {
    return <div className="text-[12px] text-muted-foreground">Loading…</div>;
  }

  const configuredIds = new Set(
    PROVIDERS.filter((p) => isConfigured(p.id)).map((p) => p.id),
  );
  const visibleIds = new Set<ProviderId>(configuredIds);
  for (const id of adding) visibleIds.add(id);
  const visibleProviders = PROVIDERS.filter((p) => visibleIds.has(p.id));
  const addableProviders = PROVIDERS.filter((p) => !visibleIds.has(p.id));

  const removeProvider = (id: ProviderId) => {
    if (id === "openrouter") {
      void setOpenrouterModelId("");
      void onClearKey(id);
    } else if (isLocalProvider(id)) {
      const cfg = localConfig(id);
      if (cfg) {
        void cfg.setModelId("");
        if (id === "openai-compatible") void cfg.setBaseURL("");
      }
      if (id === "openai-compatible") void onClearKey(id);
    } else {
      void onClearKey(id);
    }
    setAdding((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const addProvider = (id: ProviderId) => {
    setAdding((prev) => new Set(prev).add(id));
  };

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title="Models"
        description="Connect the providers you use. Keys live in your OS keychain and are used only by JavaRf."
      />

      <DefaultsBlock
        defaultModel={defaultModel}
        configuredIds={configuredIds}
        keys={keys}
      />

      <RefactorToolsBlock
        exaKey={exaKey}
        context7Key={context7Key}
        context7Url={context7Url}
        refactorMcpEnabled={refactorMcpEnabled}
        onSaveExaKey={async (value) => {
          await setRefactorToolKey("exa", value);
          setExaKey(value);
        }}
        onClearExaKey={async () => {
          await clearRefactorToolKey("exa");
          setExaKey(null);
        }}
        onSaveContext7Key={async (value) => {
          await setRefactorToolKey("context7", value);
          setContext7Key(value);
        }}
        onClearContext7Key={async () => {
          await clearRefactorToolKey("context7");
          setContext7Key(null);
        }}
      />

      <RefactorPromptControlBlock value={refactorCustomInstructions} />

      <ProxyExamplesBlock
        selectedProxyId={proxyPresetId}
        compatBaseURL={compatBaseURL}
        compatModelId={compatModelId}
        compatKey={keys["openai-compatible"]}
        deepsproxyPath={deepsproxyPath}
        kimiproxyPath={kimiproxyPath}
        onSelectProxy={async (proxy) => {
          await setProxyPresetId(proxy.id);
          const normalizedBaseUrl = normalizeOpenAiCompatibleModelsBaseUrl(
            proxy.defaultBaseUrl,
          );
          await setOpenaiCompatibleBaseURL(normalizedBaseUrl);
          await setDefaultModel("openai-compatible-custom");
          setSelectedModelId("openai-compatible-custom");
          const models = await native.proxyexampleModels(
            normalizedBaseUrl,
            keys["openai-compatible"] ?? null,
          ).catch(
            () => [] as ProxyExampleModel[],
          );
          const defaultModel = models[0]?.id ?? "";
          if (defaultModel) {
            await setOpenaiCompatibleModelId(defaultModel);
          }
        }}
        onSelectModel={async (modelId) => {
          await setOpenaiCompatibleModelId(modelId);
          await setDefaultModel("openai-compatible-custom");
          setSelectedModelId("openai-compatible-custom");
        }}
        onSaveProxyPath={async (proxyId, path) => {
          if (proxyId === "deepsproxy") await setDeepsproxyPath(path);
          if (proxyId === "kimiproxy") await setKimiproxyPath(path);
        }}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Providers</Label>
          <AddProviderMenu
            providers={addableProviders}
            onAdd={addProvider}
          />
        </div>

        {visibleProviders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 px-4 py-8 text-center">
            <p className="text-[12px] text-muted-foreground">
              No providers connected yet.
            </p>
            <p className="mt-0.5 text-[10.5px] text-muted-foreground/70">
              Click “Add provider” to connect a cloud or local model source.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleProviders.map((p) =>
              isLocalProvider(p.id) || p.id === "openrouter" ? (
                <LocalProviderCard
                  key={p.id}
                  provider={p}
                  configured={configuredIds.has(p.id)}
                  config={localConfig(p.id)!}
                  meta={LOCAL_META[p.id]!}
                  compatKey={
                    p.id === "openai-compatible" || p.id === "openrouter"
                      ? keys[p.id]
                      : undefined
                  }
                  onSaveKey={(v) => onSaveKey(p.id, v)}
                  onClearKey={() => onClearKey(p.id)}
                  onRemove={() => removeProvider(p.id)}
                />
              ) : (
                <ProviderKeyCard
                  key={p.id}
                  provider={p}
                  currentKey={keys[p.id]}
                  onSave={(v) => onSaveKey(p.id, v)}
                  onClear={() => onClearKey(p.id)}
                  onRemove={() => removeProvider(p.id)}
                />
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type LocalConfig = {
  baseURL: string;
  modelId: string;
  setBaseURL: (v: string) => Promise<void>;
  setModelId: (v: string) => Promise<void>;
  contextLimit?: number;
  setContextLimit?: (v: number) => Promise<void>;
  noBaseURL?: boolean;
};

function AddProviderMenu({
  providers,
  onAdd,
}: {
  providers: readonly ProviderInfo[];
  onAdd: (id: ProviderId) => void;
}) {
  const cloud = providers.filter((p) => !isLocalProvider(p.id));
  const local = providers.filter((p) => isLocalProvider(p.id));
  const disabled = providers.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className="h-7 gap-1.5 px-2.5 text-[11px]"
        >
          <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} />
          Add provider
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-55 p-1">
        {cloud.length > 0 ? (
          <>
            <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
              Cloud
            </DropdownMenuLabel>
            {cloud.map((p) => (
              <ProviderMenuItem key={p.id} provider={p} onAdd={onAdd} />
            ))}
          </>
        ) : null}
        {local.length > 0 ? (
          <>
            <DropdownMenuLabel className="px-2 text-[10px] tracking-wide text-muted-foreground uppercase">
              Local & custom
            </DropdownMenuLabel>
            {local.map((p) => (
              <ProviderMenuItem key={p.id} provider={p} onAdd={onAdd} />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProviderMenuItem({
  provider,
  onAdd,
}: {
  provider: ProviderInfo;
  onAdd: (id: ProviderId) => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={() => onAdd(provider.id)}
      className="flex items-center gap-2 text-[12px]"
    >
      <ProviderIcon provider={provider.id} size={13} />
      <span>{provider.label}</span>
    </DropdownMenuItem>
  );
}

function DefaultsBlock({
  defaultModel,
  configuredIds,
  keys,
}: {
  defaultModel: ModelId;
  configuredIds: Set<ProviderId>;
  keys: KeysMap;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Defaults</Label>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
        <FieldRow label="Chat model">
          <DefaultModelPicker
            defaultModel={defaultModel}
            configuredIds={configuredIds}
          />
        </FieldRow>
        <AutocompleteRow keys={keys} configuredIds={configuredIds} />
      </div>
    </div>
  );
}

function RefactorToolsBlock({
  exaKey,
  context7Key,
  context7Url,
  refactorMcpEnabled,
  onSaveExaKey,
  onClearExaKey,
  onSaveContext7Key,
  onClearContext7Key,
}: {
  exaKey: string | null;
  context7Key: string | null;
  context7Url: string;
  refactorMcpEnabled: boolean;
  onSaveExaKey: (value: string) => Promise<void>;
  onClearExaKey: () => Promise<void>;
  onSaveContext7Key: (value: string) => Promise<void>;
  onClearContext7Key: () => Promise<void>;
}) {
  const [exaDraft, setExaDraft] = useState("");
  const [context7Draft, setContext7Draft] = useState("");
  const [context7UrlDraft, setContext7UrlDraft] = useState(context7Url);

  useEffect(() => {
    setContext7UrlDraft(context7Url);
  }, [context7Url]);

  return (
    <div className="flex flex-col gap-3">
      <Label>Refactor research</Label>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
        <FieldRow label="MCPs">
          <div className="flex flex-1 items-center gap-2">
            <Switch
              checked={refactorMcpEnabled}
              onCheckedChange={(value) => void setRefactorMcpEnabled(value)}
            />
            <span className="text-[11px] text-muted-foreground">
              Enable Exa + Context7 during AI refactor preview generation
            </span>
          </div>
        </FieldRow>
        <KeyRow
          label="Exa key"
          currentKey={exaKey}
          draft={exaDraft}
          onDraftChange={setExaDraft}
          placeholder="Optional for higher Exa MCP limits"
          onSave={async () => {
            const value = exaDraft.trim();
            if (!value) return;
            await onSaveExaKey(value);
            setExaDraft("");
          }}
          onClear={onClearExaKey}
        />
        <FieldRow label="Context7">
          <Input
            value={context7UrlDraft}
            onChange={(e) => setContext7UrlDraft(e.target.value)}
            onBlur={() => void setContext7Url(context7UrlDraft)}
            placeholder="https://mcp.context7.com/mcp"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-[11.5px]"
          />
        </FieldRow>
        <KeyRow
          label="Ctx7 key"
          currentKey={context7Key}
          draft={context7Draft}
          onDraftChange={setContext7Draft}
          placeholder="Optional for authenticated Context7 access"
          onSave={async () => {
            const value = context7Draft.trim();
            if (!value) return;
            await onSaveContext7Key(value);
            setContext7Draft("");
          }}
          onClear={onClearContext7Key}
        />
      </div>
    </div>
  );
}

function RefactorPromptControlBlock({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const openRefactorPromptFolder = async () => {
    const path = await native.canonicalize("src/modules/ai/refactoring-db");
    await revealInFinder(path);
  };

  const openRefactorPromptBuilder = async () => {
    const path = await native.canonicalize(
      "src/modules/findings/lib/useRefactorGeneration.ts",
    );
    await revealInFinder(path);
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>Refactor prompt control</Label>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          This applies only to AI refactor previews. Precedence: built-in
          refactor system prompt, matched rule docs, your refactor instructions,
          then the finding or file context.
        </p>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="e.g. Prefer guard clauses over nested branches. Favor tiny helper extraction over new abstractions. Keep changes under 30 lines when possible."
          className="min-h-[120px] resize-y border border-border bg-card/50 font-sans text-[12px] leading-relaxed"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => void setRefactorCustomInstructions(draft)}
            className="h-8 px-3 text-[11px]"
          >
            Save refactor instructions
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void openRefactorPromptFolder()}
            className="h-8 px-3 text-[11px]"
          >
            Open rule folder
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void openRefactorPromptBuilder()}
            className="h-8 px-3 text-[11px]"
          >
            Open prompt builder
          </Button>
        </div>
      </div>
    </div>
  );
}

function KeyRow({
  label,
  currentKey,
  draft,
  onDraftChange,
  placeholder,
  onSave,
  onClear,
}: {
  label: string;
  currentKey: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  placeholder: string;
  onSave: () => Promise<void>;
  onClear: () => Promise<void>;
}) {
  return (
    <FieldRow label={label}>
      {currentKey ? (
        <div className="flex flex-1 items-center gap-1.5">
          <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {`${currentKey.slice(0, 4)}${"•".repeat(8)}${currentKey.slice(-4)}`}
          </code>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => void onClear()}
            title="Remove key"
            className="size-7 text-muted-foreground hover:text-destructive"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
          </Button>
        </div>
      ) : (
        <div className="flex flex-1 gap-1.5">
          <Input
            type="password"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={placeholder}
            spellCheck={false}
            className="h-8 flex-1 font-mono text-[11.5px]"
          />
          <Button
            size="sm"
            onClick={() => void onSave()}
            disabled={!draft.trim()}
            className="h-8 px-3 text-[11px]"
          >
            Save
          </Button>
        </div>
      )}
    </FieldRow>
  );
}

function DefaultModelPicker({
  defaultModel,
  configuredIds,
}: {
  defaultModel: ModelId;
  configuredIds: Set<ProviderId>;
}) {
  const m = getModel(defaultModel);
  const hasAny = configuredIds.size > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={!hasAny}
          className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
        >
          <span className="flex items-center gap-2 truncate">
            <ProviderIcon provider={m.provider} size={13} />
            <span className="truncate">{m.label}</span>
            <span className="text-muted-foreground">· {m.hint}</span>
          </span>
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={11}
            strokeWidth={2}
            className="opacity-70"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        collisionPadding={12}
        className="min-w-70 p-1"
      >
        <div className="max-h-72 overflow-y-auto overscroll-contain pr-1">
          {PROVIDERS.filter((p) => configuredIds.has(p.id)).map((p) => {
            const models = MODELS.filter((x) => x.provider === p.id);
            if (models.length === 0) return null;
            return (
              <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  <ProviderIcon provider={p.id} size={11} />
                  <span>{p.label}</span>
                </div>
                {models.map((mod) => (
                  <DropdownMenuItem
                    key={mod.id}
                    onSelect={() => void setDefaultModel(mod.id as ModelId)}
                    className={cn(
                      "flex items-start gap-2 text-[12px]",
                      mod.id === defaultModel && "bg-accent/50",
                    )}
                  >
                    <span className="flex flex-1 flex-col">
                      <span>{mod.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {mod.description}
                      </span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AutocompleteRow({
  keys,
  configuredIds,
}: {
  keys: KeysMap;
  configuredIds: Set<ProviderId>;
}) {
  const enabled = usePreferencesStore((s) => s.autocompleteEnabled);
  const provider = usePreferencesStore((s) => s.autocompleteProvider);
  const modelId = usePreferencesStore((s) => s.autocompleteModelId);
  const eligible = useMemo(() => getAutocompleteEligibleModels(), []);

  const items = useMemo(() => {
    const local = PROVIDERS.filter(
      (p) => isLocalProvider(p.id) && configuredIds.has(p.id),
    ).flatMap((p) => {
      const m = MODELS.find((x) => x.provider === p.id);
      return m ? [m] : [];
    });
    return [...eligible, ...local];
  }, [eligible, configuredIds]);

  const currentModel = useMemo(() => {
    if (isLocalProvider(provider)) {
      return MODELS.find((m) => m.provider === provider) ?? eligible[0];
    }
    return (
      MODELS.find((m) => m.provider === provider && m.id === modelId) ??
      MODELS.find((m) => m.id === modelId) ??
      eligible[0]
    );
  }, [eligible, provider, modelId]);

  const setModel = (id: string, providerId: ProviderId) => {
    void setAutocompleteProvider(providerId);
    void setAutocompleteModelId(isLocalProvider(providerId) ? "" : id);
  };

  const grouped = useMemo(() => {
    const map = new Map<ProviderId, (typeof items)[number][]>();
    for (const m of items) {
      const arr = map.get(m.provider) ?? [];
      arr.push(m);
      map.set(m.provider, arr);
    }
    return map;
  }, [items]);

  const hasKey = providerNeedsKey(provider) ? !!keys[provider] : true;

  return (
    <>
      <FieldRow label="Autocomplete">
        <div className="flex flex-1 items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={(v) => void setAutocompleteEnabled(v)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={!enabled}
                className="h-8 flex-1 justify-between gap-2 px-2.5 text-[11.5px]"
              >
                <span className="flex items-center gap-2 truncate">
                  <ProviderIcon provider={currentModel.provider} size={12} />
                  <span className="truncate">{currentModel.label}</span>
                  <span className="text-muted-foreground">
                    · {currentModel.hint}
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={11}
                  strokeWidth={2}
                  className="opacity-70"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              collisionPadding={12}
              className="max-h-72 min-w-70 overflow-y-auto"
            >
              {PROVIDERS.map((p) => {
                const list = grouped.get(p.id);
                if (!list || list.length === 0) return null;
                const pConfigured = configuredIds.has(p.id);
                return (
                  <div key={p.id} className="px-1 pt-1.5 first:pt-1">
                    <div className="mb-0.5 flex items-center gap-1.5 px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                      <ProviderIcon provider={p.id} size={11} />
                      <span>{p.label}</span>
                      {!pConfigured ? (
                        <span className="ml-auto text-[9.5px] normal-case tracking-normal text-muted-foreground/70">
                          not connected
                        </span>
                      ) : null}
                    </div>
                    {list.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        disabled={!pConfigured}
                        onSelect={() => pConfigured && setModel(m.id, p.id)}
                        className={cn(
                          "text-[11.5px]",
                          m.id === modelId && "bg-accent/50",
                        )}
                      >
                        <span className="flex flex-col">
                          <span>{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {m.description}
                          </span>
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldRow>
      {enabled && !hasKey ? (
        <p className="pl-19 text-[10.5px] text-muted-foreground">
          {getProvider(provider).label} isn't connected — add it below.
        </p>
      ) : null}
    </>
  );
}

function LocalProviderCard({
  provider,
  configured,
  config,
  meta,
  compatKey,
  onSaveKey,
  onClearKey,
  onRemove,
}: {
  provider: ProviderInfo;
  configured: boolean;
  config: LocalConfig;
  meta: LocalMeta;
  compatKey?: string | null;
  onSaveKey: (v: string) => Promise<void>;
  onClearKey: () => Promise<void>;
  onRemove: () => void;
}) {
  const {
    baseURL,
    modelId,
    setBaseURL,
    setModelId,
    contextLimit,
    setContextLimit,
    noBaseURL,
  } = config;
  const [urlDraft, setUrlDraft] = useState(baseURL);
  const [modelDraft, setModelDraft] = useState(modelId);
  const [contextDraft, setContextDraft] = useState(String(contextLimit ?? ""));
  const [keyDraft, setKeyDraft] = useState("");
  const [availableModels, setAvailableModels] = useState<ProxyExampleModel[]>([]);
  const [modelsBusy, setModelsBusy] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<
    "idle" | "testing" | "ok" | "fail"
  >("idle");
  const setSelectedModelId = useChatStore((s) => s.setSelectedModelId);

  useEffect(() => setUrlDraft(baseURL), [baseURL]);
  useEffect(() => setModelDraft(modelId), [modelId]);
  useEffect(() => setContextDraft(String(contextLimit ?? "")), [contextLimit]);

  const supportsKey = providerSupportsKey(provider.id);
  const supportsModelDiscovery =
    provider.id === "openai-compatible" ||
    provider.id === "lmstudio" ||
    provider.id === "mlx" ||
    provider.id === "ollama";

  const activateProviderModel = async () => {
    const selectedByProvider: Partial<Record<ProviderId, ModelId>> = {
      "openai-compatible": "openai-compatible-custom",
      lmstudio: "lmstudio-local",
      mlx: "mlx-local",
      ollama: "ollama-local",
      openrouter: "openrouter-custom",
    };
    const next = selectedByProvider[provider.id];
    if (!next) return;
    await setDefaultModel(next);
    setSelectedModelId(next);
  };

  const test = async () => {
    setTestStatus("testing");
    try {
      const status = await invoke<number>("lm_ping", { baseUrl: urlDraft });
      setTestStatus(status > 0 ? "ok" : "fail");
    } catch {
      setTestStatus("fail");
    }
  };

  const refreshModels = async () => {
    if (!supportsModelDiscovery || !urlDraft.trim()) return;
    setModelsBusy(true);
    setModelsError(null);
    try {
      const loaded = await native.proxyexampleModels(
        normalizeOpenAiCompatibleBaseUrl(urlDraft),
        compatKey ?? null,
      );
      setAvailableModels(loaded);
      if (!modelDraft.trim() && loaded[0]?.id) {
        const next = loaded[0].id;
        setModelDraft(next);
        await setModelId(next);
      }
    } catch (error) {
      setAvailableModels([]);
      setModelsError(error instanceof Error ? error.message : String(error));
    } finally {
      setModelsBusy(false);
    }
  };

  useEffect(() => {
    setAvailableModels([]);
    setModelsError(null);
  }, [provider.id, baseURL, compatKey]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ProviderIcon provider={provider.id} size={15} />
        <span className="text-[12.5px] font-medium">{provider.label}</span>
        {configured ? (
          <Badge
            variant="outline"
            className="ml-1 h-4 gap-1 border-border/60 bg-muted/40 px-1.5 text-[10px] font-normal text-muted-foreground"
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={9} strokeWidth={2} />
            Connected
          </Badge>
        ) : null}
        <button
          type="button"
          onClick={() => void openUrl(provider.consoleUrl)}
          className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          Docs
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={11} strokeWidth={1.75} />
        </button>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          title="Remove provider"
          className="size-7 text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
        </Button>
      </div>

      <span className="text-[10.5px] leading-relaxed text-muted-foreground">
        {meta.description}
      </span>

      <div className="mt-0.5 flex flex-col gap-2.5">
        {noBaseURL ? null : (
          <FieldRow label="Base URL">
            <div className="flex flex-1 gap-1.5">
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => {
                  const v = normalizeOpenAiCompatibleBaseUrl(urlDraft);
                  if (v !== baseURL) void setBaseURL(v);
                }}
                placeholder={meta.urlPlaceholder}
                spellCheck={false}
                className="h-8 flex-1 font-mono text-[11.5px]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => void test()}
                disabled={!urlDraft.trim()}
                className="h-8 px-3 text-[11px]"
              >
                Test
              </Button>
              {supportsModelDiscovery ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshModels()}
                  disabled={!urlDraft.trim() || modelsBusy}
                  className="h-8 px-3 text-[11px]"
                >
                  {modelsBusy ? "Loading…" : "Load models"}
                </Button>
              ) : null}
            </div>
          </FieldRow>
        )}

        <FieldRow label="Model ID">
          <Input
            value={modelDraft}
            onChange={(e) => setModelDraft(e.target.value)}
            onBlur={() => {
              const v = modelDraft.trim();
              if (v !== modelId) void setModelId(v);
            }}
            placeholder={meta.modelPlaceholder}
            spellCheck={false}
            className="h-8 font-mono text-[11.5px]"
          />
        </FieldRow>

        {setContextLimit ? (
          <FieldRow label="Context">
            <div className="flex flex-1 items-center gap-1.5">
              <Input
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                onBlur={() => {
                  const v = parseInt(contextDraft);
                  if (Number.isFinite(v) && v >= 1000) void setContextLimit(v);
                  else setContextDraft(String(contextLimit ?? ""));
                }}
                placeholder="128000"
                spellCheck={false}
                className="h-8 w-28 font-mono text-[11.5px]"
              />
              <span className="text-[10.5px] text-muted-foreground">tokens</span>
            </div>
          </FieldRow>
        ) : null}

        {supportsKey ? (
          <FieldRow label="API key">
            {compatKey ? (
              <div className="flex flex-1 items-center gap-1.5">
                <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {`${compatKey.slice(0, 4)}${"•".repeat(8)}${compatKey.slice(-4)}`}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => void onClearKey()}
                  title="Remove key"
                  className="size-7 text-muted-foreground hover:text-destructive"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.75} />
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 gap-1.5">
                <Input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  placeholder="Optional — leave empty for unauthenticated endpoints"
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    const v = keyDraft.trim();
                    if (!v) return;
                    await onSaveKey(v);
                    setKeyDraft("");
                  }}
                  disabled={!keyDraft.trim()}
                  className="h-8 px-3 text-[11px]"
                >
                  Save
                </Button>
              </div>
            )}
          </FieldRow>
        ) : null}

        <StatusLine status={testStatus} />

        {supportsModelDiscovery ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {availableModels.length > 0 ? (
                availableModels.map((availableModel) => (
                  <Button
                    key={availableModel.id}
                    size="sm"
                    variant={modelDraft === availableModel.id ? "secondary" : "outline"}
                    className="h-7 px-2 font-mono text-[10.5px]"
                    onClick={async () => {
                      setModelDraft(availableModel.id);
                      await setModelId(availableModel.id);
                      await activateProviderModel();
                    }}
                  >
                    {availableModel.id}
                  </Button>
                ))
              ) : (
                <span className="text-[10.5px] text-muted-foreground">
                  {modelsError
                    ? `Model discovery failed: ${modelsError}`
                    : "Load models from this endpoint to pick one directly."}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {!modelId.trim() && meta.modelHint ? (
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            {meta.modelHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProxyExamplesBlock({
  selectedProxyId,
  compatBaseURL,
  compatModelId,
  compatKey,
  deepsproxyPath,
  kimiproxyPath,
  onSelectProxy,
  onSelectModel,
  onSaveProxyPath,
}: {
  selectedProxyId: string | null;
  compatBaseURL: string;
  compatModelId: string;
  compatKey?: string | null;
  deepsproxyPath: string;
  kimiproxyPath: string;
  onSelectProxy: (proxy: ProxyExampleInfo) => Promise<void>;
  onSelectModel: (modelId: string) => Promise<void>;
  onSaveProxyPath: (proxyId: string, path: string) => Promise<void>;
}) {
  const [proxies, setProxies] = useState<Record<string, ProxyExampleInfo>>({});
  const [health, setHealth] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, ProxyExampleModel[]>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const configuredPaths: Record<string, string> = {
    deepsproxy: deepsproxyPath,
    kimiproxy: kimiproxyPath,
  };

  const refreshProxy = async (proxyId: string) => {
    const info = await native.proxyexampleDetectAtPath(
      proxyId,
      configuredPaths[proxyId] || null,
    );
    setProxies((prev) => ({ ...prev, [proxyId]: info }));
    const status = await native
      .proxyexampleHealth(info.defaultBaseUrl)
      .then((result) => `${result.ok ? "Healthy" : "Unhealthy"} (${result.status})`)
      .catch(() => "Offline");
    setHealth((prev) => ({ ...prev, [proxyId]: status }));
    const normalizedBaseUrl = normalizeOpenAiCompatibleModelsBaseUrl(
      info.defaultBaseUrl,
    );
    const availableModels = await native
      .proxyexampleModels(normalizedBaseUrl, compatKey ?? null)
      .catch(() => [] as ProxyExampleModel[]);
    setModels((prev) => ({ ...prev, [proxyId]: availableModels }));
  };

  useEffect(() => {
    void Promise.all(["deepsproxy", "kimiproxy"].map(refreshProxy));
  }, [compatKey, deepsproxyPath, kimiproxyPath]);

  return (
    <div className="flex flex-col gap-3">
      <Label>Proxyexamples</Label>
      <div className="grid gap-3 lg:grid-cols-2">
        {["deepsproxy", "kimiproxy"].map((proxyId) => {
          const info = proxies[proxyId];
          const availableModels = models[proxyId] ?? [];
          const isSelected = selectedProxyId === proxyId;
          const configuredPath = configuredPaths[proxyId] ?? "";
          return (
            <div
              key={proxyId}
              className={cn(
                "flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3",
                isSelected && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-medium">
                  {info?.displayName ?? proxyId}
                </span>
                {isSelected ? <Badge variant="secondary">Selected</Badge> : null}
                <Badge variant="outline" className="ml-auto">
                  {health[proxyId] ?? "Checking…"}
                </Badge>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                {configuredPath.trim()
                  ? info?.path ?? "Configured path not found"
                  : "No folder configured"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    const selected = await open({
                      directory: true,
                      multiple: false,
                      title: `Choose ${info?.displayName ?? proxyId} folder`,
                    });
                    if (typeof selected !== "string") return;
                    await onSaveProxyPath(proxyId, selected);
                  }}
                  className="h-8 px-3 text-[11px]"
                >
                  Choose Folder
                </Button>
                {configuredPath.trim() ? (
                  <code className="min-w-0 flex-1 truncate rounded bg-muted/40 px-2 py-1 text-[10.5px]">
                    {configuredPath}
                  </code>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void refreshProxy(proxyId)}
                  className="h-8 px-3 text-[11px]"
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    setBusyId(`${proxyId}:start`);
                    try {
                      await native.proxyexampleStart(proxyId, configuredPath);
                      await refreshProxy(proxyId);
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={!info?.detected || !info?.hasStartScript || !configuredPath.trim() || busyId !== null}
                  className="h-8 px-3 text-[11px]"
                >
                  Start
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setBusyId(`${proxyId}:login`);
                    try {
                      await native.proxyexampleLogin(
                        proxyId,
                        configuredPath,
                        info?.loginVariants[0] ?? null,
                      );
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  disabled={!info?.detected || !info?.hasLoginScript || !configuredPath.trim() || busyId !== null}
                  className="h-8 px-3 text-[11px]"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  variant={isSelected ? "secondary" : "outline"}
                  onClick={() => void (info ? onSelectProxy(info) : Promise.resolve())}
                  disabled={!info?.detected}
                  className="h-8 px-3 text-[11px]"
                >
                  Use preset
                </Button>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10.5px] text-muted-foreground">
                  Base URL: <span className="font-mono">{normalizeOpenAiCompatibleModelsBaseUrl(info?.defaultBaseUrl ?? compatBaseURL)}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableModels.length > 0 ? (
                    availableModels.map((model) => (
                      <Button
                        key={model.id}
                        size="sm"
                        variant={compatModelId === model.id && isSelected ? "secondary" : "outline"}
                        className="h-7 px-2 font-mono text-[10.5px]"
                        onClick={() => void onSelectModel(model.id)}
                      >
                        {model.id}
                      </Button>
                    ))
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground">
                      No models loaded yet.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[11px] tracking-tight text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function StatusLine({
  status,
}: {
  status: "idle" | "testing" | "ok" | "fail";
}) {
  if (status === "idle") return null;
  if (status === "testing") {
    return (
      <span className="text-[10.5px] text-muted-foreground">Testing…</span>
    );
  }
  if (status === "ok") {
    return (
      <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={11} strokeWidth={2} />
        Reachable — server responded.
      </span>
    );
  }
  return (
    <span className="text-[10.5px] text-destructive/80">
      Could not reach the server.
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}
