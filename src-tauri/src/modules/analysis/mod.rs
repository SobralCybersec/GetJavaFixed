use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::modules::java_repo::{
    classify_selected_root, inspect_repo_root, JavaProjectType,
};
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

const JAVA_FILE_LIMIT: usize = 256;
const ENTRY_LIMIT: usize = 4096;

// ── Safety snapshot ──────────────────────────────────────────────────────────

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SafetyKind {
    GitFirst,
    BackupFallback,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaSafetySnapshot {
    pub kind: SafetyKind,
    pub git_branch: Option<String>,
    pub rollback_ready: bool,
    pub message: String,
}

#[tauri::command]
pub fn java_safety_snapshot(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<JavaSafetySnapshot, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let resolved = resolve_path(&path, &workspace);
    let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
    Ok(compute_safety_snapshot(&canonical))
}

pub fn compute_safety_snapshot(root: &Path) -> JavaSafetySnapshot {
    // Walk up to find a .git directory — same logic as git rev-parse --show-toplevel
    let mut cur = root.to_path_buf();
    loop {
        if cur.join(".git").exists() {
            let branch = read_git_head_branch(&cur);
            return JavaSafetySnapshot {
                kind: SafetyKind::GitFirst,
                git_branch: branch.clone(),
                rollback_ready: true,
                message: match &branch {
                    Some(b) => format!("Git-first safety active on branch '{b}'. Changes can be rolled back with git."),
                    None => "Git-first safety active. Changes can be rolled back with git.".to_string(),
                },
            };
        }
        match cur.parent() {
            Some(p) => cur = p.to_path_buf(),
            None => break,
        }
    }
    JavaSafetySnapshot {
        kind: SafetyKind::BackupFallback,
        git_branch: None,
        rollback_ready: true,
        message: "No git repository detected. Backup-copy protection will be used before any changes are applied.".to_string(),
    }
}

fn read_git_head_branch(repo_root: &Path) -> Option<String> {
    let head = fs::read_to_string(repo_root.join(".git").join("HEAD")).ok()?;
    let head = head.trim();
    if let Some(branch) = head.strip_prefix("ref: refs/heads/") {
        return Some(branch.to_string());
    }
    None
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Phase1Finding {
    pub id: String,
    pub title: String,
    pub category: String,
    pub priority: u16,
    pub rationale: String,
    pub principles: Vec<String>,
    pub affected_files: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase1AnalysisStatus {
    Idle,
    Running,
    Completed,
    Failed,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Phase1AnalysisSnapshot {
    pub status: Phase1AnalysisStatus,
    pub progress: u8,
    pub message: String,
    pub repo_name: String,
    pub project_type: JavaProjectType,
    pub findings: Vec<Phase1Finding>,
    pub error: Option<String>,
    pub updated_at_ms: u64,
}

#[derive(Default, Clone)]
pub struct Phase1AnalysisState {
    inner: Arc<Mutex<Option<Phase1AnalysisSnapshot>>>,
}

impl Phase1AnalysisState {
    fn set(&self, snapshot: Phase1AnalysisSnapshot) {
        *self.inner.lock().expect("phase1 analysis state poisoned") = Some(snapshot);
    }

    fn get(&self) -> Option<Phase1AnalysisSnapshot> {
        self.inner
            .lock()
            .expect("phase1 analysis state poisoned")
            .clone()
    }
}

#[tauri::command]
pub async fn phase1_analysis_start(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
    analysis: tauri::State<'_, Phase1AnalysisState>,
) -> Result<Phase1AnalysisSnapshot, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let readiness = classify_selected_root(&path, &workspace, &registry)?;
    let project_type = readiness
        .project_type
        .clone()
        .ok_or_else(|| readiness.reason.unwrap_or_else(|| "Unsupported repository".to_string()))?;
    let resolved = resolve_path(&path, &workspace);
    let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
    let repo_name = readiness.repo_name.clone();

    let running = Phase1AnalysisSnapshot {
        status: Phase1AnalysisStatus::Running,
        progress: 12,
        message: "Preparing analysis…".to_string(),
        repo_name: repo_name.clone(),
        project_type: project_type.clone(),
        findings: Vec::new(),
        error: None,
        updated_at_ms: now_ms(),
    };
    analysis.set(running.clone());

    let analysis_state = analysis.inner.clone();
    tauri::async_runtime::spawn_blocking(move || {
        run_phase1_analysis(analysis_state, canonical, repo_name, project_type);
    });

    Ok(running)
}

#[tauri::command]
pub async fn phase1_analysis_status(
    analysis: tauri::State<'_, Phase1AnalysisState>,
) -> Result<Option<Phase1AnalysisSnapshot>, String> {
    Ok(analysis.get())
}

fn run_phase1_analysis(
    analysis_state: Arc<Mutex<Option<Phase1AnalysisSnapshot>>>,
    canonical: PathBuf,
    repo_name: String,
    project_type: JavaProjectType,
) {
    let state = Phase1AnalysisState {
        inner: analysis_state,
    };
    state.set(Phase1AnalysisSnapshot {
        status: Phase1AnalysisStatus::Running,
        progress: 34,
        message: "Scanning Java sources…".to_string(),
        repo_name: repo_name.clone(),
        project_type: project_type.clone(),
        findings: Vec::new(),
        error: None,
        updated_at_ms: now_ms(),
    });

    let result = scan_findings(&canonical);
    match result {
        Ok(findings) => {
            state.set(Phase1AnalysisSnapshot {
                status: Phase1AnalysisStatus::Completed,
                progress: 100,
                message: "Starter analysis complete.".to_string(),
                repo_name,
                project_type,
                findings,
                error: None,
                updated_at_ms: now_ms(),
            });
        }
        Err(error) => {
            state.set(Phase1AnalysisSnapshot {
                status: Phase1AnalysisStatus::Failed,
                progress: 100,
                message: "Analysis failed.".to_string(),
                repo_name,
                project_type,
                findings: Vec::new(),
                error: Some(error),
                updated_at_ms: now_ms(),
            });
        }
    }
}

pub fn scan_findings(root: &Path) -> Result<Vec<Phase1Finding>, String> {
    let mut java_files = Vec::new();
    collect_java_files(root, &mut java_files)?;

    let mut findings = Vec::new();
    for path in &java_files {
        let rel = path
            .strip_prefix(root)
            .map(crate::modules::fs::to_canon)
            .map_err(|e| e.to_string())?;
        let content = fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let line_count = content.lines().count();

        // ── Safe refactor findings (ANLY-01) ─────────────────────────────────
        if content.contains("System.out.println") {
            findings.push(Phase1Finding {
                id: format!("println:{rel}"),
                title: "Console output left in production code".to_string(),
                category: "safe".to_string(),
                priority: 92,
                rationale: "Direct console output is a quick signal for refactor cleanup. It often points to debugging residue that should be replaced with structured logging or removed.".to_string(),
                principles: vec!["CleanCode".to_string(), "KISS".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if content
            .lines()
            .any(|line| line.trim_start().starts_with("import ") && line.contains(".*;"))
        {
            findings.push(Phase1Finding {
                id: format!("wildcard-import:{rel}"),
                title: "Wildcard imports can hide unnecessary dependencies".to_string(),
                category: "safe".to_string(),
                priority: 62,
                rationale: "Wildcard imports are a small but deterministic signal for DRY and Clean Code tightening because they obscure what the file truly depends on.".to_string(),
                principles: vec!["DRY".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        // Catch-all empty catch blocks — safe to flag, risky to leave
        if content.contains("catch (") {
            let mut in_catch = false;
            let mut brace_depth = 0i32;
            let mut catch_body_start = false;
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("catch (") || trimmed.contains(" catch (") {
                    in_catch = true;
                    brace_depth = 0;
                    catch_body_start = false;
                }
                if in_catch {
                    for ch in trimmed.chars() {
                        if ch == '{' {
                            brace_depth += 1;
                            if brace_depth == 1 {
                                catch_body_start = true;
                            }
                        } else if ch == '}' {
                            brace_depth -= 1;
                            if brace_depth == 0 && catch_body_start {
                                // empty catch: only whitespace/braces between { }
                                in_catch = false;
                            }
                        }
                    }
                }
            }
            // Simpler heuristic: look for `catch (` followed by `}` with nothing between
            let lines_vec: Vec<&str> = content.lines().collect();
            for i in 0..lines_vec.len().saturating_sub(1) {
                let l = lines_vec[i].trim();
                if (l.starts_with("catch (") || l.contains(" catch (")) && l.ends_with('{') {
                    if let Some(next) = lines_vec.get(i + 1) {
                        if next.trim() == "}" {
                            findings.push(Phase1Finding {
                                id: format!("empty-catch:{rel}:{i}"),
                                title: "Empty catch block silently swallows exceptions".to_string(),
                                category: "safe".to_string(),
                                priority: 88,
                                rationale: "An empty catch block hides failures and makes debugging very hard. At minimum, log the exception or rethrow it.".to_string(),
                                principles: vec!["CleanCode".to_string(), "SOLID".to_string()],
                                affected_files: vec![rel.clone()],
                            });
                            break;
                        }
                    }
                }
            }
        }

        // ── Performance findings (ANLY-02) ───────────────────────────────────
        if line_count > 180 {
            findings.push(Phase1Finding {
                id: format!("long-file:{rel}"),
                title: "Large Java file may hide extract-method opportunities".to_string(),
                category: "performance".to_string(),
                priority: 84,
                rationale: format!(
                    "{rel} is {line_count} lines long. Large files are a strong heuristic for KISS and SOLID follow-up work and can hide hot-path complexity."
                ),
                principles: vec!["KISS".to_string(), "SOLID".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        // String concatenation inside loops is a classic performance issue
        {
            let mut in_loop = false;
            for line in content.lines() {
                let t = line.trim();
                if t.starts_with("for ") || t.starts_with("while ") || t.starts_with("do {") {
                    in_loop = true;
                }
                let looks_like_concat_assignment = t.contains(" = ")
                    && t.contains(" + ")
                    && t.ends_with(';')
                    && !t.starts_with("for ");
                if in_loop && (t.contains(" += \"") || t.contains(" + \"") || looks_like_concat_assignment) {
                    findings.push(Phase1Finding {
                        id: format!("string-concat-loop:{rel}"),
                        title: "String concatenation inside loop — use StringBuilder".to_string(),
                        category: "performance".to_string(),
                        priority: 80,
                        rationale: "Concatenating strings with + inside a loop creates a new String object on every iteration. Replace with StringBuilder for O(n) instead of O(n²) allocation.".to_string(),
                        principles: vec!["KISS".to_string(), "CleanCode".to_string()],
                        affected_files: vec![rel.clone()],
                    });
                    break;
                }
                if t == "}" {
                    in_loop = false;
                }
            }
        }

        // Repeated calls to size() in loop condition
        if content.contains(".size()") {
            for line in content.lines() {
                let t = line.trim();
                if (t.starts_with("for (") || t.starts_with("while ("))
                    && t.contains(".size()")
                {
                    findings.push(Phase1Finding {
                        id: format!("size-in-loop:{rel}"),
                        title: "Collection .size() called in loop condition".to_string(),
                        category: "performance".to_string(),
                        priority: 72,
                        rationale: "Calling .size() in a loop condition re-evaluates on every iteration. Cache the size in a local variable before the loop.".to_string(),
                        principles: vec!["KISS".to_string(), "YAGNI".to_string()],
                        affected_files: vec![rel.clone()],
                    });
                    break;
                }
            }
        }

        // ── Modernization findings (ANLY-03) ─────────────────────────────────
        if content.contains("Vector<")
            || content.contains("Hashtable<")
            || content.contains("Enumeration<")
        {
            findings.push(Phase1Finding {
                id: format!("legacy-collections:{rel}"),
                title: "Legacy collection usage suggests modernization work".to_string(),
                category: "modernization".to_string(),
                priority: 78,
                rationale: "Older collection types can signal modernization opportunities that simplify concurrency and readability decisions.".to_string(),
                principles: vec!["YAGNI".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        // Raw types (pre-generics)
        if content.contains("List ") && !content.contains("List<") {
            findings.push(Phase1Finding {
                id: format!("raw-type:{rel}"),
                title: "Raw collection type — add generic type parameter".to_string(),
                category: "modernization".to_string(),
                priority: 74,
                rationale: "Raw types bypass compile-time type safety. Adding a generic parameter is a safe modernization that improves readability and catches bugs earlier.".to_string(),
                principles: vec!["CleanCode".to_string(), "SOLID".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        // instanceof without pattern matching (Java 16+)
        if content.contains("instanceof ") && !content.contains("instanceof (") {
            let has_old_instanceof = content.lines().any(|line| {
                let t = line.trim();
                t.contains("instanceof ") && !t.contains("instanceof (") && t.contains("(") && t.contains(")")
            });
            if has_old_instanceof {
                findings.push(Phase1Finding {
                    id: format!("instanceof-pattern:{rel}"),
                    title: "instanceof without pattern matching — modernize to Java 16+ syntax".to_string(),
                    category: "modernization".to_string(),
                    priority: 58,
                    rationale: "Java 16+ pattern matching for instanceof removes the need for an explicit cast after the check, reducing boilerplate and improving readability.".to_string(),
                    principles: vec!["CleanCode".to_string(), "YAGNI".to_string()],
                    affected_files: vec![rel.clone()],
                });
            }
        }
    }

    findings.sort_by(|left, right| {
        right
            .priority
            .cmp(&left.priority)
            .then_with(|| left.title.cmp(&right.title))
            .then_with(|| left.affected_files.cmp(&right.affected_files))
    });
    findings.dedup_by(|left, right| left.id == right.id);

    if findings.is_empty() {
        let readiness = inspect_repo_root(root)?;
        findings.push(Phase1Finding {
            id: format!("starter-scan:{}", readiness.repo_name),
            title: "Starter scan found no obvious lightweight heuristics".to_string(),
            category: "maintainability".to_string(),
            priority: 24,
            rationale: "Phase 1 ran a real repository scan but did not find the small deterministic heuristics it checks today. This still confirms the dashboard pipeline is analyzing the selected root.".to_string(),
            principles: vec!["KISS".to_string(), "YAGNI".to_string()],
            affected_files: Vec::new(),
        });
    }

    Ok(findings)
}

fn collect_java_files(root: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let mut stack = vec![PathBuf::from(root)];
    let mut entries_seen = 0usize;

    while let Some(dir) = stack.pop() {
        let entries = fs::read_dir(&dir)
            .map_err(|e| format!("failed to scan {}: {e}", dir.display()))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("failed to read {}: {e}", dir.display()))?;
            entries_seen += 1;
            if entries_seen > ENTRY_LIMIT || files.len() >= JAVA_FILE_LIMIT {
                return Ok(());
            }

            let path = entry.path();
            let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };
            if path.is_dir() {
                if should_skip_dir(name) {
                    continue;
                }
                stack.push(path);
                continue;
            }
            if path
                .extension()
                .and_then(|value| value.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("java"))
            {
                files.push(path);
            }
        }
    }

    Ok(())
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | ".gradle" | "target" | "build" | "node_modules" | ".idea"
    )
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis() as u64
}
