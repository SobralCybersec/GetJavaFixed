import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./runtime";

let cached: string | undefined;

export async function initLaunchDir(): Promise<void> {
  if (!isTauriRuntime) {
    cached = undefined;
    return;
  }
  const dir =
    (await invoke<string | null>("get_launch_dir").catch(() => null)) ??
    (await invoke<string>("workspace_current_dir").catch(() => null));
  cached = dir ? dir.replace(/\\/g, "/") : undefined;
}

export function getLaunchDir(): string | undefined {
  return cached;
}
