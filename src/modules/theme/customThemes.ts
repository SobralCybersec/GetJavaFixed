import {
  readBrowserStoreValue,
  writeBrowserStoreValue,
} from "@/lib/browserJsonStore";
import { isTauriRuntime } from "@/lib/runtime";
import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";
import { LazyStore } from "@tauri-apps/plugin-store";
import type { Theme } from "./types";

const STORE_PATH = "javarf-custom-themes.json";
const KEY = "themes";
const CHANGED_EVENT = "javarf://custom-themes-changed";

const store = new LazyStore(STORE_PATH, { defaults: {}, autoSave: 200 });

function emitBrowserChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

export async function listCustomThemes(): Promise<Theme[]> {
  if (!isTauriRuntime) {
    const v = readBrowserStoreValue<Theme[]>(STORE_PATH, KEY);
    return Array.isArray(v) ? v : [];
  }
  const v = await store.get<Theme[]>(KEY);
  return Array.isArray(v) ? v : [];
}

export async function saveCustomTheme(theme: Theme): Promise<void> {
  const current = await listCustomThemes();
  const next = current.filter((t) => t.id !== theme.id).concat(theme);
  if (!isTauriRuntime) {
    writeBrowserStoreValue(STORE_PATH, KEY, next);
    emitBrowserChange();
    return;
  }
  await store.set(KEY, next);
  await store.save();
  await emit(CHANGED_EVENT);
}

export async function deleteCustomTheme(id: string): Promise<void> {
  const current = await listCustomThemes();
  const next = current.filter((t) => t.id !== id);
  if (next.length === current.length) return;
  if (!isTauriRuntime) {
    writeBrowserStoreValue(STORE_PATH, KEY, next);
    emitBrowserChange();
    return;
  }
  await store.set(KEY, next);
  await store.save();
  await emit(CHANGED_EVENT);
}

export async function onCustomThemesChange(cb: () => void): Promise<UnlistenFn> {
  if (!isTauriRuntime) {
    if (typeof window === "undefined") return () => {};
    const handler = () => cb();
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }
  const unsubLocal = await store.onChange((key) => {
    if (key === KEY) cb();
  });
  const unsubEvent = await listen(CHANGED_EVENT, () => cb());
  return () => {
    unsubLocal();
    unsubEvent();
  };
}
