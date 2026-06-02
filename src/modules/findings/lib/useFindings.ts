import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { currentWorkspaceEnv } from "@/modules/workspace";
import type { SupportedJavaRepoReadiness } from "@/modules/java-intake";

const findingSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  priority: z.number(),
  rationale: z.string(),
  principles: z.array(z.string()),
  affectedFiles: z.array(z.string()),
});

const snapshotSchema = z.object({
  status: z.enum(["idle", "running", "completed", "failed"]),
  progress: z.number(),
  message: z.string(),
  repoName: z.string(),
  projectType: z.enum(["maven", "gradle"]),
  findings: z.array(findingSchema),
  error: z.string().nullable(),
  updatedAtMs: z.number(),
});

const safetySnapshotSchema = z.object({
  kind: z.enum(["gitFirst", "backupFallback"]),
  gitBranch: z.string().nullable().optional(),
  rollbackReady: z.boolean(),
  message: z.string(),
});

export type Phase1Finding = z.infer<typeof findingSchema>;
type Phase1AnalysisSnapshot = z.infer<typeof snapshotSchema>;
export type JavaSafetySnapshot = z.infer<typeof safetySnapshotSchema>;

export type FindingsPanelState = "empty" | "analyzing" | "ready" | "error";

export type FindingsRepo = {
  path: string;
  readiness: SupportedJavaRepoReadiness;
};

type UseFindingsResult = {
  panelState: FindingsPanelState;
  progress: number;
  message: string;
  findings: Phase1Finding[];
  selectedFinding: Phase1Finding | null;
  error: string | null;
  safety: JavaSafetySnapshot | null;
  startAnalysis: () => Promise<void>;
  selectFinding: (id: string) => void;
};

const POLL_INTERVAL_MS = 350;

function rankFindings(findings: Phase1Finding[]): Phase1Finding[] {
  return [...findings].sort((left, right) => {
    return right.priority - left.priority ||
      left.title.localeCompare(right.title) ||
      left.id.localeCompare(right.id);
  });
}

export function useFindings(repo: FindingsRepo | null): UseFindingsResult {
  const [panelState, setPanelState] = useState<FindingsPanelState>("empty");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(
    "Start full analysis to build the ranked refactor findings queue.",
  );
  const [findings, setFindings] = useState<Phase1Finding[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safety, setSafety] = useState<JavaSafetySnapshot | null>(null);
  const pollTimerRef = useRef<number>(0);

  const applySnapshot = useCallback((snapshot: Phase1AnalysisSnapshot) => {
    const sorted = rankFindings(snapshot.findings);
    setProgress(snapshot.progress);
    setMessage(snapshot.message);
    setFindings(sorted);
    if (snapshot.status === "failed") {
      setPanelState("error");
      setError(snapshot.error ?? "Analysis failed.");
      return;
    }
    if (snapshot.status === "completed") {
      setPanelState("ready");
      setError(null);
      setSelectedId((current) =>
        current && sorted.some((finding) => finding.id === current)
          ? current
          : (sorted[0]?.id ?? null),
      );
      return;
    }
    if (snapshot.status === "running") {
      setPanelState("analyzing");
      setError(null);
    }
  }, []);

  const readStatus = useCallback(async () => {
    const result = await invoke<unknown>("phase1_analysis_status");
    if (!result) return null;
    return snapshotSchema.parse(result);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = 0;
    }
  }, []);

  const pollUntilSettled = useCallback(async () => {
    const snapshot = await readStatus();
    if (!snapshot) {
      pollTimerRef.current = window.setTimeout(pollUntilSettled, POLL_INTERVAL_MS);
      return;
    }
    applySnapshot(snapshot);
    if (snapshot.status === "running") {
      pollTimerRef.current = window.setTimeout(pollUntilSettled, POLL_INTERVAL_MS);
    }
  }, [applySnapshot, readStatus]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  useEffect(() => {
    stopPolling();
    setFindings([]);
    setSelectedId(null);
    setProgress(0);
    setError(null);
    setSafety(null);
    if (repo) {
      setPanelState("empty");
      setMessage("Start full analysis to build the ranked refactor findings queue.");
      // Load safety snapshot eagerly when repo changes
      invoke<unknown>("java_safety_snapshot", {
        path: repo.path,
        workspace: currentWorkspaceEnv(),
      })
        .then((raw) => setSafety(safetySnapshotSchema.parse(raw)))
        .catch(() => setSafety(null));
    } else {
      setPanelState("empty");
      setMessage("Choose a supported Java repository to begin.");
    }
  }, [repo, stopPolling]);

  const startAnalysis = useCallback(async () => {
    if (!repo) return;
    stopPolling();
    setPanelState("analyzing");
    setError(null);
    setProgress(8);
    setMessage("Preparing analysis…");
    try {
      const result = await invoke<unknown>("phase1_analysis_start", {
        path: repo.path,
        workspace: currentWorkspaceEnv(),
      });
      applySnapshot(snapshotSchema.parse(result));
      pollTimerRef.current = window.setTimeout(pollUntilSettled, POLL_INTERVAL_MS);
    } catch (cause) {
      setPanelState("error");
      setError(cause instanceof Error ? cause.message : String(cause));
      setMessage("Analysis failed to start.");
    }
  }, [applySnapshot, pollUntilSettled, repo, stopPolling]);

  const selectedFinding = useMemo(
    () => findings.find((finding) => finding.id === selectedId) ?? null,
    [findings, selectedId],
  );

  return {
    panelState,
    progress,
    message,
    findings,
    selectedFinding,
    error,
    safety,
    startAnalysis,
    selectFinding: setSelectedId,
  };
}
