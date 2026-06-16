type StoreShape = Record<string, unknown>;

const PREFIX = "javarf:browser-store:";

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function storageKey(path: string): string {
  return `${PREFIX}${path}`;
}

export function readBrowserStore(path: string): StoreShape {
  const store = storage();
  if (!store) return {};
  try {
    const parsed = JSON.parse(store.getItem(storageKey(path)) ?? "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StoreShape)
      : {};
  } catch {
    return {};
  }
}

export function readBrowserStoreEntries(path: string): [string, unknown][] {
  return Object.entries(readBrowserStore(path));
}

export function readBrowserStoreValue<T>(
  path: string,
  key: string,
): T | undefined {
  return readBrowserStore(path)[key] as T | undefined;
}

export function writeBrowserStoreValue(
  path: string,
  key: string,
  value: unknown,
): void {
  const store = storage();
  if (!store) return;
  const data = readBrowserStore(path);
  data[key] = value;
  store.setItem(storageKey(path), JSON.stringify(data));
}

export function deleteBrowserStoreValue(path: string, key: string): void {
  const store = storage();
  if (!store) return;
  const data = readBrowserStore(path);
  delete data[key];
  store.setItem(storageKey(path), JSON.stringify(data));
}
