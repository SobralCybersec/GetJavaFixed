import { Alert02Icon, Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useI18n } from "@/modules/i18n";
import {
  PreviewAddressBar,
  type PreviewAddressBarHandle,
} from "./PreviewAddressBar";
import {
  goBackNativeWebview,
  goForwardNativeWebview,
  NativeWebviewSurface,
  nativePreviewWebviewLabel,
  reloadNativeWebview,
} from "./NativeWebviewSurface";

export type PreviewPaneHandle = {
  reload: () => void;
  focusAddressBar: () => void;
  getUrl: () => string;
};

type Props = {
  id: number;
  url: string;
  visible: boolean;
  onUrlChange: (url: string) => void;
};

const SUSPEND_AFTER_MS = 30_000;

export const PreviewPane = forwardRef<PreviewPaneHandle, Props>(
  function PreviewPane({ id, url, visible, onUrlChange }, ref) {
    const { t } = useI18n();
    const [nonce, setNonce] = useState(0);
    const [loaded, setLoaded] = useState(visible);
    const addressRef = useRef<PreviewAddressBarHandle>(null);
    const nativeLabel = nativePreviewWebviewLabel(id);
    const useNativeWebview = url ? !isLocalUrl(url) : false;

    const reloadPreview = useCallback(() => {
      setLoaded(true);
      if (useNativeWebview) {
        void reloadNativeWebview(nativeLabel).catch(console.error);
        return;
      }
      setNonce((n) => n + 1);
    }, [nativeLabel, useNativeWebview]);

    const goBack = useCallback(() => {
      if (useNativeWebview) void goBackNativeWebview(nativeLabel).catch(console.error);
    }, [nativeLabel, useNativeWebview]);

    const goForward = useCallback(() => {
      if (useNativeWebview) {
        void goForwardNativeWebview(nativeLabel).catch(console.error);
      }
    }, [nativeLabel, useNativeWebview]);

    useEffect(() => {
      if (visible) {
        setLoaded(true);
        return;
      }
      const t = setTimeout(() => setLoaded(false), SUSPEND_AFTER_MS);
      return () => clearTimeout(t);
    }, [visible]);

    useImperativeHandle(
      ref,
      () => ({
        reload: reloadPreview,
        focusAddressBar: () => addressRef.current?.focus(),
        getUrl: () => url,
      }),
      [reloadPreview, url],
    );

    return (
      <div
        className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background"
        style={{
          visibility: visible ? "visible" : "hidden",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <PreviewAddressBar
          ref={addressRef}
          url={url}
          onSubmit={onUrlChange}
          onReload={reloadPreview}
          onBack={useNativeWebview ? goBack : undefined}
          onForward={useNativeWebview ? goForward : undefined}
        />
        {useNativeWebview ? (
          <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-border/60 bg-amber-500/8 px-3 text-[11px] text-amber-600 dark:text-amber-400">
            <HugeiconsIcon
              icon={Alert02Icon}
              size={12}
              strokeWidth={1.75}
              className="shrink-0"
            />
            <span className="truncate">
              {t("preview.nativeHint")}
            </span>
          </div>
        ) : null}
        <div
          className={
            url
              ? "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-white"
              : "relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background"
          }
        >
          {url ? (
            useNativeWebview ? (
              <NativeWebviewSurface
                label={nativeLabel}
                url={url}
                visible={visible}
                onUrlChange={onUrlChange}
              />
            ) : loaded ? (
              <iframe
                key={`${url}#${nonce}`}
                src={url}
                title={t("preview.title")}
                className="block h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                referrerPolicy="no-referrer"
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            ) : (
              <SuspendedState
                t={t}
                onReload={() => {
                  setLoaded(true);
                  setNonce((n) => n + 1);
                }}
              />
            )
          ) : (
            <EmptyState t={t} />
          )}
        </div>
      </div>
    );
  },
);

function SuspendedState({
  onReload,
  t,
}: {
  onReload: () => void;
  t: ReturnType<typeof useI18n>["t"];
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground">
        <HugeiconsIcon icon={Globe02Icon} size={18} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <p className="text-[12.5px] font-medium text-foreground">
          {t("preview.suspended.title")}
        </p>
        <p className="max-w-xs text-[11px] leading-relaxed text-muted-foreground">
          {t("preview.suspended.body")}
        </p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className="rounded-md border border-border/60 bg-card px-3 py-1 text-[11px] hover:bg-accent/50"
      >
        {t("preview.reload")}
      </button>
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useI18n>["t"] }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground">
        <HugeiconsIcon icon={Globe02Icon} size={20} strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-foreground">
          {t("preview.empty.title")}
        </p>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          {t("preview.empty.bodyBefore")}{" "}
          <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10.5px]">
            {t("preview.ports")}
          </span>{" "}
          {t("preview.empty.bodyAfter")}
        </p>
      </div>
    </div>
  );
}

function isLocalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    );
  } catch {
    return false;
  }
}
