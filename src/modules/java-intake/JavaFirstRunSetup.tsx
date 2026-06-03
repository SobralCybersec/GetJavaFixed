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

type Props = {
  hasModelAccess: boolean;
  repoLabel: string | null;
  repoReady: boolean;
  onOpenModels: () => void;
  onChooseRepo: () => void;
  onContinue: () => void;
};

export function JavaFirstRunSetup({
  hasModelAccess,
  repoLabel,
  repoReady,
  onOpenModels,
  onChooseRepo,
  onContinue,
}: Props) {
  return (
    <div className="flex h-screen min-h-0 items-center justify-center overflow-auto bg-background px-6 py-8 text-foreground">
      <Card size="sm" className="java-panel w-full max-w-4xl border border-border/60">
        <CardHeader className="gap-5">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="secondary" className="w-fit">
                First setup
              </Badge>
              <CardTitle className="text-4xl tracking-tight">
                Configure JavaRf before opening the workspace
              </CardTitle>
              <CardDescription className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Connect a model, choose your first Java Maven or Gradle repository,
                then land directly in the IDE-style review workspace.
              </CardDescription>
            </div>
            <img src="/java.png" alt="JavaRf" className="size-24 shrink-0 object-contain" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-sm border border-border/60 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">1. Model access</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Configure a provider key or a local model endpoint in Settings.
                </p>
              </div>
              <Badge variant={hasModelAccess ? "secondary" : "outline"}>
                {hasModelAccess ? "Ready" : "Required"}
              </Badge>
            </div>
            <Button size="sm" className="mt-4" variant="outline" onClick={onOpenModels}>
              Open model settings
            </Button>
          </div>
          <div className="rounded-sm border border-border/60 bg-card/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">2. First Java repository</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a supported Maven or Gradle root to mount the explorer and review tools.
                </p>
              </div>
              <Badge variant={repoReady ? "secondary" : "outline"}>
                {repoReady ? "Ready" : "Required"}
              </Badge>
            </div>
            <p className="mt-4 truncate text-xs text-muted-foreground">
              {repoLabel ?? "No repository selected yet."}
            </p>
            <Button size="sm" className="mt-4" variant="outline" onClick={onChooseRepo}>
              Choose Java repository
            </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3">
          <Button size="sm" onClick={onContinue} disabled={!hasModelAccess || !repoReady}>
            Continue to workspace
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
