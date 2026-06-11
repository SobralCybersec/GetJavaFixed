import { useEffect, useState } from "react";

const AUTO_APPLY_KEY = "javarf.refactor.autoApply";
const AUTO_COMMIT_KEY = "javarf.refactor.autoCommit";
const AUTO_PUSH_KEY = "javarf.refactor.autoPush";
const CHANGE_EVENT = "javarf:refactor-automation-change";

export type RefactorAutomationPrefs = {
  autoApply: boolean;
  autoCommit: boolean;
  autoPush: boolean;
};

function readBoolean(key: string, fallback = false): boolean {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? fallback : stored === "true";
  } catch {
    return fallback;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
  }
}

export function readRefactorAutomationPrefs(): RefactorAutomationPrefs {
  const autoApply = readBoolean(AUTO_APPLY_KEY);
  const autoCommit = autoApply && readBoolean(AUTO_COMMIT_KEY);
  const autoPush = autoApply && autoCommit && readBoolean(AUTO_PUSH_KEY);
  return { autoApply, autoCommit, autoPush };
}

export function useRefactorAutomationPrefs() {
  const [prefs, setPrefs] = useState(readRefactorAutomationPrefs);

  useEffect(() => {
    const sync = () => setPrefs(readRefactorAutomationPrefs());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setAutoApply = (next: boolean) => {
    writeBoolean(AUTO_APPLY_KEY, next);
    if (!next) {
      writeBoolean(AUTO_COMMIT_KEY, false);
      writeBoolean(AUTO_PUSH_KEY, false);
    }
    setPrefs(readRefactorAutomationPrefs());
  };
  const setAutoCommit = (next: boolean) => {
    writeBoolean(AUTO_COMMIT_KEY, next);
    if (!next) writeBoolean(AUTO_PUSH_KEY, false);
    setPrefs(readRefactorAutomationPrefs());
  };
  const setAutoPush = (next: boolean) => {
    if (next) writeBoolean(AUTO_COMMIT_KEY, true);
    writeBoolean(AUTO_PUSH_KEY, next);
    setPrefs(readRefactorAutomationPrefs());
  };

  return { ...prefs, setAutoApply, setAutoCommit, setAutoPush };
}
