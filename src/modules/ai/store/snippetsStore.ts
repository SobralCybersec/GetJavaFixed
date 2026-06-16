import { isTauriRuntime } from "@/lib/runtime";
import { emit, listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import {
  loadSnippets,
  newSnippetId,
  saveSnippets,
  type Snippet,
} from "../lib/snippets";

const CHANGED_EVENT = "javarf://ai-snippets-changed";

type State = {
  hydrated: boolean;
  snippets: Snippet[];
  hydrate: () => Promise<void>;
  upsert: (snippet: Snippet) => void;
  remove: (id: string) => void;
};

let initialized = false;

function broadcast(): void {
  if (isTauriRuntime) {
    void emit(CHANGED_EVENT);
    return;
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGED_EVENT));
  }
}

export const useSnippetsStore = create<State>((set, get) => ({
  hydrated: false,
  snippets: [],
  hydrate: async () => {
    if (initialized) return;
    initialized = true;
    set({ snippets: await loadSnippets(), hydrated: true });
    const onChange = async () => {
      set({ snippets: await loadSnippets() });
    };
    if (isTauriRuntime) {
      void listen(CHANGED_EVENT, onChange);
    } else if (typeof window !== "undefined") {
      window.addEventListener(CHANGED_EVENT, () => void onChange());
    }
  },
  upsert: (snippet) => {
    const list = get().snippets;
    const idx = list.findIndex((s) => s.id === snippet.id);
    const next =
      idx === -1 ? [...list, snippet] : list.map((s) => (s.id === snippet.id ? snippet : s));
    set({ snippets: next });
    void saveSnippets(next).then(broadcast);
  },
  remove: (id) => {
    const next = get().snippets.filter((s) => s.id !== id);
    set({ snippets: next });
    void saveSnippets(next).then(broadcast);
  },
}));

export { newSnippetId };
