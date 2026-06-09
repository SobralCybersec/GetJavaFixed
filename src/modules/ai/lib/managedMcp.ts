import { create } from "zustand";
import { getLaunchDir, initLaunchDir } from "@/lib/launchDir";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { upsertManagedMcpPreset } from "@/modules/settings/store";
import {
  MANAGED_MCP_PRESET_META,
  type ManagedMcpHealthSnapshot,
  getManagedMcpEndpoint,
  getManagedMcpPresetConfig,
  type ManagedMcpPresetConfig,
  type ManagedMcpPresetId,
} from "./mcpRegistry";
import { probeMcpProvider } from "./mcpClient";
import { native } from "./native";

const DEFAULT_MANAGED_PYTHON = "python";

export type ManagedMcpRuntimeState =
  | "disabled"
  | "stopped"
  | "starting"
  | "running"
  | "error";

export type ManagedMcpRuntimeStatus = {
  id: ManagedMcpPresetId;
  state: ManagedMcpRuntimeState;
  endpointUrl: string;
  handle: number | null;
  healthy: boolean;
  toolNames: string[];
  portConflict: ManagedMcpPortOwner | null;
  lastError: string | null;
  logs: string;
  exitCode: number | null;
  configured: ManagedMcpPresetConfig;
};

type ManagedMcpPortOwner = {
  pid: number;
  localAddress: string | null;
  localPort: number;
  processName: string | null;
  commandLine: string | null;
};

type ManagedMcpStoreState = {
  initialized: boolean;
  statuses: Record<ManagedMcpPresetId, ManagedMcpRuntimeStatus>;
  init: () => Promise<void>;
  refreshAll: () => Promise<void>;
  refreshPreset: (id: ManagedMcpPresetId) => Promise<void>;
  startPreset: (id: ManagedMcpPresetId) => Promise<void>;
  stopPreset: (id: ManagedMcpPresetId) => Promise<void>;
};

const INITIAL_STATUSES = {
  x64dbg: buildStatus("x64dbg"),
} as const satisfies Record<ManagedMcpPresetId, ManagedMcpRuntimeStatus>;

const pendingStarts = new Set<ManagedMcpPresetId>();

function buildStatus(id: ManagedMcpPresetId): ManagedMcpRuntimeStatus {
  const config = getManagedMcpPresetConfig(undefined, id);
  return {
    id,
    state: config.enabled ? "stopped" : "disabled",
    endpointUrl: getManagedMcpEndpoint(config),
    handle: null,
    healthy: false,
    toolNames: [],
    portConflict: null,
    lastError: null,
    logs: "",
    exitCode: null,
    configured: config,
  };
}

export const useManagedMcpStore = create<ManagedMcpStoreState>((set, get) => ({
  initialized: false,
  statuses: {
    x64dbg: buildStatus("x64dbg"),
  },
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    await get().refreshAll();
  },
  refreshAll: async () => {
    await Promise.all(
      (Object.keys(INITIAL_STATUSES) as ManagedMcpPresetId[]).map((id) =>
        get().refreshPreset(id),
      ),
    );
  },
  refreshPreset: async (id) => {
    const next = await inspectManagedPreset(id);
    set((state) => ({
      statuses: {
        ...state.statuses,
        [id]: next,
      },
    }));
  },
  startPreset: async (id) => {
    if (pendingStarts.has(id)) {
      return;
    }
    pendingStarts.add(id);

    try {
      const prefs = usePreferencesStore.getState();
      const config = getManagedMcpPresetConfig(prefs.managedMcpPresets, id);
      if (!config.enabled) {
        throw new Error("Enable the preset before starting it.");
      }

      await get().refreshPreset(id);
      const existing = get().statuses[id];
      if (existing.state === "running" || existing.state === "starting") {
        return;
      }
      if (existing.portConflict) {
        throw new Error(formatPortConflictError(existing.portConflict));
      }

      const launchSpec = await buildLaunchSpec(id, config);
      const handle = await native.shellBgSpawnInWorkspace(
        launchSpec.command,
        launchSpec.cwd,
        null,
      );
      set((state) => ({
        statuses: {
          ...state.statuses,
          [id]: {
            ...state.statuses[id],
            state: "starting",
            handle,
            configured: config,
            endpointUrl: getManagedMcpEndpoint(config),
            portConflict: null,
            lastError: null,
          },
        },
      }));

      await delay(850);
      await get().refreshPreset(id);
    } finally {
      pendingStarts.delete(id);
    }
  },
  stopPreset: async (id) => {
    const status = get().statuses[id];
    if (status.handle != null) {
      await native.shellBgKill(status.handle);
      await delay(250);
    }
    await get().refreshPreset(id);
  },
}));

export function isManagedMcpHealthy(id: ManagedMcpPresetId): boolean {
  return useManagedMcpStore.getState().statuses[id]?.healthy === true;
}

export function getManagedMcpHealthSnapshots(): Partial<
  Record<ManagedMcpPresetId, ManagedMcpHealthSnapshot>
> {
  const snapshots: Partial<Record<ManagedMcpPresetId, ManagedMcpHealthSnapshot>> =
    {};
  const statuses = useManagedMcpStore.getState().statuses;
  for (const id of Object.keys(statuses) as ManagedMcpPresetId[]) {
    snapshots[id] = { healthy: statuses[id].healthy };
  }
  return snapshots;
}

async function inspectManagedPreset(
  id: ManagedMcpPresetId,
): Promise<ManagedMcpRuntimeStatus> {
  const prefs = usePreferencesStore.getState();
  const config = getManagedMcpPresetConfig(prefs.managedMcpPresets, id);
  const endpointUrl = getManagedMcpEndpoint(config);
  const meta = MANAGED_MCP_PRESET_META[id];

  let handle: number | null = null;
  let logs = "";
  let exitCode: number | null = null;
  let portConflict: ManagedMcpPortOwner | null = null;
  let lastError: string | null = null;

  try {
    const launchSpec = await buildLaunchSpec(id, config);
    const bg = await native.shellBgList();
    const matched = bg.find((entry) =>
      matchesManagedHandle(entry.command, launchSpec.launcherPath, meta.commandMarker),
    );
    if (matched) {
      handle = matched.handle;
      exitCode = matched.exited ? matched.exit_code ?? null : null;
      const logState = await native.shellBgLogs(matched.handle, 0);
      logs = trimLogs(logState.bytes);
      if (matched.exited && (matched.exit_code ?? 0) !== 0) {
        lastError = `Process exited with code ${matched.exit_code}.`;
      }
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  }

  if (!config.enabled) {
    return {
      id,
      state: "disabled",
      endpointUrl,
      handle,
      healthy: false,
      toolNames: [],
      portConflict,
      lastError,
      logs,
      exitCode,
      configured: config,
    };
  }

  const probe = await probeMcpProvider({
    id,
    label: meta.label,
    enabled: true,
    url: endpointUrl,
    auth: "none",
  });

  if (!probe.ok && handle == null) {
    portConflict = await inspectListeningPort(config.port);
  }

  const state: ManagedMcpRuntimeState = probe.ok
    ? "running"
    : handle != null && exitCode == null
      ? "starting"
      : handle != null && exitCode != null
        ? "error"
        : portConflict
          ? "error"
          : "stopped";

  return {
    id,
    state,
    endpointUrl,
    handle,
    healthy: probe.ok,
    toolNames: probe.toolNames,
    portConflict,
    lastError: probe.ok
      ? lastError
      : portConflict
        ? formatPortConflictError(portConflict)
        : probe.errorMessage ?? lastError,
    logs,
    exitCode,
    configured: config,
  };
}

async function buildLaunchSpec(
  id: ManagedMcpPresetId,
  config: ManagedMcpPresetConfig,
): Promise<{
  command: string;
  cwd: string;
  launcherPath: string;
}> {
  const assetBaseDir = await resolveManagedMcpAssetBaseDir(id);
  const meta = MANAGED_MCP_PRESET_META[id];
  const launcherPath = joinLaunchPath(assetBaseDir, meta.launcherScript);
  const cwd = launcherPath.replace(/[\\/][^\\/]+$/, "");
  const pythonPath = await resolveManagedPythonPath(
    id,
    config.pythonPath,
  );

  return {
    launcherPath,
    cwd,
    command: [
      `& ${psQuote(pythonPath)}`,
      psQuote(launcherPath),
      "--host",
      "127.0.0.1",
      "--port",
      String(config.port),
      "--path",
      psQuote("/mcp"),
      "--upstream-url",
      psQuote(config.upstreamUrl),
    ].join(" "),
  };
}

export function getManagedMcpVenvDir(
  appLocalDataDir: string,
  id: ManagedMcpPresetId,
): string {
  const normalizedBase = appLocalDataDir.replace(/[\\/]+$/, "");
  switch (id) {
    case "x64dbg":
      return `${normalizedBase}\\managed-mcp\\x64dbg\\.venv`;
  }
}

export function getManagedMcpBundledPythonPath(
  appLocalDataDir: string,
  id: ManagedMcpPresetId,
): string {
  const venvDir = getManagedMcpVenvDir(appLocalDataDir, id).replace(/[\\/]+$/, "");
  switch (id) {
    case "x64dbg":
      return `${venvDir}\\Scripts\\python.exe`;
  }
}

export async function resolveManagedMcpAssetBaseDir(
  id: ManagedMcpPresetId,
): Promise<string> {
  const meta = MANAGED_MCP_PRESET_META[id];
  const candidateBases = await collectManagedMcpAssetBaseCandidates();
  for (const base of candidateBases) {
    const launcherPath = joinLaunchPath(base, meta.launcherScript);
    try {
      await native.canonicalize(launcherPath);
      return base;
    } catch {
      // try next candidate
    }
  }

  throw new Error(
    `Managed MCP assets for ${meta.label} were not found. Reinstall or rebuild the app bundle.`,
  );
}

async function collectManagedMcpAssetBaseCandidates(): Promise<string[]> {
  await initLaunchDir();

  const launchDir = getLaunchDir();
  const resourceDir = await native.appResourceDir().catch(() => null);
  const workspaceDir = await native.workspaceCurrentDir().catch(() => null);

  const candidates = [resourceDir, launchDir, workspaceDir].filter(
    (value): value is string => !!value && value.trim().length > 0,
  );

  const seen = new Set<string>();
  return candidates.filter((value) => {
    const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function resolveManagedPythonPath(
  id: ManagedMcpPresetId,
  configuredPythonPath: string | null | undefined,
): Promise<string> {
  const appLocalDataDir = await native.appLocalDataDir().catch(() => null);
  const configured = (configuredPythonPath || DEFAULT_MANAGED_PYTHON).trim();
  const bundledPython = appLocalDataDir
    ? getManagedMcpBundledPythonPath(appLocalDataDir, id)
    : null;

  if (configured && configured.toLowerCase() !== DEFAULT_MANAGED_PYTHON) {
    try {
      await native.canonicalize(configured);
      if (await pythonHasModule(configured, "mcp", appLocalDataDir)) {
        return configured;
      }
    } catch {
      if (!bundledPython) return configured;
    }
  }

  if (bundledPython) {
    try {
      await native.canonicalize(bundledPython);
      if (await pythonHasModule(bundledPython, "mcp", appLocalDataDir)) {
        await maybePersistManagedPythonPath(id, bundledPython, configuredPythonPath);
        return bundledPython;
      }
    } catch {
      // fall through
    }
  }

  if (
    (!configured || configured.toLowerCase() === DEFAULT_MANAGED_PYTHON) &&
    (await pythonHasModule(DEFAULT_MANAGED_PYTHON, "mcp", appLocalDataDir))
  ) {
    return DEFAULT_MANAGED_PYTHON;
  }

  throw new Error(
    "No Python interpreter with the `mcp` package is available for x64dbg MCP. Click Install deps to provision the managed environment.",
  );
}

async function pythonHasModule(
  pythonPath: string,
  moduleName: string,
  cwd?: string | null,
): Promise<boolean> {
  try {
    const result = await native.runCommand(
      `& ${psQuote(pythonPath)} -c ${psQuote(`import ${moduleName}`)}`,
      cwd ?? null,
      20,
    );
    return !result.timed_out && (result.exit_code ?? 1) === 0;
  } catch {
    return false;
  }
}

function pathsEqual(left: string, right: string): boolean {
  return (
    left.replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase() ===
    right.replace(/\//g, "\\").replace(/[\\]+$/, "").toLowerCase()
  );
}

async function maybePersistManagedPythonPath(
  id: ManagedMcpPresetId,
  nextPythonPath: string,
  configuredPythonPath: string | null | undefined,
): Promise<void> {
  const configured = (configuredPythonPath || "").trim();
  if (!configured || pathsEqual(configured, nextPythonPath)) {
    return;
  }
  try {
    await upsertManagedMcpPreset(id, { pythonPath: nextPythonPath });
  } catch {
    // best-effort migration; runtime can still proceed
  }
}

async function inspectListeningPort(
  port: number,
): Promise<ManagedMcpPortOwner | null> {
  try {
    const script = [
      `$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1`,
      "if (-not $conn) { return }",
      "$proc = Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $conn.OwningProcess } | Select-Object -First 1",
      "[pscustomobject]@{",
      "  pid = [int]$conn.OwningProcess",
      "  localAddress = [string]$conn.LocalAddress",
      "  localPort = [int]$conn.LocalPort",
      "  processName = if ($proc) { [string]$proc.Name } else { $null }",
      "  commandLine = if ($proc) { [string]$proc.CommandLine } else { $null }",
      "} | ConvertTo-Json -Compress",
    ].join("; ");
    const result = await native.runCommand(script, null, 15);
    if (result.timed_out || (result.exit_code ?? 1) !== 0) {
      return null;
    }
    const raw = result.stdout.trim();
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ManagedMcpPortOwner>;
    if (typeof parsed.pid !== "number" || typeof parsed.localPort !== "number") {
      return null;
    }
    return {
      pid: parsed.pid,
      localAddress:
        typeof parsed.localAddress === "string" ? parsed.localAddress : null,
      localPort: parsed.localPort,
      processName:
        typeof parsed.processName === "string" ? parsed.processName : null,
      commandLine:
        typeof parsed.commandLine === "string" ? parsed.commandLine : null,
    };
  } catch {
    return null;
  }
}

function formatPortConflictError(portOwner: ManagedMcpPortOwner): string {
  const procLabel = portOwner.processName
    ? `${portOwner.processName} (PID ${portOwner.pid})`
    : `PID ${portOwner.pid}`;
  const commandLine = portOwner.commandLine?.trim();
  if (commandLine) {
    return `Port ${portOwner.localPort} is already in use by ${procLabel}: ${commandLine}`;
  }
  return `Port ${portOwner.localPort} is already in use by ${procLabel}.`;
}

function matchesManagedHandle(
  command: string,
  launcherPath: string,
  commandMarker: string,
): boolean {
  const normalizedCommand = command.replace(/\\/g, "/").toLowerCase();
  const normalizedLauncher = launcherPath.replace(/\\/g, "/").toLowerCase();
  const normalizedMarker = commandMarker.replace(/\\/g, "/").toLowerCase();
  return (
    normalizedCommand.includes(normalizedLauncher) ||
    normalizedCommand.includes(normalizedMarker)
  );
}

function joinLaunchPath(base: string, relativePath: string): string {
  const normalizedBase = base.replace(/[\\/]+$/, "");
  const normalizedRelative = relativePath.replace(/^[\\/]+/, "");
  return `${normalizedBase}/${normalizedRelative}`.replace(/\//g, "\\");
}

function psQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function trimLogs(value: string, maxChars = 8000): string {
  return value.length <= maxChars ? value : value.slice(value.length - maxChars);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
