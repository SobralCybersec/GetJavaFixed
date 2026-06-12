import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/modules/i18n";

import type {
  JavaRepoReadiness,
  SupportedJavaRepoReadiness,
} from "@/modules/java-intake/lib/native";

export type JavaRepoHomeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "supported";
      path: string;
      readiness: SupportedJavaRepoReadiness;
    }
  | { kind: "unsupported"; path: string; readiness: JavaRepoReadiness }
  | { kind: "error"; message: string };

type Props = {
  state: JavaRepoHomeState;
  onChooseFolder: () => void;
  onStartFullAnalysis: () => void;
  onClose?: () => void;
};

export function JavaRepoHome({
  state,
  onChooseFolder,
  onStartFullAnalysis,
  onClose,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-background px-6 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl justify-end pb-4">
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("home.openWorkspace")}
          </Button>
        ) : null}
      </div>
      <Card size="sm" className="java-panel mx-auto w-full max-w-5xl border shadow-xl">
        <CardHeader className="gap-5 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                {t("repoIntake.badge")}
              </Badge>
              <CardTitle className="text-[34px] leading-[1.05] tracking-tight">
                {t("repoIntake.title")}
              </CardTitle>
              <CardDescription className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
                {t("repoIntake.description")}
              </CardDescription>
            </div>
            <div className="java-panel  p-4">
              <img
                src="/app.png"
                alt=""
                className="size-24 object-contain"
                draggable={false}
              />
            </div>
          </div>
          <div className="grid gap-3 text-left text-xs text-muted-foreground sm:grid-cols-3">
            <div className="border border-border/60  px-3 py-3">
              {t("repoIntake.rootManifest")}
              <div className="mt-1 text-sm text-foreground">
                {t("repoIntake.rootManifestValueFull")}
              </div>
            </div>
            <div className="border border-border/60  px-3 py-3">
              {t("repoIntake.analysisPosture")}
              <div className="mt-1 text-sm text-foreground">{t("repoIntake.watchOnly")}</div>
            </div>
            <div className="border border-border/60  px-3 py-3">
              {t("repoIntake.output")}
              <div className="mt-1 text-sm text-foreground">{t("repoIntake.outputValue")}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "idle" && (
            <div className="border border-dashed border-primary/35 bg-primary/5 px-4 py-6 text-sm text-muted-foreground">
              {t("repoIntake.supported")}
            </div>
          )}

          {state.kind === "loading" && (
            <div className="border border-primary/25 bg-primary/6 px-4 py-6 text-sm text-muted-foreground">
              {t("repoIntake.checking")}
            </div>
          )}

          {state.kind === "supported" && (
            <div className="border border-primary/25 bg-background/70 px-4 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {state.readiness.projectType}
                </Badge>
                <span className="text-sm font-medium">{state.readiness.repoName}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("repoIntake.ready")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("repoIntake.detected", {
                  projectType: state.readiness.projectType,
                })}
              </p>
            </div>
          )}

          {state.kind === "unsupported" && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                {t("repoIntake.unsupported")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {state.readiness.reason}
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                {t("repoIntake.inspectFailed")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-3">
          {state.kind === "supported" ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onChooseFolder}
                aria-label={t("repoIntake.chooseAnother")}
              >
                {t("repoIntake.chooseAnother")}
              </Button>
              <Button size="sm" onClick={onStartFullAnalysis}>
                {t("repoIntake.startFullAnalysis")}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onChooseFolder}>
              {state.kind === "unsupported"
                ? t("repoIntake.chooseAnother")
                : t("repoIntake.chooseRepo")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
