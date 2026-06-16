const MAX_READ_BYTES = 10 * 1024 * 1024;
const BINARY_SNIFF_BYTES = 8 * 1024;
const MAX_SCANNED = 50_000;
const HANDLE_DB_NAME = "javarf-browser-workspace";
const HANDLE_STORE_NAME = "workspace-handles";
const HANDLE_KEY = "current";
const PRUNE_DIRS = new Set([
  "node_modules",
  ".git",
  "target",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  ".venv",
  "__pycache__",
]);

export type BrowserDirEntry = {
  name: string;
  kind: "file" | "dir" | "symlink";
  size: number;
  mtime: number;
};

export type BrowserReadResult =
  | { kind: "text"; content: string; size: number }
  | { kind: "binary"; size: number }
  | { kind: "toolarge"; size: number; limit: number };

export type BrowserSearchHit = {
  path: string;
  rel: string;
  name: string;
  is_dir: boolean;
};

export type BrowserSearchResult = {
  hits: BrowserSearchHit[];
  truncated: boolean;
};

let workspaceHandle: FileSystemDirectoryHandle | null = null;
let workspacePath: string | null = null;

type DirectoryEntriesHandle = FileSystemDirectoryHandle & {
  entries(): AsyncIterable<[string, FileSystemHandle]>;
};

type PermissionHandle = FileSystemDirectoryHandle & {
  queryPermission?: (options?: {
    mode?: "read" | "readwrite";
  }) => Promise<"granted" | "denied" | "prompt">;
};

type StoredWorkspaceHandle = {
  path: string;
  handle: FileSystemDirectoryHandle;
};

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function compareCaseInsensitiveAscii(left: string, right: string): number {
  const leftLower = left.toLowerCase();
  const rightLower = right.toLowerCase();
  if (leftLower < rightLower) return -1;
  if (leftLower > rightLower) return 1;
  return 0;
}

function browserIndexedDb(): IDBFactory | null {
  if (typeof indexedDB === "undefined") return null;
  return indexedDB;
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function readRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function openHandleDb(): Promise<IDBDatabase | null> {
  const factory = browserIndexedDb();
  if (!factory) return null;
  return new Promise((resolve, reject) => {
    const request = factory.open(HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HANDLE_STORE_NAME)) {
        database.createObjectStore(HANDLE_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open browser workspace db"));
  });
}

async function persistWorkspaceHandle(
  path: string,
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  const database = await openHandleDb();
  if (!database) return;
  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, "readwrite");
    transaction
      .objectStore(HANDLE_STORE_NAME)
      .put({ path: normalizePath(path), handle }, HANDLE_KEY);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

async function readPersistedWorkspaceHandle(): Promise<StoredWorkspaceHandle | null> {
  const database = await openHandleDb();
  if (!database) return null;
  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, "readonly");
    const value = await readRequest<unknown>(
      transaction.objectStore(HANDLE_STORE_NAME).get(HANDLE_KEY),
    );
    await waitForTransaction(transaction);
    if (!value || typeof value !== "object") return null;
    const stored = value as Partial<StoredWorkspaceHandle>;
    if (
      typeof stored.path !== "string" ||
      !stored.handle ||
      stored.handle.kind !== "directory"
    ) {
      return null;
    }
    return { path: normalizePath(stored.path), handle: stored.handle };
  } finally {
    database.close();
  }
}

async function deletePersistedWorkspaceHandle(): Promise<void> {
  const database = await openHandleDb();
  if (!database) return;
  try {
    const transaction = database.transaction(HANDLE_STORE_NAME, "readwrite");
    transaction.objectStore(HANDLE_STORE_NAME).delete(HANDLE_KEY);
    await waitForTransaction(transaction);
  } finally {
    database.close();
  }
}

async function readHandlePermission(
  handle: FileSystemDirectoryHandle,
): Promise<"granted" | "denied" | "prompt"> {
  const permissionHandle = handle as PermissionHandle;
  if (typeof permissionHandle.queryPermission !== "function") return "granted";
  try {
    const readState = await permissionHandle.queryPermission({ mode: "read" });
    if (readState === "granted") return "granted";
    const writeState = await permissionHandle.queryPermission({
      mode: "readwrite",
    });
    return writeState === "granted" ? "granted" : readState;
  } catch {
    return "prompt";
  }
}

function requireWorkspace(): {
  handle: FileSystemDirectoryHandle;
  path: string;
} {
  if (!workspaceHandle || !workspacePath) {
    throw new Error("Browser workspace unavailable. Re-select repository.");
  }
  return { handle: workspaceHandle, path: workspacePath };
}

function relativeParts(path: string): string[] {
  const { path: rootPath } = requireWorkspace();
  const normalized = normalizePath(path);
  if (normalized === rootPath) return [];
  if (normalized.startsWith(`${rootPath}/`)) {
    return normalized
      .slice(rootPath.length + 1)
      .split("/")
      .filter(Boolean);
  }
  throw new Error(`Path outside browser workspace: ${path}`);
}

async function getDirectoryHandleForPath(
  path: string,
): Promise<FileSystemDirectoryHandle> {
  let handle = requireWorkspace().handle;
  for (const part of relativeParts(path)) {
    handle = await handle.getDirectoryHandle(part);
  }
  return handle;
}

async function getFileHandleForPath(path: string): Promise<FileSystemFileHandle> {
  const parts = relativeParts(path);
  const fileName = parts.pop();
  if (!fileName) throw new Error(`Not a file path: ${path}`);
  let handle = requireWorkspace().handle;
  for (const part of parts) {
    handle = await handle.getDirectoryHandle(part);
  }
  return handle.getFileHandle(fileName);
}

function sortDirEntries(entries: BrowserDirEntry[]): void {
  entries.sort((left, right) => {
    const leftRank = left.kind === "dir" ? 0 : left.kind === "symlink" ? 1 : 2;
    const rightRank = right.kind === "dir" ? 0 : right.kind === "symlink" ? 1 : 2;
    return leftRank - rightRank || compareCaseInsensitiveAscii(left.name, right.name);
  });
}

function hasBinaryNull(bytes: Uint8Array): boolean {
  const sniff = bytes.subarray(0, Math.min(bytes.length, BINARY_SNIFF_BYTES));
  return sniff.includes(0);
}

async function walkSearch(
  handle: FileSystemDirectoryHandle,
  relPrefix: string,
  query: string,
  showHidden: boolean,
  cap: number,
  out: BrowserSearchHit[],
  state: { scanned: number; truncated: boolean },
): Promise<void> {
  const entries: Array<{ name: string; handle: FileSystemHandle }> = [];
  for await (const [name, childHandle] of (handle as DirectoryEntriesHandle).entries()) {
    entries.push({ name, handle: childHandle });
  }
  entries.sort((left, right) => compareCaseInsensitiveAscii(left.name, right.name));

  for (const entry of entries) {
    if (state.truncated) return;
    state.scanned += 1;
    if (state.scanned > MAX_SCANNED || out.length >= cap) {
      state.truncated = true;
      return;
    }
    if (entry.name.startsWith(".") && !showHidden) continue;

    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const relLower = rel.toLowerCase();
    const isDir = entry.handle.kind === "directory";

    if (relLower.includes(query)) {
      out.push({
        path: `${requireWorkspace().path}/${rel}`,
        rel,
        name: entry.name,
        is_dir: isDir,
      });
      if (out.length >= cap) {
        state.truncated = true;
        return;
      }
    }

    if (isDir && !PRUNE_DIRS.has(entry.name)) {
      await walkSearch(
        entry.handle as FileSystemDirectoryHandle,
        rel,
        query,
        showHidden,
        cap,
        out,
        state,
      );
    }
  }
}

export function setBrowserWorkspaceHandle(
  path: string,
  handle: FileSystemDirectoryHandle,
): void {
  workspaceHandle = handle;
  workspacePath = normalizePath(path || handle.name);
  void persistWorkspaceHandle(workspacePath, handle).catch(() => {});
}

export function clearBrowserWorkspaceHandle(): void {
  workspaceHandle = null;
  workspacePath = null;
  void deletePersistedWorkspaceHandle().catch(() => {});
}

export function hasBrowserWorkspaceHandle(path?: string | null): boolean {
  if (!workspaceHandle || !workspacePath) return false;
  if (!path) return true;
  return normalizePath(path) === workspacePath;
}

export async function restoreBrowserWorkspaceHandle(
  path?: string | null,
): Promise<boolean> {
  try {
    const expectedPath = path ? normalizePath(path) : null;
    if (expectedPath && hasBrowserWorkspaceHandle(expectedPath)) {
      return true;
    }

    const stored = await readPersistedWorkspaceHandle();
    if (!stored) return false;
    if (expectedPath && stored.path !== expectedPath) return false;

    const permission = await readHandlePermission(stored.handle);
    if (permission !== "granted") return false;

    workspaceHandle = stored.handle;
    workspacePath = stored.path;
    return true;
  } catch {
    return false;
  }
}

export async function browserReadDir(
  path: string,
  showHidden: boolean,
): Promise<BrowserDirEntry[]> {
  const handle = await getDirectoryHandleForPath(path);
  const entries: BrowserDirEntry[] = [];

  for await (const [name, childHandle] of (handle as DirectoryEntriesHandle).entries()) {
    if (name.startsWith(".") && !showHidden) continue;
    if (childHandle.kind === "directory") {
      entries.push({ name, kind: "dir", size: 0, mtime: 0 });
      continue;
    }
    const file = await (childHandle as FileSystemFileHandle).getFile();
    entries.push({
      name,
      kind: "file",
      size: file.size,
      mtime: file.lastModified,
    });
  }

  sortDirEntries(entries);
  return entries;
}

export async function browserReadFile(path: string): Promise<BrowserReadResult> {
  const file = await (await getFileHandleForPath(path)).getFile();
  if (file.size > MAX_READ_BYTES) {
    return { kind: "toolarge", size: file.size, limit: MAX_READ_BYTES };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (hasBinaryNull(bytes)) {
    return { kind: "binary", size: file.size };
  }
  try {
    const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { kind: "text", content, size: file.size };
  } catch {
    return { kind: "binary", size: file.size };
  }
}

export async function browserWriteFile(
  path: string,
  content: string,
): Promise<void> {
  const handle = await getFileHandleForPath(path);
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
  } finally {
    await writable.close();
  }
}

export async function browserSearchFiles(args: {
  root: string;
  query: string;
  limit: number;
  showHidden: boolean;
}): Promise<BrowserSearchResult> {
  const trimmed = args.query.trim().toLowerCase();
  if (!trimmed) return { hits: [], truncated: false };

  const cap = Math.max(1, Math.min(args.limit, 1000));
  const handle = await getDirectoryHandleForPath(args.root);
  const hits: BrowserSearchHit[] = [];
  const state = { scanned: 0, truncated: false };

  await walkSearch(handle, "", trimmed, args.showHidden, cap, hits, state);

  hits.sort((left, right) => {
    const leftName = left.name.toLowerCase().includes(trimmed);
    const rightName = right.name.toLowerCase().includes(trimmed);
    return Number(rightName) - Number(leftName) || left.rel.length - right.rel.length;
  });

  return { hits, truncated: state.truncated };
}
