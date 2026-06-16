import { Input } from "@/components/ui/input";
import { type AniCliCheck, native } from "@/modules/ai/lib/native";
import { useI18n } from "@/modules/i18n";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "motion/react";
import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GitHubProfile } from "./homeDashboardData";
import { UtilityButton, ViewHeader } from "./HomeDashboardShared";

type Props = {
  githubProfile?: GitHubProfile | null;
};

const QUICK_ACCESS_TITLES = [
  "One Piece",
  "Naruto",
  "Bleach",
  "Hunter x Hunter",
] as const;

type ToolCheckState = "loading" | "ready" | "error";
type LaunchState = "idle" | "launching" | "ready" | "error";

export function HomeDashboardAnimeView({ githubProfile }: Props) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [animeQuery, setAnimeQuery] = useState("");
  const [animeEpisode, setAnimeEpisode] = useState("1");
  const [animeQuality, setAnimeQuality] = useState<"360" | "480" | "720" | "1080">("1080");
  const [toolCheck, setToolCheck] = useState<AniCliCheck | null>(null);
  const [toolState, setToolState] = useState<ToolCheckState>("loading");
  const [toolError, setToolError] = useState<string | null>(null);
  const [launchState, setLaunchState] = useState<LaunchState>("idle");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [lastLaunchQuery, setLastLaunchQuery] = useState<string | null>(null);

  const refreshToolCheck = useCallback(async () => {
    setToolState("loading");
    setToolError(null);

    try {
      const result = await native.checkAniCli();
      setToolCheck(result);
      setToolState("ready");
    } catch (error) {
      setToolCheck(null);
      setToolState("error");
      setToolError(String(error));
    }
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    const cards = containerRef.current.querySelectorAll(".anime-card");
    animate(cards, {
      opacity: [0, 1],
      translateY: [30, 0],
      delay: stagger(100),
      duration: 800,
      ease: "out(3)",
    });
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    gsap.from(containerRef.current, {
      opacity: 0,
      y: 20,
      duration: 0.8,
      ease: "power3.out",
    });
  }, [reducedMotion]);

  useEffect(() => {
    void refreshToolCheck();
  }, [refreshToolCheck]);

  const handleLaunch = useCallback(
    async (queryOverride?: string) => {
      const nextQuery = (queryOverride ?? animeQuery).trim();
      const episodeText = animeEpisode.trim();
      const parsedEpisode =
        episodeText.length > 0 ? Number.parseInt(episodeText, 10) : undefined;

      if (!nextQuery) {
        setLaunchState("error");
        setLaunchError(t("home.anime.queryRequired"));
        return;
      }

      if (
        episodeText.length > 0 &&
        (!Number.isInteger(parsedEpisode) || (parsedEpisode ?? 0) <= 0)
      ) {
        setLaunchState("error");
        setLaunchError(t("home.anime.episodeInvalid"));
        return;
      }

      setAnimeQuery(nextQuery);
      setLaunchState("launching");
      setLaunchError(null);

      try {
        await native.launchAniCli({
          query: nextQuery,
          episode: parsedEpisode,
          quality: animeQuality,
          dub: false,
          download: false,
        });
        setLastLaunchQuery(nextQuery);
        setLaunchState("ready");
        void refreshToolCheck();
      } catch (error) {
        setLaunchState("error");
        setLaunchError(String(error));
      }
    },
    [animeEpisode, animeQuality, animeQuery, refreshToolCheck, t],
  );

  const aniCliStatus =
    toolState === "loading"
      ? t("home.anime.status.checking")
      : toolState === "error"
        ? t("home.anime.status.error")
        : toolCheck?.aniCli
          ? t("home.anime.status.ready")
          : t("home.anime.status.missing");
  const mpvStatus =
    toolState === "loading"
      ? t("home.anime.status.checking")
      : toolState === "error"
        ? t("home.anime.status.error")
        : toolCheck?.mpv
          ? t("home.anime.status.ready")
          : t("home.anime.status.missing");
  const launchStatus =
    launchState === "launching"
      ? t("home.anime.launch.launching")
      : launchState === "ready"
        ? t("home.anime.launch.ready")
        : launchState === "error"
          ? t("home.anime.launch.error")
          : t("home.anime.launch.idle");

  return (
    <div
      ref={containerRef}
      data-dashboard-view="active"
      className="flex h-full min-w-0 flex-col gap-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewHeader title={t("home.anime.header").toUpperCase()} />
        {githubProfile && (
          <div className="flex shrink-0 items-center gap-3">
            <img
              src={githubProfile.avatarUrl}
              alt={githubProfile.login}
              className="h-8 w-8 rounded-full border-2 border-[var(--dash-accent)] object-cover"
            />
          </div>
        )}
      </div>

      <div className="grid flex-1 gap-6">
        <div className="anime-card border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-6">
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
            {t("home.animeLauncher")}
          </div>
          <div className="grid gap-4">
            <div>
              <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                {t("home.anime.titleLabel")}
              </label>
              <Input
                value={animeQuery}
                onChange={(e) => setAnimeQuery(e.target.value)}
                placeholder={t("home.anime.placeholder")}
                className="h-11 rounded-none border-[var(--dash-border)] bg-[var(--dash-bg)] font-mono text-[11px] text-[var(--dash-text)] placeholder:text-[var(--dash-muted)]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                  {t("home.anime.episode")}
                </label>
                <Input
                  value={animeEpisode}
                  onChange={(e) => setAnimeEpisode(e.target.value)}
                  placeholder="1"
                  className="h-11 rounded-none border-[var(--dash-border)] bg-[var(--dash-bg)] font-mono text-[11px] text-[var(--dash-text)]"
                />
              </div>
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                  {t("home.anime.quality")}
                </label>
                <select
                  value={animeQuality}
                  onChange={(e) =>
                    setAnimeQuality(e.target.value as "360" | "480" | "720" | "1080")
                  }
                  className="h-11 w-full rounded-none border border-[var(--dash-border)] bg-[var(--dash-bg)] px-3 font-mono text-[11px] text-[var(--dash-text)]"
                >
                  <option value="360">360p</option>
                  <option value="480">480p</option>
                  <option value="720">720p</option>
                  <option value="1080">1080p</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <UtilityButton
                onClick={() => void handleLaunch()}
                disabled={launchState === "launching"}
              >
                {t("home.anime.launchButton")}
              </UtilityButton>
              <UtilityButton
                onClick={() => void refreshToolCheck()}
                disabled={toolState === "loading"}
              >
                {t("home.anime.refreshStatus")}
              </UtilityButton>
            </div>
          </div>
        </div>

        <div className="anime-card border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-6">
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-accent)]">
            {t("home.anime.runtimeStatus")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                {t("home.anime.aniCliBinary")}
              </div>
              <div className="mt-2 break-words font-mono text-sm text-[var(--dash-text)]">
                {aniCliStatus}
              </div>
            </div>

            <div className="border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                {t("home.anime.mpvBinary")}
              </div>
              <div className="mt-2 break-words font-mono text-sm text-[var(--dash-text)]">
                {mpvStatus}
              </div>
            </div>

            <div className="border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4 sm:col-span-2 xl:col-span-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                {t("home.anime.lastLaunch")}
              </div>
              <div className="mt-2 break-words font-mono text-sm text-[var(--dash-text)]">
                {lastLaunchQuery ?? t("home.anime.lastLaunchEmpty")}
              </div>
              <div className="mt-2 font-mono text-[10px] text-[var(--dash-muted)]">
                {launchStatus}
              </div>
            </div>
          </div>
          {toolError || launchError ? (
            <div className="mt-3 break-words border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-3 font-mono text-[11px] text-[var(--dash-text)]">
              {launchError ?? toolError}
            </div>
          ) : null}
        </div>

        <div className="anime-card border border-[var(--dash-border)] bg-[var(--dash-panel-strong)] p-4 sm:p-6">
          <div className="mb-5 font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--dash-primary)]">
            {t("home.anime.quickAccess")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACCESS_TITLES.map((anime) => (
              <button
                key={anime}
                type="button"
                onClick={() => void handleLaunch(anime)}
                disabled={launchState === "launching"}
                className="anime-card group border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4 text-left transition-all hover:border-[var(--dash-primary)] hover:shadow-[0_0_10px_rgba(249,115,22,0.2)]"
              >
                <div className="font-mono text-[12px] font-bold text-[var(--dash-text)] transition-colors group-hover:text-[var(--dash-primary)]">
                  {anime}
                </div>
                <div className="mt-2 font-mono text-[10px] text-[var(--dash-muted)]">
                  {t("home.anime.quickAccessHint")}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
