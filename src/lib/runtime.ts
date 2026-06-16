export const isTauriRuntime =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const isBrowserPreview = import.meta.env.DEV && !isTauriRuntime;
