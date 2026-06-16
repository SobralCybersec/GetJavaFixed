import { WindowControls } from "@/components/WindowControls";
import { isTauriRuntime } from "@/lib/runtime";
import { cn } from "@/lib/utils";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "@/lib/platform";
import { useI18n } from "@/modules/i18n";
import type { SettingsTab } from "@/modules/settings/openSettingsWindow";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  AiScanIcon,
  InformationCircleIcon,
  PaintBoardIcon,
  Settings01Icon,
  UserMultiple02Icon,
  KeyboardIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { JSX, useEffect, useState } from "react";
import { AboutSection } from "./sections/AboutSection";
import { AgentsSection } from "./sections/AgentsSection";
import { GeneralSection } from "./sections/GeneralSection";
import { ModelsSection } from "./sections/ModelsSection";
import { ShortcutsSection } from "./sections/ShortcutsSection";
import { ThemesSection } from "./sections/ThemesSection";
import { RefactorSection } from "./sections/RefactorSection";

const VALID_TABS: SettingsTab[] = [
  "general",
  "themes",
  "shortcuts",
  "models",
  "agents",
  "refactor",
  "about",
];

function readInitialTab(): SettingsTab {
  if (typeof window === "undefined") return "general";
  const url = new URL(window.location.href);
  const t = url.searchParams.get("tab");
  if (t === "ai" || t === "connections") return "models";
  if (t && (VALID_TABS as string[]).includes(t)) return t as SettingsTab;
  return "general";
}

export function SettingsApp() {
  const { t } = useI18n();
  const [active, setActive] = useState<SettingsTab>(readInitialTab);
  const init = usePreferencesStore((s) => s.init);
  const tabs: {
    id: SettingsTab;
    label: string;
    icon: typeof Settings01Icon;
    component: () => JSX.Element;
  }[] = [
    {
      id: "general",
      label: t("settings.tabs.general"),
      icon: Settings01Icon,
      component: GeneralSection,
    },
    {
      id: "themes",
      label: t("settings.tabs.themes"),
      icon: PaintBoardIcon,
      component: ThemesSection,
    },
    {
      id: "shortcuts",
      label: t("settings.tabs.shortcuts"),
      icon: KeyboardIcon,
      component: ShortcutsSection,
    },
    {
      id: "models",
      label: t("settings.tabs.models"),
      icon: AiScanIcon,
      component: ModelsSection,
    },
    {
      id: "agents",
      label: t("settings.tabs.agents"),
      icon: UserMultiple02Icon,
      component: AgentsSection,
    },
    {
      id: "refactor",
      label: t("settings.tabs.refactor", { defaultValue: "Refactor" }),
      icon: SparklesIcon,
      component: RefactorSection,
    },
    {
      id: "about",
      label: t("settings.tabs.about"),
      icon: InformationCircleIcon,
      component: AboutSection,
    },
  ];
  const ActiveSection = tabs.find((tab) => tab.id === active)?.component;

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!isTauriRuntime) return;
    const apply = (detail: string) => {
      if (detail === "ai" || detail === "connections") {
        setActive("models");
        return;
      }
      if ((VALID_TABS as string[]).includes(detail)) {
        setActive(detail as SettingsTab);
      }
    };
    const unlistenPromise = getCurrentWebviewWindow().listen<string>(
      "javarf:settings-tab",
      (e) => apply(e.payload),
    );
    return () => {
      void unlistenPromise.then((un) => un());
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground select-none">
      <header
        data-tauri-drag-region
        className={`flex h-11 shrink-0 items-center justify-between border-b border-border/60 bg-card/60 ${IS_MAC ? "pr-3 pl-22" : "pr-0 pl-3"
          }`}
      >
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={1.75} />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {t("settings.title")}
          </span>
        </div>
        {USE_CUSTOM_WINDOW_CONTROLS && <WindowControls closeOnly />}
      </header>

      <main className="flex min-h-0 flex-1">
        <nav className="w-48 shrink-0 border-r border-border/60 bg-card/35 p-2">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-md px-2 text-left text-[12px] transition-colors",
                  active === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/45 hover:text-foreground",
                )}
              >
                <HugeiconsIcon icon={tab.icon} size={14} strokeWidth={1.75} />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
        <section className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-full max-w-190">
          {ActiveSection && <ActiveSection />}
          </div>
        </section>
      </main>
    </div>
  );
}
