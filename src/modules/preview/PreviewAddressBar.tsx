import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowReloadHorizontalIcon,
  Globe02Icon,
  LinkSquare02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { openUrl } from "@/lib/openUrl";
import { isBrowserPreview } from "@/lib/runtime";
import { useI18n } from "@/modules/i18n";
import {
  listInstalledBrowsers,
  openInInstalledBrowser,
  type InstalledBrowser,
} from "./browserNative";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

type PortPreset = {
  port: number;
  label: string;
  hint: string;
};

const PORT_PRESETS: readonly PortPreset[] = [
  { port: 5173, label: "Vite", hint: "vite, sveltekit" },
  { port: 5174, label: "Vite (alt)", hint: "second vite instance" },
  { port: 3000, label: "Next.js", hint: "next, express, rails" },
  { port: 3001, label: "Next.js (alt)", hint: "second next instance" },
  { port: 4173, label: "Vite preview", hint: "vite preview" },
  { port: 4200, label: "Angular", hint: "angular cli" },
  { port: 4321, label: "Astro", hint: "astro" },
  { port: 5500, label: "Live Server", hint: "vscode live server" },
  { port: 6006, label: "Storybook", hint: "storybook" },
  { port: 8080, label: "Webpack", hint: "webpack, vue cli" },
  { port: 8081, label: "Metro", hint: "react native metro" },
  { port: 8000, label: "Django / FastAPI", hint: "django, fastapi" },
  { port: 8888, label: "Jupyter", hint: "jupyter notebook" },
  { port: 5000, label: "Flask", hint: "flask" },
  { port: 7860, label: "Gradio", hint: "gradio" },
  { port: 11434, label: "Ollama", hint: "ollama api" },
];

export type PreviewAddressBarHandle = {
  focus: () => void;
};

type Props = {
  url: string;
  onSubmit: (url: string) => void;
  onReload: () => void;
  onBack?: () => void;
  onForward?: () => void;
};

export const PreviewAddressBar = forwardRef<PreviewAddressBarHandle, Props>(
  function PreviewAddressBar(
    { url, onSubmit, onReload, onBack, onForward },
    ref,
  ) {
    const { t } = useI18n();
    const [draft, setDraft] = useState(url);
    const inputRef = useRef<HTMLInputElement>(null);
    const [browsers, setBrowsers] = useState<InstalledBrowser[]>([]);

    useEffect(() => {
      setDraft(url);
    }, [url]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          el.select();
        },
      }),
      [],
    );

    const [notice, setNotice] = useState<string | null>(null);
    const [checkingPort, setCheckingPort] = useState<number | null>(null);

    useEffect(() => {
      if (isBrowserPreview) {
        setBrowsers([]);
        return;
      }
      let cancelled = false;
      void listInstalledBrowsers()
        .then((next) => {
          if (!cancelled) setBrowsers(next);
        })
        .catch((error) => {
          console.error(error);
          if (!cancelled) setBrowsers([]);
        });
      return () => {
        cancelled = true;
      };
    }, []);

    const submit = () => {
      const next = normalizeUrl(draft);
      if (!next) {
        setNotice(t("preview.enterUrl"));
        return;
      }
      setNotice(null);
      if (next !== url) onSubmit(next);
      else onReload();
    };

    const tryPort = async (port: number) => {
      setNotice(null);
      setCheckingPort(port);
      const url = `http://localhost:${port}`;
      const ok = await probeUrl(url);
      setCheckingPort(null);
      if (!ok) {
        setNotice(t("preview.noServer", { port: String(port) }));
        return;
      }
      setDraft(url);
      onSubmit(url);
    };

    const openBrowser = async (browserId?: string) => {
      if (!url) {
        setNotice(t("preview.enterUrl"));
        return;
      }
      try {
        if (browserId) {
          await openInInstalledBrowser(browserId, url);
        } else {
          await openUrl(url);
        }
        setNotice(null);
      } catch (error) {
        console.error(error);
        setNotice(t("preview.browserOpenFailed"));
      }
    };

    return (
      <div className="min-w-0 shrink-0 border-b border-border/60">
      <div className="flex min-h-9 min-w-0 flex-wrap items-center gap-1 bg-card/40 px-1.5 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onBack}
          title={t("preview.back")}
          disabled={!url || !onBack}
          className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon
            icon={ArrowLeft02Icon}
            size={14}
            strokeWidth={1.75}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onForward}
          title={t("preview.forward")}
          disabled={!url || !onForward}
          className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            size={14}
            strokeWidth={1.75}
          />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onReload}
          title={t("preview.reload")}
          className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <HugeiconsIcon
            icon={ArrowReloadHorizontalIcon}
            size={14}
            strokeWidth={1.75}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title={t("preview.commonPorts")}
              className="h-7 shrink-0 gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <HugeiconsIcon
                icon={Globe02Icon}
                size={13}
                strokeWidth={1.75}
              />
              <span className="hidden sm:inline">{t("preview.ports")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="max-h-80 min-w-56 overflow-y-auto"
          >
            {PORT_PRESETS.map((p) => (
              <DropdownMenuItem
                key={p.port}
                onSelect={(e) => {
                  e.preventDefault();
                  void tryPort(p.port);
                }}
              >
                <span className="flex-1">{p.label}</span>
                <span className="text-xs text-muted-foreground">
                  {checkingPort === p.port ? t("preview.checking") : `:${p.port}`}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex min-w-28 flex-1 items-center">
          <Input
            ref={inputRef}
            value={draft}
            placeholder="http://localhost:3000"
            spellCheck={false}
            autoComplete="off"
            className="h-7 w-full bg-muted/60 px-2 text-xs placeholder:text-muted-foreground/70 focus-visible:ring-0"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(url);
                inputRef.current?.blur();
              }
            }}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title={t("preview.browsers")}
              className="size-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              disabled={!url}
            >
              <HugeiconsIcon
                icon={LinkSquare02Icon}
                size={14}
                strokeWidth={1.75}
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void openBrowser();
              }}
            >
              {t("preview.openSystem")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {browsers.length > 0 ? (
              browsers.map((browser) => (
                <DropdownMenuItem
                  key={browser.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    void openBrowser(browser.id);
                  }}
                >
                  {browser.name}
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled>
                {t("preview.noBrowsers")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {notice ? (
        <div className="flex items-center gap-1.5 bg-amber-500/8 px-3 py-1 text-[11px] text-amber-600 dark:text-amber-400">
          <span className="truncate">{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-auto rounded px-1 text-[10px] opacity-80 hover:bg-accent hover:opacity-100"
          >
            {t("common.dismiss")}
          </button>
        </div>
      ) : null}
      </div>
    );
  },
);

async function probeUrl(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(900),
    });
    return true;
  } catch {
    return false;
  }
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^localhost(:|\/|$)/i.test(trimmed)) return `http://${trimmed}`;
  if (/^\d{1,3}(\.\d{1,3}){3}(:|\/|$)/.test(trimmed)) return `http://${trimmed}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}
