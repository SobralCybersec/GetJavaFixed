import { Button } from "@/components/ui/button";
import { useI18n } from "@/modules/i18n";
import { ACKNOWLEDGEMENTS } from "@/modules/about/acknowledgements";
import { useUpdater } from "@/modules/updater";
import { GithubIcon, Globe02Icon, LinkSquare02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { getName, getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { arch, platform } from "@tauri-apps/plugin-os";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";

const REPO_URL = "https://github.com/SobralCybersec/GetJavaFixed";
const WEBSITE = "https://github.com/SobralCybersec/GetJavaFixed";

const PLATFORM_LABEL: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  freebsd: "FreeBSD",
};

export function AboutSection() {
  const { t } = useI18n();
  const [version, setVersion] = useState("");
  const [name, setName] = useState("JavaRf");
  const [build, setBuild] = useState("");
  const { status, check, install } = useUpdater({ autoCheck: false });

  const checking = status.kind === "checking";
  const downloading = status.kind === "downloading";
  const available = status.kind === "available";
  const manualAvailable = status.kind === "manual-available";
  const ready = status.kind === "ready";

  const checkLabel = useMemo(() => {
    if (status.kind === "uptodate") return t("about.upToDate");
    if (status.kind === "error") return t("about.checkFailedRetry");
    if (checking) return t("about.checking");
    if (downloading) return t("about.downloading");
    if (ready) return t("about.restartToInstall");
    if (available) {
      return t("about.installVersion", { version: status.update.version });
    }
    if (manualAvailable) {
      return t("about.updateToVersion", { version: status.info.version });
    }
    return t("about.checkForUpdates");
  }, [available, checking, downloading, manualAvailable, ready, status, t]);

  const onUpdateClick = () => {
    if (available) {
      void install();
      return;
    }
    void check({ manual: true });
  };

  useEffect(() => {
    void getVersion().then(setVersion);
    void getName().then(setName);
    try {
      const currentPlatform = platform();
      const currentArch = arch();
      const platformLabel = PLATFORM_LABEL[currentPlatform] ?? currentPlatform;
      setBuild(`${platformLabel} · ${currentArch}`);
    } catch {
      setBuild("");
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("about.title")} description="" />

      <div className="flex items-center gap-4 rounded-sm border border-border/60 bg-card/60 p-5">
        <img src="/app.png" alt="" className="size-12 object-contain" draggable={false} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold tracking-tight">{name}</span>
          <span className="text-[11px] text-muted-foreground">{t("about.tagline")}</span>
          <span className="mt-1 font-mono text-[11px] text-muted-foreground">
            v{version || "-"}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-[110px_1fr] gap-y-2.5 text-[12px]">
        <dt className="text-muted-foreground">{t("about.build")}</dt>
        <dd className="font-mono text-[11.5px]">
          {build ? `${build} · v${version}` : `v${version}`}
        </dd>

        <dt className="text-muted-foreground">{t("about.bundleId")}</dt>
        <dd className="font-mono text-[11.5px]">app.javarf.desktop</dd>

        <dt className="text-muted-foreground">{t("about.license")}</dt>
        <dd>Apache 2.0</dd>

        <dt className="text-muted-foreground">{t("about.sourceCode")}</dt>
        <dd>
          <button
            type="button"
            onClick={() => void openUrl(REPO_URL)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12px] underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
            SobralCybersec/GetJavaFixed
          </button>
        </dd>

        <dt className="text-muted-foreground">{t("about.website")}</dt>
        <dd>
          <button
            type="button"
            onClick={() => void openUrl(WEBSITE)}
            className="inline-flex items-center gap-1.5 rounded-md text-[12px] underline-offset-2 hover:text-foreground hover:underline"
          >
            <HugeiconsIcon icon={Globe02Icon} size={12} strokeWidth={1.75} />
            github.com/SobralCybersec/GetJavaFixed
          </button>
        </dd>
      </dl>

      <CreditsList title={t("about.people")} entries={ACKNOWLEDGEMENTS.people} />
      <CreditsList title={t("about.docs")} entries={ACKNOWLEDGEMENTS.docs} />

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={onUpdateClick}
            disabled={checking || downloading || ready}
          >
            {checkLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openUrl(REPO_URL)}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={GithubIcon} size={12} strokeWidth={1.75} />
            {t("about.viewOnGitHub")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void openUrl(`${REPO_URL}/issues/new`)}
          >
            {t("about.reportIssue")}
          </Button>
        </div>
        {status.kind === "error" ? (
          <p className="break-all font-mono text-[10.5px] text-destructive/80">
            {status.message}
          </p>
        ) : null}
        {downloading && status.contentLength ? (
          <p className="text-[11px] text-muted-foreground">
            {Math.min(
              100,
              Math.round((status.downloaded / status.contentLength) * 100),
            )}
            %
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CreditsList({
  title,
  entries,
}: {
  title: string;
  entries: readonly {
    name: string;
    role?: string;
    url?: string;
    note?: string;
  }[];
}) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
        {title}
      </span>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li
            key={`${title}-${entry.name}`}
            className="rounded-lg border border-border/60 bg-card/50 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-foreground">
                  {entry.name}
                </div>
                {entry.role ? (
                  <div className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                    {entry.role}
                  </div>
                ) : null}
                {entry.note ? (
                  <div className="mt-0.5 text-[10.5px] leading-relaxed text-muted-foreground">
                    {entry.note}
                  </div>
                ) : null}
              </div>
              {entry.url ? (
                <button
                  type="button"
                  onClick={() => void openUrl(entry.url!)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
                  title={t("about.openLink")}
                >
                  <HugeiconsIcon icon={LinkSquare02Icon} size={11} strokeWidth={1.75} />
                  {t("about.openLink")}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
