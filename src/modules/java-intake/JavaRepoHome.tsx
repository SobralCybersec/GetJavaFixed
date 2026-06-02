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
  return (
    <div className="java-grid flex h-full min-h-0 flex-col overflow-auto bg-background px-6 py-6 text-foreground">
      <div className="mx-auto flex w-full max-w-5xl justify-end pb-4">
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Open workspace
          </Button>
        ) : null}
      </div>
      <Card size="sm" className="java-panel mx-auto w-full max-w-5xl rounded-[32px] border shadow-xl">
        <CardHeader className="gap-5 pb-2">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                Java repository intake
              </Badge>
              <CardTitle className="text-[34px] leading-[1.05] tracking-tight">
                Review-first refactoring for Maven and Gradle codebases
              </CardTitle>
              <CardDescription className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
                Open a plain Java repository, inspect ranked findings, then move through safe diffs with backup and rollback still in your hands.
              </CardDescription>
            </div>
            <div className="java-panel rounded-[28px] bg-background/55 p-4">
              <img
                src="/java-assistant-mark.svg"
                alt=""
                className="size-24"
                draggable={false}
              />
            </div>
          </div>
          <div className="grid gap-3 text-left text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-3">
              Root manifest check
              <div className="mt-1 text-sm text-foreground"><code>pom.xml</code> or Gradle build root</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-3">
              Analysis posture
              <div className="mt-1 text-sm text-foreground">Watch-only before apply</div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/55 px-3 py-3">
              Output
              <div className="mt-1 text-sm text-foreground">Ranked findings and diff review</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {state.kind === "idle" && (
            <div className="rounded-3xl border border-dashed border-primary/35 bg-primary/5 px-4 py-6 text-sm text-muted-foreground">
              We support selected-root repositories that contain
              {" "}
              <code>pom.xml</code>, <code>build.gradle</code>, or
              {" "}
              <code>build.gradle.kts</code>.
            </div>
          )}

          {state.kind === "loading" && (
            <div className="rounded-3xl border border-primary/25 bg-primary/6 px-4 py-6 text-sm text-muted-foreground">
              Checking the selected repository root...
            </div>
          )}

          {state.kind === "supported" && (
            <div className="rounded-3xl border border-primary/25 bg-background/70 px-4 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {state.readiness.projectType}
                </Badge>
                <span className="text-sm font-medium">{state.readiness.repoName}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Repository ready for analysis
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                We detected a supported Maven or Gradle root. Start full
                analysis to build the ranked refactor findings queue.
              </p>
            </div>
          )}

          {state.kind === "unsupported" && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                This folder is not supported in Phase 1.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {state.readiness.reason}
              </p>
            </div>
          )}

          {state.kind === "error" && (
            <div className="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                We could not inspect that folder.
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
                aria-label="Choose another folder"
              >
                Choose another folder
              </Button>
              <Button size="sm" onClick={onStartFullAnalysis}>
                Start full analysis
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onChooseFolder}>
              {state.kind === "unsupported" ? "Choose another folder" : "Choose Java repository"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
