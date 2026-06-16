import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { quoteShellArg } from "@/lib/shellQuote";
import { Switch } from "@/components/ui/switch";
import { IS_WINDOWS } from "@/lib/platform";
import { native } from "@/modules/ai/lib/native";
import { useI18n } from "@/modules/i18n";
import {
  getManagedMcpBundledPythonPath,
  getManagedMcpVenvDir,
  resolveManagedMcpAssetBaseDir,
  useManagedMcpStore,
} from "@/modules/ai/lib/managedMcp";
import {
  DEFAULT_CONTEXT7_MCP_URL,
  MANAGED_MCP_PRESET_META,
  REMOTE_MCP_PROVIDER_META,
  getManagedMcpEndpoint,
  getManagedMcpPresetConfig,
  getRemoteMcpProviderConfig,
  type ManagedMcpPresetConfig,
  type McpProviderConfig,
} from "@/modules/ai/lib/mcpRegistry";
import {
  upsertManagedMcpPreset,
  upsertMcpProvider,
} from "@/modules/settings/store";
import { ArrowUpRight01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@/lib/openUrl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type Props = {
  exaKey: string | null;
  context7Key: string | null;
  mcpProviders: McpProviderConfig[];
  managedMcpPresets: ManagedMcpPresetConfig[];
  onSaveExaKey: (value: string) => Promise<void>;
  onClearExaKey: () => Promise<void>;
  onSaveContext7Key: (value: string) => Promise<void>;
  onClearContext7Key: () => Promise<void>;
};

export function McpToolsBlock({
  exaKey,
  context7Key,
  mcpProviders,
  managedMcpPresets,
  onSaveExaKey,
  onClearExaKey,
  onSaveContext7Key,
  onClearContext7Key,
}: Props) {
  const { t } = useI18n();
  const statuses = useManagedMcpStore((s) => s.statuses);
  const refreshPreset = useManagedMcpStore((s) => s.refreshPreset);
  const startPreset = useManagedMcpStore((s) => s.startPreset);
  const stopPreset = useManagedMcpStore((s) => s.stopPreset);

  const exaConfig = getRemoteMcpProviderConfig(mcpProviders, "exa");
  const context7Config = getRemoteMcpProviderConfig(mcpProviders, "context7");
  const x64dbgConfig = getManagedMcpPresetConfig(managedMcpPresets, "x64dbg");
  const x64dbgStatus = statuses.x64dbg;

  const [exaDraft, setExaDraft] = useState("");
  const [context7Draft, setContext7Draft] = useState("");
  const [context7UrlDraft, setContext7UrlDraft] = useState(
    context7Config.url ?? DEFAULT_CONTEXT7_MCP_URL,
  );
  const [pythonPathDraft, setPythonPathDraft] = useState(x64dbgConfig.pythonPath);
  const [portDraft, setPortDraft] = useState(String(x64dbgConfig.port));
  const [upstreamUrlDraft, setUpstreamUrlDraft] = useState(x64dbgConfig.upstreamUrl);
  const [installingDeps, setInstallingDeps] = useState(false);

  useEffect(() => {
    setContext7UrlDraft(context7Config.url ?? DEFAULT_CONTEXT7_MCP_URL);
  }, [context7Config.url]);

  useEffect(() => {
    setPythonPathDraft(x64dbgConfig.pythonPath);
    setPortDraft(String(x64dbgConfig.port));
    setUpstreamUrlDraft(x64dbgConfig.upstreamUrl);
  }, [x64dbgConfig.port, x64dbgConfig.pythonPath, x64dbgConfig.upstreamUrl]);

  const saveManagedField = async (
    patch: Partial<ManagedMcpPresetConfig>,
  ): Promise<void> => {
    await upsertManagedMcpPreset("x64dbg", patch);
    await refreshPreset("x64dbg");
  };

  const runManagedAction = async (
    action: () => Promise<void>,
    failureLabel: string,
  ): Promise<void> => {
    try {
      await action();
    } catch (error) {
      toast.error(
        `${failureLabel}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const installX64dbgDeps = async (): Promise<void> => {
    if (!IS_WINDOWS) {
      toast.error(t("mcp.installDeps.windowsOnly"));
      return;
    }

    const appLocalDataDir = await native.appLocalDataDir().catch(() => null);
    if (!appLocalDataDir) {
      toast.error(t("mcp.installDeps.noLaunchDir"));
      return;
    }

    const assetBaseDir = await resolveManagedMcpAssetBaseDir("x64dbg");
    const configuredPython = (pythonPathDraft.trim() || x64dbgConfig.pythonPath || "python").trim();
    const venvDir = getManagedMcpVenvDir(appLocalDataDir, "x64dbg");
    const venvPython = getManagedMcpBundledPythonPath(appLocalDataDir, "x64dbg");
    const requirementsPath = `${assetBaseDir.replace(/[\\/]+$/, "")}/mcps/x64dbgmcp/requirements.txt`;

    let bootstrapPython = configuredPython;
    if (configuredPython.toLowerCase() === venvPython.toLowerCase()) {
      bootstrapPython = "python";
    } else if (configuredPython.toLowerCase() !== "python") {
      try {
        await native.canonicalize(configuredPython);
      } catch {
        bootstrapPython = "python";
      }
    }

    setInstallingDeps(true);
    try {
      let hasVenv = true;
      try {
        await native.canonicalize(venvPython);
      } catch {
        hasVenv = false;
      }

      if (!hasVenv) {
        const venvResult = await native.runCommand(
          `& ${quoteShellArg(bootstrapPython)} -m venv ${quoteShellArg(venvDir)}`,
          assetBaseDir,
          300,
        );
        if (venvResult.timed_out) {
          throw new Error(t("mcp.installDeps.timedOut"));
        }
        if ((venvResult.exit_code ?? 1) !== 0) {
          throw new Error(
            venvResult.stderr.trim() ||
              venvResult.stdout.trim() ||
              `exit code ${venvResult.exit_code}`,
          );
        }
      }

      const pipBootstrapResult = await native.runCommand(
        `& ${quoteShellArg(venvPython)} -m pip install --upgrade pip`,
        assetBaseDir,
        300,
      );
      if (pipBootstrapResult.timed_out) {
        throw new Error(t("mcp.installDeps.timedOut"));
      }
      if ((pipBootstrapResult.exit_code ?? 1) !== 0) {
        throw new Error(
          pipBootstrapResult.stderr.trim() ||
            pipBootstrapResult.stdout.trim() ||
            `exit code ${pipBootstrapResult.exit_code}`,
        );
      }

      const result = await native.runCommand(
        `& ${quoteShellArg(venvPython)} -m pip install --upgrade -r ${quoteShellArg(
          requirementsPath,
        )}`,
        assetBaseDir,
        300,
      );
      if (result.timed_out) {
        throw new Error(t("mcp.installDeps.timedOut"));
      }
      if ((result.exit_code ?? 1) !== 0) {
        throw new Error(result.stderr.trim() || result.stdout.trim() || `exit code ${result.exit_code}`);
      }
      await upsertManagedMcpPreset("x64dbg", { pythonPath: venvPython });
      setPythonPathDraft(venvPython);
      toast.success(t("mcp.installDeps.success"));
      await refreshPreset("x64dbg");
    } catch (error) {
      toast.error(
        `${t("mcp.installDeps.failed")}: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setInstallingDeps(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Label>{t("models.agentResearch")}</Label>
      <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("models.agentResearch.description")}
        </p>

        <div className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">
            {t("models.remoteProviders")}
          </div>
          <RemoteProviderCard
            providerId="exa"
            enabled={exaConfig.enabled}
            currentKey={exaKey}
            draft={exaDraft}
            onDraftChange={setExaDraft}
            onToggle={(enabled) => upsertMcpProvider("exa", { enabled })}
            onSave={async () => {
              const value = exaDraft.trim();
              if (!value) return;
              await onSaveExaKey(value);
              setExaDraft("");
            }}
            onClear={onClearExaKey}
            placeholder={t("mcp.optionalExaKey")}
          />
          <RemoteProviderCard
            providerId="context7"
            enabled={context7Config.enabled}
            currentKey={context7Key}
            draft={context7Draft}
            onDraftChange={setContext7Draft}
            onToggle={(enabled) => upsertMcpProvider("context7", { enabled })}
            onSave={async () => {
              const value = context7Draft.trim();
              if (!value) return;
              await onSaveContext7Key(value);
              setContext7Draft("");
            }}
            onClear={onClearContext7Key}
            placeholder={t("mcp.optionalContext7Key")}
            extra={
              <ConfigRow
                label={t("mcp.context7.url")}
                description={REMOTE_MCP_PROVIDER_META.context7.defaultUrl}
              >
                <Input
                  value={context7UrlDraft}
                  onChange={(event) => setContext7UrlDraft(event.target.value)}
                  onBlur={() =>
                    void upsertMcpProvider("context7", {
                      url: context7UrlDraft.trim() || DEFAULT_CONTEXT7_MCP_URL,
                    })
                  }
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
              </ConfigRow>
            }
          />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">
            {t("models.managedPresets")}
          </div>
          <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium">
                    {MANAGED_MCP_PRESET_META.x64dbg.label}
                  </span>
                  <Badge variant="outline">
                    {t(`mcp.status.${x64dbgStatus?.state ?? "disabled"}` as never)}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {MANAGED_MCP_PRESET_META.x64dbg.description}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 px-3 text-[11px]"
                onClick={() => void openUrl(MANAGED_MCP_PRESET_META.x64dbg.docsUrl)}
              >
                {t("mcp.docs")}
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={11} strokeWidth={1.75} />
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              <ConfigRow
                label={t("mcp.enableManaged.title")}
                description={t("mcp.enableManaged.description")}
              >
                <Switch
                  checked={x64dbgConfig.enabled}
                  onCheckedChange={(enabled) =>
                    void saveManagedField({ enabled })
                  }
                />
              </ConfigRow>

              <ConfigRow
                label={t("mcp.pythonPath")}
                description={t("mcp.pythonPath.description")}
              >
                <Input
                  value={pythonPathDraft}
                  onChange={(event) => setPythonPathDraft(event.target.value)}
                  onBlur={() =>
                    void saveManagedField({
                      pythonPath: pythonPathDraft.trim() || "python",
                    })
                  }
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
              </ConfigRow>

              <ConfigRow
                label={t("mcp.port")}
                description={t("mcp.port.description")}
              >
                <Input
                  value={portDraft}
                  onChange={(event) => setPortDraft(event.target.value)}
                  onBlur={() => {
                    const parsed = Number.parseInt(portDraft, 10);
                    void saveManagedField({
                      port: Number.isFinite(parsed) ? parsed : x64dbgConfig.port,
                    });
                  }}
                  spellCheck={false}
                  className="h-8 w-36 font-mono text-[11.5px]"
                />
              </ConfigRow>

              <ConfigRow
                label={t("mcp.upstreamUrl")}
                description={t("mcp.upstreamUrl.description")}
              >
                <Input
                  value={upstreamUrlDraft}
                  onChange={(event) => setUpstreamUrlDraft(event.target.value)}
                  onBlur={() =>
                    void saveManagedField({
                      upstreamUrl: upstreamUrlDraft.trim() || x64dbgConfig.upstreamUrl,
                    })
                  }
                  spellCheck={false}
                  className="h-8 flex-1 font-mono text-[11.5px]"
                />
              </ConfigRow>

              <div className="rounded-md border border-border/60 bg-background/50 px-3 py-2 text-[10.5px] text-muted-foreground">
                <div>
                  {t("mcp.endpoint")}: {getManagedMcpEndpoint(x64dbgConfig)}
                </div>
                {x64dbgStatus?.lastError ? (
                  <div className="mt-1 text-destructive/80">
                    {x64dbgStatus.lastError}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[11px]"
                  disabled={installingDeps || !IS_WINDOWS}
                  onClick={() => void installX64dbgDeps()}
                >
                  {installingDeps ? t("mcp.installDeps.installing") : t("mcp.installDeps.button")}
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-[11px]"
                  disabled={!x64dbgConfig.enabled || x64dbgStatus?.state === "starting"}
                  onClick={() =>
                    void runManagedAction(
                      () => startPreset("x64dbg"),
                      MANAGED_MCP_PRESET_META.x64dbg.label,
                    )
                  }
                >
                  {t("mcp.start")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[11px]"
                  disabled={x64dbgStatus?.handle == null}
                  onClick={() =>
                    void runManagedAction(
                      () => stopPreset("x64dbg"),
                      MANAGED_MCP_PRESET_META.x64dbg.label,
                    )
                  }
                >
                  {t("mcp.stop")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[11px]"
                  onClick={() =>
                    void runManagedAction(
                      () => refreshPreset("x64dbg"),
                      MANAGED_MCP_PRESET_META.x64dbg.label,
                    )
                  }
                >
                  {t("mcp.refresh")}
                </Button>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <InfoBlock title={t("mcp.prerequisites")}>
                  <ul className="space-y-1">
                    {MANAGED_MCP_PRESET_META.x64dbg.prerequisites.map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </InfoBlock>
                <InfoBlock title={t("mcp.toolDiscovery")}>
                  {x64dbgStatus?.toolNames.length ? (
                    <div className="flex flex-wrap gap-1">
                      {x64dbgStatus.toolNames.map((toolName) => (
                        <Badge key={toolName} variant="secondary">
                          {toolName}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p>{t("mcp.noTools")}</p>
                  )}
                </InfoBlock>
              </div>

              <InfoBlock title={t("mcp.logs")}>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border/60 bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
                  {x64dbgStatus?.logs || t("mcp.noLogs")}
                </pre>
              </InfoBlock>

              {!x64dbgStatus?.healthy ? (
                <p className="text-[10.5px] leading-relaxed text-muted-foreground">
                  {t("mcp.setupHint")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoteProviderCard({
  providerId,
  enabled,
  currentKey,
  draft,
  onDraftChange,
  onToggle,
  onSave,
  onClear,
  placeholder,
  extra,
}: {
  providerId: "exa" | "context7";
  enabled: boolean;
  currentKey: string | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onToggle: (enabled: boolean) => Promise<void>;
  onSave: () => Promise<void>;
  onClear: () => Promise<void>;
  placeholder: string;
  extra?: React.ReactNode;
}) {
  const { t } = useI18n();
  const meta = REMOTE_MCP_PROVIDER_META[providerId];

  return (
    <div className="rounded-lg border border-border/60 bg-card/70 px-3 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium">{meta.label}</span>
            <Badge variant="outline">
              {enabled ? t("mcp.enabled") : t("mcp.disabled")}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {providerId === "exa"
              ? t("mcp.exa.description")
              : t("mcp.context7.description")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 px-3 text-[11px]"
          onClick={() => void openUrl(meta.docsUrl)}
        >
          {t("mcp.docs")}
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={11} strokeWidth={1.75} />
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        <ConfigRow label={t("mcp.enabled")} description={meta.defaultUrl}>
          <Switch checked={enabled} onCheckedChange={(next) => void onToggle(next)} />
        </ConfigRow>
        {extra}
        <ConfigRow
          label={providerId === "exa" ? t("mcp.exa.key") : t("mcp.context7.key")}
        >
          {currentKey ? (
            <div className="flex flex-1 items-center gap-1.5">
              <code className="flex-1 truncate rounded bg-muted/40 px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {maskKey(currentKey)}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => void onClear()}
                title={t("mcp.clearKey")}
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
                onChange={(event) => onDraftChange(event.target.value)}
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
                {t("mcp.saveKey")}
              </Button>
            </div>
          )}
        </ConfigRow>
      </div>
    </div>
  );
}

function ConfigRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          {description ? (
            <div className="text-[10px] leading-relaxed text-muted-foreground/80">
              {description}
            </div>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <div className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </div>
      <div className="text-[10.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
      {children}
    </span>
  );
}

function maskKey(value: string): string {
  if (value.length <= 8) return "Saved";
  return `${value.slice(0, 4)}${".".repeat(8)}${value.slice(-4)}`;
}
