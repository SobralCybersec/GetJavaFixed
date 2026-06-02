use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::modules::fs::to_canon;
use crate::modules::workspace::{resolve_path, WorkspaceEnv, WorkspaceRegistry};

const PHASE1_UNSUPPORTED_ROOT: &str = "This folder is not supported in Phase 1. Choose another folder whose selected root contains `pom.xml`, `build.gradle`, or `build.gradle.kts`.";
const PHASE1_UNSUPPORTED_JAVA_ROOT: &str = "Java files were found here, but this folder is not supported in Phase 1. Choose another folder whose selected root contains `pom.xml`, `build.gradle`, or `build.gradle.kts`.";
const JAVA_SCAN_LIMIT: usize = 2048;

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum JavaProjectType {
    Maven,
    Gradle,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JavaRepoReadiness {
    pub supported: bool,
    pub project_type: Option<JavaProjectType>,
    pub repo_name: String,
    pub reason: Option<String>,
}

pub fn inspect_repo_root(root: &Path) -> Result<JavaRepoReadiness, String> {
    if !root.is_dir() {
        return Err(format!(
            "selected root is not a directory: {}",
            root.display()
        ));
    }

    let repo_name = repo_name(root);
    if root.join("pom.xml").is_file() {
        return Ok(JavaRepoReadiness {
            supported: true,
            project_type: Some(JavaProjectType::Maven),
            repo_name,
            reason: None,
        });
    }

    if root.join("build.gradle").is_file() || root.join("build.gradle.kts").is_file() {
        return Ok(JavaRepoReadiness {
            supported: true,
            project_type: Some(JavaProjectType::Gradle),
            repo_name,
            reason: None,
        });
    }

    Ok(JavaRepoReadiness {
        supported: false,
        project_type: None,
        repo_name,
        reason: Some(if contains_java_files(root)? {
            PHASE1_UNSUPPORTED_JAVA_ROOT.to_string()
        } else {
            PHASE1_UNSUPPORTED_ROOT.to_string()
        }),
    })
}

pub fn classify_selected_root(
    path: &str,
    workspace: &WorkspaceEnv,
    registry: &WorkspaceRegistry,
) -> Result<JavaRepoReadiness, String> {
    let resolved = resolve_path(path, workspace);
    let canonical = registry.authorize(&resolved).map_err(|e| e.to_string())?;
    inspect_repo_root(&canonical)
}

#[tauri::command]
pub async fn java_repo_readiness(
    path: String,
    workspace: Option<WorkspaceEnv>,
    registry: tauri::State<'_, WorkspaceRegistry>,
) -> Result<JavaRepoReadiness, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    classify_selected_root(&path, &workspace, &registry)
}

fn repo_name(root: &Path) -> String {
    root.file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| to_canon(root))
}

fn contains_java_files(root: &Path) -> Result<bool, String> {
    let mut stack = vec![PathBuf::from(root)];
    let mut scanned = 0usize;

    while let Some(dir) = stack.pop() {
        let entries =
            fs::read_dir(&dir).map_err(|e| format!("failed to scan {}: {e}", dir.display()))?;
        for entry in entries {
            let entry = entry.map_err(|e| format!("failed to read {}: {e}", dir.display()))?;
            scanned += 1;
            if scanned > JAVA_SCAN_LIMIT {
                return Ok(false);
            }

            let path = entry.path();
            let Some(name) = path.file_name().and_then(|value| value.to_str()) else {
                continue;
            };
            if should_skip_dir(name) && path.is_dir() {
                continue;
            }
            if path.is_dir() {
                stack.push(path);
                continue;
            }
            if path
                .extension()
                .and_then(|value| value.to_str())
                .is_some_and(|ext| ext.eq_ignore_ascii_case("java"))
            {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

fn should_skip_dir(name: &str) -> bool {
    matches!(
        name,
        ".git" | ".gradle" | "target" | "build" | "node_modules"
    )
}
