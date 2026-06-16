import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/modules/i18n";

type Props = {
  hasModelAccess: boolean;
  canContinue: boolean;
  repoLabel: string | null;
  repoReady: boolean;
  onOpenModels: () => void;
  onChooseRepo: () => void;
  onContinue: () => void;
};

export function JavaFirstRunSetup({
  hasModelAccess,
  canContinue,
  repoLabel,
  repoReady,
  onOpenModels,
  onChooseRepo,
  onContinue,
}: Props) {
  const { t } = useI18n();
  return (
    <div className="flex h-screen min-h-0 items-center justify-center overflow-auto bg-background px-6 py-8 text-foreground">
      <Card size="sm" className="java-panel w-full max-w-4xl border border-border/60">
        <CardHeader className="gap-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                {t("setup.firstSetup")}
              </Badge>
              <CardTitle className="text-4xl tracking-tight">
                {t("setup.title")}
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7 text-muted-foreground">
                {t("setup.description")}
              </CardDescription>
            </div>
            <img src="/app.png" alt="JavaRf" className="size-24 shrink-0 object-contain" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-border/60 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t("setup.modelAccess")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("setup.modelAccessDescription")}
                </p>
              </div>
              <Badge variant={hasModelAccess ? "secondary" : "outline"}>
                {hasModelAccess ? t("setup.ready") : t("setup.required")}
              </Badge>
            </div>
            <Button size="sm" className="mt-4" variant="outline" onClick={onOpenModels}>
              {t("setup.openModelSettings")}
            </Button>
          </div>
          <div className="rounded-sm border border-border/60 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{t("setup.firstRepo")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("setup.firstRepoDescription")}
                </p>
              </div>
              <Badge variant={repoReady ? "secondary" : "outline"}>
                {repoReady ? t("setup.ready") : t("setup.required")}
              </Badge>
            </div>
            <p className="mt-4 truncate text-xs text-muted-foreground">
              {repoLabel ?? t("setup.noRepository")}
            </p>
            <Button size="sm" className="mt-4" variant="outline" onClick={onChooseRepo}>
              {t("setup.chooseRepo")}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button size="sm" onClick={onContinue} disabled={!canContinue || !repoReady}>
            {t("setup.continueWorkspace")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
