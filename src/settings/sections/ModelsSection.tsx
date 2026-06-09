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
import { useI18n } from "@/modules/i18n";
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
  type ProxyExampleModel,
  type ProxyExampleStatus,
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
  setAutocompleteEnabled,
  setAutocompleteModelId,
  setAutocompleteProvider,
  setDefaultModel,
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
  setProxyPresetPath,
  setRefactorCustomInstructions,
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
import { toast } from "sonner";
import { ProviderIcon } from "../components/ProviderIcon";
import { McpToolsBlock } from "../components/McpToolsBlock";
import { ProviderKeyCard } from "../components/ProviderKeyCard";
import { SectionHeader } from "../components/SectionHeader";
import {
  buildProxyStatusArgs,
  canRunProxyLogin,
  canStartProxy,
  getEffectiveProxyPath,
  getProxyRecoveryText,
  isUsingAutoDetectedProxyPath,
  resolveDetectedProxyPreset,
} from "./proxyPreset";

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
  const { t } = useI18n();
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
  const mcpProviders = usePreferencesStore((s) => s.mcpProviders);
  const managedMcpPresets = usePreferencesStore((s) => s.managedMcpPresets);
  const refactorCustomInstructions = usePreferencesStore(
    (s) => s.refactorCustomInstructions,
  );
  const proxyPresetId = usePreferencesStore((s) => s.proxyPresetId);
  const proxyPresetPaths = usePreferencesStore((s) => s.proxyPresetPaths);

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
        title={t("models.title")}
        description={t("models.description")}
      />

      <DefaultsBlock
        defaultModel={defaultModel}
        configuredIds={configuredIds}
        keys={keys}
      />

      <McpToolsBlock
        exaKey={exaKey}
        context7Key={context7Key}
        mcpProviders={mcpProviders}
        managedMcpPresets={managedMcpPresets}
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
      <RefactorRulesExplorerBlock />

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
                  proxyPresetId={proxyPresetId}
                  proxyPresetPaths={proxyPresetPaths}
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

function RefactorPromptControlBlock({ value }: { value: string }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const openRefactorPromptFolder = async () => {
    const path = await native.refactorRulesRoot();
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
        <p className="text-[10.5px] leading-relaxed text-muted-foreground">
          Normal chat keeps using Custom instructions in Agents. This setting does not change the
          main chat agent.
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

function RefactorRulesExplorerBlock() {
  const [root, setRoot] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadFiles = async () => {
    setStatus("loading");
    setError(null);
    try {
      const nextRoot = await native.refactorRulesRoot();
      const [entries, manifestFiles] = await Promise.all([
        native.readDir(nextRoot),
        native.refactorRulesList(),
      ]);
      const next = manifestFiles
        .filter((name) => entries.some((entry) => entry.kind === "file" && entry.name === name))
        .sort((left, right) => left.localeCompare(right));
      setRoot(nextRoot);
      setFiles(next);
      setSelectedFile((current) => current ?? next[0] ?? null);
      setStatus("idle");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  useEffect(() => {
    void loadFiles();
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setContent("");
      setSavedContent("");
      return;
    }
    setStatus("loading");
    setError(null);
    void native
      .readFile(`${root}/${selectedFile}`)
      .then((result) => {
        if (result.kind !== "text") {
          throw new Error("Rule file is not readable text.");
        }
        setContent(result.content);
        setSavedContent(result.content);
        setStatus("idle");
      })
      .catch((cause) => {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : String(cause));
      });
  }, [root, selectedFile]);

  const dirty = content !== savedContent;

  return (
    <div className="flex flex-col gap-3">
      <Label>Refactor rules</Label>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Browse and edit the markdown rules that feed AI refactor previews. Changes save directly
          into the app-local refactor rules folder.
        </p>
        <p className="text-[10.5px] leading-relaxed text-muted-foreground/80">
          {root ? `Rules folder: ${root}` : "Loading rules folder…"}
        </p>
        <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="rounded-lg border border-border/60 bg-card/50 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Rule files</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void loadFiles()}
                className="h-7 px-2 text-[11px]"
              >
                Refresh
              </Button>
            </div>
            <div className="flex max-h-[320px] flex-col gap-1 overflow-auto">
              {files.map((file) => (
                <button
                  key={file}
                  type="button"
                  onClick={() => setSelectedFile(file)}
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-[11px] transition-colors",
                    selectedFile === file
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  {file}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">
                {selectedFile ?? "No rule selected"}
              </Badge>
              {dirty ? <Badge variant="secondary">Unsaved</Badge> : null}
              {status === "error" && error ? (
                <span className="text-[11px] text-destructive/80">{error}</span>
              ) : null}
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Select a markdown rule to edit it here."
              className="min-h-[320px] resize-y border border-border bg-card/50 font-mono text-[11.5px] leading-relaxed"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={!selectedFile || !dirty || status === "saving"}
                onClick={async () => {
                  if (!selectedFile) return;
                  setStatus("saving");
                  setError(null);
                  try {
                    await native.writeFile(
                      `${root}/${selectedFile}`,
                      content,
                    );
                    setSavedContent(content);
                    setStatus("idle");
                  } catch (cause) {
                    setStatus("error");
                    setError(cause instanceof Error ? cause.message : String(cause));
                  }
                }}
                className="h-8 px-3 text-[11px]"
              >
                Save selected rule
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!root) return;
                  const path = await native.canonicalize(root);
                  await revealInFinder(path);
                }}
                className="h-8 px-3 text-[11px]"
              >
                Reveal rules folder
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  if (!root) return;
                  const path = await native.canonicalize(`${root}/manifest.json`);
                  await revealInFinder(path);
                }}
                className="h-8 px-3 text-[11px]"
              >
                Reveal manifest
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KeyRow({
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
  proxyPresetId,
  proxyPresetPaths,
  compatKey,
  onSaveKey,
  onClearKey,
  onRemove,
}: {
  provider: ProviderInfo;
  configured: boolean;
  config: LocalConfig;
  meta: LocalMeta;
  proxyPresetId?: string | null;
  proxyPresetPaths?: Record<string, string>;
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

        {provider.id === "openai-compatible" ? (
          <ProxyPresetControls
            baseURL={urlDraft}
            modelsError={modelsError}
            activePresetId={proxyPresetId ?? null}
            presetPaths={proxyPresetPaths ?? {}}
            compatKey={compatKey ?? null}
            onUseBaseUrl={async (nextBaseUrl) => {
              setUrlDraft(nextBaseUrl);
              await setBaseURL(nextBaseUrl);
            }}
          />
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

function ProxyPresetControls({
  baseURL,
  modelsError,
  activePresetId,
  presetPaths,
  compatKey,
  onUseBaseUrl,
}: {
  baseURL: string;
  modelsError: string | null;
  activePresetId: string | null;
  presetPaths: Record<string, string>;
  compatKey?: string | null;
  onUseBaseUrl: (baseUrl: string) => Promise<void>;
}) {
  const [presets, setPresets] = useState<Awaited<
    ReturnType<typeof native.proxyexamplePresets>
  >>([]);
  const [detectedPreset, setDetectedPreset] = useState<Awaited<
    ReturnType<typeof native.proxyexampleDetectAtPath>
  > | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    activePresetId,
  );
  const [selectedPath, setSelectedPath] = useState("");
  const [busyAction, setBusyAction] = useState<"start" | "login" | null>(null);
  const [status, setStatus] = useState<ProxyExampleStatus | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    void native.proxyexamplePresets().then(setPresets).catch(() => setPresets([]));
  }, []);

  useEffect(() => {
    setSelectedPresetId(activePresetId);
  }, [activePresetId]);

  useEffect(() => {
    setSelectedPath(selectedPresetId ? presetPaths[selectedPresetId] ?? "" : "");
  }, [presetPaths, selectedPresetId]);

  useEffect(() => {
    if (!selectedPresetId) {
      setDetectedPreset(null);
      return;
    }
    let alive = true;
    void native
      .proxyexampleDetectAtPath(selectedPresetId, selectedPath.trim() || null)
      .then((next) => {
        if (alive) setDetectedPreset(next);
      })
      .catch(() => {
        if (alive) setDetectedPreset(null);
      });
    return () => {
      alive = false;
    };
  }, [selectedPath, selectedPresetId]);

  const selectedPreset =
    presets.find((preset) => preset.id === selectedPresetId) ?? null;
  const effectivePreset = resolveDetectedProxyPreset(detectedPreset, selectedPreset);
  const effectivePath = getEffectiveProxyPath(
    selectedPath,
    detectedPreset,
    selectedPreset,
  );
  const usingAutoDetectedPath = isUsingAutoDetectedProxyPath(
    selectedPath,
    effectivePath,
  );

  useEffect(() => {
    if (!selectedPresetId) {
      setStatus(null);
      return;
    }
    const normalizedBaseUrl = normalizeOpenAiCompatibleBaseUrl(baseURL);
    if (!normalizedBaseUrl) {
      setStatus(null);
      return;
    }
    let alive = true;
    setStatusBusy(true);
    void native
      .proxyexampleStatus(
        ...buildProxyStatusArgs(
          selectedPresetId,
          effectivePath,
          normalizedBaseUrl,
          compatKey,
        ),
      )
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {
        if (alive) setStatus(null);
      })
      .finally(() => {
        if (alive) setStatusBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [baseURL, compatKey, effectivePath, selectedPresetId]);
  const recoveryHint = getProxyRecoveryText(status, getProxyRecoveryHint(modelsError));
  const looksLocalCompat =
    baseURL.includes("127.0.0.1") ||
    baseURL.includes("localhost") ||
    baseURL.includes("0.0.0.0");

  if (!selectedPreset && !recoveryHint && !looksLocalCompat) return null;

  const runAction = async (kind: "start" | "login") => {
    if (!selectedPresetId || !effectivePath) {
      toast.error("Choose a proxy preset and its folder first.");
      return;
    }
    setBusyAction(kind);
    try {
      if (kind === "start") {
        await native.proxyexampleStart(selectedPresetId, effectivePath);
        toast.success("Proxy preset started.");
      } else {
        await native.proxyexampleLogin(selectedPresetId, effectivePath);
        toast.success("Proxy preset login flow launched.");
      }
      await setProxyPresetId(selectedPresetId);
      if (selectedPath.trim()) {
        await setProxyPresetPath(selectedPresetId, selectedPath.trim());
      }
      const normalizedBaseUrl = normalizeOpenAiCompatibleBaseUrl(
        baseURL || selectedPreset?.defaultBaseUrl || "",
      );
      if (normalizedBaseUrl) {
        setStatus(
          await native.proxyexampleStatus(
            ...buildProxyStatusArgs(
              selectedPresetId,
              effectivePath,
              normalizedBaseUrl,
              compatKey,
            ),
          ),
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusyAction(null);
    }
  };

  const chooseFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose proxy preset folder",
    });
    if (typeof selected !== "string") return;
    setSelectedPath(selected);
    if (selectedPresetId) {
      await setProxyPresetPath(selectedPresetId, selected);
    }
  };

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-foreground">
          Proxy preset recovery
        </span>
        <span className="text-[10.5px] leading-relaxed text-muted-foreground">
          {recoveryHint ??
            "This looks like a bundled proxy preset. Start it here and run its interactive login flow when the upstream site needs browser auth."}
        </span>
        {status ? (
          <div className="rounded-md border border-border/60 bg-background/70 px-2.5 py-2 text-[10.5px] text-muted-foreground">
            <div>
              Health:{" "}
              {status.healthOk
                ? `ok (${status.healthStatus ?? "n/a"})`
                : status.healthStatus ?? status.healthError ?? "unreachable"}
            </div>
            <div>
              Models:{" "}
              {status.modelsReachable ? "reachable" : status.modelsError ?? "not reachable"}
            </div>
            {!status.configuredPathOk && status.pathError ? (
              <div>Path: {status.pathError}</div>
            ) : null}
          </div>
        ) : statusBusy ? (
          <div className="text-[10.5px] text-muted-foreground">Checking preset status...</div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedPresetId ?? ""}
            onChange={async (e) => {
              const next = e.target.value || null;
              setSelectedPresetId(next);
              await setProxyPresetId(next);
              const preset = presets.find((item) => item.id === next);
              if (preset && !baseURL.trim()) {
                await onUseBaseUrl(preset.defaultBaseUrl);
              }
            }}
            className="h-8 min-w-36 rounded-md border border-border bg-background px-2.5 text-[11.5px]"
          >
            <option value="">Select preset</option>
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.displayName}
              </option>
            ))}
          </select>
          <Input
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            onBlur={() => {
              if (selectedPresetId) {
                void setProxyPresetPath(selectedPresetId, selectedPath.trim());
              }
            }}
            placeholder="Path to proxy preset folder"
            spellCheck={false}
            className="h-8 flex-1 font-mono text-[11px]"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void chooseFolder()}
            className="h-8 px-3 text-[11px]"
          >
            Browse
          </Button>
        </div>

        {usingAutoDetectedPath ? (
          <div className="text-[10.5px] text-muted-foreground">
            Using repo-local preset path: {effectivePath}
          </div>
        ) : null}

        {selectedPreset ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void onUseBaseUrl(selectedPreset.defaultBaseUrl)}
              className="h-8 px-3 text-[11px]"
            >
              Use preset URL
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!canStartProxy(effectivePreset, busyAction)}
              onClick={() => void runAction("start")}
              className="h-8 px-3 text-[11px]"
            >
              {busyAction === "start" ? "Starting..." : "Start proxy"}
            </Button>
            <Button
              size="sm"
              disabled={!canRunProxyLogin(effectivePreset, busyAction)}
              onClick={() => void runAction("login")}
              className="h-8 px-3 text-[11px]"
            >
              {busyAction === "login" ? "Opening..." : "Run login"}
            </Button>
            <span className="text-[10.5px] text-muted-foreground">
              Default URL: {selectedPreset.defaultBaseUrl}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getProxyRecoveryHint(message: string | null): string | null {
  if (!message) return null;
  const text = message.toLowerCase();
  if (text.includes("deepseek login required")) {
    return "This proxy preset needs an interactive DeepSeek login. Click `Run login`, finish the browser flow, then retry.";
  }
  if (text.includes("waf challenge")) {
    return "DeepSeek presented a WAF challenge. Click `Run login`, let the browser finish the challenge, then retry model loading.";
  }
  if (
    text.includes("net::err_aborted") ||
    text.includes("failed to open deepseek start page") ||
    text.includes("deepseek_navigation_failed")
  ) {
    return "The local proxy is reachable, but its browser session is not ready. Use `Run login` to refresh the saved session before retrying.";
  }
  return null;
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
