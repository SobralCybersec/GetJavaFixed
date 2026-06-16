import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Cancel01Icon,
  Folder01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { native, type FsSearchResult } from "@/modules/ai/lib/native";
import { useI18n } from "@/modules/i18n";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { fileIconUrl } from "./lib/iconResolver";
import { copyToClipboard, revealInFinder } from "./lib/contextActions";
import { COMPACT_CONTENT, COMPACT_ITEM } from "./lib/menuItemClass";
import { cn } from "@/lib/utils";

type SearchHit = {
  path: string;
  rel: string;
  name: string;
  is_dir: boolean;
};

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

type Props = {
  rootPath: string;
  onOpenFile: (path: string) => void;
  open: boolean;
  onRequestClose: () => void;
  onActiveChange?: (active: boolean) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
};

export type ExplorerSearchHandle = {
  focus: (query?: string) => void;
  isFocused: () => boolean;
};

export const ExplorerSearch = forwardRef<ExplorerSearchHandle, Props>(function ExplorerSearch({
  rootPath,
  onOpenFile,
  open,
  onRequestClose,
  onActiveChange,
  onRevealInTerminal,
  onAttachToAgent,
}: Props,
  ref,
) {
  const { t } = useI18n();
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastKeyboardNavAt = useRef(0);

  const active = query.trim().length > 0;

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      setSearching(false);
      setTruncated(false);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setSelectedIndex(0);
      setSearching(false);
      setTruncated(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const handle = setTimeout(async () => {
      try {
        const res = await native.searchFiles({
          root: rootPath,
          query: q,
          limit: 200,
          showHidden,
        });
        const typed = res as FsSearchResult;
        if (alive) {
          setResults(typed.hits);
          setTruncated(typed.truncated);
          setSelectedIndex(0);
        }
      } catch (e) {
        if (alive) {
          console.error("fs_search failed:", e);
          setResults([]);
          setTruncated(false);
          setSelectedIndex(0);
        }
      } finally {
        if (alive) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query, rootPath, showHidden]);

  useImperativeHandle(
    ref,
    () => ({
      focus: (query?: string) => {
        requestAnimationFrame(() => {
          if (typeof query === "string") {
            setQuery(query);
            setSelectedIndex(0);
          }
          inputRef.current?.focus();
        });
      },
      isFocused: () => document.activeElement === inputRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (active && results.length > 0) {
      const el = scrollRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results, active]);

  const handleSelect = (hit: SearchHit) => {
    if (!hit.is_dir) {
      onOpenFile(hit.path);
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
      {open ? (
        <div className="relative shrink-0 overflow-hidden border-b border-[color:var(--border)] bg-black/35 px-2.5 py-2">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute top-1/2 left-5 -translate-y-1/2 text-white/34"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onRequestClose();
                return;
              }
              if (results.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  lastKeyboardNavAt.current = Date.now();
                  setSelectedIndex((prev) => (prev + 1) % results.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  lastKeyboardNavAt.current = Date.now();
                  setSelectedIndex(
                    (prev) => (prev - 1 + results.length) % results.length,
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  handleSelect(results[selectedIndex]);
                }
              }
            }}
            placeholder={t("explorer.searchFiles")}
            className="h-8 border-[color:var(--border)] bg-black/40 pr-7 pl-7 font-mono text-xs text-white placeholder:text-white/28"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-4 -translate-y-1/2 rounded p-0.5 text-white/34 hover:bg-white/[0.06] hover:text-white"
              aria-label={t("search.clear")}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="min-w-0 py-1" ref={scrollRef}>
            {searching && results.length === 0 ? (
                <div className="px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-white/34">
                {t("explorer.searching")}
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 font-mono text-[10px] tracking-[0.12em] text-white/34">
                {t("explorer.noMatches")}
              </div>
            ) : (
              results.map((hit, index) => {
                const url = hit.is_dir ? null : fileIconUrl(hit.name);
                const isSelected = index === selectedIndex;
                return (
                  <ContextMenu key={hit.path}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        data-index={index}
                        onClick={() => handleSelect(hit)}
                        onMouseEnter={() => {
                          if (Date.now() - lastKeyboardNavAt.current > 250) {
                            setSelectedIndex(index);
                          }
                        }}
                        className={cn(
                          "flex w-full min-w-0 items-center gap-2 overflow-hidden border-l border-transparent px-2.5 py-1.5 text-left text-xs transition-[background-color,color,border-color] duration-100",
                          isSelected
                            ? "border-l-primary bg-primary/10 text-white"
                            : "text-white/74 hover:bg-white/[0.03] hover:text-white"
                        )}
                        title={hit.path}
                      >
                        {url ? (
                          <img src={url} alt="" className="size-3.5 shrink-0" />
                        ) : (
                          <HugeiconsIcon
                            icon={Folder01Icon}
                            size={13}
                            strokeWidth={1.75}
                            className="shrink-0 text-muted-foreground"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">{hit.name}</span>
                        <span className="hidden max-w-[42%] shrink truncate font-mono text-[10px] text-white/28 sm:block">
                          {hit.rel}
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className={COMPACT_CONTENT}>
                      {!hit.is_dir && (
                        <ContextMenuItem
                          className={COMPACT_ITEM}
                          onSelect={() => onOpenFile(hit.path)}
                        >
                          {t("explorer.open")}
                        </ContextMenuItem>
                      )}
                      {hit.is_dir && onRevealInTerminal && (
                        <ContextMenuItem
                          className={COMPACT_ITEM}
                          onSelect={() => onRevealInTerminal(hit.path)}
                        >
                          {t("explorer.openTerminal")}
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => void revealInFinder(hit.path)}
                      >
                        {t("explorer.reveal")}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => void copyToClipboard(hit.path)}
                      >
                        {t("explorer.copyPath")}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => onAttachToAgent?.(hit.path)}
                      >
                        {t("explorer.attachAgent")}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
            {truncated && results.length > 0 ? (
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                {t("explorer.partialResults")}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
});
