import { isBrowserPreview } from "@/lib/runtime";
import { invoke } from "@tauri-apps/api/core";

export type SettingsTab =
  | "general"
  | "themes"
  | "shortcuts"
  | "models"
  | "agents"
  | "refactor"
  | "about";

export async function openSettingsWindow(tab?: SettingsTab): Promise<void> {
  if (isBrowserPreview) {
    const url = new URL("/settings.html", window.location.origin);
    if (tab) url.searchParams.set("tab", tab);
    window.location.assign(url.toString());
    return;
  }

  await invoke("open_settings_window", { tab: tab ?? null });
}
