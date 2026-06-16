import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { isBrowserPreview } from "@/lib/runtime";
import { quoteShellArg } from "@/lib/shellQuote";
import { native, type AniCliArgs } from "@/modules/ai/lib/native";
import { useI18n } from "@/modules/i18n";
import { useEffect, useMemo, useState } from "react";

type Props = {
  onRunInTerminal?: (command: string) => void;
};

const QUALITIES = ["360", "480", "720", "1080"] as const;

export function AniCliPanel({ onRunInTerminal }: Props) {
  const { t } = useI18n();
  const [check, setCheck] = useState<{ aniCli: boolean; mpv: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [episode, setEpisode] = useState("");
  const [quality, setQuality] = useState<AniCliArgs["quality"]>("1080");
  const [dub, setDub] = useState(false);
  const [download, setDownload] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const args = useMemo<AniCliArgs>(() => {
    const parsedEpisode = Number(episode);
    return {
      query,
      episode: Number.isFinite(parsedEpisode) && parsedEpisode > 0 ? parsedEpisode : undefined,
      quality,
      dub,
      download,
    };
  }, [download, dub, episode, quality, query]);

  const command = useMemo(() => buildAniCliCommand(args), [args]);
  const canLaunch = query.trim().length > 0;
  const browserPreviewLimited = isBrowserPreview;

  const refresh = () => {
    if (browserPreviewLimited) {
      setCheck({ aniCli: false, mpv: false });
      setMessage(null);
      return;
    }
    void native
      .checkAniCli()
      .then(setCheck)
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  };

  useEffect(refresh, []);

  const launchSeparate = async () => {
    if (!canLaunch || browserPreviewLimited) return;
    setMessage(null);
    try {
      await native.launchAniCli(args);
      setMessage(t("anime.launched"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="javarf-terminal-panel ops-inset-panel border border-border/70 bg-background/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold leading-tight">{t("anime.title")}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t("anime.description")}
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={refresh}>
          {t("anime.check")}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <StatusPill
          label="ani-cli"
          ok={check?.aniCli === true}
          unknown={check === null}
        />
        <StatusPill label="mpv" ok={check?.mpv === true} unknown={check === null} />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_6rem]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("anime.titlePlaceholder")}
          className="h-8 text-[12px]"
        />
        <Input
          value={episode}
          onChange={(event) => setEpisode(event.target.value)}
          placeholder={t("anime.episodePlaceholder")}
          inputMode="numeric"
          className="h-8 text-[12px]"
        />
        <select
          value={quality}
          onChange={(event) => setQuality(event.target.value as AniCliArgs["quality"])}
          className="h-8 rounded-md border border-border bg-background px-2 text-[12px]"
        >
          {QUALITIES.map((item) => (
            <option key={item} value={item}>
              {item}p
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-2">
          <Switch size="sm" checked={dub} onCheckedChange={setDub} />
          {t("anime.dub")}
        </label>
        <label className="flex items-center gap-2">
          <Switch size="sm" checked={download} onCheckedChange={setDownload} />
          {t("anime.download")}
        </label>
      </div>

      <div className="mt-3 rounded-md border border-border/60 bg-card/45 px-2 py-1.5 font-mono text-[10.5px] text-muted-foreground">
        {command}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          className="h-8 px-3 text-xs"
          disabled={!canLaunch || browserPreviewLimited}
          onClick={() => onRunInTerminal?.(command)}
        >
          {t("anime.launchTerminal")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 text-xs"
          disabled={!canLaunch || browserPreviewLimited}
          onClick={() => void launchSeparate()}
        >
          {t("anime.launchSeparate")}
        </Button>
      </div>

      {message ? (
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}

function buildAniCliCommand(args: AniCliArgs): string {
  const parts = ["ani-cli", quoteShellArg(args.query.trim())];
  if (args.episode) parts.push("-e", String(args.episode));
  if (args.quality) parts.push("-q", args.quality);
  if (args.dub) parts.push("--dub");
  if (args.download) parts.push("-d");
  return parts.join(" ");
}

function StatusPill({
  label,
  ok,
  unknown,
}: {
  label: string;
  ok: boolean;
  unknown: boolean;
}) {
  const { t } = useI18n();
  return (
    <span className="border border-border/70 bg-background/70 px-2 py-1">
      {label}: {unknown ? t("anime.unknown") : ok ? t("anime.found") : t("anime.notFound")}
    </span>
  );
}
