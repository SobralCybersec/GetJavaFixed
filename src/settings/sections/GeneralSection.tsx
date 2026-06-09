import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useI18n, type UiLocale } from "@/modules/i18n";
import { usePreferencesStore } from "@/modules/settings/preferences";
import type { ThemePref } from "@/modules/settings/store";
import {
  TERMINAL_FONT_SIZES,
  TERMINAL_SCROLLBACK_PRESETS,
  setAgentNotifications,
  setAutostart,
  setEditorAutoSave,
  setEditorAutoSaveDelay,
  setInteractionSounds,
  setRestoreWindowState,
  setShowHidden,
  setTerminalFontFamily,
  setTerminalLetterSpacing,
  setTerminalFontSize,
  setTerminalScrollback,
  setTerminalWebglEnabled,
  setUiLocale,
  setVimMode,
  setZoomLevel,
} from "@/modules/settings/store";
import { useTheme } from "@/modules/theme";
import {
  ComputerIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { SettingRow } from "../components/SettingRow";

const APPEARANCE: {
  id: ThemePref;
  icon: typeof ComputerIcon;
}[] = [
  { id: "system", icon: ComputerIcon },
  { id: "light", icon: Sun03Icon },
  { id: "dark", icon: Moon02Icon },
];

const LETTER_SPACINGS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.05;
const AUTO_SAVE_STEP = 100;
const AUTO_SAVE_MIN = 100;
const AUTO_SAVE_MAX = 60000;

export function GeneralSection() {
  const { t } = useI18n();
  const { mode, setMode } = useTheme();

  const uiLocale = usePreferencesStore((s) => s.uiLocale);
  const autostart = usePreferencesStore((s) => s.autostart);
  const restoreWindowState = usePreferencesStore((s) => s.restoreWindowState);
  const vimMode = usePreferencesStore((s) => s.vimMode);
  const editorAutoSave = usePreferencesStore((s) => s.editorAutoSave);
  const editorAutoSaveDelay = usePreferencesStore((s) => s.editorAutoSaveDelay);
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const terminalWebglEnabled = usePreferencesStore(
    (s) => s.terminalWebglEnabled,
  );
  const terminalFontFamily = usePreferencesStore((s) => s.terminalFontFamily);
  const terminalLetterSpacing = usePreferencesStore(
    (s) => s.terminalLetterSpacing,
  );
  const terminalFontSize = usePreferencesStore((s) => s.terminalFontSize);
  const terminalScrollback = usePreferencesStore((s) => s.terminalScrollback);
  const zoomLevel = usePreferencesStore((s) => s.zoomLevel);
  const agentNotifications = usePreferencesStore((s) => s.agentNotifications);
  const interactionSounds = usePreferencesStore((s) => s.interactionSounds);

  const appearanceLabels: Record<ThemePref, string> = {
    system: t("general.appearance.system"),
    light: t("general.appearance.light"),
    dark: t("general.appearance.dark"),
  };
  const localeOptions: { id: UiLocale; label: string }[] = [
    { id: "system", label: t("general.language.system") },
    { id: "en", label: t("general.language.english") },
    { id: "pt-BR", label: t("general.language.portuguese") },
  ];

  useEffect(() => {
    let alive = true;
    void isEnabled()
      .then((on) => {
        if (!alive) return;
        if (on !== usePreferencesStore.getState().autostart) {
          void setAutostart(on);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const onToggleAutostart = async (next: boolean) => {
    try {
      if (next) await enable();
      else await disable();
      await setAutostart(next);
    } catch (error) {
      console.error("autostart toggle failed", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={t("general.title")}
        description={t("general.description")}
      />

      <div className="flex flex-col gap-2">
        <Label>{t("general.appearance")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={cn(
                "group flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border bg-card transition-all",
                mode === option.id
                  ? "border-foreground/60 ring-1 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              <HugeiconsIcon icon={option.icon} size={18} strokeWidth={1.5} />
              <span className="text-[11.5px]">{appearanceLabels[option.id]}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          {t("general.appearance.hint")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.language")}</Label>
        <SettingRow
          title={t("general.language.title")}
          description={t("general.language.description")}
        >
          <Select
            value={uiLocale}
            onValueChange={(value) => void setUiLocale(value as UiLocale)}
          >
            <SelectTrigger size="sm" className="h-8 w-44 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {localeOptions.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="text-[12px]"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.zoom")}</Label>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] text-muted-foreground">
              {t("general.zoom.level")}
            </span>
            <span className="tabular-nums text-[11px] text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>
          <Slider
            value={[zoomLevel]}
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            onValueChange={(value) => void setZoomLevel(value[0] ?? 1)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.editor")}</Label>
        <SettingRow
          title={t("general.editor.vim.title")}
          description={t("general.editor.vim.description")}
        >
          <Switch
            checked={vimMode}
            onCheckedChange={(value) => void setVimMode(value)}
          />
        </SettingRow>
        <SettingRow
          title={t("general.editor.autosave.title")}
          description={t("general.editor.autosave.description")}
        >
          <Switch
            checked={editorAutoSave}
            onCheckedChange={(value) => void setEditorAutoSave(value)}
          />
        </SettingRow>
        {editorAutoSave ? (
          <AutoSaveDelayInput
            value={editorAutoSaveDelay}
            onChange={(value) => void setEditorAutoSaveDelay(value)}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.explorer")}</Label>
        <SettingRow
          title={t("general.explorer.hidden.title")}
          description={t("general.explorer.hidden.description")}
        >
          <Switch
            checked={showHidden}
            onCheckedChange={(value) => void setShowHidden(value)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.terminal")}</Label>
        <SettingRow
          title={
            <span className="inline-flex items-center gap-1.5">
              {t("general.terminal.webgl.title")}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="cursor-help text-[11px] leading-none text-muted-foreground/70"
                      aria-label="More info about WebGL renderer"
                    >
                      i
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="max-w-65 text-[11px]"
                  >
                    {t("general.terminal.webgl.info")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          }
          description={t("general.terminal.webgl.description")}
        >
          <Switch
            checked={terminalWebglEnabled}
            onCheckedChange={(value) => void setTerminalWebglEnabled(value)}
          />
        </SettingRow>
        <SettingRow
          title={t("general.terminal.fontFamily.title")}
          description={t("general.terminal.fontFamily.description")}
        >
          <input
            type="text"
            value={terminalFontFamily}
            placeholder={t("general.terminal.fontFamily.placeholder")}
            onChange={(event) => void setTerminalFontFamily(event.target.value)}
            className="h-8 w-48 rounded-md border border-border bg-background px-2.5 text-[12px] outline-none focus:border-foreground/40"
          />
        </SettingRow>
        <SettingRow
          title={t("general.terminal.letterSpacing.title")}
          description={t("general.terminal.letterSpacing.description")}
        >
          <Select
            value={String(terminalLetterSpacing)}
            onValueChange={(value) => void setTerminalLetterSpacing(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LETTER_SPACINGS.map((value) => (
                <SelectItem key={value} value={String(value)} className="text-[12px]">
                  {value > 0 ? `+${value}` : value} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          title={t("general.terminal.fontSize.title")}
          description={t("general.terminal.fontSize.description")}
        >
          <Select
            value={String(terminalFontSize)}
            onValueChange={(value) => void setTerminalFontSize(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-28 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_FONT_SIZES.map((size) => (
                <SelectItem
                  key={size}
                  value={String(size)}
                  className="text-[12px]"
                >
                  {size} px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          title={t("general.terminal.scrollback.title")}
          description={t("general.terminal.scrollback.description")}
        >
          <Select
            value={String(terminalScrollback)}
            onValueChange={(value) => void setTerminalScrollback(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-36 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TERMINAL_SCROLLBACK_PRESETS.map((lines) => (
                <SelectItem
                  key={lines}
                  value={String(lines)}
                  className="text-[12px]"
                >
                  {lines.toLocaleString()} lines
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.agents")}</Label>
        <SettingRow
          title={t("general.agents.notifications.title")}
          description={t("general.agents.notifications.description")}
        >
          <Switch
            checked={agentNotifications}
            onCheckedChange={(value) => void setAgentNotifications(value)}
          />
        </SettingRow>
        <SettingRow
          title={t("general.agents.sounds.title")}
          description={t("general.agents.sounds.description")}
        >
          <Switch
            checked={interactionSounds}
            onCheckedChange={(value) => void setInteractionSounds(value)}
          />
        </SettingRow>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("general.startup")}</Label>
        <div className="flex flex-col gap-2">
          <SettingRow
            title={t("general.startup.autostart.title")}
            description={t("general.startup.autostart.description")}
          >
            <Switch
              checked={autostart}
              onCheckedChange={(value) => void onToggleAutostart(value)}
            />
          </SettingRow>
          <SettingRow
            title={t("general.startup.restoreWindow.title")}
            description={t("general.startup.restoreWindow.description")}
          >
            <Switch
              checked={restoreWindowState}
              onCheckedChange={(value) => void setRestoreWindowState(value)}
            />
          </SettingRow>
        </div>
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

function AutoSaveDelayInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(
      AUTO_SAVE_MAX,
      Math.max(AUTO_SAVE_MIN, Math.round(parsed)),
    );
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <SettingRow
      title={t("general.editor.autosaveDelay.title")}
      description={t("general.editor.autosaveDelay.description")}
    >
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={AUTO_SAVE_MIN}
          max={AUTO_SAVE_MAX}
          step={AUTO_SAVE_STEP}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 w-20 rounded-md border border-border bg-background px-2.5 text-right text-[12px] tabular-nums outline-none focus:border-foreground/40 focus-visible:border-foreground/40 focus-visible:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-[11px] text-muted-foreground">ms</span>
      </div>
    </SettingRow>
  );
}
