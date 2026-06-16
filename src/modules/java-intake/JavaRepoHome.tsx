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
import { useGSAP } from "@gsap/react";
import { Float, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useRef } from "react";

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
  onPreviewDashboard: () => void;
  onStartFullAnalysis: () => void;
  onClose?: () => void;
};

function IntakePreviewScene() {
  return (
    <Canvas dpr={[1, 1.5]} className="h-full w-full">
      <color attach="background" args={["#09111c"]} />
      <fog attach="fog" args={["#09111c", 7, 16]} />
      <PerspectiveCamera makeDefault position={[0, 0, 7.4]} fov={42} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[5, 5, 4]} intensity={1.5} color="#d7d4ff" />
      <directionalLight position={[-4, -3, 3]} intensity={0.8} color="#67e8f9" />
      <PreviewCluster />
    </Canvas>
  );
}

function PreviewCluster() {
  const groupRef = useRef<any>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.18;
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.2} rotationIntensity={0.35} floatIntensity={0.85}>
        <mesh position={[0, 0.1, 0]}>
          <torusKnotGeometry args={[1.16, 0.28, 180, 24]} />
          <meshStandardMaterial
            color="#d7d4ff"
            emissive="#8b5cf6"
            emissiveIntensity={0.55}
            metalness={0.5}
            roughness={0.22}
            wireframe
          />
        </mesh>
      </Float>
      <Float speed={1.05} rotationIntensity={0.22} floatIntensity={1}>
        <mesh position={[-2.1, 1.05, -1.1]} rotation={[0.42, 0.15, 0.12]}>
          <boxGeometry args={[0.86, 0.86, 0.86]} />
          <meshStandardMaterial
            color="#5eead4"
            emissive="#0f766e"
            emissiveIntensity={0.36}
            transparent
            opacity={0.76}
            metalness={0.3}
            roughness={0.16}
          />
        </mesh>
      </Float>
      <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.95}>
        <mesh position={[2.05, -1.1, -0.7]} rotation={[0.22, -0.42, 0.35]}>
          <octahedronGeometry args={[0.88, 0]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#1d4ed8"
            emissiveIntensity={0.42}
            metalness={0.42}
            roughness={0.12}
          />
        </mesh>
      </Float>
    </group>
  );
}

export function JavaRepoHome({
  state,
  onChooseFolder,
  onPreviewDashboard,
  onStartFullAnalysis,
  onClose,
}: Props) {
  const { t } = useI18n();
  const shellRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      gsap.from(".repo-intake-reveal", {
        duration: 0.82,
        opacity: 0,
        y: 24,
        stagger: 0.08,
        ease: "power3.out",
      });
      gsap.from(".repo-intake-glow", {
        duration: 1.05,
        opacity: 0,
        scale: 0.94,
        ease: "power2.out",
      });
    },
    { scope: shellRef },
  );

  return (
    <div
      ref={shellRef}
      className="relative flex h-full min-h-0 flex-col overflow-auto bg-background px-6 py-6 text-foreground"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklab,var(--card)_88%,var(--background)),var(--background))]"
      />

      <div className="mx-auto flex w-full max-w-5xl justify-end pb-4">
        {onClose ? (
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("home.openWorkspace")}
          </Button>
        ) : null}
      </div>

      <Card
        size="sm"
        className="repo-intake-glow java-panel relative mx-auto w-full max-w-5xl overflow-hidden border border-border/70 bg-card/92 shadow-[0_28px_90px_color-mix(in_oklab,var(--background)_78%,transparent)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)] opacity-80"
        />

        <CardHeader className="gap-5 pb-2">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-stretch">
            <div className="min-w-0 space-y-5">
              <div className="repo-intake-reveal flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                <Badge variant="secondary" className="w-fit bg-primary/10 text-primary">
                  {t("repoIntake.badge")}
                </Badge>
                <span className="border border-border/70 bg-background/45 px-2 py-1">
                  {t("repoIntake.motionSystem")}
                </span>
                <span className="border border-border/70 bg-background/45 px-2 py-1">
                  {t("repoIntake.entryMode")}
                </span>
              </div>

              <div className="repo-intake-reveal max-w-2xl space-y-3">
                <CardTitle className="font-project-title text-[34px] leading-[0.96] tracking-tight sm:text-[40px]">
                  {t("repoIntake.title")}
                </CardTitle>
                <CardDescription className="max-w-2xl text-[15px] leading-7 text-muted-foreground">
                  {t("repoIntake.description")}
                </CardDescription>
              </div>

              <div className="grid gap-3 text-left text-xs text-muted-foreground sm:grid-cols-3">
                <div className="repo-intake-reveal border border-border/60 bg-background/45 px-3 py-3">
                  {t("repoIntake.rootManifest")}
                  <div className="mt-1 text-sm text-foreground">
                    {t("repoIntake.rootManifestValueFull")}
                  </div>
                </div>
                <div className="repo-intake-reveal border border-border/60 bg-background/45 px-3 py-3">
                  {t("repoIntake.analysisPosture")}
                  <div className="mt-1 text-sm text-foreground">{t("repoIntake.watchOnly")}</div>
                </div>
                <div className="repo-intake-reveal border border-border/60 bg-background/45 px-3 py-3">
                  {t("repoIntake.output")}
                  <div className="mt-1 text-sm text-foreground">{t("repoIntake.outputValue")}</div>
                </div>
              </div>

              <div className="repo-intake-reveal rounded-none border border-primary/20 bg-primary/6 px-4 py-4 text-sm text-muted-foreground">
                <div className="font-medium uppercase tracking-[0.16em] text-primary">
                  {t("repoIntake.previewMode")}
                </div>
                <p className="mt-2 max-w-3xl leading-6">
                  {t("repoIntake.previewModeDescription")}
                </p>
              </div>
            </div>

            <div className="repo-intake-reveal min-w-0">
              <div className="java-panel relative h-full min-h-[320px] overflow-hidden border border-border/70 bg-background/70">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_42%)]" />
                <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <span className="border border-border/70 bg-background/65 px-2 py-1">
                    {t("repoIntake.visualStack")}
                  </span>
                  <span className="border border-border/70 bg-background/65 px-2 py-1">
                    {t("repoIntake.motionSystemValue")}
                  </span>
                </div>
                <div className="absolute right-4 top-4 z-10">
                  <img
                    src="/app.png"
                    alt=""
                    className="size-16 object-contain opacity-80"
                    draggable={false}
                  />
                </div>
                <div className="h-[260px] sm:h-[300px]">
                  <IntakePreviewScene />
                </div>
                <div className="absolute inset-x-4 bottom-4 z-10 grid gap-2 sm:grid-cols-3">
                  <div className="border border-border/70 bg-background/78 px-3 py-2 text-xs text-muted-foreground">
                    {t("repoIntake.visualStack")}
                    <div className="mt-1 text-sm text-foreground">
                      {t("repoIntake.visualStackValue")}
                    </div>
                  </div>
                  <div className="border border-border/70 bg-background/78 px-3 py-2 text-xs text-muted-foreground">
                    {t("repoIntake.motionSystem")}
                    <div className="mt-1 text-sm text-foreground">
                      {t("repoIntake.motionSystemValue")}
                    </div>
                  </div>
                  <div className="border border-border/70 bg-background/78 px-3 py-2 text-xs text-muted-foreground">
                    {t("repoIntake.entryMode")}
                    <div className="mt-1 text-sm text-foreground">
                      {t("repoIntake.entryModeValue")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {state.kind === "idle" ? (
            <div className="border border-dashed border-primary/35 bg-primary/5 px-4 py-6 text-sm text-muted-foreground">
              {t("repoIntake.supported")}
            </div>
          ) : null}

          {state.kind === "loading" ? (
            <div className="border border-primary/25 bg-primary/6 px-4 py-6 text-sm text-muted-foreground">
              {t("repoIntake.checking")}
            </div>
          ) : null}

          {state.kind === "supported" ? (
            <div className="border border-primary/25 bg-background/70 px-4 py-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {state.readiness.projectType}
                </Badge>
                <span className="text-sm font-medium">{state.readiness.repoName}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t("repoIntake.ready")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("repoIntake.detected", {
                  projectType: state.readiness.projectType,
                })}
              </p>
            </div>
          ) : null}

          {state.kind === "unsupported" ? (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                {t("repoIntake.unsupported")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{state.readiness.reason}</p>
            </div>
          ) : null}

          {state.kind === "error" ? (
            <div className="border border-destructive/30 bg-destructive/5 px-4 py-6">
              <p className="text-sm font-medium text-foreground">
                {t("repoIntake.inspectFailed")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex-wrap justify-end gap-3">
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
              <Button size="sm" variant="outline" onClick={onPreviewDashboard}>
                {t("repoIntake.previewDashboard")}
              </Button>
              <Button size="sm" onClick={onStartFullAnalysis}>
                {t("repoIntake.startFullAnalysis")}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onPreviewDashboard}>
                {t("repoIntake.previewDashboard")}
              </Button>
              <Button size="sm" onClick={onChooseFolder}>
                {state.kind === "unsupported"
                  ? t("repoIntake.chooseAnother")
                  : t("repoIntake.chooseRepo")}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
