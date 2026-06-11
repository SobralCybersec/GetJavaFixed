import {
  DEFAULT_AUTOCOMPLETE_MODEL,
  DEFAULT_MODEL_ID,
  isKnownModelId,
  LMSTUDIO_DEFAULT_BASE_URL,
  MLX_DEFAULT_BASE_URL,
  OLLAMA_DEFAULT_BASE_URL,
  OPENAI_COMPATIBLE_DEFAULT_BASE_URL,
  type AutocompleteProviderId,
  type ModelId,
} from "@/modules/ai/config";
import {
  DEFAULT_MANAGED_MCP_PRESETS,
  DEFAULT_MCP_PROVIDERS,
  DEFAULT_CONTEXT7_MCP_URL,
  getManagedMcpPresetConfig,
  getRemoteMcpProviderConfig,
  normalizeManagedMcpPresets,
  normalizeMcpProviders,
  type ManagedMcpPresetConfig,
  type ManagedMcpPresetId,
  type McpProviderConfig,
  type RemoteMcpProviderId,
} from "@/modules/ai/lib/mcpRegistry";
import type { KeyBinding, ShortcutId } from "@/modules/shortcuts/shortcuts";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { UiLocale } from "@/modules/i18n";

export type ThemePref = "system" | "light" | "dark";

export const DEFAULT_THEME_ID = "javarf-default";

export type BackgroundKind = "none" | "image" | "builtin";
export type LayoutMode = "classic" | "terminal-focus" | "compact-ops";
export type AgentFamilyMode = "general" | "cybersecurity";

export const EDITOR_THEMES = [
  "atomone",
  "aura",
  "copilot",
  "github-dark",
  "github-light",
  "gruvbox-dark",
  "nord",
  "tokyo-night",
  "xcode-dark",
  "xcode-light",
] as const;

export type EditorThemeId = (typeof EDITOR_THEMES)[number];

export const EDITOR_THEME_LABELS: Record<EditorThemeId, string> = {
  atomone: "Atom One",
  aura: "Aura",
  copilot: "Copilot",
  "github-dark": "GitHub Dark",
  "github-light": "GitHub Light",
  "gruvbox-dark": "Gruvbox Dark",
  nord: "Nord",
  "tokyo-night": "Tokyo Night",
  "xcode-dark": "Xcode Dark",
  "xcode-light": "Xcode Light",
};

export type Preferences = {
  firstRunSetupDone: boolean;
  firstRunTutorialDone: boolean;
  firstRunRepoPath: string | null;
  proxyPresetId: string | null;
  proxyPresetPaths: Record<string, string>;
  deepsproxyPath: string;
  kimiproxyPath: string;
  theme: ThemePref;
  uiLocale: UiLocale;
  themeId: string;
  backgroundKind: BackgroundKind;
  backgroundImageId: string | null;
  backgroundBuiltinId: string | null;
  backgroundOpacity: number;
  backgroundBlur: number;
  layoutMode: LayoutMode;
  agentFamilyMode: AgentFamilyMode;
  defaultModelId: ModelId;
  editorTheme: EditorThemeId;
  customInstructions: string;
  refactorCustomInstructions: string;
  autostart: boolean;
  restoreWindowState: boolean;
  autocompleteEnabled: boolean;
  autocompleteProvider: AutocompleteProviderId;
  autocompleteModelId: string;
  lmstudioBaseURL: string;
  lmstudioModelId: string;
  mlxBaseURL: string;
  mlxModelId: string;
  ollamaBaseURL: string;
  ollamaModelId: string;
  openaiCompatibleBaseURL: string;
  openaiCompatibleModelId: string;
  openaiCompatibleContextLimit: number;
  openrouterModelId: string;
  mcpProviders: McpProviderConfig[];
  managedMcpPresets: ManagedMcpPresetConfig[];
  context7Url: string;
  refactorMcpEnabled: boolean;
  favoriteModelIds: string[];
  recentModelIds: string[];
  vimMode: boolean;
  showHidden: boolean;
  terminalWebglEnabled: boolean;
  terminalFontFamily: string;
  terminalLetterSpacing: number;
  terminalFontSize: number;
  terminalScrollback: number;
  lastWslDistro: string | null;
  zoomLevel: number;
  agentNotifications: boolean;
  interactionSounds: boolean;
  soundVolume: number;
  soundPitch: number;
  soundBody: number;
  shortcuts: Record<ShortcutId, KeyBinding[]>;
  editorAutoSave: boolean;
  editorAutoSaveDelay: number;
};

const STORE_PATH = "javarf-settings.json";
const KEY_FIRST_RUN_SETUP_DONE = "firstRunSetupDone";
const KEY_FIRST_RUN_TUTORIAL_DONE = "firstRunTutorialDone";
const KEY_FIRST_RUN_REPO_PATH = "firstRunRepoPath";
const KEY_PROXY_PRESET_ID = "proxyPresetId";
const KEY_PROXY_PRESET_PATHS = "proxyPresetPaths";
const KEY_DEEPSPROXY_PATH = "deepsproxyPath";
const KEY_KIMIPROXY_PATH = "kimiproxyPath";
const KEY_THEME = "theme";
const KEY_UI_LOCALE = "uiLocale";
const KEY_THEME_ID = "themeId";
const KEY_BG_KIND = "backgroundKind";
const KEY_BG_IMAGE_ID = "backgroundImageId";
const KEY_BG_BUILTIN_ID = "backgroundBuiltinId";
const KEY_BG_OPACITY = "backgroundOpacity";
const KEY_BG_BLUR = "backgroundBlur";
const KEY_LAYOUT_MODE = "layoutMode";
const KEY_AGENT_FAMILY_MODE = "agentFamilyMode";
const KEY_DEFAULT_MODEL = "defaultModelId";
const KEY_EDITOR_THEME = "editorTheme";
const KEY_CUSTOM_INSTRUCTIONS = "customInstructions";
const KEY_REFACTOR_CUSTOM_INSTRUCTIONS = "refactorCustomInstructions";
const KEY_AUTOSTART = "autostart";
const KEY_RESTORE_WINDOW = "restoreWindowState";
const KEY_AUTOCOMPLETE_ENABLED = "autocompleteEnabled";
const KEY_AUTOCOMPLETE_PROVIDER = "autocompleteProvider";
const KEY_AUTOCOMPLETE_MODEL = "autocompleteModelId";
const KEY_LMSTUDIO_BASE_URL = "lmstudioBaseURL";
const KEY_LMSTUDIO_MODEL_ID = "lmstudioModelId";
const KEY_MLX_BASE_URL = "mlxBaseURL";
const KEY_MLX_MODEL_ID = "mlxModelId";
const KEY_OLLAMA_BASE_URL = "ollamaBaseURL";
const KEY_OLLAMA_MODEL_ID = "ollamaModelId";
const KEY_OPENAI_COMPAT_BASE_URL = "openaiCompatibleBaseURL";
const KEY_OPENAI_COMPAT_MODEL_ID = "openaiCompatibleModelId";
const KEY_OPENAI_COMPAT_CONTEXT_LIMIT = "openaiCompatibleContextLimit";
const KEY_OPENROUTER_MODEL_ID = "openrouterModelId";
const KEY_MCP_PROVIDERS = "mcpProviders";
const KEY_MANAGED_MCP_PRESETS = "managedMcpPresets";
const KEY_CONTEXT7_URL = "context7Url";
const KEY_REFACTOR_MCP_ENABLED = "refactorMcpEnabled";
const KEY_FAVORITE_MODELS = "favoriteModelIds";
const KEY_RECENT_MODELS = "recentModelIds";
const KEY_VIM_MODE = "vimMode";
const KEY_SHOW_HIDDEN = "showHidden";
const LEGACY_KEY_SHOW_HIDDEN_DIRS = "showHiddenDirectories";
const KEY_TERMINAL_WEBGL_ENABLED = "terminalWebglEnabled";
const KEY_TERMINAL_FONT_FAMILY = "terminalFontFamily";
const KEY_TERMINAL_LETTER_SPACING = "terminalLetterSpacing";
const KEY_TERMINAL_FONT_SIZE = "terminalFontSize";
const KEY_TERMINAL_SCROLLBACK = "terminalScrollback";
const KEY_LAST_WSL_DISTRO = "lastWslDistro";
const KEY_ZOOM_LEVEL = "zoomLevel";
const KEY_AGENT_NOTIFICATIONS = "agentNotifications";
const KEY_INTERACTION_SOUNDS = "interactionSounds";
const KEY_SOUND_VOLUME = "soundVolume";
const KEY_SOUND_PITCH = "soundPitch";
const KEY_SOUND_BODY = "soundBody";
const KEY_SHORTCUTS = "shortcuts";
const KEY_EDITOR_AUTO_SAVE = "editorAutoSave";
const KEY_EDITOR_AUTO_SAVE_DELAY = "editorAutoSaveDelay";

export const TERMINAL_FONT_SIZE_DEFAULT = 14;
export const TERMINAL_FONT_SIZE_MIN = 8;
export const TERMINAL_FONT_SIZE_MAX = 32;

export const TERMINAL_FONT_SIZES = [
  10, 12, 13, 14, 15, 16, 18, 20, 22, 24,
] as const;

export const TERMINAL_SCROLLBACK_DEFAULT = 2000;
export const TERMINAL_SCROLLBACK_MIN = 200;
export const TERMINAL_SCROLLBACK_MAX = 50_000;
export const TERMINAL_SCROLLBACK_PRESETS = [
  500, 1000, 2000, 5000, 10_000, 25_000,
] as const;

export const DEFAULT_PREFERENCES: Preferences = {
  firstRunSetupDone: false,
  firstRunTutorialDone: false,
  firstRunRepoPath: null,
  proxyPresetId: null,
  proxyPresetPaths: {},
  deepsproxyPath: "",
  kimiproxyPath: "",
  theme: "system",
  uiLocale: "system",
  themeId: DEFAULT_THEME_ID,
  backgroundKind: "none",
  backgroundImageId: null,
  backgroundBuiltinId: null,
  backgroundOpacity: 0.5,
  backgroundBlur: 0,
  layoutMode: "classic",
  agentFamilyMode: "general",
  defaultModelId: DEFAULT_MODEL_ID,
  editorTheme: "atomone",
  customInstructions: "",
  refactorCustomInstructions: "",
  autostart: false,
  restoreWindowState: true,
  autocompleteEnabled: false,
  autocompleteProvider: "cerebras",
  autocompleteModelId: DEFAULT_AUTOCOMPLETE_MODEL.cerebras ?? "",
  lmstudioBaseURL: LMSTUDIO_DEFAULT_BASE_URL,
  lmstudioModelId: "",
  mlxBaseURL: MLX_DEFAULT_BASE_URL,
  mlxModelId: "",
  ollamaBaseURL: OLLAMA_DEFAULT_BASE_URL,
  ollamaModelId: "",
  openaiCompatibleBaseURL: OPENAI_COMPATIBLE_DEFAULT_BASE_URL,
  openaiCompatibleModelId: "",
  openaiCompatibleContextLimit: 128_000,
  openrouterModelId: "",
  mcpProviders: DEFAULT_MCP_PROVIDERS.map((entry) => ({ ...entry })),
  managedMcpPresets: DEFAULT_MANAGED_MCP_PRESETS.map((entry) => ({ ...entry })),
  context7Url: DEFAULT_CONTEXT7_MCP_URL,
  refactorMcpEnabled: true,
  favoriteModelIds: [],
  recentModelIds: [],
  vimMode: false,
  showHidden: false,
  terminalWebglEnabled: true,
  terminalFontFamily: "",
  terminalLetterSpacing: 0,
  terminalFontSize: TERMINAL_FONT_SIZE_DEFAULT,
  terminalScrollback: TERMINAL_SCROLLBACK_DEFAULT,
  lastWslDistro: null,
  zoomLevel: 1.0,
  agentNotifications: true,
  interactionSounds: true,
  soundVolume: 0.8,
  soundPitch: 1,
  soundBody: 0.5,
  shortcuts: {} as Record<ShortcutId, KeyBinding[]>,
  editorAutoSave: false,
  editorAutoSaveDelay: 1000,
};

const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

const PREFS_CHANGED_EVENT = "javarf://prefs-changed";

async function writePref<T>(key: string, value: T): Promise<void> {
  await store.set(key, value);
  await store.save();
  await emit(PREFS_CHANGED_EVENT, { key, value });
}

export async function loadPreferences(): Promise<Preferences> {
  const entries = await store.entries();
  const map = new Map<string, unknown>(entries);
  const get = <T>(k: string): T | undefined => map.get(k) as T | undefined;
  return {
    firstRunSetupDone:
      get<boolean>(KEY_FIRST_RUN_SETUP_DONE) ??
      DEFAULT_PREFERENCES.firstRunSetupDone,
    firstRunTutorialDone:
      get<boolean>(KEY_FIRST_RUN_TUTORIAL_DONE) ??
      DEFAULT_PREFERENCES.firstRunTutorialDone,
    firstRunRepoPath:
      get<string | null>(KEY_FIRST_RUN_REPO_PATH) ??
      DEFAULT_PREFERENCES.firstRunRepoPath,
    proxyPresetId:
      get<string | null>(KEY_PROXY_PRESET_ID) ??
      DEFAULT_PREFERENCES.proxyPresetId,
    proxyPresetPaths: {
      deepsproxy:
        get<Record<string, string>>(KEY_PROXY_PRESET_PATHS)?.deepsproxy ??
        get<string>(KEY_DEEPSPROXY_PATH) ??
        DEFAULT_PREFERENCES.deepsproxyPath,
      kimiproxy:
        get<Record<string, string>>(KEY_PROXY_PRESET_PATHS)?.kimiproxy ??
        get<string>(KEY_KIMIPROXY_PATH) ??
        DEFAULT_PREFERENCES.kimiproxyPath,
      ...Object.fromEntries(
        Object.entries(get<Record<string, string>>(KEY_PROXY_PRESET_PATHS) ?? {}).map(
          ([key, value]) => [key, value.trim()],
        ),
      ),
    },
    deepsproxyPath:
      get<string>(KEY_DEEPSPROXY_PATH) ?? DEFAULT_PREFERENCES.deepsproxyPath,
    kimiproxyPath:
      get<string>(KEY_KIMIPROXY_PATH) ?? DEFAULT_PREFERENCES.kimiproxyPath,
    theme: get<ThemePref>(KEY_THEME) ?? DEFAULT_PREFERENCES.theme,
    uiLocale: get<UiLocale>(KEY_UI_LOCALE) ?? DEFAULT_PREFERENCES.uiLocale,
    themeId: get<string>(KEY_THEME_ID) ?? DEFAULT_PREFERENCES.themeId,
    backgroundKind:
      get<BackgroundKind>(KEY_BG_KIND) ?? DEFAULT_PREFERENCES.backgroundKind,
    backgroundImageId:
      get<string | null>(KEY_BG_IMAGE_ID) ??
      DEFAULT_PREFERENCES.backgroundImageId,
    backgroundBuiltinId:
      get<string | null>(KEY_BG_BUILTIN_ID) ??
      DEFAULT_PREFERENCES.backgroundBuiltinId,
    backgroundOpacity: clampBgOpacity(
      get<number>(KEY_BG_OPACITY) ?? DEFAULT_PREFERENCES.backgroundOpacity,
    ),
    backgroundBlur: clampBlur(
      get<number>(KEY_BG_BLUR) ?? DEFAULT_PREFERENCES.backgroundBlur,
    ),
    layoutMode: normalizeLayoutMode(get<string>(KEY_LAYOUT_MODE)),
    agentFamilyMode: normalizeAgentFamilyMode(
      get<string>(KEY_AGENT_FAMILY_MODE),
    ),
    defaultModelId: ((): ModelId => {
      const stored = get<string>(KEY_DEFAULT_MODEL);
      return stored && isKnownModelId(stored)
        ? stored
        : DEFAULT_PREFERENCES.defaultModelId;
    })(),
    editorTheme:
      get<EditorThemeId>(KEY_EDITOR_THEME) ?? DEFAULT_PREFERENCES.editorTheme,
    customInstructions:
      get<string>(KEY_CUSTOM_INSTRUCTIONS) ??
      DEFAULT_PREFERENCES.customInstructions,
    refactorCustomInstructions:
      get<string>(KEY_REFACTOR_CUSTOM_INSTRUCTIONS) ??
      DEFAULT_PREFERENCES.refactorCustomInstructions,
    autostart: get<boolean>(KEY_AUTOSTART) ?? DEFAULT_PREFERENCES.autostart,
    restoreWindowState:
      get<boolean>(KEY_RESTORE_WINDOW) ??
      DEFAULT_PREFERENCES.restoreWindowState,
    autocompleteEnabled:
      get<boolean>(KEY_AUTOCOMPLETE_ENABLED) ??
      DEFAULT_PREFERENCES.autocompleteEnabled,
    autocompleteProvider:
      get<AutocompleteProviderId>(KEY_AUTOCOMPLETE_PROVIDER) ??
      DEFAULT_PREFERENCES.autocompleteProvider,
    autocompleteModelId:
      get<string>(KEY_AUTOCOMPLETE_MODEL) ??
      DEFAULT_PREFERENCES.autocompleteModelId,
    lmstudioBaseURL:
      get<string>(KEY_LMSTUDIO_BASE_URL) ?? DEFAULT_PREFERENCES.lmstudioBaseURL,
    lmstudioModelId:
      get<string>(KEY_LMSTUDIO_MODEL_ID) ?? DEFAULT_PREFERENCES.lmstudioModelId,
    mlxBaseURL:
      get<string>(KEY_MLX_BASE_URL) ?? DEFAULT_PREFERENCES.mlxBaseURL,
    mlxModelId:
      get<string>(KEY_MLX_MODEL_ID) ?? DEFAULT_PREFERENCES.mlxModelId,
    ollamaBaseURL:
      get<string>(KEY_OLLAMA_BASE_URL) ?? DEFAULT_PREFERENCES.ollamaBaseURL,
    ollamaModelId:
      get<string>(KEY_OLLAMA_MODEL_ID) ?? DEFAULT_PREFERENCES.ollamaModelId,
    openaiCompatibleBaseURL:
      get<string>(KEY_OPENAI_COMPAT_BASE_URL) ??
      DEFAULT_PREFERENCES.openaiCompatibleBaseURL,
    openaiCompatibleModelId:
      get<string>(KEY_OPENAI_COMPAT_MODEL_ID) ??
      DEFAULT_PREFERENCES.openaiCompatibleModelId,
    openaiCompatibleContextLimit: ((): number => {
      const stored = get<number>(KEY_OPENAI_COMPAT_CONTEXT_LIMIT);
      if (!Number.isFinite(stored) || stored == null) return DEFAULT_PREFERENCES.openaiCompatibleContextLimit;
      // 256_000 was the stale incorrect default. Migrate it down to 128k.
      if (stored === 256_000) return DEFAULT_PREFERENCES.openaiCompatibleContextLimit;
      return Math.max(1_000, stored);
    })(),
    openrouterModelId:
      get<string>(KEY_OPENROUTER_MODEL_ID) ??
      DEFAULT_PREFERENCES.openrouterModelId,
    mcpProviders: normalizeMcpProviders(
      get<McpProviderConfig[]>(KEY_MCP_PROVIDERS),
      {
        enabled:
          get<boolean>(KEY_REFACTOR_MCP_ENABLED) ??
          DEFAULT_PREFERENCES.refactorMcpEnabled,
        context7Url:
          get<string>(KEY_CONTEXT7_URL) ?? DEFAULT_PREFERENCES.context7Url,
      },
    ),
    managedMcpPresets: normalizeManagedMcpPresets(
      get<ManagedMcpPresetConfig[]>(KEY_MANAGED_MCP_PRESETS),
    ),
    context7Url:
      get<string>(KEY_CONTEXT7_URL) ?? DEFAULT_PREFERENCES.context7Url,
    refactorMcpEnabled:
      get<boolean>(KEY_REFACTOR_MCP_ENABLED) ??
      DEFAULT_PREFERENCES.refactorMcpEnabled,
    favoriteModelIds: (
      get<string[]>(KEY_FAVORITE_MODELS) ??
      DEFAULT_PREFERENCES.favoriteModelIds
    ).filter(isKnownModelId),
    recentModelIds: (
      get<string[]>(KEY_RECENT_MODELS) ?? DEFAULT_PREFERENCES.recentModelIds
    ).filter(isKnownModelId),
    vimMode: get<boolean>(KEY_VIM_MODE) ?? DEFAULT_PREFERENCES.vimMode,
    showHidden:
      get<boolean>(KEY_SHOW_HIDDEN) ??
      get<boolean>(LEGACY_KEY_SHOW_HIDDEN_DIRS) ??
      DEFAULT_PREFERENCES.showHidden,
    terminalWebglEnabled:
      get<boolean>(KEY_TERMINAL_WEBGL_ENABLED) ??
      DEFAULT_PREFERENCES.terminalWebglEnabled,
    terminalFontFamily:
      get<string>(KEY_TERMINAL_FONT_FAMILY) ??
      DEFAULT_PREFERENCES.terminalFontFamily,
    terminalLetterSpacing:
      get<number>(KEY_TERMINAL_LETTER_SPACING) ??
      DEFAULT_PREFERENCES.terminalLetterSpacing,
    terminalFontSize:
      get<number>(KEY_TERMINAL_FONT_SIZE) ??
      DEFAULT_PREFERENCES.terminalFontSize,
    terminalScrollback: clampScrollback(
      get<number>(KEY_TERMINAL_SCROLLBACK) ??
        DEFAULT_PREFERENCES.terminalScrollback,
    ),
    lastWslDistro:
      get<string | null>(KEY_LAST_WSL_DISTRO) ??
      DEFAULT_PREFERENCES.lastWslDistro,
    zoomLevel: get<number>(KEY_ZOOM_LEVEL) ?? DEFAULT_PREFERENCES.zoomLevel,
    agentNotifications:
      get<boolean>(KEY_AGENT_NOTIFICATIONS) ??
      DEFAULT_PREFERENCES.agentNotifications,
    interactionSounds:
      get<boolean>(KEY_INTERACTION_SOUNDS) ??
      DEFAULT_PREFERENCES.interactionSounds,
    soundVolume: clampUnit(
      get<number>(KEY_SOUND_VOLUME) ?? DEFAULT_PREFERENCES.soundVolume,
    ),
    soundPitch: clampSoundPitch(
      get<number>(KEY_SOUND_PITCH) ?? DEFAULT_PREFERENCES.soundPitch,
    ),
    soundBody: clampUnit(
      get<number>(KEY_SOUND_BODY) ?? DEFAULT_PREFERENCES.soundBody,
    ),
    shortcuts:
      get<Record<ShortcutId, KeyBinding[]>>(KEY_SHORTCUTS) ??
      DEFAULT_PREFERENCES.shortcuts,
    editorAutoSave:
      get<boolean>(KEY_EDITOR_AUTO_SAVE) ??
      DEFAULT_PREFERENCES.editorAutoSave,
    editorAutoSaveDelay: clampAutoSaveDelay(
      get<number>(KEY_EDITOR_AUTO_SAVE_DELAY) ??
        DEFAULT_PREFERENCES.editorAutoSaveDelay,
    ),
  };
}

export async function setTheme(value: ThemePref): Promise<void> {
  await writePref(KEY_THEME, value);
}

export async function setUiLocale(value: UiLocale): Promise<void> {
  await writePref(KEY_UI_LOCALE, value);
}

export async function setThemeId(value: string): Promise<void> {
  await writePref(KEY_THEME_ID, value);
}

/** Slider stores 0..1. Actual rendered opacity is halved in SurfaceLayer
 *  so the image never exceeds 50% — keeps UI/terminal readable at any setting. */
export const BG_OPACITY_RENDER_FACTOR = 0.5;

function clampBgOpacity(v: number): number {
  if (!Number.isFinite(v)) return 0.7;
  return Math.min(1, Math.max(0, v));
}

function clampBlur(v: number): number {
  if (!Number.isFinite(v)) return 16;
  return Math.min(64, Math.max(0, Math.round(v)));
}

function normalizeLayoutMode(value: string | undefined): LayoutMode {
  if (
    value === "classic" ||
    value === "terminal-focus" ||
    value === "compact-ops"
  ) {
    return value;
  }
  return DEFAULT_PREFERENCES.layoutMode;
}

function normalizeAgentFamilyMode(
  value: string | undefined,
): AgentFamilyMode {
  return value === "cybersecurity" ? "cybersecurity" : "general";
}

function clampUnit(v: number): number {
  if (!Number.isFinite(v)) return 1;
  return Math.min(1, Math.max(0, v));
}

function clampSoundPitch(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_PREFERENCES.soundPitch;
  return Math.min(1.8, Math.max(0.45, v));
}

export async function setBackgroundKind(value: BackgroundKind): Promise<void> {
  await writePref(KEY_BG_KIND, value);
}

export async function setBackgroundImageId(value: string | null): Promise<void> {
  await writePref(KEY_BG_IMAGE_ID, value);
}

export async function setBackgroundBuiltinId(value: string | null): Promise<void> {
  await writePref(KEY_BG_BUILTIN_ID, value);
}

export async function setBackgroundOpacity(value: number): Promise<void> {
  await writePref(KEY_BG_OPACITY, clampBgOpacity(value));
}

export async function setBackgroundBlur(value: number): Promise<void> {
  await writePref(KEY_BG_BLUR, clampBlur(value));
}

export async function setLayoutMode(value: LayoutMode): Promise<void> {
  await writePref(KEY_LAYOUT_MODE, normalizeLayoutMode(value));
}

export async function setAgentFamilyMode(
  value: AgentFamilyMode,
): Promise<void> {
  await writePref(KEY_AGENT_FAMILY_MODE, normalizeAgentFamilyMode(value));
}


export async function setDefaultModel(value: ModelId): Promise<void> {
  await writePref(KEY_DEFAULT_MODEL, value);
}

export async function setEditorTheme(value: EditorThemeId): Promise<void> {
  await writePref(KEY_EDITOR_THEME, value);
}

export async function setCustomInstructions(value: string): Promise<void> {
  await writePref(KEY_CUSTOM_INSTRUCTIONS, value);
}

export async function setRefactorCustomInstructions(value: string): Promise<void> {
  await writePref(KEY_REFACTOR_CUSTOM_INSTRUCTIONS, value);
}

export async function setAutostart(value: boolean): Promise<void> {
  await writePref(KEY_AUTOSTART, value);
}

export async function setRestoreWindowState(value: boolean): Promise<void> {
  await writePref(KEY_RESTORE_WINDOW, value);
}

export async function setAutocompleteEnabled(value: boolean): Promise<void> {
  await writePref(KEY_AUTOCOMPLETE_ENABLED, value);
}

export async function setAutocompleteProvider(
  value: AutocompleteProviderId,
): Promise<void> {
  await writePref(KEY_AUTOCOMPLETE_PROVIDER, value);
}

export async function setAutocompleteModelId(value: string): Promise<void> {
  await writePref(KEY_AUTOCOMPLETE_MODEL, value);
}

export async function setLmstudioBaseURL(value: string): Promise<void> {
  await writePref(KEY_LMSTUDIO_BASE_URL, value);
}

export async function setLmstudioModelId(value: string): Promise<void> {
  await writePref(KEY_LMSTUDIO_MODEL_ID, value);
}

export async function setMlxBaseURL(value: string): Promise<void> {
  await writePref(KEY_MLX_BASE_URL, value);
}

export async function setMlxModelId(value: string): Promise<void> {
  await writePref(KEY_MLX_MODEL_ID, value);
}

export async function setOllamaBaseURL(value: string): Promise<void> {
  await writePref(KEY_OLLAMA_BASE_URL, value);
}

export async function setOllamaModelId(value: string): Promise<void> {
  await writePref(KEY_OLLAMA_MODEL_ID, value);
}

export async function setOpenaiCompatibleBaseURL(value: string): Promise<void> {
  await writePref(KEY_OPENAI_COMPAT_BASE_URL, value);
}

export async function setOpenaiCompatibleModelId(value: string): Promise<void> {
  await writePref(KEY_OPENAI_COMPAT_MODEL_ID, value);
}

export async function setOpenaiCompatibleContextLimit(
  value: number,
): Promise<void> {
  const clamped = Number.isFinite(value)
    ? Math.max(1_000, Math.round(value))
    : DEFAULT_PREFERENCES.openaiCompatibleContextLimit;
  await writePref(KEY_OPENAI_COMPAT_CONTEXT_LIMIT, clamped);
}

export async function setOpenrouterModelId(value: string): Promise<void> {
  await writePref(KEY_OPENROUTER_MODEL_ID, value);
}

export async function setMcpProviders(
  value: McpProviderConfig[],
): Promise<void> {
  const normalized = normalizeMcpProviders(value);
  await writePref(KEY_MCP_PROVIDERS, normalized);
  const context7 = getRemoteMcpProviderConfig(normalized, "context7");
  await writePref(KEY_CONTEXT7_URL, context7.url ?? DEFAULT_CONTEXT7_MCP_URL);
  const exa = getRemoteMcpProviderConfig(normalized, "exa");
  await writePref(
    KEY_REFACTOR_MCP_ENABLED,
    Boolean(exa.enabled || context7.enabled),
  );
}

export async function upsertMcpProvider(
  id: RemoteMcpProviderId,
  patch: Partial<McpProviderConfig>,
): Promise<void> {
  const prefs = await loadPreferences();
  const current = getRemoteMcpProviderConfig(prefs.mcpProviders, id);
  const next = normalizeMcpProviders(
    prefs.mcpProviders.map((entry) =>
      entry.id === id
        ? {
            ...current,
            ...patch,
            id,
          }
        : entry,
    ),
  );
  await setMcpProviders(next);
}

export async function setManagedMcpPresets(
  value: ManagedMcpPresetConfig[],
): Promise<void> {
  await writePref(KEY_MANAGED_MCP_PRESETS, normalizeManagedMcpPresets(value));
}

export async function upsertManagedMcpPreset(
  id: ManagedMcpPresetId,
  patch: Partial<ManagedMcpPresetConfig>,
): Promise<void> {
  const prefs = await loadPreferences();
  const current = getManagedMcpPresetConfig(prefs.managedMcpPresets, id);
  const next = normalizeManagedMcpPresets(
    prefs.managedMcpPresets.map((entry) =>
      entry.id === id
        ? {
            ...current,
            ...patch,
            id,
          }
        : entry,
    ),
  );
  await setManagedMcpPresets(next);
}

export async function setFirstRunSetupDone(value: boolean): Promise<void> {
  await writePref(KEY_FIRST_RUN_SETUP_DONE, value);
}

export async function setFirstRunTutorialDone(value: boolean): Promise<void> {
  await writePref(KEY_FIRST_RUN_TUTORIAL_DONE, value);
}

export async function setFirstRunRepoPath(value: string | null): Promise<void> {
  await writePref(KEY_FIRST_RUN_REPO_PATH, value);
}

export async function setProxyPresetId(value: string | null): Promise<void> {
  await writePref(KEY_PROXY_PRESET_ID, value);
}

export async function setProxyPresetPath(
  proxyId: string,
  value: string,
): Promise<void> {
  const prefs = await loadPreferences();
  const next = {
    ...prefs.proxyPresetPaths,
    [proxyId]: value.trim(),
  };
  await writePref(KEY_PROXY_PRESET_PATHS, next);
  if (proxyId === "deepsproxy") {
    await writePref(KEY_DEEPSPROXY_PATH, value.trim());
  }
  if (proxyId === "kimiproxy") {
    await writePref(KEY_KIMIPROXY_PATH, value.trim());
  }
}

export async function setDeepsproxyPath(value: string): Promise<void> {
  await setProxyPresetPath("deepsproxy", value);
}

export async function setKimiproxyPath(value: string): Promise<void> {
  await setProxyPresetPath("kimiproxy", value);
}

export async function setContext7Url(value: string): Promise<void> {
  const trimmed = value.trim() || DEFAULT_CONTEXT7_MCP_URL;
  await writePref(KEY_CONTEXT7_URL, trimmed);
  await upsertMcpProvider("context7", { url: trimmed });
}

export async function setRefactorMcpEnabled(value: boolean): Promise<void> {
  await writePref(KEY_REFACTOR_MCP_ENABLED, value);
  await setMcpProviders(
    normalizeMcpProviders([
      {
        ...getRemoteMcpProviderConfig(
          (await loadPreferences()).mcpProviders,
          "exa",
        ),
        enabled: value,
      },
      {
        ...getRemoteMcpProviderConfig(
          (await loadPreferences()).mcpProviders,
          "context7",
        ),
        enabled: value,
      },
    ]),
  );
}

export async function setFavoriteModelIds(value: string[]): Promise<void> {
  await writePref(KEY_FAVORITE_MODELS, value);
}

export async function setRecentModelIds(value: string[]): Promise<void> {
  await writePref(KEY_RECENT_MODELS, value);
}

export async function setVimMode(value: boolean): Promise<void> {
  await writePref(KEY_VIM_MODE, value);
}

export async function setShowHidden(value: boolean): Promise<void> {
  await writePref(KEY_SHOW_HIDDEN, value);
}

export async function setTerminalWebglEnabled(value: boolean): Promise<void> {
  await writePref(KEY_TERMINAL_WEBGL_ENABLED, value);
}

export async function setTerminalFontFamily(value: string): Promise<void> {
  await writePref(KEY_TERMINAL_FONT_FAMILY, value.trim());
}

export async function setTerminalLetterSpacing(value: number): Promise<void> {
  const clamped = Number.isFinite(value) ? Math.max(-10, Math.min(10, Math.round(value))) : 0;
  await writePref(KEY_TERMINAL_LETTER_SPACING, clamped);
}

export async function setTerminalFontSize(value: number): Promise<void> {
  const clamped = Number.isFinite(value)
    ? Math.min(
        TERMINAL_FONT_SIZE_MAX,
        Math.max(TERMINAL_FONT_SIZE_MIN, Math.round(value)),
      )
    : TERMINAL_FONT_SIZE_DEFAULT;
  await writePref(KEY_TERMINAL_FONT_SIZE, clamped);
}

function clampScrollback(value: number): number {
  if (!Number.isFinite(value)) return TERMINAL_SCROLLBACK_DEFAULT;
  return Math.min(
    TERMINAL_SCROLLBACK_MAX,
    Math.max(TERMINAL_SCROLLBACK_MIN, Math.round(value)),
  );
}

export async function setTerminalScrollback(value: number): Promise<void> {
  await writePref(KEY_TERMINAL_SCROLLBACK, clampScrollback(value));
}

export async function setLastWslDistro(value: string | null): Promise<void> {
  await writePref(KEY_LAST_WSL_DISTRO, value);
}

export async function setZoomLevel(value: number): Promise<void> {
  await writePref(KEY_ZOOM_LEVEL, value);
}

function clampAutoSaveDelay(v: number): number {
  if (!Number.isFinite(v)) return 1000;
  return Math.min(60000, Math.max(100, Math.round(v)));
}

export async function setEditorAutoSave(value: boolean): Promise<void> {
  await writePref(KEY_EDITOR_AUTO_SAVE, value);
}

export async function setEditorAutoSaveDelay(value: number): Promise<void> {
  await writePref(KEY_EDITOR_AUTO_SAVE_DELAY, clampAutoSaveDelay(value));
}

export async function setAgentNotifications(value: boolean): Promise<void> {
  await writePref(KEY_AGENT_NOTIFICATIONS, value);
}

export async function setInteractionSounds(value: boolean): Promise<void> {
  await writePref(KEY_INTERACTION_SOUNDS, value);
}

export async function setSoundVolume(value: number): Promise<void> {
  await writePref(KEY_SOUND_VOLUME, clampUnit(value));
}

export async function setSoundPitch(value: number): Promise<void> {
  await writePref(KEY_SOUND_PITCH, clampSoundPitch(value));
}

export async function setSoundBody(value: number): Promise<void> {
  await writePref(KEY_SOUND_BODY, clampUnit(value));
}

export async function setShortcuts(
  value: Record<ShortcutId, KeyBinding[]> | {},
): Promise<void> {
  await writePref(KEY_SHORTCUTS, value);
}

export async function resetShortcuts(): Promise<void> {
  await writePref(KEY_SHORTCUTS, DEFAULT_PREFERENCES.shortcuts);
}

export type PrefKey = keyof Preferences;

/** Subscribe to changes from any window (settings → main). */
export async function onPreferencesChange(
  cb: (key: PrefKey, value: unknown) => void,
): Promise<UnlistenFn> {
  const map: Record<string, PrefKey> = {
    [KEY_FIRST_RUN_SETUP_DONE]: "firstRunSetupDone",
    [KEY_FIRST_RUN_TUTORIAL_DONE]: "firstRunTutorialDone",
    [KEY_FIRST_RUN_REPO_PATH]: "firstRunRepoPath",
    [KEY_PROXY_PRESET_ID]: "proxyPresetId",
    [KEY_PROXY_PRESET_PATHS]: "proxyPresetPaths",
    [KEY_DEEPSPROXY_PATH]: "deepsproxyPath",
    [KEY_KIMIPROXY_PATH]: "kimiproxyPath",
    [KEY_THEME]: "theme",
    [KEY_UI_LOCALE]: "uiLocale",
    [KEY_THEME_ID]: "themeId",
    [KEY_BG_KIND]: "backgroundKind",
    [KEY_BG_IMAGE_ID]: "backgroundImageId",
    [KEY_BG_BUILTIN_ID]: "backgroundBuiltinId",
    [KEY_BG_OPACITY]: "backgroundOpacity",
    [KEY_BG_BLUR]: "backgroundBlur",
    [KEY_LAYOUT_MODE]: "layoutMode",
    [KEY_AGENT_FAMILY_MODE]: "agentFamilyMode",
    [KEY_DEFAULT_MODEL]: "defaultModelId",
    [KEY_EDITOR_THEME]: "editorTheme",
    [KEY_CUSTOM_INSTRUCTIONS]: "customInstructions",
    [KEY_REFACTOR_CUSTOM_INSTRUCTIONS]: "refactorCustomInstructions",
    [KEY_AUTOSTART]: "autostart",
    [KEY_RESTORE_WINDOW]: "restoreWindowState",
    [KEY_AUTOCOMPLETE_ENABLED]: "autocompleteEnabled",
    [KEY_AUTOCOMPLETE_PROVIDER]: "autocompleteProvider",
    [KEY_AUTOCOMPLETE_MODEL]: "autocompleteModelId",
    [KEY_LMSTUDIO_BASE_URL]: "lmstudioBaseURL",
    [KEY_LMSTUDIO_MODEL_ID]: "lmstudioModelId",
    [KEY_MLX_BASE_URL]: "mlxBaseURL",
    [KEY_MLX_MODEL_ID]: "mlxModelId",
    [KEY_OLLAMA_BASE_URL]: "ollamaBaseURL",
    [KEY_OLLAMA_MODEL_ID]: "ollamaModelId",
    [KEY_OPENAI_COMPAT_BASE_URL]: "openaiCompatibleBaseURL",
    [KEY_OPENAI_COMPAT_MODEL_ID]: "openaiCompatibleModelId",
    [KEY_OPENAI_COMPAT_CONTEXT_LIMIT]: "openaiCompatibleContextLimit",
    [KEY_OPENROUTER_MODEL_ID]: "openrouterModelId",
    [KEY_MCP_PROVIDERS]: "mcpProviders",
    [KEY_MANAGED_MCP_PRESETS]: "managedMcpPresets",
    [KEY_CONTEXT7_URL]: "context7Url",
    [KEY_REFACTOR_MCP_ENABLED]: "refactorMcpEnabled",
    [KEY_FAVORITE_MODELS]: "favoriteModelIds",
    [KEY_RECENT_MODELS]: "recentModelIds",
    [KEY_VIM_MODE]: "vimMode",
    [KEY_SHOW_HIDDEN]: "showHidden",
    [KEY_TERMINAL_WEBGL_ENABLED]: "terminalWebglEnabled",
    [KEY_TERMINAL_FONT_FAMILY]: "terminalFontFamily",
    [KEY_TERMINAL_LETTER_SPACING]: "terminalLetterSpacing",
    [KEY_TERMINAL_FONT_SIZE]: "terminalFontSize",
    [KEY_TERMINAL_SCROLLBACK]: "terminalScrollback",
    [KEY_LAST_WSL_DISTRO]: "lastWslDistro",
    [KEY_ZOOM_LEVEL]: "zoomLevel",
    [KEY_AGENT_NOTIFICATIONS]: "agentNotifications",
    [KEY_INTERACTION_SOUNDS]: "interactionSounds",
    [KEY_SOUND_VOLUME]: "soundVolume",
    [KEY_SOUND_PITCH]: "soundPitch",
    [KEY_SOUND_BODY]: "soundBody",
    [KEY_SHORTCUTS]: "shortcuts",
    [KEY_EDITOR_AUTO_SAVE]: "editorAutoSave",
    [KEY_EDITOR_AUTO_SAVE_DELAY]: "editorAutoSaveDelay",
  };

  const unsubLocal = await store.onChange<unknown>((key, value) => {
    const mapped = map[key];
    if (mapped) cb(mapped, value);
  });
  const unsubEvent = await listen<{ key: string; value: unknown }>(
    PREFS_CHANGED_EVENT,
    (e) => {
      const mapped = map[e.payload.key];
      if (mapped) cb(mapped, e.payload.value);
    },
  );
  return () => {
    unsubLocal();
    unsubEvent();
  };
}

const KEYS_CHANGED_EVENT = "javarf://ai-keys-changed";

export async function emitKeysChanged(): Promise<void> {
  await emit(KEYS_CHANGED_EVENT);
}

export function onKeysChanged(cb: () => void): Promise<UnlistenFn> {
  return listen(KEYS_CHANGED_EVENT, () => cb());
}
