import { useEffect } from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useManagedMcpStore } from "@/modules/ai/lib/managedMcp";
import { I18nProvider } from "@/modules/i18n";
import { InteractionSoundBridge } from "@/modules/sound/interactionSounds";
import { ThemeProvider } from "@/modules/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ManagedMcpBootstrap />
        <InteractionSoundBridge />
        {children}
      </ThemeProvider>
    </I18nProvider>
  );
}

function ManagedMcpBootstrap() {
  const hydrated = usePreferencesStore((state) => state.hydrated);
  const managedMcpPresets = usePreferencesStore((state) => state.managedMcpPresets);
  const init = useManagedMcpStore((state) => state.init);
  const refreshAll = useManagedMcpStore((state) => state.refreshAll);

  useEffect(() => {
    if (!hydrated) return;
    void init();
  }, [hydrated, init]);

  useEffect(() => {
    if (!hydrated) return;
    void refreshAll();
  }, [hydrated, managedMcpPresets, refreshAll]);

  return null;
}
