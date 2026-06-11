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
  projectType: z.enum([
    "maven",
    "gradle",
    "node",
    "rust",
    "python",
    "go",
    "dotnet",
    "php",
    "ruby",
    "cpp",
    "generic",
  ]),
  scanPath: z.string(),
  scopeLabel: z.string(),
  filesScanned: z.number(),
  entriesVisited: z.number(),
  partial: z.boolean(),
  partialReason: z.string().nullable(),
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
  activeScanPath: string | null;
  scopeLabel: string | null;
  filesScanned: number;
  entriesVisited: number;
  partial: boolean;
  partialReason: string | null;
  startAnalysis: (scanPath?: string | null) => Promise<void>;
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
    "Start full analysis to build the ranked polyglot refactor findings queue.",
  );
  const [findings, setFindings] = useState<Phase1Finding[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safety, setSafety] = useState<JavaSafetySnapshot | null>(null);
  const [activeScanPath, setActiveScanPath] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [filesScanned, setFilesScanned] = useState(0);
  const [entriesVisited, setEntriesVisited] = useState(0);
  const [partial, setPartial] = useState(false);
  const [partialReason, setPartialReason] = useState<string | null>(null);
  const pollTimerRef = useRef<number>(0);

  const applySnapshot = useCallback((snapshot: Phase1AnalysisSnapshot) => {
    const sorted = rankFindings(snapshot.findings);
    setProgress(snapshot.progress);
    setMessage(snapshot.message);
    setFindings(sorted);
    setActiveScanPath(snapshot.scanPath);
    setScopeLabel(snapshot.scopeLabel);
    setFilesScanned(snapshot.filesScanned);
    setEntriesVisited(snapshot.entriesVisited);
    setPartial(snapshot.partial);
    setPartialReason(snapshot.partialReason ?? null);
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
    setActiveScanPath(null);
    setScopeLabel(null);
    setFilesScanned(0);
    setEntriesVisited(0);
    setPartial(false);
    setPartialReason(null);
    if (repo) {
      setPanelState("empty");
      setMessage("Start full analysis to build the ranked polyglot refactor findings queue.");
      invoke<unknown>("java_safety_snapshot", {
        path: repo.path,
        workspace: currentWorkspaceEnv(),
      })
        .then((raw) => setSafety(safetySnapshotSchema.parse(raw)))
        .catch(() => setSafety(null));
    } else {
      setPanelState("empty");
      setMessage("Choose a code repository to begin.");
    }
  }, [repo, stopPolling]);

  const startAnalysis = useCallback(async (scanPath?: string | null) => {
    if (!repo) return;
    stopPolling();
    setPanelState("analyzing");
    setError(null);
    setProgress(8);
    setMessage("Preparing analysis...");
    try {
      const result = await invoke<unknown>("phase1_analysis_start", {
        repoPath: repo.path,
        scanPath: scanPath ?? null,
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
    activeScanPath,
    scopeLabel,
    filesScanned,
    entriesVisited,
    partial,
    partialReason,
    startAnalysis,
    selectFinding: setSelectedId,
  };
}
