import { Button } from "@/components/ui/button";
import { revealInFinder } from "@/modules/explorer/lib/contextActions";
import { native } from "@/modules/ai/lib/native";
import { useI18n } from "@/modules/i18n";
import { setRefactorCustomInstructions } from "@/modules/settings/store";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionHeader } from "../components/SectionHeader";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera, OrbitControls, Box } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef as useThreeRef } from "react";
import { openPath } from "@tauri-apps/plugin-opener";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement);

// 3D Rotating Cube for visualization
function RotatingCube() {
  const meshRef = useThreeRef<any>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.003;
      meshRef.current.rotation.y += 0.005;
    }
  });
  
  return (
    <Box ref={meshRef} args={[2, 2, 2]}>
      <meshStandardMaterial color="#8b5cf6" wireframe emissive="#7c3aed" emissiveIntensity={0.5} />
    </Box>
  );
}

export function RefactorSection() {
  const { t } = useI18n();
  const storedInstructions = usePreferencesStore((s) => s.refactorCustomInstructions);
  const [refactorInstructions, setRefactorInstructions] = useState(storedInstructions);
  const [rules, setRules] = useState<string[]>([]);
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [ruleContent, setRuleContent] = useState("");
  const [rulesRoot, setRulesRoot] = useState<string | null>(null);
  const [loadingRules, setLoadingRules] = useState(true);
  const [rulesError, setRulesError] = useState<string | null>(null);
  
  // Visualization state
  const containerRef = useRef(null);
  const statsRef = useRef(null);
  const activeRuleCount = useMemo(() => Math.max(rules.length - 1, 0), [rules.length]);
  const coverage = useMemo(
    () => (rules.length > 0 ? Math.round((activeRuleCount / rules.length) * 100) : 0),
    [activeRuleCount, rules.length],
  );
  const ruleStats = useMemo(
    () => ({
      total: rules.length,
      active: activeRuleCount,
      coverage,
    }),
    [activeRuleCount, coverage, rules.length],
  );

  useEffect(() => {
    setRefactorInstructions(storedInstructions);
  }, [storedInstructions]);

  useEffect(() => {
    let cancelled = false;

    async function loadRules() {
      setLoadingRules(true);
      setRulesError(null);
      try {
        await native.refactorRulesExportDefaults();
        const [root, files] = await Promise.all([
          native.refactorRulesRoot(),
          native.refactorRulesList(),
        ]);
        if (cancelled) return;
        setRulesRoot(root);
        setRules(files);
        setSelectedRule((current) => (current && files.includes(current) ? current : files[0] ?? null));
      } catch (error) {
        if (cancelled) return;
        setRules([]);
        setSelectedRule(null);
        setRuleContent("");
        setRulesError(String(error));
      } finally {
        if (!cancelled) {
          setLoadingRules(false);
        }
      }
    }

    void loadRules();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRuleContent() {
      if (!rulesRoot || !selectedRule) {
        setRuleContent("");
        return;
      }
      try {
        const result = await native.readFile(`${rulesRoot}/${selectedRule}`);
        if (cancelled) return;
        if (result.kind !== "text") {
          setRulesError(t("models.ruleFileNotReadable"));
          setRuleContent("");
          return;
        }
        setRulesError(null);
        setRuleContent(result.content);
      } catch (error) {
        if (cancelled) return;
        setRulesError(String(error));
        setRuleContent("");
      }
    }

    void loadRuleContent();
    return () => {
      cancelled = true;
    };
  }, [rulesRoot, selectedRule, t]);

  const handleSaveInstructions = async () => {
    await setRefactorCustomInstructions(refactorInstructions);
  };

  const handleOpenRulesFolder = async () => {
    if (!rulesRoot) return;
    await openPath(rulesRoot);
  };

  const handleOpenBuilderFile = async () => {
    if (!rulesRoot) return;
    await openPath(`${rulesRoot}/manifest.json`);
  };

  const handleSaveSelectedRule = async () => {
    if (!rulesRoot || !selectedRule) return;
    await native.writeFile(`${rulesRoot}/${selectedRule}`, ruleContent);
  };

  const handleRevealRulesFolder = async () => {
    if (!rulesRoot) return;
    await revealInFinder(rulesRoot);
  };

  const handleRevealManifest = async () => {
    if (!rulesRoot) return;
    await revealInFinder(`${rulesRoot}/manifest.json`);
  };

  // GSAP animations - simplified to avoid scope issues
  useGSAP(
    () => {
      // Animate stats cards on load
      const statCards = document.querySelectorAll(".stat-card");
      if (statCards.length > 0) {
        gsap.from(statCards, {
          duration: 0.8,
          opacity: 0,
          y: 20,
          stagger: 0.1,
          ease: "back.out",
        });
      }

      // Animate visualizations
      const chartContainer = document.querySelector(".chart-container");
      if (chartContainer) {
        gsap.from(chartContainer, {
          duration: 1,
          opacity: 0,
          scale: 0.8,
          delay: 0.2,
          ease: "back.out",
        });
      }

      const viz3d = document.querySelector(".viz-3d-container");
      if (viz3d) {
        gsap.from(viz3d, {
          duration: 1,
          opacity: 0,
          scale: 0.8,
          delay: 0.3,
          ease: "back.out",
        });
      }
    }
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-6">
      <SectionHeader
        title={t("settings.tabs.refactor", { defaultValue: "Refactor" })}
        description={t("models.refactorPromptDescription")}
      />

      {/* Statistics Dashboard */}
      <div ref={statsRef} className="grid grid-cols-3 gap-3">
        <div className="stat-card flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-4 py-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("models.ruleFiles")}
          </span>
          <span className="text-2xl font-bold text-foreground">{ruleStats.total}</span>
          <div className="h-1 rounded-full bg-border/40">
            <div className="h-full w-full rounded-full bg-linear-to-r from-violet-500 to-purple-500" />
          </div>
        </div>
        
        <div className="stat-card flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-4 py-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("refactor.active", { defaultValue: "Active" })}
          </span>
          <span className="text-2xl font-bold text-emerald-400">{ruleStats.active}</span>
          <div className="h-1 rounded-full bg-border/40">
            <div style={{ width: `${ruleStats.total > 0 ? (ruleStats.active / ruleStats.total) * 100 : 0}%` }} className="h-full rounded-full bg-linear-to-r from-emerald-500 to-green-500 transition-all duration-300" />
          </div>
        </div>
        
        <div className="stat-card flex flex-col gap-2 rounded-lg border border-border/60 bg-card/60 px-4 py-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            {t("refactor.coverage", { defaultValue: "Coverage" })}
          </span>
          <span className="text-2xl font-bold text-sky-400">{ruleStats.coverage}%</span>
          <div className="h-1 rounded-full bg-border/40">
            <div style={{ width: `${ruleStats.coverage}%` }} className="h-full rounded-full bg-linear-to-r from-sky-500 to-blue-500 transition-all duration-300" />
          </div>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Chart.js Visualization */}
        <div className="chart-container rounded-lg border border-border/60 bg-card/60 p-4">
          <h3 className="mb-4 text-sm font-medium text-foreground">
            {t("refactor.rulesDistribution", { defaultValue: "Rules Distribution" })}
          </h3>
          <Doughnut
            data={{
              labels: [
                t("refactor.active", { defaultValue: "Active" }),
                t("refactor.inactive", { defaultValue: "Inactive" }),
              ],
              datasets: [
                {
                  data: [ruleStats.active, ruleStats.total - ruleStats.active],
                  backgroundColor: ["#8b5cf6", "#3f3f46"],
                  borderColor: ["#7c3aed", "#27272a"],
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: "bottom" as const,
                  labels: {
                    color: "oklch(0.94 0.008 85)",
                    font: { size: 11 },
                    padding: 15,
                  },
                },
              },
            }}
          />
        </div>

        {/* 3D Visualization */}
        <div className="viz-3d-container relative rounded-lg border border-border/60 bg-card/60 p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">
            {t("refactor.visualization", { defaultValue: "3D Refactor Rules" })}
          </h3>
          <div className="aspect-square rounded-lg bg-background/40">
            <Canvas camera={{ position: [0, 0, 5] }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <RotatingCube />
              <OrbitControls autoRotate autoRotateSpeed={2} />
              <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            </Canvas>
          </div>
        </div>
      </div>

      {/* Refactor Instructions Section */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
          {t("models.refactorPromptControl")}
        </span>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("models.refactorPromptControlHelp")}
          </p>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            {t("models.refactorPromptControlHelpSecondary")}
          </p>
          <textarea
            value={refactorInstructions}
            onChange={(e) => setRefactorInstructions(e.target.value)}
            placeholder={t("models.refactorPromptPlaceholder")}
            className="flex field-sizing-content w-full rounded-2xl border border-border bg-card/50 px-3 py-3 font-mono text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-3 focus:ring-ring/20 resize-y min-h-32 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="text-[11px] h-8"
              onClick={handleSaveInstructions}
            >
              {t("models.saveRefactorInstructions")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-8"
              onClick={handleOpenRulesFolder}
            >
              {t("models.openRulesFolder")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-[11px] h-8"
              onClick={handleOpenBuilderFile}
            >
              {t("models.openBuilderFile")}
            </Button>
          </div>
        </div>
      </div>

      {/* Refactor Rules Section */}
      <div className="flex flex-col gap-3">
        <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
          {t("models.refactorRules")}
        </span>
        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card/60 px-3 py-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("models.refactorRulesDescription")}
          </p>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground/80">
            {rulesError
              ? rulesError
              : loadingRules
                ? t("models.loadingRulesFolder")
                : rulesRoot
                  ? t("models.rulesFolderValue", { path: rulesRoot })
                  : t("models.loadingRulesFolder")}
          </p>

          <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
            {/* Rule Files List */}
            <div className="rounded-lg border border-border/60 bg-card/50 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {t("models.ruleFiles")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px] h-7 px-2"
                  onClick={() => {
                    setLoadingRules(true);
                    setRulesError(null);
                    void Promise.all([native.refactorRulesRoot(), native.refactorRulesList()])
                      .then(([root, files]) => {
                        setRulesRoot(root);
                        setRules(files);
                        setSelectedRule((current) => (current && files.includes(current) ? current : files[0] ?? null));
                      })
                      .catch((error) => {
                        setRulesError(String(error));
                      })
                      .finally(() => {
                        setLoadingRules(false);
                      });
                  }}
                >
                  {t("refactor.refresh", { defaultValue: "Refresh" })}
                </Button>
              </div>
              <div className="flex max-h-80 flex-col gap-1 overflow-auto">
                {loadingRules ? (
                  <div className="text-[11px] text-muted-foreground/60 px-2 py-2">
                    {t("models.loadingRulesFolder")}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-[11px] text-muted-foreground/60 px-2 py-2">
                    {t("refactor.noRules", { defaultValue: "No rules found" })}
                  </div>
                ) : (
                  rules.map((rule) => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => {
                        setSelectedRule(rule);
                        // TODO: Load rule content
                      }}
                      className={`text-left px-2 py-1.5 rounded text-[11px] transition-colors ${
                        selectedRule === rule
                          ? "bg-accent text-foreground"
                          : "text-muted-foreground hover:bg-accent/30"
                      }`}
                    >
                      {rule}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Rule Editor */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-5 items-center justify-center rounded border border-border px-2 text-xs font-medium text-foreground">
                  {selectedRule ? selectedRule : t("models.noRuleSelected")}
                </span>
              </div>

              <textarea
                value={ruleContent}
                onChange={(e) => setRuleContent(e.target.value)}
                placeholder={t("models.selectRulePlaceholder")}
                className="flex field-sizing-content w-full rounded-2xl border border-border bg-card/50 px-3 py-3 font-mono text-[11.5px] leading-relaxed outline-none placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-3 focus:ring-ring/20 resize-y min-h-80 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedRule}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="text-[11px] h-8"
                  onClick={handleSaveSelectedRule}
                  disabled={!selectedRule}
                >
                  {t("models.saveSelectedRule")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8"
                  onClick={handleRevealRulesFolder}
                >
                  {t("models.revealRulesFolder")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-[11px] h-8"
                  onClick={handleRevealManifest}
                >
                  {t("models.revealManifest")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
