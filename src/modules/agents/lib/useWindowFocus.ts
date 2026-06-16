import { isTauriRuntime } from "@/lib/runtime";
import { useEffect, useState } from "react";

export function useWindowFocus(): boolean {
  const [focused, setFocused] = useState(true);

  useEffect(() => {
    if (!isTauriRuntime) {
      setFocused(document.hasFocus());

      const onFocus = () => setFocused(true);
      const onBlur = () => setFocused(false);

      window.addEventListener("focus", onFocus);
      window.addEventListener("blur", onBlur);

      return () => {
        window.removeEventListener("focus", onFocus);
        window.removeEventListener("blur", onBlur);
      };
    }

    let cancelled = false;
    let unlistenFocus: (() => void) | undefined;

    async function init() {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const appWindow = getCurrentWindow();

      const isFocused = await appWindow.isFocused();
      if (!cancelled) setFocused(isFocused);

      unlistenFocus = await appWindow.onFocusChanged(({ payload }) => {
        setFocused(payload);
      });
    }

    void init();

    return () => {
      cancelled = true;
      unlistenFocus?.();
    };
  }, []);

  return focused;
}
