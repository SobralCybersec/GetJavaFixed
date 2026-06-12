use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use ignore::WalkBuilder;
use serde::Serialize;

use crate::modules::java_repo::{classify_selected_root, inspect_repo_root, JavaProjectType};
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

const CODE_FILE_LIMIT: usize = 8_000;
const ENTRY_LIMIT: usize = 100_000;

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
    pub scan_path: String,
    pub scope_label: String,
    pub files_scanned: usize,
    pub entries_visited: usize,
    pub partial: bool,
    pub partial_reason: Option<String>,
    pub findings: Vec<Phase1Finding>,
    pub error: Option<String>,
    pub updated_at_ms: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScanFindingsResult {
    pub findings: Vec<Phase1Finding>,
    pub files_scanned: usize,
    pub entries_visited: usize,
    pub partial: bool,
    pub partial_reason: Option<String>,
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
    repo_path: String,
    scan_path: Option<String>,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
    analysis: tauri::State<'_, Phase1AnalysisState>,
) -> Result<Phase1AnalysisSnapshot, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    let readiness = classify_selected_root(&repo_path, &workspace, &registry)?;
    let project_type = readiness.project_type.clone().ok_or_else(|| {
        readiness
            .reason
            .unwrap_or_else(|| "Unsupported repository".to_string())
    })?;
    let resolved_repo = resolve_path(&repo_path, &workspace);
    let canonical_repo = registry
        .authorize(&resolved_repo)
        .map_err(|e| e.to_string())?;
    let requested_scan = scan_path.unwrap_or_else(|| repo_path.clone());
    let resolved_scan = resolve_path(&requested_scan, &workspace);
    let canonical_scan = registry
        .canonicalize_cached(&resolved_scan)
        .map_err(|e| format!("scan path not accessible: {e}"))?;
    if !canonical_scan.is_dir() {
        return Err("scan path must be a directory".to_string());
    }
    if !canonical_scan.starts_with(&canonical_repo) {
        return Err("scan path must stay inside the selected repository".to_string());
    }
    let repo_name = readiness.repo_name.clone();
    let scan_path_string = crate::modules::fs::to_canon(&canonical_scan);
    let scope_label = if canonical_scan == canonical_repo {
        "Whole repository".to_string()
    } else {
        let rel = canonical_scan
            .strip_prefix(&canonical_repo)
            .ok()
            .map(crate::modules::fs::to_canon)
            .unwrap_or_else(|| scan_path_string.clone());
        format!("Folder: {rel}")
    };

    let running = Phase1AnalysisSnapshot {
        status: Phase1AnalysisStatus::Running,
        progress: 12,
        message: "Preparing analysis…".to_string(),
        repo_name: repo_name.clone(),
        project_type: project_type.clone(),
        scan_path: scan_path_string.clone(),
        scope_label: scope_label.clone(),
        files_scanned: 0,
        entries_visited: 0,
        partial: false,
        partial_reason: None,
        findings: Vec::new(),
        error: None,
        updated_at_ms: now_ms(),
    };
    analysis.set(running.clone());

    let analysis_state = analysis.inner.clone();
    tauri::async_runtime::spawn_blocking(move || {
        run_phase1_analysis(
            analysis_state,
            canonical_repo,
            canonical_scan,
            repo_name,
            project_type,
            scan_path_string,
            scope_label,
        );
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
    repo_root: PathBuf,
    scan_root: PathBuf,
    repo_name: String,
    project_type: JavaProjectType,
    scan_path: String,
    scope_label: String,
) {
    let state = Phase1AnalysisState {
        inner: analysis_state,
    };
    state.set(Phase1AnalysisSnapshot {
        status: Phase1AnalysisStatus::Running,
        progress: 34,
        message: "Scanning code sources...".to_string(),
        repo_name: repo_name.clone(),
        project_type: project_type.clone(),
        scan_path: scan_path.clone(),
        scope_label: scope_label.clone(),
        files_scanned: 0,
        entries_visited: 0,
        partial: false,
        partial_reason: None,
        findings: Vec::new(),
        error: None,
        updated_at_ms: now_ms(),
    });

    let result = scan_findings_in_scope(&repo_root, &scan_root);
    match result {
        Ok(result) => {
            state.set(Phase1AnalysisSnapshot {
                status: Phase1AnalysisStatus::Completed,
                progress: 100,
                message: if result.partial {
                    "Analysis complete with partial scan limits.".to_string()
                } else {
                    "Starter analysis complete.".to_string()
                },
                repo_name,
                project_type,
                scan_path,
                scope_label,
                files_scanned: result.files_scanned,
                entries_visited: result.entries_visited,
                partial: result.partial,
                partial_reason: result.partial_reason,
                findings: result.findings,
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
                scan_path,
                scope_label,
                files_scanned: 0,
                entries_visited: 0,
                partial: false,
                partial_reason: None,
                findings: Vec::new(),
                error: Some(error),
                updated_at_ms: now_ms(),
            });
        }
    }
}

pub fn scan_findings(root: &Path) -> Result<Vec<Phase1Finding>, String> {
    Ok(scan_findings_in_scope(root, root)?.findings)
}

fn scan_findings_in_scope(
    repo_root: &Path,
    scan_root: &Path,
) -> Result<ScanFindingsResult, String> {
    let scan = collect_code_files(scan_root)?;

    let mut findings = repo_tooling_findings(repo_root);
    for path in &scan.files {
        let rel = path
            .strip_prefix(repo_root)
            .map(crate::modules::fs::to_canon)
            .map_err(|e| e.to_string())?;
        let content = fs::read_to_string(path)
            .map_err(|e| format!("failed to read {}: {e}", path.display()))?;
        let lines: Vec<&str> = content.lines().collect();
        let line_count = lines.len();

        if has_debug_output(&content) {
            findings.push(Phase1Finding {
                id: format!("debug-output:{rel}"),
                title: "Debug output left in production code".to_string(),
                category: "safe".to_string(),
                priority: 92,
                rationale: "Direct console output is a quick signal for refactor cleanup. It often points to debugging residue that should be replaced with structured logging, tracing, or removed.".to_string(),
                principles: vec!["CleanCode".to_string(), "KISS".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_wildcard_import(&lines) {
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

        if content.contains("catch (") {
            for i in 0..lines.len().saturating_sub(1) {
                let l = lines[i].trim();
                if (l.starts_with("catch (") || l.contains(" catch (")) && l.ends_with('{') {
                    if let Some(next) = lines.get(i + 1) {
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

        if line_count > 180 {
            findings.push(Phase1Finding {
                id: format!("long-file:{rel}"),
                title: "Large source file may hide extract-method opportunities".to_string(),
                category: "performance".to_string(),
                priority: 84,
                rationale: format!(
                    "{rel} is {line_count} lines long. Large files are a strong heuristic for KISS and SOLID follow-up work and can hide hot-path complexity."
                ),
                principles: vec!["KISS".to_string(), "SOLID".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        {
            let mut in_loop = false;
            for line in &lines {
                let t = line.trim();
                if t.starts_with("for ") || t.starts_with("while ") || t.starts_with("do {") {
                    in_loop = true;
                }
                let looks_like_concat_assignment = t.contains(" = ")
                    && t.contains(" + ")
                    && t.ends_with(';')
                    && !t.starts_with("for ");
                if in_loop
                    && (t.contains(" += \"") || t.contains(" + \"") || looks_like_concat_assignment)
                {
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

        if content.contains(".size()") {
            for line in &lines {
                let t = line.trim();
                if (t.starts_with("for (") || t.starts_with("while (")) && t.contains(".size()") {
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

        if content.contains("instanceof ") && !content.contains("instanceof (") {
            let has_old_instanceof = lines.iter().any(|line| {
                let t = line.trim();
                t.contains("instanceof ")
                    && !t.contains("instanceof (")
                    && t.contains("(")
                    && t.contains(")")
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

        if has_deep_nesting(&content) {
            findings.push(Phase1Finding {
                id: format!("deep-nesting:{rel}"),
                title: "Deep nesting suggests guard-clause refactoring".to_string(),
                category: "maintainability".to_string(),
                priority: 86,
                rationale: "Heavily nested control flow makes the happy path harder to read. Flattening with guard clauses or tiny extractions improves KISS and reviewability.".to_string(),
                principles: vec!["KISS".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_control_flow_flattening_signal(&content) {
            findings.push(Phase1Finding {
                id: format!("control-flow-flattening:{rel}"),
                title: "Control-flow flattening pattern suggests obfuscation".to_string(),
                category: "cybersecurity".to_string(),
                priority: 94,
                rationale: "A dispatcher loop with many switch cases and repeated state transitions is a common obfuscation shape. Review it as potentially flattened control flow before refactoring or trusting behavior.".to_string(),
                principles: vec!["KISS".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_duplicate_logic(&content) {
            findings.push(Phase1Finding {
                id: format!("duplicate-code:{rel}"),
                title: "Repeated local logic suggests extraction".to_string(),
                category: "maintainability".to_string(),
                priority: 83,
                rationale: "Repeated statement patterns are a strong DRY signal. Extracting the repeated logic usually shrinks risk and makes behavior easier to change safely.".to_string(),
                principles: vec!["DRY".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_potential_null_risk(&content) {
            findings.push(Phase1Finding {
                id: format!("potential-null:{rel}"),
                title: "Likely null-sensitive dereference pattern".to_string(),
                category: "safe".to_string(),
                priority: 90,
                rationale: "Calling methods like equals or trim on a variable can throw if the value is null. Favor null-safe order or a guard clause.".to_string(),
                principles: vec!["SOLID".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_repeated_call_cache_opportunity(&content) {
            findings.push(Phase1Finding {
                id: format!("repeated-call-cache:{rel}"),
                title: "Repeated method calls suggest local caching".to_string(),
                category: "performance".to_string(),
                priority: 76,
                rationale: "Repeating the same method call in a tight block or loop can add noise and cost. Cache the value once when semantics are stable.".to_string(),
                principles: vec!["KISS".to_string(), "YAGNI".to_string()],
                affected_files: vec![rel.clone()],
            });
        }

        if has_tell_dont_ask_candidate(&content) {
            findings.push(Phase1Finding {
                id: format!("tell-dont-ask:{rel}"),
                title: "Object state is queried before telling it what to do".to_string(),
                category: "maintainability".to_string(),
                priority: 81,
                rationale: "Checking an object's internal state from the outside before invoking behavior is a classic Tell Don't Ask smell. A tiny move toward object-owned behavior often improves encapsulation and readability.".to_string(),
                principles: vec!["SOLID".to_string(), "CleanCode".to_string()],
                affected_files: vec![rel.clone()],
            });
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
        let readiness = inspect_repo_root(repo_root)?;
        findings.push(Phase1Finding {
            id: format!("starter-scan:{}", readiness.repo_name),
            title: "Starter scan found no obvious lightweight heuristics".to_string(),
            category: "maintainability".to_string(),
            priority: 24,
            rationale: "The scan ran real polyglot repository checks but did not find the small deterministic heuristics it checks today. This still confirms the dashboard pipeline is analyzing the selected root.".to_string(),
            principles: vec!["KISS".to_string(), "YAGNI".to_string()],
            affected_files: Vec::new(),
        });
    }

    Ok(ScanFindingsResult {
        findings,
        files_scanned: scan.files.len(),
        entries_visited: scan.entries_visited,
        partial: scan.partial,
        partial_reason: scan.partial_reason,
    })
}

struct CodeScan {
    files: Vec<PathBuf>,
    entries_visited: usize,
    partial: bool,
    partial_reason: Option<String>,
}

fn collect_code_files(root: &Path) -> Result<CodeScan, String> {
    let mut files = Vec::new();
    let mut entries_visited = 0usize;
    let mut partial = false;
    let mut partial_reason = None;

    let mut walk = WalkBuilder::new(root);
    walk.hidden(false)
        .git_ignore(true)
        .git_global(true)
        .git_exclude(true)
        .parents(true)
        .filter_entry(|entry| {
            let Some(name) = entry.file_name().to_str() else {
                return false;
            };
            !should_skip_dir_name(name)
        });

    for entry in walk.build() {
        let entry = entry.map_err(|e| format!("failed to scan {}: {e}", root.display()))?;
        entries_visited += 1;
        if entries_visited > ENTRY_LIMIT {
            partial = true;
            partial_reason = Some(format!(
                "Stopped after visiting {ENTRY_LIMIT} filesystem entries for safety."
            ));
            break;
        }
        if entry.file_type().is_some_and(|kind| kind.is_file())
            && entry
                .path()
                .extension()
                .and_then(|value| value.to_str())
                .is_some_and(is_supported_code_extension)
        {
            files.push(entry.into_path());
            if files.len() >= CODE_FILE_LIMIT {
                partial = true;
                partial_reason = Some(format!(
                    "Stopped after scanning {CODE_FILE_LIMIT} code files for safety."
                ));
                break;
            }
        }
    }

    Ok(CodeScan {
        files,
        entries_visited,
        partial,
        partial_reason,
    })
}

fn is_supported_code_extension(ext: &str) -> bool {
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "java"
            | "kt"
            | "kts"
            | "scala"
            | "groovy"
            | "js"
            | "jsx"
            | "ts"
            | "tsx"
            | "mjs"
            | "cjs"
            | "py"
            | "rs"
            | "go"
            | "c"
            | "cc"
            | "cpp"
            | "cxx"
            | "h"
            | "hpp"
            | "cs"
            | "fs"
            | "php"
            | "rb"
            | "swift"
            | "m"
            | "mm"
            | "lua"
            | "dart"
            | "ex"
            | "exs"
            | "erl"
            | "hrl"
            | "clj"
            | "cljs"
            | "sql"
            | "sh"
            | "bash"
            | "zsh"
            | "fish"
            | "ps1"
            | "html"
            | "css"
            | "scss"
            | "vue"
            | "svelte"
            | "asm"
            | "s"
            | "nasm"
            | "inc"
    )
}

fn should_skip_dir_name(name: &str) -> bool {
    matches!(
        name,
        ".git"
            | ".gradle"
            | "target"
            | "build"
            | "node_modules"
            | ".idea"
            | "out"
            | ".settings"
            | "dist"
            | ".next"
            | ".turbo"
            | "vendor"
            | "__pycache__"
            | ".venv"
            | "venv"
            | ".cargo"
    )
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_millis() as u64
}

fn repo_tooling_findings(repo_root: &Path) -> Vec<Phase1Finding> {
    let mut findings = Vec::new();
    let mut push_tooling = |id: &str, title: &str, rationale: &str, tools: &[&str]| {
        findings.push(Phase1Finding {
            id: format!("tooling:{id}"),
            title: title.to_string(),
            category: "tooling".to_string(),
            priority: 68,
            rationale: format!(
                "{rationale} Suggested verification gates: {}.",
                tools.join(", ")
            ),
            principles: vec![
                "KISS".to_string(),
                "DRY".to_string(),
                "YAGNI".to_string(),
                "SOLID".to_string(),
            ],
            affected_files: Vec::new(),
        });
    };

    if repo_root.join("package.json").is_file() {
        push_tooling(
            "javascript-typescript",
            "Run JS/TS lint, type, and format gates before applying broad refactors",
            "ESLint/Biome plus tsc catches unsafe imports, dead code, type drift, and style churn before a generated refactor lands",
            &["eslint --fix or biome check --write", "tsc --noEmit", "prettier/biome format"],
        );
    }
    if repo_root.join("Cargo.toml").is_file() {
        push_tooling(
            "rust",
            "Run Rust compiler and Clippy gates before accepting generated refactors",
            "cargo check and Clippy catch borrow, lifetime, allocation, and API-shape regressions that text-only review misses",
            &["cargo fmt", "cargo check", "cargo clippy --all-targets --all-features"],
        );
    }
    if repo_root.join("pyproject.toml").is_file()
        || repo_root.join("requirements.txt").is_file()
        || repo_root.join("setup.py").is_file()
    {
        push_tooling(
            "python",
            "Run Python lint, type, and test gates before accepting generated refactors",
            "Ruff, type checkers, and tests catch import cleanup, dead code, typing drift, and behavior regressions quickly",
            &["ruff check --fix", "ruff format", "mypy or pyright", "pytest"],
        );
    }
    if repo_root.join("go.mod").is_file() {
        push_tooling(
            "go",
            "Run Go format, vet, and static analysis before accepting generated refactors",
            "Go's formatter and analyzers keep generated changes idiomatic and catch common correctness issues",
            &["gofmt", "go vet ./...", "staticcheck ./...", "go test ./..."],
        );
    }
    if repo_root.join("Package.swift").is_file() {
        push_tooling(
            "swift",
            "Run Swift build and test gates before accepting generated refactors",
            "SwiftPM catches API drift, actor isolation issues, and compile-time regressions before a refactor lands",
            &["swift format", "swift build", "swift test"],
        );
    }
    if repo_root.join("pubspec.yaml").is_file() {
        push_tooling(
            "dart",
            "Run Dart analysis and tests before accepting generated refactors",
            "Dart and Flutter analyzers catch import cleanup, null-safety drift, and widget or package breakage early",
            &["dart format", "dart analyze", "dart test or flutter test"],
        );
    }
    if repo_root.join("mix.exs").is_file() {
        push_tooling(
            "elixir",
            "Run Elixir format, compile, and test gates before accepting generated refactors",
            "Mix catches formatting, compile-time, and behavior regressions in functional code paths quickly",
            &["mix format --check-formatted", "mix compile --warnings-as-errors", "mix test"],
        );
    }
    if repo_root.join("pom.xml").is_file()
        || repo_root.join("build.gradle").is_file()
        || repo_root.join("build.gradle.kts").is_file()
    {
        push_tooling(
            "jvm",
            "Run JVM build and static-analysis gates before accepting generated refactors",
            "Compiler, tests, and analyzers catch signature drift, unsafe modernization, and behavior changes",
            &["mvn test or gradle test", "SpotBugs/ErrorProne when configured", "Checkstyle/PMD when configured"],
        );
    }
    if repo_root.join("composer.json").is_file() {
        push_tooling(
            "php",
            "Run PHP style and static-analysis gates before accepting generated refactors",
            "PHPStan/Psalm and formatters catch type assumptions, unused symbols, and unsafe API moves",
            &["phpstan or psalm", "php-cs-fixer or pint", "composer test"],
        );
    }
    if repo_root.join("Gemfile").is_file() {
        push_tooling(
            "ruby",
            "Run Ruby lint and test gates before accepting generated refactors",
            "RuboCop and tests catch unsafe rewrites, dead code, and style churn in dynamic code",
            &["rubocop -A", "bundle exec rspec or rake test"],
        );
    }
    if repo_root.join("CMakeLists.txt").is_file() {
        push_tooling(
            "cpp",
            "Run C/C++ format, compile, and static-analysis gates before accepting generated refactors",
            "Compiler diagnostics, clang-tidy, and sanitizers catch lifetime, ownership, and performance regressions",
            &["clang-format", "cmake --build", "clang-tidy", "ASan/UBSan tests when configured"],
        );
    }

    findings
}

fn has_debug_output(content: &str) -> bool {
    content.contains("System.out.println")
        || content.contains("console.log(")
        || content.contains("console.debug(")
        || content.contains("println!(")
        || content.lines().any(|line| {
            let trimmed = line.trim_start();
            trimmed.starts_with("print(")
                || trimmed.starts_with("printf(")
                || trimmed.starts_with("puts ")
                || trimmed.contains("call printf")
        })
}

fn has_wildcard_import(lines: &[&str]) -> bool {
    lines.iter().any(|line| {
        let trimmed = line.trim_start();
        (trimmed.starts_with("import ") && trimmed.contains(".*;"))
            || (trimmed.starts_with("from ") && trimmed.contains(" import *"))
    })
}

fn has_deep_nesting(content: &str) -> bool {
    let mut control_depth = 0i32;
    let mut max_depth = 0i32;
    for line in content.lines() {
        let trimmed = line.trim();
        let control_start = (trimmed.starts_with("if ")
            || trimmed.starts_with("if(")
            || trimmed.starts_with("for ")
            || trimmed.starts_with("for(")
            || trimmed.starts_with("while ")
            || trimmed.starts_with("while(")
            || trimmed.starts_with("switch ")
            || trimmed.starts_with("switch(")
            || trimmed.starts_with("try")
            || trimmed.starts_with("catch "))
            && trimmed.contains('{');
        if control_start {
            control_depth += 1;
            max_depth = max_depth.max(control_depth);
        }
        let closing = trimmed.chars().filter(|ch| *ch == '}').count() as i32;
        control_depth = (control_depth - closing).max(0);
    }
    max_depth >= 3
}

fn has_control_flow_flattening_signal(content: &str) -> bool {
    let lower = content.to_ascii_lowercase();
    let has_dispatch_loop = lower.contains("while (true)")
        || lower.contains("while(true)")
        || lower.contains("for (;;)")
        || lower.contains("for(;;)");
    if !has_dispatch_loop || !lower.contains("switch") {
        return false;
    }

    let case_count = lower.matches("case ").count();
    if case_count < 4 {
        return false;
    }

    let state_writes = lower
        .lines()
        .filter(|line| {
            let trimmed = line.trim();
            (trimmed.contains("state =")
                || trimmed.contains("next =")
                || trimmed.contains("dispatch =")
                || trimmed.contains("pc ="))
                && trimmed.ends_with(';')
        })
        .count();

    state_writes >= 3
}

fn has_duplicate_logic(content: &str) -> bool {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.len() < 12
            || trimmed.starts_with("import ")
            || trimmed.starts_with("package ")
            || trimmed == "{"
            || trimmed == "}"
        {
            continue;
        }
        if !(trimmed.ends_with(';') || trimmed.ends_with('{')) {
            continue;
        }
        *counts.entry(trimmed.to_string()).or_insert(0) += 1;
    }
    counts.values().any(|count| *count >= 3)
}

fn has_potential_null_risk(content: &str) -> bool {
    content.lines().any(|line| {
        let trimmed = line.trim();
        if trimmed.contains("\".equals(") || trimmed.contains("Objects.equals(") {
            return false;
        }
        trimmed.contains(".equals(")
            || trimmed.contains(".equalsIgnoreCase(")
            || trimmed.contains(".trim()")
            || trimmed.contains(".toLowerCase()")
            || trimmed.contains(".toUpperCase()")
    })
}

fn has_repeated_call_cache_opportunity(content: &str) -> bool {
    let lines: Vec<&str> = content.lines().collect();
    for start in 0..lines.len() {
        let line = lines[start].trim();
        if !(line.starts_with("for ") || line.starts_with("for(") || line.starts_with("while ")) {
            continue;
        }
        let window_end = usize::min(start + 8, lines.len());
        let mut counts: HashMap<String, usize> = HashMap::new();
        for body_line in &lines[start..window_end] {
            for call in extract_call_tokens(body_line) {
                if call.ends_with(".size(") || call.starts_with("System.out.") {
                    continue;
                }
                *counts.entry(call).or_insert(0) += 1;
            }
        }
        if counts.values().any(|count| *count >= 2) {
            return true;
        }
    }
    false
}

fn has_tell_dont_ask_candidate(content: &str) -> bool {
    let lines: Vec<&str> = content.lines().collect();
    for (idx, raw_line) in lines.iter().enumerate() {
        let line = raw_line.trim();
        if !(line.starts_with("if ") || line.starts_with("if(") || line.starts_with("return ")) {
            continue;
        }
        let Some(getter_idx) = line.find(".get").or_else(|| line.find(".is")) else {
            continue;
        };
        let prefix = line[..getter_idx].trim();
        let receiver = prefix
            .rsplit(|ch: char| !(ch.is_ascii_alphanumeric() || ch == '_'))
            .next()
            .unwrap_or("")
            .trim();
        if receiver.is_empty() || !line.contains('(') || !line.contains(')') {
            continue;
        }
        let window_end = usize::min(idx + 6, lines.len());
        for candidate in &lines[idx..window_end] {
            let candidate = candidate.trim();
            if candidate == line {
                continue;
            }
            if candidate.contains(&format!("{receiver}."))
                && !candidate.contains(".get")
                && !candidate.contains(".is")
            {
                return true;
            }
        }
    }
    false
}

fn extract_call_tokens(line: &str) -> Vec<String> {
    let bytes = line.as_bytes();
    let mut out = Vec::new();
    for idx in 0..bytes.len() {
        if bytes[idx] != b'(' {
            continue;
        }
        let mut start = idx;
        while start > 0 {
            let ch = bytes[start - 1] as char;
            if ch.is_ascii_alphanumeric() || ch == '_' || ch == '.' {
                start -= 1;
            } else {
                break;
            }
        }
        if start == idx {
            continue;
        }
        let token = &line[start..idx + 1];
        if token.contains('.') {
            out.push(token.to_string());
        }
    }
    out
}
