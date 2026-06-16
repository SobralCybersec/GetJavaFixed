import { isTauriRuntime } from "@/lib/runtime";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

export async function openUrl(url: string): Promise<void> {
  if (typeof window === "undefined" || !isTauriRuntime) {
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return;
  }

  await tauriOpenUrl(url);
}
